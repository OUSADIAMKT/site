import Link from "next/link";
import type { Metadata } from "next";
import { ArrowRight } from "lucide-react";
import { Reveal } from "@/components/ui/Reveal";
import { Canoe, GrafismoBand, RiverLines } from "@/components/ui/Motifs";
import { wa } from "@/lib/site";

export const metadata: Metadata = {
  title: "Recebemos sua aplicação",
  description:
    "Sua aplicação chegou. Falamos com você em até 1h útil: atendimento humano, sem robô de funil.",
  robots: { index: false, follow: false },
};

export default function ObrigadoPage() {
  return (
    <section className="relative flex min-h-[70vh] items-center overflow-hidden">
      <div className="absolute inset-0 grid-lines opacity-50" aria-hidden />
      <RiverLines className="motif motif-soft text-rio inset-x-0 top-1/2 h-40 w-full" />
      <Canoe className="motif motif-soft text-amarelo left-1/2 bottom-10 w-72 -translate-x-1/2" />
      <div
        className="absolute left-1/2 top-1/4 h-80 w-80 -translate-x-1/2 rounded-full bg-floresta/20 blur-[120px]"
        aria-hidden
      />

      <div className="container-site relative section-padding max-w-2xl text-center">
        <Reveal>
          <p className="eyebrow mb-5">Aplicação recebida ✅</p>
          <h1 className="font-display text-[clamp(2rem,5vw,3.5rem)] leading-[1.05]">
            Recebido. Agora é <span className="text-amarelo">com a gente</span>.
          </h1>
          <p className="text-body mt-6">
            Sua aplicação chegou. Falamos com você em até 1h útil: atendimento
            humano, sem robô de funil.
          </p>
          <p className="text-body mt-8 font-mono text-xs uppercase tracking-wider">
            Não quer esperar? Adianta a conversa agora:
          </p>
          <div className="mt-5 flex flex-col justify-center gap-4 sm:flex-row">
            <a href={wa("home")} className="btn btn-primary">
              Continuar no WhatsApp <ArrowRight size={16} />
            </a>
            <Link href="/sobre" className="btn btn-secondary">
              Ver como a gente pensa
            </Link>
          </div>
        </Reveal>
      </div>
      <GrafismoBand
        color="#23b26f"
        height={20}
        className="absolute inset-x-0 bottom-0 opacity-70"
      />
    </section>
  );
}
