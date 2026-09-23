"use client";

import type { PerguntaEscolha } from "@/lib/metodo-satoyiro/tipos";

export function CardEscolha({
  pergunta,
  ordem,
  selecionadaIdx,
  onResponder,
}: {
  pergunta: PerguntaEscolha;
  ordem: number[];
  selecionadaIdx: number | undefined;
  onResponder: (idx: number) => void;
}) {
  return (
    <div
      className="mt-7 space-y-3"
      role="radiogroup"
      aria-label={pergunta.titulo}
    >
      {ordem.map((idx) => {
        const o = pergunta.opcoes[idx];
        const sel = selecionadaIdx === idx;
        return (
          <button
            key={idx}
            type="button"
            role="radio"
            aria-checked={sel}
            onClick={() => onResponder(idx)}
            className={`flex w-full items-start gap-4 rounded-xl border p-4 text-left text-base transition-colors ${
              sel
                ? "border-amarelo bg-amarelo/10"
                : "border-border bg-white/[0.03] hover:border-amarelo/60 hover:bg-white/[0.06]"
            }`}
          >
            <span
              className={`mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full border-2 ${
                sel ? "border-amarelo bg-amarelo" : "border-input"
              }`}
              aria-hidden
            >
              {sel && <span className="size-2 rounded-full bg-[#1a0b2e]" />}
            </span>
            <span className="leading-relaxed">{o.texto}</span>
          </button>
        );
      })}
    </div>
  );
}
