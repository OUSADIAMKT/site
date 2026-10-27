"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { ArrowRight, Clock } from "lucide-react";

/**
 * Os 4 pilares da Ousadia como as 4 partes de uma sumaúma, a "mãe da floresta"
 * (seção "A virada" da home). Cada parte leva a um diagnóstico diferente:
 *
 * - Sapopemas (as raízes-parede, que eram batidas pra mandar recado longe) →
 *   Estratégia → Diagnóstico de Maturidade Digital.
 * - Tronco (cresce reto até romper o dossel e aguenta o vento lá de cima) →
 *   Desenvolvimento pessoal → Ouse Ser Você, o diagnóstico de autenticidade
 *   do Método Satoyiro.
 * - Flores e frutos (a flor abre à noite e vira fruto: hora de colher) →
 *   Criatividade → os dois caminhos de ganhar dinheiro lado a lado: Momento
 *   UGC e Diagnóstico de Social Media.
 * - Paina (a fibra que leva as sementes no vento) → IA → Diagnóstico de IA.
 *
 * A pessoa escolhe a frase que mais parece com ela (ou toca na árvore), a parte
 * acende no desenho e o painel ao lado recomenda o diagnóstico daquela parte.
 * A árvore é desenhada aqui mesmo, em SVG, pra herdar as cores da marca.
 * Feita pra dobra clara (`.fold-light`).
 */

type Pilar = {
  n: number;
  parte: string;
  t: string;
  dor: string;
  floresta: string;
  marketing: string;
  sinais: string[];
  leva: string;
  /** Um diagnóstico, ou dois lado a lado quando a parte tem dois caminhos. */
  diags: { nome: string; href: string; mede: string; tempo: string }[];
  cursos: { label: string; href: string }[];
};

