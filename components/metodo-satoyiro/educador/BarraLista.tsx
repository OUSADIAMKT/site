/** Lista de barras horizontais — distribuição de tipos, categorias, turmas… */
export function BarraLista({
  titulo,
  itens,
  cor = "var(--amarelo)",
}: {
  titulo: string;
  itens: { rotulo: string; total: number }[];
  cor?: string;
}) {
  const max = Math.max(1, ...itens.map((i) => i.total));

  return (
    <div>
      <p className="mb-3 font-mono text-[10px] uppercase tracking-widest text-cinza-ink">
        {titulo}
      </p>
      {itens.length === 0 && (
        <p className="text-sm text-cinza-ink">Sem dados ainda.</p>
      )}
      <ul className="space-y-2.5">
        {itens.map((item) => (
          <li key={item.rotulo}>
            <div className="mb-1 flex items-center justify-between gap-3 text-xs">
              <span className="text-foreground/85">{item.rotulo}</span>
              <span className="font-mono text-cinza-ink">{item.total}</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-white/8">
              <div
                className="h-full rounded-full transition-[width] duration-500 ease-out"
                style={{ width: `${(item.total / max) * 100}%`, background: cor }}
              />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
