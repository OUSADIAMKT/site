/**
 * "Qual é o seu Momento UGC?" — diagnóstico gratuito do Mapa do UGC (Juh).
 *
 * Antes de tudo, é uma **pesquisa de mercado**: aquece o grupo de WhatsApp
 * antes do aulão de 7/nov e mostra o momento, as dores, os desejos e o CBM
 * (crenças, bloqueios e medos) das meninas, para orientar os próximos cursos.
 * Não vende nada.
 *
 * Especificação aprovada: `docs/diagnostico-ugc.md`.
 * Backend (planilha + e-mail para a lead): `docs/apps-script/momento-ugc-google-sheets.gs`.
 *
 * Este arquivo é a fonte única dos textos: a página e o e-mail que a menina
 * recebe usam o mesmo conteúdo (o e-mail vai montado em `conteudoEmail()`).
 */

import { GRUPO_MAPA_UGC, SHEET_ENDPOINT_MOMENTO_UGC, waAulaoUgc } from "@/lib/site";

/* ------------------------------------------------------------------ *
 * Perguntas
 * ------------------------------------------------------------------ */

export type Opcao = { id: string; lab: string };

export type Pergunta = {
  key:
    | "idade"
    | "local"
    | "perfil"
    | "momento"
    | "desejo"
    | "meta"
    | "crenca"
    | "bloqueio"
    | "medo"
    | "ajuda";
  /** O que a pergunta mede — aparece como etiqueta acima do título. */
  tema: string;
  titulo: string;
  dica: string;
  /**
   * Várias respostas permitidas (perfil e desejo). Crença, bloqueio e medo
   * ficam com uma só de propósito: é "o principal" que personaliza o
   * resultado e faz o ranking da pesquisa sair limpo.
   */
  multipla?: boolean;
  /** Embaralhar as opções para a ordem não distorcer o ranking da pesquisa. */
  embaralhar?: boolean;
  /** Mostra "Outro: ___" no fim, com campo de texto. */
  outro?: boolean;
  opcoes: Opcao[];
};

/** Id reservado para a opção "Outro". */
export const OUTRO = "outro";

/** Estados para a pergunta "Onde você mora?" — Norte primeiro, que é o público. */
export const UFS: Opcao[] = [
  ["PA", "Pará"],
  ["AM", "Amazonas"],
  ["AP", "Amapá"],
  ["RR", "Roraima"],
  ["RO", "Rondônia"],
  ["AC", "Acre"],
  ["TO", "Tocantins"],
  ["MA", "Maranhão"],
  ["AL", "Alagoas"],
  ["BA", "Bahia"],
  ["CE", "Ceará"],
  ["DF", "Distrito Federal"],
  ["ES", "Espírito Santo"],
  ["GO", "Goiás"],
  ["MT", "Mato Grosso"],
  ["MS", "Mato Grosso do Sul"],
  ["MG", "Minas Gerais"],
  ["PB", "Paraíba"],
  ["PR", "Paraná"],
  ["PE", "Pernambuco"],
  ["PI", "Piauí"],
  ["RJ", "Rio de Janeiro"],
  ["RN", "Rio Grande do Norte"],
  ["RS", "Rio Grande do Sul"],
  ["SC", "Santa Catarina"],
  ["SP", "São Paulo"],
  ["SE", "Sergipe"],
  ["EX", "Moro fora do Brasil"],
].map(([id, lab]) => ({ id, lab }));

