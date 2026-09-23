import { letrasDaDimensao } from "@/lib/metodo-satoyiro/calculo";
import { DIMENSAO_LABEL, LETRA_LABEL } from "@/lib/metodo-satoyiro/textos";
import type { ResultadoDimensao } from "@/lib/metodo-satoyiro/tipos";

/** Barras divergentes: pra qual lado de cada dimensão o aluno pende. */
export function BarrasDivergentes({ dimensoes }: { dimensoes: ResultadoDimensao[] }) {
  return (
    <div className="space-y-5">
      {dimensoes.map((d) => {
        const [a, b] = letrasDaDimensao(d.dimensao);
        const paraA = d.letra === a;
        const largura = d.pct / 2;

        return (
          <div key={d.dimensao}>
            <div className="mb-1.5 flex items-center justify-between font-mono text-[10px] uppercase tracking-widest text-cinza-ink">
              <span>{DIMENSAO_LABEL[d.dimensao]}</span>
              <span>{d.pct}%</span>
            </div>
            <div className="relative h-8 overflow-hidden rounded-lg bg-white/[0.05]">
              <div className="absolute inset-y-0 left-1/2 w-px bg-white/20" aria-hidden />
              <div
                className="absolute inset-y-0 rounded-lg bg-amarelo/80 transition-[width] duration-700 ease-out"
                style={
                  paraA
                    ? { right: "50%", width: `${largura}%` }
                    : { left: "50%", width: `${largura}%` }
                }
                aria-hidden
              />
            </div>
            <div className="mt-1 flex justify-between font-mono text-[10px] uppercase tracking-widest text-cinza-ink">
              <span className={paraA ? "text-amarelo" : undefined}>
                {LETRA_LABEL[a]} ({a})
              </span>
              <span className={!paraA ? "text-amarelo" : undefined}>
                {LETRA_LABEL[b]} ({b})
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
