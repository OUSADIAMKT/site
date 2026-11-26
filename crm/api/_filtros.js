// As regras de filtro, ordem e situação dos cartões. Um arquivo só, no lado do
// servidor, porque é o servidor que decide o que a pessoa pode ver.
//
// `src/filtros.js` reexporta tudo daqui. Duas cópias divergiam na primeira vez
// que alguém mexesse num limiar: a tela mostrava uma coisa e o contador dizia
// outra, e aí ninguém mais confia no contador.
//
// Nada aqui lê o relógio do sistema por conta própria: `agora` entra por
// parâmetro. É o que permite provar o calor da janela de 24h num teste em vez
// de esperar vinte horas para a barra mudar de cor.

const HORA = 3_600_000;

// Faixa pronta em vez de campo de data. Ninguém digita "de 14:00 até agora"
// para achar quem está esperando demais: o que se pergunta é "quem está parado
// há muito tempo", e muito tempo tem três tamanhos.
export const TEMPOS = [
  { valor: "", rotulo: "Qualquer espera" },
  { valor: "1", rotulo: "Esperando +1h" },
  { valor: "4", rotulo: "Esperando +4h" },
  { valor: "24", rotulo: "Esperando +24h" },
];

// A janela da Meta é outra coisa, e por isso é outro seletor. Tempo de espera
// é quanto tempo a pessoa está parada aqui dentro; janela é quanto tempo o
// WhatsApp ainda deixa responder sem modelo aprovado. Juntar os dois num
// seletor só, como estava, fazia "mais de 24h" parecer falar da janela.
export const JANELAS = [
  { valor: "", rotulo: "Qualquer janela" },
  { valor: "aberta", rotulo: "Janela aberta" },
  { valor: "fechando", rotulo: "Janela fechando (2h)" },
  { valor: "fechada", rotulo: "Janela fechada" },
];

export const ORDENS = [
  { valor: "", rotulo: "Ordem da coluna" },
  { valor: "recente", rotulo: "Mensagem mais recente" },
  { valor: "espera", rotulo: "Maior espera" },
  { valor: "janela", rotulo: "Janela fechando antes" },
];

// Quando a janela entra na faixa amarela. Duas horas é o que sobra para
// alguém ler, pensar e responder antes de precisar de modelo aprovado.
export const FECHANDO_HORAS = 2;

// A partir de quanto tempo sem resposta o atendimento está atrasado. Uma hora
// é o mesmo limiar que o painel já usa para avisar de conversa parada.
export const ATRASO_MIN = 60;

export const FILTRO_VAZIO = {
  busca: "", canal: "", atendente: "", etiqueta: "",
  tempo: "", janela: "", parados: false, naoLidas: false,
};

export function algumFiltro(f) {
  return Boolean(f.busca || f.canal || f.atendente || f.etiqueta
    || f.tempo || f.janela || f.parados || f.naoLidas);
}

/**
 * Desde quando este item está esperando.
 *
 * Cada coluna guarda a espera num campo diferente, e é de propósito: na fila é
 * desde que entrou na fila, com a equipe é desde que foi assumida, com a IA é
 * desde a última mensagem, e no encerrado é quando fechou. O primeiro campo
 * que existe é o certo para aquele cartão.
 */
export function esperaDesde(item) {
  return item.fila_desde || item.assumida_em || item.ultima_em || item.encerrada_em || null;
}

export function horasDeEspera(item, agora) {
  const quando = esperaDesde(item);
  if (!quando) return null;
  return (agora - new Date(quando).getTime()) / HORA;
}

/** Horas que faltam para a janela da Meta fechar. `null` quando não há janela. */
export function horasDeJanela(item, agora) {
  if (!item.janela_expira_em) return null;
  return (new Date(item.janela_expira_em).getTime() - agora) / HORA;
}

/**
 * Em que situação a janela está: aberta, fechando ou fechada.
 *
 * `null` quando o canal não tem janela. No Instagram ela não existe, e dizer
 * "aberta" ali seria inventar uma garantia que a Meta não dá.
 */
export function situacaoDaJanela(item, agora) {
  const horas = horasDeJanela(item, agora);
  if (horas === null) return null;
  if (horas <= 0) return "fechada";
  if (horas < FECHANDO_HORAS) return "fechando";
  return "aberta";
}

/** Atendimento atrasado: tem gente falando sozinha há mais de uma hora. */
export function atrasado(item, agora) {
  const n = item.sem_resposta || 0;
  if (n <= 0) return false;
  if (!item.sem_resposta_desde) return false;
  return (agora - new Date(item.sem_resposta_desde).getTime()) / 60000 >= ATRASO_MIN;
}

/**
 * Decide se um cartão ou conversa passa pelo filtro.
 *
 * A busca não está aqui de propósito: ela vai ao banco, porque procurar alguém
 * que ficou atrás do corte e não achar é pior que não ter busca.
 */
export function passaNoFiltro(item, f, agora = Date.now()) {
  // "Só o que está esperando resposta" é a pergunta que quem atende faz mais
  // vezes por dia, e por isso é um botão e não um menu.
  if (f.parados && !((item.sem_resposta || 0) > 0)) return false;

  // Não lida é outra coisa: é de quem está olhando, não da conversa. Uma
  // conversa pode estar respondida e não lida, ou lida e sem resposta.
  if (f.naoLidas && !((item.nao_lidas || 0) > 0 || item.marcada)) return false;

  if (f.canal === "whatsapp" && item.canal === "instagram") return false;
  if (f.canal === "instagram" && item.canal !== "instagram") return false;

  if (f.atendente) {
    const dele = item.atendente_nome || item.atendente || null;
    if (f.atendente === "sem" ? Boolean(dele) : dele !== f.atendente) return false;
  }

  if (f.etiqueta && !(item.etiquetas || []).includes(f.etiqueta)) return false;

  if (f.tempo) {
    const horas = horasDeEspera(item, agora);
    if (horas === null || horas < Number(f.tempo)) return false;
  }

  // Cartão sem janela não responde a uma pergunta sobre janela. Deixar ele
  // passar faria "só janela fechada" mostrar Instagram, que nunca fecha.
  if (f.janela && situacaoDaJanela(item, agora) !== f.janela) return false;

  return true;
}
