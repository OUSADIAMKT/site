import type { Metadata } from "next";
import Image from "next/image";
import { ArrowRight, MessageCircle } from "lucide-react";
import { Reveal } from "@/components/ui/Reveal";
import { WaveDivider } from "@/components/ui/WaveDivider";
import { PageHero } from "@/components/sections/PageHero";
import { CtaFinal } from "@/components/sections/CtaFinal";
import { FaqList, FaqJsonLd, type FaqItem } from "@/components/sections/Faq";
import { ContentSlot } from "@/components/ui/MediaSlot";
import { YouTubeLite } from "@/components/ui/YouTubeLite";
import { GrafismoDiamonds, Paddle } from "@/components/ui/Motifs";
import { GRUPO_MAPA_UGC, SITE, waAulaoUgc } from "@/lib/site";

export const metadata: Metadata = {
  title: "Aulão Mapa do UGC | Sábado, 7/nov, ao vivo com a Juh Araújo",
  description:
    "Cinco horas ao vivo com Juliana Araújo, creator de Altamira com 70+ marcas atendidas: saia com perfil de UGC arrumado, portfólio no Canva e as primeiras mensagens enviadas para marcas. Sábado, 7/nov, das 15h às 20h. Lote 1 a R$37.",
  alternates: { canonical: `${SITE.url}/aulao-ugc` },
};

/**
 * Landing do Aulão Mapa do UGC, turma de 7/nov/2026. Datas, lotes e as
 * 4 rotas vêm do "Blueprint de Lançamento — Mapa do UGC" (03/10/2026).
 * A página antiga (`legado/social-ugc-ppc/ugc/aulao_ugc.html`) era da turma
 * de 1º/08 e usava o Método MAPA por letras — o blueprint trocou pelas
 * 4 rotas (Perfil, Portfólio, Prospecção, Plataformas).
 *
 * Toda CTA principal cai no grupo de WhatsApp: o checkout ainda não foi
 * escolhido (Hotmart ou Kiwify) e o link do lote sai primeiro no grupo.
 * O pitch do curso de R$197 e a mentoria **não** aparecem aqui de propósito —
 * regra do blueprint: o aulão termina com uma única oferta, feita ao vivo.
 */

const LOTES = [
  {
    nome: "Lote 1",
    preco: "R$ 37",
    quando: "De 26 a 30/out",
    nota: "Abre na segunda, 26/out. O link sai primeiro no grupo.",
  },
  {
    nome: "Lote 2",
    preco: "R$ 47",
    quando: "De 1º a 6/nov",
    nota: "A virada de lote deixa o ingresso R$10 mais caro.",
  },
];

const ROTAS = [
  {
    n: "01",
    t: "Perfil",
    d: "O que é UGC, nicho, bio, foto, destaques e link. Um perfil de aluna é arrumado ao vivo.",
    leva: "Modelo de bio + roteiro de destaques",
  },
  {
    n: "02",
    t: "Portfólio",
    d: "Canva passo a passo e o que colocar mesmo sem marca, gravando UGC com produto que você tem em casa.",
    leva: "Templates de portfólio",
  },
  {
    n: "03",
    t: "Prospecção",
    d: "Como achar marcas, como abordar e a diferença entre permuta e cachê. Todo mundo manda uma mensagem ao vivo.",
    leva: "Prompts de abordagem",
  },
  {
    n: "04",
    t: "Plataformas",
    d: "Cadastro nas plataformas de UGC e nos marketplaces de creators, pra você ser encontrada também.",
    leva: "Lista de plataformas",
  },
];

/** Grade do dia. O pitch das 18h45 fica de fora — é condição só ao vivo. */
const AGENDA = [
  { h: "15h00", t: "Abertura: de Altamira para 70 marcas, e as regras da tarde" },
  { h: "15h20", t: "Rota 1 · Perfil" },
  { h: "16h10", t: "Pausa e desafio: story “tô no Mapa do UGC”" },
  { h: "16h20", t: "Rota 2 · Portfólio" },
  { h: "17h10", t: "Rota 3 · Prospecção, com a primeira mensagem enviada" },
  { h: "17h55", t: "Rota 4 · Plataformas" },
  { h: "18h20", t: "Jackson Satoyiro: UGC como negócio" },
  { h: "18h45", t: "Perguntas, novidades e encerramento às 20h" },
];

