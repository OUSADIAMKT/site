# ousadiamarketing.com.br

Site da Ousadia Marketing, a Agência Escola de Marketing do Norte do Brasil.
Next.js 16 (App Router) exportado como **site estático** e publicado na
Hostinger.

## Rodar no seu computador

Precisa do **Node 24** (ver `.nvmrc`).

```bash
npm install
npm run dev        # http://localhost:3000, recarrega ao salvar
npm run build      # gera o site estático em out/
npm run lint
```

## Onde está cada coisa

| O quê | Onde |
|---|---|
| Páginas | `app/` (uma pasta por rota) |
| Textos e dados do site (WhatsApp, cursos, menu, URLs dos formulários) | `lib/site.ts` |
| Cases do portfólio | `lib/portfolio.ts` |
| Posts do blog | `content/posts/*.mdx` (como escrever: `content/README.md`) |
| Diagnósticos | `lib/diagnostico.ts`, `lib/momento-ugc.ts`, `lib/metodo-satoyiro/` |
| Backend dos formulários (Google Apps Script) | `docs/apps-script/` |
| O que ainda falta de conteúdo | `PENDENCIAS.md` |
| Fonte da copy | `legado/copy-e-arquitetura/PRD-site-ousadia.md` |

## Formulários

O site não tem servidor. Cada formulário que grava dados manda para um
**Google Apps Script** ligado a uma planilha no Drive; o código de cada um está
em `docs/apps-script/`, com o passo a passo de implantação no topo do arquivo.
As URLs `/exec` ficam em `lib/site.ts`.

Mudou um script? Cole o arquivo novo no editor do Apps Script e publique uma
**nova versão** em Implantar > Gerenciar implantações (sem isso a URL continua
rodando o código antigo).

O e-mail do "Momento UGC" é montado pelo próprio script, com os textos de
`lib/momento-ugc.ts`. Mudou um texto lá? Rode `npm run gs:momento-ugc`, que
copia os textos para o `.gs`, e cole o script de novo.

## Variáveis de ambiente

Opcionais. Sem nenhum `.env`, o build usa os valores de produção de
`lib/site.ts`. Para um build de teste com outras planilhas, copie
`.env.example` para `.env.local` e ajuste. Tudo ali fica público no site:
nada de senha.

## Publicar

```bash
npm run deploy           # builda e grava out/ como um commit na branch deploy
git push origin deploy   # manda pro GitHub
```

Depois, no painel da Hostinger: **Implante de GitHub** > branch `deploy` >
**Implantar**. A branch `main` guarda só o código; `deploy` guarda só o site
pronto. O `deploy` recusa árvore com alteração não commitada.

`public/.htaccess` vai junto: página 404, cache, redirecionamento de `www` e
cabeçalhos de segurança.
