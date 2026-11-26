import type { Metadata } from "next";
import Image from "next/image";
import { ArrowRight, Check, Users, X } from "lucide-react";
import { Reveal } from "@/components/ui/Reveal";
import { WaveDivider } from "@/components/ui/WaveDivider";
import { CtaFinal } from "@/components/sections/CtaFinal";
import { FaqList, FaqJsonLd } from "@/components/sections/Faq";
import { ContentSlot } from "@/components/ui/MediaSlot";
import { YouTubeLite } from "@/components/ui/YouTubeLite";
import { GrafismoDiamonds, Paddle, RiverLines } from "@/components/ui/Motifs";
import { KeneStrip } from "@/components/ui/graphics/Kene";
import { MENTORIA_UGC_NO_GOOGLE, SITE, waMentoriaUgc } from "@/lib/site";

export const metadata: Metadata = {
  title: "Mentoria em Turma | Juliana Araújo — Transforme sua história em oportunidades",
  description:
    "Mentoria em turma com Juliana Araújo: 6 encontros ao vivo para começar na criação de conteúdo, montar seu portfólio e desenvolver oportunidades com marcas, mesmo sem experiência e sem milhares de seguidores.",
  alternates: { canonical: `${SITE.url}/mentoria-viver-do-digital` },
  ...(MENTORIA_UGC_NO_GOOGLE ? {} : { robots: { index: false, follow: true } }),
};

/**
 * Página de vendas da Mentoria em Turma da Juh (R$ 697, 6 encontros).
 * Copy segue o "Comando oficial — site de vendas | Mentoria Juliana Araújo"
 * (26/11/2026): sem datas, sem parcelamento e sem bônus até a Juh confirmar
 * (ver PENDENCIAS #21). Toda CTA cai no WhatsApp da Juh — ainda não existe
 * link de checkout. Reaproveita a mídia de `/mapa-do-ugc` (foto e prints),
 * já usada no site, até chegarem os materiais próprios desta turma.
 */

const INFO = ["6 encontros ao vivo", "Turma 04 · 12 vagas", "Lista de espera aberta"];

const DORES = [
  "Trabalha de carteira assinada e sente que o dia não sobra tempo nem coragem pra começar algo novo.",
  "Grava vídeo no celular por hobby, mas não sabe como isso pode virar trabalho.",
  "Acha que precisa de milhares de seguidores pra uma marca sequer olhar pro perfil dela.",
  "Nunca trabalhou com criação de conteúdo e não sabe por onde começar.",
  "Não tem portfólio — e, sem ele, não sabe o que mostrar pras marcas.",
  "Mora numa cidade pequena ou numa zona rural e sente que oportunidade é sempre em outro lugar.",
];

const PARA_QUEM = [
  "Você trabalha de carteira assinada e quer desenvolver uma nova habilidade",
  "Você busca uma possibilidade de renda extra",
  "Você quer aprender a trabalhar com marcas",
  "Você gosta de gravar vídeos, mas não sabe como transformar isso em trabalho",
  "Você nunca teve experiência profissional com criação de conteúdo",
  "Você mora em cidade pequena, zona rural ou grande centro — o lugar onde você está não te limita",
];

const NAO_E = [
  "Você procura dinheiro rápido sem colocar a mão na massa",
  "Você não pretende gravar nenhum conteúdo durante a mentoria",
  "Você quer só assistir aulas, sem participar da turma e sem aplicar os exercícios",
];

