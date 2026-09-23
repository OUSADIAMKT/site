import {
  Clock,
  Compass,
  Eye,
  Feather,
  Flag,
  Gauge,
  Handshake,
  Map as MapIcon,
  Scale,
  Sparkles,
  Swords,
  Waves,
  type LucideIcon,
} from "lucide-react";
import { CAP1_TEXTO, CAP2_TEXTO, CAP3_TEXTO } from "@/lib/metodo-satoyiro/textos";
import type { Resultado } from "@/lib/metodo-satoyiro/tipos";

const ICONE: Record<string, LucideIcon> = {
  CONSCIENTE: Eye,
  AUTOCRITICO: Scale,
  DESCOBERTA: Compass,
  TRANQUILO: Waves,
  PROTAGONISTA: Flag,
  SONHADOR: Sparkles,
  EXPLORADOR: MapIcon,
  OCUPADO: Clock,
  AUTONOMO: Feather,
  ALINHADO: Handshake,
  CONFLITO: Swords,
  PRESSIONADO: Gauge,
};

function Kpi({
  eyebrow,
  valor,
  frase,
  Icone,
}: {
  eyebrow: string;
  valor: string;
  frase: string;
  Icone: LucideIcon;
}) {
  return (
    <div className="rounded-xl border border-border bg-white/[0.03] p-5">
      <div className="flex items-center justify-between gap-2">
        <p className="font-mono text-[10px] uppercase tracking-widest text-cinza-ink">
          {eyebrow}
        </p>
        <Icone size={18} className="text-amarelo" aria-hidden />
      </div>
      <p className="font-display mt-2 text-xl leading-snug">{valor}</p>
      <p className="text-body mt-1.5 text-xs leading-relaxed">{frase}</p>
    </div>
  );
}

export function KpiCards({ resultado: r }: { resultado: Resultado }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <Kpi
        eyebrow="Seu tipo"
        valor={`${r.mbti.tipo} · ${r.mbti.apelido}`}
        frase={`Grupo ${r.mbti.grupo.toLowerCase()}.`}
        Icone={Sparkles}
      />
      <Kpi
        eyebrow="Como me vejo"
        valor={r.cap1.rotulo}
        frase={CAP1_TEXTO[r.cap1.principal].resumo}
        Icone={ICONE[r.cap1.principal]}
      />
      <Kpi
        eyebrow="Meu caminho"
        valor={r.cap2.rotulo}
        frase={CAP2_TEXTO[r.cap2.principal].resumo}
        Icone={ICONE[r.cap2.principal]}
      />
      <Kpi
        eyebrow="Sucesso e expectativas"
        valor={r.cap3.rotulo}
        frase={CAP3_TEXTO[r.cap3.principal].resumo}
        Icone={ICONE[r.cap3.principal]}
      />
    </div>
  );
}
