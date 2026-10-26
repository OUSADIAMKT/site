import type { ReactNode } from "react";

/** Tema verde (ver `[data-tema="verde"]` em globals.css). */
export default function TemaVerdeLayout({ children }: { children: ReactNode }) {
  return <div data-tema="verde">{children}</div>;
}
