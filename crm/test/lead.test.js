// A porta dos formulários do site: o que entra, o que é barrado e o que vira
// no CRM. É a única rota pública que grava sem sessão, então os porteiros
// têm teste próprio.

import test from "node:test";
import assert from "node:assert/strict";

Object.assign(process.env, {
  SESSION_SECRET: "segredo-local-de-teste",
  SUPABASE_URL: "https://supabase.invalid",
  SUPABASE_SECRET_KEY: "chave-local-de-teste",
  ORIGENS_DO_SITE: "https://ousadiamarketing.com.br",
});

const { lerLead, slugDaOrigem, chaveDaOrigem, registrarLead, QUEM } = await import("../api/_lead.js");
const { default: handler } = await import("../api/lead.js");

const { bancoDeMentira } = await import("./bancoMemoria.js");

const OUSADIA = "cli-ousadia";

function mundo(extra = {}) {
  return bancoDeMentira({
    clientes: [{ id: OUSADIA, slug: "ousadia", ativo: true }],
    crm_funis: [
      { id: "f-agencia", cliente_id: OUSADIA, ativo: true, entrada_automatica: false, ordem: 1 },
      { id: "f-alunos", cliente_id: OUSADIA, ativo: true, entrada_automatica: true, ordem: 0 },
    ],
    crm_etapas: [
      { id: "e-novo", cliente_id: OUSADIA, funil_id: "f-alunos", nome: "Novo lead", tipo: "aberta", ordem: 0 },
      { id: "e-ganho", cliente_id: OUSADIA, funil_id: "f-alunos", nome: "Matriculado", tipo: "ganho", ordem: 4 },
    ],
    crm_origens: [
      { id: "o-site", cliente_id: OUSADIA, chave: "veio do site" },
      { id: "o-diag", cliente_id: OUSADIA, chave: "diagnostico" },
    ],
    crm_negocios: [], crm_notas: [], contatos: [], crm_historico: [], crm_automacoes: [],
    crm_produtos: [], crm_tarefas: [], crm_negocio_produtos: [],
    ...extra,
  });
}

// ---------------------------------------------------------------------------
// Leitura do que o site manda

test("o lead lê os nomes de campo que os formulários do site usam", () => {
  const l = lerLead({
    origem: "Diagnóstico IA",
    dados: { nome: "Ana Souza", whatsapp: "(11) 99999-0000", email: "ANA@exemplo.com", profissao: "designer" },
    utms: { utm_source: "instagram", lixo: "x" },
  });
  assert.equal(l.origem, "diagnostico-ia");
  assert.equal(l.nome, "Ana Souza");
  assert.equal(l.email, "ana@exemplo.com");
  assert.equal(l.telefone, "+5511999990000");
  assert.deepEqual(l.utms, { utm_source: "instagram" });
  assert.equal(l.dados.profissao, "designer");
});

test("sem e-mail válido nem telefone não existe lead", () => {
  assert.equal(lerLead({ dados: { nome: "Só nome" } }), null);
  assert.equal(lerLead({ dados: { email: "nao-e-email" } }), null);
  assert.ok(lerLead({ dados: { email: "x@y.com" } }));
});

test("cada formulário cai na origem certa do CRM", () => {
  assert.equal(chaveDaOrigem(slugDaOrigem("diagnostico")), "diagnostico");
  assert.equal(chaveDaOrigem(slugDaOrigem("momento-ugc")), "diagnostico");
  assert.equal(chaveDaOrigem(slugDaOrigem("newsletter")), "newsletter");
  assert.equal(chaveDaOrigem(slugDaOrigem("contato")), "veio do site");
});

// ---------------------------------------------------------------------------
// O que vira no CRM

test("lead novo vira negócio no funil de entrada, com origem, contato e nota", async () => {
  const sb = mundo();
  const lead = lerLead({ origem: "diagnostico", dados: { nome: "Ana", whatsapp: "11999990000", email: "ana@x.com" } });

  const r = await registrarLead(sb, "ousadia", lead);

  assert.equal(r.novo, true);
  const [n] = sb.tabelas.crm_negocios;
  assert.equal(n.funil_id, "f-alunos", "o funil de entrada automática, não o primeiro da lista");
  assert.equal(n.etapa_id, "e-novo");
  assert.equal(n.origem_id, "o-diag");
  assert.equal(n.titulo, "Ana");
  assert.equal(n.criado_por, QUEM);
  assert.ok(n.etiquetas.includes("veio do site"));

  assert.equal(sb.tabelas.contatos.length, 1, "com telefone, nasce o contato");
  assert.equal(sb.tabelas.contatos[0].telefone_e164, "+5511999990000");

  const [nota] = sb.tabelas.crm_notas;
  assert.equal(nota.negocio_id, n.id);
  assert.match(nota.texto, /Formulário do site: diagnostico/);
  assert.match(nota.texto, /email: ana@x\.com/);
});

