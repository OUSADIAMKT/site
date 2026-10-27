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
 * O fundador como entidade (JSON-LD do layout e da página /sobre). Um nome só,
 * sempre igual, é o que faz Google e IAs ligarem "Jackson" à Ousadia.
 * ATENÇÃO: o site usa "Jackson Queiroz" (curso de IA) e "Jackson Satoyiro"
 * (Destrave). Confirmar qual é o nome principal antes de publicar.
 */
export const FUNDADOR = {
  nome: "Jackson Queiroz",
  alternateName: ["Jackson Satoyiro"],
  cargo: "Fundador da Ousadia Marketing",
  bio: "Fundador da Ousadia Marketing, a primeira Agência Escola de Marketing do Norte do Brasil. Foi servidor público por 18 anos antes de virar empreendedor no digital. Criador do Destrave e do Amazon Marketing Day.",
  foto: "/sobre/jackson-amd-palco.webp",
};

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
export const POLITICA_VERSAO = "2026-10-18";

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
 * A landing `/mapa-do-ugc` fala direto com ela, não com o atendimento geral —
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
 * Número da Tháscila Lawanda, mentora do Social Media Ousado. Recebe o
 * atendimento do curso Social Media Ousado, da Agência e do Diagnóstico de
 * Social Media (pedido de 19/10/2026). Informado como 91 9381-4449; o 9 extra
 * na frente segue o mesmo padrão do número da Juh (93 9228-2674 → 93 99228-2674).
 */
export const WHATSAPP_THASCILA = "5591993814449";

/** Link de WhatsApp da Tháscila, com a mensagem já preenchida. */
export function waThascila(
  texto = "Oi, Tháscila! Quero saber sobre o Social Media Ousado.",
) {
  return `https://wa.me/${WHATSAPP_THASCILA}?text=${encodeURIComponent(texto)}`;
}

/**
 * WhatsApp de atendimento de um curso: UGC Creator cai na Juh, Social Media
 * Ousado na Tháscila e os demais no atendimento geral da Ousadia.
 */
export function waCurso(slug: string, nome: string) {
  const texto = `Oi! Quero saber sobre o curso ${nome}.`;
  if (slug === "ugc-creator") return waAulaoUgc(texto);
  if (slug === "social-media-ousado") return waThascila(texto);
  return wa("escola", nome);
}

/**
 * Grupo de WhatsApp "Mapa do UGC" da Juh — sala de espera do aulão de 7/nov.
 * É ali que o link de cada lote sai primeiro (blueprint de lançamento,
 * 03/10/2026), por isso as CTAs de `/mapa-do-ugc` caem no grupo e não no
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

/**
 * Diagnóstico de IA (`/diagnostico/ia`): grava nome, e-mail, WhatsApp,
 * profissão, faixa etária e o resultado na planilha "Leads Diagnóstico de IA"
 * (Drive, criada em 18/10/2026), aba "IA", com a aba "Painel" montada pelo
 * script. Backend: `docs/apps-script/diagnostico-ia-google-sheets.gs` (v3),
 * implantado em 18/10/2026 (a v1 usava a URL `AKfycbxr7wy…`) como App da Web (Executar como: Eu; acesso:
 * Qualquer pessoa, senão o Google pede login e nada grava). Testar com GET:
 * deve responder "Diagnóstico de IA online". Vazio = o teste funciona, mas
 * nada é gravado.
 */
export const SHEET_ENDPOINT_DIAGNOSTICO_IA =
  process.env.NEXT_PUBLIC_SHEET_ENDPOINT_DIAGNOSTICO_IA ??
  "https://script.google.com/macros/s/AKfycbxeYn40VwJrHg5DjRnxU83qd8VWjstxj1emWIy49Ec1Z9vLMWnV66WN2Zxt0PZ8adfW/exec";

/**
 * Diagnóstico de Social Media (`/diagnostico/social-media`): planilha
 * própria, separada da de IA, porque a mentora Tháscila Lawanda recebe esses
 * leads (pedido de 18/10/2026). Backend:
 * `docs/apps-script/diagnostico-social-media-google-sheets.gs`, implantado
 * em 18/10/2026 (Executar como: Eu; acesso: Qualquer pessoa). Vazio = o teste
 * funciona, mas nada é gravado.
 */
