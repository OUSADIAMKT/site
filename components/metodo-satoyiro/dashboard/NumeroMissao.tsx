import { Sparkles } from "lucide-react";
import type { BlocoMissao, NumeroMissao as TipoNumeroMissao } from "@/lib/metodo-satoyiro/numerologia";

export function NumeroMissao({
  numero,
  bloco,
}: {
  numero: TipoNumeroMissao;
  bloco: BlocoMissao;
}) {
  return (
    <div className="grid gap-8 md:grid-cols-[auto_1fr] md:items-start">
      <div className="flex shrink-0 flex-col items-center justify-center gap-2 rounded-2xl border border-amarelo/30 bg-amarelo/5 px-8 py-6 text-center md:w-40">
        <Sparkles size={20} className="text-amarelo" aria-hidden />
        <span className="font-display text-6xl leading-none text-amarelo">{numero}</span>
        <span className="font-mono text-[10px] uppercase tracking-widest text-cinza-ink">
          Número de missão
        </span>
      </div>

      <div>
        <h4 className="font-display text-xl">{bloco.titulo}</h4>
        <div className="mt-3 space-y-3">
          {bloco.paragrafos.map((p, i) => (
            <p key={i} className="text-body text-sm leading-relaxed">
              {p}
            </p>
          ))}
        </div>
      </div>
    </div>
  );
}
