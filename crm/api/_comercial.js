// O lado comercial do CRM: tarefas, anotações, automações, IA e indicadores.
//
// Arquivo com `_`: não conta no teto de 12 funções da Vercel. Quem expõe isto
// na web é `painel-conversas.js`, pela rota `crm`, do mesmo jeito que
// `_negocios.js` e `_crm.js`.
//
// Três ideias organizam o arquivo:
//
// 1. Toda consulta e toda escrita levam `cliente_id`. Não existe função aqui
//    que receba só um id: o par (id, cliente) é o que separa as empresas, e o
//    banco confere de novo por conta própria, com as chaves compostas da
//    migração 037.
//
// 2. A automação é um motor pequeno e desconfiado. Ela recusa repetir a mesma
//    execução, recusa descer mais de três níveis e NUNCA manda mensagem por
//    conta própria sem a empresa ter ligado isso explicitamente.
//
// 3. Indicador separa o que é dinheiro do que é esperança. `valor` é previsão,
//    `valor_fechado` é receita registrada, e os dois nunca somam juntos.

import { paraE164 } from "./_telefone.js";

/** Erro do PostgREST vira exceção com a mensagem dele. */
function erroDo(r) {
  if (r?.error) throw new Error(r.error.message);
  return r?.data;
}

function texto(v, limite = 2000) {
  return String(v ?? "").trim().slice(0, limite);
}

function numero(v) {
  if (v === null || v === undefined || v === "") return 0;
  const n = Number(String(v).replace(/\./g, "").replace(",", "."));
  return Number.isFinite(n) ? n : 0;
}

/**
 * Score de 0 a 100, ou nulo.
 *
 * Em branco é nulo, não zero: zero diz "avaliei e não vale nada", nulo diz
 * "ninguém avaliou". O banco recusa fora dessa faixa, então quem passa daqui
 * já chega dentro dela em vez de derrubar o pedido inteiro.
 */
