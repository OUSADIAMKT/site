// O áudio gravado no navegador, convertido para o que o WhatsApp aceita.
//
// POR QUE ISTO EXISTE, que é a primeira coisa que alguém vai querer saber ao
// ver 300 linhas de bits aqui dentro:
//
// A Cloud API aceita áudio em ogg (só com codec Opus), mp3, aac, amr e mp4.
// Ela NÃO aceita webm. O `MediaRecorder` do navegador grava:
//   Chrome e Edge  -> audio/webm;codecs=opus   (não serve)
//   Firefox        -> audio/ogg;codecs=opus    (serve direto)
//   Safari         -> audio/mp4                (serve direto)
// Ou seja: no navegador que a equipe usa, gravar e mandar não funciona sem
// uma conversão. E não existe "converter" aqui: os dois arquivos carregam o
// MESMO áudio, os mesmos quadros Opus, em embalagens diferentes. Trocar a
// embalagem é remontar, não recodificar: nada é decodificado, nada perde
// qualidade e não entra biblioteca nenhuma.
//
// O que a função faz, em três passos: acha os quadros Opus dentro do WebM,
// lê quanto tempo cada quadro dura (está no primeiro byte do quadro), e
// escreve as páginas Ogg com a conta de amostras que o formato exige.
//
// O QUE ELA NÃO FAZ: lacing do Matroska (vários quadros num bloco só). O
// `MediaRecorder` não usa lacing em áudio, e um arquivo que use cai no erro
// em vez de sair errado pela metade.

// ---------------------------------------------------------------------------
// EBML, que é o formato de dentro do WebM: tudo é (id, tamanho, conteúdo), e
// os dois primeiros vêm com o comprimento escrito no primeiro byte.

/** Lê um id de elemento. Devolve [id, quantos bytes ele ocupou]. */
function lerId(b, i) {
  const primeiro = b[i];
  if (primeiro === undefined) return [null, 0];
  let largura = 1;
  for (let bit = 0x80; bit > 0; bit >>= 1, largura++) {
    if (primeiro & bit) break;
  }
  if (largura > 4 || i + largura > b.length) return [null, 0];
  let id = 0;
  for (let k = 0; k < largura; k++) id = id * 256 + b[i + k];
  return [id, largura];
}

/** Lê um tamanho. Devolve [tamanho, bytes usados]. `null` = tamanho desconhecido. */
function lerTamanho(b, i) {
  const primeiro = b[i];
  if (primeiro === undefined) return [null, 0];
  let largura = 1;
  let mascara = 0x80;
  for (; largura <= 8; largura++, mascara >>= 1) {
    if (primeiro & mascara) break;
  }
  if (largura > 8 || i + largura > b.length) return [null, 0];

  let valor = primeiro & (mascara - 1);
  let todosUns = valor === mascara - 1;
  for (let k = 1; k < largura; k++) {
    valor = valor * 256 + b[i + k];
    if (b[i + k] !== 0xff) todosUns = false;
  }
  // Tamanho com todos os bits em 1 significa "não sei onde termina", e é o que
  // o MediaRecorder escreve no Segment de uma gravação ao vivo.
  return [todosUns ? null : valor, largura];
}

const ID = {
  SEGMENT: 0x18538067,
  TRACKS: 0x1654ae6b,
  TRACK_ENTRY: 0xae,
  TRACK_NUMBER: 0xd7,
  CODEC_ID: 0x86,
  CODEC_PRIVATE: 0x63a2,
  AUDIO: 0xe1,
  CHANNELS: 0x9f,
  CLUSTER: 0x1f43b675,
  SIMPLE_BLOCK: 0xa3,
  BLOCK_GROUP: 0xa0,
  BLOCK: 0xa1,
};

// Os elementos em que a gente precisa entrar para achar o que interessa. O
// resto é pulado inteiro, sem olhar dentro: é o que torna isto rápido e é o
// que evita interpretar campo que não importa.
const DESCER = new Set([ID.SEGMENT, ID.TRACKS, ID.TRACK_ENTRY, ID.AUDIO, ID.CLUSTER, ID.BLOCK_GROUP]);

function texto(b) {
  let saida = "";
  for (const byte of b) {
    if (byte === 0) break;
    saida += String.fromCharCode(byte);
  }
  return saida;
}

function inteiro(b) {
  let valor = 0;
  for (const byte of b) valor = valor * 256 + byte;
  return valor;
}

/**
 * Varre o WebM e devolve { trilha, canais, cabecalho, quadros }.
 *
 * `cabecalho` é o OpusHead que o próprio arquivo trazia, quando trazia.
 * `quadros` são os pacotes Opus, na ordem, sem nenhuma alteração.
 */
