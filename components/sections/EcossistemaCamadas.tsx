import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  GraduationCap,
  Megaphone,
  Users,
  type LucideIcon,
} from "lucide-react";
import { Reveal } from "@/components/ui/Reveal";
import { Leaf } from "@/components/ui/Motifs";
import {
  KeneBullet,
  KeneField,
  KeneRule,
  KeneStrip,
} from "@/components/ui/graphics/Kene";

/**
 * O ecossistema da Ousadia em três camadas (proposta 2 de 27/10/2026): a
 * Comunidade é a base, a Escola fica no meio e a Agência no topo. A ilustração
 * só nomeia as camadas, sem nenhuma chamada dentro dela; as chamadas ficam nos
 * cards logo abaixo. Cada camada tem uma cor fixa da marca (amarelo, floresta,
 * rio) que se repete no desenho e no card, pra pessoa ligar um ao outro.
 */

type Camada = {
  id: string;
  n: string;
  nome: string;
  Icon: LucideIcon;
  cor: string;
  corEscura: string;
  para: string;
  itens: string[];
  nota: string;
  /** Foto no topo do card, de ponta a ponta. */
  foto?: { src: string; alt: string };
  links: { label: string; href: "/agencia" | "/escola" | "/mentoria" | "/comunidade" }[];
};

const CAMADAS: Camada[] = [
  {
    id: "agencia",
    n: "01",
    nome: "Agência",
    Icon: Megaphone,
    cor: "#ffc61a",
    corEscura: "#b98a00",
    para: "Para marcas que querem comunicar com alma e vender com método.",
    itens: [
      "Campanhas com creators",
      "Estratégia de conteúdo",
      "Posicionamento de marca",
      "UGC e influência local",
    ],
    nota: "Não fazemos “marketing bonito”. Fazemos marketing que vende.",
    links: [{ label: "Solicitar proposta", href: "/agencia" }],
  },
  {
    id: "escola",
    n: "02",
    nome: "Escola",
    Icon: GraduationCap,
    cor: "#23b26f",
    corEscura: "#128a52",
    para: "Para quem tá começando, profissionalizando ou quer acelerar.",
    itens: [
      "Social Media Ousado",
      "UGC Creator",
      "Destrave",
      "IA para Iniciantes",
    ],
    nota: "Você aprende executando, não anotando. Sai com projeto real, não com PDF salvo no celular.",
    // A turma com os certificados, com o Jackson no centro: a ousadia em pessoa.
    foto: {
      src: "/aulao-social-media/turma-certificados-1.webp",
      alt: "Turma da Escola Ousadia com os certificados na mão, com o Jackson e o time ao centro",
    },
    links: [{ label: "Ver cursos", href: "/escola" }],
  },
  {
    id: "comunidade",
    n: "03",
    nome: "Comunidade",
    Icon: Users,
    cor: "#18a5c9",
    corEscura: "#0e6f88",
    para: "Para quem quer estar onde as coisas acontecem antes de virarem tendência.",
    itens: [
      "Encontros presenciais e online",
      "Conteúdo exclusivo",
      "Networking real",
      "Bastidor do que a gente tá construindo",
    ],
    nota: "Creators da Amazônia: a base que sustenta tudo o que a Ousadia faz.",
    links: [{ label: "Quero entrar", href: "/comunidade" }],
  },
];

/* ---------- Ilustração ---------- */

/** Placa isométrica: face de cima (losango 2:1) + as duas laterais. */
function Placa({
  cx,
  cy,
  w,
  t,
  cor,
  corEscura,
  gid,
  p,
}: {
  p: string;
  cx: number;
  cy: number;
  w: number;
  t: number;
  cor: string;
  corEscura: string;
  gid: string;
}) {
  const h = w / 2;
  const topo = `${cx},${cy - h} ${cx + w},${cy} ${cx},${cy + h} ${cx - w},${cy}`;
  const esq = `${cx - w},${cy} ${cx},${cy + h} ${cx},${cy + h + t} ${cx - w},${cy + t}`;
  const dir = `${cx},${cy + h} ${cx + w},${cy} ${cx + w},${cy + t} ${cx},${cy + h + t}`;
  return (
    <g>
      <ellipse
        cx={cx}
        cy={cy + h * 0.55 + t}
        rx={w * 0.85}
        ry={h * 0.5}
        fill={cor}
        opacity={0.22}
        filter={`url(#${p}-blur)`}
      />
      <polygon points={esq} fill={corEscura} />
      <polygon points={dir} fill={corEscura} opacity={0.78} />
      <polygon points={topo} fill={`url(#${gid})`} />
      <polygon
        points={topo}
        fill={`url(#${p}-trama)`}
        opacity={0.5}
      />
      <polygon
        points={topo}
        fill="none"
        stroke="#ffffff"
        strokeOpacity={0.35}
        strokeWidth={1.5}
      />
    </g>
  );
}

