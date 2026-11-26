// REPORT · a análise em texto que acompanha o relatório do cliente.
//
// Pelo MCP quem escreve é o próprio Claude da conversa (sem custo aqui).
// Pelo painel, o botão "Gerar com análise" chama esta função.

import Anthropic from "@anthropic-ai/sdk";

const MODELO = () => process.env.REPORT_MODELO || "claude-opus-5";

const INSTRUCOES = `Você escreve a análise de um relatório mensal de marketing digital que uma agência envia ao cliente dela.

Regras:
- Português do Brasil, tom profissional e direto, para um dono de negócio que não é especialista.
- Use apenas os números que vierem nos dados. Nunca invente valor, meta ou benchmark.
- Variações vêm prontas em "variacao" (percentual contra o período anterior). null significa que não dá para comparar: não comente.
- Custo por resultado subir é piora; CTR, leads, conversas e seguidores subirem é melhora.
- Estrutura: um parágrafo de visão geral; depois 3 a 5 tópicos curtos começando com "- " sobre o que mais mudou; por fim um parágrafo "Próximos passos" com 2 ou 3 recomendações práticas ligadas aos números.
- No máximo 250 palavras. Sem títulos com #, sem negrito, sem emojis.
- Nunca use travessão (— ou –). Use vírgula, ponto ou dois-pontos.
- Valores em reais no formato R$ 1.234,56.`;

export async function escreverAnalise(dados) {
  const client = new Anthropic({ timeout: 45_000, maxRetries: 1 });

  // O retrato vai enxuto: série diária e listas longas só pesam no custo.
  const essencial = {
    cliente: dados.cliente?.nome,
    periodo: dados.periodo,
    comparado_com: dados.comparado_com,
    plataformas: dados.plataformas,
    melhores_anuncios: (dados.anuncios || []).slice(0, 5),
    melhores_posts: (dados.posts || []).slice(0, 5).map(({ legenda, ...p }) => ({
      ...p, legenda: legenda?.slice(0, 120) || null,
    })),
  };

  const resposta = await client.beta.messages.create({
    model: MODELO(),
    max_tokens: 16000,
    output_config: { effort: "medium" },
    // Se o modelo recusar por engano, a própria API refaz no modelo reserva.
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    system: INSTRUCOES,
    messages: [{ role: "user", content: `Dados do relatório:\n${JSON.stringify(essencial)}` }],
  });

  if (resposta.stop_reason === "refusal") {
    throw new Error("A IA não escreveu a análise deste relatório. Gere sem análise ou escreva à mão.");
  }
  return resposta.content.filter((b) => b.type === "text").map((b) => b.text).join("\n").trim()
    // cinto e suspensório: a regra de estilo da agência não aceita travessão
    .replace(/\s*[—–]\s*/g, ", ");
}
