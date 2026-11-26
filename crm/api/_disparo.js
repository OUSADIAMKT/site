// Segurança do envio em massa: reserva, posse e máquina de estados.
//
// Mora num arquivo com underscore porque `api/` está no teto de 12 funções do
// plano Hobby. Quem expõe isto na web continua sendo `painel-conversas.js`.
//
// A regra que organiza o arquivo: nada aqui decide pela memória. Toda mudança
// de estado é uma pergunta ao banco que já traz a resposta escrita, e quem
// recebe `false` não fez nada e não pode seguir. O motivo é que duas execuções
// do mesmo disparo acontecem de verdade: a tela chama o lote em laço, e duas
// pessoas na mesma campanha, ou um recarregar no meio, bastam para existirem
// dois laços ao mesmo tempo.
//
// O que este arquivo não promete: entrega exatamente uma vez. Entre gravar
// `enviando` e ler a resposta da Meta existe uma janela em que a mensagem pode
// ter saído sem que a gente saiba. Nenhuma verificação local fecha isso. O que
// o desenho garante é que o que cai nessa janela nunca é reenviado sozinho.

// A tabela de transições, repetida aqui de propósito.
//
// A autoridade é o trigger em `sql/032_disparo_reserva.sql`: ele vale para
// quem escrever na tabela por qualquer caminho, inclusive pelo painel do
// Supabase. Esta cópia existe para os testes poderem exercitar a máquina sem
// um Postgres na mão, e `test/transicoes.test.js` compara as duas linha por
// linha: se uma mudar sem a outra, o teste quebra.
export const TRANSICOES = {
  pendente: ["reservado", "pulado"],
  reservado: ["enviando", "pendente", "pulado", "falhou"],
  enviando: ["enviado", "falhou", "desconhecido"],
  desconhecido: ["enviado", "falhou"],
  enviado: ["falhou"],
  pulado: ["pendente"],
  falhou: ["pendente"],
};

export function transicaoOk(de, para) {
  if (de === para) return true;
  return (TRANSICOES[de] || []).includes(para);
}

// Quantos por chamada. O limite real é o tempo da função, não o WhatsApp: a
// tela chama de novo até acabar, então lote pequeno só significa mais idas.
export const LOTE = 40;

// Quanto tempo uma reserva vale. Precisa ser maior que o tempo máximo de um
// lote, senão a reserva vence com o processo ainda trabalhando nela e o
// trabalho é jogado fora. O lote tem 40 linhas e 350ms de respiro entre cada
// uma, o que dá 14 segundos de piso; 10 minutos é folga para a Meta lenta.
export const VALIDADE_RESERVA = "10 minutes";

// Quanto tempo um `enviando` espera antes de virar `desconhecido`. Menor que a
// validade da reserva porque aqui o relógio começa na chamada, não na escolha.
export const VALIDADE_ENVIANDO = "5 minutes";

// Prazo de uma chamada à Meta. Sem isto, uma chamada pendurada consome o tempo
// inteiro da função da Vercel e o lote morre no meio sem registrar nada.
export const PRAZO_META_MS = 30_000;

/**
 * Classifica o erro de uma chamada que JÁ saiu.
 *
 * A diferença entre `falhou` e `desconhecido` é se a mensagem pode ter sido
 * aceita. Tratar tudo como falha definitiva seria mentir sobre entrega; tratar
 * tudo como incerto encheria a fila humana de casos resolvidos.
 *
 *   4xx  a Meta entendeu e recusou. A mensagem não saiu. Falha definitiva,
 *        429 incluído: limite de taxa é recusa, não entrega pela metade.
 *   5xx  a Meta quebrou depois de receber. Pode ter enfileirado internamente.
 *   rede sem resposta HTTP nenhuma: timeout, DNS, conexão cortada. Não há como
 *        saber se o pedido chegou.
 */
export function classificarFalha(e) {
  const detalhe = String(e?.message || "erro sem mensagem").slice(0, 300);
  const codigo = e?.codigo != null ? String(e.codigo) : null;
  const status = Number(e?.status || 0);

  if (status >= 400 && status < 500) {
    return { estado: "falhou", codigo, motivo: detalhe };
  }
  if (status >= 500) {
    return {
      estado: "desconhecido",
      codigo,
      motivo: `${detalhe} (erro do servidor da Meta: pode ter sido aceita)`,
    };
  }
  return {
    estado: "desconhecido",
    codigo,
    motivo: `${detalhe} (sem resposta da Meta: pode ter sido aceita)`,
  };
}

/** Corre a promessa contra o relógio. O erro sai marcado como prazo. */
export function comPrazo(promessa, ms) {
  let relogio;
  const prazo = new Promise((_, rejeitar) => {
    relogio = setTimeout(() => {
      const e = new Error(`a Meta não respondeu em ${Math.round(ms / 1000)}s`);
      e.prazo = true;
      rejeitar(e);
    }, ms);
  });
  // O `finally` limpa o timer, mas de propósito NÃO espera a chamada atrasada:
  // ela pode terminar na Meta depois, e é justamente isso que `desconhecido`
  // está dizendo.
  return Promise.race([promessa, prazo]).finally(() => clearTimeout(relogio));
}

/**
 * A fila, falando com o banco.
 *
 * Cada método é uma chamada a uma função do Postgres. O JavaScript não monta
 * `where` de estado em lugar nenhum: a condição de posse mora dentro da função,
 * no mesmo comando que escreve.
 */
