// Recarregar a página tem que deixar a pessoa onde ela estava.
//
// O defeito era este: a sessão vem do armazenamento do navegador, e o efeito
// que reage a ela sempre chamava `setAba` com o padrão. Todo F5 voltava para a
// tela inicial, inclusive no meio de um atendimento.

import { test } from "node:test";
import assert from "node:assert/strict";

import { LUGAR, quemSou, lugarSalvo, guardarLugar } from "../src/lugar.js";

/** Um localStorage de mentira, que é tudo que estas funções pedem. */
function deposito(inicial = {}) {
  const caixa = { ...inicial };
  return {
    caixa,
    getItem: (k) => (k in caixa ? caixa[k] : null),
    setItem: (k, v) => { caixa[k] = String(v); },
  };
}

const GESTOR = { tipo: "operador", nome: "Operador" };
const RITA = { tipo: "atendente", cliente: "ousadia", atendente: "at-rita" };
const LIA = { tipo: "atendente", cliente: "ousadia", atendente: "at-lia" };

test("o que foi guardado volta igual", () => {
  const d = deposito();
  guardarLugar(RITA, "quadro", "ousadia", d);
  assert.deepEqual(lugarSalvo(RITA, d), { quem: quemSou(RITA), aba: "quadro", cliente: "ousadia" });
});

test("o lugar de uma pessoa não vira o lugar da outra", () => {
  // Duas atendentes no mesmo computador, ou o gestor depois da atendente.
  const d = deposito();
  guardarLugar(RITA, "quadro", "ousadia", d);
  assert.equal(lugarSalvo(LIA, d), null);
  assert.equal(lugarSalvo(GESTOR, d), null);
});

test("sem nada guardado, não há lugar: o painel abre no padrão", () => {
  assert.equal(lugarSalvo(RITA, deposito()), null);
});

test("armazenamento com lixo dentro não derruba a entrada", () => {
  const d = deposito({ [LUGAR]: "{isto não é json" });
  assert.equal(lugarSalvo(RITA, d), null);
});

test("navegador sem armazenamento nenhum não derruba a entrada", () => {
  // Aba privada, ou armazenamento bloqueado. Perder a aba guardada é aceitável;
  // não abrir o painel não é.
  assert.equal(lugarSalvo(RITA, null), null);
  assert.doesNotThrow(() => guardarLugar(RITA, "quadro", "ousadia", null));

  const quebrado = {
    getItem() { throw new Error("bloqueado"); },
    setItem() { throw new Error("bloqueado"); },
  };
  assert.equal(lugarSalvo(RITA, quebrado), null);
  assert.doesNotThrow(() => guardarLugar(RITA, "quadro", "ousadia", quebrado));
});

test("sessão nenhuma não grava nada", () => {
  const d = deposito();
  guardarLugar(null, "quadro", "ousadia", d);
  assert.deepEqual(d.caixa, {});
});

test("o gestor sem cliente escolhido grava o lugar com cliente nulo", () => {
  const d = deposito();
  guardarLugar(GESTOR, "clientes", null, d);
  assert.equal(lugarSalvo(GESTOR, d).cliente, null);
});

test("a identidade do lugar distingue tipo de sessão, não só nome", () => {
  assert.notEqual(quemSou({ tipo: "operador", nome: "Ana" }), quemSou({ tipo: "atendente", nome: "Ana" }));
  assert.equal(quemSou(RITA), quemSou({ ...RITA, nome: "outro nome" }),
    "o id da atendente é que manda, não o nome digitado");
});
