/**
 * OUSADIA MARKETING · Backend do "Qual é o seu Momento UGC?" (Google Apps Script)
 * -------------------------------------------------------------------------------
 * Para cada menina que faz o diagnóstico em `/momento-ugc`, este script:
 *   1. grava todas as respostas numa planilha no seu Google Drive (aba "Respostas");
 *   2. manda pro e-mail DELA o diagnóstico completo (momento, travas, o que fazer,
 *      o que estudar, o que assistir e as próximas vitórias);
 *   3. mantém a aba "Painel" com a contagem da pesquisa (momentos, desejos,
 *      crenças, bloqueios, medos, tipo de ajuda...), atualizada sozinha;
 *   4. manda pra Ousadia um resumo por dia, em vez de um e-mail por resposta.
 * Tudo gratuito. Mesmo padrão dos outros scripts desta pasta.
 *
 * SEGURANÇA: a URL deste script é pública (precisa ser, pro site gravar), então
 * qualquer pessoa pode mandar dados pra ela. Por isso o navegador manda só as
 * ESCOLHAS da menina (`email_chaves`: ids do momento, crença, bloqueio...) e o
 * e-mail é montado aqui, com os textos e links do bloco CONTEUDO GERADO. Ninguém
 * consegue usar o script pra mandar texto ou link próprio em nome da Juh. Os
 * campos livres que entram no e-mail (primeiro nome e "Outro") passam por
 * `textoLivre`, que corta tamanho e remove links. Cada endereço recebe no
 * máximo 1 e-mail a cada 6 horas, e células que começam com = + - @ são
 * gravadas como texto (senão o Sheets executaria como fórmula).
 *
 * Os textos vêm de `lib/momento-ugc.ts`. Mudou um texto lá? Rode
 * `npm run gs:momento-ugc` no projeto e cole este arquivo de novo.
 *
 * ⚠ LIMITE DE E-MAIL DO GOOGLE: uma conta Gmail comum envia no máximo ~100
 * e-mails por dia pelo Apps Script (Google Workspace: ~1.500). Se o grupo
 * inteiro responder no mesmo dia, as respostas são gravadas normalmente e os
 * e-mails que passarem do limite ficam "pendente" na planilha. A rotina
 * `reenviarPendentes` (instalada no passo 6) manda o restante nos dias
 * seguintes, sozinha. Por isso a página avisa que o e-mail "pode levar
 * algumas horas".
 *
 * COMO USAR (uma vez só):
 * 1. No Google Drive, crie uma planilha nova (ex.: "Momento UGC — respostas").
 * 2. Na planilha: Extensões > Apps Script. Apague o conteúdo e cole este arquivo.
 * 3. Ajuste EMAIL_AVISO abaixo, se quiser outro e-mail pro resumo diário.
 * 4. Salve (ícone de disquete). No topo, escolha a função `configurar` e clique
 *    em Executar. Autorize quando o Google pedir ("Avançado" > "Acessar…" se
 *    aparecer o aviso de app não verificado: o app é você mesmo).
 *    Isso cria as abas "Respostas" e "Painel" e instala as rotinas automáticas.
 * 5. Implantar > Nova implantação > tipo "App da Web".
 *    - Executar como: Eu.
 *    - Quem tem acesso: Qualquer pessoa.
 * 6. Teste a URL gerada no navegador: deve responder "Momento UGC online".
 *    Se pedir login do Google, a implantação não ficou pública: repita o
 *    passo 5 escolhendo "Qualquer pessoa".
 * 7. Cole a URL (termina em `/exec`) em `SHEET_ENDPOINT_MOMENTO_UGC`, no
 *    arquivo `lib/site.ts` do site.
 *
 * Se mudar este código depois: Implantar > Gerenciar implantações > lápis >
 * Versão: "Nova versão". Sem isso a URL continua rodando o código antigo.
 */

// E-mail que recebe o resumo diário. Vazio = sem resumo.
var EMAIL_AVISO = "ousadiamkt@gmail.com";

// true = também avisa a cada resposta (gasta a cota de e-mail que vai pras meninas).
var AVISO_A_CADA_RESPOSTA = false;

// Nome que aparece como remetente no e-mail da menina.
var REMETENTE = "Juh · Mapa do UGC";

