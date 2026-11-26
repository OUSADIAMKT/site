// As abas de Conversas e o estado de lido/não lido.
//
// O que este arquivo existe para impedir:
//
// 1. A aba "Meus" voltar a contar zero. A causa foi o login mandar o id da
//    atendente no token e NÃO no objeto de sessão que a tela guarda: a
//    comparação virava `atendente_id === undefined` e nenhuma conversa batia.
//    Rita e Lia tinham vinte e cinco conversas na mão e liam "Meus 0".
//
// 2. Contador e lista brigarem. Eram duas contas separadas para a mesma
//    pergunta, e bastava mudar uma.
//
// 3. A leitura de uma pessoa apagar a da outra, ou a resposta da IA apagar a
//    de quem é responsável pela conversa.
//
// 4. Uma sessão ler ou marcar conversa de outra empresa.

import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import { contarAbas, visiveisNaAba, ABAS, passaNaAba } from "../src/abasConversas.js";
import {
  quemLe, comNaoLidas, NADA_NAO_LIDO, marcarLido, marcarNaoLido, lerNaoLidas,
} from "../api/_leitura.js";
import fila from "../api/painel-fila.js";
import { gerarToken } from "../api/_painel.js";

const OUSADIA = "11111111-1111-1111-1111-111111111111";
const OUTRA_EMPRESA = "22222222-2222-2222-2222-222222222222";
const LIA = "48d88e93-80f0-4c6d-aead-e05b86c2f5d2";
const RITA = "e7dfe4d9-270d-4b40-af70-97d921be970e";
const CONVERSA = "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee";

Object.assign(process.env, {
  SESSION_SECRET: "segredo-local-de-teste",
  SUPABASE_URL: "https://supabase.invalid",
  SUPABASE_SECRET_KEY: "chave-local-de-teste",
});

/** A caixa da empresa como ela é hoje, em miniatura. */
const CAIXA = [
  { id: "c1", modo: "humano", atendente_id: LIA, canal: "whatsapp", nao_lidas: 3, sem_resposta: 2 },
  { id: "c2", modo: "humano", atendente_id: LIA, canal: "whatsapp", nao_lidas: 0, sem_resposta: 0 },
  { id: "c3", modo: "humano", atendente_id: RITA, canal: "whatsapp", nao_lidas: 0, marcada: true, sem_resposta: 0 },
  { id: "c4", modo: "fila", atendente_id: null, canal: "whatsapp", nao_lidas: 1, sem_resposta: 1 },
  { id: "c5", modo: "ia", atendente_id: null, canal: "instagram", nao_lidas: 0, sem_resposta: 0 },
];

// --------------------------------------------------------------------------
// As abas.

test("a Lia vê em Meus só as conversas dela", () => {
  assert.deepEqual(visiveisNaAba(CAIXA, "meus", LIA).map((c) => c.id), ["c1", "c2"]);
});

test("a Rita vê em Meus só a dela, e não as da Lia", () => {
  assert.deepEqual(visiveisNaAba(CAIXA, "meus", RITA).map((c) => c.id), ["c3"]);
});

test("sem id de quem está logado, Meus fica vazia em vez de mostrar as de todo mundo", () => {
  // Era exatamente este o estado da tela antes da correção. O teste existe
  // para garantir que, se o id sumir de novo, a aba fique vazia e desligada,
  // e nunca derrame as conversas da equipe inteira em "Meus".
  assert.equal(visiveisNaAba(CAIXA, "meus", null).length, 0);
  assert.equal(visiveisNaAba(CAIXA, "meus", undefined).length, 0);
});

test("Fila é quem espera sem dono, Equipe é quem está com alguém, IA é o resto", () => {
  assert.deepEqual(visiveisNaAba(CAIXA, "fila", LIA).map((c) => c.id), ["c4"]);
  assert.deepEqual(visiveisNaAba(CAIXA, "humano", LIA).map((c) => c.id), ["c1", "c2", "c3"]);
  assert.deepEqual(visiveisNaAba(CAIXA, "ia", LIA).map((c) => c.id), ["c5"]);
  assert.equal(visiveisNaAba(CAIXA, "fila", LIA).every((c) => !c.atendente_id), true);
});

test("Fila vazia é resposta legítima, não defeito", () => {
  // Com tudo assumido, "Fila 0" é a verdade. O teste existe porque é fácil
  // confundir aba vazia com filtro quebrado.
  const semFila = CAIXA.filter((c) => c.modo !== "fila");
  assert.equal(visiveisNaAba(semFila, "fila", LIA).length, 0);
});

