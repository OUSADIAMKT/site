import type {
  CategoriaCap1,
  CategoriaCap2,
  CategoriaCap3,
  Dimensao,
  Grupo,
  Letra,
} from "./tipos";

/* ------------------------------------------------------------------ *
 * Capítulo 1 — Como eu me vejo
 * ------------------------------------------------------------------ */

export const CAP1_TEXTO: Record<
  CategoriaCap1,
  { titulo: string; resumo: string; oQueDiz: string; proximoPasso: string }
> = {
  CONSCIENTE: {
    titulo: "Consciente",
    resumo: "Você conhece suas qualidades e não tem vergonha delas.",
    oQueDiz:
      "Você já enxerga com clareza o que tem de bom e também o que quer melhorar, sem se afundar nisso. Essa é uma base rara: autoconhecimento sem autocobrança excessiva.",
    proximoPasso:
      "Próximo passo: escreva 3 qualidades suas e uma situação real em que cada uma apareceu. Isso vira munição pra quando a insegurança bater.",
  },
  AUTOCRITICO: {
    titulo: "Autocrítico",
    resumo: "Você se cobra mais do que qualquer outra pessoa te cobraria.",
    oQueDiz:
      "Você repara nos seus erros com uma lupa que ninguém mais usa em você. Isso mostra que você se importa, só que com a régua calibrada muito apertada.",
    proximoPasso:
      "Próximo passo: da próxima vez que errar, escreva o que diria pra um(a) amigo(a) no seu lugar. Depois, releia como se fosse pra você.",
  },
  DESCOBERTA: {
    titulo: "Em descoberta",
    resumo: "Você ainda está montando o quebra-cabeça de quem você é.",
    oQueDiz:
      "Você não tem tudo fechado sobre si mesmo(a), e tudo bem: aos 15, 16, 17 anos ninguém deveria ter. Descobrir é um processo, não um atraso.",
    proximoPasso:
      "Próximo passo: pergunte a 3 pessoas próximas o que elas mais admiram em você. As respostas costumam surpreender e revelar padrões.",
  },
  TRANQUILO: {
    titulo: "Tranquilo",
    resumo: "Você não se abala fácil com o que pensam ou dizem de você.",
    oQueDiz:
      "Você tem uma leveza natural com quem é, sem precisar analisar cada detalhe. Isso protege sua energia, mas vale checar se não é também uma forma de evitar se olhar mais fundo.",
    proximoPasso:
      "Próximo passo: uma vez por semana, reserve 5 minutos pra se perguntar \"o que eu realmente senti hoje?\". Leveza e atenção podem andar juntas.",
  },
};

/* ------------------------------------------------------------------ *
 * Capítulo 2 — Meu caminho
 * ------------------------------------------------------------------ */

export const CAP2_TEXTO: Record<
  CategoriaCap2,
  { titulo: string; resumo: string; oQueDiz: string; proximoPasso: string }
> = {
  PROTAGONISTA: {
    titulo: "Protagonista",
    resumo: "Você sabe o que quer e já está fazendo alguma coisa por isso.",
    oQueDiz:
      "Clareza e ação andando juntas: essa é a combinação mais rara do capítulo. Você não está só sonhando, está construindo, mesmo que devagar.",
    proximoPasso:
      "Próximo passo: defina uma meta pequena pras próximas 2 semanas, que te aproxime do seu objetivo. Protagonismo se treina em passos curtos.",
  },
  SONHADOR: {
    titulo: "Sonhador",
    resumo: "Você sabe pra onde quer ir. Falta destravar o primeiro passo.",
    oQueDiz:
      "Ter um sonho claro já é mais do que muita gente tem. O que trava normalmente não é falta de vontade: é não saber por onde começar, ou o medo de começar errado.",
    proximoPasso:
      "Próximo passo: escolha UMA ação de 30 minutos que te aproxime do seu sonho essa semana. Só uma. O resto vem depois.",
  },
  EXPLORADOR: {
    titulo: "Explorador",
    resumo: "Você está testando o terreno, sem pressa de se prender a nada.",
    oQueDiz:
      "Você está numa fase de experimentar, e isso não é enrolação. É como muita gente encontra o próprio caminho: tentando, errando, tentando de novo.",
    proximoPasso:
      "Próximo passo: liste 3 coisas que você já testou e o que cada uma te ensinou sobre você. Exploração vira direção quando você presta atenção nos padrões.",
  },
  OCUPADO: {
    titulo: "Ocupado",
    resumo: "Você faz muita coisa, mas a questão é se são as coisas certas pra você.",
    oQueDiz:
      "Sua agenda está cheia e você aproveita o que aparece. Isso mostra disposição, mas também pode ser um jeito de não parar pra escolher.",
    proximoPasso:
      "Próximo passo: nas próximas 2 semanas, escreva num papel tudo que você faz. No fim, marque o que te aproxima do que você quer e o que só ocupa espaço.",
  },
};