export const PERGUNTAS: Pergunta[] = [
  {
    key: "idade",
    tema: "Sobre você",
    titulo: "Qual é a sua idade?",
    dica: "Escolha a sua faixa.",
    opcoes: [
      { id: "menos_18", lab: "Menos de 18" },
      { id: "18_24", lab: "18 a 24" },
      { id: "25_30", lab: "25 a 30" },
      { id: "31_35", lab: "31 a 35" },
      { id: "36_mais", lab: "36 ou mais" },
    ],
  },
  {
    // Pergunta especial: estado (lista) + cidade (texto). A tela trata à parte;
    // a resposta fica em `ids[0]` (UF) e `outro` (cidade).
    key: "local",
    tema: "Sobre você",
    titulo: "Onde você mora?",
    dica: "Escolha o estado e escreva o nome da cidade.",
    opcoes: UFS,
  },
  {
    key: "perfil",
    tema: "Sua vida hoje",
    titulo: "O que descreve você hoje?",
    dica: "Pode marcar mais de uma.",
    multipla: true,
    opcoes: [
      { id: "clt", lab: "Trabalho de carteira assinada (CLT)" },
      { id: "autonoma", lab: "Trabalho por conta própria" },
      { id: "estuda", lab: "Estudo" },
      { id: "sem_renda", lab: "Estou sem renda fixa" },
      { id: "mae", lab: "Sou mãe" },
      { id: "mae_solo", lab: "Sou mãe solo" },
      { id: "casa", lab: "Cuido da casa" },
    ],
  },
  {
    key: "momento",
    tema: "Seu momento",
    titulo: "Qual frase mais parece com você hoje?",
    dica: "Escolha a que mais combina, mesmo que não seja perfeita.",
    opcoes: [
      { id: "nao_entendi", lab: "Ainda não entendi direito o que é UGC" },
      { id: "nao_gravei", lab: "Já entendi, mas ainda não gravei nada" },
      { id: "nao_pratiquei", lab: "Já estudei ou comprei curso, mas nunca coloquei em prática" },
      { id: "sem_foco", lab: "Já gravo alguns vídeos, mas sem foco e sem portfólio" },
      { id: "sem_marca", lab: "Tenho portfólio, mas nenhuma marca fechou comigo" },
      { id: "ja_recebi", lab: "Já recebi produto ou fechei algum job" },
    ],
  },
  {
    key: "desejo",
    tema: "Seu sonho",
    titulo: "Se você ganhasse dinheiro criando vídeos, o que mudaria na sua vida?",
    dica: "Pode marcar mais de uma. Marque primeiro o que mais pesa no seu coração.",
    multipla: true,
    outro: true,
    opcoes: [
      { id: "proprio_dinheiro", lab: "Ter meu próprio dinheiro, sem depender de ninguém" },
      { id: "filhos", lab: "Trabalhar de casa, sem abrir mão dos meus filhos" },
      { id: "horarios", lab: "Ter horários que cabem na minha vida" },
      { id: "respirar", lab: "Respirar no fim do mês" },
      { id: "sonho", lab: "Comprar algo que quero muito (celular, viagem…)" },
      { id: "viver_disso", lab: "Viver só disso um dia" },
    ],
  },
  {
    key: "meta",
    tema: "Sua primeira vitória",
    titulo: "O que já seria uma vitória pra você no começo?",
    dica: "Sem certo ou errado: cada começo tem o seu tamanho.",
    opcoes: [
      { id: "permuta", lab: "Só receber produtos (permuta) já seria incrível" },
      { id: "ate_200", lab: "Até R$ 200 por mês" },
      { id: "200_500", lab: "De R$ 200 a R$ 500 por mês" },
      { id: "500_1000", lab: "De R$ 500 a R$ 1.000 por mês" },
      { id: "salario", lab: "Um salário mínimo ou mais" },
    ],
  },
  {
    key: "crenca",
    tema: "Seus pensamentos",
    titulo: "Qual desses pensamentos mais aparece na sua cabeça?",
    dica: "Seja sincera: ninguém além da Juh vai ver.",
    embaralhar: true,
    outro: true,
    opcoes: [
      { id: "seguidores", lab: "“Preciso ter muitos seguidores”" },
      { id: "celular", lab: "“Preciso de um celular melhor antes de começar”" },
      { id: "cnpj", lab: "“Preciso de CNPJ ou MEI pra trabalhar com marca”" },
      { id: "norte", lab: "“Morando aqui no Norte, as marcas não vão me ver”" },
      { id: "aparencia", lab: "“Não sou bonita ou boa o suficiente para aparecer”" },
      { id: "golpe", lab: "“Isso dá dinheiro de verdade ou é promessa da internet?”" },
      { id: "caminho", lab: "“Eu consigo, só me falta o caminho”" },
    ],
  },
  {
    key: "bloqueio",
    tema: "O que te trava",
    titulo: "O que mais te impede de avançar hoje?",
    dica: "Escolha o principal.",
    embaralhar: true,
    outro: true,
    opcoes: [
      { id: "vergonha", lab: "Vergonha de aparecer na câmera" },
      { id: "o_que_gravar", lab: "Não saber o que gravar e postar" },
      { id: "editar", lab: "Não saber editar meus vídeos" },
      { id: "abordar", lab: "Não saber abordar marcas nem quanto cobrar" },
      { id: "tempo", lab: "Falta de tempo com a rotina e os filhos" },
      { id: "manter", lab: "Eu começo, mas não consigo manter" },
      { id: "dinheiro", lab: "Falta de dinheiro para investir em aprender" },
    ],
  },
  {
    key: "medo",
    tema: "Seus medos",
    titulo: "Qual o seu maior medo nessa jornada?",
    dica: "Todo medo é bem-vindo aqui.",
    embaralhar: true,
    outro: true,
    opcoes: [
      { id: "vergonha", lab: "Passar vergonha com quem me conhece" },
      { id: "nao_dar_certo", lab: "Investir tempo ou dinheiro e não dar certo" },
      { id: "rejeicao", lab: "Ser ignorada ou rejeitada pelas marcas" },
      { id: "desistir", lab: "Começar e desistir no meio, de novo" },
      { id: "golpe", lab: "Cair em golpe ou promessa falsa" },
      { id: "desvalorizada", lab: "Ser desvalorizada e trabalhar de graça" },
    ],
  },
  {
    key: "ajuda",
    tema: "Como te ajudar",
    titulo: "Que tipo de ajuda você gostaria de ter agora?",
    dica: "Isso guia o que a gente vai criar pra você.",
    // Vai do mais leve ao mais intenso — a ordem é a informação, não embaralha.
    opcoes: [
      { id: "material", lab: "Um material para ler no meu tempo" },
      { id: "aula_ao_vivo", lab: "Uma aula ao vivo para tirar dúvidas" },
      { id: "curso_gravado", lab: "Um curso gravado com passo a passo" },
      { id: "grupo_desafios", lab: "Um grupo com desafios práticos e outras meninas" },
      { id: "acompanhamento", lab: "Alguém me acompanhando de perto" },
    ],
  },
];

