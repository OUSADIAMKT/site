// O quadro de atendimento: as conversas do cliente repartidas em colunas.
//
// A montagem é pura de propósito. `montarQuadro` recebe linhas e o relógio e
// devolve as colunas, sem tocar em banco e sem ler a hora do sistema. É o que
// permite provar o calor da janela de 24h num script, em vez de esperar vinte
// horas para ver a barra mudar de cor.
//
// As três primeiras colunas saem de `conversas.modo`, que o webhook e a fila
// já preenchem sozinhos. A quarta sai de `atendimentos.encerrada_em`. Nenhuma
// delas depende de alguém lembrar de arrastar cartão: quadro que precisa de
// disciplina humana mente em duas semanas.
//
// FILTRO E CONTAGEM, a correção que deu origem a este desenho.
//
// Antes, o banco trazia as 50 primeiras linhas de cada coluna e a TELA
// filtrava essas 50. Com isso, filtrar por etiqueta, canal ou tempo só
// encontrava quem já estava entre as 50 mais antigas: o cliente com trezentas
// conversas na coluna da IA filtrava por "matricula" e via nada, mesmo tendo
// quarenta. E o contador da coluna mostrava o tamanho da página, não o número
// de conversas que casam com o filtro.
//
// Agora o filtro é aplicado aqui, sobre todos os candidatos lidos do banco, e
// o contador é o resultado do filtro. O corte de página acontece DEPOIS de
// filtrar e ordenar. O teto de leitura por coluna existe para o cliente grande
// não derrubar a função, e quando ele é alcançado a resposta diz isso em vez
// de fingir que o número é exato.

import { db } from "./_db.js";
import { lerSemResposta, SEM_NADA } from "./_semResposta.js";
import { lerNaoLidas } from "./_leitura.js";
import {
  FILTRO_VAZIO, passaNoFiltro, esperaDesde, horasDeJanela, atrasado, FECHANDO_HORAS,
} from "./_filtros.js";

const LIMITE = 50;

// Quantas linhas ler por coluna antes de filtrar. Não é o que a tela mostra: é
// o universo sobre o qual o filtro e o contador trabalham. Passando daqui, a
// resposta marca a coluna como parcial e o contador vira "pelo menos".
const TETO = 600;

const DIAS_DE_HISTORICO = 7;
const TAMANHO_DA_PREVIA = 80;

// Quantas mensagens buscar para montar as prévias. É um teto, não uma conta
// exata: uma conversa muito tagarela pode comer a cota das vizinhas e deixar
// algum cartão sem prévia. Prévia é enfeite, e cartão sem ela continua
// servindo; o que não dá é fazer uma consulta por cartão.
const MENSAGENS_POR_CARTAO = 6;

/** O que mostrar no alto do cartão quando a pessoa não tem nome salvo. */
function nomeDe(linha) {
  const nome = (linha.nome_contato || "").trim();
  return nome || linha.contato || linha.telefone || "sem nome";
}

function cortar(texto) {
  const limpo = String(texto).replace(/\s+/g, " ").trim();
  return limpo.length > TAMANHO_DA_PREVIA
    ? `${limpo.slice(0, TAMANHO_DA_PREVIA - 1)}…`
    : limpo;
}

/**
 * A última mensagem vira uma linha de prévia.
 *
 * O conteúdo é jsonb e vem de dois jeitos: texto puro, das mensagens antigas, ou
 * blocos no formato da Anthropic. Quando o último bloco é uma chamada de
 * ferramenta, não há o que mostrar, e prévia vazia é melhor que "[object Object]".
 */
function previaDe(conteudo) {
  if (!conteudo) return "";
  if (typeof conteudo === "string") return cortar(conteudo);
  if (Array.isArray(conteudo)) {
    const bloco = conteudo.find((b) => b?.type === "text" && b.text);
    return bloco ? cortar(bloco.text) : "";
  }
  return "";
}

/**
 * O calor da janela de 24h, em quatro passos.
 *
 * Depois dela o WhatsApp só deixa reabrir com modelo aprovado, então o que a
 * barra mede é quanto tempo resta para responder de graça. No Instagram não
 * existe essa janela: ali o calor é `null` e o cartão mostra outra coisa.
 */
