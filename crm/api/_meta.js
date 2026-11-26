// REPORT · conversa com a Graph API da Meta: login, descoberta de contas,
// métricas e gestão de campanhas. Nada aqui toca no banco; quem guarda é
// o _report.js.
//
// Toda chamada leva appsecret_proof: um token vazado sozinho não serve
// para chamar a API em nome deste app.

import crypto from "node:crypto";

const VERSAO = () => process.env.META_API_VERSION || "v23.0";
const GRAPH = () => `https://graph.facebook.com/${VERSAO()}`;

// Leitura e gestão. Sem permissão de criar página, publicar post nem mexer
// em pagamento: o REPORT lê tudo e só altera anúncio.
export const ESCOPOS = [
  "ads_read",
  "ads_management",
  "business_management",
  "pages_show_list",
  "pages_read_engagement",
  "read_insights",
  "instagram_basic",
  "instagram_manage_insights",
];

function appId() {
  const v = process.env.META_REPORT_APP_ID;
  if (!v) throw new Error("META_REPORT_APP_ID não configurado no servidor.");
  return v;
}

function appSecret() {
  const v = process.env.META_REPORT_APP_SECRET;
  if (!v) throw new Error("META_REPORT_APP_SECRET não configurado no servidor.");
  return v;
}

function prova(token) {
  return crypto.createHmac("sha256", appSecret()).update(token).digest("hex");
}

// Erro da Meta com o que importa para decidir: token vencido pede
// reconexão, limite de chamadas pede esperar, o resto é mostrar.
export class ErroMeta extends Error {
  constructor(corpo, status) {
    const e = corpo?.error || {};
    super(e.error_user_msg || e.message || `Meta respondeu ${status}`);
    this.status = status;
    this.codigo = e.code;
    this.subcodigo = e.error_subcode;
    this.tokenInvalido = e.code === 190 || e.code === 102;
    this.limite = [4, 17, 32, 613, 80000, 80003, 80004, 80014].includes(e.code);
  }
}

async function pedir(metodo, caminho, token, params = {}) {
  const url = new URL(caminho.startsWith("http") ? caminho : `${GRAPH()}/${caminho.replace(/^\//, "")}`);
  const corpo = new URLSearchParams();
  const destino = metodo === "GET" ? url.searchParams : corpo;

  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === null) continue;
    destino.set(k, typeof v === "object" ? JSON.stringify(v) : String(v));
  }
  if (token) {
    destino.set("access_token", token);
    destino.set("appsecret_proof", prova(token));
  }

  const r = await fetch(url, {
    method: metodo,
    ...(metodo === "GET" ? {} : {
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: corpo,
    }),
  });
  const dados = await r.json().catch(() => ({}));
  if (!r.ok || dados.error) throw new ErroMeta(dados, r.status);
  return dados;
}

export const get = (caminho, token, params) => pedir("GET", caminho, token, params);
export const post = (caminho, token, params) => pedir("POST", caminho, token, params);

// Segue a paginação até o fim ou até `maximo` itens. A Meta devolve o
// próximo link pronto; ele já carrega o token, então vai sem params.
export async function todos(caminho, token, params = {}, maximo = 2000) {
  const itens = [];
  let pagina = await get(caminho, token, { limit: 100, ...params });
  for (;;) {
    itens.push(...(pagina.data || []));
    const proximo = pagina.paging?.next;
    if (!proximo || itens.length >= maximo) break;
    pagina = await pedir("GET", proximo, null);
  }
  return itens.slice(0, maximo);
}

// ---------------------------------------------------------------
// Login
// ---------------------------------------------------------------

// Com META_REPORT_CONFIG_ID usa o "Login do Facebook para Empresas" (app do
// tipo Empresa exige); sem ele, o login clássico com a lista de escopos.
export function urlLogin(redirectUri, state) {
  const u = new URL(`https://www.facebook.com/${VERSAO()}/dialog/oauth`);
  u.searchParams.set("client_id", appId());
  u.searchParams.set("redirect_uri", redirectUri);
  u.searchParams.set("state", state);
  u.searchParams.set("response_type", "code");
  const config = process.env.META_REPORT_CONFIG_ID;
  if (config) {
    u.searchParams.set("config_id", config);
    u.searchParams.set("override_default_response_type", "true");
  } else {
    u.searchParams.set("scope", ESCOPOS.join(","));
  }
  return u.toString();
}

