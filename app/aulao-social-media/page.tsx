import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  BadgeDollarSign,
  CalendarCheck,
  CalendarDays,
  Gauge,
  MapPin,
  Radar,
  Sparkles,
  Target,
  Users,
} from "lucide-react";
import { Reveal } from "@/components/ui/Reveal";
import { WaveDivider } from "@/components/ui/WaveDivider";
import Image from "next/image";
import { KeneStrip } from "@/components/ui/graphics/Kene";
import { CtaFinal } from "@/components/sections/CtaFinal";
import { FaqList, FaqJsonLd } from "@/components/sections/Faq";
import { MediaSlot } from "@/components/ui/MediaSlot";
import { YouTubeLite } from "@/components/ui/YouTubeLite";
import { GrafismoDiamonds, Paddle, RiverLines } from "@/components/ui/Motifs";
import { GRUPO_AULAO_SOCIAL_MEDIA, SITE } from "@/lib/site";
import { DIAGNOSTICO_SOCIAL_MEDIA } from "@/lib/diagnostico-social-media";
import { JornadaRio } from "./JornadaRio";

export const metadata: Metadata = {
  title: "Aulão gratuito de Social Media · 17/11, 20h · com Tháscila Lawanda",
  description:
    "Aula gratuita e ao vivo com Tháscila Lawanda, da Ousadia Marketing: como se posicionar a partir do seu território, conquistar os primeiros clientes e saber quanto cobrar como social media, só com celular e internet. Terça, 17 de novembro, às 20h (Brasília).",
  alternates: { canonical: `${SITE.url}/aulao-social-media` },
};

/**
 * Landing do aulão gratuito de Social Media da Tháscila Lawanda (17/11/2026,
 * 20h). Três fontes, por pedido do usuário (28/10/2026):
 * - estrutura: `/mapa-do-ugc`;
 * - identidade visual: `/agencia` (tema padrão roxo/amarelo, ícones em
 *   azul-rio), por isso a rota não tem o layout de tema verde;
 * - dados e copy: artefato de design "Aulão Social Media Ousado · 17/11"
 *   (claude.ai/artifact/L56KTRgtLpWj4zjwnR6oT8, telas Main e Captura).
 *
 * Todas as CTAs caem no grupo do WhatsApp: o link da transmissão e a condição
 * de Black Friday da mentoria só saem lá.
 *
 * Fotos da Tháscila e os 2 depoimentos em vídeo estão só no artefato (blobs);
 * enquanto não entram em `public/aulao-social-media/`, ficam como MediaSlot.
 *
 * SEO e IAs: título e FAQ miram as buscas "aulão de social media", "como ser
 * social media" e "social media no interior"; a seção "Resposta curta" e o
 * FAQ em texto puro (com JSON-LD) existem para serem citados.
 */

const TEMAS = [
  {
    icon: MapPin,
    t: "Seu território é o seu diferencial",
    d: "Como se posicionar a partir de onde você vive, em vez de esconder isso. Do interior à capital, sua cidade vira argumento de venda.",
  },
  {
    icon: Users,
    t: "Os primeiros clientes",
    d: "Onde encontrar, como abordar e como atender clientes da sua cidade e de fora, trabalhando pela internet.",
  },
  {
    icon: BadgeDollarSign,
    t: "Quanto cobrar",
    d: "O jeito certo de precificar o seu trabalho, sem medo de perder o cliente e sem cobrar no chute.",
  },
];

const COMO_PARTICIPAR = [
  { t: "Entre no grupo do WhatsApp", d: "A inscrição é gratuita e sem obrigação de compra." },
  { t: "Receba o link", d: "O link da transmissão é enviado só no grupo, junto com os lembretes." },
  { t: "Assista ao vivo", d: "Terça, 17/11, às 20h (Brasília), do celular, de onde você estiver." },
  { t: "Fique até o final", d: "A condição de Black Friday da mentoria é revelada no fim do aulão." },
];

