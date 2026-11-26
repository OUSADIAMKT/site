// CRM: funis, etapas, negócios no kanban e as configurações em volta.
//
// Mora num arquivo com underscore porque `api/` está no teto de 12 funções do
// plano Hobby. Quem expõe isto na web é `painel-conversas.js`, por
// `?rota=crm`, e o `vercel.json` reescreve `/api/painel-crm` para lá.
//
// Separação que organiza o arquivo: `contatos` é a pessoa, `conversas` é o
// que ela falou e `crm_negocios` é a oportunidade de venda. Uma pessoa pode ter
// mais de um negócio (comprou, voltou meses depois), e um negócio pode existir
// sem conversa nenhuma (lead que chegou por telefone).

import { paraE164, chaveTelefone } from "./_telefone.js";
import { dispararGatilho, proximasTarefas, listarTarefas, listarNotas, score } from "./_comercial.js";
import { lerNaoLidas, quemLe, NADA_NAO_LIDO } from "./_leitura.js";
import { chave as chaveEtiqueta } from "./_etiquetas.js";

// O funil que o botão "Criar funil" já traz preenchido. A pessoa troca os
// nomes antes de salvar; ninguém precisa começar de uma tela em branco.
export const ETAPAS_MODELO = [
  { nome: "Novo lead",   cor: "#437EE5", tipo: "aberta" },
  { nome: "Em contato",  cor: "#0EA5E9", tipo: "aberta" },
  { nome: "Proposta",    cor: "#A15C07", tipo: "aberta" },
  { nome: "Negociação",  cor: "#7C3AED", tipo: "aberta" },
  { nome: "Ganho",       cor: "#16A34A", tipo: "ganho" },
  { nome: "Perdido",     cor: "#B42318", tipo: "perdido" },
];

const TIPOS_DE_CAMPO = ["texto", "inteiro", "decimal", "booleano", "data", "datahora"];

// As prioridades que a tela mostra. Mesma lista do check da migração 037: o
// banco recusa qualquer outra, e esta aqui existe para a recusa virar o valor
// anterior em vez de um erro na cara de quem está salvando.
const PRIORIDADES = ["baixa", "normal", "alta", "urgente"];

/** Data que o banco aceita, ou null. Texto que não é data vira null. */
function instante(v) {
  if (!v) return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

// Os cadastros simples da tela de configurações. Cada um diz a tabela e quais
// colunas a tela pode escrever, para o corpo da requisição nunca gravar coluna
// que não devia (cliente_id, por exemplo, vem sempre da sessão).
const CADASTROS = {
  origens:   { tabela: "crm_origens",   colunas: ["nome", "ativo", "ordem"], ordem: "ordem" },
  motivos:   { tabela: "crm_motivos",   colunas: ["nome", "tipo", "ativo", "ordem"], ordem: "ordem" },
  produtos:  { tabela: "crm_produtos",  colunas: ["nome", "descricao", "valor", "ativo"], ordem: "nome" },
  campos:    { tabela: "crm_campos",    colunas: ["nome", "chave", "tipo", "obrigatorio", "ordem", "ativo"], ordem: "ordem" },
  etiquetas: { tabela: "crm_etiquetas", colunas: ["nome", "cor"], ordem: "nome" },
  regras:    { tabela: "crm_regras_palavras", colunas: ["nome", "palavras", "funil_id", "etapa_id", "ativo"], ordem: "criado_em" },
};

function erroDo(r) {
  if (r?.error) {
    const e = new Error(r.error.message);
    // O código do Postgres vai junto: é o que deixa quem chamou distinguir
    // corrida (23505, chave repetida) de defeito, sem ler a mensagem com
    // regex.
    e.code = r.error.code;
    throw e;
  }
  return r?.data;
}

// Quem o código grava em `criado_por` quando o negócio não foi criado por
// gente. É o mesmo texto que a 044 usa no índice único: só os negócios
// automáticos são únicos por conversa, porque a equipe pode abrir um segundo
// negócio para a mesma pessoa à mão (comprou, voltou meses depois).
export const QUEM_AUTOMATICO = "entrada automática";
export const QUEM_TRAZIDAS = "conversas trazidas";

/** Chave repetida: outra mensagem chegou junto e criou o negócio primeiro. */
const corrida = (e) => e?.code === "23505";

function numero(v) {
  if (v === null || v === undefined || v === "") return 0;
  if (typeof v === "number") return v;
  // Aceita "1.200,50" e "1200.50": a pessoa digita do jeito que está acostumada.
  const s = String(v).trim();
  const limpo = s.includes(",") ? s.replace(/\./g, "").replace(",", ".") : s;
  const n = Number(limpo.replace(/[^\d.-]/g, ""));
  return Number.isFinite(n) ? n : 0;
}

function chaveDoCampo(nome) {
  return String(nome || "").normalize("NFD").replace(/[̀-ͯ]/g, "")
    .toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "").slice(0, 40) || "campo";
}

function limparEtiquetas(bruto) {
  const lista = Array.isArray(bruto) ? bruto : String(bruto || "").split(/[;,]/);
  const vistas = new Set();
  for (const e of lista) {
    const limpo = String(e).trim().toLowerCase().replace(/\s+/g, " ");
    if (limpo) vistas.add(limpo.slice(0, 40));
  }
  return [...vistas].slice(0, 20);
}

// ---------------------------------------------------------------------------
// Configuração

/** Tudo que a tela do CRM precisa para desenhar filtros, colunas e formulários. */
export async function configuracao(sb, clienteId) {
  const [funis, etapas, origens, motivos, produtos, campos, etiquetas, regras, atendentes] = await Promise.all([
    sb.from("crm_funis").select("id, nome, ordem, ativo, entrada_automatica").eq("cliente_id", clienteId).order("ordem").order("criado_em"),
    sb.from("crm_etapas").select("id, funil_id, nome, cor, ordem, tipo, limite_dias").eq("cliente_id", clienteId).order("ordem"),
    sb.from("crm_origens").select("id, nome, ativo, ordem").eq("cliente_id", clienteId).order("ordem").order("nome"),
    sb.from("crm_motivos").select("id, nome, tipo, ativo, ordem").eq("cliente_id", clienteId).order("ordem").order("nome"),
    sb.from("crm_produtos").select("id, nome, descricao, valor, ativo").eq("cliente_id", clienteId).order("nome"),
    sb.from("crm_campos").select("id, nome, chave, tipo, obrigatorio, ordem, ativo").eq("cliente_id", clienteId).order("ordem"),
    sb.from("crm_etiquetas").select("id, nome, cor").eq("cliente_id", clienteId).order("nome"),
    sb.from("crm_regras_palavras").select("id, nome, palavras, funil_id, etapa_id, ativo").eq("cliente_id", clienteId).order("criado_em"),
    sb.from("atendentes").select("id, nome, ativo, papel").eq("cliente_id", clienteId).order("nome"),
  ]);

  const listaEtapas = erroDo(etapas) || [];
  return {
    funis: (erroDo(funis) || []).map((f) => ({
      ...f, etapas: listaEtapas.filter((e) => e.funil_id === f.id),
    })),
    origens: erroDo(origens) || [],
    motivos: erroDo(motivos) || [],
    produtos: erroDo(produtos) || [],
    campos: erroDo(campos) || [],
    etiquetas: erroDo(etiquetas) || [],
    regras: erroDo(regras) || [],
    atendentes: (erroDo(atendentes) || []).filter((a) => a.ativo !== false),
    modelo: ETAPAS_MODELO,
  };
}

