// A conferência da assinatura da Meta, provada contra o módulo de verdade.
//
// Aqui se testa `api/_assinatura.js` sem subir o webhook, sem banco e sem
// rede: a função é pura, recebe tudo por parâmetro e devolve um veredito. Por
// isso este arquivo não precisa do PGlite nem de nenhum serviço, e roda em
// milissegundos junto das outras suítes.
//
// O que está sendo provado, em ordem:
//
//   1 a 4    assinatura legítima passa, em corpo simples, multibyte e vazio;
//   5 a 8    assinatura errada, de outro segredo ou de outro corpo, recusa;
//   9 a 12   cabeçalho ausente, vazio, repetido ou de outro tipo recusa;
//   13 a 19  cabeçalho malformado recusa, sem lançar exceção. O caso do
//            multibyte é o buraco antigo: `timingSafeEqual` estourava
//            RangeError, a exceção caía no try/catch do processamento e virava
//            "falha no processamento";
//   20 a 25  falta de segredo recusa em TODO ambiente, inclusive Production,
//            Preview, development da Vercel e a máquina local, com e sem a
//            variável que um dia tolerava. A regra é uma só;
//   26 a 29  o veredito não depende do ambiente: o mesmo par corpo e
//            assinatura decide igual em qualquer um deles;
//   30 a 33  os dois canais, WhatsApp e Instagram, conferem a assinatura antes
//            de processar, e nenhum caminho do webhook tolera falta de
//            segredo. Esses quatro leem o `api/webhook.js` como texto, porque
//            o que está sendo provado é a ordem do código, não um retorno.
//
// Segredos e corpos inventados, nada de produção.

import { test } from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import { fileURLToPath } from "node:url";

import { conferirAssinatura, MOTIVOS } from "../api/_assinatura.js";

const SEGREDO = "segredo-de-teste-nao-usado-em-lugar-nenhum";
const OUTRO = "outro-segredo-de-teste";

const CORPO = Buffer.from(
  JSON.stringify({ object: "whatsapp_business_account", entry: [] }),
  "utf8",
);
const CORPO_IG = Buffer.from(
  JSON.stringify({ object: "instagram", entry: [] }),
  "utf8",
);
const CORPO_MULTIBYTE = Buffer.from(
  JSON.stringify({ texto: "oi 🙂 ação, informação e coração" }),
  "utf8",
);
const CORPO_VAZIO = Buffer.alloc(0);

const assina = (corpo, segredo) =>
  "sha256=" + crypto.createHmac("sha256", segredo).update(corpo).digest("hex");

// Os ambientes continuam no teste mesmo sem a função lê-los: o que está sendo
// provado é justamente que o veredito não muda de um para o outro.
const PRODUCTION = { VERCEL: "1", VERCEL_ENV: "production" };
const PREVIEW = { VERCEL: "1", VERCEL_ENV: "preview" };
const DEV_VERCEL = { VERCEL: "1", VERCEL_ENV: "development" };
const LOCAL = {};
const LOCAL_COM_VARIAVEL = { WEBHOOK_TOLERA_SEM_SEGREDO: "1" };

// Chamar a função sempre do mesmo jeito deixa claro que `env` e `host` não
// entram na decisão: eles ficam aqui como ruído deliberado.
function conferir({ corpoCru, cabecalho, segredo, env, host }) {
  return conferirAssinatura({ corpoCru, cabecalho, segredo, env, host });
}

const FONTE_WEBHOOK = fs.readFileSync(
  fileURLToPath(new URL("../api/webhook.js", import.meta.url)),
  "utf8",
);

// ---------------------------------------------------------------- 1 a 4

test("1. assinatura válida passa", () => {
  const r = conferir({ corpoCru: CORPO, cabecalho: assina(CORPO, SEGREDO), segredo: SEGREDO });
  assert.deepEqual(r, { ok: true, motivo: MOTIVOS.VALIDA });
});

test("2. assinatura válida sobre corpo multibyte passa", () => {
  const r = conferir({
    corpoCru: CORPO_MULTIBYTE,
    cabecalho: assina(CORPO_MULTIBYTE, SEGREDO),
    segredo: SEGREDO,
  });
  assert.equal(r.ok, true);
});

test("3. assinatura válida sobre corpo vazio passa", () => {
  const r = conferir({
    corpoCru: CORPO_VAZIO,
    cabecalho: assina(CORPO_VAZIO, SEGREDO),
    segredo: SEGREDO,
  });
  assert.equal(r.ok, true);
});

test("4. hexadecimal em maiúsculas passa: a Meta manda minúsculo, mas recusar seria rigor sem ganho", () => {
  const r = conferir({
    corpoCru: CORPO,
    cabecalho: assina(CORPO, SEGREDO).toUpperCase().replace("SHA256=", "sha256="),
    segredo: SEGREDO,
  });
  assert.equal(r.ok, true);
});