const PUBLICO = [
  {
    t: "Quem mora longe da capital",
    d: "Social media se faz pela internet. Você pode atender o comércio da sua cidade e clientes de fora sem se mudar.",
  },
  {
    t: "Quem só tem celular e internet",
    d: "É tudo o que você precisa pra assistir ao aulão e pra começar a trabalhar.",
  },
  {
    t: "Quem não tem seguidores",
    d: "Quem contrata é o dono do negócio. Ele quer ver o que você faz pelas redes dele, não quantas pessoas te seguem.",
  },
  {
    t: "Quem quer transformar redes em profissão",
    d: "Se você já passa horas no Instagram e no TikTok, o aulão mostra como isso vira um serviço que alguém paga.",
  },
];

/** Depoimentos em Shorts. `id: null` = vídeo ainda não subiu pro YouTube. */
const DEPOIMENTOS: { id: string | null; titulo: string }[] = [
  {
    id: "mfOsmSyicGE",
    titulo: "Depoimento em vídeo de aluna do curso de Social Media da Ousadia",
  },
  {
    id: "9lTvGvyO8pI",
    titulo: "Depoimento em vídeo de aluna do curso de Social Media da Ousadia",
  },
  {
    id: "c9tVQ1CsFLc",
    titulo: "Depoimento em vídeo de aluna do curso de Social Media da Ousadia",
  },
  {
    id: "FgYMthEKfCk",
    titulo: "Depoimento em vídeo de aluna do curso de Social Media da Ousadia",
  },
];

/**
 * Mosaico das turmas: grade de células quadradas (4 colunas no desktop, 2 no
 * celular) em que cada foto ocupa 1×1, 2×1 (largo), 1×2 (alto) ou 2×2 (destaque).
 * A ordem abaixo foi montada pra fechar 6 linhas no desktop e 12 no celular sem
 * buraco — ao incluir ou tirar foto, refazer a conta (soma das células = múltiplo
 * de 4). As turma-7 a 10 vieram de stories e já foram cortadas em quadrado, sem
 * as figurinhas. Fotos antigas (turma-4 a 6) são pequenas: ficam em 1×1.
 */
const GALERIA: {
  src: string;
  w: number;
  h: number;
  forma: "largo" | "alto" | "quadrado" | "destaque";
  pos?: string;
  alt: string;
}[] = [
  { src: "turma-certificados-1.webp", w: 900, h: 600, forma: "largo", pos: "object-[50%_40%]", alt: "Turma da Ousadia segurando os certificados de conclusão, com a equipe da Ousadia sentada à frente" },
  { src: "turma-8.webp", w: 900, h: 900, forma: "destaque", alt: "Turma de Social Media da Ousadia reunida no fim da aula, sobre o tapete vermelho" },
  { src: "turma-1.webp", w: 900, h: 1600, forma: "alto", alt: "Jackson com um grupo de alunas sorrindo na sala da Ousadia Marketing" },
  { src: "turma-7.webp", w: 900, h: 900, forma: "quadrado", alt: "Turma de Social Media da Ousadia posando em duas fileiras na sala de aula" },
  { src: "turma-4.webp", w: 463, h: 400, forma: "quadrado", alt: "Primeira turma de Social Media da Ousadia reunida em volta da mesa de aula" },
  { src: "turma-certificados-2.webp", w: 900, h: 600, forma: "largo", pos: "object-[50%_45%]", alt: "Alunos e alunas posando com os certificados em uma turma da Ousadia" },
  { src: "turma-sala.webp", w: 900, h: 600, forma: "largo", pos: "object-[50%_35%]", alt: "Alunos e alunas sorrindo na sala de aula da Ousadia" },
  { src: "turma-2.webp", w: 900, h: 1599, forma: "alto", alt: "Selfie do Jackson com alunas sorrindo durante uma aula da Ousadia" },
  { src: "turma-3.webp", w: 900, h: 1599, forma: "alto", alt: "Selfie de uma turma da Ousadia reunida em volta da mesa de aula" },
  { src: "turma-9.webp", w: 900, h: 900, forma: "quadrado", alt: "Turma de Social Media da Ousadia sorrindo, com o Jackson de camiseta amarela ao centro" },
  { src: "turma-10.webp", w: 900, h: 900, forma: "quadrado", alt: "Segunda turma de Social Media de 2025 reunida na sala da Educorp" },
  { src: "turma-5.webp", w: 456, h: 516, forma: "quadrado", pos: "object-[50%_70%]", alt: "Alunos da primeira aula de Audiovisual da Ousadia posando juntos na sala" },
  { src: "turma-6.webp", w: 462, h: 465, forma: "quadrado", alt: "Turma da Ousadia reunida diante do fundo verde do estúdio" },
  { src: "turma-grupo.webp", w: 900, h: 600, forma: "largo", pos: "object-[50%_30%]", alt: "Cinco mulheres sorrindo lado a lado na sala da Ousadia" },
];

