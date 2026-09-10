import type { Metadata } from "next";
import { ArrowRight } from "lucide-react";
import { Reveal } from "@/components/ui/Reveal";
import { WaveDivider } from "@/components/ui/WaveDivider";
import { PageHero } from "@/components/sections/PageHero";
import { FaqList } from "@/components/sections/Faq";
import { ContentSlot } from "@/components/ui/MediaSlot";
import { AplicacaoForm } from "@/components/forms/AplicacaoForm";
import { GrafismoDiamonds, Paddle } from "@/components/ui/Motifs";
import { wa } from "@/lib/site";

export const metadata: Metadata = {
  title: "Mentoria Ousadia | Posicionamento e Vendas para Creators",
  description:
    "Acompanhamento direto com o Jackson e o time: posicionamento, conteúdo, estratégia e venda desenhados pra você, não pra todo mundo. Vagas limitadas, aplicação obrigatória.",
};

const SIM = [
  "Você já produz conteúdo ou já vende, e sente que bateu num teto.",
  "Você quer acompanhamento próximo, não mais um curso pra assistir.",
  "Você tá disposto(a) a executar entre os encontros. Mentoria não é terapia de ideias.",
  "Você encara o investimento como aceleração de negócio, não como aposta.",
];

const NAO = [
  "Você tá começando do absoluto zero (começa pela Escola: é mais barato e mais certo pro seu momento).",
  "Você quer que alguém execute por você.",
  "Você procura promessa de resultado garantido em 30 dias.",
];

const ETAPAS = [
  {
    t: "Aplicação",
    d: "Você preenche o formulário abaixo. Leva 3 minutos e não custa nada.",
  },
  {
    t: "Conversa",
    d: "Se o perfil fizer sentido, a gente te chama no WhatsApp pra uma conversa franca sobre momento, objetivo e investimento.",
  },
  {
    t: "Seleção",
    d: "As vagas são limitadas por turma: a gente seleciona quem tem mais contexto pra acelerar agora.",
  },
  {
    t: "Início",
    d: "Onboarding, diagnóstico do seu posicionamento e plano dos primeiros 90 dias.",
  },
];

const FAQ = [
  {
    q: "Qual o investimento?",
    a: (
      <>
        <ContentSlot label="Faixa de valor e condições. Validar com o time." />
        <p className="mt-3">
          O valor exato é apresentado na conversa de seleção, junto com o formato
          da turma atual. Sem pegadinha: se não fizer sentido, ninguém insiste.
        </p>
      </>
    ),
  },
  {
    q: "Qual o formato e a duração?",
    a: (
      <ContentSlot label="Encontros, frequência, duração e canais de acesso ao time. Validar com o time." />
    ),
  },
  {
    q: "Quanto tempo por semana eu preciso?",
    a: "Conte com tempo de execução entre os encontros. Quem só assiste, não acelera, e a gente avisa isso desde a aplicação.",
  },
  {
    q: "Tem garantia?",
    a: <ContentSlot label="Política de garantia específica da mentoria. Validar com o time." />,
  },
];

