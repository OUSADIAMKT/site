// Conferência da assinatura da Meta, num módulo só.
//
// Vive separada do `webhook.js` por dois motivos. O primeiro é poder testar a
// regra sem subir o webhook, sem banco e sem rede: tudo o que a função precisa
// entra por parâmetro, e ela não lê ambiente nem escreve log. O segundo é que
// arquivo com `_` na frente não conta como função na Vercel, então o teto de 12
// continua onde estava.
//
// A regra é uma só, em todo ambiente: sem segredo, o evento é recusado.
//
// Houve duas versões piores antes desta. A primeira devolvia "passa" quando não
// havia segredo, para não travar o desenvolvimento, e com isso um canal
// cadastrado sem app secret aceitava qualquer POST, em silêncio. A segunda
// recusava só quando `VERCEL_ENV` era "production", o que deixava o preview,
// que tem URL pública, aberto. Não existe mais exceção: nem por variável, nem
// por ambiente, nem por host. Para desenvolver sem assinatura, o caminho é
// cadastrar o app secret de teste no canal e assinar o corpo, que é o que o
// `test/assinatura.test.js` faz em três linhas.

import crypto from "node:crypto";

const PREFIXO = "sha256=";

// A Meta manda sha256 em hexadecimal. Conferir o FORMATO antes de comparar
// fecha o buraco antigo: `timingSafeEqual` lança RangeError quando os buffers
// têm tamanhos diferentes, e um cabeçalho com caractere multibyte passava pela
// conferência de tamanho de string e estourava na comparação. A exceção caía no
// try/catch do processamento e virava "falha no processamento", que é verdade
// mas não ajuda ninguém a entender o que aconteceu.
//
// Aceita as duas caixas: a Meta manda minúsculo, `Buffer.from(x, "hex")` lê as
// duas, e recusar MAIÚSCULO seria rigor sem ganho de segurança nenhum.
const HEX_64 = /^[0-9a-fA-F]{64}$/;

export const MOTIVOS = {
  VALIDA: "valida",
  SEM_SEGREDO: "sem-segredo-de-assinatura",
  SEM_CABECALHO: "sem-cabecalho",
  CABECALHO_MALFORMADO: "cabecalho-malformado",
  ASSINATURA_DIFERENTE: "assinatura-diferente",
};

/**
 * Confere a assinatura da Meta sobre o corpo bruto da requisição.
 *
 * Função pura: mesma entrada, mesma saída, nenhum efeito. Quem chamou decide o
 * que registrar, e é por isso que cada evento recusado gera uma linha de log
 * só, no `webhook.js`.
 *
 * @param {object}  entrada
 * @param {Buffer}  entrada.corpoCru   os bytes como chegaram, sem reserializar
 * @param {unknown} entrada.cabecalho  o `x-hub-signature-256`, como veio
 * @param {unknown} entrada.segredo    o app secret do canal
 * @returns {{ok: boolean, motivo: string}}
 */
export function conferirAssinatura({ corpoCru, cabecalho, segredo }) {
  if (!segredo || typeof segredo !== "string") {
    return { ok: false, motivo: MOTIVOS.SEM_SEGREDO };
  }

  // Cabeçalho repetido chega como vetor em algumas pilhas. Não é string, então
  // não é assinatura: recusa em vez de virar "[object Object]".
  if (typeof cabecalho !== "string" || !cabecalho) {
    return { ok: false, motivo: MOTIVOS.SEM_CABECALHO };
  }
  if (!cabecalho.startsWith(PREFIXO)) {
    return { ok: false, motivo: MOTIVOS.CABECALHO_MALFORMADO };
  }

  const recebido = cabecalho.slice(PREFIXO.length);
  if (!HEX_64.test(recebido)) {
    return { ok: false, motivo: MOTIVOS.CABECALHO_MALFORMADO };
  }

  // Daqui para baixo os dois lados têm 32 bytes garantidos, então a comparação
  // em tempo constante não tem como estourar.
  const esperado = crypto.createHmac("sha256", segredo).update(corpoCru).digest();
  const igual = crypto.timingSafeEqual(esperado, Buffer.from(recebido, "hex"));

  return igual
    ? { ok: true, motivo: MOTIVOS.VALIDA }
    : { ok: false, motivo: MOTIVOS.ASSINATURA_DIFERENTE };
}
