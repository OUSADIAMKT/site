// Testes da máquina de estados e da orquestração do lote.
//
// Nenhum deles toca a Cloud API nem o Supabase: a Meta é um dublê que registra
// as chamadas, e a fila é o dublê de `test/duplo.js`. Rodar isto não manda
// mensagem para ninguém.
//
//   node --test test/

import { test } from "node:test";
import assert from "node:assert/strict";

import {
  rodarLote, transicaoOk, classificarFalha, comPrazo, TRANSICOES, LOTE,
} from "../api/_disparo.js";
import { filaDeMentira, metaDeMentira, erroHttp, erroDeRede } from "./duplo.js";

const MINUTO = 60_000;

// ---------------------------------------------------------------------------
// Reserva e ausência de duplicidade

test("quatro execuções concorrentes reservam 100 destinatários sem sobreposição", async () => {
  const fila = filaDeMentira({ quantos: 100 });
  const meta = metaDeMentira();

  // Quatro laços ao mesmo tempo, cada um chamando lotes até acabar. É o que
  // acontece quando duas pessoas abrem a mesma campanha e apertam enviar.
  async function processo() {
    for (;;) {
      const r = await rodarLote({
        fila, entregar: meta.entregar, disparoId: "d1", respirar: async () => {},
      });
      if (r.acabou || r.reservados === 0) break;
    }
  }
  await Promise.all([processo(), processo(), processo(), processo()]);

  const estados = fila.estados();
  assert.equal(estados.enviado, 100, "as 100 linhas precisam terminar enviadas");
  assert.equal(estados.pendente, undefined);

  // A prova da não duplicidade: 100 chamadas à Meta, uma por número.
  assert.equal(meta.chamadas.length, 100);
  assert.equal(new Set(meta.chamadas).size, 100);

  // E nenhuma linha foi reservada duas vezes.
  for (const l of fila.linhas.values()) assert.equal(l.tentativas, 1);
});

test("o lote nunca reserva mais que LOTE por chamada", async () => {
  const fila = filaDeMentira({ quantos: 100 });
  const meta = metaDeMentira();
  const r = await rodarLote({ fila, entregar: meta.entregar, disparoId: "d1" });
  assert.equal(r.reservados, LOTE);
  assert.equal(r.restam, 100 - LOTE);
  assert.equal(r.acabou, false);
});

// ---------------------------------------------------------------------------
// Fencing: o processo atrasado

test("processo atrasado não reutiliza reserva recuperada e não chama a Meta", async () => {
  const fila = filaDeMentira({ quantos: 1 });
  const meta = metaDeMentira();

  // O processo A reserva e guarda a senha, mas nunca segue adiante: é o
  // processo que travou no meio.
  const [reservada] = await fila.reservar("d1", 1);
  const senhaAntiga = reservada.tentativa_id;

  // Onze minutos depois a reserva vence e é recuperada.
  fila.agora.t += 11 * MINUTO;
  assert.equal(await fila.recuperarReservas(), 1);
  assert.equal(fila.linhas.get(reservada.id).estado, "pendente");

  // O processo A acorda e tenta mandar. A senha dele não vale mais.
  const conseguiu = await fila.marcarEnviando(reservada.id, senhaAntiga);
  assert.equal(conseguiu, false, "a senha antiga não pode autorizar envio");
  assert.equal(meta.chamadas.length, 0, "a Meta não pode ter sido chamada");

  // E o processo B, que reserva de novo, manda uma vez só.
  const r = await rodarLote({ fila, entregar: meta.entregar, disparoId: "d1" });
  assert.equal(r.lote.enviados, 1);
  assert.equal(meta.chamadas.length, 1);
  assert.equal(fila.linhas.get(reservada.id).tentativas, 2);
});

test("reserva vencida não autoriza envio nem antes de ser recuperada", async () => {
  // O prazo é conferido dentro do mesmo comando que escreve `enviando`, então
  // nem depende de a varredura ter rodado.
  const fila = filaDeMentira({ quantos: 1 });
  const [reservada] = await fila.reservar("d1", 1);
  fila.agora.t += 11 * MINUTO;
  assert.equal(await fila.marcarEnviando(reservada.id, reservada.tentativa_id), false);
});

test("a posse é exigida: senha de outra linha não serve", async () => {
  const fila = filaDeMentira({ quantos: 2 });
  const [a, b] = await fila.reservar("d1", 2);
  assert.equal(await fila.marcarEnviando(a.id, b.tentativa_id), false);
  assert.equal(await fila.marcarEnviando(a.id, a.tentativa_id), true);
});

// ---------------------------------------------------------------------------
// Resultado desconhecido

