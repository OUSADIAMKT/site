import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import {
  ArrowRight,
  BadgeDollarSign,
  CalendarDays,
  Gift,
  MapPin,
  Play,
  Users,
} from "lucide-react";
import { Reveal } from "@/components/ui/Reveal";
import { WaveDivider } from "@/components/ui/WaveDivider";
import { KeneStrip } from "@/components/ui/graphics/Kene";
import { CtaFinal } from "@/components/sections/CtaFinal";
import { FaqList, FaqJsonLd } from "@/components/sections/Faq";
import { YouTubeLite } from "@/components/ui/YouTubeLite";
import { GrafismoDiamonds, RiverLines } from "@/components/ui/Motifs";
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
 * 20h). Fontes: estrutura da `/mapa-do-ugc`, visual da `/agencia` e dados do
 * artefato "Aulão Social Media Ousado · 17/11"
 * (claude.ai/artifact/L56KTRgtLpWj4zjwnR6oT8).
 *
 * Objetivo único: entrar no grupo do WhatsApp (o link da live e a condição de
 * Black Friday saem só lá). Ordem pensada como página de captura (revisão de
 * 28/10/2026): dor → o que você vai ver + por que agora → prova → quem conduz
 * → como participar + bônus ao vivo → diagnóstico (próximo passo enquanto
 * espera) → mentoria em versão curta → FAQ. A jornada completa da mentoria fica
 * guardada em `<JornadaRio completa />` pra página da mentoria; aqui o pitch é
 * só um gostinho, porque ele acontece ao vivo.
 *
 * SEO e IAs: título e FAQ miram "aulão de social media", "como ser social
 * media" e "social media no interior"; o parágrafo "O que é o aulão" e o FAQ em
 * texto puro (com JSON-LD) existem para serem citados.
 */

const CTA = "Quero meu lugar no aulão grátis";

/** Espelho da dor: as dores do público no PPC, na voz de quem sente. */
const DORES = [
  "Passa horas no Instagram e no TikTok, mas isso ainda não paga nenhum boleto.",
  "Acha que precisa de muitos seguidores, de notebook ou de morar em capital pra trabalhar com redes.",
  "Tem vergonha de oferecer serviço, ainda mais pra conhecido.",
  "Até sabe fazer um post bonito, mas não sabe onde achar cliente nem quanto cobrar.",
  "Já viu curso caro que prometia muito e entregou teoria.",
];

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

/** Depoimentos em Shorts (vídeos verticais das alunas). */
const DEPOIMENTOS = [
  "mfOsmSyicGE",
  "9lTvGvyO8pI",
  "c9tVQ1CsFLc",
  "FgYMthEKfCk",
];

/**
 * Mosaico das turmas: células quadradas (4 colunas no desktop, 2 no celular);
 * cada foto ocupa 1×1, 2×1 (largo), 1×2 (alto) ou 2×2 (destaque). Estas 8
 * fecham 4 linhas no desktop e 8 no celular sem buraco — ao trocar foto,
 * refazer a conta (soma das células = múltiplo de 4) e conferir a ordem.
 * As outras fotos das turmas seguem em `public/aulao-social-media/`.
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
  { src: "turma-2.webp", w: 900, h: 1599, forma: "alto", alt: "Selfie do Jackson com alunas sorrindo durante uma aula da Ousadia" },
  { src: "turma-certificados-2.webp", w: 900, h: 600, forma: "largo", pos: "object-[50%_45%]", alt: "Alunos e alunas posando com os certificados em uma turma da Ousadia" },
  { src: "turma-7.webp", w: 900, h: 900, forma: "quadrado", alt: "Turma de Social Media da Ousadia posando em duas fileiras na sala de aula" },
  { src: "turma-10.webp", w: 900, h: 900, forma: "quadrado", alt: "Segunda turma de Social Media de 2025 reunida na sala da Educorp" },
  { src: "turma-sala.webp", w: 900, h: 600, forma: "largo", pos: "object-[50%_35%]", alt: "Alunos e alunas sorrindo na sala de aula da Ousadia" },
];

const FORMA_GALERIA = {
  largo: "col-span-2",
  alto: "row-span-2",
  quadrado: "",
  destaque: "col-span-2 row-span-2",
} as const;

/** Fotos da Tháscila na Vicinal 3 Barracas, antes do digital. */
const ORIGENS: { src: string; w: number; h: number; pos?: string; alt: string }[] = [
  { src: "origem-cavalo.webp", w: 700, h: 1131, pos: "object-[50%_30%]", alt: "Tháscila a cavalo, de chapéu de palha, com uma criança na garupa, num pasto da vicinal" },
  { src: "origem-estrada.webp", w: 700, h: 875, alt: "Tháscila numa estrada de terra vermelha, cercada de mato, na vicinal" },
  { src: "origem-comunidade.webp", w: 800, h: 710, pos: "object-[45%_50%]", alt: "Tháscila falando para um grupo de moradores reunidos à sombra de um caramanchão" },
  { src: "origem-bezerro.webp", w: 700, h: 875, alt: "Tháscila agachada no curral, sorrindo, ao lado de um bezerro" },
];

