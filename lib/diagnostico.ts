import { CURSOS, SHEET_ENDPOINT_DIAGNOSTICO } from "@/lib/site";

/**
 * Motor do Diagnóstico de Maturidade Digital.
 *
 * Portado de `legado/site-estatico-jackson/diagnostico-ousadia.html` — copy,
 * pontuação e roteamento por perfil vieram de lá sem alteração. O que mudou foi
 * a casca: as cores agora saem dos tokens do "Ousadia Amazônia" (globals.css),
 * não da paleta clara do site antigo.
 *
 * Estrutura: 12 perguntas em 4 blocos. As 2 primeiras qualificam (perfil e
 * objetivo, sem pontos); as 10 seguintes pontuam de 0 a 3 em 5 dimensões do
 * método STORYSELL — 2 perguntas por dimensão, 6 pontos cada, 30 no total.
 */

/* ------------------------------------------------------------------ *
 * Dimensões (pilares do STORYSELL)
 * ------------------------------------------------------------------ */

export type DimKey = "posic" | "influ" | "plan" | "exec" | "perf";

export const DIM_KEYS: DimKey[] = ["posic", "influ", "plan", "exec", "perf"];

/** Pontos máximos por dimensão (2 perguntas × 3 pontos). */
export const DIM_MAX = 6;
/** Pontos máximos do diagnóstico (5 dimensões × 6). */
export const MAX_SCORE = 30;

/** `color` usa tokens do tema escuro — o roxo/terra antigo não contrasta aqui. */
export const DIMS: Record<
  DimKey,
  { label: string; short: string; pillar: string; color: string }
> = {
  posic: {
    label: "Posicionamento",
    short: "Posic.",
    pillar: "Sinal + Travessia",
    color: "var(--amarelo)",
  },
  influ: {
    label: "Marketing & Influência",
    short: "Influência",
    pillar: "Consciência de marca",
    color: "var(--rio-soft)",
  },
  plan: {
    label: "Planejamento estratégico",
    short: "Planej.",
    pillar: "Ossada",
    color: "var(--floresta)",
  },
  exec: {
    label: "Execução de conteúdo",
    short: "Conteúdo",
    pillar: "Ritual",
    color: "var(--rio)",
  },
  perf: {
    label: "Performance & futuro",
    short: "Perform.",
    pillar: "Yield",
    color: "var(--amarelo-soft)",
  },
};

export const DIM_TEXT: Record<DimKey, { high: string; low: string }> = {
  posic: {
    high: "Você sabe pelo que quer ser lembrado e conhece o público que deseja transformar.",
    low: "Sua mensagem ainda é genérica ou parecida com a dos concorrentes: falta um Sinal só seu.",
  },
  influ: {
    high: "Você entende influência como confiança e capacidade de gerar decisão, não vaidade de métrica.",
    low: "Marketing ainda soa como “postar” ou “engajar”: falta enxergar conteúdo como caminho até a venda.",
  },
  plan: {
    high: "Suas decisões têm objetivo, indicadores e conexão com metas do negócio.",
    low: "Falta uma Ossada: metas documentadas, indicadores e marketing ligado ao resultado comercial.",
  },
  exec: {
    high: "Sua produção tem processo e ritmo: conteúdo com voz reconhecível e distribuição.",
    low: "A criação depende de inspiração ou tempo livre; falta um Ritual que sustente a consistência.",
  },
  perf: {
    high: "Você mede o funil, entende de onde vem cliente e usa dado para ajustar a rota.",
    low: "Falta Yield: medir conversão, origem e retorno para saber o que realmente traz cliente.",
  },
};

/* ------------------------------------------------------------------ *
 * Perfis (ICPs) e objetivos
 * ------------------------------------------------------------------ */

export type ProfileKey =
  | "creator_ini"
  | "creator_pro"
  | "empreendedor"
  | "especialista"
  | "empresa"
  | "explorando";

export const PROFILES: Record<ProfileKey, string> = {
  creator_ini: "Creator/social media iniciante",
  creator_pro: "Profissional de conteúdo em ascensão",
  empreendedor: "Empreendedor local",
  especialista: "Profissional/especialista",
  empresa: "Empresa / equipe de marketing",
  explorando: "Explorando o digital",
};

export const OBJETIVOS: Record<string, string> = {
  primeira_renda: "Primeira renda no digital",
  mais_vendas: "Mais clientes e vendas",
  autoridade: "Autoridade e reconhecimento",
  consistencia: "Qualidade e consistência",
  governanca: "Organizar marketing e equipe",
  escalar_produto: "Criar/escalar produto digital",
};