export type Resposta = { ids: string[]; outro: string };
export type Respostas = Partial<Record<Pergunta["key"], Resposta>>;

/* ------------------------------------------------------------------ *
 * Os 5 momentos
 * ------------------------------------------------------------------ */

export type MomentoKey = "descoberta" | "sera" | "play" | "rascunho" | "match";

export type Indicacao = { titulo: string; tipo: string; porque: string };

export type Momento = {
  key: MomentoKey;
  emoji: string;
  nome: string;
  frase: string;
  diagnostico: string;
  /** O que ela precisa fazer agora — 3 passos. */
  fazer: string[];
  tarefa: string;
  estudar: string[];
  assistir: Indicacao[];
  vitorias: { titulo: string; texto: string }[];
  /**
   * Vídeo do momento. `youtubeId` fica vazio até a Juh subir o vídeo: cole o
   * trecho depois de `v=` (ou de `youtu.be/`) e ele aparece na página e no
   * e-mail. Enquanto vazio, a página mostra só o tema com "em breve".
   */
  video: { tema: string; youtubeId: string };
};

export const MOMENTOS: Momento[] = [
  {
    key: "descoberta",
    emoji: "🔍",
    nome: "Descoberta",
    frase: "Você sentiu que tem algo aqui pra você e quer entender o que é.",
    diagnostico:
      "Você está no comecinho, e isso é ótimo: quem entende o mercado antes de sair gravando economiza meses de tentativa e erro. Hoje o que falta não é talento nem vontade, é clareza. Você ainda não sabe direito o que é UGC, como as marcas contratam e por onde começar, e por isso tudo parece maior e mais distante do que realmente é.",
    fazer: [
      "Entender a diferença entre influenciadora e creator UGC: uma vende a audiência, a outra vende o conteúdo.",
      "Treinar o olhar: quando aparecer um anúncio com uma pessoa comum mostrando um produto, pergunte “isso é UGC?”.",
      "Anotar 3 tipos de produto que você já usa e gosta (beleza, casa, maternidade, comida…). Eles são pistas do seu futuro nicho.",
    ],
    tarefa:
      "Abra o Instagram ou o TikTok e salve 5 vídeos de marcas que você já usa em que uma pessoa comum mostra o produto. Repare: você acabou de ver UGC.",
    estudar: [
      "O que é UGC e como ele é diferente de influência",
      "Como as marcas usam vídeos de creators nos anúncios delas",
      "Permuta e cachê: as duas portas de entrada",
      "Os formatos mais pedidos: unboxing, review, tutorial e “antes e depois”",
    ],
    assistir: [
      {
        titulo: "Girlboss",
        tipo: "Série · 2017",
        porque:
          "Uma jovem sem rumo começa vendendo roupa usada pela internet e descobre que dá pra transformar o que ela gosta em trabalho.",
      },
      {
        titulo: "Emily em Paris",
        tipo: "Série · 2020",
        porque:
          "Leve e divertida, mostra por dentro como as marcas trabalham com redes sociais e criadores de conteúdo.",
      },
    ],
    vitorias: [
      { titulo: "Entender o jogo", texto: "Conseguir explicar pra uma amiga o que é UGC, com as suas palavras." },
      { titulo: "Montar seu radar", texto: "Ter uma pasta com 20 vídeos UGC salvos que te inspiram." },
      { titulo: "Primeiro REC", texto: "Gravar seu primeiro vídeo de produto, mesmo que só pra você ver." },
    ],
    video: {
      tema: "UGC explicado do zero: o que é, como as marcas contratam e como começar",
      youtubeId: "rNkRbpJMglY",
    },
  },
  {
    key: "sera",
    emoji: "💭",
    nome: "“Será?”",
    frase: "Você já sabe o caminho, só falta acreditar que ele é pra você.",
    diagnostico:
      "Você já entendeu o que é UGC e sabe que existe um caminho. O que segura você agora não é falta de informação, é uma voz que pergunta “será que é pra mim?”. Esse é o momento em que mais gente para, porque compara o próprio começo com o meio do caminho de outras creators. A boa notícia: crença se troca por prova, e prova a gente constrói com passos pequenos.",
    fazer: [
      "Parar de se comparar com creators grandes: elas também começaram do zero, você só não viu esse começo.",
      "Separar fato de medo: liste o que você acha que precisa ter antes de começar e confira se é verdade mesmo.",
      "Seguir creators pequenas, de preferência do Norte, que já fecham com marcas. Ver que é possível muda tudo.",
    ],
    tarefa:
      "Escreva 3 motivos pelos quais uma marca escolheria você (ex.: “eu explico bem”, “eu uso muito esse tipo de produto”, “eu sou parecida com a cliente dela”).",
    estudar: [
      "Por que as marcas contratam pessoas comuns, e não só famosas",
      "Como funciona o vídeo que a marca posta no perfil dela e usa em anúncio",
      "Histórias de creators que começaram com poucos seguidores",
      "Como mostrar seus pontos fortes sem parecer forçada",
    ],
    assistir: [
      {
        titulo: "Fake Famous",
        tipo: "Documentário · 2021",
        porque:
          "Mostra como seguidores podem ser comprados e fama pode ser fabricada. Depois dele, número de seguidores nunca mais vai te assustar.",
      },
      {
        titulo: "À Procura da Felicidade",
        tipo: "Filme · 2006",
        porque: "Sobre continuar acreditando quando tudo diz que não vai dar. Pra assistir com lenço do lado.",
      },
    ],
    vitorias: [
      { titulo: "Virar a chave", texto: "Completar a frase “uma marca pode me escolher porque…” com 3 motivos reais." },
      { titulo: "Ver que é possível", texto: "Conhecer 3 creators pequenas que já fecharam com marcas." },
      { titulo: "Primeiro REC", texto: "Gravar um vídeo de produto e perceber que você consegue." },
    ],
    video: {
      tema: "Você não precisa ser influenciadora: histórias de quem começou com poucos seguidores",
      youtubeId: "",
    },
  },
  {
    key: "play",
    emoji: "▶️",
    nome: "Play",
    frase: "A vontade tá aí, falta apertar o REC.",
    diagnostico:
      "Você já sabe o que é UGC e tem vontade. Talvez até já tenha estudado ou comprado curso. O que falta é o primeiro REC. Pode ser vergonha, o celular, a falta de tempo ou a espera pela hora perfeita, mas o resultado é o mesmo: o conhecimento fica parado. Neste momento, o mais importante não é aprender mais, é gravar algo pequeno e imperfeito hoje.",
    fazer: [
      "Gravar antes de se sentir pronta: o primeiro vídeo é pra treinar, não pra postar.",
      "Se a câmera ainda pesa, começar por formatos sem rosto: só as mãos, a voz e o produto.",
      "Reservar 15 minutos fixos na semana pra gravar, do tamanho da sua rotina.",
    ],
    tarefa:
      "Grave 15 segundos mostrando um produto que você tem em casa. Não precisa postar nem aparecer o rosto: só suas mãos e sua voz já valem.",
    estudar: [
      "Luz natural: como usar a janela a seu favor",
      "Como captar um som limpo com o próprio celular",
      "Roteiro de 30 segundos: gancho, produto e chamada",
      "Edição simples no celular, com aplicativos gratuitos como o CapCut",
    ],
    assistir: [
      {
        titulo: "Julie & Julia",
        tipo: "Filme · 2009",
        porque:
          "Uma mulher comum se desafia a cozinhar uma receita por dia e contar tudo num blog. Constância antes de perfeição.",
      },
      {
        titulo: "Chef",
        tipo: "Filme · 2014",
        porque:
          "Um chef recomeça do zero com um food truck, e o filho dele grava tudo com o celular. Os vídeos simples mudam o jogo.",
      },
    ],
    vitorias: [
      { titulo: "Primeiro REC", texto: "Gravar 15 segundos de um produto que você tem em casa." },
      { titulo: "Três vídeos", texto: "Gravar 3 vídeos curtos em uma semana, mesmo sem postar." },
      { titulo: "Primeira edição", texto: "Editar um vídeo do começo ao fim, no celular." },
    ],
    video: {
      tema: "Bastidor: como gravar um vídeo UGC só com o celular, em casa",
      youtubeId: "",
    },
  },
  {
    key: "rascunho",
    emoji: "✏️",
    nome: "Rascunho",
    frase: "Você já cria, agora é dar forma ao seu portfólio.",
    diagnostico:
      "Você já grava, e isso coloca você na frente de muita gente que ainda está esperando. O que falta agora é direção: seus vídeos estão soltos, sem um nicho claro e sem um lugar onde uma marca consiga ver o seu trabalho em 30 segundos. Neste momento, gravar mais não resolve. O que resolve é escolher um foco e organizar o que você já tem.",
    fazer: [
      "Escolher um nicho principal a partir do que você já usa e gosta.",
      "Separar seus melhores vídeos e regravar os que estão quase bons.",
      "Montar um portfólio simples, com um link fácil de mandar.",
    ],
    tarefa:
      "Escolha 1 nicho (beleza, casa, maternidade, viagem…) e separe os 3 melhores vídeos que você já tem. Eles são o começo do seu portfólio.",
    estudar: [
      "Como escolher um nicho sem medo de se limitar",
      "Os tipos de vídeo que todo portfólio de UGC precisa ter",
      "Portfólio no Canva: estrutura e o que colocar",
      "Bio e destaques de um perfil de creator",
    ],
    assistir: [
      {
        titulo: "A Vida e a História de Madam C.J. Walker",
        tipo: "Minissérie · 2020",
        porque:
          "Uma mulher que começou lavando roupa e construiu um império de produtos de beleza. Nicho claro e voz própria.",
      },
      {
        titulo: "O Diabo Veste Prada",
        tipo: "Filme · 2006",
        porque: "Sobre olhar pro detalhe, ter padrão de qualidade e aprender rápido num mercado exigente.",
      },
    ],
    vitorias: [
      { titulo: "Nicho escolhido", texto: "Decidir o seu nicho principal e ajustar a bio do perfil." },
      { titulo: "Portfólio no ar", texto: "Ter um link com pelo menos 5 vídeos organizados." },
      { titulo: "Primeira abordagem", texto: "Mandar o seu portfólio para a primeira marca." },
    ],
    video: {
      tema: "Montando um portfólio de UGC do zero, no celular e no Canva",
      youtubeId: "",
    },
  },
  {
    key: "match",
    emoji: "💌",
    nome: "Match",
    frase: "Você tá pronta pra dar match com as marcas.",
    diagnostico:
      "Você já tem o que mostrar, e talvez até já tenha recebido produtos ou fechado um job. Agora o jogo muda: não é mais sobre criar, é sobre ser encontrada e escolhida. O que separa você das próximas marcas é abordagem, preço e constância de prospecção. Neste momento, cada mensagem bem enviada vale mais do que mais um vídeo no portfólio.",
    fazer: [
      "Criar uma rotina de prospecção, com um número fixo de marcas abordadas por semana.",
      "Definir sua tabela de preços, mesmo que simples, pra não travar quando perguntarem.",
      "Estar onde as marcas procuram creators: plataformas de UGC e marketplaces de creators.",
    ],
    tarefa:
      "Liste 10 marcas que você usa de verdade e siga as 10 hoje. Amanhã, mande a primeira mensagem.",
    estudar: [
      "A mensagem de abordagem que a marca responde",
      "Quanto cobrar no começo e quando subir o preço",
      "Permuta ou cachê: quando aceitar cada um",
      "MEI e nota fiscal: quando faz sentido abrir",
    ],
    assistir: [
      {
        titulo: "Joy: O Nome do Sucesso",
        tipo: "Filme · 2015",
        porque:
          "Uma mãe divorciada inventa um produto e vende milhares quando ela mesma o demonstra na TV. É UGC antes de existir UGC.",
      },
      {
        titulo: "Fyre Festival: Fiasco no Caribe",
        tipo: "Documentário · 2019",
        porque:
          "Os bastidores de uma campanha com influenciadoras que deu muito errado. Ensina a olhar o mercado com olhos de profissional.",
      },
    ],
    vitorias: [
      { titulo: "Rotina de prospecção", texto: "Abordar 10 marcas em uma semana." },
      { titulo: "Próximo sim", texto: "Fechar a sua próxima permuta ou job." },
      { titulo: "Primeiro cachê", texto: "Receber em dinheiro por um vídeo (ou cobrar mais caro que da última vez)." },
    ],
    video: {
      tema: "Como abordar marcas e quanto cobrar no começo",
      youtubeId: "",
    },
  },
];

