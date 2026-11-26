// A camada do navegador: o que a tela recusa antes de subir, e o que ela
// mostra do que chegou.
//
// O teste mais importante aqui é o primeiro: a tela tem a própria cópia das
// tabelas da Meta, porque sem ela a pessoa só descobre que o arquivo não serve
// depois de esperar 3 MB subirem. Duas cópias divergem na primeira mudança, e
// quando divergem a tela aceita o que o servidor recusa. Este teste é o que
// impede isso.

import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import {
  MIDIA_ACEITA, TETO_META, LIMITE_UPLOAD, TETO_REPASSE, tetoDoTipo,
  tipoDoMime, conferirArquivo, tamanhoLegivel, semOAviso,
  formatoDeGravacao, relogio,
} from "../src/midia.js";
import { MIDIA_ACEITA as ACEITA_SERVIDOR, TETO_META as TETO_SERVIDOR } from "../api/_wa.js";
import { TETO_REPASSE as REPASSE_SERVIDOR } from "../api/_arquivo.js";
import { GRUPOS, procurar } from "../src/emojis.js";

/** Um File de mentira, que é tudo que o conferirArquivo olha. */
function arquivoFalso({ type, size, name = "arquivo" }) {
  return { type, size, name };
}

// ---------------------------------------------------------------------------

test("as tabelas da tela e do servidor são as mesmas", () => {
  // Compara o conjunto, não a ordem: a ordem na lista não muda o que passa.
  const ordenado = (t) => Object.fromEntries(
    Object.entries(t).map(([tipo, mimes]) => [tipo, [...mimes].sort()]),
  );
  assert.deepEqual(ordenado(MIDIA_ACEITA), ordenado(ACEITA_SERVIDOR),
    "mexeu nos mimes de um lado só: a tela vai aceitar o que o servidor recusa");
  assert.deepEqual(TETO_META, TETO_SERVIDOR,
    "mexeu nos tetos de um lado só");
  assert.equal(TETO_REPASSE, REPASSE_SERVIDOR,
    "mexeu no teto de repasse de um lado só: a tela aceitaria o que a função recusa");
});

test("o painel nunca promete mais do que a Meta aceita", () => {
  for (const tipo of Object.keys(TETO_META)) {
    assert.ok(tetoDoTipo(tipo) <= TETO_META[tipo],
      `${tipo}: o painel prometeria mais do que a Meta aceita`);
    assert.ok(tetoDoTipo(tipo) > 0, `${tipo}: ficou sem teto`);
  }
});

test("o corte do repasse só alcança documento", () => {
  // Com o cofre o arquivo não viaja mais dentro da requisição, então o teto de
  // 4,5 MB da Vercel saiu do caminho. O que sobra é o repasse para a Meta, que
  // passa pela função: 20 MB. Foto, áudio, vídeo e figurinha batem no limite da
  // Meta antes disso; documento, que na Meta vai a 100 MB, é o único cortado.
  for (const tipo of ["image", "sticker", "audio", "video"]) {
    assert.equal(tetoDoTipo(tipo), TETO_META[tipo], `${tipo} deveria ir até o limite da Meta`);
  }
  assert.equal(tetoDoTipo("document"), TETO_REPASSE);
  assert.ok(TETO_REPASSE < TETO_META.document);
});

test("foto de 4 MB passa, que é o que o cofre comprou", () => {
  // Pelo caminho antigo, de base64 no corpo da requisição, esta mesma foto
  // batia no teto de 3 MB e não saía. É a mudança mais visível de todas.
  assert.ok(LIMITE_UPLOAD < 4 * 1024 * 1024, "o caminho antigo pararia aqui");
  assert.deepEqual(
    conferirArquivo(arquivoFalso({ type: "image/jpeg", size: 4 * 1024 * 1024 })),
    { tipo: "image" },
  );
});

test("foto comum passa", () => {
  assert.deepEqual(conferirArquivo(arquivoFalso({ type: "image/jpeg", size: 400_000 })), { tipo: "image" });
});

