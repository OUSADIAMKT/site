import type { CategoriaCap1 } from "./tipos";

/**
 * Conteúdo de autoconfiança e autoestima, um bloco por categoria do
 * capítulo 1 ("Como eu me vejo") — é o capítulo mais ligado a como o aluno
 * enxerga a si mesmo. Cada bloco tem: perguntas pra se questionar (sem
 * cobrança, só reflexão), um desafio pra sustentar por 21 dias (hábito
 * pequeno e repetível, não uma virada radical) e 2 atividades de impacto
 * imediato (dá pra fazer hoje ou nesta semana).
 */
export type BlocoConfianca = {
  perguntas: string[];
  desafio: { titulo: string; descricao: string };
  atividades: string[];
};

export const CAP1_CONFIANCA: Record<CategoriaCap1, BlocoConfianca> = {
  CONSCIENTE: {
    perguntas: [
      "Quando foi a última vez que você comemorou uma vitória pequena, sem esperar algo grande?",
      "Existe alguma qualidade sua que você conhece bem, mas ainda não usou a seu favor?",
      "O que mudaria se você tratasse suas qualidades com a mesma seriedade que trata seus defeitos?",
    ],
    desafio: {
      titulo: "Diário de conquistas",
      descricao:
        "Todo dia, por 21 dias, escreva 1 frase sobre algo que você fez bem, por menor que pareça. No fim, releia tudo de uma vez.",
    },
    atividades: [
      "Hoje: escreva 3 qualidades suas e mostre pra alguém de confiança.",
      "Essa semana: aceite um elogio sem minimizar, só dizendo \"obrigado(a)\".",
    ],
  },
  AUTOCRITICO: {
    perguntas: [
      "Se um(a) amigo(a) cometesse o mesmo erro que você, o que você diria pra ele(a)?",
      "Quantas vezes por dia você se elogia, comparado a quantas vezes se cobra?",
      "De onde veio essa voz que te julga tão forte? Ela é sua, ou você aprendeu ela com alguém?",
    ],
    desafio: {
      titulo: "Diário anti-autocrítica",
      descricao:
        "Todo dia, por 21 dias, antes de dormir, escreva 1 coisa que você fez bem hoje. Sem usar a palavra \"mas\" depois.",
    },
    atividades: [
      "Hoje: da próxima vez que se pegar se cobrando, pare e pergunte \"eu falaria isso pra um(a) amigo(a)?\"",
      "Essa semana: peça um feedback sincero pra alguém e anote só os pontos positivos que ouvir.",
    ],
  },
  DESCOBERTA: {
    perguntas: [
      "O que as pessoas mais elogiam em você, mesmo que você ainda não veja isso em si mesmo(a)?",
      "Qual foi a última vez que você se surpreendeu consigo mesmo(a)?",
      "Se você tivesse que ensinar algo pra alguém amanhã, o que seria?",
    ],
    desafio: {
      titulo: "Coleta de espelhos",
      descricao:
        "Ao longo de 21 dias, pergunte a pessoas diferentes: \"o que você acha que eu faço bem?\". Anote todas as respostas num só lugar.",
    },
    atividades: [
      "Hoje: experimente algo que você nunca fez, só pra descobrir se gosta.",
      "Essa semana: releia mensagens antigas em que alguém te elogiou.",
    ],
  },
  TRANQUILO: {
    perguntas: [
      "Quando você diz \"tá tudo bem\", é sempre verdade, ou às vezes é só pra não se aprofundar?",
      "O que você sente quando algo realmente te incomoda, mas você não para pra pensar nisso?",
      "Se você se permitisse sentir mais fundo por 5 minutos, o que apareceria?",
    ],
    desafio: {
      titulo: "Check-in emocional diário",
      descricao:
        "Todo dia, por 21 dias, reserve 5 minutos pra responder por escrito: \"o que eu realmente senti hoje?\", sem se distrair no meio.",
    },
    atividades: [
      "Hoje: nomeie uma emoção que você sentiu, mesmo pequena, em voz alta ou por escrito.",
      "Essa semana: converse com alguém sobre algo que te incomodou, mesmo que pareça bobo.",
    ],
  },
};
