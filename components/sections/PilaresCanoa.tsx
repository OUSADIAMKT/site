"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowRight } from "lucide-react";

/**
 * Os 4 pilares da Ousadia como as 4 partes de uma canoa (seção "A virada" da
 * home): o rumo é a estratégia, a pintura do casco é a criatividade, o motor
 * rabeta é a IA e o remo é o desenvolvimento pessoal.
 *
 * A canoa é desenhada aqui mesmo, em SVG, pra herdar as cores da marca e pra
 * cada parte acender sozinha quando o card correspondente recebe mouse ou foco.
 * Feita pra dobra clara (`.fold-light`).
 */

type Pilar = {
  n: number;
  parte: string;
  t: string;
  dor: string;
  faz: string;
  leva: string;
  onde: { label: string; href: string }[];
};

const PILARES: Pilar[] = [
  {
    n: 1,
    parte: "O rumo",
    t: "Estratégia",
    dor: "Você posta todo dia e não sabe por que um post vende e o outro não.",
    faz: "Posicionamento, público e funil antes de qualquer arte. Conteúdo com começo, meio e venda.",
    leva: "Seu posicionamento numa frase: o seu Sinal",
    onde: [
      { label: "Mentoria", href: "/mentoria" },
      { label: "Posicionamento", href: "/escola/posicionamento" },
    ],
  },
  {
    n: 2,
    parte: "A pintura do casco",
    t: "Criatividade",
    dor: "Seu conteúdo parece o de todo mundo, ou o de um guru de São Paulo.",
    faz: "Roteiro, gravação e edição com a sua cara, o seu sotaque e o seu cenário.",
    leva: "Um portfólio de vídeos gravados no celular",
    onde: [
      { label: "UGC Creator", href: "/escola/ugc-creator" },
      { label: "Social Media Ousado", href: "/escola/social-media-ousado" },
    ],
  },
  {
    n: 3,
    parte: "O motor rabeta",
    t: "Inteligência Artificial",
    dor: "IA parece coisa de programador, ou de quem quer tomar o seu lugar.",
    faz: "IA como assistente de pauta, roteiro, legenda e análise. Ferramenta, não buzzword.",
    leva: "Um fluxo de trabalho com IA, só com planos gratuitos",
    onde: [{ label: "IA para iniciantes", href: "/escola/ia-para-iniciantes" }],
  },
  {
    n: 4,
    parte: "O remo",
    t: "Desenvolvimento pessoal",
    dor: "Você sabe o conteúdo, mas trava quando a câmera liga.",
    faz: "Técnica pra vencer a vergonha de aparecer, sem precisar se forçar.",
    leva: "Seu primeiro vídeo gravado sem travar",
    onde: [{ label: "Destrave", href: "/escola/destrave" }],
  },
];

/** Onde fica o número de cada parte na ilustração (coordenadas do viewBox). */
const PONTOS: Record<number, [number, number]> = {
  1: [196, 150],
  2: [430, 300],
  3: [668, 156],
  4: [372, 118],
};

const ROXO = "#241044";
const AMARELO = "#ffc61a";
const FLORESTA = "#23b26f";
const RIO = "#18a5c9";

