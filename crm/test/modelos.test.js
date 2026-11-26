// Os modelos aprovados, dentro da conversa.
//
// O que este arquivo existe para impedir: mandar modelo com o número errado de
// parâmetros. A Meta responde 132000 e NÃO entrega, sem dizer qual é o
// problema, e no painel isso aparece como mensagem que sumiu. Já aconteceu no
// disparo, com os 297 contatos da empresa, e a correção lá foi contar os
// campos lendo o corpo aprovado em vez de confiar no que a tela mandou. Aqui a
// regra é a mesma, e a tela nem sabe quantos campos existem.

import test from "node:test";
import assert from "node:assert/strict";

import fila from "../api/painel-fila.js";
import { gerarToken } from "../api/_painel.js";
import { lerModelo, preencherModelo } from "../api/_wa.js";

const CLIENTE = "11111111-2222-3333-4444-555555555555";
const CONVERSA = "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee";
const LIA = "33333333-4444-5555-6666-777777777777";

Object.assign(process.env, {
  SESSION_SECRET: "segredo-local-de-teste",
  SUPABASE_URL: "https://supabase.invalid",
  SUPABASE_SECRET_KEY: "chave-local-de-teste",
});

/** Dois modelos aprovados: um com campo, um sem. Como a Meta devolve. */
const DA_META = [
  {
    name: "om_lia_abertura", status: "APPROVED", language: "pt_BR", category: "MARKETING",
    components: [{ type: "BODY", text: "Olá, {{1}}! Me chamo Lia." }],
  },
  {
    name: "om_geral_continuar", status: "APPROVED", language: "pt_BR", category: "UTILITY",
    components: [
      { type: "BODY", text: "Quando puder continuar, mande um Oi." },
      { type: "FOOTER", text: "Responda SAIR para não receber mais." },
      { type: "BUTTONS", buttons: [{ type: "URL", text: "Quero saber mais", url: "https://exemplo.invalid/l" }] },
    ],
  },
  {
    name: "om_pausado", status: "PAUSED", language: "pt_BR", category: "MARKETING",
    components: [{ type: "BODY", text: "Não deveria aparecer." }],
  },
  {
    name: "om_com_imagem", status: "APPROVED", language: "pt_BR", category: "MARKETING",
    components: [
      { type: "HEADER", format: "IMAGE" },
      { type: "BODY", text: "Olha a foto." },
    ],
  },
];

function mundo({ conversa = {}, meta = DA_META, metaFalha = null } = {}) {
  const saiu = [];
  const conv = {
    id: CONVERSA, cliente_id: CLIENTE, modo: "humano", atendente_id: LIA,
    canal: "whatsapp", contato: "5593999999999", telefone: "5593999999999",
    etiquetas: [], ...conversa,
  };

  const falso = async (url, opcoes = {}) => {
    const u = new URL(String(url));
    const metodo = opcoes.method || "GET";
    saiu.push({ host: u.host, caminho: u.pathname, metodo, corpo: opcoes.body });

    if (u.host === "graph.facebook.com") {
      if (u.pathname.endsWith("/message_templates")) {
        if (metaFalha) return new Response(JSON.stringify({ error: { message: metaFalha } }), { status: 400 });
        return Response.json({ data: meta });
      }
      if (u.pathname.endsWith("/messages")) {
        return Response.json({ messages: [{ id: "wamid.teste" }] });
      }
      return Response.json({});
    }
    if (u.host !== "supabase.invalid") throw new Error(`saiu do mundo dublado: ${u.host}`);

    if (u.pathname === "/rest/v1/atendentes") {
      if (/[?&]id=eq\./.test(u.search)) {
        return Response.json([{
          id: LIA, nome: "Lia", cliente_id: CLIENTE, papel: "atendente", ativo: true,
          disponivel: true, assuntos: ["matricula"], versao_sessao: 1,
          clientes: { ativo: true, modulos: {} },
        }]);
      }
      return Response.json([{ id: LIA, nome: "Lia", disponivel: true, assuntos: ["matricula"] }]);
    }
    if (u.pathname === "/rest/v1/conversas") return Response.json([conv]);
    if (u.pathname === "/rest/v1/canais") return Response.json([]);
    if (u.pathname === "/rest/v1/clientes") {
      return Response.json([{
        id: CLIENTE, ativo: true, modulos: {},
        wa_phone_number_id: "111", wa_token: "token-de-teste", wa_conta_id: "222",
      }]);
    }
    if (u.pathname === "/rest/v1/mensagens") return Response.json([{ id: "m1" }]);
    return Response.json([]);
  };

  return { saiu, falso, conversa: conv };
}