function janelaDe(expiraEm, agora) {
  if (!expiraEm) return { calor: null, janela_fechada: false };

  const faltamHoras = (new Date(expiraEm).getTime() - agora.getTime()) / 3_600_000;
  if (faltamHoras <= 0) return { calor: 4, janela_fechada: true };
  if (faltamHoras < 2) return { calor: 4, janela_fechada: false };
  if (faltamHoras < 6) return { calor: 3, janela_fechada: false };
  if (faltamHoras < 12) return { calor: 2, janela_fechada: false };
  return { calor: 1, janela_fechada: false };
}

function cartaoDaConversa(linha, previas, agora, situacoes, lidas) {
  const situacao = situacoes?.get(linha.id) || SEM_NADA;
  const leitura = lidas?.get(linha.id) || { nao_lidas: 0, marcada: false };
  return {
    id: linha.id,
    canal: linha.canal || "whatsapp",
    contato: linha.contato || linha.telefone || null,
    nome: nomeDe(linha),
    score: linha.score || 0,
    ultima_em: linha.ultima_em || null,
    fila_desde: linha.fila_desde || null,
    assumida_em: linha.assumida_em || null,
    janela_expira_em: linha.janela_expira_em || null,
    ...janelaDe(linha.janela_expira_em, agora),
    motivo: linha.motivo_fila || null,
    atendente: nomeDeQuemAtende(linha),
    etiquetas: linha.etiquetas || [],
    previa: previas.get(linha.id) || "",
    // Quantas mensagens da pessoa estão sem resposta, e desde quando. É o que
    // separa, de longe, a conversa que já foi respondida da que está esperando.
    sem_resposta: situacao.sem_resposta || 0,
    sem_resposta_desde: situacao.sem_resposta_desde || null,
    respondida_por: situacao.respondida_por || null,
    nao_lidas: leitura.nao_lidas || 0,
    marcada: Boolean(leitura.marcada),
  };
}

/**
 * Quem está com a conversa, para a tela.
 *
 * `atendentes(nome)` responde quando é uma atendente. Quando é o gestor, não
 * responde nada: ele não tem linha em `atendentes`, e por isso o cartão
 * aparecia na coluna "atendendo" sem nome nenhum, como se estivesse sozinho.
 * `assumido_por` é quem resolve isso, com a mesma palavra que o resto da
 * plataforma usa para ele.
 */
function nomeDeQuemAtende(linha) {
  if (linha.atendentes?.nome) return linha.atendentes.nome;
  return linha.assumido_por === "operador" ? "Gestor" : null;
}

function cartaoDoEncerrado(linha) {
  const conversa = linha.conversas || {};
  return {
    id: linha.id,
    conversa_id: linha.conversa_id,
    canal: conversa.canal || "whatsapp",
    contato: conversa.contato || conversa.telefone || null,
    nome: nomeDe(conversa),
    etiquetas: conversa.etiquetas || [],
    encerrada_em: linha.encerrada_em,
    desfecho: linha.desfecho || null,
    motivo: linha.motivo || null,
    atendente: nomeDeQuemAtende(linha),
  };
}

/** Ordena por uma data, dos mais antigos para os mais novos ou o contrário. */
function porData(campo, crescente) {
  return (a, b) => {
    const x = a[campo] ? new Date(a[campo]).getTime() : 0;
    const y = b[campo] ? new Date(b[campo]).getTime() : 0;
    return crescente ? x - y : y - x;
  };
}

/**
 * As ordens que a pessoa pode escolher no alto do quadro.
 *
 * "Ordem da coluna" (o padrão) é diferente em cada coluna e está explicada
 * onde é montada. As outras três valem igual nas quatro colunas, porque a
 * pergunta que elas respondem não muda de coluna para coluna.
 */
const ORDENADORES = {
  // Movimento recente primeiro. No encerrado, o que acabou de fechar.
  recente: (a, b) => {
    const q = (c) => c.ultima_em || c.encerrada_em || c.assumida_em || c.fila_desde;
    return new Date(q(b) || 0) - new Date(q(a) || 0);
  },
  // Quem está parado há mais tempo primeiro.
  espera: (a, b) => new Date(esperaDesde(a) || 0) - new Date(esperaDesde(b) || 0),
  // Janela fechando antes primeiro. Quem não tem janela vai para o fim: não
  // há prazo correndo, então não há por que disputar o alto da coluna.
  janela: (a, b) => {
    const q = (c) => (c.janela_expira_em ? new Date(c.janela_expira_em).getTime() : Infinity);
    return q(a) - q(b);
  },
};