/**
 * Cria ou edita um funil com as etapas dele, de uma vez.
 *
 * Etapa que sumiu da lista é apagada, a não ser que ainda tenha negócio dentro:
 * aí a gravação para e diz quantos são, em vez de deixar negócio sem coluna.
 */
export async function salvarFunil(sb, clienteId, corpo) {
  const nome = String(corpo.nome || "").trim();
  if (!nome) throw new Error("Dê um nome ao funil.");
  const etapas = (corpo.etapas || []).filter((e) => String(e.nome || "").trim());
  if (!etapas.length) throw new Error("O funil precisa de pelo menos uma etapa.");

  let funil;
  if (corpo.id) {
    const mudar = { nome };
    if (corpo.ordem !== undefined) mudar.ordem = corpo.ordem;
    if (typeof corpo.entrada_automatica === "boolean") mudar.entrada_automatica = corpo.entrada_automatica;
    funil = erroDo(await sb.from("crm_funis").update(mudar)
      .eq("id", corpo.id).eq("cliente_id", clienteId).select().single());
  } else {
    const { count } = await sb.from("crm_funis").select("id", { count: "exact", head: true }).eq("cliente_id", clienteId);
    // O primeiro funil do cliente já nasce recebendo as conversas.
    const entrada = typeof corpo.entrada_automatica === "boolean" ? corpo.entrada_automatica : !count;
    funil = erroDo(await sb.from("crm_funis").insert({
      cliente_id: clienteId, nome, ordem: count || 0, entrada_automatica: entrada,
    }).select().single());
  }
  // Só um funil recebe as conversas: marcar este desmarca os outros.
  if (funil.entrada_automatica) {
    await sb.from("crm_funis").update({ entrada_automatica: false })
      .eq("cliente_id", clienteId).neq("id", funil.id);
  }

  const existentes = erroDo(await sb.from("crm_etapas").select("id").eq("funil_id", funil.id)) || [];
  const mantidas = new Set(etapas.filter((e) => e.id).map((e) => e.id));
  const sairam = existentes.filter((e) => !mantidas.has(e.id)).map((e) => e.id);

  if (sairam.length) {
    const { count } = await sb.from("crm_negocios").select("id", { count: "exact", head: true }).in("etapa_id", sairam);
    if (count) {
      throw new Error(`Uma etapa removida ainda tem ${count} negócio(s). Mova os negócios antes de apagar a etapa.`);
    }
    erroDo(await sb.from("crm_etapas").delete().in("id", sairam));
  }

  for (const [i, e] of etapas.entries()) {
    const linha = {
      nome: String(e.nome).trim().slice(0, 60),
      cor: /^#[0-9a-f]{6}$/i.test(e.cor || "") ? e.cor : "#437EE5",
      tipo: ["aberta", "ganho", "perdido"].includes(e.tipo) ? e.tipo : "aberta",
      ordem: i,
      // Quantos dias um negócio pode ficar nesta etapa antes de contar como
      // parado. Zero, vazio ou lixo viram nulo: etapa sem limite não atrasa
      // ninguém, e o banco recusa limite menor que um.
      limite_dias: Number(e.limite_dias) > 0 ? Math.min(Math.round(Number(e.limite_dias)), 3650) : null,
    };
    if (e.id) erroDo(await sb.from("crm_etapas").update(linha).eq("id", e.id).eq("funil_id", funil.id));
    else erroDo(await sb.from("crm_etapas").insert({ ...linha, cliente_id: clienteId, funil_id: funil.id }));
  }

  return funil;
}

export async function apagarFunil(sb, clienteId, id) {
  const { count } = await sb.from("crm_negocios").select("id", { count: "exact", head: true })
    .eq("funil_id", id).eq("cliente_id", clienteId);
  if (count) throw new Error(`Este funil tem ${count} negócio(s). Mova ou apague os negócios antes.`);
  erroDo(await sb.from("crm_funis").delete().eq("id", id).eq("cliente_id", clienteId));
  return { ok: true };
}

/** Grava um item de cadastro simples (origem, motivo, produto, campo, etiqueta, regra). */
export async function salvarCadastro(sb, clienteId, tipo, corpo) {
  const def = CADASTROS[tipo];
  if (!def) throw new Error("Cadastro desconhecido.");

  const linha = {};
  for (const c of def.colunas) if (corpo[c] !== undefined) linha[c] = corpo[c];
  if (linha.nome !== undefined) linha.nome = String(linha.nome).trim().slice(0, 80);
  if (!corpo.id && !linha.nome) throw new Error("Preencha o nome.");

  if (tipo === "produtos" && linha.valor !== undefined) linha.valor = numero(linha.valor);
  if (tipo === "etiquetas" && linha.nome) linha.nome = linha.nome.toLowerCase();
  if (tipo === "campos") {
    if (linha.tipo && !TIPOS_DE_CAMPO.includes(linha.tipo)) throw new Error("Tipo de campo inválido.");
    if (!corpo.id) linha.chave = chaveDoCampo(corpo.chave || linha.nome);
    else delete linha.chave; // a chave é o nome guardado nos negócios: não muda depois
  }
  if (tipo === "regras") {
    linha.palavras = (Array.isArray(corpo.palavras) ? corpo.palavras : String(corpo.palavras || "").split(/[,;\n]/))
      .map((p) => p.trim().toLowerCase()).filter(Boolean).slice(0, 30);
    if (!corpo.id && !linha.palavras.length) throw new Error("Escreva pelo menos uma palavra.");
    if (!corpo.id && (!linha.funil_id || !linha.etapa_id)) throw new Error("Escolha o funil e a etapa.");
  }

  if (corpo.id) {
    return erroDo(await sb.from(def.tabela).update(linha).eq("id", corpo.id).eq("cliente_id", clienteId).select().single());
  }
  return erroDo(await sb.from(def.tabela).insert({ ...linha, cliente_id: clienteId }).select().single());
}

