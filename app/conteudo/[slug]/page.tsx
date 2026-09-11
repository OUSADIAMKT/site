import Link from "next/link";
import Image from "next/image";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { Reveal } from "@/components/ui/Reveal";
import { CtaFinal } from "@/components/sections/CtaFinal";
import { MediaSlot } from "@/components/ui/MediaSlot";
import { NewsletterForm } from "@/components/forms/NewsletterForm";
import { KeneStrip } from "@/components/ui/graphics/Kene";
import { MdxContent } from "@/components/mdx/MdxContent";
import { wa, SITE } from "@/lib/site";
import { POSTS, getPost, relacionados, formatarData } from "@/lib/posts";

export function generateStaticParams() {
  return POSTS.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({
  params,
}: PageProps<"/conteudo/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const post = getPost(slug);
  if (!post) return {};
  return {
    title: post.titulo,
    description: post.resumo,
    alternates: { canonical: `/conteudo/${post.slug}` },
    openGraph: {
      title: post.titulo,
      description: post.resumo,
      type: "article",
      url: `${SITE.url}/conteudo/${post.slug}`,
      ...(post.data ? { publishedTime: post.data } : {}),
      ...(post.capa ? { images: [{ url: post.capa.src }] } : {}),
    },
  };
}

export default async function PostPage({
  params,
}: PageProps<"/conteudo/[slug]">) {
  const { slug } = await params;
  const post = getPost(slug);
  if (!post) notFound();

  const outros = relacionados(post);
  const tempoLeitura = post.metadata.readingTime;

  const articleJsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: post.titulo,
    description: post.resumo,
    author: { "@type": "Organization", name: post.autor },
    publisher: { "@type": "Organization", name: "Ousadia Marketing" },
    inLanguage: "pt-BR",
    mainEntityOfPage: `${SITE.url}/conteudo/${post.slug}`,
    ...(post.data ? { datePublished: post.data } : {}),
    ...(post.atualizado ? { dateModified: post.atualizado } : {}),
    ...(post.capa ? { image: `${SITE.url}${post.capa.src}` } : {}),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleJsonLd) }}
      />

      <article>
        {/* Cabeçalho */}
        <header className="relative overflow-hidden">
          <div className="absolute inset-0 grid-lines opacity-50" aria-hidden />
          <div className="container-site relative section-padding max-w-3xl">
            <Reveal>
              <nav
                aria-label="Trilha de navegação"
                className="mb-6 font-mono text-xs text-cinza-ink"
              >
                <Link href="/conteudo" className="hover:text-amarelo">
                  Conteúdo
                </Link>
                <span className="mx-2">/</span>
                <span className="text-amarelo">{post.tipo}</span>
              </nav>
              <h1 className="font-display text-[clamp(1.9rem,4.5vw,3.25rem)] leading-[1.06]">
                {post.titulo}
              </h1>
              <p className="mt-5 font-mono text-xs uppercase tracking-wider text-cinza-ink">
                {formatarData(post.data)} · por {post.autor}
                {tempoLeitura > 0 ? ` · ${tempoLeitura} min de leitura` : ""}
              </p>
              {post.rascunho ? (
                <p className="mt-4 inline-block rounded border border-dashed border-amarelo px-3 py-1 font-mono text-[0.7rem] uppercase tracking-widest text-amarelo">
                  rascunho, visível só em desenvolvimento
                </p>
              ) : null}
            </Reveal>
          </div>
          <KeneStrip motif="iso" height={18} className="text-amarelo opacity-70" />
        </header>

        {/* Corpo */}
        <section className="relative overflow-hidden bg-ink section-padding">
          <div className="container-site relative max-w-3xl">
            <Reveal>
              {post.capa ? (
                <Image
                  src={post.capa.src}
                  alt={post.capaAlt ?? ""}
                  width={post.capa.width}
                  height={post.capa.height}
                  placeholder={post.capa.blurDataURL ? "blur" : undefined}
                  blurDataURL={post.capa.blurDataURL}
                  sizes="(max-width: 768px) 100vw, 768px"
                  priority
                  className="aspect-video w-full rounded-2xl border border-border object-cover"
                />
              ) : (
                <MediaSlot
                  ratio="aspect-video"
                  label="Capa do post: imagem real relacionada. Zero stock."
                />
              )}
            </Reveal>

            {post.toc.length > 1 ? (
              <Reveal delay={0.06}>
                <nav aria-label="Neste post" className="card-surface mt-10 p-6">
                  <p className="font-mono text-[0.7rem] uppercase tracking-widest text-amarelo">
                    Neste post
                  </p>
                  <ol className="mt-3 space-y-2">
                    {post.toc.map((item) => (
                      <li key={item.url}>
                        <a
                          href={item.url}
                          className="text-body text-sm transition-colors hover:text-amarelo"
                        >
                          {item.title}
                        </a>
                      </li>
                    ))}
                  </ol>
                </nav>
              </Reveal>
            ) : null}

            <Reveal delay={0.08}>
              <p className="text-body mt-10 text-lg">{post.resumo}</p>
            </Reveal>

            <Reveal delay={0.1}>
              <div className="mt-8">
                <MdxContent code={post.code} />
              </div>
            </Reveal>

            {/* Captura de e-mail no meio da leitura (PRD 9.6) */}
            <Reveal delay={0.12}>
              <aside className="card-surface my-10 p-7">
                <h2 className="font-display text-xl">
                  Receba a Newsletter da Ousadia.
                </h2>
                <p className="text-body mt-2 text-sm">
                  Sem spam. Sem motivacional vazio. Só estratégia, bastidor e
                  provocação útil, toda terça.
                </p>
                <NewsletterForm className="mt-5 max-w-sm" />
              </aside>
            </Reveal>

            <Reveal delay={0.14}>
              <a href={wa("home")} className="btn btn-primary mt-4">
                Quero entrar pra Ousadia <ArrowRight size={16} />
              </a>
            </Reveal>
          </div>
        </section>

        {/* Relacionados */}
        {outros.length > 0 ? (
          <section className="relative overflow-hidden bg-ink-void section-padding">
            <div className="container-site relative max-w-3xl">
              <Reveal>
                <h2 className="font-mono text-xs uppercase tracking-widest text-amarelo">
                  Continue lendo
                </h2>
              </Reveal>
              <ul className="mt-6 divide-y divide-border border-y border-border">
                {outros.map((r, i) => (
                  <Reveal key={r.slug} delay={i * 0.05}>
                    <li>
                      <Link
                        href={`/conteudo/${r.slug}`}
                        className="group flex items-center justify-between gap-6 py-5"
                      >
                        <span>
                          <span className="font-mono text-[0.65rem] uppercase tracking-widest text-rio">
                            {r.tipo}
                          </span>
                          <span className="font-display text-lg mt-1 block leading-snug transition-colors group-hover:text-amarelo">
                            {r.titulo}
                          </span>
                        </span>
                        <ArrowRight
                          size={18}
                          className="shrink-0 text-cinza-ink transition-transform group-hover:translate-x-1 group-hover:text-amarelo"
                        />
                      </Link>
                    </li>
                  </Reveal>
                ))}
              </ul>
            </div>
          </section>
        ) : null}
      </article>

      <CtaFinal
        waveColor="var(--ink-void)"
        title={
          <>
            Chega de postar no escuro.{" "}
            <span className="text-amarelo">Liga a luz.</span>
          </>
        }
        ctaLabel="Falar com a Ousadia"
        href={wa("home")}
      />
    </>
  );
}