export function getMomento(key: MomentoKey) {
  return MOMENTOS.find((m) => m.key === key)!;
}

/** Indicação extra para mães — sai junto da lista do momento. */
export const INDICACAO_MAES: Indicacao = {
  titulo: "Maid",
  tipo: "Série · 2021",
  porque:
    "Uma mãe solo recomeça do zero e encontra força onde ninguém via. Pra lembrar que o seu esforço tem valor.",
};

/* ------------------------------------------------------------------ *
 * Textos personalizados (desejo, crença, bloqueio e medo)
 * ------------------------------------------------------------------ */

/** Completa "{Nome}, você quer ___." */
export const DESEJO_TEXTO: Record<string, string> = {
  proprio_dinheiro: "ter o seu próprio dinheiro, sem depender de ninguém",
  filhos: "trabalhar de casa, sem abrir mão dos seus filhos",
  horarios: "ter horários que cabem na sua vida",
  respirar: "respirar no fim do mês",
  sonho: "realizar aquele sonho que está guardado",
  viver_disso: "um dia viver de criar conteúdo",
};

export const CRENCA_TEXTO: Record<string, string> = {
  seguidores:
    "Não precisa. No UGC, a marca contrata o seu vídeo, não o seu número de seguidores. Muitas vezes o vídeo nem vai pro seu perfil: a marca posta no perfil dela ou usa em anúncio. O que ela compra é a sua capacidade de criar.",
  celular:
    "Você não precisa esperar o celular perfeito, o cenário perfeito ou a experiência perfeita. Os celulares de hoje gravam bem o suficiente. O que faz um vídeo vender é luz, som e um roteiro simples, e tudo isso dá pra aprender com o que você já tem.",
  cnpj:
    "Pra começar, não necessariamente. Muitas marcas fecham com CPF, principalmente em permuta e nos primeiros jobs. Algumas plataformas e empresas pedem CNPJ pra emitir nota, e aí abrir um MEI é simples e barato. É um passo pra quando os jobs ficarem frequentes, não uma barreira pra começar.",
  norte:
    "O UGC é feito à distância: a marca manda o produto pelos Correios, você grava em casa e entrega pela internet. E morar na Amazônia pode ser o seu diferencial, não o seu limite. A Juh é de Altamira, no Pará, e já atendeu mais de 70 marcas sem sair daqui.",
  aparencia:
    "As marcas não procuram gente perfeita, procuram gente real, que pareça com a cliente delas. É justamente por isso que o UGC existe: as pessoas confiam mais em alguém como elas do que numa propaganda. E muito vídeo UGC nem mostra o rosto.",
  golpe:
    "Dá, mas não é dinheiro rápido nem garantido, e quem te prometer isso merece desconfiança. É um trabalho: começa com permuta e primeiros jobs pequenos, e cresce com prática e constância. A gente vai te mostrar o caminho real, sem atalho mágico.",
  caminho:
    "Essa é a melhor coisa que você poderia pensar, e você está certa. Vontade você já tem; o que falta é direção, e é isso que o seu diagnóstico começa a te dar.",
  [OUTRO]:
    "Seja qual for o pensamento, ele é comum, e outras meninas do grupo também pensam assim. O seu diagnóstico foi feito pra te ajudar a dar o próximo passo mesmo com ele aí.",
};