/* ------------------------------------------------------------------ *
 * Capítulo 3 — Sucesso e expectativas
 * ------------------------------------------------------------------ */

export const CAP3_TEXTO: Record<
  CategoriaCap3,
  { titulo: string; resumo: string; oQueDiz: string; proximoPasso: string }
> = {
  AUTONOMO: {
    titulo: "Autônomo",
    resumo: "Sua régua de sucesso é sua, não emprestada.",
    oQueDiz:
      "Você já sabe separar o que é sua voz do que é voz dos outros, e ainda assim consegue ouvir com respeito quem discorda. Isso é maturidade emocional de verdade.",
    proximoPasso:
      "Próximo passo: da próxima vez que comparar sua vida com a de alguém, pergunte: \"isso é o que EU quero, ou o que parece que eu deveria querer?\"",
  },
  ALINHADO: {
    titulo: "Alinhado",
    resumo: "O que sua família espera e o que você quer apontam pro mesmo lugar, por enquanto.",
    oQueDiz:
      "Você tem sorte de não sentir esse conflito hoje. Vale só ficar de olho: com o tempo seus planos podem mudar, e tudo bem se um dia eles não baterem mais 100%.",
    proximoPasso:
      "Próximo passo: converse com sua família sobre o que você quer, não só sobre o que eles esperam. Alinhamento fica mais forte quando é conversado, não presumido.",
  },
  CONFLITO: {
    titulo: "Em conflito",
    resumo: "Você segue seu caminho, mas isso custa caro por dentro.",
    oQueDiz:
      "Você já tem clareza sobre o que quer. O problema é o preço emocional de defender isso: briga, culpa, a sensação de precisar provar algo o tempo todo.",
    proximoPasso:
      "Próximo passo: escolha uma conversa difícil que você vem adiando e planeje ela com calma, sem esperar o momento de explosão. Clareza sem guerra é possível.",
  },
  PRESSIONADO: {
    titulo: "Pressionado",
    resumo: "A régua que você usa pra se avaliar é, principalmente, dos outros.",
    oQueDiz:
      "Você mede seu valor pelo que esperam de você, e isso pesa. Não é fraqueza: é um sinal de que ainda não teve espaço pra descobrir o que VOCÊ espera de você mesmo(a).",
    proximoPasso:
      "Próximo passo: escreva uma frase que comece com \"eu vou me sentir bem-sucedido(a) quando eu...\", sem pensar em ninguém além de você ao escrever.",
  },
};

/* ------------------------------------------------------------------ *
 * Matrizes 2x2 — eixos e posição de cada categoria
 * x: 0 = polo esquerdo, 1 = polo direito · y: 0 = polo inferior, 1 = polo superior
 * ------------------------------------------------------------------ */