/**
 * Corta a coluna no limite e diz quantos ficaram de fora.
 *
 * `lista` já vem filtrada: `total` é o tamanho dela, e por isso é a verdade
 * sobre quantas conversas casam com o filtro. `parcial` diz que o banco tinha
 * mais linhas que o teto de leitura, e então o total é um "pelo menos".
 */
function cortarColuna(lista, limite, parcial) {
  const itens = lista.slice(0, limite);
  return {
    itens,
    total: lista.length,
    cortados: Math.max(0, lista.length - itens.length),
    parcial: Boolean(parcial),
  };
}

/**
 * Monta as quatro colunas. Função pura: mesmas entradas, mesma saída.
 *
 * `dados` é { conversas, atendimentos, ultimas, sem_resposta, nao_lidas }, cru
 * do banco. `agora` é a hora de referência, passada de fora para o cálculo ser
 * testável. `opcoes.filtro` e `opcoes.ordem` vêm da tela.
 */
export function montarQuadro(dados, agora, opcoes = {}) {
  const limite = opcoes.limite || LIMITE;
  const filtro = { ...FILTRO_VAZIO, ...(opcoes.filtro || {}) };
  const ordenador = ORDENADORES[opcoes.ordem] || null;
  const conversas = dados.conversas || [];
  const relogio = agora.getTime();

  const previas = new Map();
  for (const m of dados.ultimas || []) {
    if (!previas.has(m.conversa_id)) previas.set(m.conversa_id, previaDe(m.conteudo));
  }

  // A contagem de mensagens sem resposta vem pronta do banco, em `dados`, para
  // `montarQuadro` continuar pura: o teste monta o quadro inteiro sem Postgres.
  const situacoes = new Map();
  for (const s of dados.sem_resposta || []) {
    situacoes.set(s.conversa_id, {
      sem_resposta: Number(s.sem_resposta) || 0,
      sem_resposta_desde: s.desde || s.sem_resposta_desde || null,
      respondida_por: s.respondida_por || null,
    });
  }

  const lidas = new Map();
  for (const l of dados.nao_lidas || []) {
    lidas.set(l.conversa_id, { nao_lidas: Number(l.nao_lidas) || 0, marcada: Boolean(l.marcada) });
  }

  const comModo = (modo) => conversas.filter((c) => c.modo === modo);
  const emCartoes = (linhas) => linhas.map((l) => cartaoDaConversa(l, previas, agora, situacoes, lidas));
  // O filtro roda sobre o cartão, não sobre a linha do banco, porque é o cartão
  // que tem `sem_resposta`, `nao_lidas` e a situação da janela já calculadas.
  const filtrar = (cartoes) => cartoes.filter((c) => passaNoFiltro(c, filtro, relogio));

  // Quem espera há mais tempo encabeça a fila. Nas outras colunas o que
  // importa é o movimento recente, então a ordem se inverte.
  //
  // Antes de qualquer uma dessas regras vem a pergunta que quem atende faz ao
  // abrir o quadro: tem alguém falando comigo sem resposta? Cartão com
  // mensagem parada sobe, e entre eles sobe quem está esperando há mais tempo.
  // Sem isso o cartão esquecido afunda justamente porque está esquecido.
  const primeiroOsParados = (proximo) => (a, b) => {
    const pa = (a.sem_resposta || 0) > 0;
    const pb = (b.sem_resposta || 0) > 0;
    if (pa !== pb) return pa ? -1 : 1;
    if (pa && pb) return porData("sem_resposta_desde", true)(a, b);
    return proximo(a, b);
  };

  const parcial = dados.parcial || {};
  const montar = (cartoes, padrao, qual) =>
    cortarColuna(filtrar(cartoes).sort(ordenador || padrao), limite, parcial[qual]);

  const precisa = montar(emCartoes(comModo("fila")), porData("fila_desde", true), "precisa");
  const atendendo = montar(emCartoes(comModo("humano")), primeiroOsParados(porData("assumida_em", true)), "atendendo");
  const ia = montar(emCartoes(comModo("ia")), primeiroOsParados(porData("ultima_em", false)), "ia");
  const encerrado = montar((dados.atendimentos || []).map(cartaoDoEncerrado), porData("encerrada_em", false), "encerrado");

  const colunas = { precisa, atendendo, ia, encerrado };
  const porChave = (campo) => Object.fromEntries(
    Object.entries(colunas).map(([k, v]) => [k, v[campo]]));

  return {
    precisa: precisa.itens,
    atendendo: atendendo.itens,
    ia: ia.itens,
    encerrado: encerrado.itens,
    // Quantas casam com o filtro, por coluna. É o que o contador mostra.
    total: porChave("total"),
    truncado: porChave("cortados"),
    parcial: porChave("parcial"),
  };
}

