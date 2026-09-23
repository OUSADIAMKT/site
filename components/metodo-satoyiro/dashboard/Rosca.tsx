type Fatia = { rotulo: string; valor: number; cor: string };

/** Rosca (donut) — distribuição das respostas por categoria em um capítulo. */
export function Rosca({ titulo, fatias }: { titulo: string; fatias: Fatia[] }) {
  const total = fatias.reduce((s, f) => s + f.valor, 0) || 1;
  const R = 58;
  const C = 2 * Math.PI * R;

  const arcos = fatias.reduce<{ offset: number; dash: number }[]>((acc, f) => {
    const offset = acc.length ? acc[acc.length - 1].offset + acc[acc.length - 1].dash : 0;
    acc.push({ offset, dash: (f.valor / total) * C });
    return acc;
  }, []);

  return (
    <div>
      <p className="mb-3 text-center font-mono text-[10px] uppercase tracking-widest text-cinza-ink">
        {titulo}
      </p>
      <svg
        viewBox="0 0 160 160"
        width="100%"
        className="mx-auto max-w-[170px]"
        role="img"
        aria-label={`${titulo}: ${fatias.map((f) => `${f.rotulo} ${f.valor}`).join(", ")}.`}
      >
        <g transform="translate(80,80) rotate(-90)">
          <circle r={R} fill="none" stroke="rgba(255,255,255,.08)" strokeWidth={20} />
          {fatias.map((f, idx) => (
            <circle
              key={f.rotulo}
              r={R}
              fill="none"
              stroke={f.cor}
              strokeWidth={20}
              strokeDasharray={`${arcos[idx].dash} ${C - arcos[idx].dash}`}
              strokeDashoffset={-arcos[idx].offset}
              className="transition-[stroke-dasharray] duration-700 ease-out"
            />
          ))}
        </g>
      </svg>
      <ul className="mt-3 space-y-1.5">
        {fatias.map((f) => (
          <li key={f.rotulo} className="flex items-center justify-between gap-3 text-xs">
            <span className="flex items-center gap-2 text-foreground/85">
              <span className="size-2.5 shrink-0 rounded-full" style={{ background: f.cor }} aria-hidden />
              {f.rotulo}
            </span>
            <span className="font-mono text-cinza-ink">{f.valor}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
