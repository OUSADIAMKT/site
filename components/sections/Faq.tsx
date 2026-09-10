import type { ReactNode } from "react";
import { Reveal } from "@/components/ui/Reveal";

export type FaqItem = { q: string; a: ReactNode };

/** Acordeão acessível (details/summary — funciona sem JS, teclado nativo). */
export function FaqList({ items }: { items: FaqItem[] }) {
  return (
    <div className="space-y-3">
      {items.map((f, i) => (
        <Reveal key={f.q} delay={i * 0.04}>
          <details className="card-surface group p-5">
            <summary className="flex cursor-pointer list-none items-start justify-between gap-4 font-display text-lg">
              {f.q}
              <span
                aria-hidden
                className="mt-1 shrink-0 text-floresta transition-transform group-open:rotate-45"
              >
                +
              </span>
            </summary>
            <div className="text-body mt-3 text-sm">{f.a}</div>
          </details>
        </Reveal>
      ))}
    </div>
  );
}

/**
 * Dados estruturados FAQPage (PRD 11). Só aceita respostas em texto puro —
 * o Google não indexa marcação dentro do JSON-LD.
 */
export function FaqJsonLd({ items }: { items: { q: string; a: string }[] }) {
  const json = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  };
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(json) }}
    />
  );
}
