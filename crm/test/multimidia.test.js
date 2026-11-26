// Os testes do chat multimídia.
//
// Três blocos, e nenhum deles fala com a Meta nem com o banco:
//   1. a conversão do áudio gravado no navegador (WebM/Opus -> Ogg/Opus);
//   2. o que a Cloud API aceita, por mime;
//   3. o repasse do fluxo de download, que é o que faz vídeo grande abrir.
//
// O QUE ESTES TESTES NÃO PROVAM: que a Meta aceita o arquivo. Isso só a
// homologação com número real prova, e está registrada como etapa própria.
// O que eles provam é que o arquivo que sai daqui é um Ogg válido, com as
// somas de verificação certas e a duração certa, que é onde um conversor
// escrito à mão erra.

import test from "node:test";
import assert from "node:assert/strict";

import { crcOgg, amostrasDoPacote, lerWebmOpus, webmParaOgg } from "../src/audioOgg.js";
import { tipoDoMime, MIDIA_ACEITA, TETO_META } from "../api/_wa.js";
import { repassarFluxo } from "../api/painel-conversas.js";

// ---------------------------------------------------------------------------
// Ferramentas para montar um WebM de mentira, com quadros Opus conhecidos.

function vint(valor) {
  // Tamanho EBML de um byte serve até 126, que basta para este arquivo.
  if (valor < 127) return Uint8Array.from([0x80 | valor]);
  return Uint8Array.from([0x40 | (valor >> 8), valor & 0xff]);
}

function idBytes(id) {
  const saida = [];
  let v = id;
  while (v > 0) { saida.unshift(v & 0xff); v = Math.floor(v / 256); }
  return Uint8Array.from(saida);
}

function juntar(partes) {
  const total = partes.reduce((s, p) => s + p.length, 0);
  const saida = new Uint8Array(total);
  let i = 0;
  for (const p of partes) { saida.set(p, i); i += p.length; }
  return saida;
}

function elemento(id, conteudo) {
  return juntar([idBytes(id), vint(conteudo.length), conteudo]);
}

function ascii(t) {
  return Uint8Array.from(t, (c) => c.charCodeAt(0));
}

/** Um SimpleBlock com um quadro só, sem lacing. */
function simpleBlock(trilha, quadro) {
  return elemento(0xa3, juntar([
    vint(trilha),
    Uint8Array.from([0, 0]), // tempo relativo
    Uint8Array.from([0x80]), // bandeiras: chave, sem lacing
    quadro,
  ]));
}

/** Um quadro Opus de mentira: TOC de verdade, conteúdo qualquer. */
function quadroOpus(config, codigo, enchimento = 8) {
  const corpo = new Uint8Array(1 + enchimento);
  corpo[0] = (config << 3) | codigo;
  for (let i = 1; i < corpo.length; i++) corpo[i] = i & 0xff;
  return corpo;
}

function opusHead(canais = 1) {
  const h = new Uint8Array(19);
  h.set(ascii("OpusHead"), 0);
  h[8] = 1;
  h[9] = canais;
  new DataView(h.buffer).setUint16(10, 312, true);
  new DataView(h.buffer).setUint32(12, 48000, true);
  return h;
}

/** O WebM completo, como o MediaRecorder entrega: Segment de tamanho aberto. */
function webmDeTeste(quadros, { canais = 1, comCabecalho = true, trilha = 1 } = {}) {
  const trackEntry = elemento(0xae, juntar([
    elemento(0xd7, Uint8Array.from([trilha])),            // TrackNumber
    elemento(0x83, Uint8Array.from([2])),                 // TrackType = áudio
    elemento(0x86, ascii("A_OPUS")),                      // CodecID
    ...(comCabecalho ? [elemento(0x63a2, opusHead(canais))] : []),
    elemento(0xe1, elemento(0x9f, Uint8Array.from([canais]))), // Audio > Channels
  ]));
  const tracks = elemento(0x1654ae6b, trackEntry);
  const cluster = elemento(0x1f43b675, juntar([
    elemento(0xe7, Uint8Array.from([0])),                 // Timecode
    ...quadros.map((q) => simpleBlock(trilha, q)),
  ]));

  // Segment com tamanho desconhecido (todos os bits em 1), que é o que uma
  // gravação ao vivo escreve e o que o leitor precisa aceitar.
  return juntar([
    elemento(0x1a45dfa3, elemento(0x4286, Uint8Array.from([1]))), // EBML mínimo
    idBytes(0x18538067),
    Uint8Array.from([0xff]),
    tracks,
    cluster,
  ]);
}

