import type { ReactNode } from "react";

/** Diagnóstico Destrave: tema neon (ver `[data-tema="neon"]` em globals.css). */
export default function DestraveDiagLayout({ children }: { children: ReactNode }) {
  return <div data-tema="neon">{children}</div>;
}