export const BLOQUEIO_TEXTO: Record<string, string> = {
  vergonha:
    "Comece sem mostrar o rosto: mãos, voz e o produto em cena já são UGC. A câmera fica mais leve a cada vídeo, não antes do primeiro.",
  o_que_gravar:
    "Não invente do zero: grave o que você já usa no dia a dia. Um produto, o problema que ele resolve e a sua opinião sincera já são um roteiro.",
  editar:
    "Edição de UGC é mais simples do que parece: cortar, colocar legenda e uma música baixinha. Dá pra fazer tudo no celular, com aplicativos gratuitos como o CapCut.",
  abordar:
    "Abordar marca é habilidade, não dom. Uma mensagem curta, que fala da marca (e não só de você), com o link do seu portfólio, já coloca você na frente.",
  tempo:
    "UGC cabe em pedaços: 15 minutos pra gravar, 15 pra editar. Escolha um horário fixo na semana, mesmo que seja quando as crianças dormem.",
  manter:
    "Troque a meta grande por uma pequena e fixa, tipo 1 vídeo por semana. Constância nasce de passos pequenos, não de força de vontade.",
  dinheiro:
    "Dá pra começar sem investir nada: o celular que você tem, a luz da janela e os produtos da sua casa. Use primeiro o que é gratuito.",
  [OUTRO]: "Todo bloqueio tem um primeiro passo do tamanho de hoje. Comece pela tarefa que está logo abaixo.",
};

