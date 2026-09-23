import { CircleHelp, Target, Zap } from "lucide-react";
import type { BlocoConfianca } from "@/lib/metodo-satoyiro/confianca";

/** 21 pontinhos agrupados em 3 semanas de 7 — só decorativo, reforça a duração do desafio. */
function TrilhaDias() {
  const semanas = [0, 1, 2];
  return (
    <div className="mt-5 space-y-2" aria-hidden>
      {semanas.map((semana) => (
        <div key={semana} className="flex gap-1.5">
          {Array.from({ length: 7 }, (_, dia) => (
            <span
              key={dia}
              className="size-2.5 rounded-full bg-amarelo/70"
              style={{ opacity: 0.35 + (semana * 7 + dia) * (0.65 / 20) }}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

/**
 * Seção de autoconfiança e autoestima: perguntas pra se questionar, um
 * desafio pra sustentar por 21 dias e atividades de impacto imediato.
 * Conteúdo vem de `CAP1_CONFIANCA` (capítulo "Como eu me vejo").
 */
export function DesafioConfianca({ bloco }: { bloco: BlocoConfianca }) {
  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <div className="rounded-xl border border-border bg-white/[0.03] p-6">
        <div className="flex items-center gap-2 text-amarelo">
          <CircleHelp size={18} aria-hidden />
          <p className="font-mono text-[10px] uppercase tracking-widest">Pergunte-se</p>
        </div>
        <ul className="mt-4 space-y-3">
          {bloco.perguntas.map((p) => (
            <li key={p} className="text-body text-sm leading-relaxed">
              {p}
            </li>
          ))}
        </ul>
      </div>

      <div className="rounded-xl border border-amarelo/30 bg-amarelo/5 p-6">
        <div className="flex items-center gap-2 text-amarelo">
          <Target size={18} aria-hidden />
          <p className="font-mono text-[10px] uppercase tracking-widest">Desafio de 21 dias</p>
        </div>
        <h4 className="font-display mt-3 text-lg text-foreground">{bloco.desafio.titulo}</h4>
        <p className="text-body mt-2 text-sm">{bloco.desafio.descricao}</p>
        <TrilhaDias />
      </div>

      <div className="rounded-xl border border-border bg-white/[0.03] p-6">
        <div className="flex items-center gap-2 text-floresta">
          <Zap size={18} aria-hidden />
          <p className="font-mono text-[10px] uppercase tracking-widest">Impacto imediato</p>
        </div>
        <ul className="mt-4 space-y-3">
          {bloco.atividades.map((a) => (
            <li key={a} className="text-body text-sm leading-relaxed">
              {a}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
