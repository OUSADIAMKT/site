# Pendências de conteúdo — site Ousadia Marketing

Relatório exigido pelo PRD (seções 13 e 14). O site está **completo em estrutura,
copy e navegação**; o que falta aqui depende de material que só o cliente tem.

Todos os pontos abaixo aparecem no site como slot visível e rotulado
(`MediaSlot` / `ContentSlot`) — nunca como stock photo ou prova social inventada,
conforme a regra do PRD 7.3.

---

## 1. Bloqueadores de publicação

| # | Pendência | Onde aparece |
|---|---|---|
| 1 | **Fotos e vídeos reais do Jackson** (contexto regional: beira do Tapajós, palco do Amazon Marketing Day). Zero stock. | Home (hero + dobra 7), `/sobre` — **+ loop de fundo da hero:** `public/video/hero.mp4` e `hero-poster.jpg` (ver `public/video/README.md`) |
| 2 | **3 vídeos de aluno** (15–30s): nome, cidade, antes/depois em uma frase | Home (dobra 8), `/escola`, `/escola/[curso]` |
| 3 | **Prints reais de feedback** (DM, comentário, WhatsApp) | Home (dobra 8) |
| 4 | **Antes/depois e números** dos 8 cases publicados. O portfólio em PDF conta o que foi entregue, mas não traz resultado medido — hoje esses cases mostram o slot de pendência no lugar. | `lib/portfolio.ts` → `antes`, `depois`, `numeros` |
| 5 | **Textos jurídicos** (Privacidade e Termos) validados por profissional + **CNPJ** | `/politica-de-privacidade`, `/termos`, rodapé |

## 2. Dados de contato e integrações

| # | Pendência | Onde configurar |
|---|---|---|
| 6 | Links de **TikTok, YouTube e Spotify** | `lib/site.ts` → `SOCIAL` |
| 7 | **E-mail comercial** e **cidade-base** | `lib/site.ts` → `SITE.email`, `SITE.cidadeBase` |
| 8 | **Endpoint de formulário** (aplicação, contato, proposta) | `lib/site.ts` → `FORM_ENDPOINT` |
| 9 | **Endpoint da newsletter** — script do Apps Script pronto em `docs/apps-script/newsletter-google-sheets.gs`, falta só implantar e colar a URL | `lib/site.ts` → `NEWSLETTER_ENDPOINT` |
| 10 | **GA4 + Meta Pixel** e banner de consentimento LGPD (PRD 10) — ainda não implementados | — |

> Enquanto 8 e 9 estiverem vazios: os formulários de aplicação, contato e
> proposta **caem no WhatsApp com os dados preenchidos** (nenhum lead se perde);
> a newsletter avisa honestamente que ainda não está conectada, em vez de fingir
> sucesso.

## 3. Conteúdo por produto

| # | Pendência | Onde aparece |
|---|---|---|
| 11 | **Módulos, formato, pra-quem-é e FAQ** dos cursos ABC do Marketing, Social Media na Prática e Audiovisual (o Destrave já está completo) | `lib/cursos-conteudo.ts` |
| 12 | **Investimento, formato e garantia da mentoria** | `/mentoria` (FAQ) |
| 13 | **Cases de mentorados** com números reais — nenhum case de mentoria veio no portfólio em PDF, então `/mentoria` segue com slot | `lib/portfolio.ts` (`frente: "mentoria"`) |
| 14 | **Processo e prazos da agência** (os cases de marca já entraram pelo portfólio) | `/agencia` |
| 14b | **Cidade de cada case** — o PDF não informa; enquanto for `null`, a etiqueta de cidade não aparece no cartão | `lib/portfolio.ts` → `cidade` |
| 14c | ~~**Autorização de imagem** para os screenshots de Instagram dos embaixadores do Gênese (perfis de terceiros) e para os nomes das 5 embaixadoras EKL. Ficaram **fora** do site até o ok.~~ **Resolvido em 10/09/2026:** cliente confirmou a autorização das duas frentes — `/portfolio` liberado pro deploy. | `/portfolio` |
| 15 | **Regras de entrada da comunidade** (preço, critério, formato) | `/comunidade` |
| 16 | **Corpo dos 4 posts** + capas + datas de publicação | `content/posts/*.mdx` — escrever no lugar do bloco `<Pendente>`, preencher `data:` e `capa:`. Ver `content/README.md` |
| 17 | **Anos dos marcos** da linha do tempo | `/sobre` |
| 18 | **Logos** de marcas atendidas, eventos e mídia | Home (dobra 2) |
| 19 | **Data, horário e valor da próxima turma do aulão de UGC** — a página antiga era amarrada ao dia 1º/08/2026 e ao checkout da HeroSpark; a nova é evergreen e manda pro WhatsApp | `/aulao-ugc` (FAQ) |
| 20 | **Autorização de uso** dos 6 prints de campanha aprovada do aulão (conversas de alunas, com nome de marca à vista: DIY, Samsung, Oral-B, Dove, Lux, Pantene). Estavam publicados na página antiga e vieram junto — mesma ressalva do item 14c | `/aulao-ugc`, `public/aulao-ugc/` |

## 4. Decisões do cliente

- **Headline do hero:** está publicada a variante **A** do PRD ("Marketing feito
  na Amazônia…"). O PRD pede validação com 5–10 pessoas do público real antes de
  cravar; as variantes B e C estão no PRD (seção 8.1).
- **Barra de campanha:** desligada (`CAMPAIGN.active = false` em `lib/site.ts`).
  Ligar só em janela de lançamento, preenchendo a data.
- **Números de prova social:** hoje o site publica 30+ turmas, +1000 alunos,
  2x congressos Amazon Marketing Day e 1x liderança do WCD (Dia Mundial da
  Criatividade) — conforme o PRD, ainda sem validação final do cliente.
  Confirmar antes do ar: número fraco ou incorreto exposto é risco de
  credibilidade, não só de precisão.
- ~~**Divergência no número de turmas.**~~ Resolvido em 10/09/2026: o cliente
  confirmou **mais de 30 turmas** (o PRD dizia 22+, desatualizado). Alinhado em
  `lib/site.ts` (`STATS`), Home (2 menções), `/sobre` (história e linha do
  tempo) e no case de turmas presenciais em `lib/portfolio.ts`.

---

## Checklist do PRD (seção 13) — situação atual

- [x] Toda CTA termina em WhatsApp ou aplicação
- [ ] Números de prova social confirmados pelo cliente *(publicados conforme PRD, aguardando validação)*
- [ ] Ao menos 3 vídeos de aluno *(slots prontos, mídia pendente)*
- [x] FAQ cobre vergonha, dinheiro e "é pra mim"
- [x] A palavra **Mobral** aparece no site
- [x] Bandeira **Amazônia / Norte** com força no hero e no manifesto
- [ ] Jackson com **rosto** e história *(história completa publicada; foto pendente)*
- [x] Botão de WhatsApp flutuante em todas as páginas
- [x] Zero stock photo
- [x] Acessibilidade: skip link, foco visível, acordeão nativo, `prefers-reduced-motion`
- [ ] Eventos de analytics e conversões *(não implementados)*
- [ ] LGPD: consentimento antes do Pixel *(não implementado)*
- [ ] Auditoria Lighthouse mobile ≥ 90 / LCP < 2s *(rodar após entrarem as imagens reais)*
