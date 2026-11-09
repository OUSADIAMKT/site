"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { ArrowRight, Check } from "lucide-react";

/**
 * "O problema" da home, em cenas em vez de parágrafos.
 * Cada dor vira uma mini tela de celular + a citação. O visitante marca as
 * que bateram; ao marcar, a explicação aparece. Com 2 ou mais, libera a frase
 * de fechamento e o caminho pro diagnóstico.
 */

type Dor = { t: string; d: string; cena: ReactNode };

const FRAME =
  "relative h-40 overflow-hidden rounded-xl border border-white/10 bg-ink-void/80";

/* 1 · Sem direção: bússola girando + tempo de tela */
function CenaCaminho() {
  return (
    <div className={`${FRAME} flex items-center justify-around px-4`}>
      <div className="text-center">
        <p className="font-mono text-[0.6rem] uppercase tracking-widest text-cinza-ink">
          Tempo em Reels hoje
        </p>
        <p className="font-display mt-1 text-4xl text-amarelo">8h12</p>
        <p className="font-mono mt-1 text-[0.6rem] uppercase tracking-widest text-cinza-ink">
          Posts publicados: 0
        </p>
      </div>
      <svg viewBox="0 0 100 100" className="size-24" aria-hidden>
        <circle cx="50" cy="50" r="44" fill="none" stroke="rgba(255,255,255,.18)" strokeWidth="2" />
        <circle cx="50" cy="50" r="38" fill="none" stroke="rgba(255,255,255,.08)" strokeWidth="1" strokeDasharray="2 5" />
        {["N", "L", "S", "O"].map((l, i) => (
          <text
            key={l}
            x={[50, 90, 50, 10][i]}
            y={[16, 53, 92, 53][i]}
            textAnchor="middle"
            fontSize="9"
            fill="rgba(255,255,255,.45)"
            fontFamily="monospace"
          >
            {l}
          </text>
        ))}
        <g className="dor-bussola">
          <polygon points="50,24 55,50 45,50" fill="#ffc61a" />
          <polygon points="50,76 55,50 45,50" fill="rgba(255,255,255,.3)" />
          <circle cx="50" cy="50" r="3" fill="#100a1c" stroke="#ffc61a" strokeWidth="1.5" />
        </g>
      </svg>
    </div>
  );
}

/* 2 · Posta e ninguém vê/compra: post com zeros e botão morto */
function CenaPost() {
  return (
    <div className={`${FRAME} flex items-center gap-4 px-4`}>
      <div className="flex-1 rounded-lg border border-white/10 bg-white/[0.03] p-3">
        <div className="flex items-center gap-2">
          <span className="size-7 rounded-full bg-gradient-to-br from-amarelo to-floresta" />
          <span className="space-y-1">
            <span className="block h-1.5 w-20 rounded bg-white/25" />
            <span className="block h-1.5 w-12 rounded bg-white/10" />
          </span>
        </div>
        <div className="mt-3 flex gap-4 font-mono text-[0.7rem] text-cinza-ink">
          <span>♡ 0</span>
          <span>💬 0</span>
          <span>↗ 0</span>
        </div>
        <p className="font-mono mt-2 text-[0.65rem] uppercase tracking-widest text-cinza-ink">
          12 visualizações
        </p>
      </div>
      <div className="w-[38%] text-center">
        <p className="font-mono text-[0.6rem] uppercase tracking-widest text-cinza-ink">
          Bio sem estratégia
        </p>
        <span className="mt-2 block rounded-full border border-dashed border-white/25 px-3 py-2 text-xs text-white/35 line-through decoration-amarelo/70">
          Quero comprar
        </span>
        <p className="font-display mt-2 text-xl text-amarelo">0 cliques</p>
      </div>
    </div>
  );
}

/* 3 · Trava na hora de gravar: câmera com REC e timer parado */
function CenaGravar() {
  return (
    <div className={`${FRAME} flex items-center justify-center`}>
      <div className="absolute left-6 right-14 top-3 flex items-center justify-between font-mono text-xs">
        <span className="flex items-center gap-2 text-red-400">
          <span className="dor-rec size-2.5 rounded-full bg-red-500" /> REC
        </span>
        <span className="text-white/80">00:00</span>
      </div>
      <svg viewBox="0 0 80 90" className="mt-3 h-24 opacity-60" aria-hidden>
        <circle cx="40" cy="30" r="17" fill="none" stroke="#fff" strokeWidth="2" strokeDasharray="3 4" />
        <path d="M8 88c0-20 14-30 32-30s32 10 32 30" fill="none" stroke="#fff" strokeWidth="2" strokeDasharray="3 4" />
      </svg>
      <span className="absolute bottom-3 rounded-full bg-black/60 px-3 py-1 text-[0.7rem] text-white/70">
        “...oi, gente... então... hmm”
      </span>
    </div>
  );
}

