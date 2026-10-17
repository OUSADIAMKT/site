import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, ChevronDown, MessageCircle } from "lucide-react";
import { Reveal } from "@/components/ui/Reveal";
import { WaveDivider } from "@/components/ui/WaveDivider";
import { PageHero } from "@/components/sections/PageHero";
import { CtaFinal } from "@/components/sections/CtaFinal";
import { FaqList, FaqJsonLd, type FaqItem } from "@/components/sections/Faq";
import { ContentSlot, MediaSlot } from "@/components/ui/MediaSlot";
import { GrafismoDiamonds, Paddle } from "@/components/ui/Motifs";
import { SITE, wa } from "@/lib/site";

export const metadata: Metadata = {
  title: "Social Media Ousado | Curso com Tháscila Lawanda · Escola Ousadia",
  description:
    "Aprenda a pensar como social media, não como quem só posta: posicionamento, conteúdo, calendário, métricas, primeiros clientes e IA em 8 módulos, com a mentoria de Tháscila Lawanda. Você sai com um plano estratégico pronto.",
  alternates: { canonical: `${SITE.url}/escola/social-media-ousado` },
};

/**
 * Landing do curso Social Media Ousado, no molde da `/aulao-ugc`.
 * Conteúdo do "Projeto Pedagógico de Curso — v2.0"
 * (`legado/social-ugc-ppc/ppc/Social Media Ousado - PPC v2.docx`).
 * Esta rota estática tem prioridade sobre `/escola/[curso]`, que deixou de
 * gerar este slug.
 *
 * A faixa de preço do PPC (R$597–997) é posicionamento interno e não aparece.
 * Data da turma, lotes e link de inscrição ainda não foram definidos: enquanto
 * `TURMA` estiver vazia, a seção de ingressos mostra o slot de pendência e as
 * CTAs caem no WhatsApp de atendimento.
 */

type Lote = { nome: string; preco: string; quando: string; nota: string };

const TURMA: {
  /** Texto curto, ex.: "Começa em 9/nov". */
  data: string | null;
  lotes: Lote[];
  /** Checkout ou grupo de WhatsApp da turma. Vazio = WhatsApp de atendimento. */
  link: string | null;
} = {
  data: null,
  lotes: [],
  link: null,
};

/** O Método Ousadia, fase a fase (PPC, seção 4). */
const METODO = [
  { n: "01", t: "Entender", d: "O papel estratégico das redes e o negócio por trás do perfil.", m: "Módulo 1" },
  { n: "02", t: "Ver", d: "Público, posicionamento e mensagem com clareza.", m: "Módulos 2 e 3" },
  { n: "03", t: "Fazer", d: "Conteúdo, roteiros, calendário e pacote pronto pra publicar.", m: "Módulos 4 e 5" },
  { n: "04", t: "Aplicar", d: "Coloca no ar, mede e transforma a habilidade em serviço e renda.", m: "Módulos 6 e 7" },
  { n: "05", t: "Evoluir", d: "Alavancagem com IA e ferramentas, e o próximo degrau.", m: "Módulo 8" },
];

