"use client";

import type { Letra, PerguntaForcada } from "@/lib/metodo-satoyiro/tipos";

export function CardForcada({
  pergunta,
  inverter,
  selecionada,
  onResponder,
}: {
  pergunta: PerguntaForcada;
  /** Troca qual lado (A/B) aparece à esquerda — só varia a posição, não a pontuação. */
  inverter: boolean;
  selecionada: Letra | undefined;
  onResponder: (letra: Letra) => void;
}) {
  const lado = inverter ? [pergunta.b, pergunta.a] : [pergunta.a, pergunta.b];

  return (
    <div
      className="mt-7 grid gap-4 sm:grid-cols-2"
      role="radiogroup"
      aria-label="Escolha a frase que é mais você"
    >
      {lado.map((op) => {
        const sel = selecionada === op.letra;
        return (
          <button
            key={op.letra}
            type="button"
            role="radio"
            aria-checked={sel}
            onClick={() => onResponder(op.letra)}
            className={`rounded-xl border p-6 text-left text-base leading-relaxed transition-colors ${
              sel
                ? "border-amarelo bg-amarelo/10"
                : "border-border bg-white/[0.03] hover:border-amarelo/60 hover:bg-white/[0.06]"
            }`}
          >
            {op.texto}
          </button>
        );
      })}
    </div>
  );
}
