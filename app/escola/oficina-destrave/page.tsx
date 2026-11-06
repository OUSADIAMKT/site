import type { Metadata } from "next";
import Image from "next/image";
import {
  ArrowRight,
  Camera,
  Gift,
  Lightbulb,
  MessageCircle,
  Mic,
  NotebookPen,
} from "lucide-react";
import { Reveal } from "@/components/ui/Reveal";
import { CtaFinal } from "@/components/sections/CtaFinal";
import { FaqList, FaqJsonLd, type FaqItem } from "@/components/sections/Faq";
import { ContentSlot } from "@/components/ui/MediaSlot";
import { GrafismoDiamonds } from "@/components/ui/Motifs";
import {
  CHECKOUT_OFICINA_DESTRAVE,
  GRUPO_OFICINA_DESTRAVE,
  PRECO_OFICINA_DESTRAVE,
  SITE,
  waOficinaDestrave,
} from "@/lib/site";
import { EstacoesAbas, type Estacao } from "./EstacoesAbas";
import {
  GradeDoDia,
  LegendaTrilhas,
  PONTOS_TOTAIS,
  KitGravacao,
} from "./GradeDoDia";

export const metadata: Metadata = {
  title:
    "Oficina Destrave · Domingo, 29/11, das 9h às 19h · com Jackson Satoyiro",
  description:
    "Um dia inteiro, online e ao vivo, com Jackson Satoyiro, da Ousadia Marketing. A empreendedora da Amazônia que trava na hora de postar sai com a Frase-Sinal, o cliente-herói, as histórias mapeadas, a bio nova, os primeiros vídeos gravados e o primeiro post publicado. Método STORYSELL. Domingo, 29 de novembro, das 9h às 19h (Brasília).",
  alternates: { canonical: `${SITE.url}/escola/oficina-destrave` },
  openGraph: {
    title: "Oficina Destrave · 29/11, ao vivo, das 9h às 19h",
    description:
      "Um dia pra sair do “eu travo” pro primeiro post publicado. Com Jackson Satoyiro e o método STORYSELL.",
    url: "/escola/oficina-destrave",
    images: [
      {
        url: "/escola/oficina-destrave/og.png",
        width: 1200,
        height: 630,
        alt: "Oficina Destrave, domingo 29 de novembro, das 9h às 19h, com Jackson Satoyiro",
      },
    ],
  },
};

/**
 * Landing da Oficina Destrave, o lançamento semente do Jackson (domingo,
 * 29/11/2026, das 9h às 19h, online e ao vivo). Estrutura: hero e espelho da
 * dor do `/aulao-social-media`, estações com entrega e grade do dia do
 * `/mapa-do-ugc`. Visual: o tema neon do Diagnóstico Destrave
 * (`/metodo-satoyiro`). As estações usam as abas da linha do tempo de `/sobre`.
 *
 * Fontes da copy (ver `docs/oficina-destrave.md`): LP "Master Class Destrave
 * seu Digital", a página do STORYSELL, o Desafio 7 Dias de Ousadia, a apostila
 * "Destrave sua Comunicação" (exercícios de cada estação), o ICP STORYSELL
 * (persona âncora: a empreendedora travada), o Playbook de Reativação de
 * Ex-Alunos (bloco "Reencontro") e o PRD do "Do Fio à Rede" (os 5 tempos de
 * cada estação, a pergunta da vida que abre cada uma, a roda das mãos na
 * abertura e a linha do antes e do agora na Colheita).
 *
 * CTAs: a principal leva ao ingresso na HeroSpark, a secundária ao grupo do
 * WhatsApp e as dúvidas ao WhatsApp da Ousadia (ver `lib/site.ts`). Ingresso:
 * R$ 97 (`PRECO_OFICINA_DESTRAVE`).
 *
 * Sem dado confirmado, fica em `ContentSlot`, nunca inventado: depoimentos de
 * alunas e a plataforma da transmissão/gravação.
 */

const PRECO = `R$ ${PRECO_OFICINA_DESTRAVE}`;
const CTA = "Garantir meu ingresso";

/** Espelho da dor, na voz da empreendedora (ICP STORYSELL + LP Master Class). */
const DORES = [
  "Abre o Instagram pra postar, fica olhando a tela pensando “o que eu falo?” e fecha.",
  "Grava, assiste, odeia e apaga. O vídeo que mais te custa é o que nunca saiu.",
  "Vê gente com metade da sua experiência bombando, e você, que construiu um negócio de verdade, continua invisível.",
  "Sente que fala igual a todo mundo, posta igual a todo mundo e por isso compete só no preço.",
  "Já pensou baixinho: “isso não é pra mim”.",
];

/**
 * As 5 estações (pilares do STORYSELL). A página fala do resultado; os
 * exercícios da apostila de cada estação estão em `docs/oficina-destrave.md`.
 */