test("formato que a Meta não aceita é recusado com o caminho da saída", () => {
  const gif = conferirArquivo(arquivoFalso({ type: "image/gif", size: 1000 }));
  assert.match(gif.erro, /GIF/, "o erro tem que dizer qual formato é");
  assert.match(gif.erro, /MP4/, "e tem que dizer o que fazer");

  const heic = conferirArquivo(arquivoFalso({ type: "image/heic", size: 1000 }));
  assert.match(heic.erro, /JPEG/);

  const webm = conferirArquivo(arquivoFalso({ type: "audio/webm", size: 1000 }));
  assert.match(webm.erro, /microfone/i, "áudio webm tem saída: gravar aqui, que converte");
});

test("arquivo grande é recusado dizendo o tamanho, o limite e de quem ele é", () => {
  // Foto acima do limite da Meta: a recusa tem que dizer que o limite é dela,
  // senão a equipe pede para a gente aumentar uma coisa que não é nossa.
  const foto = conferirArquivo(arquivoFalso({ type: "image/jpeg", size: 6 * 1024 * 1024 })).erro;
  assert.match(foto, /6,0 MB/, "diz o tamanho do arquivo");
  assert.match(foto, /5,0 MB/, "e diz o limite");
  assert.match(foto, /limite da Meta/, "e diz de quem é o limite");
  assert.match(foto, /celular/, "e oferece o caminho que funciona");

  // Documento acima do repasse: aqui o limite é nosso, e a mensagem não
  // inventa que a Meta recusa, porque ela aceita até 100 MB.
  const doc = conferirArquivo(arquivoFalso({ type: "application/pdf", size: 30 * 1024 * 1024 })).erro;
  assert.match(doc, /30,0 MB/);
  assert.match(doc, /20,0 MB/);
  assert.doesNotMatch(doc, /limite da Meta/, "o corte de 20 MB é nosso, não da Meta");
});

test("figurinha acima do teto da Meta é recusada antes de subir", () => {
  // 600 KB passa no limite do painel e bate no teto da Meta, que é 500 KB.
  const { erro, tipo } = conferirArquivo(arquivoFalso({ type: "image/webp", size: 600 * 1024 }));
  assert.equal(tipo, undefined);
  assert.match(erro, /figurinha/);
});

test("arquivo vazio e arquivo nenhum não passam", () => {
  assert.match(conferirArquivo(arquivoFalso({ type: "image/png", size: 0 })).erro, /vazio/);
  assert.match(conferirArquivo(null).erro, /Nenhum arquivo/);
});

test("o webp vai como figurinha e o jpeg como foto", () => {
  assert.equal(tipoDoMime("image/webp"), "sticker");
  assert.equal(tipoDoMime("image/jpeg"), "image");
  assert.equal(tipoDoMime("audio/ogg; codecs=opus"), "audio");
});

test("tamanho em português, com vírgula", () => {
  assert.equal(tamanhoLegivel(900), "900 B");
  assert.equal(tamanhoLegivel(2048), "2 KB");
  assert.equal(tamanhoLegivel(1572864), "1,5 MB");
});

test("o relógio da gravação conta em minuto e segundo", () => {
  assert.equal(relogio(0), "0:00");
  assert.equal(relogio(7), "0:07");
  assert.equal(relogio(65), "1:05");
  assert.equal(relogio(-3), "0:00", "tempo negativo não vira texto estranho");
});

test("sem MediaRecorder, o painel diz que não grava em vez de quebrar", () => {
  // No Node não existe MediaRecorder, que é o mesmo que um navegador antigo vê.
  assert.equal(formatoDeGravacao(), null);
});

// ---------------------------------------------------------------------------
// A legenda que estava invisível

test("a legenda de quem mandou a foto aparece", () => {
  // Esta é a forma que o webhook grava. Antes, a tela escondia a linha toda e
  // a legenda da cliente simplesmente não existia no painel.
  assert.equal(
    semOAviso('(enviou uma foto com a legenda: "o protetor chegou vazando")'),
    "o protetor chegou vazando",
  );
});

