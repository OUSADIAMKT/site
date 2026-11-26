// A tela de trabalho da recepção: a fila do dia e o botão que move cada
// paciente de "marcado" até "atendido".
//
// Era a função painel-agendamentos.js. Virou módulo porque o plano Hobby da
// Vercel aceita 12 funções por deploy e o REPORT precisava de uma vaga. O
// endereço antigo continua valendo: vercel.json reescreve
// /api/painel-agendamentos para /api/painel-agenda?recurso=agendamentos.

import { db } from "./_db.js";
import { barrou, clientePermitido } from "./_painel.js";
import { agendamentosDoDia } from "./_agenda.js";

const SITUACOES = ["marcado", "confirmado", "em_atendimento", "atendido", "faltou", "cancelado"];

export async function agendamentos(req, res) {
  if (await barrou(req, res)) return;
  const sb = db();

  if (req.method === "GET") {
    const clienteId = await clientePermitido(req, req.query?.cliente);
    const dia = req.query?.dia;
    if (!clienteId) return res.status(403).json({ error: "Cliente não informado ou não permitido." });

    const { data: cli } = await sb.from("clientes").select("fuso").eq("id", clienteId).maybeSingle();
    const fuso = cli?.fuso || "America/Belem";

    // Sem dia informado, é hoje, no fuso da clínica, não no do servidor.
    const alvo = dia || new Intl.DateTimeFormat("en-CA", { timeZone: fuso }).format(new Date());

    try {
      const lista = await agendamentosDoDia(clienteId, alvo, fuso);
      return res.status(200).json({ dia: alvo, fuso, agendamentos: lista });
    } catch (e) {
      return res.status(500).json({ error: e.message });
    }
  }

  if (req.method === "POST") {
    const { id, situacao, observacao } = req.body || {};
    if (!id) return res.status(400).json({ error: "Agendamento não informado." });
    if (situacao && !SITUACOES.includes(situacao)) {
      return res.status(400).json({ error: "Situação inválida." });
    }

    const atualizacao = {};
    if (situacao) atualizacao.situacao = situacao;
    if (observacao !== undefined) atualizacao.observacao = observacao || null;
    if (!Object.keys(atualizacao).length) return res.status(400).json({ error: "Nada para atualizar." });

    // O atendente move a fila do cliente dele, não a de outro.
    const { data: dono } = await sb.from("agendamentos")
      .select("cliente_id").eq("id", id).maybeSingle();
    if (!dono || !await clientePermitido(req, dono.cliente_id)) {
      return res.status(403).json({ error: "Agendamento não permitido." });
    }

    const { error } = await sb.from("agendamentos").update(atualizacao).eq("id", id);
    if (error) return res.status(500).json({ error: "Falha ao salvar", detalhe: error.message });
    return res.status(200).json({ ok: true });
  }

  return res.status(405).json({ error: "Método não permitido" });
}
