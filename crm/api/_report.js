// REPORT · regras do módulo de relatórios da agência: conexão com a Meta,
// sincronização de contas, coleta diária, números de um período e gestão
// de campanhas com histórico. Usado pela rota api/report.js e pelo MCP.
//
// Isolamento: só toca em tabelas report_*. Ver REPORT.md.

import crypto from "node:crypto";
import { db } from "./_db.js";
import * as meta from "./_meta.js";

// ---------------------------------------------------------------
// Cifra do token: AES-256-GCM, chave derivada do SESSION_SECRET.
// Trocar o SESSION_SECRET invalida o token guardado (é só reconectar).
// ---------------------------------------------------------------

function chave() {
  const s = process.env.SESSION_SECRET;
  if (!s) throw new Error("SESSION_SECRET não configurada no servidor.");
  return Buffer.from(crypto.hkdfSync("sha256", s, "ousadia-report", "token-meta", 32));
}

export function cifrar(texto) {
  const iv = crypto.randomBytes(12);
  const c = crypto.createCipheriv("aes-256-gcm", chave(), iv);
  const corpo = Buffer.concat([c.update(texto, "utf8"), c.final()]);
  return `v1.${Buffer.concat([iv, c.getAuthTag(), corpo]).toString("base64url")}`;
}

export function decifrar(guardado) {
  const [versao, dados] = String(guardado).split(".");
  if (versao !== "v1" || !dados) throw new Error("Token guardado em formato desconhecido.");
  const b = Buffer.from(dados, "base64url");
  const d = crypto.createDecipheriv("aes-256-gcm", chave(), b.subarray(0, 12));
  d.setAuthTag(b.subarray(12, 28));
  return Buffer.concat([d.update(b.subarray(28)), d.final()]).toString("utf8");
}

// O `state` do login volta pela Meta: vai assinado e com prazo, para o
// retorno só ser aceito se saiu daqui há pouco.
export function assinarState() {
  const corpo = Buffer.from(JSON.stringify({
    n: crypto.randomBytes(8).toString("hex"), exp: Date.now() + 10 * 60 * 1000,
  })).toString("base64url");
  const ass = crypto.createHmac("sha256", chave()).update(corpo).digest("base64url");
  return `${corpo}.${ass}`;
}