// Código do login → token curto → token longo (~60 dias).
export async function trocarCodigo(code, redirectUri) {
  const curto = await get("oauth/access_token", null, {
    client_id: appId(), client_secret: appSecret(), redirect_uri: redirectUri, code,
  });
  const longo = await get("oauth/access_token", null, {
    grant_type: "fb_exchange_token",
    client_id: appId(), client_secret: appSecret(),
    fb_exchange_token: curto.access_token,
  });

  const token = longo.access_token || curto.access_token;
  const segundos = Number(longo.expires_in || curto.expires_in || 0);
  const [eu, permissoes] = await Promise.all([
    get("me", token, { fields: "id,name" }),
    get("me/permissions", token),
  ]);

  return {
    token,
    expira_em: segundos ? new Date(Date.now() + segundos * 1000).toISOString() : null,
    usuario_id: eu.id,
    usuario_nome: eu.name,
    escopos: (permissoes.data || []).filter((p) => p.status === "granted").map((p) => p.permission),
  };
}

// ---------------------------------------------------------------
// Descoberta: tudo que o perfil enxerga
// ---------------------------------------------------------------

const STATUS_CONTA = {
  1: "ativa", 2: "desativada", 3: "pendente", 7: "em análise", 8: "pendente",
  9: "carência", 100: "encerrando", 101: "encerrada", 201: "ativa", 202: "encerrada",
};

export async function descobrirContas(token) {
  const contasAnuncio = await todos("me/adaccounts", token, {
    fields: "id,name,account_status,currency,timezone_name,business{id,name}",
  });

  // Páginas com acesso direto, mais as dos BMs em que o perfil está. Um
  // cliente que deu acesso pelo BM não aparece em me/accounts.
  const paginas = new Map();
  const campos = "id,name,instagram_business_account{id,username}";
  for (const p of await todos("me/accounts", token, { fields: campos })) paginas.set(p.id, { ...p, bm: null });

  const bms = await todos("me/businesses", token, { fields: "id,name" }).catch(() => []);
  for (const bm of bms) {
    for (const aresta of ["owned_pages", "client_pages"]) {
      const lista = await todos(`${bm.id}/${aresta}`, token, { fields: campos }).catch(() => []);
      for (const p of lista) if (!paginas.has(p.id)) paginas.set(p.id, { ...p, bm });
    }
  }

  const contas = contasAnuncio.map((c) => ({
    plataforma: "meta_ads",
    id_externo: c.id,                       // já vem como act_123
    nome: c.name,
    moeda: c.currency || "BRL",
    fuso: c.timezone_name || "America/Sao_Paulo",
    status_externo: STATUS_CONTA[c.account_status] || String(c.account_status),
    bm_id: c.business?.id || null,
    bm_nome: c.business?.name || null,
  }));

  for (const p of paginas.values()) {
    contas.push({
      plataforma: "facebook", id_externo: p.id, nome: p.name,
      bm_id: p.bm?.id || null, bm_nome: p.bm?.name || null,
    });
    const ig = p.instagram_business_account;
    if (ig) {
      contas.push({
        plataforma: "instagram", id_externo: ig.id,
        nome: ig.username ? `@${ig.username}` : p.name,
        pagina_id: p.id, bm_id: p.bm?.id || null, bm_nome: p.bm?.name || null,
      });
    }
  }
  return contas;
}

// ---------------------------------------------------------------
// Métricas de anúncio
// ---------------------------------------------------------------

// A Meta devolve resultados como lista de {action_type, value}. Cada
// indicador aceita alguns nomes, em ordem de preferência: o primeiro que
// aparecer vence, para não contar o mesmo lead duas vezes.
const ACOES = {
  leads: ["lead", "onsite_conversion.lead_grouped", "offsite_conversion.fb_pixel_lead"],
  conversas_iniciadas: ["onsite_conversion.messaging_conversation_started_7d"],
  conversoes: ["omni_purchase", "purchase", "offsite_conversion.fb_pixel_purchase"],
};

function acao(lista, nomes) {
  for (const n of nomes) {
    const a = (lista || []).find((x) => x.action_type === n);
    if (a) return Number(a.value);
  }
  return null;
}

const int = (v) => (v === undefined || v === null || v === "" ? null : Math.round(Number(v)));
const dinheiro = (v) => (v === undefined || v === null || v === "" ? null : Number(v));