const PILARES: Pilar[] = [
  {
    n: 1,
    parte: "As sapopemas",
    t: "Estratégia",
    dor: "Eu posto todo dia e não sei por que um post vende e o outro não.",
    floresta:
      "Sapopemas são as raízes em forma de parede que seguram a sumaúma de pé. Na mata, se batia nelas pra mandar recado: o som atravessa a floresta e é ouvido longe.",
    marketing:
      "Estratégia é a sua sapopema: posicionamento, público e funil. Ninguém vê, mas é ela que sustenta tudo e faz a sua mensagem ecoar até quem precisa ouvir.",
    sinais: [
      "Você não consegue explicar o que faz numa frase.",
      "Fala com todo mundo e ninguém compra.",
      "Cada semana o perfil parece de uma marca diferente.",
    ],
    leva: "Seu posicionamento numa frase: o seu Sinal",
    diags: [
      {
        nome: "Diagnóstico de Maturidade Digital",
        href: "/diagnostico",
        mede: "Mede posicionamento, conteúdo, influência, planejamento e performance, e te entrega um plano de 30 dias pro seu estágio.",
        tempo: "12 perguntas · uns 4 minutos",
      },
    ],
    cursos: [
      { label: "Mentoria", href: "/mentoria" },
      { label: "Posicionamento", href: "/escola/posicionamento" },
    ],
  },
  {
    n: 2,
    parte: "O tronco",
    t: "Desenvolvimento pessoal",
    dor: "Eu sei o conteúdo, mas travo quando a câmera liga.",
    floresta:
      "A sumaúma cresce reta até romper a copa das outras árvores e passar dos 50 metros. Lá em cima o vento bate mais forte, e é o tronco que aguenta sem vergar.",
    marketing:
      "O tronco é você, do jeito que você é. Aparecer é ficar exposto ao vento: comentário, crítica, vergonha. Quem sabe quem é não verga, porque não precisa fingir ser outra pessoa.",
    sinais: [
      "Você grava, apaga, grava de novo e não posta.",
      "Imita o jeito de falar de quem faz sucesso e não se reconhece.",
      "Acha que todo mundo vai te julgar.",
    ],
    leva: "Seu primeiro vídeo gravado sem travar",
    diags: [
      {
        nome: "Ouse Ser Você · Método Satoyiro",
        href: "/metodo-satoyiro",
        mede: "O diagnóstico de autenticidade: como você se vê, o caminho que está trilhando e a régua que usa pra medir sucesso. Você recebe um mapa com gráficos e recomendações.",
        tempo: "15 perguntas",
      },
    ],
    cursos: [{ label: "Destrave", href: "/escola/destrave" }],
  },
  {
    n: 3,
    parte: "As flores e os frutos",
    t: "Criatividade",
    dor: "Eu crio conteúdo, mas ainda não ganho dinheiro com ele.",
    floresta:
      "As flores da sumaúma abrem à noite e, mesmo no escuro, os morcegos encontram cada uma. Toda flor visitada vira fruto: uma cápsula comprida que amadurece pendurada lá no alto. É a hora da colheita.",
    marketing:
      "Criatividade é florescer do seu jeito, com a sua cara, o seu sotaque e o seu cenário. E flor que abre vira fruto: é aqui que o seu conteúdo começa a pagar as contas, criando pra marcas como UGC creator ou cuidando das redes de clientes como social media.",
    sinais: [
      "Seu conteúdo parece o de todo mundo, ou o de um guru de São Paulo.",
      "Não sabe quanto cobrar nem pra quem oferecer.",
      "Já fez conteúdo de graça pra marca em troca de “divulgação”.",
    ],
    leva: "Um portfólio pronto pra mostrar e o seu primeiro cliente",
    diags: [
      {
        nome: "Qual é o seu Momento UGC?",
        href: "/momento-ugc",
        mede: "Pra quem quer criar vídeos pra marcas: mostra em que momento você está e o que fazer agora pra fechar os primeiros trabalhos.",
        tempo: "Uns 4 minutos",
      },
      {
        nome: "Diagnóstico de Social Media",
        href: "/diagnostico/social-media",
        mede: "Pra quem quer cuidar das redes de clientes: mostra quanto falta pro seu primeiro trabalho pago.",
        tempo: "10 perguntas · uns 4 minutos",
      },
    ],
    cursos: [
      { label: "UGC Creator", href: "/escola/ugc-creator" },
      { label: "Social Media Ousado", href: "/escola/social-media-ousado" },
    ],
  },
  {
    n: 4,
    parte: "A paina",
    t: "Inteligência Artificial",
    dor: "IA parece coisa de programador, ou de quem quer tomar o meu lugar.",
    floresta:
      "Quando o fruto da sumaúma se abre, solta a paina: uma fibra leve feito algodão que leva as sementes no vento por quilômetros. A árvore não carrega semente por semente. Ela deixa o vento trabalhar.",
    marketing:
      "A IA é o seu vento: pauta, roteiro, legenda e análise em menos tempo, pra sua ideia chegar mais longe sem você virar refém da tela. Ferramenta, não buzzword.",
    sinais: [
      "Você abre o ChatGPT e não sabe o que pedir.",
      "Passa horas numa legenda que podia levar minutos.",
      "Tem medo de a IA deixar tudo com cara de robô.",
    ],
    leva: "Um fluxo de trabalho com IA, só com planos gratuitos",
    diags: [
      {
        nome: "Diagnóstico de IA",
        href: "/diagnostico/ia",
        mede: "Descobre o que você já consegue fazer com IA, o que te trava e por onde continuar.",
        tempo: "10 perguntas · uns 4 minutos",
      },
    ],
    cursos: [
      { label: "IA para iniciantes", href: "/escola/ia-para-iniciantes" },
    ],
  },
];

/** Onde fica o número de cada parte na ilustração (coordenadas do viewBox). */
const PONTOS: Record<number, [number, number]> = {
  1: [190, 590],
  2: [300, 340],
  3: [150, 100],
  4: [500, 238],
};

const ROXO = "#241044";
const ROXO_ESCURO = "#1d0c39";
const AMARELO = "#ffc61a";
const FLORESTA = "#23b26f";
const FLORESTA_FUNDA = "#128a52";
const RIO = "#18a5c9";

/** Flores na borda da copa: [x, y, raio]. */
const FLORES: [number, number, number][] = [
  [118, 150, 6],
  [160, 104, 5],
  [226, 82, 6],
  [300, 70, 5],
  [372, 80, 6],
  [438, 102, 5],
  [486, 146, 6],
  [196, 168, 4.5],
  [404, 170, 4.5],
  [262, 120, 4],
  [344, 118, 4],
];