test("timeout da Meta deixa a linha em desconhecido", async () => {
  const fila = filaDeMentira({ quantos: 1 });
  // Uma entrega que nunca responde é exatamente o caso da janela cega.
  const entregar = () => new Promise(() => {});
  const r = await rodarLote({
    fila, entregar, disparoId: "d1", prazoMs: 20, respirar: async () => {},
  });
  assert.equal(r.lote.desconhecidos, 1);
  const l = [...fila.linhas.values()][0];
  assert.equal(l.estado, "desconhecido");
  assert.match(l.motivo, /pode ter sido aceita/);
});

test("desconhecido não é reenviado automaticamente em lote nenhum", async () => {
  const fila = filaDeMentira({ quantos: 1 });
  const entregar = () => new Promise(() => {});
  await rodarLote({ fila, entregar, disparoId: "d1", prazoMs: 20, respirar: async () => {} });

  const meta = metaDeMentira();
  // Mais três lotes, com a Meta funcionando. Nada pode sair.
  for (let i = 0; i < 3; i++) {
    fila.agora.t += 30 * MINUTO;
    const r = await rodarLote({ fila, entregar: meta.entregar, disparoId: "d1" });
    assert.equal(r.reservados, 0);
  }
  assert.equal(meta.chamadas.length, 0);
  assert.equal([...fila.linhas.values()][0].estado, "desconhecido");
});

test("enviando preso vira desconhecido, nunca pendente", async () => {
  const fila = filaDeMentira({ quantos: 1 });
  const [a] = await fila.reservar("d1", 1);
  await fila.marcarEnviando(a.id, a.tentativa_id);

  fila.agora.t += 6 * MINUTO;
  assert.equal(await fila.expirarEnviando(), 1);
  assert.equal(fila.linhas.get(a.id).estado, "desconhecido");

  // A varredura de reservas não pode mexer nisso.
  fila.agora.t += 60 * MINUTO;
  assert.equal(await fila.recuperarReservas(), 0);
  assert.equal(fila.linhas.get(a.id).estado, "desconhecido");
});

test("o status da Meta resolve um desconhecido para enviado", async () => {
  // É a reconciliação: quando o id chega pelo webhook, a dúvida acaba.
  const fila = filaDeMentira({ quantos: 1 });
  const [a] = await fila.reservar("d1", 1);
  await fila.marcarEnviando(a.id, a.tentativa_id);
  fila.agora.t += 6 * MINUTO;
  await fila.expirarEnviando();

  const ok = await fila.concluir(a.id, a.tentativa_id, "enviado", { waMessageId: "wamid.x" });
  assert.equal(ok, true);
  assert.equal(fila.linhas.get(a.id).estado, "enviado");
});

// ---------------------------------------------------------------------------
// Falha do banco

test("banco cai entre enviando e o registro: a linha fica em enviando e o lote para", async () => {
  const fila = filaDeMentira({ quantos: 5 });
  const meta = metaDeMentira();
  fila.quebrar.concluir = true;

  const r = await rodarLote({
    fila, entregar: meta.entregar, disparoId: "d1", respirar: async () => {},
  });

  // Uma mensagem saiu e não foi registrada. O lote não continua: mandar mais
  // mensagens sem onde registrar é o jeito de perder a conta.
  assert.equal(meta.chamadas.length, 1);
  assert.match(r.interrompido, /não registrou/);
  assert.equal(r.acabou, false);
  assert.equal(fila.estados().enviando, 1);

  // E a varredura transforma essa linha no estado honesto.
  fila.quebrar.concluir = false;
  fila.agora.t += 6 * MINUTO;
  assert.equal(await fila.expirarEnviando(), 1);
  assert.equal(fila.estados().desconhecido, 1);
});

test("banco cai antes de autorizar: nenhuma mensagem sai", async () => {
  const fila = filaDeMentira({ quantos: 5 });
  const meta = metaDeMentira();
  fila.quebrar.marcarEnviando = true;

  const r = await rodarLote({ fila, entregar: meta.entregar, disparoId: "d1" });
  assert.equal(meta.chamadas.length, 0);
  assert.match(r.interrompido, /recusou a reserva/);

  // As reservas ficaram abertas, e a varredura as devolve para a fila, porque
  // é certo que nada saiu.
  fila.agora.t += 11 * MINUTO;
  assert.equal(await fila.recuperarReservas(), LOTE > 5 ? 5 : LOTE);
  assert.equal(fila.estados().pendente, 5);
});

// ---------------------------------------------------------------------------
// Classificação de erro

