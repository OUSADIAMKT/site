// Etapa 1: as oito provas pedidas, contra um Postgres de verdade e isolado.
//
// O que está sendo afirmado aqui não é que o código JavaScript valida direito.
// É que o BANCO recusa, sozinho, o que não pode existir. A diferença importa:
// validação em código se esquece numa rota nova, trava de banco não.
//
// Dados fictícios, duas empresas inventadas, nada de produção.

import { test } from "node:test";
import assert from "node:assert/strict";
import { bancoLimpo, bancoAte, aplicar033, duasEmpresas, tentar } from "./banco.js";

const novaFrente = `insert into frentes (cliente_id, nome, assuntos, padrao, responsavel_id)
                    values ($1, $2, $3, $4, $5) returning id, nome, ativa`;

// ---------------------------------------------------------------- 1

test("1. cria frentes numa empresa de teste", async () => {
  const pg = await bancoLimpo();
  const e = await duasEmpresas(pg);

  const vendas = await tentar(pg, novaFrente, [e.empresa_a, "Vendas Ousadia", ["matricula"], false, e.ana]);
  assert.ok(vendas.ok, `a frente de vendas foi recusada: ${vendas.erro}`);

  const geral = await tentar(pg, novaFrente, [e.empresa_a, "Atendimento Geral", ["suporte"], true, e.bia]);
  assert.ok(geral.ok, `a frente geral foi recusada: ${geral.erro}`);

  const { rows } = await pg.query(
    "select nome, assuntos, padrao, ativa from frentes where cliente_id = $1 order by nome",
    [e.empresa_a],
  );
  assert.equal(rows.length, 2);
  assert.deepEqual(rows.map((r) => r.nome), ["Atendimento Geral", "Vendas Ousadia"]);
  assert.equal(rows[0].padrao, true, "a frente geral é a padrão");
  assert.equal(rows[1].padrao, false);
  assert.deepEqual(rows[1].assuntos, ["matricula"]);
});

test("1b. frente sem responsável é um estado legítimo", async () => {
  const pg = await bancoLimpo();
  const e = await duasEmpresas(pg);
  const r = await tentar(pg, novaFrente, [e.empresa_a, "Sem dono ainda", [], false, null]);
  assert.ok(r.ok, `recusou frente sem responsável: ${r.erro}`);
});

test("1c. frente sem nome é recusada", async () => {
  const pg = await bancoLimpo();
  const e = await duasEmpresas(pg);
  const r = await tentar(pg, novaFrente, [e.empresa_a, "   ", [], false, null]);
  assert.ok(r.erro, "aceitou frente com nome em branco");
});

// ---------------------------------------------------------------- 2 e 3

test("2. aceita responsável da mesma empresa", async () => {
  const pg = await bancoLimpo();
  const e = await duasEmpresas(pg);
  const r = await tentar(pg, novaFrente, [e.empresa_a, "Vendas", ["matricula"], false, e.ana]);
  assert.ok(r.ok, `recusou responsável da própria empresa: ${r.erro}`);
});

test("3. recusa responsável de outra empresa", async () => {
  const pg = await bancoLimpo();
  const e = await duasEmpresas(pg);

  // Caio é da empresa B. A frente é da empresa A.
  const r = await tentar(pg, novaFrente, [e.empresa_a, "Vendas", ["matricula"], false, e.caio]);
  assert.ok(r.erro, "ACEITOU responsável de outra empresa, o isolamento não existe");
  assert.match(r.erro, /frentes_responsavel_mesma_empresa|foreign key/i);
});

test("3b. recusa trocar o responsável por alguém de outra empresa", async () => {
  const pg = await bancoLimpo();
  const e = await duasEmpresas(pg);
  const { rows } = await pg.query(novaFrente, [e.empresa_a, "Vendas", ["matricula"], false, e.ana]);

  const r = await tentar(pg, "update frentes set responsavel_id = $1 where id = $2", [e.caio, rows[0].id]);
  assert.ok(r.erro, "ACEITOU trocar para responsável de outra empresa");
});

