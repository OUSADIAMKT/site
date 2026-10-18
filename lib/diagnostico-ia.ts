/**
 * Diagnóstico de IA da Ousadia (`/diagnostico/ia`).
 *
 * Versão 2 (18/10/2026), a partir da proposta do usuário: 4 níveis
 * (Descobridor, Explorador, Praticante, Estrategista), 4 competências com 2
 * perguntas cada, 2 perguntas sem ponto (dificuldade e objetivo) e resultado
 * enxuto com gráficos. Conteúdo amarrado ao PPC do curso Inteligência
 * Artificial do Zero à Prática (`lib/PPC/PPC - IA Para Iniciantes.md`): o
 * exemplo da LGPD é o da aula 1.2, o pedido da açaiteria segue o Método
 * RECEITA (Módulo 3) e o plano de 30 dias usa os módulos reais do curso.
 *
 * Destinos combinados com o usuário: Descobridor e Explorador vão pro curso;
 * Praticante vai pro curso, com foco nos módulos finais (conteúdo mais denso);
 * Estrategista vai pro WhatsApp do Diagnóstico (mentoria e consultoria).
 */

import type { DiagnosticoArea } from "@/lib/diagnostico-area";
import { SHEET_ENDPOINT_DIAGNOSTICO_IA } from "@/lib/site";

const CURSO = "/escola/ia-para-iniciantes";

