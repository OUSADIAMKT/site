// Quem já leu o quê. O negrito da lista, como no WhatsApp.
//
// Leitura é de quem lê, não da conversa. Três consequências que o desenho
// precisa garantir, e que os testes prendem:
//
// 1. A Lia abrir uma conversa não apaga o aviso da Rita.
// 2. Resposta da IA, ou de outra pessoa, não conta como alguém ter lido: o
//    robô responder não pode fazer a conversa parar de piscar para quem é
//    responsável por ela.
// 3. Isto não tem nada a ver com o visto-azul do WhatsApp. Nada aqui manda
//    confirmação de leitura para a Meta; é marca interna do painel.
//
// A contagem sai da função `nao_lidas_das_conversas` (sql/039): mensagens de
// entrada que chegaram depois do `lido_ate` da pessoa. Conversa que ela nunca
// abriu não tem linha, e aí tudo que entrou conta como não lido.

import { db } from "./_db.js";

/**
 * A identidade de leitura de uma sessão.
 *
 * Atendente é o id dela. O gestor da plataforma entra sem linha em
 * `atendentes` e seria o único sem estado de leitura; ele é 'operador'. Duas
 * pessoas usando o login de gestor dividem a mesma marca, o que é verdade
 * sobre esse login e não sobre a tabela.
 */
export function quemLe(s) {
  return s?.tipo === "atendente" && s.atendente ? String(s.atendente) : "operador";
}

export const NADA_NAO_LIDO = Object.freeze({ nao_lidas: 0, marcada: false });

/** Map id → { nao_lidas, marcada }. Falha devolve Map vazio: a tela abre sem negrito. */
export async function lerNaoLidas(ids, quem) {
  const limpos = [...new Set((ids || []).filter(Boolean))];
  if (!limpos.length || !quem) return new Map();

  const { data, error } = await db().rpc("nao_lidas_das_conversas", { ids: limpos, p_quem: quem });
  if (error) {
    console.warn("[leitura] não deu para contar as não lidas:", error.message);
    return new Map();
  }

  const mapa = new Map();
  for (const linha of data || []) {
    mapa.set(linha.conversa_id, {
      nao_lidas: Number(linha.nao_lidas) || 0,
      marcada: Boolean(linha.marcada),
    });
  }
  return mapa;
}

/** Cola o estado de leitura em cada linha. Quem não veio fica sem nada não lido. */
export function comNaoLidas(linhas, mapa) {
  return (linhas || []).map((c) => ({ ...c, ...NADA_NAO_LIDO, ...(mapa.get(c.id) || {}) }));
}

/**
 * Marca como lida até agora.
 *
 * `nao_lido` volta a falso: abrir a conversa desfaz o "marcar como não lida"
 * feito na mão, que é o que a pessoa espera de qualquer caixa de entrada.
 */
export async function marcarLido(conversaId, quem) {
  const agora = new Date().toISOString();
  const { error } = await db().from("leituras_conversa").upsert(
    { conversa_id: conversaId, quem, lido_ate: agora, nao_lido: false, atualizado_em: agora },
    { onConflict: "conversa_id,quem" },
  );
  if (error) throw new Error(`Falha ao marcar como lida: ${error.message}`);
  return { ok: true, lido_ate: agora };
}

/**
 * Marca como não lida na mão.
 *
 * Não mexe em `lido_ate`: a pessoa não está dizendo que não leu, está dizendo
 * que quer voltar nessa conversa. Se mexesse, as mensagens antigas voltariam
 * todas a contar e o número na bolinha viraria mentira.
 */
export async function marcarNaoLido(conversaId, quem) {
  const agora = new Date().toISOString();
  const { error } = await db().from("leituras_conversa").upsert(
    { conversa_id: conversaId, quem, nao_lido: true, atualizado_em: agora },
    { onConflict: "conversa_id,quem" },
  );
  if (error) throw new Error(`Falha ao marcar como não lida: ${error.message}`);
  return { ok: true };
}
