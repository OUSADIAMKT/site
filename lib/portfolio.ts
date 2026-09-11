/**
 * Fonte única dos cases do portfólio (PENDENCIAS #4, #13, #14).
 *
 * O mesmo case alimenta `/portfolio`, a dobra 8 da Home, `/agencia` e
 * `/mentoria` — escreve uma vez, aparece em todo lugar. Antes disso, cada
 * página tinha o próprio slot solto e o conteúdo ia divergir na primeira
 * atualização.
 *
 * Conteúdo extraído de `legado/Proposta Casa Sato - Portfolio2026 - Ousadia
 * Marketing.pdf` (páginas 3 a 18 — as páginas 19 a 22 são a proposta comercial
 * pra Casa Sato, com valores, e **não** entram no site).
 *
 * Regra do PRD 7.3, que vale aqui mais do que em qualquer outra página:
 * **prova social não se inventa**. Campo sem material confirmado fica `null` e
 * a página renderiza o slot rotulado no lugar — nunca número estimado, antes/
 * depois reconstruído de memória ou depoimento "de exemplo". Boa parte dos
 * cases abaixo está sem `antes`/`depois`/`numeros` por isso: o portfólio em PDF
 * conta o que foi entregue, mas não traz o resultado medido.
 */

/**
 * Onde o case aparece no site. Define o filtro de `/agencia` e `/mentoria`.
 * Não confundir com `servico`, que é o tipo de trabalho entregue.
 */
export type Frente = "agencia" | "mentoria" | "escola";

/**
 * Como o portfólio se organiza — a mesma divisão que a Ousadia usa na
 * apresentação comercial, porque é assim que o cliente procura: ele quer ver
 * "vocês já fizeram vídeo?", não "vocês já atenderam pela agência?".
 */
export type Servico = "redes" | "audiovisual" | "formacao";

export const SERVICOS: Record<
  Servico,
  {
    label: string;
    titulo: string;
    lead: string;
    /** Cor da etiqueta do serviço no cartão. */
    cor: string;
    /** Classe de fundo da dobra em `/portfolio` (ver `.fold-*` no globals.css). */
    fundo: string;
    /** Token da mesma cor, pro WaveDivider da dobra seguinte emendar. */
    fundoVar: string;
    /** Acento em hex pra faixa de grafismo no topo da dobra. */
    acento: string;
  }
> = {
  redes: {
    label: "Redes sociais",
    titulo: "Marca com identidade no feed",
    lead: "Planejamento, campanha e conteúdo de quem entende que território não é cenário: é estratégia, repertório e diferenciação.",
    cor: "text-amarelo",
    fundo: "fold-redes",
    fundoVar: "var(--fundo-redes)",
    acento: "#ffc61a",
  },
  audiovisual: {
    label: "Audiovisual",
    titulo: "A história que banco de imagem nenhum conta",
    lead: "Vídeo institucional gravado em campo, com quem vive na floresta. Cada roteiro, cena e enquadramento nasce do território.",
    cor: "text-rio-soft",
    fundo: "fold-audiovisual",
    fundoVar: "var(--fundo-audiovisual)",
    acento: "#18a5c9",
  },
  formacao: {
    label: "Escola",
    titulo: "Gente do território ocupando o digital",
    lead: "Formação que prepara pessoas, empreendedores e organizações da bioeconomia pra comunicar e valorizar o que fazem.",
    cor: "text-floresta",
    fundo: "fold-escola",
    fundoVar: "var(--fundo-escola)",
    acento: "#23b26f",
  },
};

export type Numero = {
  /** O número em si, já formatado: "30+", "5", "2020–2025". */
  valor: string;
  /** O que ele mede, em duas ou três palavras. */
  label: string;
};

export type Case = {
  /** Identificador estável — usado como âncora e chave de lista. */
  slug: string;
  /** Nome da pessoa, marca ou projeto, como quer ser chamado. */
  cliente: string;
  /** Cidade, quando confirmada. `null` some do cartão em vez de chutar. */
  cidade: string | null;
  nicho: string;
  frente: Frente;
  servico: Servico;
  /** Uma frase: o que a Ousadia fez nesse trabalho. */
  resumo: string;
  /** O ponto de partida real, sem suavizar. */
  antes: string | null;
  /** Onde chegou. */
  depois: string | null;
  /** A virada de chave — o que explica o resultado. */
  oQueMudou: string | null;
  /** Até três números verificáveis. Sem número confirmado, `null`. */
  numeros: Numero[] | null;
  /** O que foi entregue (posicionamento, conteúdo, captação...). */
  entregas: string[] | null;
  depoimento: { texto: string; autor: string } | null;
  /** Caminho em `public/`. Vira capa da foto ou pôster do vídeo. */
  capa: string | null;
  /**
   * ID do vídeo no YouTube — só o trecho depois de `v=` ou de `youtu.be/`,
   * nunca a URL inteira. O player só carrega depois do clique (`YouTubeLite`).
   */
  video: string | null;
  /** Duração do vídeo, como aparece no portfólio ("11 min 24 s"). */
  duracao: string | null;
  /** Fotos próprias do trabalho, além da capa. Caminhos a partir de `public/`. */
  galeria: { src: string; alt: string }[] | null;
  /** Entra nos blocos resumidos (Home, `/agencia`, `/mentoria`). */
  destaque: boolean;
};

