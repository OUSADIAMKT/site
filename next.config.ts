import type { NextConfig } from "next";

/**
 * Roda o Velite junto com o Next: em `dev` fica em watch (salvar um `.mdx`
 * regenera `.velite/` e a página recarrega); em `build` gera uma vez, antes do
 * Next compilar.
 *
 * Feito aqui — e não como plugin de webpack — porque o Turbopack é o bundler
 * padrão e não executa a config de webpack. É uma *função* async (suportada
 * desde o Next 12.1) e não top-level await: o loader de config do Next 16 usa
 * `require()`, que quebra com TLA (`ERR_REQUIRE_ASYNC_MODULE`).
 */
const nextConfig: NextConfig = {
  /* config options here */
};

export default async function config(phase: string): Promise<NextConfig> {
  const isDev = phase === "phase-development-server";
  const isBuild = phase === "phase-production-build";

  if (!process.env.VELITE_STARTED && (isDev || isBuild)) {
    process.env.VELITE_STARTED = "1";
    const { build } = await import("velite");
    await build({ watch: isDev, clean: !isDev });
  }

  return nextConfig;
}
