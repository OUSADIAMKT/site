// Um canal é só um jeito de entregar: texto, mídia e "digitando…".
//
// O motor (`_agente.js`) e as ferramentas (`_ferramentas.js`) não sabem em qual
// canal estão. É isso que faz o Instagram entrar depois sem encostar neles, e
// é isso que faz o teste pelo terminal rodar exatamente o mesmo código que o
// WhatsApp roda em produção.
//
// Quem resolve o canal é quem recebeu o evento: o webhook, o painel ou o script.

import {
  enviarTexto, enviarMidia, marcarLidaEDigitando,
  dividirEmBaloes, tempoDeDigitacao, esperar,
} from "./_wa.js";
import {
  enviarTextoIG, enviarMidiaIG, digitandoIG, marcarLidaIG,
} from "./_ig.js";

/**
 * Abre o canal de uma conversa.
 *
 * @param {object} p
 * @param {string} p.canal      'whatsapp' | 'instagram' | 'teste'
 * @param {object} p.cliente    linha de `clientes`, com as credenciais
 * @param {string} p.contato    telefone no WhatsApp, IGSID no Instagram
 * @param {string} [p.referencia] id da mensagem recebida, para marcar lida
 * @returns {{nome: string, texto: Function, midia: Function, digitando: Function, emBaloes: Function}}
 */
export function abrirCanal({ canal, cliente, contato, referencia }) {
  if (canal === "teste") return canalTeste();
  if (canal === "whatsapp") return canalWhatsapp(cliente, contato, referencia);
  if (canal === "instagram") return canalInstagram(cliente, contato);

  // Falhar alto é melhor que entregar no canal errado: uma mensagem de um
  // cliente no Instagram de outro é um incidente, não um bug.
  throw new Error(`Canal não implementado: ${canal}`);
}

function canalWhatsapp(cliente, contato, referencia) {
  const digitando = async () => {
    if (!referencia) return;
    // O indicador é cortesia: se falhar, a resposta ainda tem que sair.
    await marcarLidaEDigitando(cliente, referencia).catch((e) =>
      console.warn("[canal] typing falhou:", e.message));
  };

  // Devolve o id que a Meta deu à mensagem. É por ele que o evento de entrega,
  // que chega depois e separado, acha a linha no banco para carimbar. Sem isso
  // o status chegava e não tinha onde pousar.
  const texto = async (t) => idDaResposta(await enviarTexto(cliente, contato, t));

  return {
    nome: "whatsapp",
    texto,
    midia: async (m) => idDaResposta(await enviarMidia(cliente, contato, m)),
    digitando,
    pausa: (t) => esperar(tempoDeDigitacao(t)),
    emBaloes: (t) => emBaloes(t, texto, digitando),
  };
}

function canalInstagram(cliente, contato) {
  // Devolve null de propósito. O Instagram também dá um id ao envio, mas o
  // carimbo de entrega que a gente guarda é da Cloud API do WhatsApp: deixar o
  // id do Instagram entrar na mesma lista encheria a coluna de id que nenhum
  // evento de status vai procurar.
  const texto = async (t) => { await enviarTextoIG(cliente, contato, t); return null; };
  const digitando = async () => {
    await digitandoIG(cliente, contato).catch((e) =>
      console.warn("[canal] typing do Instagram falhou:", e.message));
  };

  return {
    nome: "instagram",
    texto,
    midia: (m) => enviarMidiaIG(cliente, contato, m),
    digitando: async () => {
      await marcarLidaIG(cliente, contato).catch(() => {});
      await digitando();
    },
    pausa: (t) => esperar(tempoDeDigitacao(t)),
    emBaloes: (t) => emBaloes(t, texto, digitando),
  };
}

function canalTeste() {
  const texto = async (t) => { console.log(`bot   ${t}`); };
  return {
    nome: "teste",
    texto,
    midia: async (m) => {
      console.log(`      ⟶ [${m.tipo}] ${m.chave}${m.legenda ? `: "${m.legenda}"` : ""}`);
    },
    digitando: async () => {},
    // No terminal não existe espera: ninguém quer esperar 6 segundos para ler
    // a própria mensagem de teste.
    pausa: async () => {},
    emBaloes: async (t) => { for (const b of dividirEmBaloes(t)) await texto(b); },
  };
}

// O id que a Meta devolve no envio, quando devolve. Instagram e o canal de
// teste não devolvem nada parecido, e tudo bem: sem id, não há o que carimbar.
function idDaResposta(r) {
  return r?.messages?.[0]?.id || null;
}

// Uma resposta longa num balão só entrega o bot. Aqui ela vira duas ou três
// mensagens, com o "digitando…" e a pausa entre elas.
//
// Devolve os ids dos balões que saíram, na ordem. Se o terceiro falhar, o erro
// sobe e os dois primeiros ficam sem registro: é o comportamento certo, porque
// quem chama trata a falha inteira em vez de registrar entrega pela metade.
async function emBaloes(t, enviar, digitando) {
  const baloes = dividirEmBaloes(t);
  const ids = [];
  for (const [i, balao] of baloes.entries()) {
    // A primeira mensagem também espera. Resposta que chega no mesmo segundo em
    // que a pessoa mandou é o que entrega o robô, por mais bem escrita que seja:
    // ninguém lê e digita quatro linhas em 400 milissegundos. O tempo sai do
    // tamanho do que vai ser dito, então mensagem curta volta rápido e texto
    // longo demora, que é como gente de verdade responde.
    await digitando();
    await esperar(tempoDeDigitacao(balao));
    ids.push(await enviar(balao));
  }
  return ids.filter(Boolean);
}
