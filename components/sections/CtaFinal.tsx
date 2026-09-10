import type { ReactNode } from "react";
import { ArrowRight } from "lucide-react";
import { Reveal } from "@/components/ui/Reveal";
import { WaveDivider } from "@/components/ui/WaveDivider";
import { Canoe, Paddle } from "@/components/ui/Motifs";

/**
 * Dobra final de conversão, reutilizada em todas as páginas internas.
 * `href` sempre termina em WhatsApp ou em formulário de aplicação (PRD, regra de ouro).
 */
export function CtaFinal({
  title,
  lead,
  ctaLabel,
  href,
  microcopy = "Você é redirecionado(a) pro WhatsApp. Falamos com você em até 1h útil.",
  waveColor = "var(--ink-deep)",
  secondary,
}: {
  title: ReactNode;
  lead?: ReactNode;
  ctaLabel: string;
  href: string;
  microcopy?: ReactNode;
  waveColor?: string;
  secondary?: ReactNode;
}) {
  return (
    <section className="relative overflow-hidden bg-roxo-700">
      <WaveDivider
        className="absolute inset-x-0 top-0 rotate-180"
        color={waveColor}
      />
      <Canoe className="motif motif-soft text-amarelo left-1/2 -translate-x-1/2 bottom-6 w-80" />
      <Paddle className="motif motif-soft text-floresta right-[10%] top-10 w-20 rotate-12 hidden md:block" />

      <div className="container-site relative section-padding text-center">
        <div
          className="absolute left-1/2 top-4 h-72 w-72 -translate-x-1/2 rounded-full bg-amarelo/20 blur-[120px]"
          aria-hidden
        />
        <Reveal>
          <h2 className="headline-section relative mx-auto max-w-2xl">{title}</h2>
          {lead && (
            <p className="text-body relative mx-auto mt-5 max-w-xl">{lead}</p>
          )}
          <div className="relative mt-9 flex flex-col justify-center gap-4 sm:flex-row">
            <a href={href} className="btn btn-primary">
              {ctaLabel} <ArrowRight size={16} />
            </a>
            {secondary}
          </div>
          {microcopy && (
            <p className="relative mt-5 font-mono text-xs text-cinza-ink">
              {microcopy}
            </p>
          )}
        </Reveal>
      </div>
    </section>
  );
}
