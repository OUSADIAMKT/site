/**
 * Motor comum dos diagnósticos por área do submenu Diagnóstico (pedido de
 * 18/10/2026): IA (`/diagnostico/ia`) e Social Media
 * (`/diagnostico/social-media`). Cada área só define o conteúdo num arquivo
 * próprio; a tela é `components/diagnostico-area/QuizArea.tsx`.
 *
 * Como mede (revisão de 18/10/2026, a partir da proposta do usuário):
 * - 8 perguntas que contam ponto (0 a 3), 2 por competência. Parte delas é de
 *   situação ("qual destes pedidos funciona melhor?"), pra medir o que a
 *   pessoa sabe e não só o que ela acha que sabe.
 * - 2 perguntas que NÃO contam ponto (`pontua: false`): a dificuldade e o
 *   objetivo. Elas só personalizam o resultado.
 * - A ordem das opções é sorteada para cada pessoa, e as opções têm tamanhos
 *   parecidos, pra a mais completa não se destacar.
 * - O nível mais alto pode exigir nota mínima em perguntas-chave (`exige`).
 *
 * Antes do resultado o teste pede nome, e-mail, WhatsApp, profissão e faixa
 * etária e grava tudo na planilha DO PRÓPRIO TESTE (`endpoint` de cada config,
 * um Apps Script por planilha, com aba Painel). As planilhas são separadas
 * porque quem recebe os leads muda: a de Social Media é compartilhada com a
 * mentora do curso. Quem marca "Menos de 18" vê o resultado, mas nada é
 * gravado (LGPD, art. 14).
 */

import { POLITICA_VERSAO } from "@/lib/site";

export type OpcaoArea = {
  lab: string;
  /** Pontos (0 a 3). Ausente nas perguntas que não pontuam. */
  pts?: number;
  /** Só nas perguntas de dificuldade: como o resultado lê essa escolha. */
  leitura?: string;
  /** Só nas perguntas de objetivo: o que a pessoa ganha e o comando pronto. */
  oportunidades?: string[];
  comando?: string;
};

export type PerguntaArea = {
  key: string;
  /** Competência que a pergunta mede. Vazio quando `pontua: false`. */
  dim?: string;
  tema: string;
  titulo: string;
  dica?: string;
  /** Caixa de texto acima das opções (a "resposta da IA", o vídeo etc.). */
  contexto?: { rotulo: string; texto: string };
  /** false = não entra na pontuação (dificuldade, objetivo). */
  pontua?: boolean;
  /** "dificuldade" ou "objetivo": de onde o resultado tira cada bloco. */
  papel?: "dificuldade" | "objetivo";
  opcoes: OpcaoArea[];
};

export type DestinoArea =
  | { tipo: "curso"; titulo: string; texto: string; botao: string; href: string }
  | {
      tipo: "whatsapp";
      titulo: string;
      texto: string;
      botao: string;
      /** Mensagem pronta; vai pro WhatsApp do Diagnóstico. */
      mensagem: string;
      /** Link secundário (por exemplo, a página da mentoria). */
      extra?: { botao: string; href: string };
    };

export type NivelArea = {
  id: string;
  nome: string;
  /** Pontuação mínima (soma das perguntas que pontuam). */
  min: number;
  /**
   * Para chegar aqui, cada condição precisa valer: toda pergunta listada com
   * pelo menos `min` pontos. Se falhar, a pessoa desce um nível.
   */
  exige?: { perguntas: string[]; min: number }[];
  /** Frase de identificação, entre aspas, na voz da pessoa. */
  frase: string;
  descricao: string;
  mensagem: string;
  missao: string;
  /** Plano de 4 semanas, ligado aos módulos do curso. */
  plano: { semana: string; foco: string; onde: string }[];
  destino: DestinoArea;
  /** Cor do nível nos gráficos. */
  cor: string;
};

export type DimensaoArea = {
  key: string;
  nome: string;
  /** Curto, pros rótulos do gráfico. */
  curto: string;
  /** O que fazer quando esta é a competência mais fraca. */
  prioridade: string;
};

