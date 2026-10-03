import type { Metadata } from "next";
import Image from "next/image";
import { ArrowRight, Check, ShieldCheck, X } from "lucide-react";
import { Reveal } from "@/components/ui/Reveal";
import { WaveDivider } from "@/components/ui/WaveDivider";
import { CtaFinal } from "@/components/sections/CtaFinal";
import { FaqList, FaqJsonLd } from "@/components/sections/Faq";
import { ContentSlot } from "@/components/ui/MediaSlot";
import { YouTubeLite } from "@/components/ui/YouTubeLite";
import { GrafismoDiamonds, Paddle, RiverLines } from "@/components/ui/Motifs";
import { KeneStrip } from "@/components/ui/graphics/Kene";
import { SITE, waMentoriaUgc } from "@/lib/site";

export const metadata: Metadata = {
  title: "Mentoria Viver do Digital | Da primeira permuta às marcas que pagam",
  description:
    "Mentoria em grupo com Juliana Araújo: 8 encontros ao vivo, de 23/nov a 17/dez, pra UGC creators que já deram o primeiro passo e querem fechar as primeiras parcerias pagas. Turma 1 com 20 vagas.",
  alternates: { canonical: `${SITE.url}/mentoria-viver-do-digital` },
};

/**
 * Página de vendas da mentoria da Juh (R$ 497, Turma 1). Copy verbatim do doc
 * "Copy da Página de Vendas — Mentoria Viver do Digital" (03/10/2026).
 * Segue a identidade de `/aulao-ugc` e reaproveita a mídia dele em
 * `public/aulao-ugc/` — temporária, até chegarem a foto do cocar e os
 * depoimentos da própria turma do aulão de 7/nov.
 * Toda CTA cai no WhatsApp da Juh: ainda não existe link de checkout.
 */

const INFO = [
  "8 encontros ao vivo",
  "Segundas e quintas, das 19h às 20h30",
  "De 23/nov a 17/dez",
  "Apenas 20 vagas",
];

const DORES = [
  "Arrumou o perfil, montou o portfólio… e as mensagens para as marcas ficaram sem resposta.",
  "Fechou uma permuta, ficou feliz, mas não sabe como sair do “produto de graça” para o primeiro cachê.",
  "Não sabe quanto cobrar e tem medo de pedir demais (ou de menos).",
  "Grava, regrava, apaga. Nunca parece bom o suficiente para mandar.",
  "Estuda sozinha, com vídeo solto na internet, sem ninguém para dizer se está no caminho certo.",
  "Mora no interior e sente que as oportunidades estão sempre em outro lugar.",
];

const PARA_QUEM = [
  "Você já participou do aulão Mapa do UGC ou já tem perfil e portfólio começados",
  "Você quer sair da permuta e fechar as primeiras parcerias pagas",
  "Você aprende melhor com alguém perto, corrigindo e cobrando",
  "Você pode reservar duas noites por semana, até 17/dez, para aplicar",
  "Você tem orgulho de onde vem e quer usar isso como diferencial, não como desculpa",
];

const NAO_E = [
  "Você procura dinheiro rápido sem colocar a mão na massa",
  "Você não pretende gravar nenhum conteúdo durante a mentoria",
  "Você quer só assistir aulas, sem trocar e sem receber feedback",
];

/** Temas propostos no doc — a Juh ainda valida ordem e conteúdo (PENDENCIAS #21). */
const ENCONTROS = [
  {
    data: "Segunda, 23/nov",
    tema: "Diagnóstico: onde você está e onde quer chegar em dezembro",
    sai: "Seu plano de 4 semanas",
  },
  {
    data: "Quinta, 26/nov",
    tema: "Perfil e portfólio que marca contrata: revisão ao vivo",
    sai: "Perfil e portfólio ajustados",
  },
  {
    data: "Segunda, 30/nov",
    tema: "O UGC que vende: roteiro, gancho e gravação com o celular",
    sai: "2 vídeos de portfólio gravados",
  },
  {
    data: "Quinta, 3/dez",
    tema: "Prospecção de verdade: lista de marcas e abordagem que recebe resposta",
    sai: "20 marcas mapeadas e abordadas",
  },
  {
    data: "Segunda, 7/dez",
    tema: "Precificação: como sair da permuta e cobrar o primeiro cachê",
    sai: "Sua tabela de preços",
  },
  {
    data: "Quinta, 10/dez",
    tema: "Negociação, briefing e contrato: o que responder quando a marca chama",
    sai: "Modelos de proposta e de contrato simples",
  },
  {
    data: "Segunda, 14/dez",
    tema: "Entrega profissional: prazo, revisão, relacionamento e recompra",
    sai: "Checklist de entrega",
  },
  {
    data: "Quinta, 17/dez",
    tema: "Plano para 2027 e celebração das conquistas da turma",
    sai: "Seu plano dos próximos 90 dias",
  },
];

