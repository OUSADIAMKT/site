// Passar a conversa de uma atendente para outra.
//
// O que este arquivo existe para impedir: a tela da conversa monta o botão
// "passar para" a partir da lista de colegas, e se a lista vier vazia o botão
// simplesmente não aparece. Foi o que aconteceu com a sessão de operador, que
// é a do gestor: a rota da equipe exigia o cliente na busca, a tela não
// mandava, e o gestor via só "devolver para a IA" numa conversa que ele mesmo
// tinha assumido. Nenhum erro na tela, nenhum erro no log, só um botão que não
// existia.

import test from "node:test";
import assert from "node:assert/strict";

import fila from "../api/painel-fila.js";
import { gerarToken } from "../api/_painel.js";

const CLIENTE = "11111111-2222-3333-4444-555555555555";
const CONVERSA = "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee";
const RITA = "22222222-3333-4444-5555-666666666666";
const LIA = "33333333-4444-5555-6666-777777777777";

function ambiente() {
  Object.assign(process.env, {
    SESSION_SECRET: "segredo-local-de-teste",
    SUPABASE_URL: "https://supabase.invalid",
    SUPABASE_SECRET_KEY: "chave-local-de-teste",
  });
}

const EQUIPE = [
  { id: LIA, nome: "Lia", disponivel: false, assuntos: ["matricula"] },
  { id: RITA, nome: "Rita", disponivel: true, assuntos: ["suporte"] },
];

/** Banco dublado: a equipe, a conversa e a sessão de atendente. */
function mundo({ conversa = {} } = {}) {
  const saiu = [];
  const conv = {
    id: CONVERSA, cliente_id: CLIENTE, modo: "humano", atendente_id: RITA,
    canal: "whatsapp", contato: "5593999999999", telefone: "5593999999999",
    etiquetas: [],
    ...conversa,
  };

  const falso = async (url, opcoes = {}) => {
    const u = new URL(String(url));
    const metodo = opcoes.method || "GET";
    saiu.push({ host: u.host, caminho: u.pathname, busca: u.search, metodo, opcoes });

    if (u.host !== "supabase.invalid") {
      throw new Error(`requisição para fora do mundo dublado: ${u.host}`);
    }

    if (u.pathname === "/rest/v1/atendentes") {
      if (metodo !== "GET") return Response.json([]);
      // A leitura da sessão pede o atendente por id e vem com `clientes`
      // dentro; a leitura da equipe pede a lista do cliente. O que separa as
      // duas é o filtro de id na busca, e ele tem que ser casado com cuidado:
      // `cliente_id=eq.` contém `id=eq.` dentro, e um `includes` solto faz a
      // lista da equipe voltar como se fosse uma sessão.
      if (/[?&]id=eq\./.test(u.search)) {
        const quem = u.search.includes(LIA) ? EQUIPE[0] : EQUIPE[1];
        return Response.json([{
          ...quem, cliente_id: CLIENTE, papel: "atendente", ativo: true,
          versao_sessao: 1, clientes: { ativo: true, modulos: {} },
        }]);
      }
      return Response.json(EQUIPE);
    }
    if (u.pathname === "/rest/v1/conversas") return Response.json([conv]);
    if (u.pathname === "/rest/v1/atendimentos") return Response.json([{ id: "atendimento-novo" }]);
    return Response.json([]);
  };

  return { saiu, falso };
}

function pedir({ metodo = "GET", query = {}, body = undefined, token }) {
  const req = {
    method: metodo,
    query,
    headers: { authorization: `Bearer ${token}` },
    body,
  };
  const res = {
    status(c) { this.code = c; return this; },
    json(b) { this.body = b; return this; },
  };
  return fila(req, res).then(() => res);
}

async function com(dublado, corpo) {
  const original = globalThis.fetch;
  globalThis.fetch = dublado.falso;
  try {
    return await corpo();
  } finally {
    globalThis.fetch = original;
  }
}

const comoGestor = () => gerarToken({ tipo: "operador" });
const comoRita = () => gerarToken({ tipo: "atendente", atendente: RITA, cliente: CLIENTE });

// ---------------------------------------------------------------------------
// A lista de colegas