export const MEDO_TEXTO: Record<string, string> = {
  vergonha:
    "Quase toda creator sentiu isso no começo. A boa notícia: no UGC você pode começar sem postar nada no seu perfil pessoal, porque o vídeo vai direto pra marca.",
  nao_dar_certo:
    "Por isso este primeiro passo é gratuito. Comece pequeno, com o que você já tem, e veja com seus próprios olhos antes de investir em qualquer coisa.",
  rejeicao:
    "Ouvir “não” faz parte, e não é sobre você. Toda creator que fecha com marca ouviu vários “nãos” antes. A gente ajusta a abordagem e segue.",
  desistir:
    "Desta vez, o passo é do tamanho da sua rotina: uma tarefa por vez, de poucos minutos. E você não está sozinha: o grupo está aí pra caminhar junto.",
  golpe:
    "Desconfiar é sinal de inteligência. Guarde duas regras: ninguém sério promete dinheiro rápido e garantido, e marca de verdade nunca pede pra você pagar pra trabalhar com ela.",
  desvalorizada:
    "Permuta pode ser um ótimo começo, mas o seu trabalho tem valor. Você vai aprender a enxergar quando vale aceitar permuta e quando é hora de cobrar.",
  [OUTRO]:
    "Todo medo que você sente, outras meninas também sentem. Ele não precisa sumir pra você começar, só não pode decidir por você.",
};

export const AVISO_MENOR =
  "Que bom te ver aqui cedo! Você já pode aprender, treinar e montar seu portfólio. Para fechar contrato com marcas antes dos 18, você vai precisar da autorização dos seus responsáveis, e o MEI só pode ser aberto a partir dos 18.";

/* ------------------------------------------------------------------ *
 * Cálculo
 * ------------------------------------------------------------------ */

export type Lead = {
  nome: string;
  wpp: string;
  email: string;
  instagram: string;
  /** Resposta do campo aberto: "se pudesse perguntar uma coisa pra Juh". */
  pergunta: string;
};

export type Resultado = {
  momento: Momento;
  /** Rótulos das escolhas, já com o texto livre quando for "Outro". */
  crenca: { id: string; rotulo: string; texto: string };
  bloqueio: { id: string; rotulo: string; texto: string };
  medo: { id: string; rotulo: string; texto: string };
  /** Complemento da frase de abertura; vazio quando ela marcou "Outro". */
  desejo: string;
  mae: boolean;
  menor: boolean;
};

