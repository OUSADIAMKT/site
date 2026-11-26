// O que o navegador precisa saber sobre arquivo antes de mandar.
//
// As tabelas aqui são a cópia da tela das tabelas do servidor (api/_wa.js).
// Duas cópias divergem na primeira vez que a Meta mudar de ideia, então existe
// um teste que compara as duas e falha se alguém mexer em uma só. A cópia vale
// a pena porque sem ela a tela só descobre que o arquivo não serve depois de
// subir 3 MB e ouvir um 415.

import { webmParaOgg } from "./audioOgg.js";

/** Mesma tabela do servidor: mime aceito pela Cloud API, por tipo. */
export const MIDIA_ACEITA = {
  image: ["image/jpeg", "image/png"],
  sticker: ["image/webp"],
  audio: ["audio/aac", "audio/amr", "audio/mpeg", "audio/mp4", "audio/ogg"],
  video: ["video/mp4", "video/3gp", "video/3gpp"],
  document: [
    "application/pdf", "text/plain", "text/csv",
    "application/msword", "application/vnd.ms-excel", "application/vnd.ms-powerpoint",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  ],
};

/** Mesma tabela do servidor: teto de cada tipo na Cloud API. */
export const TETO_META = {
  image: 5 * 1024 * 1024,
  sticker: 500 * 1024,
  audio: 16 * 1024 * 1024,
  video: 16 * 1024 * 1024,
  document: 100 * 1024 * 1024,
};

/**
 * O teto do caminho antigo, que ainda existe.
 *
 * Quando o cofre (R2) não está configurado, o arquivo volta a viajar dentro do
 * corpo da requisição, em base64: a Vercel recusa corpo acima de 4,5 MB e o
 * base64 engorda um terço, então sobram 3 MB. O servidor avisa qual caminho
 * está valendo; este número é o do pior caso.
 */
export const LIMITE_UPLOAD = 3 * 1024 * 1024;

/**
 * Quanto a função aceita repassar para a Meta de uma vez.
 *
 * Com o cofre o arquivo não passa mais pelo corpo da requisição, mas passa
 * pela função na ida para a Meta. O mesmo número existe no servidor
 * (api/_arquivo.js), e um teste compara os dois.
 */
export const TETO_REPASSE = 20 * 1024 * 1024;

/**
 * O teto de verdade por tipo: o da Meta, cortado pelo repasse.
 *
 * Só documento sente o corte (a Meta aceita 100 MB). Foto, áudio, vídeo e
 * figurinha batem no limite da Meta antes.
 */
export function tetoDoTipo(tipo) {
  return Math.min(TETO_META[tipo] ?? 0, TETO_REPASSE);
}

const ROTULO_TIPO = {
  image: "foto", sticker: "figurinha", audio: "áudio",
  video: "vídeo", document: "documento",
};

export function tipoDoMime(mime) {
  if (!mime) return null;
  const limpo = String(mime).split(";")[0].trim().toLowerCase();
  for (const [tipo, lista] of Object.entries(MIDIA_ACEITA)) {
    if (lista.includes(limpo)) return tipo;
  }
  return null;
}

export function rotuloDoTipo(tipo) {
  return ROTULO_TIPO[tipo] || "arquivo";
}

