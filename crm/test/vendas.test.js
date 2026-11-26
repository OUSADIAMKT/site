// Vendas da HeroSpark: a leitura tolerante, o que cada status faz no funil,
// e a porta da rota.

import test from "node:test";
import assert from "node:assert/strict";

Object.assign(process.env, {
  SESSION_SECRET: "segredo-local-de-teste",
  SUPABASE_URL: "https://supabase.invalid",
  SUPABASE_SECRET_KEY: "chave-local-de-teste",
  VENDAS_CHAVE: "chave-de-vendas-de-teste",
});

const { bancoDeMentira } = await import("./bancoMemoria.js");
const { lerVenda, statusDa, processarVenda } = await import("../api/_vendas.js");
const { usarBanco } = await import("../api/_db.js");
const { default: rota } = await import("../api/vendas.js");

const EMP = "cli";

// ---------------------------------------------------------------------------
// Leitura

test("os nomes de status mais comuns caem no lugar certo", () => {
  for (const s of ["approved", "PAID", "purchase.approved", "Aprovada", "order_paid"]) assert.equal(statusDa(s), "aprovada", s);
  for (const s of ["refunded", "chargeback", "purchase.refunded", "Cancelada"]) assert.equal(statusDa(s), "reembolsada", s);
  for (const s of ["pending", "billet_printed", "aguardando_pagamento", "pix_gerado"]) assert.equal(statusDa(s), "pendente", s);
  assert.equal(statusDa("qualquer-coisa"), "desconhecido");
});

test("lê comprador, produto e valor sem confundir com o produtor", () => {
  const v = lerVenda({
    event: "sale_approved",
    sale: { id: "S-77", value: "497,00" },
    producer: { name: "Ousadia", email: "contato@ousadia.com" },
    customer: { name: "Ana Souza", email: "ANA@x.com", phone: "(11) 99999-0000" },
    product: { id: 9, name: "Momento UGC" },
  });
  assert.equal(v.status_venda, "aprovada");
  assert.equal(v.id_externo, "S-77");
  assert.equal(v.email, "ana@x.com");
  assert.equal(v.nome, "Ana Souza");
  assert.equal(v.telefone, "+5511999990000");
  assert.equal(v.produto_externo, "9");
  assert.equal(v.produto_nome, "Momento UGC");
  assert.equal(v.valor, 497);
});

// ---------------------------------------------------------------------------
// Processamento

function mundo(extra = {}) {
  return bancoDeMentira({
    clientes: [{ id: EMP, slug: "ousadia", ativo: true }],
    crm_funis: [{ id: "f", cliente_id: EMP, ativo: true, entrada_automatica: true, ordem: 0 }],
    crm_etapas: [
      { id: "e-novo", cliente_id: EMP, funil_id: "f", nome: "Novo lead", tipo: "aberta", ordem: 0 },
      { id: "e-ganho", cliente_id: EMP, funil_id: "f", nome: "Matriculado", tipo: "ganho", ordem: 4 },
      { id: "e-perdido", cliente_id: EMP, funil_id: "f", nome: "Perdido", tipo: "perdido", ordem: 5 },
    ],
    crm_produtos: [{ id: "p-ugc", cliente_id: EMP, nome: "Momento UGC", valor: 497, responsavel_id: "juh", herospark_ids: ["9"], funil_id: null }],
    crm_negocios: [], crm_notas: [], contatos: [], crm_historico: [], crm_automacoes: [],
    crm_tarefas: [], crm_negocio_produtos: [], vendas_eventos: [],
    ...extra,
  }, { unicos: { vendas_eventos: [["cliente_id", "fonte", "id_externo", "status_venda"]] } });
}

const evento = (sb, bruto) => {
  const ev = { id: `ev-${sb.tabelas.vendas_eventos.length + 1}`, cliente_id: EMP, fonte: "herospark", estado: "recebido", bruto };
  sb.tabelas.vendas_eventos.push(ev);
  return ev.id;
};

const aprovada = (extra = {}) => ({
  status: "approved", transaction: "T1",
  buyer: { name: "Ana", email: "ana@x.com", phone: "11999990000" },
  product: { id: 9, name: "Momento UGC" }, price: 497, ...extra,
});