function primeira(r: Respostas, k: Pergunta["key"]) {
  return r[k]?.ids[0] ?? "";
}

/** Rótulo da opção escolhida, ou o texto livre quando for "Outro". */
export function rotulo(k: Pergunta["key"], resp?: Resposta) {
  if (!resp) return "";
  const p = PERGUNTAS.find((q) => q.key === k)!;
  return resp.ids
    .map((id) =>
      id === OUTRO
        ? resp.outro.trim() || "Outro"
        : (p.opcoes.find((o) => o.id === id)?.lab ?? id),
    )
    .join("; ");
}

/**
 * Regra de roteamento (spec, seção "Roteamento"): a pergunta do momento decide quase
 * tudo. Quem "já entendeu mas não gravou" vai para Play se o que trava é
 * câmera ou celular, e para "Será?" nos demais casos.
 */
export function momentoDe(r: Respostas): MomentoKey {
  switch (primeira(r, "momento")) {
    case "nao_entendi":
      return "descoberta";
    case "nao_gravei":
      return primeira(r, "bloqueio") === "vergonha" || primeira(r, "crenca") === "celular"
        ? "play"
        : "sera";
    case "nao_pratiquei":
      return "play";
    case "sem_foco":
      return "rascunho";
    default:
      return "match";
  }
}

export function calcular(r: Respostas): Resultado {
  const cbm = (k: "crenca" | "bloqueio" | "medo", textos: Record<string, string>) => {
    const id = primeira(r, k);
    return { id, rotulo: rotulo(k, r[k]), texto: textos[id] ?? textos[OUTRO] };
  };
  const perfil = r.perfil?.ids ?? [];
  return {
    momento: getMomento(momentoDe(r)),
    crenca: cbm("crenca", CRENCA_TEXTO),
    bloqueio: cbm("bloqueio", BLOQUEIO_TEXTO),
    medo: cbm("medo", MEDO_TEXTO),
    // Com várias respostas, a abertura usa a primeira que ela marcou.
    desejo: DESEJO_TEXTO[primeira(r, "desejo")] ?? "",
    mae: perfil.includes("mae") || perfil.includes("mae_solo"),
    menor: primeira(r, "idade") === "menos_18",
  };
}

export function indicacoes(res: Resultado) {
  return res.mae ? [...res.momento.assistir, INDICACAO_MAES] : res.momento.assistir;
}

export function primeiroNome(nome: string) {
  return nome.trim().split(/\s+/)[0] ?? "";
}

export function fraseAbertura(res: Resultado, nome: string) {
  const n = primeiroNome(nome);
  return res.desejo
    ? `${n}, você quer ${res.desejo}. Esse caminho existe, e ele começa exatamente de onde você está.`
    : `${n}, o seu sonho tem lugar aqui. Esse caminho existe, e ele começa exatamente de onde você está.`;
}

export function youtubeUrl(m: Momento) {
  return m.video.youtubeId ? `https://www.youtube.com/watch?v=${m.video.youtubeId}` : "";
}

/* ------------------------------------------------------------------ *
 * Local
 * ------------------------------------------------------------------ */

/** "  altamira " → "Altamira"; de/do/da ficam minúsculos. Pra contar cidade igual. */
export function normalizarCidade(c: string) {
  const minusculas = new Set(["de", "do", "da", "dos", "das", "e"]);
  return c
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase()
    .split(" ")
    .map((p, i) => (i > 0 && minusculas.has(p) ? p : p.charAt(0).toUpperCase() + p.slice(1)))
    .join(" ");
}

/** DDD do WhatsApp digitado, aceitando com ou sem o 55 na frente. */
export function dddDe(wpp: string) {
  let n = wpp.replace(/\D/g, "");
  if (n.length >= 12 && n.startsWith("55")) n = n.slice(2);
  return n.length >= 10 ? n.slice(0, 2) : "";
}

/* ------------------------------------------------------------------ *
 * Planilha e e-mail
 * ------------------------------------------------------------------ */

function utm(chave: string) {
  if (typeof window === "undefined") return "";
  return new URLSearchParams(window.location.search).get(chave) ?? "";
}

/** O que vai no e-mail da lead — o Apps Script só monta o HTML. */
export function conteudoEmail(res: Resultado, lead: Lead) {
  const m = res.momento;
  return {
    primeiro_nome: primeiroNome(lead.nome),
    abertura: fraseAbertura(res, lead.nome),
    momento: `${m.emoji} Momento ${m.nome}`,
    frase: m.frase,
    diagnostico: m.diagnostico,
    travas: [
      { titulo: "O pensamento que está te segurando", escolha: res.crenca.rotulo, texto: res.crenca.texto },
      { titulo: "O que te impede hoje", escolha: res.bloqueio.rotulo, texto: res.bloqueio.texto },
      { titulo: "Sobre o seu medo", escolha: res.medo.rotulo, texto: res.medo.texto },
    ],
    tarefa: m.tarefa,
    fazer: m.fazer,
    estudar: m.estudar,
    assistir: indicacoes(res),
    vitorias: m.vitorias,
    video_tema: m.video.tema,
    video_url: youtubeUrl(m),
    aviso_menor: res.menor ? AVISO_MENOR : "",
    grupo_url: GRUPO_MAPA_UGC,
    whatsapp_url: waAulaoUgc(mensagemWhatsapp(res, lead)),
  };
}

