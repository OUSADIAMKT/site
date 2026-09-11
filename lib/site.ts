/**
 * Fonte única de dados do site — extraída do PRD (`legado/copy-e-arquitetura/PRD-site-ousadia.md`)
 * e do config do site estático (`legado/site-estatico-jackson/assets/js/config.js`).
 *
 * Regra de ouro do PRD: toda CTA termina em WhatsApp ou em formulário de aplicação.
 * Onde falta dado real do cliente, usar TODO_ / MediaSlot — nunca inventar prova social.
 */

export const SITE = {
  name: "Ousadia Marketing",
  tagline: "Por um marketing maior.",
  claim: "Propósito que move. Estratégia que transforma.",
  descriptor: "Plataforma de Creators da Amazônia",
  url: "https://ousadiamarketing.com.br",
  email: "", // TODO: e-mail comercial
  cidadeBase: "", // TODO: cidade-base (região Norte)
  cnpj: "", // TODO: CNPJ
} as const;

/**
 * Número de atendimento da Ousadia. Alimenta todos os links de WhatsApp do
 * site (botão flutuante, CTAs, fallback dos formulários), então trocar aqui
 * troca em todas as páginas de uma vez.
 */
export const WHATSAPP_NUMBER = "5593991356894";

/**
 * Número que recebe os leads do Diagnóstico de Maturidade Digital.
 * Hoje é o mesmo do atendimento geral; fica separado porque o diagnóstico
 * pode voltar a ter um canal próprio sem mexer no resto do site.
 */
export const WHATSAPP_DIAGNOSTICO = "5593991356894";

/** Link de WhatsApp do diagnóstico, com a leitura do lead já no texto. */
export function waDiagnostico(texto: string) {
  return `https://wa.me/${WHATSAPP_DIAGNOSTICO}?text=${encodeURIComponent(texto)}`;
}

/**
 * Número da Juliana Araújo, que conduz o Aulão Mapa do UGC Creator.
 * A landing `/aulao-ugc` fala direto com ela, não com o atendimento geral —
 * por isso o número é próprio (confirmado no rodapé da página antiga,
 * `legado/social-ugc-ppc/ugc/aulao_ugc.html`).
 */
export const WHATSAPP_UGC = "5593992282674";

/** Link de WhatsApp do aulão de UGC, com a mensagem já preenchida. */
export function waAulaoUgc(
  texto = "Oi! Quero garantir minha vaga no Aulão Mapa do UGC Creator.",
) {
  return `https://wa.me/${WHATSAPP_UGC}?text=${encodeURIComponent(texto)}`;
}

/** Mensagens pré-preenchidas por contexto (PRD 6.6). */
const WA_MESSAGES = {
  home: "Oi! Vim pelo site e quero entrar pra Ousadia.",
  escola: "Oi! Quero saber sobre os cursos da Escola Ousadia.",
  mentoria: "Oi! Quero aplicar pra próxima turma da mentoria.",
  agencia: "Oi! Represento uma marca e quero uma proposta.",
  comunidade: "Oi! Quero entrar pra comunidade Creators da Amazônia.",
  contato: "Oi! Vim pelo site e quero falar com o time da Ousadia.",
  sobre: "Oi! Vi a história da Ousadia no site e quero conversar.",
  portfolio: "Oi! Vi os cases no site e quero um resultado desses.",
} as const;

export type WaContext = keyof typeof WA_MESSAGES;