test("venda aprovada leva o negócio aberto da pessoa para ganho, com o valor pago", async () => {
  const sb = mundo({
    crm_negocios: [{ id: "n1", cliente_id: EMP, funil_id: "f", etapa_id: "e-novo", situacao: "aberto",
      email: "ana@x.com", titulo: "Ana", etiquetas: ["veio do site"], valor: 0, criado_em: "2026-11-20" }],
  });
  const r = await processarVenda(sb, evento(sb, aprovada()));

  const n = sb.tabelas.crm_negocios.find((x) => x.id === "n1");
  assert.equal(r.estado, "processado");
  assert.equal(n.situacao, "ganho");
  assert.equal(n.valor_fechado, 497);
  assert.ok(n.etiquetas.includes("aluno") && n.etiquetas.includes("veio do site"));
  assert.equal(sb.tabelas.vendas_eventos[0].negocio_id, "n1");
  assert.match(sb.tabelas.crm_notas[0].texto, /Venda HeroSpark aprovada: Momento UGC, R\$ 497,00/);
});

test("venda de quem não estava no funil cria o negócio já ganho, com o dono do produto", async () => {
  const sb = mundo();
  await processarVenda(sb, evento(sb, aprovada()));
  const [n] = sb.tabelas.crm_negocios;
  assert.equal(n.situacao, "ganho");
  assert.equal(n.responsavel_id, "juh");
  assert.deepEqual(sb.tabelas.crm_negocio_produtos.map((p) => p.produto_id), ["p-ugc"]);
  assert.equal(sb.tabelas.contatos.length, 1, "com telefone, vira contato");
});

test("o mesmo evento reenviado não conta duas vezes", async () => {
  const sb = mundo();
  await processarVenda(sb, evento(sb, aprovada()));
  const r = await processarVenda(sb, evento(sb, aprovada()));
  assert.equal(r.repetido, true);
  assert.equal(sb.tabelas.crm_negocios.length, 1);
  assert.equal(sb.tabelas.vendas_eventos[1].estado, "ignorado");
});

test("reembolso leva para perdido o negócio que aquela venda ganhou", async () => {
  const sb = mundo();
  await processarVenda(sb, evento(sb, aprovada()));
  await processarVenda(sb, evento(sb, aprovada({ status: "refunded" })));
  const [n] = sb.tabelas.crm_negocios;
  assert.equal(n.situacao, "perdido");
  assert.equal(n.motivo_texto, "Reembolso na HeroSpark");
  assert.equal(n.valor_fechado, null, "receita estornada não conta");
});

test("pagamento pendente vira tarefa de recuperação para o dono", async () => {
  const sb = mundo({
    crm_negocios: [{ id: "n1", cliente_id: EMP, funil_id: "f", etapa_id: "e-novo", situacao: "aberto",
      email: "ana@x.com", titulo: "Ana", responsavel_id: "jackson", etiquetas: [], criado_em: "2026-11-20" }],
  });
  await processarVenda(sb, evento(sb, aprovada({ status: "billet_printed" })));
  assert.equal(sb.tabelas.crm_negocios[0].situacao, "aberto");
  const [t] = sb.tabelas.crm_tarefas;
  assert.equal(t.responsavel_id, "jackson");
  assert.match(t.titulo, /Recuperar pagamento pendente: Ana/);
});

test("evento que não dá para entender fica guardado como ignorado, sem mexer em nada", async () => {
  const sb = mundo();
  const r = await processarVenda(sb, evento(sb, { foo: "bar" }));
  assert.equal(r.estado, "ignorado");
  assert.equal(sb.tabelas.crm_negocios.length, 0);
  assert.deepEqual(sb.tabelas.vendas_eventos[0].bruto, { foo: "bar" }, "o bruto continua lá para reprocessar");
});

// ---------------------------------------------------------------------------
// A rota

function pedido({ metodo = "POST", query = {}, body } = {}) {
  const req = { method: metodo, query, body, headers: {} };
  const res = { code: 200, body: null, status(c) { this.code = c; return this; }, json(b) { this.body = b; return this; } };
  return { req, res };
}

test("sem a chave certa a rota não grava nada", async (t) => {
  const sb = mundo();
  usarBanco(sb);
  t.after(() => usarBanco(null));
  const { req, res } = pedido({ query: { fonte: "herospark", chave: "errada" }, body: aprovada() });
  await rota(req, res);
  assert.equal(res.code, 401);
  assert.equal(sb.tabelas.vendas_eventos.length, 0);
});

test("com a chave certa guarda o evento inteiro e põe na fila", async (t) => {
  const sb = mundo({ tarefas_sistema: [] });
  usarBanco(sb);
  t.after(() => usarBanco(null));
  const { req, res } = pedido({ query: { fonte: "herospark", chave: "chave-de-vendas-de-teste" }, body: JSON.stringify(aprovada()) });
  await rota(req, res);
  assert.equal(res.code, 200);
  assert.deepEqual(sb.tabelas.vendas_eventos[0].bruto, aprovada());
  assert.equal(sb.tabelas.tarefas_sistema[0].tipo, "processar-venda");
});