export function linhaDeInsight(i) {
  return {
    gasto: dinheiro(i.spend),
    impressoes: int(i.impressions),
    alcance: int(i.reach),
    cliques: int(i.clicks),
    cliques_link: int(i.inline_link_clicks),
    leads: acao(i.actions, ACOES.leads),
    conversas_iniciadas: acao(i.actions, ACOES.conversas_iniciadas),
    conversoes: acao(i.actions, ACOES.conversoes),
    valor_conversoes: acao(i.action_values, ACOES.conversoes),
    // Guarda a lista inteira: se amanhã o cliente quiser "adições ao
    // carrinho", o dado já está aqui sem nova coleta.
    extras: { acoes: i.actions || [], valores: i.action_values || [], frequencia: i.frequency ?? null },
  };
}

const CAMPOS_INSIGHT = "spend,impressions,reach,frequency,clicks,inline_link_clicks,actions,action_values";

export async function insightsDiarios(token, contaId, desde, ate) {
  return todos(`${contaId}/insights`, token, {
    level: "account",
    time_increment: 1,
    time_range: { since: desde, until: ate },
    fields: `date_start,${CAMPOS_INSIGHT}`,
  });
}

export async function insightsAnuncios(token, contaId, desde, ate) {
  return todos(`${contaId}/insights`, token, {
    level: "ad",
    time_increment: 1,
    time_range: { since: desde, until: ate },
    fields: `date_start,ad_id,ad_name,adset_id,adset_name,campaign_id,campaign_name,objective,${CAMPOS_INSIGHT}`,
  }, 10000);
}

// Alcance de um intervalo fechado: gente única, não soma de dias.
export async function alcancePeriodo(token, contaId, desde, ate) {
  const [linha] = await todos(`${contaId}/insights`, token, {
    level: "account", time_range: { since: desde, until: ate }, fields: "reach,frequency",
  });
  return { alcance: int(linha?.reach), frequencia: linha?.frequency ? Number(linha.frequency) : null };
}

// ---------------------------------------------------------------
// Métricas orgânicas
// ---------------------------------------------------------------

// Instagram, conta business. Desde a v22 "impressions" saiu e "views"
// entrou; métricas com total_value são pedidas dia a dia.
const METRICAS_IG = "reach,views,profile_views,website_clicks,accounts_engaged,total_interactions,likes,comments,saves,shares";

export async function instagramDia(token, igId, dia) {
  const seguinte = new Date(`${dia}T00:00:00Z`);
  seguinte.setUTCDate(seguinte.getUTCDate() + 1);
  const r = await get(`${igId}/insights`, token, {
    metric: METRICAS_IG,
    period: "day",
    metric_type: "total_value",
    since: dia,
    until: seguinte.toISOString().slice(0, 10),
  });
  const v = Object.fromEntries((r.data || []).map((m) => [m.name, m.total_value?.value ?? null]));
  return {
    alcance: int(v.reach),
    visitas_perfil: int(v.profile_views),
    cliques_site: int(v.website_clicks),
    interacoes: int(v.total_interactions),
    extras: { views: v.views, contas_engajadas: v.accounts_engaged, curtidas: v.likes,
              comentarios: v.comments, salvos: v.saves, compartilhamentos: v.shares },
  };
}

// Novos seguidores por dia (só os últimos 30 dias existem na API).
export async function instagramSeguidoresNovos(token, igId, desde, ate) {
  const r = await get(`${igId}/insights`, token, {
    metric: "follower_count", period: "day", since: desde, until: ate,
  }).catch(() => ({ data: [] }));
  const valores = r.data?.[0]?.values || [];
  return Object.fromEntries(valores.map((x) => [x.end_time.slice(0, 10), int(x.value)]));
}

export async function instagramPerfil(token, igId) {
  return get(igId, token, { fields: "followers_count,media_count,username" });
}

export async function instagramPosts(token, igId, desdeIso) {
  const midias = await todos(`${igId}/media`, token, {
    fields: "id,caption,media_type,media_product_type,permalink,thumbnail_url,media_url,timestamp,like_count,comments_count",
    since: Math.floor(new Date(desdeIso).getTime() / 1000),
  }, 60);   // cada post custa uma chamada de insight: 60 cobre um mês de perfil ativo

  return emLotes(midias, 5, async (m) => {
    let ins = {};
    try {
      const r = await get(`${m.id}/insights`, token, { metric: "reach,views,saved,shares,total_interactions" });
      ins = Object.fromEntries((r.data || []).map((x) => [x.name, x.values?.[0]?.value ?? x.total_value?.value]));
    } catch {
      /* story vencido ou tipo sem insight: fica só com curtidas e comentários */
    }
    return {
      id_externo: m.id,
      tipo: m.media_product_type === "REELS" ? "REELS" : m.media_type,
      legenda: m.caption || null,
      link: m.permalink || null,
      miniatura_url: m.thumbnail_url || m.media_url || null,
      publicado_em: m.timestamp,
      alcance: int(ins.reach),
      visualizacoes: int(ins.views),
      curtidas: int(m.like_count),
      comentarios: int(m.comments_count),
      salvos: int(ins.saved),
      compartilhamentos: int(ins.shares),
      interacoes: int(ins.total_interactions),
    };
  });
}

