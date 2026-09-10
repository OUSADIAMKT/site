import { defineConfig, defineCollection, s } from "velite";
import rehypeSlug from "rehype-slug";
import rehypeAutolinkHeadings from "rehype-autolink-headings";

/**
 * Camada de conteúdo do blog (`/conteudo`).
 *
 * Cada post é um `.mdx` em `content/posts/`. O Velite valida o frontmatter com
 * Zod, compila o corpo MDX e gera `.velite/` (dados + tipos TypeScript) que as
 * rotas consomem — tudo em build, então as páginas saem estáticas.
 *
 * Regra do PRD 7.3 continua valendo aqui: onde falta material real do cliente,
 * o corpo do post usa `<Pendente>` — nunca texto inventado nem stock photo.
 */

const posts = defineCollection({
  name: "Post",
  pattern: "posts/**/*.mdx",
  schema: s
    .object({
      titulo: s.string().max(160),
      tipo: s.enum(["Artigo", "Podcast", "Case"]),
      resumo: s.string().max(360),
      /**
       * Data de publicação (AAAA-MM-DD). Opcional de propósito: os posts
       * herdados do PRD ainda não têm data confirmada (PENDENCIAS #16) e
       * inventar uma seria pior do que exibir "data pendente".
       */
      data: s.isodate().optional(),
      atualizado: s.isodate().optional(),
      autor: s.string().default("Ousadia Marketing"),
      /** Capa real. Sem stock: enquanto não existir, a lista mostra o slot. */
      capa: s.image().optional(),
      capaAlt: s.string().optional(),
      tags: s.array(s.string()).default([]),
      destaque: s.boolean().default(false),
      /** Rascunho: sai do ar em produção, aparece em `next dev`. */
      rascunho: s.boolean().default(false),

      // Derivados do arquivo
      slug: s.path(),
      code: s.mdx(),
      toc: s.toc(),
      metadata: s.metadata(),
    })
    .transform((post) => {
      const slug = post.slug.replace(/^posts\//, "");
      return { ...post, slug, url: `/conteudo/${slug}` };
    }),
});

export default defineConfig({
  root: "content",
  output: {
    data: ".velite",
    assets: "public/static",
    base: "/static/",
    name: "[name]-[hash:8].[ext]",
    clean: true,
  },
  collections: { posts },
  mdx: {
    rehypePlugins: [
      rehypeSlug,
      [rehypeAutolinkHeadings, { behavior: "wrap", properties: { className: "heading-anchor" } }],
    ],
  },
});