function Canoa({ ativo }: { ativo: number | null }) {
  // Sem nada ativo, a canoa aparece inteira; com uma parte ativa, as outras recuam.
  const parte = (n: number) => ({
    style: {
      opacity: ativo === null || ativo === n ? 1 : 0.28,
      transition: "opacity .35s ease",
    },
  });

  return (
    <svg
      viewBox="40 70 760 340"
      className="h-auto w-full"
      role="img"
      aria-labelledby="canoa-titulo"
    >
      <title id="canoa-titulo">
        Canoa amazônica com rumo, casco pintado com grafismo, motor rabeta e
        remo: os quatro pilares da Ousadia.
      </title>
      <defs>
        {/* Grafismo do casco: losangos e zigue-zague, no espírito do kené. */}
        <pattern
          id="canoa-kene"
          width="28"
          height="30"
          patternUnits="userSpaceOnUse"
        >
          <path
            d="M0 15 7 4l7 11 7 11 7-11"
            fill="none"
            stroke={AMARELO}
            strokeWidth="2.4"
          />
          <path d="M14 15l3.5-5 3.5 5-3.5 5z" fill={AMARELO} />
        </pattern>
        {/* Céu e rio somem nas bordas, sem caixa recortada em volta do desenho. */}
        <linearGradient id="canoa-fade-x" x1="0" x2="1" y1="0" y2="0">
          <stop offset="0" stopColor="#000" />
          <stop offset=".14" stopColor="#fff" />
          <stop offset=".86" stopColor="#fff" />
          <stop offset="1" stopColor="#000" />
        </linearGradient>
        <linearGradient id="canoa-fade-y" x1="0" x2="0" y1="0" y2="1">
          <stop offset=".7" stopColor="#fff" />
          <stop offset="1" stopColor="#000" />
        </linearGradient>
        <mask
          id="canoa-borda"
          maskUnits="userSpaceOnUse"
          x="40"
          y="70"
          width="760"
          height="340"
        >
          <rect
            x="40"
            y="70"
            width="760"
            height="340"
            fill="url(#canoa-fade-x)"
          />
        </mask>
        <mask
          id="canoa-borda-baixo"
          maskUnits="userSpaceOnUse"
          x="40"
          y="70"
          width="760"
          height="340"
        >
          <rect
            x="40"
            y="70"
            width="760"
            height="340"
            fill="url(#canoa-fade-y)"
          />
        </mask>
        <clipPath id="canoa-casco">
          <path d="M80 222c40 36 150 96 310 96s250-18 290-86C540 258 250 258 80 222Z" />
        </clipPath>
      </defs>

      <g mask="url(#canoa-borda)">
        <g mask="url(#canoa-borda-baixo)">
          {/* Céu: sol e floresta ao fundo */}
          <circle cx="560" cy="160" r="72" fill={AMARELO} opacity=".22" />
          <path
            d="M0 258c22-14 34-30 58-26 18-22 44-22 60-4 20-20 52-18 66 6 22-16 50-12 62 8 20-22 54-20 70 2 18-14 44-10 56 8 22-20 58-18 72 4 18-16 46-12 58 6 22-18 54-14 68 6 20-16 48-12 60 6 18-18 50-16 64 2 20-14 44-12 56 4v28H0Z"
            fill={FLORESTA}
            opacity=".2"
          />

          {/* Rio */}
          <rect
            x="0"
            y="270"
            width="800"
            height="150"
            fill={RIO}
            opacity=".1"
          />
        </g>
      </g>

      {/* 4 · Remo (atrás do casco, pá dentro d'água) */}
      <g {...parte(4)}>
        <path
          d="M352 132 452 334"
          stroke={ROXO}
          strokeWidth="7"
          strokeLinecap="round"
        />
        <path
          d="M338 132h30"
          stroke={ROXO}
          strokeWidth="7"
          strokeLinecap="round"
        />
        <path
          d="M440 308c14-6 30 0 38 24 8 26-2 50-16 54s-28-18-32-42 0-32 10-36Z"
          fill={ativo === 4 ? AMARELO : ROXO}
          style={{ transition: "fill .35s ease" }}
        />
      </g>

      {/* 3 · Motor rabeta: motor na popa e a rabeta comprida até a hélice */}
      <g {...parte(3)}>
        <path
          d="M640 214 770 318"
          stroke={ROXO}
          strokeWidth="6"
          strokeLinecap="round"
        />
        <ellipse
          cx="772"
          cy="306"
          rx="7"
          ry="16"
          fill={ativo === 3 ? AMARELO : ROXO}
        />
        <ellipse
          cx="772"
          cy="330"
          rx="7"
          ry="16"
          fill={ativo === 3 ? AMARELO : ROXO}
        />
        <path
          d="M612 196 540 176"
          stroke={ROXO}
          strokeWidth="5"
          strokeLinecap="round"
        />
        <rect
          x="604"
          y="180"
          width="66"
          height="44"
          rx="10"
          fill={ativo === 3 ? AMARELO : "#32155c"}
          stroke={ROXO}
          strokeWidth="3"
          style={{ transition: "fill .35s ease" }}
        />
        <path
          d="M618 194h38M618 206h38"
          stroke={ativo === 3 ? ROXO : AMARELO}
          strokeWidth="2.5"
          strokeLinecap="round"
        />
      </g>

      {/* 2 · Casco pintado com grafismo */}
      <g {...parte(2)}>
        <path
          d="M80 222c40 36 150 96 310 96s250-18 290-86C540 258 250 258 80 222Z"
          fill={ROXO}
        />
        <g clipPath="url(#canoa-casco)">
          <rect
            x="60"
            y="262"
            width="640"
            height="30"
            fill="url(#canoa-kene)"
            opacity={ativo === 2 ? 1 : 0.85}
          />
        </g>
        <path
          d="M80 222C250 258 540 258 680 232"
          fill="none"
          stroke={ativo === 2 ? AMARELO : "#4a2a7a"}
          strokeWidth="5"
          strokeLinecap="round"
          style={{ transition: "stroke .35s ease" }}
        />
      </g>

      {/* 1 · O rumo: mapa do rio aberto na proa */}
      <g {...parte(1)}>
        <g transform="rotate(-7 200 212)">
          <rect
            x="150"
            y="176"
            width="104"
            height="66"
            rx="4"
            fill="#ffffff"
            stroke={ROXO}
            strokeWidth="3"
          />
          <circle
            cx="150"
            cy="209"
            r="8"
            fill="#ffffff"
            stroke={ROXO}
            strokeWidth="3"
          />
          <circle
            cx="254"
            cy="209"
            r="8"
            fill="#ffffff"
            stroke={ROXO}
            strokeWidth="3"
          />
          <path
            d="M166 230c14-4 12-22 28-24s16 14 30 10 10-16 14-20"
            fill="none"
            stroke={ativo === 1 ? FLORESTA : RIO}
            strokeWidth="3"
            strokeDasharray="5 5"
            strokeLinecap="round"
          />
          <path
            d="M232 186l12 12M244 186l-12 12"
            stroke={ativo === 1 ? AMARELO : ROXO}
            strokeWidth="3.5"
            strokeLinecap="round"
          />
        </g>
      </g>

      {/* Água na frente do casco: a canoa afunda um pouco na linha d'água */}
      <g mask="url(#canoa-borda)">
        <g mask="url(#canoa-borda-baixo)">
          <path
            d="M0 300c40-8 80 8 120 0s80-8 120 0 80 8 120 0 80-8 120 0 80 8 120 0 80-8 120 0 80 8 80 0V420H0Z"
            fill={RIO}
            opacity=".18"
          />
          <path
            d="M40 346c30-6 60 6 90 0M300 360c30-6 60 6 90 0M560 350c30-6 60 6 90 0M180 392c30-6 60 6 90 0M480 398c30-6 60 6 90 0"
            fill="none"
            stroke={RIO}
            strokeWidth="2.5"
            strokeLinecap="round"
            opacity=".5"
          />
        </g>
      </g>

      {/* Números das partes */}
      {PILARES.map(({ n }) => {
        const [x, y] = PONTOS[n];
        const on = ativo === n;
        return (
          <g key={n} aria-hidden>
            {on && (
              <circle cx={x} cy={y} r="24" fill={AMARELO} opacity=".35">
                <animate
                  attributeName="r"
                  values="18;28;18"
                  dur="1.8s"
                  repeatCount="indefinite"
                />
              </circle>
            )}
            <circle
              cx={x}
              cy={y}
              r="17"
              fill={on ? AMARELO : ROXO}
              stroke="#ffffff"
              strokeWidth="3"
            />
            <text
              x={x}
              y={y + 6}
              textAnchor="middle"
              fontSize="17"
              fontWeight="700"
              fontFamily="ui-monospace, monospace"
              fill={on ? ROXO : "#ffffff"}
            >
              {n}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

function CardPilar({
  p,
  ativo,
  setAtivo,
}: {
  p: Pilar;
  ativo: number | null;
  setAtivo: (n: number | null) => void;
}) {
  const on = ativo === p.n;
  return (
    <article
      onMouseEnter={() => setAtivo(p.n)}
      onMouseLeave={() => setAtivo(null)}
      onFocus={() => setAtivo(p.n)}
      onBlur={() => setAtivo(null)}
      className={`card-surface h-full p-6 transition-[transform,box-shadow] duration-300 ${
        on ? "-translate-y-1 ring-2 ring-[#ffc61a]" : ""
      }`}
    >
      <div className="flex items-center gap-3">
        <span
          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full font-mono text-sm font-bold transition-colors ${
            on ? "bg-[#ffc61a] text-[#241044]" : "bg-[#241044] text-white"
          }`}
        >
          {p.n}
        </span>
        <span className="font-mono text-[11px] uppercase tracking-widest text-floresta-deep">
          {p.parte}
        </span>
      </div>
      <h3 className="font-display text-xl mt-4">{p.t}</h3>
      <p className="mt-3 text-[0.95rem] italic text-[#7a6f88]">“{p.dor}”</p>
      <p className="text-body mt-3 text-[0.95rem]">{p.faz}</p>
      <p className="mt-4 border-l-2 border-floresta pl-3 font-mono text-[11px] uppercase leading-relaxed tracking-wide text-[#241044]">
        Você sai com · {p.leva}
      </p>
      <p className="mt-4 flex flex-wrap gap-x-4 gap-y-1">
        {p.onde.map((o) => (
          <Link
            key={o.href}
            href={o.href}
            className="inline-flex items-center gap-1.5 font-mono text-xs font-semibold uppercase tracking-wider text-floresta-deep transition-transform hover:translate-x-0.5"
          >
            {o.label} <ArrowRight size={13} />
          </Link>
        ))}
      </p>
    </article>
  );
}

export function PilaresCanoa() {
  const [ativo, setAtivo] = useState<number | null>(null);
  const card = (n: number) => (
    <CardPilar key={n} p={PILARES[n - 1]} ativo={ativo} setAtivo={setAtivo} />
  );

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_1.35fr_1fr] lg:items-center">
      {/* No celular a canoa vem primeiro; no desktop fica no meio dos cards. */}
      <div className="lg:order-2">
        <Canoa ativo={ativo} />
      </div>
      <div className="grid gap-6 sm:grid-cols-2 lg:order-1 lg:grid-cols-1">
        {card(1)}
        {card(2)}
      </div>
      <div className="grid gap-6 sm:grid-cols-2 lg:order-3 lg:grid-cols-1">
        {card(3)}
        {card(4)}
      </div>
    </div>
  );
}