/** Desmonta um Ogg em páginas e confere a soma de cada uma. */
function lerOgg(bytes) {
  const paginas = [];
  let i = 0;
  while (i < bytes.length) {
    assert.equal(String.fromCharCode(...bytes.subarray(i, i + 4)), "OggS",
      `página ${paginas.length} não começa com OggS`);
    const dv = new DataView(bytes.buffer, bytes.byteOffset);
    const tipo = bytes[i + 5];
    const granuloBaixo = dv.getUint32(i + 6, true);
    const granuloAlto = dv.getUint32(i + 10, true);
    const serie = dv.getUint32(i + 14, true);
    const sequencia = dv.getUint32(i + 18, true);
    const somaGravada = dv.getUint32(i + 22, true);
    const nSegmentos = bytes[i + 26];
    const tabela = bytes.subarray(i + 27, i + 27 + nSegmentos);
    const corpo = tabela.reduce((s, v) => s + v, 0);
    const fim = i + 27 + nSegmentos + corpo;

    // A soma é calculada com o campo dela zerado.
    const copia = bytes.slice(i, fim);
    new DataView(copia.buffer).setUint32(22, 0, true);
    assert.equal(crcOgg(copia), somaGravada,
      `a soma de verificação da página ${sequencia} não fecha`);

    paginas.push({
      tipo, serie, sequencia, tabela: [...tabela],
      granulo: granuloAlto * 4294967296 + granuloBaixo,
      dados: bytes.subarray(i + 27 + nSegmentos, fim),
    });
    i = fim;
  }
  return paginas;
}

// ---------------------------------------------------------------------------
// 1. Áudio do navegador

test("o CRC do Ogg é o do polinômio sem reflexão, não o do zip", () => {
  // Valor de catálogo: polinômio 0x04C11DB7, início 0, sem reflexão, sem xor
  // final, para "123456789". Usar o CRC-32 comum aqui faz todo player recusar
  // o arquivo, e o sintoma é "áudio corrompido" sem mais explicação.
  assert.equal(crcOgg(ascii("123456789")), 0x89a1897f);
});

test("a duração sai do primeiro byte do pacote, em todas as formas", () => {
  assert.equal(amostrasDoPacote(quadroOpus(9, 0)), 960, "SILK banda larga, 20 ms");
  assert.equal(amostrasDoPacote(quadroOpus(3, 0)), 2880, "SILK banda estreita, 60 ms");
  assert.equal(amostrasDoPacote(quadroOpus(16, 0)), 120, "CELT, 2,5 ms");
  assert.equal(amostrasDoPacote(quadroOpus(9, 1)), 1920, "dois quadros iguais");
  assert.equal(amostrasDoPacote(quadroOpus(9, 2)), 1920, "dois quadros diferentes");

  const arbitrario = quadroOpus(9, 3);
  arbitrario[1] = 5;
  assert.equal(amostrasDoPacote(arbitrario), 4800, "cinco quadros no mesmo pacote");

  assert.equal(amostrasDoPacote(new Uint8Array()), 0, "pacote vazio não tem duração");
});

test("acha os quadros Opus dentro do WebM, com Segment de tamanho aberto", () => {
  const quadros = [quadroOpus(9, 0), quadroOpus(9, 0), quadroOpus(9, 0)];
  const lido = lerWebmOpus(webmDeTeste(quadros, { canais: 2 }));

  assert.equal(lido.trilha, 1);
  assert.equal(lido.canais, 2);
  assert.equal(lido.quadros.length, 3, "os três blocos têm que aparecer");
  assert.ok(lido.cabecalho, "o OpusHead do arquivo tem que ser aproveitado");
  assert.deepEqual([...lido.quadros[0]], [...quadros[0]], "o quadro sai intocado");
});

