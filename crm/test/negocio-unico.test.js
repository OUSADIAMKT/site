// Um negocio automatico por conversa.
//
// O defeito: `garantirNegocioDaConversa` confere se a conversa ja tem negocio
// e, se nao tem, insere. Duas mensagens no mesmo segundo fazem as duas
// conferencias passarem antes de qualquer insercao, e nascem dois negocios
// para a mesma pessoa. Em 24/11/2026 aconteceu cinco vezes na empresa: 96
// negocios para 91 conversas, cinco pares com milesimos de diferenca.
//
// Dois cartoes iguais no Quadro Comercial e toda contagem inflada, sem erro
// nenhum em log nenhum. Por isso tem teste.
//
// A trava e parcial: negocio repetido para a mesma pessoa continua valendo
// quando e a equipe que abre, porque comprou e voltou meses depois e outra
// venda. O que nunca pode repetir e o automatico.

import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import { bancoComercial, aplicar044, reverter044, tentar } from "./banco.js";
import { QUEM_AUTOMATICO, QUEM_TRAZIDAS, garantirNegocioDaConversa } from "../api/_negocios.js";
import { db } from "../api/_db.js";

const OUSADIA = "896d41cf-164a-4608-bf16-35ec341e1950";

Object.assign(process.env, {
  SUPABASE_URL: "https://supabase.invalid",
  SUPABASE_SECRET_KEY: "chave-local-de-teste",
});

async function cenario(pg) {
  const { rows } = await pg.query(`
    with cl as (
      insert into clientes (nome, slug) values ('Ousadia', 'ousadia') returning id
    ),
    f as (
      insert into crm_funis (cliente_id, nome) select id, 'Vendas' from cl returning id, cliente_id
    ),
    e as (
      insert into crm_etapas (cliente_id, funil_id, nome, tipo, ordem)
      select f.cliente_id, f.id, 'Novo contato', 'aberta', 1 from f returning id
    )
    select (select id from cl) as cliente, (select id from f) as funil, (select id from e) as etapa
  `);
  return rows[0];
}

async function conversa(pg, c, contato) {
  const { rows } = await pg.query(
    "insert into conversas (cliente_id, contato) values ($1, $2) returning id",
    [c.cliente, contato]
  );
  return rows[0].id;
}

/** Um negocio, com o `criado_por` e o instante que o teste pedir. */
async function negocio(pg, c, conversaId, { quem, minutos = 0, titulo = "Fulano" }) {
  const { rows } = await pg.query(`
    insert into crm_negocios (cliente_id, funil_id, etapa_id, titulo, conversa_id, criado_por, criado_em)
    values ($1, $2, $3, $4, $5, $6, now() + ($7 || ' minutes')::interval)
    returning id
  `, [c.cliente, c.funil, c.etapa, titulo, conversaId, quem, String(minutos)]);
  return rows[0].id;
}

const quantos = async (pg, conversaId) => (await pg.query(
  "select count(*)::int as n from crm_negocios where conversa_id = $1", [conversaId]
)).rows[0].n;

