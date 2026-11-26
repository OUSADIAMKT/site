// Quem assumiu a conversa, quando quem assumiu não é uma atendente.
//
// O defeito que isto impede de voltar: `atendimentos.atendente_id` aponta para
// `atendentes`, e o gestor não tem linha lá. Quando ele assumia uma conversa
// pela aba Conversas, a passagem era gravada com atendente nulo, contava no
// total do relatório e não entrava em pessoa nenhuma. Em 24/11/2026 eram 20
// passagens órfãs na empresa, e o Desempenho do mês dizia 154 no total contra
// 134 somando por atendente.
//
// Ninguém vê isso na tela: o número só fica menor. Por isso tem teste.

import test from "node:test";
import assert from "node:assert/strict";

import { atenderAgora } from "../api/_fila.js";
import { bancoAte } from "./banco.js";

const OUSADIA = "11111111-1111-1111-1111-111111111111";

/** Intercepta o PostgREST e devolve os corpos que o código mandou. */
async function espiar(executar) {
  const chamadas = [];
  const original = globalThis.fetch;
  globalThis.fetch = async (url, op = {}) => {
    const caminho = new URL(String(url)).pathname;
    chamadas.push({
      caminho,
      metodo: op.method || "GET",
      corpo: op.body ? JSON.parse(op.body) : null,
    });
    return Response.json([{ id: "c1", cliente_id: OUSADIA, motivo_fila: null }]);
  };
  Object.assign(process.env, {
    SUPABASE_URL: "https://supabase.invalid", SUPABASE_SECRET_KEY: "chave-local-de-teste",
  });
  try {
    await executar();
  } finally {
    globalThis.fetch = original;
  }
  return chamadas;
}

const corpos = (chamadas, caminho, metodo) =>
  chamadas.filter((c) => c.caminho === caminho && c.metodo === metodo).map((c) => c.corpo);

// ---------------------------------------------------------------------------
// O gestor assumindo

test("gestor que assume pela aba Conversas fica registrado como operador", async () => {
  const chamadas = await espiar(() => atenderAgora("c1", null, null, "operador"));

  const [conversa] = corpos(chamadas, "/rest/v1/conversas", "PATCH");
  assert.equal(conversa.modo, "humano");
  assert.equal(conversa.atendente_id, null, "ele não é atendente e continua não sendo");
  assert.equal(conversa.assumido_por, "operador");

  const [passagem] = corpos(chamadas, "/rest/v1/atendimentos", "POST");
  assert.equal(passagem.atendente_id, null);
  assert.equal(
    passagem.assumido_por, "operador",
    "é esta linha que some do Desempenho quando fica sem dono"
  );
});

test("atendente que assume fica registrada pelo id dela, nos dois lugares", async () => {
  const quem = "22222222-2222-2222-2222-222222222222";
  const chamadas = await espiar(() => atenderAgora("c1", quem, null, quem));

  const [conversa] = corpos(chamadas, "/rest/v1/conversas", "PATCH");
  assert.equal(conversa.atendente_id, quem);
  assert.equal(conversa.assumido_por, quem);

  const [passagem] = corpos(chamadas, "/rest/v1/atendimentos", "POST");
  assert.equal(passagem.atendente_id, quem);
  assert.equal(passagem.assumido_por, quem);
});

test("sem ninguém informado, a passagem ainda tem dono", async () => {
  // Chamada antiga, de quem não passou o quarto argumento. O código tem que
  // cair em 'operador' em vez de gravar nulo de novo.
  const chamadas = await espiar(() => atenderAgora("c1", null, null));
  const [passagem] = corpos(chamadas, "/rest/v1/atendimentos", "POST");
  assert.equal(passagem.assumido_por, "operador");
});

// ---------------------------------------------------------------------------
// A migração

test("a 042 adota as passagens órfãs e o relatório volta a fechar", async () => {
  const pg = await bancoAte("031");
  try {
    const lia = "33333333-3333-3333-3333-333333333333";
    await pg.exec(`
      insert into clientes (id, nome, slug) values ('${OUSADIA}', 'Ousadia', 'ousadia');
      insert into atendentes (id, cliente_id, nome, email, senha_hash, ativo)
        values ('${lia}', '${OUSADIA}', 'Lia', 'lia@ousadia.test', 'x', true);
      insert into conversas (id, cliente_id, contato, modo, atendente_id, assumida_em)
        values ('44444444-4444-4444-4444-444444444444', '${OUSADIA}', '5593900000001',
                'humano', '${lia}', now());

      -- três passagens: uma da Lia, duas do gestor (atendente nulo e assumida)
      insert into atendimentos (cliente_id, conversa_id, atendente_id, entrou_fila, assumida_em, encerrada_em, desfecho)
        values ('${OUSADIA}', '44444444-4444-4444-4444-444444444444', '${lia}', now(), now(), now(), 'encerrado'),
               ('${OUSADIA}', '44444444-4444-4444-4444-444444444444', null, now(), now(), now(), 'encerrado'),
               ('${OUSADIA}', '44444444-4444-4444-4444-444444444444', null, now(), now(), null, null);

      -- e uma que nunca foi assumida: abandonada na fila, não tem dono mesmo
      insert into atendimentos (cliente_id, conversa_id, atendente_id, entrou_fila, encerrada_em, desfecho)
        values ('${OUSADIA}', '44444444-4444-4444-4444-444444444444', null, now(), now(), 'abandonado');
    `);

    await pg.exec(await import("node:fs/promises")
      .then((fs) => fs.readFile(new URL("../sql/042_assumido_por.sql", import.meta.url), "utf8")));

    const donos = await pg.query(
      "select assumido_por, count(*)::int as n from atendimentos group by 1 order by 1 nulls last"
    );
    assert.deepEqual(donos.rows, [
      { assumido_por: lia, n: 1 },
      { assumido_por: "operador", n: 2 },
      { assumido_por: null, n: 1 },
    ], "só a abandonada sem assumir pode continuar sem dono");

    const conversa = await pg.query("select assumido_por from conversas");
    assert.equal(conversa.rows[0].assumido_por, lia);

    // O relatório: a soma por linha tem que bater com o total de passagens
    // assumidas, que é justamente o que não batia.
    const view = await pg.query(
      "select nome, papel, atendimentos::int as n, em_aberto::int as abertos"
      + " from desempenho_equipe where cliente_id = $1 order by nome", [OUSADIA]
    );
    assert.deepEqual(view.rows, [
      { nome: "Gestor", papel: "gestor", n: 2, abertos: 1 },
      { nome: "Lia", papel: "atendente", n: 1, abertos: 0 },
    ]);

    const total = await pg.query(
      "select count(*)::int as n from atendimentos where cliente_id = $1 and assumida_em is not null",
      [OUSADIA]
    );
    assert.equal(
      view.rows.reduce((s, l) => s + l.n, 0), total.rows[0].n,
      "a soma da equipe tem que fechar com o total de assumidas"
    );

    // Rodar de novo não duplica nem reescreve o que já tem dono.
    await pg.exec(await import("node:fs/promises")
      .then((fs) => fs.readFile(new URL("../sql/042_assumido_por.sql", import.meta.url), "utf8")));
    const denovo = await pg.query(
      "select assumido_por, count(*)::int as n from atendimentos group by 1 order by 1 nulls last"
    );
    assert.deepEqual(denovo.rows, donos.rows);
  } finally {
    await pg.close();
  }
});