const INCLUSO = [
  {
    t: "8 encontros ao vivo com a Juh",
    d: "com análise do seu perfil, dos seus vídeos e das suas mensagens",
  },
  { t: "Gravações de todos os encontros", d: "para rever quando quiser" },
  {
    t: "Grupo exclusivo da turma no WhatsApp",
    d: "para tirar dúvidas entre os encontros e trocar oportunidades",
  },
  {
    t: "Missões semanais",
    d: "com prazo, para você sair do “vou fazer” para o “fiz”",
  },
  {
    t: "Modelos prontos",
    d: "tabela de preços, proposta comercial, contrato simples e checklist de entrega",
  },
];

/** Bônus ainda não confirmados pela Juh (PENDENCIAS #21). */
const BONUS = [
  {
    t: "Lista de marcas que mais contratam UGC no fim do ano",
    d: "para você prospectar na época certa",
  },
  {
    t: "Banco de prompts de abordagem e de follow-up",
    d: "para mandar mensagem sem travar",
  },
  {
    t: "Certificado de conclusão da mentoria",
    d: "para colocar no seu portfólio",
  },
];

const PROVAS = [
  { n: "70+", l: "marcas atendidas" },
  { n: "16 mil", l: "seguidores no Instagram" },
  { n: "76 mil+", l: "visualizações num único Reels" },
  { n: "COP30", l: "e Expo Xingu no currículo" },
];

/** Mesmos prints do aulão (mídia temporária — PENDENCIAS #20 vale aqui também). */
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

const DEPOIMENTOS = [
  { id: "3iVry7h2C8U", titulo: "Depoimento em vídeo de aluna da Juh" },
  { id: "ZQgKyvz7UOE", titulo: "Depoimento em vídeo de aluna da Juh" },
];

const FAQ = [
  {
    q: "Preciso ter participado do aulão ou comprado o curso?",
    a: "Não é obrigatório, mas ajuda. Se você está começando do zero, no primeiro encontro a Juh te mostra o que ajustar antes de seguir com a turma.",
  },
  {
    q: "Tenho poucos seguidores. A mentoria serve para mim?",
    a: "Serve. No UGC, a marca contrata o seu vídeo, não o seu alcance. Por isso, perfis pequenos também conseguem fechar parcerias.",
  },
  {
    q: "E se eu não puder estar ao vivo em algum encontro?",
    a: "Todos os encontros ficam gravados, e você pode mandar suas dúvidas e materiais no grupo para serem analisados.",
  },
  {
    q: "Moro no interior, longe das marcas. Faz diferença?",
    a: "Faz, e a favor. A Juh mora em Altamira e atende marcas nacionais. Seu território é um diferencial que ninguém consegue copiar.",
  },
  {
    q: "Preciso de equipamento profissional?",
    a: "Não. Celular, luz natural e o que você tem em casa são suficientes para começar.",
  },
  {
    q: "Quanto tempo por semana vou precisar?",
    a: "As duas noites dos encontros (3 horas no total) e cerca de 2 a 3 horas para cumprir as missões.",
  },
  {
    q: "A mentoria garante que vou fechar com marcas?",
    a: "Ninguém pode garantir isso, e desconfie de quem garante. O que a mentoria garante é método, acompanhamento de perto e você fazendo o que precisa ser feito para as marcas te encontrarem.",
  },
  {
    q: "Como recebo o acesso?",
    a: "Assim que o pagamento for confirmado, você recebe o link do grupo da turma e a agenda dos encontros.",
  },
];

