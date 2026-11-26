// POST /api/vendas?fonte=herospark&chave=<VENDAS_CHAVE>
//
// O endereço que vai no webhook da HeroSpark (Configurações > Webhooks).
// Como a HeroSpark não documenta assinatura do envio, a autenticação é a
// `chave` longa e aleatória na própria URL, conferida em tempo constante.
// Quem não tem a URL completa não grava nada.
//
// A rota só GUARDA o evento, inteiro, e põe na fila. Responde 200 na hora:
// a HeroSpark reenvia o que não recebe 200, e processar aqui dentro faria uma
// falha do CRM virar reenvio em loop. O processamento (api/_vendas.js) roda
// pela fila, com novas tentativas se falhar.
//
// GET com a chave certa responde "ok", para testar o endereço antes da
// primeira venda.

import crypto from "node:crypto";
import { db } from "./_db.js";
import { agendar } from "./_fila_tarefas.js";

const FONTES = ["herospark"];

function chaveConfere(recebida) {
  const esperada = process.env.VENDAS_CHAVE;
  if (!esperada || !recebida) return false;
  const a = Buffer.from(String(recebida));
  const b = Buffer.from(String(esperada));
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

function corpoComoObjeto(corpo) {
  if (Buffer.isBuffer(corpo)) corpo = corpo.toString("utf8");
  if (typeof corpo === "string") {
    try { return JSON.parse(corpo); } catch { return { texto: corpo.slice(0, 20000) }; }
  }
  return corpo && typeof corpo === "object" ? corpo : null;
}

export default async function handler(req, res) {
  const fonte = String(req.query?.fonte || "herospark").toLowerCase();
  if (!FONTES.includes(fonte)) return res.status(404).json({ error: "Fonte desconhecida." });
  if (!chaveConfere(req.query?.chave)) return res.status(401).json({ error: "Chave inválida." });

  if (req.method === "GET") return res.status(200).json({ ok: true, fonte });
  if (req.method !== "POST") return res.status(405).json({ error: "Método não permitido" });

  const bruto = corpoComoObjeto(req.body);
  if (!bruto) return res.status(400).json({ error: "Corpo vazio." });

  const sb = db();
  try {
    const { data: cliente } = await sb.from("clientes").select("id")
      .eq("slug", process.env.CLIENTE_DO_SITE || "ousadia").maybeSingle();
    if (!cliente) throw new Error("cliente da Ousadia não encontrado");

    const { data: ev, error } = await sb.from("vendas_eventos")
      .insert({ cliente_id: cliente.id, fonte, bruto }).select("id").single();
    if (error) throw new Error(error.message);

    await agendar(sb, {
      tipo: "processar-venda", carga: { evento_id: ev.id }, clienteId: cliente.id,
      chave: `processar-venda:${ev.id}`,
    });
    return res.status(200).json({ ok: true, evento: ev.id });
  } catch (e) {
    // 500 faz a HeroSpark tentar de novo, que é o que se quer se o banco
    // estava fora do ar.
    console.error("[vendas]", e.message);
    return res.status(500).json({ error: "Não foi possível registrar agora." });
  }
}
