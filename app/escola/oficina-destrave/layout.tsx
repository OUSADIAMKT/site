import type { ReactNode } from "react";

/** Oficina Destrave: tema neon, o mesmo do Diagnóstico Destrave (ver `[data-tema="neon"]` em globals.css). */
export default function OficinaDestraveLayout({
  children,
}: {
  children: ReactNode;
}) {
  return <div data-tema="neon">{children}</div>;
}