const PUBLICO = [
  {
    t: "Quem quer desenvolver uma nova habilidade",
    d: "Pra explorar o UGC como renda extra ou atuação profissional, sem promessa de resultado automático.",
  },
  {
    t: "Quem tem poucos seguidores",
    d: "No UGC, a marca compra o seu vídeo, não o seu alcance. Dá pra fechar com marca grande tendo poucos seguidores.",
  },
  {
    t: "Quem gosta de gravar vídeos",
    d: "Se você testa produtos, grava demonstrações ou conta histórias curtas, o aulão dá direção a essa criatividade.",
  },
  {
    t: "Quem mora longe dos grandes centros",
    d: "O trabalho é produzido e entregue digitalmente. E se você é do Norte, seu cenário é diferencial, não obstáculo.",
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
    q: "Quando é o aulão?",
    a: "Sábado, 7 de novembro de 2026, das 15h às 20h (horário de Brasília), ao vivo e online. São cinco horas em ritmo de oficina, com pausa e uma entrega a cada bloco.",
  },
  {
    q: "Quanto custa?",
    a: "Lote 1: R$37, de 26 a 30 de outubro. Lote 2: R$47, de 1º a 6 de novembro. As vendas fecham no dia 6 ou quando a sala lotar. O link de cada lote sai primeiro no grupo do Mapa do UGC.",
  },
  {
    q: "Preciso ser influenciadora pra participar?",
    a: "Não. No UGC, a marca usa o conteúdo no perfil e nos anúncios dela, não no seu. Ela compra o seu vídeo, não o seu alcance. Dá pra começar sem milhares de seguidores e sem transformar a vida pessoal em conteúdo.",
  },
  {
    q: "Não moro em São Paulo. Consigo aplicar o que for ensinado?",
    a: "Sim. A Juh mora em Altamira, no Pará, e já atendeu mais de 70 marcas sem sair da Amazônia. O mercado de UGC é digital e remoto: você grava da sua casa e envia os arquivos pela internet.",
  },
  {
    q: "Não tenho câmera profissional, posso participar?",
    a: "Pode. O aulão foi pensado pra quem vai começar usando o celular. A qualidade final depende também de iluminação, áudio, roteiro e prática, e esses pontos fazem parte da aula.",
  },
  {
    q: "UGC é promessa de dinheiro rápido?",
    a: "Não. Permuta é a porta de entrada e cachê é o próximo passo. UGC é uma habilidade que pode virar serviço quando existe preparo, prática e prospecção. A gente não promete contrato, aprovação nem faturamento.",
  },
];

const FAQ: FaqItem[] = [
  ...FAQ_TEXTO.slice(0, 2),
  {
    q: "Onde vai ser a transmissão? Fica gravado?",
    a: (
      <>
        <p>
          É online. O link da sala chega pra quem garantir o ingresso, junto com
          os lembretes do dia.
        </p>
        <ContentSlot
          className="mt-3"
          label="Plataforma da transmissão (Zoom, YouTube fechado ou própria) e se haverá gravação — decisões em aberto no blueprint."
        />
        <p className="mt-3">
          O aulão é feito pra você fazer junto, ao vivo: reserve a tarde de 7/11
          na agenda.
        </p>
      </>
    ),
  },
  ...FAQ_TEXTO.slice(2),
];

