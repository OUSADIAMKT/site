// Respostas rápidas: o que aparece ao digitar "/", como {nome} é preenchido,
// e quem pode mexer em quê.

import test from "node:test";
import assert from "node:assert/strict";

Object.assign(process.env, {
  SESSION_SECRET: "segredo-local-de-teste",
  SUPABASE_URL: "https://supabase.invalid",
  SUPABASE_SECRET_KEY: "chave-local-de-teste",
});

const { buscaDeAtalho, filtrarRespostas, preencherResposta, normalizarAtalho } = await import("../src/respostas.js");

const LISTA = [
  { id: "1", atendente_id: null, atalho: "boas-vindas", texto: "Oi, {nome}! Tudo bem?" },
  { id: "2", atendente_id: "juh", atalho: "mentoria", texto: "A mentoria funciona assim..." },
  { id: "3", atendente_id: null, atalho: "pix", texto: "Segue a chave Pix." },
  { id: "4", atendente_id: null, atalho: "matricula", texto: "Para se matricular..." },
];

test("só procura atalho quando o campo é uma barra seguida de letras", () => {
  assert.equal(buscaDeAtalho("/"), "");
  assert.equal(buscaDeAtalho("/Men"), "men");
  assert.equal(buscaDeAtalho("/men toria"), null, "com espaço a pessoa está escrevendo");
  assert.equal(buscaDeAtalho("oi /men"), null);
});

test("as próprias vêm antes das da equipe, e quem começa com o termo vem antes", () => {
  assert.deepEqual(filtrarRespostas(LISTA, "m").map((r) => r.atalho).slice(0, 2), ["mentoria", "matricula"]);
  assert.deepEqual(filtrarRespostas(LISTA, "").map((r) => r.atalho)[0], "mentoria");
  assert.deepEqual(filtrarRespostas(LISTA, "chave").map((r) => r.atalho), ["pix"], "procura no texto também");
});

test("{nome} vira o primeiro nome, e some sem deixar vírgula solta", () => {
  assert.equal(preencherResposta("Oi, {nome}! Tudo bem?", { nome: "Ana Souza" }), "Oi, Ana! Tudo bem?");
  assert.equal(preencherResposta("Oi {nome}, tudo bem?", { nome: "" }), "Oi, tudo bem?");
});

test("o atalho é normalizado como o banco aceita", () => {
  assert.equal(normalizarAtalho("/Boas Vindas!"), "boas-vindas");
  assert.equal(normalizarAtalho("Matrícula 2026"), "matricula-2026");
});

// ---------------------------------------------------------------------------
// A rota

const { bancoDeMentira } = await import("./bancoMemoria.js");
const { gerarToken } = await import("../api/_painel.js");
const { default: handler } = await import("../api/painel-respostas.js");
const { usarBanco } = await import("../api/_db.js");

function pedido({ metodo = "GET", query = {}, body, token }) {
  const req = { method: metodo, query, body, headers: { authorization: `Bearer ${token}` } };
  const res = {
    code: 200, body: null,
    status(c) { this.code = c; return this; },
    json(b) { this.body = b; return this; },
  };
  return { req, res };
}

test("atendente cria a própria, não cria da equipe, e não vê a pessoal de outra pessoa", async (t) => {
  t.after(() => usarBanco(null));
  const sb = bancoDeMentira({
    atendentes: [
      { id: "juh", cliente_id: "emp", nome: "Juh", papel: "atendente", ativo: true, versao_sessao: 1, clientes: { ativo: true, modulos: {} } },
    ],
    respostas_rapidas: [{ id: "r-jack", cliente_id: "emp", atendente_id: "jack", atalho: "segredo", texto: "x" }],
  });
  usarBanco(sb);
  const token = gerarToken({ tipo: "atendente", atendente: "juh", cliente: "emp", papel: "atendente", versao_sessao: 1 });

  const equipe = pedido({ metodo: "POST", body: { atalho: "oi", texto: "Oi!" }, token });
  await handler(equipe.req, equipe.res);
  assert.equal(equipe.res.code, 403);

  const minha = pedido({ metodo: "POST", body: { atalho: "Oi Juh", texto: "Oi!", pessoal: true }, token });
  await handler(minha.req, minha.res);
  assert.equal(minha.res.code, 200);
  assert.equal(minha.res.body.resposta.atalho, "oi-juh");

  const lista = pedido({ token });
  await handler(lista.req, lista.res);
  assert.deepEqual(lista.res.body.respostas.map((r) => r.atalho), ["oi-juh"], "a do Jackson não aparece");
});
