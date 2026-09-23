import type { Pergunta } from "./tipos";

/** Metadados dos 5 capítulos: nome exibido e introdução curta de cada bloco. */
export const CAPITULOS = {
  1: {
    nome: "Capítulo 1: Como eu me vejo",
    intro: "Sem resposta certa. Pense em quem você é hoje, não em quem esperam que você seja.",
  },
  2: {
    nome: "Capítulo 2: Meu caminho",
    intro: "Como você está lidando com o que vem depois do ensino médio, mesmo sem ter tudo resolvido.",
  },
  3: {
    nome: "Capítulo 3: Sucesso e expectativas",
    intro: "De quem é a régua que você usa pra saber se está indo bem.",
  },
  4: {
    nome: "Capítulo 4: Meu jeito de ser",
    intro: "Escolha a frase que é MAIS você, mesmo que as duas pareçam um pouco.",
  },
  5: {
    nome: "Capítulo 5: Em poucas palavras",
    intro: "Duas perguntas abertas e opcionais. Responda com o que vier de verdade.",
  },
} as const;

export const PERGUNTAS: Pergunta[] = [
  // ---- Capítulo 1: Como eu me vejo ----
  {
    tipo: "escolha",
    capitulo: 1,
    chave: "q1",
    titulo: "Quando alguém te elogia:",
    opcoes: [
      { texto: "Fico surpreso(a), nunca tinha pensado isso sobre mim", categoria: "DESCOBERTA" },
      { texto: "Agradeço e concordo, sei que é verdade", categoria: "CONSCIENTE" },
      { texto: "Fico feliz, sem pensar muito no assunto", categoria: "TRANQUILO" },
      { texto: "Fico sem graça e acho que a pessoa exagerou", categoria: "AUTOCRITICO" },
    ],
  },
  {
    tipo: "escolha",
    capitulo: 1,
    chave: "q2",
    titulo: "Se tivesse que se descrever para alguém novo, você:",
    opcoes: [
      { texto: "Falaria mais dos meus defeitos do que das qualidades", categoria: "AUTOCRITICO" },
      { texto: "Diria que ainda estou me conhecendo", categoria: "DESCOBERTA" },
      { texto: "Falaria das minhas qualidades e do que quero melhorar, numa boa", categoria: "CONSCIENTE" },
      { texto: "Falaria de mim com leveza, sem entrar em detalhes", categoria: "TRANQUILO" },
    ],
  },
  {
    tipo: "escolha",
    capitulo: 1,
    chave: "q3",
    titulo: "Quando você erra ou falha em algo:",
    opcoes: [
      { texto: "Não esquento a cabeça, logo passa", categoria: "TRANQUILO" },
      { texto: "Fico repassando o erro e me cobro muito", categoria: "AUTOCRITICO" },
      { texto: "Entendo o que aconteceu e sigo em frente", categoria: "CONSCIENTE" },
      { texto: "Fico mal, mas nem sempre entendo por quê", categoria: "DESCOBERTA" },
    ],
  },

  // ---- Capítulo 2: Meu caminho ----
  {
    tipo: "escolha",
    capitulo: 2,
    chave: "q4",
    titulo: "Qual frase parece mais com você agora?",
    opcoes: [
      { texto: "Tenho um sonho claro e estou me preparando para começar", categoria: "SONHADOR" },
      { texto: "Faço muita coisa e aproveito as oportunidades que aparecem", categoria: "OCUPADO" },
      { texto: "Sei o que quero e já dou passos concretos nessa direção", categoria: "PROTAGONISTA" },
      { texto: "Estou experimentando coisas, e tudo bem não ter certeza", categoria: "EXPLORADOR" },
    ],
  },
  {
    tipo: "escolha",
    capitulo: 2,
    chave: "q5",
    titulo: "Seu tempo livre geralmente vai para:",
    opcoes: [
      { texto: "Coisas ligadas ao que quero ser no futuro", categoria: "PROTAGONISTA" },
      { texto: "Testar coisas diferentes, sem compromisso", categoria: "EXPLORADOR" },
      { texto: "Imaginar meu futuro, mas pratico pouco", categoria: "SONHADOR" },
      { texto: "Várias atividades, mas nem sempre as que importam pra mim", categoria: "OCUPADO" },
    ],
  },
  {
    tipo: "escolha",
    capitulo: 2,
    chave: "q6",
    titulo: 'Quando perguntam "o que você vai fazer depois do ensino médio?":',
    opcoes: [
      { texto: "Digo várias possibilidades, depende do que aparecer", categoria: "OCUPADO" },
      { texto: "Tenho uma resposta clara, mas não sei como chegar lá", categoria: "SONHADOR" },
      { texto: "Digo que ainda estou descobrindo", categoria: "EXPLORADOR" },
      { texto: "Respondo com convicção e explico meu plano", categoria: "PROTAGONISTA" },
    ],
  },

  // ---- Capítulo 3: Sucesso e expectativas ----
  {
    tipo: "escolha",
    capitulo: 3,
    chave: "q7",
    titulo: '"Vou me sentir bem-sucedido(a) quando…"',
    opcoes: [
      { texto: "…alcançar o que esperam de mim", categoria: "PRESSIONADO" },
      { texto: "…estiver fazendo algo que faça sentido pra mim", categoria: "AUTONOMO" },
      { texto: "…provar que meu caminho também dá certo", categoria: "CONFLITO" },
      { texto: "…deixar minha família orgulhosa, que é o que eu também quero", categoria: "ALINHADO" },
    ],
  },
  {
    tipo: "escolha",
    capitulo: 3,
    chave: "q8",
    titulo: "Se sua escolha de curso fosse diferente do que sua família espera:",
    opcoes: [
      { texto: "Acho que não aconteceria, porque queremos coisas parecidas", categoria: "ALINHADO" },
      { texto: "Acabaria cedendo para não decepcionar", categoria: "PRESSIONADO" },
      { texto: "Seguiria meu caminho, conversando com eles com calma", categoria: "AUTONOMO" },
      { texto: "Seguiria meu caminho, mas com muita briga ou culpa", categoria: "CONFLITO" },
    ],
  },
  {
    tipo: "escolha",
    capitulo: 3,
    chave: "q9",
    titulo: 'Quando vê colegas ou influenciadores "dando certo":',
    opcoes: [
      { texto: "Me sinto atrasado(a)", categoria: "PRESSIONADO" },
      { texto: "Me inspiro, mas sei que cada um tem seu ritmo", categoria: "AUTONOMO" },
      { texto: "Sinto que preciso provar que minhas escolhas também funcionam", categoria: "CONFLITO" },
      { texto: "Me ajuda a ver o que é esperado, e isso me orienta", categoria: "ALINHADO" },
    ],
  },

  // ---- Capítulo 4: Meu jeito de ser (escolha forçada, 1 pergunta por dimensão) ----
  {
    tipo: "forcada",
    capitulo: 4,
    chave: "q10",
    dimensao: "EI",
    a: { letra: "E", texto: "Recarrego com amigos, conversa e movimento" },
    b: { letra: "I", texto: "Recarrego sozinho(a) ou com poucas pessoas" },
  },
  {
    tipo: "forcada",
    capitulo: 4,
    chave: "q11",
    dimensao: "SN",
    a: { letra: "S", texto: "Gosto de fatos e do que funciona na prática" },
    b: { letra: "N", texto: "Gosto de ideias e possibilidades" },
  },
  {
    tipo: "forcada",
    capitulo: 4,
    chave: "q12",
    dimensao: "TF",
    a: { letra: "T", texto: "Decido pelo que é mais lógico e justo" },
    b: { letra: "F", texto: "Decido pensando em como as pessoas vão se sentir" },
  },
  {
    tipo: "forcada",
    capitulo: 4,
    chave: "q13",
    dimensao: "JP",
    a: { letra: "J", texto: "Gosto de planejar e adiantar as tarefas" },
    b: { letra: "P", texto: "Deixo em aberto e rendo bem sob pressão" },
  },

  // ---- Capítulo 5: Em poucas palavras (abertas, opcionais) ----
  {
    tipo: "aberta",
    capitulo: 5,
    chave: "q14",
    titulo: "Uma coisa que eu gosto em mim é…",
    placeholder: "Pode ser qualquer coisa, grande ou pequena.",
  },
  {
    tipo: "aberta",
    capitulo: 5,
    chave: "q15",
    titulo: "Daqui a 5 anos eu gostaria de…",
    placeholder: "Sem compromisso: é um retrato de hoje, não uma promessa.",
  },
];

export const TOTAL_PERGUNTAS = PERGUNTAS.length;
