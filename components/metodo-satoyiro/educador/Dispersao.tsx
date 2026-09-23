import { CAP2_MATRIZ } from "@/lib/metodo-satoyiro/textos";

const CORES: Record<string, string> = {
  PROTAGONISTA: "var(--amarelo)",
  SONHADOR: "var(--floresta)",
  OCUPADO: "var(--rio)",
  EXPLORADOR: "#a89fbc",
};

/** Dispersão Clareza × Ação (capítulo "Meu caminho") — um ponto por aluno. */
export function Dispersao({
  pontos,
}: {
  pontos: { nome: string; categoria: string; x: number; y: number }[];
}) {
  const PAD = 24;
  const LADO = 260;

  return (
    <div>
      <p className="mb-3 font-mono text-[10px] uppercase tracking-widest text-cinza-ink">
        Dispersão · Clareza × Ação
      </p>
      <svg
        viewBox={`0 0 ${LADO + PAD * 2} ${LADO + PAD * 2}`}
        width="100%"
        className="max-w-[320px]"
        role="img"
        aria-label="Dispersão de alunos no eixo clareza por ação"
      >
        <rect
          x={PAD}
          y={PAD}
          width={LADO}
          height={LADO}
          fill="none"
          stroke="rgba(255,255,255,.15)"
        />
        <line
          x1={PAD + LADO / 2}
          y1={PAD}
          x2={PAD + LADO / 2}
          y2={PAD + LADO}
          stroke="rgba(255,255,255,.08)"
        />
        <line
          x1={PAD}
          y1={PAD + LADO / 2}
          x2={PAD + LADO}
          y2={PAD + LADO / 2}
          stroke="rgba(255,255,255,.08)"
        />

        {pontos.map((p, i) => (
          <circle
            key={`${p.nome}-${i}`}
            cx={PAD + p.x * LADO}
            cy={PAD + LADO - p.y * LADO}
            r={4}
            fill={CORES[p.categoria] ?? "#a89fbc"}
            opacity={0.85}
          >
            <title>{`${p.nome} · ${p.categoria}`}</title>
          </circle>
        ))}

        <text
          x={PAD + LADO / 2}
          y={PAD + LADO + 16}
          textAnchor="middle"
          fontSize="9"
          fill="var(--cinza-ink)"
          fontFamily="var(--font-mono)"
        >
          {CAP2_MATRIZ.eixoX.esquerda} → {CAP2_MATRIZ.eixoX.direita}
        </text>
        <text
          x={PAD - 8}
          y={PAD + LADO / 2}
          textAnchor="middle"
          fontSize="9"
          fill="var(--cinza-ink)"
          fontFamily="var(--font-mono)"
          transform={`rotate(-90, ${PAD - 8}, ${PAD + LADO / 2})`}
        >
          {CAP2_MATRIZ.eixoY.baixo} → {CAP2_MATRIZ.eixoY.alto}
        </text>
      </svg>
    </div>
  );
}
