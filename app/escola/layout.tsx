import type { ReactNode } from "react";

/** Escola: tema verde (ver `[data-tema="verde"]` em globals.css). Preview. */
export default function EscolaLayout({ children }: { children: ReactNode }) {
  return <div data-tema="verde">{children}</div>;
}
