import type { Metadata } from "next";
import Image from "next/image";
import { ArrowRight } from "lucide-react";
import { Reveal } from "@/components/ui/Reveal";
import { WaveDivider } from "@/components/ui/WaveDivider";
import { PageHero } from "@/components/sections/PageHero";
import { CtaFinal } from "@/components/sections/CtaFinal";
import { FaqList, FaqJsonLd, type FaqItem } from "@/components/sections/Faq";
import { ContentSlot } from "@/components/ui/MediaSlot";
import { YouTubeLite } from "@/components/ui/YouTubeLite";
import { GrafismoDiamonds, Paddle } from "@/components/ui/Motifs";
import { SITE, waAulaoUgc } from "@/lib/site";

export const metadata: Metadata = {
  title: "Aulão Mapa do UGC Creator | Do zero ao primeiro portfólio",
  description:
    "Imersão ao vivo com Juliana Araújo pra sair do celular na mão e chegar ao primeiro portfólio de UGC: mercado, apresentação, portfólio e abordagem. Sem precisar ser influenciadora.",
  alternates: { canonical: `${SITE.url}/aulao-ugc` },
};

/**
 * Landing de captura do aulão. A página antiga
 * (`legado/social-ugc-ppc/ugc/aulao_ugc.html`) era amarrada a uma data única —
 * 1º de agosto de 2026, com contagem regressiva e checkout da HeroSpark.
 * Aqui a copy vira evergreen: quem chega fora de janela de turma cai no
 * WhatsApp da Juh em vez de num checkout morto. Data e valor da próxima turma
 * ficam em ContentSlot até o time confirmar — PRD 8.2, nunca inventar dado.
 */

const CONTEUDO = [
  {
    t: "Como funciona o UGC",
    d: "O papel da creator, o que as marcas contratam e como esse serviço se diferencia da influência digital.",
  },
  {
    t: "Perfil e apresentação",
    d: "O que organizar para comunicar com clareza quem você é, o que produz e como pode ajudar uma marca.",
  },
  {
    t: "Primeiro portfólio",
    d: "Como planejar conteúdos demonstrativos usando produtos que você já tem, mesmo antes do primeiro cliente.",
  },
  {
    t: "Abordagem profissional",
    d: "Como buscar marcas, iniciar conversas e apresentar seu trabalho sem depender de ser descoberta por acaso.",
  },
];

const MAPA = [
  {
    letra: "M",
    t: "Mercado e direção",
    d: "Entenda o que é UGC, como as marcas usam esse conteúdo e quais habilidades você precisa desenvolver.",
  },
  {
    letra: "A",
    t: "Apresentação profissional",
    d: "Organize seu posicionamento e seu perfil para apresentar seu trabalho com mais clareza e profissionalismo.",
  },
  {
    letra: "P",
    t: "Portfólio e produção",
    d: "Planeje conteúdos demonstrativos e estruture um portfólio inicial, mesmo sem trabalhos anteriores para marcas.",
  },
  {
    letra: "A",
    t: "Abordagem e acordos",
    d: "Os fundamentos para encontrar empresas, iniciar conversas e alinhar proposta, prazo, entrega e uso do conteúdo.",
  },
];

const PUBLICO = [
  {
    t: "Quem quer desenvolver uma nova habilidade",
    d: "Pra explorar o UGC como renda extra ou atuação profissional, sem promessa de resultado automático.",
  },
  {
    t: "Quem tem poucos seguidores",
    d: "Pra quem quer criar para marcas e ainda não construiu uma audiência grande nas redes.",
  },
  {
    t: "Quem gosta de gravar vídeos",
    d: "Se você testa produtos, grava demonstrações ou conta histórias curtas, o aulão dá direção a essa criatividade.",
  },
  {
    t: "Quem mora longe dos grandes centros",
    d: "O trabalho é produzido e entregue digitalmente. Você grava da sua casa e envia os arquivos pela internet.",
  },
];

/**
 * Prints de campanha aprovada, vindos da página antiga
 * (`legado/site-estatico-jackson/img/`). Todos têm 800px de altura e larguras
 * diferentes — daí o `w` por item, pra `next/image` não deformar nenhum.
 */
