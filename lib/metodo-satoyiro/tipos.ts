/**
 * Tipos do "Ouse Ser Você" — diagnóstico de autoconhecimento e projeto de
 * vida do método Satoyiro. Ver `perguntas.ts` (banco de perguntas),
 * `calculo.ts` (motor de pontuação) e `recomendacoes.ts` (filmes/séries).
 */

/** Categorias ocultas dos capítulos 1 a 3 — o aluno nunca vê estes nomes. */
export type CategoriaCap1 =
  | "CONSCIENTE"
  | "AUTOCRITICO"
  | "DESCOBERTA"
  | "TRANQUILO";
export type CategoriaCap2 =
  | "PROTAGONISTA"
  | "SONHADOR"
  | "EXPLORADOR"
  | "OCUPADO";
export type CategoriaCap3 = "AUTONOMO" | "ALINHADO" | "CONFLITO" | "PRESSIONADO";
export type Categoria = CategoriaCap1 | CategoriaCap2 | CategoriaCap3;

export type CapituloChave = 1 | 2 | 3;

/** As 4 letras de cada dimensão do capítulo 4 (inspirado nos 16 tipos). */
export type Letra = "E" | "I" | "S" | "N" | "T" | "F" | "J" | "P";
export type Dimensao = "EI" | "SN" | "TF" | "JP";

export type Grupo = "Estrategistas" | "Inspiradores" | "Organizadores" | "Realizadores";

/* ------------------------------------------------------------------ *
 * Perguntas
 * ------------------------------------------------------------------ */

export type OpcaoEscolha = { texto: string; categoria: Categoria };

export type PerguntaEscolha = {
  tipo: "escolha";
  capitulo: CapituloChave;
  chave: string;
  titulo: string;
  opcoes: OpcaoEscolha[];
};

export type OpcaoForcada = { letra: Letra; texto: string };

export type PerguntaForcada = {
  tipo: "forcada";
  capitulo: 4;
  chave: string;
  dimensao: Dimensao;
  a: OpcaoForcada;
  b: OpcaoForcada;
};

export type PerguntaAberta = {
  tipo: "aberta";
  capitulo: 5;
  chave: string;
  titulo: string;
  placeholder: string;
};

export type Pergunta = PerguntaEscolha | PerguntaForcada | PerguntaAberta;

/* ------------------------------------------------------------------ *
 * Respostas
 * ------------------------------------------------------------------ */

export type RespostaEscolha = { tipo: "escolha"; idx: number; categoria: Categoria };
export type RespostaForcada = { tipo: "forcada"; letra: Letra };
export type RespostaAberta = { tipo: "aberta"; texto: string };
export type Resposta = RespostaEscolha | RespostaForcada | RespostaAberta;
export type Respostas = Record<string, Resposta>;

/* ------------------------------------------------------------------ *
 * Resultado
 * ------------------------------------------------------------------ */

export type ResultadoCapitulo<C extends Categoria> = {
  /** Categoria vencedora (ou a primeira, em empate). */
  principal: C;
  /** Presente só quando duas categorias empatam em número de respostas. */
  empateCom?: C;
  /** Rótulo pronto para exibir: "CONSCIENTE" ou "Em transição entre X e Y". */
  rotulo: string;
  contagem: Record<C, number>;
};

export type ResultadoDimensao = {
  dimensao: Dimensao;
  letra: Letra;
  outraLetra: Letra;
  /** Sempre 100 — 1 pergunta por dimensão, sem possibilidade de empate. */
  pct: number;
};

export type ResultadoMbti = {
  tipo: string; // "ENFP"
  apelido: string; // "O Inspirador"
  grupo: Grupo;
  dimensoes: ResultadoDimensao[];
};

export type Resultado = {
  cap1: ResultadoCapitulo<CategoriaCap1>;
  cap2: ResultadoCapitulo<CategoriaCap2>;
  cap3: ResultadoCapitulo<CategoriaCap3>;
  mbti: ResultadoMbti;
  abertas: { chave: string; titulo: string; texto: string }[];
};

/** Dados de contato capturados só depois do quiz, antes de liberar o mapa. */
export type LeadAluno = {
  primeiroNome: string;
  turma: string;
  nomeCompleto: string;
  email: string;
  contato: string;
  redeSocial: string;
  /** Formato ISO (yyyy-mm-dd), como vem de um <input type="date">. */
  dataNascimento: string;
};

export const LEAD_ALUNO_VAZIO: LeadAluno = {
  primeiroNome: "",
  turma: "",
  nomeCompleto: "",
  email: "",
  contato: "",
  redeSocial: "",
  dataNascimento: "",
};
