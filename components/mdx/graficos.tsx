import type { ReactNode } from "react";

/* ------------------------------------------------------------------ *
 * Gráficos e painéis de número para os posts, no estilo de dashboard
 * (cartão com título, valor grande, barras com rótulo e fonte).
 *
 * Só HTML e SVG, sem JavaScript: renderiza no servidor e sobrevive ao export
 * estático. As cores vêm de `--chart-1` e `--chart-2`, definidas por tom de
 * seção em `globals.css`, então o mesmo gráfico serve em fundo escuro e claro.
 * ------------------------------------------------------------------ */

const num = (v: number) =>
  v.toLocaleString("pt-BR", {
    minimumFractionDigits: Number.isInteger(v) ? 0 : 1,
    maximumFractionDigits: 1,
  });

function Cartao({
  titulo,
  fonte,
  children,
}: {
  titulo: string;
  fonte?: string;
  children: ReactNode;
}) {
  return (
    <figure className="card-surface my-8 p-5 sm:p-6">
      <figcaption className="flex items-center gap-2 font-mono text-[0.7rem] uppercase tracking-widest text-amarelo">
        <span
          aria-hidden
          className="inline-block h-2.5 w-2.5 rounded-sm"
          style={{ background: "var(--chart-1)" }}
        />
        {titulo}
      </figcaption>
      <div className="mt-5">{children}</div>
      {fonte ? (
        <p className="mt-5 border-t border-border pt-3 font-mono text-[0.68rem] text-cinza-ink">
          Fonte: {fonte}
        </p>
      ) : null}
    </figure>
  );
}

/** Linha de cartões de indicador. Filhos: `<Kpi />`. */
export function Kpis({ children }: { children: ReactNode }) {
  return (
    <div className="my-8 grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-[repeat(auto-fit,minmax(9.5rem,1fr))]">
      {children}
    </div>
  );
}

export function Kpi({
  valor,
  rotulo,
  detalhe,
}: {
  /** Texto já formatado, ex.: "R$ 13,5 bi". */
  valor: string;
  rotulo: string;
  detalhe?: string;
}) {
  return (
    <div className="card-surface relative overflow-hidden p-4 pt-5 sm:p-5">
      <span
        aria-hidden
        className="absolute inset-x-0 top-0 h-1"
        style={{ background: "var(--chart-1)" }}
      />
      <p className="font-display text-[clamp(1.5rem,4.2vw,2.1rem)] leading-none text-foreground">
        {valor}
      </p>
      <p className="text-body mt-2 text-sm leading-snug">{rotulo}</p>
      {detalhe ? (
        <p className="mt-1 font-mono text-[0.68rem] text-cinza-ink">{detalhe}</p>
      ) : null}
    </div>
  );
}

type Barra = { rotulo: string; valor: number; alt?: boolean };

/** Barras horizontais, na ordem recebida. `alt` usa a segunda cor. */
export function GraficoBarras({
  titulo,
  dados,
  prefixo = "",
  sufixo = "",
  max,
  fonte,
}: {
  titulo: string;
  dados: Barra[];
  prefixo?: string;
  sufixo?: string;
  max?: number;
  fonte?: string;
}) {
  const teto = max ?? Math.max(...dados.map((d) => d.valor));
  return (
    <Cartao titulo={titulo} fonte={fonte}>
      <ul className="space-y-4">
        {dados.map((d) => (
          <li key={d.rotulo}>
            <div className="flex items-baseline justify-between gap-4 text-sm">
              <span className="text-body">{d.rotulo}</span>
              <span className="font-display text-base text-foreground">
                {prefixo}
                {num(d.valor)}
                {sufixo}
              </span>
            </div>
            <div className="mt-1.5 h-3 overflow-hidden rounded-full bg-foreground/10">
              <div
                className="h-full rounded-full"
                style={{
                  width: `${Math.min(100, (d.valor / teto) * 100)}%`,
                  background: d.alt ? "var(--chart-2)" : "var(--chart-1)",
                }}
              />
            </div>
          </li>
        ))}
      </ul>
    </Cartao>
  );
}

/** Rosca de um percentual (0 a 100) com o valor no centro. */
export function GraficoRosca({
  titulo,
  valor,
  rotulo,
  restante,
  fonte,
}: {
  titulo: string;
  valor: number;
  /** O que o pedaço colorido representa. */
  rotulo: string;
  /** O que o restante da rosca representa. */
  restante: string;
  fonte?: string;
}) {
  const r = 42;
  const c = 2 * Math.PI * r;
  return (
    <Cartao titulo={titulo} fonte={fonte}>
      <div className="flex flex-col items-center gap-6 sm:flex-row">
        <svg
          viewBox="0 0 100 100"
          className="h-40 w-40 shrink-0"
          role="img"
          aria-label={`${num(valor)}% ${rotulo}`}
        >
          <g transform="rotate(-90 50 50)">
            <circle
              cx="50"
              cy="50"
              r={r}
              fill="none"
              strokeWidth="13"
              stroke="var(--chart-2)"
              opacity="0.35"
            />
            <circle
              cx="50"
              cy="50"
              r={r}
              fill="none"
              strokeWidth="13"
              stroke="var(--chart-1)"
              strokeDasharray={`${(valor / 100) * c} ${c}`}
            />
          </g>
          <text
            x="50"
            y="50"
            textAnchor="middle"
            dominantBaseline="central"
            fill="currentColor"
            className="font-display text-foreground"
            style={{ fontSize: 17 }}
          >
            {num(valor)}%
          </text>
        </svg>
        <ul className="space-y-3 text-sm">
          <li className="flex items-center gap-3">
            <span
              aria-hidden
              className="h-3 w-3 shrink-0 rounded-sm"
              style={{ background: "var(--chart-1)" }}
            />
            <span className="text-body">{rotulo}</span>
          </li>
          <li className="flex items-center gap-3">
            <span
              aria-hidden
              className="h-3 w-3 shrink-0 rounded-sm"
              style={{ background: "var(--chart-2)", opacity: 0.45 }}
            />
            <span className="text-body">{restante}</span>
          </li>
        </ul>
      </div>
    </Cartao>
  );
}

/** Linha do tempo em cartões: cada marco tem ano, título e uma frase. */
export function Marcos({
  itens,
}: {
  itens: { ano: string; titulo: string; texto: string }[];
}) {
  return (
    <ol className="my-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {itens.map((m) => (
        <li key={m.ano} className="card-surface p-4">
          <p
            className="font-display text-2xl leading-none"
            style={{ color: "var(--chart-1)" }}
          >
            {m.ano}
          </p>
          <p className="mt-2 font-display text-base leading-snug text-foreground">
            {m.titulo}
          </p>
          <p className="text-body mt-1 text-sm leading-snug">{m.texto}</p>
        </li>
      ))}
    </ol>
  );
}

/** Pergunta que abre e fecha (HTML nativo, sem JavaScript). */
export function Duvida({
  pergunta,
  children,
}: {
  pergunta: string;
  children: ReactNode;
}) {
  return (
    <details className="card-surface group my-3 p-5">
      <summary className="cursor-pointer list-none font-display text-lg leading-snug text-foreground [&::-webkit-details-marker]:hidden">
        <span className="flex items-start justify-between gap-4">
          {pergunta}
          <span
            aria-hidden
            className="mt-0.5 font-mono text-xl text-amarelo transition-transform group-open:rotate-45"
          >
            +
          </span>
        </span>
      </summary>
      <div className="mt-3 [&>p:first-child]:mt-0">{children}</div>
    </details>
  );
}
