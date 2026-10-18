import type { MetadataRoute } from "next";
import { CURSOS, MENTORIA_UGC_NO_GOOGLE, SITE } from "@/lib/site";
import { POSTS } from "@/lib/posts";

/** Exigido pelo `output: "export"`: sem isto o build falha ao coletar a rota. */
export const dynamic = "force-static";

/**
 * Só os posts levam `lastModified`, porque só eles têm uma data real.
 *
 * Antes as páginas fixas e os cursos usavam a data do build, o que dizia ao
 * Google que o site inteiro mudou a cada publicação — o sinal perde valor
 * justamente quando um post novo precisaria dele. Post sem data continua sem
 * `lastModified`, pela mesma razão que já vale no resto do projeto: inventar
 * data é pior do que omitir (ver `velite.config.ts` e PENDENCIAS #16).
 */
/**
 * As URLs terminam em `/` porque o site é exportado com `trailingSlash: true`
 * (ver next.config.ts): sem a barra, cada endereço do sitemap passava por um
 * redirecionamento antes de abrir.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const estaticas = [
    { path: "", priority: 1 },
    { path: "/sobre", priority: 0.8 },
    { path: "/escola", priority: 0.9 },
    { path: "/mentoria", priority: 0.9 },
    { path: "/agencia", priority: 0.8 },
    { path: "/portfolio", priority: 0.8 },
    { path: "/comunidade", priority: 0.7 },
    { path: "/diagnostico", priority: 0.8 },
    { path: "/diagnostico/ia", priority: 0.7 },
    { path: "/diagnostico/social-media", priority: 0.7 },
    { path: "/aulao-ugc", priority: 0.7 },
    { path: "/momento-ugc", priority: 0.7 },
    ...(MENTORIA_UGC_NO_GOOGLE
      ? [{ path: "/mentoria-viver-do-digital", priority: 0.7 }]
      : []),
    { path: "/conteudo", priority: 0.7 },
    { path: "/contato", priority: 0.6 },
    { path: "/politica-de-privacidade", priority: 0.2 },
    { path: "/termos", priority: 0.2 },
  ];

  return [
    ...estaticas.map((p) => ({
      url: `${SITE.url}${p.path}/`,
      priority: p.priority,
    })),
    ...CURSOS.map((c) => ({
      url: `${SITE.url}/escola/${c.slug}/`,
      priority: 0.8,
    })),
    // Post sem texto ainda (`pendente`, ver velite.config.ts) não entra.
    ...POSTS.filter((p) => !p.pendente).map((p) => ({
      url: `${SITE.url}/conteudo/${p.slug}/`,
      lastModified: p.atualizado ?? p.data,
      priority: 0.6,
    })),
  ];
}
