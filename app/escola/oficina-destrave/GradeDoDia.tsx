import {
  BookOpen,
  CalendarCheck,
  Coffee,
  Compass,
  Fingerprint,
  HeartHandshake,
  PenLine,
  Smartphone,
  Sprout,
  Trophy,
  Users,
  UtensilsCrossed,
  Video,
  type LucideIcon,
} from "lucide-react";

/**
 * As 3 trilhas que cruzam o dia. "Autoconhecimento" é a parte terapêutica
 * (o que trava por dentro); a página não chama de terapia porque a oficina
 * não é atendimento terapêutico (ver FAQ "Isso é terapia?").
 */
export const TRILHAS = {
  conteudo: {
    nome: "Marketing de conteúdo",
    Icone: PenLine,
    cor: "text-amarelo border-amarelo/50 bg-amarelo/10",
  },
  redes: {
    nome: "Redes sociais",
    Icone: Smartphone,
    cor: "text-[#c5ccd6] border-[#c5ccd6]/50 bg-[#c5ccd6]/10",
  },
  auto: {
    nome: "Autoconhecimento",
    Icone: HeartHandshake,
    cor: "text-floresta border-floresta/60 bg-floresta/10",
  },
} as const;

export type TrilhaId = keyof typeof TRILHAS;

export type Atividade = {
  h: string;
  /** Rótulo pequeno acima do título (ex.: "Etapa 1"). */
  rotulo?: string;
  t: string;
  d?: string;
  Icone: LucideIcon;
  trilhas?: TrilhaId[];
  /** Pontos de quem entrega a atividade no grupo, no tempo dela. */
  pts?: number;
  /** Pausa e almoço: linha compacta. */
  pausa?: boolean;
};

/**
 * Grade do dia (Brasília). As descrições falam do resultado, não do exercício:
 * o passo a passo fica na apostila e no roteiro (`docs/oficina-destrave.md`).
 */
export const AGENDA: Atividade[] = [
  {
    h: "09h00",
    rotulo: "Abertura",
    t: "Conhecer a turma",
    d: "Você se apresenta, conhece a turma e olha o seu Instagram como se fosse a primeira vez.",
    Icone: Users,
    trilhas: ["auto", "redes"],
    pts: 10,
  },
  {
    h: "09h40",
    rotulo: "Etapa 1",
    t: "Descobrir o que você tem de especial",
    d: "Você descobre o que te faz diferente e aprende a dizer isso numa frase.",
    Icone: Fingerprint,
    trilhas: ["auto", "conteudo"],
    pts: 20,
  },
  { h: "11h00", t: "Pausa", Icone: Coffee, pausa: true },
  {
    h: "11h15",
    rotulo: "Etapa 2",
    t: "Descobrir quem vai comprar de você",
    d: "Você descobre quem é a pessoa que mais vai querer o seu produto.",
    Icone: Compass,
    trilhas: ["conteudo"],
    pts: 20,
  },
  {
    h: "12h30",
    rotulo: "Almoço + desafio",
    t: "Story “tô na Oficina Destrave”",
    d: "Poste um story contando que você está na oficina. O Jackson reposta os primeiros.",
    Icone: UtensilsCrossed,
    trilhas: ["redes"],
    pts: 15,
  },
  {
    h: "13h30",
    rotulo: "Etapa 3",
    t: "Achar as suas histórias",
    d: "Você descobre que tem muita história boa pra contar. E escolhe só o que quer mostrar.",
    Icone: BookOpen,
    trilhas: ["auto", "conteudo"],
    pts: 20,
  },
  {
    h: "15h00",
    rotulo: "Etapa 4",
    t: "Perder o medo da câmera",
    d: "Você grava do seu jeito, devagar, com a gente do lado. E deixa o seu perfil bonito.",
    Icone: Video,
    trilhas: ["auto", "redes"],
    pts: 25,
  },
  { h: "16h15", t: "Pausa", Icone: Coffee, pausa: true },
  {
    h: "16h30",
    rotulo: "Etapa 5",
    t: "Publicar o seu primeiro post",
    d: "Você publica o seu post junto com a turma e sai sabendo o que postar na semana.",
    Icone: CalendarCheck,
    trilhas: ["conteudo", "redes"],
    pts: 30,
  },
  {
    h: "17h45",
    rotulo: "Fechamento",
    t: "Os seus próximos passos",
    d: "Você olha tudo o que fez no dia e anota o que vem depois.",
    Icone: Sprout,
    trilhas: ["auto", "redes", "conteudo"],
    pts: 10,
  },
  {
    h: "19h00",
    rotulo: "Encerramento",
    t: "O placar final e o prêmio",
    Icone: Trophy,
  },
];

export const PONTOS_TOTAIS = AGENDA.reduce((s, a) => s + (a.pts ?? 0), 0);