/** O que o Diagnóstico de Social Media entrega (ver `comoFunciona` e o
 *  resultado em lib/diagnostico-social-media.ts). */
const GANHOS_DIAGNOSTICO = [
  {
    icon: Gauge,
    t: "Seu momento",
    d: "Em qual dos 4 momentos você está hoje, do celular parado a quem já é social media.",
  },
  {
    icon: Radar,
    t: "Seu painel",
    d: "Um gráfico das 4 competências do trabalho: mentalidade, ferramentas, conteúdo que prende e vender e cobrar. Você vê onde é forte e o que mais te trava.",
  },
  {
    icon: Target,
    t: "Sua missão da semana",
    d: "Um passo concreto pra dar agora, em vez de uma lista de teoria.",
  },
  {
    icon: CalendarCheck,
    t: "Seu plano de 30 dias",
    d: "Semana a semana, rumo ao primeiro cliente.",
  },
  {
    icon: Sparkles,
    t: "Um comando de IA pronto",
    d: "Feito pro seu objetivo: é só colar no ChatGPT ou no Claude.",
  },
];

const FORMA_GALERIA = {
  largo: "col-span-2",
  alto: "row-span-2",
  quadrado: "",
  destaque: "col-span-2 row-span-2",
} as const;

/** Texto puro: todas entram no JSON-LD de FAQ. */
const FAQ = [
  {
    q: "O aulão de social media é gratuito?",
    a: "Sim. É gratuito e online, na terça, 17 de novembro de 2026, às 20h (horário de Brasília). Basta entrar no grupo do WhatsApp para receber o link. A inscrição não obriga a nenhuma compra.",
  },
  {
    q: "Quem conduz o aulão?",
    a: "Tháscila Lawanda (se fala “Tássila”), de Anapu, no Pará. Ela é uma das sócias-proprietárias da Ousadia Marketing, a primeira Agência Escola de Marketing do Norte do Brasil, e já formou mais de 100 alunas em social media.",
  },
  {
    q: "Serve para a minha cidade?",
    a: "Serve para qualquer cidade, do interior à capital. O trabalho de social media é feito pela internet, e o aulão mostra como usar o lugar onde você vive como diferencial.",
  },
  {
    q: "O que faz um social media?",
    a: "O social media cuida das redes sociais de um negócio: planeja o que postar, cria posts e vídeos curtos, escreve as legendas, publica e mostra os resultados ao cliente. Para quem está começando, o cliente mais acessível costuma ser o comércio local, que precisa de conteúdo e muitas vezes não tem ninguém cuidando disso.",
  },
  {
    q: "Dá pra começar como social media sem experiência e sem seguidores?",
    a: "Dá. Quem contrata é o dono do negócio, e ele avalia o que você consegue fazer pelas redes dele, não o tamanho do seu perfil. No aulão, você vê como se posicionar, onde achar os primeiros clientes e como cobrar.",
  },
  {
    q: "Quanto cobra um social media iniciante?",
    a: "Depende da cidade, do serviço e do que entra no pacote. O aulão ensina o jeito certo de precificar o seu trabalho. A Ousadia ensina método, não promete valor de ganho: a renda depende da execução de cada pessoa.",
  },
  {
    q: "O que acontece em cada encontro da Mentoria Social Media Ousado?",
    a: "São 4 encontros ao vivo, um por semana. Semana 1, posicionamento e portfólio: perfil vitrine, 3 amostras e análise do seu perfil. Semana 2, conteúdo e narrativa: ganchos, roteiros de vídeo curto, conteúdo pensado para a busca nas redes, IA como equipe e um calendário de 30 dias. Semana 3, métricas e relatório: as métricas que o cliente entende e um relatório de uma página. Semana 4, preço e prospecção: tabela de preço, scripts de abordagem, proposta com IA e pacote mensal.",
  },
  {
    q: "Quando vou saber o valor da mentoria?",
    a: "No aulão do dia 17/11. Depois, a condição de Black Friday da Mentoria Social Media Ousado também é enviada no grupo do WhatsApp.",
  },
];