export async function apagarCadastro(sb, clienteId, tipo, id) {
  const def = CADASTROS[tipo];
  if (!def) throw new Error("Cadastro desconhecido.");
  erroDo(await sb.from(def.tabela).delete().eq("id", id).eq("cliente_id", clienteId));
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Negócios

const CAMPOS_DO_CARTAO = "id, funil_id, etapa_id, contato_id, conversa_id, titulo, telefone, email, valor,"
  + " responsavel_id, origem_id, motivo_id, motivo_texto, situacao, etiquetas, campos, posicao,"
  + " etapa_desde, fechado_em, criado_em, atualizado_em,"
  // Etapa 2: o que o cartão passou a mostrar. `valor_fechado` vem junto porque
  // o rodapé da coluna de ganhos soma receita registrada, não previsão.
  + " prioridade, previsao_em, valor_fechado, score";

/**
 * Os negócios de um funil, já com o nome do responsável, a origem e o contato.
 *
 * `eu` é o id de quem está olhando, e serve às vistas "minhas" e "da equipe".
 * Vem da sessão e nunca da URL: a tela diz qual vista quer, o servidor diz de
 * quem ela é. Sem isso, trocar `vista=meus` por `responsavel=<id da colega>`
 * na barra de endereço daria a caixa dela.
 *
 * Os filtros são todos de banco, e não de tela. O quadro corta em mil cartões,
 * e filtrar depois de carregar traria mil para mostrar dez: quem tem três mil
 * negócios veria um recorte silenciosamente errado.
 */
export async function listarNegocios(sb, clienteId, q = {}, eu = null) {
  // O canal mora na conversa, então filtrar por canal exige junção interna:
  // negócio sem conversa não tem canal nenhum e não pode entrar no recorte
  // "só WhatsApp". Sem o filtro, a junção continua solta e o negócio criado na
  // mão aparece normalmente.
  const juncaoConversa = q.canal ? "conversas!inner(canal, modo, ultima_em)" : "conversas(canal, modo, ultima_em)";
  let consulta = sb.from("crm_negocios")
    .select(`${CAMPOS_DO_CARTAO}, atendentes(nome), crm_origens(nome), ${juncaoConversa}, contatos(nome, empresa, foto_url)`)
    .eq("cliente_id", clienteId);

  if (q.funil) consulta = consulta.eq("funil_id", q.funil);

  // A vista ganha do filtro de responsável quando as duas vêm juntas: a vista
  // é de quem olha, o filtro é uma escolha dentro dela.
  if (q.vista === "meus") {
    // Sessão sem id de atendente (o gestor da plataforma) não tem caixa
    // própria. Devolver a de todo mundo seria mentir no rótulo, então devolve
    // vazio, e a tela desabilita a vista para quem não pode usá-la.
    if (!eu) return [];
    consulta = consulta.eq("responsavel_id", eu);
  } else if (q.vista === "equipe") {
    consulta = consulta.not("responsavel_id", "is", null);
    if (eu) consulta = consulta.neq("responsavel_id", eu);
  } else if (q.vista === "sem") {
    consulta = consulta.is("responsavel_id", null);
  } else if (q.responsavel === "nenhum") {
    consulta = consulta.is("responsavel_id", null);
  } else if (q.responsavel) {
    consulta = consulta.eq("responsavel_id", q.responsavel);
  }

  if (q.origem) consulta = consulta.eq("origem_id", q.origem);
  if (q.etiqueta) consulta = consulta.contains("etiquetas", [q.etiqueta]);
  if (q.situacao) consulta = consulta.eq("situacao", q.situacao);
  if (q.prioridade) consulta = consulta.eq("prioridade", q.prioridade);
  if (q.canal) consulta = consulta.eq("conversas.canal", q.canal);

  // Pontuação mínima. Negócio sem nota nenhuma (score nulo) fica fora de
  // propósito: "pelo menos 40" é uma afirmação sobre quem foi avaliado, e
  // tratar "ninguém avaliou" como zero misturaria as duas coisas.
  const minimo = Number(q.score_minimo);
  if (Number.isFinite(minimo) && minimo > 0) consulta = consulta.gte("score", minimo);

  // Período: negócios criados nos últimos N dias. É o recorte que faz
  // "entraram esta semana" ser uma pergunta respondível no quadro.
  const dias = Number(q.periodo);
  if (Number.isFinite(dias) && dias > 0) {
    consulta = consulta.gte("criado_em", new Date(Date.now() - dias * 86_400_000).toISOString());
  }

  // "Só os atrasados" é filtro de banco, não de tela: filtrar depois de
  // carregar mil cartões traria mil para mostrar dez.
  if (q.atrasados === "1") {
    consulta = consulta.eq("situacao", "aberto").lt("previsao_em", new Date().toISOString());
  }

  const busca = String(q.busca || "").replace(/[,()%*\\]/g, "").trim();
  if (busca) consulta = consulta.or(`titulo.ilike.%${busca}%,telefone.ilike.%${busca}%,email.ilike.%${busca}%`);

  const { data, error } = await consulta.order("posicao").order("criado_em", { ascending: false }).limit(1000);
  if (error) throw new Error(error.message);

  // A próxima atividade de cada cartão, numa consulta só para o quadro
  // inteiro. Falha aqui não derruba o quadro: perder a linha "ligar amanhã" é
  // menos grave do que a tela não abrir.
  const lista = data || [];
  try {
    const agenda = await proximasTarefas(sb, clienteId, lista.map((n) => n.id));
    for (const n of lista) n.proxima_tarefa = agenda.get(n.id) || null;
  } catch (e) {
    console.error("[crm] próximas tarefas:", e.message);
  }

  // Quantas mensagens a pessoa mandou e ESTE operador ainda não leu. É a mesma
  // conta da caixa de entrada, da mesma tabela, pela mesma identidade: um
  // cartão que diz "3" e uma conversa que diz "nenhuma" seriam duas verdades
  // sobre o mesmo fato. Falha aqui não derruba o quadro, só apaga a bolinha.
  try {
    const porConversa = await lerNaoLidas(lista.map((n) => n.conversa_id), quemLe(sessaoFalsa(eu)));
    for (const n of lista) {
      const l = (n.conversa_id && porConversa.get(n.conversa_id)) || NADA_NAO_LIDO;
      n.nao_lidas = l.nao_lidas;
      n.marcada = l.marcada;
    }
  } catch (e) {
    console.error("[crm] não lidas do quadro:", e.message);
  }
  return lista;
}

/**
 * A identidade de leitura a partir do id de quem olha.
 *
 * `quemLe` recebe sessão porque é dela que ele sai no resto do painel. Aqui já
 * chega o id resolvido, e montar o objeto mínimo é mais honesto do que repetir
 * a regra do 'operador' num segundo lugar, onde ela poderia divergir.
 */
function sessaoFalsa(eu) {
  return eu ? { tipo: "atendente", atendente: eu } : { tipo: "operador" };
}

// ---------------------------------------------------------------------------
// Quais informações cada pessoa quer no cartão
//
// Preferência de quem olha, não configuração da empresa: ver `sql/040` e
// `src/quadroCampos.js`, onde mora a lista canônica dos campos.

/** O que a pessoa escolheu, ou `{}` quando ela nunca escolheu nada. */
export async function camposDoQuadro(sb, clienteId, quem) {
  const { data, error } = await sb.from("crm_quadro_campos")
    .select("campos").eq("cliente_id", clienteId).eq("quem", quem).maybeSingle();
  // Preferência é conforto, não dado: se a leitura falhar, a tela abre com o
  // conjunto padrão em vez de não abrir.
  if (error) {
    console.warn("[crm] campos do quadro:", error.message);
    return {};
  }
  return data?.campos || {};
}

/**
 * Guarda a escolha.
 *
 * Confere a FORMA e não o vocabulário: objeto de booleanos, até 40 chaves
 * curtas em minúsculas. Quem conhece os nomes dos campos é a tela, e exigir a
 * lista aqui obrigaria a mexer no servidor a cada campo novo do cartão, com um
 * deploy coordenado no meio. Chave que a tela não conhece mais é ignorada na
 * leitura, que é o que se quer de uma preferência.
 */
export async function salvarCamposDoQuadro(sb, clienteId, quem, campos) {
  if (!campos || typeof campos !== "object" || Array.isArray(campos)) {
    throw new Error("Campos do cartão em formato inesperado.");
  }
  const limpo = {};
  for (const [chave, valor] of Object.entries(campos)) {
    if (!/^[a-z][a-z_]{1,19}$/.test(chave)) continue;
    if (typeof valor !== "boolean") continue;
    limpo[chave] = valor;
    if (Object.keys(limpo).length >= 40) break;
  }
  erroDo(await sb.from("crm_quadro_campos").upsert(
    { cliente_id: clienteId, quem, campos: limpo, atualizado_em: new Date().toISOString() },
    { onConflict: "cliente_id,quem" },
  ));
  return { campos: limpo };
}

async function registrar(sb, clienteId, negocioId, tipo, detalhe, quem) {
  await sb.from("crm_historico").insert({
    cliente_id: clienteId, negocio_id: negocioId, tipo, detalhe: detalhe || {}, quem: quem || null,
  });
}

/** O contato da pessoa, criado se ainda não existe. Casa pelo telefone. */
async function garantirContato(sb, clienteId, { telefone, nome, email }) {
  const e164 = paraE164(telefone);
  if (!e164) return null;
  const { data: existente } = await sb.from("contatos").select("id, nome, email")
    .eq("cliente_id", clienteId).eq("telefone_e164", e164).maybeSingle();
  if (existente) {
    const mudar = {};
    if (!existente.nome && nome) mudar.nome = nome;
    if (!existente.email && email) mudar.email = email;
    if (Object.keys(mudar).length) await sb.from("contatos").update(mudar).eq("id", existente.id);
    return existente.id;
  }
  const { data } = await sb.from("contatos").insert({
    cliente_id: clienteId, telefone_e164: e164, nome: nome || null, email: email || null, origem: "crm",
  }).select("id").single();
  return data?.id || null;
}

async function etapaDoCliente(sb, clienteId, etapaId) {
  const { data } = await sb.from("crm_etapas").select("id, funil_id, nome, tipo")
    .eq("id", etapaId).eq("cliente_id", clienteId).maybeSingle();
  return data;
}

function situacaoDa(etapa) {
  return etapa.tipo === "ganho" ? "ganho" : etapa.tipo === "perdido" ? "perdido" : "aberto";
}

/**
 * Cria ou edita um negócio.
 *
 * O cliente_id vem sempre da sessão. Etapa de outro cliente não passa, porque
 * `etapaDoCliente` filtra pelos dois.
 */
export async function salvarNegocio(sb, clienteId, corpo, quem) {
  const anterior = corpo.id
    ? (await sb.from("crm_negocios").select("*").eq("id", corpo.id).eq("cliente_id", clienteId).maybeSingle()).data
    : null;
  if (corpo.id && !anterior) throw new Error("Negócio não encontrado.");

  const etapaId = corpo.etapa_id || anterior?.etapa_id;
  const etapa = etapaId ? await etapaDoCliente(sb, clienteId, etapaId) : null;
  if (!etapa) throw new Error("Escolha a etapa do funil.");

  let conversa = null;
  if (corpo.conversa_id) {
    const { data } = await sb.from("conversas").select("id, cliente_id, contato, telefone, nome_contato, canal")
      .eq("id", corpo.conversa_id).maybeSingle();
    if (!data || data.cliente_id !== clienteId) throw new Error("Conversa não permitida.");
    conversa = data;
  }

  const telefoneBruto = corpo.telefone ?? anterior?.telefone
    ?? (conversa?.canal !== "instagram" ? (conversa?.contato || conversa?.telefone) : null);
  const telefone = telefoneBruto ? (paraE164(telefoneBruto) || String(telefoneBruto).trim()) : null;
  const titulo = String(corpo.titulo ?? anterior?.titulo ?? conversa?.nome_contato ?? telefone ?? "").trim();
  if (!titulo) throw new Error("Dê um nome ao negócio.");

  const linha = {
    funil_id: etapa.funil_id,
    etapa_id: etapa.id,
    titulo: titulo.slice(0, 120),
    telefone,
    email: corpo.email !== undefined ? (String(corpo.email).trim() || null) : anterior?.email ?? null,
    valor: corpo.valor !== undefined ? numero(corpo.valor) : anterior?.valor ?? 0,
    responsavel_id: corpo.responsavel_id !== undefined ? (corpo.responsavel_id || null) : anterior?.responsavel_id ?? null,
    origem_id: corpo.origem_id !== undefined ? (corpo.origem_id || null) : anterior?.origem_id ?? null,
    etiquetas: corpo.etiquetas !== undefined ? limparEtiquetas(corpo.etiquetas) : anterior?.etiquetas ?? [],
    campos: corpo.campos !== undefined ? (corpo.campos || {}) : anterior?.campos ?? {},
    observacoes: corpo.observacoes !== undefined ? (String(corpo.observacoes).trim() || null) : anterior?.observacoes ?? null,
    prioridade: PRIORIDADES.includes(corpo.prioridade) ? corpo.prioridade : anterior?.prioridade ?? "normal",
    previsao_em: corpo.previsao_em !== undefined ? instante(corpo.previsao_em) : anterior?.previsao_em ?? null,
    score: corpo.score !== undefined ? score(corpo.score) : anterior?.score ?? null,
    situacao: situacaoDa(etapa),
    atualizado_em: new Date().toISOString(),
  };
  if (conversa) linha.conversa_id = conversa.id;

  const mudouEtapa = anterior && anterior.etapa_id !== etapa.id;
  if (!anterior || mudouEtapa) linha.etapa_desde = new Date().toISOString();
  if (linha.situacao === "aberto") {
    linha.fechado_em = null;
    linha.motivo_id = null;
    linha.motivo_texto = null;
  } else if (!anterior || anterior.situacao !== linha.situacao) {
    linha.fechado_em = new Date().toISOString();
  }

  // Receita registrada. Só existe em venda ganha, e só com número: negócio
  // ganho sem valor fechado fica com nulo de propósito, e o painel conta
  // quantos são em vez de somar a previsão como se fosse dinheiro.
  if (linha.situacao === "ganho") {
    if (corpo.valor_fechado !== undefined) {
      linha.valor_fechado = corpo.valor_fechado === null || corpo.valor_fechado === ""
        ? null : numero(corpo.valor_fechado);
    } else if (!anterior || anterior.situacao !== "ganho") {
      // Fechou sem dizer o valor: assume o previsto, que é o que a equipe
      // acabou de negociar. Zero não vira receita.
      linha.valor_fechado = linha.valor > 0 ? linha.valor : null;
    }
  } else if (linha.situacao !== "ganho" && anterior?.situacao === "ganho") {
    linha.valor_fechado = null;
  }
  if (linha.situacao !== "aberto" && (corpo.motivo_id !== undefined || corpo.motivo_texto !== undefined)) {
    linha.motivo_id = corpo.motivo_id || null;
    linha.motivo_texto = String(corpo.motivo_texto || "").trim() || null;
  }

  if (!anterior?.contato_id && telefone) {
    linha.contato_id = await garantirContato(sb, clienteId, { telefone, nome: titulo, email: linha.email });
  }

  let negocio;
  if (anterior) {
    negocio = erroDo(await sb.from("crm_negocios").update(linha).eq("id", anterior.id).select().single());
    if (mudouEtapa) {
      await registrar(sb, clienteId, negocio.id, linha.situacao === "aberto" ? "etapa" : linha.situacao,
        { de: anterior.etapa_id, para: etapa.id, etapa: etapa.nome, motivo_id: linha.motivo_id || null, motivo: linha.motivo_texto || null }, quem);
    }
    if (Number(anterior.valor) !== Number(linha.valor)) {
      await registrar(sb, clienteId, negocio.id, "valor", { de: Number(anterior.valor), para: Number(linha.valor) }, quem);
    }
  } else {
    // Entra no fim da coluna.
    const { data: ultimo } = await sb.from("crm_negocios").select("posicao").eq("etapa_id", etapa.id)
      .order("posicao", { ascending: false }).limit(1).maybeSingle();
    negocio = erroDo(await sb.from("crm_negocios").insert({
      ...linha, cliente_id: clienteId, posicao: (ultimo?.posicao || 0) + 1, criado_por: quem || null,
    }).select().single());
    await registrar(sb, clienteId, negocio.id, "criado", { etapa: etapa.nome }, quem);
  }

  if (Array.isArray(corpo.produtos)) await gravarProdutos(sb, clienteId, negocio.id, corpo.produtos, corpo.valor === undefined);

  await avisarAutomacoes(sb, clienteId, negocio, anterior, etapa);
  return negocio;
}

/**
 * Conta às automações o que acabou de acontecer.
 *
 * Nunca estoura e nunca segura a resposta: quem está salvando um negócio não
 * pode receber erro porque uma automação mal configurada quebrou. O que falha
 * aqui fica gravado em `crm_automacao_execucoes` com o erro dentro.
 *
 * `marca` é o que torna a execução única por FATO, e não por relógio: dois
 * cliques no mesmo botão produzem a mesma marca e a segunda execução é
 * recusada pelo índice único.
 */
async function avisarAutomacoes(sb, clienteId, negocio, anterior, etapa) {
  const base = {
    alvo_id: negocio.id,
    negocio_id: negocio.id,
    contato_id: negocio.contato_id || null,
    responsavel_id: negocio.responsavel_id || null,
    funil_id: negocio.funil_id,
    etapa_id: negocio.etapa_id,
    score: negocio.score || 0,
  };

  const eventos = [];
  if (!anterior) {
    eventos.push(["negocio_novo", { marca: negocio.criado_em || "novo" }]);
  } else {
    if (anterior.etapa_id !== negocio.etapa_id) {
      eventos.push(["etapa_mudou", { marca: negocio.etapa_desde || "", etapa_anterior: anterior.etapa_id }]);
    }
    if ((anterior.responsavel_id || null) !== (negocio.responsavel_id || null)) {
      eventos.push(["responsavel_mudou", { marca: `${negocio.responsavel_id || "-"}:${negocio.atualizado_em}` }]);
    }
    if (JSON.stringify(anterior.etiquetas || []) !== JSON.stringify(negocio.etiquetas || [])) {
      eventos.push(["etiqueta_mudou", { marca: negocio.atualizado_em }]);
    }
  }
  if (negocio.situacao === "ganho" && anterior?.situacao !== "ganho") {
    eventos.push(["venda_ganha", { marca: negocio.fechado_em || "" }]);
  }
  if (negocio.situacao === "perdido" && anterior?.situacao !== "perdido") {
    eventos.push(["venda_perdida", { marca: negocio.fechado_em || "", motivo_id: negocio.motivo_id || null }]);
  }
  if (Number(negocio.score || 0) > Number(anterior?.score || 0)) {
    eventos.push(["score_atingido", { marca: `${negocio.score}:${negocio.id}` }]);
  }

  for (const [gatilho, extra] of eventos) {
    try {
      await dispararGatilho(sb, clienteId, gatilho, { ...base, ...extra });
    } catch (e) {
      console.error(`[crm] automação ${gatilho}:`, e.message);
    }
  }
}

/**
 * Os produtos do negócio. Quando a tela não mandou um valor à mão, o valor do
 * negócio passa a ser a soma dos produtos.
 */
async function gravarProdutos(sb, clienteId, negocioId, itens, recalcular) {
  erroDo(await sb.from("crm_negocio_produtos").delete().eq("negocio_id", negocioId));
  const linhas = itens.filter((i) => i.produto_id || String(i.nome || "").trim()).map((i) => ({
    negocio_id: negocioId,
    produto_id: i.produto_id || null,
    nome: String(i.nome || "Produto").trim().slice(0, 120),
    quantidade: numero(i.quantidade) || 1,
    valor_unitario: numero(i.valor_unitario),
  }));
  if (linhas.length) erroDo(await sb.from("crm_negocio_produtos").insert(linhas));
  if (recalcular && linhas.length) {
    const total = linhas.reduce((s, l) => s + l.quantidade * l.valor_unitario, 0);
    await sb.from("crm_negocios").update({ valor: total }).eq("id", negocioId).eq("cliente_id", clienteId);
  }
}

/**
 * Arrastar o cartão. Muda a etapa e a posição numa chamada só.
 *
 * A posição é um número entre o vizinho de cima e o de baixo, então mover um
 * cartão não renumera a coluna inteira.
 */
export async function moverNegocio(sb, clienteId, corpo, quem) {
  const { data: anterior } = await sb.from("crm_negocios").select("*")
    .eq("id", corpo.id).eq("cliente_id", clienteId).maybeSingle();
  if (!anterior) throw new Error("Negócio não encontrado.");
  const etapa = await etapaDoCliente(sb, clienteId, corpo.etapa_id);
  if (!etapa) throw new Error("Etapa não encontrada.");

  const situacao = situacaoDa(etapa);
  const linha = {
    etapa_id: etapa.id,
    funil_id: etapa.funil_id,
    posicao: Number.isFinite(Number(corpo.posicao)) ? Number(corpo.posicao) : anterior.posicao,
    situacao,
    atualizado_em: new Date().toISOString(),
  };
  const mudouEtapa = anterior.etapa_id !== etapa.id;
  if (mudouEtapa) linha.etapa_desde = new Date().toISOString();
  if (situacao === "aberto") {
    Object.assign(linha, { fechado_em: null, motivo_id: null, motivo_texto: null });
  } else if (anterior.situacao !== situacao) {
    linha.fechado_em = new Date().toISOString();
    linha.motivo_id = corpo.motivo_id || null;
    linha.motivo_texto = String(corpo.motivo_texto || "").trim() || null;
    // Arrastar para a coluna de ganho também registra receita, pelo valor
    // previsto, que é o único número que existe neste momento. Quem quiser
    // corrigir edita o negócio e informa o valor fechado.
    if (situacao === "ganho") {
      linha.valor_fechado = corpo.valor_fechado !== undefined
        ? (corpo.valor_fechado === null || corpo.valor_fechado === "" ? null : numero(corpo.valor_fechado))
        : (Number(anterior.valor) > 0 ? Number(anterior.valor) : null);
    }
  }
  if (situacao !== "ganho" && anterior.situacao === "ganho") linha.valor_fechado = null;

  // Duas pessoas arrastando o mesmo cartão ao mesmo tempo. Comparar aqui em
  // JavaScript não adianta: entre ler o cartão e gravá-lo cabe o pedido da
  // outra pessoa, e as duas gravações passam. Quem decide é o próprio UPDATE:
  // a tela diz em que etapa o cartão estava quando a pessoa pegou nele, essa
  // etapa entra no WHERE, e se o banco já mudou nenhuma linha é atingida.
  let escrita = sb.from("crm_negocios").update(linha).eq("id", anterior.id);
  if (corpo.de_etapa_id) escrita = escrita.eq("etapa_id", corpo.de_etapa_id);
  const negocio = erroDo(await escrita.select().maybeSingle());
  if (!negocio) {
    throw new Error("Esse negócio já foi movido por outra pessoa. O quadro foi atualizado.");
  }
  if (mudouEtapa) {
    await registrar(sb, clienteId, negocio.id, situacao === "aberto" ? "etapa" : situacao,
      { de: anterior.etapa_id, para: etapa.id, etapa: etapa.nome, motivo_id: linha.motivo_id || null, motivo: linha.motivo_texto || null }, quem);
  }
  await avisarAutomacoes(sb, clienteId, negocio, anterior, etapa);
  return negocio;
}

export async function apagarNegocio(sb, clienteId, id) {
  erroDo(await sb.from("crm_negocios").delete().eq("id", id).eq("cliente_id", clienteId));
  return { ok: true };
}

/** O negócio aberto na gaveta: dados, produtos, linha do tempo e a conversa. */
export async function verNegocio(sb, clienteId, id) {
  const { data: negocio } = await sb.from("crm_negocios")
    .select(`*, atendentes(nome), crm_origens(nome), crm_motivos(nome),
      conversas(id, canal, contato, telefone, nome_contato, modo, ultima_em)`)
    .eq("id", id).eq("cliente_id", clienteId).maybeSingle();
  if (!negocio) return null;

  const [produtos, historico, tarefas, notas] = await Promise.all([
    sb.from("crm_negocio_produtos").select("id, produto_id, nome, quantidade, valor_unitario").eq("negocio_id", id),
    sb.from("crm_historico").select("id, tipo, detalhe, quem, criado_em").eq("negocio_id", id)
      .order("criado_em", { ascending: false }).limit(100),
    // As duas vêm do módulo comercial, que já confere o par (id, cliente).
    listarTarefas(sb, clienteId, { negocio: id, concluidas: "1" }).catch(() => []),
    listarNotas(sb, clienteId, { negocio: id }).catch(() => []),
  ]);

  // Sem conversa ligada, procura uma pelo telefone, para a gaveta oferecer
  // "abrir conversa" mesmo em negócio criado à mão.
  let conversa = negocio.conversas || null;
  if (!conversa && negocio.telefone) {
    const chave = chaveTelefone(negocio.telefone);
    const { data: candidatas } = await sb.from("conversas")
      .select("id, canal, contato, telefone, nome_contato, modo, ultima_em")
      .eq("cliente_id", clienteId).eq("canal", "whatsapp")
      .order("ultima_em", { ascending: false }).limit(300);
    conversa = (candidatas || []).find((c) => chaveTelefone(c.contato || c.telefone) === chave) || null;
  }

  return {
    negocio, conversa,
    produtos: produtos.data || [],
    historico: historico.data || [],
    tarefas, notas,
  };
}

/** Os negócios ligados a uma conversa, para o painel lateral da tela Conversas. */
export async function negociosDaConversa(sb, clienteId, conversaId) {
  const { data: conversa } = await sb.from("conversas").select("id, cliente_id, contato, telefone, canal")
    .eq("id", conversaId).maybeSingle();
  if (!conversa || conversa.cliente_id !== clienteId) throw new Error("Conversa não permitida.");

  const { data: diretos } = await sb.from("crm_negocios").select(CAMPOS_DO_CARTAO)
    .eq("cliente_id", clienteId).eq("conversa_id", conversaId).order("criado_em", { ascending: false });

  let lista = diretos || [];
  if (!lista.length && conversa.canal !== "instagram") {
    const e164 = paraE164(conversa.contato || conversa.telefone);
    if (e164) {
      const { data } = await sb.from("crm_negocios").select(CAMPOS_DO_CARTAO)
        .eq("cliente_id", clienteId).eq("telefone", e164).order("criado_em", { ascending: false });
      lista = data || [];
    }
  }
  // A próxima atividade vai junto: quem está na conversa precisa saber o que
  // já está marcado com a pessoa antes de prometer outra coisa.
  if (lista.length) {
    const proximas = await proximasTarefas(sb, clienteId, lista.map((n) => n.id));
    lista = lista.map((n) => ({ ...n, proxima_tarefa: proximas.get(n.id) || null }));
  }
  return lista;
}

/** O que a tela de configurações mostra no histórico de motivos. */
export async function historicoDeFechamento(sb, clienteId) {
  const { data, error } = await sb.from("crm_historico")
    .select("id, tipo, detalhe, quem, criado_em, crm_negocios(titulo, valor)")
    .eq("cliente_id", clienteId).in("tipo", ["ganho", "perdido"])
    .order("criado_em", { ascending: false }).limit(100);
  if (error) throw new Error(error.message);
  return data || [];
}

// ---------------------------------------------------------------------------
// Entrada automática: toda conversa vira negócio, como no CRMs de mercado

/** O funil que recebe as conversas sozinho, com a etapa de entrada. */
async function funilDeEntrada(sb, clienteId) {
  const { data: funil } = await sb.from("crm_funis").select("id")
    .eq("cliente_id", clienteId).eq("entrada_automatica", true)
    .order("ordem").order("criado_em").limit(1).maybeSingle();
  if (!funil) return null;
  const { data: etapa } = await sb.from("crm_etapas").select("id")
    .eq("funil_id", funil.id).eq("tipo", "aberta").order("ordem").limit(1).maybeSingle();
  return etapa ? { funilId: funil.id, etapaId: etapa.id } : null;
}

// Conversa de teste ("teste-ousadia") não é gente: não vira negócio.
function contatoDeVerdade(conversa) {
  return /^\d{6,}$/.test(String(conversa?.contato || conversa?.telefone || ""));
}

// ---------------------------------------------------------------------------
// Origem do negócio
//
// A coluna existia e ninguém preenchia: 96 negócios com origem nula, e o CRM
// mostrando "não informada" em todos. Não era falta de dado, era falta de
// ligação, porque o de-onde-veio já estava gravado em dois lugares.
//
// A etiqueta manda. "veio do disparo", "veio do site", "instagram" e
// "indicacao" são a família `origem` da 041: foi gente lendo a conversa (ou a
// IA lendo por gente) que disse de onde a pessoa veio, e isso vale mais que
// qualquer dedução. Quem não tem etiqueta cai no sinal técnico, que é o que o
// próprio WhatsApp contou quando a conversa nasceu.
//
// `chave` é o que amarra a linha de `crm_origens` ao sinal. O nome é editável
// na tela de configurações, a chave não: renomear "Veio do disparo" para
// "Campanha de novembro" não pode desligar o preenchimento automático.

const ORIGENS_DE_SINAL = {
  anuncio: "Anúncio",
  equipe: "Equipe procurou",
  instagram: "Instagram",
  direto: "WhatsApp direto",
};

function maiusculaInicial(texto) {
  const s = String(texto || "").trim();
  return s ? s[0].toUpperCase() + s.slice(1) : s;
}

/**
 * A linha de `crm_origens` daquela chave, criada se ainda não existe.
 *
 * Nasce aqui em vez de só na migração porque cliente novo não tem seed: sem
 * isto, o Massabor entraria amanhã e passaria meses com a origem vazia até
 * alguém escrever outra migração.
 */
async function garantirOrigem(sb, clienteId, chave, nome) {
  if (!clienteId || !chave) return null;
  const { data: existente } = await sb.from("crm_origens").select("id")
    .eq("cliente_id", clienteId).eq("chave", chave).maybeSingle();
  if (existente) return existente.id;
  const { data } = await sb.from("crm_origens").insert({
    cliente_id: clienteId, chave, nome: nome || maiusculaInicial(chave), ordem: 90,
  }).select("id").maybeSingle();
  return data?.id || null;
}

/** A etiqueta de origem que a conversa carrega: `{ chave, nome }` ou null. */
async function origemPelaEtiqueta(sb, clienteId, conversa) {
  const chaves = (conversa?.etiquetas || []).map(chaveEtiqueta).filter(Boolean);
  if (!chaves.length || !clienteId) return null;
  const { data } = await sb.from("etiquetas_conhecidas").select("etiqueta, chave")
    .eq("cliente_id", clienteId).eq("familia", "origem");
  const porChave = new Map((data || []).map((e) => [e.chave, e.etiqueta]));
  // Na ordem das etiquetas da conversa: a primeira que for de origem ganha.
  for (const c of chaves) {
    if (porChave.has(c)) return { chave: c, nome: maiusculaInicial(porChave.get(c)) };
  }
  return null;
}

/** De onde a conversa nasceu, pelo que o WhatsApp contou. Sempre responde. */
function origemPeloSinal(conversa) {
  const o = conversa?.origem || null;
  // Clique no anúncio (CTWA). É o único que vem com identificador de campanha.
  if (o?.ctwa_clid || o?.source_id) return "anuncio";
  if (o?.tipo === "painel") return "equipe";
  if (o?.tipo === "comentario" || conversa?.canal === "instagram") return "instagram";
  return "direto";
}

/** O `origem_id` que o negócio desta conversa deve ter. */
export async function origemDaConversa(sb, clienteId, conversa) {
  const pela = await origemPelaEtiqueta(sb, clienteId, conversa);
  if (pela) return await garantirOrigem(sb, clienteId, pela.chave, pela.nome);
  const sinal = origemPeloSinal(conversa);
  return await garantirOrigem(sb, clienteId, sinal, ORIGENS_DE_SINAL[sinal]);
}

/**
 * Corrige a origem quando a etiqueta chega depois do negócio.
 *
 * O negócio nasce na primeira mensagem, e a etiqueta de origem só aparece
 * quando a IA entende de onde a pessoa veio, minutos ou dias depois. Sem isto,
 * toda conversa que veio do disparo ficaria registrada como "WhatsApp direto".
 *
 * Só sobrescreve o que foi deduzido: origem nula ou uma das de sinal. Origem
 * escolhida à mão, ou já vinda de etiqueta, fica como está.
 */
export async function corrigirOrigemDoNegocio(sb, clienteId, conversa) {
  const pela = await origemPelaEtiqueta(sb, clienteId, conversa);
  if (!pela) return 0;

  const { data: negocios } = await sb.from("crm_negocios")
    .select("id, origem_id, crm_origens(chave)")
    .eq("cliente_id", clienteId).eq("conversa_id", conversa.id);
  if (!negocios?.length) return 0;

  const deduzida = (n) => !n.origem_id || Object.hasOwn(ORIGENS_DE_SINAL, n.crm_origens?.chave);
  const alvos = negocios.filter(deduzida);
  if (!alvos.length) return 0;

  const origemId = await garantirOrigem(sb, clienteId, pela.chave, pela.nome);
  if (!origemId) return 0;
  for (const n of alvos) {
    if (n.origem_id === origemId) continue;
    await sb.from("crm_negocios").update({ origem_id: origemId }).eq("id", n.id);
  }
  return alvos.length;
}

/**
 * Põe a conversa no funil, se ela ainda não tem negócio nenhum.
 *
 * Roda a cada mensagem que chega. Cliente sem funil de entrada sai na
 * primeira consulta. Quem chama ignora o erro: a resposta da IA nunca espera.
 */
export async function garantirNegocioDaConversa(sb, clienteId, conversa) {
  if (!conversa?.id || !contatoDeVerdade(conversa)) return null;
  const entrada = await funilDeEntrada(sb, clienteId);
  if (!entrada) return null;

  const { count } = await sb.from("crm_negocios").select("id", { count: "exact", head: true })
    .eq("cliente_id", clienteId).eq("conversa_id", conversa.id);
  if (count) return null;

  const titulo = conversa.canal === "instagram" && conversa.nome_contato
    ? `@${conversa.nome_contato}` : undefined;

  // Origem é relatório, não é o negócio: se falhar, o negócio entra sem ela e
  // a etiqueta corrige depois.
  let origemId = null;
  try {
    origemId = await origemDaConversa(sb, clienteId, conversa);
  } catch (e) {
    console.error("[crm] origem da conversa:", e.message);
  }

  try {
    return await salvarNegocio(sb, clienteId,
      { etapa_id: entrada.etapaId, conversa_id: conversa.id, origem_id: origemId,
        ...(titulo ? { titulo } : {}) },
      QUEM_AUTOMATICO);
  } catch (e) {
    // Duas mensagens no mesmo segundo: as duas conferem se a conversa já tem
    // negócio, as duas acham que não, e as duas inserem. Foi assim que
    // nasceram 5 negócios duplicados em 24/11/2026. O índice da 044 derruba a
    // segunda, e perder essa corrida é o resultado certo, não um erro.
    if (corrida(e)) return null;
    throw e;
  }
}

/**
 * Traz para o funil as conversas que já existiam antes dele, dos últimos
 * `dias`. Só cria para quem ainda não tem negócio; rodar duas vezes não
 * duplica nada.
 */
export async function trazerConversas(sb, clienteId, funilId, dias = 30) {
  const { data: funil } = await sb.from("crm_funis").select("id").eq("id", funilId).eq("cliente_id", clienteId).maybeSingle();
  if (!funil) throw new Error("Funil não encontrado.");
  const { data: etapa } = await sb.from("crm_etapas").select("id")
    .eq("funil_id", funilId).eq("tipo", "aberta").order("ordem").limit(1).maybeSingle();
  if (!etapa) throw new Error("O funil não tem etapa em andamento.");

  const desde = new Date(Date.now() - Math.min(Number(dias) || 30, 365) * 86400000).toISOString();
  const { data: conversas } = await sb.from("conversas")
    .select("id, canal, contato, telefone, nome_contato, ultima_em, etiquetas, origem")
    .eq("cliente_id", clienteId).gte("ultima_em", desde)
    .order("ultima_em", { ascending: false }).limit(500);

  const { data: ja } = await sb.from("crm_negocios").select("conversa_id")
    .eq("cliente_id", clienteId).not("conversa_id", "is", null);
  const comNegocio = new Set((ja || []).map((n) => n.conversa_id));

  let criados = 0;
  for (const c of conversas || []) {
    if (comNegocio.has(c.id) || !contatoDeVerdade(c)) continue;
    const titulo = c.canal === "instagram" && c.nome_contato ? `@${c.nome_contato}` : undefined;
    let origemId = null;
    try {
      origemId = await origemDaConversa(sb, clienteId, c);
    } catch (e) {
      console.error("[crm] origem da conversa:", e.message);
    }
    try {
      await salvarNegocio(sb, clienteId, { etapa_id: etapa.id, conversa_id: c.id, origem_id: origemId, ...(titulo ? { titulo } : {}) }, QUEM_TRAZIDAS);
      criados++;
    } catch (e) {
      // A mesma corrida do `garantirNegocioDaConversa`: enquanto o botão
      // percorre 500 conversas, uma delas pode receber mensagem e entrar no
      // funil pelo webhook. Não conta como criado e não derruba o resto.
      if (!corrida(e)) throw e;
    }
  }
  return { criados, vistas: (conversas || []).length };
}

// ---------------------------------------------------------------------------
// Automação por palavras

function normalizar(texto) {
  return String(texto || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

/**
 * Roda a cada mensagem de texto que chega. Se a mensagem tem uma das palavras
 * de uma regra ativa, o negócio da conversa vai para a etapa da regra, e nasce
 * se ainda não existe.
 *
 * Cliente sem regra paga uma consulta pequena e sai. Quem chama ignora o erro:
 * a mensagem da pessoa nunca espera por isto.
 */
export async function aplicarRegrasPalavras(sb, clienteId, conversa, texto) {
  if (!conversa?.id || !texto) return null;
  const { data: regras } = await sb.from("crm_regras_palavras")
    .select("id, nome, palavras, funil_id, etapa_id").eq("cliente_id", clienteId).eq("ativo", true);
  if (!regras?.length) return null;

  const alvo = ` ${normalizar(texto).replace(/[^a-z0-9]+/g, " ")} `;
  const regra = regras.find((r) => (r.palavras || []).some((p) => {
    const termo = normalizar(p).replace(/[^a-z0-9]+/g, " ").trim();
    return termo && alvo.includes(` ${termo} `);
  }));
  if (!regra) return null;

  const { data: existente } = await sb.from("crm_negocios").select("id, etapa_id, situacao")
    .eq("cliente_id", clienteId).eq("conversa_id", conversa.id).eq("funil_id", regra.funil_id)
    .order("criado_em", { ascending: false }).limit(1).maybeSingle();

  const quem = `automação: ${regra.nome}`;
  if (existente) {
    if (existente.etapa_id === regra.etapa_id) return existente;
    return moverNegocio(sb, clienteId, { id: existente.id, etapa_id: regra.etapa_id }, quem);
  }
  return salvarNegocio(sb, clienteId, { etapa_id: regra.etapa_id, conversa_id: conversa.id }, quem);
}