export const SHEET_ENDPOINT_DIAGNOSTICO_SOCIAL_MEDIA =
  process.env.NEXT_PUBLIC_SHEET_ENDPOINT_DIAGNOSTICO_SOCIAL_MEDIA ??
  "https://script.google.com/macros/s/AKfycbxJH9I5FC4H1U4nvJpVwWnI5hif6U0BHjGcsdqL_yn5nuGUKluj4ad5Rdf2taxFNN0/exec";

export const SOCIAL = {
  instagram: "https://instagram.com/ousadiamkt",
  tiktok: "https://www.tiktok.com/@ousadiamkt",
  youtube: "https://www.youtube.com/@ousadiamarketing",
  linkedin: "https://www.linkedin.com/in/ousadiamarketing/",
};

/** Redes na ordem em que aparecem no rodapé e no /contato. */
export const REDES: { rede: keyof typeof SOCIAL; label: string }[] = [
  { rede: "instagram", label: "Instagram" },
  { rede: "tiktok", label: "TikTok" },
  { rede: "youtube", label: "YouTube" },
  { rede: "linkedin", label: "LinkedIn" },
];

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
  { n: "50+", l: "marcas atendidas" },
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
    /** Fora do grid da Escola — as 4 portas atuais são Social Media, UGC Creator, IA para iniciantes e Destrave. Página segue no ar pro diagnóstico e WhatsApp. */
    visivel: false,
  },
  {
    slug: "social-media-ousado",
    nome: "Social Media Ousado",
    emoji: "📱",
    promessa:
      "Em 4 semanas, do celular parado pro primeiro trabalho pago de social media, atendendo o comércio do seu bairro.",
    resumo:
      "Pra jovens de 18 a 24 anos: escolher um serviço, oferecer, fechar, entregar e cobrar, tudo no celular, com 4 encontros de mentoria ao vivo e a Tháscila Lawanda como mentora.",
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
    slug: "ia-para-iniciantes",
    nome: "IA para iniciantes",
    emoji: "🤖",
    promessa:
      "Do zero à prática em 30 horas: use IA no trabalho com autonomia e senso crítico, sem programação e só com planos gratuitos.",
    resumo:
      "Pra quem nunca usou IA: assistentes, prompts, produtividade, conteúdo, negócios e automação sem código, com 70% de prática e Jackson Queiroz conduzindo.",
    detalhado: false,
    visivel: true,
  },
  {
    slug: "destrave",
    nome: "Destrave",
    emoji: "🎥",
    promessa:
      "O treinamento anti-vergonha de gravar. Técnica, não motivação.",
    resumo:
      "O treinamento anti-vergonha de gravar. Técnica, não motivação: a câmera trava no técnico e destrava no humano. Em dois formatos: Online, com 6 semanas ao vivo pelo celular, ou Imersão de 2 dias presenciais em Altamira.",
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
export type NavItem = { label: string; href: string };

/**
 * Item do menu principal: ou um link simples, ou só um rótulo que abre um
 * submenu (sem link próprio: a página vem de um dos itens do submenu).
 */
export type NavLink =
  | { label: string; href: string; children?: undefined }
  | { label: string; href?: undefined; children: NavItem[] };

export const NAV_LINKS: NavLink[] = [
  { label: "Quem somos", href: "/sobre" },
  {
    // A Imersão Mapa do UGC morava em "Conteúdo"; foi pra Escola quando o Blog
    // virou item próprio do menu (27/10/2026).
    label: "Escola",
    children: [
      { label: "Todos os cursos", href: "/escola" },
      { label: "Imersão Mapa do UGC", href: "/mapa-do-ugc" },
    ],
  },
  { label: "Agência", href: "/agencia" },
  { label: "Comunidade", href: "/comunidade" },
  { label: "Blog", href: "/conteudo" },
  {
    // Um teste por área (pedido de 18/10/2026).
    label: "Diagnóstico",
    children: [
      { label: "Social Media", href: "/diagnostico/social-media" },
      { label: "UGC Creator", href: "/momento-ugc" },
      { label: "Posicionamento", href: "/diagnostico" },
      { label: "Inteligência Artificial", href: "/diagnostico/ia" },
      { label: "Destrave (Autenticidade)", href: "/metodo-satoyiro" },
    ],
  },
];