test("o gestor recebe a equipe pedindo pela conversa, sem dizer o cliente", async () => {
  // Este é o caso que estava quebrado. A sessão de operador vale para todos os
  // clientes, então ela não carrega um cliente; a tela da conversa só conhece
  // a conversa. Sem este caminho o gestor nunca vê a lista, e sem a lista não
  // há botão de passar.
  ambiente();
  const m = mundo();
  const res = await com(m, () => pedir({
    query: { rota: "equipe", conversa: CONVERSA }, token: comoGestor(),
  }));

  assert.equal(res.code, 200, res.body?.error);
  assert.deepEqual(res.body.atendentes.map((a) => a.nome), ["Lia", "Rita"]);
});

test("a atendente recebe a equipe do cliente dela mesmo sem passar a conversa", async () => {
  ambiente();
  const m = mundo();
  const res = await com(m, () => pedir({ query: { rota: "equipe" }, token: comoRita() }));

  assert.equal(res.code, 200, res.body?.error);
  assert.deepEqual(res.body.atendentes.map((a) => a.nome), ["Lia", "Rita"]);
  assert.equal(res.body.sessao.atendente, RITA, "a tela precisa saber quem ela é");
});

test("a conversa de outro cliente não entrega a equipe de ninguém", async () => {
  ambiente();
  const m = mundo({ conversa: { cliente_id: "outro-cliente-qualquer" } });
  const res = await com(m, () => pedir({
    query: { rota: "equipe", conversa: CONVERSA }, token: comoRita(),
  }));

  assert.equal(res.code, 403);
});

test("pedir a equipe não mexe na fila", async () => {
  // `soltarInativas` devolve para a IA toda conversa humana parada: é escrita,
  // e não tem nada a ver com montar uma lista de nomes. A rota da equipe sai
  // antes dela de propósito.
  ambiente();
  const m = mundo();
  await com(m, () => pedir({ query: { rota: "equipe", conversa: CONVERSA }, token: comoGestor() }));

  const escritas = m.saiu.filter((c) => c.metodo !== "GET");
  assert.deepEqual(escritas, [], "a rota da equipe só lê");
});

// ---------------------------------------------------------------------------
// A passagem em si

test("a atendente que está com a conversa passa para a colega", async () => {
  ambiente();
  const m = mundo();
  const res = await com(m, () => pedir({
    metodo: "POST", token: comoRita(),
    body: { acao: "passar", conversa_id: CONVERSA, para_atendente_id: LIA, motivo: "é de matrícula" },
  }));

  assert.equal(res.code, 200, res.body?.error);
  assert.equal(res.body.atendente.nome, "Lia");
});

test("colega ausente ainda recebe a conversa", async () => {
  // Lia está marcada como indisponível. Isso tira ela da distribuição
  // automática da fila, e não tem que impedir uma passagem feita à mão: quem
  // passa sabe para quem está passando.
  ambiente();
  const m = mundo();
  const res = await com(m, () => pedir({
    metodo: "POST", token: comoGestor(),
    body: { acao: "passar", conversa_id: CONVERSA, para_atendente_id: LIA },
  }));

  assert.equal(res.code, 200, res.body?.error);
});

test("a atendente não tira a conversa da mão da colega", async () => {
  ambiente();
  const m = mundo({ conversa: { atendente_id: LIA } });
  const res = await com(m, () => pedir({
    metodo: "POST", token: comoRita(),
    body: { acao: "passar", conversa_id: CONVERSA, para_atendente_id: RITA },
  }));

  assert.equal(res.code, 403);
  assert.match(res.body.error, /não está com você/i);
});

test("o gestor passa uma conversa que não está na mão dele", async () => {
  // O gestor assume a conversa e o `atendente_id` fica nulo: quem está com ela
  // é a sessão de operador, que não é um atendente cadastrado. Passar daqui
  // tem que funcionar, senão a conversa fica presa com o gestor.
  ambiente();
  const m = mundo({ conversa: { atendente_id: null } });
  const res = await com(m, () => pedir({
    metodo: "POST", token: comoGestor(),
    body: { acao: "passar", conversa_id: CONVERSA, para_atendente_id: RITA },
  }));

  assert.equal(res.code, 200, res.body?.error);
  assert.equal(res.body.atendente.nome, "Rita");
});