/**
 * Os números do alto do quadro. Não respeitam o filtro de propósito.
 *
 * O filtro responde "me mostra só isto"; os indicadores respondem "como está o
 * atendimento agora". Se eles mudassem com o filtro, a pessoa filtraria por um
 * atendente e o painel diria que ninguém está esperando.
 *
 * Função pura, sobre as mesmas linhas já lidas do banco.
 */
export function montarIndicadores(dados, agora) {
  const relogio = agora.getTime();
  const conversas = dados.conversas || [];

  const situacoes = new Map();
  for (const s of dados.sem_resposta || []) {
    situacoes.set(s.conversa_id, {
      sem_resposta: Number(s.sem_resposta) || 0,
      sem_resposta_desde: s.desde || s.sem_resposta_desde || null,
    });
  }

  let semResposta = 0;
  let fechando = 0;
  let atrasados = 0;
  for (const c of conversas) {
    const s = situacoes.get(c.id) || SEM_NADA;
    if ((s.sem_resposta || 0) > 0) semResposta += 1;
    if (atrasado(s, relogio)) atrasados += 1;
    const horas = horasDeJanela(c, relogio);
    if (horas !== null && horas > 0 && horas < FECHANDO_HORAS) fechando += 1;
  }

  const conta = (modo) => conversas.filter((c) => c.modo === modo).length;
  return {
    aguardando: conta("fila"),
    humano: conta("humano"),
    ia: conta("ia"),
    sem_resposta: semResposta,
    atrasados,
    janela_fechando: fechando,
    // Os indicadores são exatos só quando nenhuma coluna bateu no teto de
    // leitura. Dizer isso é mais útil que mostrar um número redondo e errado.
    parcial: Object.values(dados.parcial || {}).some(Boolean),
  };
}

/**
 * Lê do banco o que o quadro precisa.
 *
 * Quatro consultas de linhas, uma por coluna, cada uma ordenada e limitada no
 * banco pelo teto. Depois duas chamadas de função (sem resposta e não lidas)
 * sobre os ids que vieram, e uma consulta de mensagens para as prévias. Sete
 * idas, independente do tamanho do cliente, e nenhuma por cartão.
 */
