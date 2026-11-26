// Encerrar a conversa, devolver para a IA, e o prazo de inatividade.
//
// O que este arquivo existe para impedir:
//
// 1. Encerrar e devolver virarem a mesma linha no relatório. São duas coisas
//    diferentes ditas por quem atendeu: "resolvi" e "não é comigo". O efeito
//    no WhatsApp é o mesmo (a IA volta a responder), e por isso é fácil
//    gravar os dois igual e perder a única informação que não dá para
//    reconstruir depois.
//
// 2. O webhook roubar a conversa de quem acabou de assumir. A regra de
//    inatividade olhava só `ultima_em`: abrir uma conversa de semana passada,
//    assumir, a cliente responder, e o robô responder por cima da atendente.

import test from "node:test";
import assert from "node:assert/strict";

import { soltarSeInativa, INATIVIDADE_MIN } from "../api/_fila.js";

const MINUTO = 60000;
const atras = (min) => new Date(Date.now() - min * MINUTO).toISOString();

test("o prazo de inatividade é de doze horas", () => {
  // Não é decoração: uma hora devolvia conversa no meio de um almoço, e duas
  // devolveram uma cliente que já tinha mandado o código do pedido.
  assert.equal(INATIVIDADE_MIN, 720);
});

test("conversa parada há mais de doze horas volta para a IA", async () => {
  const bateu = [];
  const original = globalThis.fetch;
  globalThis.fetch = async (url, op = {}) => {
    bateu.push({ caminho: new URL(String(url)).pathname, metodo: op.method });
    return Response.json([{ id: "c1" }]);
  };
  Object.assign(process.env, {
    SUPABASE_URL: "https://supabase.invalid", SUPABASE_SECRET_KEY: "chave-local-de-teste",
  });
  try {
    const foi = await soltarSeInativa({
      id: "c1", modo: "humano", ultima_em: atras(800), assumida_em: atras(790),
    });
    assert.equal(foi, true);
    // Solta a conversa e fecha o atendimento, nessa ordem.
    assert.ok(bateu.some((c) => c.caminho === "/rest/v1/conversas" && c.metodo === "PATCH"));
    assert.ok(bateu.some((c) => c.caminho === "/rest/v1/atendimentos"));
  } finally {
    globalThis.fetch = original;
  }
});

test("conversa velha que alguém acabou de assumir NÃO volta para a IA", async () => {
  // O caso que o webhook quebrava: a última mensagem é de semana passada, mas
  // a atendente assumiu agora. Quem manda é o mais recente dos dois.
  const original = globalThis.fetch;
  globalThis.fetch = async () => { throw new Error("não podia ter soltado nada"); };
  try {
    const foi = await soltarSeInativa({
      id: "c1", modo: "humano", ultima_em: atras(10000), assumida_em: atras(2),
    });
    assert.equal(foi, false);
  } finally {
    globalThis.fetch = original;
  }
});

test("conversa que está com a IA não é solta de novo", async () => {
  const original = globalThis.fetch;
  globalThis.fetch = async () => { throw new Error("não podia ter tocado no banco"); };
  try {
    assert.equal(await soltarSeInativa({ id: "c1", modo: "ia", ultima_em: atras(9000) }), false);
  } finally {
    globalThis.fetch = original;
  }
});

test("parada por três horas continua com quem assumiu", async () => {
  const original = globalThis.fetch;
  globalThis.fetch = async () => { throw new Error("não podia ter soltado nada"); };
  try {
    const foi = await soltarSeInativa({
      id: "c1", modo: "humano", ultima_em: atras(180), assumida_em: atras(180),
    });
    assert.equal(
      foi, false,
      "três horas de silêncio é uma cliente pensando no preço, não uma conversa esquecida"
    );
  } finally {
    globalThis.fetch = original;
  }
});

// --------------------------------------------------------------------------
// Encerrar e devolver, pela porta que a tela usa.

import fila from "../api/painel-fila.js";
import { gerarToken } from "../api/_painel.js";

const CLIENTE = "11111111-2222-3333-4444-555555555555";
const CONVERSA = "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee";
const LIA = "33333333-4444-5555-6666-777777777777";

process.env.SESSION_SECRET = "segredo-local-de-teste";

function mundoDaConversa() {
  const bateu = [];
  const falso = async (url, op = {}) => {
    const u = new URL(String(url));
    bateu.push({ caminho: u.pathname, metodo: op.method || "GET", corpo: op.body });
    if (u.pathname === "/rest/v1/atendentes" && /[?&]id=eq\./.test(u.search)) {
      return Response.json([{
        id: LIA, nome: "Lia", cliente_id: CLIENTE, papel: "atendente", ativo: true,
        disponivel: true, assuntos: ["matricula"], versao_sessao: 1,
        clientes: { ativo: true, modulos: {} },
      }]);
    }
    if (u.pathname === "/rest/v1/conversas") {
      return Response.json([{
        id: CONVERSA, cliente_id: CLIENTE, modo: "humano", atendente_id: LIA,
        canal: "whatsapp", contato: "5593999999999", telefone: "5593999999999", etiquetas: [],
      }]);
    }
    return Response.json([]);
  };
  return { bateu, falso };
}

async function encerrarPelaTela(m, corpo) {
  const req = {
    method: "POST",
    query: {},
    headers: { authorization: `Bearer ${gerarToken({ tipo: "atendente", atendente: LIA, cliente: CLIENTE })}` },
    body: { acao: "encerrar", conversa_id: CONVERSA, ...corpo },
  };
  const res = { status(c) { this.code = c; return this; }, json(b) { this.body = b; return this; } };
  const original = globalThis.fetch;
  globalThis.fetch = m.falso;
  try {
    await fila(req, res);
  } finally {
    globalThis.fetch = original;
  }
  return res;
}

/** O desfecho que foi gravado no atendimento aberto. */
function desfechoGravado(m) {
  const escrita = m.bateu.find((c) => c.caminho === "/rest/v1/atendimentos" && c.metodo === "PATCH");
  return escrita ? JSON.parse(escrita.corpo).desfecho : null;
}

test("encerrar grava encerrado", async () => {
  const m = mundoDaConversa();
  const res = await encerrarPelaTela(m, {});
  assert.equal(res.code, 200);
  assert.equal(desfechoGravado(m), "encerrado");
});

test("devolver para a IA grava outro desfecho, não o mesmo de encerrar", async () => {
  const m = mundoDaConversa();
  const res = await encerrarPelaTela(m, { desfecho: "devolvido_ia" });
  assert.equal(res.code, 200);
  assert.equal(desfechoGravado(m), "devolvido_ia");
});

test("desfecho inventado pela tela cai em encerrado, não entra cru no banco", async () => {
  const m = mundoDaConversa();
  await encerrarPelaTela(m, { desfecho: "qualquer coisa" });
  assert.equal(desfechoGravado(m), "encerrado");
});

test("devolver para a IA não é confundido com devolver para a fila", async () => {
  // "devolvido" já é o desfecho de quem manda de volta para a fila. Se os dois
  // dividissem a palavra, o relatório contaria conversa devolvida ao robô como
  // conversa devolvida para outro atendente.
  const m = mundoDaConversa();
  await encerrarPelaTela(m, { desfecho: "devolvido_ia" });
  assert.notEqual(desfechoGravado(m), "devolvido");
});
