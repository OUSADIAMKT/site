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
| 4 | **3 cases destrinchados**: Nome — Cidade / Antes / Depois / O que mudou | Home (dobra 8) |
| 5 | **Textos jurídicos** (Privacidade e Termos) validados por profissional + **CNPJ** | `/politica-de-privacidade`, `/termos`, rodapé |

## 2. Dados de contato e integrações

| # | Pendência | Onde configurar |
|---|---|---|
| 6 | Links de **TikTok, YouTube e Spotify** | `lib/site.ts` → `SOCIAL` |
| 7 | **E-mail comercial** e **cidade-base** | `lib/site.ts` → `SITE.email`, `SITE.cidadeBase` |
| 8 | **Endpoint de formulário** (aplicação, contato, proposta) | `lib/site.ts` → `FORM_ENDPOINT` |
| 9 | **Endpoint da newsletter** | `lib/site.ts` → `NEWSLETTER_ENDPOINT` |
| 10 | **GA4 + Meta Pixel** e banner de consentimento LGPD (PRD 10) — ainda não implementados | — |

> Enquanto 8 e 9 estiverem vazios: os formulários de aplicação, contato e
> proposta **caem no WhatsApp com os dados preenchidos** (nenhum lead se perde);
> a newsletter avisa honestamente que ainda não está conectada, em vez de fingir
> sucesso.

## 3. Conteúdo por produto

| # | Pendência | Onde aparece |
|---|---|---|
| 11 | **Módulos, formato, pra-quem-é e FAQ** dos cursos ABC do Marketing, Social Media na Prática e Vídeo Maker e Edição (o Destrave já está completo) | `lib/cursos-conteudo.ts` |
| 12 | **Investimento, formato e garantia da mentoria** | `/mentoria` (FAQ) |
| 13 | **Cases de mentorados** com números reais | `/mentoria` |
| 14 | **Cases de marca** (logo, desafio, resultado) e processo/prazos da agência | `/agencia` |
| 15 | **Regras de entrada da comunidade** (preço, critério, formato) | `/comunidade` |
| 16 | **Corpo dos 4 posts** + capas + datas de publicação | `content/posts/*.mdx` — escrever no lugar do bloco `<Pendente>`, preencher `data:` e `capa:`. Ver `content/README.md` |
| 17 | **Anos dos marcos** da linha do tempo | `/sobre` |
| 18 | **Logos** de marcas atendidas, eventos e mídia | Home (dobra 2) |

## 4. Decisões do cliente

- **Headline do hero:** está publicada a variante **A** do PRD ("Marketing feito
  na Amazônia…"). O PRD pede validação com 5–10 pessoas do público real antes de
  cravar; as variantes B e C estão no PRD (seção 8.1).
- **Barra de campanha:** desligada (`CAMPAIGN.active = false` em `lib/site.ts`).
  Ligar só em janela de lançamento, preenchendo a data.
- **Números de prova social:** hoje o site publica 22+ turmas, 2x Amazon
  Marketing Day, +500 alunos e #1 do Norte, conforme o PRD. Confirmar antes do
  ar — número fraco ou não verificável deve sair.

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
