/**
 * Diagnóstico de IA — "Em que ponto você está com a IA?" (`/diagnostico/ia`).
 *
 * Pedido do usuário em 18/10/2026: um teste por área dentro do submenu
 * Diagnóstico. As perguntas saem do PPC do curso Inteligência Artificial do
 * Zero à Prática (`lib/PPC/PPC - IA Para Iniciantes.md`): a avaliação
 * diagnóstica do Módulo 1, o semáforo da IA, a caça à alucinação, o Método
 * RECEITA e o Módulo 7 (automação).
 *
 * Antes do resultado o teste pede nome, e-mail, WhatsApp, profissão e faixa
 * etária (pedido de 18/10/2026) e grava tudo, com o resultado, na planilha
 * "Leads Diagnóstico de IA" via Apps Script (`SHEET_ENDPOINT_DIAGNOSTICO_IA`).
 * Quem marca "Menos de 18" vê o resultado, mas nada é gravado (LGPD, art. 14).
 * O resultado indica o curso de IA da Escola e o WhatsApp de atendimento.
 */

import { SHEET_ENDPOINT_DIAGNOSTICO_IA } from "@/lib/site";

export type DimensaoIA = "uso" | "pedido" | "critico";

export type OpcaoIA = { lab: string; pts: number };

export type PerguntaIA = {
  key: string;
  dim: DimensaoIA;
  tema: string;
  titulo: string;
  dica?: string;
  opcoes: OpcaoIA[];
};

export const DIMENSOES: Record<DimensaoIA, { nome: string; d: string }> = {
  uso: {
    nome: "Uso no dia a dia",
    d: "O quanto a IA já faz parte da sua rotina e das suas ferramentas.",
  },
  pedido: {
    nome: "Como você pede",
    d: "Se você dá contexto, ajusta a resposta e guarda o que funcionou.",
  },
  critico: {
    nome: "Senso crítico",
    d: "Se você confere o que a IA diz e protege os seus dados e os dos outros.",
  },
};

export const PERGUNTAS_IA: PerguntaIA[] = [
  {
    key: "frequencia",
    dim: "uso",
    tema: "Uso",
    titulo:
      "Com que frequência você usa ChatGPT, Gemini, Claude, Copilot ou a Meta AI?",
    opcoes: [
      { lab: "Nunca usei", pts: 0 },
      { lab: "Uma ou duas vezes, pra testar", pts: 1 },
      { lab: "Às vezes, quando lembro", pts: 2 },
      { lab: "Toda semana ou todo dia", pts: 3 },
    ],
  },
  {
    key: "para_que",
    dim: "uso",
    tema: "Uso",
    titulo: "Pra que você mais usa a IA hoje?",
    opcoes: [
      { lab: "Ainda não uso", pts: 0 },
      { lab: "Pra tirar dúvidas, como se fosse o Google", pts: 1 },
      { lab: "Pra escrever, resumir ou revisar textos", pts: 2 },
      {
        lab: "Pra várias tarefas do trabalho: textos, ideias, planilhas, imagens, atendimento",
        pts: 3,
      },
    ],
  },
  {
    key: "celular",
    dim: "uso",
    tema: "Uso",
    titulo:
      "Como você se sai com o celular em tarefas como baixar um app ou anexar um arquivo?",
    opcoes: [
      { lab: "Tenho bastante dificuldade", pts: 0 },
      { lab: "Consigo, com ajuda", pts: 1 },
      { lab: "Consigo sozinho, sem muito problema", pts: 2 },
      { lab: "Faço com facilidade e ajudo os outros", pts: 3 },
    ],
  },
  {
    key: "como_pede",
    dim: "pedido",
    tema: "Como você pede",
    titulo: "Quando você pede algo pra IA, como costuma escrever?",
    dica: "Pense na última vez que usou. Se nunca usou, escolha a primeira.",
    opcoes: [
      { lab: "Nunca pedi nada / não sei como pedir", pts: 0 },
      { lab: "Poucas palavras, como numa busca: “receita frango”", pts: 1 },
      {
        lab: "Uma frase dizendo o que quero: “faz um post pra minha loja”",
        pts: 2,
      },
      {
        lab: "Explico quem sou, a situação, o que quero, o formato e o tamanho da resposta",
        pts: 3,
      },
    ],
  },
  {
    key: "ajuste",
    dim: "pedido",
    tema: "Como você pede",
    titulo: "A primeira resposta não ficou boa. O que você faz?",
    opcoes: [
      { lab: "Desisto: a IA não serve pra isso", pts: 0 },
      { lab: "Abro outra conversa e pergunto de novo", pts: 1 },
      { lab: "Escrevo “melhore” ou “tenta de novo”", pts: 1 },
      {
        lab: "Digo exatamente o que mudar: mais curto, outro tom, tirar uma parte",
        pts: 3,
      },
    ],
  },
  {
    key: "biblioteca",
    dim: "pedido",
    tema: "Como você pede",
    titulo: "E os pedidos que deram certo, você guarda?",
    opcoes: [
      { lab: "Nunca pensei nisso", pts: 0 },
      { lab: "Ficam perdidos no histórico", pts: 1 },
      { lab: "Salvo alguns no bloco de notas", pts: 2 },
      {
        lab: "Tenho modelos organizados, com lacunas pra trocar e reaproveitar",
        pts: 3,
      },
    ],
  },
  {
    key: "confianca",
    dim: "critico",
    tema: "Senso crítico",
    titulo:
      "Verdadeiro ou falso: “Se a IA respondeu com segurança, a informação está correta.”",
    opcoes: [
      { lab: "Verdadeiro", pts: 0 },
      { lab: "Não sei", pts: 0 },
      { lab: "Depende do assunto", pts: 1 },
      {
        lab: "Falso: ela pode inventar com toda a confiança, então confiro fatos, números e fontes",
        pts: 3,
      },
    ],
  },
  {
    key: "fonte",
    dim: "critico",
    tema: "Senso crítico",
    titulo:
      "A IA citou um livro, uma lei ou uma estatística. O que você faz antes de usar?",
    opcoes: [
      { lab: "Uso direto: se ela citou, deve estar certo", pts: 0 },
      { lab: "Pergunto pra própria IA se ela tem certeza", pts: 1 },
      {
        lab: "Procuro na fonte original e confiro se ela diz mesmo aquilo",
        pts: 3,
      },
    ],
  },
  {
    key: "dados",
    dim: "critico",
    tema: "Senso crítico",
    titulo:
      "Você colaria a lista de clientes da sua empresa, com nome e telefone, numa IA gratuita?",
    opcoes: [
      { lab: "Sim, pra ganhar tempo", pts: 0 },
      { lab: "Não sei se pode", pts: 1 },
      {
        lab: "Não: tiro ou troco os dados pessoais antes de colar qualquer coisa",
        pts: 3,
      },
    ],
  },
  {
    key: "automacao",
    dim: "uso",
    tema: "Automação",
    titulo:
      "Você já fez a IA trabalhar junto com outras ferramentas, como um assistente com instruções fixas ou um formulário que cai numa planilha?",
    opcoes: [
      { lab: "Não sei o que é isso", pts: 0 },
      { lab: "Já ouvi falar, mas nunca fiz", pts: 1 },
      { lab: "Já testei uma vez", pts: 2 },
      { lab: "Uso no meu dia a dia", pts: 3 },
    ],
  },
];

