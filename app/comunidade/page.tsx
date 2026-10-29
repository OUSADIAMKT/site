import type { Metadata } from "next";
import Image from "next/image";
import {
  ArrowRight,
  BookOpenText,
  Bot,
  Check,
  Clapperboard,
  KeyRound,
  Megaphone,
  MessagesSquare,
  PlayCircle,
  Radio,
  Smartphone,
  Sparkles,
  Users,
  type LucideIcon,
} from "lucide-react";
import { Reveal } from "@/components/ui/Reveal";
import { WaveDivider } from "@/components/ui/WaveDivider";
import { CtaFinal } from "@/components/sections/CtaFinal";
import { FaqList, FaqJsonLd } from "@/components/sections/Faq";
import { Canoe, GrafismoDiamonds, RiverLines } from "@/components/ui/Motifs";
import { KeneStrip } from "@/components/ui/graphics/Kene";
import {
  CHECKOUT_COMUNIDADE,
  FUNDADOR,
  GRUPO_COMUNIDADE,
  SITE,
  waComunidade,
} from "@/lib/site";

export const metadata: Metadata = {
  alternates: { canonical: "/comunidade" },
  title: "Comunidade Creators da Amazônia · UGC, Social Media, Destrave e IA",
  description:
    "A comunidade de creators, social medias e empreendedores do Norte: 4 pilares (UGC, Social Media, Destrave e IA), encontros ao vivo a cada 15 dias com Jackson, Tháscila e Juh, e uma rede de gente que está fazendo acontecer. Entrada gratuita no grupo, assinatura semestral e convite para ex-alunos.",
};

/**
 * Página de vendas da Comunidade Creators da Amazônia (refeita em 28/10/2026,
 * com a estrutura de impactoevo.com.br/comunidade como referência: pilares
 * numerados → rotina → o que leva → oferta → mentores → FAQ, CTA repetido).
 *
 * Modelo de entrada definido pelo usuário: grupo aberto e gratuito
 * (GRUPO_COMUNIDADE), assinatura semestral (CHECKOUT_COMUNIDADE; vazio = cai
 * no WhatsApp) e convite sem custo para quem já foi aluno pagante. Encontros
 * ao vivo quinzenais. O preço (R$ 162/semestre) é o degrau "Comunidade R$ 27/mês"
 * da escada do Destrave, vezes 6.
 */

const CTA = "Entrar no grupo gratuito";
const PRECO_SEMESTRE = "R$ 162";
const PRECO_MES = "R$ 27";

const ASSINAR_HREF =
  CHECKOUT_COMUNIDADE ||
  waComunidade(
    "Oi! Quero assinar a comunidade Creators da Amazônia (plano semestral).",
  );
const CONVITE_HREF = waComunidade(
  "Oi! Já fui aluno(a) da Ousadia e quero meu convite pra comunidade Creators da Amazônia. Fiz o curso: ",
);

/** O que trava quem cria sozinho no Norte (espelho da dor). */
const SOZINHO = [
  "O curso acaba, o grupo da turma esfria e você volta a postar no escuro.",
  "O algoritmo muda toda semana e não tem com quem trocar o que está funcionando.",
  "As marcas, as agências e os eventos parecem estar sempre em outra cidade.",
  "Guru de fora ensina pra quem mora na capital. Aqui o contexto é outro.",
];

type Pilar = {
  n: string;
  icon: LucideIcon;
  t: string;
  mentor: string;
  d: string;
  temas: string[];
  cor: string;
};

const PILARES: Pilar[] = [
  {
    n: "01",
    icon: Clapperboard,
    t: "UGC",
    mentor: "com a Juh",
    d: "Conteúdo de creator pago por marca, sem precisar de milhares de seguidores.",
    temas: [
      "Perfil e portfólio que as marcas aprovam",
      "Prospecção e plataformas de UGC",
      "Da permuta ao cachê recorrente",
    ],
    cor: "text-amarelo",
  },
  {
    n: "02",
    icon: Smartphone,
    t: "Social Media",
    mentor: "com a Tháscila",
    d: "As redes do comércio local como profissão, do primeiro cliente ao pacote mensal.",
    temas: [
      "Posicionamento a partir do seu território",
      "Calendário, ganchos e roteiros",
      "Relatório, preço e prospecção",
    ],
    cor: "text-rio",
  },
  {
    n: "03",
    icon: Megaphone,
    t: "Destrave",
    mentor: "com o Jackson",
    d: "Narrativa que vende: a sua história como argumento, sem vergonha de aparecer.",
    temas: [
      "Método Satoyiro: do Sinal à Colheita",
      "Storytelling para vídeo curto",
      "Oferta, lançamento e venda no direct",
    ],
    cor: "text-floresta",
  },
  {
    n: "04",
    icon: Bot,
    t: "IA aplicada",
    mentor: "com o Jackson",
    d: "Inteligência artificial como equipe: mais entrega em menos tempo, do celular.",
    temas: [
      "Prompts prontos para pauta, roteiro e legenda",
      "Imagem, vídeo e voz com ferramentas gratuitas",
      "Fluxos que economizam horas por semana",
    ],
    cor: "text-paper",
  },
];

