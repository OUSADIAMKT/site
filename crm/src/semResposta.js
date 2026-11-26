// As contas e as frases de "mensagem sem resposta", longe do JSX para poderem
// ser provadas sem navegador. Os componentes ficam em semResposta.jsx.
//
// "Sem resposta" é contado no banco, da última mensagem que saiu para a pessoa
// em diante (sql/038). Resposta da IA conta como resposta: a bolinha some
// quando o robô responde. O que não some é o aviso de conversa na fila, porque
// aí a IA já fez o que podia e a pessoa está esperando gente.

/** Há quanto tempo, em palavras curtas. */
export function faz(iso) {
  if (!iso) return "";
  const min = Math.round((Date.now() - new Date(iso)) / 60000);
  if (min < 1) return "agora";
  if (min < 60) return `${min} min`;
  if (min < 2880) return `${Math.round(min / 60)} h`;
  return `${Math.round(min / 1440)} d`;
}

/**
 * "3 mensagens sem resposta, a primeira há 12 min".
 *
 * O plural importa: a tela fala com quem está atendendo e lê de relance, e
 * "1 mensagens" é o tipo de coisa que faz a pessoa parar de confiar no resto.
 */
export function frasePendente(conversa) {
  const n = conversa?.sem_resposta || 0;
  if (n <= 0) return "";
  const quando = conversa.sem_resposta_desde
    ? `, a primeira há ${faz(conversa.sem_resposta_desde)}`
    : "";
  return n === 1
    ? `1 mensagem sem resposta${quando}`
    : `${n} mensagens sem resposta${quando}`;
}

/** O número que cabe na bolinha. Acima de 99 o que importa é que é muito. */
export function numeroDaBolinha(n) {
  return n > 99 ? "99+" : String(n);
}

/** Quem respondeu por último, em palavras. */
export function quemRespondeu(por) {
  return por === "atendente" ? "pela equipe" : "pela IA";
}