/* ------------------------------------------------------------------ *
 * Perguntas
 * ------------------------------------------------------------------ */

export type Option = { lab: string; tag?: string; pts?: number };

export type Question = {
  block: number;
  blockName: string;
  blockIntro: string;
  key: string;
  scored: boolean;
  /** Perguntas pontuadas embaralham as opções para não induzir a resposta. */
  shuffle: boolean;
  dim?: DimKey;
  title: string;
  hint: string;
  options: Option[];
};

const B1 = {
  block: 1,
  blockName: "Bloco 1 · Quem chega à Ousadia",
  blockIntro:
    "Antes de analisar sua presença digital, precisamos entender qual é o seu momento profissional e o que você deseja construir.",
};
const B2 = {
  block: 2,
  blockName: "Bloco 2 · Consciência e posicionamento",
  blockIntro:
    "Agora vamos entender o quanto sua marca sabe quem é, para quem fala e por que deveria ser escolhida.",
};
const B3 = {
  block: 3,
  blockName: "Bloco 3 · Planejamento e estratégia",
  blockIntro:
    "Conteúdo sem estratégia pode gerar movimento, mas não necessariamente crescimento. Vamos avaliar como suas decisões são planejadas.",
};
const B4 = {
  block: 4,
  blockName: "Bloco 4 · Criação, resultados e futuro",
  blockIntro:
    "Por último, vamos analisar como sua estratégia sai do papel, como os resultados são acompanhados e qual futuro você deseja construir.",
};

