import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Reveal } from "@/components/ui/Reveal";
import { Leaf } from "@/components/ui/Motifs";
import { KeneField, KeneStrip } from "@/components/ui/graphics/Kene";

/** Plataforma Creators da Amazônia (marketplace de talentos), em outro projeto. */
const COMUNIDADE_URL = "https://comunidade.ousadiamarketing.com.br";

/**
 * O ecossistema da Ousadia como um mapa de linhas (opção 4 de 09/11/2026, no
 * lugar das placas empilhadas). Cada público embarca numa linha com a cor fixa
 * da sua frente (Agência amarelo, Escola floresta, Comunidade rio), e as três
 * correm juntas num trecho com as estações de baldeação, onde uma frente leva
 * pra outra.
 *
 * Toda estação precisa ser um produto ou uma etapa real: o Selo e os squads vêm
 * do modelo da Creators (D:\CLAUDE\creators\SPEC.md, seção 0). A linha amarela
 * não tem parada depois do trecho comum de propósito: "Campanha no ar" depois de
 * "Case vira aula" contaria a história de trás pra frente.
 *
 * O mapa tem duas versões no DOM: horizontal a partir de `lg` e vertical abaixo
 * disso (o horizontal encolhido deixa o texto com 7px). Cada uma usa ids
 * próprios. O conteúdo em texto está nos cards, que valem pra leitor de tela.
 */

const AM = "#ffc61a";
const VD = "#23b26f";
const AZ = "#18a5c9";
const FUNDO = "#100a1c";

type Linha = { cor: string; d: string; dur: string; begin: string };
type Rotulo = {
  x: number;
  y: number;
  t: string;
  anchor?: "start" | "middle" | "end";
  size?: number;
  cor?: string;
  bold?: boolean;
};
type Baldeacao = {
  x: number;
  y: number;
  w: number;
  h: number;
  /** Ponto de ancoragem do título; o subtítulo vai 18px abaixo. */
  tx: number;
  ty: number;
  anchor: "start" | "middle" | "end";
  t: string;
  s: string;
};

/* ---------- Mapa horizontal (lg+) ---------- */

const H_LINHAS: Linha[] = [
  { cor: AM, d: "M150 110 H340 L476 246 H900 L1036 110 H1150", dur: "11s", begin: "0s" },
  { cor: VD, d: "M150 260 H1150", dur: "9s", begin: "-3s" },
  { cor: AZ, d: "M150 410 H340 L476 274 H900 L1036 410 H1150", dur: "12s", begin: "-6s" },
];
const H_EMBARQUE = [
  { y: 110, cor: AM, t: "SOU MARCA" },
  { y: 260, cor: VD, t: "QUERO APRENDER" },
  { y: 410, cor: AZ, t: "QUERO SER CREATOR" },
];
const H_TERMINAIS: [number, number, string][] = [
  [150, 110, AM], [1150, 110, AM],
  [150, 260, VD], [1150, 260, VD],
  [150, 410, AZ], [1150, 410, AZ],
];
const H_ESTACOES: [number, number][] = [
  [210, 110], [300, 110],
  [220, 260], [310, 260], [1070, 260],
  [210, 410], [280, 410], [1070, 410],
];
const H_ROTULOS: Rotulo[] = [
  { x: 210, y: 86, t: "Primeira conversa" },
  { x: 306, y: 138, t: "Diagnóstico" },
  { x: 1150, y: 86, t: "Marca vendendo", cor: AM, bold: true },
  { x: 220, y: 236, t: "Aulão grátis" },
  { x: 310, y: 290, t: "Cursos" },
  { x: 310, y: 306, t: "Social Media · UGC · IA · Destrave", size: 10.5, cor: "#b9b0c9" },
  { x: 1070, y: 236, t: "Imersão de campo" },
  { x: 1150, y: 290, t: "Ofício na mão", cor: VD, bold: true },
  { x: 210, y: 438, t: "Cadastro grátis" },
  { x: 262, y: 386, t: "Perfil e portfólio" },
  { x: 1070, y: 386, t: "Avaliação" },
  { x: 1150, y: 438, t: "Renda e portfólio", cor: "#58d3ec", bold: true },
];
const H_BALDEACOES: Baldeacao[] = [
  { x: 548, y: 250, w: 24, h: 34, tx: 560, ty: 320, anchor: "middle", t: "SELO CREATORS", s: "Escola × Comunidade" },
  { x: 678, y: 236, w: 24, h: 48, tx: 690, ty: 204, anchor: "middle", t: "SQUAD DE CREATORS", s: "a campanha vai pro ar" },
  { x: 808, y: 236, w: 24, h: 34, tx: 820, ty: 320, anchor: "middle", t: "CASE VIRA AULA", s: "Agência × Escola" },
];