/* 4 · Todo mundo cresce, eu não: barras subindo vs. barra parada */
function CenaCrescer() {
  const pessoas = [
    { n: "@ela", h: 78 },
    { n: "@ele", h: 100 },
    { n: "@outra", h: 60 },
    { n: "você", h: 10, eu: true },
  ];
  return (
    <div className={`${FRAME} flex items-end justify-around px-6 pb-3 pt-4`}>
      {pessoas.map((p) => (
        <div key={p.n} className="flex w-14 flex-col items-center gap-1.5">
          <span
            className={`font-mono text-[0.6rem] ${p.eu ? "text-amarelo" : "text-floresta"}`}
          >
            {p.eu ? "+0" : `+${p.h * 12}`}
          </span>
          <span
            className={`w-full rounded-t ${p.eu ? "bg-amarelo/80" : "bg-floresta/70"}`}
            style={{ height: `${p.h * 0.7}px` }}
          />
          <span className="font-mono text-[0.6rem] text-cinza-ink">{p.n}</span>
        </div>
      ))}
    </div>
  );
}

const DORES: Dor[] = [
  {
    t: "“Eu sei que tenho potencial, mas não sei o caminho.”",
    d: "Conhecimento de sobra. Direção, zero. Você termina mais perdido do que começou.",
    cena: <CenaCaminho />,
  },
  {
    t: "“Posto e ninguém vê. Quando vê, ninguém compra.”",
    d: "Bio sem estratégia é igual currículo sem nome: ninguém entende quem você é, então ninguém aperta o botão.",
    cena: <CenaPost />,
  },
  {
    t: "“Trava na hora de gravar.”",
    d: "Você sabe o que falar. Mas quando a luz vermelha acende, vira outra pessoa. Isso tem técnica, não tem a ver com talento.",
    cena: <CenaGravar />,
  },
  {
    t: "“Vejo todo mundo crescendo, menos eu.”",
    d: "Esse “todo mundo” é uma curadoria do algoritmo. A maioria também tá perdida, só posta com mais cara de quem não tá.",
    cena: <CenaCrescer />,
  },
];

export function DorCenas() {
  const [marcadas, setMarcadas] = useState<number[]>([]);
  const toggle = (i: number) =>
    setMarcadas((m) => (m.includes(i) ? m.filter((x) => x !== i) : [...m, i]));
  const n = marcadas.length;

  return (
    <>
      <style>{`
        @keyframes dor-giro { 0%{transform:rotate(0)} 20%{transform:rotate(140deg)} 35%{transform:rotate(60deg)} 60%{transform:rotate(250deg)} 80%{transform:rotate(190deg)} 100%{transform:rotate(360deg)} }
        @keyframes dor-pisca { 0%,100%{opacity:1} 50%{opacity:.15} }
        .dor-bussola{transform-origin:50px 50px;animation:dor-giro 7s ease-in-out infinite}
        .dor-rec{animation:dor-pisca 1.1s steps(1) infinite}
        @media (prefers-reduced-motion: reduce){.dor-bussola,.dor-rec{animation:none}}
      `}</style>

      <p className="font-mono text-xs uppercase tracking-widest text-cinza-ink">
        Toque nas que são a sua cara
      </p>
      <div className="mt-4 grid gap-5 md:grid-cols-2">
        {DORES.map((d, i) => {
          const on = marcadas.includes(i);
          return (
            <button
              key={d.t}
              type="button"
              onClick={() => toggle(i)}
              aria-pressed={on}
              className={`card-surface group relative flex h-full flex-col p-4 text-left transition-all duration-300 ${
                on
                  ? "!border-amarelo/70 shadow-[0_0_0_1px_rgba(255,198,26,.35)]"
                  : "hover:-translate-y-0.5 hover:border-white/25"
              }`}
            >
              <span
                className={`absolute right-6 top-6 z-10 grid size-6 place-items-center rounded-full border text-ink-void transition-all ${
                  on
                    ? "border-amarelo bg-amarelo"
                    : "border-white/30 bg-ink-void/70 text-transparent"
                }`}
                aria-hidden
              >
                <Check className="size-3.5" strokeWidth={3} />
              </span>
              {d.cena}
              <h3 className="font-display mt-4 text-lg leading-snug text-amarelo">
                {d.t}
              </h3>
              <span
                className={`grid transition-all duration-300 ${
                  on ? "mt-2 grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
                }`}
              >
                <span className="text-body overflow-hidden text-[0.92rem]">
                  {d.d}
                </span>
              </span>
            </button>
          );
        })}
      </div>

      <div className="mt-8 border-l-2 border-floresta pl-5" aria-live="polite">
        <p className="font-mono text-xs uppercase tracking-widest text-cinza-ink">
          <span className="text-amarelo">{n}</span> de 4 bateram em você
        </p>
        {n >= 2 ? (
          <div className="mt-2">
            <p className="text-body max-w-2xl">
              Então continua rolando. A gente vai resolver, sem enrolação.
            </p>
            <Link
              href="/diagnostico"
              className="mt-3 inline-flex items-center gap-2 text-sm font-semibold text-floresta hover:underline"
            >
              Descobrir meu nível agora <ArrowRight className="size-4" />
            </Link>
          </div>
        ) : (
          <p className="text-body mt-2 max-w-2xl">
            Se bateu em pelo menos duas dessas, continua rolando. A gente vai
            resolver, sem enrolação.
          </p>
        )}
      </div>
    </>
  );
}
