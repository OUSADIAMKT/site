// A tabela de transições existe em dois lugares: no trigger do Postgres, que
// é a autoridade, e em `TRANSICOES`, que os testes usam para exercitar a
// máquina sem banco. Duas cópias da mesma regra é uma dívida, e este teste é
// o juro: se uma mudar sem a outra, ele quebra e diz qual aresta divergiu.
//
// Lê o SQL como texto de propósito. Não precisa de Postgres.

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

import { TRANSICOES } from "../api/_disparo.js";

const aqui = dirname(fileURLToPath(import.meta.url));
const sql = readFileSync(join(aqui, "..", "sql", "032_disparo_reserva.sql"), "utf8");

/** Lê as arestas declaradas no corpo de `disparo_envio_transicao_ok`. */
function arestasDoSql(texto) {
  const corpo = texto.split("function disparo_envio_transicao_ok")[1] || "";
  const ate = corpo.split("else false")[0] || "";
  const pares = new Set();

  // Só as linhas de regra, nunca os comentários que explicam o desenho logo
  // acima: um `--` no começo da linha descarta.
  for (const linha of ate.split("\n")) {
    const limpa = linha.trim();
    if (limpa.startsWith("--") || !limpa.startsWith("when")) continue;
    const de = limpa.match(/de\s*=\s*'([a-z]+)'/)?.[1];
    const lista = limpa.match(/para\s+in\s*\(([^)]*)\)/)?.[1];
    if (!de || !lista) continue;
    for (const p of lista.match(/'([a-z]+)'/g) || []) {
      pares.add(`${de}->${p.replace(/'/g, "")}`);
    }
  }
  return pares;
}

function arestasDoJs() {
  const pares = new Set();
  for (const [de, lista] of Object.entries(TRANSICOES)) {
    for (const para of lista) pares.add(`${de}->${para}`);
  }
  return pares;
}

test("o SQL declara arestas de verdade", () => {
  const sqlArestas = arestasDoSql(sql);
  assert.ok(sqlArestas.size >= 10, `o parser achou só ${sqlArestas.size} arestas no SQL`);
});

test("a tabela do JavaScript e o trigger do Postgres declaram as mesmas arestas", () => {
  const noSql = arestasDoSql(sql);
  const noJs = arestasDoJs();

  const soNoSql = [...noSql].filter((x) => !noJs.has(x)).sort();
  const soNoJs = [...noJs].filter((x) => !noSql.has(x)).sort();

  assert.deepEqual(soNoSql, [], `arestas que só existem no SQL: ${soNoSql.join(", ")}`);
  assert.deepEqual(soNoJs, [], `arestas que só existem no JavaScript: ${soNoJs.join(", ")}`);
});

test("as arestas proibidas não aparecem em nenhum dos dois", () => {
  const proibidas = [
    "pendente->enviado",      // o caminho antigo, que duplicava
    "desconhecido->pendente", // reenviar o que pode ter saído
    "desconhecido->reservado",
    "falhou->enviado",
    "enviado->pendente",
  ];
  const noSql = arestasDoSql(sql);
  const noJs = arestasDoJs();
  for (const p of proibidas) {
    assert.equal(noSql.has(p), false, `${p} apareceu no SQL`);
    assert.equal(noJs.has(p), false, `${p} apareceu no JavaScript`);
  }
});

test("o SQL não deixou nenhum estado fora do check da coluna", () => {
  const check = sql.match(/disparo_envios_estado_check[\s\S]*?check \(estado in \(([^)]*)\)\)/);
  assert.ok(check, "não achei o check de estado");
  const permitidos = new Set((check[1].match(/'([a-z]+)'/g) || []).map((x) => x.replace(/'/g, "")));
  for (const aresta of arestasDoSql(sql)) {
    const [de, para] = aresta.split("->");
    assert.ok(permitidos.has(de), `${de} está nas transições e não no check`);
    assert.ok(permitidos.has(para), `${para} está nas transições e não no check`);
  }
});