function Rotulo({
  x,
  y,
  nome,
  Icon,
  size,
}: {
  x: number;
  y: number;
  nome: string;
  Icon: LucideIcon;
  size: number;
}) {
  const icone = size * 1.05;
  // Largura aproximada do texto (Chakra Petch em caixa alta ≈ 0,68 em por letra).
  const largura = nome.length * size * 0.68;
  const inicio = x - (largura + icone + 10) / 2;
  return (
    <g>
      <Icon
        x={inicio}
        y={y - icone * 0.82}
        width={icone}
        height={icone}
        color="#1d0c39"
        strokeWidth={2.4}
      />
      <text
        x={inicio + icone + 10}
        y={y}
        className="font-display"
        fontSize={size}
        fontWeight={700}
        letterSpacing={size * 0.06}
        fill="#1d0c39"
      >
        {nome.toUpperCase()}
      </text>
    </g>
  );
}

function Anotacao({
  x1,
  y,
  x2,
  cor,
  n,
  linha1,
  linha2,
}: {
  x1: number;
  y: number;
  x2: number;
  cor: string;
  n: string;
  linha1: string;
  linha2: string;
}) {
  return (
    <g>
      <line
        x1={x1}
        y1={y}
        x2={x2 - 8}
        y2={y}
        stroke={cor}
        strokeOpacity={0.7}
        strokeWidth={1.5}
        strokeDasharray="3 5"
      />
      <circle cx={x1} cy={y} r={4} fill={cor} />
      <text
        x={x2}
        y={y - 9}
        className="font-mono"
        fontSize={14}
        fontWeight={600}
        letterSpacing={2}
        fill={cor}
      >
        {n}
      </text>
      <text x={x2} y={y + 11} className="font-mono" fontSize={14} fill="#d9d2e8">
        {linha1}
      </text>
      <text x={x2} y={y + 28} className="font-mono" fontSize={14} fill="#d9d2e8">
        {linha2}
      </text>
    </g>
  );
}

/**
 * `compacta` = celular: sem as anotações laterais e com o enquadramento
 * fechado nas placas, senão o desenho fica pequeno e encostado à esquerda.
 * Cada variante tem ids próprios: as duas ficam no DOM (uma escondida) e
 * referências `url(#…)` repetidas quebrariam na que está visível.
 */
