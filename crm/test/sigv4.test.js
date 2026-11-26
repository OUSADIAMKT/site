// A assinatura do R2, conferida contra o conjunto de vetores oficial da AWS.
//
// Por que este teste importa mais que os outros
// ---------------------------------------------
// api/_r2.js assina à mão, para não entrar uma dependência de alguns
// megabytes em cada função. O preço disso é que um erro de um espaço, de uma
// ordem ou de uma letra maiúscula num dígito hexadecimal não aparece como
// erro: aparece como 403 do serviço real, igual a credencial errada, e some
// dentro de "o upload não funciona".
//
// Os arquivos em test/vetores-sigv4 vêm do conjunto de testes de assinatura
// que a AWS publica (copiado de awslabs/aws-c-auth, que o distribui). Cada
// caso traz o pedido cru, o pedido canônico esperado, o texto a assinar
// esperado e a assinatura esperada, nos dois modos: cabeçalho Authorization e
// URL pré-assinada. Nada aqui usa rede nem credencial de verdade: a chave dos
// vetores é AKIDEXAMPLE, que é pública e não abre nada.
//
// O que ele NÃO prova: que o R2 aceita a nossa assinatura. Prova que ela segue
// o padrão. O resto é a homologação com o bucket de verdade.

import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

import {
  assinar, consultaDeAssinatura, consultaCanonica, uriCodificar, codificarCaminho,
  chaveDeAssinatura, carimbos, HASH_VAZIO,
} from "../api/_r2.js";

const PASTA = path.join(import.meta.dirname, "vetores-sigv4");
const sha256 = (t) => crypto.createHash("sha256").update(t).digest("hex");

/**
 * Lê o pedido cru do vetor. O formato é HTTP de verdade, não JSON: linha de
 * pedido, cabeçalhos, linha vazia, corpo.
 */
function lerPedido(texto) {
  const linhas = texto.split(/\r?\n/);
  const [metodo, alvo] = linhas[0].split(" ");
  const corte = linhas.indexOf("");
  const cabecalhos = {};
  for (const linha of linhas.slice(1, corte === -1 ? linhas.length : corte)) {
    if (!linha.trim()) continue;
    const i = linha.indexOf(":");
    cabecalhos[linha.slice(0, i)] = linha.slice(i + 1);
  }
  const corpo = corte === -1 ? "" : linhas.slice(corte + 1).join("\n");
  const [caminho, consulta = ""] = alvo.split("?");
  return { metodo, caminho, consulta, cabecalhos, corpo };
}

/** Os pares da consulta original, na ordem em que vieram. */
function paresDaConsulta(consulta) {
  if (!consulta) return [];
  return consulta.split("&").filter(Boolean).map((p) => {
    const i = p.indexOf("=");
    return i === -1 ? [p, ""] : [p.slice(0, i), p.slice(i + 1)];
  });
}

const casos = fs.readdirSync(PASTA).filter((n) =>
  fs.existsSync(path.join(PASTA, n, "context.json")));

// Se a pasta de vetores desaparecer, o teste tem que falhar alto, não passar
// calado por não ter encontrado nada para conferir.
test("os vetores da AWS estão no lugar", () => {
  assert.ok(casos.length >= 8, `achei só ${casos.length} casos em test/vetores-sigv4`);
});