export type DiagnosticoArea = {
  /** Vai na planilha (campo "teste"): "ia", "social-media". */
  teste: string;
  /** URL do Apps Script da planilha deste teste. Vazio = não grava. */
  endpoint: string;
  /** Quem mais recebe os dados (aparece na caixa de consentimento). */
  compartilhaCom?: string;
  nome: string;
  rotuloResultado: string;
  comoFunciona: { k: string; t: string; d: string }[];
  intro: string;
  /** Um dado com fonte, na abertura (opcional). */
  dado?: { texto: string; fonte: string; href: string };
  textoBotaoInicio: string;
  textoCaptura: string;
  textoConsentimento: string;
  /** Ordem fixa: vira as colunas `<key>_pct` da planilha. */
  dimensoes: DimensaoArea[];
  perguntas: PerguntaArea[];
  /** Do menor `min` para o maior. */
  niveis: NivelArea[];
  /** Aviso extra se a pessoa tirar 0 numa destas perguntas. */
  alerta?: { perguntas: string[]; titulo: string; destaque: string; texto: string };
};

export type ResultadoArea = {
  total: number;
  max: number;
  nivel: NivelArea;
  /** Subiu de faixa, mas ficou abaixo por causa de `exige`. */
  barrado: boolean;
  dims: (DimensaoArea & { pts: number; teto: number; pct: number })[];
  forte: DimensaoArea & { pct: number };
  fraca: DimensaoArea & { pct: number };
  alerta: boolean;
  dificuldade?: OpcaoArea;
  objetivo?: OpcaoArea;
};

const pontua = (q: PerguntaArea) => q.pontua !== false;
const teto = (q: PerguntaArea) => Math.max(...q.opcoes.map((o) => o.pts ?? 0));

/** respostas: índice da opção escolhida (na ordem original de `opcoes`). */
export function calcularArea(cfg: DiagnosticoArea, respostas: number[]): ResultadoArea {
  const pts = cfg.perguntas.map((q, i) =>
    pontua(q) ? (q.opcoes[respostas[i]]?.pts ?? 0) : 0,
  );
  const ptsDe = (key: string) => {
    const i = cfg.perguntas.findIndex((q) => q.key === key);
    return i >= 0 ? pts[i] : 0;
  };
  const total = pts.reduce((a, b) => a + b, 0);
  const max = cfg.perguntas.filter(pontua).reduce((a, q) => a + teto(q), 0);

  const naFaixa =
    [...cfg.niveis].reverse().find((n) => total >= n.min) ?? cfg.niveis[0];
  const naoCumpre = (n: NivelArea) =>
    (n.exige ?? []).some((c) => c.perguntas.some((k) => ptsDe(k) < c.min));
  let idx = cfg.niveis.indexOf(naFaixa);
  while (idx > 0 && naoCumpre(cfg.niveis[idx])) idx--;
  const nivel = cfg.niveis[idx];

  const dims = cfg.dimensoes.map((d) => {
    const qs = cfg.perguntas
      .map((q, i) => ({ q, i }))
      .filter(({ q }) => pontua(q) && q.dim === d.key);
    const soma = qs.reduce((a, { i }) => a + pts[i], 0);
    const t = qs.reduce((a, { q }) => a + teto(q), 0);
    return { ...d, pts: soma, teto: t, pct: t ? Math.round((soma / t) * 100) : 0 };
  });
  // Empate: fica a primeira da lista (ordem de `dimensoes`).
  const forte = dims.reduce((a, b) => (b.pct > a.pct ? b : a));
  const fraca = dims.reduce((a, b) => (b.pct < a.pct ? b : a));

  const alerta = Boolean(
    cfg.alerta?.perguntas.some((k) => {
      const i = cfg.perguntas.findIndex((q) => q.key === k);
      return i >= 0 && pts[i] === 0;
    }),
  );
  const escolha = (papel: PerguntaArea["papel"]) => {
    const i = cfg.perguntas.findIndex((q) => q.papel === papel);
    return i >= 0 ? cfg.perguntas[i].opcoes[respostas[i]] : undefined;
  };

  return {
    total,
    max,
    nivel,
    barrado: nivel !== naFaixa,
    dims,
    forte,
    fraca,
    alerta,
    dificuldade: escolha("dificuldade"),
    objetivo: escolha("objetivo"),
  };
}

