import type { ReactNode } from "react";

/** Diagnóstico de IA: tema futurista (ver `[data-tema="xingu"]` em globals.css). */
export default function DiagnosticoIALayout({ children }: { children: ReactNode }) {
  return <div data-tema="xingu">{children}</div>;
}