const ENCONTROS = [
  {
    tema: "Mentalidade, mercado e posicionamento",
    conteudos: [
      "Mentalidade empreendedora",
      "Protagonismo e desenvolvimento profissional",
      "O que é UGC e como funciona o mercado",
      "Diferença entre UGC Creator e influenciadora",
      "Oportunidades de trabalho com marcas",
      "Identificação de habilidades e diferenciais",
      "Escolha do nicho principal e nichos complementares",
    ],
    beneficio: "Compreender o mercado e construir uma direção profissional.",
  },
  {
    tema: "Estruturação da vitrine digital",
    conteudos: [
      "Organização do Instagram profissional",
      "Foto de perfil, nome e biografia",
      "Posicionamento e apresentação pessoal",
      "Organização do feed e dos destaques",
      "Identidade visual",
      "Contato profissional e canais de comunicação",
      "Como transmitir confiança para as marcas",
    ],
    beneficio:
      "Construir um perfil que apresente profissionalmente suas habilidades.",
  },
  {
    tema: "Produção de conteúdo e vídeos",
    conteudos: [
      "Como gravar vídeos usando o celular",
      "Equipamentos básicos",
      "Iluminação, enquadramento e áudio",
      "Storytelling e construção de narrativas",
      "Ganchos e roteiros",
      "Técnicas de gravação",
      "Edição de vídeos",
      "Pilares de conteúdo",
      "Vídeos demonstrativos de produtos",
    ],
    beneficio: "Desenvolver habilidades para criar vídeos e demonstrar seu trabalho.",
  },
  {
    tema: "Construção do portfólio",
    conteudos: [
      "O que é um portfólio UGC",
      "Estrutura de apresentação profissional",
      "Como apresentar seus nichos",
      "Seleção e organização de vídeos",
      "Apresentação pessoal e diferenciais",
      "Como utilizar o Canva",
      "Organização de trabalhos e contatos",
      "Apresentação do portfólio em formato digital",
    ],
    beneficio:
      "Construir uma apresentação profissional para mostrar às marcas o que sabe produzir.",
  },
  {
    tema: "Prospecção e abordagem de marcas",
    conteudos: [
      "Onde encontrar marcas",
      "Como mapear oportunidades",
      "Plataformas de campanhas",
      "Como identificar marcas alinhadas ao seu nicho",
      "Abordagem pelo Instagram e e-mail",
      "Mensagens personalizadas",
      "Como apresentar o portfólio",
      "Prospecção e follow-up",
      "Construção de propostas comerciais",
    ],
    beneficio:
      "Aprender a encontrar oportunidades e iniciar conversas profissionais com marcas.",
  },
  {
    tema: "Negociação, contratos e profissionalização",
    conteudos: [
      "Como precificar serviços",
      "Permutas e campanhas remuneradas",
      "Como apresentar propostas e valores",
      "Negociação com marcas",
      "Briefing, entregas e prazos",
      "Direitos de uso de imagem e conteúdo",
      "Noções básicas de contratos",
      "Organização profissional",
      "Planejamento dos próximos passos",
    ],
    beneficio:
      "Compreender como conduzir uma oportunidade comercial e organizar sua atuação profissional.",
  },
];

const DIFERENCIAIS = [
  {
    t: "Orientação de perto",
    d: "a Juh acompanha sua evolução ao longo dos 6 encontros, não só assiste você de longe.",
  },
  {
    t: "Prática em cada etapa",
    d: "exercícios e atividades durante a jornada, pra sair do “vou fazer” pro “fiz”.",
  },
  {
    t: "Experiência real de mercado",
    d: "quem ensina é quem atende marcas de verdade, não só estuda o assunto.",
  },
  {
    t: "Aprendizado em turma",
    d: "trocar com outras mulheres no mesmo momento te tira da solidão de aprender sozinha.",
  },
];

const PROVAS = [
  { n: "70+", l: "marcas atendidas" },
  { n: "21 mil", l: "seguidores no Instagram" },
  { n: "30 mil", l: "seguidores no TikTok" },
  { n: "1 milhão+", l: "visualizações num único Reels" },
];

/** Prints do aulão (mídia já usada em `/mapa-do-ugc` — PENDENCIAS #20 vale aqui também). */
const PRINTS = [
  {
    src: "depoimento-diy.webp",
    w: 1041,
    alt: "Print de WhatsApp: terceira campanha de UGC aprovada com a marca de cosméticos DIY",
  },
  {
    src: "depoimento-samsung.webp",
    w: 1012,
    alt: "Print de notificação: candidatura aprovada em campanha da Samsung Galaxy",
  },
  {
    src: "depoimento-oralb.webp",
    w: 1306,
    alt: "Print de aluna aprovada na campanha Iconic da Oral-B no Instagram",
  },
  {
    src: "depoimento-aquarela.webp",
    w: 1733,
    alt: "Print de aluna aprovada em campanha e convidada para parceria com loja de enxoval infantil",
  },
  {
    src: "depoimento-jakeline.webp",
    w: 1733,
    alt: "Print de conversa: aluna comemorando parceria recebida no Instagram",
  },
  {
    src: "depoimento-grupo.webp",
    w: 1357,
    alt: "Print do grupo exclusivo de oportunidades com campanhas de Dove, Lux e Pantene",
  },
];