/** Monta o link wa.me. Passe `curso` para a mensagem contextual de curso. */
export function wa(context: WaContext = "home", curso?: string) {
  const text = curso
    ? `Oi! Quero saber sobre o curso ${curso}.`
    : WA_MESSAGES[context];
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(text)}`;
}

/**
 * Endpoints de formulário. Enquanto ficarem vazios, os formulários do site
 * caem no WhatsApp com os dados preenchidos — nenhum lead se perde em silêncio.
 */
export const FORM_ENDPOINT = ""; // TODO: endpoint de aplicação/contato

/**
 * Web App do Google Apps Script que grava cada diagnóstico na planilha
 * `1XFqT2WISjwiU2lyoNAqIj7vpZgw_Grz9Tr0OcEnRzBg` e avisa por e-mail.
 * Código do backend: `legado/site-estatico-crm/docs/system-design/integracao-google-sheets.gs`.
 * As colunas são fixas — ver `payloadPlanilha()` em `lib/diagnostico.ts`.
 */
export const SHEET_ENDPOINT_DIAGNOSTICO =
  "https://script.google.com/macros/s/AKfycbyLOpwYZOl3OtqYFn6GM0IW0awtE4pXIsULNtTRMyVouGUqS37nBLVqj_vomFU6Wgc3eQ/exec";

/**
 * Web App do Google Apps Script que grava cada inscrição da newsletter na
 * planilha `198NdIbJ413MZlK3RgkX-NRtjpJpK9yjuiv1A5Xq7MzM` (própria, separada
 * da do Diagnóstico). Script pronto em
 * `docs/apps-script/newsletter-google-sheets.gs` — falta implantar (Extensões
 * > Apps Script > Implantar > App da Web > "Qualquer pessoa") e colar aqui a
 * URL terminada em `/exec`. Testar com GET antes: deve responder
 * "Newsletter Ousadia online" — se pedir login, a implantação não é pública.
 */
export const NEWSLETTER_ENDPOINT = ""; // TODO: colar a URL /exec depois de implantar

export const SOCIAL = {
  instagram: "https://instagram.com/ousadiamkt",
  tiktok: "", // TODO
  youtube: "", // TODO
  spotify: "", // TODO
};

/** Barra de campanha (PRD 6.2). Fora de janela de lançamento, manter `false`. */
export const CAMPAIGN = {
  active: false,
  text: "Próxima turma começa em {{DATA}}. Vagas limitadas.",
  ctaLabel: "Quero minha vaga",
};

/* ------------------------------------------------------------------ *
 * Prova social — PRD 8.2. Só números confirmados pelo cliente.
 * ------------------------------------------------------------------ */
export const STATS = [
  { n: "30+", l: "turmas presenciais formadas" },
  { n: "+1000", l: "alunos formados" },
  { n: "2x", l: "congressos Amazon Marketing Day" },
  { n: "1x", l: "liderança do WCD, Dia Mundial da Criatividade" },
];

/* ------------------------------------------------------------------ *
 * Cursos da Escola (PRD 9.2)
 * ------------------------------------------------------------------ */
export type Curso = {
  slug: string;
  nome: string;
  emoji: string;
  promessa: string;
  resumo: string;
  /** Conteúdo detalhado existe só para os cursos já validados com o time. */
  detalhado: boolean;
  /** false = página continua no ar (SEO, diagnóstico, WhatsApp), mas some do grid de /escola. */
  visivel: boolean;
};

export const CURSOS: Curso[] = [
  {
    slug: "posicionamento",
    nome: "Posicionamento",
    emoji: "🔤",
    promessa:
      "Antes de aparecer mais, descubra o que só você pode dizer: seu Sinal e o público que você quer transformar.",
    resumo:
      "Fundamentos de posicionamento pra quem ainda soa igual ao concorrente. Seu Sinal, seu público (Travessia) e a mensagem que sustenta tudo o que você publica depois.",
    detalhado: false,
    /** Fora do grid da Escola — as 4 portas atuais são Social Media, Audiovisual, UGC Creator e Destrave. Página segue no ar pro diagnóstico e WhatsApp. */
    visivel: false,
  },
  {
    slug: "social-media-ousado",
    nome: "Social Media Ousado",
    emoji: "📱",
    promessa:
      "Pare de postar por obrigação: posicionamento, conteúdo, calendário e métricas, com plano estratégico pronto no fim.",
    resumo:
      "Pra profissionalizar a gestão de redes: estratégia, calendário, copy e relatório. Do “posto quando dá” pro “entrego resultado e cobro por isso”.",
    detalhado: false,
    visivel: true,
  },
  {
    slug: "ugc-creator",
    nome: "UGC Creator",
    emoji: "🤝",
    promessa:
      "Crie o conteúdo que marcas pagam pra ter, sem precisar de milhões de seguidores.",
    resumo:
      "O caminho pra virar creator de marcas mesmo sem audiência gigante: portfólio, precificação e as primeiras parcerias, do zero ao primeiro contrato.",
    detalhado: false,
    visivel: true,
  },
  {
    slug: "video-maker-e-edicao",
    nome: "Audiovisual",
    emoji: "🎬",
    promessa: "Vídeo que parece você, não template.",
    resumo:
      "Gravar e editar com a própria cara: enquadramento, luz, som e edição no celular ou no computador. Vídeo que parece você, não template.",
    detalhado: false,
    visivel: true,
  },
  {
    slug: "ia-para-iniciantes",
    nome: "IA para iniciantes",
    emoji: "🤖",
    promessa:
      "Produza mais rápido com IA sem virar perfil genérico: roteiro, copy, imagem e vídeo a serviço da sua voz.",
    resumo:
      "Pra quem nunca usou IA pra criar conteúdo: roteiro, copy, imagem, vídeo e automação, direto ao ponto, sem perder a sua voz no meio do processo.",
    detalhado: false,
    /** Fora do grid da Escola — as 4 portas atuais são Social Media, Audiovisual, UGC Creator e Destrave. Página segue no ar pro diagnóstico e WhatsApp. */
    visivel: false,
  },
  {
    slug: "destrave",
    nome: "Destrave",
    emoji: "🎥",
    promessa:
      "O treinamento anti-vergonha de gravar. Técnica, não motivação.",
    resumo:
      "O treinamento anti-vergonha de gravar. Técnica, não motivação: a câmera trava no técnico e destrava no humano. Você sai gravando, de verdade.",
    detalhado: true,
    visivel: true,
  },
];

export function getCurso(slug: string) {
  return CURSOS.find((c) => c.slug === slug);
}

/* ------------------------------------------------------------------ *
 * Conteúdo (PRD 9.6) — posts do MVP
 * ------------------------------------------------------------------ */
/* ------------------------------------------------------------------ *
 * Posts do blog
 * ------------------------------------------------------------------ *
 * Migraram para arquivos MDX em `content/posts/`, validados pelo Velite.
 * A API pública é `lib/posts.ts` (POSTS, getPost, relacionados, formatarData).
 * ------------------------------------------------------------------ */

/* ------------------------------------------------------------------ *
 * Navegação (PRD 6.3 / 6.4)
 * ------------------------------------------------------------------ */
export type NavLink = {
  label: string;
  href: string;
  /** Itens de submenu — quando ausente, o link não abre dropdown. */
  children?: { label: string; href: string }[];
};

export const NAV_LINKS: NavLink[] = [
  {
    label: "Sobre",
    href: "/sobre",
    children: [
      { label: "Quem Somos", href: "/sobre" },
      { label: "Portfólio", href: "/portfolio" },
      { label: "Histórico", href: "/sobre#historico" },
    ],
  },
  {
    label: "Escola",
    href: "/escola",
    children: [
      { label: "Social Media Ousado", href: "/escola/social-media-ousado" },
      { label: "Audiovisual", href: "/escola/video-maker-e-edicao" },
      { label: "UGC Creator", href: "/escola/ugc-creator" },
      { label: "Destrave", href: "/escola/destrave" },
    ],
  },
  {
    label: "Agência",
    href: "/agencia",
    children: [
      { label: "Serviços", href: "/agencia" },
      { label: "Cases", href: "/agencia#cases" },
    ],
  },
  { label: "Comunidade", href: "/comunidade" },
  {
    label: "Conteúdo",
    href: "/conteudo",
    children: [
      { label: "Blog", href: "/conteudo" },
      { label: "Diagnóstico", href: "/diagnostico" },
      { label: "Aulão UGC", href: "/aulao-ugc" },
    ],
  },
];
