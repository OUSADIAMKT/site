// A cola entre a Meta, o R2 e o banco.
//
// api/_r2.js não conhece o CRM: só assina e fala S3. Aqui ficam as duas
// operações que juntam as três partes, e que precisam saber o que é uma
// mensagem.
//
// O arquivo começa com `_`, então a Vercel não conta ele como função: o teto
// de 12 continua valendo e continua respeitado.

import { db } from "./_db.js";
import { baixarMidia } from "./_wa.js";
import {
  r2Ligado, gravarNoR2, apagarDoR2, chavePermanente, paraBanco, chaveDoBanco,
} from "./_r2.js";

/**
 * Quanto a função aceita repassar de uma vez.
 *
 * Com o R2 o arquivo não vem mais dentro da requisição, então o teto de 4,5 MB
 * da Vercel saiu do caminho. Só que para entregar à Meta os bytes ainda passam
 * pela função: ela baixa do R2 e sobe para o `/media`. Vinte megabytes cobrem
 * todos os tipos que a Meta aceita (foto 5, áudio e vídeo 16, figurinha 0,5) e
 * param antes de a função virar um problema de memória e de tempo.
 *
 * O único tipo que isto limita de verdade é documento, que na Meta vai a 100
 * MB. Prometer 100 e cair no tempo da função seria pior do que dizer 20.
 */
export const TETO_REPASSE = 20 * 1024 * 1024;

/**
 * Quanto vale arquivar sozinho, enquanto alguém olha o histórico.
 *
 * Mídia antiga, de antes do R2, só tem cópia na Meta, e a Meta apaga em cerca
 * de 30 dias. Quando o painel abre uma dessas, a gente aproveita e guarda. Um
 * vídeo de 16 MB arquivado a cada abertura de conversa antiga, porém, é tráfego
 * e tempo que ninguém pediu, então o automático para aqui e o resto continua
 * vindo da Meta enquanto ela tiver.
 */
export const TETO_ARQUIVO_TARDIO = 8 * 1024 * 1024;

/**
 * Guarda no R2 uma mídia que está na Meta, e anota a chave na mensagem.
 *
 * Roda nos dois momentos: quando a mensagem chega (pelo webhook, solta com
 * waitUntil, para não atrasar a resposta a quem escreveu) e quando o painel
 * abre uma mídia que ainda não tem cópia. Os dois caminhos escrevem a mesma
 * coluna, e quem já tem chave não refaz nada.
 *
 * Nunca derruba quem chamou: não guardar a cópia é perder o histórico daqui a
 * 30 dias, mas falhar aqui não pode custar a mensagem de agora.
 */
export async function arquivarDaMeta({
  cliente, mensagemId, waMessageId, clienteId, mediaId,
  direcao = "entrada", teto = TETO_REPASSE,
}) {
  if (!r2Ligado() || !mediaId || (!mensagemId && !waMessageId)) return null;
  const sb = db();

  // Quem já tem cópia não ganha outra. Dois caminhos chamam esta função, e sem
  // esta consulta o mesmo arquivo viraria dois objetos pagos no bucket.
  if (mensagemId) {
    const { data: msg } = await sb.from("mensagens")
      .select("midia_url").eq("id", mensagemId).maybeSingle();
    if (chaveDoBanco(msg?.midia_url)) return chaveDoBanco(msg.midia_url);
  }

  try {
    const { conteudo, mime } = await baixarMidia(cliente, mediaId);
    if (!conteudo?.length || conteudo.length > teto) return null;

    const chave = chavePermanente({
      clienteId,
      mime: mime || "application/octet-stream",
      direcao,
    });
    await gravarNoR2(chave, conteudo, mime);

    if (await anotarChave(sb, { mensagemId, waMessageId, chave })) return chave;

    // Guardou o arquivo e não achou a mensagem para anotar: o objeto fica no
    // bucket sem ninguém apontando para ele. Apagar é melhor que pagar
    // armazenamento por um arquivo que nenhuma tela alcança.
    await apagarDoR2(chave).catch(() => {});
    console.warn("[r2] arquivei e não achei a mensagem para anotar; desfiz");
    return null;
  } catch (e) {
    console.error("[r2] não deu para arquivar a mídia:", e?.message || e);
    return null;
  }
}

/**
 * Anota a chave na mensagem, por id ou pelo id da Meta.
 *
 * O caminho do áudio transcrito arquiva antes de a mensagem existir: ele já
 * baixou o áudio para transcrever, e esperar a gravação para só então começar
 * o arquivamento atrasaria a resposta a quem está falando. Então a anotação
 * tenta de novo algumas vezes, com uma pausa curta, até a linha aparecer.
 */
async function anotarChave(sb, { mensagemId, waMessageId, chave, tentativas = 6 }) {
  for (let i = 0; i < tentativas; i++) {
    const alvo = sb.from("mensagens").update({ midia_url: paraBanco(chave) });
    const { data } = mensagemId
      ? await alvo.eq("id", mensagemId).select("id")
      : await alvo.eq("wa_message_id", waMessageId).select("id");
    if (data?.length) return true;
    await new Promise((pronto) => setTimeout(pronto, 500));
  }
  return false;
}