const ESTACOES: Estacao[] = [
  {
    n: "01",
    h: "09h40",
    pilar: "Sinal",
    t: "Quem é você quando ninguém está editando",
    pergunta:
      "Se o mundo inteiro pudesse te ouvir por um minuto, o que você diria?",
    d: "Chega de falar igual a todo mundo. Você encontra o jeito de se apresentar que é só seu, e ele cabe numa frase.",
    leva: "Uma frase que diz quem você é e pra quem",
  },
  {
    n: "02",
    h: "11h15",
    pilar: "Travessia",
    t: "Pra quem você fala",
    pergunta: "Quem hoje ouve o que você tem a dizer? E quem precisa ouvir?",
    d: "Você descobre quem é a cliente que mais combina com você, o que tira o sono dela e por que ela ainda não te encontrou.",
    leva: "Sua cliente ideal definida e o que te faz diferente",
  },
  {
    n: "03",
    h: "13h30",
    pilar: "Ossada",
    t: "A história que só você tem",
    pergunta:
      "Pra aparecer na internet eu preciso virar outra? Ou o meu jeito é justamente o que tem valor?",
    d: "Toda empreendedora tem história. Você encontra a sua, decide o que quer e o que não quer contar, e descobre quanta coisa ela rende.",
    leva: "Assunto pra semanas de conteúdo",
  },
  {
    n: "04",
    h: "15h00",
    pilar: "Destrave",
    t: "Perder o medo da câmera",
    pergunta:
      "Como mostrar, pra quem está longe, o valor do que o seu trabalho faz?",
    d: "Do seu jeito, no seu ritmo e com a gente do lado. Ninguém é jogada na frente da câmera: o destrave vem passo a passo. E o seu perfil ganha cara de negócio.",
    leva: "Seus primeiros vídeos gravados e um perfil que vende",
  },
  {
    n: "05",
    h: "16h30",
    pilar: "Ritual",
    t: "Postar sem depender de inspiração",
    pergunta: "Se o cliente está longe, dá pra vender sem sair de casa?",
    d: "Você para de depender de inspiração e de sorte. Sai sabendo o que postar na semana e vê o seu post ir ao ar junto com a turma.",
    leva: "Seu primeiro post e o primeiro anúncio no ar",
  },
];

/**
 * Toda estação gira nos 5 tempos do Círculo de Cultura do "Do Fio à Rede":
 * a vida vem antes da tela e nada termina sem virar ação.
 */
const TEMPOS = [
  {
    t: "Chegada",
    d: "Todo mundo na roda, câmera ou chat. Ninguém fica no palco.",
  },
  {
    t: "A pergunta da vida",
    d: "Antes de abrir o Instagram, a conversa sobre o seu negócio e a sua realidade.",
  },
  {
    t: "Mão na massa",
    d: "O exercício feito na hora, no celular, devagar. Quem já sabe ajuda quem está começando.",
  },
  {
    t: "Volta à roda",
    d: "O que travou, o que destravou e onde isso serve no seu negócio.",
  },
  {
    t: "O combinado",
    d: "A ação que você leva pra vida, e a quem pedir ajuda se travar.",
  },
];

/** Regras do placar (o regulamento completo sai no grupo do WhatsApp). */
const PONTUACAO = [
  "Cada atividade vale os pontos marcados na grade.",
  "Vale a entrega postada no grupo do WhatsApp dentro do tempo da atividade.",
  "O time da Ousadia confere e atualiza o placar a cada estação.",
  "Empate: leva quem publicou o post primeiro.",
];

/** O que ela tem na mão às 19h, na língua dela (resultado, não exercício). */
const ENTREGAS = [
  "Uma frase que diz quem você é e pra quem",
  "Sua cliente ideal definida",
  "Sua história mapeada, contando só o que você quer contar",
  "Assunto pra semanas de conteúdo",
  "Um perfil do Instagram com cara de negócio",
  "Seus primeiros vídeos gravados e fotos do seu produto",
  "O primeiro post publicado e o primeiro anúncio no status do WhatsApp",
  "Os próximos passos dos próximos 90 dias",
];

/** O prêmio do placar: quem ganha escolhe um destes. */
const PREMIOS = [
  { t: "Tripé", Icone: Camera },
  { t: "Iluminação", Icone: Lightbulb },
  { t: "Microfone", Icone: Mic },
];

const PRA_VOCE = [
  "Empreende na Amazônia, tem um negócio de verdade e se sente invisível no digital",
  "Trava ou sente vergonha na hora de gravar (“eu não nasci pra câmera”)",
  "Acha que não tem diferencial e compete só no preço",
  "Quer atrair cliente pelo Instagram sem virar influencer nem fazer dancinha",
  "Acha que “não nasceu pra isso” ou que “já passou da hora” e quer um método que respeite a sua rotina",
  "Acha que não tem história interessante (tem, e a gente vai achar)",
];