export type NivelIA = {
  id: string;
  nome: string;
  min: number;
  frase: string;
  descricao: string;
  passos: string[];
  /** Módulos do curso que mais ajudam neste nível. */
  modulos: string;
};

/** Faixas sobre a soma de 0 a 30 pontos. */
export const NIVEIS: NivelIA[] = [
  {
    id: "primeiro",
    nome: "Primeiro contato",
    min: 0,
    frase: "A IA ainda é território novo pra você. E tudo bem: é por aqui que todo mundo começa.",
    descricao:
      "Você usou pouco ou nunca usou assistentes de IA. A boa notícia é que o ganho real vem de tarefas simples do dia a dia, e isso se aprende em horas, não em meses.",
    passos: [
      "Instale um assistente no celular (ChatGPT, Gemini, Claude ou Copilot) e escolha só um pra começar.",
      "Faça a primeira conversa: diga sua profissão e peça 5 formas práticas de a IA te ajudar no dia a dia.",
      "Peça um ajuste na resposta (“mais curto”, “linguagem mais simples”) e veja como ela muda.",
    ],
    modulos:
      "Comece pelo Módulo 1 (Desvendando a IA) e pelo Módulo 2 (Dominando os assistentes).",
  },
  {
    id: "curioso",
    nome: "Curioso",
    min: 10,
    frase: "Você já testou, mas a IA ainda não virou ferramenta de trabalho.",
    descricao:
      "Você usa de vez em quando, com pedidos soltos, e às vezes a resposta sai genérica. O que falta é método: dar contexto, pedir ajustes específicos e saber em que tarefa a IA ajuda e em qual ela erra.",
    passos: [
      "Nos próximos pedidos, use os 3 Cs: contexto (quem você é), conteúdo (o que quer) e como (formato, tamanho e tom).",
      "Quando a resposta não servir, diga exatamente o que mudar em vez de escrever “melhore”.",
      "Antes de usar um fato, número ou lei que a IA citou, confira na fonte original.",
    ],
    modulos:
      "O Módulo 2 (conversar bem com a IA) e o Módulo 3 (Método RECEITA) fazem a maior diferença agora.",
  },
  {
    id: "dia_a_dia",
    nome: "Usuário do dia a dia",
    min: 18,
    frase: "A IA já está na sua rotina. Agora é hora de usar com método e ganhar tempo de verdade.",
    descricao:
      "Você usa com frequência e já sabe pedir. O próximo salto é transformar o que funciona em processo: modelos de prompt reaproveitáveis, um fluxo semanal de produtividade e a IA aplicada a conteúdo, vendas e atendimento.",
    passos: [
      "Transforme 3 pedidos que deram certo em modelos com lacunas e guarde num lugar que você abre em 2 toques.",
      "Escolha uma tarefa que você repete toda semana e monte o seu jeito fixo de fazê-la com IA.",
      "Meça com honestidade: quanto tempo a tarefa levava antes e quanto leva agora, contando a revisão.",
    ],
    modulos:
      "O Módulo 3 (biblioteca de prompts), o 4 (produtividade) e o 6 (negócios e marketing) são o seu foco.",
  },
  {
    id: "automatizar",
    nome: "Pronto pra automatizar",
    min: 25,
    frase: "Você usa a IA com método e senso crítico. O próximo passo é conectar ferramentas.",
    descricao:
      "Você dá contexto, ajusta, confere e protege dados. Pra você, o curso funciona mais como organização do que já faz e como porta de entrada pra assistentes personalizados e automações sem código.",
    passos: [
      "Crie um assistente personalizado com instruções fixas pra uma tarefa só (por exemplo, revisar seus posts).",
      "Desenhe no papel uma automação simples: o gatilho, os passos, os dados e quem confere o resultado.",
      "Teste com dados fictícios, incluindo um caso estranho, antes de usar com clientes de verdade.",
    ],
    modulos:
      "O Módulo 7 (automação e assistentes) e o Módulo 8 (projeto final) são onde você mais aproveita.",
  },
];