export const QUESTIONS: Question[] = [
  {
    ...B1,
    key: "perfil",
    scored: false,
    shuffle: false,
    title:
      "Qual perfil representa melhor o motivo que trouxe você até a Ousadia?",
    hint: "Escolha o que mais se parece com a sua realidade hoje.",
    options: [
      {
        lab: "Estou começando como creator, social media, UGC ou videomaker.",
        tag: "creator_ini",
      },
      {
        lab: "Já trabalho com criação de conteúdo ou marketing e quero me profissionalizar.",
        tag: "creator_pro",
      },
      {
        lab: "Tenho um pequeno ou médio negócio e quero vender mais pelo digital.",
        tag: "empreendedor",
      },
      {
        lab: "Sou profissional ou especialista e quero fortalecer minha marca pessoal.",
        tag: "especialista",
      },
      {
        lab: "Represento uma empresa ou equipe de marketing que precisa organizar a estratégia.",
        tag: "empresa",
      },
      {
        lab: "Ainda estou descobrindo como posso trabalhar ou crescer no digital.",
        tag: "explorando",
      },
    ],
  },
  {
    ...B1,
    key: "objetivo",
    scored: false,
    shuffle: false,
    title: "Qual é o seu principal objetivo para os próximos 12 meses?",
    hint: "O que seria uma vitória de verdade pra você neste ano.",
    options: [
      {
        lab: "Conseguir meu primeiro cliente ou minha primeira renda com o digital.",
        tag: "primeira_renda",
      },
      {
        lab: "Atrair mais clientes e aumentar as vendas do meu negócio.",
        tag: "mais_vendas",
      },
      {
        lab: "Construir autoridade e ser reconhecido pelo que faço.",
        tag: "autoridade",
      },
      {
        lab: "Criar conteúdo com mais qualidade e consistência.",
        tag: "consistencia",
      },
      {
        lab: "Organizar o marketing, a equipe e os processos da empresa.",
        tag: "governanca",
      },
      {
        lab: "Criar ou escalar um curso, mentoria, serviço ou produto digital.",
        tag: "escalar_produto",
      },
    ],
  },

  {
    ...B2,
    key: "q3",
    scored: true,
    shuffle: true,
    dim: "posic",
    title:
      "Hoje, você consegue explicar claramente por que alguém deveria escolher você ou sua empresa?",
    hint: "É o seu Sinal: o ponto de vista que só você pode defender.",
    options: [
      {
        lab: "Não. Ainda tenho dificuldade até para explicar o que faço.",
        pts: 0,
      },
      {
        lab: "Consigo explicar, mas minha mensagem é parecida com a dos concorrentes.",
        pts: 1,
      },
      {
        lab: "Tenho público, proposta e diferenciais relativamente definidos.",
        pts: 2,
      },
      {
        lab: "Tenho posicionamento claro, proposta de valor reconhecível e sei pelo que quero ser lembrado.",
        pts: 3,
      },
    ],
  },
  {
    ...B2,
    key: "q4",
    scored: true,
    shuffle: true,
    dim: "influ",
    title: "O que marketing de conteúdo representa para você?",
    hint: "Não existe resposta certa: existe nível de consciência.",
    options: [
      { lab: "Postar para não deixar o Instagram parado.", pts: 0 },
      {
        lab: "Criar publicações bonitas, vídeos e conteúdos que gerem engajamento.",
        pts: 1,
      },
      {
        lab: "Educar o público, gerar confiança e construir autoridade.",
        pts: 2,
      },
      {
        lab: "Conduzir estrategicamente o público da atenção até o relacionamento, a decisão e a compra.",
        pts: 3,
      },
    ],
  },
  {
    ...B2,
    key: "q5",
    scored: true,
    shuffle: true,
    dim: "influ",
    title: "O que melhor define influência no digital?",
    hint: "Aqui separamos quem confunde audiência com influência.",
    options: [
      { lab: "Ter muitos seguidores ou viralizar.", pts: 0 },
      { lab: "Ser conhecido e receber bastante engajamento.", pts: 1 },
      {
        lab: "Construir confiança e ser lembrado por determinado assunto.",
        pts: 2,
      },
      {
        lab: "Mudar percepções, gerar decisões e mobilizar ações, mesmo sem uma audiência enorme.",
        pts: 3,
      },
    ],
  },

  {
    ...B3,
    key: "q6",
    scored: true,
    shuffle: true,
    dim: "posic",
    title: "Quanto você conhece o público que deseja alcançar?",
    hint: "É a sua Travessia: o cliente-herói que você quer transformar.",
    options: [
      { lab: "Tento falar com todo mundo.", pts: 0 },
      { lab: "Tenho uma ideia geral, baseada mais na minha percepção.", pts: 1 },
      {
        lab: "Conheço as principais dores, desejos, dúvidas e linguagem do meu público.",
        pts: 2,
      },
      {
        lab: "Tenho segmentos definidos e uso dados, conversas e histórico de vendas para decidir.",
        pts: 3,
      },
    ],
  },
  {
    ...B3,
    key: "q7",
    scored: true,
    shuffle: true,
    dim: "plan",
    title:
      "Como funciona o planejamento estratégico do seu negócio ou carreira?",
    hint: "A Ossada é a estrutura que sustenta tudo o que você publica.",
    options: [
      {
        lab: "Não existe planejamento; resolvo as coisas conforme aparecem.",
        pts: 0,
      },
      { lab: "Tenho algumas metas na cabeça, mas nada documentado.", pts: 1 },
      {
        lab: "Tenho objetivos e prioridades, mas poucos indicadores e responsáveis definidos.",
        pts: 2,
      },
      {
        lab: "Tenho objetivos documentados, indicadores, responsáveis, prazos e acompanhamento periódico.",
        pts: 3,
      },
    ],
  },
  {
    ...B3,
    key: "q8",
    scored: true,
    shuffle: true,
    dim: "plan",
    title: "Como o marketing se conecta aos objetivos do negócio?",
    hint: "Marketing solto vira custo. Marketing conectado vira receita.",
    options: [
      {
        lab: "Publicamos ou anunciamos apenas quando precisamos vender algo.",
        pts: 0,
      },
      { lab: "Fazemos campanhas ou ações isoladas, sem continuidade.", pts: 1 },
      {
        lab: "Existe planejamento mensal, mas ainda não totalmente conectado às metas.",
        pts: 2,
      },
      {
        lab: "O marketing está ligado a metas, ofertas, canais, orçamento, funil e indicadores.",
        pts: 3,
      },
    ],
  },

  {
    ...B4,
    key: "q9",
    scored: true,
    shuffle: true,
    dim: "exec",
    title: "Como acontece a criação de conteúdo atualmente?",
    hint: "A voz própria precisa continuar reconhecível mesmo quando a tendência muda.",
    options: [
      { lab: "Não sei o que publicar, falar ou gravar.", pts: 0 },
      {
        lab: "Dependo de inspiração, tendências, concorrentes ou ideias de última hora.",
        pts: 1,
      },
      {
        lab: "Tenho temas e pilares definidos e crio com qualidade razoável.",
        pts: 2,
      },
      {
        lab: "Tenho processo de pesquisa, roteiro, gravação, edição, reaproveitamento e voz de marca.",
        pts: 3,
      },
    ],
  },
  {
    ...B4,
    key: "q10",
    scored: true,
    shuffle: true,
    dim: "exec",
    title: "Como está sua consistência nas redes sociais?",
    hint: "Consistência não é força de vontade: é sistema.",
    options: [
      { lab: "Quase nunca publico.", pts: 0 },
      { lab: "Publico quando sobra tempo ou aparece uma ideia.", pts: 1 },
      {
        lab: "Tenho calendário e frequência, mas interrompo com facilidade.",
        pts: 2,
      },
      {
        lab: "Tenho calendário, responsáveis, fluxo de produção, aprovação, publicação e distribuição.",
        pts: 3,
      },
    ],
  },
  {
    ...B4,
    key: "q11",
    scored: true,
    shuffle: true,
    dim: "perf",
    title: "Como você mede o resultado do marketing e do conteúdo?",
    hint: "O Yield é a colheita: transformar narrativa em venda mensurável.",
    options: [
      { lab: "Não acompanho resultados.", pts: 0 },
      { lab: "Observo curtidas, visualizações e número de seguidores.", pts: 1 },
      {
        lab: "Acompanho mensagens, cliques, leads, orçamentos ou algumas vendas.",
        pts: 2,
      },
      {
        lab: "Acompanho funil completo, conversão, origem, CAC e retorno, e ajusto a estratégia.",
        pts: 3,
      },
    ],
  },
  {
    ...B4,
    key: "q12",
    scored: true,
    shuffle: true,
    dim: "perf",
    title: "Qual alternativa representa melhor sua visão de futuro?",
    hint: "Onde você quer estar quando olhar pra trás daqui a 2 anos.",
    options: [
      { lab: "Ainda não sei onde quero chegar com o digital.", pts: 0 },
      {
        lab: "Quero crescer, mas não tenho uma meta ou caminho definido.",
        pts: 1,
      },
      {
        lab: "Tenho uma meta para os próximos 12 meses e algumas ações planejadas.",
        pts: 2,
      },
      {
        lab: "Tenho visão de 12 a 24 meses, com metas, ofertas, público, canais, equipe e orçamento.",
        pts: 3,
      },
    ],
  },
];