for (const caso of casos) {
  const dir = path.join(PASTA, caso);
  const ler = (nome) => {
    const p = path.join(dir, nome);
    return fs.existsSync(p) ? fs.readFileSync(p, "utf8") : null;
  };
  const ctx = JSON.parse(ler("context.json"));
  const pedido = lerPedido(ler("request.txt"));
  const { amz } = carimbos(ctx.timestamp);
  const comum = {
    metodo: pedido.metodo,
    caminho: pedido.caminho,
    chaveId: ctx.credentials.access_key_id,
    segredo: ctx.credentials.secret_access_key,
    quando: ctx.timestamp,
    regiao: ctx.region,
    servico: ctx.service,
  };
  const hashCorpo = ctx.sign_body ? sha256(pedido.corpo) : HASH_VAZIO;

  test(`${caso}: assinatura por cabeçalho`, () => {
    // No modo cabeçalho a hora entra como x-amz-date, e o hash do corpo entra
    // como x-amz-content-sha256 quando o corpo é assinado.
    const cabecalhos = { ...pedido.cabecalhos, "x-amz-date": amz };
    if (ctx.sign_body) cabecalhos["x-amz-content-sha256"] = hashCorpo;

    const r = assinar({ ...comum, consulta: pedido.consulta ? consultaCanonica(paresDaConsulta(pedido.consulta)) : "", cabecalhos, hashCorpo });

    assert.equal(r.canonico, ler("header-canonical-request.txt"), "pedido canônico");
    assert.equal(r.textoParaAssinar, ler("header-string-to-sign.txt"), "texto a assinar");
    assert.equal(r.assinatura, ler("header-signature.txt").trim(), "assinatura");
  });

  test(`${caso}: assinatura por URL pré-assinada`, () => {
    // No modo consulta a hora e o prazo viajam na URL, e o bloco de
    // cabeçalhos fica só com o que o pedido já tinha: nem x-amz-date nem
    // x-amz-content-sha256 entram ali.
    const { assinados } = assinar({ ...comum, cabecalhos: pedido.cabecalhos, hashCorpo });
    const consulta = consultaDeAssinatura({
      pares: paresDaConsulta(pedido.consulta),
      credencial: `${ctx.credentials.access_key_id}/${amz.slice(0, 8)}/${ctx.region}/${ctx.service}/aws4_request`,
      amz,
      segundos: ctx.expiration_in_seconds,
      assinados,
    });

    const r = assinar({ ...comum, consulta, cabecalhos: pedido.cabecalhos, hashCorpo });

    assert.equal(r.canonico, ler("query-canonical-request.txt"), "pedido canônico");
    assert.equal(r.textoParaAssinar, ler("query-string-to-sign.txt"), "texto a assinar");
    assert.equal(r.assinatura, ler("query-signature.txt").trim(), "assinatura");
  });
}

// ---------------------------------------------------------------------------
// As peças soltas, onde moram os erros silenciosos

test("a chave de assinatura é derivada na ordem certa", () => {
  // Valor do exemplo da própria AWS. Derivar na ordem errada devolve um hash
  // de aparência perfeita que o serviço recusa sem dizer por quê.
  const chave = chaveDeAssinatura(
    "wJalrXUtnFEMI/K7MDENG+bPxRfiCYEXAMPLEKEY", "20150830", "us-east-1", "iam");
  assert.equal(
    chave.toString("hex"),
    "c4afb1cc5771d871763a393e44b703571b55cc28424d1a5e86da6ed3c154a4b9",
  );
});

test("o UriEncode do SigV4 não é o do JavaScript", () => {
  // Estes cinco o encodeURIComponent deixa passar, e a AWS exige codificados.
  assert.equal(uriCodificar("!'()*"), "%21%27%28%29%2A");
  // Espaço é %20, nunca +.
  assert.equal(uriCodificar("a b"), "a%20b");
  // Hexadecimal em maiúscula.
  assert.equal(uriCodificar("\u001a"), "%1A");
  // Os não reservados passam intactos.
  assert.equal(uriCodificar("-._~Az0"), "-._~Az0");
  // A barra é codificada por este nível: quem preserva barra é o caminho.
  assert.equal(uriCodificar("a/b"), "a%2Fb");
});

test("no caminho a barra fica, o resto é codificado", () => {
  assert.equal(codificarCaminho("/balde/tmp/a b.jpg"), "/balde/tmp/a%20b.jpg");
  assert.equal(codificarCaminho("/ሴ"), "/%E1%88%B4");
  assert.equal(codificarCaminho(""), "/");
});

test("a consulta é ordenada depois de codificar, não antes", () => {
  // "Param2" e "Param1" fora de ordem no pedido saem em ordem na assinatura.
  assert.equal(consultaCanonica({ Param2: "value2", Param1: "value1" }),
    "Param1=value1&Param2=value2");
  // Maiúscula vem antes de minúscula, porque a ordem é de byte.
  assert.equal(consultaCanonica({ a: "1", A: "2" }), "A=2&a=1");
  // Valor vazio mantém o sinal de igual.
  assert.equal(consultaCanonica({ acl: "" }), "acl=");
});

test("o carimbo de hora sai no formato da Amazon", () => {
  assert.equal(carimbos("2015-08-30T12:36:00Z").amz, "20150830T123600Z");
  assert.equal(carimbos("2015-08-30T12:36:00Z").dia, "20150830");
});
