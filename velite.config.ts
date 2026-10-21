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

/** Markdown curto para texto corrido: tira ênfase, links e quebras. */
function textoPlano(md: string) {
  return md
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/[*_`]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

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
      /** Podcast do post: caminho do MP3. Aparece como player sob o banner. */
      audio: s.string().optional(),
      audioTitulo: s.string().optional(),
      /** Esconde o botão flutuante do WhatsApp só nesta página. */
      /** Esconde o sumário "Neste post" do começo. */
      semSumario: s.boolean().default(false),
      semFlutuante: s.boolean().default(false),
      tags: s.array(s.string()).default([]),
      destaque: s.boolean().default(false),
      /** Rascunho: sai do ar em produção, aparece em `next dev`. */
      rascunho: s.boolean().default(false),

      // Derivados do arquivo
      slug: s.path(),
      code: s.mdx(),
      toc: s.toc(),
      metadata: s.metadata(),
      corpo: s.raw(),
    })
    .transform(({ corpo, ...post }) => {
      const slug = post.slug.replace(/^posts\//, "");
      /**
       * Post cujo corpo é só o bloco `<Pendente>` ainda não tem texto: fica no
       * blog, mas fora do sitemap e com `noindex` (ver `app/conteudo/[slug]`),
       * para o Google não indexar página vazia. Escreveu o texto, volta sozinho.
       */
      const pendente =
        corpo.replace(/<Pendente>[\s\S]*?<\/Pendente>/g, "").trim().length === 0;
      /**
       * Perguntas dos blocos `<Duvida>` viram o JSON-LD `FAQPage` do post (ver
       * `app/conteudo/[slug]`). Sai do próprio texto, então não tem como a
       * marcação divergir do que o leitor vê.
       */
      const faq = [
        ...corpo.matchAll(/<Duvida\s+pergunta="([^"]+)"\s*>([\s\S]*?)<\/Duvida>/g),
      ].map(([, pergunta, resposta]) => ({
        pergunta,
        resposta: textoPlano(resposta),
      }));
      return { ...post, slug, url: `/conteudo/${slug}`, pendente, faq };
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
