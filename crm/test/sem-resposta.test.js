// A bolinha de mensagem sem resposta.
//
// O que este arquivo existe para impedir:
//
// 1. Conversa respondida e conversa esperando terem a mesma cara. Foi o que
//    fez a equipe da empresa perder atendimento: a lista mostrava as duas
//    iguais, e quem atendia escolhia pelo que lembrava.
//
// 2. A contagem sumir quando o banco engasga. A tela tem que continuar
//    abrindo, só que sem a bolinha. Lista sem bolinha serve; lista que não
//    abre, não.
//
// 3. O cartão parado afundar no quadro justamente por estar parado. A ordem
//    por "mais recente" empurra para baixo quem ninguém responde.

import test from "node:test";
import assert from "node:assert/strict";

import { montarQuadro } from "../api/_quadro.js";
import { lerSemResposta, comSemResposta, SEM_NADA } from "../api/_semResposta.js";
import { frasePendente, numeroDaBolinha, faz } from "../src/semResposta.js";

const MINUTO = 60000;
const atras = (min) => new Date(Date.now() - min * MINUTO).toISOString();

Object.assign(process.env, {
  SUPABASE_URL: "https://supabase.invalid",
  SUPABASE_SECRET_KEY: "chave-local-de-teste",
});

// --------------------------------------------------------------------------
// As frases, que são o que a pessoa realmente lê.

test("uma mensagem sozinha não vira plural", () => {
  assert.match(frasePendente({ sem_resposta: 1 }), /^1 mensagem sem resposta/);
});

test("mais de uma vira plural e diz desde quando", () => {
  const frase = frasePendente({ sem_resposta: 4, sem_resposta_desde: atras(30) });
  assert.match(frase, /^4 mensagens sem resposta, a primeira há 30 min$/);
});

test("conversa respondida não tem frase nenhuma", () => {
  assert.equal(frasePendente({ sem_resposta: 0 }), "");
  assert.equal(frasePendente(null), "");
});

test("acima de cem a bolinha para de contar", () => {
  assert.equal(numeroDaBolinha(7), "7");
  assert.equal(numeroDaBolinha(99), "99");
  assert.equal(numeroDaBolinha(140), "99+");
});

test("o relógio fala em minutos, horas e dias", () => {
  assert.equal(faz(atras(0)), "agora");
  assert.equal(faz(atras(45)), "45 min");
  assert.equal(faz(atras(180)), "3 h");
  assert.equal(faz(atras(60 * 72)), "3 d");
  assert.equal(faz(null), "");
});

// --------------------------------------------------------------------------
// A leitura no banco.

/** Troca o fetch por um que responde o que a RPC responderia. */
function comBanco(resposta) {
  const bateu = [];
  const original = globalThis.fetch;
  globalThis.fetch = async (url, op = {}) => {
    bateu.push({ caminho: new URL(String(url)).pathname, corpo: op.body });
    return resposta();
  };
  return { bateu, devolver: () => { globalThis.fetch = original; } };
}

test("a contagem sai de uma chamada só, para todas as conversas", async () => {
  const banco = comBanco(() => Response.json([
    { conversa_id: "c1", sem_resposta: 3, desde: atras(40), respondida_em: atras(90), respondida_por: "ia" },
    { conversa_id: "c2", sem_resposta: 0, desde: null, respondida_em: atras(5), respondida_por: "atendente" },
  ]));
  try {
    const mapa = await lerSemResposta(["c1", "c2", "c1"]);
    assert.equal(banco.bateu.length, 1, "uma conversa a mais não pode virar uma consulta a mais");
    assert.match(banco.bateu[0].caminho, /sem_resposta_das_conversas$/);
    // O id repetido não vai duas vezes para o banco.
    assert.deepEqual(JSON.parse(banco.bateu[0].corpo).ids, ["c1", "c2"]);
    assert.equal(mapa.get("c1").sem_resposta, 3);
    assert.equal(mapa.get("c1").respondida_por, "ia");
    assert.equal(mapa.get("c2").sem_resposta, 0);
  } finally {
    banco.devolver();
  }
});

test("sem conversa nenhuma, não chega a bater no banco", async () => {
  const banco = comBanco(() => { throw new Error("não podia ter consultado"); });
  try {
    assert.equal((await lerSemResposta([])).size, 0);
    assert.equal((await lerSemResposta([null, undefined])).size, 0);
    assert.equal(banco.bateu.length, 0);
  } finally {
    banco.devolver();
  }
});

test("banco fora do ar tira a bolinha, não a tela", async () => {
  const banco = comBanco(() => new Response(JSON.stringify({ message: "pane" }), { status: 500 }));
  try {
    const mapa = await lerSemResposta(["c1"]);
    assert.equal(mapa.size, 0, "falha devolve mapa vazio, não exceção");
  } finally {
    banco.devolver();
  }
});

