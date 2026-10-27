"use client";

import Image from "next/image";
import { useState } from "react";
import { YouTubeLite } from "@/components/ui/YouTubeLite";

/**
 * Depoimentos da prova social da home, organizados por área (28/10/2026).
 *
 * Cada depoimento leva a tag da área. As abas só aparecem quando houver
 * depoimento de mais de uma área: até lá, mostrar "Todos / UGC" seria um
 * filtro que não filtra nada. Pra adicionar um depoimento novo, é só incluir
 * um item em `DEPOIMENTOS` com a `area` certa — a aba nasce sozinha.
 *
 * Vídeo: `id` do YouTube (Shorts). Print: arquivo em `public/` e largura real.
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

type Depoimento =
  | { tipo: "video"; area: Area; id: string; titulo: string; legenda: string }
  | { tipo: "print"; area: Area; src: string; w: number; alt: string; legenda: string };

export const DEPOIMENTOS: Depoimento[] = [
  { tipo: "video", area: "UGC", id: "N-q6r4jSZNU", titulo: "Depoimento da Thalia", legenda: "Thalia, aluna do Mapa do UGC" },
  { tipo: "video", area: "UGC", id: "t57qogTvwPI", titulo: "Depoimento da Sara", legenda: "Sara, aluna do Mapa do UGC" },
  { tipo: "video", area: "UGC", id: "3iVry7h2C8U", titulo: "Depoimento em vídeo de aluna do Mapa do UGC", legenda: "Aluna do Mapa do UGC" },
  {
    tipo: "print",
    area: "UGC",
    src: "/mapa-do-ugc/depoimento-diy.webp",
    w: 1041,
    alt: "Print de WhatsApp: terceira campanha de UGC aprovada com a marca de cosméticos DIY",
    legenda: "3ª campanha aprovada com a DIY",
  },
  {
    tipo: "print",
    area: "UGC",
    src: "/mapa-do-ugc/depoimento-samsung.webp",
    w: 1012,
    alt: "Print de notificação: candidatura aprovada em campanha da Samsung Galaxy",
    legenda: "Aprovada em campanha da Samsung",
  },
  {
    tipo: "print",
    area: "UGC",
    src: "/mapa-do-ugc/depoimento-oralb.webp",
    w: 1306,
    alt: "Print de aluna aprovada na campanha Iconic da Oral-B no Instagram",
    legenda: "Aprovada na campanha Iconic da Oral-B",
  },
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
      style={{ borderColor: `${CORES[d.area]}` }}
    >
      {d.tipo === "video" ? (
        <YouTubeLite id={d.id} titulo={d.titulo} formato="vertical" />
      ) : (
        <Image
          src={d.src}
          alt={d.alt}
          width={d.w}
          height={800}
          className="w-full flex-1 object-cover object-top"
        />
      )}
      <Legenda d={d} />
    </figure>
  );
}

export function Depoimentos() {
  const areas = ORDEM.filter((a) => DEPOIMENTOS.some((d) => d.area === a));
  const comAbas = areas.length > 1;
  const [aba, setAba] = useState<"Todos" | Area>("Todos");

  /**
   * "Todos" mostra o melhor de cada área (1 vídeo + 1 print de cada), pra quem
   * chega ver de cara que tem resultado em tudo. Numa aba, aparece tudo daquela
   * área. Sem abas (uma área só), mostra tudo.
   */
  const lista = !comAbas
    ? DEPOIMENTOS
    : aba === "Todos"
      ? areas.flatMap((a) => {
          const daArea = DEPOIMENTOS.filter((d) => d.area === a);
          const video = daArea.find((d) => d.tipo === "video");
          const print = daArea.find((d) => d.tipo === "print");
          return [video, print].filter((d): d is Depoimento => Boolean(d));
        })
      : DEPOIMENTOS.filter((d) => d.area === aba);

  const videos = lista.filter((d) => d.tipo === "video");
  const prints = lista.filter((d) => d.tipo === "print");

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

      <div className={`space-y-10 ${comAbas ? "mt-8" : ""}`}>
        {videos.length > 0 && (
          <div>
            <h3 className="font-mono text-xs uppercase tracking-widest text-floresta-deep">
              Depoimentos em vídeo
            </h3>
            <div className="mt-5 grid gap-5 sm:grid-cols-3">
              {videos.map((d) => (
                <Cartao key={d.legenda} d={d} />
              ))}
            </div>
          </div>
        )}
        {prints.length > 0 && (
          <div>
            <h3 className="font-mono text-xs uppercase tracking-widest text-floresta-deep">
              Prints de feedback
            </h3>
            <div className="mt-5 grid gap-5 sm:grid-cols-3">
              {prints.map((d) => (
                <Cartao key={d.legenda} d={d} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