const COMO_PARTICIPAR = [
  { t: "Entre no grupo do WhatsApp", d: "A inscrição é gratuita e sem obrigação de compra." },
  { t: "Receba o link", d: "O link da transmissão sai só no grupo, junto com os lembretes." },
  { t: "Assista ao vivo", d: "Terça, 17/11, às 20h (Brasília), do celular, de onde você estiver." },
  { t: "Fique até o final", d: "O bônus de quem está ao vivo e a condição de Black Friday da mentoria saem no fim." },
];

/** O que o Diagnóstico de Social Media entrega (ver lib/diagnostico-social-media.ts). */
const GANHOS_DIAGNOSTICO = [
  "Seu momento",
  "Painel das 4 competências",
  "Missão da semana",
  "Plano de 30 dias",
  "Comando de IA pronto",
];

/** Texto puro: todas entram no JSON-LD de FAQ. */
const FAQ = [
  {
    q: "O aulão de social media é gratuito?",
    a: "Sim. É gratuito e online, na terça, 17 de novembro de 2026, às 20h (horário de Brasília). Basta entrar no grupo do WhatsApp para receber o link. A inscrição não obriga a nenhuma compra.",
  },
  {
    q: "Preciso assistir ao vivo?",
    a: "O aulão foi feito pra ser assistido ao vivo: é na hora que você tira dúvidas, recebe o bônus de quem está presente e conhece a condição de Black Friday da mentoria. Separe a noite de 17/11 na agenda; os lembretes chegam no grupo.",
  },
  {
    q: "Serve para a minha cidade?",
    a: "Serve para qualquer cidade, do interior à capital. O trabalho de social media é feito pela internet, e o aulão mostra como usar o lugar onde você vive como diferencial.",
  },
  {
    q: "Dá pra começar como social media sem experiência e sem seguidores?",
    a: "Dá. Quem contrata é o dono do negócio, e ele avalia o que você consegue fazer pelas redes dele, não o tamanho do seu perfil. No aulão, você vê como se posicionar, onde achar os primeiros clientes e como cobrar.",
  },
  {
    q: "Dá pra trabalhar como social media só com o celular?",
    a: "Dá. Gravação, edição, artes, atendimento e agendamento cabem no celular, com aplicativos gratuitos. É tudo o que você precisa pra assistir ao aulão e pra começar.",
  },
  {
    q: "O que faz um social media?",
    a: "O social media cuida das redes sociais de um negócio: planeja o que postar, cria posts e vídeos curtos, escreve as legendas, publica e mostra os resultados ao cliente. Para quem está começando, o cliente mais acessível costuma ser o comércio local, que precisa de conteúdo e muitas vezes não tem ninguém cuidando disso.",
  },
  {
    q: "Quanto cobra um social media iniciante?",
    a: "Depende da cidade, do serviço e do que entra no pacote. O aulão ensina o jeito certo de precificar o seu trabalho. A Ousadia ensina método, não promete valor de ganho: a renda depende da execução de cada pessoa.",
  },
  {
    q: "Quem conduz o aulão?",
    a: "Tháscila Lawanda (se fala “Tássila”), de Anapu, no Pará. Ela é uma das sócias-proprietárias da Ousadia Marketing, a primeira Agência Escola de Marketing do Norte do Brasil, e já formou mais de 100 alunas em social media.",
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

/** Botão principal: sempre o grupo do WhatsApp. */
function BotaoGrupo({ label = CTA }: { label?: string }) {
  return (
    <a
      href={GRUPO_AULAO_SOCIAL_MEDIA}
      target="_blank"
      rel="noopener noreferrer"
      className="btn btn-primary"
    >
      {label} <ArrowRight size={16} />
    </a>
  );
}

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

      {/* 1. Hero em tela cheia: a foto dela com o celular ocupa o fundo
          (à direita no desktop, em cima no celular) e o texto vem por cima,
          sobre um scrim na cor do fundo. Vídeo de fundo só com MP4 próprio
          (ver HeroVideo) — iframe do YouTube como fundo pesa e mostra a marca. */}
      <section className="relative isolate overflow-hidden bg-ink-void">
        <div className="absolute inset-0 -z-10 lg:left-[38%]">
          <Image
            src="/aulao-social-media/thascila-celular.webp"
            alt="Tháscila Lawanda, de camiseta da Ousadia Marketing, segurando o celular"
            fill
            priority
            sizes="(min-width: 1024px) 62vw, 100vw"
            className="object-cover object-[50%_15%]"
          />
        </div>
        <div
          aria-hidden
          className="absolute inset-0 -z-10 bg-gradient-to-t from-ink-void from-35% via-ink-void/70 via-55% to-ink-void/0 lg:bg-gradient-to-r lg:from-ink-void lg:from-[38%] lg:via-ink-void/60 lg:via-[55%] lg:to-ink-void/0"
        />
        <div className="absolute inset-0 -z-10 grid-lines opacity-30" aria-hidden />
        <div
          className="absolute -left-24 top-1/3 -z-10 h-96 w-96 rounded-full bg-amarelo/10 blur-[140px]"
          aria-hidden
        />

        <div className="container-site relative flex min-h-[min(calc(100svh-4rem),58rem)] items-end pb-14 pt-[min(52vh,28rem)] lg:items-center lg:py-24">
          <div className="max-w-xl">
            <Reveal>
              <p className="inline-flex items-center gap-2.5 rounded-full border border-amarelo/50 bg-ink-void/60 px-4 py-1.5 font-mono text-[11px] uppercase tracking-[0.18em] text-amarelo backdrop-blur">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amarelo opacity-75" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-amarelo" />
                </span>
                Aulão gratuito e ao vivo
              </p>
            </Reveal>
            <Reveal delay={0.05}>
              <h1 className="font-display mt-6 text-[clamp(2.4rem,6vw,4.6rem)] leading-[0.98]">
                Viva de social media{" "}
                <span className="text-amarelo">de onde você está.</span>
              </h1>
            </Reveal>
            <Reveal delay={0.1}>
              <p className="text-body mt-6 text-lg">
                Ao vivo, a Tháscila mostra como se posicionar a partir do seu
                território, conquistar os primeiros clientes e cobrar pelo seu
                trabalho. Sem morar em capital e sem precisar de seguidores.
              </p>
            </Reveal>

            <Reveal delay={0.15}>
              <div className="mt-8 flex items-center gap-5 rounded-2xl border border-white/10 bg-ink-void/70 p-4 backdrop-blur">
                <div className="grid h-16 w-16 shrink-0 place-items-center rounded-xl bg-amarelo text-ink">
                  <span className="text-center leading-none">
                    <span className="font-display block text-2xl">17</span>
                    <span className="font-mono block text-[10px] uppercase tracking-widest">
                      nov
                    </span>
                  </span>
                </div>
                <div className="text-sm">
                  <p className="font-display text-base text-foreground">
                    Terça-feira, às 20h (Brasília)
                  </p>
                  <p className="text-body">
                    Online, pelo celular. O link sai no grupo do WhatsApp.
                  </p>
                </div>
              </div>
            </Reveal>

            <Reveal delay={0.2}>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
                <BotaoGrupo />
                <a href="#aula" className="btn btn-secondary">
                  <Play size={16} /> Ver a Tháscila em aula
                </a>
              </div>
            </Reveal>

            <Reveal delay={0.25}>
              <dl className="mt-10 grid max-w-md grid-cols-3 divide-x divide-white/15 border-t border-white/15 pt-6">
                {[
                  { n: "+100", t: "alunas formadas" },
                  { n: "1ª", t: "Agência Escola do Norte" },
                  { n: "R$ 0", t: "pra participar" },
                ].map((s, i) => (
                  <div key={s.t} className={i === 0 ? "pr-4" : "px-4"}>
                    <dt className="font-display text-2xl text-amarelo lg:text-3xl">
                      {s.n}
                    </dt>
                    <dd className="text-body mt-1 text-xs leading-snug">
                      {s.t}
                    </dd>
                  </div>
                ))}
              </dl>
            </Reveal>
          </div>
        </div>
        <KeneStrip motif="iso" height={20} className="text-amarelo opacity-70" />
      </section>

      {/* 2. Espelho da dor + a aula dela como prova de que ensina na prática */}
      <section className="relative overflow-hidden bg-ink section-padding">
        <div className="container-site relative">
          <div className="grid gap-14 lg:grid-cols-[1.05fr_.95fr] lg:items-start">
            <div>
              <Reveal>
                <p className="eyebrow mb-4">Isso é você?</p>
                <h2 className="headline-section max-w-xl">
                  Você passa horas nas redes. Por que isso{" "}
                  <span className="text-amarelo">ainda não virou dinheiro?</span>
                </h2>
              </Reveal>
              <ol className="mt-10 divide-y divide-white/10 border-y border-white/10">
                {DORES.map((d, i) => (
                  <Reveal key={d} delay={i * 0.05}>
                    <li className="flex items-baseline gap-5 py-4">
                      <span className="font-display w-8 shrink-0 text-xl text-amarelo/60">
                        0{i + 1}
                      </span>
                      <span className="text-body text-[1.05rem]">{d}</span>
                    </li>
                  </Reveal>
                ))}
              </ol>
              <Reveal delay={0.1}>
                <div className="mt-10 rounded-2xl border-l-4 border-amarelo bg-amarelo/[.07] p-7">
                  <p className="font-mono text-xs uppercase tracking-wide text-amarelo">
                    A virada
                  </p>
                  <p className="font-display mt-3 text-2xl leading-snug">
                    O comércio do seu bairro posta mal. Isso não é problema:{" "}
                    <span className="text-amarelo">é vaga de trabalho.</span>
                  </p>
                  <p className="text-body mt-3">
                    Você não precisa de seguidores. Precisa de um cliente. E o
                    aulão mostra o caminho até ele.
                  </p>
                </div>
              </Reveal>
            </div>

            <Reveal delay={0.08} className="lg:sticky lg:top-24">
              <div id="aula" className="scroll-mt-24">
                <p className="eyebrow mb-4">Veja como ela ensina</p>
                <div className="overflow-hidden rounded-2xl border-2 border-amarelo shadow-[0_28px_70px_rgba(0,0,0,.45)]">
                  <YouTubeLite
                    id="DJ4xkw4wD_E"
                    titulo="Aula da Tháscila Lawanda sobre benchmarking"
                  />
                </div>
                <p className="font-display mt-5 text-xl">
                  Aula de benchmarking, com a Tháscila
                </p>
                <p className="text-body mt-2 text-sm">
                  Direto ao ponto e com exemplo do comércio daqui. É assim no
                  aulão do dia 17.
                </p>
                <div className="mt-6">
                  <BotaoGrupo />
                </div>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* 3. O que você vai ver + por que agora */}
      <section className="fold-light relative overflow-hidden">
        <WaveDivider
          className="absolute inset-x-0 top-0 rotate-180"
          color="var(--ink)"
        />
        <div className="container-site relative section-padding">
          <Reveal>
            <p className="eyebrow mb-4">O que você vai ver no dia 17</p>
            <h2 className="headline-section max-w-2xl">
              Três respostas que separam quem posta de quem vive disso
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

          <Reveal delay={0.1}>
            <div className="mt-10 grid items-center gap-6 rounded-2xl bg-roxo-700 p-8 text-white md:grid-cols-[auto_1fr_auto] md:p-10">
              <CalendarDays size={40} className="text-amarelo" />
              <div>
                <p className="font-mono text-xs uppercase tracking-wide text-amarelo">
                  Por que agora
                </p>
                <p className="font-display mt-2 text-2xl leading-snug">
                  Seu primeiro Pix com social media,{" "}
                  <span className="text-amarelo">antes do Natal.</span>
                </p>
                <p className="mt-2 text-white/75">
                  Black Friday, Natal e fim de ano: dezembro é quando o comércio
                  mais precisa de conteúdo. Quem aprende em novembro chega em
                  dezembro com serviço pronto pra oferecer.
                </p>
              </div>
              <BotaoGrupo label="Quero participar" />
            </div>
          </Reveal>
        </div>
      </section>

      {/* 4. Prova: depoimentos + turmas */}
      <section className="relative overflow-hidden bg-ink-void section-padding">
        <div className="container-site relative">
          <Reveal>
            <p className="eyebrow mb-4">Quem já passou por aqui</p>
            <h2 className="headline-section max-w-2xl">
              Mais de 100 alunas{" "}
              <span className="text-amarelo">já passaram por aqui.</span>
            </h2>
            <p className="text-body mt-5 max-w-xl">
              Gente do Norte, com celular na mão, contando como foi. Aperte o
              play.
            </p>
          </Reveal>
          <div className="mx-auto mt-10 grid max-w-4xl grid-cols-2 gap-4 sm:gap-6 lg:grid-cols-4">
            {DEPOIMENTOS.map((id, i) => (
              <Reveal key={id} delay={i * 0.08}>
                <div className="overflow-hidden rounded-2xl border-2 border-amarelo shadow-[0_20px_50px_rgba(0,0,0,.35)]">
                  <YouTubeLite
                    id={id}
                    titulo="Depoimento em vídeo de aluna do curso de Social Media da Ousadia"
                    formato="vertical"
                  />
                </div>
              </Reveal>
            ))}
          </div>

          <Reveal delay={0.08}>
            <h3 className="font-display mx-auto mt-16 max-w-5xl text-2xl">
              Turma a turma,{" "}
              <span className="text-amarelo">gente de carne e osso.</span>
            </h3>
          </Reveal>
          {/* As linhas têm a altura de uma coluna (cqw = largura do
              container), então cada célula é quadrada em qualquer tela. */}
          <div className="@container mx-auto mt-6 max-w-5xl">
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
          <Reveal delay={0.12}>
            <p className="mx-auto mt-8 max-w-5xl font-mono text-xs leading-relaxed text-cinza-ink">
              Os resultados apresentados são individuais e não representam
              garantia de clientes ou renda. O desempenho depende da aplicação,
              da qualidade do trabalho e das oportunidades disponíveis.
            </p>
          </Reveal>
        </div>
      </section>

      {/* 5. Quem conduz: foto de estúdio + de onde ela veio */}
      <section className="relative overflow-hidden bg-ink section-padding">
        <RiverLines className="motif motif-soft text-rio inset-x-0 top-1/3 h-32 w-full" />
        <div className="container-site relative">
          <div className="grid items-center gap-12 lg:grid-cols-[.85fr_1.15fr]">
            <Reveal>
              <Image
                src="/aulao-social-media/thascila-sorrindo.webp"
                alt="Tháscila Lawanda sorrindo, de braços cruzados, com a camiseta da Ousadia Marketing"
                width={1100}
                height={1363}
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
                    "Sócia da Ousadia Marketing",
                    "+100 alunas formadas",
                    "Técnica em Agropecuária",
                    "Licenciada em Português",
                    "Direito (em conclusão)",
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

          <Reveal delay={0.1}>
            <p className="eyebrow mt-16 mb-5">Onde tudo começou</p>
          </Reveal>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
            {ORIGENS.map((o, i) => (
              <Reveal key={o.src} delay={i * 0.06}>
                <figure className="overflow-hidden rounded-2xl border border-amarelo/30">
                  <Image
                    src={`/aulao-social-media/${o.src}`}
                    alt={o.alt}
                    width={o.w}
                    height={o.h}
                    sizes="(min-width: 768px) 25vw, 50vw"
                    className={`aspect-[4/5] w-full object-cover ${o.pos ?? ""}`}
                  />
                </figure>
              </Reveal>
            ))}
          </div>
          <Reveal delay={0.12}>
            <p className="text-body mt-4 text-sm italic">
              Anapu, no Pará: a vida na vicinal antes do digital.
            </p>
          </Reveal>
        </div>
      </section>

      {/* 6. O dia + bônus de quem está ao vivo */}
      <section className="relative overflow-hidden bg-roxo-700 section-padding">
        <GrafismoDiamonds
          color="#ffffff"
          className="absolute inset-0 opacity-[0.04]"
        />
        <div className="container-site relative">
          <div className="grid gap-12 lg:grid-cols-[.9fr_1.1fr]">
            <Reveal>
              <p className="eyebrow mb-4">Como participar</p>
              <h2 className="headline-section">
                Terça, 17/nov, <span className="text-amarelo">às 20h</span>
              </h2>
              <p className="text-body mt-5 max-w-md">
                Online, gratuito e ao vivo, no horário de Brasília. Separe a
                noite na agenda e assista do celular.
              </p>
              <div className="mt-8 rounded-2xl border-2 border-amarelo bg-amarelo/[.08] p-6">
                <p className="flex items-center gap-2 font-mono text-xs uppercase tracking-wide text-amarelo">
                  <Gift size={16} /> Bônus de quem está ao vivo
                </p>
                <p className="font-display mt-3 text-xl">
                  Assistente de Posicionamento
                </p>
                <p className="text-body mt-2 text-sm">
                  O prompt de IA que te entrevista e devolve a sua frase de
                  posicionamento a partir do seu território. Liberado só durante
                  o aulão.
                </p>
              </div>
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
              <div className="mt-6">
                <BotaoGrupo />
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* 7. Diagnóstico: próximo passo enquanto o dia 17 não chega */}
      <section className="fold-light relative overflow-hidden">
        <WaveDivider
          className="absolute inset-x-0 top-0 rotate-180"
          color="var(--roxo-700)"
        />
        <div className="container-site relative section-padding">
          <div className="grid gap-10 lg:grid-cols-[1.1fr_.9fr] lg:items-center">
            <Reveal>
              <p className="eyebrow mb-4">Enquanto o dia 17 não chega</p>
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
                na hora. Você chega no aulão sabendo no que prestar atenção.
              </p>
              <ul className="mt-6 flex flex-wrap gap-2">
                {GANHOS_DIAGNOSTICO.map((g) => (
                  <li
                    key={g}
                    className="rounded-full border border-floresta-deep/40 bg-floresta/10 px-4 py-1.5 font-mono text-xs text-floresta-deep"
                  >
                    {g}
                  </li>
                ))}
              </ul>
            </Reveal>
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
                <Link
                  href="/diagnostico/social-media"
                  className="btn btn-secondary mt-6 w-full justify-center"
                >
                  Fazer meu diagnóstico grátis <ArrowRight size={16} />
                </Link>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* 8. Mentoria em versão curta: o pitch completo é ao vivo */}
      <section className="relative overflow-hidden bg-roxo-700 section-padding">
        <GrafismoDiamonds
          color="#ffffff"
          className="absolute inset-0 opacity-[0.04]"
        />
        <div className="container-site relative">
          <Reveal>
            <p className="eyebrow mb-4 text-center">
              No final do aulão: a Black Friday
            </p>
            <h2 className="headline-section mx-auto max-w-2xl text-center">
              Mentoria Social Media{" "}
              <span className="text-amarelo">Ousado</span>
            </h2>
            <p className="text-body mx-auto mt-5 max-w-2xl text-center">
              Turma Fundadora: 4 semanas de encontros ao vivo, com análise do
              seu perfil e os modelos de trabalho da Tháscila. Uma viagem rio
              abaixo, da nascente à foz.
            </p>
          </Reveal>
          <JornadaRio />
          <Reveal delay={0.12}>
            <div className="mt-10 flex flex-col items-center gap-3 text-center">
              <p className="font-display text-xl text-amarelo">
                Valor e condições revelados no aulão.
              </p>
              <BotaoGrupo label="Quero receber o link do aulão" />
            </div>
          </Reveal>
        </div>
      </section>

      {/* 9. FAQ, com o parágrafo que buscadores e IAs citam */}
      <section className="fold-light relative overflow-hidden">
        <WaveDivider
          className="absolute inset-x-0 top-0 rotate-180"
          color="var(--roxo-700)"
        />
        <div className="container-site relative section-padding max-w-3xl">
          <Reveal>
            <p className="eyebrow mb-4">Dúvidas</p>
            <h2 className="headline-section">Perguntas frequentes</h2>
            <p className="text-body mt-5 mb-10">
              O{" "}
              <strong className="font-semibold">
                Aulão Social Media Ousado
              </strong>{" "}
              é uma aula gratuita e ao vivo da Ousadia Marketing, a primeira
              Agência Escola de Marketing do Norte do Brasil, conduzida pela
              Tháscila Lawanda. Acontece na terça, 17 de novembro de 2026, às
              20h (Brasília), e mostra como começar a trabalhar como social
              media de qualquer cidade, só com o celular.
            </p>
          </Reveal>
          <FaqList items={FAQ} />
        </div>
      </section>

      <CtaFinal
        title={
          <>
            Você não precisa de seguidores.{" "}
            <span className="text-amarelo">Precisa de um cliente.</span>
          </>
        }
        lead="Terça, 17/11, às 20h. Entre no grupo pra receber o link do aulão, o bônus de quem está ao vivo e a condição de Black Friday da mentoria."
        ctaLabel={CTA}
        href={GRUPO_AULAO_SOCIAL_MEDIA}
        waveColor="var(--paper)"
        microcopy="Inscrição gratuita, sem obrigação de compra."
      />
    </>
  );
}
