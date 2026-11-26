// Receita por campanha: o ROAS de verdade, com venda paga e não com lead.
//
// Junta três coisas que o CRM já guarda:
//
//   gasto     report_anuncios_diarios (a coleta diária da Meta), por campanha
//   leads     crm_negocios criados no período, cada um atribuído a uma origem
//   receita   vendas_eventos aprovados da HeroSpark no período, menos os que
//             foram reembolsados depois
//
// A atribuição de cada negócio, nesta ordem:
//
//   1. anúncio de clique para o WhatsApp: a conversa guarda o `source_id` do
//      anúncio que a Meta mandou; o anúncio aponta a campanha.
//   2. `utm_campaign` do formulário do site (gravado em negocio.campos). Se
//      ela bate com o id ou com o nome de uma campanha da Meta, conta para a
//      campanha; senão vira uma linha própria ("utm: <nome>").
//   3. a origem do negócio no CRM (Site, Comunidade, Indicação...).
//   4. "Sem origem".
//
// É atribuição pelo primeiro toque registrado no CRM. Não é modelo de
// atribuição de plataforma de anúncio, e a tela diz isso.

const DIA = 86400000;

/** Meia-noite de Brasília (UTC-3, sem horário de verão desde 2019). */
function inicioDoDia(data) {
  return new Date(`${data}T03:00:00Z`).toISOString();
}
function fimExclusivo(data) {
  return new Date(new Date(`${data}T03:00:00Z`).getTime() + DIA).toISOString();
}

const norm = (s) => String(s || "").trim().toLowerCase();

/**
 * A chave de atribuição de um negócio.
 * `campanhas`: Map id -> { id, nome }; `anuncios`: Map anuncio_id -> campanha_id.
 */
export function atribuir(negocio, conversa, { campanhas, anuncios, origens }) {
  const o = conversa?.origem || {};
  const anuncio = o.source_id || o.ad_id || null;
  if (anuncio && anuncios.has(String(anuncio))) {
    const c = campanhas.get(anuncios.get(String(anuncio)));
    if (c) return { chave: `meta:${c.id}`, nome: c.nome, tipo: "campanha" };
  }

  const utm = negocio?.campos?.utm_campaign;
  if (utm) {
    for (const c of campanhas.values()) {
      if (String(c.id) === String(utm) || norm(c.nome) === norm(utm)) {
        return { chave: `meta:${c.id}`, nome: c.nome, tipo: "campanha" };
      }
    }
    return { chave: `utm:${norm(utm)}`, nome: `utm: ${utm}`, tipo: "utm" };
  }

  if (anuncio) return { chave: "meta:desconhecida", nome: "Anúncio (campanha fora do período coletado)", tipo: "campanha" };

  const origem = negocio?.origem_id ? origens.get(negocio.origem_id) : null;
  if (origem) return { chave: `origem:${origem}`, nome: origem, tipo: "origem" };
  return { chave: "sem-origem", nome: "Sem origem", tipo: "origem" };
}

/**
 * A tabela. Puro: recebe as linhas já lidas, devolve as linhas da tela.
 */
export function montarTabela({ leads, vendas, reembolsadas, conversas, gastos, campanhas, anuncios, origens }) {
  const linhas = new Map();
  const linha = (a) => {
    if (!linhas.has(a.chave)) {
      linhas.set(a.chave, { chave: a.chave, nome: a.nome, tipo: a.tipo, gasto: 0, leads: 0, vendas: 0, receita: 0 });
    }
    return linhas.get(a.chave);
  };
  const ctx = { campanhas, anuncios, origens };
  const conversaDe = (n) => (n?.conversa_id ? conversas.get(n.conversa_id) : null);

  for (const [campanhaId, gasto] of gastos) {
    const c = campanhas.get(campanhaId);
    linha({ chave: `meta:${campanhaId}`, nome: c?.nome || campanhaId, tipo: "campanha" }).gasto += gasto;
  }
  for (const n of leads) linha(atribuir(n, conversaDe(n), ctx)).leads += 1;

  const estornadas = new Set(reembolsadas.map((r) => r.id_externo).filter(Boolean));
  for (const v of vendas) {
    if (v.id_externo && estornadas.has(v.id_externo)) continue;
    const l = linha(atribuir(v.negocio, conversaDe(v.negocio), ctx));
    l.vendas += 1;
    l.receita += Number(v.valor || 0);
  }

  const dividir = (a, b) => (b > 0 ? a / b : null);
  const lista = [...linhas.values()].map((l) => ({
    ...l,
    gasto: Math.round(l.gasto * 100) / 100,
    receita: Math.round(l.receita * 100) / 100,
    roas: dividir(l.receita, l.gasto),
    cpl: dividir(l.gasto, l.leads),
    cac: dividir(l.gasto, l.vendas),
    conversao: dividir(l.vendas, l.leads),
  })).sort((a, b) => b.receita - a.receita || b.gasto - a.gasto || b.leads - a.leads);

  const soma = (c) => lista.reduce((s, l) => s + l[c], 0);
  const totais = { gasto: soma("gasto"), leads: soma("leads"), vendas: soma("vendas"), receita: soma("receita") };
  totais.roas = dividir(totais.receita, totais.gasto);
  totais.cac = dividir(totais.gasto, totais.vendas);
  totais.cpl = dividir(totais.gasto, totais.leads);
  return { linhas: lista, totais };
}

