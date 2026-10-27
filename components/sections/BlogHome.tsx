import Link from "next/link";
import Image from "next/image";
import { ArrowRight, BookOpen } from "lucide-react";
import { Reveal } from "@/components/ui/Reveal";
import { KeneField, KeneStrip } from "@/components/ui/graphics/Kene";
import { POSTS, formatarData, type Post } from "@/lib/posts";

/**
 * Vitrine do blog na home (entrou no lugar de "Quem lidera", 27/10/2026).
 * Depois do Ecossistema, mostra que a Ousadia sabe do que fala antes da prova
 * social. Um destaque grande + dois menores, puxados de `POSTS`: post novo
 * entra sozinho. Post `pendente` (só o esqueleto) não aparece.
 *
 * O Jackson saiu da home como seção, mas continua aqui na faixa de baixo,
 * levando pra história completa no /sobre (sinal de autoria pra Google e IAs).
 */

/** Cor da etiqueta pelo tema do post, na mesma lógica do ecossistema. */
function corDoTema(post: Post) {
  const t = post.tags.join(" ").toLowerCase();
  if (/ugc|creator|influ/.test(t)) return "#ffc61a";
  if (/bioeconomia|amazônia|cop30/.test(t)) return "#23b26f";
  if (/\bia\b|intelig/.test(t)) return "#b56cff";
  return "#18a5c9";
}

function Etiqueta({ post }: { post: Post }) {
  const cor = corDoTema(post);
  const tema = post.tags[0] ?? post.tipo;
  return (
    <span
      className="inline-flex self-start items-center rounded-full border px-3 py-1 font-mono text-[0.68rem] font-semibold uppercase tracking-wider"
      style={{ color: cor, borderColor: `${cor}66`, background: `${cor}14` }}
    >
      {tema}
    </span>
  );
}

function Meta({ post }: { post: Post }) {
  return (
    <p className="flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-xs text-cinza-ink">
      <span>{post.tipo}</span>
      {post.data && (
        <>
          <span aria-hidden>·</span>
          <time dateTime={post.data}>{formatarData(post.data)}</time>
        </>
      )}
    </p>
  );
}

