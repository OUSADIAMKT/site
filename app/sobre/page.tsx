import type { Metadata } from "next";
import Image from "next/image";
import { ArrowRight, Check } from "lucide-react";
import { Reveal } from "@/components/ui/Reveal";
import { WaveDivider } from "@/components/ui/WaveDivider";
import { PageHero } from "@/components/sections/PageHero";
import { CtaFinal } from "@/components/sections/CtaFinal";
import { OdsCompromisso } from "@/components/sections/OdsCompromisso";
import { LinhaDoTempo, type Marco } from "@/components/sections/LinhaDoTempo";
import { Leaf, RiverLines } from "@/components/ui/Motifs";
import { KeneField, KeneRule, KeneStrip } from "@/components/ui/graphics/Kene";
import { SITE, wa } from "@/lib/site";

export const metadata: Metadata = {
  alternates: { canonical: "/sobre" },
  title: "Quem somos | Ousadia Marketing, a Agência Escola do Norte",
  description:
    "A primeira Agência Escola de Marketing do Norte: escola, agência e produtora e a Comunidade Creators da Amazônia. A história do Jackson, de diretor de ensino a fundador, a linha do tempo, o manifesto e os valores da Ousadia.",
};

/**
 * Ordem da página (reorganizada em 04/11/2026): o que é → prova → valores →
 * trajetória → manifesto → origem → quem faz → ODS → próximo passo.
 * As cores alternam como na home: escuro, claro (com onda), roxo, escuro…
 */

const NUMEROS = [
  { n: "30+", l: "turmas presenciais" },
  { n: "500", l: "alunos formados" },
  { n: "+1000", l: "pessoas impactadas" },
  { n: "80+", l: "marcas atendidas" },
];