export function stateValido(state) {
  const [corpo, ass] = String(state || "").split(".");
  if (!corpo || !ass) return false;
  const esperada = crypto.createHmac("sha256", chave()).update(corpo).digest("base64url");
  if (ass.length !== esperada.length || !crypto.timingSafeEqual(Buffer.from(ass), Buffer.from(esperada))) return false;
  try {
    return JSON.parse(Buffer.from(corpo, "base64url").toString()).exp > Date.now();
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------
// Conexão
// ---------------------------------------------------------------

export class SemConexao extends Error {
  constructor(msg = "Conecte o Facebook na aba Contas para o REPORT enxergar suas contas.") {
    super(msg);
    this.semConexao = true;
  }
}

export async function salvarConexao(c) {
  const { error } = await db().from("report_conexoes").upsert({
    provedor: "meta",
    usuario_id: c.usuario_id,
    usuario_nome: c.usuario_nome,
    token_cifrado: cifrar(c.token),
    escopos: c.escopos,
    expira_em: c.expira_em,
    atualizado_em: new Date().toISOString(),
  }, { onConflict: "provedor,usuario_id" });
  if (error) throw new Error(`Falha ao guardar a conexão: ${error.message}`);
}

// A conexão mais recente. Só há um operador; se um dia forem dois perfis,
// vale o último que conectou.
export async function conexao() {
  const { data } = await db().from("report_conexoes")
    .select("id, usuario_id, usuario_nome, token_cifrado, escopos, expira_em, atualizado_em")
    .eq("provedor", "meta").order("atualizado_em", { ascending: false }).limit(1).maybeSingle();
  return data || null;
}

export async function tokenAtivo() {
  const c = await conexao();
  if (!c) throw new SemConexao();
  if (c.expira_em && new Date(c.expira_em) <= new Date()) {
    throw new SemConexao("A conexão com o Facebook venceu. Reconecte na aba Contas.");
  }
  return decifrar(c.token_cifrado);
}

export async function statusConexao() {
  const c = await conexao();
  if (!c) return { conectado: false };
  const dias = c.expira_em ? Math.floor((new Date(c.expira_em) - Date.now()) / 86400000) : null;
  return {
    conectado: dias === null || dias >= 0,
    usuario: c.usuario_nome,
    expira_em: c.expira_em,
    dias_restantes: dias,
    escopos: c.escopos,
    pode_gerenciar: (c.escopos || []).includes("ads_management"),
  };
}

// ---------------------------------------------------------------
// Sincronização de contas
// ---------------------------------------------------------------

export async function sincronizarContas(token) {
  const sb = db();
  const achadas = await meta.descobrirContas(token);

  const { data: existentes } = await sb.from("report_contas").select("id, plataforma, id_externo, nome, cliente_id, ultimo_erro");
  const chaveDe = (c) => `${c.plataforma}:${c.id_externo}`;
  const ja = new Map((existentes || []).map((c) => [chaveDe(c), c]));

  // Conta de anúncio, página e Instagram chegam com campos diferentes. Num
  // upsert em lote, coluna ausente numa linha vira nula, então todas saem
  // com o mesmo formato. cliente_id e ativo, que o operador decide, nunca
  // entram aqui e por isso nunca são sobrescritos.
  const formato = (c) => ({
    plataforma: c.plataforma, id_externo: c.id_externo, nome: c.nome || null,
    moeda: c.moeda || "BRL", fuso: c.fuso || "America/Sao_Paulo",
    status_externo: c.status_externo || null, bm_id: c.bm_id || null, bm_nome: c.bm_nome || null,
    pagina_id: c.pagina_id || null,
  });
  const agora = new Date().toISOString();
  const novasLinhas = achadas.filter((c) => !ja.has(chaveDe(c))).map((c) => ({ ...formato(c), descoberta_em: agora }));
  const conhecidas = achadas.filter((c) => ja.has(chaveDe(c))).map(formato);

  for (const lote of [novasLinhas, conhecidas]) {
    for (let i = 0; i < lote.length; i += 200) {
      const { error } = await sb.from("report_contas")
        .upsert(lote.slice(i, i + 200), { onConflict: "plataforma,id_externo" });
      if (error) throw new Error(`Falha ao salvar contas: ${error.message}`);
    }
  }

  // Instagram cadastrado à mão com id impreciso: se a descoberta achou o
  // mesmo @, o cliente passa para a linha certa e a provisória sai. Se o id
  // estava certo, só apaga a anotação.
  for (const velho of (existentes || []).filter((c) => c.plataforma === "instagram" && /arredondado/.test(c.ultimo_erro || ""))) {
    if (achadas.some((c) => c.plataforma === "instagram" && c.id_externo === velho.id_externo)) {
      await sb.from("report_contas").update({ ultimo_erro: null }).eq("id", velho.id);
      continue;
    }
    const certo = achadas.find((c) => c.plataforma === "instagram" && c.nome === velho.nome && c.id_externo !== velho.id_externo);
    if (!certo) continue;
    await sb.from("report_contas").update({ cliente_id: velho.cliente_id, ativo: true })
      .eq("plataforma", "instagram").eq("id_externo", certo.id_externo).is("cliente_id", null);
    await sb.from("report_contas").delete().eq("id", velho.id);
  }

  return { total: achadas.length, novas: novasLinhas.length };
}

// ---------------------------------------------------------------
// Datas. A Meta fecha o dia no fuso da conta, então "ontem" é no fuso dela.
// ---------------------------------------------------------------

export function hojeNoFuso(fuso = "America/Sao_Paulo") {
  return new Intl.DateTimeFormat("en-CA", { timeZone: fuso }).format(new Date());
}

export function somarDias(dia, n) {
  const d = new Date(`${dia}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

function diasEntre(desde, ate) {
  const lista = [];
  for (let d = desde; d <= ate; d = somarDias(d, 1)) lista.push(d);
  return lista;
}

// Com o que comparar:
//   mês fechado (1 a 30/09)       → o mês anterior inteiro (1 a 31/08)
//   mês até agora (1 a 25/09)     → os mesmos dias do mês anterior (1 a 25/08),
//                                   que é como todo mundo lê "este mês"
//   qualquer outro (10 a 16/09)   → o período colado antes, do mesmo tamanho
export function periodoAnterior(inicio, fim) {
  const ini = new Date(`${inicio}T12:00:00Z`);
  const f = new Date(`${fim}T12:00:00Z`);
  const ultimoDoMes = new Date(Date.UTC(f.getUTCFullYear(), f.getUTCMonth() + 1, 0)).getUTCDate();
  if (ini.getUTCDate() === 1 && ini.getUTCMonth() === f.getUTCMonth() && ini.getUTCFullYear() === f.getUTCFullYear()) {
    const a = new Date(Date.UTC(ini.getUTCFullYear(), ini.getUTCMonth() - 1, 1));
    const fimDoAnterior = new Date(Date.UTC(ini.getUTCFullYear(), ini.getUTCMonth(), 0)).getUTCDate();
    // 1 a 30/03 compara com 1 a 28/02: o anterior pode ser mais curto.
    const dia = f.getUTCDate() === ultimoDoMes ? fimDoAnterior : Math.min(f.getUTCDate(), fimDoAnterior);
    const b = new Date(Date.UTC(ini.getUTCFullYear(), ini.getUTCMonth() - 1, dia));
    return [a.toISOString().slice(0, 10), b.toISOString().slice(0, 10)];
  }
  const dias = Math.round((f - ini) / 86400000) + 1;
  return [somarDias(inicio, -dias), somarDias(inicio, -1)];
}

// ---------------------------------------------------------------
// Coleta de uma conta
// ---------------------------------------------------------------

async function gravar(tabela, linhas, conflito) {
  for (let i = 0; i < linhas.length; i += 500) {
    const { error } = await db().from(tabela).upsert(linhas.slice(i, i + 500), { onConflict: conflito });
    if (error) throw new Error(`Falha ao gravar ${tabela}: ${error.message}`);
  }
}

// Recoleta os últimos 3 dias a cada rodada: a Meta ainda ajusta conversões
// atribuídas depois do dia fechar. Conta nova busca 30 dias para trás.
export async function coletarConta(conta, token) {
  const sb = db();
  const { data: registro } = await sb.from("report_coletas").insert({ conta_id: conta.id }).select("id").single();

  const ontem = somarDias(hojeNoFuso(conta.fuso), -1);
  const desde = somarDias(ontem, conta.ultima_coleta_em ? -2 : -29);
  const agora = new Date().toISOString();
  let linhas = 0;

  try {
    if (conta.plataforma === "meta_ads") {
      const diarios = await meta.insightsDiarios(token, conta.id_externo, desde, ontem);
      await gravar("report_metricas_diarias", diarios.map((i) => ({
        conta_id: conta.id, data: i.date_start, ...meta.linhaDeInsight(i), atualizado_em: agora,
      })), "conta_id,data");

      const anuncios = await meta.insightsAnuncios(token, conta.id_externo, desde, ontem);
      await gravar("report_anuncios_diarios", anuncios.map((i) => ({
        conta_id: conta.id, data: i.date_start, anuncio_id: i.ad_id, anuncio_nome: i.ad_name,
        conjunto_id: i.adset_id, conjunto_nome: i.adset_name,
        campanha_id: i.campaign_id, campanha_nome: i.campaign_name, objetivo: i.objective,
        ...meta.linhaDeInsight(i), atualizado_em: agora,
      })), "conta_id,data,anuncio_id");

      // Alcance do mês corrente e do anterior, que são os relatórios de sempre.
      const inicioMes = `${ontem.slice(0, 7)}-01`;
      const fimAnterior = somarDias(inicioMes, -1);
      const mesAnterior = [`${fimAnterior.slice(0, 7)}-01`, fimAnterior];
      for (const [a, b] of [[inicioMes, ontem], mesAnterior]) {
        if (a > b) continue;
        const r = await meta.alcancePeriodo(token, conta.id_externo, a, b);
        await gravar("report_metricas_periodo", [{ conta_id: conta.id, inicio: a, fim: b, ...r, atualizado_em: agora }],
          "conta_id,inicio,fim");
      }
      linhas = diarios.length + anuncios.length;
    }

    if (conta.plataforma === "instagram") {
      const novos = await meta.instagramSeguidoresNovos(token, conta.id_externo, desde, somarDias(ontem, 1));
      const perfil = await meta.instagramPerfil(token, conta.id_externo);
      const dias = await meta.emLotes(diasEntre(desde, ontem), 5, async (dia) => ({
        conta_id: conta.id, data: dia, ...(await meta.instagramDia(token, conta.id_externo, dia)),
        seguidores_novos: novos[dia] ?? null, atualizado_em: agora,
      }));
      // Todas as linhas do lote com as mesmas colunas: num upsert em lote,
      // coluna ausente numa linha vira nula e apagaria o dia anterior.
      await gravar("report_metricas_diarias", dias, "conta_id,data");

      // O total de seguidores só existe "agora"; fica no dia de ontem.
      await sb.from("report_metricas_diarias")
        .update({ seguidores: perfil.followers_count ?? null })
        .eq("conta_id", conta.id).eq("data", ontem);

      const posts = await meta.instagramPosts(token, conta.id_externo, `${somarDias(ontem, -30)}T00:00:00Z`);
      await gravar("report_posts", posts.map((p) => ({ conta_id: conta.id, ...p, atualizado_em: agora })),
        "conta_id,id_externo");
      linhas = dias.length + posts.length;
    }

    if (conta.plataforma === "facebook") {
      const seguidores = await meta.paginaSeguidores(token, conta.id_externo);
      await gravar("report_metricas_diarias", [{ conta_id: conta.id, data: ontem, seguidores, atualizado_em: agora }],
        "conta_id,data");
      linhas = 1;
    }

    await sb.from("report_contas").update({ ultima_coleta_em: agora, ultimo_erro: null }).eq("id", conta.id);
    await sb.from("report_coletas").update({ status: "ok", linhas, terminada_em: new Date().toISOString() })
      .eq("id", registro.id);
    return { ok: true, linhas };
  } catch (e) {
    await sb.from("report_contas").update({ ultimo_erro: e.message }).eq("id", conta.id);
    await sb.from("report_coletas").update({ status: "erro", erro: e.message, linhas, terminada_em: new Date().toISOString() })
      .eq("id", registro.id);
    return { ok: false, erro: e.message, tokenInvalido: Boolean(e.tokenInvalido) };
  }
}

// Só coleta conta que já tem cliente: as outras aparecem na aba Contas
// e na gestão ao vivo, mas não gastam chamada todo dia.
export async function contasParaColetar() {
  const { data, error } = await db().from("report_contas")
    .select("id, cliente_id, plataforma, id_externo, nome, fuso, ultima_coleta_em")
    .eq("ativo", true).not("cliente_id", "is", null);
  if (error) throw new Error(error.message);
  return data || [];
}

// ---------------------------------------------------------------
// Números de um cliente num período, com comparação
// ---------------------------------------------------------------

function variacao(atual, anterior) {
  if (atual === null || atual === undefined || anterior === null || anterior === undefined) return null;
  if (Number(anterior) === 0) return Number(atual) === 0 ? 0 : null;
  return Math.round(((Number(atual) - Number(anterior)) / Math.abs(Number(anterior))) * 1000) / 10;
}

async function resumoPorPlataforma(clienteId, inicio, fim) {
  const { data, error } = await db().rpc("report_resumo_periodo", {
    p_cliente: clienteId, p_inicio: inicio, p_fim: fim,
  });
  if (error) throw new Error(`Falha no resumo: ${error.message}`);
  return Object.fromEntries((data || []).map((l) => [l.plataforma, l]));
}

// Alcance de período não sai da soma dos dias. Usa o que a coleta guardou
// para o intervalo exato; se não houver, pergunta à Meta na hora.
async function alcanceDoPeriodo(contas, inicio, fim) {
  const anuncios = contas.filter((c) => c.plataforma === "meta_ads");
  if (!anuncios.length) return null;

  const { data: salvos } = await db().from("report_metricas_periodo")
    .select("conta_id, alcance").in("conta_id", anuncios.map((c) => c.id)).eq("inicio", inicio).eq("fim", fim);
  if ((salvos || []).length === anuncios.length) {
    return salvos.reduce((s, r) => s + Number(r.alcance || 0), 0);
  }

  try {
    const token = await tokenAtivo();
    let total = 0;
    for (const c of anuncios) total += (await meta.alcancePeriodo(token, c.id_externo, inicio, fim)).alcance || 0;
    return total;   // soma entre contas diferentes: pode contar alguém duas vezes, mas é o melhor possível
  } catch {
    return null;
  }
}

export async function numerosDoCliente(clienteId, inicio, fim, { comparar = true, anterior: periodoComparado = null } = {}) {
  const sb = db();
  const { data: cliente } = await sb.from("report_clientes").select("id, nome, slug").eq("id", clienteId).maybeSingle();
  if (!cliente) throw new Error("Cliente da agência não encontrado.");

  const { data: contas } = await sb.from("report_contas")
    .select("id, plataforma, id_externo, nome, ultima_coleta_em, ultimo_erro, ativo").eq("cliente_id", clienteId);
  const ids = (contas || []).map((c) => c.id);

  const [antIni, antFim] = periodoComparado || periodoAnterior(inicio, fim);
  const [atual, anterior, alcance, alcanceAnt] = await Promise.all([
    resumoPorPlataforma(clienteId, inicio, fim),
    comparar ? resumoPorPlataforma(clienteId, antIni, antFim) : {},
    alcanceDoPeriodo(contas || [], inicio, fim),
    comparar ? alcanceDoPeriodo(contas || [], antIni, antFim) : null,
  ]);

  const plataformas = {};
  for (const p of new Set([...Object.keys(atual), ...Object.keys(anterior)])) {
    const a = atual[p] || {};
    const b = anterior[p] || {};
    const campos = Object.keys({ ...a, ...b }).filter((k) => k !== "plataforma");
    plataformas[p] = Object.fromEntries(campos.map((k) => [k, {
      atual: a[k] ?? null, anterior: b[k] ?? null, variacao: variacao(a[k], b[k]),
    }]));
  }
  if (plataformas.meta_ads) {
    plataformas.meta_ads.alcance = { atual: alcance, anterior: alcanceAnt, variacao: variacao(alcance, alcanceAnt) };
  }

  // Série diária para o gráfico.
  const { data: dias } = ids.length ? await sb.from("report_metricas_diarias")
    .select("data, gasto, leads, conversas_iniciadas, cliques, alcance, interacoes, seguidores_novos, conta_id")
    .in("conta_id", ids).gte("data", inicio).lte("data", fim).order("data") : { data: [] };
  const porDia = {};
  for (const d of dias || []) {
    const s = (porDia[d.data] ||= { data: d.data, gasto: 0, leads: 0, conversas: 0, cliques: 0, interacoes: 0, seguidores_novos: 0 });
    s.gasto += Number(d.gasto || 0);
    s.leads += Number(d.leads || 0);
    s.conversas += Number(d.conversas_iniciadas || 0);
    s.cliques += Number(d.cliques || 0);
    s.interacoes += Number(d.interacoes || 0);
    s.seguidores_novos += Number(d.seguidores_novos || 0);
  }

  return {
    cliente,
    periodo: { inicio, fim },
    comparado_com: comparar ? { inicio: antIni, fim: antFim } : null,
    plataformas,
    serie: Object.values(porDia),
    anuncios: await topAnuncios(ids, inicio, fim),
    posts: await topPosts(ids, inicio, fim),
    contas: (contas || []).map(({ id_externo, ...c }) => ({ ...c, id_externo })),
  };
}

export async function topAnuncios(contaIds, inicio, fim, { ordem = "gasto", limite = 10 } = {}) {
  if (!contaIds.length) return [];
  const { data } = await db().from("report_anuncios_diarios")
    .select("anuncio_id, anuncio_nome, campanha_nome, conjunto_nome, gasto, impressoes, cliques, cliques_link, leads, conversas_iniciadas, conversoes, valor_conversoes")
    .in("conta_id", contaIds).gte("data", inicio).lte("data", fim).limit(20000);

  const soma = {};
  for (const l of data || []) {
    const a = (soma[l.anuncio_id] ||= {
      anuncio_id: l.anuncio_id, nome: l.anuncio_nome, campanha: l.campanha_nome, conjunto: l.conjunto_nome,
      gasto: 0, impressoes: 0, cliques: 0, cliques_link: 0, leads: 0, conversas: 0, conversoes: 0, valor: 0,
    });
    a.gasto += Number(l.gasto || 0);
    a.impressoes += Number(l.impressoes || 0);
    a.cliques += Number(l.cliques || 0);
    a.cliques_link += Number(l.cliques_link || 0);
    a.leads += Number(l.leads || 0);
    a.conversas += Number(l.conversas_iniciadas || 0);
    a.conversoes += Number(l.conversoes || 0);
    a.valor += Number(l.valor_conversoes || 0);
  }

  const lista = Object.values(soma).map((a) => {
    const resultados = a.leads + a.conversas + a.conversoes;
    return {
      ...a,
      gasto: Math.round(a.gasto * 100) / 100,
      ctr: a.impressoes ? Math.round((a.cliques / a.impressoes) * 10000) / 100 : null,
      resultados,
      custo_por_resultado: resultados ? Math.round((a.gasto / resultados) * 100) / 100 : null,
    };
  });

  // Menor custo por resultado é "melhor": quem não teve resultado vai pro fim.
  const ordenadores = {
    gasto: (x, y) => y.gasto - x.gasto,
    resultados: (x, y) => y.resultados - x.resultados,
    ctr: (x, y) => (y.ctr ?? -1) - (x.ctr ?? -1),
    custo_por_resultado: (x, y) => (x.custo_por_resultado ?? Infinity) - (y.custo_por_resultado ?? Infinity),
  };
  return lista.sort(ordenadores[ordem] || ordenadores.gasto).slice(0, limite);
}

export async function topPosts(contaIds, inicio, fim, { ordem = "alcance", limite = 8 } = {}) {
  if (!contaIds.length) return [];
  const coluna = ["alcance", "interacoes", "visualizacoes", "salvos", "compartilhamentos"].includes(ordem) ? ordem : "alcance";
  const { data } = await db().from("report_posts")
    .select("id_externo, tipo, legenda, link, miniatura_url, publicado_em, alcance, visualizacoes, curtidas, comentarios, salvos, compartilhamentos, interacoes")
    .in("conta_id", contaIds).gte("publicado_em", `${inicio}T00:00:00Z`).lte("publicado_em", `${fim}T23:59:59Z`)
    .order(coluna, { ascending: false, nullsFirst: false }).limit(limite);
  return data || [];
}

// ---------------------------------------------------------------
// Gestão com trava e histórico
// ---------------------------------------------------------------

export class ErroGuarda extends Error {
  constructor(msg) {
    super(msg);
    this.guarda = true;
  }
}

const TIPOS = { campanha: "campanha", conjunto: "conjunto", anuncio: "anuncio" };
const reais = (v) => Number(v).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
// Aumento acima disto num clique só costuma ser dedo errado (500 em vez de 50).
const LIMITE_AUMENTO = 3;

export async function gerir({ tipo, id, mudanca, origem, forcar = false }) {
  if (!TIPOS[tipo]) throw new ErroGuarda("Tipo precisa ser campanha, conjunto ou anuncio.");
  if (!id) throw new ErroGuarda("Informe o id do objeto na Meta.");

  const m = {};
  if (mudanca.status !== undefined) {
    // Nada de DELETED ou ARCHIVED: apagar campanha não tem volta.
    if (!["ACTIVE", "PAUSED"].includes(mudanca.status)) throw new ErroGuarda("Status só pode ser ACTIVE ou PAUSED.");
    m.status = mudanca.status;
  }
  for (const campo of ["orcamento_diario", "orcamento_total"]) {
    if (mudanca[campo] === undefined) continue;
    const v = Number(mudanca[campo]);
    if (!Number.isFinite(v) || v <= 0) throw new ErroGuarda("Orçamento precisa ser um valor em reais maior que zero.");
    m[campo] = Math.round(v * 100) / 100;
  }
  if (mudanca.nome !== undefined) {
    if (!String(mudanca.nome).trim()) throw new ErroGuarda("O nome não pode ficar vazio.");
    m.nome = String(mudanca.nome).trim();
  }
  if (!Object.keys(m).length) throw new ErroGuarda("Nada para alterar.");

  const token = await tokenAtivo();
  const antes = await meta.lerObjeto(token, id);

  const { data: conta } = await db().from("report_contas")
    .select("id").eq("plataforma", "meta_ads").eq("id_externo", antes.conta).maybeSingle();

  // Orçamento só onde ele existe: campanha com orçamento no conjunto (ou o
  // contrário) recusa, e a Meta explicaria mal.
  if (m.orcamento_diario !== undefined && antes.orcamento_diario === null) {
    throw new ErroGuarda(`${antes.nome} não tem orçamento diário próprio${antes.orcamento_total ? " (usa orçamento total)" : " (o orçamento está no outro nível)"}.`);
  }
  if (m.orcamento_total !== undefined && antes.orcamento_total === null) {
    throw new ErroGuarda(`${antes.nome} não tem orçamento total próprio.`);
  }
  for (const campo of ["orcamento_diario", "orcamento_total"]) {
    if (m[campo] !== undefined && antes[campo] && m[campo] > antes[campo] * LIMITE_AUMENTO && !forcar) {
      throw new ErroGuarda(`Aumento de ${reais(antes[campo])} para ${reais(m[campo])} é mais de ${LIMITE_AUMENTO}x. Confirme para seguir.`);
    }
  }

  const registro = {
    conta_id: conta?.id || null, objeto_tipo: tipo, objeto_id: id, objeto_nome: antes.nome,
    acao: Object.keys(m).join(","),
    antes: Object.fromEntries(Object.keys(m).map((k) => [k, antes[k] ?? null])),
    depois: m, origem,
  };

  try {
    await meta.alterarObjeto(token, id, m);
  } catch (e) {
    await db().from("report_acoes").insert({ ...registro, ok: false, erro: e.message });
    throw e;
  }
  await db().from("report_acoes").insert(registro);
  return { ok: true, objeto: antes.nome, antes: registro.antes, depois: m };
}

export async function historico({ contaId, objetoId, limite = 50 } = {}) {
  let q = db().from("report_acoes")
    .select("id, conta_id, objeto_tipo, objeto_id, objeto_nome, acao, antes, depois, origem, ok, erro, criado_em")
    .order("criado_em", { ascending: false }).limit(limite);
  if (contaId) q = q.eq("conta_id", contaId);
  if (objetoId) q = q.eq("objeto_id", objetoId);
  const { data } = await q;
  return data || [];
}

// ---------------------------------------------------------------
// Relatório para o cliente: retrato dos números + análise + link
// ---------------------------------------------------------------

export async function gerarRelatorio({ clienteId, inicio, fim, resumo }) {
  const dados = await numerosDoCliente(clienteId, inicio, fim);
  delete dados.contas;   // o link é público: não leva id de conta nem erro de coleta
  const { data, error } = await db().from("report_relatorios").insert({
    cliente_id: clienteId, inicio, fim,
    comparar_inicio: dados.comparado_com?.inicio, comparar_fim: dados.comparado_com?.fim,
    resumo: resumo || null, dados,
  }).select("id, codigo, criado_em").single();
  if (error) throw new Error(`Falha ao salvar relatório: ${error.message}`);
  return data;
}

export async function relatorioPublico(codigo) {
  if (!/^[a-f0-9]{24}$/.test(String(codigo || ""))) return null;
  const { data } = await db().from("report_relatorios")
    .select("inicio, fim, comparar_inicio, comparar_fim, resumo, dados, criado_em").eq("codigo", codigo).maybeSingle();
  return data || null;
}