// ---------------------------------------------------------------- 5 a 8

test("5. assinatura de outro segredo recusa", () => {
  const r = conferir({ corpoCru: CORPO, cabecalho: assina(CORPO, OUTRO), segredo: SEGREDO });
  assert.deepEqual(r, { ok: false, motivo: MOTIVOS.ASSINATURA_DIFERENTE });
});

test("6. assinatura de outro corpo recusa", () => {
  const r = conferir({
    corpoCru: CORPO,
    cabecalho: assina(CORPO_IG, SEGREDO),
    segredo: SEGREDO,
  });
  assert.equal(r.motivo, MOTIVOS.ASSINATURA_DIFERENTE);
});

test("7. um byte trocado no corpo recusa", () => {
  const cabecalho = assina(CORPO, SEGREDO);
  const adulterado = Buffer.from(CORPO);
  adulterado[0] = adulterado[0] ^ 0x01;
  const r = conferir({ corpoCru: adulterado, cabecalho, segredo: SEGREDO });
  assert.equal(r.motivo, MOTIVOS.ASSINATURA_DIFERENTE);
});

test("8. um dígito trocado no cabeçalho recusa", () => {
  const valida = assina(CORPO, SEGREDO);
  const trocado = valida.slice(0, -1) + (valida.endsWith("a") ? "b" : "a");
  const r = conferir({ corpoCru: CORPO, cabecalho: trocado, segredo: SEGREDO });
  assert.equal(r.motivo, MOTIVOS.ASSINATURA_DIFERENTE);
});

// ---------------------------------------------------------------- 9 a 12

test("9. cabeçalho ausente recusa", () => {
  const r = conferir({ corpoCru: CORPO, cabecalho: undefined, segredo: SEGREDO });
  assert.deepEqual(r, { ok: false, motivo: MOTIVOS.SEM_CABECALHO });
});

test("10. cabeçalho vazio recusa", () => {
  const r = conferir({ corpoCru: CORPO, cabecalho: "", segredo: SEGREDO });
  assert.equal(r.motivo, MOTIVOS.SEM_CABECALHO);
});

test("11. cabeçalho repetido, que chega como vetor, recusa sem virar texto", () => {
  const valida = assina(CORPO, SEGREDO);
  const r = conferir({ corpoCru: CORPO, cabecalho: [valida, valida], segredo: SEGREDO });
  assert.equal(r.motivo, MOTIVOS.SEM_CABECALHO);
});

test("12. cabeçalho nulo recusa", () => {
  const r = conferir({ corpoCru: CORPO, cabecalho: null, segredo: SEGREDO });
  assert.equal(r.motivo, MOTIVOS.SEM_CABECALHO);
});

// ---------------------------------------------------------------- 13 a 19

const MALFORMADOS = [
  ["13. sem o prefixo sha256=", crypto.createHmac("sha256", SEGREDO).update(CORPO).digest("hex")],
  ["14. com outro prefixo", "sha1=" + "a".repeat(40)],
  ["15. hexadecimal curto", "sha256=" + "a".repeat(63)],
  ["16. hexadecimal longo", "sha256=" + "a".repeat(65)],
  ["17. fora do hexadecimal", "sha256=" + "z".repeat(64)],
  ["18. só o prefixo", "sha256="],
  // 64 caracteres multibyte: passava pela conferência de tamanho de string e
  // estourava RangeError dentro de `timingSafeEqual`.
  ["19. 64 caracteres multibyte", "sha256=" + "ç".repeat(64)],
];

for (const [nome, cabecalho] of MALFORMADOS) {
  test(`${nome} recusa como malformado, sem lançar exceção`, () => {
    let r;
    assert.doesNotThrow(() => {
      r = conferir({ corpoCru: CORPO, cabecalho, segredo: SEGREDO });
    });
    assert.deepEqual(r, { ok: false, motivo: MOTIVOS.CABECALHO_MALFORMADO });
  });
}

// ---------------------------------------------------------------- 20 a 25

const AMBIENTES = [
  ["20. Production", PRODUCTION, "webhook.example.com"],
  ["21. Preview", PREVIEW, "projeto-abc123.vercel.app"],
  ["22. development na Vercel", DEV_VERCEL, "localhost:3000"],
  ["23. máquina local", LOCAL, "localhost:3000"],
  ["24. máquina local com a variável que um dia tolerava", LOCAL_COM_VARIAVEL, "localhost:3000"],
  ["25. máquina local pelo IPv6 de loopback", LOCAL_COM_VARIAVEL, "[::1]:3000"],
];