export async function carregarQuadro(clienteId, opcoes = {}) {
  const sb = db();
  const teto = Math.min(Number(opcoes.teto) || TETO, TETO);
  const quem = opcoes.quem || null;
  const desde = new Date(Date.now() - DIAS_DE_HISTORICO * 86_400_000).toISOString();

  const campos = "id, canal, contato, telefone, nome_contato, modo, score, ultima_em,"
    + " fila_desde, assumida_em, motivo_fila, janela_expira_em, etiquetas, atendente_id, assumido_por, atendentes(nome)";

  // A busca vai ao banco e não à tela, porque procurar alguém que ficou atrás
  // do teto e não achar é pior que não ter busca. Vírgula e parênteses saem do
  // termo: são a sintaxe do `or` do PostgREST e, soltos, viram outra consulta.
  const termo = String(opcoes.busca || "").replace(/[,()%*\\]/g, "").trim();
  const comBusca = (consulta) => (termo
    ? consulta.or(`nome_contato.ilike.%${termo}%,contato.ilike.%${termo}%,telefone.ilike.%${termo}%`)
    : consulta);

  const [precisa, atendendo, ia, atendimentos] = await Promise.all([
    comBusca(sb.from("conversas").select(campos, { count: "exact" })
      .eq("cliente_id", clienteId).eq("modo", "fila"))
      .order("fila_desde", { ascending: true, nullsFirst: false }).limit(teto),
    comBusca(sb.from("conversas").select(campos, { count: "exact" })
      .eq("cliente_id", clienteId).eq("modo", "humano"))
      .order("assumida_em", { ascending: true, nullsFirst: false }).limit(teto),
    comBusca(sb.from("conversas").select(campos, { count: "exact" })
      .eq("cliente_id", clienteId).eq("modo", "ia"))
      .order("ultima_em", { ascending: false, nullsFirst: false }).limit(teto),
    sb.from("atendimentos")
      .select("id, conversa_id, assumido_por, encerrada_em, desfecho, motivo,"
        + " atendentes(nome), conversas(canal, contato, telefone, nome_contato, etiquetas)",
        { count: "exact" })
      .eq("cliente_id", clienteId)
      .not("encerrada_em", "is", null)
      .gte("encerrada_em", desde)
      .order("encerrada_em", { ascending: false })
      .limit(teto),
  ]);

  const falhou = [precisa, atendendo, ia].find((r) => r.error);
  if (falhou) throw new Error(`Falha ao ler as conversas: ${falhou.error.message}`);
  if (atendimentos.error) throw new Error(`Falha ao ler os encerrados: ${atendimentos.error.message}`);

  // A busca do encerrado é feita aqui e não no banco: o nome está na conversa
  // embutida, e filtrar por coluna de relação no PostgREST exigiria um join
  // interno que mudaria o significado da consulta. Como o encerrado já está
  // preso a sete dias e ao teto, filtrar em memória não esconde ninguém.
  const casa = (texto) => !termo
    || String(texto || "").toLowerCase().includes(termo.toLowerCase());
  const encerrados = (atendimentos.data || []).filter((a) => {
    const c = a.conversas || {};
    return casa(c.nome_contato) || casa(c.contato) || casa(c.telefone);
  });

  const dados = {
    conversas: [...(precisa.data || []), ...(atendendo.data || []), ...(ia.data || [])],
    atendimentos: encerrados,
    ultimas: [],
    // Coluna parcial é coluna em que o banco tinha mais linhas que o teto. O
    // contador dela é um "pelo menos", e a resposta precisa dizer isso.
    parcial: {
      precisa: (precisa.count || 0) > (precisa.data || []).length,
      atendendo: (atendendo.count || 0) > (atendendo.data || []).length,
      ia: (ia.count || 0) > (ia.data || []).length,
      encerrado: (atendimentos.count || 0) > (atendimentos.data || []).length,
    },
  };

  const ids = dados.conversas.map((c) => c.id);
  if (!ids.length) return dados;

  // As duas contagens rodam sobre TODOS os candidatos, não só sobre a página,
  // porque "só sem resposta" e "só não lidas" filtram por elas: contar depois
  // do corte faria o filtro achar apenas o que já estava visível.
  const [situacoes, leituras] = await Promise.all([
    lerSemResposta(ids),
    quem ? lerNaoLidas(ids, quem) : Promise.resolve(new Map()),
  ]);
  dados.sem_resposta = [...situacoes].map(([conversa_id, s]) => ({ conversa_id, ...s }));
  dados.nao_lidas = [...leituras].map(([conversa_id, l]) => ({ conversa_id, ...l }));
  return dados;
}

/**
 * As prévias dos cartões que a tela vai mostrar.
 *
 * Fica fora de `carregarQuadro` porque só se sabe quais cartões sobreviveram
 * ao filtro e ao corte depois de montar o quadro. Buscar antes traria prévia
 * de seiscentas conversas para mostrar cinquenta.
 */
export async function lerPrevias(ids) {
  const limpos = [...new Set((ids || []).filter(Boolean))];
  if (!limpos.length) return [];
  const { data, error } = await db().from("mensagens")
    .select("conversa_id, conteudo, criado_em")
    .in("conversa_id", limpos)
    .order("criado_em", { ascending: false })
    .limit(limpos.length * MENSAGENS_POR_CARTAO);
  if (error) {
    console.warn("[quadro] não deu para ler as prévias:", error.message);
    return [];
  }
  return data || [];
}