const NAO_PRA_VOCE = [
  "Procura fórmula mágica pra viralizar sem esforço",
  "Quer só assistir, sem fazer os exercícios nem colocar a cara",
  "Quer teoria sobre narrativa, e não aplicação prática",
];

const COMO_PARTICIPAR = [
  {
    t: "Garanta o seu ingresso",
    d: `${PRECO}, no checkout seguro da HeroSpark, pelo botão desta página.`,
  },
  {
    t: "Entre no grupo do WhatsApp",
    d: "O link da transmissão, os lembretes e o caderno da oficina saem por lá. Áudio é bem-vindo: ninguém precisa escrever pra participar.",
  },
  {
    t: "Separe o domingo",
    d: "29/11, das 9h às 19h (Brasília), com pausas e almoço. Celular carregado e caderno do lado.",
  },
  {
    t: "Faça junto, ao vivo",
    d: "Cada estação termina com um exercício feito na hora. Não é aula pra salvar e assistir depois.",
  },
  {
    t: "Saia publicada",
    d: "Às 19h, seu primeiro post está no ar e o plano de 90 dias está escrito.",
  },
];

/** Texto puro: todas entram no JSON-LD de FAQ. */
const FAQ_TEXTO = [
  {
    q: "Quando é a Oficina Destrave?",
    a: "Domingo, 29 de novembro de 2026, das 9h às 19h (horário de Brasília), online e ao vivo. São 5 estações práticas, com pausas e uma hora de almoço.",
  },
  {
    q: "Tenho vergonha de aparecer. A oficina serve pra mim?",
    a: "Principalmente pra você. A exposição é gradual: primeiro você escreve, depois grava só pra você, e só então decide o que publica. E existem formatos que vendem sem mostrar o rosto.",
  },
  {
    q: "Nunca criei conteúdo. Não é avançado demais?",
    a: "Não. Se você tem um negócio, ou a ideia de um, já tem a matéria-prima. A oficina dá a estrutura, do primeiro exercício ao primeiro post.",
  },
  {
    q: "Isso é terapia?",
    a: "Não. A oficina usa exercícios de autoconhecimento pra destravar o que te impede de aparecer, mas o destino é sempre o digital: você sai com bio nova, vídeos gravados e um post publicado.",
  },
  {
    q: "Tenho negócio, casa e família. Não tenho tempo pra postar todo dia.",
    a: "Nem precisa. Na Estação 5 você aprende a produzir em bloco: mapeia as histórias uma vez e grava a semana de uma vez. O que mais toma tempo hoje é não saber o que postar.",
  },
  {
    q: "Tenho pouca intimidade com o celular. Vou conseguir acompanhar?",
    a: "Vai. Aqui ninguém sabe tudo e ninguém ignora tudo: cada passo é feito junto, devagar, e quem já sabe ajuda quem está começando. Se travar, manda um áudio no grupo do WhatsApp e alguém te responde.",
  },
  {
    q: "Preciso de equipamento?",
    a: "Não. Celular carregado, internet e um caderno. Técnica vem antes de equipamento.",
  },
  {
    q: "Já fiz o ABC do Marketing ou o Destrave. A oficina é a mesma coisa?",
    a: "Não. O método cresceu e virou o STORYSELL: a oficina junta o que você aprendeu com o trabalho de transformar a sua história em conteúdo que vende. E quem já é da casa tem um lugar reservado nesse reencontro.",
  },
];

/** Preço em texto puro, pro JSON-LD de FAQ (a versão da página tem os links). */
const FAQ_PRECO = {
  q: "Quanto custa e como pago?",
  a: `O ingresso custa ${PRECO}, pago no checkout seguro da HeroSpark, onde aparecem as formas de pagamento. Depois da compra, entre no grupo do WhatsApp da oficina.`,
};

const FAQ: FaqItem[] = [
  FAQ_TEXTO[0],
  {
    q: FAQ_PRECO.q,
    a: (
      <>
        <p>
          O ingresso custa{" "}
          <strong className="font-semibold text-foreground">{PRECO}</strong>,
          pago no{" "}
          <a
            href={CHECKOUT_OFICINA_DESTRAVE}
            className="underline underline-offset-4"
          >
            checkout seguro da HeroSpark
          </a>
          , onde aparecem as formas de pagamento. Depois da compra, entre no{" "}
          <a
            href={GRUPO_OFICINA_DESTRAVE}
            target="_blank"
            rel="noopener noreferrer"
            className="underline underline-offset-4"
          >
            grupo do WhatsApp
          </a>{" "}
          da oficina.
        </p>
      </>
    ),
  },
  {
    q: "Fica gravado?",
    a: (
      <>
        <ContentSlot label="Plataforma da transmissão e se haverá gravação (e por quanto tempo)." />
        <p className="mt-3">
          A oficina é feita pra você fazer junto: os exercícios e a análise de
          perfis acontecem ao vivo.
        </p>
      </>
    ),
  },
  ...FAQ_TEXTO.slice(1),
  {
    q: "Ficou alguma dúvida?",
    a: (
      <p>
        Chama o time no{" "}
        <a
          href={waOficinaDestrave()}
          target="_blank"
          rel="noopener noreferrer"
          className="underline underline-offset-4"
        >
          WhatsApp da Ousadia
        </a>
        . Quem responde é gente, não robô.
      </p>
    ),
  },
];