function erroDo(r) {
  if (r?.error) throw new Error(r.error.message);
  return r?.data || [];
}

/** Lê o período no banco e monta a tabela. */
export async function receitaPorCampanha(sb, clienteId, { inicio, fim }) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(inicio || "") || !/^\d{4}-\d{2}-\d{2}$/.test(fim || "")) {
    throw new Error("Período inválido: use AAAA-MM-DD.");
  }
  const de = inicioDoDia(inicio);
  const ate = fimExclusivo(fim);

  // As contas de anúncio da Ousadia: as ligadas a este cliente no REPORT; se
  // nenhuma estiver ligada, todas as ativas (a instalação é de uma empresa só).
  const ligados = erroDo(await sb.from("report_clientes").select("id").eq("crm_cliente_id", clienteId));
  let contas = ligados.length
    ? erroDo(await sb.from("report_contas").select("id").in("cliente_id", ligados.map((c) => c.id)))
    : [];
  if (!contas.length) contas = erroDo(await sb.from("report_contas").select("id").eq("ativo", true));
  const contaIds = contas.map((c) => c.id);

  const [anunciosDia, leads, vendasEv, origensLinhas] = await Promise.all([
    contaIds.length
      ? sb.from("report_anuncios_diarios").select("anuncio_id, campanha_id, campanha_nome, gasto")
        .in("conta_id", contaIds).gte("data", inicio).lte("data", fim).then(erroDo)
      : [],
    sb.from("crm_negocios").select("id, campos, origem_id, conversa_id")
      .eq("cliente_id", clienteId).gte("criado_em", de).lt("criado_em", ate).limit(10000).then(erroDo),
    sb.from("vendas_eventos").select("negocio_id, valor, id_externo")
      .eq("cliente_id", clienteId).eq("estado", "processado").eq("status_venda", "aprovada")
      .gte("recebido_em", de).lt("recebido_em", ate).limit(10000).then(erroDo),
    sb.from("crm_origens").select("id, nome").eq("cliente_id", clienteId).then(erroDo),
  ]);

  const campanhas = new Map();
  const anuncios = new Map();
  const gastos = new Map();
  for (const a of anunciosDia) {
    if (!a.campanha_id) continue;
    campanhas.set(a.campanha_id, { id: a.campanha_id, nome: a.campanha_nome || a.campanha_id });
    anuncios.set(String(a.anuncio_id), a.campanha_id);
    gastos.set(a.campanha_id, (gastos.get(a.campanha_id) || 0) + Number(a.gasto || 0));
  }

  // Os negócios das vendas podem ter nascido antes do período.
  const idsVenda = [...new Set(vendasEv.map((v) => v.negocio_id).filter(Boolean))];
  const negociosVenda = idsVenda.length
    ? erroDo(await sb.from("crm_negocios").select("id, campos, origem_id, conversa_id").in("id", idsVenda))
    : [];
  const porId = new Map([...leads, ...negociosVenda].map((n) => [n.id, n]));

  const idsConversa = [...new Set([...porId.values()].map((n) => n.conversa_id).filter(Boolean))];
  const conversas = new Map((idsConversa.length
    ? erroDo(await sb.from("conversas").select("id, origem").in("id", idsConversa))
    : []).map((c) => [c.id, c]));

  const vendidas = vendasEv.map((v) => v.id_externo).filter(Boolean);
  const reembolsadas = vendidas.length
    ? erroDo(await sb.from("vendas_eventos").select("id_externo")
      .eq("cliente_id", clienteId).eq("estado", "processado").eq("status_venda", "reembolsada")
      .in("id_externo", vendidas))
    : [];

  const tabela = montarTabela({
    leads,
    vendas: vendasEv.map((v) => ({ ...v, negocio: porId.get(v.negocio_id) || null })),
    reembolsadas,
    conversas,
    gastos,
    campanhas,
    anuncios,
    origens: new Map(origensLinhas.map((o) => [o.id, o.nome])),
  });
  return { inicio, fim, contas_de_anuncio: contaIds.length, ...tabela };
}