/** A jornada do Jackson, da direção de ensino à Ousadia de hoje. */
const MARCOS: Marco[] = [
  {
    ano: "2010",
    legenda: "IFPA Campus Altamira",
    t: "Na educação pública",
    d: "Depois de 2 anos e 10 meses no serviço público em Belém, no Iasep e na Secult, o Jackson chega em 2010 ao IFPA Campus Altamira como Analista de TI, onde atua até hoje. Nessa jornada, atuou também nos programas do Governo Federal: o PARFOR, na Licenciatura em Informática (2010–2015), o Pronatec, no curso de Informática (2012), e o e-Tec Brasil (2014–2015). De maio de 2015 a agosto de 2017, foi Diretor de Ensino. No caminho, faz duas pós-graduações: Educação para as Relações Étnico-Raciais (IFPA, 2011) e Educação, Diversidade e Cultura (UFPA, 2018). Foi essa jornada que formou o seu olhar sobre o poder da educação de transformar a sociedade.",
    fotos: [
      { src: "/sobre/ifpa-reitor-servidores.webp", alt: "Jackson com o reitor do IFPA e os servidores do Campus Altamira numa sala de aula, em 2010", w: 1200, h: 900, legenda: "Reunião dos Servidores do IFPA Campus Altamira com o Reitor do IFPA · 2010" },
      { src: "/sobre/ifpa-pronatec-turma.webp", alt: "Turma do Pronatec de 2012, com camisa do IFPA, reunida no campus", w: 1200, h: 675, legenda: "Turma do Pronatec · 2012" },
      { src: "/sobre/ifpa-prefeito-2013.webp", alt: "Servidores do IFPA Campus Altamira com o prefeito de Altamira, em 2013", w: 800, h: 600, legenda: "Servidores do IFPA Campus Altamira e Prefeito de Altamira · 2013" },
      { src: "/sobre/ifpa-exposicao-fotos.webp", alt: "Jackson com colegas na reunião de trabalho do Curso de Turismo com a PARATUR, em 2015", w: 1200, h: 675, legenda: "Reunião de Trabalho do Curso de Turismo com a PARATUR · 2015" },
      { src: "/sobre/ifpa-reuniao-biblioteca.webp", alt: "Jackson de pé, na reunião da gestão com a Assistência Estudantil, na biblioteca do IFPA, em 2015", w: 1200, h: 675, legenda: "Reunião da Gestão com a Assistência Estudantil · 2015" },
      { src: "/sobre/ifpa-cacaufest-2015.webp", alt: "Jackson com dois colegas diante do painel do VI CacauFest, em Medicilândia, na visita institucional do IFPA em 2015", w: 1200, h: 675, legenda: "Visita Institucional do IFPA ao CacauFest, a festa da colheita em Medicilândia · 2015" },
      { src: "/sobre/ifpa-turma.webp", alt: "Jackson com estudantes do IFPA Campus Altamira, em reunião com o reitor", w: 1200, h: 900, legenda: "Reunião do reitor do IFPA com alunos do IFPA Campus Altamira · 2016" },
      { src: "/sobre/ifpa-rede-federal.webp", alt: "Jackson na mesa de abertura da SEMTEC 2016, ao lado de representantes da UFPA, da UEPA e da Pró-Reitora do IFPA", w: 1200, h: 675, legenda: "SEMTEC do IFPA Campus Altamira, UEPA, IFPA, UFPA e Pró-Reitora do IFPA · 2016" },
      { src: "/sobre/ifpa-visita-obra.webp", alt: "Grupo do IFPA de capacete amarelo na visita técnica à UHE de Belo Monte, em 2016", w: 1200, h: 800, legenda: "Visita Técnica do IFPA Campus Altamira na UHE de Belo Monte · 2016" },
      { src: "/sobre/ifpa-reuniao.webp", alt: "Jackson na reunião da comissão do processo seletivo do IFPA, na biblioteca do campus, em 2017", w: 1200, h: 900, legenda: "Reunião da Comissão do Processo Seletivo · 2017" },
      { src: "/sobre/ifpa-obra-selfie.webp", alt: "Jackson em selfie diante da obra de asfaltamento no IFPA Campus Altamira", w: 1200, h: 900, legenda: "Asfaltamento do Campus Altamira · 2017" },
      { src: "/sobre/ifpa-dia-servidor-2019.webp", alt: "Jackson sorrindo de camisa polo de servidor público federal, no Campus Altamira", w: 1198, h: 1200, legenda: "Dia do Servidor Público · 2018" },
      { src: "/sobre/ifpa-festa-junina-2018.webp", alt: "Jackson de chapéu de palha e microfone na mão, em selfie com a quadrilha da festa junina do IFPA Campus Altamira, em 2019", w: 960, h: 720, legenda: "Festa Junina do IFPA Campus Altamira · 2019" },
      { src: "/sobre/ifpa-jogos-servidores-2025.webp", alt: "Jackson com a delegação do IFPA Campus Altamira e a bandeira de Altamira nos VI Jogos dos Servidores do IFPA, em 2025", w: 1200, h: 1200, legenda: "Jogos dos Servidores do IFPA, Delegação do Campus Altamira · 2025" },
    ],
  },
  {
    ano: "2016–19",
    legenda: "Condor Blanco: formação e bastidores",
    t: "O despertar e os bastidores",
    d: "Na direção de ensino, o Jackson percebe que precisa desenvolver novas habilidades e competências, e que o caminho passa pelo autoconhecimento. Em 2016 começa a jornada de desenvolvimento pessoal na Escola Condor Blanco: Coach em agosto de 2017, mesmo mês em que deixa a direção de ensino, e Master Coach em janeiro de 2018. Vem a ideia de usar a comunicação e o marketing digital pra falar de desenvolvimento pessoal. Até 2019, ajuda a produzir mais de 15 eventos das escolas de Coaching e Meditação em Altamira e Brasil Novo, apoia as academias de Numerologia e de Comunicação e Oratória, faz imersões na sede do Condor Blanco, no Chile, e em 2018 vai com a escola à Índia e ao Butão. No caminho, as primeiras palestras para empresas.",
    fotos: [
      { src: "/sobre/condor-blanco-certificados.webp", alt: "Jackson com uma turma de certificados na mão diante do banner do Condor Blanco", w: 1200, h: 675 },
      { src: "/sobre/cb-coaching-express.webp", alt: "Jackson com a apostila do Coaching Express diante do painel do Condor Blanco", w: 960, h: 1200, legenda: "Formação Coaching Express, do Condor Blanco · 2017" },
      { src: "/sobre/cb-master-coach.webp", alt: "Jackson com a turma de Master Coach, todos de camiseta verde e certificado na mão", w: 1080, h: 810, legenda: "Formatura de Master Coach no Condor Blanco · jan. 2018" },
      { src: "/sobre/cb-selfie-plateia.webp", alt: "Jackson em selfie com a plateia lotada de um Coaching Express, todos acenando", w: 1080, h: 810, legenda: "Nos bastidores do Coaching Express, do Condor Blanco" },
      { src: "/sobre/cb-guitarra.webp", alt: "Jackson segurando uma guitarra entre dois facilitadores, num treinamento", w: 1200, h: 1200, legenda: "Nos bastidores dos treinamentos de formação" },
      { src: "/sobre/selfie-turma-xadrez.webp", alt: "Jackson em selfie com uma turma, diante de uma parede quadriculada", w: 1200, h: 675 },
      { src: "/sobre/evento-plateia-selfie.webp", alt: "Jackson em selfie no palco com a plateia lotada de um evento", w: 1200, h: 900 },
      { src: "/sobre/coaching-tribo-selfie.webp", alt: "Jackson em selfie com participantes de um evento de coaching", w: 1200, h: 900 },
      { src: "/sobre/evento-noturno-turma.webp", alt: "Turma reunida à noite, num encontro ao ar livre", w: 1200, h: 900 },
      { src: "/sobre/turma-bolo-selfie.webp", alt: "Jackson em selfie com uma turma comemorando com um bolo", w: 1200, h: 900 },
      { src: "/sobre/cb-expedition-india.webp", alt: "Grupo da expedição do Condor Blanco diante do Templo de Lótus, na Índia", w: 1200, h: 900 },
      { src: "/sobre/cb-taj-mahal.webp", alt: "Jackson no Taj Mahal, durante a expedição do Condor Blanco à Índia", w: 900, h: 1200 },
      { src: "/sobre/cb-butao.webp", alt: "Jackson meditando diante do Mosteiro Taktsang, o Ninho do Tigre, no Butão", w: 1199, h: 1200, legenda: "Expedição do Condor Blanco ao Butão, no Ninho do Tigre · 2018" },
      { src: "/sobre/cb-chile.webp", alt: "Jackson de braços abertos no Condor Blanco, no Chile, diante de um mural com um condor", w: 1199, h: 1200, legenda: "No Condor Blanco, no Chile · 2018" },
      { src: "/sobre/treinamento-certificados-selfie.webp", alt: "Jackson em selfie nos bastidores de um evento de 2018, com a turma lotada segurando os certificados", w: 1200, h: 675, legenda: "Nos bastidores dos eventos do Condor Blanco · 2018" },
    ],
  },
  {
    ano: "2019",
    legenda: "Produção Coaching CB e Palestras em Marketing",
    t: "O momento Eureka e Primeiros Passos",
    d: "Em 2019, o Jackson estava na produção dos eventos de Coaching do Condor Blanco e já fazia suas primeiras palestras sobre Marketing Digital. Em setembro, vai ao Sebrae Summit em Altamira como ouvinte e, ali na plateia, a ficha cai: tudo o que ele vinha fazendo cabia num método. Nasce o ABC do Marketing Digital, pra quem tem conhecimento de sobra e não sabe se mostrar no digital.",
    fotos: [
      { src: "/sobre/jackson-eureka.webp", alt: "Jackson sorrindo e apontando para a cabeça, como quem teve uma ideia", w: 1200, h: 800 },
      { src: "/sobre/sebrae-2019.webp", alt: "Jackson com participantes da imersão Sebrae Summit em Altamira, em setembro de 2019", w: 675, h: 1200, legenda: "Imersão Sebrae Summit em Altamira (PA), o momento Eureka · set. 2019", foco: "50% 22%" },
      { src: "/sobre/palestra-uepa.webp", alt: "Jackson com estudantes depois da palestra de Comunicação Institucional na UEPA, em 2019", w: 1200, h: 675, legenda: "Palestra de Comunicação Institucional na UEPA · 2019" },
      { src: "/sobre/treinamento-turma-mulheres.webp", alt: "Jackson em selfie com a equipe de um treinamento em marketing digital", w: 1200, h: 900, legenda: "Treinamento de Equipe em Marketing Digital" },
    ],
  },
  {
    ano: "2020–21",
    legenda: "ABC do Marketing no Asurini Lab",
    t: "ABC do Marketing e Asurini Lab",
    d: "A primeira empresa parceira é a Phannes, que apoia as duas primeiras turmas do ABC do Marketing Digital em Brasil Novo: 6 pessoas em 11 e 12 de janeiro de 2020 e 17 em fevereiro. Depois, o Jackson cria o Asurini Lab, e é lá que a sala segue: 4 pessoas em março e, já na pandemia, turmas de máscara em maio e em setembro. Em 2021, os cursos ganham nome, ABC do Marketing, e é turma atrás de turma. Quem chegava com conhecimento de sobra e vergonha de aparecer saía com o perfil arrumado, conteúdo gravado e certificado na mão. Sem logo bonito, sem palco. Ninguém sabia ainda, mas ali começava a Ousadia.",
    fotos: [
      { src: "/sobre/abc-brasil-novo-2020.webp", alt: "Primeira turma do ABC do Marketing Digital em Brasil Novo, em parceria com a Phannes, janeiro de 2020", w: 1080, h: 1080, legenda: "1ª turma do ABC do Marketing Digital em Brasil Novo (PA), em parceria com a Phannes · 2020" },
      { src: "/sobre/abc-banner-selfie.webp", alt: "Jackson em selfie com a segunda turma do ABC do Marketing Digital em Brasil Novo, diante do banner", w: 1200, h: 900, legenda: "2ª turma do ABC do Marketing Digital em Brasil Novo (PA), promovida pela Phannes · 2020" },
      { src: "/sobre/asurini-flipchart-mascaras.webp", alt: "Jackson em selfie com a quinta turma do ABC do Marketing, de máscara, no espaço do Asurini Lab", w: 1200, h: 569, legenda: "5ª turma do ABC do Marketing no espaço do Asurini Lab · 2020" },
      { src: "/sobre/abc-aula-estudio.webp", alt: "Jackson dando aula do ABC do Marketing no estúdio, com a turma em volta da mesa", w: 1200, h: 675 },
      { src: "/sobre/abc-certificados-asurini.webp", alt: "Alunas com os certificados do ABC do Marketing, ao lado do Jackson, no Asurini Lab", w: 1200, h: 900 },
      { src: "/sobre/turma-asurini-lab.webp", alt: "Jackson com uma turma no Asurini Lab", w: 1200, h: 675 },
      { src: "/sobre/turma-certificados.webp", alt: "Turma comemorando com os certificados na mão", w: 1200, h: 1047 },
      { src: "/sobre/aula-revisao.webp", alt: "Jackson dando aula do ABC do Marketing diante de um flip chart com a revisão do dia, em 2021", w: 540, h: 675, legenda: "ABC do Marketing no Asurini Lab · 2021" },
    ],
  },
  {
    ano: "2022",
    legenda: "Destrave e o 1º Amazon Marketing Day",
    t: "Nascem a Ousadia e o Destrave",
    d: "O nome ABC já tinha registro de marca de outra pessoa, que pediu pra ele parar de usar. O método ganha nome novo: Destrave, porque o que travava as pessoas nunca foi técnica, era medo de aparecer. É também o ano em que nasce a Ousadia. O Destrave entra nas empresas, no formato In Company, e tem mais quatro turmas presenciais, a última em fevereiro de 2023. E o primeiro Amazon Marketing Day prova que dá pra lotar um congresso de marketing na Amazônia sem importar guru.",
    fotos: [
      { src: "/sobre/treinamento-cema-mascaras.webp", alt: "Jackson na palestra Destrave In Company com a equipe de uma clínica, todos de máscara, em 2022", w: 1200, h: 675, legenda: "Palestra Destrave In Company · 2022" },
      { src: "/sobre/amd-bracos-abertos.webp", alt: "Jackson de braços abertos no auditório do 1º Amazon Marketing Day, O Poder da Influência, em 2022", w: 1200, h: 679, legenda: "1º Amazon Marketing Day, O Poder da Influência · 2022" },
      { src: "/sobre/abc-banner-turma.webp", alt: "Jackson com alunas diante do painel do ABC do Marketing, no Asurini Lab, em 2022", w: 1200, h: 675, legenda: "ABC do Marketing no Asurini Lab · 2022" },
    ],
  },
  {
    ano: "2023",
    legenda: "2º Amazon Marketing Day e a Ousadia Marketing",
    t: "A Ousadia vira agência",
    d: "Em julho, a última turma do Destrave, agora online. Depois, toda a energia vai pra segunda edição do Amazon Marketing Day, que mostra que o primeiro palco não tinha sido sorte. No dia seguinte, 2 de outubro, a Ousadia Marketing começa a prestar serviço, com os dois primeiros clientes. Os alunos queriam mais, e as empresas também: queriam alguém que fizesse junto.",
    fotos: [
      { src: "/sobre/imersao-jornada-premium.webp", alt: "Jackson no lançamento do Destrave 10X, curso online, em São Paulo, em janeiro de 2023", w: 1200, h: 1200, legenda: "Lançamento do Destrave 10X, curso online, em São Paulo · jan. 2023" },
      { src: "/sobre/turma-coracao.webp", alt: "Jackson com a turma da última imersão presencial do Destrave, diante de um painel com um coração, em fevereiro de 2023", w: 1200, h: 800, legenda: "Destrave, a última imersão presencial · fev. 2023" },
      { src: "/sobre/amd-plateia.webp", alt: "Jackson no palco da segunda edição do Amazon Marketing Day, com a plateia", w: 782, h: 444 },
      { src: "/sobre/amd-jackson-microfone.webp", alt: "Jackson com o microfone na segunda edição do Amazon Marketing Day", w: 1076, h: 607 },
    ],
  },
  {
    ano: "2024",
    legenda: "Produtora e Dia Mundial da Criatividade",
    t: "A produtora e a volta pra sala",
    d: "O ano é de estruturar a Ousadia como produtora: equipe, equipamento, processo. A Ousadia lidera o Dia Mundial da Criatividade em Altamira e, em novembro, reúne o time completo de camisa da Ousadia. No fim do ano vem o pivô e a lição: o coração da Ousadia sempre foi ensinar. Ela volta a oferecer cursos, com turmas presenciais de Vídeo Maker, Social Media e Tráfego Pago.",
    fotos: [
      { src: "/sobre/time-ousadia-2024.webp", alt: "Time da Ousadia reunido em novembro de 2024", w: 738, h: 1200 },
      { src: "/sobre/aldeia-boas-vindas.webp", alt: "Jackson de fone de ouvido apontando para uma placa de boas-vindas numa aldeia, no meio da Amazônia", w: 1200, h: 800, legenda: "Experimentando a cobertura no meio da Amazônia · 2024" },
    ],
  },
  {
    ano: "2025",
    legenda: "Ousadinhos, coberturas e mentoria",
    t: "O ano de experimentar",
    d: "Começa com o Ousadinhos, entrevistas no carnaval. Por seis meses, a Ousadia testa o universo dos lançamentos. Com os alunos como equipe, faz a cobertura dos maiores eventos da cidade e da região, como FLIX, Expoalta, COP30, Corrida Viva Altamira, Forró APAExonado e os Jogos Indígenas. No fim do ano, uma mentoria online reúne 40 pessoas e dá certo: era a comunidade pedindo pra nascer. Em dezembro, a Ousadia encerra os serviços de produtora.",
    fotos: [
      { src: "/sobre/likexp-certificado.webp", alt: "Jackson recebendo o certificado do programa Like Experience ao lado da mentora", w: 960, h: 1200, legenda: "Conclusão do programa Like Experience · mar. 2025" },
      { src: "/sobre/likexp-turma.webp", alt: "Jackson com a turma do Like Experience, num estúdio com paredes de pôsteres", w: 1200, h: 900, legenda: "Turma do Like Experience · 2025" },
      { src: "/sobre/oficina-fotografia-rio.webp", alt: "Jackson com jovens e adultos numa oficina de fotografia à sombra de uma árvore, na beira do rio", w: 1200, h: 800 },
      { src: "/sobre/flix-aluna-camera.webp", alt: "Aluna da Ousadia com a câmera na mão, cobrindo a FLIX", w: 1200, h: 800 },
      { src: "/sobre/flix-equipe-cacauway.webp", alt: "Duas integrantes da equipe da Ousadia nos bastidores da cobertura da FLIX", w: 1200, h: 800 },
      { src: "/sobre/cobertura-qoculos.webp", alt: "Jackson em selfie com a equipe da Ousadia na cobertura de um evento", w: 675, h: 1200 },
      { src: "/sobre/turma-selfie-camisas.webp", alt: "Jackson em selfie com os alunos, todos de camisa da Ousadia, numa atividade de campo de cobertura de evento", w: 675, h: 1200, legenda: "Alunos em atividade de campo: a guerrilha, como a gente chama a cobertura de eventos · 2025" },
      { src: "/sobre/comunidade-estudio.webp", alt: "Jackson com a turma de Social Media no estúdio da Ousadia", w: 675, h: 1200, legenda: "Turma de Social Media · 2025" },
      { src: "/sobre/aula-ia.webp", alt: "Jackson dando a aula Criação de Conteúdo com IA da Ousadia", w: 1200, h: 800 },
      { src: "/sobre/mentoria-grupo.webp", alt: "Jackson com as participantes de uma mentoria em grupo, no estúdio da Ousadia", w: 675, h: 1200 },
      { src: "/sobre/comunidade-rio.webp", alt: "Jackson com três parceiros de negócio na beira do rio", w: 675, h: 1200, legenda: "A jornada de construir comunidade teve tração ao encontrar parceiros de negócio · 2025" },
    ],
  },
  {
    ano: "2026",
    legenda: "Comunidade Creators da Amazônia",
    t: "A comunidade e a nova rota",
    d: "Em fevereiro nasce a Comunidade Creators da Amazônia. Em março, a Ousadia começa a trabalhar com Marketing 360 numa empresa de cosméticos naturais e, até agosto, ajuda a construir o programa de embaixadoras da marca. Em agosto, mais um pivô: o time muda e a rota é redesenhada. O foco passa a ser bioeconomia e negócios de impacto, que sempre estiveram na nossa cara. Agora, em novembro, a energia está em construir esse movimento da Comunidade, desta vez na direção certa.",
    fotos: [
      { src: "/sobre/comunidade-caiaque.webp", alt: "Jackson em selfie com o grupo de colete salva-vidas na cobertura da Rota Igarapé Ambé, com a Viver de Amazônia", w: 676, h: 1200, legenda: "Cobertura da Rota Igarapé Ambé com a Viver de Amazônia · 2026" },
      { src: "/sobre/jogos-indigenas-gopro.webp", alt: "Jackson com pintura indígena e câmera no peito, na cobertura de um evento na aldeia Kranh, do povo Xikrin", w: 800, h: 1200, legenda: "Cobertura de eventos na aldeia Kranh, do povo Xikrin · 2026" },
    ],
  },
];

