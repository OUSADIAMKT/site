// O que a migração 040 garante no banco.
//
// A 040 é pequena de propósito: uma coluna de foto no contato, uma tabela de
// preferência de cartão por pessoa e um índice. O que estes testes prendem é
// justamente o que uma migração pequena costuma errar:
//
// 1. Rodar duas vezes. Ninguém reexecuta uma migração de propósito, e todo
//    mundo reexecuta uma por engano.
// 2. A chave ser por PESSOA e não por empresa. Se fosse por empresa, a Lia
//    escolher o cartão dela mudaria o cartão da Rita, que é o oposto do que a
//    tela promete.
// 3. A tabela nova nascer com RLS ligada e sem política, como o resto do
//    CRM Ousadia: ninguém entra pelo cliente anônimo.
// 4. A reversão devolver o banco ao formato de antes, sem levar negócio,
//    contato ou etapa com ela.

import test from "node:test";
import assert from "node:assert/strict";

import { bancoComercial, aplicar040, reverter040, duasEmpresas, tentar } from "./banco.js";

// ---------------------------------------------------------------------------
// A migração em si

test("a 040 roda duas vezes seguidas sem quebrar", async () => {
  const pg = await bancoComercial({ ate: "040" });
  try {
    const e = await duasEmpresas(pg);
    await pg.query(
      "insert into crm_quadro_campos (cliente_id, quem, campos) values ($1, $2, '{\"valor\": false}')",
      [e.empresa_a, e.ana]);

    await aplicar040(pg); // segunda vez

    const { rows } = await pg.query(
      "select campos from crm_quadro_campos where cliente_id = $1 and quem = $2",
      [e.empresa_a, e.ana]);
    assert.equal(rows.length, 1, "a segunda execução não pode apagar a escolha de ninguém");
    assert.equal(rows[0].campos.valor, false);
  } finally { await pg.close(); }
});

test("a 040 não perde dado que já existia", async () => {
  // Contato e negócio gravados ANTES continuam inteiros depois, e o contato
  // ganha a coluna de foto vazia, que é o estado normal: o WhatsApp não
  // entrega foto de perfil.
  const pg = await bancoComercial({ ate: "037" });
  try {
    const e = await duasEmpresas(pg);
    const { rows: [c] } = await pg.query(
      "insert into contatos (cliente_id, nome) values ($1, 'Marina') returning id", [e.empresa_a]);

    await aplicar040(pg);

    const { rows } = await pg.query(
      "select nome, foto_url from contatos where id = $1", [c.id]);
    assert.equal(rows[0].nome, "Marina");
    assert.equal(rows[0].foto_url, null, "foto nasce vazia, e vazia é o normal");
  } finally { await pg.close(); }
});

test("a reversão da 040 devolve o banco ao formato anterior", async () => {
  const pg = await bancoComercial({ ate: "040" });
  try {
    const e = await duasEmpresas(pg);
    const { rows: [c] } = await pg.query(
      "insert into contatos (cliente_id, nome) values ($1, 'Eliane') returning id", [e.empresa_a]);

    await reverter040(pg);

    const falta = await tentar(pg, "select 1 from crm_quadro_campos");
    assert.ok(falta.erro, "a tabela de preferência tinha que ter ido embora");
    const semFoto = await tentar(pg, "select foto_url from contatos");
    assert.ok(semFoto.erro, "a coluna de foto tinha que ter ido embora");

    // E o que não é da 040 continua lá.
    const { rows } = await pg.query("select nome from contatos where id = $1", [c.id]);
    assert.equal(rows[0].nome, "Eliane", "a reversão não pode levar contato com ela");
  } finally { await pg.close(); }
});

// ---------------------------------------------------------------------------
// A preferência é de cada pessoa

test("duas pessoas da mesma empresa têm cartões diferentes", async () => {
  const pg = await bancoComercial({ ate: "040" });
  try {
    const e = await duasEmpresas(pg);
    await pg.query(
      `insert into crm_quadro_campos (cliente_id, quem, campos) values
         ($1, $2, '{"valor": true}'), ($1, $3, '{"valor": false}')`,
      [e.empresa_a, e.ana, e.bia]);

    const { rows } = await pg.query(
      "select quem, campos from crm_quadro_campos where cliente_id = $1 order by quem", [e.empresa_a]);
    assert.equal(rows.length, 2);
    const porQuem = Object.fromEntries(rows.map((r) => [r.quem, r.campos.valor]));
    assert.equal(porQuem[e.ana], true);
    assert.equal(porQuem[e.bia], false);
  } finally { await pg.close(); }
});

