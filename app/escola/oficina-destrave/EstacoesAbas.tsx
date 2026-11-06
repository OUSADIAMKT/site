"use client";

import { useRef, useState, type KeyboardEvent } from "react";

export type Estacao = {
  n: string;
  /** Horário de início (Brasília). */
  h: string;
  pilar: string;
  t: string;
  /** A pergunta da vida que abre a estação (situação-desafio do Do Fio à Rede). */
  pergunta: string;
  /** O que muda pra ela nessa estação (resultado, não exercício). */
  d: string;
  leva: string;
};

/**
 * As 5 estações em abas, no mesmo desenho da linha do tempo de `/sobre`
 * (`components/sections/LinhaDoTempo.tsx`): fio vertical com as duas pontas,
 * um botão por estação e um cartão que troca de conteúdo sem mudar a altura
 * da página. Cores do tema neon.
 *
 * O cartão mostra a pergunta, o que muda e o que ela leva. Os exercícios
 * ficam na apostila: a página vende o resultado, o dia entrega o método.
 *
 * Todos os cartões ficam empilhados na mesma célula do grid e só o ativo
 * aparece: a caixa nasce com a altura do maior e o texto de todas as
 * estações continua no HTML, pro Google e pra quem navega sem JavaScript.
 */
export function EstacoesAbas({ estacoes }: { estacoes: Estacao[] }) {
  const [ativo, setAtivo] = useState(0);
  const abas = useRef<(HTMLButtonElement | null)[]>([]);

  // Setas, Home e End trocam de estação (padrão de abas da WAI-ARIA).
  function onKeyDown(e: KeyboardEvent, i: number) {
    const ultimo = estacoes.length - 1;
    const proximo =
      e.key === "ArrowRight"
        ? i === ultimo
          ? 0
          : i + 1
        : e.key === "ArrowLeft"
          ? i === 0
            ? ultimo
            : i - 1
          : e.key === "Home"
            ? 0
            : e.key === "End"
              ? ultimo
              : null;
    if (proximo === null) return;
    e.preventDefault();
    setAtivo(proximo);
    abas.current[proximo]?.focus();
  }

  return (
    <div className="relative mt-12 pl-7 sm:pl-9">
      {/* Fio neon vertical com as duas pontas, da abertura à Colheita. */}
      <span
        className="absolute left-[5px] top-3 bottom-3 w-px bg-gradient-to-b from-floresta via-amarelo to-white/40 shadow-[0_0_10px_rgba(57,255,136,.6)]"
        aria-hidden
      />
      <span
        className="absolute left-0 top-2 h-[11px] w-[11px] rounded-full bg-floresta shadow-[0_0_12px_rgba(181,108,255,.8)]"
        aria-hidden
      />
      <span
        className="absolute left-0 bottom-2 h-[11px] w-[11px] rounded-full bg-amarelo shadow-[0_0_12px_rgba(57,255,136,.8)]"
        aria-hidden
      />

      <div
        role="tablist"
        aria-label="Estações da Oficina Destrave"
        className="flex flex-wrap gap-2 pb-3"
      >
        {estacoes.map((e, i) => {
          const on = i === ativo;
          return (
            <button
              key={e.n}
              ref={(el) => {
                abas.current[i] = el;
              }}
              type="button"
              role="tab"
              id={`estacao-${i}`}
              aria-selected={on}
              aria-controls={`estacao-painel-${i}`}
              tabIndex={on ? 0 : -1}
              onClick={() => setAtivo(i)}
              onKeyDown={(ev) => onKeyDown(ev, i)}
              className={`shrink-0 rounded-full border-2 px-4 py-1.5 font-mono text-xs font-semibold tracking-wider transition-colors ${
                on
                  ? "border-amarelo bg-amarelo text-ink-void shadow-[0_0_18px_-4px_rgba(57,255,136,.8)]"
                  : "border-amarelo/50 text-foreground hover:bg-amarelo/10"
              }`}
            >
              {e.n} · {e.pilar}
            </button>
          );
        })}
      </div>

      <div className="mt-3 grid">
        {estacoes.map((e, i) => {
          const on = i === ativo;
          return (
            <div
              key={e.n}
              role="tabpanel"
              id={`estacao-painel-${i}`}
              aria-labelledby={`estacao-${i}`}
              inert={!on}
              className={`[grid-area:1/1] transition-opacity duration-300 ${
                on ? "opacity-100" : "invisible opacity-0"
              }`}
            >
              <article className="card-surface grid h-full gap-8 rounded-2xl p-6 sm:p-9 md:grid-cols-[1.2fr_1fr]">
                <div>
                  <span className="font-mono text-xs uppercase tracking-widest text-floresta">
                    Estação {e.n} · {e.pilar} · {e.h}
                  </span>
                  <h3 className="font-display mt-2 text-xl sm:text-2xl">
                    {e.t}
                  </h3>
                  <p className="mt-5 border-l-2 border-floresta/70 pl-4 font-display text-lg italic leading-snug text-foreground/90">
                    “{e.pergunta}”
                  </p>
                  <p className="text-body mt-5 text-base leading-relaxed">
                    {e.d}
                  </p>
                </div>

                <div className="flex flex-col justify-center">
                  <div className="rounded-xl border-2 border-amarelo/60 bg-amarelo/10 p-5 shadow-[0_0_24px_-10px_rgba(57,255,136,.8)]">
                    <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-amarelo">
                      Você sai com
                    </p>
                    <p className="font-display mt-2 text-xl leading-snug sm:text-2xl">
                      {e.leva}
                    </p>
                  </div>
                </div>
              </article>
            </div>
          );
        })}
      </div>
    </div>
  );
}