/* ---------- Mapa vertical (abaixo de lg) ---------- */

const V_LINHAS: Linha[] = [
  { cor: AM, d: "M70 64 V118 L186 234 V430 L70 546 V594", dur: "10s", begin: "0s" },
  { cor: VD, d: "M200 64 V594", dur: "8s", begin: "-3s" },
  { cor: AZ, d: "M330 64 V118 L214 234 V430 L330 546 V594", dur: "11s", begin: "-6s" },
];
const V_EMBARQUE = [
  { x: 70, cor: AM, t: "SOU MARCA" },
  { x: 200, cor: VD, t: "QUERO APRENDER" },
  { x: 330, cor: AZ, t: "QUERO SER CREATOR" },
];
const V_TERMINAIS: [number, number, string][] = [
  [70, 64, AM], [70, 594, AM],
  [200, 64, VD], [200, 594, VD],
  [330, 64, AZ], [330, 594, AZ],
];
const V_ROTULOS: Rotulo[] = [
  { x: 70, y: 620, t: "Marca vendendo", cor: AM, bold: true },
  { x: 200, y: 620, t: "Ofício na mão", cor: VD, bold: true },
  { x: 330, y: 620, t: "Renda e portfólio", cor: "#58d3ec", bold: true },
];
const V_BALDEACOES: Baldeacao[] = [
  { x: 190, y: 268, w: 34, h: 24, tx: 238, ty: 278, anchor: "start", t: "SELO CREATORS", s: "Escola × Comunidade" },
  { x: 176, y: 320, w: 48, h: 24, tx: 162, ty: 330, anchor: "end", t: "SQUAD DE CREATORS", s: "a campanha vai pro ar" },
  { x: 176, y: 372, w: 34, h: 24, tx: 238, ty: 382, anchor: "start", t: "CASE VIRA AULA", s: "Agência × Escola" },
];

/* ---------- Cards ---------- */

type Parada = { t: string; tipo?: "baldeacao" | "fim" };
type Destino =
  | { label: string; href: "/agencia" | "/escola" }
  | { label: string; href: string; externo: true };

