// A chave de comparação de telefone, num lugar só.
//
// Mora aqui, e não dentro de um adaptador, porque toda origem de pedido
// escreve telefone de um jeito diferente e todas precisam cruzar com o número
// que o WhatsApp manda:
//
//   Planilha   (51) 99994-8440
//   Importação 51999948440 ou +5511999990000
//   WhatsApp   5551999948440, às vezes sem o nono dígito
//
// A parte que nenhuma dessas formas mexe é DDD + os 8 últimos dígitos. É só
// isso que a gente compara.
//
// Risco conhecido: um fixo 3549-4411 e um celular 93549-4411 no mesmo DDD dão
// a mesma chave. Em uma base de poucos milhares de pedidos isso é raro, e o
// agente confirma com a pessoa antes de falar do pedido de qualquer jeito.
export function chaveTelefone(bruto) {
  let n = String(bruto || "").replace(/\D/g, "");
  if (!n) return null;

  // Só tira o 55 quando o tamanho total diz que ele é código de país. Sem essa
  // conferência, um fixo de Santa Maria (DDD 55) perderia o próprio DDD.
  if (n.startsWith("55") && (n.length === 12 || n.length === 13)) n = n.slice(2);
  if (n.length !== 10 && n.length !== 11) return null;

  return n.slice(0, 2) + n.slice(2).slice(-8);
}

/**
 * O número em E.164, do jeito que se disca.
 *
 * `chaveTelefone` serve para comparar e por isso joga o nono dígito fora. Para
 * mandar mensagem isso não serve: o que sai daqui precisa ser o número de
 * verdade. Então esta função nunca inventa nem remove o nono dígito. Ela só
 * garante o 55 na frente e recusa o que não tem cara de número brasileiro.
 *
 * Inventar o nono seria pior que recusar: um 9 colocado na frente de um fixo
 * vira o celular de outra pessoa, e num disparo isso é uma mensagem de promoção
 * chegando em quem nunca comprou nada.
 */
export function paraE164(bruto) {
  const n = String(bruto || "").replace(/\D/g, "");
  if (!n) return null;

  // Já veio com o país.
  if (n.startsWith("55") && (n.length === 12 || n.length === 13)) return `+${n}`;
  // Veio só com DDD + número.
  if (n.length === 10 || n.length === 11) return `+55${n}`;

  return null;
}

/**
 * As formas em que o MESMO número pode estar gravado, para procurar no banco.
 *
 * Serve só para consulta. O WhatsApp manda o DDD 93 sem o nono dígito e a
 * lista importada tem o mesmo número com ele, então procurar por uma forma só
 * não acha. Nunca use isto para enviar: para enviar existe `paraE164`, que não
 * inventa dígito.
 */
export function variantesE164(bruto) {
  const n = String(bruto || "").replace(/\D/g, "");
  const semPais = n.startsWith("55") && (n.length === 12 || n.length === 13) ? n.slice(2) : n;
  if (semPais.length !== 10 && semPais.length !== 11) return [];

  const ddd = semPais.slice(0, 2);
  const resto = semPais.slice(2);
  const oito = resto.slice(-8);

  // Com e sem o nono, nessa ordem. O 9 só entra na frente de número que já
  // começa com 6, 7, 8 ou 9: colocar 9 na frente de um fixo cria um celular
  // que é de outra pessoa.
  const formas = new Set([`+55${ddd}${resto}`]);
  if (oito.length === 8 && /^[6-9]/.test(oito)) formas.add(`+55${ddd}9${oito}`);
  formas.add(`+55${ddd}${oito}`);
  return [...formas];
}
