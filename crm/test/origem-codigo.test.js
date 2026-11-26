// Quem preenche a origem no dia a dia, e quem nao pode mexer nela.
//
// A migracao 043 arruma o passado; estes testes seguram o presente:
//
// 1. O negocio nasce na primeira mensagem, quando ainda nao existe etiqueta
//    nenhuma, e por isso nasce com a origem do sinal tecnico ("WhatsApp
//    direto"). A etiqueta de origem chega minutos ou dias depois, pela
//    `atualizar_lead`. Sem a correcao, toda conversa que veio do disparo
//    ficaria registrada para sempre como quem chegou sozinho no numero.
//
// 2. A correcao so pode mexer no que foi deduzido. Origem escolhida a mao nao
//    tem chave, e e a chave nula que a protege.
//
// 3. A `transferir_humano` gravava as etiquetas da conversa em minuscula.
//    Isso desfazia a 041 a cada transferencia: "Black da Mentoria OM" voltava a
//    ser "black da mentoria om" e o filtro do Quadro passava a achar metade das
//    conversas da campanha. Ninguem ve isso na tela, so o filtro encolhe.

import test from "node:test";
import assert from "node:assert/strict";

import { origemDaConversa, corrigirOrigemDoNegocio } from "../api/_negocios.js";
import { executarFerramenta } from "../api/_ferramentas.js";
import { db } from "../api/_db.js";

const OUSADIA = "896d41cf-164a-4608-bf16-35ec341e1950";
const CONVERSA = "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee";

Object.assign(process.env, {
  SUPABASE_URL: "https://supabase.invalid",
  SUPABASE_SECRET_KEY: "chave-local-de-teste",
});

/** Resposta falsa por `tabela:METODO`, respeitando quem pediu uma linha so. */
function postgrestDeMentira(tabelas) {
  const chamadas = [];
  const original = globalThis.fetch;
  globalThis.fetch = async (url, op = {}) => {
    const u = new URL(String(url));
    const tabela = u.pathname.replace("/rest/v1/", "");
    const metodo = op.method || "GET";
    chamadas.push({ tabela, metodo, busca: u.search, corpo: op.body ? JSON.parse(op.body) : null });

    const bruta = tabelas[`${tabela}:${metodo}`] ?? tabelas[tabela] ?? [];
    const resposta = typeof bruta === "function" ? bruta(chamadas) : bruta;
    const aceita = op.headers instanceof Headers
      ? op.headers.get("accept") || ""
      : String(op.headers?.Accept || op.headers?.accept || "");
    if (aceita.includes("pgrst.object")) {
      const um = Array.isArray(resposta) ? resposta[0] : resposta;
      if (!um) return new Response(null, { status: 406 });
      return Response.json(um);
    }
    return Response.json(resposta);
  };
  return { chamadas, soltar: () => { globalThis.fetch = original; } };
}

const corpos = (chamadas, tabela, metodo) =>
  chamadas.filter((c) => c.tabela === tabela && c.metodo === metodo).map((c) => c.corpo);

// A lista da 041: "veio do disparo" e da familia origem, "matricula" nao e.
const CONHECIDAS = [{ etiqueta: "veio do disparo", chave: "veio do disparo" }];

// ---------------------------------------------------------------------------
// De onde sai a origem

test("a etiqueta de origem manda, e reaproveita a linha ja cadastrada", async () => {
  const { chamadas, soltar } = postgrestDeMentira({
    etiquetas_conhecidas: CONHECIDAS,
    crm_origens: [{ id: "origem-disparo" }],
  });
  try {
    const id = await origemDaConversa(db(), OUSADIA, {
      id: CONVERSA, canal: "whatsapp", etiquetas: ["Veio do disparo", "matricula"], origem: null,
    });
    assert.equal(id, "origem-disparo");
    assert.deepEqual(
      corpos(chamadas, "crm_origens", "POST"), [],
      "a origem ja existia: criar outra encheria o seletor de linhas repetidas"
    );
  } finally {
    soltar();
  }
});

test("sem etiqueta, a origem e o sinal tecnico, criado se faltar", async () => {
  const { chamadas, soltar } = postgrestDeMentira({
    etiquetas_conhecidas: CONHECIDAS,
    crm_origens: [],
    "crm_origens:POST": [{ id: "origem-nova" }],
  });
  try {
    const id = await origemDaConversa(db(), OUSADIA, {
      id: CONVERSA, canal: "whatsapp", etiquetas: [], origem: null,
    });
    assert.equal(id, "origem-nova");
    const [linha] = corpos(chamadas, "crm_origens", "POST");
    assert.equal(linha.chave, "direto");
    assert.equal(linha.nome, "WhatsApp direto");
  } finally {
    soltar();
  }
});