export function lerWebmOpus(bytes) {
  const b = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  let trilha = null;
  let canais = 1;
  let cabecalho = null;
  const quadros = [];

  // Trilha em construção: os campos de uma TrackEntry chegam um a um.
  let emTrilha = null;

  const varrer = (ini, fim) => {
    let i = ini;
    while (i < fim) {
      const [id, bytesId] = lerId(b, i);
      if (!id) return;
      const [tamanho, bytesTamanho] = lerTamanho(b, i + bytesId);
      if (bytesTamanho === 0) return;

      const inicioConteudo = i + bytesId + bytesTamanho;
      // Tamanho desconhecido: vai até o fim do que se tem. É o caso do Segment.
      const fimConteudo = tamanho === null ? fim : Math.min(inicioConteudo + tamanho, fim);

      if (id === ID.TRACK_ENTRY) {
        emTrilha = { numero: null, codec: "", privado: null, canais: 1 };
        varrer(inicioConteudo, fimConteudo);
        if (/OPUS/i.test(emTrilha.codec) && trilha === null) {
          trilha = emTrilha.numero;
          canais = emTrilha.canais || 1;
          cabecalho = emTrilha.privado;
        }
        emTrilha = null;
      } else if (DESCER.has(id)) {
        varrer(inicioConteudo, fimConteudo);
      } else if (emTrilha) {
        const conteudo = b.subarray(inicioConteudo, fimConteudo);
        if (id === ID.TRACK_NUMBER) emTrilha.numero = inteiro(conteudo);
        else if (id === ID.CODEC_ID) emTrilha.codec = texto(conteudo);
        else if (id === ID.CODEC_PRIVATE) emTrilha.privado = conteudo.slice();
        else if (id === ID.CHANNELS) emTrilha.canais = inteiro(conteudo) || 1;
      } else if (id === ID.SIMPLE_BLOCK || id === ID.BLOCK) {
        const quadro = lerBloco(b, inicioConteudo, fimConteudo, trilha);
        if (quadro) quadros.push(quadro);
      }

      i = fimConteudo;
      if (fimConteudo <= inicioConteudo && tamanho !== 0) return; // nunca travar
    }
  };

  varrer(0, b.length);
  return { trilha, canais, cabecalho, quadros };
}

/** O quadro dentro de um SimpleBlock, se ele for da trilha de áudio. */
function lerBloco(b, ini, fim, trilha) {
  const [numero, bytesNumero] = lerTamanho(b, ini);
  if (bytesNumero === 0) return null;
  if (trilha !== null && numero !== trilha) return null;

  // 2 bytes de tempo relativo e 1 de bandeiras, depois o quadro.
  const flags = b[ini + bytesNumero + 2];
  const lacing = (flags >> 1) & 0x03;
  if (lacing !== 0) {
    throw new Error("Áudio com lacing do Matroska: este conversor não trata esse caso.");
  }
  const inicio = ini + bytesNumero + 3;
  return inicio < fim ? b.subarray(inicio, fim) : null;
}

// ---------------------------------------------------------------------------
// Quanto tempo dura um pacote Opus. Está escrito no primeiro byte dele, e é o
// que o Ogg precisa saber para escrever a posição de granulação. Errar isso faz
// o player mostrar a duração errada, que no WhatsApp aparece como áudio de
// "0:00" que toca normalmente.

const MS_POR_CONFIG = [
  10, 20, 40, 60, 10, 20, 40, 60, 10, 20, 40, 60, // SILK
  10, 20, 10, 20,                                  // híbrido
  2.5, 5, 10, 20, 2.5, 5, 10, 20,                  // CELT
  2.5, 5, 10, 20, 2.5, 5, 10, 20,
];

/** Amostras a 48 kHz que um pacote Opus representa. */
export function amostrasDoPacote(pacote) {
  if (!pacote?.length) return 0;
  const toc = pacote[0];
  const ms = MS_POR_CONFIG[toc >> 3] ?? 20;
  const codigo = toc & 0x03;

  let quadros;
  if (codigo === 0) quadros = 1;
  else if (codigo === 1 || codigo === 2) quadros = 2;
  else quadros = pacote.length > 1 ? (pacote[1] & 0x3f) : 1;

  return Math.round(ms * 48) * quadros;
}

// ---------------------------------------------------------------------------
// Ogg: páginas com soma de verificação. A soma é um CRC-32 com o polinômio
// 0x04c11db7 SEM reflexão, que não é o CRC-32 comum do zip: usar o comum faz
// todo player recusar o arquivo com "corrompido".

const TABELA_CRC = (() => {
  const t = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let r = i << 24;
    for (let k = 0; k < 8; k++) {
      r = (r & 0x80000000) ? ((r << 1) ^ 0x04c11db7) : (r << 1);
    }
    t[i] = r >>> 0;
  }
  return t;
})();

export function crcOgg(bytes) {
  let r = 0;
  for (const byte of bytes) {
    r = ((r << 8) ^ TABELA_CRC[((r >>> 24) ^ byte) & 0xff]) >>> 0;
  }
  return r >>> 0;
}

