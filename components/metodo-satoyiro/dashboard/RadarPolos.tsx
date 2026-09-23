import type { Dimensao, ResultadoDimensao } from "@/lib/metodo-satoyiro/tipos";

const CX = 150;
const CY = 148;
const R = 100;
const ORDEM: Dimensao[] = ["EI", "SN", "TF", "JP"];
const N = ORDEM.length;

function pt(i: number, raio: number): [number, number] {
  const ang = -Math.PI / 2 + (i * 2 * Math.PI) / N;
  return [CX + raio * Math.cos(ang), CY + raio * Math.sin(ang)];
}

const ANEIS = [0.25, 0.5, 0.75, 1];

/** Radar dos 4 polos predominantes (um por dimensão do capítulo 4). */
export function RadarPolos({ dimensoes }: { dimensoes: ResultadoDimensao[] }) {
  const dims = ORDEM.map((d) => dimensoes.find((x) => x.dimensao === d)!);
  const area = dims.map((d, i) => pt(i, R * (d.pct / 100)).join(",")).join(" ");

  return (
    <svg
      viewBox="0 0 300 300"
      width="100%"
      className="mx-auto max-w-[280px]"
      role="img"
      aria-label={`Radar dos polos predominantes: ${dims.map((d) => `${d.letra} ${d.pct}%`).join(", ")}.`}
    >
      {ANEIS.map((f) => (
        <polygon
          key={f}
          points={dims.map((_, i) => pt(i, R * f).join(",")).join(" ")}
          fill="none"
          stroke="rgba(255,255,255,.12)"
          strokeWidth="1"
        />
      ))}

      {dims.map((d, i) => {
        const [x, y] = pt(i, R);
        return (
          <line
            key={d.dimensao}
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

      {dims.map((d, i) => {
        const [x, y] = pt(i, R * (d.pct / 100));
        return <circle key={d.dimensao} cx={x} cy={y} r="4" fill="var(--amarelo)" />;
      })}

      {dims.map((d, i) => {
        const [x, y] = pt(i, R + 26);
        return (
          <text
            key={d.dimensao}
            x={x}
            y={y}
            fontSize="13"
            fontWeight="700"
            fill="var(--foreground)"
            fontFamily="var(--font-mono)"
            textAnchor="middle"
            dominantBaseline="middle"
          >
            {d.letra}
          </text>
        );
      })}
    </svg>
  );
}