// >>> CONTEUDO GERADO por scripts/gerar-momento-ugc-gs.mjs a partir de lib/momento-ugc.ts.
// Não edite à mão: mude o texto lá e rode `npm run gs:momento-ugc`.
var CONTEUDO = {
  "marcador_nome": "{{NOME}}",
  "momentos": {
    "descoberta": {
      "momento": "🔍 Momento Descoberta",
      "frase": "Você sentiu que tem algo aqui pra você e quer entender o que é.",
      "diagnostico": "Você está no comecinho, e isso é ótimo: quem entende o mercado antes de sair gravando economiza meses de tentativa e erro. Hoje o que falta não é talento nem vontade, é clareza. Você ainda não sabe direito o que é UGC, como as marcas contratam e por onde começar, e por isso tudo parece maior e mais distante do que realmente é.",
      "tarefa": "Abra o Instagram ou o TikTok e salve 5 vídeos de marcas que você já usa em que uma pessoa comum mostra o produto. Repare: você acabou de ver UGC.",
      "fazer": [
        "Entender a diferença entre influenciadora e creator UGC: uma vende a audiência, a outra vende o conteúdo.",
        "Treinar o olhar: quando aparecer um anúncio com uma pessoa comum mostrando um produto, pergunte “isso é UGC?”.",
        "Anotar 3 tipos de produto que você já usa e gosta (beleza, casa, maternidade, comida…). Eles são pistas do seu futuro nicho."
      ],
      "estudar": [
        "O que é UGC e como ele é diferente de influência",
        "Como as marcas usam vídeos de creators nos anúncios delas",
        "Permuta e cachê: as duas portas de entrada",
        "Os formatos mais pedidos: unboxing, review, tutorial e “antes e depois”"
      ],
      "assistir": [
        {
          "titulo": "Girlboss",
          "tipo": "Série · 2017",
          "porque": "Uma jovem sem rumo começa vendendo roupa usada pela internet e descobre que dá pra transformar o que ela gosta em trabalho."
        },
        {
          "titulo": "Emily em Paris",
          "tipo": "Série · 2020",
          "porque": "Leve e divertida, mostra por dentro como as marcas trabalham com redes sociais e criadores de conteúdo."
        }
      ],
      "vitorias": [
        {
          "titulo": "Entender o jogo",
          "texto": "Conseguir explicar pra uma amiga o que é UGC, com as suas palavras."
        },
        {
          "titulo": "Montar seu radar",
          "texto": "Ter uma pasta com 20 vídeos UGC salvos que te inspiram."
        },
        {
          "titulo": "Primeiro REC",
          "texto": "Gravar seu primeiro vídeo de produto, mesmo que só pra você ver."
        }
      ],
      "video_tema": "UGC explicado do zero: o que é, como as marcas contratam e como começar",
      "video_url": "https://www.youtube.com/watch?v=rNkRbpJMglY",
      "grupo_url": "https://chat.whatsapp.com/IFS158jFoeEEXqltGJMLCG",
      "whatsapp_url": "https://wa.me/5593992282674?text=Oi%2C%20Juh!%20Aqui%20%C3%A9%20a%20%7B%7BNOME%7D%7D.%20Fiz%20o%20diagn%C3%B3stico%20e%20meu%20Momento%20UGC%20%C3%A9%20%F0%9F%94%8D%20Descoberta.%20%F0%9F%92%9B"
    },
    "sera": {
      "momento": "💭 Momento “Será?”",
      "frase": "Você já sabe o caminho, só falta acreditar que ele é pra você.",
      "diagnostico": "Você já entendeu o que é UGC e sabe que existe um caminho. O que segura você agora não é falta de informação, é uma voz que pergunta “será que é pra mim?”. Esse é o momento em que mais gente para, porque compara o próprio começo com o meio do caminho de outras creators. A boa notícia: crença se troca por prova, e prova a gente constrói com passos pequenos.",
      "tarefa": "Escreva 3 motivos pelos quais uma marca escolheria você (ex.: “eu explico bem”, “eu uso muito esse tipo de produto”, “eu sou parecida com a cliente dela”).",
      "fazer": [
        "Parar de se comparar com creators grandes: elas também começaram do zero, você só não viu esse começo.",
        "Separar fato de medo: liste o que você acha que precisa ter antes de começar e confira se é verdade mesmo.",
        "Seguir creators pequenas, de preferência do Norte, que já fecham com marcas. Ver que é possível muda tudo."
      ],
      "estudar": [
        "Por que as marcas contratam pessoas comuns, e não só famosas",
        "Como funciona o vídeo que a marca posta no perfil dela e usa em anúncio",
        "Histórias de creators que começaram com poucos seguidores",
        "Como mostrar seus pontos fortes sem parecer forçada"
      ],
      "assistir": [
        {
          "titulo": "Fake Famous",
          "tipo": "Documentário · 2021",
          "porque": "Mostra como seguidores podem ser comprados e fama pode ser fabricada. Depois dele, número de seguidores nunca mais vai te assustar."
        },
        {
          "titulo": "À Procura da Felicidade",
          "tipo": "Filme · 2006",
          "porque": "Sobre continuar acreditando quando tudo diz que não vai dar. Pra assistir com lenço do lado."
        }
      ],
      "vitorias": [
        {
          "titulo": "Virar a chave",
          "texto": "Completar a frase “uma marca pode me escolher porque…” com 3 motivos reais."
        },
        {
          "titulo": "Ver que é possível",
          "texto": "Conhecer 3 creators pequenas que já fecharam com marcas."
        },
        {
          "titulo": "Primeiro REC",
          "texto": "Gravar um vídeo de produto e perceber que você consegue."
        }
      ],
      "video_tema": "Você não precisa ser influenciadora: histórias de quem começou com poucos seguidores",
      "video_url": "",
      "grupo_url": "https://chat.whatsapp.com/IFS158jFoeEEXqltGJMLCG",
      "whatsapp_url": "https://wa.me/5593992282674?text=Oi%2C%20Juh!%20Aqui%20%C3%A9%20a%20%7B%7BNOME%7D%7D.%20Fiz%20o%20diagn%C3%B3stico%20e%20meu%20Momento%20UGC%20%C3%A9%20%F0%9F%92%AD%20%E2%80%9CSer%C3%A1%3F%E2%80%9D.%20%F0%9F%92%9B"
    },
    "play": {
      "momento": "▶️ Momento Play",
      "frase": "A vontade tá aí, falta apertar o REC.",
      "diagnostico": "Você já sabe o que é UGC e tem vontade. Talvez até já tenha estudado ou comprado curso. O que falta é o primeiro REC. Pode ser vergonha, o celular, a falta de tempo ou a espera pela hora perfeita, mas o resultado é o mesmo: o conhecimento fica parado. Neste momento, o mais importante não é aprender mais, é gravar algo pequeno e imperfeito hoje.",
      "tarefa": "Grave 15 segundos mostrando um produto que você tem em casa. Não precisa postar nem aparecer o rosto: só suas mãos e sua voz já valem.",
      "fazer": [
        "Gravar antes de se sentir pronta: o primeiro vídeo é pra treinar, não pra postar.",
        "Se a câmera ainda pesa, começar por formatos sem rosto: só as mãos, a voz e o produto.",
        "Reservar 15 minutos fixos na semana pra gravar, do tamanho da sua rotina."
      ],
      "estudar": [
        "Luz natural: como usar a janela a seu favor",
        "Como captar um som limpo com o próprio celular",
        "Roteiro de 30 segundos: gancho, produto e chamada",
        "Edição simples no celular, com aplicativos gratuitos como o CapCut"
      ],
      "assistir": [
        {
          "titulo": "Julie & Julia",
          "tipo": "Filme · 2009",
          "porque": "Uma mulher comum se desafia a cozinhar uma receita por dia e contar tudo num blog. Constância antes de perfeição."
        },
        {
          "titulo": "Chef",
          "tipo": "Filme · 2014",
          "porque": "Um chef recomeça do zero com um food truck, e o filho dele grava tudo com o celular. Os vídeos simples mudam o jogo."
        }
      ],
      "vitorias": [
        {
          "titulo": "Primeiro REC",
          "texto": "Gravar 15 segundos de um produto que você tem em casa."
        },
        {
          "titulo": "Três vídeos",
          "texto": "Gravar 3 vídeos curtos em uma semana, mesmo sem postar."
        },
        {
          "titulo": "Primeira edição",
          "texto": "Editar um vídeo do começo ao fim, no celular."
        }
      ],
      "video_tema": "Bastidor: como gravar um vídeo UGC só com o celular, em casa",
      "video_url": "",
      "grupo_url": "https://chat.whatsapp.com/IFS158jFoeEEXqltGJMLCG",
      "whatsapp_url": "https://wa.me/5593992282674?text=Oi%2C%20Juh!%20Aqui%20%C3%A9%20a%20%7B%7BNOME%7D%7D.%20Fiz%20o%20diagn%C3%B3stico%20e%20meu%20Momento%20UGC%20%C3%A9%20%E2%96%B6%EF%B8%8F%20Play.%20%F0%9F%92%9B"
    },
    "rascunho": {
      "momento": "✏️ Momento Rascunho",
      "frase": "Você já cria, agora é dar forma ao seu portfólio.",
      "diagnostico": "Você já grava, e isso coloca você na frente de muita gente que ainda está esperando. O que falta agora é direção: seus vídeos estão soltos, sem um nicho claro e sem um lugar onde uma marca consiga ver o seu trabalho em 30 segundos. Neste momento, gravar mais não resolve. O que resolve é escolher um foco e organizar o que você já tem.",
      "tarefa": "Escolha 1 nicho (beleza, casa, maternidade, viagem…) e separe os 3 melhores vídeos que você já tem. Eles são o começo do seu portfólio.",
      "fazer": [
        "Escolher um nicho principal a partir do que você já usa e gosta.",
        "Separar seus melhores vídeos e regravar os que estão quase bons.",
        "Montar um portfólio simples, com um link fácil de mandar."
      ],
      "estudar": [
        "Como escolher um nicho sem medo de se limitar",
        "Os tipos de vídeo que todo portfólio de UGC precisa ter",
        "Portfólio no Canva: estrutura e o que colocar",
        "Bio e destaques de um perfil de creator"
      ],
      "assistir": [
        {
          "titulo": "A Vida e a História de Madam C.J. Walker",
          "tipo": "Minissérie · 2020",
          "porque": "Uma mulher que começou lavando roupa e construiu um império de produtos de beleza. Nicho claro e voz própria."
        },
        {
          "titulo": "O Diabo Veste Prada",
          "tipo": "Filme · 2006",
          "porque": "Sobre olhar pro detalhe, ter padrão de qualidade e aprender rápido num mercado exigente."
        }
      ],
      "vitorias": [
        {
          "titulo": "Nicho escolhido",
          "texto": "Decidir o seu nicho principal e ajustar a bio do perfil."
        },
        {
          "titulo": "Portfólio no ar",
          "texto": "Ter um link com pelo menos 5 vídeos organizados."
        },
        {
          "titulo": "Primeira abordagem",
          "texto": "Mandar o seu portfólio para a primeira marca."
        }
      ],
      "video_tema": "Montando um portfólio de UGC do zero, no celular e no Canva",
      "video_url": "",
      "grupo_url": "https://chat.whatsapp.com/IFS158jFoeEEXqltGJMLCG",
      "whatsapp_url": "https://wa.me/5593992282674?text=Oi%2C%20Juh!%20Aqui%20%C3%A9%20a%20%7B%7BNOME%7D%7D.%20Fiz%20o%20diagn%C3%B3stico%20e%20meu%20Momento%20UGC%20%C3%A9%20%E2%9C%8F%EF%B8%8F%20Rascunho.%20%F0%9F%92%9B"
    },
    "match": {
      "momento": "💌 Momento Match",
      "frase": "Você tá pronta pra dar match com as marcas.",
      "diagnostico": "Você já tem o que mostrar, e talvez até já tenha recebido produtos ou fechado um job. Agora o jogo muda: não é mais sobre criar, é sobre ser encontrada e escolhida. O que separa você das próximas marcas é abordagem, preço e constância de prospecção. Neste momento, cada mensagem bem enviada vale mais do que mais um vídeo no portfólio.",
      "tarefa": "Liste 10 marcas que você usa de verdade e siga as 10 hoje. Amanhã, mande a primeira mensagem.",
      "fazer": [
        "Criar uma rotina de prospecção, com um número fixo de marcas abordadas por semana.",
        "Definir sua tabela de preços, mesmo que simples, pra não travar quando perguntarem.",
        "Estar onde as marcas procuram creators: plataformas de UGC e marketplaces de creators."
      ],
      "estudar": [
        "A mensagem de abordagem que a marca responde",
        "Quanto cobrar no começo e quando subir o preço",
        "Permuta ou cachê: quando aceitar cada um",
        "MEI e nota fiscal: quando faz sentido abrir"
      ],
      "assistir": [
        {
          "titulo": "Joy: O Nome do Sucesso",
          "tipo": "Filme · 2015",
          "porque": "Uma mãe divorciada inventa um produto e vende milhares quando ela mesma o demonstra na TV. É UGC antes de existir UGC."
        },
        {
          "titulo": "Fyre Festival: Fiasco no Caribe",
          "tipo": "Documentário · 2019",
          "porque": "Os bastidores de uma campanha com influenciadoras que deu muito errado. Ensina a olhar o mercado com olhos de profissional."
        }
      ],
      "vitorias": [
        {
          "titulo": "Rotina de prospecção",
          "texto": "Abordar 10 marcas em uma semana."
        },
        {
          "titulo": "Próximo sim",
          "texto": "Fechar a sua próxima permuta ou job."
        },
        {
          "titulo": "Primeiro cachê",
          "texto": "Receber em dinheiro por um vídeo (ou cobrar mais caro que da última vez)."
        }
      ],
      "video_tema": "Como abordar marcas e quanto cobrar no começo",
      "video_url": "",
      "grupo_url": "https://chat.whatsapp.com/IFS158jFoeEEXqltGJMLCG",
      "whatsapp_url": "https://wa.me/5593992282674?text=Oi%2C%20Juh!%20Aqui%20%C3%A9%20a%20%7B%7BNOME%7D%7D.%20Fiz%20o%20diagn%C3%B3stico%20e%20meu%20Momento%20UGC%20%C3%A9%20%F0%9F%92%8C%20Match.%20%F0%9F%92%9B"
    }
  },
  "aberturas": {
    "": "{{NOME}}, o seu sonho tem lugar aqui. Esse caminho existe, e ele começa exatamente de onde você está.",
    "proprio_dinheiro": "{{NOME}}, você quer ter o seu próprio dinheiro, sem depender de ninguém. Esse caminho existe, e ele começa exatamente de onde você está.",
    "filhos": "{{NOME}}, você quer trabalhar de casa, sem abrir mão dos seus filhos. Esse caminho existe, e ele começa exatamente de onde você está.",
    "horarios": "{{NOME}}, você quer ter horários que cabem na sua vida. Esse caminho existe, e ele começa exatamente de onde você está.",
    "respirar": "{{NOME}}, você quer respirar no fim do mês. Esse caminho existe, e ele começa exatamente de onde você está.",
    "sonho": "{{NOME}}, você quer realizar aquele sonho que está guardado. Esse caminho existe, e ele começa exatamente de onde você está.",
    "viver_disso": "{{NOME}}, você quer um dia viver de criar conteúdo. Esse caminho existe, e ele começa exatamente de onde você está."
  },
  "travas": {
    "titulos": [
      "O pensamento que está te segurando",
      "O que te impede hoje",
      "Sobre o seu medo"
    ],
    "crenca": {
      "outro": {
        "rotulo": "Outro",
        "texto": "Seja qual for o pensamento, ele é comum, e outras meninas do grupo também pensam assim. O seu diagnóstico foi feito pra te ajudar a dar o próximo passo mesmo com ele aí."
      },
      "seguidores": {
        "rotulo": "“Preciso ter muitos seguidores”",
        "texto": "Não precisa. No UGC, a marca contrata o seu vídeo, não o seu número de seguidores. Muitas vezes o vídeo nem vai pro seu perfil: a marca posta no perfil dela ou usa em anúncio. O que ela compra é a sua capacidade de criar."
      },
      "celular": {
        "rotulo": "“Preciso de um celular melhor antes de começar”",
        "texto": "Você não precisa esperar o celular perfeito, o cenário perfeito ou a experiência perfeita. Os celulares de hoje gravam bem o suficiente. O que faz um vídeo vender é luz, som e um roteiro simples, e tudo isso dá pra aprender com o que você já tem."
      },
      "cnpj": {
        "rotulo": "“Preciso de CNPJ ou MEI pra trabalhar com marca”",
        "texto": "Pra começar, não necessariamente. Muitas marcas fecham com CPF, principalmente em permuta e nos primeiros jobs. Algumas plataformas e empresas pedem CNPJ pra emitir nota, e aí abrir um MEI é simples e barato. É um passo pra quando os jobs ficarem frequentes, não uma barreira pra começar."
      },
      "norte": {
        "rotulo": "“Morando aqui no Norte, as marcas não vão me ver”",
        "texto": "O UGC é feito à distância: a marca manda o produto pelos Correios, você grava em casa e entrega pela internet. E morar na Amazônia pode ser o seu diferencial, não o seu limite. A Juh é de Altamira, no Pará, e já atendeu mais de 70 marcas sem sair daqui."
      },
      "aparencia": {
        "rotulo": "“Não sou bonita ou boa o suficiente para aparecer”",
        "texto": "As marcas não procuram gente perfeita, procuram gente real, que pareça com a cliente delas. É justamente por isso que o UGC existe: as pessoas confiam mais em alguém como elas do que numa propaganda. E muito vídeo UGC nem mostra o rosto."
      },
      "golpe": {
        "rotulo": "“Isso dá dinheiro de verdade ou é promessa da internet?”",
        "texto": "Dá, mas não é dinheiro rápido nem garantido, e quem te prometer isso merece desconfiança. É um trabalho: começa com permuta e primeiros jobs pequenos, e cresce com prática e constância. A gente vai te mostrar o caminho real, sem atalho mágico."
      },
      "caminho": {
        "rotulo": "“Eu consigo, só me falta o caminho”",
        "texto": "Essa é a melhor coisa que você poderia pensar, e você está certa. Vontade você já tem; o que falta é direção, e é isso que o seu diagnóstico começa a te dar."
      }
    },
    "bloqueio": {
      "outro": {
        "rotulo": "Outro",
        "texto": "Todo bloqueio tem um primeiro passo do tamanho de hoje. Comece pela tarefa que está logo abaixo."
      },
      "vergonha": {
        "rotulo": "Vergonha de aparecer na câmera",
        "texto": "Comece sem mostrar o rosto: mãos, voz e o produto em cena já são UGC. A câmera fica mais leve a cada vídeo, não antes do primeiro."
      },
      "o_que_gravar": {
        "rotulo": "Não saber o que gravar e postar",
        "texto": "Não invente do zero: grave o que você já usa no dia a dia. Um produto, o problema que ele resolve e a sua opinião sincera já são um roteiro."
      },
      "editar": {
        "rotulo": "Não saber editar meus vídeos",
        "texto": "Edição de UGC é mais simples do que parece: cortar, colocar legenda e uma música baixinha. Dá pra fazer tudo no celular, com aplicativos gratuitos como o CapCut."
      },
      "abordar": {
        "rotulo": "Não saber abordar marcas nem quanto cobrar",
        "texto": "Abordar marca é habilidade, não dom. Uma mensagem curta, que fala da marca (e não só de você), com o link do seu portfólio, já coloca você na frente."
      },
      "tempo": {
        "rotulo": "Falta de tempo com a rotina e os filhos",
        "texto": "UGC cabe em pedaços: 15 minutos pra gravar, 15 pra editar. Escolha um horário fixo na semana, mesmo que seja quando as crianças dormem."
      },
      "manter": {
        "rotulo": "Eu começo, mas não consigo manter",
        "texto": "Troque a meta grande por uma pequena e fixa, tipo 1 vídeo por semana. Constância nasce de passos pequenos, não de força de vontade."
      },
      "dinheiro": {
        "rotulo": "Falta de dinheiro para investir em aprender",
        "texto": "Dá pra começar sem investir nada: o celular que você tem, a luz da janela e os produtos da sua casa. Use primeiro o que é gratuito."
      }
    },
    "medo": {
      "outro": {
        "rotulo": "Outro",
        "texto": "Todo medo que você sente, outras meninas também sentem. Ele não precisa sumir pra você começar, só não pode decidir por você."
      },
      "vergonha": {
        "rotulo": "Passar vergonha com quem me conhece",
        "texto": "Quase toda creator sentiu isso no começo. A boa notícia: no UGC você pode começar sem postar nada no seu perfil pessoal, porque o vídeo vai direto pra marca."
      },
      "nao_dar_certo": {
        "rotulo": "Investir tempo ou dinheiro e não dar certo",
        "texto": "Por isso este primeiro passo é gratuito. Comece pequeno, com o que você já tem, e veja com seus próprios olhos antes de investir em qualquer coisa."
      },
      "rejeicao": {
        "rotulo": "Ser ignorada ou rejeitada pelas marcas",
        "texto": "Ouvir “não” faz parte, e não é sobre você. Toda creator que fecha com marca ouviu vários “nãos” antes. A gente ajusta a abordagem e segue."
      },
      "desistir": {
        "rotulo": "Começar e desistir no meio, de novo",
        "texto": "Desta vez, o passo é do tamanho da sua rotina: uma tarefa por vez, de poucos minutos. E você não está sozinha: o grupo está aí pra caminhar junto."
      },
      "golpe": {
        "rotulo": "Cair em golpe ou promessa falsa",
        "texto": "Desconfiar é sinal de inteligência. Guarde duas regras: ninguém sério promete dinheiro rápido e garantido, e marca de verdade nunca pede pra você pagar pra trabalhar com ela."
      },
      "desvalorizada": {
        "rotulo": "Ser desvalorizada e trabalhar de graça",
        "texto": "Permuta pode ser um ótimo começo, mas o seu trabalho tem valor. Você vai aprender a enxergar quando vale aceitar permuta e quando é hora de cobrar."
      }
    }
  },
  "indicacao_maes": {
    "titulo": "Maid",
    "tipo": "Série · 2021",
    "porque": "Uma mãe solo recomeça do zero e encontra força onde ninguém via. Pra lembrar que o seu esforço tem valor."
  },
  "aviso_menor": "Que bom te ver aqui cedo! Você já pode aprender, treinar e montar seu portfólio. Para fechar contrato com marcas antes dos 18, você vai precisar da autorização dos seus responsáveis, e o MEI só pode ser aberto a partir dos 18."
};
// <<< CONTEUDO GERADO

