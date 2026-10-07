# Qual é o seu Momento UGC? — especificação

> Status: aprovado e **construído** em 07/10/2026. Os textos de verdade (momentos,
> travas, o que estudar, filmes, vitórias) vivem em `lib/momento-ugc.ts`; este
> documento registra as decisões.
> Rota: `/momento-ugc`. Base técnica: o mesmo padrão de
> `/diagnostico` (`lib/diagnostico.ts` + `components/diagnostico/`).

## Objetivo

**Pesquisa de mercado disfarçada de diagnóstico.** É gratuito e não vende nada.

- Aquecer o grupo de WhatsApp da Juh (500+ meninas) antes do aulão Mapa do UGC de 7/nov/2026.
- Captar e-mail e contato, e segmentar a base.
- Entender o momento, as dores, os desejos e o CBM (crenças, bloqueios e medos) delas,
  para definir os próximos conteúdos e cursos da Ousadia.

A entrega para a menina é o **diagnóstico do momento** dela, sem PDF (decisão de
07/10/2026): travas, o que fazer, o que estudar, filmes e séries, próximas vitórias
e um vídeo do YouTube por momento (tema definido; o vídeo sobe depois). Ela vê na
tela e recebe uma cópia completa por e-mail.

## Abertura

```
DIAGNÓSTICO GRATUITO · MAPA DO UGC

Qual é o seu Momento UGC?

Descubra onde você está no caminho pra trabalhar com marcas.

Me ajuda a criar o próximo passo pra você? 💛 Responda 10 perguntas rápidas
e receba na hora o seu diagnóstico: em que momento você está, o que está te
travando e o que fazer agora. Suas respostas também vão guiar os próximos
conteúdos e cursos da Ousadia.

[ Quero descobrir meu momento ]
```

## Perguntas

Em toda opção "Outro: ___" a menina escreve a própria resposta.
As opções das perguntas 5, 6 e 7 são embaralhadas para cada menina, para que a
ordem não distorça o ranking.

> **Atualizado em 07/10/2026 (2ª rodada):** a pedido do usuário entraram idade e
> cidade como perguntas 1 e 2 (a idade saiu do formulário final), e o desejo
> passou a aceitar várias respostas. Agora são **10 perguntas** (~4 min).
> Momento e meta seguem com uma resposta (o momento define o resultado; a meta é
> uma faixa). Crença, bloqueio e medo seguem com uma só, "a principal": é ela que
> personaliza o resultado e deixa o ranking limpo.

### 1. Qual é a sua idade? *(perfil)*
Menos de 18 / 18 a 24 / 25 a 30 / 31 a 35 / 36 ou mais

### 2. Onde você mora? *(estado em lista + cidade escrita)*
A cidade é gravada normalizada ("altamira" → "Altamira") pra contagem não se
dividir. O DDD do WhatsApp continua gravado à parte.

### 3. O que descreve você hoje? *(múltipla escolha — perfil)*
- Trabalho de carteira assinada (CLT)
- Trabalho por conta própria
- Estudo
- Estou sem renda fixa
- Sou mãe
- Sou mãe solo
- Cuido da casa

### 4. Qual frase mais parece com você hoje? *(define o momento)*
- "Ainda não entendi direito o que é UGC" → Descoberta
- "Já entendi, mas ainda não gravei nada" → Será? ou Play (ver roteamento)
- "Já estudei ou comprei curso, mas nunca coloquei em prática" → Play
- "Já gravo alguns vídeos, mas sem foco e sem portfólio" → Rascunho
- "Tenho portfólio, mas nenhuma marca fechou comigo" → Match
- "Já recebi produto ou fechei algum job" → Match

### 5. Se você ganhasse dinheiro criando vídeos, o que mudaria na sua vida? *(desejo — múltipla escolha; a abertura do resultado usa a primeira marcada)*
- Ter meu próprio dinheiro, sem depender de ninguém
- Trabalhar de casa, sem abrir mão dos meus filhos
- Ter horários que cabem na minha vida
- Respirar no fim do mês
- Comprar algo que quero muito (celular, viagem…)
- Viver só disso um dia
- Outro: ___