const LINHAS: {
  id: string;
  cor: string;
  linha: string;
  publico: string;
  paradas: Parada[];
  cta: Destino;
  extra?: Destino;
}[] = [
  {
    id: "agencia",
    cor: AM,
    linha: "Linha amarela · Agência",
    publico: "Sou marca",
    paradas: [
      { t: "Primeira conversa" },
      { t: "Diagnóstico" },
      { t: "Squad de creators", tipo: "baldeacao" },
      { t: "Case vira aula", tipo: "baldeacao" },
      { t: "Marca vendendo", tipo: "fim" },
    ],
    cta: { label: "Solicitar proposta", href: "/agencia" },
    extra: {
      label: "Ou contrate um creator direto",
      href: `${COMUNIDADE_URL}/cadastro?perfil=empresa`,
      externo: true,
    },
  },
  {
    id: "escola",
    cor: VD,
    linha: "Linha verde · Escola",
    publico: "Quero aprender",
    paradas: [
      { t: "Aulão grátis" },
      { t: "Social Media Ousado, UGC Creator, IA para Iniciantes e Destrave" },
      { t: "Selo Creators", tipo: "baldeacao" },
      { t: "Squad de creators", tipo: "baldeacao" },
      { t: "Case vira aula", tipo: "baldeacao" },
      { t: "Imersão de campo" },
      { t: "Ofício na mão", tipo: "fim" },
    ],
    cta: { label: "Ver cursos", href: "/escola" },
  },
  {
    id: "comunidade",
    cor: AZ,
    linha: "Linha azul · Comunidade",
    publico: "Quero ser creator",
    paradas: [
      { t: "Cadastro grátis, sem cartão" },
      { t: "Perfil e portfólio na vitrine" },
      { t: "Selo Creators", tipo: "baldeacao" },
      { t: "Squad de creators", tipo: "baldeacao" },
      { t: "Avaliação das entregas" },
      { t: "Renda e portfólio", tipo: "fim" },
    ],
    cta: {
      label: "Criar perfil grátis",
      href: `${COMUNIDADE_URL}/cadastro?perfil=talento`,
      externo: true,
    },
  },
];

/* ---------- Peças do desenho ---------- */

function Trilhos({ linhas }: { linhas: Linha[] }) {
  return (
    <g fill="none" strokeWidth={9} strokeLinecap="round" strokeLinejoin="round">
      {linhas.map((l) => (
        <path key={l.d} d={l.d} stroke={l.cor} />
      ))}
    </g>
  );
}

/** Um ponto de luz correndo em cada linha. Some pra quem pede menos movimento. */
function Trens({ linhas, filtro }: { linhas: Linha[]; filtro: string }) {
  return (
    <g filter={`url(#${filtro})`} opacity={0.9} className="motion-reduce:hidden">
      {linhas.map((l) => (
        <circle key={l.d} r={6} fill="#fff">
          <animateMotion dur={l.dur} begin={l.begin} repeatCount="indefinite" path={l.d} />
        </circle>
      ))}
    </g>
  );
}

function Terminais({ pontos }: { pontos: [number, number, string][] }) {
  return (
    <g fill={FUNDO} strokeWidth={5}>
      {pontos.map(([x, y, cor]) => (
        <circle key={`${x}-${y}`} cx={x} cy={y} r={10} stroke={cor} />
      ))}
    </g>
  );
}

function Rotulos({ itens }: { itens: Rotulo[] }) {
  return (
    <g className="font-mono" textAnchor="middle">
      {itens.map((r) => (
        <text
          key={`${r.x}-${r.y}`}
          x={r.x}
          y={r.y}
          textAnchor={r.anchor}
          fontSize={r.size ?? 12.5}
          fontWeight={r.bold ? 700 : 400}
          fill={r.cor ?? "#e6e0f0"}
        >
          {r.t}
        </text>
      ))}
    </g>
  );
}

function Baldeacoes({ itens, titulo }: { itens: Baldeacao[]; titulo: number }) {
  return (
    <>
      <g fill="#fff" stroke={FUNDO} strokeWidth={3.5}>
        {itens.map((b) => (
          <rect key={b.t} x={b.x} y={b.y} width={b.w} height={b.h} rx={12} />
        ))}
      </g>
      {itens.map((b) => (
        <g key={b.t} textAnchor={b.anchor}>
          <text
            x={b.tx}
            y={b.ty}
            className="font-display"
            fontSize={titulo}
            fontWeight={700}
            letterSpacing={1}
            fill="#fff"
          >
            {b.t}
          </text>
          <text x={b.tx} y={b.ty + 18} className="font-mono" fontSize={11} fill="#b9b0c9">
            {b.s}
          </text>
        </g>
      ))}
    </>
  );
}

function Brilho({ id }: { id: string }) {
  return (
    <defs>
      <filter id={id} x="-100%" y="-100%" width="300%" height="300%">
        <feGaussianBlur stdDeviation="3" />
      </filter>
    </defs>
  );
}

