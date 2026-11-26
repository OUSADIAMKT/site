// Visão geral de um cliente. Uma chamada só devolve tudo que a tela precisa.
// Os volumes por cliente são pequenos, então agregar aqui sai mais barato que
// manter meia dúzia de views no banco.

import { db } from "./_db.js";
import { barrouOperador } from "./_painel.js";
import { instanteLocal } from "./_agenda.js";

const DOLAR = 5.2;

export default async function handler(req, res) {
  if (await barrouOperador(req, res)) return;
  if (req.method !== "GET") return res.status(405).json({ error: "Método não permitido" });

  const clienteId = req.query?.cliente;
  if (!clienteId) return res.status(400).json({ error: "Cliente não informado." });

  const sb = db();

  const { data: cliente, error: erroCliente } = await sb
    .from("clientes").select("*").eq("id", clienteId).maybeSingle();
  if (erroCliente) return res.status(500).json({ error: erroCliente.message });
  if (!cliente) return res.status(404).json({ error: "Cliente não encontrado." });

  const fuso = cliente.fuso || "America/Belem";
  const hojeISO = new Intl.DateTimeFormat("en-CA", { timeZone: fuso }).format(new Date());
  const inicioDia = instanteLocal(hojeISO, "00:00:00", fuso);
  const fimDia = new Date(inicioDia.getTime() + 86400000);
  const inicioMes = instanteLocal(hojeISO.slice(0, 8) + "01", "00:00:00", fuso);

  const [conversas, agendamentos, uso, midias] = await Promise.all([
    sb.from("conversas")
      .select("id, nome_contato, telefone, score, modo, etiquetas, origem, ultima_em, criado_em")
      .eq("cliente_id", clienteId)
      .gte("criado_em", inicioMes.toISOString()),
    sb.from("agendamentos")
      .select("id, paciente_nome, inicio, situacao, profissionais(nome)")
      .eq("cliente_id", clienteId)
      .gte("inicio", inicioMes.toISOString()),
    sb.from("uso")
      .select("modelo, custo_usd, conversa_id, criado_em")
      .eq("cliente_id", clienteId)
      .gte("criado_em", inicioMes.toISOString()),
    sb.from("midias").select("id").eq("cliente_id", clienteId).eq("ativo", true),
  ]);

  const erro = conversas.error || agendamentos.error || uso.error;
  if (erro) return res.status(500).json({ error: "Falha ao montar o painel", detalhe: erro.message });

  const listaConversas = conversas.data || [];
  const listaAgenda = agendamentos.data || [];
  const listaUso = uso.data || [];

  // ---------- indicadores ----------
  const dentroDeHoje = (iso) => {
    const t = new Date(iso).getTime();
    return t >= inicioDia.getTime() && t < fimDia.getTime();
  };

  const custoUsd = listaUso.reduce((soma, u) => soma + Number(u.custo_usd || 0), 0);
  const quentes = listaConversas.filter((c) => (c.score || 0) >= 70).length;
  const comHumano = listaConversas.filter((c) => c.modo === "humano").length;

  const finalizados = listaAgenda.filter((a) => ["atendido", "faltou"].includes(a.situacao));
  const faltas = finalizados.filter((a) => a.situacao === "faltou").length;
  const taxaFalta = finalizados.length ? (faltas / finalizados.length) * 100 : null;

  const agendaFutura = listaAgenda.filter(
    (a) => ["marcado", "confirmado"].includes(a.situacao) && new Date(a.inicio) >= new Date(),
  );

  // ---------- série diária do mês ----------
  const diaLocal = (iso) => new Intl.DateTimeFormat("en-CA", { timeZone: fuso }).format(new Date(iso));
  const porDia = new Map();
  const diasNoMes = Number(hojeISO.slice(8, 10));
  for (let d = 1; d <= diasNoMes; d++) {
    porDia.set(`${hojeISO.slice(0, 8)}${String(d).padStart(2, "0")}`, { atendimentos: 0, marcados: 0 });
  }
  for (const c of listaConversas) {
    const chave = diaLocal(c.criado_em);
    if (porDia.has(chave)) porDia.get(chave).atendimentos += 1;
  }
  for (const a of listaAgenda) {
    const chave = diaLocal(a.inicio);
    if (porDia.has(chave)) porDia.get(chave).marcados += 1;
  }

  // ---------- divisão por modelo ----------
  const modelos = {};
  for (const u of listaUso) {
    modelos[u.modelo] = modelos[u.modelo] || { respostas: 0, custo_usd: 0 };
    modelos[u.modelo].respostas += 1;
    modelos[u.modelo].custo_usd += Number(u.custo_usd || 0);
  }

  // ---------- situação dos agendamentos ----------
  const situacoes = {};
  for (const a of listaAgenda) situacoes[a.situacao] = (situacoes[a.situacao] || 0) + 1;

  // ---------- origem dos leads ----------
  const origens = { anuncio: 0, direto: 0 };
  for (const c of listaConversas) {
    if (c.origem?.ctwa_clid || c.origem?.source_id) origens.anuncio += 1;
    else origens.direto += 1;
  }

  return res.status(200).json({
    cliente: {
      nome: cliente.nome, plano: cliente.plano,
      teto_conversas: cliente.teto_conversas, fuso,
    },
    indicadores: {
      atendimentos_hoje: listaConversas.filter((c) => dentroDeHoje(c.ultima_em)).length,
      conversas_mes: listaConversas.length,
      leads_quentes: quentes,
      com_humano: comHumano,
      agendados: agendaFutura.length,
      taxa_falta: taxaFalta,
      custo_brl: custoUsd * DOLAR,
      custo_por_conversa: listaConversas.length ? (custoUsd * DOLAR) / listaConversas.length : 0,
      midias: (midias.data || []).length,
    },
    serie: [...porDia].map(([dia, v]) => ({ dia: dia.slice(8), ...v })),
    modelos,
    situacoes,
    origens,
    agenda_hoje: listaAgenda
      .filter((a) => dentroDeHoje(a.inicio) && a.situacao !== "cancelado")
      .sort((a, b) => a.inicio.localeCompare(b.inicio))
      .slice(0, 8),
    conversas_recentes: listaConversas
      .sort((a, b) => b.ultima_em.localeCompare(a.ultima_em))
      .slice(0, 8),
    leads_quentes: listaConversas
      .filter((c) => (c.score || 0) >= 40)
      .sort((a, b) => (b.score || 0) - (a.score || 0))
      .slice(0, 6),
  });
}