test("quem preenche de novo ganha nota, não negócio duplicado", async () => {
  const sb = mundo();
  const lead = lerLead({ origem: "contato", dados: { nome: "Ana", email: "ana@x.com" } });

  await registrarLead(sb, "ousadia", lead);
  const r = await registrarLead(sb, "ousadia", lead);

  assert.equal(r.novo, false);
  assert.equal(sb.tabelas.crm_negocios.length, 1);
  assert.equal(sb.tabelas.crm_notas.length, 2);
});

test("lead só com e-mail entra sem contato (contato exige telefone)", async () => {
  const sb = mundo();
  await registrarLead(sb, "ousadia", lerLead({ origem: "newsletter", dados: { email: "x@y.com" } }));
  assert.equal(sb.tabelas.crm_negocios.length, 1);
  assert.equal(sb.tabelas.contatos.length, 0);
  assert.equal(sb.tabelas.crm_negocios[0].titulo, "x@y.com");
});

// ---------------------------------------------------------------------------
// Os porteiros da rota

function pedido({ metodo = "POST", origin = "https://ousadiamarketing.com.br", corpo, ip = "1.1.1.1" } = {}) {
  const req = { method: metodo, headers: { "x-forwarded-for": ip }, body: corpo };
  if (origin) req.headers.origin = origin;
  const res = {
    code: 200, headers: {}, body: null,
    setHeader(k, v) { this.headers[k.toLowerCase()] = v; },
    status(c) { this.code = c; return this; },
    json(b) { this.body = b; return this; },
    end() { return this; },
  };
  return { req, res };
}

test("origem que não é o site da Ousadia é recusada", async () => {
  const { req, res } = pedido({ origin: "https://outro-site.com", corpo: "{}" });
  await handler(req, res);
  assert.equal(res.code, 403);
});

test("preflight do site recebe as permissões de CORS", async () => {
  const { req, res } = pedido({ metodo: "OPTIONS" });
  await handler(req, res);
  assert.equal(res.code, 204);
  assert.equal(res.headers["access-control-allow-origin"], "https://ousadiamarketing.com.br");
});

test("isca preenchida responde ok e não grava nada", async () => {
  // Sem banco configurado de verdade: se a rota tentasse gravar, daria 500.
  const { req, res } = pedido({ corpo: JSON.stringify({ origem: "contato", dados: { email: "a@b.com", _gotcha: "x" } }), ip: "2.2.2.2" });
  await handler(req, res);
  assert.equal(res.code, 200);
  assert.deepEqual(res.body, { ok: true });
});

test("corpo sem como falar com a pessoa é 400", async () => {
  const { req, res } = pedido({ corpo: JSON.stringify({ dados: { nome: "x" } }), ip: "3.3.3.3" });
  await handler(req, res);
  assert.equal(res.code, 400);
});

test("rajada do mesmo IP é freada", async () => {
  let ultimo;
  for (let i = 0; i < 12; i++) {
    const { req, res } = pedido({ corpo: JSON.stringify({ dados: { nome: "x" } }), ip: "4.4.4.4" });
    await handler(req, res);
    ultimo = res.code;
  }
  assert.equal(ultimo, 429);
});

// ---------------------------------------------------------------------------
// O dono do produto

test("formulário de um produto: o lead nasce com o produto, o dono e a tarefa de primeiro contato", async () => {
  const sb = mundo({
    crm_produtos: [{ id: "p-ugc", cliente_id: OUSADIA, ativo: true, nome: "Momento UGC", valor: 197,
      responsavel_id: "juh", formularios: ["momento-ugc"], funil_id: null }],
  });
  const lead = lerLead({ origem: "momento-ugc", dados: { nome: "Bia", whatsapp: "11988887777" } });

  const r = await registrarLead(sb, "ousadia", lead);

  const [n] = sb.tabelas.crm_negocios;
  assert.equal(r.responsavel_id, "juh");
  assert.equal(n.responsavel_id, "juh");
  assert.equal(n.funil_id, "f-alunos");
  assert.deepEqual(sb.tabelas.crm_negocio_produtos.map((p) => p.produto_id), ["p-ugc"]);
  const [tarefa] = sb.tabelas.crm_tarefas;
  assert.equal(tarefa.responsavel_id, "juh");
  assert.match(tarefa.titulo, /Primeiro contato: Bia \(Momento UGC\)/);
});

test("formulário da agência vai para o funil da agência", async () => {
  const sb = mundo({
    crm_produtos: [{ id: "p-ag", cliente_id: OUSADIA, ativo: true, nome: "Agência", valor: 0,
      responsavel_id: null, formularios: ["agencia"], funil_id: "f-agencia" }],
  });
  sb.tabelas.crm_etapas.push({ id: "e-ag", cliente_id: OUSADIA, funil_id: "f-agencia", nome: "Novo contato", tipo: "aberta", ordem: 0 });

  await registrarLead(sb, "ousadia", lerLead({ origem: "agência", dados: { email: "dono@empresa.com" } }));

  assert.equal(sb.tabelas.crm_negocios[0].funil_id, "f-agencia");
  assert.equal(sb.tabelas.crm_tarefas.length, 0, "sem dono, sem tarefa");
});
