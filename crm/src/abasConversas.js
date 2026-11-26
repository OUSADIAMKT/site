// Quais conversas cada aba mostra, e quanto cada contador diz.
//
// Fica fora do JSX por um motivo específico: foi aqui que a tela mentiu. A aba
// "Meus" comparava `conversa.atendente_id` com o id de quem estava logado, e
// esse id não existia na sessão guardada no navegador — o login mandava no
// token e não no objeto da sessão. Resultado: `undefined`, nenhuma conversa
// batia, e Rita e Lia viam "Meus 0" com vinte e cinco conversas na mão.
//
// Contador e lista saem da MESMA função de propósito. Duas contas separadas
// para a mesma pergunta divergem no dia em que alguém muda uma só.

/**
 * Esta conversa aparece nesta aba?
 *
 * `eu` é o id de quem está olhando, ou null para o gestor da plataforma, que
 * não atende ninguém e por isso não tem "minhas".
 */
export function passaNaAba(conversa, aba, eu) {
  switch (aba) {
    // Tudo que a sessão tem permissão de ver. Quem filtra por empresa é o
    // servidor, em `clientePermitido`: a tela nunca recebe conversa de outro
    // cliente para decidir esconder.
    case "tudo": return true;
    // Sem resposta nenhuma, de ninguém: nem da equipe, nem da IA.
    case "parados": return (conversa.sem_resposta || 0) > 0;
    // Não lidas por quem está olhando, incluindo as marcadas na mão.
    case "nao_lidas": return (conversa.nao_lidas || 0) > 0 || Boolean(conversa.marcada);
    // Atribuídas a quem está logado. Sem `eu`, ninguém: melhor a aba vazia e
    // desligada do que ela mostrando as de todo mundo.
    case "meus": return Boolean(eu) && conversa.atendente_id === eu && conversa.modo === "humano";
    // Esperando gente, ainda sem dono.
    case "fila": return conversa.modo === "fila";
    // Com a equipe. Inclui as de quem está olhando: é a visão da equipe toda,
    // e esconder as próprias faria a soma não fechar.
    case "humano": return conversa.modo === "humano";
    case "ia": return conversa.modo === "ia";
    default: return true;
  }
}

export const ABAS = ["tudo", "nao_lidas", "parados", "meus", "fila", "humano", "ia"];

/** Os filtros que valem para todas as abas (hoje só o canal). */
export function passaNoCanal(conversa, canal) {
  if (!canal) return true;
  return (conversa.canal || "whatsapp") === canal;
}

/** As conversas visíveis numa aba, já com o canal aplicado. */
export function visiveisNaAba(lista, aba, eu, canal) {
  return (lista || []).filter((c) => passaNoCanal(c, canal) && passaNaAba(c, aba, eu));
}

/**
 * Os números das abas. Contam exatamente o que cada aba mostraria com o canal
 * escolhido, que é a única definição que não deixa contador e lista brigarem.
 */
export function contarAbas(lista, eu, canal) {
  const conta = {};
  for (const aba of ABAS) conta[aba] = visiveisNaAba(lista, aba, eu, canal).length;
  return conta;
}