const PRINTS = [
  {
    src: "depoimento-diy.jpg",
    w: 1041,
    alt: "Print de WhatsApp: terceira campanha de UGC aprovada com a marca de cosméticos DIY",
  },
  {
    src: "depoimento-samsung.jpg",
    w: 1012,
    alt: "Print de notificação: candidatura aprovada em campanha da Samsung Galaxy",
  },
  {
    src: "depoimento-oralb.jpg",
    w: 1306,
    alt: "Print de aluna aprovada na campanha Iconic da Oral-B no Instagram",
  },
  {
    src: "depoimento-aquarela.jpg",
    w: 1733,
    alt: "Print de aluna aprovada em campanha e convidada para parceria com loja de enxoval infantil",
  },
  {
    src: "depoimento-jakeline.jpg",
    w: 1733,
    alt: "Print de conversa: aluna comemorando parceria recebida no Instagram",
  },
  {
    src: "depoimento-grupo.jpg",
    w: 1357,
    alt: "Print do grupo exclusivo de oportunidades com campanhas de Dove, Lux e Pantene",
  },
];

/** Depoimentos gravados no celular — Shorts, por isso o formato vertical. */
const DEPOIMENTOS = [
  { id: "3iVry7h2C8U", titulo: "Depoimento em vídeo de aluna do método" },
  { id: "ZQgKyvz7UOE", titulo: "Depoimento em vídeo de aluna do método" },
];

/** Respostas em texto puro — as únicas que entram no JSON-LD (PRD 11). */
const FAQ_TEXTO = [
  {
    q: "Preciso ser influenciadora pra participar?",
    a: "Não. Marca contrata capacidade de criar vídeo natural, claro e alinhado ao produto, não tamanho de audiência. Dá pra começar sem milhares de seguidores e sem transformar a vida pessoal em conteúdo.",
  },
  {
    q: "Não moro em São Paulo. Consigo aplicar o que for ensinado?",
    a: "Sim. A própria Juh é creator na Amazônia e atende marcas de todo lugar. O mercado de UGC é digital e remoto: você grava da sua casa e envia os arquivos pela internet.",
  },
  {
    q: "Não tenho câmera profissional, posso participar?",
    a: "Pode. O aulão foi pensado pra quem vai começar usando o celular. A qualidade final depende também de iluminação, áudio, roteiro e prática, e esses pontos fazem parte da aula.",
  },
  {
    q: "O aulão fica gravado?",
    a: "O diferencial é a interação ao vivo e a entrega do Método MAPA em tempo real. Não conte com gravação posterior: reserve o dia na agenda quando a sua turma for confirmada.",
  },
  {
    q: "UGC é promessa de dinheiro rápido?",
    a: "Não. UGC é uma habilidade que pode virar serviço quando existe preparo, prática e prospecção. A gente não promete contrato, aprovação nem faturamento.",
  },
];

const FAQ: FaqItem[] = [
  {
    q: "Quando é a próxima turma e quanto custa?",
    a: (
      <>
        <ContentSlot label="Data, horário e valor da próxima turma do aulão. Confirmar com a Juh antes de publicar." />
        <p className="mt-3">
          Chama no WhatsApp que a gente te avisa assim que a próxima data abrir,
          com o valor e a forma de pagamento.
        </p>
      </>
    ),
  },
  ...FAQ_TEXTO,
];