test("4xx é falha definitiva, 5xx e rede são incertos", () => {
  assert.equal(classificarFalha(erroHttp(400, "param", 132000)).estado, "falhou");
  assert.equal(classificarFalha(erroHttp(401, "token")).estado, "falhou");
  assert.equal(classificarFalha(erroHttp(429, "limite")).estado, "falhou");
  assert.equal(classificarFalha(erroHttp(500, "oops")).estado, "desconhecido");
  assert.equal(classificarFalha(erroHttp(503, "oops")).estado, "desconhecido");
  assert.equal(classificarFalha(erroDeRede()).estado, "desconhecido");
  assert.equal(classificarFalha(new Error("qualquer coisa")).estado, "desconhecido");
});

test("o código da Meta chega até o registro", async () => {
  const fila = filaDeMentira({ quantos: 1 });
  const entregar = () => { throw erroHttp(400, "numero sem whatsapp", 131026); };
  const r = await rodarLote({ fila, entregar, disparoId: "d1", respirar: async () => {} });
  assert.equal(r.lote.falhas, 1);
  const l = [...fila.linhas.values()][0];
  assert.equal(l.estado, "falhou");
  assert.equal(l.erro_codigo, "131026");
});

// ---------------------------------------------------------------------------
// Transições

test("transições inválidas são recusadas", () => {
  // O caminho antigo, que permitia o envio duplo, não existe mais.
  assert.equal(transicaoOk("pendente", "enviado"), false);
  // E o que pode ter saído nunca volta para a fila sozinho.
  assert.equal(transicaoOk("desconhecido", "pendente"), false);
  assert.equal(transicaoOk("desconhecido", "reservado"), false);
  assert.equal(transicaoOk("falhou", "enviado"), false);
  assert.equal(transicaoOk("enviado", "pendente"), false);
});

test("as transições que a recuperação precisa existem", () => {
  assert.equal(transicaoOk("pendente", "reservado"), true);
  assert.equal(transicaoOk("reservado", "enviando"), true);
  assert.equal(transicaoOk("reservado", "pendente"), true);
  assert.equal(transicaoOk("enviando", "desconhecido"), true);
  assert.equal(transicaoOk("desconhecido", "enviado"), true);
  assert.equal(transicaoOk("enviado", "falhou"), true);
});

test("o dublê recusa a transição inválida como o trigger recusaria", async () => {
  const fila = filaDeMentira({ quantos: 1 });
  const l = [...fila.linhas.values()][0];
  l.estado = "desconhecido";
  l.tentativa_id = "x";
  await assert.rejects(
    () => fila.concluir(l.id, "x", "pendente"),
    /estado final invalido/,
  );
});

test("o fora da janela é pulado, não falha", async () => {
  const fila = filaDeMentira({ quantos: 3 });
  const meta = metaDeMentira();
  const r = await rodarLote({
    fila, entregar: meta.entregar, disparoId: "d1", respirar: async () => {},
    podeSair: () => "fora da janela de 24h e o disparo não tem template aprovado",
  });
  assert.equal(r.lote.pulados, 3);
  assert.equal(meta.chamadas.length, 0);
  assert.equal(fila.estados().pulado, 3);
});

// ---------------------------------------------------------------------------
// Prazo

test("comPrazo rejeita marcando o prazo e não espera a chamada atrasada", async () => {
  const inicio = Date.now();
  await assert.rejects(
    () => comPrazo(new Promise((r) => setTimeout(r, 5_000)), 20),
    (e) => e.prazo === true,
  );
  assert.ok(Date.now() - inicio < 1_000, "não pode ter esperado a chamada atrasada");
});

test("comPrazo devolve o valor quando a chamada responde em tempo", async () => {
  const r = await comPrazo(Promise.resolve({ ok: 1 }), 1_000);
  assert.deepEqual(r, { ok: 1 });
});

// ---------------------------------------------------------------------------
// Rastro

test("cada tentativa deixa uma linha no rastro", async () => {
  const fila = filaDeMentira({ quantos: 1 });
  const meta = metaDeMentira();

  // Primeira tentativa: travou e foi recuperada.
  const [a] = await fila.reservar("d1", 1);
  fila.agora.t += 11 * MINUTO;
  await fila.recuperarReservas();

  // Segunda: enviou.
  await rodarLote({ fila, entregar: meta.entregar, disparoId: "d1" });

  assert.equal(fila.rastro.length, 2);
  assert.equal(fila.rastro[0].estado_final, "recuperada");
  assert.equal(fila.rastro[0].enviando_em, null);
  assert.equal(fila.rastro[1].estado_final, "enviado");
  assert.notEqual(fila.rastro[1].tentativa_id, a.tentativa_id);
});

test("a tabela de transições cobre os sete estados", () => {
  const estados = ["pendente", "reservado", "enviando", "enviado", "falhou", "pulado", "desconhecido"];
  for (const e of estados) assert.ok(e in TRANSICOES, `falta ${e} na tabela`);
});