/** Os 8 módulos (PPC, seção 5): aulas, caso da floresta e desafio final. */
const MODULOS = [
  {
    t: "O Perfil Não É Vitrine, É Estratégia",
    aulas: [
      "O que um social media estratégico realmente faz",
      "Diagnóstico de presença digital",
      "Objetivo de negócio nas redes sociais",
      "A jornada do público (Instagram, TikTok e Shorts)",
    ],
    caso: "Diagnosticar o perfil de uma marca de açaí de Belém ou de biojoias de Icoaraci: feed bonito, oferta nenhuma.",
    desafio: "Diagnóstico Estratégico Inicial de um perfil real, com 3 ações prioritárias.",
  },
  {
    t: "Posicionamento Ousado: Como Ser Lembrado",
    aulas: [
      "Quem é a marca e pelo que quer ser lembrada",
      "Público-alvo sem achismo",
      "Proposta de valor",
      "Diferenciação no mercado",
    ],
    caso: "Posicionar uma marca de cosméticos de andiroba e cupuaçu diante das gigantes nacionais: a diferença vem da origem.",
    desafio: "Mapa de Posicionamento, com a frase de posicionamento pra bio.",
  },
  {
    t: "Conteúdo Que Conecta, Educa e Vende",
    aulas: [
      "Os 4 papéis do conteúdo",
      "Linhas editoriais estratégicas",
      "Ganchos que prendem atenção",
      "Storytelling aplicado ao conteúdo",
      "CTA sem parecer forçado",
    ],
    caso: "Transformar o modo de fazer de um artesão ribeirinho em storytelling que nenhum concorrente consegue copiar.",
    desafio: "Matriz de Conteúdo Estratégico: 4 linhas editoriais, formato ideal e CTA de cada ideia.",
  },
  {
    t: "Planejamento de Conteúdo Sem Travar",
    aulas: [
      "Como transformar estratégia em calendário",
      "Frequência possível x frequência ideal",
      "Planejamento semanal de conteúdo",
      "Organização de ideias e referências",
    ],
    caso: "Um calendário realista pra quem posta depois de um dia inteiro de trabalho.",
    desafio: "Calendário Editorial de 15 dias, com gancho, CTA e status de produção.",
  },
  {
    t: "Roteiros, Execução e Conteúdo com Mais Impacto",
    aulas: [
      "Estrutura de roteiro para Reels, TikTok e Shorts",
      "Carrossel que prende leitura",
      "Stories com intenção",
      "Bastidores que geram conexão",
    ],
    caso: "Roteirizar um TikTok do preparo do tacacá ou da colheita do cacau: o formato do Sudeste, com o cenário da floresta.",
    desafio: "Pacote de Conteúdos Prontos: vídeo curto, carrossel, sequência de Stories e bastidores.",
  },
  {
    t: "Métricas, Ajustes e Estratégia de Crescimento",
    aulas: [
      "Métricas que realmente importam",
      "Como saber se um conteúdo funcionou",
      "Relatório simples para tomada de decisão",
      "Como ajustar a estratégia e apresentar métricas ao cliente",
    ],
    caso: "O relatório mensal de uma pousada de ecoturismo: mais reservas, não mais curtidas.",
    desafio: "Relatório Estratégico de Conteúdo, com 3 decisões para o próximo mês.",
  },
  {
    t: "Transformando Estratégia em Serviço",
    aulas: [
      "O mercado do social media hoje",
      "Como conseguir os primeiros clientes",
      "Como criar portfólio sem experiência",
      "Reunião de diagnóstico e apresentação profissional",
      "Proposta comercial, contrato e onboarding",
      "Precificação para iniciantes",
    ],
    caso: "Seus 20 primeiros clientes estão no seu bairro: a ótica, a loja de açaí, o restaurante regional, o artesão do mercado.",
    desafio: "Kit de Início Profissional: portfólio, lista de clientes, roteiro de reunião, proposta e preços.",
  },
  {
    t: "Ferramentas e Inteligência Artificial",
    aulas: [
      "Canva para social media",
      "Notion para organização profissional",
      "ClickUp para gestão de projetos",
      "NotebookLM para organização de conhecimento",
      "Perplexity para pesquisa inteligente",
      "Flow e automações simples",
      "ChatGPT como assistente estratégico",
      "Criando seu primeiro Agente de IA",
    ],
    caso: "Treinar seu agente de IA com o vocabulário e o sotaque da região, pra legenda não soar genérica.",
    desafio: "Sistema Operacional de Social Media, com o seu agente de IA configurado.",
  },
];

