import type { MetadataRoute } from "next";
import { CURSOS, SITE } from "@/lib/site";
import { POSTS } from "@/lib/posts";

/** Exigido pelo `output: "export"`: sem isto o build falha ao coletar a rota. */
export const dynamic = "force-static";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  const estaticas = [
    { path: "", priority: 1 },
    { path: "/sobre", priority: 0.8 },
    { path: "/escola", priority: 0.9 },
    { path: "/mentoria", priority: 0.9 },
    { path: "/agencia", priority: 0.8 },
    { path: "/comunidade", priority: 0.7 },
    { path: "/diagnostico", priority: 0.8 },
    { path: "/conteudo", priority: 0.7 },
    { path: "/contato", priority: 0.6 },
    { path: "/politica-de-privacidade", priority: 0.2 },
    { path: "/termos", priority: 0.2 },
  ];

  return [
    ...estaticas.map((p) => ({
      url: `${SITE.url}${p.path}`,
      lastModified: now,
      priority: p.priority,
    })),
    ...CURSOS.map((c) => ({
      url: `${SITE.url}/escola/${c.slug}`,
      lastModified: now,
      priority: 0.8,
    })),
    ...POSTS.map((p) => ({
      url: `${SITE.url}/conteudo/${p.slug}`,
      lastModified: p.atualizado ?? p.data ?? now,
      priority: 0.6,
    })),
  ];
}