function IlustracaoCamadas({ compacta = false }: { compacta?: boolean }) {
  const [ag, es, co] = CAMADAS;
  const cx = 270;
  const p = compacta ? "eco-m" : "eco-d";
  return (
    <svg
      viewBox={compacta ? "30 55 480 460" : "0 0 720 520"}
      role="img"
      aria-labelledby={`${p}-titulo ${p}-desc`}
      className={`h-auto w-full overflow-visible ${compacta ? "sm:hidden" : "hidden sm:block"}`}
    >
      <title id={`${p}-titulo`}>O ecossistema Ousadia em três camadas</title>
      <desc id={`${p}-desc`}>
        Três placas empilhadas: Comunidade na base, Escola no meio e Agência no
        topo.
      </desc>
      <defs>
        <filter id={`${p}-blur`} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="18" />
        </filter>
        <pattern
          id={`${p}-trama`}
          width="14"
          height="7"
          patternUnits="userSpaceOnUse"
        >
          <path d="M0 3.5 L7 0 L14 3.5 L7 7 Z" fill="none" stroke="#ffffff" strokeOpacity="0.28" strokeWidth="0.8" />
        </pattern>
        {CAMADAS.map((c) => (
          <linearGradient key={c.id} id={`${p}-g-${c.id}`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#ffffff" stopOpacity="0.35" />
            <stop offset="0.35" stopColor={c.cor} />
            <stop offset="1" stopColor={c.cor} />
          </linearGradient>
        ))}
      </defs>

      {/* Fios que ligam as camadas: tudo é um só sistema. */}
      <g stroke="#ffffff" strokeOpacity={0.18} strokeWidth={1.5} strokeDasharray="2 6">
        <line x1={cx - 120} y1={140} x2={cx - 120} y2={420} />
        <line x1={cx + 120} y1={140} x2={cx + 120} y2={420} />
        <line x1={cx} y1={60} x2={cx} y2={470} />
      </g>

      {/* Base → topo, pra cada placa cobrir a de baixo. */}
      <Placa cx={cx} cy={380} w={230} t={30} cor={co.cor} corEscura={co.corEscura} gid={`${p}-g-comunidade`} p={p} />
      <Placa cx={cx} cy={252} w={175} t={28} cor={es.cor} corEscura={es.corEscura} gid={`${p}-g-escola`} p={p} />
      <Placa cx={cx} cy={132} w={120} t={26} cor={ag.cor} corEscura={ag.corEscura} gid={`${p}-g-agencia`} p={p} />

      <Rotulo x={cx} y={440} nome={co.nome} Icon={co.Icon} size={27} />
      <Rotulo x={cx} y={302} nome={es.nome} Icon={es.Icon} size={30} />
      <Rotulo x={cx} y={146} nome={ag.nome} Icon={ag.Icon} size={28} />

      {!compacta && <Anotacao x1={cx + 120} y={132} x2={548} cor={ag.cor} n="01 · TOPO" linha1="Para marcas" linha2="que querem vender" />}
      {!compacta && <Anotacao x1={cx + 175} y={252} x2={548} cor={es.cor} n="02 · MEIO" linha1="Para quem quer" linha2="aprender fazendo" />}
      {!compacta && <Anotacao x1={cx + 230} y={380} x2={548} cor={co.cor} n="03 · BASE" linha1="Para quem quer" linha2="crescer junto" />}
    </svg>
  );
}

/* ---------- Seção ---------- */

export function EcossistemaCamadas() {
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
        <div className="grid gap-10 lg:grid-cols-[1fr_1.15fr] lg:items-center">
          <Reveal>
            <div>
              <p className="eyebrow mb-4">O ecossistema</p>
              <h2 className="headline-section max-w-xl">
                Existe um caminho pra você na Ousadia.{" "}
                <span className="text-amarelo">Seja onde você estiver.</span>
              </h2>
              <p className="mt-6 font-display text-2xl leading-tight sm:text-3xl">
                <span className="text-amarelo">Agência</span>
                <span className="text-white/30"> · </span>
                <span className="text-floresta">Escola</span>
                <span className="text-white/30"> · </span>
                <span className="text-rio">Comunidade</span>
              </p>
              <KeneRule
                motif="pushu"
                height={10}
                opacity={0.3}
                className="mt-6 max-w-xs text-amarelo"
              />
              <p className="text-body mt-6 max-w-lg">
                Três camadas de um mesmo movimento. Tá começando do zero? Tem um
                lugar. Já tem público, mas não vende? Tem outro. Quer escalar a
                sua marca? Tem um terceiro. E todas se alimentam entre si.
              </p>
            </div>
          </Reveal>

          <Reveal delay={0.08}>
            <IlustracaoCamadas />
            <IlustracaoCamadas compacta />
          </Reveal>
        </div>

        <div className="mt-14 grid gap-6 md:grid-cols-3">
          {CAMADAS.map((c, i) => (
            <Reveal key={c.id} delay={i * 0.06}>
              <article
                className="card-surface relative flex h-full flex-col overflow-hidden p-7"
                style={{ borderTop: `3px solid ${c.cor}` }}
              >
                <div
                  className="pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full blur-3xl"
                  style={{ background: c.cor, opacity: 0.16 }}
                  aria-hidden
                />
                {c.foto && (
                  <Image
                    src={c.foto.src}
                    alt={c.foto.alt}
                    width={900}
                    height={600}
                    sizes="(min-width: 768px) 33vw, 100vw"
                    className="relative -mx-7 -mt-7 mb-6 aspect-[3/2] w-[calc(100%+3.5rem)] max-w-none object-cover"
                  />
                )}
                <div className="flex items-center justify-between">
                  <span
                    className="grid h-12 w-12 place-items-center rounded-xl"
                    style={{ background: c.cor, color: "#1d0c39" }}
                  >
                    <c.Icon size={24} strokeWidth={2.2} aria-hidden />
                  </span>
                  <span
                    className="font-mono text-xs font-semibold tracking-widest"
                    style={{ color: c.cor }}
                  >
                    {c.n}
                  </span>
                </div>
                <h3
                  className="mt-5 font-display text-2xl font-bold uppercase tracking-wide"
                  style={{ color: c.cor }}
                >
                  {c.nome}
                </h3>
                <p className="mt-2 text-[0.95rem] font-medium leading-snug text-foreground">
                  {c.para}
                </p>
                <ul className="mt-5 space-y-2">
                  {c.itens.map((it) => (
                    <li key={it} className="text-body flex items-start gap-2.5 text-sm">
                      <KeneBullet
                        mark="quadrado"
                        size={9}
                        className="mt-[0.42rem]"
                        style={{ color: c.cor }}
                      />
                      {it}
                    </li>
                  ))}
                </ul>
                <p className="text-body mt-5 border-t border-white/10 pt-5 text-sm">
                  {c.nota}
                </p>
                <div className="mt-auto flex flex-col gap-3 pt-6">
                  {c.links.map((l) => (
                    <Link
                      key={l.href}
                      href={l.href}
                      className="inline-flex items-center gap-2 self-start font-mono text-xs font-semibold uppercase tracking-wider transition-transform hover:translate-x-1"
                      style={{ color: c.cor }}
                    >
                      {l.label} <ArrowRight size={14} />
                    </Link>
                  ))}
                </div>
              </article>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
