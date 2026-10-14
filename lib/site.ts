/**
 * Fonte única de dados do site — extraída do PRD (`legado/copy-e-arquitetura/PRD-site-ousadia.md`)
 * e do config do site estático (`legado/site-estatico-jackson/assets/js/config.js`).
 *
 * Regra de ouro do PRD: toda CTA termina em WhatsApp ou em formulário de aplicação.
 * Onde falta dado real do cliente, usar TODO_ / MediaSlot — nunca inventar prova social.
 */

/*
 * Configuração por variável de ambiente
 * --------------------------------------
 * Endereço do site e URLs dos Apps Script podem vir de variáveis
 * `NEXT_PUBLIC_*` (ver `.env.example`). Sem variável, vale o valor de produção
 * escrito aqui, então um `npm run build` sem `.env` gera o site de sempre.
 * Serve pra montar uma versão de teste apontando pra planilhas de teste, sem
 * mexer no código. Variável definida como vazia ("") desliga o envio.
 *
 * O site é estático: essas variáveis são lidas no build e ficam gravadas no
 * HTML/JS. Não coloque segredo nelas.
 */

export const SITE = {
  name: "Ousadia Marketing",
  tagline: "Por um marketing maior.",
  claim: "Propósito que move. Estratégia que transforma.",
  descriptor: "Plataforma de Creators da Amazônia",
  url: process.env.NEXT_PUBLIC_SITE_URL ?? "https://ousadiamarketing.com.br",
  email: "contato@ousadiamarketing.com.br",
  cidadeBase: "Altamira, PA",
  /** Dados do contrato social (JUCEPA, consolidação de 11/02/2026). */
  razaoSocial: "Ousadia Marketing Creators da Amazônia LTDA",
  cnpj: "59.259.789/0001-42",
  endereco: "Rua Coronel José Porfírio, 1651, Centro, Altamira/PA, CEP 68371-030",
} as const;

/**
 * Encarregada pelo tratamento de dados pessoais (LGPD, art. 41): a pessoa que
 * responde aos titulares e à ANPD. Aparece na Política de Privacidade.
 */
export const ENCARREGADO_DADOS = {
  nome: "Tháscila Lawanda",
  email: "contato@ousadiamarketing.com.br",
};

/**
 * Versão da Política de Privacidade em vigor (data da última mudança). Vai
 * gravada junto com cada consentimento nas planilhas, pra saber qual texto a
 * pessoa aceitou. Mudou a política? Atualize a data aqui.
 */
export const POLITICA_VERSAO = "2026-10-13";

/**
 * Imagem padrão de compartilhamento (gerada por `app/og.png/route.tsx`).
 * O layout já usa; página que define o próprio `openGraph` precisa repetir
 * `images: OG_IMAGEM`, porque o Next troca o objeto inteiro, não soma.
 */
export const OG_IMAGEM = [
  { url: "/og.png", width: 1200, height: 630, alt: "Ousadia Marketing: Por um marketing maior." },
];

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

/**
 * Grupo de WhatsApp "Mapa do UGC" da Juh — sala de espera do aulão de 7/nov.
 * É ali que o link de cada lote sai primeiro (blueprint de lançamento,
 * 03/10/2026), por isso as CTAs de `/aulao-ugc` caem no grupo e não no
 * número dela. Parâmetros de compartilhamento (`?s=cl&p=i…`) tirados.
 */
export const GRUPO_MAPA_UGC = "https://chat.whatsapp.com/IFS158jFoeEEXqltGJMLCG";

/**
 * Link de WhatsApp da Mentoria Viver do Digital — também cai na Juh.
 * Enquanto não houver checkout, a inscrição fecha na conversa (blueprint).
 */
export function waMentoriaUgc(
  texto = "Oi, Juh! Quero minha vaga na Mentoria Viver do Digital (Turma 1).",
) {
  return waAulaoUgc(texto);
}

/**
 * A página `/mentoria-viver-do-digital` está no ar para quem recebe o link, mas
 * fica fora do Google (sem sitemap e com `noindex`) até o lançamento da Turma 1,
 * previsto para 10/nov. No lançamento, troque para `true`.
 */
export const MENTORIA_UGC_NO_GOOGLE = false;

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
  process.env.NEXT_PUBLIC_SHEET_ENDPOINT_DIAGNOSTICO ??
  "https://script.google.com/macros/s/AKfycbyLOpwYZOl3OtqYFn6GM0IW0awtE4pXIsULNtTRMyVouGUqS37nBLVqj_vomFU6Wgc3eQ/exec";

/**
 * Web App do Google Apps Script que grava cada inscrição da newsletter na
 * planilha `198NdIbJ413MZlK3RgkX-NRtjpJpK9yjuiv1A5Xq7MzM` (própria, separada
 * da do Diagnóstico). Script pronto em
 * `docs/apps-script/newsletter-google-sheets.gs`, implantado em 14/10/2026.
 * Teste com GET: deve responder "Newsletter Ousadia online" — se pedir login,
 * a implantação não está pública ("Qualquer pessoa").
 */
export const NEWSLETTER_ENDPOINT =
  process.env.NEXT_PUBLIC_NEWSLETTER_ENDPOINT ??
  "https://script.google.com/macros/s/AKfycbylN_rX1XDaSXV8ycRvXgTAo-gg9mbMuhco6QncNsERXYTP_03ydS2HZmNH-nHrAJ7pIw/exec";

/**
 * Web App do Google Apps Script que grava cada diagnóstico do "Ouse Ser
 * Você" (método Satoyiro, `/metodo-satoyiro`) numa planilha própria, separada
 * da do Diagnóstico de Maturidade. Script pronto em
 * `docs/apps-script/metodo-satoyiro-google-sheets.gs` — falta implantar
 * (Extensões > Apps Script > Implantar > App da Web > "Qualquer pessoa") e
 * colar aqui a URL terminada em `/exec`. Testar com GET antes: deve responder
 * "Ouse Ser Você online".
 */
export const SHEET_ENDPOINT_SATOYIRO =
  process.env.NEXT_PUBLIC_SHEET_ENDPOINT_SATOYIRO ??
  "https://script.google.com/macros/s/AKfycbyaPiYzKqNDUE3DMSOheELvUvDQNRnEPV1aG4Seos3Kf9wk28IytLqtYgUym7FcFMxt/exec";

/*
 * O Painel do Educador (`/metodo-satoyiro/educador`) lê as respostas pelo
 * mesmo script, com uma chave que o educador digita e o Google confere
 * (passo 8 do `.gs`). Não existe mais URL de CSV publicada nem senha no
 * código do site: as duas deixavam os dados dos alunos abertos.
 */

/**
 * Web App do Google Apps Script do "Qual é o seu Momento UGC?" (`/momento-ugc`):
 * grava cada resposta numa planilha própria no Drive e manda o diagnóstico
 * completo pro e-mail da menina. Script pronto em
 * `docs/apps-script/momento-ugc-google-sheets.gs`, implantado na planilha
 * "Leads UGC Diagnóstico" (07/10/2026). Testar com GET: deve responder
 * "Momento UGC online". Se esta constante ficar vazia, nada é gravado.
 */
export const SHEET_ENDPOINT_MOMENTO_UGC =
  process.env.NEXT_PUBLIC_SHEET_ENDPOINT_MOMENTO_UGC ??
  "https://script.google.com/macros/s/AKfycbxG9Zm7zJK5AVEQqmzFRU8909PM9QV1jfHmUD79THNl68slQxvKhqig8uVX6BUlaXV_/exec";

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