/** O ciclo de 15 dias, em ritmo de rio. */
const CICLO = [
  {
    quando: "Dia 1",
    t: "Encontro ao vivo",
    d: "Um pilar por encontro: ferramenta na tela, caso real e tira-dúvidas com quem conduz.",
  },
  {
    quando: "Dia 2",
    t: "Gravação liberada",
    d: "Perdeu o ao vivo? A aula fica gravada pra você assistir no seu tempo.",
  },
  {
    quando: "Dias 3 a 14",
    t: "Missão na prática",
    d: "Um desafio curto pra aplicar o que viu. Você posta, a comunidade comenta, os mentores dão retorno.",
  },
  {
    quando: "Sempre",
    t: "Rede aberta",
    d: "Jobs, collabs, indicações e coberturas de evento circulam entre os membros primeiro.",
  },
];

const ENTREGAVEIS: { icon: LucideIcon; t: string; d: string }[] = [
  {
    icon: Radio,
    t: "12 encontros ao vivo por semestre",
    d: "Um a cada 15 dias, online, com os mentores da Ousadia.",
  },
  {
    icon: PlayCircle,
    t: "Todas as gravações",
    d: "Encontros gravados e organizados pelos 4 pilares.",
  },
  {
    icon: BookOpenText,
    t: "Modelos e ferramentas",
    d: "Os prompts, roteiros e planilhas que a Ousadia usa no dia a dia.",
  },
  {
    icon: MessagesSquare,
    t: "Grupo fechado de membros",
    d: "Troca diária com quem está construindo, sem pose e sem panelinha.",
  },
  {
    icon: Sparkles,
    t: "Retorno dos mentores",
    d: "As missões quinzenais recebem comentário de quem vive do mercado.",
  },
  {
    icon: Users,
    t: "Mural de oportunidades",
    d: "Jobs, parcerias e indicações entre membros e marcas da região.",
  },
];

type Mentor = {
  nome: string;
  apelido: string;
  foto: string;
  w: number;
  h: number;
  pos: string;
  alt: string;
  pilares: string;
  tags: string[];
  bio: string;
};

const MENTORES: Mentor[] = [
  {
    nome: FUNDADOR.nome,
    apelido: "Jackson",
    foto: "/sobre/jackson-amd-palco.webp",
    w: 1200,
    h: 679,
    pos: "object-[50%_30%]",
    alt: "Jackson de braços abertos no palco do Amazon Marketing Day, com a plateia atrás",
    pilares: "Destrave e IA aplicada",
    tags: ["Fundador da Ousadia", "Criador do Destrave", "Amazon Marketing Day"],
    bio: "Foi servidor público por 18 anos antes de virar empreendedor no digital. Criou o Destrave, organizou duas edições do Amazon Marketing Day e transforma narrativa e IA em método pra quem está começando.",
  },
  {
    nome: "Tháscila Lawanda",
    apelido: "Tháscila",
    foto: "/aulao-social-media/thascila-sorrindo.webp",
    w: 1100,
    h: 1363,
    pos: "object-[50%_20%]",
    alt: "Tháscila Lawanda sorrindo, de braços cruzados, com a camiseta da Ousadia Marketing",
    pilares: "Social Media",
    tags: ["Sócia da Ousadia", "+100 alunas formadas", "Anapu, PA"],
    bio: "Saiu da Vicinal 3 Barracas, em Anapu, para o digital. Hoje é uma das sócias-proprietárias da Ousadia e ensina social media a partir do território, com exemplo do comércio daqui.",
  },
  {
    nome: "Juliana Araújo",
    apelido: "Juh",
    foto: "/mapa-do-ugc/juh-perfil.webp",
    w: 1000,
    h: 1498,
    pos: "object-[50%_20%]",
    alt: "Juliana Araújo, UGC Creator da Amazônia",
    pilares: "UGC",
    tags: ["UGC Creator da Amazônia", "70+ marcas atendidas", "COP30 e Expo Xingu"],
    bio: "Atriz, creator e estrategista de conteúdo de Altamira, o terceiro maior município do mundo. Longe de agência e de evento de marca, já atendeu mais de 70 marcas com perfil arrumado, portfólio e coragem de mandar mensagem.",
  },
];