for (const [nome, env, host] of AMBIENTES) {
  test(`${nome}: sem segredo, recusa`, () => {
    const r = conferir({
      corpoCru: CORPO,
      cabecalho: assina(CORPO, SEGREDO),
      segredo: "",
      env,
      host,
    });
    assert.deepEqual(r, { ok: false, motivo: MOTIVOS.SEM_SEGREDO });
  });
}

test("25.1. segredo nulo, indefinido ou de outro tipo também recusa", () => {
  for (const segredo of [null, undefined, 0, false, {}, Buffer.from("x")]) {
    const r = conferir({ corpoCru: CORPO, cabecalho: assina(CORPO, SEGREDO), segredo });
    assert.equal(r.motivo, MOTIVOS.SEM_SEGREDO);
  }
});

test("25.2. não existe motivo de tolerância no módulo", () => {
  assert.equal(Object.values(MOTIVOS).some((m) => /tolera/i.test(m)), false);
});

// ---------------------------------------------------------------- 26 a 29

test("26. assinatura válida decide igual em todos os ambientes", () => {
  for (const [, env, host] of AMBIENTES) {
    const r = conferir({
      corpoCru: CORPO,
      cabecalho: assina(CORPO, SEGREDO),
      segredo: SEGREDO,
      env,
      host,
    });
    assert.deepEqual(r, { ok: true, motivo: MOTIVOS.VALIDA });
  }
});

test("27. assinatura inválida decide igual em todos os ambientes", () => {
  for (const [, env, host] of AMBIENTES) {
    const r = conferir({
      corpoCru: CORPO,
      cabecalho: assina(CORPO, OUTRO),
      segredo: SEGREDO,
      env,
      host,
    });
    assert.equal(r.motivo, MOTIVOS.ASSINATURA_DIFERENTE);
  }
});

test("28. cabeçalho ausente decide igual em todos os ambientes", () => {
  for (const [, env, host] of AMBIENTES) {
    const r = conferir({ corpoCru: CORPO, segredo: SEGREDO, env, host });
    assert.equal(r.motivo, MOTIVOS.SEM_CABECALHO);
  }
});

test("29. o módulo não lê o ambiente do processo", () => {
  const fonte = fs.readFileSync(
    fileURLToPath(new URL("../api/_assinatura.js", import.meta.url)),
    "utf8",
  );
  // Os comentários do arquivo contam a história das versões antigas, e nela a
  // VERCEL_ENV aparece. O que não pode aparecer é no código, então as linhas de
  // comentário saem antes da conferência.
  const codigo = fonte
    .split("\n")
    .filter((linha) => !linha.trimStart().startsWith("//"))
    .join("\n");
  assert.equal(codigo.includes("process.env"), false);
  assert.equal(/VERCEL/.test(codigo), false);
  assert.equal(/\benv\b/.test(codigo), false);
});

// ---------------------------------------------------------------- 30 a 33

test("30. o WhatsApp confere a assinatura antes de processar", () => {
  const bloco = FONTE_WEBHOOK.slice(FONTE_WEBHOOK.indexOf("async function tratarMudanca"));
  const guarda = bloco.indexOf("registrarVeredito");
  const primeiroProcessamento = bloco.indexOf("tratarStatus");
  assert.ok(guarda > 0, "a guarda tem que existir no bloco do WhatsApp");
  assert.ok(primeiroProcessamento > 0, "o processamento tem que existir no bloco");
  assert.ok(guarda < primeiroProcessamento, "a guarda tem que vir antes do processamento");
});

test("31. o Instagram confere a assinatura antes de processar", () => {
  const inicio = FONTE_WEBHOOK.indexOf("async function processarInstagram");
  const bloco = FONTE_WEBHOOK.slice(inicio, FONTE_WEBHOOK.indexOf("\nasync function", inicio + 10));
  const guarda = bloco.indexOf("registrarVeredito");
  assert.ok(guarda > 0, "a guarda tem que existir no bloco do Instagram");
  // Depois da guarda não pode sobrar nada que não seja `continue`: o `continue`
  // é a própria recusa.
  assert.match(bloco.slice(guarda), /continue;/);
});

test("32. nenhum caminho do webhook tolera falta de segredo", () => {
  assert.equal(/TOLERA|tolerad/i.test(FONTE_WEBHOOK), false);
  assert.equal(FONTE_WEBHOOK.includes("VERCEL_ENV"), false);
  assert.equal(FONTE_WEBHOOK.includes("ehProducao"), false);
});

test("33. uma recusa gera uma linha de log só", () => {
  const chamadas = FONTE_WEBHOOK.match(/console\.(warn|error|log)\([^\n]*recusad/g) || [];
  assert.equal(chamadas.length, 1);
});