test("conversa comecada pela equipe nao e lead que chegou sozinho", async () => {
  const { chamadas, soltar } = postgrestDeMentira({
    etiquetas_conhecidas: CONHECIDAS,
    crm_origens: [],
    "crm_origens:POST": [{ id: "origem-equipe" }],
  });
  try {
    await origemDaConversa(db(), OUSADIA, {
      id: CONVERSA, canal: "whatsapp", etiquetas: [],
      origem: { tipo: "painel", por: "operador" },
    });
    const [linha] = corpos(chamadas, "crm_origens", "POST");
    assert.equal(linha.chave, "equipe");
  } finally {
    soltar();
  }
});

// ---------------------------------------------------------------------------
// A correcao quando a etiqueta chega depois

test("a etiqueta que chega depois corrige a origem deduzida", async () => {
  const { chamadas, soltar } = postgrestDeMentira({
    etiquetas_conhecidas: CONHECIDAS,
    crm_negocios: [{ id: "negocio-1", origem_id: "origem-direto", crm_origens: { chave: "direto" } }],
    crm_origens: [{ id: "origem-disparo" }],
  });
  try {
    const mexidos = await corrigirOrigemDoNegocio(db(), OUSADIA, {
      id: CONVERSA, etiquetas: ["veio do disparo"],
    });
    assert.equal(mexidos, 1);
    assert.deepEqual(corpos(chamadas, "crm_negocios", "PATCH"), [{ origem_id: "origem-disparo" }]);
  } finally {
    soltar();
  }
});

test("origem escolhida a mao nao e sobrescrita", async () => {
  const { chamadas, soltar } = postgrestDeMentira({
    etiquetas_conhecidas: CONHECIDAS,
    // Chave nula: foi alguem que cadastrou "Feira do empreendedor" e escolheu.
    crm_negocios: [{ id: "negocio-1", origem_id: "origem-feira", crm_origens: { chave: null } }],
    crm_origens: [{ id: "origem-disparo" }],
  });
  try {
    const mexidos = await corrigirOrigemDoNegocio(db(), OUSADIA, {
      id: CONVERSA, etiquetas: ["veio do disparo"],
    });
    assert.equal(mexidos, 0);
    assert.deepEqual(corpos(chamadas, "crm_negocios", "PATCH"), []);
  } finally {
    soltar();
  }
});

test("etiqueta que nao e de origem nao mexe em negocio nenhum", async () => {
  const { chamadas, soltar } = postgrestDeMentira({
    etiquetas_conhecidas: CONHECIDAS,
    crm_negocios: [{ id: "negocio-1", origem_id: "origem-direto", crm_origens: { chave: "direto" } }],
  });
  try {
    const mexidos = await corrigirOrigemDoNegocio(db(), OUSADIA, { id: CONVERSA, etiquetas: ["matricula"] });
    assert.equal(mexidos, 0);
    assert.deepEqual(corpos(chamadas, "crm_negocios", "PATCH"), []);
  } finally {
    soltar();
  }
});

// ---------------------------------------------------------------------------
// A transferencia nao pode desfazer a 041

test("transferir para humano preserva a grafia canonica das etiquetas", async () => {
  const { chamadas, soltar } = postgrestDeMentira({
    etiquetas_conhecidas: [
      { etiqueta: "Black da Mentoria OM", chave: "black da mentoria om" },
      { etiqueta: "transferido", chave: "transferido" },
    ],
    "conversas:PATCH": [{ id: CONVERSA, cliente_id: OUSADIA, etiquetas: [] }],
    atendentes: [],
    atendimentos: [],
    crm_negocios: [],
  });
  try {
    await executarFerramenta("transferir_humano", { motivo: "quer falar com gente" }, {
      cliente: { id: OUSADIA },
      conversa: {
        id: CONVERSA, cliente_id: OUSADIA, contato: "5593999998888",
        etiquetas: ["Black da Mentoria OM"],
      },
      profissionais: [],
    });

    const [gravado] = corpos(chamadas, "conversas", "PATCH");
    assert.ok(
      gravado.etiquetas.includes("Black da Mentoria OM"),
      "aqui havia um toLowerCase() que recriava a etiqueta duplicada da campanha"
    );
    assert.ok(gravado.etiquetas.includes("transferido"), "e por ela que a equipe acha a conversa");
  } finally {
    soltar();
  }
});
