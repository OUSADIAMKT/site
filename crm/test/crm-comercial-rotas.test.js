// As rotas do lado comercial: quem pode ler, quem pode mexer, e o que o
// servidor responde.
//
// O que este arquivo existe para impedir:
//
// 1. Uma empresa ver o CRM da outra. O recorte não pode sair da URL, tem que
//    sair da sessão. O teste manda o cliente errado na busca de propósito.
// 2. Atendente mudar automação ou os interruptores da IA. Isso muda o
//    comportamento da plataforma para a empresa inteira.
// 3. A tela de indicadores apresentar estimativa como receita. São dois
//    números diferentes e o painel tem que devolver os dois separados, mais a
//    contagem de ganhos sem valor registrado, senão receita baixa e cadastro
//    incompleto ficam parecidos.
// 4. O CRM mesclar duas pessoas por conta própria. Mesmo e-mail não é a mesma
//    pessoa: a rota aponta o grupo e não junta nada.

import test from "node:test";
import assert from "node:assert/strict";

import conversas from "../api/painel-conversas.js";
import { gerarToken } from "../api/_painel.js";

const EMPRESA_A = "11111111-2222-3333-4444-555555555555";
const EMPRESA_B = "99999999-8888-7777-6666-555555555555";
const RITA = "22222222-3333-4444-5555-666666666666";

Object.assign(process.env, {
  SESSION_SECRET: "segredo-local-de-teste",
  SUPABASE_URL: "https://supabase.invalid",
  SUPABASE_SECRET_KEY: "chave-local-de-teste",
});

/**
 * Banco dublado por tabela. Cada tabela é uma lista; a resposta é filtrada
 * apenas por `cliente_id`, que é justamente o que os testes querem observar.
 */
function mundo(tabelas = {}) {
  const saiu = [];

  const falso = async (url, opcoes = {}) => {
    const u = new URL(String(url));
    const metodo = opcoes.method || "GET";
    saiu.push({ caminho: u.pathname, busca: u.search, metodo, corpo: opcoes.body });

    if (u.host !== "supabase.invalid") throw new Error(`saiu do mundo dublado: ${u.host}`);

    if (u.pathname === "/rest/v1/atendentes" && /[?&]id=eq\./.test(u.search)) {
      return Response.json([{
        id: RITA, nome: "Rita", cliente_id: EMPRESA_A, papel: "atendente",
        ativo: true, disponivel: true, assuntos: ["suporte"], versao_sessao: 1,
        clientes: { ativo: true, modulos: {} },
      }]);
    }

    const tabela = u.pathname.replace("/rest/v1/", "");
    const linhas = tabelas[tabela] || [];
    const dono = u.search.match(/cliente_id=eq\.([^&]+)/)?.[1];
    const recortadas = dono ? linhas.filter((l) => l.cliente_id === dono) : linhas;

    // `.single()` e `.maybeSingle()` pedem um objeto, não uma lista: o
    // PostgREST responde assim quando o Accept é `vnd.pgrst.object`. Sem isto
    // o dublê devolve lista onde o código espera linha, e o teste passa a
    // medir o dublê em vez do código.
    const aceita = String(opcoes.headers?.Accept || opcoes.headers?.accept || "");
    if (aceita.includes("vnd.pgrst.object")) {
      return recortadas.length
        ? Response.json(recortadas[0])
        : new Response(null, { status: 204 });
    }
    return Response.json(recortadas);
  };

  return { saiu, falso };
}

async function pedir(dublado, { metodo = "GET", query = {}, body, token }) {
  const req = { method: metodo, query, headers: { authorization: `Bearer ${token}` }, body };
  const res = {
    status(c) { this.code = c; return this; },
    json(b) { this.body = b; return this; },
  };
  const original = globalThis.fetch;
  globalThis.fetch = dublado.falso;
  try {
    await conversas(req, res);
  } finally {
    globalThis.fetch = original;
  }
  return res;
}

const comoAtendente = () => gerarToken({ tipo: "atendente", atendente: RITA, cliente: EMPRESA_A });
const comoOperador = () => gerarToken({ tipo: "operador" });

// --------------------------------------------------------------------------
// 1. Isolamento entre empresas
// --------------------------------------------------------------------------

test("atendente pedindo o CRM de outra empresa leva 403", async () => {
  const res = await pedir(mundo(), {
    query: { rota: "crm", cliente: EMPRESA_B },
    token: comoAtendente(),
  });
  assert.equal(res.code, 403);
});

test("atendente lendo o CRM sem dizer o cliente usa o da sessão", async () => {
  const m = mundo({
    crm_negocios: [
      { id: "n1", cliente_id: EMPRESA_A, situacao: "aberto", titulo: "da empresa A" },
      { id: "n2", cliente_id: EMPRESA_B, situacao: "aberto", titulo: "da empresa B" },
    ],
  });
  const res = await pedir(m, { query: { rota: "crm" }, token: comoAtendente() });
  assert.equal(res.code, 200);
  const ids = (res.body.negocios || []).map((n) => n.id);
  assert.deepEqual(ids, ["n1"]);
  // E o recorte tem que ter ido para o banco, não ter sido feito na memória.
  const leu = m.saiu.find((c) => c.caminho === "/rest/v1/crm_negocios");
  assert.match(leu.busca, new RegExp(`cliente_id=eq\\.${EMPRESA_A}`));
});

