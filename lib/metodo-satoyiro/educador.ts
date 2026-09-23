import { CAP2_MATRIZ } from "./textos";
import type { CategoriaCap2 } from "./tipos";

/** Uma linha da planilha, já tipada — espelha `payloadPlanilha()` em `persistencia.ts`. */
export type LinhaAluno = {
  data: string;
  nome: string;
  turma: string;
  email: string;
  contato: string;
  redeSocial: string;
  tipoMbti: string;
  apelidoMbti: string;
  grupo: string;
  comoMeVejo: string;
  comoMeVejoCategoria: string;
  meuCaminho: string;
  meuCaminhoCategoria: string;
  sucessoExpectativas: string;
  sucessoExpectativasCategoria: string;
  conversaPrioritaria: boolean;
  resposta1: string;
  resposta2: string;
  resposta3: string;
};

/** Converte as linhas cruas do CSV (chaves em snake_case) para `LinhaAluno`. */
export function normalizarLinhas(linhas: Record<string, string>[]): LinhaAluno[] {
  return linhas
    .map((l) => ({
      data: l.data ?? "",
      nome: l.nome ?? "",
      turma: l.turma ?? "",
      email: l.email ?? "",
      contato: l.contato ?? "",
      redeSocial: l.rede_social ?? "",
      tipoMbti: l.tipo_mbti ?? "",
      apelidoMbti: l.apelido_mbti ?? "",
      grupo: l.grupo ?? "",
      comoMeVejo: l.como_me_vejo ?? "",
      comoMeVejoCategoria: l.como_me_vejo_categoria ?? "",
      meuCaminho: l.meu_caminho ?? "",
      meuCaminhoCategoria: l.meu_caminho_categoria ?? "",
      sucessoExpectativas: l.sucesso_e_expectativas ?? "",
      sucessoExpectativasCategoria: l.sucesso_e_expectativas_categoria ?? "",
      conversaPrioritaria: (l.conversa_prioritaria ?? "").trim().toLowerCase() === "sim",
      resposta1: l.resposta_1 ?? "",
      resposta2: l.resposta_2 ?? "",
      resposta3: l.resposta_3 ?? "",
    }))
    .filter((l) => l.nome.length > 0);
}

/** Conta ocorrências de um valor (tipo MBTI, categoria, turma…), do maior pro menor. */
export function contarOcorrencias(valores: string[]): { rotulo: string; total: number }[] {
  const contagem = new Map<string, number>();
  for (const v of valores) {
    if (!v) continue;
    contagem.set(v, (contagem.get(v) ?? 0) + 1);
  }
  return [...contagem.entries()]
    .map(([rotulo, total]) => ({ rotulo, total }))
    .sort((a, b) => b.total - a.total);
}

/**
 * Posição de cada aluno na matriz Clareza × Ação (capítulo "Meu caminho"),
 * com um leve espalhamento (jitter) determinístico pra pontos da mesma
 * categoria não ficarem exatamente empilhados no dispersão.
 */
export function dispersaoClarezaAcao(linhas: LinhaAluno[]) {
  return linhas
    .map((l, i) => {
      const cat = l.meuCaminhoCategoria as CategoriaCap2;
      const base = CAP2_MATRIZ.pos[cat];
      if (!base) return null;
      const jitter = (seed: number) => (Math.sin(seed * 999) * 0.5 + 0.5) * 0.6 + 0.2;
      return {
        nome: l.nome,
        categoria: cat,
        x: base.x + (base.x === 0 ? jitter(i) : -jitter(i + 1)),
        y: base.y + (base.y === 0 ? jitter(i + 2) : -jitter(i + 3)),
      };
    })
    .filter((p): p is NonNullable<typeof p> => p !== null);
}

/** Converte as linhas visíveis (já filtradas) pra CSV, pronto pra baixar. */
export function paraCsv(linhas: LinhaAluno[]): string {
  const colunas: (keyof LinhaAluno)[] = [
    "data",
    "nome",
    "turma",
    "email",
    "contato",
    "redeSocial",
    "tipoMbti",
    "apelidoMbti",
    "grupo",
    "comoMeVejo",
    "meuCaminho",
    "sucessoExpectativas",
    "conversaPrioritaria",
  ];

  function escapar(valor: string) {
    return /[",\n]/.test(valor) ? `"${valor.replace(/"/g, '""')}"` : valor;
  }

  const cabecalho = colunas.join(",");
  const corpo = linhas.map((l) =>
    colunas.map((c) => escapar(String(l[c]))).join(","),
  );
  return [cabecalho, ...corpo].join("\n");
}
