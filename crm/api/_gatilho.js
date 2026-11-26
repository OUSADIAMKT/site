// Decide se um comentário é a chamada para ação do vídeo, ou se é para ignorar.
//
// Responder todo comentário é o que faz o Instagram tratar a conta como
// automação. Responder só quem disse a frase combinada é, além de mais seguro,
// mais barato: comentário que não casa não chega a virar chamada de IA.
//
// O padrão fica em `agente_config.gatilho_comentario`, por cliente. Vazio
// significa responder todos, que é o comportamento de quem não usa isso.

// "eu quero" sai de dez jeitos diferentes do teclado de quem está animado:
// EU QUERO, eu quiro, qero, qro, kero, Quero!!!, "q u e r o", queroooo.
//
// O que todas têm em comum: q ou k, às vezes um u, às vezes uma vogal, um r, e
// termina em o ou u. Essa é a forma mínima, e é nela que o padrão se apoia.
//
// Precisa do "o" no fim de propósito: sem ele, "qualquer" e "quer" passariam, e
// aí "qualquer coisa" viraria lead.
export const QUERO = "(q|k)u?[eiaou]?r[ou]";

// Tira acento, caixa, pontuação e TODOS os espaços. Os espaços saem porque
// muita gente escreve a chamada separada, letra por letra, para o alcance.
export function normalizar(texto) {
  return String(texto || "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

/**
 * O comentário casa com o gatilho do cliente?
 * Sem gatilho configurado, tudo casa: é o comportamento padrão do CRM.
 */
export function combina(texto, padrao) {
  if (!padrao || !String(padrao).trim()) return true;

  const alvo = normalizar(texto);
  if (!alvo) return false;

  try {
    return new RegExp(padrao, "i").test(alvo);
  } catch (e) {
    // Padrão escrito errado não pode derrubar o atendimento nem, pior, fazer o
    // bot responder tudo sem querer. Na dúvida, não responde, e grita no log.
    console.error(`[gatilho] padrão inválido: ${padrao} (${e.message})`);
    return false;
  }
}
