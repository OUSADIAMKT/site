// Testa o reconhecedor da chamada para ação, sem banco e sem rede.
//
//   node scripts/verificar-gatilho.js
//
// Existe porque errar para os dois lados é caro: deixar passar "qualquer coisa"
// faz o bot responder quem não chamou, e não reconhecer "qero" perde o lead que
// veio do vídeo.

import { combina, normalizar, QUERO } from "../api/_gatilho.js";

let falhas = 0;

function deveCasar(texto) {
  if (combina(texto, QUERO)) return console.log(`  ok   casa      "${texto}"`);
  falhas++;
  console.log(`  FALHOU deveria casar: "${texto}" → "${normalizar(texto)}"`);
}

function naoDeveCasar(texto) {
  if (!combina(texto, QUERO)) return console.log(`  ok   ignora    "${texto}"`);
  falhas++;
  console.log(`  FALHOU NÃO deveria casar: "${texto}" → "${normalizar(texto)}"`);
}

console.log("\nA chamada, escrita de todo jeito\n");
[
  "eu quero", "Eu quero", "EU QUERO", "eu quero!!!", "EU QUERO 🇺🇸",
  "quero", "QUERO", "Quero!", "quero sim", "eu quero muito",
  "eu quiro", "quiro", "eu queru", "qero", "eu qero",
  "qro", "eu qro", "kero", "eu kero", "kro",
  "queroooo", "QUEROOOO", "q u e r o", "e u q u e r o",
  "eu  quero", "euquero", "eu quero.", "quero 🙋‍♂️", "Qero saber",
].forEach(deveCasar);

console.log("\nO que tem que ser ignorado\n");
[
  "parabéns", "top demais", "lindo", "boa sorte", "já segui",
  "qualquer coisa me chama", "quanto custa", "quem é você", "de onde é aqui",
  "quando abre", "porque não responde", "quarto lugar", "obrigado",
  "primeiro", "🔥🔥🔥", "", "   ", "aqui no Pará tem?",
].forEach(naoDeveCasar);

console.log("\nSem gatilho configurado, responde tudo\n");
[["", "parabéns"], [null, "qualquer coisa"], [undefined, "top"]].forEach(([p, t]) => {
  if (combina(t, p)) console.log(`  ok   responde  "${t}" (sem gatilho)`);
  else { falhas++; console.log(`  FALHOU deveria responder sem gatilho: "${t}"`); }
});

console.log("\nPadrão quebrado não libera geral\n");
if (!combina("parabéns", "((((")) console.log("  ok   padrão inválido não responde nada");
else { falhas++; console.log("  FALHOU padrão inválido liberou resposta"); }

console.log(falhas === 0 ? "\nTudo certo.\n" : `\n${falhas} falha(s).\n`);
process.exit(falhas === 0 ? 0 : 1);
