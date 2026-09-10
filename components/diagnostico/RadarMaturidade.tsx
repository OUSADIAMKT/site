import { DIM_KEYS, DIM_MAX, DIMS, type DimResult } from "@/lib/diagnostico";

const CX = 150;
const CY = 148;
const R = 100;
const N = DIM_KEYS.length;

function pt(i: number, raio: number): [number, number] {
  const ang = -Math.PI / 2 + (i * 2 * Math.PI) / N;
  return [CX + raio * Math.cos(ang), CY + raio * Math.sin(ang)];
}

const ANEIS = [0.25, 0.5, 0.75, 1];

/** Radar das 5 dimensões. Traço claro sobre fundo escuro — o inverso do legado. */
export function RadarMaturidade({ dims }: { dims: DimResult[] }) {
  const score = new Map(dims.map((d) => [d.key, d.score]));
  const area = DIM_KEYS.map((k, i) =>
    pt(i, R * ((score.get(k) ?? 0) / DIM_MAX)).join(","),
  ).join(" ");

  return (
    <svg
      viewBox="0 0 300 300"
      width="100%"
      className="max-w-[300px]"
      role="img"
      aria-label={`Radar de maturidade: ${dims
        .map((d) => `${DIMS[d.key].label} ${d.score} de ${DIM_MAX}`)
        .join(", ")}.`}
    >
      {ANEIS.map((f) => (
        <polygon
          key={f}
          points={DIM_KEYS.map((_, i) => pt(i, R * f).join(",")).join(" ")}
          fill="none"
          stroke="rgba(255,255,255,.12)"
          strokeWidth="1"
        />
      ))}

      {DIM_KEYS.map((k, i) => {
        const [x, y] = pt(i, R);
        return (
          <line
            key={k}
            x1={CX}
            y1={CY}
            x2={x}
            y2={y}
            stroke="rgba(255,255,255,.12)"
            strokeWidth="1"
          />
        );
      })}

      <polygon
        points={area}
        fill="color-mix(in oklab, var(--amarelo) 20%, transparent)"
        stroke="var(--amarelo)"
        strokeWidth="2.5"
        strokeLinejoin="round"
      />

      {DIM_KEYS.map((k, i) => {
        const [x, y] = pt(i, R * ((score.get(k) ?? 0) / DIM_MAX));
        return <circle key={k} cx={x} cy={y} r="4" fill={DIMS[k].color} />;
      })}

      {DIM_KEYS.map((k, i) => {
        const [x, y] = pt(i, R + 24);
        return (
          <text
            key={k}
            x={x}
            y={y}
            fontSize="10"
            fontWeight="600"
            fill="var(--cinza-ink)"
            fontFamily="var(--font-body)"
            textAnchor="middle"
            dominantBaseline="middle"
          >
            {DIMS[k].short}
          </text>
        );
      })}
    </svg>
  );
}