export const DIAGNOSTICO_IA: DiagnosticoArea = {
  teste: "ia",
  endpoint: SHEET_ENDPOINT_DIAGNOSTICO_IA,
  nome: "Diagnóstico de IA da Ousadia",
  rotuloResultado: "seu nível com a IA",
  intro:
    "Responda 10 perguntas e descubra o que você já consegue fazer com Inteligência Artificial, o que está te travando e por onde continuar. Algumas perguntas são situações do dia a dia: não tem pegadinha, responda o que você faria de verdade.",
  dado: {
    texto:
      "Em 2025, 32% dos usuários de internet no Brasil, cerca de 50 milhões de pessoas, já tinham usado IA generativa.",
    fonte: "TIC Domicílios 2025, Cetic.br",
    href: "https://cetic.br/pt/noticia/50-milhoes-de-brasileiros-ja-usam-ia-mas-potenciais-beneficios-continuam-limitados-as-camadas-de-maior-renda-e-escolaridade/",
  },
  comoFunciona: [
    {
      k: "01",
      t: "10 perguntas",
      d: "Sobre o seu uso hoje e algumas situações práticas. Leva uns 4 minutos.",
    },
    {
      k: "02",
      t: "Seu painel",
      d: "Seu nível, um gráfico das 4 competências e o que mais te trava.",
    },
    {
      k: "03",
      t: "Seu plano",
      d: "Uma missão pra fazer hoje e um plano de 30 dias.",
    },
  ],
  textoBotaoInicio: "Quero fazer o diagnóstico",
  textoCaptura:
    "Com esses dados a gente entende quem está chegando na IA e pode te mandar conteúdos e novidades do curso. O resultado aparece aqui na hora.",
  textoConsentimento: "conteúdos sobre IA e sobre o curso",
  dimensoes: [
    {
      key: "experiencia",
      nome: "Experiência e uso",
      curto: "Experiência",
      prioridade:
        "Usar com frequência numa tarefa sua, de verdade, até a IA virar hábito.",
    },
    {
      key: "comunicacao",
      nome: "Comunicação com a IA",
      curto: "Comunicação",
      prioridade:
        "Aprender a pedir: dar contexto, objetivo, formato e um exemplo, e ajustar a resposta sem recomeçar.",
    },
    {
      key: "critico",
      nome: "Senso crítico e segurança",
      curto: "Senso crítico",
      prioridade:
        "Conferir fatos, números e leis na fonte original e nunca colar dados pessoais seus ou de clientes.",
    },
    {
      key: "produtividade",
      nome: "Produtividade e resultados",
      curto: "Produtividade",
      prioridade:
        "Escolher uma tarefa que se repete, fazer sempre do mesmo jeito com IA e medir o tempo antes e depois.",
    },
  ],
  perguntas: [
    {
      key: "e1",
      dim: "experiencia",
      tema: "Experiência",
      titulo: "Qual destas frases descreve melhor a sua experiência com IA hoje?",
      opcoes: [
        { lab: "Nunca usei ou testei só uma vez", pts: 0 },
        { lab: "Uso de vez em quando, por curiosidade", pts: 1 },
        { lab: "Uso toda semana pra estudar ou trabalhar", pts: 2 },
        { lab: "Uso todo dia, em tarefas bem diferentes", pts: 3 },
      ],
    },
    {
      key: "e2",
      dim: "experiencia",
      tema: "Experiência",
      titulo: "O que você já consegue fazer sozinho usando IA?",
      opcoes: [
        { lab: "Ainda não faço nada sem ajuda de alguém", pts: 0 },
        { lab: "Faço perguntas e peço textos simples", pts: 1 },
        { lab: "Faço materiais e planos pra coisas reais", pts: 2 },
        { lab: "Faço projetos em etapas e confiro tudo", pts: 3 },
      ],
    },
    {
      key: "c1",
      dim: "comunicacao",
      tema: "Comunicação",
      titulo:
        "Você quer ideias de post pra uma açaiteria. Qual destes pedidos dá a melhor resposta?",
      dica: "Leia os quatro com calma. Não precisa ter usado IA pra responder.",
      opcoes: [
        {
          lab: "“Você é o maior gênio do marketing do mundo. Crie posts incríveis e virais de açaí que façam todo mundo comprar.”",
          pts: 1,
        },
        {
          lab: "“Faça vários posts sobre açaí pro Instagram da minha loja, bem criativos, modernos, bonitos e chamativos, por favor.”",
          pts: 0,
        },
        {
          lab: "“Tenho uma açaiteria em Altamira (PA). Crie 5 ideias de post pro Instagram que façam famílias pedirem no fim de semana.”",
          pts: 2,
        },
        {
          lab: "“Tenho uma açaiteria em Altamira (PA). Quero 5 ideias de post pra atrair famílias, em tabela: ideia, legenda e foto.”",
          pts: 3,
        },
      ],
    },
    {
      key: "c2",
      dim: "comunicacao",
      tema: "Comunicação",
      titulo:
        "A resposta da IA veio genérica e comprida demais. Qual destes pedidos de ajuste funciona melhor?",
      opcoes: [
        { lab: "“Não ficou bom. Melhore a resposta e tente de novo.”", pts: 0 },
        { lab: "“Faça outra vez, mais criativo e mais profissional.”", pts: 1 },
        { lab: "“Deixe mais curto e use uma linguagem mais simples.”", pts: 2 },
        { lab: "“Corte pra 3 linhas, tire o tom formal e cite o bairro.”", pts: 3 },
      ],
    },
    {
      key: "k1",
      dim: "critico",
      tema: "Senso crítico",
      titulo: "Você perguntou sobre proteção de dados e a IA respondeu isto. O que você faz?",
      contexto: {
        rotulo: "Resposta da IA",
        texto:
          "“A LGPD foi aprovada em 2005, e quem fiscaliza o cumprimento dela no Brasil é o Procon.”",
      },
      opcoes: [
        { lab: "Uso a informação: ela veio clara e segura", pts: 0 },
        { lab: "Pergunto pra própria IA se ela tem certeza", pts: 1 },
        { lab: "Confiro num site oficial antes de usar", pts: 2 },
        { lab: "Desconfio: a lei é de 2018 e quem fiscaliza é a ANPD", pts: 3 },
      ],
    },
    {
      key: "k2",
      dim: "critico",
      tema: "Segurança",
      titulo: "Qual destes você colaria numa IA gratuita pra pedir um resumo?",
      opcoes: [
        { lab: "A lista de clientes da loja, com nome e telefone", pts: 0 },
        { lab: "O laudo médico de um aluno, pra entender melhor", pts: 0 },
        { lab: "O e-mail de um cliente, apagando só o telefone", pts: 1 },
        { lab: "Um edital público baixado do site da prefeitura", pts: 3 },
      ],
    },
    {
      key: "p1",
      dim: "produtividade",
      tema: "Produtividade",
      titulo: "Como a IA entra na sua rotina de trabalho ou de estudo?",
      opcoes: [
        { lab: "Ainda não faz parte da minha rotina", pts: 0 },
        { lab: "Uso quando lembro ou quando aperta o prazo", pts: 1 },
        { lab: "Uso nas tarefas que repito toda semana", pts: 2 },
        { lab: "Tenho um jeito fixo de usar e reviso tudo", pts: 3 },
      ],
    },
    {
      key: "p2",
      dim: "produtividade",
      tema: "Produtividade",
      titulo: "Como você sabe se a IA está mesmo te ajudando?",
      opcoes: [
        { lab: "Ainda não sei dizer se ela me ajuda", pts: 0 },
        { lab: "Sinto que algumas coisas ficam mais fáceis", pts: 1 },
        { lab: "Comparo o tempo de algumas tarefas", pts: 2 },
        { lab: "Meço antes e depois e ajusto o meu jeito", pts: 3 },
      ],
    },
    {
      key: "dificuldade",
      pontua: false,
      papel: "dificuldade",
      tema: "Sua dificuldade",
      titulo: "O que mais te atrapalha a avançar com IA hoje?",
      dica: "Esta e a próxima não valem ponto: servem pra montar o seu plano.",
      opcoes: [
        {
          lab: "Tenho medo de não conseguir aprender",
          leitura:
            "Esse medo é comum e quase nunca é falta de capacidade: é falta de um primeiro passo pequeno e bem guiado. Ninguém aqui precisa saber programar, e a primeira conversa com uma IA leva cinco minutos.",
        },
        {
          lab: "Não sei por onde começar",
          leitura:
            "Começar é escolher uma ferramenta só e uma tarefa sua, real. O resto vem na prática: é por isso que a sua missão abaixo é pra hoje.",
        },
        {
          lab: "Conheço ferramentas, mas uso mal",
          leitura:
            "O problema raramente é a ferramenta: é o pedido. Quando você dá contexto, objetivo e formato, a mesma IA entrega uma resposta muito melhor.",
        },
        {
          lab: "Não consigo usar sempre no trabalho",
          leitura:
            "Uso solto não vira hábito. O que funciona é fixar a IA em uma ou duas tarefas que se repetem, com dia e prompt definidos.",
        },
        {
          lab: "Não consigo transformar IA em dinheiro",
          leitura:
            "Renda vem de resolver um problema de alguém, não da ferramenta. O caminho é aplicar IA em serviço, conteúdo ou atendimento e medir o resultado.",
        },
        {
          lab: "Não sei o que preciso aprender agora",
          leitura:
            "O seu painel acima já responde: comece pela competência que ficou mais baixa. É ela que mais segura o resto.",
        },
        {
          lab: "Nada me atrapalha no momento",
          leitura:
            "Ótimo momento pra evoluir com método: o seu painel mostra onde está a maior margem de crescimento.",
        },
      ],
    },
    {
      key: "objetivo",
      pontua: false,
      papel: "objetivo",
      tema: "Seu objetivo",
      titulo: "O que você mais quer conquistar com IA nos próximos meses?",
      opcoes: [
        {
          lab: "Aprender algo novo e não ficar pra trás",
          oportunidades: [
            "Usar a IA como professora particular: ela explica, você tenta, ela corrige.",
            "Montar um plano de estudos com as horas que você tem de verdade.",
            "Entender como a IA funciona e por que às vezes ela inventa.",
          ],
          comando:
            "Explique o que é Inteligência Artificial como se eu tivesse 12 anos, com um exemplo do dia a dia brasileiro. Depois me faça 3 perguntas, uma de cada vez, pra ver se eu entendi.",
        },
        {
          lab: "Ganhar tempo e organizar a minha rotina",
          oportunidades: [
            "Transformar a lista de pendências da semana numa agenda com prioridades.",
            "Escrever e-mails e mensagens difíceis em minutos, no tom certo.",
            "Resumir documentos longos pra quem tem pressa.",
          ],
          comando:
            "Esta é a minha lista de pendências da semana: [cole a lista]. Classifique em urgente e importante, em tabela, e distribua o que é importante nos meus horários livres: [seus horários]. No máximo 3 blocos por dia.",
        },
        {
          lab: "Crescer no trabalho ou achar emprego",
          oportunidades: [
            "Revisar o currículo e preparar respostas pra entrevistas.",
            "Fazer relatórios, atas e apresentações mais rápido.",
            "Aprender um assunto novo do seu trabalho com explicações sob medida.",
          ],
          comando:
            "Sou [sua profissão] e quero [crescer no meu trabalho / conseguir uma vaga]. Me diga 5 tarefas da minha área em que a IA pode me ajudar, da mais simples pra mais avançada, e o que eu preciso conferir em cada uma.",
        },
        {
          lab: "Criar conteúdo e vender mais",
          oportunidades: [
            "Ter 30 ideias de conteúdo e escolher as 5 que têm a cara do seu negócio.",
            "Transformar uma história real do negócio em roteiro de vídeo curto.",
            "Planejar uma campanha de 2 semanas com objetivo e forma de medir.",
          ],
          comando:
            "Tenho [seu negócio] em [sua cidade], pra [seu público]. Dê 30 ideias de conteúdo pro Instagram: 10 informativas, 10 de bastidores e 10 divertidas. Evite ideias que serviriam pra qualquer negócio.",
        },
        {
          lab: "Deixar o meu negócio mais organizado",
          oportunidades: [
            "Montar respostas prontas pras perguntas que você responde todo dia.",
            "Criar planilhas de vendas, estoque ou gastos com fórmulas testadas.",
            "Fazer propostas comerciais claras, com valor e prazo conferidos por você.",
          ],
          comando:
            "Estas são as perguntas que mais recebo no meu negócio: [lista]. Escreva respostas de até 3 linhas pro WhatsApp, em tom cordial. Onde houver preço, prazo ou garantia, escreva [preencher] em vez de inventar.",
        },
        {
          lab: "Criar automações e soluções com IA",
          oportunidades: [
            "Criar um assistente com instruções fixas pra uma tarefa só.",
            "Ligar um formulário a uma planilha e a um aviso por e-mail, sem programar.",
            "Desenhar o fluxo antes: gatilho, passos, dados e quem confere.",
          ],
          comando:
            "Estas são tarefas repetitivas do meu dia: [lista]. Para cada uma, avalie se é frequente, se segue os mesmos passos, se os dados já são digitais e se o erro é barato. Sugira como automatizar as 2 melhores com ferramentas gratuitas e diga o que deve continuar humano.",
        },
      ],
    },
  ],
  niveis: [
    {
      id: "descobridor",
      nome: "Descobridor",
      min: 0,
      cor: "#f5c518",
      frase: "Eu sei que a IA é importante, mas não sei por onde começar.",
      descricao:
        "Você usou pouco ou nunca usou IA. E tudo bem: a distância entre o que você imagina que precisa saber e o que precisa pra começar é bem menor do que parece. Não é preciso dominar tecnologia nem pagar ferramenta.",
      mensagem:
        "Seu próximo passo é transformar uma ferramenta desconhecida numa aliada da sua rotina, começando por uma tarefa pequena e sua.",
      missao:
        "Abra uma IA no celular (ChatGPT, Gemini, Claude ou Copilot), cole o comando abaixo e peça pelo menos um ajuste na resposta.",
      plano: [
        { semana: "Semana 1", foco: "O que é IA, o que ela faz e onde ela erra", onde: "Módulo 1" },
        { semana: "Semana 2", foco: "Escolher um assistente e conversar bem com ele", onde: "Módulo 2" },
        { semana: "Semana 3", foco: "Escrever pedidos com o Método RECEITA", onde: "Módulo 3" },
        { semana: "Semana 4", foco: "Resolver uma tarefa real sua, do começo ao fim", onde: "Módulo 3" },
      ],
      destino: {
        tipo: "curso",
        titulo: "Inteligência Artificial do Zero à Prática",
        texto:
          "O curso foi feito pra quem está exatamente onde você está: gravado, no seu ritmo, sem programação e só com planos gratuitos. Comece pelos Módulos 1 a 3.",
        botao: "Conhecer o curso",
        href: CURSO,
      },
    },
    {
      id: "explorador",
      nome: "Explorador",
      min: 7,
      cor: "#f08a24",
      frase: "Eu já uso IA, mas sinto que poderia aproveitar muito mais.",
      descricao:
        "Você usa IA, mas de forma solta: perguntas simples, textos rápidos, respostas que às vezes saem genéricas. Usar com frequência não é o mesmo que usar bem, e o que falta agora é método.",
      mensagem:
        "Você já abriu a porta. Agora é aprender a conduzir a IA pra ter respostas melhores e resultados que se repetem.",
      missao:
        "Pegue uma tarefa real desta semana e reescreva o seu pedido com contexto, objetivo, formato e um exemplo. Compare com a resposta que você teria do jeito antigo.",
      plano: [
        { semana: "Semana 1", foco: "Os 7 ingredientes de um bom pedido (RECEITA)", onde: "Módulo 3" },
        { semana: "Semana 2", foco: "Refinar respostas e guardar os prompts que funcionam", onde: "Módulo 3" },
        { semana: "Semana 3", foco: "IA nos textos e na organização do seu trabalho", onde: "Módulo 4" },
        { semana: "Semana 4", foco: "Montar o seu fluxo pessoal de produtividade", onde: "Módulo 4" },
      ],
      destino: {
        tipo: "curso",
        titulo: "Inteligência Artificial do Zero à Prática",
        texto:
          "No curso, o seu ponto de virada está no Módulo 3 (Método RECEITA e biblioteca de prompts) e no Módulo 4 (produtividade). Os módulos iniciais servem de revisão rápida.",
        botao: "Conhecer o curso",
        href: CURSO,
      },
    },
    {
      id: "praticante",
      nome: "Praticante",
      min: 13,
      cor: "#3fa7d6",
      frase: "Eu uso IA no trabalho, mas quero transformar isso em resultado.",
      descricao:
        "Você já aplica IA em tarefas reais e sabe pedir. O desafio agora é sair das tarefas soltas e montar processos: um jeito fixo de fazer, ligado a conteúdo, vendas ou atendimento, com medida de tempo e qualidade.",
      mensagem:
        "Seu próximo salto é transformar habilidade em processo organizado, com resultado que dá pra medir.",
      missao:
        "Faça a mesma tarefa duas vezes esta semana, uma sem IA e outra com. Anote o tempo e a qualidade das duas, contando a revisão.",
      plano: [
        { semana: "Semana 1", foco: "Mapear suas tarefas e medir antes e depois", onde: "Módulo 4" },
        { semana: "Semana 2", foco: "IA em conteúdo: ideias, roteiro e peças com identidade", onde: "Módulo 5" },
        { semana: "Semana 3", foco: "IA em negócio: pesquisa, campanha, atendimento e proposta", onde: "Módulo 6" },
        { semana: "Semana 4", foco: "Seu primeiro assistente ou automação sem código", onde: "Módulo 7" },
      ],
      destino: {
        tipo: "curso",
        titulo: "Os módulos finais do curso",
        texto:
          "O curso é um só, e é nos módulos finais que está o conteúdo mais denso: produtividade com medição (Módulo 4), conteúdo (Módulo 5), negócios e marketing (Módulo 6), automação e assistentes (Módulo 7) e o projeto final (Módulo 8). Os iniciais servem de revisão rápida.",
        botao: "Ver os módulos do curso",
        href: `${CURSO}#modulos`,
      },
    },
    {
      id: "estrategista",
      nome: "Estrategista",
      min: 19,
      exige: [{ perguntas: ["k1", "k2", "p1", "p2"], min: 2 }],
      cor: "#b48cf2",
      frase: "Eu já uso IA com eficiência. Agora quero criar soluções e mudar processos.",
      descricao:
        "Você usa IA em tarefas complexas, confere o que ela entrega, protege dados e mede resultado. Pra você, o próximo passo não é um curso de introdução: é aplicar IA nos processos do seu negócio ou do seu trabalho, com acompanhamento.",
      mensagem:
        "Seu desafio é transformar a IA numa capacidade do seu negócio: soluções próprias, decisões melhores e resultado que aparece no caixa.",
      missao:
        "Escolha um processo que se repete no seu trabalho e desenhe uma solução com IA: o gatilho, os passos, os dados envolvidos, quem confere e como você vai medir.",
      plano: [
        { semana: "Semana 1", foco: "Escolher os processos com mais ganho e menos risco", onde: "Mentoria" },
        { semana: "Semana 2", foco: "Assistentes com instruções fixas pra sua operação", onde: "Mentoria" },
        { semana: "Semana 3", foco: "Automações com ponto de conferência humana", onde: "Mentoria" },
        { semana: "Semana 4", foco: "Medir tempo, qualidade, custo e risco", onde: "Mentoria" },
      ],
      destino: {
        tipo: "whatsapp",
        titulo: "Mentoria e consultoria",
        texto:
          "Pro seu nível, o caminho é acompanhamento direto: mentoria pra você ou consultoria pra aplicar IA nos processos do seu negócio. Chama no WhatsApp que a gente conversa sobre o seu caso.",
        botao: "Falar sobre mentoria no WhatsApp",
        mensagem:
          "Oi! Fiz o Diagnóstico de IA da Ousadia, meu resultado foi Estrategista e quero conversar sobre mentoria ou consultoria em IA.",
        extra: { botao: "Conhecer a mentoria", href: "/mentoria" },
      },
    },
  ],
  alerta: {
    perguntas: ["k1", "k2"],
    titulo: "Atenção antes de tudo",
    destaque:
      "A IA pode inventar com toda a confiança, e o que você cola nela sai do seu controle.",
    texto:
      "Use o semáforo: pra criar e rascunhar, sinal verde. Fatos, números, leis e saúde, sinal amarelo: confira na fonte original. Decisões sobre pessoas e dados pessoais (CPF, telefone, lista de clientes, laudos), sinal vermelho: não delegue e não cole.",
  },
};
