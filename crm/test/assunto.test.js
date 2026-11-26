// De que a conversa trata, lido no código.
//
// Esta função decide para quem a fila entrega. Ela é uma lista de palavras, e
// lista de palavras envelhece calada: ninguém percebe que "gestão de redes"
// parou de cair na agência, só aparece uma conversa parada na fila geral. Os
// testes aqui são as frases que as pessoas realmente escrevem.

import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import { ASSUNTOS, assuntoDaMensagem, etiquetasDoAssunto } from "../api/_assunto.js";

// ---------------------------------------------------------------------------
// Agência

test("empresa que quer contratar o marketing cai em agência", () => {
  // A Ousadia também presta serviço. Quem chega pedindo isso não é aluno nem
  // quer curso: é uma empresa querendo terceirizar, e quem atende é a Rita.
  for (const frase of [
    "vocês fazem gestão de redes sociais?",
    "quero contratar a agência de vocês",
    "preciso de alguém para cuidar das minhas redes",
    "vocês fazem tráfego pago para minha empresa?",
    "queria um orçamento de social media",
    "quero terceirizar o marketing da loja",
    "vocês fazem produção de conteúdo?",
  ]) {
    assert.equal(assuntoDaMensagem(frase), "agencia", `caiu errado: ${frase}`);
  }
});

test("agência ganha de matrícula quando a pessoa quer o serviço", () => {
  // "curso" sozinho é matrícula. Com pedido de gestão no meio, não é: ela quer
  // contratar, não aprender.
  assert.equal(
    assuntoDaMensagem("vocês fazem gestão de redes? vi que tem curso também"),
    "agencia",
  );
});

test("suporte ganha de agência", () => {
  // Quem já é aluno e está sem acesso precisa de ajuda agora, mesmo que a
  // conversa fale em gestão de redes.
  assert.equal(
    assuntoDaMensagem("não consigo acessar a aula de gestão de redes"),
    "suporte",
  );
});

test("agência é lead, e carrega a etiqueta dela", () => {
  // `lead` porque quem pergunta isso ainda não contratou, e é por `lead` que o
  // CRM conta. `agencia` porque é por ela que a equipe filtra na tela.
  assert.deepEqual(etiquetasDoAssunto("agencia"), ["lead", "agencia"]);
});

// ---------------------------------------------------------------------------
// Matrícula e suporte

test("matrícula e suporte caem onde devem", () => {
  assert.equal(assuntoDaMensagem("quero entrar na mentoria"), "matricula");
  assert.equal(assuntoDaMensagem("quanto custa a escola?"), "matricula");
  assert.equal(assuntoDaMensagem("quando abre a próxima turma?"), "matricula");
  assert.equal(assuntoDaMensagem("não consigo acessar a plataforma"), "suporte");
  assert.equal(assuntoDaMensagem("como pego meu certificado?"), "suporte");
  assert.equal(assuntoDaMensagem("comprei a mentoria e não recebi o acesso"), "suporte");
});

test("matrícula é lead, suporte não", () => {
  assert.deepEqual(etiquetasDoAssunto("matricula"), ["lead", "matricula"]);
  assert.deepEqual(etiquetasDoAssunto("suporte"), ["suporte"]);
});

test("conversa sem assunto claro continua sem assunto", () => {
  // Nunca devolver assunto por dúvida: sem assunto a fila entrega por carga, e
  // isso é melhor do que entregar para a pessoa errada com confiança.
  assert.equal(assuntoDaMensagem("bom dia"), null);
  assert.equal(assuntoDaMensagem("oi, tudo bem?"), null);
  assert.equal(assuntoDaMensagem(""), null);
  assert.equal(assuntoDaMensagem(null), null);
});

test("agência não rouba conversa sobre o conteúdo do curso", () => {
  // "redes" e "instagram" aparecem o tempo todo em pergunta de aluno. Sozinhos
  // não podem valer agência, senão metade da fila vira orçamento.
  assert.equal(assuntoDaMensagem("vocês ensinam a crescer no instagram?"), null);
  assert.equal(assuntoDaMensagem("o que são redes sociais orgânicas?"), null);
});

// ---------------------------------------------------------------------------
// As listas que vivem em arquivos diferentes

test("a lista do painel de atendentes é a mesma do código da fila", async () => {
  // O painel só deixa marcar o que a fila sabe rotear. Com as duas listas
  // separadas, um assunto novo nasce na fila e nunca aparece na tela, e
  // ninguém descobre: a conversa só cai na pessoa errada.
  const fonte = await readFile(new URL("../api/painel-atendentes.js", import.meta.url), "utf8");
  assert.match(fonte, /import \{[^}]*ASSUNTOS[^}]*\} from "\.\/_assunto\.js"/,
    "o painel tem que importar a lista, não copiar");
  assert.doesNotMatch(fonte, /const ASSUNTOS = \[/, "cópia da lista de volta no painel");
});

test("toda tela que mostra assunto tem nome para todos eles", async () => {
  // Assunto sem nome na tela aparece cru, "agencia", no meio de rótulos
  // escritos em português.
  for (const arquivo of ["../src/Atendentes.jsx", "../src/Frentes.jsx", "../src/Conversa.jsx"]) {
    const fonte = await readFile(new URL(arquivo, import.meta.url), "utf8");
    const mapa = fonte.match(/const (?:NOME_ASSUNTO|ASSUNTO_CURTO) = \{([^}]*)\}/)[1];
    for (const assunto of ASSUNTOS) {
      assert.match(mapa, new RegExp(`\\b${assunto}\\s*:`), `${arquivo} não nomeia ${assunto}`);
    }
  }
});