export function mensagemWhatsapp(res: Resultado, lead: Lead) {
  const n = primeiroNome(lead.nome);
  return `Oi, Juh! Aqui é a ${n}. Fiz o diagnóstico e meu Momento UGC é ${res.momento.emoji} ${res.momento.nome}. 💛`;
}

/**
 * Linha da planilha. As chaves têm que bater com `COLUNAS` no Apps Script —
 * qualquer nome diferente vira célula vazia. `email_conteudo` não vira coluna
 * visível: o script usa para montar o e-mail da lead.
 */
export function payloadPlanilha(r: Respostas, res: Resultado, lead: Lead) {
  const perfil = r.perfil?.ids ?? [];
  const marcado = (id: string) => (perfil.includes(id) ? "sim" : "");
  const ddd = dddDe(lead.wpp);
  const escolha = (k: Pergunta["key"]) => {
    const resp = r[k];
    if (!resp) return { valor: "", outro: "" };
    const id = resp.ids[0];
    return id === OUTRO
      ? { valor: "Outro", outro: resp.outro.trim() }
      : { valor: rotulo(k, { ids: [id], outro: "" }), outro: "" };
  };
  const desejos = r.desejo?.ids ?? [];
  const desejou = (id: string) => (desejos.includes(id) ? "sim" : "");
  const crenca = escolha("crenca");
  const bloqueio = escolha("bloqueio");
  const medo = escolha("medo");

  return {
    nome: lead.nome,
    whatsapp: lead.wpp,
    email: lead.email,
    instagram: lead.instagram,
    faixa_idade: rotulo("idade", r.idade),
    menor_de_idade: res.menor ? "sim" : "",
    uf: r.local?.ids[0] ?? "",
    cidade: normalizarCidade(r.local?.outro ?? ""),
    ddd,
    momento: res.momento.nome.replace(/[“”]/g, ""),
    frase_momento: rotulo("momento", r.momento),
    perfil_clt: marcado("clt"),
    perfil_conta_propria: marcado("autonoma"),
    perfil_estuda: marcado("estuda"),
    perfil_sem_renda: marcado("sem_renda"),
    perfil_mae: marcado("mae"),
    perfil_mae_solo: marcado("mae_solo"),
    perfil_cuida_casa: marcado("casa"),
    // Desejo aceita várias: uma coluna por opção (pra contar) + a principal.
    desejo_principal: escolha("desejo").valor,
    desejo_proprio_dinheiro: desejou("proprio_dinheiro"),
    desejo_filhos: desejou("filhos"),
    desejo_horarios: desejou("horarios"),
    desejo_respirar: desejou("respirar"),
    desejo_sonho: desejou("sonho"),
    desejo_viver_disso: desejou("viver_disso"),
    desejo_outro: desejos.includes(OUTRO) ? (r.desejo?.outro.trim() ?? "") : "",
    meta: rotulo("meta", r.meta),
    crenca: crenca.valor,
    crenca_outro: crenca.outro,
    bloqueio: bloqueio.valor,
    bloqueio_outro: bloqueio.outro,
    medo: medo.valor,
    medo_outro: medo.outro,
    ajuda: rotulo("ajuda", r.ajuda),
    pergunta_para_juh: lead.pergunta,
    utm_source: utm("utm_source"),
    utm_medium: utm("utm_medium"),
    utm_campaign: utm("utm_campaign"),
    email_conteudo: conteudoEmail(res, lead),
  };
}

/**
 * Dispara a gravação sem bloquear a tela — mesmo motivo do Diagnóstico de
 * Maturidade (`lib/diagnostico.ts`): o Apps Script não devolve CORS e responde
 * 302, então a requisição tem de ser "simples" (`text/plain`) e a resposta é
 * sempre opaca. Não dá pra confirmar a gravação pelo navegador; confira pela
 * planilha.
 */
export function salvarNaPlanilha(payload: ReturnType<typeof payloadPlanilha>): boolean {
  if (!SHEET_ENDPOINT_MOMENTO_UGC) return false;
  const corpo = JSON.stringify(payload);

  try {
    if (typeof navigator !== "undefined" && navigator.sendBeacon) {
      const blob = new Blob([corpo], { type: "text/plain;charset=utf-8" });
      if (navigator.sendBeacon(SHEET_ENDPOINT_MOMENTO_UGC, blob)) return true;
    }
  } catch {
    // cai no fetch abaixo
  }

  try {
    void fetch(SHEET_ENDPOINT_MOMENTO_UGC, {
      method: "POST",
      mode: "no-cors",
      keepalive: true,
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: corpo,
    }).catch(() => {});
    return true;
  } catch {
    return false;
  }
}