/* ------------------------------------------------------------------ *
 * Estágios de maturidade (Escada Amazônica)
 * ------------------------------------------------------------------ */

export type StageKey = "semente" | "igarape" | "travessia" | "floresta";

export type Stage = {
  key: StageKey;
  name: string;
  sub: string;
  min: number;
  max: number;
  /** Cor de acento do estágio — usada no badge, na trilha e no glow. */
  accent: string;
  /** Fundo do hero de resultado, já no registro escuro do site. */
  grad: string;
  desc: string;
  risk: string;
  quote: string;
  ctaLabel: string;
};

export const STAGES: Stage[] = [
  {
    key: "semente",
    name: "Semente",
    sub: "Presença ainda invisível",
    min: 0,
    max: 7,
    accent: "var(--rio)",
    grad:
      "radial-gradient(circle at 82% 12%, rgba(24,165,201,.35), transparent 52%)," +
      "radial-gradient(circle at 12% 92%, rgba(255,198,26,.10), transparent 55%)," +
      "var(--roxo-700)",
    desc: "Você já percebeu que o digital pode abrir portas, mas ainda não tem clareza suficiente sobre posicionamento, público, conteúdo e estratégia. A semente existe: falta preparar o solo antes de plantar.",
    risk: "Investir em identidade visual, tráfego, equipamentos ou produção antes de saber o que sua marca precisa comunicar.",
    quote:
      "Você não precisa publicar mais. Primeiro, precisa descobrir o que somente você pode dizer.",
    ctaLabel: "Quero começar minha evolução",
  },
  {
    key: "igarape",
    name: "Igarapé",
    sub: "Movimento sem sistema",
    min: 8,
    max: 15,
    accent: "var(--floresta)",
    grad:
      "radial-gradient(circle at 82% 12%, rgba(35,178,111,.38), transparent 52%)," +
      "radial-gradient(circle at 15% 90%, rgba(24,165,201,.26), transparent 55%)," +
      "var(--roxo-700)",
    desc: "Você entende que precisa produzir conteúdo, construir autoridade e aparecer. O problema é que a execução ainda depende de inspiração, urgência ou força de vontade. Tem água correndo, falta leito para o rio.",
    risk: "Passar meses produzindo sem construir uma percepção clara na mente do público.",
    quote:
      "Você não está sem conteúdo. Está sem uma estrutura que transforme conteúdo em crescimento.",
    ctaLabel: "Quero estruturar minha estratégia",
  },
  {
    key: "travessia",
    name: "Travessia",
    sub: "Estratégia em construção",
    min: 16,
    max: 23,
    accent: "var(--amarelo)",
    grad:
      "radial-gradient(circle at 85% 10%, rgba(255,198,26,.24), transparent 50%)," +
      "radial-gradient(circle at 10% 92%, rgba(24,165,201,.26), transparent 55%)," +
      "var(--roxo)",
    desc: "Você já tem conhecimento, experiência ou alguma presença digital. Sua dificuldade não é começar, é fazer posicionamento, conteúdo, marketing e vendas funcionarem juntos. Você está no meio do rio: falta chegar à outra margem com força.",
    risk: "Virar uma marca ativa, mas não necessariamente memorável ou lucrativa.",
    quote:
      "Você já tem matéria-prima. Agora precisa transformar conhecimento e história em autoridade que gera resultado.",
    ctaLabel: "Quero conversar com um estrategista da Ousadia",
  },
  {
    key: "floresta",
    name: "Floresta em Pé",
    sub: "Marca pronta para escalar",
    min: 24,
    max: 30,
    accent: "var(--amarelo)",
    grad:
      "radial-gradient(circle at 85% 8%, rgba(255,198,26,.34), transparent 52%)," +
      "radial-gradient(circle at 12% 94%, rgba(35,178,111,.32), transparent 55%)," +
      "var(--ink-void)",
    desc: "Você já domina posicionamento, conteúdo, influência e planejamento. Seu desafio agora é governança, previsibilidade e uma estrutura que não dependa exclusivamente de você. A floresta está de pé: falta protegê-la e fazê-la render.",
    risk: "Continuar crescendo de forma artesanal e transformar o próprio sucesso em gargalo.",
    quote:
      "Sua marca não precisa apenas de mais conteúdo. Precisa de uma estrutura capaz de sustentar o tamanho que deseja alcançar.",
    ctaLabel: "Quero conversar com um estrategista da Ousadia",
  },
];

