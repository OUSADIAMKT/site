import { PERGUNTAS } from "./perguntas";
import { MBTI_APELIDO, rotuloTransicao } from "./textos";
import type {
  Categoria,
  CategoriaCap1,
  CategoriaCap2,
  CategoriaCap3,
  Dimensao,
  Grupo,
  Letra,
  Pergunta,
  PerguntaForcada,
  Resposta,
  ResultadoCapitulo,
  ResultadoDimensao,
  ResultadoMbti,
  Respostas,
  Resultado,
} from "./tipos";

/**
 * Motor de cálculo do "Ouse Ser Você".
 *
 * Capítulos 1-3: 3 perguntas, 4 categorias possíveis por capítulo. A
 * categoria mais escolhida vence; empate vira "Em transição entre X e Y".
 *
 * Capítulo 4: 4 dimensões (E/I, S/N, T/F, J/P), 1 pergunta cada. A letra
 * escolhida define a dimensão direto, sem possibilidade de empate.
 */

function contarCapitulo<C extends Categoria>(
  respostas: Respostas,
  capitulo: 1 | 2 | 3,
  categorias: readonly C[],
): ResultadoCapitulo<C> {
  const contagem = Object.fromEntries(categorias.map((c) => [c, 0])) as Record<
    C,
    number
  >;

  for (const p of PERGUNTAS) {
    if (p.tipo !== "escolha" || p.capitulo !== capitulo) continue;
    const r = respostas[p.chave];
    if (!r || r.tipo !== "escolha") continue;
    contagem[r.categoria as C] += 1;
  }

  const max = Math.max(...categorias.map((c) => contagem[c]));
  const vencedoras = categorias.filter((c) => contagem[c] === max);

  const [principal, empateCom] = vencedoras;
  const rotulo = empateCom
    ? rotuloTransicao(principal, empateCom)
    : principal;

  return { principal, empateCom, rotulo, contagem };
}

export function calcularCap1(respostas: Respostas): ResultadoCapitulo<CategoriaCap1> {
  return contarCapitulo(respostas, 1, [
    "CONSCIENTE",
    "AUTOCRITICO",
    "DESCOBERTA",
    "TRANQUILO",
  ] as const);
}

export function calcularCap2(respostas: Respostas): ResultadoCapitulo<CategoriaCap2> {
  return contarCapitulo(respostas, 2, [
    "PROTAGONISTA",
    "SONHADOR",
    "EXPLORADOR",
    "OCUPADO",
  ] as const);
}

export function calcularCap3(respostas: Respostas): ResultadoCapitulo<CategoriaCap3> {
  return contarCapitulo(respostas, 3, [
    "AUTONOMO",
    "ALINHADO",
    "CONFLITO",
    "PRESSIONADO",
  ] as const);
}

/* ------------------------------------------------------------------ *
 * Capítulo 4 — dimensões
 * ------------------------------------------------------------------ */

const PERGUNTAS_FORCADAS = PERGUNTAS.filter(
  (p): p is PerguntaForcada => p.tipo === "forcada",
);

const DIMENSOES: Dimensao[] = ["EI", "SN", "TF", "JP"];

/** As 2 letras possíveis de cada dimensão, na ordem em que aparecem na pergunta. */
export function letrasDaDimensao(dim: Dimensao): [Letra, Letra] {
  const p = PERGUNTAS_FORCADAS.find((q) => q.dimensao === dim)!;
  return [p.a.letra, p.b.letra];
}

function calcularDimensao(respostas: Respostas, dim: Dimensao): ResultadoDimensao {
  const [letraA, letraB] = letrasDaDimensao(dim);
  const p = PERGUNTAS_FORCADAS.find((q) => q.dimensao === dim)!;
  const r = respostas[p.chave];
  const letra = r && r.tipo === "forcada" ? r.letra : letraA;
  const outraLetra = letra === letraA ? letraB : letraA;

  return { dimensao: dim, letra, outraLetra, pct: 100 };
}

/** Grupo (temperamento) segundo a regra clássica: N combina com T/F, S combina com J/P. */
function calcularGrupo(dims: ResultadoDimensao[]): Grupo {
  const letra = Object.fromEntries(dims.map((d) => [d.dimensao, d.letra])) as Record<
    Dimensao,
    Letra
  >;

  if (letra.SN === "N") {
    return letra.TF === "T" ? "Estrategistas" : "Inspiradores";
  }
  return letra.JP === "J" ? "Organizadores" : "Realizadores";
}

export function calcularMbti(respostas: Respostas): ResultadoMbti {
  const dimensoes = DIMENSOES.map((d) => calcularDimensao(respostas, d));
  const ordem: Dimensao[] = ["EI", "SN", "TF", "JP"];
  const tipo = ordem.map((d) => dimensoes.find((r) => r.dimensao === d)!.letra).join("");

  return {
    tipo,
    apelido: MBTI_APELIDO[tipo] ?? "Seu tipo único",
    grupo: calcularGrupo(dimensoes),
    dimensoes,
  };
}

/* ------------------------------------------------------------------ *
 * Resultado completo
 * ------------------------------------------------------------------ */

const PERGUNTAS_ABERTAS = PERGUNTAS.filter((p) => p.tipo === "aberta");

export function compute(respostas: Respostas): Resultado {
  const abertas = PERGUNTAS_ABERTAS.map((p) => {
    const r = respostas[p.chave];
    const texto = r && r.tipo === "aberta" ? r.texto.trim() : "";
    return { chave: p.chave, titulo: p.titulo, texto };
  }).filter((a) => a.texto.length > 0);

  return {
    cap1: calcularCap1(respostas),
    cap2: calcularCap2(respostas),
    cap3: calcularCap3(respostas),
    mbti: calcularMbti(respostas),
    abertas,
  };
}

export type { Pergunta, Resposta };