test("quem não veio do banco fica zerado, não indefinido", () => {
  const mapa = new Map([["c1", { sem_resposta: 2, sem_resposta_desde: atras(10) }]]);
  const lista = comSemResposta([{ id: "c1" }, { id: "c9" }], mapa);
  assert.equal(lista[0].sem_resposta, 2);
  assert.equal(lista[1].sem_resposta, 0);
  assert.equal(lista[1].respondida_por, null);
  assert.deepEqual(Object.keys(SEM_NADA).sort(),
    ["respondida_em", "respondida_por", "sem_resposta", "sem_resposta_desde"]);
});

// --------------------------------------------------------------------------
// O quadro.

function conversa(id, modo, extras = {}) {
  return {
    id, modo, canal: "whatsapp", contato: "5593999990000", nome_contato: `Pessoa ${id}`,
    ultima_em: atras(10), assumida_em: atras(10), fila_desde: atras(10), etiquetas: [], ...extras,
  };
}

test("o cartão carrega quantas mensagens estão sem resposta", () => {
  const quadro = montarQuadro({
    conversas: [conversa("c1", "humano")],
    sem_resposta: [{ conversa_id: "c1", sem_resposta: 5, desde: atras(20), respondida_por: "ia" }],
  }, new Date());

  assert.equal(quadro.atendendo[0].sem_resposta, 5);
  assert.equal(quadro.atendendo[0].respondida_por, "ia");
});

test("cartão sem pendência vem zerado, nunca indefinido", () => {
  const quadro = montarQuadro({ conversas: [conversa("c1", "humano")] }, new Date());
  assert.equal(quadro.atendendo[0].sem_resposta, 0);
});

test("em atendimento, quem está sem resposta sobe na frente", () => {
  // `velha` foi assumida primeiro, e por isso encabeçaria a coluna pela regra
  // antiga. `parada` tem gente falando sozinha e passa na frente.
  const quadro = montarQuadro({
    conversas: [
      conversa("velha", "humano", { assumida_em: atras(300) }),
      conversa("parada", "humano", { assumida_em: atras(5) }),
    ],
    sem_resposta: [{ conversa_id: "parada", sem_resposta: 2, desde: atras(25) }],
  }, new Date());

  assert.deepEqual(quadro.atendendo.map((c) => c.id), ["parada", "velha"]);
});

test("entre dois parados, encabeça quem espera há mais tempo", () => {
  const quadro = montarQuadro({
    conversas: [conversa("recente", "humano"), conversa("antiga", "humano")],
    sem_resposta: [
      { conversa_id: "recente", sem_resposta: 9, desde: atras(3) },
      { conversa_id: "antiga", sem_resposta: 1, desde: atras(400) },
    ],
  }, new Date());

  assert.deepEqual(quadro.atendendo.map((c) => c.id), ["antiga", "recente"],
    "quem espera mais vem primeiro, mesmo mandando menos mensagem");
});

test("na fila a ordem continua sendo quem chegou antes", () => {
  // A coluna da fila já é a fila: mexer na ordem dela por pendência faria
  // alguém furar fila por ter mandado mais mensagem.
  const quadro = montarQuadro({
    conversas: [
      conversa("primeira", "fila", { fila_desde: atras(90) }),
      conversa("segunda", "fila", { fila_desde: atras(10) }),
    ],
    sem_resposta: [{ conversa_id: "segunda", sem_resposta: 8, desde: atras(9) }],
  }, new Date());

  assert.deepEqual(quadro.precisa.map((c) => c.id), ["primeira", "segunda"]);
});

// --------------------------------------------------------------------------
// O filtro "só sem resposta".

import { passaNoFiltro, FILTRO_VAZIO, algumFiltro } from "../src/filtros.js";

test("o filtro de parados deixa passar só quem está esperando resposta", () => {
  const f = { ...FILTRO_VAZIO, parados: true };
  assert.equal(passaNoFiltro({ sem_resposta: 2 }, f), true);
  assert.equal(passaNoFiltro({ sem_resposta: 0 }, f), false);
  assert.equal(passaNoFiltro({}, f), false, "conversa sem o campo não é 'sem resposta'");
});

test("desligado, o filtro de parados não esconde ninguém", () => {
  assert.equal(passaNoFiltro({ sem_resposta: 0 }, FILTRO_VAZIO), true);
  assert.equal(algumFiltro(FILTRO_VAZIO), false, "o filtro vazio não pode nascer ligado");
  assert.equal(algumFiltro({ ...FILTRO_VAZIO, parados: true }), true, "ligado, o botão Limpar precisa aparecer");
});
