import type { ReactNode } from "react";
import { KeneStrip } from "@/components/ui/graphics/Kene";

const FORMATO = new Intl.DateTimeFormat("pt-BR", {
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});

/**
 * Casca das páginas legais (Privacidade e Termos). O texto vem como `children`
 * e é estilizado por `.texto-legal` em `app/globals.css`.
 */
export function LegalPage({
  title,
  atualizado,
  children,
}: {
  title: string;
  /** Data da versão em vigor, AAAA-MM-DD. */
  atualizado: string;
  children: ReactNode;
}) {
  return (
    <>
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 grid-lines opacity-40" aria-hidden />
        <div className="container-site relative section-padding max-w-3xl">
          <h1 className="font-display text-[clamp(2rem,5vw,3.25rem)] leading-[1.05]">
            {title}
          </h1>
          <p className="mt-4 font-mono text-xs uppercase tracking-wider text-cinza-ink">
            Última atualização: {FORMATO.format(new Date(atualizado))}
          </p>
        </div>
        <KeneStrip motif="iso" height={18} className="text-amarelo opacity-70" />
      </section>

      <section className="relative overflow-hidden bg-ink section-padding">
        <article className="texto-legal container-site relative max-w-3xl">{children}</article>
      </section>
    </>
  );
}
