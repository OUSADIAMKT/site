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
  /**
   * Exportação estática: `next build` gera HTML/CSS/JS puro em `out/`, sem
   * precisar de servidor Node. É o que a Hostinger consegue servir.
   */
  output: "export",

  /**
   * Faz cada rota virar uma pasta com `index.html` (`/agencia/index.html`) em
   * vez de um arquivo solto (`/agencia.html`). Sem isso, o servidor da
   * Hostinger recebe `/agencia`, não acha um diretório com índice e devolve
   * 404 — só a home funcionaria.
   */
  trailingSlash: true,

  images: {
    /**
     * O otimizador de imagens do `next/image` roda em servidor, que não existe
     * na exportação estática. Sem isto o build falha. As imagens passam a ser
     * servidas como estão em `public/` — por isso vale conferir o peso dos
     * PNGs da marca antes de publicar.
     */
    unoptimized: true,
  },
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