const DEPOIMENTOS = [
  { id: "3iVry7h2C8U", titulo: "Depoimento em vídeo de aluna da Juh" },
  { id: "ZQgKyvz7UOE", titulo: "Depoimento em vídeo de aluna da Juh" },
  { id: "t57qogTvwPI", titulo: "Depoimento em vídeo de aluna da Juh" },
  { id: "N-q6r4jSZNU", titulo: "Depoimento em vídeo de aluna da Juh" },
];

const FAQ = [
  {
    q: "Preciso ter experiência com criação de conteúdo?",
    a: "Não. A mentoria foi pensada pra quem está começando do zero — o Encontro 1 é justamente sobre entender o mercado e se posicionar antes de produzir qualquer coisa.",
  },
  {
    q: "Tenho poucos seguidores. A mentoria serve para mim?",
    a: "Serve. No UGC, a marca contrata o seu vídeo, não o seu alcance. Por isso, perfis pequenos também conseguem desenvolver oportunidades reais.",
  },
  {
    q: "E se eu não puder estar ao vivo em algum encontro?",
    a: "Fale com a Juh pelo WhatsApp pra combinar como acompanhar o conteúdo daquele encontro.",
  },
  {
    q: "Moro no interior, longe das marcas. Faz diferença?",
    a: "Faz, e a favor. A Juh mora em Altamira e atende marcas nacionais. Seu território pode ser um diferencial, não uma desculpa.",
  },
  {
    q: "Preciso de equipamento profissional?",
    a: "Não. Celular, luz natural e o que você já tem em casa são suficientes para começar.",
  },
  {
    q: "A mentoria garante que vou fechar com marcas?",
    a: "Ninguém pode garantir isso, e desconfie de quem garante. O que a mentoria oferece é método, orientação de perto e as ferramentas pra você desenvolver suas próprias oportunidades.",
  },
  {
    q: "Quando abre a Turma 04?",
    a: "Ainda não tem data definida. Entrando na lista de espera pelo WhatsApp, você é avisada em primeira mão quando a Turma 04 abrir, com data, horário e forma de pagamento.",
  },
  {
    q: "Como funciona a lista de espera?",
    a: "Você manda uma mensagem pra Juh no WhatsApp e entra na fila. Como são só 12 vagas, quem está na lista de espera é chamada primeiro quando a turma abrir.",
  },
  {
    q: "Como recebo o acesso?",
    a: "Depois de entrar na lista de espera e confirmar sua vaga com a Juh, você recebe as instruções e a agenda dos encontros.",
  },
];

function BotaoVaga({ href, label }: { href: string; label: string }) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-5">
      <a href={href} className="btn btn-primary">
        {label} <ArrowRight size={16} />
      </a>
      <span className="font-mono text-xs text-cinza-ink">
        Lista de espera · Turma 04 · 12 vagas
      </span>
    </div>
  );
}