/* ------------------------------------------------------------------ *
 * Roteamento comercial por perfil (Escada Amazônica)
 * ------------------------------------------------------------------ */

export type Route = {
  label: string;
  intro: string;
  products: Record<StageKey, string[]>;
  /** Produto de entrada recomendado — vai para a ficha do time. */
  lead: string;
  ladder: string;
};

/**
 * Nome exibido → rota real, pra transformar as pílulas de produto do
 * resultado em links de verdade. Cursos vêm de `CURSOS` (fonte única,
 * `lib/site.ts`) pra não duplicar nome/slug em dois lugares; Mentoria é
 * a única oferta fora da Escola que hoje tem página própria.
 */
export const PRODUTO_LINKS: Record<string, string> = Object.fromEntries(
  CURSOS.map((c) => [c.nome, `/escola/${c.slug}`]),
);
PRODUTO_LINKS["Mentoria Ousadia"] = "/mentoria";

export const ROUTING: Record<ProfileKey, Route> = {
  creator_ini: {
    label: "Formação prática para você viver do digital",
    intro:
      "Você chegou como quem quer virar profissional do digital. Seu caminho não começa em tráfego ou equipamento: começa em posicionamento, perder a vergonha de aparecer e método de execução — nessa ordem.",
    products: {
      semente: ["ABC do Marketing", "Destrave"],
      igarape: ["Destrave", "Social Media na Prática"],
      travessia: ["Social Media na Prática", "Audiovisual"],
      floresta: ["Audiovisual", "Mentoria Ousadia"],
    },
    lead: "ABC do Marketing",
    ladder:
      "Trilha da Escola: ABC do Marketing → Destrave → Social Media na Prática → Audiovisual",
  },
  creator_pro: {
    label: "Profissionalização de quem já cria conteúdo",
    intro:
      "Você já produz, agora precisa de método, portfólio e diferenciação para cobrar melhor e atender com consistência. A Ousadia te leva de executor a creator com voz e sistema.",
    products: {
      semente: ["ABC do Marketing", "Destrave"],
      igarape: ["Social Media na Prática", "Audiovisual"],
      travessia: ["Social Media na Prática", "Audiovisual", "Destrave"],
      floresta: ["Audiovisual", "Mentoria Ousadia"],
    },
    lead: "Social Media na Prática",
    ladder:
      "Trilha da Escola: Social Media na Prática → Audiovisual → Mentoria Ousadia",
  },
  empreendedor: {
    label: "Posicionamento e gestão para vender além do boca a boca",
    intro:
      "Você construiu seu negócio no balcão e na indicação. O digital bem feito é o que transforma quem passa em frente em quem chega pra comprar. Nada de “postar por postar”: um ecossistema de posicionamento, conteúdo e tráfego que dá pra medir.",
    products: {
      semente: [
        "Diagnóstico comercial",
        "Projeto de posicionamento local",
        "Tambatajá (workshop)",
      ],
      igarape: [
        "Gestão de conteúdo local",
        "Posicionamento + identidade",
        "Tráfego pago inicial",
      ],
      travessia: [
        "Gestão Premium local",
        "Reposicionamento de marca",
        "Funil + tráfego integrado",
      ],
      floresta: [
        "Gestão Premium local completa",
        "Cobertura de eventos e ativações",
        "Expansão / novos canais",
      ],
    },
    lead: "Gestão Premium local",
    ladder:
      "Trilha do empreendedor: Diagnóstico → Posicionamento → Gestão + Tráfego",
  },
  especialista: {
    label: "Marca pessoal e autoridade para o especialista invisível",
    intro:
      "Você é forte tecnicamente, mas o mercado ainda não sabe disso. É exatamente aqui que o STORYSELL brilha: transformar seu conhecimento em autoridade reconhecível, sem virar influencer, sem expor a vida íntima.",
    products: {
      semente: [
        "Igarapé + Tambatajá",
        "Diagnóstico de marca pessoal",
        "Aulão de autoridade",
      ],
      igarape: [
        "STORYSELL Raiz: Trilha Cacique",
        "Mentoria de posicionamento de especialista",
        "Projeto de marca pessoal (entrada)",
      ],
      travessia: [
        "Mentoria STORYSELL",
        "Projeto de Marca Pessoal",
        "Gestão de Marca Pessoal Premium",
      ],
      floresta: [
        "Gestão de Marca Pessoal Premium",
        "Lançamento de curso/mentoria",
        "Inner Circle Floresta em Pé",
      ],
    },
    lead: "Mentoria STORYSELL / Projeto de Marca Pessoal",
    ladder:
      "Trilha do especialista: STORYSELL Raiz (Cacique) → Projeto de Marca Pessoal → Lançamento",
  },
  empresa: {
    label: "Governança e parceria estratégica de marketing",
    intro:
      "Você não precisa de mais um fornecedor de posts. Precisa de um parceiro com padrão nacional e inteligência amazônica: estratégia, execução, mensuração e governança em um só ecossistema.",
    products: {
      semente: [
        "Diagnóstico estratégico independente",
        "Sprint de imersão no negócio",
      ],
      igarape: [
        "Projeto de posicionamento de marca",
        "Treinamento de time interno",
        "Diagnóstico + roadmap",
      ],
      travessia: [
        "Contrato de Gestão Integrada",
        "Reposicionamento de marca",
        "Squad dedicado",
      ],
      floresta: [
        "Contrato anual de Gestão Integrada",
        "Squad dedicado + governança",
        "Cobertura de eventos / programa corporativo",
      ],
    },
    lead: "Contrato de Gestão Integrada",
    ladder:
      "Trilha B2B: Diagnóstico → Reposicionamento → Contrato recorrente + Governança",
  },
  explorando: {
    label: "Um primeiro passo claro para começar do jeito certo",
    intro:
      "Você ainda está descobrindo seu caminho, e tudo bem. O erro seria gastar dinheiro antes de ter clareza. Comece pelos fundamentos e deixe o próprio movimento revelar sua direção.",
    products: {
      semente: ["ABC do Marketing", "Destrave"],
      igarape: ["Social Media na Prática", "Audiovisual"],
      travessia: ["Social Media na Prática", "Mentoria Ousadia"],
      floresta: ["Mentoria Ousadia"],
    },
    lead: "ABC do Marketing",
    ladder: "Comece na base: ABC do Marketing → Destrave → Social Media na Prática",
  },
};