### 6. O que já seria uma vitória pra você no começo? *(meta)*
- Só receber produtos (permuta) já seria incrível
- Até R$ 200 por mês
- De R$ 200 a R$ 500 por mês
- De R$ 500 a R$ 1.000 por mês
- Um salário mínimo ou mais

### 7. Qual desses pensamentos mais aparece na sua cabeça? *(crença)*
- "Preciso ter muitos seguidores"
- "Preciso de um celular melhor antes de começar"
- "Preciso de CNPJ ou MEI pra trabalhar com marca"
- "Morando aqui no Norte, as marcas não vão me ver"
- "Não sou bonita ou boa o suficiente para aparecer"
- "Isso dá dinheiro de verdade ou é promessa da internet?"
- "Eu consigo, só me falta o caminho"
- Outro: ___

### 8. O que mais te impede de avançar hoje? *(bloqueio)*
- Vergonha de aparecer na câmera
- Não saber o que gravar e postar
- Não saber editar meus vídeos
- Não saber abordar marcas nem quanto cobrar
- Falta de tempo com a rotina e os filhos
- Eu começo, mas não consigo manter
- Falta de dinheiro para investir em aprender
- Outro: ___

### 9. Qual o seu maior medo nessa jornada? *(medo)*
- Passar vergonha com quem me conhece
- Investir tempo ou dinheiro e não dar certo
- Ser ignorada ou rejeitada pelas marcas
- Começar e desistir no meio, de novo
- Cair em golpe ou promessa falsa
- Ser desvalorizada e trabalhar de graça
- Outro: ___

### 10. Que tipo de ajuda você gostaria de ter agora? *(produto — vai do mais leve ao mais intenso)*
- Um material para ler no meu tempo
- Uma aula ao vivo para tirar dúvidas
- Um curso gravado com passo a passo
- Um grupo com desafios práticos e outras meninas
- Alguém me acompanhando de perto

### Campo aberto (opcional)
"Se pudesse perguntar uma coisa para a Juh sobre UGC, o que seria?"

### Captura (antes do resultado)
Nome, WhatsApp, e-mail e @ do Instagram (a idade virou a pergunta 1).
Linha de LGPD: "Seus dados ficam só com a Ousadia e a Juh, para enviar seu material
e conteúdos sobre UGC. Você pode pedir para sair quando quiser."

## Roteamento para os momentos

- A pergunta 4 define Descoberta, Rascunho e Match diretamente.
- "Já estudei ou comprei curso, mas nunca coloquei em prática" → Play.
- "Já entendi, mas ainda não gravei nada" →
  - **Play** se, na pergunta 8, marcou vergonha da câmera, ou se, na pergunta 7,
    marcou a crença do celular;
  - **Será?** nos demais casos.

## Os 5 momentos

Escada exibida no resultado, com o pin **📍 Você está aqui** no momento dela:
**Descoberta → Será? → Play → Rascunho → Match**

### 🔍 Momento Descoberta
**"Você sentiu que tem algo aqui pra você e quer entender o que é."**

Você já viu meninas recebendo produtos e trabalhando com marcas, e uma vozinha
disse: *"e se eu também pudesse?"*. Essa curiosidade é o começo de tudo. Agora é
entender como esse mercado funciona, sem pressa e sem termos complicados.

- **Vídeo:** ver `video` em `lib/momento-ugc.ts`
- **Tarefa de hoje:** Abra o Instagram ou o TikTok e salve 5 vídeos de marcas que você
  já usa em que uma pessoa comum mostra o produto. Repare: você acabou de ver UGC.

### 💭 Momento "Será?"
**"Você já sabe o caminho, só falta acreditar que ele é pra você."**

