import Link from "next/link";
import type { Metadata } from "next";
import { ArrowRight } from "lucide-react";
import { Reveal } from "@/components/ui/Reveal";
import { WaveDivider } from "@/components/ui/WaveDivider";
import { PageHero } from "@/components/sections/PageHero";
import { CtaFinal } from "@/components/sections/CtaFinal";
import { MediaSlot } from "@/components/ui/MediaSlot";
import { Tree } from "@/components/ui/Motifs";
import { CURSOS, wa } from "@/lib/site";

export const metadata: Metadata = {
  title: "Escola Ousadia | Cursos práticos de marketing e conteúdo",
  description:
    "Curso da Ousadia não termina com certificado na gaveta. Termina com projeto real publicado, perfil reposicionado e a primeira venda a caminho.",
};

const DIFERENCIAIS = [
  {
    t: "Projeto real na saída, não PDF salvo",
    d: "Todo curso termina com entrega concreta: perfil reposicionado, vídeo publicado, calendário rodando. Você não “conclui”: você executa.",
  },
  {
    t: "Método com IA embutida",
    d: "Inteligência artificial dentro de cada etapa do método, pra produzir mais rápido sem virar perfil genérico. A máquina a favor da sua voz.",
  },
];

export default function EscolaPage() {
  return (
    <>
      <PageHero
        eyebrow="Escola Ousadia"
        title={
          <>
            Aqui você aprende <span className="text-amarelo">executando</span>,
            não anotando.
          </>
        }
        lead="Curso da Ousadia não termina com certificado na gaveta. Termina com projeto real publicado, perfil reposicionado e a primeira venda a caminho. Escolha a porta de entrada do seu momento."
      >
        <a href={wa("escola")} className="btn btn-primary">
          Falar sobre os cursos no WhatsApp <ArrowRight size={16} />
        </a>
      </PageHero>

      {/* Cursos */}
      <section className="relative overflow-hidden bg-ink section-padding">
        <div className="container-site relative">
          <Reveal>
            <p className="eyebrow mb-4">Os cursos</p>
            <h2 className="headline-section max-w-2xl">
              Quatro portas de entrada. Um só método.
            </h2>
          </Reveal>
          <div className="mt-12 grid gap-6 md:grid-cols-2">
            {CURSOS.map((c, i) => (
              <Reveal key={c.slug} delay={i * 0.06}>
                <Link
                  href={`/escola/${c.slug}`}
                  className="card-surface group flex h-full flex-col p-7 transition-colors hover:border-amarelo"
                >
                  <span className="text-2xl" aria-hidden>
                    {c.emoji}
                  </span>
                  <h3 className="font-display text-xl mt-3 flex items-center gap-2">
                    {c.nome}
                    <ArrowRight
                      size={16}
                      className="-translate-x-2 opacity-0 transition-all group-hover:translate-x-0 group-hover:opacity-100"
                    />
                  </h3>
                  <p className="text-body mt-3 text-[0.95rem]">{c.resumo}</p>
                  <span className="mt-6 font-mono text-xs font-semibold uppercase tracking-wider text-amarelo">
                    Conhecer o curso →
                  </span>
                </Link>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Diferenciais */}
      <section className="fold-light relative overflow-hidden">
        <WaveDivider
          className="absolute inset-x-0 top-0 rotate-180"
          color="var(--ink)"
        />
        <Tree
          className="motif motif-soft text-floresta right-8 top-24 hidden w-56 md:block"
          style={{ color: "#128a52" }}
        />
        <div className="container-site relative section-padding">
          <Reveal>
            <p className="eyebrow mb-4">O diferencial</p>
            <h2 className="headline-section max-w-2xl">
              Por que a Escola Ousadia é diferente
            </h2>
          </Reveal>
          <div className="mt-12 grid gap-6 md:grid-cols-2">
            {DIFERENCIAIS.map((d, i) => (
              <Reveal key={d.t} delay={i * 0.06}>
                <div className="card-surface h-full p-7">
                  <h3 className="font-display text-xl">{d.t}</h3>
                  <p className="text-body mt-3">{d.d}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Prova social */}
      <section className="relative overflow-hidden bg-ink-void section-padding">
        <div className="container-site relative">
          <Reveal>
            <p className="eyebrow mb-4">Prova social</p>
            <h2 className="headline-section">Quem passou pela Escola, conta</h2>
          </Reveal>
          <div className="mt-10 grid gap-5 sm:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <Reveal key={i} delay={i * 0.05}>
                <MediaSlot
                  kind="vídeo"
                  ratio="aspect-[9/16]"
                  label={`Depoimento de aluno ${i}: nome, cidade e curso feito.`}
                />
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <CtaFinal
        waveColor="var(--ink-void)"
        title={
          <>
            Em dúvida sobre qual é o seu momento? A gente te ajuda a{" "}
            <span className="text-amarelo">escolher</span>.
          </>
        }
        ctaLabel="Falar sobre os cursos no WhatsApp"
        href={wa("escola")}
        microcopy="Atendimento humano. Garantia de 7 dias em todos os cursos."
      />
    </>
  );
}
