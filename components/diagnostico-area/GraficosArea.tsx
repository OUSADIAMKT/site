import type { DiagnosticoArea, ResultadoArea } from "@/lib/diagnostico-area";

/**
 * Gráficos do resultado dos diagnósticos por área, em SVG puro (sem
 * biblioteca), no estilo de painel que o usuário pediu ("estilo Power BI"):
 * velocímetro da pontuação, radar das competências e barras você × média.
 * A média só chega aqui quando a planilha tem pelo menos `MINIMO_PARA_MEDIA`
 * respostas.
 */

const GRADE = "rgba(255,255,255,.12)";
const MEDIA = "rgba(255,255,255,.55)";

/* ------------------------------------------------------------------ *
 * Velocímetro: meia-lua com a faixa de cada nível e o ponteiro
 * ------------------------------------------------------------------ */

const GX = 120;
const GY = 118;
const GR = 92;

/** f de 0 a 1, da esquerda (0) pra direita (1), passando pelo topo. */
function ptGauge(f: number, r = GR): [number, number] {
  const ang = Math.PI * (1 - f);
  return [GX + r * Math.cos(ang), GY - r * Math.sin(ang)];
}

export function Velocimetro({
  cfg,
  res,
}: {
  cfg: DiagnosticoArea;
  res: ResultadoArea;
}) {
  const f = res.max ? res.total / res.max : 0;
  const faixas = cfg.niveis.map((n, k) => {
    const ini = n.min / res.max;
    const fim = k < cfg.niveis.length - 1 ? cfg.niveis[k + 1].min / res.max : 1;
    return { n, ini, fim };
  });
  const [px, py] = ptGauge(f, GR - 20);

  return (
    <svg
      viewBox="0 0 240 150"
      width="100%"
      className="mx-auto max-w-[320px]"
      role="img"
      aria-label={`Pontuação: ${res.total} de ${res.max}, nível ${res.nivel.nome}.`}
    >
      {faixas.map(({ n, ini, fim }) => {
        const [x1, y1] = ptGauge(ini);
        const [x2, y2] = ptGauge(fim);
        const ativa = n.id === res.nivel.id;
        return (
          <path
            key={n.id}
            d={`M ${x1} ${y1} A ${GR} ${GR} 0 0 1 ${x2} ${y2}`}
            fill="none"
            stroke={n.cor}
            strokeWidth={ativa ? 18 : 12}
            strokeOpacity={ativa ? 1 : 0.35}
          />
        );
      })}
      <line
        x1={GX}
        y1={GY}
        x2={px}
        y2={py}
        stroke="var(--foreground)"
        strokeWidth="3"
        strokeLinecap="round"
      />
      <circle cx={GX} cy={GY} r="6" fill="var(--foreground)" />
      <text
        x={GX}
        y={GY + 26}
        textAnchor="middle"
        fontSize="20"
        fontWeight="700"
        fill="var(--foreground)"
        fontFamily="var(--font-display)"
      >
        {res.total}
        <tspan fontSize="11" fill="var(--cinza-ink)" fontFamily="var(--font-body)">
          {" "}
          / {res.max}
        </tspan>
      </text>
    </svg>
  );
}

/** Legenda das faixas do velocímetro. */
export function LegendaNiveis({
  cfg,
  res,
}: {
  cfg: DiagnosticoArea;
  res: ResultadoArea;
}) {
  return (
    <ul className="mt-3 flex flex-wrap justify-center gap-x-4 gap-y-1.5">
      {cfg.niveis.map((n, k) => {
        const ate = k < cfg.niveis.length - 1 ? cfg.niveis[k + 1].min - 1 : res.max;
        const ativo = n.id === res.nivel.id;
        return (
          <li
            key={n.id}
            className={`flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-wider ${
              ativo ? "text-foreground" : "text-cinza-ink"
            }`}
          >
            <span
              className="size-2.5 rounded-full"
              style={{ background: n.cor, opacity: ativo ? 1 : 0.5 }}
              aria-hidden
            />
            {n.nome} ({n.min}–{ate})
          </li>
        );
      })}
    </ul>
  );
}

/* ------------------------------------------------------------------ *
 * Radar das competências (você e, se houver, a média)
 * ------------------------------------------------------------------ */

