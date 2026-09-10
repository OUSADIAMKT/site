"use client";

import Link from "next/link";
import Image from "next/image";
import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { Reveal } from "@/components/ui/Reveal";
import type { PostResumo, PostTipo } from "@/lib/posts";

const FILTROS: ("Todos" | PostTipo)[] = ["Todos", "Artigo", "Podcast", "Case"];

const CORES: Record<PostTipo, string> = {
  Artigo: "text-rio",
  Podcast: "text-amarelo",
  Case: "text-floresta",
};

export function ConteudoLista({ posts }: { posts: PostResumo[] }) {
  const [filtro, setFiltro] = useState<(typeof FILTROS)[number]>("Todos");
  const [termo, setTermo] = useState("");

  const visiveis = useMemo(() => {
    const t = termo.toLowerCase().trim();
    return posts.filter(
      (p) =>
        (filtro === "Todos" || p.tipo === filtro) &&
        (!t ||
          p.titulo.toLowerCase().includes(t) ||
          p.resumo.toLowerCase().includes(t)),
    );
  }, [posts, filtro, termo]);

  return (
    <>
      <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-2" role="group" aria-label="Filtrar por tipo">
          {FILTROS.map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFiltro(f)}
              aria-pressed={filtro === f}
              className={`rounded-full border px-4 py-2 font-mono text-xs uppercase tracking-wider transition-colors ${
                filtro === f
                  ? "border-amarelo bg-amarelo text-[#1a0b2e]"
                  : "border-border text-cinza-ink hover:text-foreground"
              }`}
            >
              {f}
            </button>
          ))}
        </div>

        <div className="relative sm:w-64">
          <Search
            size={16}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-cinza-ink"
            aria-hidden
          />
          <label htmlFor="busca-conteudo" className="sr-only">
            Buscar conteúdo
          </label>
          <input
            id="busca-conteudo"
            type="search"
            value={termo}
            onChange={(e) => setTermo(e.target.value)}
            placeholder="Buscar conteúdo"
            className="w-full rounded-full border border-input bg-ink-void/70 py-2.5 pl-9 pr-4 text-sm text-foreground outline-none transition-colors placeholder:text-cinza-ink/60 focus:border-amarelo"
          />
        </div>
      </div>

      {visiveis.length === 0 ? (
        <p className="text-body mt-12">
          Nada por aqui com esse filtro. Tenta outra busca.
        </p>
      ) : (
        <div className="mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {visiveis.map((p, i) => (
            <Reveal key={p.slug} delay={i * 0.05}>
              <Link
                href={`/conteudo/${p.slug}`}
                className="card-surface group flex h-full flex-col overflow-hidden transition-colors hover:border-amarelo"
              >
                {p.capa ? (
                  <Image
                    src={p.capa.src}
                    alt={p.capaAlt ?? ""}
                    width={p.capa.width}
                    height={p.capa.height}
                    placeholder={p.capa.blurDataURL ? "blur" : undefined}
                    blurDataURL={p.capa.blurDataURL}
                    sizes="(max-width: 768px) 100vw, 380px"
                    className="aspect-video w-full border-b border-border object-cover"
                  />
                ) : (
                  <div className="grid aspect-video place-items-center border-b border-dashed border-border bg-ink-void/60">
                    <span className="px-4 text-center font-mono text-[0.65rem] uppercase tracking-widest text-cinza-ink">
                      capa real pendente
                    </span>
                  </div>
                )}
                <div className="flex flex-1 flex-col p-5">
                  <span
                    className={`font-mono text-[0.65rem] uppercase tracking-widest ${CORES[p.tipo]}`}
                  >
                    {p.tipo}
                  </span>
                  <h3 className="font-display text-lg mt-2 leading-snug">
                    {p.titulo}
                  </h3>
                  <p className="text-body mt-2 flex-1 text-sm">{p.resumo}</p>
                  <span className="mt-4 font-mono text-[0.65rem] uppercase tracking-wider text-cinza-ink">
                    {p.dataLegivel} · por Ousadia
                  </span>
                </div>
              </Link>
            </Reveal>
          ))}
        </div>
      )}
    </>
  );
}