/** Cada valor vem com duas ações concretas e uma foto real que mostra ele na prática. */
const VALORES: {
  t: string;
  d: string;
  acoes: [string, string];
  foto: { src: string; alt: string; foco?: string };
}[] = [
  {
    t: "A verdade vende",
    d: "Storytelling não é inventar história: é contar a sua. Ninguém aqui posa de rico alugado. A sua verdade é o que vende.",
    acoes: [
      "Storytelling no centro dos cursos: cada aluno aprende a transformar a própria história em conteúdo.",
      "Gente real criando conteúdo: mães, empreendedores e jovens da região vendendo com a própria voz.",
    ],
    foto: { src: "/sobre/turma-certificados.webp", alt: "Turma comemorando com os certificados na mão" },
  },
  {
    t: "Método > feeling",
    d: "Feeling é o nome bonito do improviso. Estratégia se aprende, se aplica e se mede.",
    acoes: [
      "Metodologias ativas e gamificação: o aluno aprende fazendo, não só ouvindo.",
      "Todo curso tem Projeto Pedagógico e certificado, com base no Guia Pronatec de Cursos FIC.",
    ],
    foto: { src: "/sobre/aula-revisao.webp", alt: "Jackson dando aula diante de um flip chart com a revisão do dia" },
  },
  {
    t: "Protagonismo amazônico",
    d: "Sotaque não se apaga, se amplifica. A Amazônia não é cenário: é quem conta a história.",
    acoes: [
      "Formações e palestras gratuitas com coletivos de mulheres, associações de classe e sindicatos.",
      "Coberturas como a FLIX e os Jogos Indígenas, contadas por quem é daqui.",
    ],
    foto: { src: "/sobre/oficina-fotografia-rio.webp", alt: "Oficina de fotografia com jovens e adultos à sombra de uma árvore, na beira do rio" },
  },
  {
    t: "Execução > consumo",
    d: "Curso assistido não muda vida; projeto executado, sim. Você sai daqui com trabalho feito, não com PDF salvo.",
    acoes: [
      "Aula prática: o aluno sai com portfólio, não só com anotação.",
      "Formados trabalhando nas coberturas da produtora e em campanhas pagas de UGC.",
    ],
    foto: { src: "/sobre/flix-aluna-camera.webp", alt: "Aluna da Ousadia com a câmera na mão, cobrindo a FLIX" },
  },
  {
    t: "Somar, não competir",
    d: "Tem muita gente fazendo acontecer no Norte há mais tempo. A gente chega pra fortalecer.",
    acoes: [
      "Co-realização da FLIX e liderança do Dia Mundial da Criatividade com parceiros locais.",
      "A Comunidade Creators da Amazônia, aberta a quem já está nessa luta.",
    ],
    foto: { src: "/sobre/time-ousadia-2024.webp", alt: "Time da Ousadia reunido no estúdio, em selfie do Jackson", foco: "50% 30%" },
  },
  {
    t: "IA como ferramenta",
    d: "A máquina serve à sua voz, nunca a substitui. Velocidade sem perder a alma.",
    acoes: [
      "Curso de IA para iniciantes, pra quem nunca usou e tem medo de começar.",
      "IA pra acelerar roteiro e produção, sempre com a voz e a revisão de gente.",
    ],
    foto: { src: "/sobre/aula-ia.webp", alt: "Jackson dando a aula Criação de Conteúdo com IA" },
  },
];

