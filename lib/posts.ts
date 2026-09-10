import { posts, type Post } from "#content";

export type { Post };
export type PostTipo = Post["tipo"];

/**
 * Rascunhos (`rascunho: true`) aparecem em `next dev` para revisão e somem do
 * build de produção.
 */
const visiveis = posts.filter(
  (p) => !p.rascunho || process.env.NODE_ENV === "development",
);

/**
 * Ordem da listagem: destaques primeiro, depois data decrescente. Post sem data
 * confirmada (PENDENCIAS #16) vai para o fim em vez de ganhar uma data inventada.
 */
function comparar(a: Post, b: Post) {
  if (a.destaque !== b.destaque) return a.destaque ? -1 : 1;
  if (!a.data && !b.data) return a.titulo.localeCompare(b.titulo, "pt-BR");
  if (!a.data) return 1;
  if (!b.data) return -1;
  return b.data.localeCompare(a.data);
}

export const POSTS: Post[] = [...visiveis].sort(comparar);

export function getPost(slug: string) {
  return POSTS.find((p) => p.slug === slug);
}

/** Outros posts para o bloco "Continue lendo" — mesma tag na frente. */
export function relacionados(post: Post, quantidade = 3) {
  const outros = POSTS.filter((p) => p.slug !== post.slug);
  const pontua = (p: Post) =>
    (p.tipo === post.tipo ? 1 : 0) +
    p.tags.filter((t) => post.tags.includes(t)).length;
  return [...outros]
    .sort((a, b) => pontua(b) - pontua(a))
    .slice(0, quantidade);
}

const FORMATO = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});

export function formatarData(iso?: string) {
  if (!iso) return "data pendente";
  return FORMATO.format(new Date(iso));
}

/**
 * Forma enxuta para a listagem. O `Post` completo carrega o MDX compilado
 * (`code`), que não deve atravessar a fronteira servidor→cliente.
 */
export type PostResumo = {
  slug: string;
  tipo: PostTipo;
  titulo: string;
  resumo: string;
  data?: string;
  dataLegivel: string;
  capa?: { src: string; width: number; height: number; blurDataURL?: string };
  capaAlt?: string;
};

export function paraLista(lista: Post[] = POSTS): PostResumo[] {
  return lista.map((p) => ({
    slug: p.slug,
    tipo: p.tipo,
    titulo: p.titulo,
    resumo: p.resumo,
    data: p.data,
    dataLegivel: formatarData(p.data),
    capa: p.capa
      ? {
          src: p.capa.src,
          width: p.capa.width,
          height: p.capa.height,
          blurDataURL: p.capa.blurDataURL,
        }
      : undefined,
    capaAlt: p.capaAlt,
  }));
}
