import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { Reveal } from "@/components/ui/Reveal";
import { WaveDivider } from "@/components/ui/WaveDivider";
import { PageHero } from "@/components/sections/PageHero";
import { CtaFinal } from "@/components/sections/CtaFinal";
import { FaqList } from "@/components/sections/Faq";
import { MediaSlot, ContentSlot } from "@/components/ui/MediaSlot";
import { CURSOS, getCurso, wa } from "@/lib/site";
import { getConteudo } from "@/lib/cursos-conteudo";

export function generateStaticParams() {
  return CURSOS.map((c) => ({ curso: c.slug }));
}

export async function generateMetadata({
  params,
}: PageProps<"/escola/[curso]">): Promise<Metadata> {
  const { curso } = await params;
  const c = getCurso(curso);
  if (!c) return {};
  return {
    title: `${c.nome} | Escola Ousadia`,
    description: c.promessa,
  };
}

export default async function CursoPage({
  params,
}: PageProps<"/escola/[curso]">) {
  const { curso } = await params;
  const c = getCurso(curso);
  if (!c) notFound();

  const k = getConteudo(c.slug);
  const waHref = wa("escola", c.nome);

  const courseJsonLd = {
    "@context": "https://schema.org",
    "@type": "Course",
    name: c.nome,
    description: c.promessa,
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
        dangerouslySetInnerHTML={{ __html: JSON.stringify(courseJsonLd) }}
      />

      <PageHero
        eyebrow="Curso · Escola Ousadia"
        title={
          <>
            {c.nome}
            <span className="text-amarelo">.</span>
          </>
        }
        lead={c.promessa}
      >
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <a href={waHref} className="btn btn-primary">
            {k.ctaLabel} <ArrowRight size={16} />
          </a>
          <span className="font-mono text-xs text-cinza-ink">
            Garantia de 7 dias · Vagas por turma limitadas
          </span>
        </div>
      </PageHero>

      {/* Pra quem é */}
      <section className="relative overflow-hidden bg-ink section-padding">
        <div className="container-site relative grid gap-10 lg:grid-cols-[1fr_1.2fr]">
          <Reveal>
            <div>
              <p className="eyebrow mb-4">Pra quem é</p>
              <h2 className="headline-section max-w-sm">
                Esse curso é pra você se…
              </h2>
            </div>
          </Reveal>
          <Reveal delay={0.08}>
            {k.praQuem ? (
              <div className="space-y-3">
                {k.praQuem.sim.map((t) => (
                  <div key={t} className="flex items-start gap-3">
                    <span className="mt-0.5 text-floresta">✓</span>
                    <p className="text-body text-[0.95rem]">{t}</p>
                  </div>
                ))}
                {k.praQuem.nao.map((t) => (
                  <div key={t} className="flex items-start gap-3">
                    <span className="mt-0.5 text-destructive">✕</span>
                    <p className="text-body text-[0.95rem]">{t}</p>
                  </div>
                ))}
              </div>
            ) : (
              <ContentSlot label={`Pra quem é o ${c.nome}: 4 a 5 bullets, no padrão do Destrave.`} />
            )}
          </Reveal>
        </div>
      </section>

      {/* Módulos */}
      <section className="fold-light relative overflow-hidden">
        <WaveDivider
          className="absolute inset-x-0 top-0 rotate-180"
          color="var(--ink)"
        />
        <div className="container-site relative section-padding">
          <Reveal>
            <p className="eyebrow mb-4">Conteúdo</p>
            <h2 className="headline-section max-w-2xl">
              O que você vai aprender
            </h2>
            {k.modulosNota && (
              <ContentSlot className="mt-6 max-w-xl" label={k.modulosNota} />
            )}
          </Reveal>
          <div className="mt-10">
            {k.modulos ? (
              <ol className="space-y-4">
                {k.modulos.map((m, i) => (
                  <Reveal key={m.t} delay={i * 0.05}>
                    <li className="card-surface flex gap-5 p-6">
                      <span className="font-display text-2xl text-floresta-deep">
                        {String(i + 1).padStart(2, "0")}
                      </span>
                      <div>
                        <h3 className="font-display text-lg">{m.t}</h3>
                        <p className="text-body mt-1.5 text-sm">{m.d}</p>
                      </div>
                    </li>
                  </Reveal>
                ))}
              </ol>
            ) : (
              <ContentSlot
                label={`Módulos do ${c.nome}: lista de módulos e aulas a fornecer.`}
              />
            )}
          </div>
        </div>
      </section>

      {/* Formato + resultado */}
      <section className="relative overflow-hidden bg-roxo section-padding">
        <div className="container-site relative grid gap-14 lg:grid-cols-2">
          <Reveal>
            <div>
              <p className="eyebrow mb-4">Formato e carga</p>
              {k.formato ? (
                <dl className="mt-6 space-y-5">
                  {k.formato.map((f) => (
                    <div
                      key={f.label}
                      className="border-b border-border pb-4 last:border-0"
                    >
                      <dt className="font-mono text-xs uppercase tracking-widest text-amarelo">
                        {f.label}
                      </dt>
                      <dd className="font-display text-xl mt-1">{f.valor}</dd>
                      <dd className="text-body text-sm">{f.nota}</dd>
                    </div>
                  ))}
                </dl>
              ) : (
                <ContentSlot
                  className="mt-6"
                  label="Formato: duração, modalidade e número de vagas."
                />
              )}
            </div>
          </Reveal>
          <Reveal delay={0.08}>
            <div>
              <p className="eyebrow mb-4">Com o que você sai</p>
              {k.resultado ? (
                <ul className="mt-6 space-y-4">
                  {k.resultado.map((r) => (
                    <li key={r.t} className="flex items-start gap-3">
                      <span className="text-xl" aria-hidden>
                        {r.emoji}
                      </span>
                      <p className="text-body text-[0.95rem]">{r.t}</p>
                    </li>
                  ))}
                </ul>
              ) : (
                <ContentSlot
                  className="mt-6"
                  label="Resultado esperado: o projeto real que o aluno publica ao final."
                />
              )}
            </div>
          </Reveal>
        </div>
      </section>

      {/* Prova social */}
      <section className="relative overflow-hidden bg-ink-void section-padding">
        <div className="container-site relative">
          <Reveal>
            <p className="eyebrow mb-4">Prova social</p>
            <h2 className="headline-section">Quem fez, conta</h2>
          </Reveal>
          <div className="mt-10 grid gap-5 sm:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <Reveal key={i} delay={i * 0.05}>
                <MediaSlot
                  kind="vídeo"
                  ratio="aspect-[9/16]"
                  label={`Depoimento ${i} de aluno do ${c.nome}: nome e cidade.`}
                />
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
              Perguntas frequentes do {c.nome}
            </h2>
          </Reveal>
          {k.faq ? (
            <FaqList items={k.faq} />
          ) : (
            <ContentSlot
              label={`FAQ do ${c.nome}: 3 a 5 perguntas específicas do curso.`}
            />
          )}
          <Reveal>
            <Link
              href="/escola"
              className="mt-10 inline-flex items-center gap-2 font-mono text-xs uppercase tracking-wider text-floresta-deep hover:underline"
            >
              ← Ver todos os cursos da Escola
            </Link>
          </Reveal>
        </div>
      </section>

      <CtaFinal
        waveColor="var(--paper)"
        title={
          k.fechamento ?? (
            <>
              Bora conversar sobre o <span className="text-amarelo">seu momento</span>?
            </>
          )
        }
        lead="Garantia de 7 dias: entrou, não era pra você, a gente devolve. O risco é nosso."
        ctaLabel={k.ctaLabel}
        href={waHref}
      />
    </>
  );
}
