// Dublê da fila: a mesma interface de `filaDoBanco`, em memória.
//
// O que ele prova e o que ele NÃO prova, dito de frente.
//
// PROVA: que a orquestração em `rodarLote` nunca chama a Meta sem ter a posse
// confirmada pelo banco, que uma reserva recuperada exclui o processo antigo,
// que `desconhecido` nunca é reenviado, e que transição inválida é recusada.
// Essas são propriedades do código, e o dublê as exercita de verdade porque
// importa a tabela de transições do próprio módulo, não uma cópia.
//
// NÃO PROVA: que o `for update skip locked` do Postgres é atômico. Isso é
// propriedade do banco, e só um Postgres de verdade responde. O dublê assume
// a atomicidade (a reserva aqui é uma seção síncrona) e testa o que vem
// depois. O teste da atomicidade mora em `test/concorrencia.js` e precisa de
// banco.

import { transicaoOk, VALIDADE_RESERVA, VALIDADE_ENVIANDO } from "../api/_disparo.js";

const MINUTO = 60_000;

function minutos(texto) {
  const n = Number(String(texto).match(/\d+/)?.[0] || 0);
  return n * MINUTO;
}

let semente = 0;
function novaSenha() {
  semente += 1;
  return `tentativa-${semente}`;
}

export function filaDeMentira({ quantos = 10, disparoId = "d1", relogio } = {}) {
  const agora = relogio || { t: Date.UTC(2026, 10, 19, 12, 0, 0) };

  const linhas = new Map();
  for (let i = 1; i <= quantos; i++) {
    const id = `e${String(i).padStart(4, "0")}`;
    linhas.set(id, {
      id,
      disparo_id: disparoId,
      telefone: `+55939000${String(i).padStart(4, "0")}`,
      estado: "pendente",
      tentativa_id: null,
      reservado_em: null,
      atualizado_em: null,
      tentativas: 0,
      wa_message_id: null,
      motivo: null,
      erro_codigo: null,
    });
  }

  const rastro = [];
  // Interruptores para simular banco fora do ar num ponto específico.
  const quebrar = { marcarEnviando: false, concluir: false };

  function aplicar(linha, para) {
    if (!transicaoOk(linha.estado, para)) {
      throw new Error(`transicao de envio invalida: ${linha.estado} -> ${para} (envio ${linha.id})`);
    }
    linha.estado = para;
    linha.atualizado_em = agora.t;
  }

  const fila = {
    linhas,
    rastro,
    quebrar,
    agora,

    estados() {
      const conta = {};
      for (const l of linhas.values()) conta[l.estado] = (conta[l.estado] || 0) + 1;
      return conta;
    },

    async reservar(_disparo, lote) {
      const escolhidas = [];
      for (const l of [...linhas.values()].sort((a, b) => a.id.localeCompare(b.id))) {
        if (escolhidas.length >= lote) break;
        if (l.estado !== "pendente") continue;
        aplicar(l, "reservado");
        l.tentativa_id = novaSenha();
        l.reservado_em = agora.t;
        l.tentativas += 1;
        l.motivo = null;
        rastro.push({
          envio_id: l.id, tentativa_id: l.tentativa_id, numero: l.tentativas,
          reservada_em: agora.t, enviando_em: null, terminada_em: null, estado_final: null,
        });
        escolhidas.push({ ...l });
      }
      return escolhidas;
    },

    async marcarEnviando(envioId, tentativa) {
      if (quebrar.marcarEnviando) throw new Error("banco indisponivel");
      const l = linhas.get(envioId);
      if (!l) return false;
      const valeAte = (l.reservado_em || 0) + minutos(VALIDADE_RESERVA);
      if (l.tentativa_id !== tentativa || l.estado !== "reservado" || agora.t >= valeAte) {
        return false;
      }
      aplicar(l, "enviando");
      const t = rastro.find((x) => x.envio_id === envioId && x.tentativa_id === tentativa);
      if (t) t.enviando_em = agora.t;
      return true;
    },

    async concluir(envioId, tentativa, estado, { waMessageId = null, motivo = null, codigo = null } = {}) {
      if (quebrar.concluir) throw new Error("banco indisponivel");
      if (!["enviado", "falhou", "desconhecido"].includes(estado)) {
        throw new Error(`estado final invalido: ${estado}`);
      }
      const l = linhas.get(envioId);
      if (!l || l.tentativa_id !== tentativa) return false;
      const podeDeDesconhecido = l.estado === "desconhecido" && estado === "enviado" && waMessageId;
      if (l.estado !== "enviando" && !podeDeDesconhecido) return false;

      aplicar(l, estado);
      l.wa_message_id = waMessageId || l.wa_message_id;
      l.motivo = motivo;
      l.erro_codigo = codigo;
      const t = rastro.find((x) => x.envio_id === envioId && x.tentativa_id === tentativa);
      if (t) { t.terminada_em = agora.t; t.estado_final = estado; }
      return true;
    },

    async encerrar(envioId, tentativa, estado, motivo = null) {
      if (!["pulado", "falhou", "pendente"].includes(estado)) {
        throw new Error(`estado invalido para encerrar reserva: ${estado}`);
      }
      const l = linhas.get(envioId);
      if (!l || l.tentativa_id !== tentativa || l.estado !== "reservado") return false;
      aplicar(l, estado);
      l.motivo = motivo;
      if (estado === "pendente") { l.tentativa_id = null; l.reservado_em = null; }
      const t = rastro.find((x) => x.envio_id === envioId && x.tentativa_id === tentativa);
      if (t) { t.terminada_em = agora.t; t.estado_final = estado; }
      return true;
    },

    async recuperarReservas() {
      let quantas = 0;
      for (const l of linhas.values()) {
        if (l.estado !== "reservado") continue;
        if (agora.t - (l.reservado_em || 0) < minutos(VALIDADE_RESERVA)) continue;
        aplicar(l, "pendente");
        const t = rastro.find((x) => x.tentativa_id === l.tentativa_id);
        if (t) { t.terminada_em = agora.t; t.estado_final = "recuperada"; }
        // Anular a senha é o que exclui o processo antigo.
        l.tentativa_id = null;
        l.reservado_em = null;
        l.motivo = "reserva recuperada por prazo vencido";
        quantas += 1;
      }
      return quantas;
    },

    async expirarEnviando() {
      let quantas = 0;
      for (const l of linhas.values()) {
        if (l.estado !== "enviando") continue;
        if (agora.t - (l.atualizado_em || 0) < minutos(VALIDADE_ENVIANDO)) continue;
        aplicar(l, "desconhecido");
        l.motivo = "sem resposta da Meta dentro do prazo; pode ter sido entregue";
        const t = rastro.find((x) => x.tentativa_id === l.tentativa_id);
        if (t) { t.terminada_em = agora.t; t.estado_final = "desconhecido"; }
        quantas += 1;
      }
      return quantas;
    },

    async contarPendentes() {
      let n = 0;
      for (const l of linhas.values()) if (l.estado === "pendente") n += 1;
      return n;
    },
  };

  return fila;
}

/** Uma Meta de mentira. Registra para quem foi chamada e nunca sai da máquina. */
export function metaDeMentira({ responder } = {}) {
  const chamadas = [];
  let n = 0;
  async function entregar(envio) {
    chamadas.push(envio.telefone);
    n += 1;
    if (responder) return responder(envio, n);
    return { messages: [{ id: `wamid.teste.${n}` }] };
  }
  return { entregar, chamadas };
}

export function erroHttp(status, mensagem, codigo = null) {
  const e = new Error(`Cloud API ${status}: ${mensagem}`);
  e.status = status;
  e.codigo = codigo;
  return e;
}

export function erroDeRede(mensagem = "fetch failed") {
  const e = new Error(`Cloud API sem resposta: ${mensagem}`);
  e.rede = true;
  return e;
}