test("a trava do negocio automatico, da limpeza a corrida", async (t) => {
  const pg = await bancoComercial({ ate: "040" });
  try {
    const c = await cenario(pg);

    // O caso de producao: dois automaticos para a mesma conversa.
    const par = await conversa(pg, c, "5593900000001");
    const velho = await negocio(pg, c, par, { quem: QUEM_AUTOMATICO, minutos: 0 });
    const novo = await negocio(pg, c, par, { quem: QUEM_AUTOMATICO, minutos: 1 });

    // O automatico mais novo tem nota: aqui o mais antigo e que tem que sair,
    // senao a nota desaparece junto, por cascade.
    const comNota = await conversa(pg, c, "5593900000002");
    const vazio = await negocio(pg, c, comNota, { quem: QUEM_AUTOMATICO, minutos: 0 });
    const anotado = await negocio(pg, c, comNota, { quem: QUEM_TRAZIDAS, minutos: 1 });
    await pg.query(
      "insert into crm_notas (cliente_id, negocio_id, texto) values ($1, $2, 'cliente pediu orcamento')",
      [c.cliente, anotado]
    );

    // Segunda venda aberta pela equipe: nao e duplicata, e nao pode sair.
    const comMao = await conversa(pg, c, "5593900000003");
    const automatico = await negocio(pg, c, comMao, { quem: QUEM_AUTOMATICO, minutos: 0 });
    const aMao = await negocio(pg, c, comMao, { quem: "operador", minutos: 1, titulo: "Segunda compra" });

    await aplicar044(pg);

    await t.test("de cada par automatico fica um, e e o que ganhou a corrida", async () => {
      assert.equal(await quantos(pg, par), 1);
      const { rows } = await pg.query("select id from crm_negocios where conversa_id = $1", [par]);
      assert.equal(rows[0].id, velho, `o perdedor da corrida (${novo}) e que sai`);
    });

    await t.test("o que tem nota fica, mesmo sendo o mais novo", async () => {
      const { rows } = await pg.query("select id from crm_negocios where conversa_id = $1", [comNota]);
      assert.deepEqual(rows.map((r) => r.id), [anotado], `o vazio (${vazio}) e que sai`);
      const { rows: notas } = await pg.query("select count(*)::int as n from crm_notas");
      assert.equal(notas[0].n, 1, "apagar o negocio errado levaria a nota junto, por cascade");
    });

    await t.test("a segunda venda aberta pela equipe nao e tocada", async () => {
      const { rows } = await pg.query(
        "select id from crm_negocios where conversa_id = $1 order by criado_em", [comMao]
      );
      assert.deepEqual(rows.map((r) => r.id), [automatico, aMao]);
    });

    await t.test("depois da trava, o automatico repetido e recusado", async () => {
      const r = await tentar(pg, `
        insert into crm_negocios (cliente_id, funil_id, etapa_id, titulo, conversa_id, criado_por)
        values ($1, $2, $3, 'Fulano de novo', $4, $5)
      `, [c.cliente, c.funil, c.etapa, par, QUEM_AUTOMATICO]);
      assert.match(r.erro || "", /crm_negocios_conversa_automatica/);
      assert.equal(await quantos(pg, par), 1);
    });

    await t.test("e a equipe continua podendo abrir a segunda venda", async () => {
      const r = await tentar(pg, `
        insert into crm_negocios (cliente_id, funil_id, etapa_id, titulo, conversa_id, criado_por)
        values ($1, $2, $3, 'Terceira compra', $4, 'operador')
      `, [c.cliente, c.funil, c.etapa, par]);
      assert.equal(r.ok, true, "a trava e parcial justamente para nao atrapalhar isto");
      assert.equal(await quantos(pg, par), 2);
    });

    await t.test("rodar de novo nao apaga mais nada", async () => {
      const antes = await pg.query("select count(*)::int as n from crm_negocios");
      await aplicar044(pg);
      const depois = await pg.query("select count(*)::int as n from crm_negocios");
      assert.equal(depois.rows[0].n, antes.rows[0].n);
    });

    await t.test("a reversao solta a trava", async () => {
      await reverter044(pg);
      const r = await tentar(pg, `
        insert into crm_negocios (cliente_id, funil_id, etapa_id, titulo, conversa_id, criado_por)
        values ($1, $2, $3, 'Sem trava', $4, $5)
      `, [c.cliente, c.funil, c.etapa, par, QUEM_AUTOMATICO]);
      assert.equal(r.ok, true);
    });
  } finally {
    await pg.close();
  }
});

// ---------------------------------------------------------------------------
// O texto que amarra o codigo ao indice

test("o criado_por do codigo e o mesmo do indice parcial", async () => {
  const arquivo = await readFile(
    new URL("../sql/044_negocio_unico_por_conversa.sql", import.meta.url), "utf8"
  );
  const predicado = arquivo.slice(arquivo.indexOf("create unique index"));
  for (const quem of [QUEM_AUTOMATICO, QUEM_TRAZIDAS]) {
    assert.ok(
      predicado.includes(`'${quem}'`),
      `o indice nao conhece "${quem}": mudar a frase no codigo sem mudar no SQL desliga a trava calada`
    );
  }
});

// ---------------------------------------------------------------------------
// Perder a corrida nao e erro

test("quem perde a corrida sai calado, sem derrubar a resposta da IA", async () => {
  const original = globalThis.fetch;
  const caminhos = [];
  globalThis.fetch = async (url, op = {}) => {
    const u = new URL(String(url));
    const tabela = u.pathname.replace("/rest/v1/", "");
    const metodo = op.method || "GET";
    caminhos.push(`${tabela}:${metodo}`);

    const um = (linha) => Response.json(linha);
    if (tabela === "conversas") {
      return um({ id: "conversa-1", cliente_id: OUSADIA, canal: "whatsapp", contato: "5593999998888" });
    }
    if (tabela === "crm_funis") return um({ id: "funil-1" });
    if (tabela === "crm_etapas") return um({ id: "etapa-1", funil_id: "funil-1", nome: "Novo", tipo: "aberta" });
    if (tabela === "etiquetas_conhecidas") return Response.json([]);
    if (tabela === "crm_origens") return um({ id: "origem-1" });
    // A inserção do negócio: é aqui que o índice da 044 derruba o perdedor.
    if (tabela === "crm_negocios" && metodo === "POST") {
      return Response.json({
        code: "23505",
        message: 'duplicate key value violates unique constraint "crm_negocios_conversa_automatica"',
      }, { status: 409 });
    }
    return Response.json([]);
  };

  try {
    const negocio = await garantirNegocioDaConversa(db(), OUSADIA, {
      id: "conversa-1", canal: "whatsapp", contato: "5593999998888", etiquetas: [],
    });
    assert.equal(negocio, null, "o negócio da outra mensagem já está lá: nada a fazer");
    assert.ok(
      caminhos.includes("crm_negocios:POST"),
      "o teste só vale se a inserção foi mesmo tentada"
    );
  } finally {
    globalThis.fetch = original;
  }
});