export const CAP1_MATRIZ = {
  eixoX: { esquerda: "Baixa clareza", direita: "Alta clareza" },
  eixoY: { baixo: "Baixa aceitação", alto: "Alta aceitação" },
  pos: {
    CONSCIENTE: { x: 1, y: 1 },
    AUTOCRITICO: { x: 1, y: 0 },
    TRANQUILO: { x: 0, y: 1 },
    DESCOBERTA: { x: 0, y: 0 },
  } satisfies Record<CategoriaCap1, { x: 0 | 1; y: 0 | 1 }>,
};

export const CAP2_MATRIZ = {
  eixoX: { esquerda: "Baixa clareza", direita: "Alta clareza" },
  eixoY: { baixo: "Baixa ação", alto: "Alta ação" },
  pos: {
    PROTAGONISTA: { x: 1, y: 1 },
    SONHADOR: { x: 1, y: 0 },
    OCUPADO: { x: 0, y: 1 },
    EXPLORADOR: { x: 0, y: 0 },
  } satisfies Record<CategoriaCap2, { x: 0 | 1; y: 0 | 1 }>,
};

export const CAP3_MATRIZ = {
  eixoX: { esquerda: "Referência interna", direita: "Referência externa" },
  eixoY: { baixo: "Baixa pressão sentida", alto: "Alta pressão sentida" },
  pos: {
    AUTONOMO: { x: 0, y: 0 },
    CONFLITO: { x: 0, y: 1 },
    ALINHADO: { x: 1, y: 0 },
    PRESSIONADO: { x: 1, y: 1 },
  } satisfies Record<CategoriaCap3, { x: 0 | 1; y: 0 | 1 }>,
};

/* ------------------------------------------------------------------ *
 * Capítulo 4 — rótulos curtos por letra (usados no radar e nas barras)
 * ------------------------------------------------------------------ */

export const LETRA_LABEL: Record<Letra, string> = {
  E: "Extrovertido(a)",
  I: "Introvertido(a)",
  S: "Sensorial",
  N: "Intuitivo(a)",
  T: "Racional",
  F: "Sensível",
  J: "Planejador(a)",
  P: "Flexível",
};

export const DIMENSAO_LABEL: Record<Dimensao, string> = {
  EI: "Energia",
  SN: "Percepção",
  TF: "Decisão",
  JP: "Organização",
};

/* ------------------------------------------------------------------ *
 * 16 tipos — apelido jovem e acolhedor pra cada combinação
 * ------------------------------------------------------------------ */

export const MBTI_APELIDO: Record<string, string> = {
  ISTJ: "O Organizador",
  ISFJ: "O Guardião",
  INFJ: "O Idealista",
  INTJ: "O Estrategista",
  ISTP: "O Artesão",
  ISFP: "O Sensível",
  INFP: "O Mediador",
  INTP: "O Pensador",
  ESTP: "O Dinâmico",
  ESFP: "O Espontâneo",
  ENFP: "O Inspirador",
  ENTP: "O Inovador",
  ESTJ: "O Executivo",
  ESFJ: "O Cuidador",
  ENFJ: "O Mobilizador",
  ENTJ: "O Comandante",
};

/* ------------------------------------------------------------------ *
 * Grupo (temperamento) e recomendação relacionada
 * ------------------------------------------------------------------ */

export const GRUPO_TEXTO: Record<Grupo, string> = {
  Estrategistas: "Você pensa em sistemas, planos e no longo prazo antes de agir.",
  Inspiradores: "Você se move por significado, gente e possibilidades.",
  Organizadores: "Você constrói segurança com estrutura, rotina e compromisso.",
  Realizadores: "Você aprende fazendo, no ritmo do agora.",
};

/** Rótulo pronto para "Em transição entre X e Y". */
export function rotuloTransicao(a: string, b: string) {
  return `Em transição entre ${titulo(a)} e ${titulo(b)}`;
}

function titulo(categoria: string) {
  const mapas = [CAP1_TEXTO, CAP2_TEXTO, CAP3_TEXTO] as Record<
    string,
    { titulo: string }
  >[];
  for (const mapa of mapas) {
    if (mapa[categoria]) return mapa[categoria].titulo;
  }
  return categoria;
}