/** Embaralha a ordem de exibição das opções (sorteada no clique, não no render). */
export function sortearOrdens(cfg: DiagnosticoArea): number[][] {
  return cfg.perguntas.map((q) => {
    const a = q.opcoes.map((_, i) => i);
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  });
}

/* ------------------------------------------------------------------ *
 * Média de quem já fez (aba Painel)
 * ------------------------------------------------------------------ */

/** Abaixo disso a média não aparece: poucos dados e risco de expor alguém. */
export const MINIMO_PARA_MEDIA = 10;

export type MediasArea = { n: number; dims: Record<string, number> };

/** GET `?medias=<teste>` no Apps Script. null = sem média ainda ou erro. */
export async function buscarMedias(cfg: DiagnosticoArea): Promise<MediasArea | null> {
  if (!cfg.endpoint) return null;
  try {
    const r = await fetch(`${cfg.endpoint}?medias=${encodeURIComponent(cfg.teste)}`);
    const j = (await r.json()) as { ok?: boolean; n?: number; dims?: Record<string, number> };
    if (!j.ok || !j.dims || (j.n ?? 0) < MINIMO_PARA_MEDIA) return null;
    return { n: j.n ?? 0, dims: j.dims };
  } catch {
    return null;
  }
}

/* ------------------------------------------------------------------ *
 * Cadastro e planilha
 * ------------------------------------------------------------------ */

export const MENOS_DE_18 = "Menos de 18";

export const FAIXAS_ETARIAS = [
  MENOS_DE_18,
  "18 a 24",
  "25 a 34",
  "35 a 44",
  "45 a 54",
  "55 a 64",
  "65 ou mais",
];

export type LeadArea = {
  nome: string;
  email: string;
  whatsapp: string;
  profissao: string;
  faixa: string;
};

/** As chaves batem com as colunas do teste no `.gs`: chave diferente vira célula vazia. */
export function payloadPlanilhaArea(
  cfg: DiagnosticoArea,
  respostas: number[],
  res: ResultadoArea,
  lead: LeadArea,
): Record<string, string> {
  const pcts = Object.fromEntries(res.dims.map((d) => [`${d.key}_pct`, String(d.pct)]));
  return {
    teste: cfg.teste,
    nome: lead.nome,
    email: lead.email,
    whatsapp: lead.whatsapp,
    profissao: lead.profissao,
    faixa_etaria: lead.faixa,
    nivel: res.nivel.nome,
    pontos: String(res.total),
    ...pcts,
    dificuldade: res.dificuldade?.lab ?? "",
    objetivo: res.objetivo?.lab ?? "",
    alerta: res.alerta ? "sim" : "",
    respostas: cfg.perguntas
      .filter(pontua)
      .map((q) => {
        const i = cfg.perguntas.indexOf(q);
        return `${q.key}: ${q.opcoes[respostas[i]]?.pts ?? ""}`;
      })
      .join(" | "),
    consentimento: "sim",
    politica: POLITICA_VERSAO,
  };
}

/**
 * Manda pra planilha sem esperar resposta (o Apps Script não devolve CORS no
 * POST e a resposta vem opaca; mesmo motivo do Momento UGC).
 */
export function salvarNaPlanilhaArea(
  endpoint: string,
  payload: Record<string, string>,
): boolean {
  if (!endpoint) return false;
  const corpo = JSON.stringify(payload);
  try {
    if (typeof navigator !== "undefined" && navigator.sendBeacon) {
      const blob = new Blob([corpo], { type: "text/plain;charset=utf-8" });
      if (navigator.sendBeacon(endpoint, blob)) return true;
    }
  } catch {
    // cai no fetch abaixo
  }
  try {
    void fetch(endpoint, {
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
