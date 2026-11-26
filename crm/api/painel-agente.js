// A "área de inserção de contexto": o que a IA sabe, como ela fala e o que
// ela não pode dizer. É o campo mais importante do produto inteiro.

import { db } from "./_db.js";
import { barrouOperador } from "./_painel.js";

// O contexto entra inteiro no prompt a cada conversa. Acima de ~30 mil
// caracteres o custo por resposta começa a pesar e vale dividir por assunto.
const LIMITE_CONTEXTO = 30000;

export default async function handler(req, res) {
  if (await barrouOperador(req, res)) return;
  const sb = db();

  if (req.method === "GET") {
    const clienteId = req.query?.cliente;
    if (!clienteId) return res.status(400).json({ error: "Cliente não informado." });

    const { data, error } = await sb.from("agente_config")
      .select("*").eq("cliente_id", clienteId).maybeSingle();
    if (error) return res.status(500).json({ error: "Falha ao ler configuração", detalhe: error.message });

    return res.status(200).json({
      config: data || { cliente_id: clienteId, persona: "", contexto: "", regras: "", saudacao: "" },
    });
  }

  if (req.method !== "POST") return res.status(405).json({ error: "Método não permitido" });

  const { cliente_id, persona, contexto, regras, saudacao } = req.body || {};
  if (!cliente_id) return res.status(400).json({ error: "Cliente não informado." });

  if ((contexto || "").length > LIMITE_CONTEXTO) {
    return res.status(400).json({
      error: `O contexto passou de ${LIMITE_CONTEXTO.toLocaleString("pt-BR")} caracteres. ` +
             "Enxugue o texto ou divida o atendimento em mais de um número.",
    });
  }

  const { error } = await sb.from("agente_config").upsert({
    cliente_id,
    persona: persona ?? "",
    contexto: contexto ?? "",
    regras: regras ?? "",
    saudacao: saudacao || null,
    atualizado_em: new Date().toISOString(),
  }, { onConflict: "cliente_id" });

  if (error) return res.status(500).json({ error: "Falha ao salvar", detalhe: error.message });
  return res.status(200).json({ ok: true });
}