/**
 * Página de perfil do fundador: aponta para a entidade `#fundador` declarada
 * no layout, em vez de repetir os dados. É o que o Google usa pra ligar a
 * pessoa à marca (autoria, painel de conhecimento) e o que as IAs citam.
 */
const perfilJsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": ["AboutPage", "ProfilePage"],
      "@id": `${SITE.url}/sobre/#pagina`,
      url: `${SITE.url}/sobre/`,
      name: "Quem somos: Ousadia Marketing",
      inLanguage: "pt-BR",
      about: { "@id": `${SITE.url}/#organizacao` },
      mainEntity: { "@id": `${SITE.url}/#fundador` },
      isPartOf: { "@id": `${SITE.url}/#site` },
    },
    {
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Início", item: `${SITE.url}/` },
        { "@type": "ListItem", position: 2, name: "Quem somos", item: `${SITE.url}/sobre/` },
      ],
    },
  ],
};

export default function SobrePage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(perfilJsonLd) }}
      />

      {/* ============ 1 · ABERTURA (escuro) ============ */}
      <PageHero
        eyebrow="Quem somos"
        title={
          <>
            A Agência Escola de Marketing do Norte. E o nosso lugar é a{" "}
            <span className="text-amarelo">bioeconomia</span>.
          </>
        }
        video={{ src: "/video/sobre-hero.mp4", poster: "/video/sobre-hero-poster.jpg" }}
        lead="Ensinamos, produzimos e reunimos quem comunica a Amazônia: estratégia, comunicação e creators a serviço de quem produz aqui, contando a própria história com o próprio sotaque."
      />

      {/* ============ 2 · NÚMEROS (roxo) ============ */}
      <section className="relative overflow-hidden bg-roxo">
        <KeneField motif="yapa" scale={92} opacity={0.045} className="text-white" />
        <div className="container-site relative section-padding !py-14">
          <Reveal>
            <p className="font-display text-xl sm:text-2xl leading-snug max-w-3xl">
              De 2020 pra cá, por trás de cada número tem{" "}
              <span className="text-amarelo">gente</span>: o empreendedor que
              levou o negócio pro digital, o jovem que trocou o tempo rolando a
              tela por uma renda criando conteúdo.
            </p>
          </Reveal>
          <KeneRule
            motif="pushu"
            height={12}
            opacity={0.28}
            className="mt-9 max-w-sm text-amarelo"
          />
          <div className="mt-8 grid grid-cols-2 gap-6 md:grid-cols-4">
            {NUMEROS.map((s, i) => (
              <Reveal key={s.l} delay={i * 0.06}>
                <div>
                  <div className="font-display text-4xl font-bold text-amarelo">
                    {s.n}
                  </div>
                  <div className="mt-1 font-mono text-xs uppercase tracking-wider text-cinza-ink">
                    {s.l}
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ============ 3 · VALORES (escuro) ============ */}
      <section className="relative overflow-hidden section-padding">
        <RiverLines className="motif motif-soft text-rio inset-x-0 top-1/3 h-40 w-full" />
        <div className="container-site relative">
          <Reveal>
            <p className="eyebrow mb-4">Valores e como materializamos</p>
            <h2 className="headline-section max-w-2xl">
              No que a gente acredita (e cobra)
            </h2>
          </Reveal>
          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {VALORES.map((v, i) => (
              <Reveal key={v.t} delay={i * 0.05}>
                <article className="card-surface flex h-full flex-col overflow-hidden">
                  <div className="relative aspect-[4/3]">
                    <Image
                      src={v.foto.src}
                      alt={v.foto.alt}
                      fill
                      sizes="(min-width: 1024px) 24rem, (min-width: 640px) 50vw, 100vw"
                      className="object-cover"
                      style={v.foto.foco ? { objectPosition: v.foto.foco } : undefined}
                    />
                  </div>
                  <div className="flex flex-1 flex-col p-6">
                    <h3 className="font-display text-lg">
                      <span className="box-decoration-clone bg-[color:var(--amarelo)] px-1.5 py-0.5 text-[#1a0b2e]">
                        {v.t}
                      </span>
                    </h3>
                    <p className="text-body mt-2 text-sm">{v.d}</p>
                    <ul className="mt-4 space-y-2 border-t border-white/10 pt-4">
                      {v.acoes.map((a) => (
                        <li key={a} className="flex gap-2 text-sm text-foreground/85">
                          <Check
                            size={16}
                            className="mt-0.5 shrink-0 text-amarelo"
                            aria-hidden
                          />
                          {a}
                        </li>
                      ))}
                    </ul>
                  </div>
                </article>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ============ 4 · LINHA DO TEMPO (claro) ============ */}
      <section
        id="historico"
        className="fold-light relative scroll-mt-20 overflow-hidden"
      >
        <WaveDivider
          className="absolute inset-x-0 top-0 rotate-180"
          color="var(--ink-deep)"
        />
        <div className="container-site relative section-padding max-w-5xl">
          <Reveal>
            <p className="eyebrow mb-4">Linha do tempo</p>
            <h2 className="headline-section max-w-3xl">
              Da sala dos professores ao{" "}
              <span className="text-[var(--floresta-deep)]">palco da Amazônia</span>.
            </h2>
          </Reveal>
          <Reveal delay={0.08}>
            <div className="mt-10">
              <LinhaDoTempo marcos={MARCOS} />
            </div>
          </Reveal>
        </div>
      </section>

      {/* ============ 5 · MANIFESTO (escuro profundo) ============ */}
      <section className="relative overflow-hidden bg-ink-void section-padding">
        <KeneStrip
          motif="pushu"
          height={20}
          className="absolute inset-x-0 top-0 text-floresta opacity-70"
        />
        <Leaf className="motif motif-soft text-floresta -left-10 bottom-10 hidden w-64 -rotate-12 lg:block" />
        <div className="container-site relative max-w-3xl">
          <Reveal>
            <p className="eyebrow mb-6">Manifesto</p>
            <h2 className="font-display text-4xl leading-[1.05] sm:text-5xl">
              Por um marketing <span className="text-amarelo">maior</span>.
            </h2>
          </Reveal>
          <Reveal delay={0.1}>
            <div className="text-body mt-9 space-y-6 text-lg">
              <p>
                O Norte nunca teve problema de talento. Teve problema de
                espelho: passou décadas se enxergando pela lente de quem dizia
                que sucesso tinha endereço, e não era o nosso. Mesmo assim,
                muita gente daqui nunca esperou permissão: creators,
                comunicadores e lideranças que fazem acontecer há anos. A
                Ousadia chega pra somar forças com quem já está nessa luta.
              </p>
              <p>
                A gente acredita que{" "}
                <strong className="font-semibold text-amarelo">
                  a verdade vende
                </strong>
                . Que o sotaque do Norte vende. Que a mãe que grava escondida no
                quarto vende. Que a beira do rio vende mais que estúdio alugado.
              </p>
              <p>
                A gente acredita que marketing não é maquiagem: é comunicação
                com método. Que “post bonitinho” sem estratégia é{" "}
                <strong className="font-semibold text-foreground">
                  marketing genérico
                </strong>
                . E que ninguém aqui precisa imitar guru de São Paulo pra
                crescer.
              </p>
              <p>
                É isso que a gente chama de{" "}
                <strong className="font-semibold text-foreground">
                  protagonismo amazônico
                </strong>
                , e é o que desenvolvemos em cada curso e mentoria: a Amazônia
                não como cenário.{" "}
                <span className="text-floresta">Como protagonista.</span>
              </p>
              <p className="font-display text-2xl text-foreground">
                A floresta já tem voz. A gente é o megafone.
              </p>
            </div>
          </Reveal>
          <Reveal delay={0.15}>
            <a href={wa("comunidade")} className="btn btn-primary mt-10">
              Faço parte desse movimento <ArrowRight size={16} />
            </a>
          </Reveal>
        </div>
      </section>

      {/* ============ 6 · ONDE TUDO COMEÇOU (claro) ============ */}
      <section className="fold-light relative overflow-hidden">
        <WaveDivider
          className="absolute inset-x-0 top-0 rotate-180"
          color="var(--ink-void)"
        />
        <div className="container-site relative section-padding grid gap-12 lg:grid-cols-[1fr_1.2fr] lg:items-center">
          <Reveal>
            <Image
              src="/sobre/jackson-amd-palco.webp"
              alt="Jackson de braços abertos no Amazon Marketing Day, com a plateia atrás"
              width={1200}
              height={679}
              className="glow-amarelo w-full rounded-2xl"
            />
          </Reveal>
          <Reveal delay={0.08}>
            <p className="eyebrow mb-4">Onde tudo começou</p>
            <h2 className="headline-section">
              Antes de mover uma região, a gente teve que se{" "}
              <span className="text-[color:var(--floresta-deep)]">mover primeiro</span>.
            </h2>
            <div className="text-body mt-6 space-y-4">
              <p>
                A Ousadia nasceu da história do Jackson, atualmente com 20 anos
                de serviço público, há 17 na educação, e de uma longa jornada de
                desenvolvimento pessoal. Unindo os próprios dons e talentos,
                ele enxergou o que o mercado
                precisava.
              </p>
              <p>
                Com o boom das redes sociais, sobrava gente boa no que faz e
                faltava quem soubesse se mostrar. A resposta foi um método que
                une a pedagogia freiriana, que parte da realidade de quem
                aprende, a ferramentas terapêuticas que destravam o medo de
                aparecer. O produto certo, pra pessoa certa, no canal certo: é
                esse encaixe que a Ousadia ensina até hoje.
              </p>
            </div>
            <blockquote className="font-display mt-8 border-l-2 border-amarelo pl-5 text-2xl leading-snug">
              Ousadia não é ausência de medo.{" "}
              <span className="text-[color:var(--floresta-deep)]">É ação apesar dele.</span>
            </blockquote>
          </Reveal>
        </div>
      </section>

      {/* ============ 7 · QUEM FAZ (escuro) ============ */}
      <section className="relative overflow-hidden section-padding">
        <div className="container-site relative">
          <Reveal>
            <p className="eyebrow mb-4">Quem faz</p>
            <h2 className="headline-section max-w-3xl">
              Gente da terra,{" "}
              <span className="text-amarelo">atrás e na frente das câmeras</span>.
            </h2>
          </Reveal>
          <div className="mt-12 grid gap-6 md:grid-cols-[1fr_2fr]">
            <Reveal>
              <div className="card-surface h-full p-6">
                <Image
                  src="/sobre/jackson-retrato.webp"
                  alt="Retrato do Jackson, sorrindo e estendendo a mão"
                  width={800}
                  height={1200}
                  className="aspect-square w-full rounded-xl object-cover object-[center_25%]"
                />
                <h3 className="font-display mt-5 text-xl">Jackson</h3>
                <p className="font-mono text-xs uppercase tracking-wider text-amarelo">
                  Fundador
                </p>
                <p className="text-body mt-3 text-sm">
                  Ex-diretor de ensino do IFPA Campus Altamira, Master Coach,
                  criador do ABC do Marketing Digital, do Destrave e do Amazon
                  Marketing Day.
                </p>
              </div>
            </Reveal>
            <Reveal delay={0.08}>
              <div className="card-surface flex h-full flex-col justify-center gap-4 p-6">
                <Image
                  src="/sobre/time-ousadia.webp"
                  alt="Jackson e dois integrantes do time, de camisa da Ousadia"
                  width={801}
                  height={1200}
                  className="aspect-[16/10] w-full rounded-xl object-cover object-[center_35%]"
                />
                <p className="text-body text-[0.95rem] leading-relaxed">
                  Quem passou pela Ousadia tem algo em comum: jovens com vontade
                  de construir algo maior. Aqui eles ganham experiência em
                  projetos e eventos reais, desenvolvem o próprio protagonismo e,
                  muitos, seguem o seu caminho no mercado levando o que
                  aprenderam.
                </p>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ============ 8 · ODS (claro) ============ */}
      <OdsCompromisso />

      {/* ============ 9 · CTA (roxo profundo) ============ */}
      <CtaFinal
        waveColor="var(--paper)"
        title={
          <>
            Gostou da história? Ela também pode ser o{" "}
            <span className="text-amarelo">começo da sua</span>.
          </>
        }
        ctaLabel="Quero conversar com a Ousadia"
        href={wa("sobre")}
        microcopy="Você é redirecionado(a) pro WhatsApp. Atendimento humano, sem robô de funil."
      />
    </>
  );
}