/** Mensagem própria pra quem já foi aluno (Playbook de Reativação). */
const LINK_REENCONTRO = waOficinaDestrave(
  "Oi! Já fui aluna(o) do Jackson (ABC do Marketing ou Destrave) e quero voltar na Oficina Destrave do dia 29/11.",
);

/** Botão principal: sempre o ingresso na HeroSpark. */
function BotaoVaga({ label = CTA }: { label?: string }) {
  return (
    <a href={CHECKOUT_OFICINA_DESTRAVE} className="btn btn-primary">
      {label} <ArrowRight size={16} />
    </a>
  );
}

/** Link discreto pras dúvidas, embaixo dos botões. */
function LinkDuvidas() {
  return (
    <a
      href={waOficinaDestrave()}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1.5 font-mono text-xs text-cinza-ink underline underline-offset-4 hover:text-amarelo"
    >
      <MessageCircle size={14} /> Ficou com dúvida? Fale com a gente no WhatsApp
    </a>
  );
}

export default function OficinaDestravePage() {
  const eventoJsonLd = {
    "@context": "https://schema.org",
    "@type": "Event",
    name: "Oficina Destrave",
    description:
      "Um dia inteiro, online e ao vivo, com Jackson Satoyiro: 5 estações do método STORYSELL para a empreendedora sair da trava e publicar o primeiro post.",
    startDate: "2026-11-29T09:00:00-03:00",
    endDate: "2026-11-29T19:00:00-03:00",
    eventAttendanceMode: "https://schema.org/OnlineEventAttendanceMode",
    eventStatus: "https://schema.org/EventScheduled",
    location: {
      "@type": "VirtualLocation",
      url: `${SITE.url}/escola/oficina-destrave`,
    },
    image: `${SITE.url}/escola/oficina-destrave/og.png`,
    performer: { "@type": "Person", name: "Jackson Satoyiro" },
    organizer: {
      "@type": "Organization",
      name: "Ousadia Marketing",
      url: SITE.url,
    },
    offers: {
      "@type": "Offer",
      url: CHECKOUT_OFICINA_DESTRAVE,
      price: String(PRECO_OFICINA_DESTRAVE),
      priceCurrency: "BRL",
      availability: "https://schema.org/InStock",
    },
    inLanguage: "pt-BR",
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(eventoJsonLd) }}
      />
      <FaqJsonLd items={[...FAQ_TEXTO, FAQ_PRECO]} />

      {/* 1. Hero: Jackson estendendo a mão (o convite da oficina) à direita no
          computador, em cima no celular; texto sobre um scrim na cor do fundo. */}
      <section className="relative isolate overflow-hidden">
        {/* No celular a foto ocupa só o topo (senão o rosto estoura a tela). */}
        <div className="absolute inset-x-0 top-0 -z-10 h-[68svh] lg:inset-y-0 lg:left-[46%] lg:h-auto">
          <Image
            src="/oficina-destrave/jackson-retrato.webp"
            alt="Jackson Satoyiro sorrindo e estendendo a mão para a câmera"
            fill
            priority
            sizes="(min-width: 1024px) 54vw, 100vw"
            className="object-cover object-[50%_12%]"
          />
        </div>
        <div
          aria-hidden
          className="absolute inset-0 -z-10 bg-gradient-to-t from-ink-deep from-40% via-ink-deep/75 via-60% to-ink-deep/10 lg:bg-gradient-to-r lg:from-ink-deep lg:from-[46%] lg:via-ink-deep/50 lg:via-[62%] lg:to-transparent"
        />
        <div
          aria-hidden
          className="absolute right-[8%] top-1/4 -z-10 hidden h-80 w-80 rounded-full bg-floresta/30 blur-[140px] lg:block"
        />

        <div className="container-site relative flex min-h-[min(calc(100svh-4rem),58rem)] items-end pb-14 pt-[min(55vh,30rem)] lg:items-center lg:py-24">
          <div className="max-w-xl">
            <Reveal>
              <p className="inline-flex items-center gap-2.5 rounded-full border border-amarelo/50 bg-ink-void/60 px-4 py-1.5 font-mono text-[11px] uppercase tracking-[0.18em] text-amarelo backdrop-blur">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amarelo opacity-75" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-amarelo" />
                </span>
                Oficina Destrave · ao vivo
              </p>
            </Reveal>
            <Reveal delay={0.05}>
              <h1 className="font-display mt-6 text-[clamp(2.3rem,5.6vw,4.4rem)] leading-[0.98]">
                Um dia pra sair do “eu travo”{" "}
                <span className="text-amarelo">pro primeiro post no ar.</span>
              </h1>
            </Reveal>
            <Reveal delay={0.1}>
              <p className="text-body mt-6 text-lg">
                Dez horas ao vivo com o Jackson pra você, empreendedora da
                Amazônia, transformar a sua história em conteúdo que vende. Sem
                dancinha, sem virar influencer, sem fingir ser quem você não é.
              </p>
            </Reveal>

            <Reveal delay={0.15}>
              <div className="mt-8 flex items-center gap-5 rounded-2xl border border-white/10 bg-ink-void/70 p-4 backdrop-blur">
                <div className="grid h-16 w-16 shrink-0 place-items-center rounded-xl bg-amarelo text-ink-void shadow-[0_0_26px_-4px_rgba(57,255,136,.7)]">
                  <span className="text-center leading-none">
                    <span className="font-display block text-2xl">29</span>
                    <span className="font-mono block text-[10px] uppercase tracking-widest">
                      nov
                    </span>
                  </span>
                </div>
                <div className="text-sm">
                  <p className="font-display text-base text-foreground">
                    Domingo, das 9h às 19h (Brasília)
                  </p>
                  <p className="text-body">
                    Online, do celular ou do computador. 5 estações práticas.
                    Ingresso: <strong className="text-amarelo">{PRECO}</strong>.
                  </p>
                </div>
              </div>
            </Reveal>

            <Reveal delay={0.2}>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
                <BotaoVaga />
                <a
                  href={GRUPO_OFICINA_DESTRAVE}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-secondary"
                >
                  Entrar no grupo do WhatsApp
                </a>
              </div>
              <div className="mt-4">
                <LinkDuvidas />
              </div>
            </Reveal>

            <Reveal delay={0.25}>
              <dl className="mt-10 grid max-w-md grid-cols-3 divide-x divide-white/15 border-t border-white/15 pt-6">
                {[
                  { n: "22", t: "turmas presenciais" },
                  { n: "04", t: "turmas online" },
                  { n: "10h", t: "de prática ao vivo no dia 29" },
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
      </section>

      {/* 2. Espelho da dor + a virada */}
      <section className="relative overflow-hidden bg-ink section-padding">
        <div className="container-site relative">
          <div className="grid gap-14 lg:grid-cols-[1.05fr_.95fr] lg:items-start">
            <div>
              <Reveal>
                <p className="eyebrow mb-4">Deixa eu adivinhar</p>
                <h2 className="headline-section max-w-xl">
                  Não é falta de vontade.{" "}
                  <span className="text-amarelo">
                    Você só ainda não achou o seu jeito.
                  </span>
                </h2>
              </Reveal>
              <ol className="mt-10 divide-y divide-white/10 border-y border-white/10">
                {DORES.map((d, i) => (
                  <Reveal key={d} delay={i * 0.05}>
                    <li className="flex items-baseline gap-5 py-4">
                      <span className="font-display w-8 shrink-0 text-xl text-floresta">
                        0{i + 1}
                      </span>
                      <span className="text-body text-[1.05rem]">{d}</span>
                    </li>
                  </Reveal>
                ))}
              </ol>
            </div>

            <Reveal delay={0.08} className="lg:sticky lg:top-24">
              <div className="card-surface p-7 lg:p-9">
                <p className="font-mono text-xs uppercase tracking-wide text-floresta">
                  A virada
                </p>
                <p className="font-display mt-3 text-2xl leading-snug">
                  O problema nunca foi você.{" "}
                  <span className="text-amarelo">Foi o método.</span>
                </p>
                <div className="text-body mt-4 space-y-4">
                  <p>
                    Te ensinaram de trás pra frente: primeiro o formato (Reels,
                    trend, carrossel), depois “encaixa alguma coisa aí”. Sai um
                    post sem cara, que parece de qualquer pessoa. E o que parece
                    de qualquer pessoa não vende pra ninguém.
                  </p>
                  <p>
                    Na oficina a ordem se inverte: primeiro a gente acha os
                    momentos da sua trajetória que criam confiança, depois
                    encaixa nos formatos.{" "}
                    <strong className="font-semibold text-foreground">
                      O formato é embalagem. A história é o produto.
                    </strong>
                  </p>
                  <p className="border-l-2 border-amarelo pl-5 font-display text-lg text-foreground">
                    Você não precisa de mais seguidores nem de mais energia.
                    Você já tem história. Falta só a estrutura.
                  </p>
                </div>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* 3. As 5 estações, presas no fio do dia */}
      <section
        id="estacoes"
        className="relative scroll-mt-20 overflow-hidden section-padding"
      >
        <div className="container-site relative">
          <Reveal>
            <p className="eyebrow mb-4">O método STORYSELL em um dia</p>
            <h2 className="headline-section max-w-2xl">
              5 estações. Cada uma termina{" "}
              <span className="text-amarelo">com algo pronto.</span>
            </h2>
            <p className="text-body mt-5 max-w-2xl">
              Você não sai com anotação, sai com o trabalho feito. Os exercícios
              vêm do caderno que o Jackson usa nas turmas desde o ABC do
              Marketing, agora organizados pelos pilares do STORYSELL.
            </p>
          </Reveal>
          <EstacoesAbas estacoes={ESTACOES} />

          <Reveal delay={0.06}>
            <div className="mt-12">
              <p className="font-mono text-xs uppercase tracking-wide text-floresta">
                Toda estação gira em 5 tempos
              </p>
              <ol className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                {TEMPOS.map((tp, i) => (
                  <li
                    key={tp.t}
                    className="rounded-xl border border-white/10 bg-ink-void/50 p-4"
                  >
                    <span className="font-display text-2xl text-amarelo">
                      {i + 1}
                    </span>
                    <span className="mt-1 block text-sm font-semibold text-foreground">
                      {tp.t}
                    </span>
                    <span className="text-body mt-1 block text-sm">{tp.d}</span>
                  </li>
                ))}
              </ol>
              <p className="text-body mt-4 text-sm italic">
                A vida vem antes da tela, e nenhuma estação termina sem virar
                ação.
              </p>
            </div>
          </Reveal>
        </div>
      </section>

      {/* 4. O dia: grade em linha do tempo, com trilhas e pontos, e o placar */}
      <section className="relative overflow-hidden bg-roxo-700 section-padding">
        <GrafismoDiamonds
          color="#ffffff"
          className="absolute inset-0 opacity-[0.04]"
        />
        <div className="container-site relative">
          <Reveal>
            <p className="eyebrow mb-4">O dia</p>
            <h2 className="headline-section max-w-3xl">
              Domingo, 29/nov,{" "}
              <span className="text-amarelo">das 9h às 19h</span>
            </h2>
            <p className="text-body mt-5 max-w-2xl text-lg">
              Três trilhas se cruzam o dia inteiro: marketing de conteúdo, redes
              sociais e autoconhecimento, pra destravar o que te segura por
              dentro. Cada atividade termina com algo feito, e cada entrega vale
              pontos.
            </p>
            <div className="mt-6">
              <LegendaTrilhas />
            </div>
          </Reveal>

          <div className="mt-12 grid gap-10 lg:grid-cols-[1.45fr_.85fr] lg:items-start">
            <Reveal>
              <GradeDoDia />
            </Reveal>

            <Reveal delay={0.06} className="lg:sticky lg:top-24">
              <div className="card-surface overflow-hidden border-2 border-amarelo/60 p-7">
                <p className="font-mono text-xs uppercase tracking-[0.18em] text-amarelo">
                  Placar do Destrave
                </p>
                <div className="mt-4 flex items-center gap-5">
                  <KitGravacao className="h-32 w-32 shrink-0" />
                  <div>
                    <p className="font-display text-2xl leading-tight">
                      Quem fizer mais pontos{" "}
                      <span className="text-amarelo">
                        leva um equipamento de gravação.
                      </span>
                    </p>
                    <p className="text-body mt-2 text-sm">
                      Até {PONTOS_TOTAIS} pontos no dia.
                    </p>
                  </div>
                </div>
                <p className="mt-6 font-mono text-xs uppercase tracking-[0.18em] text-floresta">
                  Você escolhe o seu
                </p>
                <ul className="mt-3 grid grid-cols-3 gap-2">
                  {PREMIOS.map(({ t, Icone }) => (
                    <li
                      key={t}
                      className="flex flex-col items-center gap-2 rounded-xl border border-amarelo/40 bg-amarelo/5 px-2 py-3 text-center text-sm text-foreground"
                    >
                      <Icone size={22} className="text-amarelo" aria-hidden />
                      {t}
                    </li>
                  ))}
                </ul>
                <ul className="text-body mt-6 space-y-3 text-base">
                  {PONTUACAO.map((p) => (
                    <li key={p} className="flex gap-3">
                      <span className="text-amarelo" aria-hidden>
                        ★
                      </span>
                      <span>{p}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="card-surface mt-6 p-7">
                <p className="font-mono text-xs uppercase tracking-[0.18em] text-floresta">
                  Às 19h você está com isto na mão
                </p>
                <ul className="mt-4 space-y-2.5">
                  {ENTREGAS.map((e) => (
                    <li
                      key={e}
                      className="flex gap-3 text-base text-foreground"
                    >
                      <span className="text-amarelo" aria-hidden>
                        ✓
                      </span>
                      <span>{e}</span>
                    </li>
                  ))}
                </ul>
                <div className="mt-6">
                  <BotaoVaga />
                </div>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* 5. Pra quem é */}
      <section className="relative overflow-hidden section-padding">
        <div className="container-site relative">
          <Reveal>
            <p className="eyebrow mb-4">É pra você?</p>
            <h2 className="headline-section max-w-2xl">
              A oficina foi feita pra quem trava
            </h2>
          </Reveal>
          <div className="mt-12 grid gap-6 lg:grid-cols-[1.2fr_.8fr]">
            <Reveal>
              <div className="card-surface h-full border-2 border-amarelo/50 p-7">
                <h3 className="font-display text-lg text-amarelo">
                  É pra você se…
                </h3>
                <ul className="text-body mt-5 space-y-3 text-sm">
                  {PRA_VOCE.map((t) => (
                    <li key={t} className="flex gap-3">
                      <span className="text-amarelo" aria-hidden>
                        ✓
                      </span>
                      <span>{t}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </Reveal>
            <Reveal delay={0.08}>
              <div className="card-surface h-full p-7">
                <h3 className="font-display text-lg">Não é pra você se…</h3>
                <ul className="text-body mt-5 space-y-3 text-sm">
                  {NAO_PRA_VOCE.map((t) => (
                    <li key={t} className="flex gap-3">
                      <span className="text-cinza-ink" aria-hidden>
                        ✕
                      </span>
                      <span>{t}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* 6. Quem conduz */}
      <section className="relative overflow-hidden bg-ink-void section-padding">
        <div className="container-site relative">
          <div className="grid items-center gap-12 lg:grid-cols-[.9fr_1.1fr]">
            <Reveal>
              <div className="relative">
                <div
                  aria-hidden
                  className="absolute -inset-3 rounded-[1.6rem] bg-gradient-to-br from-floresta/50 via-transparent to-amarelo/40 blur-xl"
                />
                <Image
                  src="/oficina-destrave/jackson-eureka.webp"
                  alt="Jackson Satoyiro sorrindo, com o dedo indicador na têmpora"
                  width={1200}
                  height={800}
                  sizes="(min-width: 1024px) 45vw, 100vw"
                  className="relative w-full rounded-2xl border-2 border-amarelo/70 object-cover"
                />
              </div>
            </Reveal>
            <Reveal delay={0.08}>
              <div>
                <p className="eyebrow mb-4">Quem conduz</p>
                <h2 className="headline-section max-w-xl">
                  Jackson <span className="text-amarelo">Satoyiro</span>
                </h2>
                <div className="mt-6 flex flex-wrap gap-2">
                  {[
                    "Fundador da Ousadia Marketing",
                    "Criador do STORYSELL",
                    "22 turmas presenciais e 4 online",
                    "Amazon Marketing Day",
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
                    Em janeiro de 2020, o Jackson fez o primeiro treinamento, o
                    ABC do Marketing Digital, pra empreendedores que queriam
                    levar o negócio pro digital e tinham medo ou vergonha de
                    gravar. De lá pra cá foram 22 turmas presenciais, 4 online,
                    palestras empresariais e dois congressos Amazon Marketing
                    Day.
                  </p>
                  <p>
                    Analista de tecnologia do IFPA em Altamira desde 2010, ele
                    construiu a Ousadia, a primeira Agência Escola de Marketing
                    do Norte do Brasil, depois do expediente, num lugar onde
                    diziam que “marketing não dá certo”.
                  </p>
                </div>
              </div>
            </Reveal>
          </div>

          <Reveal delay={0.1}>
            <figure className="mt-16 overflow-hidden rounded-2xl border border-amarelo/30">
              <Image
                src="/oficina-destrave/abc-aula-estudio.webp"
                alt="Jackson conduzindo uma turma de empreendedoras ao redor da mesa no estúdio da Ousadia"
                width={1200}
                height={675}
                sizes="(min-width: 1280px) 1200px, 100vw"
                className="aspect-[21/9] w-full object-cover object-[50%_45%]"
              />
            </figure>
            <p className="text-body mt-3 text-sm italic">
              Turma no estúdio da Ousadia, em Altamira: é esse ritmo de mesa,
              conversa e exercício que vai pro ao vivo.
            </p>
          </Reveal>

          <Reveal delay={0.12}>
            <div className="mt-10 max-w-2xl">
              <ContentSlot label="2 ou 3 depoimentos de alunas empreendedoras: nome, cidade, negócio e o antes/depois em uma frase, em print, áudio ou vídeo curto." />
            </div>
          </Reveal>
        </div>
      </section>

      {/* 7. Como participar + bônus de quem está ao vivo */}
      <section className="relative overflow-hidden section-padding">
        <div className="container-site relative">
          <div className="grid gap-12 lg:grid-cols-[.9fr_1.1fr]">
            <Reveal>
              <p className="eyebrow mb-4">Como participar</p>
              <h2 className="headline-section">
                Separe o domingo.{" "}
                <span className="text-amarelo">Saia publicada.</span>
              </h2>
              <div className="card-surface mt-8 border-2 border-amarelo/60 p-6">
                <p className="flex items-center gap-2 font-mono text-xs uppercase tracking-wide text-amarelo">
                  <Gift size={16} /> Só pra quem está ao vivo
                </p>
                <p className="font-display mt-3 flex items-center gap-2 text-xl">
                  <NotebookPen size={20} className="text-floresta" /> Caderno da
                  Oficina Destrave
                </p>
                <p className="text-body mt-2 text-sm">
                  O caderno de exercícios das 5 estações, com o Mapa do
                  Diferencial, a Estrutura de Post que Vende (abertura,
                  vulnerabilidade e chamada) e o Plano de Ação de 90 dias.
                  Liberado durante a transmissão.
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
              <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
                <BotaoVaga />
                <a
                  href={GRUPO_OFICINA_DESTRAVE}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-secondary"
                >
                  Entrar no grupo
                </a>
              </div>
              <div className="mt-4">
                <LinkDuvidas />
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* 8. Reencontro: ex-alunos do ABC do Marketing e do Destrave */}
      <section className="relative overflow-hidden bg-roxo-700 section-padding">
        <GrafismoDiamonds
          color="#ffffff"
          className="absolute inset-0 opacity-[0.04]"
        />
        <div className="container-site relative max-w-3xl text-center">
          <Reveal>
            <p className="eyebrow mb-4">Já foi aluna ou aluno do Jackson?</p>
            <h2 className="headline-section mx-auto max-w-2xl">
              Fez o ABC do Marketing ou o Destrave?{" "}
              <span className="text-amarelo">Isso aqui é um reencontro.</span>
            </h2>
            <p className="text-body mx-auto mt-5 max-w-xl">
              Quem sentou naquelas cadeiras fez parte do começo da Ousadia. O
              método cresceu, virou o STORYSELL, e a oficina é o jeito de você
              voltar e aplicar tudo no seu momento de hoje. Conta pra gente como
              está a sua caminhada.
            </p>
            <a
              href={LINK_REENCONTRO}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-secondary mt-8"
            >
              Sou ex-aluna(o), quero voltar <ArrowRight size={16} />
            </a>
          </Reveal>
        </div>
      </section>

      {/* 9. FAQ */}
      <section className="relative overflow-hidden section-padding">
        <div className="container-site relative max-w-3xl">
          <Reveal>
            <p className="eyebrow mb-4">Dúvidas</p>
            <h2 className="headline-section">Perguntas frequentes</h2>
            <p className="text-body mt-5 mb-10">
              A{" "}
              <strong className="font-semibold text-foreground">
                Oficina Destrave
              </strong>{" "}
              é um dia de prática, online e ao vivo, com Jackson Satoyiro, da
              Ousadia Marketing, a primeira Agência Escola de Marketing do Norte
              do Brasil. Acontece no domingo, 29 de novembro de 2026, das 9h às
              19h (Brasília), e leva a empreendedora da Amazônia da trava ao
              primeiro post publicado com o método STORYSELL.
            </p>
          </Reveal>
          <FaqList items={FAQ} />
        </div>
      </section>

      <CtaFinal
        title={
          <>
            Você pode continuar postando “quando der coragem”.{" "}
            <span className="text-amarelo">Ou pode destravar no domingo.</span>
          </>
        }
        lead={`Domingo, 29/11, das 9h às 19h, ao vivo, por ${PRECO}. Sua história já está pronta. Falta só a estrutura.`}
        ctaLabel={CTA}
        href={CHECKOUT_OFICINA_DESTRAVE}
        waveColor="var(--ink-deep)"
        secondary={
          <a
            href={GRUPO_OFICINA_DESTRAVE}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-secondary"
          >
            Entrar no grupo do WhatsApp
          </a>
        }
        microcopy={
          <>
            O botão abre o checkout seguro da HeroSpark. Dúvidas?{" "}
            <a
              href={waOficinaDestrave()}
              target="_blank"
              rel="noopener noreferrer"
              className="underline underline-offset-4 hover:text-amarelo"
            >
              Chama no WhatsApp
            </a>
            .
          </>
        }
      />
    </>
  );
}