test("3c. trocar de responsável dentro da empresa funciona", async () => {
  const pg = await bancoLimpo();
  const e = await duasEmpresas(pg);
  const { rows } = await pg.query(novaFrente, [e.empresa_a, "Vendas", ["matricula"], false, e.ana]);

  const r = await tentar(pg, "update frentes set responsavel_id = $1 where id = $2", [e.bia, rows[0].id]);
  assert.ok(r.ok, `não deu para trocar o responsável: ${r.erro}`);

  const { rows: depois } = await pg.query("select responsavel_id from frentes where id = $1", [rows[0].id]);
  assert.equal(depois[0].responsavel_id, e.bia, "a frente não está presa a uma pessoa só");
});

// ---------------------------------------------------------------- 4

test("4. os atendimentos existentes continuam de pé", async () => {
  // A 033 põe um unique novo em `atendentes`. Esta prova é que ela não
  // atrapalha nada de atendimento: conversa, fila, atribuição e histórico.
  const pg = await bancoAte("032");
  const e = await duasEmpresas(pg);

  const { rows: conv } = await pg.query(
    `insert into conversas (cliente_id, contato, modo, atendente_id, assumida_em, etiquetas)
     values ($1, '+5591999990001', 'humano', $2, now(), '{matricula}') returning id`,
    [e.empresa_a, e.ana],
  );
  await pg.query(
    `insert into atendimentos (cliente_id, conversa_id, atendente_id, assumida_em, motivo)
     values ($1, $2, $3, now(), 'teste')`,
    [e.empresa_a, conv[0].id, e.ana],
  );

  const antes = await pg.query(
    "select modo, atendente_id, etiquetas from conversas where id = $1", [conv[0].id],
  );
  const antesAt = await pg.query("select count(*)::int c from atendimentos");

  // agora aplica a 033 por cima
  await aplicar033(pg);

  const depois = await pg.query(
    "select modo, atendente_id, etiquetas from conversas where id = $1", [conv[0].id],
  );
  const depoisAt = await pg.query("select count(*)::int c from atendimentos");

  assert.deepEqual(depois.rows[0], antes.rows[0], "a 033 mexeu numa conversa em atendimento");
  assert.equal(depoisAt.rows[0].c, antesAt.rows[0].c, "a 033 mexeu no histórico de atendimentos");

  // e a conversa continua podendo ser atribuída e encerrada depois dela
  const mover = await tentar(pg,
    "update conversas set atendente_id = $1 where id = $2", [e.bia, conv[0].id]);
  assert.ok(mover.ok, `a 033 travou a troca de atendente: ${mover.erro}`);

  await pg.close();
});

// ---------------------------------------------------------------- 5 e 6

test("5. liga campanha a frente da mesma empresa", async () => {
  const pg = await bancoLimpo();
  const e = await duasEmpresas(pg);
  const { rows: f } = await pg.query(novaFrente, [e.empresa_a, "Vendas", ["matricula"], false, e.ana]);
  const { rows: d } = await pg.query(
    "insert into disparos (cliente_id, nome, texto) values ($1,'Black','oi') returning id",
    [e.empresa_a],
  );

  const r = await tentar(pg, "update disparos set frente_id = $1 where id = $2", [f[0].id, d[0].id]);
  assert.ok(r.ok, `recusou campanha e frente da mesma empresa: ${r.erro}`);
});