test("operador sem cliente nenhum leva 403 em vez de ver tudo", async () => {
  const res = await pedir(mundo(), { query: { rota: "crm" }, token: comoOperador() });
  assert.equal(res.code, 403);
});

test("operador com o cliente na busca entra", async () => {
  const res = await pedir(mundo({ crm_negocios: [] }), {
    query: { rota: "crm", cliente: EMPRESA_B },
    token: comoOperador(),
  });
  assert.equal(res.code, 200);
});

// --------------------------------------------------------------------------
// 2. A porteira da configuração
// --------------------------------------------------------------------------

test("atendente não salva automação", async () => {
  const res = await pedir(mundo(), {
    metodo: "POST",
    query: { rota: "crm" },
    body: { acao: "salvar-automacao", dados: { nome: "qualquer", gatilho: "negocio_novo", acoes: [] } },
    token: comoAtendente(),
  });
  assert.equal(res.code, 403);
  assert.match(res.body.error, /administrador/i);
});

test("atendente não mexe nos interruptores da IA", async () => {
  const res = await pedir(mundo(), {
    metodo: "POST",
    query: { rota: "crm" },
    body: { acao: "salvar-ia", dados: { mover_etapa: true } },
    token: comoAtendente(),
  });
  assert.equal(res.code, 403);
});

test("atendente cria anotação, que é trabalho do dia", async () => {
  const m = mundo({
    crm_negocios: [{ id: "n1", cliente_id: EMPRESA_A, situacao: "aberto" }],
    crm_notas: [{ id: "nota-1", cliente_id: EMPRESA_A, texto: "falei com ela" }],
  });
  const res = await pedir(m, {
    metodo: "POST",
    query: { rota: "crm" },
    body: { acao: "criar-nota", dados: { negocio_id: "n1", texto: "falei com ela" } },
    token: comoAtendente(),
  });
  assert.equal(res.code, 200);
  const gravou = m.saiu.find((c) => c.caminho === "/rest/v1/crm_notas" && c.metodo === "POST");
  assert.ok(gravou, "a anotação tinha que ter ido para o banco");
  assert.match(String(gravou.corpo), new RegExp(EMPRESA_A));
});

test("anotação em negócio de outra empresa é recusada", async () => {
  const m = mundo({
    crm_negocios: [{ id: "n9", cliente_id: EMPRESA_B, situacao: "aberto" }],
  });
  const res = await pedir(m, {
    metodo: "POST",
    query: { rota: "crm" },
    body: { acao: "criar-nota", dados: { negocio_id: "n9", texto: "nem deveria achar" } },
    token: comoAtendente(),
  });
  assert.equal(res.code, 400);
  assert.match(res.body.error, /não encontrado/i);
  assert.ok(!m.saiu.some((c) => c.caminho === "/rest/v1/crm_notas" && c.metodo === "POST"));
});

// --------------------------------------------------------------------------
// 3. Receita registrada contra valor em negociação
// --------------------------------------------------------------------------

test("indicadores separam receita de estimativa e contam ganho sem valor", async () => {
  const agora = new Date().toISOString();
  const m = mundo({
    crm_negocios: [
      { id: "a", cliente_id: EMPRESA_A, situacao: "aberto", valor: 1000, valor_fechado: null, criado_em: agora },
      { id: "b", cliente_id: EMPRESA_A, situacao: "aberto", valor: 500, valor_fechado: null, criado_em: agora },
      { id: "c", cliente_id: EMPRESA_A, situacao: "ganho", valor: 900, valor_fechado: 800, criado_em: agora, fechado_em: agora },
      { id: "d", cliente_id: EMPRESA_A, situacao: "ganho", valor: 700, valor_fechado: null, criado_em: agora, fechado_em: agora },
      { id: "e", cliente_id: EMPRESA_A, situacao: "perdido", valor: 300, valor_fechado: null, criado_em: agora, fechado_em: agora },
    ],
  });
  const res = await pedir(m, {
    query: { rota: "crm", ver: "indicadores" },
    token: comoAtendente(),
  });
  assert.equal(res.code, 200);
  const i = res.body;
  // Receita é só o que foi registrado como fechado: 800. O 700 do negócio "d"
  // foi ganho sem valor e NÃO entra; ele aparece na contagem à parte.
  assert.equal(i.receita, 800);
  assert.equal(i.ganhos_sem_valor, 1);
  // Em negociação é a soma dos abertos, e isso é estimativa, não receita.
  assert.equal(i.em_negociacao, 1500);
  assert.equal(i.ganhos, 2);
  assert.equal(i.perdidos, 1);
  // Dois ganhos e um perdido: 66.7% de conversão.
  assert.equal(i.conversao, 66.7);
  // Ticket médio divide pelos ganhos COM valor, não por todos os ganhos.
  assert.equal(i.ticket_medio, 800);
});

