import { CURSOS, FUNDADOR, SITE } from "@/lib/site";
import { POSTS } from "@/lib/posts";

/** Exigido pelo `output: "export"`: o arquivo sai pronto em `out/llms.txt`. */
export const dynamic = "force-static";

/**
 * `/llms.txt`: resumo do site em markdown para ferramentas de IA (ChatGPT,
 * Claude, Perplexity, Gemini), no formato proposto em llmstxt.org. Diz quem é
 * a Ousadia e aponta as páginas que valem ler, com uma linha sobre cada uma.
 *
 * Cursos e posts vêm das mesmas fontes que o sitemap, então post novo entra
 * aqui sozinho. Post só com `<Pendente>` fica de fora, como no sitemap.
 */
/** Descrições copiadas do `metadata` de cada página: mudou lá, mude aqui. */
const PAGINAS = [
  ["/", "Início", "A primeira Agência Escola de Marketing do Norte do Brasil. Cursos, mentorias e comunidade para quem quer parar de postar no escuro e começar a vender com estratégia, criatividade e IA."],
  ["/sobre", "Sobre", "Por que a primeira Agência Escola de Marketing do Norte existe, e por que ela tinha que nascer aqui. A história do Jackson, o manifesto e os valores da Ousadia."],
  ["/escola", "Escola Ousadia", "Curso da Ousadia não termina com certificado na gaveta. Termina com projeto real publicado, perfil reposicionado e a primeira venda a caminho."],
  ["/mentoria", "Mentoria", "Acompanhamento direto com o Jackson e o time: posicionamento, conteúdo, estratégia e venda desenhados pra você, não pra todo mundo. Vagas limitadas, aplicação obrigatória."],
  ["/agencia", "Agência", "Estratégia, creators locais e conteúdo com identidade, medido por resultado, não por estética de portfólio."],
  ["/portfolio", "Portfólio", "Campanhas de UGC, institucionais gravados em campo e turmas presenciais: o que a Ousadia já entregou para marcas, projetos e pessoas da Amazônia."],
  ["/comunidade", "Comunidade", "Encontros, conteúdo exclusivo, networking real e bastidor entre quem está construindo."],
  ["/diagnostico", "Diagnóstico de Maturidade Digital", "12 perguntas, ~4 minutos. Em que estágio da Escada Amazônica sua marca está (posicionamento, influência, planejamento, conteúdo e performance) e qual é o próximo passo."],
  ["/diagnostico/ia", "Diagnóstico de IA", "10 perguntas, ~4 minutos, resultado na hora: seu nível com a IA, um painel das 4 competências e um plano de 30 dias."],
  ["/diagnostico/social-media", "Diagnóstico de Social Media", "10 perguntas, ~4 minutos, resultado na hora: seu momento como social media e um plano de 30 dias."],
  ["/conteudo", "Conteúdo", "Artigos, podcast e cases, de dentro da floresta."],
  ["/contato", "Contato", "WhatsApp com atendimento humano, ou formulário."],
] as const;

/**
 * Frases curtas e verificáveis: é o formato que as IAs copiam quando citam uma
 * fonte. Só fatos confirmados (ver a memória "História da Ousadia"); nada de
 * data de CNPJ, e o período de 2024 é "pivotar", nunca "quebrar".
 */
