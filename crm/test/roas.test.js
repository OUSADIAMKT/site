// Receita por campanha: a atribuição e a conta.

import test from "node:test";
import assert from "node:assert/strict";

Object.assign(process.env, { SUPABASE_URL: "https://supabase.invalid", SUPABASE_SECRET_KEY: "x" });

const { atribuir, receitaPorCampanha } = await import("../api/_roas.js");
const { bancoDeMentira } = await import("./bancoMemoria.js");

const campanhas = new Map([["c1", { id: "c1", nome: "Lançamento Momento UGC" }]]);
const anuncios = new Map([["ad9", "c1"]]);
const origens = new Map([["o-site", "Site"]]);
const ctx = { campanhas, anuncios, origens };

test("a atribuição segue a ordem: anúncio, utm, origem, nada", () => {
  assert.equal(atribuir({}, { origem: { source_id: "ad9" } }, ctx).chave, "meta:c1");
  assert.equal(atribuir({ campos: { utm_campaign: "c1" } }, null, ctx).chave, "meta:c1", "utm com o id da campanha");
  assert.equal(atribuir({ campos: { utm_campaign: "lançamento momento ugc" } }, null, ctx).chave, "meta:c1", "utm com o nome");
  assert.equal(atribuir({ campos: { utm_campaign: "bio-instagram" } }, null, ctx).nome, "utm: bio-instagram");
  assert.equal(atribuir({ origem_id: "o-site" }, null, ctx).nome, "Site");
  assert.equal(atribuir({}, null, ctx).nome, "Sem origem");
});

test("ROAS real: gasto da Meta, leads e vendas pagas menos reembolso", async () => {
  const EMP = "cli";
  const sb = bancoDeMentira({
    report_clientes: [], report_contas: [{ id: "conta", ativo: true }],
    report_anuncios_diarios: [
      { conta_id: "conta", data: "2026-12-01", anuncio_id: "ad9", campanha_id: "c1", campanha_nome: "Lançamento Momento UGC", gasto: 300 },
      { conta_id: "conta", data: "2026-12-02", anuncio_id: "ad9", campanha_id: "c1", campanha_nome: "Lançamento Momento UGC", gasto: 200 },
      { conta_id: "conta", data: "2026-11-01", anuncio_id: "ad9", campanha_id: "c1", campanha_nome: "Lançamento Momento UGC", gasto: 999 },
    ],
    crm_origens: [{ id: "o-site", cliente_id: EMP, nome: "Site" }],
    conversas: [{ id: "cv1", origem: { source_id: "ad9" } }],
    crm_negocios: [
      { id: "n1", cliente_id: EMP, criado_em: "2026-12-01T15:00:00.000Z", conversa_id: "cv1", campos: {} },
      { id: "n2", cliente_id: EMP, criado_em: "2026-12-01T16:00:00.000Z", campos: { utm_campaign: "c1" } },
      { id: "n3", cliente_id: EMP, criado_em: "2026-12-02T10:00:00.000Z", origem_id: "o-site", campos: {} },
      // nasceu antes do período, mas vendeu dentro dele
      { id: "n0", cliente_id: EMP, criado_em: "2026-11-20T10:00:00.000Z", campos: { utm_campaign: "c1" } },
    ],
    vendas_eventos: [
      { cliente_id: EMP, estado: "processado", status_venda: "aprovada", recebido_em: "2026-12-02T12:00:00.000Z", negocio_id: "n1", valor: 497, id_externo: "T1" },
      { cliente_id: EMP, estado: "processado", status_venda: "aprovada", recebido_em: "2026-12-02T13:00:00.000Z", negocio_id: "n0", valor: 497, id_externo: "T0" },
      { cliente_id: EMP, estado: "processado", status_venda: "aprovada", recebido_em: "2026-12-02T14:00:00.000Z", negocio_id: "n3", valor: 197, id_externo: "T3" },
      { cliente_id: EMP, estado: "processado", status_venda: "reembolsada", recebido_em: "2026-12-05T14:00:00.000Z", negocio_id: "n0", valor: 497, id_externo: "T0" },
    ],
  });

  const r = await receitaPorCampanha(sb, EMP, { inicio: "2026-12-01", fim: "2026-12-03" });
  const camp = r.linhas.find((l) => l.chave === "meta:c1");
  assert.equal(camp.gasto, 500, "só o gasto do período");
  assert.equal(camp.leads, 2);
  assert.equal(camp.vendas, 1, "a venda reembolsada não conta");
  assert.equal(camp.receita, 497);
  assert.ok(Math.abs(camp.roas - 0.994) < 0.001);
  assert.equal(camp.cpl, 250);

  const site = r.linhas.find((l) => l.nome === "Site");
  assert.equal(site.receita, 197);
  assert.equal(site.roas, null, "sem gasto, ROAS não existe (não é infinito)");
  assert.equal(r.totais.receita, 694);
});

test("período inválido é recusado", async () => {
  await assert.rejects(receitaPorCampanha(bancoDeMentira({}), "x", { inicio: "01/12/2026", fim: "x" }), /Período inválido/);
});
