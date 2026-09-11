import type { ReactNode } from "react";
import { Reveal } from "@/components/ui/Reveal";
import { Leaf, RiverLines } from "@/components/ui/Motifs";
import { KeneStrip } from "@/components/ui/graphics/Kene";

/** Hero padrão das páginas internas — mesmo ritmo escuro da dobra 1 da Home. */
export function PageHero({
  eyebrow,
  title,
  lead,
  children,
  motif = "leaf",
}: {
  eyebrow: string;
  title: ReactNode;
  lead?: ReactNode;
  children?: ReactNode;
  motif?: "leaf" | "river" | "none";
}) {
  return (
    <section className="relative overflow-hidden">
      <div className="absolute inset-0 grid-lines opacity-50" aria-hidden />
      <div
        className="absolute -top-24 right-0 h-80 w-80 rounded-full bg-amarelo/15 blur-[120px]"
        aria-hidden
      />
      {motif === "leaf" && (
        <Leaf className="motif motif-soft text-floresta -right-8 top-6 w-64 rotate-12 hidden md:block" />
      )}
      {motif === "river" && (
        <RiverLines className="motif motif-soft text-rio inset-x-0 bottom-0 h-32 w-full" />
      )}

      <div className="container-site relative section-padding">
        <Reveal>
          <p className="eyebrow mb-5">{eyebrow}</p>
        </Reveal>
        <Reveal delay={0.05}>
          <h1 className="font-display text-[clamp(2.1rem,5.5vw,4rem)] leading-[1.02] max-w-4xl">
            {title}
          </h1>
        </Reveal>
        {lead && (
          <Reveal delay={0.1}>
            <p className="text-body mt-6 max-w-2xl">{lead}</p>
          </Reveal>
        )}
        {children && (
          <Reveal delay={0.15}>
            <div className="mt-9">{children}</div>
          </Reveal>
        )}
      </div>
      <KeneStrip motif="iso" height={20} className="text-amarelo opacity-70" />
    </section>
  );
}
