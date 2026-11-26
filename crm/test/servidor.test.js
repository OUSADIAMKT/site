// A casca da VPS: o que o vercel.json e o runtime da Vercel faziam, agora no
// servidor.js. Se uma reescrita some, uma tela inteira para de carregar; se o
// corpo cru do webhook for lido antes da hora, a assinatura da Meta nunca
// confere e as mensagens somem em silêncio.

import test from "node:test";
import assert from "node:assert/strict";
import http from "node:http";

Object.assign(process.env, {
  SESSION_SECRET: "segredo-local-de-teste",
  SUPABASE_URL: "https://supabase.invalid",
  SUPABASE_SECRET_KEY: "chave-local-de-teste",
  HOSTS_DO_PAINEL: "crm.ousadiamarketing.com.br,localhost",
});

const { reescrever, atender, carregarHandlers, handlers } = await import("../servidor.js");

test("as reescritas da origem continuam valendo", () => {
  const casos = [
    ["/api/painel-crm", "/api/painel-conversas", { rota: "crm" }],
    ["/api/painel-contatos", "/api/painel-conversas", { rota: "contatos" }],
    ["/api/painel-disparar", "/api/painel-conversas", { rota: "disparar" }],
    ["/api/painel-frentes", "/api/painel-conversas", { rota: "frentes" }],
    ["/api/painel-agendamentos", "/api/painel-agenda", { recurso: "agendamentos" }],
    ["/api/painel-paginas", "/api/report", { rota: "paginas" }],
    ["/api/report-coletar", "/api/report", { rota: "coletar" }],
    ["/api/report-callback", "/api/report", { rota: "callback" }],
    ["/api/mcp", "/api/report", { rota: "mcp" }],
    ["/api/mcp/abc", "/api/report", { rota: "mcp", chave: "abc" }],
    ["/l/turma", "/api/report", { rota: "ir", chave: "turma" }],
    ["/p/oferta", "/api/report", { rota: "pagina-publica", slug: "oferta" }],
    ["/r/0123456789abcdef01234567", "/relatorio.html", {}],
  ];
  for (const [de, caminho, extra] of casos) {
    assert.deepEqual(reescrever(de, "crm.ousadiamarketing.com.br"), { caminho, extra }, de);
  }
});

test("a raiz é o painel no endereço do painel e a landing page em qualquer outro", () => {
  assert.deepEqual(reescrever("/", "crm.ousadiamarketing.com.br"), { caminho: "/painel.html", extra: {} });
  assert.deepEqual(reescrever("/", "cliente-a.com.br"),
    { caminho: "/api/report", extra: { rota: "pagina-publica" } });
});

test("a olist, que era cron da origem, não existe mais", () => {
  assert.deepEqual(reescrever("/api/olist-sincronizar", "crm.ousadiamarketing.com.br"),
    { caminho: "/api/olist-sincronizar", extra: {} });
});

// ---------------------------------------------------------------------------
// De ponta a ponta, com o servidor de verdade numa porta qualquer

async function comServidor(fn) {
  if (!handlers.size) await carregarHandlers();
  const srv = http.createServer(atender);
  await new Promise((r) => srv.listen(0, "127.0.0.1", r));
  const base = `http://127.0.0.1:${srv.address().port}`;
  try { return await fn(base); } finally { srv.close(); }
}

test("as mesmas provas que o instalador fazia contra a produção", async () => {
  await comServidor(async (base) => {
    // login existe e só aceita POST
    assert.equal((await fetch(`${base}/api/painel-entrar`)).status, 405);
    // rota de painel existe e exige sessão
    assert.equal((await fetch(`${base}/api/painel-clientes`)).status, 401);
    // webhook subiu: GET sem desafio é 400, não 500
    assert.equal((await fetch(`${base}/api/webhook`)).status, 400);
    // rota que não existe
    assert.equal((await fetch(`${base}/api/nao-existe`)).status, 404);
  });
});

test("o corpo JSON chega ao handler como objeto", async () => {
  await comServidor(async (base) => {
    const r = await fetch(`${base}/api/painel-entrar`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "" }),
    });
    // Sem senha: o handler leu o corpo e recusou pela regra dele.
    assert.equal(r.status, 400);
    assert.match((await r.json()).error, /senha/i);
  });
});

test("o webhook recebe o corpo cru, sem ninguém ler antes", async () => {
  const { fn, corpoCru } = handlers.get("webhook") || {};
  assert.ok(fn, "webhook carregado");
  assert.equal(corpoCru, true, "sem isso a assinatura da Meta nunca confere");

  await comServidor(async (base) => {
    // JSON inválido é recusado pelo PRÓPRIO webhook, lendo o fluxo cru.
    const r = await fetch(`${base}/api/webhook`, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: "{quebrado",
    });
    assert.equal(r.status, 400);
  });
});

test("caminho com .. não sai da pasta do painel", async () => {
  await comServidor(async (base) => {
    const r = await fetch(`${base}/..%2Fpackage.json`);
    assert.equal(r.status, 404);
  });
});