test("6. recusa campanha de uma empresa com frente de outra", async () => {
  const pg = await bancoLimpo();
  const e = await duasEmpresas(pg);
  const { rows: f } = await pg.query(novaFrente, [e.empresa_b, "Vendas do B", ["matricula"], false, e.caio]);
  const { rows: d } = await pg.query(
    "insert into disparos (cliente_id, nome, texto) values ($1,'Black','oi') returning id",
    [e.empresa_a],
  );

  const r = await tentar(pg, "update disparos set frente_id = $1 where id = $2", [f[0].id, d[0].id]);
  assert.ok(r.erro, "ACEITOU campanha apontando para frente de outra empresa");
  assert.match(r.erro, /disparos_frente_mesma_empresa|foreign key/i);
});

test("6b. a campanha que já existia continua válida com frente nula", async () => {
  const pg = await bancoAte("032");
  const e = await duasEmpresas(pg);
  await pg.query("insert into disparos (cliente_id, nome, texto) values ($1,'Antiga','oi')", [e.empresa_a]);

  await aplicar033(pg);

  const { rows } = await pg.query("select nome, frente_id from disparos");
  assert.equal(rows.length, 1);
  assert.equal(rows[0].frente_id, null, "a 033 inventou frente para campanha antiga");

  await pg.close();
});

// ---------------------------------------------------------------- 7

test("7. desativar não apaga, e o histórico da campanha fica", async () => {
  const pg = await bancoLimpo();
  const e = await duasEmpresas(pg);
  const { rows: f } = await pg.query(novaFrente, [e.empresa_a, "Vendas", ["matricula"], false, e.ana]);
  const { rows: d } = await pg.query(
    "insert into disparos (cliente_id, nome, texto, frente_id) values ($1,'Black','oi',$2) returning id",
    [e.empresa_a, f[0].id],
  );

  await pg.query("update frentes set ativa = false where id = $1", [f[0].id]);

  const { rows: viva } = await pg.query("select nome, ativa from frentes where id = $1", [f[0].id]);
  assert.equal(viva.length, 1, "desativar apagou a frente");
  assert.equal(viva[0].ativa, false);

  const { rows: camp } = await pg.query("select frente_id from disparos where id = $1", [d[0].id]);
  assert.equal(camp[0].frente_id, f[0].id, "a campanha perdeu a frente quando ela foi desativada");
});

test("7b. nome único entre as ativas, e desativar libera o nome", async () => {
  const pg = await bancoLimpo();
  const e = await duasEmpresas(pg);
  const { rows: f } = await pg.query(novaFrente, [e.empresa_a, "Vendas", ["matricula"], false, null]);

  const repetido = await tentar(pg, novaFrente, [e.empresa_a, "  vendas ", [], false, null]);
  assert.ok(repetido.erro, "aceitou duas frentes ativas com o mesmo nome");

  const outraEmpresa = await tentar(pg, novaFrente, [e.empresa_b, "Vendas", [], false, null]);
  assert.ok(outraEmpresa.ok, `o nome de uma empresa bloqueou a outra: ${outraEmpresa.erro}`);

  await pg.query("update frentes set ativa = false where id = $1", [f[0].id]);
  const depois = await tentar(pg, novaFrente, [e.empresa_a, "Vendas", ["matricula"], false, null]);
  assert.ok(depois.ok, `desativar não liberou o nome: ${depois.erro}`);
});

test("7c. o mesmo assunto não fica em duas frentes ativas", async () => {
  const pg = await bancoLimpo();
  const e = await duasEmpresas(pg);
  const { rows: f } = await pg.query(novaFrente, [e.empresa_a, "Vendas", ["matricula"], false, null]);

  const conflito = await tentar(pg, novaFrente, [e.empresa_a, "Vendas de novo", ["matricula"], false, null]);
  assert.ok(conflito.erro, "o mesmo assunto ficou em duas frentes ativas, o roteamento é ambíguo");
  assert.match(conflito.erro, /ja pertence a frente "Vendas"/);

  const naOutra = await tentar(pg, novaFrente, [e.empresa_b, "Vendas do B", ["matricula"], false, null]);
  assert.ok(naOutra.ok, `o assunto de uma empresa bloqueou a outra: ${naOutra.erro}`);

  await pg.query("update frentes set ativa = false where id = $1", [f[0].id]);
  const livre = await tentar(pg, novaFrente, [e.empresa_a, "Vendas 2", ["matricula"], false, null]);
  assert.ok(livre.ok, `desativar não liberou o assunto: ${livre.erro}`);
});