export function BlogHome() {
  const publicados = POSTS.filter((p) => !p.pendente && !p.rascunho);
  if (publicados.length === 0) return null;
  const [destaque, ...resto] = publicados;
  const menores = resto.slice(0, 2);
  // Com um post só ao lado, ele ocupa a coluna inteira em pé (capa em cima).
  const sozinho = menores.length === 1;

  return (
    <section
      id="blog"
      className="relative overflow-hidden bg-ink section-padding scroll-mt-20"
    >
      <KeneStrip
        motif="ronoa"
        height={18}
        className="absolute inset-x-0 top-0 text-amarelo opacity-25"
      />
      <KeneField motif="shahuu" scale={104} opacity={0.012} className="text-white" />
      <div
        className="absolute -right-24 top-24 h-80 w-80 rounded-full bg-rio/15 blur-[120px]"
        aria-hidden
      />

      <div className="container-site relative">
        <Reveal>
          <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="eyebrow mb-4 inline-flex items-center gap-2">
                <BookOpen size={14} aria-hidden /> Blog da Ousadia
              </p>
              <h2 className="headline-section max-w-2xl">
                Aprende com a gente.{" "}
                <span className="text-amarelo">De graça</span>, direto da
                Amazônia.
              </h2>
              <p className="text-body mt-5 max-w-xl">
                Marketing, UGC, creator economy, IA e bioeconomia explicados em
                linguagem de gente, com dado, case real e o que fazer amanhã.
              </p>
            </div>
            <Link
              href="/conteudo"
              className="btn btn-secondary shrink-0 self-start md:self-auto"
            >
              Ver todos os artigos <ArrowRight size={16} />
            </Link>
          </div>
        </Reveal>

        <div className="mt-12 grid gap-6 lg:grid-cols-[1.35fr_1fr]">
          {/* Destaque */}
          <Reveal>
            <Link
              href={destaque.url}
              className="group card-surface flex h-full flex-col overflow-hidden transition-transform hover:-translate-y-1"
            >
              {destaque.capa && (
                <div className="relative aspect-[16/9] overflow-hidden">
                  <Image
                    src={destaque.capa.src}
                    alt={destaque.capaAlt ?? ""}
                    width={destaque.capa.width}
                    height={destaque.capa.height}
                    placeholder={destaque.capa.blurDataURL ? "blur" : "empty"}
                    blurDataURL={destaque.capa.blurDataURL}
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                  />
                  <span className="absolute left-4 top-4 rounded-full bg-amarelo px-3 py-1 font-mono text-[0.68rem] font-bold uppercase tracking-wider text-[#1a0b2e]">
                    Em destaque
                  </span>
                </div>
              )}
              <div className="flex flex-1 flex-col p-7">
                <div className="flex flex-wrap items-center gap-3">
                  <Etiqueta post={destaque} />
                  <Meta post={destaque} />
                </div>
                <h3 className="mt-4 font-display text-2xl leading-tight sm:text-[1.7rem]">
                  {destaque.titulo}
                </h3>
                <p className="text-body mt-3 line-clamp-3">{destaque.resumo}</p>
                <span className="mt-auto inline-flex items-center gap-2 pt-6 font-mono text-xs font-semibold uppercase tracking-wider text-amarelo transition-transform group-hover:translate-x-1">
                  Ler o artigo <ArrowRight size={14} />
                </span>
              </div>
            </Link>
          </Reveal>

          {/* Dois menores */}
          <div className="grid gap-6">
            {menores.map((p, i) => (
              <Reveal key={p.slug} delay={(i + 1) * 0.06}>
                <Link
                  href={p.url}
                  className={`group card-surface grid h-full overflow-hidden transition-transform hover:-translate-y-1 ${sozinho ? "grid-rows-[auto_1fr]" : "sm:grid-cols-[0.9fr_1.1fr]"}`}
                >
                  {p.capa && (
                    <div className={`relative aspect-[16/9] overflow-hidden ${sozinho ? "" : "sm:aspect-auto"}`}>
                      <Image
                        src={p.capa.src}
                        alt={p.capaAlt ?? ""}
                        width={p.capa.width}
                        height={p.capa.height}
                        placeholder={p.capa.blurDataURL ? "blur" : "empty"}
                        blurDataURL={p.capa.blurDataURL}
                        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
                      />
                    </div>
                  )}
                  <div className="flex flex-col p-6">
                    <Etiqueta post={p} />
                    <h3 className={`mt-3 font-display leading-snug ${sozinho ? "text-xl" : "text-lg"}`}>
                      {p.titulo}
                    </h3>
                    {sozinho && (
                      <p className="text-body mt-3 line-clamp-3 text-sm">{p.resumo}</p>
                    )}
                    <div className="mt-auto pt-4">
                      <Meta post={p} />
                    </div>
                  </div>
                </Link>
              </Reveal>
            ))}
          </div>
        </div>

        {/* Quem escreve: o fundador continua na home, em uma linha. */}
        <Reveal delay={0.1}>
          <div className="mt-12 flex flex-col gap-5 rounded-2xl border border-white/10 bg-white/[0.03] p-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <Image
                src="/sobre/jackson-amd-palco.webp"
                alt="Jackson, fundador da Ousadia, no palco do Amazon Marketing Day"
                width={112}
                height={112}
                className="h-14 w-14 shrink-0 rounded-full border-2 border-amarelo object-cover"
              />
              <p className="text-body max-w-xl text-sm">
                <strong className="font-semibold text-foreground">
                  Feito por quem pratica.
                </strong>{" "}
                Cada artigo sai da experiência de mais de 50 marcas atendidas e
                turmas formadas desde 2020, liderada pelo Jackson, fundador da
                Ousadia.
              </p>
            </div>
            <Link
              href="/sobre"
              className="inline-flex shrink-0 items-center gap-2 font-mono text-xs font-semibold uppercase tracking-wider text-amarelo transition-transform hover:translate-x-1"
            >
              Conheça a história
              <ArrowRight size={14} />
            </Link>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
