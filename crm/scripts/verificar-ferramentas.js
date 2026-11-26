// Confere a montagem das ferramentas e dos canais, sem banco e sem rede.
//
//   node scripts/verificar-ferramentas.js
//
// Existe porque dois erros aqui são silenciosos e caros:
//
// 1. A ORDEM das ferramentas entra no prefixo do cache do prompt. Mudar a ordem
//    não quebra nada visível: só triplica o custo por resposta, e só se descobre
//    olhando `cache_read_input_tokens` na tabela `uso` dias depois.
// 2. Uma ferramenta que aparece para o cliente ERRADO é pior que um bug: é a IA
//    oferecendo agendamento numa conta que não tem agenda, ou prometendo
//    consultar acesso de uma plataforma que não existe.

import { definirFerramentas } from "../api/_ferramentas.js";
import { abrirCanal } from "../api/_canal.js";

let falhas = 0;

function conferir(titulo, obtido, esperado) {
  const a = JSON.stringify(obtido);
  const b = JSON.stringify(esperado);
  if (a === b) {
    console.log(`  ok   ${titulo}`);
  } else {
    falhas++;
    console.log(`  FALHOU ${titulo}`);
    console.log(`         esperado: ${b}`);
    console.log(`         obtido:   ${a}`);
  }
}

const NUCLEO = ["enviar_midia", "atualizar_lead", "transferir_humano"];

const nomes = (p) => definirFerramentas(p).map((f) => f.name);

console.log("\nFerramentas por tipo de cliente\n");

// Cliente cru: só o núcleo. É o piso, e tem que ser estável para sempre.
conferir("cliente sem nada", nomes({}), NUCLEO);

// Clínica: agenda na frente, núcleo no fim.
conferir(
  "clínica (com profissionais)",
  nomes({ profissionais: [{ nome: "Dra. Ana" }] }),
  ["consultar_horarios", "marcar_consulta", ...NUCLEO],
);

// Escola Exemplo: links e consulta de acesso, sem agenda.
conferir(
  "Escola Exemplo (links + acesso)",
  nomes({
    links: [{ chave: "vsl", descricao: "página de vendas" }],
    cliente: { acesso_url: "https://x/api/auth", acesso_token: "segredo" },
  }),
  ["enviar_link", "consultar_acesso", ...NUCLEO],
);

// Meio token não liga a ferramenta: sem os dois, a consulta não existe.
conferir(
  "acesso com url mas sem token não aparece",
  nomes({ cliente: { acesso_url: "https://x/api/auth" } }),
  NUCLEO,
);


conferir("links vazios não criam enviar_link", nomes({ links: [] }), NUCLEO);

// O núcleo precisa ser sempre o SUFIXO da lista: é o que mantém o prefixo de
// cache de um cliente estável quando outro cliente ganha uma capacidade.
console.log("\nNúcleo sempre no fim\n");
for (const [titulo, p] of [
  ["clínica", { profissionais: [{ nome: "Dra. Ana" }] }],
  ["escola", { links: [{ chave: "vsl", descricao: "d" }] }],
  ["tudo junto", {
    profissionais: [{ nome: "Dra. Ana" }],
    links: [{ chave: "vsl", descricao: "d" }],
    cliente: { acesso_url: "u", acesso_token: "t" },
  }],
]) {
  const lista = nomes(p);
  conferir(titulo, lista.slice(-3), NUCLEO);
}

// A URL nunca pode entrar no prompt: só chave e descrição.
console.log("\nA URL não vaza para o prompt\n");
const comLink = definirFerramentas({
  links: [{ chave: "vsl", url: "https://secreto.exemplo/vsl", descricao: "página de vendas" }],
});
const texto = JSON.stringify(comLink);
conferir("URL ausente da definição das ferramentas", texto.includes("secreto.exemplo"), false);
conferir("chave presente no enum", texto.includes('"vsl"'), true);

console.log("\nCanais\n");
const teste = abrirCanal({ canal: "teste" });
conferir("canal de teste tem a interface completa",
  ["nome", "texto", "midia", "digitando", "pausa", "emBaloes"].every((k) => k in teste), true);

const INTERFACE = ["nome", "texto", "midia", "digitando", "pausa", "emBaloes"];

const wa = abrirCanal({ canal: "whatsapp", cliente: {}, contato: "5593" });
conferir("canal whatsapp tem a interface completa", INTERFACE.every((k) => k in wa), true);

const ig = abrirCanal({ canal: "instagram", cliente: {}, contato: "123" });
conferir("canal instagram tem a interface completa", INTERFACE.every((k) => k in ig), true);

// Os três precisam ter a MESMA interface, senão uma ferramenta funciona num
// canal e quebra no outro, e só se descobre com a pessoa esperando resposta.
conferir("os três canais expõem as mesmas funções",
  [wa, ig, teste].map((c) => Object.keys(c).sort().join(",")).every((k, _, t) => k === t[0]), true);

let barrou = false;
try { abrirCanal({ canal: "telegram", cliente: {}, contato: "1" }); } catch { barrou = true; }
conferir("canal não implementado falha alto", barrou, true);

console.log(falhas === 0 ? "\nTudo certo.\n" : `\n${falhas} falha(s).\n`);
process.exit(falhas === 0 ? 0 : 1);