test("a legenda de quem enviou pelo painel aparece", () => {
  assert.equal(semOAviso("(enviou uma foto)\n\nsegue o comprovante"), "segue o comprovante");
});

test("aviso sozinho não vira balão vazio", () => {
  assert.equal(semOAviso("(enviou um áudio)"), "");
  assert.equal(semOAviso("(enviou o documento nota.pdf)"), "");
});

test("texto que não é aviso passa intocado", () => {
  assert.equal(semOAviso("bom dia, tudo bem?"), "bom dia, tudo bem?");
  assert.equal(semOAviso("(enviei o pedido ontem)"), "(enviei o pedido ontem)");
  assert.equal(semOAviso(""), "");
  assert.equal(semOAviso(null), "");
});

test("legenda com aspas dentro não corta no meio", () => {
  assert.equal(
    semOAviso('(enviou uma foto com a legenda: "veio escrito "frágil" e veio quebrado")'),
    'veio escrito "frágil" e veio quebrado',
  );
});

// ---------------------------------------------------------------------------
// Emojis

test("a busca acha pelo que a pessoa digita, sem acento", () => {
  assert.ok(procurar("coracao").some(([e]) => e === "❤️"));
  assert.ok(procurar("coração").some(([e]) => e === "❤️"), "com acento acha o mesmo");
  assert.ok(procurar("ENTREGA").some(([e]) => e === "🚚"), "maiúscula acha o mesmo");
  assert.ok(procurar("obrigado").some(([e]) => e === "🙏"));
  assert.ok(procurar("devolucao").some(([e]) => e === "🔁"));
  assert.equal(procurar("xilofone").length, 0);
  assert.equal(procurar("").length, 0, "busca vazia não despeja a lista inteira");
});

test("a busca não repete o mesmo emoji de dois grupos", () => {
  const achados = procurar("obrigado").map(([e]) => e);
  assert.equal(new Set(achados).size, achados.length);
});

test("todo grupo tem chave única, nome, ícone e itens", () => {
  const chaves = new Set();
  for (const g of GRUPOS) {
    assert.ok(g.nome && g.icone, `grupo ${g.chave} incompleto`);
    assert.ok(g.itens.length > 0, `grupo ${g.chave} vazio`);
    assert.equal(chaves.has(g.chave), false, `chave repetida: ${g.chave}`);
    chaves.add(g.chave);
    for (const [emoji, palavras] of g.itens) {
      assert.ok(emoji, `emoji vazio em ${g.chave}`);
      assert.ok(palavras && !/[áéíóúâêôãõç]/i.test(palavras),
        `as palavras de busca de ${emoji} têm acento: a busca compara sem acento`);
    }
  }
});

test("o mp4 é o último formato de gravação, não o primeiro", async () => {
  // Isto já quebrou em produção: com `audio/mp4` em primeiro, o Chrome gravava
  // MP4 fragmentado, a Meta aceitava e depois falhava com 131053, e o áudio
  // não chegava em ninguém. O Chrome só pode cair no mp4 se nada antes servir,
  // e nada antes serve só no Safari.
  const fonte = await readFile(new URL("../src/midia.js", import.meta.url), "utf8");
  const lista = fonte.match(/const PREFERIDOS = \[([\s\S]*?)\];/)[1];
  const formatos = [...lista.matchAll(/"([^"]+)"/g)].map((m) => m[1]);

  assert.equal(formatos[formatos.length - 1], "audio/mp4",
    "o mp4 tem que ser o último recurso");
  assert.ok(
    formatos.indexOf("audio/webm;codecs=opus") < formatos.indexOf("audio/mp4"),
    "o webm, que vira ogg aqui, tem que vir antes do mp4",
  );
  assert.equal(formatos[0], "audio/ogg;codecs=opus",
    "quem grava ogg direto não precisa de conversão nenhuma");
});