async function pedir(m, { metodo = "GET", query = {}, body } = {}) {
  const token = gerarToken({ tipo: "atendente", atendente: LIA, cliente: CLIENTE });
  const req = { method: metodo, query, headers: { authorization: `Bearer ${token}` }, body };
  const res = {
    status(c) { this.code = c; return this; },
    json(b) { this.body = b; return this; },
  };
  const original = globalThis.fetch;
  globalThis.fetch = m.falso;
  try {
    await fila(req, res);
  } finally {
    globalThis.fetch = original;
  }
  return res;
}

// --------------------------------------------------------------------------
// A leitura do modelo, sem rede.

test("o campo é contado pelo maior número, não pela quantidade de aparições", () => {
  const m = lerModelo({
    name: "x", language: "pt_BR",
    components: [{ type: "BODY", text: "Oi {{1}}, tudo bem {{1}}? Sobre {{2}}." }],
  });
  // Três aparições, dois campos. Contar aparição mandaria três parâmetros e a
  // Meta recusaria a mensagem inteira.
  assert.equal(m.campos, 2);
});

test("modelo sem campo nenhum não pede nada", () => {
  const m = lerModelo(DA_META[1]);
  assert.equal(m.campos, 0);
  assert.equal(m.rodape, "Responda SAIR para não receber mais.");
  assert.deepEqual(m.botoes, [{ tipo: "URL", texto: "Quero saber mais", url: "https://exemplo.invalid/l" }]);
});

test("cabeçalho de imagem é marcado, porque não sai por aqui", () => {
  assert.equal(lerModelo(DA_META[3]).cabecalho_de_midia, true);
  assert.equal(lerModelo(DA_META[0]).cabecalho_de_midia, false);
});

test("a prévia deixa o campo em branco visível como campo", () => {
  assert.equal(preencherModelo("Olá, {{1}}!", ["Marina"]), "Olá, Marina!");
  assert.equal(preencherModelo("Olá, {{1}}!", []), "Olá, {{1}}!");
  assert.equal(preencherModelo("Olá, {{1}}!", ["   "]), "Olá, {{1}}!");
});

// --------------------------------------------------------------------------
// A rota que a tela chama.

test("a lista só traz o que a Meta aprovou", async () => {
  const m = mundo();
  const res = await pedir(m, { query: { rota: "modelos", conversa: CONVERSA } });
  assert.equal(res.code, 200);
  const nomes = res.body.modelos.map((x) => x.nome);
  assert.ok(!nomes.includes("om_pausado"), "modelo pausado não pode aparecer");
  // Em ordem alfabética, que é como a tela mostra.
  assert.deepEqual(nomes, ["om_com_imagem", "om_geral_continuar", "om_lia_abertura"]);
});

test("Meta fora do ar devolve lista vazia com o motivo escrito, não erro 500", async () => {
  const m = mundo({ metaFalha: "rate limit" });
  const res = await pedir(m, { query: { rota: "modelos", conversa: CONVERSA } });
  assert.equal(res.code, 200);
  assert.deepEqual(res.body.modelos, []);
  assert.match(res.body.aviso, /rate limit/);
});

// --------------------------------------------------------------------------
// O envio.