const RX = 150;
const RY = 140;
const RR = 92;
const ANEIS = [0.25, 0.5, 0.75, 1];

export function RadarArea({
  res,
  medias,
}: {
  res: ResultadoArea;
  medias?: Record<string, number> | null;
}) {
  const n = res.dims.length;
  const pt = (k: number, raio: number): [number, number] => {
    const ang = -Math.PI / 2 + (k * 2 * Math.PI) / n;
    return [RX + raio * Math.cos(ang), RY + raio * Math.sin(ang)];
  };
  const poly = (vals: number[]) =>
    vals.map((v, k) => pt(k, RR * (v / 100)).join(",")).join(" ");
  const voce = res.dims.map((d) => d.pct);
  const media = medias ? res.dims.map((d) => medias[d.key] ?? 0) : null;

  return (
    <svg
      viewBox="-75 0 450 280"
      width="100%"
      className="mx-auto max-w-[420px]"
      role="img"
      aria-label={`Competências: ${res.dims
        .map((d) => `${d.curto} ${d.pct}%`)
        .join(", ")}${
        media
          ? `. Média de quem já fez: ${res.dims
              .map((d, k) => `${d.curto} ${media[k]}%`)
              .join(", ")}`
          : ""
      }.`}
    >
      {ANEIS.map((f) => (
        <polygon
          key={f}
          points={res.dims.map((_, k) => pt(k, RR * f).join(",")).join(" ")}
          fill="none"
          stroke={GRADE}
          strokeWidth="1"
        />
      ))}
      {res.dims.map((d, k) => {
        const [x, y] = pt(k, RR);
        return (
          <line key={d.key} x1={RX} y1={RY} x2={x} y2={y} stroke={GRADE} strokeWidth="1" />
        );
      })}

      {media && (
        <polygon
          points={poly(media)}
          fill="none"
          stroke={MEDIA}
          strokeWidth="1.5"
          strokeDasharray="4 3"
          strokeLinejoin="round"
        />
      )}
      <polygon
        points={poly(voce)}
        fill="color-mix(in oklab, var(--amarelo) 22%, transparent)"
        stroke="var(--amarelo)"
        strokeWidth="2.5"
        strokeLinejoin="round"
      />
      {voce.map((v, k) => {
        const [x, y] = pt(k, RR * (v / 100));
        return <circle key={res.dims[k].key} cx={x} cy={y} r="4" fill="var(--amarelo)" />;
      })}

      {res.dims.map((d, k) => {
        const [x, y] = pt(k, RR + 22);
        const anchor = Math.abs(x - RX) < 4 ? "middle" : x > RX ? "start" : "end";
        return (
          <text
            key={d.key}
            x={anchor === "start" ? x - 10 : anchor === "end" ? x + 10 : x}
            y={y}
            fontSize="13"
            fontWeight="600"
            fill="var(--cinza-ink)"
            fontFamily="var(--font-body)"
            textAnchor={anchor}
            dominantBaseline="middle"
          >
            {d.curto} · {d.pct}%
          </text>
        );
      })}
    </svg>
  );
}

/* ------------------------------------------------------------------ *
 * Barras por competência: você × média
 * ------------------------------------------------------------------ */

export function BarrasArea({
  res,
  medias,
}: {
  res: ResultadoArea;
  medias?: Record<string, number> | null;
}) {
  return (
    <ul className="space-y-4">
      {res.dims.map((d) => {
        const m = medias?.[d.key];
        return (
          <li key={d.key}>
            <div className="flex items-baseline justify-between gap-4">
              <span className="font-display text-[0.95rem]">{d.nome}</span>
              <span className="font-mono text-sm text-amarelo">{d.pct}%</span>
            </div>
            <div className="mt-1.5 h-2.5 overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full rounded-full bg-amarelo"
                style={{ width: `${Math.max(d.pct, 3)}%` }}
              />
            </div>
            {m != null && (
              <div className="mt-1 flex items-center gap-3">
                <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/5">
                  <div
                    className="h-full rounded-full bg-white/45"
                    style={{ width: `${Math.max(m, 3)}%` }}
                  />
                </div>
                <span className="w-20 text-right font-mono text-[10px] text-cinza-ink">
                  média {m}%
                </span>
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
