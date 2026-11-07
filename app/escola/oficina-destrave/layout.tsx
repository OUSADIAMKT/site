import type { ReactNode } from "react";

/**
 * Oficina Destrave: tema neon, o mesmo do Diagnóstico Destrave (ver
 * `[data-tema="neon"]` em globals.css). O público tem muita gente mais velha,
 * que lê com zoom: a base da página sobe pra 18px (112,5%), e como o Tailwind
 * mede tudo em rem, letras e espaços crescem juntos, sem quebrar o desenho.
 */
export default function OficinaDestraveLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <div data-tema="neon">
      <style>{"html{font-size:112.5%}"}</style>
      {children}
    </div>
  );
}