/** ICP do PPC (seção 2), em linguagem de página. */
const PUBLICO = [
  {
    t: "Quem salva tudo e trava na hora de aplicar",
    d: "Você consome marketing no Instagram, no TikTok e no YouTube, mas na hora de montar a estratégia não sabe por onde começar.",
  },
  {
    t: "Quem quer prestar serviço de social media",
    d: "Pra fechar os primeiros clientes da sua região com portfólio, proposta e preço, mesmo sem experiência anterior.",
  },
  {
    t: "Empreendedor que cuida das próprias redes",
    d: "Pra parar de postar por obrigação e ter um plano que conversa com o objetivo do seu negócio.",
  },
  {
    t: "Quem mora longe dos grandes centros",
    d: "Você não precisa sair da floresta nem copiar o Sudeste. Os casos do curso são todos amazônicos.",
  },
];

/** Os três ativos do resultado esperado (PPC, seção 8). */
const ATIVOS = [
  {
    t: "Plano Estratégico de Social Media",
    d: "Diagnóstico, posicionamento, 4 linhas editoriais, calendário de 30 dias, pacote de conteúdos e plano de métricas, para uma marca real.",
  },
  {
    t: "Kit de Início Profissional",
    d: "Portfólio, lista de potenciais clientes, roteiro de reunião, proposta comercial e tabela de preços.",
  },
  {
    t: "Sistema Operacional com IA",
    d: "Organização no Notion e no ClickUp, banco de prompts, automações e um agente de IA pra sua rotina.",
  },
];

/** Carga horária real do curso (PPC, seção 11). */
const FORMATO = [
  { valor: "8", label: "módulos" },
  { valor: "39", label: "aulas de 8 a 15 min" },
  { valor: "8–10h", label: "de conteúdo gravado" },
  { valor: "15–25h", label: "de prática guiada" },
];

/** Respostas em texto puro — as únicas que entram no JSON-LD. */
const FAQ_TEXTO = [
  {
    q: "Preciso ter experiência com redes sociais?",
    a: "Não. O curso começa pelo diagnóstico de um perfil e avança um degrau por módulo. Cada aula tem uma atividade prática, e cada módulo termina com uma entrega.",
  },
  {
    q: "Preciso ter muitos seguidores pra trabalhar como social media?",
    a: "Não. Quem contrata social media compra estratégia e entrega, não o tamanho do seu perfil. O módulo 7 ensina a montar portfólio mesmo sem ter atendido clientes.",
  },
  {
    q: "Quais redes o curso cobre?",
    a: "Instagram, TikTok e YouTube Shorts, com foco em vídeo curto e conteúdo vertical do começo ao fim.",
  },
  {
    q: "O curso ensina tráfego pago?",
    a: "Não. O Social Media Ousado é orgânico e estratégico. Tráfego pago é o próximo degrau da Escola, depois que a estratégia está de pé.",
  },
  {
    q: "Quanto tempo preciso pra fazer?",
    a: "São 39 aulas de 8 a 15 minutos, cerca de 8 a 10 horas de conteúdo, mais 15 a 25 horas de prática para montar o seu plano.",
  },
  {
    q: "Como as aulas funcionam?",
    a: "Aulas gravadas, materiais práticos (checklists, canvas, planilhas e templates), um desafio por módulo e comunidade. A Tháscila Lawanda conduz o curso como especialista e mentora.",
  },
];

const FAQ: FaqItem[] = [
  ...FAQ_TEXTO,
  {
    q: "Quando começa a próxima turma e quanto custa?",
    a: (
      <>
        {TURMA.data ? (
          <p>{TURMA.data}. Valores e lotes na seção de ingressos, logo acima.</p>
        ) : (
          <ContentSlot label="Data da próxima turma, lotes e forma de pagamento." />
        )}
        <p className="mt-3">
          Se quiser saber antes, chama a gente no WhatsApp.
        </p>
      </>
    ),
  },
];