/** A copa é desenhada redonda e esticada aqui: mais larga e mais baixa. */
const COPA = "translate(300 140) scale(1.16 0.82) translate(-300 -140)";
const naCopa = (x: number, y: number): [number, number] => [
  300 + (x - 300) * 1.16,
  140 + (y - 140) * 0.82,
];

/** Frutos pendurados embaixo da copa: [x, inclinação em graus]. */
const FRUTOS: [number, number][] = [
  [178, 6],
  [236, -4],
  [366, 5],
  [424, -6],
];

/** Sementes com paina soltas no vento: [x, y, raio, atraso da animação]. */
const SEMENTES: [number, number, number, number][] = [
  [552, 196, 8, 0],
  [584, 238, 7, 1.2],
  [522, 270, 6, 2.1],
  [574, 304, 8, 0.6],
  [536, 344, 5, 1.7],
  [70, 232, 6, 0.9],
];

function Sumauma({
  ativo,
  escolher,
  realcar,
}: {
  ativo: number | null;
  escolher: (n: number) => void;
  realcar: (n: number | null) => void;
}) {
  // Sem nada ativo, a árvore aparece inteira; com uma parte ativa, as outras recuam.
  const parte = (n: number) => ({
    onClick: () => escolher(n),
    onMouseEnter: () => realcar(n),
    onMouseLeave: () => realcar(null),
    className: "cursor-pointer",
    style: {
      opacity: ativo === null || ativo === n ? 1 : 0.25,
      transition: "opacity .35s ease",
    },
  });
  const on = (n: number) => ativo === n;

  return (
    <svg
      viewBox="40 40 560 610"
      className="h-auto w-full select-none"
      role="img"
      aria-labelledby="sumauma-titulo"
    >
      <title id="sumauma-titulo">
        Sumaúma com sapopemas, tronco, flores e paina: os quatro pilares da
        Ousadia.
      </title>
      <style>{`
        @keyframes sumauma-vento {
          0%, 100% { transform: translate(0, 0); }
          50% { transform: translate(10px, -8px); }
        }
        @keyframes sumauma-eco {
          0% { opacity: 0; transform: scale(.7); }
          35% { opacity: .9; }
          100% { opacity: 0; transform: scale(1.25); }
        }
        .sumauma-semente { animation: sumauma-vento 5s ease-in-out infinite; transform-box: fill-box; }
        .sumauma-eco { animation: sumauma-eco 2.4s ease-out infinite; transform-box: fill-box; transform-origin: right center; }
      `}</style>
      <defs>
        {/* Dossel e chão somem nas bordas, sem caixa recortada em volta. */}
        <linearGradient id="sumauma-dossel" x1="0" x2="1" y1="0" y2="0">
          <stop offset="0" stopColor={FLORESTA} stopOpacity="0" />
          <stop offset=".18" stopColor={FLORESTA} stopOpacity=".15" />
          <stop offset=".82" stopColor={FLORESTA} stopOpacity=".15" />
          <stop offset="1" stopColor={FLORESTA} stopOpacity="0" />
        </linearGradient>
        <linearGradient id="sumauma-chao" x1="0" x2="1" y1="0" y2="0">
          <stop offset="0" stopColor={FLORESTA_FUNDA} stopOpacity="0" />
          <stop offset=".25" stopColor={FLORESTA_FUNDA} stopOpacity=".16" />
          <stop offset=".75" stopColor={FLORESTA_FUNDA} stopOpacity=".16" />
          <stop offset="1" stopColor={FLORESTA_FUNDA} stopOpacity="0" />
        </linearGradient>
        <radialGradient id="sumauma-clareira" cx=".5" cy=".5" r=".5">
          <stop offset="0" stopColor={AMARELO} stopOpacity=".28" />
          <stop offset="1" stopColor={AMARELO} stopOpacity="0" />
        </radialGradient>
        <linearGradient id="sumauma-casca" x1="0" x2="1" y1="0" y2="0">
          <stop offset="0" stopColor={ROXO_ESCURO} />
          <stop offset=".45" stopColor="#3a1f66" />
          <stop offset="1" stopColor={ROXO_ESCURO} />
        </linearGradient>
      </defs>

      {/* Fundo: lua (as flores abrem à noite), clareira, dossel da mata e chão */}
      <circle cx="300" cy="150" r="200" fill="url(#sumauma-clareira)" />
      <circle cx="520" cy="86" r="26" fill={AMARELO} opacity=".3" />
      <path
        d="M40 470c20-30 44-40 70-30 14-34 54-40 76-14 20-26 56-26 74 0h80c18-28 58-30 78-4 22-24 60-20 74 10 26-14 54-4 68 22 14-8 28-6 40 4v190H40Z"
        fill="url(#sumauma-dossel)"
      />
      <rect x="40" y="606" width="560" height="44" fill="url(#sumauma-chao)" />

      {/* 4 · Paina: vento e sementes saindo da copa */}
      <g {...parte(4)}>
        <path
          d="M470 160c40 10 70 30 110 26M462 222c40 4 72 22 120 18M440 280c50 0 80 30 140 40M150 190c-30 6-50 20-80 22"
          fill="none"
          stroke={RIO}
          strokeWidth="2.5"
          strokeDasharray="6 8"
          strokeLinecap="round"
          opacity={on(4) ? 0.9 : 0.45}
        />
        {SEMENTES.map(([x, y, r, atraso]) => (
          <g
            key={`${x}-${y}`}
            className="sumauma-semente"
            style={{ animationDelay: `${atraso}s` }}
          >
            <circle
              cx={x}
              cy={y}
              r={r * 1.7}
              fill="#ffffff"
              stroke={on(4) ? AMARELO : ROXO}
              strokeOpacity={on(4) ? 1 : 0.25}
              strokeWidth="1.5"
            />
            <circle cx={x} cy={y} r={r * 1.1} fill="#ffffff" opacity=".9" />
            <circle cx={x} cy={y} r={r * 0.4} fill={ROXO} />
          </g>
        ))}
        {/* Fruto aberto num galho, de onde a paina escapa */}
        <ellipse
          cx="470"
          cy="176"
          rx="9"
          ry="16"
          transform="rotate(-30 470 176)"
          fill={on(4) ? AMARELO : FLORESTA_FUNDA}
          style={{ transition: "fill .35s ease" }}
        />
        <circle cx="478" cy="166" r="7" fill="#ffffff" />
      </g>

      {/* 2 · Tronco: sobe reto, por cima do dossel da mata */}
      <g {...parte(2)}>
        <path
          d="M268 560C278 440 284 330 286 196h28c2 134 8 244 18 364Z"
          fill="url(#sumauma-casca)"
        />
        <path
          d="M296 540c-2-60-1-140 0-220M306 500c1-50 0-110-1-170"
          fill="none"
          stroke={on(2) ? AMARELO : "#4a2a7a"}
          strokeWidth="2.5"
          strokeLinecap="round"
          style={{ transition: "stroke .35s ease" }}
        />
        {/* Galhos abrindo em guarda-chuva, como a copa da sumaúma */}
        <path
          d="M298 204C260 180 200 172 142 160M302 204c36-26 98-36 158-40M296 214c-30-34-66-58-104-74M304 214c26-36 60-60 104-76M300 200v-76"
          fill="none"
          stroke={ROXO}
          strokeWidth="9"
          strokeLinecap="round"
        />
      </g>

      {/* 1 · Sapopemas: as raízes-parede na base, com o eco das batidas */}
      <g {...parte(1)}>
        {/* Aletas de trás, mais escuras */}
        <path d="M276 470c-8 66-56 116-150 144h150Z" fill={ROXO_ESCURO} />
        <path d="M324 470c8 66 56 116 150 144H324Z" fill={ROXO_ESCURO} />
        {/* Aletas da frente, com a quina iluminada pra ler como parede */}
        {[
          "M282 500c-10 56-46 92-108 114h108Z",
          "M318 500c10 56 46 92 108 114H318Z",
          "M300 520c-6 44-20 70-44 94h88c-24-24-38-50-44-94Z",
        ].map((d) => (
          <path
            key={d}
            d={d}
            fill={on(1) ? "#4a2a7a" : ROXO}
            stroke={on(1) ? AMARELO : "#4a2a7a"}
            strokeWidth="2.5"
            strokeLinejoin="round"
            style={{ transition: "fill .35s ease, stroke .35s ease" }}
          />
        ))}
        {/* Eco: o recado batido na sapopema atravessando a mata */}
        {[0, 0.8, 1.6].map((atraso, i) => (
          <path
            key={atraso}
            className={on(1) ? "sumauma-eco" : undefined}
            style={on(1) ? { animationDelay: `${atraso}s` } : undefined}
            d={`M${112 - i * 20} ${560 - i * 10}c${-12 - i * 4} ${16 + i * 4} ${-12 - i * 4} ${36 + i * 8} 0 ${52 + i * 12}`}
            fill="none"
            stroke={on(1) ? AMARELO : ROXO}
            strokeOpacity={on(1) ? 1 : 0.18}
            strokeWidth="3"
            strokeLinecap="round"
          />
        ))}
      </g>

      {/* 3 · Copa e flores. A copa da sumaúma é larga e achatada, em guarda-chuva. */}
      <g {...parte(3)}>
        <g transform={COPA}>
          <path
            d="M96 168c-14-30 18-56 46-46 4-34 46-50 72-30 14-30 60-38 84-14 24-24 70-18 84 12 28-18 70-4 74 30 30-6 56 24 40 52-10 14-30 16-44 10-24 14-60 14-80 0-26 14-70 14-94 0-24 14-62 14-86 0-22 12-58 10-70-8-14 10-32 8-42-6Z"
            fill={FLORESTA_FUNDA}
          />
          <path
            d="M128 148c-4-20 20-34 38-24 10-24 44-30 62-12 16-20 50-22 66-4 18-18 52-16 64 6 22-12 52 0 54 22 22 2 34 22 22 38-16 4-40-2-52-10-22 10-54 10-74-2-22 12-56 12-76-2-22 12-52 10-68-6-16 8-34 2-36-6Z"
            fill={FLORESTA}
            opacity=".85"
          />
        </g>
        {FLORES.map(([fx, fy, r]) => {
          const [x, y] = naCopa(fx, fy);
          return (
            <g key={`${x}-${y}`}>
              {on(3) && (
                <circle
                  cx={x}
                  cy={y}
                  r={r * 2.4}
                  fill={AMARELO}
                  opacity=".35"
                />
              )}
              <circle
                cx={x}
                cy={y}
                r={on(3) ? r * 1.35 : r}
                fill={on(3) ? AMARELO : "#fff4d6"}
                stroke={ROXO}
                strokeOpacity=".3"
                strokeWidth="1"
                style={{ transition: "all .35s ease" }}
              />
            </g>
          );
        })}
        {/* Frutos: cápsulas compridas penduradas embaixo da copa */}
        {FRUTOS.map(([x, inclina]) => (
          <g key={x} transform={`rotate(${inclina} ${x} 176)`}>
            <path
              d={`M${x} 172v12`}
              stroke={ROXO}
              strokeWidth="2.5"
              strokeLinecap="round"
            />
            {on(3) && (
              <ellipse
                cx={x}
                cy="200"
                rx="13"
                ry="22"
                fill={AMARELO}
                opacity=".3"
              />
            )}
            <ellipse
              cx={x}
              cy="200"
              rx="7"
              ry="16"
              fill={on(3) ? AMARELO : "#8a6a2e"}
              stroke={ROXO}
              strokeOpacity=".35"
              strokeWidth="1.5"
              style={{ transition: "fill .35s ease" }}
            />
            <path
              d={`M${x} 188v24`}
              stroke={ROXO}
              strokeOpacity=".25"
              strokeWidth="1.2"
            />
          </g>
        ))}
      </g>

      {/* Números das partes */}
      {PILARES.map(({ n }) => {
        const [x, y] = PONTOS[n];
        const ligado = ativo === n;
        return (
          <g
            key={n}
            aria-hidden
            className="cursor-pointer"
            onClick={() => escolher(n)}
            onMouseEnter={() => realcar(n)}
            onMouseLeave={() => realcar(null)}
          >
            {ligado && (
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
              fill={ligado ? AMARELO : ROXO}
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
              fill={ligado ? ROXO : "#ffffff"}
            >
              {n}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

function Painel({ p }: { p: Pilar | null }) {
  if (!p) {
    return (
      <div className="card-surface p-6 md:p-8">
        <p className="font-mono text-[11px] uppercase tracking-widest text-floresta-deep">
          Por onde começar
        </p>
        <h3 className="font-display text-2xl mt-3">
          Uma árvore não seca inteira de uma vez.
        </h3>
        <p className="text-body mt-3 text-[0.95rem]">
          Começa por uma parte: a raiz que não segura, o tronco que verga, a
          flor que não vira fruto, a semente que não voa. Escolha ali em cima a
          frase que mais parece com você, ou toque numa parte da árvore, e a
          gente te mostra qual diagnóstico fazer primeiro.
        </p>
        <div className="mt-6 flex flex-wrap items-center gap-4">
          <Link href="/diagnostico" className="btn btn-primary">
            Fazer o diagnóstico completo <ArrowRight size={15} />
          </Link>
          <span className="inline-flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-wider text-[#7a6f88]">
            <Clock size={13} /> Gratuito · uns 4 minutos
          </span>
        </div>
      </div>
    );
  }

  return (
    <div
      key={p.n}
      className="card-surface animate-in fade-in slide-in-from-bottom-2 overflow-hidden duration-300"
    >
      <div className="p-6 md:p-8">
        <div className="flex items-center gap-3">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#ffc61a] font-mono text-sm font-bold text-[#241044]">
            {p.n}
          </span>
          <span className="font-mono text-[11px] uppercase tracking-widest text-floresta-deep">
            {p.parte}
          </span>
        </div>
        <h3 className="font-display text-2xl mt-4">{p.t}</h3>

        <div className="mt-5 grid gap-5 sm:grid-cols-2">
          <div>
            <p className="font-mono text-[11px] uppercase tracking-widest text-[#7a6f88]">
              Na floresta
            </p>
            <p className="mt-2 text-[0.95rem] italic leading-relaxed text-[#5d5470]">
              {p.floresta}
            </p>
          </div>
          <div>
            <p className="font-mono text-[11px] uppercase tracking-widest text-[#7a6f88]">
              No seu marketing
            </p>
            <p className="text-body mt-2 text-[0.95rem]">{p.marketing}</p>
          </div>
        </div>

        <p className="mt-6 font-mono text-[11px] uppercase tracking-widest text-[#7a6f88]">
          Sinais de que essa parte pede cuidado
        </p>
        <ul className="mt-2 space-y-1.5">
          {[p.dor, ...p.sinais].map((s) => (
            <li
              key={s}
              className="flex gap-2.5 text-[0.95rem] leading-snug text-[#241044]"
            >
              <span
                aria-hidden
                className="mt-[0.45rem] h-1.5 w-1.5 shrink-0 rounded-full bg-floresta"
              />
              {s}
            </li>
          ))}
        </ul>

        <p className="mt-6 border-l-2 border-floresta pl-3 font-mono text-[11px] uppercase leading-relaxed tracking-wide text-[#241044]">
          Você sai com · {p.leva}
        </p>
      </div>

      {/* Recomendação: o diagnóstico daquela parte da árvore */}
      <div className="bg-[#241044] p-6 text-white md:p-8">
        <p className="font-mono text-[11px] uppercase tracking-widest text-[#ffc61a]">
          {p.diags.length > 1
            ? "Hora de colher: escolha o seu caminho"
            : "Diagnóstico recomendado pra você"}
        </p>
        {p.diags.length > 1 ? (
          // Dois caminhos lado a lado, cada um com o seu diagnóstico.
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            {p.diags.map((d) => (
              <div
                key={d.href}
                className="flex flex-col rounded-xl border border-white/10 bg-white/5 p-5"
              >
                <p className="font-display text-lg">{d.nome}</p>
                <p className="mt-2 flex-1 text-[0.9rem] leading-relaxed text-[#cfc6e0]">
                  {d.mede}
                </p>
                <span className="mt-3 inline-flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-wider text-[#a89fbc]">
                  <Clock size={13} /> {d.tempo}
                </span>
                <Link href={d.href} className="btn btn-primary mt-4">
                  Fazer este diagnóstico <ArrowRight size={15} />
                </Link>
              </div>
            ))}
          </div>
        ) : (
          p.diags.map((d) => (
            <div key={d.href}>
              <p className="font-display text-xl mt-2">{d.nome}</p>
              <p className="mt-2 text-[0.95rem] leading-relaxed text-[#cfc6e0]">
                {d.mede}
              </p>
              <div className="mt-5 flex flex-wrap items-center gap-4">
                <Link href={d.href} className="btn btn-primary">
                  Fazer o diagnóstico gratuito <ArrowRight size={15} />
                </Link>
                <span className="inline-flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-wider text-[#a89fbc]">
                  <Clock size={13} /> {d.tempo}
                </span>
              </div>
            </div>
          ))
        )}
        <p className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-1 font-mono text-[11px] uppercase tracking-wider text-[#a89fbc]">
          Já sabe o que quer?
          {p.cursos.map((c) => (
            <Link
              key={c.href}
              href={c.href}
              className="inline-flex items-center gap-1 font-semibold text-[#58d3ec] transition-transform hover:translate-x-0.5"
            >
              {c.label} <ArrowRight size={12} />
            </Link>
          ))}
        </p>
      </div>
    </div>
  );
}

export function PilaresSumauma() {
  const [escolhido, setEscolhido] = useState<number | null>(null);
  const [realce, setRealce] = useState<number | null>(null);
  const ativo = realce ?? escolhido;
  const painel = useRef<HTMLDivElement>(null);
  const escolher = (n: number) =>
    setEscolhido((atual) => (atual === n ? null : n));

  // No celular o painel fica bem abaixo da árvore: quem toca no desenho é
  // levado até a recomendação, senão nem percebe que algo mudou.
  const escolherNaArvore = (n: number) => {
    const abrindo = escolhido !== n;
    escolher(n);
    if (abrindo && window.matchMedia("(max-width: 1023px)").matches) {
      setTimeout(
        () =>
          painel.current?.scrollIntoView({
            behavior: "smooth",
            block: "start",
          }),
        60,
      );
    }
  };

  return (
    <div className="grid gap-10 lg:grid-cols-[0.95fr_1.05fr] lg:items-start">
      <div className="mx-auto w-full max-w-[360px] sm:max-w-[440px] lg:sticky lg:top-24 lg:max-w-none">
        <Sumauma
          ativo={ativo}
          escolher={escolherNaArvore}
          realcar={setRealce}
        />
        <p className="mt-2 text-center font-mono text-[10px] uppercase tracking-widest text-[#7a6f88]">
          Toque numa parte da árvore
        </p>
      </div>

      <div>
        <p className="font-mono text-xs font-semibold uppercase tracking-widest text-[#241044]">
          Qual dessas frases parece mais com você?
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {PILARES.map((p) => {
            const on = escolhido === p.n;
            return (
              <button
                key={p.n}
                type="button"
                aria-pressed={on}
                onClick={() => escolher(p.n)}
                onMouseEnter={() => setRealce(p.n)}
                onMouseLeave={() => setRealce(null)}
                onFocus={() => setRealce(p.n)}
                onBlur={() => setRealce(null)}
                className={`group flex h-full flex-col gap-2 rounded-xl border bg-white p-4 text-left transition-[transform,box-shadow,border-color] duration-300 hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ffc61a] ${
                  on
                    ? "border-[#ffc61a] shadow-[0_10px_30px_-12px_rgba(36,16,68,.35)] ring-2 ring-[#ffc61a]"
                    : "border-[#241044]/10 shadow-[0_6px_20px_-14px_rgba(36,16,68,.35)]"
                }`}
              >
                <span className="flex items-center gap-2">
                  <span
                    className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full font-mono text-[11px] font-bold transition-colors ${
                      on
                        ? "bg-[#ffc61a] text-[#241044]"
                        : "bg-[#241044] text-white"
                    }`}
                  >
                    {p.n}
                  </span>
                  <span className="font-mono text-[10px] uppercase tracking-widest text-floresta-deep">
                    {p.parte} · {p.t}
                  </span>
                </span>
                <span className="text-[0.95rem] italic leading-snug text-[#241044]">
                  “{p.dor}”
                </span>
              </button>
            );
          })}
        </div>

        <div ref={painel} className="mt-6 scroll-mt-24" aria-live="polite">
          <Painel p={PILARES.find((p) => p.n === escolhido) ?? null} />
        </div>
      </div>
    </div>
  );
}
