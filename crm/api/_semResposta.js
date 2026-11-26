// Quantas mensagens da pessoa ainda estão sem resposta, por conversa.
//
// Existe por um motivo prático: quem atende abria a lista e não sabia dizer o
// que já tinha sido respondido e o que não. Conversa respondida e conversa
// esperando têm exatamente a mesma cara, e atendimento se perdia aí.
//
// A conta sai de uma função do banco (`sem_resposta_das_conversas`, sql/038) e
// não de um contador guardado na linha da conversa. Contador precisa que todo
// caminho de envio lembre de zerar: webhook, painel, mídia, modelo, disparo. O
// dia em que um esquecer, a bolinha fica acesa para sempre numa conversa já
// respondida, e aí ninguém mais confia na bolinha. Derivado das mensagens, não
// tem como mentir.
//
// Uma chamada para as cem conversas da tela, não uma por conversa.

import { db } from "./_db.js";

export const SEM_NADA = Object.freeze({
  sem_resposta: 0,
  sem_resposta_desde: null,
  respondida_em: null,
  respondida_por: null,
});

/**
 * Lê a contagem das conversas pedidas. Devolve um Map id → situação.
 *
 * Falha não derruba a tela: sem o Map, as conversas saem sem bolinha, que é
 * como era antes. Lista sem a contagem continua servindo; lista que não abre,
 * não.
 */
export async function lerSemResposta(ids) {
  const limpos = [...new Set((ids || []).filter(Boolean))];
  if (!limpos.length) return new Map();

  const { data, error } = await db().rpc("sem_resposta_das_conversas", { ids: limpos });
  if (error) {
    console.warn("[sem-resposta] não deu para contar:", error.message);
    return new Map();
  }

  const mapa = new Map();
  for (const linha of data || []) {
    mapa.set(linha.conversa_id, {
      sem_resposta: Number(linha.sem_resposta) || 0,
      sem_resposta_desde: linha.desde || null,
      respondida_em: linha.respondida_em || null,
      respondida_por: linha.respondida_por || null,
    });
  }
  return mapa;
}

/** Cola a situação em cada linha de conversa. Quem não veio no Map fica zerado. */
export function comSemResposta(linhas, mapa) {
  return (linhas || []).map((c) => ({ ...c, ...SEM_NADA, ...(mapa.get(c.id) || {}) }));
}

/** O mesmo, para uma conversa só. */
export async function semRespostaDe(conversaId) {
  const mapa = await lerSemResposta([conversaId]);
  return { ...SEM_NADA, ...(mapa.get(conversaId) || {}) };
}