export default function MentoriaPage() {
  return (
    <>
      <PageHero
        eyebrow="Mentoria · High ticket"
        motif="river"
        title={
          <>
            Pra quem já tem base e quer{" "}
            <span className="text-amarelo">acelerar</span>, com acompanhamento
            direto.
          </>
        }
        lead="Não é curso gravado. É o Jackson e o time olhando pro seu posicionamento, seu conteúdo e sua oferta, e desenhando a estratégia pra você, não pra todo mundo."
      >
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <a href="#aplicacao" className="btn btn-primary">
            Aplicar para a próxima turma <ArrowRight size={16} />
          </a>
          <span className="font-mono text-xs text-cinza-ink">
            Aplicação gratuita · Vagas limitadas · Processo seletivo
          </span>
        </div>
      </PageHero>

      {/* O que é */}
      <section className="relative overflow-hidden bg-ink section-padding">
        <Paddle className="motif motif-soft text-amarelo right-[8%] top-12 hidden w-20 rotate-6 lg:block" />
        <div className="container-site relative max-w-3xl">
          <Reveal>
            <p className="eyebrow mb-4">O que é a mentoria</p>
            <div className="text-body space-y-5 text-lg">
              <p>
                Acompanhamento direto e próximo com o Jackson e o time da
                Ousadia. A cada encontro, a gente trabalha as quatro frentes que
                fazem creator virar negócio:{" "}
                <strong className="font-semibold text-foreground">
                  posicionamento
                </strong>{" "}
                (quem você é no digital),{" "}
                <strong className="font-semibold text-foreground">
                  conteúdo
                </strong>{" "}
                (o que você comunica),{" "}
                <strong className="font-semibold text-foreground">
                  estratégia
                </strong>{" "}
                (como você cresce) e{" "}
                <strong className="font-semibold text-foreground">venda</strong>{" "}
                (como isso vira dinheiro).
              </p>
              <p>
                Tudo desenhado no seu contexto: seu mercado, sua cidade, seu
                momento. Por isso tem aplicação: mentoria só funciona quando os
                dois lados têm certeza de que é a hora.
              </p>
            </div>
          </Reveal>
        </div>
      </section>

      {/* Filtro */}
      <section className="fold-light relative overflow-hidden">
        <WaveDivider
          className="absolute inset-x-0 top-0 rotate-180"
          color="var(--ink)"
        />
        <div className="container-site relative section-padding">
          <Reveal>
            <p className="eyebrow mb-4">Filtro honesto</p>
            <h2 className="headline-section max-w-2xl">
              Antes de aplicar, um filtro honesto
            </h2>
          </Reveal>
          <div className="mt-12 grid gap-6 md:grid-cols-2">
            <Reveal>
              <div className="card-surface h-full p-7">
                <h3 className="font-mono text-xs uppercase tracking-widest text-floresta-deep">
                  ✅ A mentoria é pra você se…
                </h3>
                <ul className="mt-5 space-y-3">
                  {SIM.map((t) => (
                    <li key={t} className="text-body flex gap-3 text-[0.95rem]">
                      <span className="text-floresta-deep">✓</span>
                      {t}
                    </li>
                  ))}
                </ul>
              </div>
            </Reveal>
            <Reveal delay={0.08}>
              <div className="card-surface h-full p-7">
                <h3 className="font-mono text-xs uppercase tracking-widest text-destructive">
                  ❌ Não é pra você se…
                </h3>
                <ul className="mt-5 space-y-3">
                  {NAO.map((t) => (
                    <li key={t} className="text-body flex gap-3 text-[0.95rem]">
                      <span className="text-destructive">✕</span>
                      {t}
                    </li>
                  ))}
                </ul>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* Como funciona */}
      <section className="relative overflow-hidden bg-roxo section-padding">
        <GrafismoDiamonds
          color="#ffffff"
          className="absolute inset-0 opacity-[0.04]"
        />
        <div className="container-site relative">
          <Reveal>
            <p className="eyebrow mb-4">O processo</p>
            <h2 className="headline-section">Como funciona</h2>
          </Reveal>
          <ol className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {ETAPAS.map((e, i) => (
              <Reveal key={e.t} delay={i * 0.06}>
                <li className="card-surface h-full p-6">
                  <span className="font-display text-3xl text-amarelo">
                    {i + 1}
                  </span>
                  <h3 className="font-display text-lg mt-2">{e.t}</h3>
                  <p className="text-body mt-2 text-sm">{e.d}</p>
                </li>
              </Reveal>
            ))}
          </ol>
        </div>
      </section>

      {/* Cases */}
      <section className="relative overflow-hidden bg-ink-void section-padding">
        <div className="container-site relative">
          <Reveal>
            <p className="eyebrow mb-4">Resultados</p>
            <h2 className="headline-section">Quem acelerou, conta</h2>
          </Reveal>
          <div className="mt-10 grid gap-5 md:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <Reveal key={i} delay={i * 0.05}>
                <div className="card-surface h-full p-6">
                  <ContentSlot
                    label={`Case de mentorado ${i}: aceleração com números reais. Nome, cidade e nicho.`}
                  />
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="fold-light relative overflow-hidden">
        <WaveDivider
          className="absolute inset-x-0 top-0 rotate-180"
          color="var(--ink-void)"
        />
        <div className="container-site relative section-padding max-w-3xl">
          <Reveal>
            <p className="eyebrow mb-4">Dúvidas</p>
            <h2 className="headline-section mb-10">
              Perguntas frequentes da mentoria
            </h2>
          </Reveal>
          <FaqList items={FAQ} />
        </div>
      </section>

      {/* Aplicação */}
      <section
        id="aplicacao"
        className="relative overflow-hidden bg-roxo-700 scroll-mt-20"
      >
        <WaveDivider
          className="absolute inset-x-0 top-0 rotate-180"
          color="var(--paper)"
        />
        <div className="container-site relative section-padding max-w-2xl">
          <Reveal>
            <p className="eyebrow mb-4">Aplicação</p>
            <h2 className="headline-section">
              Aplicação para a <span className="text-amarelo">mentoria</span>
            </h2>
            <p className="text-body mt-5">
              Responda com sinceridade: é isso que a gente avalia. Leva 3
              minutos.
            </p>
          </Reveal>
          <Reveal delay={0.08}>
            <div className="mt-10">
              <AplicacaoForm />
            </div>
          </Reveal>
          <Reveal delay={0.12}>
            <p className="mt-8 font-mono text-xs text-cinza-ink">
              Prefere ir direto?{" "}
              <a
                href={wa("mentoria")}
                className="text-amarelo underline underline-offset-4"
              >
                Chama no WhatsApp
              </a>
              .
            </p>
          </Reveal>
        </div>
      </section>
    </>
  );
}