var ABA_RESPOSTAS = "Respostas";
var ABA_PAINEL = "Painel";

// Ordem das colunas — as chaves têm que bater com `payloadPlanilha()` em
// `lib/momento-ugc.ts`. `email_status` e `email_conteudo` são preenchidas por
// este script.
var COLUNAS = [
  "data",
  "nome",
  "whatsapp",
  "email",
  "instagram",
  "faixa_idade",
  "menor_de_idade",
  "uf",
  "cidade",
  "ddd",
  "momento",
  "frase_momento",
  "perfil_clt",
  "perfil_conta_propria",
  "perfil_estuda",
  "perfil_sem_renda",
  "perfil_mae",
  "perfil_mae_solo",
  "perfil_cuida_casa",
  "desejo_principal",
  "desejo_proprio_dinheiro",
  "desejo_filhos",
  "desejo_horarios",
  "desejo_respirar",
  "desejo_sonho",
  "desejo_viver_disso",
  "desejo_outro",
  "meta",
  "crenca",
  "crenca_outro",
  "bloqueio",
  "bloqueio_outro",
  "medo",
  "medo_outro",
  "ajuda",
  "pergunta_para_juh",
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "email_status",
  "email_conteudo",
  // Colunas novas entram sempre no fim, pra não deslocar as planilhas que já existem.
  "consentimento",
];