test("indicadores de uma empresa sem negócio não inventam número", async () => {
  const res = await pedir(mundo({ crm_negocios: [] }), {
    query: { rota: "crm", ver: "indicadores" },
    token: comoAtendente(),
  });
  assert.equal(res.body.receita, 0);
  assert.equal(res.body.conversao, null);
  assert.equal(res.body.ticket_medio, null);
  assert.equal(res.body.dias_para_fechar, null);
});

// --------------------------------------------------------------------------
// 4. Duplicados: apontar, nunca mesclar
// --------------------------------------------------------------------------

test("duplicados agrupam por documento e por e-mail, sem juntar ninguém", async () => {
  const m = mundo({
    contatos: [
      { id: "c1", cliente_id: EMPRESA_A, nome: "Ana", telefone_e164: "+5593900000001", email: "casa@ex.com", documento: "111" },
      { id: "c2", cliente_id: EMPRESA_A, nome: "Bia", telefone_e164: "+5593900000002", email: "CASA@ex.com", documento: null },
      { id: "c3", cliente_id: EMPRESA_A, nome: "Ana Maria", telefone_e164: "+5593900000003", email: null, documento: "111" },
      { id: "c4", cliente_id: EMPRESA_A, nome: "Sozinha", telefone_e164: "+5593900000004", email: "so@ex.com", documento: "222" },
      { id: "c5", cliente_id: EMPRESA_B, nome: "Outra empresa", telefone_e164: "+5593900000005", email: "casa@ex.com", documento: "111" },
    ],
  });
  const res = await pedir(m, {
    query: { rota: "contatos", ver: "duplicados", cliente: EMPRESA_A },
    token: comoOperador(),
  });
  assert.equal(res.code, 200);
  const grupos = res.body.grupos;
  assert.equal(grupos.length, 2, "um grupo por documento e um por e-mail");

  const porDoc = grupos.find((g) => g.tipo === "documento");
  assert.deepEqual(porDoc.contatos.map((c) => c.id).sort(), ["c1", "c3"]);

  const porEmail = grupos.find((g) => g.tipo === "email");
  // O e-mail casa sem olhar caixa alta.
  assert.deepEqual(porEmail.contatos.map((c) => c.id).sort(), ["c1", "c2"]);

  // Quem está só não aparece, e a empresa B nunca entra no grupo da A.
  const todos = grupos.flatMap((g) => g.contatos.map((c) => c.id));
  assert.ok(!todos.includes("c4"));
  assert.ok(!todos.includes("c5"));

  // E nada foi gravado: a rota é leitura.
  assert.ok(!m.saiu.some((c) => c.metodo !== "GET" && c.caminho === "/rest/v1/contatos"));
});

test("atendente não entra na base de contatos da empresa", async () => {
  const res = await pedir(mundo({ contatos: [] }), {
    query: { rota: "contatos" },
    token: comoAtendente(),
  });
  assert.equal(res.code, 403);
});

// --------------------------------------------------------------------------
// 5. Limite de dias na etapa
// --------------------------------------------------------------------------

test("limite de dias da etapa vai para o banco, e lixo vira nulo", async () => {
  const m = mundo({
    crm_funis: [{ id: "f1", cliente_id: EMPRESA_A, nome: "Vendas", entrada_automatica: false }],
    crm_etapas: [],
    crm_negocios: [],
  });
  const res = await pedir(m, {
    metodo: "POST",
    query: { rota: "crm", cliente: EMPRESA_A },
    body: {
      acao: "salvar-funil",
      dados: {
        id: "f1",
        nome: "Vendas",
        etapas: [
          { nome: "Novo", cor: "#437EE5", tipo: "aberta", limite_dias: "7" },
          { nome: "Proposta", cor: "#437EE5", tipo: "aberta", limite_dias: "" },
          { nome: "Enrolado", cor: "#437EE5", tipo: "aberta", limite_dias: "0" },
          { nome: "Ganho", cor: "#437EE5", tipo: "ganho", limite_dias: "abacaxi" },
        ],
      },
    },
    token: comoOperador(),
  });
  assert.equal(res.code, 200);

  const gravadas = m.saiu
    .filter((c) => c.caminho === "/rest/v1/crm_etapas" && c.metodo === "POST")
    .map((c) => JSON.parse(c.corpo));
  assert.equal(gravadas.length, 4);
  assert.equal(gravadas[0].limite_dias, 7);
  assert.equal(gravadas[1].limite_dias, null, "etapa sem limite não atrasa ninguém");
  assert.equal(gravadas[2].limite_dias, null, "zero não é limite, o banco recusaria");
  assert.equal(gravadas[3].limite_dias, null, "texto que não é número vira nulo");
});
