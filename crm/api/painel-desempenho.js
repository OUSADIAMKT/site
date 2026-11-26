// Relatório do gestor da clínica. Fala do negócio DELE: agenda, atendimento
// e equipe. Não traz nada de custo de IA, que é custo da plataforma.

import { db } from "./_db.js";
import { barrouGestor, clientePermitido } from "./_painel.js";
import { instanteLocal } from "./_agenda.js";

const PERIODOS = { hoje: 0, semana: 7, mes: 30 };

export default async function handler(req, res) {
  if (await barrouGestor(req, res)) return;
  if (req.method !== "GET") return res.status(405).json({ error: "Método não permitido" });

  const clienteId = await clientePermitido(req, req.query?.cliente);
  if (!clienteId) return res.status(403).json({ error: "Cliente não informado ou não permitido." });

  const sb = db();
  const periodo = PERIODOS[req.query?.periodo] !== undefined ? req.query.periodo : "hoje";

  const { data: cliente } = await sb.from("clientes")
    .select("nome, fuso").eq("id", clienteId).maybeSingle();
  const fuso = cliente?.fuso || "America/Belem";

  const hojeISO = new Intl.DateTimeFormat("en-CA", { timeZone: fuso }).format(new Date());
  const inicioDia = instanteLocal(hojeISO, "00:00:00", fuso);
  const fimDia = new Date(inicioDia.getTime() + 86400000);
  const desde = new Date(inicioDia.getTime() - PERIODOS[periodo] * 86400000);

  const [agenda, atendimentos, conversas, equipe, fila] = await Promise.all([
    sb.from("agendamentos")
      .select("id, paciente_nome, telefone, inicio, situacao, profissionais(nome, especialidade)")
      .eq("cliente_id", clienteId)
      .gte("inicio", desde.toISOString())
      .order("inicio"),
    sb.from("atendimentos")
      .select("id, conversa_id, atendente_id, entrou_fila, assumida_em, encerrada_em, desfecho")
      .eq("cliente_id", clienteId)
      .gte("entrou_fila", desde.toISOString()),
    sb.from("conversas")
      .select("id, modo, criado_em, ultima_em")
      .eq("cliente_id", clienteId)
      .gte("criado_em", desde.toISOString()),
    sb.from("desempenho_equipe").select("*").eq("cliente_id", clienteId),
    sb.from("fila_resumo").select("*").eq("cliente_id", clienteId).maybeSingle(),
  ]);

  const erro = agenda.error || atendimentos.error || conversas.error;
  if (erro) return res.status(500).json({ error: "Falha ao montar o relatório", detalhe: erro.message });

  const marcacoes = agenda.data || [];
  const passagens = atendimentos.data || [];
  const conversasLista = conversas.data || [];

  // ---------- agenda ----------
  const porSituacao = {};
  for (const a of marcacoes) porSituacao[a.situacao] = (porSituacao[a.situacao] || 0) + 1;

  const finalizados = marcacoes.filter((a) => ["atendido", "faltou"].includes(a.situacao));
  const faltas = finalizados.filter((a) => a.situacao === "faltou").length;

  const dentroDeHoje = (iso) => {
    const t = new Date(iso).getTime();
    return t >= inicioDia.getTime() && t < fimDia.getTime();
  };

  // ---------- atendimento humano ----------
  const assumidos = passagens.filter((p) => p.assumida_em);
  const concluidos = passagens.filter((p) => p.encerrada_em && p.assumida_em);

  const media = (lista, calculo) =>
    lista.length ? lista.reduce((s, p) => s + calculo(p), 0) / lista.length : null;

  const esperaMedia = media(assumidos,
    (p) => (new Date(p.assumida_em) - new Date(p.entrou_fila)) / 1000);
  const duracaoMedia = media(concluidos,
    (p) => (new Date(p.encerrada_em) - new Date(p.assumida_em)) / 1000);

  // Quantas conversas a IA resolveu sem passar para ninguém. É o número que
  // mostra ao gestor o quanto o robô está poupando a equipe dele.
  const idsQuePassaram = new Set(passagens.map((p) => p.conversa_id).filter(Boolean));
  const resolvidasPelaIA = conversasLista.filter((c) => !idsQuePassaram.has(c.id)).length;

  return res.status(200).json({
    cliente: { nome: cliente?.nome || "", fuso },
    periodo,
    agenda: {
      total: marcacoes.length,
      hoje: marcacoes.filter((a) => dentroDeHoje(a.inicio) && a.situacao !== "cancelado").length,
      por_situacao: porSituacao,
      taxa_falta: finalizados.length ? (faltas / finalizados.length) * 100 : null,
      finalizados: finalizados.length,
      faltas,
      proximos: marcacoes
        .filter((a) => new Date(a.inicio) >= new Date() && ["marcado", "confirmado"].includes(a.situacao))
        .slice(0, 10),
    },
    atendimento: {
      conversas: conversasLista.length,
      resolvidas_pela_ia: resolvidasPelaIA,
      passaram_para_equipe: assumidos.length,
      espera_media_seg: esperaMedia,
      duracao_media_seg: duracaoMedia,
      esperando_agora: fila.data?.esperando || 0,
      em_atendimento_agora: fila.data?.em_atendimento || 0,
      espera_mais_antiga: fila.data?.espera_mais_antiga || null,
    },
    equipe: (equipe.data || []).map((e) => ({
      nome: e.nome,
      papel: e.papel,
      disponivel: e.disponivel,
      atendimentos: Number(e.atendimentos || 0),
      em_aberto: Number(e.em_aberto || 0),
      espera_media_seg: e.espera_media_seg === null ? null : Number(e.espera_media_seg),
      duracao_media_seg: e.duracao_media_seg === null ? null : Number(e.duracao_media_seg),
    })),
  });
}