export function score(v) {
  if (v === null || v === undefined || String(v).trim() === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? Math.max(0, Math.min(100, Math.trunc(n))) : null;
}

/** Data que o banco aceita, ou null. Recusa texto que não é data. */
function instante(v) {
  if (!v) return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

// ---------------------------------------------------------------------------
// Tarefas e atividades

const TIPOS_TAREFA = ["tarefa", "ligacao", "mensagem", "reuniao", "proposta", "visita"];

/**
 * As tarefas de um alvo, ou a agenda inteira do cliente.
 *
 * `so_abertas` é o padrão da tela: quem abre o CRM quer ver o que falta fazer,
 * não o histórico de tudo que já foi feito.
 */
export async function listarTarefas(sb, clienteId, q = {}) {
  let consulta = sb.from("crm_tarefas")
    .select("id, negocio_id, contato_id, titulo, descricao, tipo, vence_em, concluida_em,"
      + " concluida_por, responsavel_id, criado_por, criado_em, atendentes(nome),"
      + " crm_negocios(id, titulo)")
    .eq("cliente_id", clienteId);

  if (q.negocio) consulta = consulta.eq("negocio_id", q.negocio);
  if (q.contato) consulta = consulta.eq("contato_id", q.contato);
  if (q.responsavel === "nenhum") consulta = consulta.is("responsavel_id", null);
  else if (q.responsavel) consulta = consulta.eq("responsavel_id", q.responsavel);
  if (q.concluidas !== "1" && q.concluidas !== true) consulta = consulta.is("concluida_em", null);

  // Ordem: o que vence primeiro aparece primeiro, e tarefa sem prazo vai para
  // o fim. Sem o `nullsFirst: false` o Postgres joga nulo para cima, e a
  // agenda abre mostrando o que não tem data.
  const { data, error } = await consulta
    .order("vence_em", { ascending: true, nullsFirst: false })
    .order("criado_em", { ascending: false })
    .limit(Math.min(Number(q.limite) || 200, 500));
  if (error) throw new Error(error.message);
  return data || [];
}

/**
 * Cria ou edita uma tarefa.
 *
 * O alvo é conferido contra o cliente da sessão ANTES da gravação. O banco
 * recusaria de qualquer forma, pela chave composta, mas o erro dele fala em
 * nome de constraint e quem está na tela não tem nada com isso.
 */
export async function salvarTarefa(sb, clienteId, corpo = {}, quem = null) {
  const titulo = texto(corpo.titulo, 160);
  if (!titulo) throw new Error("Dê um nome à tarefa.");

  const tipo = TIPOS_TAREFA.includes(corpo.tipo) ? corpo.tipo : "tarefa";
  const negocioId = corpo.negocio_id || null;
  const contatoId = corpo.contato_id || null;
  if (!negocioId && !contatoId) throw new Error("A tarefa precisa de um negócio ou de um contato.");

  if (negocioId) {
    const { data } = await sb.from("crm_negocios").select("id")
      .eq("id", negocioId).eq("cliente_id", clienteId).maybeSingle();
    if (!data) throw new Error("Negócio não encontrado.");
  }
  if (contatoId) {
    const { data } = await sb.from("contatos").select("id")
      .eq("id", contatoId).eq("cliente_id", clienteId).maybeSingle();
    if (!data) throw new Error("Contato não encontrado.");
  }

  const linha = {
    titulo,
    descricao: texto(corpo.descricao) || null,
    tipo,
    vence_em: instante(corpo.vence_em),
    responsavel_id: corpo.responsavel_id || null,
  };

  if (corpo.id) {
    const tarefa = erroDo(await sb.from("crm_tarefas").update(linha)
      .eq("id", corpo.id).eq("cliente_id", clienteId).select().maybeSingle());
    if (!tarefa) throw new Error("Tarefa não encontrada.");
    return tarefa;
  }

  const tarefa = erroDo(await sb.from("crm_tarefas").insert({
    ...linha,
    cliente_id: clienteId,
    negocio_id: negocioId,
    contato_id: contatoId,
    criado_por: quem || null,
  }).select().single());

  if (negocioId) {
    await registrarHistorico(sb, clienteId, negocioId, "tarefa", { titulo, tipo }, quem);
  }
  return tarefa;
}

/** Conclui ou reabre. Reabrir existe porque todo mundo marca errado uma hora. */
export async function concluirTarefa(sb, clienteId, id, concluida = true, quem = null) {
  const tarefa = erroDo(await sb.from("crm_tarefas")
    .update({
      concluida_em: concluida ? new Date().toISOString() : null,
      concluida_por: concluida ? (quem || null) : null,
    })
    .eq("id", id).eq("cliente_id", clienteId).select().maybeSingle());
  if (!tarefa) throw new Error("Tarefa não encontrada.");
  return tarefa;
}

export async function apagarTarefa(sb, clienteId, id) {
  erroDo(await sb.from("crm_tarefas").delete().eq("id", id).eq("cliente_id", clienteId));
  return { ok: true };
}

/**
 * A próxima tarefa aberta de cada negócio de uma lista.
 *
 * Uma consulta só para o quadro inteiro, não uma por cartão: com trezentos
 * cartões na tela, uma por cartão são trezentas idas ao banco para desenhar
 * uma linha de texto.
 */
export async function proximasTarefas(sb, clienteId, negocioIds = []) {
  if (!negocioIds.length) return new Map();
  const { data } = await sb.from("crm_tarefas")
    .select("id, negocio_id, titulo, tipo, vence_em")
    .eq("cliente_id", clienteId)
    .in("negocio_id", negocioIds.slice(0, 1000))
    .is("concluida_em", null)
    .order("vence_em", { ascending: true, nullsFirst: false })
    .limit(2000);

  const porNegocio = new Map();
  for (const t of data || []) {
    if (!porNegocio.has(t.negocio_id)) porNegocio.set(t.negocio_id, t);
  }
  return porNegocio;
}

// ---------------------------------------------------------------------------
// Anotações internas

export async function listarNotas(sb, clienteId, q = {}) {
  let consulta = sb.from("crm_notas")
    .select("id, negocio_id, contato_id, texto, autor, criado_em")
    .eq("cliente_id", clienteId);
  if (q.negocio) consulta = consulta.eq("negocio_id", q.negocio);
  if (q.contato) consulta = consulta.eq("contato_id", q.contato);

  const { data, error } = await consulta.order("criado_em", { ascending: false }).limit(200);
  if (error) throw new Error(error.message);
  return data || [];
}

export async function criarNota(sb, clienteId, corpo = {}, quem = null) {
  const conteudo = texto(corpo.texto, 4000);
  if (!conteudo) throw new Error("Escreva a anotação.");
  const negocioId = corpo.negocio_id || null;
  const contatoId = corpo.contato_id || null;
  if (!negocioId && !contatoId) throw new Error("A anotação precisa de um negócio ou de um contato.");

  if (negocioId) {
    const { data } = await sb.from("crm_negocios").select("id")
      .eq("id", negocioId).eq("cliente_id", clienteId).maybeSingle();
    if (!data) throw new Error("Negócio não encontrado.");
  }
  if (contatoId) {
    const { data } = await sb.from("contatos").select("id")
      .eq("id", contatoId).eq("cliente_id", clienteId).maybeSingle();
    if (!data) throw new Error("Contato não encontrado.");
  }

  return erroDo(await sb.from("crm_notas").insert({
    cliente_id: clienteId,
    negocio_id: negocioId,
    contato_id: contatoId,
    texto: conteudo,
    autor: quem || null,
    autor_id: corpo.autor_id || null,
  }).select().single());
}

export async function apagarNota(sb, clienteId, id) {
  erroDo(await sb.from("crm_notas").delete().eq("id", id).eq("cliente_id", clienteId));
  return { ok: true };
}

async function registrarHistorico(sb, clienteId, negocioId, tipo, detalhe, quem) {
  await sb.from("crm_historico").insert({
    cliente_id: clienteId, negocio_id: negocioId, tipo,
    detalhe: detalhe || {}, quem: quem || null,
  }).then(({ error }) => {
    // Histórico nunca derruba a operação: perder a linha do tempo é ruim,
    // perder a tarefa que a pessoa acabou de criar é pior.
    if (error) console.error("[comercial] histórico:", error.message);
  });
}

// ---------------------------------------------------------------------------
// Automações
//
// Um gatilho dispara, as condições filtram, as ações rodam. Três travas:
//
//   repetição  -> `chave` + índice único. Duas requisições simultâneas com a
//                 mesma chave: a segunda é recusada pelo banco.
//   ciclo      -> `profundidade`. Ação que dispara outro gatilho passa a conta
//                 adiante, e no quarto nível para.
//   mensagem   -> `enviar_mensagem` só existe como ação registrada. Quem
//                 entrega é o disparo, com a janela de 24h conferida lá. Este
//                 motor não fala com a Meta.

export const GATILHOS = [
  "contato_novo", "negocio_novo", "etapa_mudou", "etiqueta_mudou",
  "responsavel_mudou", "sem_interacao", "tarefa_vencida",
  "venda_ganha", "venda_perdida", "score_atingido",
];

export const ACOES = [
  "criar_tarefa", "notificar", "adicionar_etiqueta", "remover_etiqueta",
  "atualizar_campo", "mover_etapa", "enviar_mensagem",
];

const PROFUNDIDADE_MAXIMA = 3;

export async function listarAutomacoes(sb, clienteId) {
  const { data, error } = await sb.from("crm_automacoes")
    .select("id, nome, gatilho, condicoes, acoes, ativo, criado_em, atualizado_em")
    .eq("cliente_id", clienteId).order("criado_em");
  if (error) throw new Error(error.message);
  return data || [];
}

export async function salvarAutomacao(sb, clienteId, corpo = {}) {
  const nome = texto(corpo.nome, 120);
  if (!nome) throw new Error("Dê um nome à automação.");
  if (!GATILHOS.includes(corpo.gatilho)) throw new Error("Gatilho desconhecido.");

  const acoes = (Array.isArray(corpo.acoes) ? corpo.acoes : [])
    .filter((a) => ACOES.includes(a?.tipo))
    .slice(0, 10);
  if (!acoes.length) throw new Error("A automação precisa de pelo menos uma ação válida.");

  const linha = {
    nome,
    gatilho: corpo.gatilho,
    condicoes: corpo.condicoes && typeof corpo.condicoes === "object" ? corpo.condicoes : {},
    acoes,
    ativo: corpo.ativo !== false,
    atualizado_em: new Date().toISOString(),
  };

  if (corpo.id) {
    const r = erroDo(await sb.from("crm_automacoes").update(linha)
      .eq("id", corpo.id).eq("cliente_id", clienteId).select().maybeSingle());
    if (!r) throw new Error("Automação não encontrada.");
    return r;
  }
  return erroDo(await sb.from("crm_automacoes")
    .insert({ ...linha, cliente_id: clienteId }).select().single());
}

export async function apagarAutomacao(sb, clienteId, id) {
  erroDo(await sb.from("crm_automacoes").delete().eq("id", id).eq("cliente_id", clienteId));
  return { ok: true };
}

export async function listarExecucoes(sb, clienteId, limite = 50) {
  const { data } = await sb.from("crm_automacao_execucoes")
    .select("id, automacao_id, chave, alvo_id, profundidade, resultado, erro, criado_em,"
      + " crm_automacoes(nome, gatilho)")
    .eq("cliente_id", clienteId)
    .order("criado_em", { ascending: false })
    .limit(Math.min(limite, 200));
  return data || [];
}

/** A condição bate com o que aconteceu? Condição vazia bate com tudo. */
function condicaoBate(condicoes = {}, contexto = {}) {
  for (const [chave, esperado] of Object.entries(condicoes || {})) {
    if (esperado === null || esperado === undefined || esperado === "") continue;
    const atual = contexto[chave];
    if (Array.isArray(esperado)) {
      if (!esperado.map(String).includes(String(atual))) return false;
    } else if (chave === "score_minimo") {
      if (Number(contexto.score || 0) < Number(esperado)) return false;
    } else if (chave === "dias_sem_interacao") {
      // Mínimo, não igualdade: "parado há 3 dias ou mais".
      if (Number(contexto.dias_sem_interacao || 0) < Number(esperado)) return false;
    } else if (String(atual) !== String(esperado)) {
      return false;
    }
  }
  return true;
}

/**
 * Dispara um gatilho.
 *
 * Devolve o que rodou, para quem chamou poder registrar. Nunca estoura: uma
 * automação quebrada não pode derrubar a gravação de um negócio, então o erro
 * fica gravado na execução e a vida segue.
 */
export async function dispararGatilho(sb, clienteId, gatilho, contexto = {}, opcoes = {}) {
  const profundidade = Number(opcoes.profundidade || 0);
  if (profundidade > PROFUNDIDADE_MAXIMA) {
    console.warn(`[automacao] ciclo barrado em ${gatilho}, profundidade ${profundidade}`);
    return { barrado: "profundidade", executadas: [] };
  }
  if (!GATILHOS.includes(gatilho)) return { executadas: [] };

  const { data: automacoes } = await sb.from("crm_automacoes")
    .select("id, nome, gatilho, condicoes, acoes")
    .eq("cliente_id", clienteId).eq("gatilho", gatilho).eq("ativo", true);
  if (!automacoes?.length) return { executadas: [] };

  const executadas = [];
  for (const automacao of automacoes) {
    if (!condicaoBate(automacao.condicoes, contexto)) continue;

    // A chave é o que impede a repetição. Ela carrega o alvo e o momento do
    // fato, não o relógio de agora: duas chamadas simultâneas para o mesmo
    // fato produzem a mesma chave, e o índice único recusa a segunda.
    const chave = `${gatilho}:${contexto.alvo_id || "-"}:${contexto.marca || ""}`.slice(0, 200);

    const { data: reservado, error } = await sb.from("crm_automacao_execucoes").insert({
      cliente_id: clienteId,
      automacao_id: automacao.id,
      chave,
      alvo_id: contexto.alvo_id || null,
      profundidade,
    }).select("id").maybeSingle();

    // Código 23505 é violação de unicidade: alguém já executou esta. Não é
    // erro, é a trava funcionando.
    if (error) {
      if (error.code !== "23505") console.error("[automacao] reserva:", error.message);
      continue;
    }

    try {
      const resultado = await rodarAcoes(sb, clienteId, automacao, contexto, profundidade);
      await sb.from("crm_automacao_execucoes")
        .update({ resultado }).eq("id", reservado.id);
      executadas.push({ automacao: automacao.nome, resultado });
    } catch (e) {
      await sb.from("crm_automacao_execucoes")
        .update({ erro: String(e.message || e).slice(0, 500) }).eq("id", reservado.id);
      console.error(`[automacao] ${automacao.nome}:`, e.message);
    }
  }
  return { executadas };
}

async function rodarAcoes(sb, clienteId, automacao, contexto, profundidade) {
  const feitas = [];
  for (const acao of automacao.acoes || []) {
    switch (acao.tipo) {
      case "criar_tarefa": {
        if (!contexto.negocio_id && !contexto.contato_id) break;
        const vence = acao.dias_para_vencer
          ? new Date(Date.now() + Number(acao.dias_para_vencer) * 86400000).toISOString()
          : null;
        await salvarTarefa(sb, clienteId, {
          titulo: acao.titulo || automacao.nome,
          descricao: acao.descricao || null,
          tipo: acao.tarefa_tipo || "tarefa",
          vence_em: vence,
          negocio_id: contexto.negocio_id || null,
          contato_id: contexto.contato_id || null,
          responsavel_id: acao.responsavel_id || contexto.responsavel_id || null,
        }, `automação: ${automacao.nome}`);
        feitas.push("criar_tarefa");
        break;
      }
      case "adicionar_etiqueta":
      case "remover_etiqueta": {
        if (!contexto.negocio_id || !acao.etiqueta) break;
        const { data: n } = await sb.from("crm_negocios").select("etiquetas")
          .eq("id", contexto.negocio_id).eq("cliente_id", clienteId).maybeSingle();
        if (!n) break;
        const atuais = (n.etiquetas || []).map((e) => String(e).toLowerCase());
        const alvo = String(acao.etiqueta).toLowerCase().trim();
        const novas = acao.tipo === "adicionar_etiqueta"
          ? [...new Set([...atuais, alvo])]
          : atuais.filter((e) => e !== alvo);
        await sb.from("crm_negocios").update({ etiquetas: novas })
          .eq("id", contexto.negocio_id).eq("cliente_id", clienteId);
        feitas.push(acao.tipo);
        break;
      }
      case "atualizar_campo": {
        if (!contexto.negocio_id || !acao.campo) break;
        // Só campos que a tela edita. Sem esta lista, uma automação mal
        // configurada escreveria em `cliente_id` e levaria o negócio para
        // outra empresa.
        const permitidos = ["prioridade", "previsao_em", "valor", "score", "responsavel_id", "observacoes"];
        if (!permitidos.includes(acao.campo)) break;
        const valor = acao.campo === "previsao_em" ? instante(acao.valor)
          : acao.campo === "valor" ? numero(acao.valor)
            : acao.campo === "score" ? score(acao.valor)
              : acao.valor;
        await sb.from("crm_negocios").update({ [acao.campo]: valor })
          .eq("id", contexto.negocio_id).eq("cliente_id", clienteId);
        feitas.push("atualizar_campo");
        break;
      }
      case "mover_etapa": {
        if (!contexto.negocio_id || !acao.etapa_id) break;
        const { data: etapa } = await sb.from("crm_etapas").select("id, funil_id, tipo")
          .eq("id", acao.etapa_id).eq("cliente_id", clienteId).maybeSingle();
        if (!etapa) break;
        await sb.from("crm_negocios").update({
          etapa_id: etapa.id,
          funil_id: etapa.funil_id,
          etapa_desde: new Date().toISOString(),
          situacao: etapa.tipo === "ganho" ? "ganho" : etapa.tipo === "perdido" ? "perdido" : "aberto",
        }).eq("id", contexto.negocio_id).eq("cliente_id", clienteId);
        await registrarHistorico(sb, clienteId, contexto.negocio_id, "etapa",
          { para: etapa.id, por: "automação" }, `automação: ${automacao.nome}`);
        feitas.push("mover_etapa");

        // A mudança de etapa é um fato novo: ela pode disparar outra
        // automação. É aqui que o ciclo nasceria, e é aqui que a profundidade
        // é passada adiante para que ele morra no quarto nível.
        await dispararGatilho(sb, clienteId, "etapa_mudou", {
          ...contexto, etapa_id: etapa.id, marca: `auto-${automacao.id}`,
        }, { profundidade: profundidade + 1 });
        break;
      }
      case "notificar": {
        // Notificação é uma anotação no negócio, visível para a equipe. Não
        // existe canal de notificação próprio no CRM hoje, e inventar um
        // e-mail que ninguém lê seria pior do que isto.
        if (!contexto.negocio_id) break;
        await criarNota(sb, clienteId, {
          negocio_id: contexto.negocio_id,
          texto: acao.texto || `Automação "${automacao.nome}" foi acionada.`,
        }, `automação: ${automacao.nome}`);
        feitas.push("notificar");
        break;
      }
      case "enviar_mensagem": {
        // Deliberadamente não entrega nada. A janela de 24h da Meta, o template
        // aprovado e o opt-out moram no disparo, e duplicar essa decisão aqui
        // seria a forma mais rápida de a plataforma mandar mensagem fora da
        // janela e queimar o número do cliente.
        feitas.push("enviar_mensagem:registrado");
        break;
      }
      default:
        break;
    }
  }
  return { acoes: feitas, em: new Date().toISOString() };
}

// ---------------------------------------------------------------------------
// IA comercial
//
// Tudo desligado por padrão. A tela liga uma coisa de cada vez, e mover
// sozinha é a última: ela é a única que muda o quadro sem ninguém pedir.

export async function configIa(sb, clienteId) {
  const { data } = await sb.from("crm_ia_config").select("*").eq("cliente_id", clienteId).maybeSingle();
  return data || {
    cliente_id: clienteId,
    classificar: false, pontuar: false, resumir: false,
    sugerir_acao: false, sugerir_etapa: false, mover_sozinha: false, criar_negocio: false,
  };
}

export async function salvarConfigIa(sb, clienteId, corpo = {}) {
  const linha = { cliente_id: clienteId, atualizado_em: new Date().toISOString() };
  for (const chave of ["classificar", "pontuar", "resumir", "sugerir_acao", "sugerir_etapa", "mover_sozinha", "criar_negocio"]) {
    if (corpo[chave] !== undefined) linha[chave] = Boolean(corpo[chave]);
  }
  // Mover sozinha depende de sugerir etapa: mover sem ter sugerido é mover no
  // escuro, e a tela não teria o que mostrar como justificativa.
  if (linha.mover_sozinha && corpo.sugerir_etapa === false) linha.mover_sozinha = false;
  return erroDo(await sb.from("crm_ia_config").upsert(linha).select().single());
}

export async function listarSugestoes(sb, clienteId, q = {}) {
  let consulta = sb.from("crm_ia_sugestoes")
    .select("id, negocio_id, conversa_id, tipo, sugestao, aplicada, aplicada_em, aplicada_por, criado_em,"
      + " crm_negocios(id, titulo)")
    .eq("cliente_id", clienteId);
  if (q.negocio) consulta = consulta.eq("negocio_id", q.negocio);
  if (q.tipo) consulta = consulta.eq("tipo", q.tipo);
  if (q.pendentes === "1") consulta = consulta.eq("aplicada", false);

  const { data } = await consulta.order("criado_em", { ascending: false }).limit(100);
  return data || [];
}

/**
 * Guarda o que a IA propôs.
 *
 * Gravar a sugestão é separado de aplicá-la de propósito: é isso que permite
 * ligar a IA sem dar a ela a caneta. A empresa lê o que ela teria feito antes
 * de deixar que faça.
 */
export async function registrarSugestao(sb, clienteId, { negocioId, conversaId, tipo, sugestao }) {
  if (!["classificacao", "score", "resumo", "proxima_acao", "etapa", "interesse", "negocio"].includes(tipo)) {
    throw new Error("Tipo de sugestão desconhecido.");
  }
  return erroDo(await sb.from("crm_ia_sugestoes").insert({
    cliente_id: clienteId,
    negocio_id: negocioId || null,
    conversa_id: conversaId || null,
    tipo,
    sugestao: sugestao || {},
  }).select().single());
}

/**
 * Aplica uma sugestão ao negócio, por decisão de uma pessoa.
 *
 * Só três tipos mexem no negócio: score, etapa e classificação. Resumo e
 * próxima ação são leitura, e aplicar não significa nada para eles.
 */
export async function aplicarSugestao(sb, clienteId, id, quem = null) {
  const { data: s } = await sb.from("crm_ia_sugestoes").select("*")
    .eq("id", id).eq("cliente_id", clienteId).maybeSingle();
  if (!s) throw new Error("Sugestão não encontrada.");
  if (s.aplicada) return s;
  if (!s.negocio_id) throw new Error("Esta sugestão não aponta para um negócio.");

  const mudanca = {};
  if (s.tipo === "score") mudanca.score = score(s.sugestao?.score);
  if (s.tipo === "classificacao" && s.sugestao?.etiqueta) {
    const { data: n } = await sb.from("crm_negocios").select("etiquetas")
      .eq("id", s.negocio_id).eq("cliente_id", clienteId).maybeSingle();
    mudanca.etiquetas = [...new Set([...(n?.etiquetas || []), String(s.sugestao.etiqueta).toLowerCase()])];
  }
  if (s.tipo === "etapa" && s.sugestao?.etapa_id) {
    const { data: etapa } = await sb.from("crm_etapas").select("id, funil_id, tipo")
      .eq("id", s.sugestao.etapa_id).eq("cliente_id", clienteId).maybeSingle();
    if (!etapa) throw new Error("A etapa sugerida não existe mais.");
    Object.assign(mudanca, {
      etapa_id: etapa.id,
      funil_id: etapa.funil_id,
      etapa_desde: new Date().toISOString(),
      situacao: etapa.tipo === "ganho" ? "ganho" : etapa.tipo === "perdido" ? "perdido" : "aberto",
    });
  }

  if (Object.keys(mudanca).length) {
    erroDo(await sb.from("crm_negocios").update(mudanca)
      .eq("id", s.negocio_id).eq("cliente_id", clienteId));
    await registrarHistorico(sb, clienteId, s.negocio_id, "ia",
      { tipo: s.tipo, sugestao: s.sugestao }, quem);
  }

  return erroDo(await sb.from("crm_ia_sugestoes").update({
    aplicada: true, aplicada_em: new Date().toISOString(), aplicada_por: quem || null,
  }).eq("id", id).select().single());
}

export async function descartarSugestao(sb, clienteId, id) {
  erroDo(await sb.from("crm_ia_sugestoes").delete().eq("id", id).eq("cliente_id", clienteId));
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Indicadores
//
// A regra que atravessa tudo aqui: previsão não é receita.
//
//   em_negociacao  -> soma de `valor` dos negócios abertos. É esperança.
//   receita        -> soma de `valor_fechado` dos ganhos. É dinheiro registrado.
//
// Negócio ganho sem `valor_fechado` preenchido entra em `ganhos_sem_valor`, e a
// tela diz isso em vez de contar o valor previsto como se fosse receita.

export async function indicadores(sb, clienteId, q = {}) {
  const dias = Math.min(Math.max(Number(q.dias) || 30, 1), 365);
  const desde = new Date(Date.now() - dias * 86400000).toISOString();

  let consulta = sb.from("crm_negocios")
    .select("id, funil_id, etapa_id, situacao, valor, valor_fechado, responsavel_id, origem_id,"
      + " motivo_id, criado_em, fechado_em, previsao_em, etapa_desde, conversas(canal)")
    .eq("cliente_id", clienteId)
    .gte("criado_em", desde);

  if (q.funil) consulta = consulta.eq("funil_id", q.funil);
  if (q.responsavel) consulta = consulta.eq("responsavel_id", q.responsavel);

  const { data, error } = await consulta.limit(5000);
  if (error) throw new Error(error.message);

  let negocios = data || [];
  if (q.canal) negocios = negocios.filter((n) => n.conversas?.canal === q.canal);

  const abertos = negocios.filter((n) => n.situacao === "aberto");
  const ganhos = negocios.filter((n) => n.situacao === "ganho");
  const perdidos = negocios.filter((n) => n.situacao === "perdido");

  const emNegociacao = abertos.reduce((s, n) => s + Number(n.valor || 0), 0);
  const comValorFechado = ganhos.filter((n) => n.valor_fechado !== null && n.valor_fechado !== undefined);
  const receita = comValorFechado.reduce((s, n) => s + Number(n.valor_fechado || 0), 0);

  const fechados = ganhos.length + perdidos.length;
  const diasAteFechar = ganhos
    .filter((n) => n.fechado_em)
    .map((n) => (new Date(n.fechado_em) - new Date(n.criado_em)) / 86400000);

  const agora = Date.now();
  const atrasados = abertos.filter((n) => n.previsao_em && new Date(n.previsao_em).getTime() < agora);

  const contar = (lista, chave) => {
    const mapa = new Map();
    for (const n of lista) {
      const k = n[chave] || "nenhum";
      mapa.set(k, (mapa.get(k) || 0) + 1);
    }
    return [...mapa.entries()].map(([id, quantos]) => ({ id, quantos }))
      .sort((a, b) => b.quantos - a.quantos);
  };

  return {
    periodo: { dias, desde },
    total_leads: negocios.length,
    abertos: abertos.length,
    ganhos: ganhos.length,
    perdidos: perdidos.length,
    atrasados: atrasados.length,
    conversao: fechados ? Math.round((ganhos.length / fechados) * 1000) / 10 : null,
    em_negociacao: Math.round(emNegociacao * 100) / 100,
    receita: Math.round(receita * 100) / 100,
    // Quantos ganhos não têm valor registrado. Sem este número, a receita
    // parece baixa e ninguém sabe se é venda ruim ou cadastro incompleto.
    ganhos_sem_valor: ganhos.length - comValorFechado.length,
    ticket_medio: comValorFechado.length
      ? Math.round((receita / comValorFechado.length) * 100) / 100
      : null,
    dias_para_fechar: diasAteFechar.length
      ? Math.round((diasAteFechar.reduce((s, d) => s + d, 0) / diasAteFechar.length) * 10) / 10
      : null,
    por_etapa: contar(abertos, "etapa_id"),
    por_responsavel: contar(negocios, "responsavel_id"),
    por_origem: contar(negocios, "origem_id"),
    motivos_de_perda: contar(perdidos, "motivo_id"),
  };
}

/**
 * Oportunidades sem acompanhamento.
 *
 * Duas definições de abandono, somadas: passou da previsão de fechamento, ou
 * está parada na etapa além do limite que a própria etapa declara. A segunda
 * existe porque quase ninguém preenche previsão, e sem ela o alerta nunca
 * dispararia para a maioria dos negócios.
 */
export async function semAcompanhamento(sb, clienteId, q = {}) {
  const { data: etapas } = await sb.from("crm_etapas")
    .select("id, nome, limite_dias").eq("cliente_id", clienteId);
  const limitePorEtapa = new Map((etapas || []).map((e) => [e.id, e.limite_dias]));

  let consulta = sb.from("crm_negocios")
    .select("id, titulo, etapa_id, funil_id, valor, previsao_em, etapa_desde, responsavel_id,"
      + " prioridade, atendentes(nome)")
    .eq("cliente_id", clienteId)
    .eq("situacao", "aberto");
  if (q.funil) consulta = consulta.eq("funil_id", q.funil);
  if (q.responsavel) consulta = consulta.eq("responsavel_id", q.responsavel);

  const { data } = await consulta.limit(2000);
  const agora = Date.now();
  const padrao = Number(q.dias_parado) || 0;

  return (data || []).map((n) => {
    const diasParado = n.etapa_desde ? Math.floor((agora - new Date(n.etapa_desde)) / 86400000) : 0;
    const limite = limitePorEtapa.get(n.etapa_id) ?? (padrao || null);
    const venceu = n.previsao_em && new Date(n.previsao_em).getTime() < agora;
    const parado = limite !== null && limite !== undefined && diasParado > limite;
    return { ...n, dias_parado: diasParado, limite_dias: limite ?? null, atrasado: Boolean(venceu || parado), venceu: Boolean(venceu), parado };
  }).filter((n) => n.atrasado)
    .sort((a, b) => b.dias_parado - a.dias_parado);
}

/** O telefone em E164 para casar contato com negócio, exportado para teste. */
export { paraE164 };