export function filaDoBanco(sb) {
  async function rpc(nome, args) {
    const { data, error } = await sb.rpc(nome, args);
    if (error) throw new Error(`${nome}: ${error.message}`);
    return data;
  }

  return {
    async reservar(disparoId, lote) {
      return (await rpc("reservar_envios", { p_disparo: disparoId, p_lote: lote })) || [];
    },
    async marcarEnviando(envioId, tentativa) {
      return (await rpc("marcar_enviando", {
        p_envio: envioId, p_tentativa: tentativa, p_validade: VALIDADE_RESERVA,
      })) === true;
    },
    async concluir(envioId, tentativa, estado, { waMessageId = null, motivo = null, codigo = null } = {}) {
      return (await rpc("concluir_envio", {
        p_envio: envioId, p_tentativa: tentativa, p_estado: estado,
        p_wa_message_id: waMessageId, p_motivo: motivo, p_erro_codigo: codigo,
      })) === true;
    },
    async encerrar(envioId, tentativa, estado, motivo = null) {
      return (await rpc("encerrar_reserva", {
        p_envio: envioId, p_tentativa: tentativa, p_estado: estado, p_motivo: motivo,
      })) === true;
    },
    async recuperarReservas(disparoId) {
      return (await rpc("recuperar_reservas", {
        p_disparo: disparoId, p_validade: VALIDADE_RESERVA,
      })) || 0;
    },
    async expirarEnviando(disparoId) {
      return (await rpc("expirar_enviando", {
        p_disparo: disparoId, p_validade: VALIDADE_ENVIANDO,
      })) || 0;
    },
    async contarPendentes(disparoId) {
      const { count, error } = await sb.from("disparo_envios")
        .select("id", { count: "exact", head: true })
        .eq("disparo_id", disparoId).eq("estado", "pendente");
      if (error) throw new Error(`contarPendentes: ${error.message}`);
      return count || 0;
    },
  };
}

/**
 * Roda um lote. Não conhece Supabase nem a Cloud API: recebe a fila e a
 * entrega prontas, que é o que torna a coisa testável sem Postgres e sem
 * mandar mensagem para ninguém.
 *
 * A ordem dos passos é o desenho inteiro:
 *
 *   1. varre reservas e envios vencidos, antes de pegar trabalho novo;
 *   2. reserva o lote num comando atômico;
 *   3. para cada linha: decide se pode sair; grava `enviando` ANTES de chamar;
 *   4. se o banco recusou a posse, não chama a Meta e passa adiante;
 *   5. chama a Meta com prazo;
 *   6. fecha a tentativa com o que aconteceu de verdade.
 *
 * O passo 4 é o que impede um processo atrasado de mandar duas vezes: a
 * recuperação da reserva anulou a senha dele.
 */
export async function rodarLote({
  fila,
  entregar,
  disparoId,
  podeSair = () => true,
  prazoMs = PRAZO_META_MS,
  respirar = async () => {},
}) {
  const recuperadas = await fila.recuperarReservas(disparoId);
  const expirados = await fila.expirarEnviando(disparoId);

  const reservados = await fila.reservar(disparoId, LOTE);

  const conta = { enviados: 0, falhas: 0, pulados: 0, desconhecidos: 0, perdidos: 0 };
  let interrompido = null;

  for (const envio of reservados) {
    const motivoPulo = podeSair(envio);
    if (motivoPulo !== true) {
      await fila.encerrar(envio.id, envio.tentativa_id, "pulado", String(motivoPulo));
      conta.pulados++;
      continue;
    }

    // A posse é conferida e o `enviando` é gravado antes de qualquer chamada
    // externa. False aqui significa que esta linha não é mais nossa.
    let meu;
    try {
      meu = await fila.marcarEnviando(envio.id, envio.tentativa_id);
    } catch (e) {
      // Banco fora do ar: parar é a única resposta honesta. Continuar seria
      // mandar mensagens que não temos onde registrar.
      interrompido = `o banco recusou a reserva: ${e.message}`;
      break;
    }
    if (!meu) {
      conta.perdidos++;
      continue;
    }

    let resultado = null;
    let falha = null;
    try {
      await respirar();
      resultado = await comPrazo(entregar(envio), prazoMs);
    } catch (e) {
      falha = classificarFalha(e);
    }

    try {
      if (falha) {
        await fila.concluir(envio.id, envio.tentativa_id, falha.estado, {
          motivo: falha.motivo, codigo: falha.codigo,
        });
        if (falha.estado === "falhou") conta.falhas++;
        else conta.desconhecidos++;
      } else {
        const id = resultado?.messages?.[0]?.id || null;
        await fila.concluir(envio.id, envio.tentativa_id, "enviado", { waMessageId: id });
        conta.enviados++;
      }
    } catch (e) {
      // A mensagem saiu e o banco não aceitou o registro. A linha fica em
      // `enviando` e `expirar_enviando` vai transformá-la em `desconhecido`
      // na próxima varredura. É o estado certo: não sabemos o que aconteceu
      // com ela, e ninguém vai reenviar.
      interrompido = `a mensagem saiu mas o banco não registrou: ${e.message}`;
      break;
    }
  }

  const restam = await fila.contarPendentes(disparoId);

  return {
    lote: conta,
    recuperadas,
    expirados,
    reservados: reservados.length,
    restam,
    acabou: restam === 0 && !interrompido,
    interrompido,
  };
}