export default function AulaoUgcPage() {
  const waHref = waAulaoUgc();

  const cursoJsonLd = {
    "@context": "https://schema.org",
    "@type": "Course",
    name: "Aulão Mapa do UGC Creator",
    description:
      "Imersão introdutória e prática sobre o mercado de UGC: mercado e direção, apresentação profissional, portfólio e produção, abordagem e acordos.",
    provider: {
      "@type": "Organization",
      name: "Ousadia Marketing",
      sameAs: "https://instagram.com/ousadiamkt",
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
        eyebrow="Aulão ao vivo · Mapa do UGC Creator"
        motif="river"
        title={
          <>
            Transforme o que você já sabe fazer com o celular em{" "}
            <span className="text-amarelo">
              conteúdo que marcas podem contratar
            </span>
            .
          </>
        }
        lead="Numa tarde ao vivo, você entende como funciona o mercado de UGC, organiza sua apresentação, planeja seu primeiro portfólio e aprende a iniciar conversas com marcas — mesmo sem milhares de seguidores."
      >
        <div className="max-w-3xl overflow-hidden rounded-2xl border-2 border-amarelo shadow-[0_28px_70px_rgba(0,0,0,.45)]">
          <YouTubeLite
            id="2Y27xKkvnJE"
            titulo="Vídeo de apresentação do Aulão Mapa do UGC Creator"
          />
        </div>
        <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:items-center">
          <a href={waHref} className="btn btn-primary">
            Quero minha vaga no aulão <ArrowRight size={16} />
          </a>
          <span className="font-mono text-xs text-cinza-ink">
            Você fala direto com a Juh no WhatsApp · Vagas limitadas pela sala
          </span>
        </div>
      </PageHero>

      {/* A virada de chave */}
      <section className="relative overflow-hidden bg-ink section-padding">
        <Paddle className="motif motif-soft text-amarelo right-[8%] top-12 hidden w-20 rotate-6 lg:block" />
        <div className="container-site relative max-w-3xl">
          <Reveal>
            <p className="eyebrow mb-4">Uma nova possibilidade profissional</p>
            <h2 className="headline-section max-w-2xl">
              Você não precisa ser influenciadora para criar conteúdo para
              marcas
            </h2>
          </Reveal>
          <Reveal delay={0.06}>
            <div className="text-body mt-8 space-y-5 text-lg">
              <p>
                Se você acompanha creators recebendo produtos, produzindo
                campanhas e transformando vídeos em trabalho, talvez já tenha se
                perguntado:{" "}
                <em>“por que uma marca escolheria justamente eu?”</em>
              </p>
              <p>
                A resposta começa por entender a diferença entre influência e
                produção de conteúdo. Quando uma marca contrata uma{" "}
                <strong className="font-semibold text-foreground">
                  UGC Creator
                </strong>{" "}
                (criadora de conteúdo gerado pelo usuário), ela avalia
                principalmente a capacidade de criar vídeos naturais, claros e
                alinhados ao produto — não o tamanho da audiência.
              </p>
              <p>
                Esse conteúdo vai pras redes sociais, pras páginas de venda e
                pros anúncios. Por isso existe espaço pra creator que entende
                briefing, produção, entrega e relacionamento profissional.
              </p>
              <p className="text-base">
                UGC não é promessa de dinheiro fácil. É uma habilidade que pode
                virar serviço quando existe preparo, prática e prospecção.
              </p>
            </div>
          </Reveal>
        </div>
      </section>

      {/* O que você vai aprender */}
      <section className="fold-light relative overflow-hidden">
        <WaveDivider
          className="absolute inset-x-0 top-0 rotate-180"
          color="var(--ink)"
        />
        <div className="container-site relative section-padding">
          <Reveal>
            <p className="eyebrow mb-4">O evento</p>
            <h2 className="headline-section max-w-2xl">
              O que é o Aulão Mapa do UGC Creator
            </h2>
            <p className="text-body mt-5 max-w-2xl">
              Uma imersão introdutória e prática pra você percorrer o caminho
              entre gostar de criar vídeos e se apresentar ao mercado como UGC
              Creator.
            </p>
          </Reveal>
          <ol className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {CONTEUDO.map((c, i) => (
              <Reveal key={c.t} delay={i * 0.06}>
                <li className="card-surface h-full p-6">
                  <span className="font-display text-3xl text-amarelo">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <h3 className="font-display text-lg mt-2">{c.t}</h3>
                  <p className="text-body mt-2 text-sm">{c.d}</p>
                </li>
              </Reveal>
            ))}
          </ol>
        </div>
      </section>

      {/* Método MAPA */}
      <section className="relative overflow-hidden bg-roxo section-padding">
        <GrafismoDiamonds
          color="#ffffff"
          className="absolute inset-0 opacity-[0.04]"
        />
        <div className="container-site relative">
          <Reveal>
            <p className="eyebrow mb-4">O método</p>
            <h2 className="headline-section">
              O Método <span className="text-amarelo">MAPA</span>
            </h2>
            <p className="text-body mt-5 max-w-2xl">
              Quatro pilares pra transformar uma ideia solta num plano de
              entrada no mercado de UGC.
            </p>
          </Reveal>
          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {MAPA.map((m, i) => (
              <Reveal key={m.t} delay={i * 0.06}>
                <div className="card-surface h-full p-6">
                  <span className="font-display text-4xl leading-none text-amarelo">
                    {m.letra}
                  </span>
                  <h3 className="font-display text-lg mt-3">{m.t}</h3>
                  <p className="text-body mt-2 text-sm">{m.d}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Autoridade */}
      <section className="relative overflow-hidden bg-ink-void section-padding">
        <div className="container-site relative">
          <div className="grid items-center gap-12 lg:grid-cols-[.85fr_1.15fr]">
            <Reveal>
              <Image
                src="/aulao-ugc/juh-perfil.jpg"
                alt="Juliana Araújo, UGC Creator da Amazônia"
                width={1498}
                height={1000}
                className="w-full rounded-2xl border-2 border-amarelo object-cover shadow-[0_24px_60px_rgba(0,0,0,.35)]"
              />
            </Reveal>
            <Reveal delay={0.08}>
              <div>
                <p className="eyebrow mb-4">Quem conduz</p>
                <h2 className="headline-section max-w-xl">
                  Conheça <span className="text-amarelo">Juliana Araújo</span>,
                  quem vai conduzir o aulão
                </h2>
                <div className="mt-6 flex flex-wrap gap-2">
                  <span className="rounded-full border border-amarelo/50 bg-amarelo/10 px-4 py-1.5 font-mono text-xs text-amarelo">
                    UGC Creator da Amazônia
                  </span>
                  <span className="rounded-full border border-amarelo/50 bg-amarelo/10 px-4 py-1.5 font-mono text-xs text-amarelo">
                    +50 marcas atendidas
                  </span>
                </div>
                <div className="text-body mt-6 space-y-4">
                  <p>
                    UGC Creator da Amazônia, a Juh já produziu conteúdo pra mais
                    de 50 marcas e construiu sua atuação longe dos grandes
                    centros do mercado publicitário.
                  </p>
                  <p>
                    Ela também começou com dúvida sobre portfólio,
                    posicionamento e abordagem. Foi transformando cada etapa num
                    processo — e é esse processo que ela ensina pra quem tá
                    começando.
                  </p>
                  <p>
                    No aulão, ela compartilha o que aprendeu na prática pra você
                    enxergar o UGC como trabalho: com criatividade, sim, mas
                    também com método, responsabilidade e visão de mercado.
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
            <h2 className="headline-section">Pra quem é este aulão</h2>
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

      {/* Prova social */}
      <section className="relative overflow-hidden bg-ink section-padding">
        <div className="container-site relative">
          <Reveal>
            <p className="eyebrow mb-4">Resultados reais</p>
            <h2 className="headline-section max-w-2xl">
              Quando existe preparo, a creator consegue se apresentar melhor às
              marcas
            </h2>
          </Reveal>
          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {PRINTS.map((p, i) => (
              <Reveal key={p.src} delay={i * 0.05}>
                <figure className="overflow-hidden rounded-xl border-2 border-amarelo/55 bg-roxo shadow-[0_14px_34px_rgba(0,0,0,.3)]">
                  <Image
                    src={`/aulao-ugc/${p.src}`}
                    alt={p.alt}
                    width={p.w}
                    height={800}
                    className="h-full w-full object-cover"
                  />
                </figure>
              </Reveal>
            ))}
          </div>

          <Reveal delay={0.1}>
            <h3 className="headline-section mt-16 text-center text-2xl">
              Elas contam melhor do que a gente
            </h3>
          </Reveal>
          <div className="mx-auto mt-8 grid max-w-2xl gap-6 sm:grid-cols-2">
            {DEPOIMENTOS.map((d, i) => (
              <Reveal key={d.id} delay={i * 0.08}>
                <div className="overflow-hidden rounded-2xl border-2 border-amarelo shadow-[0_20px_50px_rgba(0,0,0,.35)]">
                  <YouTubeLite id={d.id} titulo={d.titulo} formato="vertical" />
                </div>
              </Reveal>
            ))}
          </div>

          <Reveal delay={0.12}>
            <p className="mt-8 max-w-3xl font-mono text-xs leading-relaxed text-cinza-ink">
              Os resultados apresentados são individuais e não representam
              garantia de aprovação, contrato ou renda. O desempenho depende da
              aplicação, da qualidade do trabalho e das oportunidades
              disponíveis.
            </p>
          </Reveal>
        </div>
      </section>

      {/* FAQ */}
      <section className="fold-light relative overflow-hidden">
        <WaveDivider
          className="absolute inset-x-0 top-0 rotate-180"
          color="var(--ink)"
        />
        <div className="container-site relative section-padding max-w-3xl">
          <Reveal>
            <p className="eyebrow mb-4">Dúvidas</p>
            <h2 className="headline-section mb-10">Perguntas frequentes</h2>
          </Reveal>
          <FaqList items={FAQ} />
        </div>
      </section>

      <CtaFinal
        title={
          <>
            Sua vaga tá a <span className="text-amarelo">uma mensagem</span> de
            distância
          </>
        }
        lead="Chama a Juh no WhatsApp pra saber a data da próxima turma e garantir seu lugar na sala. As vagas da transmissão são limitadas pelo suporte."
        ctaLabel="Quero minha vaga no aulão"
        href={waHref}
        waveColor="var(--paper)"
        microcopy="Você é redirecionada(o) pro WhatsApp da Juliana Araújo, que conduz o aulão."
      />
    </>
  );
}
