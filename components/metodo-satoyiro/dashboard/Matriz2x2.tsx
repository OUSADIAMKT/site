/** Matriz 2x2 genérica — um card por capítulo, com o quadrante do aluno destacado. */
export function Matriz2x2<C extends string>({
  titulo,
  eixoX,
  eixoY,
  pos,
  rotulos,
  destacado,
  cor = "var(--amarelo)",
}: {
  titulo: string;
  eixoX: { esquerda: string; direita: string };
  eixoY: { baixo: string; alto: string };
  pos: Record<C, { x: 0 | 1; y: 0 | 1 }>;
  rotulos: Record<C, string>;
  destacado: C;
  cor?: string;
}) {
  const categorias = Object.keys(pos) as C[];

  function celula(x: 0 | 1, y: 0 | 1) {
    const cat = categorias.find((c) => pos[c].x === x && pos[c].y === y);
    if (!cat) return <div key={`${x}-${y}`} />;
    const ativo = cat === destacado;
    return (
      <div
        key={cat}
        className={`flex min-h-20 items-center justify-center rounded-lg border p-3 text-center transition-colors ${
          ativo ? "" : "border-border bg-white/[0.03]"
        }`}
        style={
          ativo
            ? {
                borderColor: cor,
                borderWidth: 2,
                background: `color-mix(in oklab, ${cor} 14%, transparent)`,
              }
            : undefined
        }
      >
        <span
          className="font-mono text-[11px] font-semibold uppercase tracking-wider"
          style={{ color: ativo ? cor : "var(--cinza-ink)" }}
        >
          {rotulos[cat]}
        </span>
      </div>
    );
  }

  return (
    <div>
      <p className="mb-3 text-center font-mono text-[10px] uppercase tracking-widest text-cinza-ink">
        {titulo}
      </p>
      <p className="mb-1 text-center font-mono text-[9px] uppercase tracking-widest text-cinza-ink">
        ↑ {eixoY.alto}
      </p>
      <div className="grid grid-cols-2 gap-2">
        {celula(0, 1)}
        {celula(1, 1)}
        {celula(0, 0)}
        {celula(1, 0)}
      </div>
      <p className="mt-1 text-center font-mono text-[9px] uppercase tracking-widest text-cinza-ink">
        ↓ {eixoY.baixo}
      </p>
      <div className="mt-2 flex justify-between font-mono text-[9px] uppercase tracking-widest text-cinza-ink">
        <span>← {eixoX.esquerda}</span>
        <span>{eixoX.direita} →</span>
      </div>
    </div>
  );
}