function MapaHorizontal() {
  return (
    <svg
      viewBox="0 40 1240 440"
      role="img"
      aria-labelledby="eco-h-titulo eco-h-desc"
      className="hidden h-auto w-full overflow-visible lg:block"
    >
      <title id="eco-h-titulo">O ecossistema Ousadia como um mapa de linhas</title>
      <desc id="eco-h-desc">
        Três linhas que correm juntas no meio do mapa. A amarela, da Agência, é
        de quem é marca; a verde, da Escola, de quem quer aprender; a azul, da
        Comunidade, de quem quer ser creator. Elas se cruzam nas estações Selo
        Creators, Squad de creators e Case vira aula.
      </desc>
      <Brilho id="eco-h-brilho" />
      <Trilhos linhas={H_LINHAS} />
      <Trens linhas={H_LINHAS} filtro="eco-h-brilho" />

      <g className="font-mono" fontSize={10.5} fontWeight={700} letterSpacing={0.5} textAnchor="middle">
        {H_EMBARQUE.map((e) => (
          <g key={e.t}>
            <rect x={0} y={e.y - 14} width={136} height={28} rx={14} fill={e.cor} />
            <text x={68} y={e.y + 4} fill="#120a1e">
              {e.t}
            </text>
          </g>
        ))}
      </g>

      <Terminais pontos={H_TERMINAIS} />
      <g fill="#fff" stroke={FUNDO} strokeWidth={3}>
        {H_ESTACOES.map(([x, y]) => (
          <circle key={`${x}-${y}`} cx={x} cy={y} r={7} />
        ))}
      </g>
      <Rotulos itens={H_ROTULOS} />
      <Baldeacoes itens={H_BALDEACOES} titulo={16} />
    </svg>
  );
}

function MapaVertical() {
  return (
    <svg
      viewBox="0 0 400 632"
      role="img"
      aria-labelledby="eco-v-titulo eco-v-desc"
      className="mx-auto h-auto w-full max-w-md overflow-visible lg:hidden"
    >
      <title id="eco-v-titulo">O ecossistema Ousadia como um mapa de linhas</title>
      <desc id="eco-v-desc">
        Três linhas descem lado a lado: amarela da Agência, verde da Escola e
        azul da Comunidade. No meio elas correm juntas e se cruzam nas estações
        Selo Creators, Squad de creators e Case vira aula.
      </desc>
      <Brilho id="eco-v-brilho" />
      <Trilhos linhas={V_LINHAS} />
      <Trens linhas={V_LINHAS} filtro="eco-v-brilho" />

      <g className="font-mono" fontSize={10} fontWeight={700} letterSpacing={0.4} textAnchor="middle">
        {V_EMBARQUE.map((e) => (
          <g key={e.t}>
            <rect x={e.x - 58} y={18} width={116} height={26} rx={13} fill={e.cor} />
            <text x={e.x} y={35} fill="#120a1e">
              {e.t}
            </text>
          </g>
        ))}
      </g>

      <Terminais pontos={V_TERMINAIS} />
      <Rotulos itens={V_ROTULOS.map((r) => ({ ...r, size: 11 }))} />
      <Baldeacoes itens={V_BALDEACOES} titulo={13.5} />
    </svg>
  );
}

/* ---------- Seção ---------- */

const CLASSE_LINK =
  "inline-flex items-center gap-2 self-start font-mono text-xs font-semibold uppercase tracking-wider transition-transform hover:translate-x-1";

function LinkDestino({ d, className, cor }: { d: Destino; className: string; cor?: string }) {
  const conteudo = (
    <>
      {d.label} <ArrowRight size={14} aria-hidden />
    </>
  );
  return "externo" in d ? (
    <a href={d.href} target="_blank" rel="noopener noreferrer" className={className} style={{ color: cor }}>
      {conteudo}
    </a>
  ) : (
    <Link href={d.href} className={className} style={{ color: cor }}>
      {conteudo}
    </Link>
  );
}