/* ------------------------------------------------------------------ *
 * Recebe cada resposta do site
 * ------------------------------------------------------------------ */

// Limites contra abuso: tamanho do envio inteiro e de cada célula.
var LIMITE_CORPO = 20000;
var LIMITE_CELULA = 500;

function doPost(e) {
  var lock = LockService.getScriptLock();
  try {
    var bruto = e && e.postData ? String(e.postData.contents || "") : "";
    if (!bruto || bruto.length > LIMITE_CORPO) return json({ ok: false, erro: "envio inválido" });
    var dados = JSON.parse(bruto);
    if (!dados || typeof dados !== "object") return json({ ok: false, erro: "envio inválido" });
    if (String(dados.nome || "").trim().length < 2) return json({ ok: false, erro: "nome vazio" });

    var chaves = chavesValidas(dados.email_chaves);
    dados.email_conteudo = chaves ? JSON.stringify(chaves) : "";
    dados.email_status = "pendente";

    // Várias meninas podem responder no mesmo segundo: a trava evita que duas
    // gravações disputem a mesma linha.
    lock.waitLock(30000);
    var sheet = abaRespostas();
    var linha = COLUNAS.map(function (c) {
      return c === "data" ? new Date() : celula(dados[c]);
    });
    sheet.appendRow(linha);
    var numLinha = sheet.getLastRow();
    lock.releaseLock();

    var status = enviarDiagnostico(dados, chaves);
    sheet.getRange(numLinha, COLUNAS.indexOf("email_status") + 1).setValue(status);

    if (AVISO_A_CADA_RESPOSTA && EMAIL_AVISO && MailApp.getRemainingDailyQuota() > 0) {
      MailApp.sendEmail({
        to: EMAIL_AVISO,
        subject: "Momento UGC: " + dados.nome + " (" + dados.momento + ")",
        body:
          "Nome: " + dados.nome + "\nWhatsApp: " + dados.whatsapp + "\nE-mail: " + dados.email +
          "\nMomento: " + dados.momento + "\nCrença: " + dados.crenca + "\nBloqueio: " + dados.bloqueio +
          "\nMedo: " + dados.medo + "\nPergunta pra Juh: " + (dados.pergunta_para_juh || "—"),
      });
    }

    return json({ ok: true });
  } catch (err) {
    try { lock.releaseLock(); } catch (_) {}
    return json({ ok: false, erro: String(err) });
  }
}