export const CASES: Case[] = [
  {
    slug: "ekilibre-amazonia",
    cliente: "Ekilibre Amazônia",
    cidade: null,
    nicho: "Cosméticos naturais",
    frente: "agencia",
    servico: "redes",
    resumo:
      "Tradução do DNA de uma marca de cosméticos naturais em campanha de UGC, com o próprio clube de revendedoras virando creator.",
    antes: null,
    depois: null,
    oQueMudou:
      "Em vez de contratar rosto de fora, a Ousadia usou o clube de revendedoras da própria marca: as esteticistas naturalistas viraram embaixadoras, com mentoria de creators e gamificação da criação de conteúdo.",
    numeros: null,
    entregas: [
      "Planejamento de campanhas",
      "Estratégia de redes sociais",
      "Gestão de campanhas UGC",
      "Posts e reels educativos de produto",
      "Mentoria de creators",
    ],
    depoimento: null,
    capa: "/portfolio/ekilibre.jpg",
    video: null,
    duracao: null,
    galeria: [
      {
        src: "/portfolio/ekilibre-ugc.jpg",
        alt: "Grade de reels educativos produzidos para a Ekilibre Amazônia",
      },
      {
        src: "/portfolio/ekilibre-perfil.jpg",
        alt: "Perfil da Ekilibre Amazônia no Instagram depois da campanha",
      },
    ],
    destaque: true,
  },
  {
    slug: "biorama",
    cliente: "Biorama",
    cidade: null,
    nicho: "Bioeconomia",
    frente: "agencia",
    servico: "audiovisual",
    resumo:
      "Institucional sobre inovação e saberes tradicionais, gravado em campo com quem produz — do viveiro ao produto na prateleira.",
    antes: null,
    depois: null,
    oQueMudou: null,
    numeros: null,
    entregas: ["Vídeo institucional", "Captação em campo", "Edição"],
    depoimento: null,
    capa: "/portfolio/biorama.jpg",
    video: "MJgwQzeWcQI",
    duracao: "11 min 24 s",
    galeria: [
      {
        src: "/portfolio/biorama-1.jpg",
        alt: "Escoamento da produção pelo rio, em canoa",
      },
      {
        src: "/portfolio/biorama-2.jpg",
        alt: "Produtor segurando cacho colhido na floresta",
      },
    ],
    destaque: true,
  },
  {
    slug: "genese-jornada-amazonia",
    cliente: "Gênese · Jornada Amazônia",
    cidade: null,
    nicho: "Empreendedorismo e bioeconomia",
    frente: "agencia",
    servico: "audiovisual",
    resumo:
      "Institucional do programa que leva empreendedorismo e bioeconomia pra dentro da escola, com estudantes e mentores em cena.",
    antes: null,
    depois: null,
    oQueMudou: null,
    numeros: null,
    entregas: ["Vídeo institucional", "Captação em campo", "Edição"],
    depoimento: null,
    capa: "/portfolio/genese.jpg",
    video: "i2igPsPmMis",
    duracao: "8 min 31 s",
    galeria: [
      {
        src: "/portfolio/genese-1.jpg",
        alt: "Estudantes em atividade da Jornada Amazônia",
      },
    ],
    destaque: false,
  },
  {
    slug: "creax-oficina-fotografia",
    cliente: "CREAX · Oficina de Fotografia",
    cidade: null,
    nicho: "Comunidades ribeirinhas",
    frente: "agencia",
    servico: "audiovisual",
    resumo:
      "Institucional sobre protagonismo amazônico: a oficina que põe a câmera na mão de quem mora na comunidade, não de quem visita.",
    antes: null,
    depois: null,
    oQueMudou: null,
    numeros: null,
    entregas: ["Vídeo institucional", "Captação em campo", "Edição"],
    depoimento: null,
    capa: "/portfolio/creax.jpg",
    video: "kdUsL-Z-9qs",
    duracao: "21 min 38 s",
    galeria: [
      {
        src: "/portfolio/creax-1.jpg",
        alt: "Menina fotografando com o celular durante a oficina",
      },
      {
        src: "/portfolio/creax-2.jpg",
        alt: "Produtora entre os cacaueiros, na comunidade",
      },
    ],
    destaque: true,
  },
  {
    slug: "festival-do-caratinga",
    cliente: "Festival do Caratinga",
    cidade: null,
    nicho: "Turismo sustentável",
    frente: "agencia",
    servico: "audiovisual",
    resumo:
      "Cobertura do festival de 2025, com Mayckon Pontes, mostrando turismo sustentável do jeito que ele acontece: praia cheia e economia local girando.",
    antes: null,
    depois: null,
    oQueMudou: null,
    numeros: null,
    entregas: ["Vídeo institucional", "Cobertura de evento", "Captação aérea"],
    depoimento: null,
    capa: "/portfolio/caratinga.jpg",
    video: "ZTfc5G5WBzU",
    duracao: "4 min 31 s",
    galeria: [
      {
        src: "/portfolio/caratinga-1.jpg",
        alt: "Público lotando a praia durante o Festival do Caratinga 2025",
      },
    ],
    destaque: false,
  },
  {
    slug: "embaixadoras-ekl",
    cliente: "Programa de Embaixadoras EKL",
    cidade: null,
    nicho: "Clube de revenda",
    frente: "escola",
    servico: "formacao",
    resumo:
      "O START Creators do Clube Ekl: esteticistas naturalistas formadas pra falar dos produtos da Ekilibre Amazônia com a própria voz.",
    antes:
      "Um clube de revendedoras que vendia no presencial, sem presença digital própria pra sustentar a marca.",
    depois:
      "Lives semanais, conteúdo em colab com a marca e venda online com cupom de desconto e comissão, somada à revenda física.",
    oQueMudou:
      "A metodologia de UGC virou formação: em vez de receber post pronto, cada embaixadora aprendeu a produzir o próprio conteúdo.",
    numeros: [
      { valor: "5", label: "embaixadoras" },
      { valor: "3", label: "estados" },
      { valor: "1ª turma", label: "maio e junho de 2026" },
    ],
    entregas: [
      "Formação de creators",
      "Metodologia UGC",
      "Lives semanais",
      "Conteúdo em colab",
    ],
    depoimento: null,
    capa: "/portfolio/ekilibre-perfil.jpg",
    video: null,
    duracao: null,
    galeria: null,
    destaque: false,
  },
  {
    slug: "genese-cop30",
    cliente: "Fundação Certi · Programa Gênese na COP30",
    cidade: null,
    nicho: "Bioeconomia e inovação",
    frente: "escola",
    servico: "formacao",
    resumo:
      "Formação dos embaixadores do Gênese · Jornada Amazônia em criação de conteúdo sobre bioeconomia, empreendedorismo e inovação, rumo à COP30.",
    antes: null,
    depois: null,
    oQueMudou: null,
    numeros: [{ valor: "ago–set 2025", label: "período da formação" }],
    entregas: [
      "Formação de embaixadores",
      "Criação de conteúdo",
      "Bioeconomia e inovação",
    ],
    depoimento: null,
    capa: null,
    video: null,
    duracao: null,
    galeria: null,
    destaque: false,
  },
  {
    slug: "turmas-presenciais",
    cliente: "Turmas presenciais da Escola Ousadia",
    cidade: null,
    nicho: "ABC do Marketing · Destrave · Social Media de Eventos",
    frente: "escola",
    servico: "formacao",
    resumo:
      "Mais de 30 turmas presenciais entre 2020 e 2025, formando empreendedor que travava na frente da câmera e jovem que queria viver de social media.",
    antes:
      "Empreendedores que queriam construir posicionamento no digital e travavam na frente da câmera; jovens sem caminho pra entrar no mercado de social media e vídeo.",
    depois:
      "Gente formada em sala, com trabalho publicado — e uma parte delas prestando serviço de social media e videomaker na região.",
    oQueMudou: null,
    numeros: [
      { valor: "30+", label: "turmas presenciais" },
      { valor: "2020–2025", label: "período" },
      { valor: "3", label: "formações" },
    ],
    entregas: [
      "ABC do Marketing",
      "Destrave",
      "Social Media de Eventos",
      "Formação presencial",
    ],
    depoimento: null,
    capa: "/portfolio/turmas.jpg",
    video: null,
    duracao: null,
    galeria: [
      {
        src: "/portfolio/turmas-1.jpg",
        alt: "Turma presencial na entrega dos certificados",
      },
      {
        src: "/portfolio/turmas-2.jpg",
        alt: "Alunos e equipe da Ousadia ao fim de uma turma",
      },
    ],
    destaque: true,
  },
];