export function EcossistemaLinhas() {
  return (
    <section
      id="ecossistema"
      className="relative overflow-hidden section-padding scroll-mt-20"
      style={{
        background:
          "radial-gradient(60% 50% at 85% 20%, rgba(255,198,26,0.14), transparent 70%), radial-gradient(55% 45% at 10% 85%, rgba(24,165,201,0.16), transparent 70%), radial-gradient(45% 40% at 55% 60%, rgba(35,178,111,0.12), transparent 70%), linear-gradient(180deg, var(--roxo-700) 0%, var(--roxo) 45%, var(--ink-deep) 100%)",
      }}
    >
      <KeneStrip
        motif="iso"
        height={18}
        className="absolute inset-x-0 top-0 text-amarelo opacity-60"
      />
      <KeneField motif="yapa" scale={96} opacity={0.025} className="text-white" />
      <Leaf className="motif motif-soft text-floresta -left-10 bottom-10 hidden w-56 -rotate-45 lg:block" />

      <div className="container-site relative">
        <Reveal>
          <div className="grid gap-6 lg:grid-cols-2 lg:items-end lg:gap-10">
            <div>
              <p className="eyebrow mb-4">O ecossistema</p>
              <h2 className="headline-section max-w-xl">
                Escolha a sua linha.{" "}
                <span className="text-amarelo">Todas se cruzam.</span>
              </h2>
            </div>
            <p className="text-body max-w-xl">
              Não tem porta errada. A marca embarca na linha amarela, quem quer
              aprender na verde e quem quer crescer junto na azul. Nas estações
              de baldeação, uma frente te leva pra outra.
            </p>
          </div>
        </Reveal>

        <Reveal delay={0.08} className="mt-10 lg:mt-12">
          <MapaHorizontal />
          <MapaVertical />
        </Reveal>

        <div className="mt-10 grid gap-6 md:grid-cols-3">
          {LINHAS.map((l, i) => (
            <Reveal key={l.id} delay={i * 0.06}>
              <article className="card-surface relative flex h-full flex-col p-6 sm:p-7">
                <span
                  aria-hidden
                  className="absolute inset-x-6 top-0 h-[5px] rounded-b sm:inset-x-7"
                  style={{ background: l.cor }}
                />
                <p
                  className="mt-2 font-mono text-xs font-semibold uppercase tracking-widest"
                  style={{ color: l.cor }}
                >
                  {l.linha}
                </p>
                <h3 className="mt-1 font-display text-2xl font-bold">{l.publico}</h3>

                <ol
                  className="mt-5 border-l-[3px] pl-1"
                  style={{ borderColor: l.cor }}
                  aria-label={`Paradas da ${l.linha.toLowerCase()}`}
                >
                  {l.paradas.map((p) => (
                    <li
                      key={p.t}
                      className={`relative pb-2.5 pl-4 text-sm leading-snug ${
                        p.tipo ? "font-semibold text-foreground" : "text-body"
                      }`}
                      style={p.tipo === "fim" ? { color: l.cor } : undefined}
                    >
                      <span
                        aria-hidden
                        className="absolute -left-[11px] top-[0.2rem] size-[11px] rounded-full border-[2.5px]"
                        style={
                          p.tipo === "baldeacao"
                            ? { background: "#fff", borderColor: "#fff" }
                            : { background: FUNDO, borderColor: l.cor }
                        }
                      />
                      {p.t}
                      {p.tipo === "baldeacao" && <span className="sr-only"> (baldeação)</span>}
                    </li>
                  ))}
                </ol>

                <div className="mt-auto flex flex-col gap-3 pt-6">
                  <LinkDestino d={l.cta} className={CLASSE_LINK} cor={l.cor} />
                  {l.extra && (
                    <LinkDestino
                      d={l.extra}
                      className={`${CLASSE_LINK} text-white/60 hover:text-white`}
                    />
                  )}
                </div>
              </article>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