/** Uma página Ogg pronta, com a soma já calculada no lugar certo. */
function pagina({ tipo, granulo, serie, sequencia, segmentos, dados }) {
  const p = new Uint8Array(27 + segmentos.length + dados.length);
  p[0] = 0x4f; p[1] = 0x67; p[2] = 0x67; p[3] = 0x53; // OggS
  p[4] = 0;
  p[5] = tipo;

  // Granulação é 64 bits little endian. Áudio longo passa de 2^32 amostras
  // (25 minutos), então a parte alta não é enfeite.
  const baixo = granulo % 4294967296;
  const alto = Math.floor(granulo / 4294967296);
  new DataView(p.buffer).setUint32(6, baixo, true);
  new DataView(p.buffer).setUint32(10, alto, true);
  new DataView(p.buffer).setUint32(14, serie, true);
  new DataView(p.buffer).setUint32(18, sequencia, true);
  // 22 a 25 ficam em zero enquanto a soma é calculada, por definição do formato.
  p[26] = segmentos.length;
  p.set(segmentos, 27);
  p.set(dados, 27 + segmentos.length);

  new DataView(p.buffer).setUint32(22, crcOgg(p), true);
  return p;
}

/** A tabela de segmentos de um pacote: pedaços de 255, e o último menor. */
function segmentar(tamanho) {
  const s = [];
  let resto = tamanho;
  while (resto >= 255) { s.push(255); resto -= 255; }
  s.push(resto); // pacote múltiplo de 255 exige este zero no fim
  return s;
}

function ascii(t) {
  return Uint8Array.from(t, (c) => c.charCodeAt(0));
}

/** O OpusHead, quando o WebM não trouxe o dele. */
function cabecalhoPadrao(canais) {
  const h = new Uint8Array(19);
  h.set(ascii("OpusHead"), 0);
  h[8] = 1;        // versão
  h[9] = canais;
  new DataView(h.buffer).setUint16(10, 3840, true); // pré-corte de 80 ms
  new DataView(h.buffer).setUint32(12, 48000, true);
  new DataView(h.buffer).setUint16(16, 0, true);    // ganho
  h[18] = 0;                                        // família de mapeamento
  return h;
}

function opusTags() {
  const fornecedor = ascii("CRM Ousadia");
  const t = new Uint8Array(8 + 4 + fornecedor.length + 4);
  t.set(ascii("OpusTags"), 0);
  new DataView(t.buffer).setUint32(8, fornecedor.length, true);
  t.set(fornecedor, 12);
  new DataView(t.buffer).setUint32(12 + fornecedor.length, 0, true); // zero comentários
  return t;
}

function juntar(partes) {
  const total = partes.reduce((s, p) => s + p.length, 0);
  const saida = new Uint8Array(total);
  let i = 0;
  for (const p of partes) { saida.set(p, i); i += p.length; }
  return saida;
}

/**
 * WebM/Opus para Ogg/Opus. Devolve um Uint8Array pronto para enviar.
 *
 * @param {Uint8Array} webm
 * @param {number} [serie] número de série do fluxo; aleatório por padrão
 */
export function webmParaOgg(webm, serie = Math.floor(Math.random() * 0xffffffff)) {
  const { canais, cabecalho, quadros } = lerWebmOpus(webm);
  if (!quadros.length) throw new Error("Não achei áudio Opus dentro da gravação.");

  const cabeca = cabecalho?.length >= 19 && texto(cabecalho.subarray(0, 8)) === "OpusHead"
    ? cabecalho
    : cabecalhoPadrao(canais);

  const paginas = [];
  let sequencia = 0;

  // Duas páginas de cabeçalho, cada uma sozinha na sua: é exigência do mapa
  // Opus em Ogg, não escolha de quem escreveu.
  paginas.push(pagina({
    tipo: 0x02, granulo: 0, serie, sequencia: sequencia++,
    segmentos: Uint8Array.from(segmentar(cabeca.length)), dados: cabeca,
  }));
  const tags = opusTags();
  paginas.push(pagina({
    tipo: 0x00, granulo: 0, serie, sequencia: sequencia++,
    segmentos: Uint8Array.from(segmentar(tags.length)), dados: tags,
  }));

  // Depois, o áudio. Vários pacotes por página, com teto de 255 segmentos, que
  // é o que o formato permite numa tabela só.
  let granulo = 0;
  let aberta = { segmentos: [], dados: [] };

  const fechar = (ultima) => {
    if (!aberta.segmentos.length) return;
    paginas.push(pagina({
      tipo: ultima ? 0x04 : 0x00,
      granulo,
      serie,
      sequencia: sequencia++,
      segmentos: Uint8Array.from(aberta.segmentos),
      dados: juntar(aberta.dados),
    }));
    aberta = { segmentos: [], dados: [] };
  };

  for (const quadro of quadros) {
    const segmentos = segmentar(quadro.length);
    if (aberta.segmentos.length + segmentos.length > 255) fechar(false);
    aberta.segmentos.push(...segmentos);
    aberta.dados.push(quadro);
    granulo += amostrasDoPacote(quadro);
  }
  fechar(true);

  return juntar(paginas);
}
