// Quais informações aparecem no cartão do quadro comercial.
//
// Dez informações num cartão de 240px é um borrão: quem olha o quadro para
// saber onde está cada negócio não lê nada, e quem olha para cobrar valor não
// acha o valor. Então a escolha é de quem olha, e não da empresa: a Lia pode
// querer ver valor e a Rita não, na mesma conta.
//
// A lista canônica mora aqui, do lado de quem desenha o cartão. O servidor
// guarda o jsonb e confere a FORMA (objeto de booleanos, chaves curtas), não o
// vocabulário: assim um campo novo entra numa versão da tela sem precisar de
// migração nem de deploy coordenado do servidor, e um campo que sai vira chave
// ignorada em vez de erro.
//
// `padrao: false` é o que faz um campo nascer escondido. Campo novo que nasce
// visível muda o cartão de todo mundo sem avisar, então só nasce visível o que
// é quase sempre útil.

export const CAMPOS = [
  { chave: "foto",      rotulo: "Foto do contato",     padrao: true,  nota: "Quando houver. O WhatsApp não entrega foto de perfil; o cartão mostra as iniciais." },
  { chave: "canal",     rotulo: "Canal de origem",     padrao: true },
  { chave: "contato",   rotulo: "Telefone ou e-mail",  padrao: true },
  { chave: "valor",     rotulo: "Valor da negociação", padrao: true },
  { chave: "etiquetas", rotulo: "Etiquetas",           padrao: true },
  { chave: "score",     rotulo: "Pontuação do lead",   padrao: true },
  { chave: "origem",    rotulo: "Origem comercial",    padrao: true },
  { chave: "prioridade", rotulo: "Prioridade",         padrao: true },
  { chave: "nao_lidas", rotulo: "Mensagens não lidas", padrao: true },
  { chave: "ultima",    rotulo: "Última interação",    padrao: true },
  { chave: "tempo",     rotulo: "Tempo na etapa",      padrao: true },
  { chave: "tarefa",    rotulo: "Próxima atividade",   padrao: true },
  { chave: "responsavel", rotulo: "Responsável",       padrao: true },
  { chave: "previsao",  rotulo: "Previsão de fechamento", padrao: false },
  { chave: "empresa",   rotulo: "Empresa do contato",  padrao: false },
];

/** O conjunto que vale quando ninguém escolheu nada. */
export const PADRAO = Object.freeze(
  Object.fromEntries(CAMPOS.map((c) => [c.chave, c.padrao])));

/**
 * O campo está ligado?
 *
 * Chave ausente cai no padrão, e não em "escondido". É o que deixa um campo
 * novo aparecer para quem já tinha preferência salva, em vez de ficar invisível
 * para sempre porque o jsonb antigo não falava dele.
 */
export function mostra(campos, chave) {
  const v = campos?.[chave];
  if (v === true || v === false) return v;
  return PADRAO[chave] ?? true;
}

/** Tudo que está ligado, já resolvido, para a tela não chamar `mostra` dez vezes. */
export function resolver(campos) {
  return Object.fromEntries(CAMPOS.map((c) => [c.chave, mostra(campos, c.chave)]));
}

/** Quantos campos a pessoa desligou, para o botão poder dizer. */
export function quantosEscondidos(campos) {
  return CAMPOS.filter((c) => !mostra(campos, c.chave)).length;
}

/**
 * O que vai para o servidor: só as chaves conhecidas, só booleano.
 *
 * Mandar o objeto inteiro em vez de só as diferenças é de propósito: assim
 * mudar o padrão de um campo numa versão nova da tela não muda o cartão de
 * quem já escolheu, que é o que a pessoa esperaria.
 */
export function paraSalvar(campos) {
  return Object.fromEntries(CAMPOS.map((c) => [c.chave, mostra(campos, c.chave)]));
}