/** Cases de um serviço, na ordem em que foram cadastrados. */
export function casesPorServico(servico: Servico) {
  return CASES.filter((c) => c.servico === servico);
}

/**
 * Cases marcados como destaque, pra vitrine curta de outras páginas.
 *
 * Com `frente`, restringe à frente da página (`/agencia`, `/mentoria`).
 * Sem ela — o caso da Home — pega **um de cada serviço** antes de repetir:
 * a vitrine da Home tem que mostrar a largura do que a Ousadia faz, e não três
 * cartões da mesma frente só porque foram cadastrados primeiro.
 */
export function casesDestaque(limite = 3, frente?: Frente) {
  const destaques = CASES.filter(
    (c) => c.destaque && (!frente || c.frente === frente),
  );
  if (frente) return destaques.slice(0, limite);

  const vistos = new Set<Servico>();
  const variados = destaques.filter((c) => {
    if (vistos.has(c.servico)) return false;
    vistos.add(c.servico);
    return true;
  });
  // Completa com o resto, caso um serviço ainda não tenha case em destaque.
  return [...variados, ...destaques.filter((c) => !variados.includes(c))].slice(
    0,
    limite,
  );
}

/** Quantos cases já estão publicados — o portfólio muda de tom quando é zero. */
export const TEM_CASES = CASES.length > 0;