test("a mesma pessoa não tem duas linhas na mesma empresa", async () => {
  // Duas linhas seriam duas verdades sobre o mesmo cartão, e o servidor leria
  // uma delas ao acaso.
  const pg = await bancoComercial({ ate: "040" });
  try {
    const e = await duasEmpresas(pg);
    await pg.query(
      "insert into crm_quadro_campos (cliente_id, quem, campos) values ($1, $2, '{}')",
      [e.empresa_a, e.ana]);
    const r = await tentar(pg,
      "insert into crm_quadro_campos (cliente_id, quem, campos) values ($1, $2, '{}')",
      [e.empresa_a, e.ana]);
    assert.ok(r.erro, "a chave primária tinha que recusar a segunda linha");
  } finally { await pg.close(); }
});

test("o gestor da plataforma cabe na mesma tabela, sem linha em atendentes", async () => {
  // `quem` é texto e não uuid com chave estrangeira justamente por isto: o
  // gestor entra como 'operador' e seria o único sem cartão próprio.
  const pg = await bancoComercial({ ate: "040" });
  try {
    const e = await duasEmpresas(pg);
    const r = await tentar(pg,
      "insert into crm_quadro_campos (cliente_id, quem, campos) values ($1, 'operador', '{\"score\": false}')",
      [e.empresa_a]);
    assert.ok(r.ok, "o gestor tem que poder guardar a escolha dele");
  } finally { await pg.close(); }
});

test("campos só aceita objeto", async () => {
  // Uma lista ou um número no lugar do objeto fariam a tela quebrar na
  // leitura, longe de onde o dado entrou errado.
  const pg = await bancoComercial({ ate: "040" });
  try {
    const e = await duasEmpresas(pg);
    for (const ruim of ["[]", "7", '"valor"', "null"]) {
      const r = await tentar(pg,
        `insert into crm_quadro_campos (cliente_id, quem, campos) values ($1, 'operador', '${ruim}')`,
        [e.empresa_a]);
      assert.ok(r.erro, `${ruim} tinha que ser recusado`);
    }
  } finally { await pg.close(); }
});

test("apagar a empresa leva a preferência junto", async () => {
  const pg = await bancoComercial({ ate: "040" });
  try {
    const e = await duasEmpresas(pg);
    await pg.query(
      "insert into crm_quadro_campos (cliente_id, quem, campos) values ($1, 'operador', '{}')",
      [e.empresa_a]);
    await pg.query("delete from clientes where id = $1", [e.empresa_a]);
    const { rows } = await pg.query(
      "select count(*)::int as n from crm_quadro_campos where cliente_id = $1", [e.empresa_a]);
    assert.equal(rows[0].n, 0);
  } finally { await pg.close(); }
});

// ---------------------------------------------------------------------------
// Segurança e desempenho

test("crm_quadro_campos nasce com RLS ligada e sem política", async () => {
  const pg = await bancoComercial({ ate: "040" });
  try {
    const { rows } = await pg.query(`
      select c.relrowsecurity as rls,
             (select count(*)::int from pg_policy p where p.polrelid = c.oid) as politicas
        from pg_class c join pg_namespace n on n.oid = c.relnamespace
       where n.nspname = 'public' and c.relname = 'crm_quadro_campos'`);
    assert.equal(rows.length, 1, "a tabela não existe");
    assert.equal(rows[0].rls, true, "está sem RLS");
    assert.equal(rows[0].politicas, 0, "ganhou política: o acesso é só pelo servidor");
  } finally { await pg.close(); }
});

test("o filtro de período tem índice", async () => {
  // "Entraram nos últimos 7 dias" sem índice varre a tabela inteira do
  // cliente a cada abertura do quadro.
  const pg = await bancoComercial({ ate: "040" });
  try {
    const { rows } = await pg.query(
      "select indexname from pg_indexes where schemaname = 'public' and tablename = 'crm_negocios'");
    const nomes = rows.map((r) => r.indexname);
    assert.ok(nomes.includes("crm_negocios_criado"), `faltou crm_negocios_criado em ${nomes.join(", ")}`);
  } finally { await pg.close(); }
});
