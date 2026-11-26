// O cabeçalho de página é um só, e este teste é o que mantém isso verdade.
//
// Padrão não é documentação, é algo que falha quando alguém sai dele. Sem
// este teste, o próximo módulo escreve o próprio cabeçalho, ninguém percebe
// na revisão, e seis meses depois existem três cabeçalhos de novo, que foi
// exatamente como chegamos aqui: `.cabecalho` em dezessete telas, `.at-titulo`
// em Conversas e `.topo-tela` no CRM, cada um com um tamanho de título.
//
// Ele não olha aparência. Olha quem tem permissão de escrever a marcação do
// cabeçalho, que é um arquivo só.

import test from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";

const PASTA = new URL("../src/", import.meta.url);
const DONO = "CabecalhoPagina.jsx";

// A página pública do relatório não é um módulo do painel: não tem lateral,
// não tem barra do topo e quem abre é o cliente da agência, por um link.
const FORA = new Set(["relatorio.jsx"]);

function telas() {
  return readdirSync(PASTA)
    .filter((f) => f.endsWith(".jsx") && f !== DONO && !FORA.has(f))
    .map((f) => [f, readFileSync(new URL(f, PASTA), "utf8")]);
}

test("só um arquivo escreve a marcação do cabeçalho de página", () => {
  const dono = readFileSync(new URL(DONO, PASTA), "utf8");
  assert.match(dono, /className="pagina-titulo"/, "o dono tem que desenhar o cabeçalho");

  for (const [nome, texto] of telas()) {
    assert.doesNotMatch(texto, /className="pagina-titulo/,
      `${nome} escreve a marcação do cabeçalho na mão: use <CabecalhoPagina>`);
  }
});

test("nenhuma tela ressuscita um cabeçalho antigo", () => {
  // As três formas que existiam antes da padronização. Se uma voltar, é
  // porque alguém copiou de um commit velho.
  const mortos = [/className="cabecalho"/, /className="at-titulo"/, /className="topo-tela/];
  for (const [nome, texto] of telas()) {
    for (const morto of mortos) {
      assert.doesNotMatch(texto, morto, `${nome} usa um cabeçalho que não existe mais: ${morto}`);
    }
  }
});

test("o <h1> da tela sai do componente, e não da tela", () => {
  // Um <h1> solto numa tela é um cabeçalho fora do padrão com outro nome.
  // A marca no login é o logotipo do produto, não o título de uma tela.
  const permitidos = { "App.jsx": /<h1 className="marca">/ };
  for (const [nome, texto] of telas()) {
    for (const linha of texto.split("\n")) {
      if (!linha.includes("<h1")) continue;
      const liberado = permitidos[nome]?.test(linha);
      assert.ok(liberado, `${nome} tem um <h1> próprio: ${linha.trim()}`);
    }
  }
});

test("toda tela que mostra cabeçalho importa o componente", () => {
  for (const [nome, texto] of telas()) {
    if (!texto.includes("<CabecalhoPagina")) continue;
    assert.match(texto, /import CabecalhoPagina from "\.\/CabecalhoPagina\.jsx";/,
      `${nome} usa <CabecalhoPagina> sem importar`);
  }
});

test("o cabeçalho não ganhou CSS paralelo fora do lugar dele", () => {
  // As classes do cabeçalho moram no index.css, junto do resto do esqueleto.
  // Espalhá-las por crm.css ou conversas.css é como o padrão se desfaz: cada
  // módulo ajustando um pedaço para si.
  const fora = ["crm.css", "conversas.css", "plataforma.css"];
  for (const arquivo of fora) {
    const css = readFileSync(new URL(arquivo, PASTA), "utf8");
    assert.doesNotMatch(css, /\.pagina-titulo|\.pagina-resumo|\.pagina-descricao|\.pagina-acoes/,
      `${arquivo} redefine o cabeçalho: isso é do index.css`);
  }
});
