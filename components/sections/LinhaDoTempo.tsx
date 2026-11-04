"use client";

import Image from "next/image";
import { useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { MediaSlot } from "@/components/ui/MediaSlot";

export type FotoMarco = {
  src: string;
  alt: string;
  w: number;
  h: number;
  /** Legenda desta foto na polaroid; sem ela, vale a do ano. */
  legenda?: string;
  /** Ponto da foto que fica à vista no recorte quadrado (object-position), ex.: "50% 20%". */
  foco?: string;
};

export type Marco = {
  /** Rótulo do botão (ex.: "2020", "2021–22"). */
  ano: string;
  /** Legenda escrita na polaroid. */
  legenda?: string;
  t: string;
  d: string;
  fotos?: FotoMarco[];
  /** Sem foto ainda: descreve o que entra no slot. */
  fotoPendente?: string;
};

/**
 * Foto em moldura de polaroid: borda branca, faixa mais larga embaixo com a
 * legenda e uma leve inclinação, como foto presa no mural.
 */
export function Polaroid({
  foto,
  legenda,
  inclina = -2,
  sizes = "(min-width: 768px) 18rem, 80vw",
  className = "",
}: {
  foto: FotoMarco;
  legenda?: string;
  /** Graus de rotação (negativo gira pra esquerda). */
  inclina?: number;
  sizes?: string;
  className?: string;
}) {
  return (
    <figure
      className={`bg-white p-3 shadow-[0_14px_30px_-12px_rgba(26,11,46,0.5)] ring-1 ring-[#1a0b2e]/10 ${legenda ? "pb-0" : "pb-9"} ${className}`}
      style={{ transform: `rotate(${inclina}deg)` }}
    >
      {/* Foto deitada aparece inteira (formato "wide", ninguém fica de fora nas
          pontas); foto em pé fica em 4:5, com o foco escolhido. */}
      <div
        className="relative overflow-hidden bg-[#1a0b2e]/10"
        style={{ aspectRatio: foto.w >= foto.h ? `${foto.w} / ${foto.h}` : "4 / 5" }}
      >
        <Image
          src={foto.src}
          alt={foto.alt}
          fill
          sizes={sizes}
          className="object-cover"
          style={foto.foco ? { objectPosition: foto.foco } : undefined}
        />
      </div>
      {legenda && (
        <figcaption className="font-display flex min-h-12 items-center justify-center px-1 py-2 text-center text-sm leading-snug text-[#1a0b2e]/80">
          {legenda}
        </figcaption>
      )}
    </figure>
  );
}

/**
 * Linha do tempo em abas (/sobre): um botão por ano e um cartão que troca de
 * conteúdo sem mudar a altura da página.
 *
 * Todos os cartões ficam empilhados na mesma célula do grid, e só o ativo
 * aparece. Assim a caixa já nasce com a altura do maior deles (nada "pula" ao
 * trocar de ano) e o texto de todos os anos continua no HTML, pro Google e pra
 * quem navega sem JavaScript.
 */
export function LinhaDoTempo({
  marcos,
  children,
}: {
  marcos: Marco[];
  /** Fecho abaixo do cartão (o "hoje" da história). */
  children?: ReactNode;
}) {
  const [ativo, setAtivo] = useState(0);
  const [foto, setFoto] = useState(0);
  const abas = useRef<(HTMLButtonElement | null)[]>([]);

  function escolher(i: number) {
    setAtivo(i);
    setFoto(0);
  }

  // Setas, Home e End trocam de ano, como manda o padrão de abas da WAI-ARIA.
  function onKeyDown(e: KeyboardEvent, i: number) {
    const ultimo = marcos.length - 1;
    const proximo =
      e.key === "ArrowRight"
        ? i === ultimo ? 0 : i + 1
        : e.key === "ArrowLeft"
          ? i === 0 ? ultimo : i - 1
          : e.key === "Home"
            ? 0
            : e.key === "End"
              ? ultimo
              : null;
    if (proximo === null) return;
    e.preventDefault();
    escolher(proximo);
    abas.current[proximo]?.focus();
  }

  return (
    <div className="relative pl-7 sm:pl-9">
      {/* Fio vertical com as duas pontas, ligando o começo ao "hoje". */}
      <span
        className="absolute left-[5px] top-3 bottom-3 w-px bg-[#1a0b2e]/25"
        aria-hidden
      />
      <span
        className="absolute left-0 top-2 h-[11px] w-[11px] rounded-full bg-[#1a0b2e]"
        aria-hidden
      />
      <span
        className="absolute left-0 bottom-2 h-[11px] w-[11px] rounded-full bg-[#1a0b2e]"
        aria-hidden
      />

      <div
        role="tablist"
        aria-label="Anos da história da Ousadia"
        className="flex flex-wrap gap-2 pb-3"
      >
        {marcos.map((m, i) => {
          const on = i === ativo;
          return (
            <button
              key={m.ano}
              ref={(el) => {
                abas.current[i] = el;
              }}
              type="button"
              role="tab"
              id={`ano-${i}`}
              aria-selected={on}
              aria-controls={`ano-painel-${i}`}
              tabIndex={on ? 0 : -1}
              onClick={() => escolher(i)}
              onKeyDown={(e) => onKeyDown(e, i)}
              className={`shrink-0 rounded-full border-2 px-4 py-1.5 font-mono text-xs font-semibold tracking-wider transition-colors ${
                on
                  ? // var() direto: no claro, `.text-amarelo` vira verde (globals.css)
                    "border-[#1a0b2e] bg-[#1a0b2e] text-[color:var(--amarelo)]"
                  : "border-amarelo text-[#1a0b2e] hover:bg-amarelo/20"
              }`}
            >
              {m.ano}
            </button>
          );
        })}
      </div>

      <div className="mt-3 grid">
        {marcos.map((m, i) => {
          const on = i === ativo;
          const fotos = m.fotos ?? [];
          const atual = fotos[on ? foto : 0];
          return (
            <div
              key={m.ano}
              role="tabpanel"
              id={`ano-painel-${i}`}
              aria-labelledby={`ano-${i}`}
              inert={!on}
              className={`[grid-area:1/1] transition-opacity duration-300 ${
                on ? "opacity-100" : "invisible opacity-0"
              }`}
            >
              <article className="card-surface grid h-full gap-8 rounded-2xl p-6 sm:p-9 md:grid-cols-[1.3fr_1fr] md:items-center">
                <div>
                  <span className="font-mono text-xs uppercase tracking-widest text-[var(--floresta-deep)]">
                    {m.ano}
                  </span>
                  <h3 className="font-display mt-2 text-xl uppercase sm:text-2xl">
                    {m.t}
                  </h3>
                  <p className="text-body mt-4 text-[0.95rem] leading-relaxed">
                    {m.d}
                  </p>
                </div>

                <div className="mx-auto w-full max-w-[18rem]">
                  {atual ? (
                    <Polaroid
                      foto={atual}
                      legenda={atual.legenda ?? m.legenda ?? `Ousadia · ${m.ano}`}
                      inclina={i % 2 ? 2 : -2}
                    />
                  ) : (
                    <MediaSlot
                      label={m.fotoPendente ?? "Foto deste período."}
                      ratio="aspect-square"
                    />
                  )}

                  {fotos.length > 1 && (
                    <div className="mt-6 flex flex-wrap justify-center gap-2">
                      {fotos.map((f, fi) => (
                        <button
                          key={f.src}
                          type="button"
                          onClick={() => setFoto(fi)}
                          aria-label={`Ver foto ${fi + 1} de ${fotos.length}`}
                          aria-pressed={on && fi === foto}
                          className={`h-11 w-10 bg-white p-[3px] pb-[9px] shadow-sm ring-2 transition ${
                            on && fi === foto
                              ? "ring-amarelo"
                              : "ring-transparent opacity-70 hover:opacity-100"
                          }`}
                        >
                          <span className="relative block h-full w-full overflow-hidden">
                            <Image
                              src={f.src}
                              alt=""
                              fill
                              sizes="40px"
                              className="object-cover"
                              style={f.foco ? { objectPosition: f.foco } : undefined}
                            />
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </article>
            </div>
          );
        })}
      </div>

      {children && <div className="mt-12">{children}</div>}
    </div>
  );
}