// Permite testar a URL no navegador.
function doGet() {
  return ContentService.createTextOutput("Momento UGC online");
}

function json(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

/* ------------------------------------------------------------------ *
 * E-mail da menina
 * ------------------------------------------------------------------ */

/**
 * Valor de uma célula: texto, cortado no limite e protegido contra fórmula.
 * O apóstrofo no começo faz o Sheets mostrar o valor como texto puro.
 */
function celula(v) {
  var s = String(v == null ? "" : v).slice(0, LIMITE_CELULA);
  return /^[=+\-@]/.test(s) ? "'" + s : s;
}

/** Texto digitado pela menina que vai entrar no e-mail: sem link, sem quebra, curto. */
function textoLivre(s, max) {
  return String(s == null ? "" : s)
    .replace(/[\u0000-\u001f\u007f]/g, " ")
    .replace(/(https?:\/\/|www\.)\S*/gi, "")
    .replace(/\b[\w-]+(\.[a-z]{2,})+\b\S*/gi, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max);
}

/** Busca só nas chaves do próprio objeto ("constructor", "toString"... não contam). */
function proprio(obj, chave) {
  return Object.prototype.hasOwnProperty.call(obj, chave) ? obj[chave] : null;
}

/** Só aceita ids que existem no CONTEUDO; qualquer outra coisa = sem e-mail. */
function chavesValidas(ch) {
  if (!ch || typeof ch !== "object" || !proprio(CONTEUDO.momentos, ch.momento)) return null;
  var id = function (v) { return String(v == null ? "" : v).slice(0, 40); };
  return {
    momento: id(ch.momento),
    desejo: id(ch.desejo),
    crenca: id(ch.crenca),
    bloqueio: id(ch.bloqueio),
    medo: id(ch.medo),
    mae: ch.mae === true,
    menor: ch.menor === true,
  };
}

/** Monta o conteúdo do e-mail com os textos deste arquivo — nada vem pronto do navegador. */
function montarConteudo(ch, reg) {
  var c = JSON.parse(JSON.stringify(CONTEUDO.momentos[ch.momento]));
  var marca = CONTEUDO.marcador_nome;
  var nome = textoLivre(String(reg.nome || "").trim().split(/\s+/)[0], 40) || "Oi";

  c.primeiro_nome = nome;
  c.abertura = (proprio(CONTEUDO.aberturas, ch.desejo) || CONTEUDO.aberturas[""]).replace(marca, nome);
  c.whatsapp_url = c.whatsapp_url.replace(encodeURIComponent(marca), encodeURIComponent(nome));
  c.travas = ["crenca", "bloqueio", "medo"].map(function (k, i) {
    var opcoes = CONTEUDO.travas[k];
    var conhecida = ch[k] !== "outro" && proprio(opcoes, ch[k]);
    return {
      titulo: CONTEUDO.travas.titulos[i],
      escolha: conhecida ? conhecida.rotulo : textoLivre(reg[k + "_outro"], 120) || "Outro",
      texto: (conhecida || opcoes.outro).texto,
    };
  });
  if (ch.mae) c.assistir.push(CONTEUDO.indicacao_maes);
  c.aviso_menor = ch.menor ? CONTEUDO.aviso_menor : "";
  return c;
}

/**
 * Manda o diagnóstico pra lead. `reg` é a linha (chaves de COLUNAS).
 * Devolve o status que vai pra planilha: enviado, pendente, repetido, sem e-mail ou erro.
 */
function enviarDiagnostico(reg, chaves) {
  var email = String(reg.email || "").trim().toLowerCase();
  if (!chaves || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email) || email.length > 120) return "sem e-mail";

  // Um e-mail por endereço a cada 6 horas: impede usar o formulário pra
  // encher a caixa de alguém (e gastar a cota diária do Google).
  var cache = CacheService.getScriptCache();
  var chaveCache = "enviado:" + email;
  if (cache.get(chaveCache)) return "repetido (já recebeu nas últimas 6h)";

  if (MailApp.getRemainingDailyQuota() < 1) return "pendente";
  var c = montarConteudo(chaves, reg);
  try {
    MailApp.sendEmail({
      to: email,
      name: REMETENTE,
      subject: c.primeiro_nome + ", o seu Momento UGC é " + c.momento,
      htmlBody: htmlEmail(c),
      body: textoEmail(c),
    });
    cache.put(chaveCache, "1", 21600);
    return "enviado " + Utilities.formatDate(new Date(), "America/Belem", "dd/MM HH:mm");
  } catch (err) {
    return "erro: " + String(err).slice(0, 120);
  }
}

