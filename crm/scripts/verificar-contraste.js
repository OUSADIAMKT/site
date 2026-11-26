// Mede o contraste de cada par de cores novo do quadro, nos dois temas.
//
//   node scripts/verificar-contraste.js
//
// Olhar na tela não responde "está acima de 4.5:1?". A conta responde, e é a
// mesma da WCAG 2.1. As fichas de cor saem do próprio index.css, lidas do
// arquivo: se alguém mudar um token, este script passa a medir o valor novo
// em vez de um número copiado à mão que envelhece calado.

import fs from "node:fs";

const css = fs.readFileSync(new URL("../src/index.css", import.meta.url), "utf8");

// O arquivo declara os tokens duas vezes: primeiro o tema escuro, depois o
// claro. Pegar a primeira e a segunda ocorrência de cada nome dá os dois temas
// sem precisar interpretar seletor nenhum.
function fichas() {
  const escuro = {};
  const claro = {};
  for (const [, nome, valor] of css.matchAll(/--([a-z0-9-]+):\s*(#[0-9A-Fa-f]{6})\s*;/g)) {
    if (!(nome in escuro)) escuro[nome] = valor;
    else if (!(nome in claro)) claro[nome] = valor;
  }
  return { escuro, claro };
}

function canal(c) {
  const v = c / 255;
  return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
}

function luminancia(hex) {
  const n = parseInt(hex.slice(1), 16);
  return 0.2126 * canal((n >> 16) & 255)
    + 0.7152 * canal((n >> 8) & 255)
    + 0.0722 * canal(n & 255);
}

function razao(a, b) {
  const [x, y] = [luminancia(a), luminancia(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
}

// Cada par é um texto do quadro sobre o fundo em que ele de fato aparece.
const PARES = [
  ["nome no cartão", "texto", "painel"],
  ["linha do cartão", "texto-2", "painel"],
  ["prévia da mensagem", "texto-2", "painel"],
  ["nome do canal", "apagado", "painel"],
  ["motivo da fila", "apagado", "painel"],
  ["contador da coluna", "apagado", "painel"],
  ["título da coluna", "texto", "painel-2"],
  ["coluna vazia", "apagado", "painel-2"],
  ["quantos ficaram de fora", "apagado", "painel-2"],
  ["botão do filtro", "texto-2", "painel"],
  ["filtro escolhido", "texto", "acento-fraco"],
  ["item do menu Mover", "texto", "painel-2"],
  ["janela calor 1", "espera-1", "painel"],
  ["janela calor 2", "espera-2", "painel"],
  ["janela calor 3", "espera-3", "painel"],
  ["janela calor 4", "espera-4", "painel"],
];

const MINIMO = 4.5;
let falhas = 0;

const { escuro, claro } = fichas();

for (const [nomeDoTema, tema] of [["escuro", escuro], ["claro", claro]]) {
  console.log(`\nTema ${nomeDoTema}\n`);
  for (const [oQue, frente, fundo] of PARES) {
    const a = tema[frente];
    const b = tema[fundo];
    if (!a || !b) {
      falhas++;
      console.log(`  FALHOU ${oQue}: não achei --${frente} ou --${fundo} no tema ${nomeDoTema}`);
      continue;
    }
    const r = razao(a, b);
    const passa = r >= MINIMO;
    if (!passa) falhas++;
    console.log(`  ${passa ? "ok    " : "FALHOU"} ${oQue.padEnd(26)} ${a} sobre ${b}  ${r.toFixed(2)}:1`);
  }
}

console.log(falhas ? `\n${falhas} par(es) abaixo de ${MINIMO}:1.\n` : `\nTodos os pares acima de ${MINIMO}:1.\n`);
process.exit(falhas ? 1 : 0);