/** Perfis em que o método STORYSELL é a recomendação natural. */
export const STORYSELL_FIT = new Set<ProfileKey>([
  "creator_ini",
  "creator_pro",
  "especialista",
  "explorando",
]);

/* ------------------------------------------------------------------ *
 * Plano de 30 dias por estágio
 * ------------------------------------------------------------------ */

export const PLAN30: Record<StageKey, [string, string][]> = {
  semente: [
    [
      "Semana 1",
      "Defina seu Sinal: escreva em 1 frase o que só você pode dizer e para quem.",
    ],
    [
      "Semana 2",
      "Mapeie seu cliente-herói (Travessia): dores, desejos, linguagem e a transformação que você entrega.",
    ],
    [
      "Semana 3",
      "Escolha 3 pilares de conteúdo que sustentam sua autoridade e uma rotina mínima realista.",
    ],
    [
      "Semana 4",
      "Publique 4 peças com seu novo posicionamento e observe qual gera mais conversa.",
    ],
  ],
  igarape: [
    [
      "Semana 1",
      "Transforme suas ideias soltas em posicionamento e pilares editoriais documentados.",
    ],
    [
      "Semana 2",
      "Monte um calendário 4-2-1 (4 conexão, 2 autoridade, 1 venda) para 30 dias.",
    ],
    [
      "Semana 3",
      "Crie um processo simples: pesquisa → roteiro → gravação → edição → publicação.",
    ],
    [
      "Semana 4",
      "Estruture uma oferta e um caminho de conversão (bio, CTA, direct/WhatsApp).",
    ],
  ],
  travessia: [
    [
      "Semana 1",
      "Refine sua narrativa e diferenciação: comunique o posicionamento com mais força.",
    ],
    [
      "Semana 2",
      "Estruture funil e oferta: da atenção ao fechamento, com etapas claras.",
    ],
    [
      "Semana 3",
      "Melhore a distribuição e comece a medir conversões (leads, cliques, vendas).",
    ],
    [
      "Semana 4",
      "Ative sua base: transforme audiência em comunidade, oportunidade e receita.",
    ],
  ],
  floresta: [
    [
      "Semana 1",
      "Documente papéis e responsabilidades para o marketing não depender só de você.",
    ],
    [
      "Semana 2",
      "Padronize processos de aprovação, publicação e distribuição (SOPs).",
    ],
    [
      "Semana 3",
      "Defina indicadores e governança: dashboard, cadência de reunião e metas.",
    ],
    [
      "Semana 4",
      "Escale aquisição e planeje o próximo ativo: produto, campanha ou novo mercado.",
    ],
  ],
};