test("modelo com campo preenchido sai, e fica no histórico com o texto lido", async () => {
  const m = mundo();
  const res = await pedir(m, {
    metodo: "POST",
    body: { acao: "modelo", conversa_id: CONVERSA, modelo: "om_lia_abertura", campos: ["Marina"] },
  });
  assert.equal(res.code, 200);
  assert.equal(res.body.enviado, "Olá, Marina! Me chamo Lia.");

  const envio = m.saiu.find((x) => x.host === "graph.facebook.com" && x.caminho.endsWith("/messages"));
  const corpo = JSON.parse(envio.corpo);
  assert.equal(corpo.type, "template");
  assert.equal(corpo.template.name, "om_lia_abertura");
  assert.deepEqual(corpo.template.components[0].parameters, [{ type: "text", text: "Marina" }]);

  const gravou = m.saiu.find((x) => x.caminho === "/rest/v1/mensagens" && x.metodo === "POST");
  assert.ok(gravou, "a mensagem enviada tem que ficar no histórico");
  assert.match(JSON.parse(gravou.corpo).conteudo[0].text, /Olá, Marina! Me chamo Lia\./);
});

test("campo em branco não sai, e a Meta nem é chamada para enviar", async () => {
  const m = mundo();
  const res = await pedir(m, {
    metodo: "POST",
    body: { acao: "modelo", conversa_id: CONVERSA, modelo: "om_lia_abertura", campos: ["   "] },
  });
  assert.equal(res.code, 400);
  assert.match(res.body.error, /campo/);
  assert.ok(
    !m.saiu.some((x) => x.caminho.endsWith("/messages")),
    "não pode tentar enviar com campo vazio",
  );
});

test("campo a mais é cortado pelo que o corpo aprovado pede", async () => {
  const m = mundo();
  const res = await pedir(m, {
    metodo: "POST",
    body: {
      acao: "modelo", conversa_id: CONVERSA, modelo: "om_geral_continuar",
      campos: ["sobra", "mais sobra"],
    },
  });
  assert.equal(res.code, 200);
  const corpo = JSON.parse(m.saiu.find((x) => x.caminho.endsWith("/messages")).corpo);
  assert.equal(corpo.template.components, undefined, "modelo sem campo não leva parâmetro");
});

test("modelo que não está na lista da Meta é recusado", async () => {
  const m = mundo();
  const res = await pedir(m, {
    metodo: "POST",
    body: { acao: "modelo", conversa_id: CONVERSA, modelo: "om_inventado", campos: [] },
  });
  assert.equal(res.code, 404);
  assert.ok(!m.saiu.some((x) => x.caminho.endsWith("/messages")));
});

test("modelo com imagem no cabeçalho é recusado com o motivo", async () => {
  const m = mundo();
  const res = await pedir(m, {
    metodo: "POST",
    body: { acao: "modelo", conversa_id: CONVERSA, modelo: "om_com_imagem", campos: [] },
  });
  assert.equal(res.code, 409);
  assert.match(res.body.error, /cabeçalho/i);
});

test("conversa que está com a IA não aceita modelo", async () => {
  const m = mundo({ conversa: { modo: "ia", atendente_id: null } });
  const res = await pedir(m, {
    metodo: "POST",
    body: { acao: "modelo", conversa_id: CONVERSA, modelo: "om_lia_abertura", campos: ["Marina"] },
  });
  assert.equal(res.code, 409);
  assert.match(res.body.error, /atendimento humano/);
});

test("conversa de outra pessoa não aceita modelo", async () => {
  const m = mundo({ conversa: { atendente_id: "99999999-9999-9999-9999-999999999999" } });
  const res = await pedir(m, {
    metodo: "POST",
    body: { acao: "modelo", conversa_id: CONVERSA, modelo: "om_lia_abertura", campos: ["Marina"] },
  });
  assert.equal(res.code, 403);
});

test("no Instagram não existe modelo, e a recusa explica isso", async () => {
  const m = mundo({ conversa: { canal: "instagram" } });
  const res = await pedir(m, {
    metodo: "POST",
    body: { acao: "modelo", conversa_id: CONVERSA, modelo: "om_lia_abertura", campos: ["Marina"] },
  });
  assert.equal(res.code, 409);
  assert.match(res.body.error, /Instagram/);
});
