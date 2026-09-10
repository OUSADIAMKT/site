/**
 * Conteúdo detalhado por curso (PRD 9.2 — template de `/escola/[curso]`).
 *
 * Só o Destrave tem conteúdo validado hoje. Os demais herdam `null` em cada
 * bloco e a página renderiza o slot de pendência no lugar — nunca conteúdo
 * inventado.
 */

export type CursoConteudo = {
  ctaLabel: string;
  praQuem: { sim: string[]; nao: string[] } | null;
  modulosNota: string | null;
  modulos: { t: string; d: string }[] | null;
  formato: { label: string; valor: string; nota: string }[] | null;
  resultado: { emoji: string; t: string }[] | null;
  faq: { q: string; a: string }[] | null;
  fechamento: string | null;
};

const VAZIO: CursoConteudo = {
  ctaLabel: "Quero saber mais",
  praQuem: null,
  modulosNota: null,
  modulos: null,
  formato: null,
  resultado: null,
  faq: null,
  fechamento: null,
};

export const CONTEUDO: Record<string, CursoConteudo> = {
  destrave: {
    ctaLabel: "Quero destravar",
    praQuem: {
      sim: [
        "Pra quem tem conhecimento de sobra, mas morre de vergonha de aparecer.",
        "Pra quem grava, assiste, odeia e apaga, em loop.",
        "Pra quem já tentou “se jogar” e travou do mesmo jeito (porque motivação não é método).",
        "Pra quem sente que tá “atrasado(a)” e quer recuperar o tempo com técnica, não com sorte.",
      ],
      nao: [
        "Não é pra quem quer continuar esperando “se sentir pronto(a)”. Esse dia não vem; quem vem é o método.",
      ],
    },
    modulosNota:
      "Validar títulos e conteúdo com o time. A estrutura abaixo é proposta.",
    modulos: [
      {
        t: "Módulo 1: Por que você trava (e por que não é frescura)",
        d: "O mecanismo da vergonha de aparecer, autoimagem × autocrítica, por que “se joga” não funciona.",
      },
      {
        t: "Módulo 2: Técnica de câmera (corpo, voz e olhar)",
        d: "Postura, respiração, ritmo de fala, olhar pra lente, naturalidade treinável.",
      },
      {
        t: "Módulo 3: Roteiro que destrava (gancho, fala, CTA)",
        d: "Estrutura de fala curta, decoreba zero, bullet points que soltam a língua.",
      },
      {
        t: "Módulo 4: Gravação assistida na prática",
        d: "Exercícios progressivos de exposição, feedback guiado, repetição com técnica.",
      },
      {
        t: "Módulo 5: Seu primeiro vídeo publicado",
        d: "Projeto final: vídeo real, publicado, com feedback do time. Você não conclui o curso; você estreia.",
      },
    ],
    formato: [
      { label: "Duração", valor: "{{X encontros}}", nota: "{{carga horária total}}" },
      {
        label: "Modalidade",
        valor: "{{Presencial/Online}}",
        nota: "{{cidade / plataforma}}",
      },
      {
        label: "Turma",
        valor: "{{N vagas}}",
        nota: "acompanhamento próximo, sem plateia anônima",
      },
    ],
    resultado: [
      {
        emoji: "🎥",
        t: "Seu primeiro vídeo gravado, editado e publicado, não “quase pronto”.",
      },
      {
        emoji: "🗣️",
        t: "Técnica de fala e presença que você repete sozinho(a), sem depender de coragem do dia.",
      },
      { emoji: "🧭", t: "Roteiro-base pros próximos 10 vídeos." },
      { emoji: "🔁", t: "O loop “grava-odeia-apaga” quebrado com método." },
    ],
    faq: [
      {
        q: "Eu sou MUITO tímido(a). Isso funciona mesmo?",
        a: "Principalmente pra você. O Destrave foi desenhado pra quem trava, não pra quem já é desenvolto e quer polir. Os exercícios são progressivos: ninguém é jogado no fundo da piscina no primeiro dia.",
      },
      {
        q: "Preciso de equipamento?",
        a: "Seu celular resolve. Técnica vem antes de equipamento, e a gente prova isso na primeira aula.",
      },
      {
        q: "E se eu não destravar?",
        a: "Você tem 7 dias de garantia incondicional. E dentro do curso, o acompanhamento é próximo: turma pequena, feedback individual, exercício assistido. Não existe “assistiu e ficou pra trás”.",
      },
      {
        q: "Quanto custa e como pago?",
        a: "Chama no WhatsApp que a gente te passa o valor da turma atual e as formas de pagamento.",
      },
    ],
    fechamento: "Seu primeiro vídeo tá a um método de distância.",
  },
};

export function getConteudo(slug: string): CursoConteudo {
  return CONTEUDO[slug] ?? VAZIO;
}