/** Mosaico de quem já passou pela Ousadia (mesma regra de células da /aulao-social-media). */
const GALERIA: {
  src: string;
  w: number;
  h: number;
  forma: "largo" | "alto" | "quadrado" | "destaque";
  pos?: string;
  alt: string;
}[] = [
  { src: "/aulao-social-media/turma-grupo.webp", w: 900, h: 600, forma: "destaque", pos: "object-[50%_30%]", alt: "Cinco alunas sorrindo lado a lado na sala da Ousadia, uma delas com a camiseta da Ousadia Marketing" },
  { src: "/sobre/amd-plateia.webp", w: 782, h: 444, forma: "largo", alt: "Jackson no palco da segunda edição do Amazon Marketing Day, com a plateia" },
  { src: "/sobre/turma-asurini.webp", w: 960, h: 1200, forma: "alto", alt: "Jackson sentado à frente de quatro alunos sorridentes, diante de um painel roxo" },
  { src: "/aulao-social-media/turma-8.webp", w: 900, h: 900, forma: "quadrado", alt: "Turma de Social Media da Ousadia reunida no fim da aula, sobre o tapete vermelho" },
  { src: "/sobre/oficina-fotografia-rio.webp", w: 1200, h: 800, forma: "largo", pos: "object-[50%_45%]", alt: "Jackson com alunos, crianças e educadores numa oficina de fotografia à sombra de uma árvore, na beira do rio" },
  { src: "/aulao-social-media/turma-certificados-1.webp", w: 900, h: 600, forma: "largo", pos: "object-[50%_40%]", alt: "Turma da Ousadia segurando os certificados de conclusão" },
  { src: "/sobre/turma-educom.webp", w: 1200, h: 1200, forma: "quadrado", alt: "Jackson com uma turma presencial" },
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
    q: "O que é a Comunidade Creators da Amazônia?",
    a: "É a comunidade da Ousadia Marketing para creators, social medias e empreendedores do Norte. Reúne aulas, encontros ao vivo a cada 15 dias, ferramentas e uma rede de troca em 4 pilares: UGC, Social Media, Destrave (narrativa que vende) e IA aplicada. Foi lançada em fevereiro de 2026, em Altamira, no Pará.",
  },
  {
    q: "Quanto custa para entrar?",
    a: `Tem três jeitos de entrar. O grupo aberto no WhatsApp é gratuito. A assinatura de membro custa ${PRECO_SEMESTRE} por semestre, o que dá ${PRECO_MES} por mês. E quem já foi aluno pagante da Ousadia recebe o acesso de membro por convite, sem custo.`,
  },
  {
    q: "Qual a diferença entre o grupo gratuito e a assinatura?",
    a: "No grupo gratuito você recebe avisos de aulões, conteúdos abertos e convites para eventos. Como membro, você participa dos encontros ao vivo quinzenais, acessa todas as gravações, os modelos e ferramentas, o grupo fechado, o mural de oportunidades e recebe retorno dos mentores nas missões.",
  },
  {
    q: "Já fiz curso com a Ousadia. Como pego meu convite?",
    a: "Chame a Ousadia no WhatsApp pelo botão de ex-aluno e diga qual curso, mentoria ou imersão você fez. O time confere a sua matrícula e envia o convite de membro. Vale para qualquer formação paga da Ousadia desde 2020, do ABC do Marketing Digital às turmas de hoje.",
  },
  {
    q: "Com que frequência acontecem os encontros?",
    a: "A cada 15 dias, online e ao vivo, somando 12 encontros por semestre. Cada encontro trata de um dos 4 pilares. O dia e o horário de cada um são avisados no grupo de membros com antecedência.",
  },
  {
    q: "E se eu não puder assistir ao vivo?",
    a: "Todos os encontros ficam gravados e organizados por pilar. Você assiste quando puder e manda a dúvida no grupo de membros.",
  },
  {
    q: "Quem são os mentores?",
    a: "Jackson Queiroz, fundador da Ousadia e criador do Destrave, conduz os pilares de Destrave e IA. Tháscila Lawanda, sócia da Ousadia, conduz Social Media. Juliana Araújo, a Juh, UGC Creator com mais de 70 marcas atendidas, conduz UGC.",
  },
  {
    q: "Preciso morar em Altamira ou no Pará?",
    a: "Não. A comunidade é online e aberta a qualquer cidade. O contexto é o do Norte, mas o que se aprende vale para quem cria e vende pela internet de qualquer lugar.",
  },
  {
    q: "Preciso ter experiência ou muitos seguidores?",
    a: "Não. A comunidade recebe quem está começando e quem já trabalha com redes. Os encontros partem do básico de cada pilar e as missões se ajustam ao seu momento.",
  },
  {
    q: "Como funciona a assinatura semestral?",
    a: `São 6 meses de acesso de membro a partir da confirmação do pagamento, por ${PRECO_SEMESTRE}. No fim do semestre, você escolhe se renova. A Ousadia ensina método e não promete ganho: o resultado depende da execução de cada pessoa.`,
  },
];