function BotaoVaga({ href, label }: { href: string; label: string }) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-5">
      <a href={href} className="btn btn-primary">
        {label} <ArrowRight size={16} />
      </a>
      <span className="font-mono text-xs text-cinza-ink">
        Turma 1 · 20 vagas · por ordem de inscrição
      </span>
    </div>
  );
}

export default function MentoriaViverDoDigitalPage() {
  const waHref = waMentoriaUgc();

  const cursoJsonLd = {
    "@context": "https://schema.org",
    "@type": "Course",
    name: "Mentoria Viver do Digital",
    description:
      "Mentoria em grupo de UGC com Juliana Araújo: 8 encontros ao vivo sobre portfólio, prospecção, precificação, negociação e entrega profissional para marcas.",
    provider: {
      "@type": "Organization",
      name: "Ousadia Marketing",
      sameAs: "https://instagram.com/ousadiamkt",
    },
    inLanguage: "pt-BR",
    offers: {
      "@type": "Offer",
      price: "497",
      priceCurrency: "BRL",
      availability: "https://schema.org/LimitedAvailability",
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(cursoJsonLd) }}
      />
      <FaqJsonLd items={FAQ} />

      {/* 1. Topo — mesmo ritmo do PageHero, em duas colunas pra caber a foto */}
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
                <p className="eyebrow mb-5">
                  Mentoria Viver do Digital · Turma 1 · 20 vagas
                </p>
              </Reveal>
              <Reveal delay={0.05}>
                <h1 className="font-display text-[clamp(2.1rem,5vw,3.6rem)] leading-[1.04]">
                  Em 8 encontros comigo, você sai da primeira permuta para{" "}
                  <span className="text-amarelo">
                    as primeiras marcas que pagam
                  </span>
                  .
                </h1>
              </Reveal>
              <Reveal delay={0.1}>
                <p className="text-body mt-6 max-w-2xl">
                  A mentoria em grupo da Juh Araújo para meninas que já deram o
                  primeiro passo como UGC e querem acompanhamento de perto para
                  transformar criatividade em renda, mesmo começando pequena e
                  morando longe do eixo Rio–São Paulo.
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
                    Quero minha vaga na mentoria <ArrowRight size={16} />
                  </a>
                  <p className="mt-4 font-mono text-xs text-cinza-ink">
                    As vagas são confirmadas por ordem de inscrição. Quando
                    fechar 20, fechou.
                  </p>
                </div>
              </Reveal>
            </div>
            <Reveal delay={0.1}>
              <Image
                src="/aulao-ugc/juh-perfil.jpg"
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

      {/* 2. Dor e virada */}
      <section className="relative overflow-hidden bg-ink section-padding">
        <Paddle className="motif motif-soft text-amarelo right-[8%] top-12 hidden w-20 rotate-6 lg:block" />
        <div className="container-site relative">
          <Reveal>
            <p className="eyebrow mb-4">Se você já começou</p>
            <h2 className="headline-section max-w-2xl">
              Provavelmente travou em algum destes pontos:
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
                  Eu sei exatamente como é isso, porque eu comecei assim. Em
                  Altamira, no Pará, longe de agência, de contato, de evento de
                  marca. Muita gente achava que creator do Norte servia só de
                  cenário.
                </p>
                <p>
                  O que mudou não foi sorte nem número de seguidores. Foi
                  método, constância e ter alguém olhando o meu trabalho e
                  dizendo:{" "}
                  <em>
                    “ajusta isso aqui, manda pra essa marca, cobra esse valor”
                  </em>
                  .
                </p>
                <p>
                  Hoje já são mais de 70 marcas atendidas. E eu criei a Mentoria
                  Viver do Digital para ser, para você,{" "}
                  <strong className="font-semibold text-foreground">
                    esse alguém que eu precisei ter
                  </strong>
                  .
                </p>
              </div>
              <footer className="mt-5 font-mono text-xs text-amarelo">
                — Juh Araújo
              </footer>
            </blockquote>
          </Reveal>

          <Reveal delay={0.1}>
            <p className="headline-section mx-auto mt-16 max-w-2xl text-center text-2xl">
              O curso te dá o mapa.{" "}
              <span className="text-amarelo">
                A mentoria te dá companhia na estrada.
              </span>
            </p>
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

      {/* 4. Como funciona */}
      <section className="relative overflow-hidden bg-roxo section-padding">
        <GrafismoDiamonds
          color="#ffffff"
          className="absolute inset-0 opacity-[0.04]"
        />
        <div className="container-site relative">
          <Reveal>
            <p className="eyebrow mb-4">Como funciona</p>
            <h2 className="headline-section max-w-2xl">
              8 encontros ao vivo.{" "}
              <span className="text-amarelo">Uma jornada de 4 semanas.</span>
            </h2>
            <p className="text-body mt-5 max-w-2xl">
              São dois encontros por semana, às segundas e quintas, das 19h às
              20h30. Na segunda você aprende e recebe a missão. Na quinta a
              gente revisa o que você fez, com análise ao vivo de perfis, vídeos
              e mensagens. Tudo fica gravado para você rever.
            </p>
          </Reveal>

          <ol className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {ENCONTROS.map((e, i) => (
              <Reveal key={e.data} delay={(i % 4) * 0.06}>
                <li className="card-surface flex h-full flex-col p-6">
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="font-display text-3xl text-amarelo">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <span className="font-mono text-[11px] uppercase tracking-wide text-cinza-ink">
                      {e.data}
                    </span>
                  </div>
                  <h3 className="font-display mt-3 text-base leading-snug">
                    {e.tema}
                  </h3>
                  <p className="mt-auto pt-4 text-sm">
                    <span className="font-mono text-[11px] uppercase tracking-wide text-cinza-ink">
                      Você sai com ·{" "}
                    </span>
                    <span className="text-foreground">{e.sai}</span>
                  </p>
                </li>
              </Reveal>
            ))}
          </ol>

          <Reveal delay={0.1}>
            <p className="text-body mt-10 max-w-2xl">
              Os encontros acontecem bem na época em que as marcas mais produzem
              conteúdo, entre a Black Friday e o Natal.{" "}
              <strong className="font-semibold text-foreground">
                Você aprende e aplica no mesmo mês.
              </strong>
            </p>
            <div className="mt-8">
              <BotaoVaga href={waHref} label="Quero minha vaga na mentoria" />
            </div>
          </Reveal>
        </div>
      </section>

      {/* 5. O que você leva */}
      <section className="fold-light relative overflow-hidden">
        <WaveDivider
          className="absolute inset-x-0 top-0 rotate-180"
          color="var(--roxo)"
        />
        <div className="container-site relative section-padding">
          <Reveal>
            <p className="eyebrow mb-4">O que você leva</p>
            <h2 className="headline-section max-w-2xl">
              Tudo o que está incluído na sua vaga
            </h2>
          </Reveal>
          <ul className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {INCLUSO.map((item, i) => (
              <Reveal key={item.t} delay={i * 0.05}>
                <li className="card-surface flex h-full gap-3 p-6">
                  <Check size={18} className="mt-0.5 shrink-0 text-floresta-deep" />
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

          <Reveal delay={0.08}>
            <h3 className="font-display mt-14 text-xl">Bônus</h3>
          </Reveal>
          <ul className="mt-5 grid gap-5 sm:grid-cols-3">
            {BONUS.map((b, i) => (
              <Reveal key={b.t} delay={i * 0.05}>
                <li className="card-surface h-full border-dashed p-6">
                  <span className="font-mono text-[11px] uppercase tracking-wide text-floresta-deep">
                    Bônus {i + 1}
                  </span>
                  <p className="text-body mt-2 text-sm">
                    <strong className="font-semibold text-[#1a0b2e]">
                      {b.t}
                    </strong>
                    , {b.d}
                  </p>
                </li>
              </Reveal>
            ))}
          </ul>
        </div>
      </section>

      {/* 7. Depoimentos — mídia temporária do aulão */}
      <section className="relative overflow-hidden bg-ink section-padding">
        <div className="container-site relative">
          <Reveal>
            <p className="eyebrow mb-4">Depoimentos</p>
            <h2 className="headline-section max-w-2xl">
              O que dizem as meninas que já começaram com a Juh
            </h2>
          </Reveal>

          <div className="mx-auto mt-10 grid max-w-2xl gap-6 sm:grid-cols-2">
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

      {/* 6. Quem é a Juh */}
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
                <h2 className="headline-section">
                  Prazer, eu sou a <span className="text-amarelo">Juh</span>.
                </h2>
                <div className="text-body mt-6 space-y-4">
                  <p>
                    Sou Juliana Araújo, tenho 24 anos, sou atriz, creator e
                    estrategista de conteúdo, e moro em Altamira, no coração da
                    Amazônia.
                  </p>
                  <p>
                    Já atendi mais de 70 marcas criando conteúdos que nascem do
                    meu território, unindo autenticidade, propósito e estética.
                    Falo de sustentabilidade, bioeconomia e valorização da nossa
                    terra, porque acredito que quem vive a Amazônia consegue
                    contar a beleza e a potência dela com verdade.
                  </p>
                  <p>
                    Meu propósito é ajudar outras meninas a descobrirem o
                    próprio potencial no digital, mostrando que dá para viver de
                    conteúdo mesmo começando do zero, mesmo sendo pequena, mesmo
                    longe dos grandes centros.
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

      {/* 8. Investimento e garantia */}
      <section className="fold-light relative overflow-hidden">
        <WaveDivider
          className="absolute inset-x-0 top-0 rotate-180"
          color="var(--ink-void)"
        />
        <div className="container-site relative section-padding">
          <Reveal>
            <p className="eyebrow mb-4 text-center">Investimento</p>
            <h2 className="headline-section mx-auto max-w-2xl text-center">
              Quanto custa ter a Juh do seu lado por 4 semanas
            </h2>
            <p className="text-body mx-auto mt-5 max-w-2xl text-center">
              São 8 encontros ao vivo, com análise do seu trabalho, grupo
              exclusivo, modelos prontos e gravações. Dividindo, dá menos de R$
              63 por encontro, menos do que muitas meninas recebem em produtos
              numa única permuta.
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
                    Turma 1 · apenas 20 vagas
                  </p>
                  <p className="font-display mt-5 text-6xl leading-none text-[var(--amarelo)]">
                    R$ 497
                  </p>
                  <p className="mt-2 text-sm text-white/80">à vista</p>
                  <p className="mt-4 text-white/90">
                    ou em até 12x no cartão
                  </p>
                  <ContentSlot
                    className="mt-3 text-left border-white/25! text-white/75!"
                    label="Valor da parcela em 12x, gerado pela plataforma de pagamento."
                  />
                  <a
                    href={waHref}
                    className="btn btn-primary mt-7 w-full justify-center"
                  >
                    Quero minha vaga na mentoria <ArrowRight size={16} />
                  </a>
                  <ContentSlot
                    className="mt-5 text-left border-white/25! text-white/75!"
                    label="Data-limite das inscrições (sugestão do doc: 20/nov) e contador “Restam x de 20 vagas”."
                  />
                </div>
              </div>
            </Reveal>
            <Reveal delay={0.08}>
              <div className="card-surface flex h-full flex-col p-8">
                <ShieldCheck size={36} className="text-floresta-deep" />
                <h3 className="font-display mt-4 text-xl">
                  Garantia de 7 dias
                </h3>
                <p className="text-body mt-3">
                  Participe do primeiro encontro, conheça a turma e o método. Se
                  em até 7 dias depois da compra você sentir que não é para
                  você, devolvo 100% do seu investimento. Sem perguntas.
                </p>
                <p className="text-body mt-auto pt-6 text-sm">
                  As inscrições vão até a data-limite ou até as vagas acabarem,
                  o que acontecer primeiro.
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
            Dezembro vai passar{" "}
            <span className="text-amarelo">de qualquer jeito</span>.
          </>
        }
        lead={
          <>
            Você pode chegar em 2027 do mesmo jeito que está hoje, estudando
            sozinha e esperando o momento certo. Ou pode passar as próximas 4
            semanas comigo, com método, com uma turma do seu lado e com missões
            que te fazem sair do lugar.
            <span className="mt-4 block font-semibold text-foreground">
              A Amazônia não é cenário. A gente é creator. Vem comigo.
            </span>
          </>
        }
        ctaLabel="Quero viver do digital"
        href={waHref}
        waveColor="var(--ink)"
        microcopy="Turma 1 · 20 vagas · encontros de 23/nov a 17/dez, segundas e quintas, às 19h"
      />
    </>
  );
}
