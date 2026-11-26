// A origem do negócio no CRM.
//
// O que isto impede de voltar: `crm_negocios.origem_id` existia, ninguém
// preenchia, `crm_origens` estava vazia, e o CRM dizia "não informada" em 96
// negócios. Não faltava dado. O de-onde-veio estava na etiqueta da família
// `origem` (65 conversas da empresa com "veio do disparo") e no
// `conversas.origem` que o WhatsApp manda. Faltava ligação.
//
// Duas regras valem mais que as outras e por isso têm prova própria:
//
//   1. A etiqueta manda sobre o sinal técnico. Quem veio do disparo não pode
//      ser contado como "WhatsApp direto" só porque o disparo não deixa marca
//      no referral da Meta.
//   2. Origem escolhida à mão nunca é sobrescrita. O automático corrige o
//      automático; o que uma pessoa escolheu fica.
//
// Uma instância PGlite só, com as fases em ordem: cada PGlite é um Postgres
// inteiro em WASM e quatro deles no mesmo processo estouram o Node. A última
// fase é a reversão, que apaga a coluna, então ela tem que ser a última mesmo.

import test from "node:test";
import assert from "node:assert/strict";

import { bancoComercial, aplicar041, aplicar043, reverter043 } from "./banco.js";

// `entrada_automatica` não aparece aqui: é da 029, que este banco de teste não
// aplica, e a 043 não lê esse campo. O funil existe só para o negócio ter onde
// morar.
async function cenario(pg) {
  const { rows } = await pg.query(`
    with cl as (
      insert into clientes (nome, slug) values ('Ousadia', 'ousadia') returning id
    ),
    f as (
      insert into crm_funis (cliente_id, nome)
      select id, 'Vendas' from cl returning id, cliente_id
    ),
    e as (
      insert into crm_etapas (cliente_id, funil_id, nome, tipo, ordem)
      select f.cliente_id, f.id, 'Novo lead', 'aberta', 1 from f returning id
    )
    select (select id from cl) as cliente, (select id from f) as funil, (select id from e) as etapa
  `);
  return rows[0];
}

/** Uma conversa com negócio sem origem, como os 96 de produção. */
async function conversaComNegocio(pg, c, { contato, etiquetas = [], origem = null, canal = "whatsapp" }) {
  const { rows } = await pg.query(`
    with cv as (
      insert into conversas (cliente_id, contato, canal, etiquetas, origem)
      values ($1, $2, $5, $3, $4::jsonb) returning id
    ),
    n as (
      insert into crm_negocios (cliente_id, funil_id, etapa_id, titulo, conversa_id)
      select $1, $6, $7, $2, cv.id from cv returning id
    )
    select (select id from cv) as conversa, (select id from n) as negocio
  `, [c.cliente, contato, etiquetas, origem ? JSON.stringify(origem) : null, canal, c.funil, c.etapa]);
  return rows[0];
}

const nomeDaOrigem = async (pg, negocioId) => (await pg.query(
  "select o.nome from crm_negocios n left join crm_origens o on o.id = n.origem_id where n.id = $1",
  [negocioId]
)).rows[0].nome;

test("a origem do negócio, da migração à reversão", async (t) => {
  const pg = await bancoComercial({ ate: "040" });
  try {
    // Na ordem: o cliente primeiro. O seed da 041 procura o cliente pelo slug
    // 'ousadia', então aplicá-la antes de o cliente existir insere lista
    // nenhuma e o teste passaria a medir o caminho do sinal técnico.
    const c = await cenario(pg);
    await aplicar041(pg);

    const disparo = await conversaComNegocio(pg, c, {
      contato: "5593900000001", etiquetas: ["Veio do disparo", "matricula"],
    });
    const anuncio = await conversaComNegocio(pg, c, {
      contato: "5593900000002", origem: { ctwa_clid: "abc", headline: "Black" },
    });
    const painel = await conversaComNegocio(pg, c, {
      contato: "5593900000003", origem: { tipo: "painel", por: "operador" },
    });
    const nada = await conversaComNegocio(pg, c, { contato: "5593900000004" });
    const insta = await conversaComNegocio(pg, c, { contato: "1784532", canal: "instagram" });

    // Origem escolhida à mão, antes da migração, para provar que ela sobrevive.
    const { rows: mao } = await pg.query(
      "insert into crm_origens (cliente_id, nome) values ($1, 'Feira do empreendedor') returning id",
      [c.cliente]
    );
    const manual = await conversaComNegocio(pg, c, { contato: "5593900000005" });
    await pg.query("update crm_negocios set origem_id = $1 where id = $2", [mao[0].id, manual.negocio]);

    await aplicar043(pg);

    await t.test("cada negócio recebe a origem que o banco já sabia", async () => {
      // A etiqueta manda: esta conversa não tem referral nenhum e mesmo assim
      // não é "WhatsApp direto".
      assert.equal(await nomeDaOrigem(pg, disparo.negocio), "Veio do disparo");
      assert.equal(await nomeDaOrigem(pg, anuncio.negocio), "Anúncio");
      assert.equal(await nomeDaOrigem(pg, painel.negocio), "Equipe procurou");
      assert.equal(await nomeDaOrigem(pg, insta.negocio), "Instagram");
      assert.equal(
        await nomeDaOrigem(pg, nada.negocio), "WhatsApp direto",
        "quem mandou mensagem no número sem vir de campanha tem origem, e ela é esta"
      );

      const { rows } = await pg.query("select count(*)::int as n from crm_negocios where origem_id is null");
      assert.equal(rows[0].n, 0, "nenhum negócio sobra sem origem: era o estado inteiro antes");
    });

    await t.test("a origem escolhida à mão fica como estava", async () => {
      assert.equal(await nomeDaOrigem(pg, manual.negocio), "Feira do empreendedor");
      const { rows } = await pg.query(
        "select chave from crm_origens where nome = 'Feira do empreendedor'"
      );
      assert.equal(rows[0].chave, null, "origem feita à mão não tem chave, e é isso que a protege");
    });

    await t.test("rodar de novo não muda nada e não duplica o cadastro", async () => {
      const antes = await pg.query(
        "select n.id, n.origem_id from crm_negocios n order by n.id"
      );
      const origens = await pg.query("select count(*)::int as n from crm_origens");

      await aplicar043(pg);

      const depois = await pg.query("select n.id, n.origem_id from crm_negocios n order by n.id");
      const origens2 = await pg.query("select count(*)::int as n from crm_origens");
      assert.deepEqual(depois.rows, antes.rows);
      assert.equal(origens2.rows[0].n, origens.rows[0].n);
    });

    await t.test("a reversão devolve o automático para nulo e deixa o manual", async () => {
      await reverter043(pg);

      assert.equal(await nomeDaOrigem(pg, disparo.negocio), null);
      assert.equal(await nomeDaOrigem(pg, nada.negocio), null);
      assert.equal(
        await nomeDaOrigem(pg, manual.negocio), "Feira do empreendedor",
        "o negócio que aponta para origem feita à mão continua apontando"
      );

      const { rows } = await pg.query(
        "select count(*)::int as n from information_schema.columns"
        + " where table_name = 'crm_origens' and column_name = 'chave'"
      );
      assert.equal(rows[0].n, 0, "a coluna sai junto");
    });
  } finally {
    await pg.close();
  }
});