// Roda `fn` em toda a lista, `n` de cada vez, mantendo a ordem. Em série,
// um perfil com 60 posts passava do limite de 60 s da função; tudo junto,
// a Meta devolve erro de limite de chamadas.
export async function emLotes(lista, n, fn) {
  const saida = [];
  for (let i = 0; i < lista.length; i += n) {
    saida.push(...(await Promise.all(lista.slice(i, i + n).map(fn))));
  }
  return saida;
}

export async function paginaSeguidores(token, paginaId) {
  const p = await get(paginaId, token, { fields: "followers_count,fan_count" });
  return int(p.followers_count ?? p.fan_count);
}

// ---------------------------------------------------------------
// Gestão: campanhas, conjuntos e anúncios, ao vivo
// ---------------------------------------------------------------

// Orçamento na Meta é em centavos da moeda da conta. Aqui entra e sai em reais.
const deCentavos = (v) => (v === undefined || v === null || v === "" ? null : Number(v) / 100);

function comInsight(desde, ate) {
  const faixa = JSON.stringify({ since: desde, until: ate });
  return `insights.time_range(${faixa}){${CAMPOS_INSIGHT}}`;
}

function objeto(o) {
  const ins = o.insights?.data?.[0];
  return {
    id: o.id,
    nome: o.name,
    status: o.status,                        // o que você mandou: ACTIVE, PAUSED
    status_efetivo: o.effective_status,      // o que está valendo: inclui "pausado pelo pai"
    objetivo: o.objective || o.optimization_goal || null,
    orcamento_diario: deCentavos(o.daily_budget),
    orcamento_total: deCentavos(o.lifetime_budget),
    restante: deCentavos(o.budget_remaining),
    inicio: o.start_time || null,
    fim: o.stop_time || o.end_time || null,
    miniatura: o.creative?.thumbnail_url || null,
    metricas: ins ? linhaDeInsight(ins) : null,
  };
}

const CAMPOS_BASE = "id,name,status,effective_status,daily_budget,lifetime_budget,budget_remaining,start_time";

export async function listarCampanhas(token, contaId, desde, ate) {
  const lista = await todos(`${contaId}/campaigns`, token, {
    fields: `${CAMPOS_BASE},objective,stop_time,${comInsight(desde, ate)}`,
    effective_status: ["ACTIVE", "PAUSED", "CAMPAIGN_PAUSED", "ADSET_PAUSED", "IN_PROCESS", "WITH_ISSUES", "PENDING_REVIEW", "DISAPPROVED"],
  }, 500);
  return lista.map(objeto);
}

export async function listarConjuntos(token, campanhaId, desde, ate) {
  const lista = await todos(`${campanhaId}/adsets`, token, {
    fields: `${CAMPOS_BASE},optimization_goal,end_time,${comInsight(desde, ate)}`,
  }, 500);
  return lista.map(objeto);
}

export async function listarAnuncios(token, conjuntoId, desde, ate) {
  const lista = await todos(`${conjuntoId}/ads`, token, {
    fields: `id,name,status,effective_status,creative{thumbnail_url},${comInsight(desde, ate)}`,
  }, 500);
  return lista.map(objeto);
}

export async function lerObjeto(token, id) {
  const o = await get(id, token, { fields: "id,name,status,effective_status,daily_budget,lifetime_budget,account_id" });
  return { ...objeto(o), conta: o.account_id ? `act_${o.account_id}` : null };
}

export async function alterarObjeto(token, id, mudanca) {
  const params = {};
  if (mudanca.status) params.status = mudanca.status;
  if (mudanca.nome) params.name = mudanca.nome;
  if (mudanca.orcamento_diario !== undefined) params.daily_budget = Math.round(mudanca.orcamento_diario * 100);
  if (mudanca.orcamento_total !== undefined) params.lifetime_budget = Math.round(mudanca.orcamento_total * 100);
  return post(id, token, params);
}