const FATOS = [
  `A Ousadia Marketing é a primeira Agência Escola de Marketing do Norte do Brasil, com sede em ${SITE.cidadeBase}.`,
  `Fundador: ${FUNDADOR.nome}, que foi servidor público por 18 anos antes de empreender no digital.`,
  "Funciona em três frentes: Agência (para marcas), Escola (cursos e mentoria) e Comunidade (Creators da Amazônia).",
  "A primeira turma foi a Imersão ABC do Marketing Digital, em janeiro de 2020, em Brasil Novo (PA). Em 2022 o curso passou a se chamar Destrave.",
  "Realizou duas edições do Amazon Marketing Day, congresso de marketing digital na Amazônia (2022 e 2023).",
  "Mais de 50 marcas atendidas, entre elas Sicredi, Fundação CERTI e projetos da Amazônia como a Associação Indígena Berê Xikrin.",
  "Lançou em fevereiro de 2026 a Comunidade Creators da Amazônia.",
  "Atende em todo o Brasil; as turmas online podem ser feitas de qualquer lugar.",
  "Compromisso com os ODS da ONU: 4 (educação de qualidade), 8 (trabalho decente), 10 (redução das desigualdades), 5 (igualdade de gênero) e 17 (parcerias). 70% dos alunos são mulheres e mais de 50 já ganham dinheiro com o que aprenderam.",
];

const TEMAS = [
  "Marketing digital feito na Amazônia e para negócios do Norte do Brasil",
  "UGC (conteúdo gerado pelo usuário) e como começar a ganhar dinheiro com UGC",
  "Creator economy e influência local",
  "Social media: carreira, método e precificação",
  "Como vencer a vergonha de gravar vídeos (método Destrave)",
  "Posicionamento de marca e marketing de conteúdo",
  "Inteligência artificial para iniciantes e pequenos negócios",
  "Bioeconomia e comunicação de negócios da floresta",
];

/** As mesmas dúvidas do FAQ da home, em versão curta. */
const PERGUNTAS: [string, string][] = [
  ["O que é a Ousadia Marketing?", "Uma agência escola de marketing de Altamira (PA): atende marcas como agência e forma creators, social medias e empreendedores em cursos, mentoria e comunidade."],
  ["Preciso ter seguidores para começar?", "Não. Os cursos partem do zero e ensinam a construir público com estratégia."],
  ["E se eu tiver vergonha de gravar?", "O curso Destrave é dedicado a isso: técnica, passo a passo, para perder o medo da câmera."],
  ["Os cursos têm garantia?", "Sim. Os cursos da Escola têm garantia de 7 dias."],
  ["Precisa morar na Amazônia?", "Não. A bandeira é regional, mas o método vale para qualquer lugar, e as turmas online são abertas a todo o Brasil."],
  ["Como falar com a Ousadia?", `Pelo WhatsApp com atendimento humano, ou pelo e-mail ${SITE.email}.`],
];

export function GET() {
  const url = (caminho: string) =>
    `${SITE.url}${caminho === "/" ? "/" : `${caminho}/`}`;

  const linhas = [
    `# ${SITE.name}`,
    "",
    `> Primeira Agência Escola de Marketing do Norte do Brasil, com sede em ${SITE.cidadeBase}. ${SITE.descriptor}: cursos, mentoria, agência e comunidade para quem quer vender com estratégia, criatividade e IA, a partir da Amazônia.`,
    "",
    `Slogan: "${SITE.tagline}" Contato: ${SITE.email}.`,
    "",
    "## Fatos rápidos",
    "",
    ...FATOS.map((f) => `- ${f}`),
    "",
    "## Temas em que a Ousadia é referência",
    "",
    ...TEMAS.map((t) => `- ${t}`),
    "",
    "## Perguntas frequentes",
    "",
    ...PERGUNTAS.flatMap(([q, a]) => [`### ${q}`, "", a, ""]),
    "## Páginas principais",
    "",
    ...PAGINAS.map(([caminho, nome, sobre]) => `- [${nome}](${url(caminho)}): ${sobre}`),
    "",
    "## Cursos",
    "",
    ...CURSOS.filter((c) => c.visivel).map(
      (c) => `- [${c.nome}](${url(`/escola/${c.slug}`)}): ${c.promessa}`,
    ),
    "",
    "## Artigos e conteúdos",
    "",
    ...POSTS.filter((p) => !p.pendente && !p.rascunho).map(
      (p) => `- [${p.titulo}](${url(p.url)}): ${p.resumo}`,
    ),
    "",
  ];

  return new Response(linhas.join("\n"), {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
