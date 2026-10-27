import { CURSOS, SITE } from "@/lib/site";
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
