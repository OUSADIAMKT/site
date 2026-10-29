"use client";

import { useState } from "react";
import { YouTubeLite } from "@/components/ui/YouTubeLite";

/**
 * Depoimentos da prova social da home, organizados por área (28/10/2026).
 *
 * Só vídeo (Shorts): 3 de UGC e 3 de Social Media. Os prints saíram da home
 * em 28/10 e seguem nas páginas de cada curso. As abas só aparecem quando
 * houver depoimento de mais de uma área; "Todos" mostra tudo. Pra adicionar
 * um depoimento, inclua um item em `DEPOIMENTOS` com a `area` certa — a aba
 * nasce sozinha.
 */

export type Area = "UGC" | "Social Media" | "Destrave" | "Agência";

/** Mesmas cores do ecossistema; texto escuro na etiqueta pra contrastar no claro. */
const CORES: Record<Area, string> = {
  UGC: "#ffc61a",
  "Social Media": "#23b26f",
  Destrave: "#b56cff",
  Agência: "#18a5c9",
};

const ORDEM: Area[] = ["UGC", "Social Media", "Destrave", "Agência"];

type Depoimento = { area: Area; id: string; titulo: string; legenda: string };

export const DEPOIMENTOS: Depoimento[] = [
  { area: "UGC", id: "N-q6r4jSZNU", titulo: "Depoimento da Thalia", legenda: "Thalia, aluna do Mapa do UGC" },
  { area: "UGC", id: "t57qogTvwPI", titulo: "Depoimento da Sara", legenda: "Sara, aluna do Mapa do UGC" },
  { area: "UGC", id: "3iVry7h2C8U", titulo: "Depoimento em vídeo de aluna do Mapa do UGC", legenda: "Aluna do Mapa do UGC" },
  // Os mesmos Shorts do /aulao-social-media (lá tem um 4º: FgYMthEKfCk).
  { area: "Social Media", id: "mfOsmSyicGE", titulo: "Depoimento em vídeo de aluna do curso de Social Media", legenda: "Aluna do curso de Social Media" },
  { area: "Social Media", id: "9lTvGvyO8pI", titulo: "Depoimento em vídeo de aluna do curso de Social Media", legenda: "Aluna do curso de Social Media" },
  { area: "Social Media", id: "c9tVQ1CsFLc", titulo: "Depoimento em vídeo de aluna do curso de Social Media", legenda: "Aluna do curso de Social Media" },
];

function Tag({ area }: { area: Area }) {
  return (
    <span
      className="inline-flex items-center rounded-full px-3 py-1 font-mono text-[0.68rem] font-bold uppercase tracking-wider text-[#1a0b2e]"
      style={{ background: CORES[area] }}
    >
      {area}
    </span>
  );
}

function Legenda({ d }: { d: Depoimento }) {
  return (
    <figcaption className="flex flex-wrap items-center gap-2 px-4 py-3">
      <Tag area={d.area} />
      <span className="text-sm font-medium text-[#241044]">{d.legenda}</span>
    </figcaption>
  );
}

function Cartao({ d }: { d: Depoimento }) {
  return (
    <figure
      className="flex h-full flex-col overflow-hidden rounded-2xl border-2 bg-white"
      style={{ borderColor: CORES[d.area] }}
    >
      <YouTubeLite id={d.id} titulo={d.titulo} formato="vertical" />
      <Legenda d={d} />
    </figure>
  );
}

export function Depoimentos() {
  const areas = ORDEM.filter((a) => DEPOIMENTOS.some((d) => d.area === a));
  const comAbas = areas.length > 1;
  const [aba, setAba] = useState<"Todos" | Area>("Todos");

  const lista = aba === "Todos" ? DEPOIMENTOS : DEPOIMENTOS.filter((d) => d.area === aba);

  return (
    <div>
      {comAbas && (
        <div
          role="tablist"
          aria-label="Depoimentos por área"
          className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-2"
        >
          {(["Todos", ...areas] as const).map((a) => {
            const ativa = aba === a;
            const cor = a === "Todos" ? "#241044" : CORES[a];
            return (
              <button
                key={a}
                type="button"
                role="tab"
                aria-selected={ativa}
                onClick={() => setAba(a)}
                className="shrink-0 rounded-full border-2 px-4 py-2 font-mono text-xs font-semibold uppercase tracking-wider transition-colors"
                style={{
                  borderColor: cor,
                  background: ativa ? cor : "transparent",
                  color: ativa ? (a === "Todos" ? "#ffffff" : "#1a0b2e") : "#241044",
                }}
              >
                {a}
              </button>
            );
          })}
        </div>
      )}

      <div className={`grid gap-5 sm:grid-cols-3 ${comAbas ? "mt-8" : ""}`}>
        {lista.map((d) => (
          <Cartao key={d.id} d={d} />
        ))}
      </div>
    </div>
  );
}