export type ResultadoIA = {
  total: number;
  max: number;
  nivel: NivelIA;
  dims: { dim: DimensaoIA; pct: number }[];
  /** Respondeu algo de risco em confiança, fontes ou dados pessoais. */
  alertaRisco: boolean;
};

/** respostas: índice da opção escolhida por pergunta, na ordem de PERGUNTAS_IA. */
export function calcularIA(respostas: number[]): ResultadoIA {
  const pts = PERGUNTAS_IA.map((q, i) => q.opcoes[respostas[i]]?.pts ?? 0);
  const total = pts.reduce((a, b) => a + b, 0);
  const max = PERGUNTAS_IA.length * 3;
  const nivel = [...NIVEIS].reverse().find((n) => total >= n.min) ?? NIVEIS[0];
  const dims = (Object.keys(DIMENSOES) as DimensaoIA[]).map((dim) => {
    const idx = PERGUNTAS_IA.map((q, i) => (q.dim === dim ? i : -1)).filter(
      (i) => i >= 0,
    );
    const soma = idx.reduce((a, i) => a + pts[i], 0);
    return { dim, pct: Math.round((soma / (idx.length * 3)) * 100) };
  });
  const alertaRisco = ["confianca", "fonte", "dados"].some((k) => {
    const i = PERGUNTAS_IA.findIndex((q) => q.key === k);
    return pts[i] === 0;
  });
  return { total, max, nivel, dims, alertaRisco };
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

export type LeadIA = {
  nome: string;
  email: string;
  whatsapp: string;
  profissao: string;
  faixa: string;
};

/** As chaves são exatamente as COLUNAS do `.gs`: chave diferente vira célula vazia. */
export function payloadPlanilhaIA(
  respostas: number[],
  res: ResultadoIA,
  lead: LeadIA,
) {
  const pct = (d: DimensaoIA) => String(res.dims.find((x) => x.dim === d)?.pct ?? "");
  return {
    nome: lead.nome,
    email: lead.email,
    whatsapp: lead.whatsapp,
    profissao: lead.profissao,
    faixa_etaria: lead.faixa,
    nivel: res.nivel.nome,
    pontos: String(res.total),
    uso_pct: pct("uso"),
    pedido_pct: pct("pedido"),
    critico_pct: pct("critico"),
    alerta_risco: res.alertaRisco ? "sim" : "",
    respostas: PERGUNTAS_IA.map(
      (q, i) => `${q.key}: ${q.opcoes[respostas[i]]?.lab ?? ""}`,
    ).join(" | "),
    consentimento: "sim",
  };
}

/**
 * Manda pra planilha sem esperar resposta (o Apps Script não devolve CORS e a
 * resposta vem opaca; mesmo motivo do Momento UGC). false = nada foi enviado.
 */
export function salvarNaPlanilhaIA(payload: ReturnType<typeof payloadPlanilhaIA>): boolean {
  if (!SHEET_ENDPOINT_DIAGNOSTICO_IA) return false;
  const corpo = JSON.stringify(payload);
  try {
    if (typeof navigator !== "undefined" && navigator.sendBeacon) {
      const blob = new Blob([corpo], { type: "text/plain;charset=utf-8" });
      if (navigator.sendBeacon(SHEET_ENDPOINT_DIAGNOSTICO_IA, blob)) return true;
    }
  } catch {
    // cai no fetch abaixo
  }
  try {
    void fetch(SHEET_ENDPOINT_DIAGNOSTICO_IA, {
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