Você já entendeu o que é UGC, mas a cabeça insiste: *"será que uma marca fecharia
comigo?"*. Esse é o momento em que muita gente para, e o que segura você não é falta
de capacidade, é uma crença. Vamos trocar essa crença por fatos.

- **Vídeo:** ver `video` em `lib/momento-ugc.ts`
- **Tarefa de hoje:** Escreva 3 motivos pelos quais uma marca escolheria você
  (ex.: "eu explico bem", "eu uso muito esse tipo de produto", "eu sou parecida
  com a cliente dela").

### ▶️ Momento Play
**"A vontade tá aí, falta apertar o REC."**

Você quer, você já entendeu, talvez até já estudou, mas o primeiro vídeo ainda não
saiu. Seja por vergonha, pelo celular ou por esperar a hora perfeita, a saída é a
mesma: gravar algo pequeno hoje, com o que você tem.

- **Vídeo:** ver `video` em `lib/momento-ugc.ts`
- **Tarefa de hoje:** Grave 15 segundos mostrando um produto que você tem em casa.
  Não precisa postar nem aparecer o rosto: só suas mãos e sua voz já valem.

### ✏️ Momento Rascunho
**"Você já cria, agora é dar forma ao seu portfólio."**

Você já grava, e isso coloca você na frente de muita gente. O que falta é foco:
escolher um nicho e juntar seus melhores vídeos num lugar que uma marca consiga ver
em 30 segundos.

- **Vídeo:** ver `video` em `lib/momento-ugc.ts`
- **Tarefa de hoje:** Escolha 1 nicho (beleza, casa, maternidade, viagem…) e separe
  os 3 melhores vídeos que você já tem. Eles são o começo do seu portfólio.

### 💌 Momento Match
**"Você tá pronta pra dar match com as marcas."**

Você já tem o que mostrar, e algumas já até receberam. Agora o jogo é outro: abordar
do jeito certo, saber quanto cobrar e estar onde as marcas procuram creators.

- **Vídeo:** ver `video` em `lib/momento-ugc.ts`
- **Tarefa de hoje:** Liste 10 marcas que você usa de verdade e siga as 10 hoje.
  Amanhã, mande a primeira mensagem.

## Textos do resultado

### Abertura (pergunta 5)
Modelo: **"{Nome}, você quer {desejo}. Esse caminho existe, e ele começa exatamente
de onde você está."**

| Resposta | {desejo} |
|---|---|
| Ter meu próprio dinheiro | ter o seu próprio dinheiro, sem depender de ninguém |
| Trabalhar de casa | trabalhar de casa, sem abrir mão dos seus filhos |
| Horários | ter horários que cabem na sua vida |
| Respirar no fim do mês | respirar no fim do mês |
| Comprar algo | realizar aquele sonho que está guardado |
| Viver disso | um dia viver de criar conteúdo |
| Outro | *(texto alternativo)* "{Nome}, o seu sonho tem lugar aqui. Esse caminho existe, e ele começa exatamente de onde você está." |

A pergunta 6 (meta) **não** aparece no resultado, de propósito: mostrar valor em
reais soaria como promessa de ganho, e "cair em golpe" é um dos medos dela.

### "O pensamento que está te segurando" (pergunta 7)

**"Preciso ter muitos seguidores"**
Não precisa. No UGC, a marca contrata o seu vídeo, não o seu número de seguidores.
Muitas vezes o vídeo nem vai pro seu perfil: a marca posta no perfil dela ou usa em
anúncio. O que ela compra é a sua capacidade de criar.

**"Preciso de um celular melhor antes de começar"**
Você não precisa esperar o celular perfeito, o cenário perfeito ou a experiência
perfeita. Os celulares de hoje gravam bem o suficiente. O que faz um vídeo vender é
luz, som e um roteiro simples, e tudo isso dá pra aprender com o que você já tem.

**"Preciso de CNPJ ou MEI pra trabalhar com marca"**
Pra começar, não necessariamente. Muitas marcas fecham com CPF, principalmente em
permuta e nos primeiros jobs. Algumas plataformas e empresas pedem CNPJ para emitir
nota, e aí abrir um MEI é simples e barato. É um passo pra quando os jobs ficarem
frequentes, não uma barreira pra começar.

**"Morando aqui no Norte, as marcas não vão me ver"**
O UGC é feito à distância: a marca manda o produto pelos Correios, você grava em casa
e entrega pela internet. E morar na Amazônia pode ser o seu diferencial, não o seu
limite. A Juh é prova disso.

**"Não sou bonita ou boa o suficiente para aparecer"**
As marcas não procuram gente perfeita, procuram gente real, que pareça com a cliente
delas. É justamente por isso que o UGC existe: as pessoas confiam mais em alguém como
elas do que numa propaganda. E muito vídeo UGC nem mostra o rosto.

**"Isso dá dinheiro de verdade ou é promessa da internet?"**
Dá, mas não é dinheiro rápido nem garantido, e quem te prometer isso merece
desconfiança. É um trabalho: começa com permuta e primeiros jobs pequenos, e cresce
com prática e constância. A gente vai te mostrar o caminho real, sem atalho mágico.

**"Eu consigo, só me falta o caminho"**
Essa é a melhor coisa que você poderia pensar, e você está certa. Vontade você já
tem; o que falta é direção, e é isso que o seu material de hoje começa a te dar.

**Outro**
Seja qual for o pensamento, ele é comum, e outras meninas do grupo também pensam
assim. O seu material de hoje foi feito pra te ajudar a dar o próximo passo mesmo
com ele aí.

### "Sobre o seu medo" (pergunta 9)

**Passar vergonha com quem me conhece**
Quase toda creator sentiu isso no começo. A boa notícia: no UGC você pode começar
sem postar nada no seu perfil pessoal, porque o vídeo vai direto pra marca.

**Investir tempo ou dinheiro e não dar certo**
Por isso este primeiro passo é gratuito. Comece pequeno, com o que você já tem, e
veja com seus próprios olhos antes de investir em qualquer coisa.

**Ser ignorada ou rejeitada pelas marcas**
Ouvir "não" faz parte, e não é sobre você. Toda creator que fecha com marca ouviu
vários "nãos" antes. A gente ajusta a abordagem e segue.

**Começar e desistir no meio, de novo**
Desta vez, o passo é do tamanho da sua rotina: uma tarefa por dia, de poucos minutos.
E você não está sozinha: o grupo está aí pra caminhar junto.

**Cair em golpe ou promessa falsa**
Desconfiar é sinal de inteligência. Guarde duas regras: ninguém sério promete
dinheiro rápido e garantido, e marca de verdade nunca pede pra você pagar pra
trabalhar com ela.

**Ser desvalorizada e trabalhar de graça**
Permuta pode ser um ótimo começo, mas o seu trabalho tem valor. Você vai aprender a
enxergar quando vale aceitar permuta e quando é hora de cobrar.

**Outro**
Todo medo que você sente, outras meninas também sentem. Ele não precisa sumir pra
você começar, só não pode decidir por você.

### Aviso para menores de 18
"Que bom te ver aqui cedo! Você já pode aprender, treinar e montar seu portfólio.
Para fechar contrato com marcas antes dos 18, você vai precisar da autorização dos
seus responsáveis, e o MEI só pode ser aberto a partir dos 18."

A lead fica marcada na planilha para ficar de fora de ofertas pagas.

### Fechamento
"Fez a tarefa? Volte pro grupo e conte: **'Fiz a tarefa do Momento {nome do
momento}!'** 💛 Fique de olho no grupo: vem muita coisa boa por aí."