/* ------------------------------------------------------------------ *
 * Cálculo
 * ------------------------------------------------------------------ */

export type Answer = {
  idx: number;
  tag: string | null;
  pts: number | null;
  dim: DimKey | null;
};

export type Answers = Record<string, Answer>;

export type DimResult = { key: DimKey; score: number; pct: number };

export type Resultado = {
  total: number;
  dimScore: Record<DimKey, number>;
  dims: DimResult[];
  /** Até 3 dimensões mais fortes, só as que passam de metade da escala. */
  forces: DimResult[];
  /** As 3 dimensões mais fracas, da pior para a menos pior. */
  gaps: DimResult[];
  stage: Stage;
  profile: ProfileKey;
  goal: string | null;
  route: Route;
  /** Perfil com alta aderência ao STORYSELL e produto indicado coerente. */
  storysell: boolean;
  produtos: string[];
};

export function compute(answers: Answers): Resultado {
  let total = 0;
  const dimScore: Record<DimKey, number> = {
    posic: 0,
    influ: 0,
    plan: 0,
    exec: 0,
    perf: 0,
  };

  for (const q of QUESTIONS) {
    if (!q.scored) continue;
    const a = answers[q.key];
    if (!a || a.pts == null || !a.dim) continue;
    total += a.pts;
    dimScore[a.dim] += a.pts;
  }

  const stage = STAGES.find((s) => total >= s.min && total <= s.max) ?? STAGES[0];

  const dims: DimResult[] = DIM_KEYS.map((key) => ({
    key,
    score: dimScore[key],
    pct: Math.round((dimScore[key] / DIM_MAX) * 100),
  }));

  const desc = [...dims].sort((a, b) => b.score - a.score);
  const forces = desc.slice(0, 3).filter((d) => d.score >= 3);
  const gaps = [...desc].reverse().slice(0, 3);

  const profile = (answers.perfil?.tag as ProfileKey | undefined) ?? "explorando";
  const goal = answers.objetivo?.tag ?? null;
  const route = ROUTING[profile];
  const produtos = route.products[stage.key] ?? route.products.travessia;
  const storysell = STORYSELL_FIT.has(profile);

  return {
    total,
    dimScore,
    dims,
    forces,
    gaps,
    stage,
    profile,
    goal,
    route,
    storysell,
    produtos,
  };
}