function BotaoGrupo({
  label = CTA,
  className = "btn btn-primary",
}: {
  label?: string;
  className?: string;
}) {
  return (
    <a
      href={GRUPO_COMUNIDADE}
      target="_blank"
      rel="noopener noreferrer"
      className={className}
    >
      {label} <ArrowRight size={16} />
    </a>
  );
}

export default function ComunidadePage() {
  const ofertaJsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: "Comunidade Creators da Amazônia",
    description:
      "Comunidade da Ousadia Marketing com encontros ao vivo quinzenais e 4 pilares: UGC, Social Media, Destrave e IA aplicada.",
    brand: { "@type": "Organization", name: SITE.name, url: SITE.url },
    offers: [
      {
        "@type": "Offer",
        name: "Grupo aberto",
        price: "0",
        priceCurrency: "BRL",
        url: `${SITE.url}/comunidade`,
      },
      {
        "@type": "Offer",
        name: "Assinatura semestral de membro",
        price: "162",
        priceCurrency: "BRL",
        url: `${SITE.url}/comunidade`,
      },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(ofertaJsonLd) }}
      />
      <FaqJsonLd items={FAQ} />

      {/* 1. Hero: promessa + foto do lançamento, recortada abaixo do banner
          do evento (o banner diz "& Empreendedores", nome que não se usa). */}
      <section className="relative isolate overflow-hidden bg-ink-void">
        <div className="absolute inset-0 -z-10 grid-lines opacity-30" aria-hidden />
        <div
          className="absolute -left-24 top-1/4 -z-10 h-96 w-96 rounded-full bg-amarelo/10 blur-[140px]"
          aria-hidden
        />
        <div
          className="absolute -right-24 bottom-0 -z-10 h-96 w-96 rounded-full bg-floresta/10 blur-[140px]"
          aria-hidden
        />
        <div className="container-site grid items-center gap-12 pb-16 pt-14 lg:grid-cols-[1.05fr_.95fr] lg:py-24">
          <div>
            <Reveal>
              <p className="inline-flex items-center gap-2.5 rounded-full border border-amarelo/50 bg-ink-void/60 px-4 py-1.5 font-mono text-[11px] uppercase tracking-[0.18em] text-amarelo">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amarelo opacity-75" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-amarelo" />
                </span>
                Comunidade · Creators da Amazônia
              </p>
            </Reveal>
            <Reveal delay={0.05}>
              <h1 className="font-display mt-6 text-[clamp(2.4rem,6vw,4.4rem)] leading-[0.98]">
                Ninguém rema sozinho{" "}
                <span className="text-amarelo">no Norte.</span>
              </h1>
            </Reveal>
            <Reveal delay={0.1}>
              <p className="text-body mt-6 max-w-xl text-lg">
                A comunidade de creators, social medias e empreendedores da
                Amazônia: encontros ao vivo a cada 15 dias, os mentores da
                Ousadia por perto e uma rede de gente que está fazendo
                acontecer. Sem pose, sem panelinha, sem guru intocável.
              </p>
            </Reveal>
            <Reveal delay={0.15}>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
                <BotaoGrupo />
                <a href="#entrada" className="btn btn-secondary">
                  Ver como ser membro
                </a>
              </div>
            </Reveal>
            <Reveal delay={0.2}>
              <dl className="mt-10 grid max-w-lg grid-cols-3 divide-x divide-white/15 border-t border-white/15 pt-6">
                {[
                  { n: "4", t: "pilares: UGC, Social, Destrave e IA" },
                  { n: "15 em 15", t: "dias, encontro ao vivo" },
                  { n: "500", t: "alunos formados desde 2020" },
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

          <Reveal delay={0.1}>
            <figure className="relative mx-auto max-w-lg lg:rotate-[1.5deg]">
              <div className="overflow-hidden rounded-3xl border-2 border-amarelo shadow-[0_28px_70px_rgba(0,0,0,.5)]">
                <Image
                  src="/sobre/comunidade-lancamento-2026.webp"
                  alt="Selfie do Jackson com dezenas de creators e empreendedores no lançamento da Comunidade Creators da Amazônia, em fevereiro de 2026"
                  width={908}
                  height={1191}
                  priority
                  sizes="(min-width: 1024px) 512px, 100vw"
                  className="aspect-[11/10] w-full object-cover object-bottom"
                />
              </div>
              <figcaption className="absolute -bottom-5 left-5 rounded-full bg-amarelo px-4 py-2 font-mono text-[11px] uppercase tracking-wide text-ink shadow-lg lg:-rotate-[1.5deg]">
                Lançamento · Altamira, fev/2026
              </figcaption>
            </figure>
          </Reveal>
        </div>
        <KeneStrip motif="iso" height={20} className="text-amarelo opacity-70" />
      </section>

      {/* 2. Espelho: por que comunidade */}
      <section className="relative overflow-hidden bg-ink section-padding">
        <div className="container-site relative grid gap-14 lg:grid-cols-[1fr_1fr] lg:items-center">
          <div>
            <Reveal>
              <p className="eyebrow mb-4">Por que comunidade</p>
              <h2 className="headline-section max-w-xl">
                Criar sozinho no interior{" "}
                <span className="text-amarelo">cansa.</span>
              </h2>
            </Reveal>
            <ol className="mt-10 divide-y divide-white/10 border-y border-white/10">
              {SOZINHO.map((d, i) => (
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
          </div>
          <Reveal delay={0.08}>
            <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-ink-void p-8 sm:p-10">
              <KeneStrip
                motif="pushu"
                height={16}
                className="absolute inset-x-0 top-0 text-floresta opacity-70"
              />
              <RiverLines className="motif text-rio inset-0 h-full w-full opacity-[0.07]" />
              <blockquote className="relative font-display text-2xl leading-snug sm:text-3xl">
                Ninguém constrói movimento sozinho. A gente acredita que{" "}
                <span className="text-amarelo">a verdade vende</span>, que o
                sotaque do Norte vende, e que, junto, isso vira força de região,
                não caso isolado.
              </blockquote>
              <p className="text-body relative mt-6">
                A comunidade é o lugar onde quem está construindo troca com
                quem está construindo. Cada um rema no seu barco, mas o rio é o
                mesmo.
              </p>
            </div>
          </Reveal>
        </div>
      </section>

      {/* 3. Os 4 pilares */}
      <section className="fold-light relative overflow-hidden">
        <WaveDivider
          className="absolute inset-x-0 top-0 rotate-180"
          color="var(--ink)"
        />
        <div className="container-site relative section-padding">
          <Reveal>
            <p className="eyebrow mb-4">Os pilares da comunidade</p>
            <h2 className="headline-section max-w-2xl">
              Quatro margens do mesmo rio
            </h2>
            <p className="text-body mt-5 max-w-2xl">
              Cada encontro mergulha em um pilar. Você aprende o que precisa
              agora e conhece o resto do caminho: quem faz UGC aprende a vender
              a própria história, quem é social media coloca a IA pra trabalhar.
            </p>
          </Reveal>
          <ol className="mt-12 grid gap-6 md:grid-cols-2">
            {PILARES.map((p, i) => (
              <Reveal key={p.t} delay={i * 0.06}>
                <li className="relative h-full overflow-hidden rounded-2xl bg-roxo-700 p-7 text-white shadow-[0_24px_60px_rgba(29,12,57,.25)] sm:p-8">
                  <span
                    aria-hidden
                    className="font-display pointer-events-none absolute -right-2 -top-6 text-[7.5rem] leading-none text-white/[.06]"
                  >
                    {p.n}
                  </span>
                  <div className="relative flex items-center gap-4">
                    <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-white/10">
                      <p.icon className={p.cor} size={24} />
                    </span>
                    <div>
                      <p className="font-mono text-xs uppercase tracking-wide text-amarelo">
                        Pilar {p.n} · {p.mentor}
                      </p>
                      <h3 className="font-display text-2xl">{p.t}</h3>
                    </div>
                  </div>
                  <p className="relative mt-5 text-white/80">{p.d}</p>
                  <ul className="relative mt-5 space-y-2">
                    {p.temas.map((t) => (
                      <li key={t} className="flex gap-3 text-sm text-white/90">
                        <Check size={16} className="mt-0.5 shrink-0 text-floresta" />
                        {t}
                      </li>
                    ))}
                  </ul>
                </li>
              </Reveal>
            ))}
          </ol>
        </div>
      </section>

      {/* 4. Como funciona: o ciclo de 15 dias */}
      <section className="relative overflow-hidden bg-ink-void section-padding">
        <RiverLines className="motif motif-soft text-rio inset-x-0 top-1/2 h-40 w-full" />
        <div className="container-site relative">
          <Reveal>
            <p className="eyebrow mb-4">Como funciona</p>
            <h2 className="headline-section max-w-2xl">
              Um ciclo a cada{" "}
              <span className="text-amarelo">15 dias</span>
            </h2>
            <p className="text-body mt-5 max-w-xl">
              Ritmo de rio: constante, sem enchente de conteúdo. Dá pra
              acompanhar trabalhando, estudando e cuidando da casa.
            </p>
          </Reveal>
          <ol className="relative mt-14 grid gap-10 md:grid-cols-4 md:gap-6">
            <span
              aria-hidden
              className="absolute left-5 top-0 h-full w-px bg-gradient-to-b from-amarelo via-rio to-floresta md:left-0 md:top-5 md:h-px md:w-full md:bg-gradient-to-r"
            />
            {CICLO.map((c, i) => (
              <Reveal key={c.t} delay={i * 0.07}>
                <li className="relative pl-14 md:pl-0 md:pt-14">
                  <span className="absolute left-0 top-0 grid h-10 w-10 place-items-center rounded-full border-2 border-amarelo bg-ink-void font-display text-sm text-amarelo">
                    {i + 1}
                  </span>
                  <p className="font-mono text-xs uppercase tracking-wide text-rio">
                    {c.quando}
                  </p>
                  <h3 className="font-display mt-1 text-xl">{c.t}</h3>
                  <p className="text-body mt-2 text-sm">{c.d}</p>
                </li>
              </Reveal>
            ))}
          </ol>
        </div>
      </section>

      {/* 5. O que você leva */}
      <section className="relative overflow-hidden bg-ink section-padding">
        <div className="container-site relative">
          <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
            <Reveal>
              <p className="eyebrow mb-4">O que você leva como membro</p>
              <h2 className="headline-section max-w-xl">
                Seis meses de rede,{" "}
                <span className="text-amarelo">método e prática</span>
              </h2>
            </Reveal>
            <Reveal delay={0.05}>
              <a href="#entrada" className="btn btn-secondary">
                Ver como entrar <ArrowRight size={16} />
              </a>
            </Reveal>
          </div>
          <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {ENTREGAVEIS.map((e, i) => (
              <Reveal key={e.t} delay={i * 0.05}>
                <div className="card-surface h-full p-7">
                  <e.icon className="text-amarelo" size={26} />
                  <h3 className="font-display mt-4 text-lg">{e.t}</h3>
                  <p className="text-body mt-2 text-sm">{e.d}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* 6. Três portas de entrada */}
      <section
        id="entrada"
        className="relative scroll-mt-16 overflow-hidden bg-roxo-700 section-padding"
      >
        <GrafismoDiamonds
          color="#ffffff"
          className="absolute inset-0 opacity-[0.04]"
        />
        <div className="container-site relative">
          <Reveal>
            <p className="eyebrow mb-4 text-center">Como entrar</p>
            <h2 className="headline-section mx-auto max-w-2xl text-center">
              Três portas,{" "}
              <span className="text-amarelo">um mesmo rio</span>
            </h2>
            <p className="text-body mx-auto mt-5 max-w-xl text-center">
              Comece pelo grupo aberto, assine para participar de tudo ou, se
              já estudou com a gente, entre como membro por convite.
            </p>
          </Reveal>

          <div className="mt-14 grid gap-6 lg:grid-cols-3 lg:items-stretch">
            {/* Grátis */}
            <Reveal delay={0.04}>
              <div className="flex h-full flex-col rounded-3xl border border-white/15 bg-ink-void/60 p-8">
                <p className="font-mono text-xs uppercase tracking-wide text-floresta">
                  Grupo aberto
                </p>
                <p className="font-display mt-3 text-4xl">Grátis</p>
                <p className="text-body mt-2 text-sm">
                  Pra conhecer a comunidade antes de mergulhar.
                </p>
                <ul className="mt-6 flex-1 space-y-3 text-sm">
                  {[
                    "Grupo da comunidade no WhatsApp",
                    "Avisos de aulões e eventos gratuitos",
                    "Conteúdos abertos dos 4 pilares",
                  ].map((t) => (
                    <li key={t} className="flex gap-3">
                      <Check size={16} className="mt-0.5 shrink-0 text-floresta" />
                      {t}
                    </li>
                  ))}
                </ul>
                <BotaoGrupo
                  label="Entrar no grupo"
                  className="btn btn-secondary mt-8 w-full justify-center"
                />
              </div>
            </Reveal>

            {/* Assinatura */}
            <Reveal delay={0.08}>
              <div className="relative flex h-full flex-col rounded-3xl border-2 border-amarelo bg-ink-void p-8 shadow-[0_28px_70px_rgba(0,0,0,.45)] lg:-my-4 lg:py-12">
                <span className="absolute -top-3.5 left-8 rounded-full bg-amarelo px-3 py-1 font-mono text-[11px] uppercase tracking-wide text-ink">
                  Mais completo
                </span>
                <p className="font-mono text-xs uppercase tracking-wide text-amarelo">
                  Membro · assinatura semestral
                </p>
                <p className="mt-3 flex items-baseline gap-2">
                  <span className="font-display text-5xl text-amarelo">
                    {PRECO_SEMESTRE}
                  </span>
                  <span className="text-body text-sm">por semestre</span>
                </p>
                <p className="text-body mt-2 text-sm">
                  Equivale a {PRECO_MES} por mês, por 6 meses de acesso.
                </p>
                <ul className="mt-6 flex-1 space-y-3 text-sm">
                  {[
                    "Tudo do grupo aberto",
                    "12 encontros ao vivo, a cada 15 dias",
                    "Todas as gravações, por pilar",
                    "Modelos, prompts e ferramentas",
                    "Grupo fechado de membros",
                    "Retorno dos mentores nas missões",
                    "Mural de oportunidades",
                  ].map((t) => (
                    <li key={t} className="flex gap-3">
                      <Check size={16} className="mt-0.5 shrink-0 text-amarelo" />
                      {t}
                    </li>
                  ))}
                </ul>
                <a
                  href={ASSINAR_HREF}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-primary mt-8 w-full justify-center"
                >
                  Quero ser membro <ArrowRight size={16} />
                </a>
              </div>
            </Reveal>

            {/* Ex-aluno */}
            <Reveal delay={0.12}>
              <div className="flex h-full flex-col rounded-3xl border border-white/15 bg-ink-void/60 p-8">
                <p className="flex items-center gap-2 font-mono text-xs uppercase tracking-wide text-rio">
                  <KeyRound size={14} /> Ex-aluno · por convite
                </p>
                <p className="font-display mt-3 text-4xl">R$ 0</p>
                <p className="text-body mt-2 text-sm">
                  Já foi aluno pagante da Ousadia? A casa é sua.
                </p>
                <ul className="mt-6 flex-1 space-y-3 text-sm">
                  {[
                    "Acesso de membro, sem pagar a assinatura",
                    "Vale para curso, mentoria ou imersão paga",
                    "Das turmas do ABC de 2020 às de hoje",
                  ].map((t) => (
                    <li key={t} className="flex gap-3">
                      <Check size={16} className="mt-0.5 shrink-0 text-rio" />
                      {t}
                    </li>
                  ))}
                </ul>
                <a
                  href={CONVITE_HREF}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-secondary mt-8 w-full justify-center"
                >
                  Pedir meu convite <ArrowRight size={16} />
                </a>
              </div>
            </Reveal>
          </div>

          <Reveal delay={0.14}>
            <p className="mx-auto mt-10 max-w-2xl text-center font-mono text-xs leading-relaxed text-cinza-ink">
              A Ousadia ensina método e não promete ganho: o resultado depende
              da execução de cada pessoa. O convite de ex-aluno é liberado
              depois que o time confere a matrícula.
            </p>
          </Reveal>
        </div>
      </section>

      {/* 7. Mentores */}
      <section className="fold-light relative overflow-hidden">
        <WaveDivider
          className="absolute inset-x-0 top-0 rotate-180"
          color="var(--roxo-700)"
        />
        <div className="container-site relative section-padding">
          <Reveal>
            <p className="eyebrow mb-4">Quem conduz</p>
            <h2 className="headline-section max-w-2xl">
              Mentores que vivem{" "}
              <span className="text-floresta-deep">do que ensinam</span>
            </h2>
            <p className="text-body mt-5 max-w-xl">
              Gente do Norte, que aprendeu fazendo e continua fazendo. Nada de
              teoria de quem nunca atendeu um cliente.
            </p>
          </Reveal>
          <div className="mt-12 grid gap-6 md:grid-cols-3">
            {MENTORES.map((m, i) => (
              <Reveal key={m.nome} delay={i * 0.07}>
                <article className="card-surface flex h-full flex-col overflow-hidden">
                  <Image
                    src={m.foto}
                    alt={m.alt}
                    width={m.w}
                    height={m.h}
                    sizes="(min-width: 768px) 33vw, 100vw"
                    className={`aspect-[4/5] w-full object-cover ${m.pos}`}
                  />
                  <div className="flex flex-1 flex-col p-7">
                    <p className="font-mono text-xs uppercase tracking-wide text-floresta-deep">
                      {m.pilares}
                    </p>
                    <h3 className="font-display mt-2 text-2xl">{m.nome}</h3>
                    <div className="mt-4 flex flex-wrap gap-2">
                      {m.tags.map((t) => (
                        <span
                          key={t}
                          className="rounded-full border border-floresta-deep/40 bg-floresta/10 px-3 py-1 font-mono text-[11px] text-floresta-deep"
                        >
                          {t}
                        </span>
                      ))}
                    </div>
                    <p className="text-body mt-4 text-sm">{m.bio}</p>
                  </div>
                </article>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* 8. Prova: a rede já existe */}
      <section className="relative overflow-hidden bg-ink-void section-padding">
        <WaveDivider
          className="absolute inset-x-0 top-0 rotate-180"
          color="var(--paper)"
        />
        <div className="container-site relative">
          <div className="grid gap-10 lg:grid-cols-[.8fr_1.2fr] lg:items-start">
            <Reveal>
              <p className="eyebrow mb-4">A rede já existe</p>
              <h2 className="headline-section">
                Seis anos juntando{" "}
                <span className="text-amarelo">gente do Norte</span>
              </h2>
              <p className="text-body mt-5">
                Desde a primeira turma em Brasil Novo, em 2020, a Ousadia forma
                gente de carne e osso: em sala, em palco, na beira do rio. A
                comunidade é o que acontece quando essa gente para de se
                encontrar só no fim do curso.
              </p>
              <dl className="mt-8 grid grid-cols-3 gap-4 border-t border-white/15 pt-6">
                {[
                  { n: "500", t: "alunos formados" },
                  { n: "+1000", t: "pessoas impactadas" },
                  { n: "70%", t: "mulheres" },
                ].map((s) => (
                  <div key={s.t}>
                    <dt className="font-display text-3xl text-amarelo">{s.n}</dt>
                    <dd className="text-body mt-1 text-xs">{s.t}</dd>
                  </div>
                ))}
              </dl>
              <div className="mt-8">
                <BotaoGrupo label="Quero fazer parte" />
              </div>
            </Reveal>
            <div className="@container">
              <div className="grid auto-rows-[calc((100cqw-0.75rem)/2)] grid-cols-2 gap-3 md:auto-rows-[calc((100cqw-3rem)/4)] md:grid-cols-4 md:gap-4">
                {GALERIA.map((g) => (
                  <figure
                    key={g.src}
                    className={`group overflow-hidden rounded-2xl border-2 border-amarelo/45 shadow-[0_20px_50px_rgba(0,0,0,.35)] ${FORMA_GALERIA[g.forma]}`}
                  >
                    <Image
                      src={g.src}
                      alt={g.alt}
                      width={g.w}
                      height={g.h}
                      sizes={
                        g.forma === "destaque" || g.forma === "largo"
                          ? "(min-width: 1024px) 400px, 100vw"
                          : "(min-width: 1024px) 200px, 50vw"
                      }
                      className={`h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.04] ${g.pos ?? ""}`}
                    />
                  </figure>
                ))}
              </div>
            </div>
          </div>
        </div>
        <Canoe className="motif motif-soft text-amarelo right-[6%] bottom-6 hidden w-56 lg:block" />
      </section>

      {/* 9. FAQ */}
      <section className="fold-light relative overflow-hidden">
        <WaveDivider
          className="absolute inset-x-0 top-0 rotate-180"
          color="var(--ink-void)"
        />
        <div className="container-site relative section-padding max-w-3xl">
          <Reveal>
            <p className="eyebrow mb-4">Dúvidas</p>
            <h2 className="headline-section">Perguntas frequentes</h2>
            <p className="text-body mt-5 mb-10">
              A <strong className="font-semibold">Comunidade Creators da Amazônia</strong>{" "}
              é a comunidade da Ousadia Marketing, a primeira Agência Escola de
              Marketing do Norte do Brasil, para creators, social medias e
              empreendedores. Tem encontros ao vivo a cada 15 dias em 4
              pilares (UGC, Social Media, Destrave e IA), com Jackson Queiroz,
              Tháscila Lawanda e Juliana Araújo.
            </p>
          </Reveal>
          <FaqList items={FAQ} />
        </div>
      </section>

      <CtaFinal
        waveColor="var(--paper)"
        title={
          <>
            O rio já está correndo.{" "}
            <span className="text-amarelo">Sobe na canoa.</span>
          </>
        }
        lead="Entre no grupo gratuito agora. Lá você conhece a comunidade, recebe os avisos dos próximos encontros e decide quando virar membro."
        ctaLabel={CTA}
        href={GRUPO_COMUNIDADE}
        microcopy="Grupo gratuito no WhatsApp. Ex-aluno? Peça seu convite de membro na seção Como entrar."
      />
    </>
  );
}