Não vende nada.

### Card de compartilhamento (formato Stories)
"Meu Momento UGC é **{emoji} {nome do momento}**. Descobre o seu:
ousadiamarketing.com.br/momento-ugc"

## Ordem do resultado

1. Abertura com o desejo (pergunta 5), nome e frase do momento, escada dos 5
   momentos com o pin "📍 você está aqui".
2. Seu diagnóstico (texto do momento).
3. O que está te travando: crença (P7), bloqueio (P8) e medo (P9), cada um com
   a escolha dela e a resposta.
4. O que você precisa fazer agora: tarefa de hoje + 3 passos.
5. Aula do seu momento: vídeo do YouTube, ou "em breve" com o tema enquanto não subir.
6. O que começar a estudar + filmes e séries (mães ganham também *Maid*).
7. Suas próximas vitórias (3 marcos) e o aviso para menores de 18, se for o caso.
8. Fechamento: aviso do e-mail, botão "Receber no WhatsApp da Juh" (mensagem
   pronta com o momento), voltar pro grupo, compartilhar.

## Como a menina recebe

- **Na tela**, na hora.
- **Por e-mail**, automático: o Apps Script monta o e-mail com o mesmo conteúdo
  da tela. Conta Gmail comum envia ~100 e-mails/dia pelo Apps Script; o que
  passar disso fica "pendente" na planilha e sai sozinho nos dias seguintes.