/* ------------------------------------------------------------------ *
 * Persistência na planilha (Google Apps Script)
 * ------------------------------------------------------------------ */

/**
 * Monta a linha da planilha. As chaves têm que bater exatamente com o array
 * `COLUNAS` do Apps Script — qualquer nome diferente vira célula vazia.
 * Ver `legado/site-estatico-crm/docs/system-design/integracao-google-sheets.gs`.
 */
export function payloadPlanilha(
  r: Resultado,
  lead: {
    nome: string;
    wpp: string;
    email: string;
    social: string;
    local: string;
  },
) {
  return {
    data: new Date().toISOString(),
    nome: lead.nome,
    whatsapp: lead.wpp,
    email: lead.email,
    instagram_site: lead.social,
    cidade_estado: lead.local,
    perfil: PROFILES[r.profile],
    objetivo: r.goal ?? "",
    pontuacao: r.total,
    estagio: r.stage.name,
    dim_posicionamento: r.dimScore.posic,
    dim_influencia: r.dimScore.influ,
    dim_planejamento: r.dimScore.plan,
    dim_execucao: r.dimScore.exec,
    dim_performance: r.dimScore.perf,
    produto_recomendado: r.route.lead,
    aderencia_storysell: r.storysell ? "Alta" : "Baixa",
  };
}

/**
 * Dispara a gravação do lead na planilha. **Não bloqueia** — o resultado
 * aparece na hora e o envio segue em segundo plano.
 *
 * O Apps Script não devolve cabeçalho CORS e responde com um 302 para outro
 * domínio, então a requisição precisa ser "simples" (`text/plain`, sem
 * preflight) e a resposta é sempre opaca — não dá para confirmar a gravação,
 * só que a requisição saiu. `sendBeacon` é o caminho certo aqui: é exatamente
 * esse formato, não segura a UI e sobrevive se a pessoa fechar a aba logo
 * depois de enviar. O `fetch` com `keepalive` cobre navegadores sem beacon.
 *
 * Por isso o resultado nunca depende deste retorno: o CTA de WhatsApp leva a
 * leitura completa de qualquer jeito.
 */
export function salvarNaPlanilha(
  payload: ReturnType<typeof payloadPlanilha>,
): boolean {
  if (!SHEET_ENDPOINT_DIAGNOSTICO) return false;
  const corpo = JSON.stringify(payload);

  try {
    if (typeof navigator !== "undefined" && navigator.sendBeacon) {
      const blob = new Blob([corpo], { type: "text/plain;charset=utf-8" });
      if (navigator.sendBeacon(SHEET_ENDPOINT_DIAGNOSTICO, blob)) return true;
    }
  } catch {
    // cai no fetch abaixo
  }

  try {
    void fetch(SHEET_ENDPOINT_DIAGNOSTICO, {
      method: "POST",
      mode: "no-cors",
      keepalive: true,
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: corpo,
    }).catch(() => {});
    return true;
  } catch {
    return false;
  }
}

/**
 * Ficha de qualificação para o time comercial. Não é renderizada na página —
 * viaja junto do lead (endpoint ou WhatsApp) para chegar a quem vai atender.
 */
export function fichaComercial(r: Resultado) {
  const urgencia: "alta" | "media" | "baixa" =
    r.stage.key === "travessia" || r.stage.key === "floresta"
      ? "alta"
      : r.stage.key === "igarape"
        ? "media"
        : "baixa";

  const potencial =
    r.profile === "creator_ini" || r.profile === "creator_pro"
      ? "Educacional (formação/comunidade)"
      : r.profile === "empresa"
        ? "Agência / contrato recorrente B2B"
        : "Agência / high-ticket";

  return {
    perfil: PROFILES[r.profile],
    objetivo: r.goal ? (OBJETIVOS[r.goal] ?? r.goal) : "não informado",
    pontuacao: `${r.total}/${MAX_SCORE}`,
    estagio: r.stage.name,
    dimensoes: r.dims
      .map((d) => `${DIMS[d.key].short} ${d.score}/${DIM_MAX}`)
      .join(" · "),
    maiorGargalo: r.gaps[0] ? DIMS[r.gaps[0].key].label : "não informado",
    produtoRecomendado: r.route.lead,
    aderenciaStorysell: r.storysell ? "Alta" : "Baixa / indireta",
    urgencia,
    potencial,
  };
}