function esc(s) {
  return String(s == null ? "" : s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

var COR = { roxo: "#2a1150", amarelo: "#f5c518", texto: "#2b2238", cinza: "#6b6178", fundo: "#f6f3fa" };

function titulo(t) {
  return '<h2 style="margin:32px 0 12px;font-size:19px;color:' + COR.roxo + ';">' + esc(t) + "</h2>";
}

function lista(itens) {
  return (
    '<ul style="margin:0;padding-left:20px;">' +
    itens.map(function (i) { return '<li style="margin:0 0 8px;">' + esc(i) + "</li>"; }).join("") +
    "</ul>"
  );
}

function botao(href, rotulo, primario) {
  return (
    '<a href="' + esc(href) + '" style="display:inline-block;margin:6px 6px 0 0;padding:12px 20px;border-radius:999px;' +
    "font-weight:bold;text-decoration:none;" +
    (primario ? "background:" + COR.amarelo + ";color:" + COR.roxo + ";" : "border:2px solid " + COR.roxo + ";color:" + COR.roxo + ";") +
    '">' + esc(rotulo) + "</a>"
  );
}

function htmlEmail(c) {
  var h = "";
  h += '<div style="background:' + COR.fundo + ';padding:24px 12px;font-family:Arial,Helvetica,sans-serif;color:' + COR.texto + ';line-height:1.55;font-size:15px;">';
  h += '<div style="max-width:600px;margin:0 auto;background:#ffffff;border-radius:16px;overflow:hidden;">';

  // Topo
  h += '<div style="background:' + COR.roxo + ';color:#ffffff;padding:32px 28px;">';
  h += '<p style="margin:0 0 20px;font-size:16px;">' + esc(c.abertura) + "</p>";
  h += '<p style="margin:0;font-size:12px;letter-spacing:2px;text-transform:uppercase;color:' + COR.amarelo + ';">Seu Momento UGC</p>';
  h += '<p style="margin:6px 0 0;font-size:28px;font-weight:bold;">' + esc(c.momento) + "</p>";
  h += '<p style="margin:10px 0 0;font-size:17px;color:' + COR.amarelo + ';">“' + esc(c.frase) + "”</p>";
  h += "</div>";

  h += '<div style="padding:8px 28px 32px;">';

  h += titulo("Seu diagnóstico");
  h += "<p style=\"margin:0;\">" + esc(c.diagnostico) + "</p>";

  h += titulo("O que está te travando");
  c.travas.forEach(function (t) {
    h += '<div style="margin:0 0 12px;padding:14px 16px;border-left:4px solid ' + COR.amarelo + ';background:' + COR.fundo + ';border-radius:8px;">';
    h += '<p style="margin:0;font-size:11px;letter-spacing:1px;text-transform:uppercase;color:' + COR.cinza + ';">' + esc(t.titulo) + "</p>";
    h += '<p style="margin:4px 0 6px;font-weight:bold;">' + esc(t.escolha) + "</p>";
    h += '<p style="margin:0;">' + esc(t.texto) + "</p>";
    h += "</div>";
  });

  h += titulo("O que você precisa fazer agora");
  h += '<div style="margin:0 0 14px;padding:14px 16px;border:2px solid ' + COR.amarelo + ';border-radius:10px;">';
  h += '<p style="margin:0;font-size:11px;letter-spacing:1px;text-transform:uppercase;color:' + COR.cinza + ';">Sua tarefa de hoje</p>';
  h += '<p style="margin:4px 0 0;">' + esc(c.tarefa) + "</p></div>";
  h += lista(c.fazer);

  h += titulo("Aula do seu momento");
  h += c.video_url
    ? '<p style="margin:0 0 8px;">' + esc(c.video_tema) + "</p>" + botao(c.video_url, "Assistir no YouTube", true)
    : '<p style="margin:0;"><strong>' + esc(c.video_tema) + "</strong><br>A Juh está preparando esta aula. Ela vai chegar primeiro no grupo do WhatsApp.</p>";

  h += titulo("O que começar a estudar");
  h += lista(c.estudar);

  h += titulo("Pra assistir e se inspirar");
  c.assistir.forEach(function (f) {
    h += '<p style="margin:0 0 12px;"><strong>' + esc(f.titulo) + "</strong> <span style=\"color:" + COR.cinza + ';font-size:13px;">(' + esc(f.tipo) + ")</span><br>" + esc(f.porque) + "</p>";
  });

  h += titulo("Suas próximas vitórias");
  c.vitorias.forEach(function (v, i) {
    h += '<p style="margin:0 0 10px;"><strong style="color:' + COR.roxo + ';">' + (i + 1) + ". " + esc(v.titulo) + ":</strong> " + esc(v.texto) + "</p>";
  });

  if (c.aviso_menor) {
    h += '<p style="margin:20px 0 0;padding:14px 16px;background:#e8f4fb;border-radius:8px;">' + esc(c.aviso_menor) + "</p>";
  }

  h += '<div style="margin:32px 0 0;padding:20px;background:' + COR.fundo + ';border-radius:12px;text-align:center;">';
  h += '<p style="margin:0 0 10px;font-weight:bold;">Fez a tarefa? Volte pro grupo e conte pra gente 💛</p>';
  h += botao(c.grupo_url, "Voltar pro grupo", true) + botao(c.whatsapp_url, "Falar com a Juh", false);
  h += "</div>";

  h += "</div></div>";
  h += '<p style="max-width:600px;margin:16px auto 0;font-size:12px;color:' + COR.cinza + ';text-align:center;">';
  h += "Você recebeu este e-mail porque fez o diagnóstico Qual é o seu Momento UGC? no site da Ousadia Marketing. ";
  h += "Se não quiser mais receber, é só responder este e-mail com a palavra SAIR.</p>";
  h += "</div>";
  return h;
}

/** Versão em texto puro, pra quem lê e-mail sem HTML. */
function textoEmail(c) {
  var t = [];
  t.push(c.abertura, "", "SEU MOMENTO UGC: " + c.momento, "“" + c.frase + "”", "");
  t.push("SEU DIAGNÓSTICO", c.diagnostico, "");
  t.push("O QUE ESTÁ TE TRAVANDO");
  c.travas.forEach(function (x) { t.push("- " + x.titulo + ": " + x.escolha, "  " + x.texto); });
  t.push("", "SUA TAREFA DE HOJE", c.tarefa, "", "O QUE VOCÊ PRECISA FAZER AGORA");
  c.fazer.forEach(function (x) { t.push("- " + x); });
  t.push("", "AULA DO SEU MOMENTO", c.video_tema + (c.video_url ? " — " + c.video_url : " (em breve no grupo)"));
  t.push("", "O QUE COMEÇAR A ESTUDAR");
  c.estudar.forEach(function (x) { t.push("- " + x); });
  t.push("", "PRA ASSISTIR");
  c.assistir.forEach(function (x) { t.push("- " + x.titulo + " (" + x.tipo + "): " + x.porque); });
  t.push("", "SUAS PRÓXIMAS VITÓRIAS");
  c.vitorias.forEach(function (x, i) { t.push(i + 1 + ". " + x.titulo + ": " + x.texto); });
  if (c.aviso_menor) t.push("", c.aviso_menor);
  t.push("", "Grupo: " + c.grupo_url, "Falar com a Juh: " + c.whatsapp_url);
  t.push("", "Para não receber mais, responda este e-mail com SAIR.");
  return t.join("\n");
}

/* ------------------------------------------------------------------ *
 * Rotinas automáticas (instaladas pelo `configurar`)
 * ------------------------------------------------------------------ */

/** Manda os e-mails que ficaram "pendente" por causa do limite diário. */
function reenviarPendentes() {
  var sheet = abaRespostas();
  var n = sheet.getLastRow() - 1;
  if (n < 1) return;
  var colStatus = COLUNAS.indexOf("email_status") + 1;
  var dados = sheet.getRange(2, 1, n, COLUNAS.length).getValues();

  for (var i = 0; i < dados.length; i++) {
    if (String(dados[i][colStatus - 1]) !== "pendente") continue;
    if (MailApp.getRemainingDailyQuota() < 1) break;
    var reg = {};
    COLUNAS.forEach(function (c, j) { reg[c] = dados[i][j]; });
    var chaves = null;
    try { chaves = chavesValidas(JSON.parse(reg.email_conteudo)); } catch (_) {}
    // Linhas gravadas antes da correção de segurança guardavam o e-mail pronto,
    // e não as escolhas: essas não são reenviadas.
    var status = chaves ? enviarDiagnostico(reg, chaves) : "erro: formato antigo, reenviar à mão";
    sheet.getRange(i + 2, colStatus).setValue(status);
  }
}

/** Resumo das últimas 24h pra Ousadia. */
function resumoDiario() {
  if (!EMAIL_AVISO || MailApp.getRemainingDailyQuota() < 1) return;
  var sheet = abaRespostas();
  var n = sheet.getLastRow() - 1;
  if (n < 1) return;
  var dados = sheet.getRange(2, 1, n, COLUNAS.length).getValues();
  var desde = new Date(Date.now() - 24 * 60 * 60 * 1000);
  var colMomento = COLUNAS.indexOf("momento");
  var colStatus = COLUNAS.indexOf("email_status");
  var colPergunta = COLUNAS.indexOf("pergunta_para_juh");

  var novas = 0, porMomento = {}, pendentes = 0, perguntas = [];
  dados.forEach(function (l) {
    if (String(l[colStatus]) === "pendente") pendentes++;
    if (!(l[0] instanceof Date) || l[0] < desde) return;
    novas++;
    porMomento[l[colMomento]] = (porMomento[l[colMomento]] || 0) + 1;
    if (String(l[colPergunta]).trim()) perguntas.push("- " + l[colPergunta]);
  });
  if (!novas && !pendentes) return;

  var corpo = ["Momento UGC — últimas 24 horas", "", "Novas respostas: " + novas, "Total na planilha: " + n, ""];
  Object.keys(porMomento).forEach(function (m) { corpo.push(m + ": " + porMomento[m]); });
  if (pendentes) corpo.push("", "E-mails ainda na fila (limite diário do Google): " + pendentes);
  if (perguntas.length) corpo.push("", "Perguntas pra Juh:", perguntas.join("\n"));
  corpo.push("", "Planilha: " + SpreadsheetApp.getActiveSpreadsheet().getUrl());

  MailApp.sendEmail({ to: EMAIL_AVISO, subject: "Momento UGC: " + novas + " respostas novas", body: corpo.join("\n") });
}

/* ------------------------------------------------------------------ *
 * Configuração (rodar uma vez pelo editor)
 * ------------------------------------------------------------------ */

function configurar() {
  var sheet = abaRespostas();
  sheet.setFrozenRows(1);
  sheet.getRange(1, 1, 1, COLUNAS.length).setFontWeight("bold");
  // O conteúdo do e-mail é técnico (usado só pra reenviar): fica escondido.
  sheet.hideColumns(COLUNAS.indexOf("email_conteudo") + 1);

  montarPainel();

  ScriptApp.getProjectTriggers().forEach(function (t) {
    var f = t.getHandlerFunction();
    if (f === "reenviarPendentes" || f === "resumoDiario") ScriptApp.deleteTrigger(t);
  });
  ScriptApp.newTrigger("reenviarPendentes").timeBased().everyHours(6).create();
  ScriptApp.newTrigger("resumoDiario").timeBased().everyDays(1).atHour(8).create();
}

function abaRespostas() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(ABA_RESPOSTAS);
  if (!sheet) {
    // Planilha nova: aproveita a primeira aba, se estiver vazia.
    var primeira = ss.getSheets()[0];
    sheet = primeira.getLastRow() === 0 ? primeira.setName(ABA_RESPOSTAS) : ss.insertSheet(ABA_RESPOSTAS);
  }
  if (sheet.getLastRow() === 0) sheet.appendRow(COLUNAS);
  else if (sheet.getLastColumn() < COLUNAS.length) {
    // Planilha antiga e coluna nova no fim (ex.: consentimento): completa o cabeçalho.
    sheet.getRange(1, 1, 1, COLUNAS.length).setValues([COLUNAS]).setFontWeight("bold");
  }
  return sheet;
}

function letra(chave) {
  var n = COLUNAS.indexOf(chave) + 1, s = "";
  while (n > 0) {
    var r = (n - 1) % 26;
    s = String.fromCharCode(65 + r) + s;
    n = Math.floor((n - 1) / 26);
  }
  return s;
}

/**
 * Aba "Painel": a pesquisa contada sozinha. As fórmulas leem a aba
 * "Respostas", então se atualizam a cada nova resposta.
 */
function montarPainel() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var p = ss.getSheetByName(ABA_PAINEL) || ss.insertSheet(ABA_PAINEL);
  p.clear();
  var R = "'" + ABA_RESPOSTAS + "'!";
  var faixa = R + "A:" + letra(COLUNAS[COLUNAS.length - 1]);

  p.getRange("A1").setValue("Momento UGC — painel da pesquisa").setFontWeight("bold").setFontSize(14);
  p.getRange("A2").setValue("Total de respostas");
  p.getRange("B2").setFormula("=MAX(COUNTA(" + R + "A:A)-1,0)");

  // Contagem de cada pergunta, lado a lado (linha 4 em diante).
  var blocos = [
    ["momento", "Momento"],
    ["desejo_principal", "Desejo principal"],
    ["meta", "Primeira vitória"],
    ["crenca", "Crença"],
    ["bloqueio", "Bloqueio"],
    ["medo", "Medo"],
    ["ajuda", "Tipo de ajuda"],
    ["faixa_idade", "Idade"],
    ["uf", "Estado"],
    ["cidade", "Cidade"],
  ];
  blocos.forEach(function (b, i) {
    var col = i * 3 + 1, L = letra(b[0]);
    p.getRange(4, col).setValue(b[1]).setFontWeight("bold");
    p.getRange(5, col).setFormula(
      '=IFERROR(QUERY(' + faixa + ',"select ' + L + ", count(" + L + ") where " + L + " <> '' group by " + L +
      " order by count(" + L + ") desc label " + L + " '', count(" + L + ") 'Total'\",1),\"\")"
    );
  });

  // Perfil (pergunta de múltipla escolha): uma contagem por opção.
  var perfis = [
    ["perfil_clt", "CLT"],
    ["perfil_conta_propria", "Conta própria"],
    ["perfil_estuda", "Estuda"],
    ["perfil_sem_renda", "Sem renda fixa"],
    ["perfil_mae", "Mãe"],
    ["perfil_mae_solo", "Mãe solo"],
    ["perfil_cuida_casa", "Cuida da casa"],
    ["menor_de_idade", "Menores de 18"],
  ];
  p.getRange(20, 1).setValue("Perfil").setFontWeight("bold");
  perfis.forEach(function (x, i) {
    p.getRange(21 + i, 1).setValue(x[1]);
    p.getRange(21 + i, 2).setFormula('=COUNTIF(' + R + letra(x[0]) + ':' + letra(x[0]) + ',"sim")');
  });

  // Cruzamentos que mais ajudam a desenhar produto.
  var cruzamentos = [
    ["momento", "ajuda", "Momento × tipo de ajuda", 4],
    ["momento", "bloqueio", "Momento × bloqueio", 12],
  ];
  cruzamentos.forEach(function (x) {
    var A = letra(x[0]), B = letra(x[1]), col = x[3];
    p.getRange(20, col).setValue(x[2]).setFontWeight("bold");
    p.getRange(21, col).setFormula(
      '=IFERROR(QUERY(' + faixa + ',"select ' + A + ", count(" + A + ") where " + A + " <> '' group by " + A +
      " pivot " + B + "\",1),\"\")"
    );
  });

  // Desejo (múltipla escolha): quantas marcaram cada um.
  var desejos = [
    ["desejo_proprio_dinheiro", "Próprio dinheiro, sem depender de ninguém"],
    ["desejo_filhos", "Trabalhar de casa, sem abrir mão dos filhos"],
    ["desejo_horarios", "Horários que cabem na vida"],
    ["desejo_respirar", "Respirar no fim do mês"],
    ["desejo_sonho", "Comprar algo que quer muito"],
    ["desejo_viver_disso", "Viver só disso um dia"],
  ];
  p.getRange(31, 1).setValue("Desejos (todas as marcações)").setFontWeight("bold");
  desejos.forEach(function (x, i) {
    p.getRange(32 + i, 1).setValue(x[1]);
    p.getRange(32 + i, 2).setFormula('=COUNTIF(' + R + letra(x[0]) + ':' + letra(x[0]) + ',"sim")');
  });

  p.setFrozenRows(2);
}
