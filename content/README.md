# Conteúdo do blog (`/conteudo`)

Cada post é um arquivo `.mdx` em `content/posts/`. O [Velite](https://velite.js.org)
valida o frontmatter, compila o corpo e gera `.velite/` — a camada de dados
tipada que as rotas consomem. Tudo acontece em build: as páginas saem estáticas.

## Publicar um post

1. Copie `content/posts/modelo.mdx` para `content/posts/nome-do-post.mdx`.
   **O nome do arquivo vira a URL** (`/conteudo/nome-do-post`) — use minúsculas,
   sem acento, separado por hífen.
2. Preencha o frontmatter e escreva o corpo em markdown.
3. Apague a linha `rascunho: true`.
4. `npm run dev` para conferir. Salvar o arquivo já recarrega a página.

Não é preciso mexer em mais nenhum arquivo: listagem, busca, filtro por tipo,
sitemap, JSON-LD, Open Graph e "Continue lendo" saem do frontmatter.

## Frontmatter

| Campo        | Obrigatório | O que é                                                        |
| ------------ | ----------- | -------------------------------------------------------------- |
| `titulo`     | sim         | até 160 caracteres                                              |
| `tipo`       | sim         | `Artigo`, `Podcast` ou `Case` — define o filtro e a cor do selo |
| `resumo`     | sim         | até 360 caracteres; vai na lista, no `<meta description>` e no OG |
| `data`       | não         | `AAAA-MM-DD`. Sem ela o post mostra "data pendente" e vai pro fim da lista |
| `atualizado` | não         | `AAAA-MM-DD` da última revisão                                  |
| `autor`      | não         | padrão `Ousadia Marketing`                                      |
| `capa`       | não         | caminho relativo ao `.mdx` (ex.: `./capa.jpg`)                  |
| `capaAlt`    | não         | texto alternativo da capa — obrigatório na prática, por acessibilidade |
| `tags`       | não         | lista; usada para escolher os posts relacionados                |
| `destaque`   | não         | `true` fixa o post no topo da listagem                          |
| `rascunho`   | não         | `true` mostra em `npm run dev` e esconde em produção            |

Se um campo obrigatório faltar ou vier fora do formato, o build falha apontando
o arquivo e o campo — nenhum post quebrado chega ao ar.

## Imagens

Coloque o arquivo ao lado do `.mdx` e referencie por caminho relativo, tanto no
`capa:` quanto no corpo (`![texto alternativo](./foto.jpg)`). O Velite copia para
`public/static/` com hash no nome, mede as dimensões e gera o blur de
carregamento; o site renderiza com `next/image`.

**Sem stock photo** (PRD 7.3). Enquanto a imagem real não existir, deixe o campo
`capa` de fora — a listagem e o post mostram o slot rotulado "capa real pendente".

## Componentes disponíveis no MDX

Não precisa importar nada:

- `<Destaque titulo="...">` — caixa para o ponto principal.
- `<Pendente>` — marca trecho que depende de material real do cliente. Aparece
  rotulado no site, em vez de virar texto inventado.
- `<CtaBloco contexto="escola" label="...">` — fecha o post no WhatsApp com a
  mensagem pré-preenchida daquele contexto (`home`, `escola`, `mentoria`,
  `agencia`, `comunidade`, `contato`, `sobre`).

Para criar outros, edite `components/mdx/mdx-components.tsx`.

## Comandos

| Comando                 | O que faz                                              |
| ----------------------- | ------------------------------------------------------ |
| `npm run dev`           | sobe o site e o Velite em watch (padrão para escrever)  |
| `npm run build`         | gera o conteúdo e compila o site                        |
| `npm run content`       | só regenera `.velite/` — útil para ver erro de validação |
| `npm run content:watch` | só o Velite, em watch                                   |

`.velite/` e `public/static/` são gerados e ficam fora do Git.