export default function AulaoSocialMediaPage() {
  const eventoJsonLd = {
    "@context": "https://schema.org",
    "@type": "Event",
    name: "Aulão gratuito Social Media Ousado: viva de social media de onde você está",
    description:
      "Aula gratuita e ao vivo com Tháscila Lawanda: como se posicionar a partir do seu território, conquistar os primeiros clientes e cobrar pelo trabalho de social media.",
    startDate: "2026-11-17T20:00:00-03:00",
    eventAttendanceMode: "https://schema.org/OnlineEventAttendanceMode",
    eventStatus: "https://schema.org/EventScheduled",
    isAccessibleForFree: true,
    location: {
      "@type": "VirtualLocation",
      url: `${SITE.url}/aulao-social-media`,
    },
    performer: {
      "@type": "Person",
      name: "Tháscila Lawanda",
      sameAs: "https://www.instagram.com/thascila_lawanda/",
    },
    organizer: {
      "@type": "Organization",
      name: "Ousadia Marketing",
      url: SITE.url,
    },
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "BRL",
      availability: "https://schema.org/InStock",
      url: `${SITE.url}/aulao-social-media`,
    },
    inLanguage: "pt-BR",
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(eventoJsonLd) }}
      />
      <FaqJsonLd items={FAQ} />

      {/* Hero no ritmo do PageHero, com a foto ao lado: a Tháscila aponta
          pro texto, por isso ela fica à esquerda no desktop. */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 grid-lines opacity-50" aria-hidden />
        <div
          className="absolute -top-24 right-0 h-80 w-80 rounded-full bg-amarelo/15 blur-[120px]"
          aria-hidden
        />
        <RiverLines className="motif motif-soft text-rio inset-x-0 bottom-0 h-32 w-full" />
        <div className="container-site relative pt-10 lg:pt-14">
          <div className="grid items-end gap-10 lg:grid-cols-[.8fr_1.2fr]">
            <Reveal className="order-2 lg:order-1">
              <Image
                src="/aulao-social-media/thascila-apontando.webp"
                alt="Tháscila Lawanda, de camiseta da Ousadia Marketing, sorrindo e apontando com a mão aberta"
                width={1000}
                height={1323}
                priority
                className="mx-auto w-full max-w-sm rounded-t-full border border-b-0 border-amarelo/40 lg:max-w-none"
                style={{
                  maskImage: "linear-gradient(to bottom, #000 85%, transparent)",
                }}
              />
            </Reveal>
            <div className="order-1 pb-4 lg:order-2 lg:pb-24">
              <Reveal>
                <p className="eyebrow mb-5">
                  Aulão gratuito e online · Terça, 17/nov · 20h
                </p>
              </Reveal>
              <Reveal delay={0.05}>
                <h1 className="font-display text-[clamp(2.1rem,5.5vw,4rem)] leading-[1.02]">
                  Viva de social media{" "}
                  <span className="text-amarelo">de onde você está.</span>
                </h1>
              </Reveal>
              <Reveal delay={0.1}>
                <p className="text-body mt-6 max-w-2xl">
                  No dia 17 de novembro, às 20h, a Tháscila mostra ao vivo como
                  se posicionar a partir do seu território, conquistar os
                  primeiros clientes e cobrar pelo seu trabalho, sem precisar
                  morar em capital. Você só precisa de um celular e internet.
                </p>
              </Reveal>
              <Reveal delay={0.15}>
                <div className="mt-9 flex flex-col gap-4 sm:flex-row sm:items-center">
                  <a
                    href={GRUPO_AULAO_SOCIAL_MEDIA}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn btn-primary"
                  >
                    Quero entrar no grupo <ArrowRight size={16} />
                  </a>
                  <p className="flex items-center gap-2 font-mono text-xs text-cinza-ink">
                    <CalendarDays size={16} className="text-rio" />
                    O link do aulão é enviado só no grupo.
                  </p>
                </div>
              </Reveal>
            </div>
          </div>
        </div>
        <KeneStrip motif="iso" height={20} className="text-amarelo opacity-70" />
      </section>

      {/* Resposta curta: o trecho que buscadores e IAs citam */}
      <section className="relative overflow-hidden bg-ink section-padding">
        <Paddle className="motif motif-soft text-amarelo right-[8%] top-12 hidden w-20 rotate-6 lg:block" />
        <div className="container-site relative max-w-3xl">
          <Reveal>
            <p className="eyebrow mb-4">Resposta curta</p>
            <h2 className="headline-section max-w-2xl">
              Você não precisa morar em capital pra viver de social media
            </h2>
          </Reveal>
          <Reveal delay={0.06}>
            <div className="text-body mt-8 space-y-5 text-lg">
              <p>
                O{" "}
                <strong className="font-semibold text-foreground">
                  Aulão Social Media Ousado
                </strong>{" "}
                é uma aula gratuita e ao vivo da Ousadia Marketing, a primeira
                Agência Escola de Marketing do Norte do Brasil, conduzida pela
                Tháscila Lawanda. Acontece na terça, 17 de novembro de 2026, às
                20h (Brasília), e mostra como começar a trabalhar como social
                media de qualquer cidade.
              </p>
              <p>
                Social media se faz pela internet. O que separa quem vive disso
                de quem só posta é saber{" "}
                <strong className="font-semibold text-foreground">
                  se posicionar, achar os primeiros clientes e cobrar direito
                </strong>
                . E quem é do interior tem uma vantagem que pouca gente usa: o
                próprio território.
              </p>
              <p className="text-base">
                Social media não é promessa de dinheiro fácil. A gente ensina
                método; a renda depende do que cada pessoa faz com ele.
              </p>
            </div>
          </Reveal>
        </div>
      </section>

      {/* O que você vai ver */}
      <section className="fold-light relative overflow-hidden">
        <WaveDivider
          className="absolute inset-x-0 top-0 rotate-180"
          color="var(--ink)"
        />
        <div className="container-site relative section-padding">
          <Reveal>
            <p className="eyebrow mb-4">Um spoiler</p>
            <h2 className="headline-section max-w-2xl">
              O que você vai ver no aulão do dia 17
            </h2>
          </Reveal>
          <ol className="mt-12 grid gap-6 md:grid-cols-3">
            {TEMAS.map((t, i) => (
              <Reveal key={t.t} delay={i * 0.06}>
                <li className="card-surface h-full p-7">
                  <div className="mb-4 flex items-center justify-between">
                    <t.icon className="text-rio" size={28} />
                    <span className="font-display text-3xl text-floresta-deep">
                      0{i + 1}
                    </span>
                  </div>
                  <h3 className="font-display text-xl">{t.t}</h3>
                  <p className="text-body mt-3 text-[0.95rem]">{t.d}</p>
                </li>
              </Reveal>
            ))}
          </ol>
        </div>
      </section>

      {/* O dia */}
      <section className="relative overflow-hidden bg-roxo-700 section-padding">
        <GrafismoDiamonds
          color="#ffffff"
          className="absolute inset-0 opacity-[0.04]"
        />
        <div className="container-site relative">
          <div className="grid gap-12 lg:grid-cols-[.9fr_1.1fr]">
            <Reveal>
              <p className="eyebrow mb-4">O dia</p>
              <h2 className="headline-section">
                Terça, 17/nov,{" "}
                <span className="text-amarelo">às 20h</span>
              </h2>
              <p className="text-body mt-5 max-w-md">
                Online, gratuito e ao vivo, no horário de Brasília. Separe a
                noite na agenda e assista do celular.
              </p>
            </Reveal>
            <Reveal delay={0.06}>
              <ol className="card-surface divide-y divide-white/10 p-2">
                {COMO_PARTICIPAR.map((c, i) => (
                  <li key={c.t} className="flex gap-5 px-4 py-4">
                    <span className="w-8 shrink-0 font-mono text-sm text-amarelo">
                      0{i + 1}
                    </span>
                    <span>
                      <span className="block text-sm font-semibold text-foreground">
                        {c.t}
                      </span>
                      <span className="text-body mt-1 block text-sm">
                        {c.d}
                      </span>
                    </span>
                  </li>
                ))}
              </ol>
            </Reveal>
          </div>
        </div>
      </section>

      {/* Quem conduz */}
      <section className="relative overflow-hidden bg-ink-void section-padding">
        <RiverLines className="motif motif-soft text-rio inset-x-0 top-1/2 h-32 w-full" />
        <div className="container-site relative">
          <div className="grid items-center gap-12 lg:grid-cols-[.85fr_1.15fr]">
            <Reveal>
              <Image
                src="/aulao-social-media/thascila-blazer.webp"
                alt="Tháscila Lawanda de blazer preto e blusa marrom"
                width={1000}
                height={1499}
                className="mx-auto w-full max-w-md rounded-2xl border-2 border-amarelo object-cover shadow-[0_24px_60px_rgba(0,0,0,.35)]"
              />
            </Reveal>
            <Reveal delay={0.08}>
              <div>
                <p className="eyebrow mb-4">
                  Prazer, eu sou a Tháscila{" "}
                  <span className="normal-case tracking-normal text-cinza-ink">
                    (se fala “Tássila”)
                  </span>
                </p>
                <h2 className="headline-section max-w-xl">
                  Da Vicinal 3 Barracas{" "}
                  <span className="text-amarelo">para o digital.</span>
                </h2>
                <div className="mt-6 flex flex-wrap gap-2">
                  {[
                    "Técnica em Agropecuária",
                    "Licenciada em Português",
                    "Direito (em conclusão)",
                    "+100 alunas",
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
                    Sou de Anapu, no Pará, da Vicinal 3 Barracas. Filha da
                    agricultura familiar, estudei em escola agrícola e me formei
                    técnica em agropecuária. Depois vieram a licenciatura em
                    Português e, hoje, a reta final da faculdade de Direito.
                  </p>
                  <p>
                    No meio desse caminho, encontrei o marketing digital. Estudei
                    muito, pesquisei muito e transformei isso em profissão. Hoje
                    sou uma das sócias-proprietárias da Ousadia Marketing, a 1ª
                    Agência Escola do Norte do Brasil, e já são mais de 100
                    alunas formadas.
                  </p>
                  <p className="border-l-2 border-amarelo pl-5 font-display text-xl text-foreground">
                    Se eu saí da vicinal para o digital, você também consegue,
                    de onde estiver.
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

      {/* A turma: uma galeria só */}
      <section className="relative overflow-hidden bg-ink-void section-padding">
        <div className="container-site relative">
          <Reveal>
            <p className="eyebrow mb-4">A turma</p>
            <h2 className="headline-section max-w-2xl">
              Gente de verdade,{" "}
              <span className="text-amarelo">aprendendo junto.</span>
            </h2>
            <p className="text-body mt-5 max-w-2xl">
              A primeira Agência Escola do Norte do Brasil nasceu ensinando
              gente de carne e osso, uma turma de cada vez.
            </p>
          </Reveal>
          {/* As linhas têm a altura de uma coluna (cqw = largura do
              container), então cada célula é quadrada em qualquer tela. */}
          <div className="@container mx-auto mt-10 max-w-5xl">
            <div className="grid auto-rows-[calc((100cqw-0.75rem)/2)] grid-cols-2 gap-3 md:auto-rows-[calc((100cqw-3rem)/4)] md:grid-cols-4 md:gap-4">
              {GALERIA.map((g) => (
                <figure
                  key={g.src}
                  className={`group overflow-hidden rounded-2xl border-2 border-amarelo/45 shadow-[0_20px_50px_rgba(0,0,0,.35)] ${FORMA_GALERIA[g.forma]}`}
                >
                  <Image
                    src={`/aulao-social-media/${g.src}`}
                    alt={g.alt}
                    width={g.w}
                    height={g.h}
                    sizes={
                      g.forma === "destaque" || g.forma === "largo"
                        ? "(min-width: 768px) 512px, 100vw"
                        : "(min-width: 768px) 256px, 50vw"
                    }
                    className={`h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.04] ${g.pos ?? ""}`}
                  />
                </figure>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Depoimentos */}
      <section className="relative overflow-hidden bg-ink section-padding">
        <div className="container-site relative">
          <Reveal>
            <p className="eyebrow mb-4">Depoimentos</p>
            <h2 className="headline-section max-w-2xl">
              Mais de 100 alunas{" "}
              <span className="text-amarelo">já passaram por aqui.</span>
            </h2>
            <p className="text-body mt-5 max-w-xl">
              Alunas do curso de Social Media da Ousadia contando como foi.
            </p>
          </Reveal>
          <div className="mx-auto mt-10 grid max-w-4xl grid-cols-2 gap-4 sm:gap-6 lg:grid-cols-4">
            {DEPOIMENTOS.map((d, i) => (
              <Reveal key={d.id ?? i} delay={i * 0.08}>
                {d.id ? (
                  <div className="overflow-hidden rounded-2xl border-2 border-amarelo shadow-[0_20px_50px_rgba(0,0,0,.35)]">
                    <YouTubeLite id={d.id} titulo={d.titulo} formato="vertical" />
                  </div>
                ) : (
                  <MediaSlot kind="vídeo" ratio="aspect-[9/16]" label={d.titulo} />
                )}
              </Reveal>
            ))}
          </div>
          <Reveal delay={0.12}>
            <p className="mt-8 max-w-3xl font-mono text-xs leading-relaxed text-cinza-ink">
              Os resultados apresentados são individuais e não representam
              garantia de clientes ou renda. O desempenho depende da aplicação,
              da qualidade do trabalho e das oportunidades disponíveis.
            </p>
          </Reveal>
        </div>
      </section>

      {/* Diagnóstico: o que a pessoa ganha ao descobrir o próprio momento.
          Os 4 momentos vêm da config do teste, pra falar a mesma língua do
          resultado. */}
      <section className="fold-light relative overflow-hidden">
        <WaveDivider
          className="absolute inset-x-0 top-0 rotate-180"
          color="var(--ink)"
        />
        <div className="container-site relative section-padding">
          <div className="grid gap-12 lg:grid-cols-[1.1fr_.9fr] lg:items-start">
            <div>
              <Reveal>
                <p className="eyebrow mb-4">Antes do aulão</p>
                <h2 className="headline-section max-w-xl">
                  Em que trecho do rio{" "}
                  <span className="text-floresta-deep">você está?</span>
                </h2>
                <p className="text-body mt-5 max-w-xl">
                  Quem não sabe onde está rema pro lado errado. O{" "}
                  <strong className="font-semibold">
                    Diagnóstico de Social Media
                  </strong>{" "}
                  é gratuito: 10 perguntas, uns 4 minutos, e o resultado aparece
                  na hora. Você descobre o seu momento e para de gastar energia
                  no que ainda não é a sua vez.
                </p>
              </Reveal>
              <ul className="mt-8 grid gap-4 sm:grid-cols-2">
                {GANHOS_DIAGNOSTICO.map((g, i) => (
                  <Reveal
                    key={g.t}
                    delay={i * 0.05}
                    className={i === GANHOS_DIAGNOSTICO.length - 1 ? "sm:col-span-2" : ""}
                  >
                    <li className="card-surface flex h-full gap-4 p-5">
                      <g.icon className="mt-0.5 shrink-0 text-rio" size={24} />
                      <span>
                        <span className="font-display block text-base">
                          {g.t}
                        </span>
                        <span className="text-body mt-1 block text-sm">
                          {g.d}
                        </span>
                      </span>
                    </li>
                  </Reveal>
                ))}
              </ul>
            </div>

            <Reveal delay={0.08}>
              <div className="card-surface p-6 lg:p-8">
                <p className="font-mono text-xs uppercase tracking-wide text-floresta-deep">
                  Os 4 momentos do diagnóstico
                </p>
                <ol className="mt-5 space-y-4">
                  {DIAGNOSTICO_SOCIAL_MEDIA.niveis.map((n, i) => (
                    <li key={n.id} className="flex gap-4">
                      <span
                        className="grid h-9 w-9 shrink-0 place-items-center rounded-full font-display text-sm text-ink"
                        style={{ background: n.cor }}
                      >
                        {i + 1}
                      </span>
                      <span>
                        <span className="font-display block">{n.nome}</span>
                        <span className="text-body block text-sm italic">
                          “{n.frase}”
                        </span>
                      </span>
                    </li>
                  ))}
                </ol>
                <p className="text-body mt-6 border-t border-black/10 pt-5 text-sm">
                  No aulão do dia 17 você chega sabendo no que prestar atenção, e
                  entende qual parada da mentoria é a sua.
                </p>
                <Link
                  href="/diagnostico/social-media"
                  className="btn btn-primary mt-6 w-full justify-center"
                >
                  Fazer meu diagnóstico grátis <ArrowRight size={16} />
                </Link>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* Oferta do final */}
      <section className="relative overflow-hidden bg-roxo-700 section-padding">
        <GrafismoDiamonds
          color="#ffffff"
          className="absolute inset-0 opacity-[0.04]"
        />
        <div className="container-site relative">
          <Reveal>
            <p className="eyebrow mb-4 text-center">E no final: a Black Friday</p>
            <h2 className="headline-section mx-auto max-w-2xl text-center">
              Mentoria Social Media{" "}
              <span className="text-amarelo">Ousado</span>
            </h2>
            <p className="text-body mx-auto mt-5 max-w-2xl text-center">
              Turma Fundadora: 4 semanas de encontros ao vivo, com análise do
              seu perfil e os modelos de trabalho da Tháscila. Vagas limitadas.
            </p>
            <h3 className="font-display mx-auto mt-12 max-w-2xl text-center text-2xl">
              Todo rio grande começa num{" "}
              <span className="text-amarelo">igarapé</span>
            </h3>
            <p className="text-body mx-auto mt-3 max-w-2xl text-center">
              A mentoria é uma viagem rio abaixo: da nascente, onde você
              descobre de onde brota o seu trabalho, até a foz, onde ele ganha o
              mundo. Um encontro por semana, uma margem nova a cada parada.
            </p>
          </Reveal>
          <JornadaRio />
          <Reveal delay={0.12}>
            <div className="mt-10 flex flex-col items-center gap-3 text-center">
              <p className="font-display text-xl text-amarelo">
                Valor e condições revelados no aulão.
              </p>
              <a
                href={GRUPO_AULAO_SOCIAL_MEDIA}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-primary"
              >
                Quero receber o link do aulão <ArrowRight size={16} />
              </a>
              <Link
                href="/diagnostico/social-media"
                className="font-mono text-xs text-cinza-ink underline underline-offset-4"
              >
                Enquanto isso, descubra seu momento no Diagnóstico de Social Media
              </Link>
            </div>
          </Reveal>
        </div>
      </section>

      {/* FAQ */}
      <section className="fold-light relative overflow-hidden">
        <WaveDivider
          className="absolute inset-x-0 top-0 rotate-180"
          color="var(--roxo-700)"
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
            Te vejo <span className="text-amarelo">no aulão.</span>
          </>
        }
        lead="Entre no grupo para receber o link do dia 17/11 e a condição de Black Friday da mentoria."
        ctaLabel="Entrar no grupo do WhatsApp"
        href={GRUPO_AULAO_SOCIAL_MEDIA}
        waveColor="var(--paper)"
        microcopy="Inscrição gratuita, sem obrigação de compra."
      />
    </>
  );
}