test("Equipe e Meus se sobrepõem de propósito, e a soma continua fechando", () => {
  const equipe = visiveisNaAba(CAIXA, "humano", LIA);
  const minhas = visiveisNaAba(CAIXA, "meus", LIA);
  assert.equal(minhas.every((c) => equipe.some((e) => e.id === c.id)), true,
    "as minhas são um pedaço das da equipe");
  const conta = contarAbas(CAIXA, LIA);
  assert.equal(conta.fila + conta.humano + conta.ia, conta.tudo,
    "fila, equipe e IA são os três estados possíveis e cobrem tudo");
});

test("todo contador bate exatamente com o que a aba mostra", () => {
  for (const eu of [LIA, RITA, null]) {
    for (const canal of ["", "whatsapp", "instagram"]) {
      const conta = contarAbas(CAIXA, eu, canal);
      for (const aba of ABAS) {
        assert.equal(conta[aba], visiveisNaAba(CAIXA, aba, eu, canal).length,
          `aba ${aba}, canal ${canal || "todos"}: contador e lista precisam dizer o mesmo`);
      }
    }
  }
});

test("o filtro de canal vale para todas as abas, contador incluído", () => {
  const conta = contarAbas(CAIXA, LIA, "instagram");
  assert.equal(conta.tudo, 1);
  assert.equal(conta.ia, 1);
  assert.equal(conta.meus, 0);
});

test("Não lidas junta as com mensagem nova e as marcadas na mão", () => {
  assert.deepEqual(visiveisNaAba(CAIXA, "nao_lidas", LIA).map((c) => c.id), ["c1", "c3", "c4"]);
});

test("aba desconhecida não esconde nada em silêncio", () => {
  assert.equal(passaNaAba(CAIXA[0], "aba-que-nao-existe", LIA), true);
});

test("transferir a conversa muda de quem ela é nas abas", () => {
  // A transferência é do servidor; o que a tela precisa garantir é que, trocado
  // o dono, a conversa sai de uma caixa e entra na outra, sem sumir do Tudo.
  const antes = CAIXA;
  const depois = CAIXA.map((c) => (c.id === "c1" ? { ...c, atendente_id: RITA } : c));

  assert.equal(contarAbas(antes, LIA).meus, 2);
  assert.equal(contarAbas(depois, LIA).meus, 1);
  assert.equal(contarAbas(antes, RITA).meus, 1);
  assert.equal(contarAbas(depois, RITA).meus, 2);
  assert.equal(contarAbas(depois, LIA).tudo, contarAbas(antes, LIA).tudo);
  assert.equal(contarAbas(depois, LIA).humano, contarAbas(antes, LIA).humano);
});

// --------------------------------------------------------------------------
// O login: a causa raiz.

test("a sessão devolvida no login carrega o campo que a aba Meus usa", async () => {
  // Lido do próprio arquivo. Montar o caminho de sucesso exigiria um hash de
  // senha de verdade guardado aqui dentro, e o que precisa ser garantido é uma
  // linha só: o `atendente:` dentro do objeto `sessao`, que é o que o
  // navegador guarda e a tela lê.
  const fonte = await readFile(new URL("../api/painel-entrar.js", import.meta.url), "utf8");
  const depoisDoLogin = fonte.slice(fonte.indexOf("autenticarAtendente(email"));
  const sessao = depoisDoLogin.slice(depoisDoLogin.indexOf("sessao: {"));
  assert.match(sessao, /atendente:\s*atendente\.id/,
    "sem isto a tela não sabe QUEM está logada e a aba Meus conta zero");
});

// --------------------------------------------------------------------------
// Leitura: de quem lê, e de mais ninguém.

test("a identidade de leitura é a atendente; o gestor da plataforma é operador", () => {
  assert.equal(quemLe({ tipo: "atendente", atendente: LIA }), LIA);
  assert.equal(quemLe({ tipo: "operador" }), "operador");
  assert.equal(quemLe({ tipo: "atendente" }), "operador", "atendente sem id não herda a leitura de outra pessoa");
  assert.equal(quemLe(null), "operador");
});

/** Banco de mentira que guarda o que foi escrito em `leituras_conversa`. */
function bancoDeLeitura(linhasDaRpc = []) {
  const escritas = [];
  const original = globalThis.fetch;
  globalThis.fetch = async (url, op = {}) => {
    const u = new URL(String(url));
    if (u.pathname.endsWith("/nao_lidas_das_conversas")) {
      const corpo = JSON.parse(op.body);
      return Response.json(
        linhasDaRpc.filter((l) => l.quem === corpo.p_quem).map(({ quem, ...resto }) => resto),
      );
    }
    escritas.push({ caminho: u.pathname, corpo: JSON.parse(op.body || "{}") });
    return Response.json([{}]);
  };
  return { escritas, devolver: () => { globalThis.fetch = original; } };
}

