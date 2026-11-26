// POST /api/comunidade?chave=<COMUNIDADE_CHAVE>
//
// O destino dos Database Webhooks do Supabase da comunidade (Creators da
// Amazônia), para as tabelas users, company_profiles e certificates. A chave
// pode vir na URL ou no cabeçalho `x-ousadia-chave` (o Supabase deixa pôr
// cabeçalho no webhook, e é o jeito mais limpo).
//
// Guarda o evento inteiro e põe na fila; quem decide o que ele vira no CRM é
// api/_comunidade.js. Responde 200 na hora.

import crypto from "node:crypto";
import { db } from "./_db.js";
import { agendar } from "./_fila_tarefas.js";

const TABELAS = ["users", "company_profiles", "certificates"];

function chaveConfere(recebida) {
  const esperada = process.env.COMUNIDADE_CHAVE;
  if (!esperada || !recebida) return false;
  const a = Buffer.from(String(recebida));
  const b = Buffer.from(String(esperada));
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

export default async function handler(req, res) {
  if (!chaveConfere(req.headers["x-ousadia-chave"] || req.query?.chave)) {
    return res.status(401).json({ error: "Chave inválida." });
  }
  if (req.method === "GET") return res.status(200).json({ ok: true });
  if (req.method !== "POST") return res.status(405).json({ error: "Método não permitido" });

  let corpo = req.body;
  if (Buffer.isBuffer(corpo)) corpo = corpo.toString("utf8");
  if (typeof corpo === "string") {
    try { corpo = JSON.parse(corpo); } catch { return res.status(400).json({ error: "Corpo inválido." }); }
  }
  if (!corpo || typeof corpo !== "object") return res.status(400).json({ error: "Corpo inválido." });

  // Tabela que não interessa nem é guardada: a comunidade pode mandar mais do
  // que precisamos sem encher o banco do CRM.
  if (!TABELAS.includes(corpo.table)) return res.status(200).json({ ok: true, ignorado: true });

  const sb = db();
  try {
    const { data: cliente } = await sb.from("clientes").select("id")
      .eq("slug", process.env.CLIENTE_DO_SITE || "ousadia").maybeSingle();
    if (!cliente) throw new Error("cliente da Ousadia não encontrado");
    const { data: ev, error } = await sb.from("comunidade_eventos").insert({
      cliente_id: cliente.id, tabela: corpo.table, tipo: corpo.type || null, bruto: corpo,
    }).select("id").single();
    if (error) throw new Error(error.message);
    await agendar(sb, {
      tipo: "processar-comunidade", carga: { evento_id: ev.id }, clienteId: cliente.id,
      chave: `processar-comunidade:${ev.id}`,
    });
    return res.status(200).json({ ok: true });
  } catch (e) {
    console.error("[comunidade]", e.message);
    return res.status(500).json({ error: "Não foi possível registrar agora." });
  }
}