- **Por WhatsApp**, pelo botão: abre conversa com a Juh com a mensagem pronta
  ("…meu Momento UGC é ▶️ Play"). Envio automático de WhatsApp exigiria a API
  oficial do WhatsApp Business (paga e com aprovação da Meta), fora do escopo.

## Onde ficam os dados

Planilha nova no Drive, com o script `docs/apps-script/momento-ugc-google-sheets.gs`:
aba **Respostas** (uma linha por menina, perfil em colunas sim/vazio, "Outro" em
coluna própria, UF pelo DDD, UTMs, status do e-mail) e aba **Painel** (contagens
de cada pergunta e os cruzamentos momento × ajuda e momento × bloqueio). A
Ousadia recebe um resumo por e-mail todo dia às 8h, com as perguntas pra Juh.

## Relatório da pesquisa (depois das respostas)

| Cruzamento | Decisão que ele orienta |
|---|---|
| Quantas em cada momento | Que produto criar primeiro |
| Ranking de crenças, bloqueios e medos | Pauta dos conteúdos e objeções da copy |
| Momento × tipo de ajuda (P10) | Formato de cada produto |
| Perfil (P3) × bloqueio (P8) | Duração e horário (ex.: mãe solo × falta de tempo) |
| Meta (P6) | Tamanho da promessa |
| Medos (P9) | Garantias e provas necessárias |
| Campo aberto | Frases exatas para títulos e anúncios |

## Origem das mudanças

As perguntas 1 a 6 foram ajustadas a partir de respostas reais que as meninas deram
na caixinha do Instagram da Juh: mãe solo, independência do marido, edição de vídeo,
dúvida sobre CNPJ, uma menina de 16 anos e "tenho o curso, mas nunca coloquei em prática".

## Pendências

- [x] Nome: "Qual é o seu Momento UGC?" → `/momento-ugc`
- [x] As 5 trilhas viram 5 momentos (Descoberta, Será?, Play, Rascunho, Match)
- [x] Sem PDF: o resultado é o diagnóstico completo (decisão de 07/10/2026)
- [x] Página, e-mail e Apps Script construídos
- [ ] Criar a planilha no Drive, colar o script, rodar `configurar`, implantar e
      colar a URL em `SHEET_ENDPOINT_MOMENTO_UGC` (`lib/site.ts`). **Sem isso nada
      é gravado: não divulgar antes.**
- [ ] IDs dos 5 vídeos do YouTube (`video.youtubeId` em `lib/momento-ugc.ts`)
- [ ] Juh revisar os textos (tom, e a resposta sobre CNPJ — ela tem vídeo sobre isso)