test("cada pessoa tem a sua contagem na mesma conversa", async () => {
  const banco = bancoDeLeitura([
    { quem: LIA, conversa_id: CONVERSA, nao_lidas: 4, marcada: false },
    { quem: RITA, conversa_id: CONVERSA, nao_lidas: 0, marcada: false },
  ]);
  try {
    assert.equal((await lerNaoLidas([CONVERSA], LIA)).get(CONVERSA).nao_lidas, 4);
    assert.equal((await lerNaoLidas([CONVERSA], RITA)).get(CONVERSA).nao_lidas, 0,
      "a Lia não ter lido não deixa a conversa em negrito para a Rita");
  } finally {
    banco.devolver();
  }
});

test("marcar como lida grava só no nome de quem leu", async () => {
  const banco = bancoDeLeitura();
  try {
    await marcarLido(CONVERSA, LIA);
    const escrita = banco.escritas.find((e) => e.caminho.endsWith("/leituras_conversa"));
    assert.equal(escrita.corpo.quem, LIA);
    assert.equal(escrita.corpo.nao_lido, false, "abrir desfaz o marcar como não lida");
    assert.ok(escrita.corpo.lido_ate, "e empurra a marca de leitura para agora");
  } finally {
    banco.devolver();
  }
});

test("marcar como não lida NÃO mexe na marca de leitura", async () => {
  // Se mexesse, as mensagens antigas voltariam todas a contar e a bolinha
  // mostraria um número que nunca foi verdade.
  const banco = bancoDeLeitura();
  try {
    await marcarNaoLido(CONVERSA, RITA);
    const escrita = banco.escritas.find((e) => e.caminho.endsWith("/leituras_conversa"));
    assert.equal(escrita.corpo.nao_lido, true);
    assert.equal("lido_ate" in escrita.corpo, false);
  } finally {
    banco.devolver();
  }
});

test("a contagem é de mensagens que entraram, então resposta da IA não apaga nada", async () => {
  // A conta é feita no banco sobre `direcao = entrada`. Nenhuma resposta, nem
  // da IA nem de colega, aparece nela: a única coisa que zera a contagem de
  // uma pessoa é essa pessoa abrir a conversa.
  const sql = await readFile(new URL("../sql/039_leituras.sql", import.meta.url), "utf8");
  const funcao = sql.slice(sql.indexOf("nao_lidas_das_conversas"));
  assert.match(funcao, /direcao\s*=\s*'entrada'/);
  assert.equal(/autor_atendente_id|direcao\s*=\s*'saida'/.test(funcao), false,
    "quem respondeu não pode entrar na conta de quem leu");
});

test("quem não tem linha de leitura fica sem nada não lido, não indefinido", () => {
  const juntas = comNaoLidas([{ id: "c1" }], new Map());
  assert.equal(juntas[0].nao_lidas, 0);
  assert.equal(juntas[0].marcada, false);
  assert.deepEqual(Object.keys(NADA_NAO_LIDO).sort(), ["marcada", "nao_lidas"]);
});

// --------------------------------------------------------------------------
// Isolamento entre empresas.

/** Roda uma ação do painel com a sessão dada, contra um banco de mentira. */
async function acaoNoPainel({ sessao, corpo, donaDaConversa }) {
  const original = globalThis.fetch;
  globalThis.fetch = async (url) => {
    const alvo = String(url);
    if (alvo.includes("/rest/v1/conversas")) {
      return Response.json([{ id: CONVERSA, cliente_id: donaDaConversa, modo: "ia", canal: "whatsapp" }]);
    }
    if (alvo.includes("/rest/v1/atendentes")) {
      return Response.json([{
        id: LIA, nome: "Lia", cliente_id: OUSADIA, papel: "atendente",
        ativo: true, disponivel: true, versao_sessao: 1, clientes: { ativo: true, modulos: {} },
      }]);
    }
    return Response.json([{}]);
  };
  const req = {
    method: "POST", query: {},
    headers: { authorization: `Bearer ${gerarToken(sessao)}` },
    body: { conversa_id: CONVERSA, ...corpo },
  };
  const res = { status(c) { this.code = c; return this; }, json(b) { this.body = b; return this; } };
  try {
    await fila(req, res);
  } finally {
    globalThis.fetch = original;
  }
  return res;
}

test("a sessão de uma empresa não marca leitura em conversa de outra", async () => {
  const res = await acaoNoPainel({
    sessao: { tipo: "atendente", atendente: LIA, cliente: OUSADIA },
    corpo: { acao: "nao_lido" },
    donaDaConversa: OUTRA_EMPRESA,
  });
  assert.equal(res.code, 403);
  assert.match(res.body.error, /outro cliente/i);
});

test("na própria empresa, a mesma ação passa", async () => {
  const res = await acaoNoPainel({
    sessao: { tipo: "atendente", atendente: LIA, cliente: OUSADIA },
    corpo: { acao: "nao_lido" },
    donaDaConversa: OUSADIA,
  });
  assert.equal(res.code, 200);
  assert.equal(res.body.ok, true);
});