export function tamanhoLegivel(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1).replace(".", ",")} MB`;
}

/**
 * Diz se o arquivo pode ir, e por que não, em português que a pessoa entende.
 * Devolve `{ tipo }` quando serve, `{ erro }` quando não.
 */
export function conferirArquivo(arquivo) {
  if (!arquivo) return { erro: "Nenhum arquivo escolhido." };

  const tipo = tipoDoMime(arquivo.type);
  if (!tipo) {
    const comum = {
      "image/gif": "O WhatsApp não aceita GIF. Converta para MP4 e manda como vídeo.",
      "image/heic": "Foto do iPhone em HEIC não passa. Exporte como JPEG antes.",
      "image/heif": "Foto em HEIF não passa. Exporte como JPEG antes.",
      "video/webm": "O WhatsApp não aceita vídeo WebM. Converta para MP4.",
      "audio/webm": "Áudio WebM não passa direto. Grave pelo microfone aqui, que a conversão é automática.",
    };
    const chave = String(arquivo.type || "").split(";")[0].toLowerCase();
    return {
      erro: comum[chave]
        || `O WhatsApp não aceita esse formato${arquivo.type ? ` (${arquivo.type})` : ""}. Servem JPEG, PNG, PDF, MP4, MP3 e os documentos do Office.`,
    };
  }

  if (arquivo.size === 0) return { erro: "O arquivo está vazio." };

  // A conferência aqui é pelo teto generoso, o do caminho do cofre. Quando o
  // cofre está desligado o servidor responde com o limite dele, e a tela
  // mostra esse número: um só lugar decide, e é o servidor.
  if (arquivo.size > tetoDoTipo(tipo)) {
    const teto = tetoDoTipo(tipo);
    const porQue = teto < TETO_META[tipo]
      ? `${tamanhoLegivel(teto)} por arquivo`
      : `${tamanhoLegivel(teto)}, que é o limite da Meta para ${rotuloDoTipo(tipo)}`;
    return {
      erro: `Arquivo de ${tamanhoLegivel(arquivo.size)}. O painel manda até ${porQue}. Para arquivo maior, use o celular.`,
    };
  }

  return { tipo };
}

/**
 * Sobe o arquivo direto para o cofre, na URL que o servidor assinou.
 *
 * Usa XMLHttpRequest, e não fetch, por um motivo só: fetch não informa o
 * progresso do envio. Num vídeo de 15 MB em rede de celular, a diferença entre
 * uma barra andando e um botão parado é a diferença entre esperar e apertar
 * enviar de novo.
 *
 * A URL já carrega a assinatura: nenhum cabeçalho de autenticação nosso vai
 * nela, e nenhuma credencial chega ao navegador.
 */
export function subirParaCofre(arquivo, url, aoProgresso) {
  return new Promise((pronto, falhou) => {
    const pedido = new XMLHttpRequest();
    pedido.open("PUT", url, true);
    pedido.setRequestHeader("Content-Type", arquivo.type || "application/octet-stream");

    pedido.upload.onprogress = (e) => {
      if (e.lengthComputable && aoProgresso) aoProgresso(e.loaded / e.total);
    };
    pedido.onerror = () => falhou(new Error(
      "A conexão caiu durante o envio do arquivo. Tente de novo."));
    pedido.ontimeout = () => falhou(new Error("O envio do arquivo demorou demais."));
    pedido.onload = () => {
      if (pedido.status >= 200 && pedido.status < 300) return pronto(true);
      // 403 aqui é quase sempre prazo vencido: a assinatura dura cinco
      // minutos entre escolher o arquivo e começar a subir.
      if (pedido.status === 403) {
        return falhou(new Error("A autorização de envio venceu. Escolha o arquivo de novo."));
      }
      falhou(new Error(`O cofre recusou o arquivo (${pedido.status}).`));
    };

    pedido.send(arquivo);
  });
}

/** Os bytes do arquivo em base64, que é como eles cabem no JSON da requisição. */
export function paraBase64(arquivo) {
  return new Promise((pronto, falhou) => {
    const leitor = new FileReader();
    leitor.onerror = () => falhou(new Error("Não deu para ler o arquivo do seu computador."));
    leitor.onload = () => {
      const texto = String(leitor.result || "");
      const virgula = texto.indexOf(",");
      pronto(virgula >= 0 ? texto.slice(virgula + 1) : texto);
    };
    leitor.readAsDataURL(arquivo);
  });
}

// ---------------------------------------------------------------------------
// Gravação pelo microfone
//
// O MediaRecorder entrega o que o navegador sabe gravar, e o que ele sabe não é
// o que o WhatsApp aceita: Chrome e Edge gravam webm/opus, Firefox ogg/opus,
// Safari mp4. Desses três só os dois últimos passam. O webm é só uma caixa
// diferente em volta dos mesmos quadros Opus do ogg, então a conversão troca a
// caixa e não toca no som: nada de perda, nada de biblioteca.

// A ORDEM AQUI É UMA CORREÇÃO, NÃO UMA PREFERÊNCIA ESTÉTICA.
//
// `audio/mp4` já esteve em primeiro, porque a Meta aceita mp4 e assim o Safari
// não precisaria de conversão. O que isso causou: o Chrome também grava
// `audio/mp4`, e o que ele grava é MP4 FRAGMENTADO, com `moof` e `mdat` e sem
// duração declarada no cabeçalho. A Meta aceita o upload, aceita o envio, e
// depois falha ao processar, devolvendo 131053 "Media upload error" num aviso
// de entrega. Para quem está no painel, o áudio simplesmente não chega, sem
// erro nenhum na tela.
//
// Medido no Chrome: `audio/ogg;codecs=opus` não é suportado, `audio/webm;
// codecs=opus` é. Então o Chrome grava webm, o `webmParaOgg` troca a embalagem
// e sai um Ogg/Opus completo, que é exatamente o que o WhatsApp usa nos áudios
// dele.
//
// O mp4 fica por último porque no Safari é a única coisa que existe. Lá o
// problema do fragmentado continua de pé, e isso está anotado no relatório.
const PREFERIDOS = [
  "audio/ogg;codecs=opus",     // Firefox, aceito direto pela Meta
  "audio/webm;codecs=opus",    // Chrome e Edge, vira ogg aqui mesmo
  "audio/webm",
  "audio/mp4",                 // só o Safari chega aqui
];

