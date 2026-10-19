import type { ReactNode } from "react";

/** Diagnóstico de Social Media: tema laranja (ver `[data-tema="amarelo"]` em globals.css). */
export default function DiagnosticoSocialMediaLayout({ children }: { children: ReactNode }) {
  return <div data-tema="amarelo">{children}</div>;
}
