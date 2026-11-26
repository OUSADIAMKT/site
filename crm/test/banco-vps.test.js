// Os cinco arquivos de banco/, na ordem do README, num Postgres de verdade
// novo e vazio (PGlite). É o que vai rodar na VPS, então é isto que precisa
// passar: se o esquema parar no meio, o CRM não sobe.

import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import { pgcrypto } from "@electric-sql/pglite/contrib/pgcrypto";
import { uuid_ossp } from "@electric-sql/pglite/contrib/uuid_ossp";

const arquivo = (nome) => readFileSync(new URL(`../banco/${nome}`, import.meta.url), "utf8");

async function bancoNovo() {
  const pg = new PGlite({ extensions: { pgcrypto, uuid_ossp } });
  await pg.exec(arquivo("00-base.sql"));
  await pg.exec(arquivo("01-esquema.sql"));
  await pg.exec(arquivo("02-ousadia.sql"));
  await pg.exec(arquivo("03-permissoes.sql"));
  await pg.exec(arquivo("04-semente-ousadia.sql"));
  return pg;
}

const um = async (pg, sql, params) => (await pg.query(sql, params)).rows[0];

test("o banco sobe inteiro, do zero, e sem e-commerce", async () => {
  const pg = await bancoNovo();
  try {
    const { n } = await um(pg, `select count(*)::int as n from pg_tables where schemaname = 'public'`);
    const novas = (arquivo("02-ousadia.sql").match(/create table if not exists/gi) || []).length;
    assert.equal(n, 54 + novas, "58 da origem menos pedidos, lojas e as duas de pesquisa, mais as da Ousadia");

    const sobra = await um(pg, `select count(*)::int as n from pg_tables
      where schemaname = 'public' and tablename in ('pedidos', 'lojas')`);
    assert.equal(sobra.n, 0);

    const semRls = await um(pg, `select count(*)::int as n from pg_class c
      join pg_namespace s on s.oid = c.relnamespace
      where s.nspname = 'public' and c.relkind = 'r' and not c.relrowsecurity`);
    assert.equal(semRls.n, 0, "toda tabela com RLS ligada");
  } finally {
    await pg.close();
  }
});

test("só o service_role enxerga as tabelas; o anon não vê nada", async () => {
  const pg = await bancoNovo();
  try {
    await pg.exec("set role service_role");
    const { n } = await um(pg, "select count(*)::int as n from clientes");
    assert.equal(n, 1);
    await pg.exec("reset role");

    await pg.exec("set role anon");
    // Nem enxerga o esquema: "não existe" é ainda menos do que "sem permissão".
    await assert.rejects(pg.query("select * from clientes"), /permission denied|does not exist/);
    await pg.exec("reset role");
  } finally {
    await pg.close();
  }
});

test("a semente cria a Ousadia com os funis, etiquetas e frentes da escola", async () => {
  const pg = await bancoNovo();
  try {
    const cli = await um(pg, "select id, fuso, ia_pausada from clientes where slug = 'ousadia'");
    assert.equal(cli.fuso, "America/Sao_Paulo");
    assert.equal(cli.ia_pausada, true, "a IA nasce desligada até ter número e persona revisada");

    const funis = (await pg.query(
      "select nome, entrada_automatica from crm_funis where cliente_id = $1 order by ordem", [cli.id])).rows;
    assert.deepEqual(funis, [
      { nome: "Alunos", entrada_automatica: true },
      { nome: "Agência", entrada_automatica: false },
    ]);

    const etapas = (await pg.query(`select e.nome, e.tipo from crm_etapas e
      join crm_funis f on f.id = e.funil_id where f.nome = 'Alunos' order by e.ordem`)).rows;
    assert.deepEqual(etapas.map((e) => e.nome),
      ["Novo lead", "Aquecendo", "Diagnóstico", "Conversa comercial", "Matriculado", "Perdido"]);

    const assuntos = (await pg.query(`select etiqueta from etiquetas_conhecidas
      where cliente_id = $1 and familia = 'assunto' order by etiqueta`, [cli.id])).rows.map((r) => r.etiqueta);
    assert.deepEqual(assuntos, ["agencia", "matricula", "suporte"],
      "as mesmas três do api/_assunto.js");

    const frentes = (await pg.query("select nome, assuntos from frentes where cliente_id = $1 order by nome", [cli.id])).rows;
    assert.equal(frentes.length, 3);

    const nada = await um(pg, `select
      (select count(*) from conversas) + (select count(*) from contatos)
      + (select count(*) from crm_negocios) + (select count(*) from atendentes) as n`);
    assert.equal(Number(nada.n), 0, "nenhuma pessoa, nenhum contato, nenhuma conversa");
  } finally {
    await pg.close();
  }
});

test("rodar a semente de novo não duplica nada", async () => {
  const pg = await bancoNovo();
  try {
    const contar = async () => um(pg, `select
      (select count(*) from clientes)::int as c, (select count(*) from crm_funis)::int as f,
      (select count(*) from crm_etapas)::int as e, (select count(*) from crm_origens)::int as o,
      (select count(*) from crm_motivos)::int as m, (select count(*) from crm_produtos)::int as p,
      (select count(*) from etiquetas_conhecidas)::int as t, (select count(*) from frentes)::int as fr`);
    const antes = await contar();
    await pg.exec(arquivo("04-semente-ousadia.sql"));
    await pg.exec(arquivo("03-permissoes.sql"));
    assert.deepEqual(await contar(), antes);
  } finally {
    await pg.close();
  }
});

test("pegar_tarefas entrega cada tarefa uma vez e devolve a que travou", async () => {
  const pg = await bancoNovo();
  try {
    await pg.exec(`insert into tarefas_sistema (tipo, chave) values ('a', 'k1'), ('b', 'k2'), ('c', 'k3');
      insert into tarefas_sistema (tipo, executar_em) values ('futura', now() + interval '1 hour');`);

    const primeira = (await pg.query("select * from pegar_tarefas(2)")).rows;
    const segunda = (await pg.query("select * from pegar_tarefas(10)")).rows;
    assert.equal(primeira.length, 2);
    assert.equal(segunda.length, 1, "a futura não entra, e as já pegas não voltam");
    const ids = [...primeira, ...segunda].map((t) => t.id);
    assert.equal(new Set(ids).size, 3);
    assert.ok([...primeira, ...segunda].every((t) => t.estado === "rodando" && t.tentativas === 1));

    // Processo morreu no meio: "rodando" há 11 minutos volta para a fila.
    await pg.query("update tarefas_sistema set pego_em = now() - interval '11 minutes' where id = $1", [ids[0]]);
    const resgatada = (await pg.query("select * from pegar_tarefas(10)")).rows;
    assert.deepEqual(resgatada.map((t) => t.id), [ids[0]]);
    assert.equal(resgatada[0].tentativas, 2);

    // A chave recusa duplicata: é o que torna as periódicas idempotentes.
    await assert.rejects(pg.query("insert into tarefas_sistema (tipo, chave) values ('a', 'k1')"), /duplicate|unique/);
  } finally {
    await pg.close();
  }
});