/** O melhor formato que este navegador grava, ou null se ele não gravar nada. */
export function formatoDeGravacao() {
  if (typeof MediaRecorder === "undefined") return null;
  for (const mime of PREFERIDOS) {
    if (MediaRecorder.isTypeSupported?.(mime)) return mime;
  }
  return "";
}

export function gravacaoDisponivel() {
  return Boolean(
    typeof navigator !== "undefined"
    && navigator.mediaDevices?.getUserMedia
    && typeof MediaRecorder !== "undefined",
  );
}

/**
 * Transforma o que foi gravado em arquivo que a Meta aceita. O webm vira ogg
 * aqui; o resto passa como está.
 */
export async function prepararAudio(blob, mimeGravado) {
  const base = String(mimeGravado || blob.type || "").split(";")[0].toLowerCase();

  if (base === "audio/webm") {
    const bytes = new Uint8Array(await blob.arrayBuffer());
    const ogg = webmParaOgg(bytes);
    return new File([ogg], "audio.ogg", { type: "audio/ogg" });
  }

  if (base === "audio/mp4") return new File([blob], "audio.m4a", { type: "audio/mp4" });
  if (base === "audio/ogg") return new File([blob], "audio.ogg", { type: "audio/ogg" });

  // Formato que não conhecemos: deixa o conferirArquivo recusar com nome.
  return new File([blob], "audio", { type: base || "application/octet-stream" });
}

/** Duração em "m:ss", para o cronômetro da gravação e do áudio. */
export function relogio(segundos) {
  const inteiros = Math.max(0, Math.floor(segundos));
  return `${Math.floor(inteiros / 60)}:${String(inteiros % 60).padStart(2, "0")}`;
}

/**
 * Tira o aviso "(enviou uma foto)" e devolve só o que a pessoa escreveu.
 *
 * O aviso existe no banco porque é ele que a IA lê: a Anthropic não recebe o
 * arquivo, recebe a frase. Na tela ele é repetição do que já está à vista. Mas
 * a legenda vem grudada nele, e a regra antiga escondia o texto inteiro, então
 * toda legenda que chegava junto com uma foto ficava invisível no painel.
 *
 * Duas formas aparecem no banco: a de quem recebeu, com a legenda dentro dos
 * parênteses, e a de quem enviou, com a legenda num bloco separado.
 */
export function semOAviso(texto) {
  const t = String(texto || "");
  if (!/^\(enviou /.test(t)) return t;

  const dentro = t.match(/^\(enviou [^"]*com a legenda: "([\s\S]*)"\)\s*$/);
  if (dentro) return dentro[1];

  const quebra = t.indexOf("\n\n");
  return quebra >= 0 ? t.slice(quebra + 2).trim() : "";
}
