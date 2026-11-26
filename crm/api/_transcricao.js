// Transcrição de áudio: o áudio que a pessoa manda no WhatsApp vira texto, e
// o texto segue para a IA como se ela tivesse escrito.
//
// Existe porque o Claude lê texto e imagem, não áudio. Quem ouve é um serviço
// de voz para texto. Dois servem, pelo mesmo formato de chamada:
//   OPENAI_API_KEY  -> OpenAI, modelo gpt-4o-mini-transcribe
//   GROQ_API_KEY    -> Groq, modelo whisper-large-v3-turbo
// Sem nenhuma das duas chaves no servidor, a transcrição fica desligada e o
// áudio continua indo para a fila humana, como antes.

import { baixarMidia } from "./_wa.js";

const PROVEDORES = {
  openai: {
    chave: () => process.env.OPENAI_API_KEY,
    url: "https://api.openai.com/v1/audio/transcriptions",
    modelo: () => process.env.TRANSCRICAO_MODELO || "gpt-4o-mini-transcribe",
  },
  groq: {
    chave: () => process.env.GROQ_API_KEY,
    url: "https://api.groq.com/openai/v1/audio/transcriptions",
    modelo: () => process.env.TRANSCRICAO_MODELO || "whisper-large-v3-turbo",
  },
};

// O limite dos dois serviços é 25 MB. Nota de voz de WhatsApp tem poucos KB
// por segundo, então isto só barra arquivo de áudio muito longo.
const LIMITE_BYTES = 24 * 1024 * 1024;

function provedor() {
  const pedido = (process.env.TRANSCRICAO_PROVEDOR || "").toLowerCase();
  if (pedido && PROVEDORES[pedido]?.chave()) return PROVEDORES[pedido];
  return PROVEDORES.openai.chave() ? PROVEDORES.openai : PROVEDORES.groq.chave() ? PROVEDORES.groq : null;
}

export function transcricaoLigada() {
  return !!provedor();
}

function extensao(mime = "") {
  if (mime.includes("ogg")) return "ogg";
  if (mime.includes("mpeg") || mime.includes("mp3")) return "mp3";
  if (mime.includes("mp4") || mime.includes("m4a") || mime.includes("aac")) return "m4a";
  if (mime.includes("wav")) return "wav";
  if (mime.includes("webm")) return "webm";
  return "ogg"; // nota de voz do WhatsApp é ogg/opus
}

/** Transcreve bytes de áudio. Devolve o texto, ou lança erro. */
export async function transcrever(conteudo, mime) {
  const p = provedor();
  if (!p) throw new Error("Transcrição desligada: falta a chave do serviço de voz.");
  if (conteudo.length > LIMITE_BYTES) throw new Error("Áudio grande demais para transcrever.");

  const tipo = (mime || "audio/ogg").split(";")[0].trim();
  const form = new FormData();
  form.append("file", new Blob([conteudo], { type: tipo }), `audio.${extensao(tipo)}`);
  form.append("model", p.modelo());
  form.append("language", "pt");
  form.append("response_format", "json");

  const r = await fetch(p.url, {
    method: "POST",
    headers: { Authorization: `Bearer ${p.chave()}` },
    body: form,
    signal: AbortSignal.timeout(30_000),
  });
  const dados = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(`Transcrição ${r.status}: ${dados?.error?.message || r.statusText}`);
  return String(dados.text || "").trim();
}

/** Baixa o áudio da Meta e transcreve. */
export async function transcreverAudioWA(cliente, mediaId) {
  const { conteudo, mime } = await baixarMidia(cliente, mediaId);
  return transcrever(conteudo, mime);
}