function Trilha({ id }: { id: TrilhaId }) {
  const { nome, Icone, cor } = TRILHAS[id];
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 font-mono text-sm ${cor}`}
    >
      <Icone size={16} aria-hidden /> {nome}
    </span>
  );
}

/** Legenda das 3 trilhas, acima da grade. */
export function LegendaTrilhas() {
  return (
    <div className="flex flex-wrap gap-2">
      {(Object.keys(TRILHAS) as TrilhaId[]).map((id) => (
        <Trilha key={id} id={id} />
      ))}
    </div>
  );
}

/**
 * A grade em linha do tempo vertical: horário grande, ícone no fio, título,
 * o que acontece, as trilhas e os pontos. Pausas ficam numa linha compacta.
 */
export function GradeDoDia() {
  return (
    <ol className="relative">
      <span
        aria-hidden
        className="absolute left-[1.45rem] top-4 bottom-4 w-px bg-gradient-to-b from-floresta via-amarelo to-white/30 sm:left-[7.95rem]"
      />
      {AGENDA.map((a) => (
        <li key={a.h} className="relative flex gap-4 pb-5 sm:gap-6">
          <span className="hidden w-24 shrink-0 pt-2.5 text-right font-display text-2xl text-amarelo sm:block">
            {a.h}
          </span>
          <span
            className={`relative z-10 grid h-12 w-12 shrink-0 place-items-center rounded-full border-2 ${
              a.pausa
                ? "border-white/20 bg-ink-deep text-cinza-ink"
                : "border-amarelo bg-ink-deep text-amarelo shadow-[0_0_18px_-4px_rgba(57,255,136,.8)]"
            }`}
          >
            <a.Icone size={20} aria-hidden />
          </span>

          {a.pausa ? (
            <p className="pt-3 text-lg text-cinza-ink">
              <span className="font-display text-amarelo sm:hidden">
                {a.h} ·{" "}
              </span>
              {a.t}
            </p>
          ) : (
            <div className="card-surface min-w-0 flex-1 p-5 sm:p-6">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <p className="font-mono text-sm uppercase tracking-[0.16em] text-floresta">
                  <span className="font-display text-lg normal-case tracking-normal text-amarelo sm:hidden">
                    {a.h} ·{" "}
                  </span>
                  {a.rotulo}
                </p>
                {a.pts && (
                  <span className="rounded-full bg-amarelo px-3 py-1 font-mono text-sm font-bold text-ink-void">
                    +{a.pts} pts
                  </span>
                )}
              </div>
              <h3 className="font-display mt-2 text-xl leading-snug sm:text-2xl">
                {a.t}
              </h3>
              {a.d && (
                <p className="text-body mt-3 text-lg leading-relaxed">{a.d}</p>
              )}
              {a.trilhas && (
                <div className="mt-4 flex flex-wrap gap-2">
                  {a.trilhas.map((t) => (
                    <Trilha key={t} id={t} />
                  ))}
                </div>
              )}
            </div>
          )}
        </li>
      ))}
    </ol>
  );
}

/** O kit de gravação do prêmio (iluminação no tripé e microfone), no neon da página. */
export function KitGravacao({ className = "" }: { className?: string }) {
  const traco = {
    stroke: "#c5ccd6",
    strokeWidth: 4,
    strokeLinecap: "round" as const,
  };
  return (
    <svg viewBox="0 0 200 200" className={className} aria-hidden>
      <defs>
        <filter id="kit-brilho" x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur stdDeviation="6" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      {/* Iluminação */}
      <circle
        cx="80"
        cy="70"
        r="52"
        fill="none"
        stroke="#39ff88"
        strokeWidth="12"
        filter="url(#kit-brilho)"
      />
      <circle
        cx="80"
        cy="70"
        r="52"
        fill="none"
        stroke="#eafff2"
        strokeWidth="3"
      />
      {/* Celular */}
      <rect
        x="66"
        y="48"
        width="28"
        height="46"
        rx="5"
        fill="#0b0d12"
        stroke="#b56cff"
        strokeWidth="2.5"
      />
      <circle cx="80" cy="55" r="2.5" fill="#b56cff" />
      {/* Tripé */}
      <line x1="80" y1="122" x2="80" y2="176" {...traco} />
      <line x1="80" y1="176" x2="52" y2="196" {...traco} />
      <line x1="80" y1="176" x2="108" y2="196" {...traco} />
      <line x1="80" y1="176" x2="80" y2="197" {...traco} />
      {/* Microfone */}
      <rect
        x="152"
        y="112"
        width="22"
        height="38"
        rx="11"
        fill="#0b0d12"
        stroke="#b56cff"
        strokeWidth="3"
      />
      <path
        d="M146 136 a17 17 0 0 0 34 0"
        fill="none"
        stroke="#c5ccd6"
        strokeWidth="3"
      />
      <line x1="163" y1="153" x2="163" y2="190" {...traco} />
      <line x1="150" y1="192" x2="176" y2="192" {...traco} />
    </svg>
  );
}