test("7d. uma frente padrão por empresa, no máximo", async () => {
  const pg = await bancoLimpo();
  const e = await duasEmpresas(pg);
  await pg.query(novaFrente, [e.empresa_a, "Geral", ["suporte"], true, null]);

  const segunda = await tentar(pg, novaFrente, [e.empresa_a, "Outra geral", [], true, null]);
  assert.ok(segunda.erro, "aceitou duas frentes padrão na mesma empresa");

  const naOutra = await tentar(pg, novaFrente, [e.empresa_b, "Geral do B", [], true, null]);
  assert.ok(naOutra.ok, `a padrão de uma empresa bloqueou a outra: ${naOutra.erro}`);
});

// ---------------------------------------------------------------- 8

test("8. a Etapa 0 continua inteira depois da 033", async () => {
  const pg = await bancoLimpo();
  const e = await duasEmpresas(pg);
  const { rows: d } = await pg.query(
    "insert into disparos (cliente_id, nome, texto) values ($1,'Black','oi') returning id",
    [e.empresa_a],
  );
  await pg.query(
    "insert into disparo_envios (disparo_id, telefone) values ($1, '+5500000000001')", [d[0].id],
  );

  // o trigger da 032 ainda recusa o caminho que duplicava
  const proibida = await tentar(pg,
    "update disparo_envios set estado = 'enviado' where disparo_id = $1", [d[0].id]);
  assert.ok(proibida.erro, "a 033 desarmou o trigger da 032");
  assert.match(proibida.erro, /transicao de envio invalida/);

  // a reserva ainda funciona e ainda dá senha
  const { rows: reservadas } = await pg.query("select * from reservar_envios($1, 10)", [d[0].id]);
  assert.equal(reservadas.length, 1);
  assert.ok(reservadas[0].tentativa_id, "a reserva não deu tentativa_id");

  // a posse ainda é exigida
  const { rows: errada } = await pg.query(
    "select marcar_enviando($1, gen_random_uuid()) as ok", [reservadas[0].id],
  );
  assert.equal(errada[0].ok, false, "aceitou senha de outro processo");

  const { rows: certa } = await pg.query(
    "select marcar_enviando($1, $2) as ok", [reservadas[0].id, reservadas[0].tentativa_id],
  );
  assert.equal(certa[0].ok, true, "recusou a posse correta");

  // e a frente da campanha não mudou nada disso
  const { rows: f } = await pg.query(novaFrente, [e.empresa_a, "Vendas", ["matricula"], false, e.ana]);
  await pg.query("update disparos set frente_id = $1 where id = $2", [f[0].id, d[0].id]);

  const { rows: estado } = await pg.query(
    "select estado from disparo_envios where disparo_id = $1", [d[0].id],
  );
  assert.equal(estado[0].estado, "enviando", "ligar a frente mexeu no estado do envio");
});

test("8b. apagar a empresa leva as frentes e não deixa órfão", async () => {
  const pg = await bancoLimpo();
  const e = await duasEmpresas(pg);
  await pg.query(novaFrente, [e.empresa_a, "Vendas", ["matricula"], false, e.ana]);

  await pg.query("delete from clientes where id = $1", [e.empresa_a]);
  // Conta só as desta empresa: a instância é compartilhada e as frentes dos
  // outros testes continuam vivas, o que é o que se espera delas.
  const { rows } = await pg.query(
    "select count(*)::int c from frentes where cliente_id = $1", [e.empresa_a]);
  assert.equal(rows[0].c, 0, "sobrou frente de empresa apagada");
});