test("ignora bloco de outra trilha", () => {
  // Gravação com vídeo junto: o bloco da trilha 2 não é áudio e não pode
  // entrar no Ogg. Entrar faria o arquivo tocar estalos.
  const base = webmDeTeste([quadroOpus(9, 0)]);
  const intruso = simpleBlock(7, quadroOpus(9, 0));
  const comIntruso = juntar([base, elemento(0x1f43b675, intruso)]);

  assert.equal(lerWebmOpus(comIntruso).quadros.length, 1);
});

test("recusa lacing em vez de produzir áudio picado", () => {
  const corpo = juntar([
    vint(1), Uint8Array.from([0, 0]),
    Uint8Array.from([0x80 | 0x02]), // lacing Xiph
    quadroOpus(9, 0),
  ]);
  const webm = juntar([
    idBytes(0x18538067), Uint8Array.from([0xff]),
    elemento(0x1654ae6b, elemento(0xae, juntar([
      elemento(0xd7, Uint8Array.from([1])),
      elemento(0x86, ascii("A_OPUS")),
    ]))),
    elemento(0x1f43b675, elemento(0xa3, corpo)),
  ]);

  assert.throws(() => lerWebmOpus(webm), /lacing/i);
});

test("o Ogg que sai tem cabeçalho, marcas de início e fim e granulação certa", () => {
  const quadros = Array.from({ length: 50 }, () => quadroOpus(9, 0)); // 50 x 20 ms
  const ogg = webmParaOgg(webmDeTeste(quadros), 0x1234abcd);
  const paginas = lerOgg(ogg);

  assert.ok(paginas.length >= 3, "duas de cabeçalho e pelo menos uma de áudio");
  assert.equal(paginas[0].tipo, 0x02, "a primeira página tem a marca de início do fluxo");
  assert.equal(
    String.fromCharCode(...paginas[0].dados.subarray(0, 8)), "OpusHead",
    "a primeira página carrega o OpusHead",
  );
  assert.equal(paginas[0].granulo, 0, "cabeçalho não tem áudio, então granulação zero");
  assert.equal(
    String.fromCharCode(...paginas[1].dados.subarray(0, 8)), "OpusTags",
    "a segunda página carrega o OpusTags, que o formato exige",
  );

  const ultima = paginas[paginas.length - 1];
  assert.equal(ultima.tipo, 0x04, "a última página tem a marca de fim do fluxo");
  assert.equal(ultima.granulo, 50 * 960, "um segundo de áudio = 48000 amostras");

  assert.ok(paginas.every((p) => p.serie === 0x1234abcd), "um fluxo só, uma série só");
  paginas.forEach((p, i) => assert.equal(p.sequencia, i, "as páginas vão em ordem"));
});

test("um pacote de 255 bytes ganha o segmento zero no fim", () => {
  // Regra do formato: pacote múltiplo de 255 precisa de um segmento vazio,
  // senão o leitor acha que o pacote continua na página seguinte.
  const ogg = webmParaOgg(webmDeTeste([quadroOpus(9, 0, 254)]));
  const audio = lerOgg(ogg)[2];

  assert.deepEqual(audio.tabela, [255, 0]);
});

test("pacote grande não estoura o teto de 255 segmentos por página", () => {
  const quadros = Array.from({ length: 300 }, () => quadroOpus(9, 0));
  const paginas = lerOgg(webmParaOgg(webmDeTeste(quadros)));

  assert.ok(paginas.every((p) => p.tabela.length <= 255), "nenhuma tabela passa de 255");
  assert.ok(paginas.length > 3, "300 pacotes não cabem numa página só");
  assert.equal(
    paginas[paginas.length - 1].granulo, 300 * 960,
    "a granulação final não pode se perder na quebra de página",
  );
});

test("sem OpusHead no arquivo, monta um que vale", () => {
  const ogg = webmParaOgg(webmDeTeste([quadroOpus(9, 0)], { comCabecalho: false, canais: 1 }));
  const cabeca = lerOgg(ogg)[0].dados;

  assert.equal(String.fromCharCode(...cabeca.subarray(0, 8)), "OpusHead");
  assert.equal(cabeca[8], 1, "versão 1");
  assert.equal(cabeca[9], 1, "um canal");
  assert.equal(new DataView(cabeca.buffer, cabeca.byteOffset).getUint32(12, true), 48000);
});