export default function SocialMediaOusadoPage() {
  const inscricaoHref =
    TURMA.link ?? wa("escola", "Social Media Ousado");
  const duvidaHref = wa("escola", "Social Media Ousado");

  const cursoJsonLd = {
    "@context": "https://schema.org",
    "@type": "Course",
    name: "Social Media Ousado",
    description:
      "Curso online de estratégia de redes sociais: posicionamento, conteúdo, calendário, métricas, primeiros clientes e IA, em 8 módulos e 39 aulas.",
    provider: {
      "@type": "Organization",
      name: "Ousadia Marketing",
      sameAs: "https://instagram.com/ousadiamkt",
    },
    instructor: { "@type": "Person", name: "Tháscila Lawanda" },
    hasCourseInstance: {
      "@type": "CourseInstance",
      courseMode: "online",
      instructor: { "@type": "Person", name: "Tháscila Lawanda" },
    },
    inLanguage: "pt-BR",
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(cursoJsonLd) }}
      />
      <FaqJsonLd items={FAQ_TEXTO} />

      <PageHero
        eyebrow="Curso online · Escola Ousadia · com Tháscila Lawanda"
        motif="river"
        title={
          <>
            Social media não é sobre postar mais. É sobre{" "}
            <span className="text-amarelo">postar com mais intenção</span>.
          </>
        }
        lead="No Social Media Ousado você aprende a pensar como social media, não como quem só posta: posicionamento, conteúdo, calendário, métricas e os primeiros clientes. No fim, sai com um plano estratégico pronto na mão, pra você, pro seu negócio ou pra um cliente."
      >
        <MediaSlot
          kind="vídeo"
          ratio="aspect-video"
          className="max-w-3xl border-2 border-amarelo"
          label="Vídeo de apresentação do curso com a Tháscila (YouTube)."
        />
        <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:items-center">
          <a href={inscricaoHref} className="btn btn-primary">
            Quero minha vaga <ArrowRight size={16} />
          </a>
          <span className="font-mono text-xs text-cinza-ink">
            8 módulos · 39 aulas · mentoria da Tháscila Lawanda
          </span>
        </div>
      </PageHero>

      {/* Antes e depois */}
      <section className="relative overflow-hidden bg-ink section-padding">
        <Paddle className="motif motif-soft text-amarelo right-[8%] top-12 hidden w-20 rotate-6 lg:block" />
        <div className="container-site relative">
          <Reveal>
            <p className="eyebrow mb-4">A travessia</p>
            <h2 className="headline-section max-w-2xl">
              Você não precisa sair da floresta pra viver de criação de conteúdo
            </h2>
          </Reveal>
          <div className="mt-10 grid gap-6 md:grid-cols-2">
            <Reveal delay={0.04}>
              <div className="card-surface h-full p-7">
                <p className="font-mono text-xs uppercase tracking-wide text-cinza-ink">
                  Antes
                </p>
                <p className="text-body mt-3">
                  Você posta por obrigação, copia trend do Sudeste, salva curso
                  nos stories e trava na hora de aplicar. E acha que precisa de
                  milhares de seguidores, ou de sair do Norte, pra trabalhar com
                  isso.
                </p>
              </div>
            </Reveal>
            <Reveal delay={0.1}>
              <div className="card-surface h-full border-2 border-amarelo p-7">
                <p className="font-mono text-xs uppercase tracking-wide text-amarelo">
                  Depois
                </p>
                <p className="text-body mt-3">
                  Você pensa com estratégia, tem um plano real na mão e sabe
                  como fechar o primeiro cliente da sua região. Sendo você
                  mesma, com sotaque, sem imitar ninguém.
                </p>
              </div>
            </Reveal>
          </div>
          <Reveal delay={0.14}>
            <p className="text-body mt-10 max-w-2xl text-lg">
              <strong className="font-semibold text-foreground">
                Conteúdo sem estratégia vira barulho.
              </strong>{" "}
              Cada módulo do curso empurra você mais um degrau, de quem posta
              por obrigação a quem entrega resultado e cobra por isso.
            </p>
          </Reveal>
        </div>
      </section>

      {/* O método */}
      <section className="fold-light relative overflow-hidden">
        <WaveDivider
          className="absolute inset-x-0 top-0 rotate-180"
          color="var(--ink)"
        />
        <div className="container-site relative section-padding">
          <Reveal>
            <p className="eyebrow mb-4">O método</p>
            <h2 className="headline-section max-w-2xl">
              O Método Ousadia em 5 fases
            </h2>
            <p className="text-body mt-5 max-w-2xl">
              Ninguém pula etapa. Cada fase deixa uma entrega concreta na sua
              mão, do entendimento à evolução contínua.
            </p>
          </Reveal>
          <ol className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-5">
            {METODO.map((f, i) => (
              <Reveal key={f.t} delay={i * 0.06}>
                <li className="card-surface flex h-full flex-col p-6">
                  <span className="font-display text-3xl text-amarelo">
                    {f.n}
                  </span>
                  <h3 className="font-display text-lg mt-2">{f.t}</h3>
                  <p className="text-body mt-2 text-sm">{f.d}</p>
                  <p className="mt-auto pt-4 font-mono text-[11px] uppercase tracking-wide text-floresta-deep">
                    {f.m}
                  </p>
                </li>
              </Reveal>
            ))}
          </ol>
        </div>
      </section>

      {/* Módulos */}
      <section className="relative overflow-hidden bg-roxo section-padding">
        <GrafismoDiamonds
          color="#ffffff"
          className="absolute inset-0 opacity-[0.04]"
        />
        <div className="container-site relative">
          <div className="grid gap-12 lg:grid-cols-[.8fr_1.2fr]">
            <Reveal>
              <p className="eyebrow mb-4">O conteúdo</p>
              <h2 className="headline-section">
                8 módulos,{" "}
                <span className="text-amarelo">39 aulas</span>
              </h2>
              <p className="text-body mt-5 max-w-md">
                Aulas curtas, de 8 a 15 minutos, com prática guiada em todas.
                Cada módulo traz um caso real da floresta e termina com um
                desafio que vira parte do seu plano.
              </p>
              <dl className="mt-8 grid grid-cols-2 gap-4">
                {FORMATO.map((f) => (
                  <div key={f.label} className="card-surface p-4">
                    <dt className="sr-only">{f.label}</dt>
                    <dd className="font-display text-3xl leading-none text-amarelo">
                      {f.valor}
                    </dd>
                    <dd className="text-body mt-1.5 text-xs">{f.label}</dd>
                  </div>
                ))}
              </dl>
            </Reveal>
            <Reveal delay={0.06}>
              <ol className="space-y-3">
                {MODULOS.map((m, i) => (
                  <li key={m.t}>
                    <details className="card-surface group p-5 [&_summary::-webkit-details-marker]:hidden">
                      <summary className="flex cursor-pointer list-none items-start gap-4">
                        <span className="w-8 shrink-0 font-display text-xl text-amarelo">
                          {String(i + 1).padStart(2, "0")}
                        </span>
                        <span className="flex-1">
                          <span className="font-display block text-base text-foreground">
                            {m.t}
                          </span>
                          <span className="font-mono text-[11px] uppercase tracking-wide text-cinza-ink">
                            {m.aulas.length} aulas
                          </span>
                        </span>
                        <ChevronDown
                          size={18}
                          className="mt-1 shrink-0 text-amarelo transition-transform group-open:rotate-180"
                          aria-hidden
                        />
                      </summary>
                      <div className="mt-4 pl-12">
                        <ul className="text-body space-y-1.5 text-sm">
                          {m.aulas.map((a) => (
                            <li key={a}>· {a}</li>
                          ))}
                        </ul>
                        <p className="text-body mt-4 text-sm">
                          <span className="font-mono text-[11px] uppercase tracking-wide text-amarelo">
                            Caso da floresta ·{" "}
                          </span>
                          {m.caso}
                        </p>
                        <p className="text-body mt-2 text-sm">
                          <span className="font-mono text-[11px] uppercase tracking-wide text-amarelo">
                            Desafio final ·{" "}
                          </span>
                          {m.desafio}
                        </p>
                      </div>
                    </details>
                  </li>
                ))}
              </ol>
            </Reveal>
          </div>
        </div>
      </section>

      {/* Mentora */}
      <section className="relative overflow-hidden bg-ink-void section-padding">
        <div className="container-site relative">
          <div className="grid items-center gap-12 lg:grid-cols-[.85fr_1.15fr]">
            <Reveal>
              <MediaSlot
                ratio="aspect-[4/5]"
                className="mx-auto w-full max-w-sm border-2 border-amarelo"
                label="Foto da Tháscila Lawanda (retrato vertical)."
              />
            </Reveal>
            <Reveal delay={0.08}>
              <div>
                <p className="eyebrow mb-4">Quem conduz</p>
                <h2 className="headline-section max-w-xl">
                  Conheça{" "}
                  <span className="text-amarelo">Tháscila Lawanda</span>,
                  especialista e mentora do curso
                </h2>
                <div className="mt-6 flex flex-wrap gap-2">
                  {[
                    "Especialista em social media",
                    "Mentora do Social Media Ousado",
                    "Time Ousadia Marketing",
                  ].map((t) => (
                    <span
                      key={t}
                      className="rounded-full border border-amarelo/50 bg-amarelo/10 px-4 py-1.5 font-mono text-xs text-amarelo"
                    >
                      {t}
                    </span>
                  ))}
                </div>
                <div className="text-body mt-6 space-y-4">
                  <p>
                    A Tháscila é a social media da Ousadia Marketing: coordena o
                    calendário editorial, roteiriza ganchos e cuida da
                    distribuição dos conteúdos da agência-escola. É o trabalho
                    que o curso ensina, feito todo dia, de dentro da Amazônia.
                  </p>
                  <p>
                    No Social Media Ousado, ela conduz você pelos 8 módulos como
                    especialista e mentora, do diagnóstico do primeiro perfil
                    até o plano estratégico pronto pra apresentar a um cliente.
                  </p>
                </div>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* Para quem é */}
      <section className="fold-light relative overflow-hidden">
        <WaveDivider
          className="absolute inset-x-0 top-0 rotate-180"
          color="var(--ink-void)"
        />
        <div className="container-site relative section-padding">
          <Reveal>
            <p className="eyebrow mb-4">Público</p>
            <h2 className="headline-section">Pra quem é este curso</h2>
          </Reveal>
          <div className="mt-12 grid gap-6 sm:grid-cols-2">
            {PUBLICO.map((p, i) => (
              <Reveal key={p.t} delay={i * 0.06}>
                <div className="card-surface h-full p-7">
                  <h3 className="font-display text-lg">{p.t}</h3>
                  <p className="text-body mt-2 text-sm">{p.d}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Com o que você sai */}
      <section className="relative overflow-hidden bg-ink section-padding">
        <div className="container-site relative">
          <Reveal>
            <p className="eyebrow mb-4">Resultado</p>
            <h2 className="headline-section max-w-2xl">
              Você não sai só com conhecimento. Sai com{" "}
              <span className="text-amarelo">três ativos na mão</span>
            </h2>
          </Reveal>
          <div className="mt-10 grid gap-6 md:grid-cols-3">
            {ATIVOS.map((a, i) => (
              <Reveal key={a.t} delay={i * 0.06}>
                <div className="card-surface h-full p-7">
                  <span className="font-display text-3xl text-amarelo">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <h3 className="font-display text-lg mt-2">{a.t}</h3>
                  <p className="text-body mt-2 text-sm">{a.d}</p>
                </div>
              </Reveal>
            ))}
          </div>
          <Reveal delay={0.12}>
            <p className="mt-8 max-w-3xl font-mono text-xs leading-relaxed text-cinza-ink">
              O curso ensina método, não promete cliente nem faturamento. O
              resultado depende da sua aplicação, da prática e das oportunidades
              da sua região.
            </p>
          </Reveal>
        </div>
      </section>

      {/* Ingressos */}
      <section className="relative overflow-hidden bg-roxo section-padding">
        <GrafismoDiamonds
          color="#ffffff"
          className="absolute inset-0 opacity-[0.04]"
        />
        <div className="container-site relative">
          <Reveal>
            <p className="eyebrow mb-4 text-center">Ingressos</p>
            <h2 className="headline-section mx-auto max-w-2xl text-center">
              Quanto antes, <span className="text-amarelo">mais barato</span>
            </h2>
            {TURMA.data && (
              <p className="text-body mx-auto mt-5 max-w-xl text-center">
                {TURMA.data}.
              </p>
            )}
          </Reveal>
          {TURMA.lotes.length > 0 ? (
            <div className="mx-auto mt-12 grid max-w-3xl gap-6 sm:grid-cols-2">
              {TURMA.lotes.map((l, i) => (
                <Reveal key={l.nome} delay={i * 0.08}>
                  <div
                    className={`card-surface h-full p-8 text-center ${i === 0 ? "border-2 border-amarelo" : ""}`}
                  >
                    <p className="font-mono text-xs uppercase tracking-wide text-amarelo">
                      {l.nome} · {l.quando}
                    </p>
                    <p className="font-display mt-4 text-5xl leading-none">
                      {l.preco}
                    </p>
                    <p className="text-body mt-4 text-sm">{l.nota}</p>
                  </div>
                </Reveal>
              ))}
            </div>
          ) : (
            <ContentSlot
              className="mx-auto mt-10 max-w-xl"
              label="Data da turma, lotes (nome, período e valor) e link de inscrição (checkout ou grupo de WhatsApp)."
            />
          )}
          <Reveal delay={0.12}>
            <div className="mt-10 flex flex-col items-center gap-3">
              <a href={inscricaoHref} className="btn btn-primary">
                Quero minha vaga <ArrowRight size={16} />
              </a>
            </div>
          </Reveal>
        </div>
      </section>

      {/* FAQ */}
      <section className="fold-light relative overflow-hidden">
        <WaveDivider
          className="absolute inset-x-0 top-0 rotate-180"
          color="var(--roxo)"
        />
        <div className="container-site relative section-padding max-w-3xl">
          <Reveal>
            <p className="eyebrow mb-4">Dúvidas</p>
            <h2 className="headline-section mb-10">Perguntas frequentes</h2>
          </Reveal>
          <FaqList items={FAQ} />
          <Reveal>
            <Link
              href="/escola"
              className="mt-10 inline-flex items-center gap-2 font-mono text-xs uppercase tracking-wider text-floresta-deep hover:underline"
            >
              ← Ver todos os cursos da Escola
            </Link>
          </Reveal>
        </div>
      </section>

      <CtaFinal
        title={
          <>
            Curtida sozinha não paga boleto.{" "}
            <span className="text-amarelo">Estratégia paga.</span>
          </>
        }
        lead="Garanta sua vaga no Social Media Ousado e saia com um plano estratégico pronto pra aplicar em você, no seu negócio ou num cliente da sua região."
        ctaLabel="Quero minha vaga"
        href={inscricaoHref}
        waveColor="var(--paper)"
        secondary={
          TURMA.link ? (
            <a href={duvidaHref} className="btn btn-secondary">
              <MessageCircle size={16} /> Tirar dúvida no WhatsApp
            </a>
          ) : undefined
        }
      />
    </>
  );
}