export default function AulaoUgcPage() {
  const grupoHref = GRUPO_MAPA_UGC;
  const juhHref = waAulaoUgc(
    "Oi, Juh! Tenho uma dúvida sobre o Aulão Mapa do UGC de 7/11.",
  );

  const eventoJsonLd = {
    "@context": "https://schema.org",
    "@type": "Event",
    name: "Aulão Mapa do UGC",
    description:
      "Aulão ao vivo de UGC com Juliana Araújo: as 4 rotas do Mapa do UGC — perfil, portfólio, prospecção e plataformas.",
    startDate: "2026-11-07T15:00:00-03:00",
    endDate: "2026-11-07T20:00:00-03:00",
    eventAttendanceMode: "https://schema.org/OnlineEventAttendanceMode",
    eventStatus: "https://schema.org/EventScheduled",
    location: { "@type": "VirtualLocation", url: `${SITE.url}/aulao-ugc` },
    performer: { "@type": "Person", name: "Juliana Araújo" },
    organizer: {
      "@type": "Organization",
      name: "Ousadia Marketing",
      url: SITE.url,
    },
    offers: [
      {
        "@type": "Offer",
        name: "Lote 1",
        price: "37",
        priceCurrency: "BRL",
        validFrom: "2026-10-26T00:00:00-03:00",
        validThrough: "2026-10-30T23:59:59-03:00",
      },
      {
        "@type": "Offer",
        name: "Lote 2",
        price: "47",
        priceCurrency: "BRL",
        validFrom: "2026-11-01T00:00:00-03:00",
        validThrough: "2026-11-06T23:59:59-03:00",
      },
    ],
    inLanguage: "pt-BR",
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(eventoJsonLd) }}
      />
      <FaqJsonLd items={FAQ_TEXTO} />

      <PageHero
        eyebrow="Aulão ao vivo · Sábado, 7/nov · 15h às 20h"
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
        lead="Cinco horas ao vivo com a Juh pra você sair com o perfil de UGC arrumado, o portfólio pronto no Canva e as primeiras mensagens enviadas para marcas — mesmo sem milhares de seguidores e morando longe do Sudeste."
      >
        <div className="max-w-3xl overflow-hidden rounded-2xl border-2 border-amarelo shadow-[0_28px_70px_rgba(0,0,0,.45)]">
          <YouTubeLite
            id="2Y27xKkvnJE"
            titulo="Vídeo de apresentação do Aulão Mapa do UGC"
          />
        </div>
        <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:items-center">
          <a href={grupoHref} className="btn btn-primary">
            Entrar no grupo do Mapa do UGC <ArrowRight size={16} />
          </a>
          <span className="font-mono text-xs text-cinza-ink">
            Lote 1 a R$37 abre em 26/out · o link sai primeiro no grupo
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
              Você não precisa estar no Sudeste nem ter 100 mil seguidores pra
              marca nacional te pagar
            </h2>
          </Reveal>
          <Reveal delay={0.06}>
            <div className="text-body mt-8 space-y-5 text-lg">
              <p>
                Precisa de um perfil arrumado, um portfólio e coragem de mandar a
                primeira mensagem. Se você acompanha creators recebendo produtos
                e fechando campanhas, talvez já tenha se perguntado:{" "}
                <em>“por que uma marca escolheria justamente eu?”</em>
              </p>
              <p>
                A resposta começa por entender a diferença entre influência e
                produção de conteúdo. Quando uma marca contrata uma{" "}
                <strong className="font-semibold text-foreground">
                  UGC Creator
                </strong>{" "}
                (criadora de conteúdo gerado pelo usuário), ela usa o vídeo no
                perfil e nos anúncios dela. Ela avalia a sua capacidade de criar
                vídeos naturais, claros e alinhados ao produto — não o tamanho da
                sua audiência.
              </p>
              <p>
                E pra quem é do Norte, tem mais: nenhuma creator de São Paulo tem
                o seu cenário.{" "}
                <strong className="font-semibold text-foreground">
                  A gente não é cenário, a gente é creator.
                </strong>
              </p>
              <p className="text-base">
                UGC não é promessa de dinheiro fácil. É uma habilidade que pode
                virar serviço quando existe preparo, prática e prospecção.
              </p>
            </div>
          </Reveal>
        </div>
      </section>

      {/* As 4 rotas */}
      <section className="fold-light relative overflow-hidden">
        <WaveDivider
          className="absolute inset-x-0 top-0 rotate-180"
          color="var(--ink)"
        />
        <div className="container-site relative section-padding">
          <Reveal>
            <p className="eyebrow mb-4">O método</p>
            <h2 className="headline-section max-w-2xl">
              O Mapa do UGC: 4 rotas numa tarde
            </h2>
            <p className="text-body mt-5 max-w-2xl">
              Cada rota termina com uma entrega na hora. Você não sai com
              anotação, sai com o trabalho feito.
            </p>
          </Reveal>
          <ol className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {ROTAS.map((r, i) => (
              <Reveal key={r.t} delay={i * 0.06}>
                <li className="card-surface flex h-full flex-col p-6">
                  <span className="font-display text-3xl text-amarelo">
                    {r.n}
                  </span>
                  <h3 className="font-display text-lg mt-2">Rota {r.t}</h3>
                  <p className="text-body mt-2 text-sm">{r.d}</p>
                  <p className="mt-auto pt-4 font-mono text-[11px] uppercase tracking-wide text-floresta-deep">
                    Você leva · {r.leva}
                  </p>
                </li>
              </Reveal>
            ))}
          </ol>
        </div>
      </section>

      {/* Grade do dia */}
      <section className="relative overflow-hidden bg-roxo section-padding">
        <GrafismoDiamonds
          color="#ffffff"
          className="absolute inset-0 opacity-[0.04]"
        />
        <div className="container-site relative">
          <div className="grid gap-12 lg:grid-cols-[.9fr_1.1fr]">
            <Reveal>
              <p className="eyebrow mb-4">O dia</p>
              <h2 className="headline-section">
                Sábado, 7/nov,{" "}
                <span className="text-amarelo">das 15h às 20h</span>
              </h2>
              <p className="text-body mt-5 max-w-md">
                Cinco horas em ritmo de oficina: mão na massa, pausa e uma
                entrega a cada bloco. Na abertura, você recebe o checklist do
                Mapa. No fim, já mandou sua primeira mensagem para uma marca.
              </p>
            </Reveal>
            <Reveal delay={0.06}>
              <ol className="card-surface divide-y divide-white/10 p-2">
                {AGENDA.map((a) => (
                  <li key={a.h} className="flex gap-5 px-4 py-3.5">
                    <span className="w-14 shrink-0 font-mono text-sm text-amarelo">
                      {a.h}
                    </span>
                    <span className="text-sm text-foreground">{a.t}</span>
                  </li>
                ))}
              </ol>
            </Reveal>
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
                  {[
                    "UGC Creator da Amazônia",
                    "70+ marcas atendidas",
                    "COP30 e Expo Xingu",
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
                    A Juh tem 24 anos, é atriz, creator e estrategista de
                    conteúdo, e mora em Altamira, no Pará — o terceiro maior
                    município do mundo, longe de agência, de contato e de evento
                    de marca. Mesmo assim, já atendeu mais de 70 marcas.
                  </p>
                  <p>
                    Não foi sorte nem número de seguidores. Foi perfil arrumado,
                    portfólio e coragem de mandar mensagem. Ela transformou cada
                    etapa num processo — e é esse processo que ensina pra quem tá
                    começando.
                  </p>
                  <p>
                    Na rota de negócio, o aulão recebe{" "}
                    <strong className="font-semibold text-foreground">
                      Jackson Satoyiro
                    </strong>
                    , da Ousadia Marketing, pra falar de UGC como negócio: quanto
                    cobrar depois da permuta e como virar renda recorrente.
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

      {/* Lotes */}
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
            <p className="text-body mx-auto mt-5 max-w-xl text-center">
              Cinco horas com a Juh, com templates, prompts e a lista de
              plataformas inclusos. As vendas fecham em 6/nov ou quando a sala
              lotar.
            </p>
          </Reveal>
          <div className="mx-auto mt-12 grid max-w-3xl gap-6 sm:grid-cols-2">
            {LOTES.map((l, i) => (
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
          <Reveal delay={0.12}>
            <div className="mt-10 flex flex-col items-center gap-3">
              <a href={grupoHref} className="btn btn-primary">
                Entrar no grupo e receber o link <ArrowRight size={16} />
              </a>
              <span className="font-mono text-xs text-cinza-ink">
                Grupo gratuito no WhatsApp · sem spam, só o Mapa do UGC
              </span>
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
        </div>
      </section>

      <CtaFinal
        title={
          <>
            Sábado, 7/nov, a gente{" "}
            <span className="text-amarelo">abre o mapa inteiro</span>
          </>
        }
        lead="Entra no grupo do Mapa do UGC: é lá que o link do lote 1 sai primeiro, em 26/out, junto com os avisos e os conteúdos de aquecimento da Juh."
        ctaLabel="Entrar no grupo do Mapa do UGC"
        href={grupoHref}
        waveColor="var(--paper)"
        secondary={
          <a href={juhHref} className="btn btn-secondary">
            <MessageCircle size={16} /> Tirar dúvida com a Juh
          </a>
        }
        microcopy="O botão principal abre o grupo no WhatsApp. O segundo fala direto com a Juliana Araújo."
      />
    </>
  );
}
