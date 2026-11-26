import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { barrouGestor, clientePermitido, gerarToken, sessao } from "../api/_painel.js";
import fila from "../api/painel-fila.js";
import entrar from "../api/painel-entrar.js";
import { hashSenha } from "../api/_painel.js";
import { bancoAte } from "./banco.js";

test("o painel valida o estado atual, falha fechado e consulta uma vez por requisicao", async (t) => {
  process.env.SESSION_SECRET = "segredo-local-de-teste";
  process.env.SUPABASE_URL = "https://supabase.invalid";
  process.env.SUPABASE_SECRET_KEY = "chave-local-de-teste";
  const equipe = { tipo: "atendente", atendente: "a", cliente: "c", papel: "gestor" };
  const legado = gerarToken(equipe);
  const valido = { id: "a", nome: "Nome atual", cliente_id: "c", papel: "atendente",
    ativo: true, versao_sessao: 1, clientes: { ativo: true, modulos: {} } };
  let data = valido;
  let status = 200;
  let consultas = 0;

  t.mock.method(globalThis, "fetch", async (url) => {
    assert.equal(new URL(url).pathname, "/rest/v1/atendentes");
    consultas++;
    const corpo = status === 200 ? (data ? [data] : []) : { message: "Banco indisponivel" };
    return Response.json(corpo, { status });
  });

  const req = (token = legado) => ({ method: "POST", headers: { authorization: `Bearer ${token}` } });
  const resposta = () => ({
    status(code) { this.code = code; return this; },
    json(body) { this.body = body; return this; },
  });

  const pedido = req();
  const res = resposta();
  assert.equal(await barrouGestor(pedido, res), true);
  assert.equal(res.code, 403);
  assert.equal((await sessao(pedido)).nome, "Nome atual");
  assert.equal(await clientePermitido(pedido, "outro"), null);
  assert.equal(await clientePermitido(pedido), "c");
  assert.equal(consultas, 1);

  for (const revogado of [null, { ...valido, ativo: false },
    { ...valido, clientes: { ativo: false } }, { ...valido, versao_sessao: 2 },
    { ...valido, cliente_id: "outro" }]) {
    data = revogado;
    const negado = resposta();
    await fila(req(), negado);
    assert.equal(negado.code, 401);
  }

  data = { ...valido, versao_sessao: 2, senha_hash: await hashSenha("senha-de-teste") };
  const login = resposta();
  await entrar({ method: "POST", headers: {}, body: { email: "teste@example.invalid", senha: "senha-de-teste" } }, login);
  assert.equal(login.code, 200);
  assert.equal((await sessao(req(login.body.token))).versao_sessao, 2);

  status = 500;
  const falha = resposta();
  await fila(req(), falha);
  assert.equal(falha.code, 500);
  const antes = consultas;
  assert.equal((await sessao(req(gerarToken({ tipo: "operador" })))).tipo, "operador");
  assert.equal(await sessao(req(`${legado}.extra`)), null);
  assert.equal(consultas, antes);
});

test("a migracao revoga de forma atomica e preserva sessoes em edicoes comuns", async () => {
  const pg = await bancoAte("033");
  try {
    const sql = await readFile(new URL("../sql/036_revogacao_sessoes.sql", import.meta.url), "utf8");
    await pg.exec(sql);
    await pg.exec(sql);
    await pg.exec(`
      insert into clientes(nome, slug) values ('Clínica', 'clinica'), ('Outra', 'outra');
      insert into atendentes(cliente_id, nome, email, senha_hash)
      select id, slug, slug || '@example.invalid', 'hash' from clientes;
    `);
    const versoes = async () => (await pg.query(
      "select versao_sessao from atendentes order by email"
    )).rows.map((row) => row.versao_sessao);

    assert.deepEqual(await versoes(), [1, 1]);
    await pg.exec("update atendentes set nome = 'Novo nome' where nome = 'clinica'");
    assert.deepEqual(await versoes(), [1, 1]);
    await pg.exec("update atendentes set senha_hash = 'novo', papel = 'gestor' where nome = 'Novo nome'");
    assert.deepEqual(await versoes(), [2, 1]);
    await pg.exec("update atendentes set ativo = false where nome = 'Novo nome'");
    await pg.exec("update atendentes set ativo = true where nome = 'Novo nome'");
    assert.deepEqual(await versoes(), [3, 1]);
    await pg.exec("update clientes set ativo = false where slug = 'clinica'");
    await pg.exec("update clientes set ativo = true where slug = 'clinica'");
    assert.deepEqual(await versoes(), [4, 1]);
  } finally {
    await pg.close();
  }
});
