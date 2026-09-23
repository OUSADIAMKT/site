import { Clapperboard, Tv } from "lucide-react";
import type { Recomendacao } from "@/lib/metodo-satoyiro/recomendacoes";

/** Carrossel horizontal (scroll nativo) com os filmes/séries recomendados. */
export function Recomendacoes({ itens }: { itens: Recomendacao[] }) {
  return (
    <div
      className="-mx-1 flex snap-x snap-mandatory gap-4 overflow-x-auto px-1 pb-3"
      style={{ scrollbarWidth: "thin" }}
    >
      {itens.map((rec) => (
        <article
          key={rec.titulo}
          className="w-64 shrink-0 snap-start rounded-xl border border-border bg-white/[0.03] p-5"
        >
          <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-widest text-rio">
            {rec.tipo === "filme" ? <Clapperboard size={14} /> : <Tv size={14} />}
            {rec.tipo}
          </div>
          <h4 className="font-display mt-2 text-lg leading-snug">{rec.titulo}</h4>
          <p className="text-body mt-2 text-xs leading-relaxed">{rec.frase}</p>
        </article>
      ))}
    </div>
  );
}