export default function MentoriaViverDoDigitalPage() {
  const waHref = waMentoriaUgc();

  const cursoJsonLd = {
    "@context": "https://schema.org",
    "@type": "Course",
    name: "Mentoria em Turma — Juliana Araújo",
    description:
      "Mentoria em turma de UGC com Juliana Araújo: 6 encontros ao vivo sobre mentalidade e posicionamento, vitrine digital, produção de vídeos, portfólio, prospecção e negociação com marcas.",
    provider: {
      "@type": "Organization",
      name: "Ousadia Marketing",
      sameAs: "https://instagram.com/ousadiamkt",
    },
    inLanguage: "pt-BR",
    offers: {
      "@type": "Offer",
      price: "697",
      priceCurrency: "BRL",
      availability: "https://schema.org/PreOrder",
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(cursoJsonLd) }}
      />
      <FaqJsonLd items={FAQ} />

      {/* 1. Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 grid-lines opacity-50" aria-hidden />
        <div
          className="absolute -top-24 right-0 h-80 w-80 rounded-full bg-amarelo/15 blur-[120px]"
          aria-hidden
        />
        <RiverLines className="motif motif-soft text-rio inset-x-0 bottom-0 h-32 w-full" />

        <div className="container-site relative section-padding">
          <div className="grid items-center gap-12 lg:grid-cols-[1.15fr_.85fr]">
            <div>
              <Reveal>
                <p className="eyebrow mb-5">Mentoria em Turma · Juliana Araújo</p>
              </Reveal>
              <Reveal delay={0.05}>
                <h1 className="font-display text-[clamp(2.1rem,5vw,3.6rem)] leading-[1.04]">
                  Transforme sua história em{" "}
                  <span className="text-amarelo">oportunidades</span>.
                </h1>
              </Reveal>
              <Reveal delay={0.1}>
                <p className="text-body mt-6 max-w-2xl">
                  Aprenda a começar na criação de conteúdo, construir seu
                  portfólio e desenvolver oportunidades para trabalhar com
                  marcas — mesmo sem experiência e sem precisar ter milhares
                  de seguidores.
                </p>
              </Reveal>
              <Reveal delay={0.12}>
                <ul className="mt-7 flex flex-wrap gap-2">
                  {INFO.map((i) => (
                    <li
                      key={i}
                      className="rounded-full border border-amarelo/50 bg-amarelo/10 px-4 py-1.5 font-mono text-xs text-amarelo"
                    >
                      {i}
                    </li>
                  ))}
                </ul>
              </Reveal>
              <Reveal delay={0.15}>
                <div className="mt-9">
                  <a href={waHref} className="btn btn-primary">
                    Quero entrar na lista de espera <ArrowRight size={16} />
                  </a>
                  <p className="mt-4 font-mono text-xs text-cinza-ink">
                    Turma 04 · só 12 vagas. Entre na lista e seja avisada
                    primeiro quando abrir.
                  </p>
                </div>
              </Reveal>
            </div>
            <Reveal delay={0.1}>
              <Image
                src="/mapa-do-ugc/juh-perfil.webp"
                alt="Juliana Araújo, a Juh, UGC Creator da Amazônia"
                width={1498}
                height={1000}
                priority
                className="w-full rounded-2xl border-2 border-amarelo object-cover shadow-[0_28px_70px_rgba(0,0,0,.45)]"
              />
            </Reveal>
          </div>
        </div>
        <KeneStrip motif="iso" height={20} className="text-amarelo opacity-70" />
      </section>

      {/* 2. Identificação e dor */}
      <section className="relative overflow-hidden bg-ink section-padding">
        <Paddle className="motif motif-soft text-amarelo right-[8%] top-12 hidden w-20 rotate-6 lg:block" />
        <div className="container-site relative">
          <Reveal>
            <p className="eyebrow mb-4">Talvez você se reconheça aqui</p>
            <h2 className="headline-section max-w-2xl">
              Você gosta de gravar vídeo, mas não sabe como transformar isso
              em trabalho.
            </h2>
          </Reveal>
          <ul className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {DORES.map((d, i) => (
              <Reveal key={d} delay={i * 0.05}>
                <li className="card-surface flex h-full gap-3 p-6">
                  <X size={18} className="mt-0.5 shrink-0 text-amarelo" />
                  <p className="text-body text-sm">{d}</p>
                </li>
              </Reveal>
            ))}
          </ul>

          <Reveal delay={0.08}>
            <blockquote className="mx-auto mt-16 max-w-3xl border-l-2 border-amarelo pl-6">
              <div className="text-body space-y-5 text-lg">
                <p>
                  Eu saí de casa aos 17 anos em busca dos meus sonhos.
                  Trabalhei quatro anos no setor de telefonia, até ser
                  desligada em 2023.
                </p>
                <p>
                  Foi aí que encontrei no marketing digital uma nova
                  possibilidade profissional. Trabalhei com social media,
                  atendi diversos clientes, atuei no audiovisual e comecei a
                  construir minha trajetória como criadora de conteúdo —
                  sempre daqui, da Amazônia.
                </p>
                <p>
                  Hoje trabalho com marcas nacionais, produzo vídeos e
                  compartilho esse caminho com mulheres que querem começar no
                  digital.{" "}
                  <strong className="font-semibold text-foreground">
                    A Mentoria em Turma é esse caminho, com companhia.
                  </strong>
                </p>
              </div>
              <footer className="mt-5 font-mono text-xs text-amarelo">
                — Juh Araújo
              </footer>
            </blockquote>
          </Reveal>
        </div>
      </section>

      {/* 3. Para quem é */}
      <section className="fold-light relative overflow-hidden">
        <WaveDivider
          className="absolute inset-x-0 top-0 rotate-180"
          color="var(--ink)"
        />
        <div className="container-site relative section-padding">
          <Reveal>
            <p className="eyebrow mb-4">Público</p>
            <h2 className="headline-section">Pra quem é a mentoria</h2>
          </Reveal>
          <div className="mt-12 grid gap-6 lg:grid-cols-[1.25fr_1fr]">
            <Reveal>
              <div className="card-surface h-full p-7">
                <h3 className="font-display text-lg">
                  A mentoria é para você se:
                </h3>
                <ul className="mt-5 space-y-4">
                  {PARA_QUEM.map((p) => (
                    <li key={p} className="flex gap-3">
                      <Check
                        size={18}
                        className="mt-0.5 shrink-0 text-floresta-deep"
                      />
                      <span className="text-body text-sm">{p}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </Reveal>
            <Reveal delay={0.08}>
              <div className="card-surface h-full p-7">
                <h3 className="font-display text-lg">Não é para você se:</h3>
                <ul className="mt-5 space-y-4">
                  {NAO_E.map((p) => (
                    <li key={p} className="flex gap-3">
                      <X size={18} className="mt-0.5 shrink-0 text-[#b3261e]" />
                      <span className="text-body text-sm">{p}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* 4. Oportunidade + como funciona */}
      <section className="relative overflow-hidden bg-roxo section-padding">
        <GrafismoDiamonds
          color="#ffffff"
          className="absolute inset-0 opacity-[0.04]"
        />
        <div className="container-site relative">
          <Reveal>
            <p className="eyebrow mb-4">Como funciona</p>
            <h2 className="headline-section max-w-2xl">
              6 encontros ao vivo.{" "}
              <span className="text-amarelo">Aprendizado em turma.</span>
            </h2>
            <p className="text-body mt-5 max-w-2xl">
              Encontros ao vivo, com conteúdo prático, orientação da Juh e
              exercícios pra você aplicar ao longo da jornada — desde a
              mentalidade e o posicionamento até a negociação com marcas.
            </p>
          </Reveal>

          <ol className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {ENCONTROS.map((e, i) => (
              <Reveal key={e.tema} delay={(i % 3) * 0.06}>
                <li className="card-surface flex h-full flex-col p-6">
                  <span className="font-display text-3xl text-amarelo">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <h3 className="font-display mt-3 text-base leading-snug">
                    {e.tema}
                  </h3>
                  <ul className="mt-4 space-y-1.5">
                    {e.conteudos.slice(0, 4).map((c) => (
                      <li
                        key={c}
                        className="text-body flex gap-2 text-xs leading-relaxed"
                      >
                        <span className="mt-1 size-1 shrink-0 rounded-full bg-amarelo" />
                        {c}
                      </li>
                    ))}
                  </ul>
                  <p className="mt-auto pt-4 text-sm">
                    <span className="font-mono text-[11px] uppercase tracking-wide text-cinza-ink">
                      Benefício ·{" "}
                    </span>
                    <span className="text-foreground">{e.beneficio}</span>
                  </p>
                </li>
              </Reveal>
            ))}
          </ol>

          <Reveal delay={0.1}>
            <div className="mt-10">
              <BotaoVaga href={waHref} label="Quero entrar na lista de espera" />
            </div>
          </Reveal>
        </div>
      </section>

      {/* 5. Diferenciais */}
      <section className="fold-light relative overflow-hidden">
        <WaveDivider
          className="absolute inset-x-0 top-0 rotate-180"
          color="var(--roxo)"
        />
        <div className="container-site relative section-padding">
          <Reveal>
            <p className="eyebrow mb-4">Diferenciais</p>
            <h2 className="headline-section max-w-2xl">
              Por que fazer isso em turma, com a Juh
            </h2>
          </Reveal>
          <ul className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {DIFERENCIAIS.map((item, i) => (
              <Reveal key={item.t} delay={i * 0.05}>
                <li className="card-surface flex h-full flex-col gap-3 p-6">
                  <Check size={18} className="shrink-0 text-floresta-deep" />
                  <p className="text-body text-sm">
                    <strong className="font-semibold text-[#1a0b2e]">
                      {item.t}
                    </strong>
                    , {item.d}
                  </p>
                </li>
              </Reveal>
            ))}
          </ul>
        </div>
      </section>

      {/* 6. Prova social */}
      <section className="relative overflow-hidden bg-ink section-padding">
        <div className="container-site relative">
          <Reveal>
            <p className="eyebrow mb-4">Depoimentos</p>
            <h2 className="headline-section max-w-2xl">
              O que dizem as meninas que já começaram com a Juh
            </h2>
          </Reveal>

          <div className="mx-auto mt-10 grid max-w-4xl gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {DEPOIMENTOS.map((d, i) => (
              <Reveal key={d.id} delay={i * 0.08}>
                <div className="overflow-hidden rounded-2xl border-2 border-amarelo shadow-[0_20px_50px_rgba(0,0,0,.35)]">
                  <YouTubeLite id={d.id} titulo={d.titulo} formato="vertical" />
                </div>
              </Reveal>
            ))}
          </div>

          <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {PRINTS.map((p, i) => (
              <Reveal key={p.src} delay={i * 0.05}>
                <figure className="overflow-hidden rounded-xl border-2 border-amarelo/55 bg-roxo shadow-[0_14px_34px_rgba(0,0,0,.3)]">
                  <Image
                    src={`/mapa-do-ugc/${p.src}`}
                    alt={p.alt}
                    width={p.w}
                    height={800}
                    className="h-full w-full object-cover"
                  />
                </figure>
              </Reveal>
            ))}
          </div>

          <Reveal delay={0.12}>
            <p className="mt-8 max-w-3xl font-mono text-xs leading-relaxed text-cinza-ink">
              Os resultados apresentados são individuais e não representam
              garantia de aprovação, contrato ou renda. O desempenho depende
              da aplicação, da qualidade do trabalho e das oportunidades
              disponíveis.
            </p>
          </Reveal>
        </div>
      </section>

      {/* 7. Quem é a Juh */}
      <section className="relative overflow-hidden bg-ink-void section-padding">
        <div className="container-site relative">
          <div className="grid items-center gap-12 lg:grid-cols-[.85fr_1.15fr]">
            <Reveal>
              <Image
                src="/mapa-do-ugc/juh-perfil.webp"
                alt="Juliana Araújo, UGC Creator da Amazônia"
                width={1498}
                height={1000}
                className="w-full rounded-2xl border-2 border-amarelo object-cover shadow-[0_24px_60px_rgba(0,0,0,.35)]"
              />
            </Reveal>
            <Reveal delay={0.08}>
              <div>
                <p className="eyebrow mb-4">Quem conduz</p>
                <h2 className="headline-section">
                  Prazer, eu sou a <span className="text-amarelo">Juh</span>.
                </h2>
                <div className="text-body mt-6 space-y-4">
                  <p>
                    Sou Juliana Araújo, creator e estrategista de conteúdo, e
                    moro em Altamira, no coração da Amazônia. Saí de casa aos
                    17 anos em busca dos meus sonhos e passei quatro anos
                    trabalhando no setor de telefonia, até ser desligada em
                    2023.
                  </p>
                  <p>
                    Foi então que encontrei no marketing digital uma nova
                    possibilidade profissional: trabalhei com social media,
                    atendi diversos clientes, atuei no audiovisual e comecei a
                    construir minha trajetória como criadora de conteúdo. Hoje
                    trabalho com marcas nacionais, produzo vídeos e
                    compartilho esse conhecimento com mulheres que querem
                    começar no mercado digital.
                  </p>
                  <p>
                    Minha história representa a possibilidade de construir
                    oportunidades mesmo quando o ponto de partida parece
                    limitado — e de mostrar que o lugar onde a gente nasce ou
                    vive não precisa limitar os nossos sonhos.
                  </p>
                </div>
              </div>
            </Reveal>
          </div>

          <dl className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {PROVAS.map((p, i) => (
              <Reveal key={p.l} delay={i * 0.05}>
                <div className="card-surface h-full p-6 text-center">
                  <dt className="font-display text-3xl text-amarelo">{p.n}</dt>
                  <dd className="text-body mt-1 text-sm">{p.l}</dd>
                </div>
              </Reveal>
            ))}
          </dl>
        </div>
      </section>

      {/* 8. Investimento */}
      <section className="fold-light relative overflow-hidden">
        <WaveDivider
          className="absolute inset-x-0 top-0 rotate-180"
          color="var(--ink-void)"
        />
        <div className="container-site relative section-padding">
          <Reveal>
            <p className="eyebrow mb-4 text-center">Investimento</p>
            <h2 className="headline-section mx-auto max-w-2xl text-center">
              Quanto custa ter a Juh do seu lado por 6 encontros
            </h2>
            <p className="text-body mx-auto mt-5 max-w-2xl text-center">
              São 6 encontros ao vivo, em turma, com orientação da Juh e
              exercícios práticos a cada etapa.
            </p>
          </Reveal>

          <div className="mx-auto mt-12 grid max-w-4xl gap-6 md:grid-cols-[1.2fr_1fr]">
            <Reveal>
              <div className="relative h-full overflow-hidden rounded-2xl bg-roxo p-8 text-center text-white shadow-[0_28px_70px_-20px_rgba(26,11,46,.6)]">
                <GrafismoDiamonds
                  color="#ffffff"
                  className="absolute inset-0 opacity-[0.05]"
                />
                <div className="relative">
                  <p className="font-mono text-xs uppercase tracking-wide text-[var(--amarelo)]">
                    Turma 04 · apenas 12 vagas
                  </p>
                  <p className="font-display mt-5 text-6xl leading-none text-[var(--amarelo)]">
                    R$ 697
                  </p>
                  <p className="mt-2 text-sm text-white/80">pelos 6 encontros</p>
                  <ContentSlot
                    className="mt-3 text-left border-white/25! text-white/75!"
                    label="Data, horário e condições de pagamento — ainda não definidos. Quem entrar na lista de espera é avisada primeiro."
                  />
                  <a
                    href={waHref}
                    className="btn btn-primary mt-7 w-full justify-center"
                  >
                    Quero entrar na lista de espera <ArrowRight size={16} />
                  </a>
                </div>
              </div>
            </Reveal>
            <Reveal delay={0.08}>
              <div className="card-surface flex h-full flex-col p-8">
                <Users size={36} className="text-floresta-deep" />
                <h3 className="font-display mt-4 text-xl">
                  Aprendizado em turma, de perto
                </h3>
                <p className="text-body mt-3">
                  Os encontros acontecem em grupo, com a Juh acompanhando a
                  evolução de cada participante. São só 12 vagas na Turma 04.
                </p>
                <p className="text-body mt-auto pt-6 text-sm">
                  Data e horário ainda não foram definidos. Entrando na lista
                  de espera, você é avisada em primeira mão.
                </p>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* 9. FAQ */}
      <section className="relative overflow-hidden bg-ink">
        <div className="container-site relative section-padding max-w-3xl">
          <Reveal>
            <p className="eyebrow mb-4">Dúvidas</p>
            <h2 className="headline-section mb-10">Perguntas frequentes</h2>
          </Reveal>
          <FaqList items={FAQ} />
        </div>
      </section>

      {/* 10. CTA final */}
      <CtaFinal
        title={
          <>
            Sua história pode virar{" "}
            <span className="text-amarelo">oportunidade</span>.
          </>
        }
        lead={
          <>
            Você pode continuar do mesmo jeito que está hoje, gravando vídeo
            sem saber como transformar isso em trabalho. Ou pode passar os
            próximos 6 encontros comigo, em turma, com método e orientação de
            perto.
            <span className="mt-4 block font-semibold text-foreground">
              O lugar onde você nasceu ou vive não precisa limitar seus
              sonhos. Vem comigo.
            </span>
          </>
        }
        ctaLabel="Quero entrar na lista de espera"
        href={waHref}
        waveColor="var(--ink)"
        microcopy="Mentoria em Turma · Turma 04 · 12 vagas · lista de espera aberta no WhatsApp"
      />
    </>
  );
}