test("gravação sem áudio nenhum falha alto", () => {
  assert.throws(
    () => webmParaOgg(webmDeTeste([])),
    /não achei áudio/i,
  );
});

// ---------------------------------------------------------------------------
// 2. O que a Cloud API aceita

test("o mime decide o tipo de mensagem do WhatsApp", () => {
  assert.equal(tipoDoMime("image/jpeg"), "image");
  assert.equal(tipoDoMime("image/png"), "image");
  assert.equal(tipoDoMime("image/webp"), "sticker", "webp é figurinha, não foto");
  assert.equal(tipoDoMime("audio/ogg"), "audio");
  assert.equal(tipoDoMime("audio/ogg; codecs=opus"), "audio", "o parâmetro do mime não atrapalha");
  assert.equal(tipoDoMime("AUDIO/MP4"), "audio", "maiúscula não atrapalha");
  assert.equal(tipoDoMime("video/mp4"), "video");
  assert.equal(tipoDoMime("application/pdf"), "document");
});

test("o que a Meta não aceita é recusado antes de subir", () => {
  // Estes três são os que aparecem na prática: o webm que o Chrome grava, o
  // gif que todo mundo tenta mandar e o heic do iPhone.
  assert.equal(tipoDoMime("audio/webm"), null);
  assert.equal(tipoDoMime("video/webm"), null);
  assert.equal(tipoDoMime("image/gif"), null);
  assert.equal(tipoDoMime("image/heic"), null);
  assert.equal(tipoDoMime(""), null);
  assert.equal(tipoDoMime(undefined), null);
});

test("todo tipo aceito tem teto declarado", () => {
  for (const tipo of Object.keys(MIDIA_ACEITA)) {
    assert.ok(TETO_META[tipo] > 0, `${tipo} sem teto de tamanho`);
  }
});

// ---------------------------------------------------------------------------
// 3. O repasse do download

/** Uma resposta do Node de mentira, que anota o que recebeu. */
function respostaFalsa({ travarApos = Infinity } = {}) {
  const pedacos = [];
  const ouvintes = {};
  return {
    pedacos,
    encerrada: false,
    codigo: null,
    status(c) { this.codigo = c; return this; },
    write(b) {
      pedacos.push(Buffer.from(b));
      const cheio = pedacos.length >= travarApos;
      // Simula o buffer cheio: devolve false e promete um 'drain' depois.
      if (cheio) setTimeout(() => ouvintes.drain?.(), 0);
      return !cheio;
    },
    once(evento, fn) { ouvintes[evento] = fn; },
    end() { this.encerrada = true; },
  };
}

function fluxoDe(pedacos) {
  return (async function* () {
    for (const p of pedacos) yield Uint8Array.from(p);
  })();
}

test("o fluxo é repassado inteiro, na ordem, e a resposta é encerrada", async () => {
  const res = respostaFalsa();
  await repassarFluxo(fluxoDe([[1, 2], [3], [4, 5, 6]]), res);

  assert.equal(res.codigo, 200);
  assert.deepEqual([...Buffer.concat(res.pedacos)], [1, 2, 3, 4, 5, 6]);
  assert.equal(res.encerrada, true);
});

test("quando o buffer enche, espera o dreno em vez de acumular memória", async () => {
  // É este laço que faz vídeo de 16 MB passar sem a função guardar 16 MB.
  // Sem a espera, `write` continua enfileirando e a memória cresce com o
  // arquivo, que é exatamente o problema que o fluxo veio resolver.
  const res = respostaFalsa({ travarApos: 1 });
  const pedacos = Array.from({ length: 5 }, (_, i) => [i]);

  await repassarFluxo(fluxoDe(pedacos), res);

  assert.equal(res.pedacos.length, 5, "nenhum pedaço se perde na espera");
  assert.deepEqual([...Buffer.concat(res.pedacos)], [0, 1, 2, 3, 4]);
  assert.equal(res.encerrada, true);
});

test("fluxo vazio não deixa a resposta aberta", async () => {
  const res = respostaFalsa();
  await repassarFluxo(fluxoDe([]), res);

  assert.equal(res.pedacos.length, 0);
  assert.equal(res.encerrada, true, "resposta aberta pendura o navegador");
});
