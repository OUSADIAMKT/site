// REPORT · servidor MCP. Deixa o Claude consultar os números dos clientes
// da agência e gerenciar campanhas numa conversa comum.
//
// Transporte "Streamable HTTP" sem estado: cada POST é um JSON-RPC completo
// e a resposta volta em JSON, sem SSE. Autenticação por chave própria
// (REPORT_MCP_TOKEN), separada da senha do painel. As ferramentas que
// alteram campanha podem ser desligadas com REPORT_MCP_GESTAO=off.

import { db } from "./_db.js";
import * as meta from "./_meta.js";
import * as rp from "./_report.js";

const VERSOES = ["2025-06-18", "2025-03-26", "2024-11-05"];

const INSTRUCOES = `Relatórios e gestão de anúncios dos clientes da agência (Meta Ads e Instagram).
Comece por listar_clientes para achar o slug do cliente. Datas no formato AAAA-MM-DD; sem datas, vale os últimos 30 dias até ontem.
Alcance de período não é soma de dias: use o que as ferramentas devolvem.
Antes de alterar_status ou alterar_orcamento, mostre ao usuário o que vai mudar e peça confirmação. Toda alteração fica no histórico com o valor anterior.
Ao escrever análise para gerar_relatorio, não use travessão.`;

// ---------------------------------------------------------------
// Ferramentas
// ---------------------------------------------------------------

const periodo = {
  inicio: { type: "string", description: "Primeiro dia, AAAA-MM-DD. Padrão: 30 dias atrás." },
  fim: { type: "string", description: "Último dia, AAAA-MM-DD. Padrão: ontem." },
};
const cliente = { type: "string", description: "Slug, id ou nome do cliente da agência (veja listar_clientes)." };

const LEITURA = { readOnlyHint: true, openWorldHint: true };
const ESCRITA = { readOnlyHint: false, destructiveHint: true, idempotentHint: true, openWorldHint: true };

const FERRAMENTAS = [
  {
    name: "listar_clientes",
    description: "Clientes da agência e as contas conectadas a cada um (anúncios, Instagram, Facebook).",
    inputSchema: { type: "object", properties: {} },
    annotations: LEITURA,
  },
  {
    name: "listar_contas",
    description: "Todas as contas que o perfil conectado enxerga na Meta, com o cliente a que pertencem. Use sem_cliente=true para ver as que ainda não foram atribuídas.",
    inputSchema: {
      type: "object",
      properties: {
        sem_cliente: { type: "boolean" },
        plataforma: { type: "string", enum: ["meta_ads", "instagram", "facebook"] },
        busca: { type: "string", description: "Parte do nome da conta ou do BM." },
      },
    },
    annotations: LEITURA,
  },
  {
    name: "metricas_periodo",
    description: "Números de um cliente num período, por plataforma (gasto, impressões, cliques, CTR, CPC, CPM, leads, conversas, custo por resultado, ROAS, alcance, seguidores, interações), já comparados com o período anterior de mesmo tamanho. Inclui série diária, melhores anúncios e melhores posts.",
    inputSchema: { type: "object", properties: { cliente, ...periodo }, required: ["cliente"] },
    annotations: LEITURA,
  },
  {
    name: "comparar_periodos",
    description: "Compara dois períodos quaisquer de um cliente e devolve a variação percentual de cada métrica. Ex.: setembro contra setembro do ano passado.",
    inputSchema: {
      type: "object",
      properties: {
        cliente, ...periodo,
        comparar_inicio: { type: "string", description: "Início do período de comparação, AAAA-MM-DD." },
        comparar_fim: { type: "string", description: "Fim do período de comparação, AAAA-MM-DD." },
      },
      required: ["cliente", "inicio", "fim", "comparar_inicio", "comparar_fim"],
    },
    annotations: LEITURA,
  },
  {
    name: "top_anuncios",
    description: "Ranking dos anúncios de um cliente no período, somando todos os dias.",
    inputSchema: {
      type: "object",
      properties: {
        cliente, ...periodo,
        ordem: { type: "string", enum: ["gasto", "resultados", "ctr", "custo_por_resultado"], description: "custo_por_resultado põe o mais barato primeiro." },
        limite: { type: "integer", minimum: 1, maximum: 50 },
      },
      required: ["cliente"],
    },
    annotations: LEITURA,
  },
  {
    name: "top_posts",
    description: "Melhores publicações do Instagram de um cliente no período.",
    inputSchema: {
      type: "object",
      properties: {
        cliente, ...periodo,
        ordem: { type: "string", enum: ["alcance", "interacoes", "visualizacoes", "salvos", "compartilhamentos"] },
        limite: { type: "integer", minimum: 1, maximum: 50 },
      },
      required: ["cliente"],
    },
    annotations: LEITURA,
  },
  {
    name: "campanhas",
    description: "Estado ao vivo na Meta, com métricas do período: campanhas de uma conta, conjuntos de uma campanha ou anúncios de um conjunto. Traz id, status, status efetivo e orçamento em reais. Use antes de alterar qualquer coisa.",
    inputSchema: {
      type: "object",
      properties: {
        conta: { type: "string", description: "act_123..., nome da conta ou slug do cliente (usa a primeira conta de anúncio dele)." },
        nivel: { type: "string", enum: ["campanhas", "conjuntos", "anuncios"], description: "Padrão: campanhas." },
        pai_id: { type: "string", description: "Para conjuntos: id da campanha. Para anúncios: id do conjunto." },
        ...periodo,
      },
      required: ["conta"],
    },
    annotations: LEITURA,
  },
  {
    name: "historico_acoes",
    description: "Últimas alterações feitas em campanhas pelo REPORT (painel ou MCP), com o valor de antes e o de depois.",
    inputSchema: {
      type: "object",
      properties: {
        objeto_id: { type: "string" },
        limite: { type: "integer", minimum: 1, maximum: 200 },
      },
    },
    annotations: LEITURA,
  },
  {
    name: "alterar_status",
    description: "Pausa ou ativa uma campanha, conjunto ou anúncio na Meta. Não apaga nada. Confirme com o usuário antes.",
    inputSchema: {
      type: "object",
      properties: {
        tipo: { type: "string", enum: ["campanha", "conjunto", "anuncio"] },
        id: { type: "string", description: "Id do objeto na Meta (veja a ferramenta campanhas)." },
        status: { type: "string", enum: ["ACTIVE", "PAUSED"] },
      },
      required: ["tipo", "id", "status"],
    },
    annotations: ESCRITA,
    gestao: true,
  },
  {
    name: "alterar_orcamento",
    description: "Muda o orçamento diário ou total (em reais) de uma campanha ou conjunto. Aumentos acima de 3x são recusados, a menos que confirmar_aumento_grande seja true. Confirme com o usuário antes.",
    inputSchema: {
      type: "object",
      properties: {
        tipo: { type: "string", enum: ["campanha", "conjunto"] },
        id: { type: "string" },
        orcamento_diario: { type: "number", description: "Em reais. Ex.: 50 para R$ 50,00 por dia." },
        orcamento_total: { type: "number", description: "Em reais, para campanhas com orçamento total." },
        confirmar_aumento_grande: { type: "boolean" },
      },
      required: ["tipo", "id"],
    },
    annotations: ESCRITA,
    gestao: true,
  },
  {
    name: "gerar_relatorio",
    description: "Salva um relatório do período com a sua análise e devolve o link público para enviar ao cliente. Escreva a análise antes, a partir de metricas_periodo.",
    inputSchema: {
      type: "object",
      properties: {
        cliente, ...periodo,
        analise: { type: "string", description: "Texto da análise em português, sem travessão." },
      },
      required: ["cliente", "inicio", "fim"],
    },
    annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
  },
];

const gestaoLigada = () => (process.env.REPORT_MCP_GESTAO || "on").toLowerCase() !== "off";

function ferramentasVisiveis() {
  return FERRAMENTAS.filter((f) => !f.gestao || gestaoLigada()).map(({ gestao, ...f }) => f);
}

// ---------------------------------------------------------------
// Resolução de nomes
// ---------------------------------------------------------------

async function acharCliente(ref) {
  if (!ref) throw new Error("Informe o cliente.");
  const sb = db();
  const texto = String(ref).trim();
  const uuid = /^[0-9a-f-]{36}$/i.test(texto);
  // O texto entra num filtro do PostgREST: sem vírgula, parêntese ou curinga
  // ele não consegue virar outra condição.
  const limpo = texto.replace(/[%,()*:"\\]/g, "");
  const { data } = uuid
    ? await sb.from("report_clientes").select("id, nome, slug").eq("id", texto)
    : await sb.from("report_clientes").select("id, nome, slug").or(`slug.eq.${limpo.toLowerCase()},nome.ilike.%${limpo}%`);
  if (!data?.length) throw new Error(`Nenhum cliente encontrado para "${texto}". Use listar_clientes.`);
  if (data.length > 1) throw new Error(`Mais de um cliente bate com "${texto}": ${data.map((c) => c.slug).join(", ")}.`);
  return data[0];
}

async function acharConta(ref) {
  const sb = db();
  const texto = String(ref || "").trim();
  if (/^act_\d+$/.test(texto)) return texto;
  if (/^\d{6,}$/.test(texto)) return `act_${texto}`;

  const { data: porNome } = await sb.from("report_contas").select("id_externo, nome")
    .eq("plataforma", "meta_ads").ilike("nome", `%${texto.replace(/[%,()*:"\\]/g, "")}%`);
  if (porNome?.length === 1) return porNome[0].id_externo;
  if (porNome?.length > 1) throw new Error(`Mais de uma conta bate com "${texto}": ${porNome.map((c) => `${c.nome} (${c.id_externo})`).join("; ")}.`);

  const c = await acharCliente(texto).catch(() => null);
  if (c) {
    const { data } = await sb.from("report_contas").select("id_externo").eq("cliente_id", c.id).eq("plataforma", "meta_ads").limit(1);
    if (data?.[0]) return data[0].id_externo;
  }
  throw new Error(`Conta "${texto}" não encontrada. Use listar_contas.`);
}

function datas(args) {
  const ontem = rp.somarDias(rp.hojeNoFuso(), -1);
  const fim = args.fim || ontem;
  const inicio = args.inicio || rp.somarDias(fim, -29);
  for (const d of [inicio, fim]) if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) throw new Error(`Data inválida: ${d}. Use AAAA-MM-DD.`);
  if (inicio > fim) throw new Error("O início precisa ser antes do fim.");
  return { inicio, fim };
}

async function idsDasContas(clienteId) {
  const { data } = await db().from("report_contas").select("id").eq("cliente_id", clienteId);
  return (data || []).map((c) => c.id);
}

// ---------------------------------------------------------------
// Execução
// ---------------------------------------------------------------

async function executar(nome, args = {}, contexto) {
  switch (nome) {
    case "listar_clientes": {
      const { data: clientes } = await db().from("report_clientes").select("id, nome, slug, ativo").order("nome");
      const { data: contas } = await db().from("report_contas")
        .select("cliente_id, plataforma, id_externo, nome, ativo, ultima_coleta_em, ultimo_erro").not("cliente_id", "is", null);
      return (clientes || []).map((c) => ({ ...c, contas: (contas || []).filter((k) => k.cliente_id === c.id) }));
    }

    case "listar_contas": {
      let q = db().from("report_contas")
        .select("plataforma, id_externo, nome, bm_nome, status_externo, cliente_id, ativo, ultima_coleta_em").order("nome").limit(500);
      if (args.sem_cliente) q = q.is("cliente_id", null);
      if (args.plataforma) q = q.eq("plataforma", args.plataforma);
      if (args.busca) {
        const b = String(args.busca).replace(/[%,()*:"\\]/g, "");
        q = q.or(`nome.ilike.%${b}%,bm_nome.ilike.%${b}%`);
      }
      const { data } = await q;
      return data || [];
    }

    case "metricas_periodo": {
      const c = await acharCliente(args.cliente);
      const { inicio, fim } = datas(args);
      return rp.numerosDoCliente(c.id, inicio, fim);
    }

    case "comparar_periodos": {
      const c = await acharCliente(args.cliente);
      const { inicio, fim } = datas(args);
      const b = datas({ inicio: args.comparar_inicio, fim: args.comparar_fim });
      const r = await rp.numerosDoCliente(c.id, inicio, fim, { anterior: [b.inicio, b.fim] });
      return { cliente: r.cliente, periodo: r.periodo, comparado_com: r.comparado_com, plataformas: r.plataformas };
    }

    case "top_anuncios": {
      const c = await acharCliente(args.cliente);
      const { inicio, fim } = datas(args);
      return rp.topAnuncios(await idsDasContas(c.id), inicio, fim, { ordem: args.ordem, limite: args.limite || 10 });
    }

    case "top_posts": {
      const c = await acharCliente(args.cliente);
      const { inicio, fim } = datas(args);
      return rp.topPosts(await idsDasContas(c.id), inicio, fim, { ordem: args.ordem, limite: args.limite || 8 });
    }

    case "campanhas": {
      const token = await rp.tokenAtivo();
      const { inicio, fim } = datas(args);
      const nivel = args.nivel || "campanhas";
      if (nivel === "campanhas") return meta.listarCampanhas(token, await acharConta(args.conta), inicio, fim);
      if (!args.pai_id) throw new Error("Informe pai_id: o id da campanha (para conjuntos) ou do conjunto (para anúncios).");
      return nivel === "conjuntos"
        ? meta.listarConjuntos(token, args.pai_id, inicio, fim)
        : meta.listarAnuncios(token, args.pai_id, inicio, fim);
    }

    case "historico_acoes":
      return rp.historico({ objetoId: args.objeto_id, limite: args.limite || 30 });

    case "alterar_status":
      return rp.gerir({ tipo: args.tipo, id: args.id, mudanca: { status: args.status }, origem: "mcp" });

    case "alterar_orcamento": {
      const mudanca = {};
      if (args.orcamento_diario !== undefined) mudanca.orcamento_diario = args.orcamento_diario;
      if (args.orcamento_total !== undefined) mudanca.orcamento_total = args.orcamento_total;
      return rp.gerir({ tipo: args.tipo, id: args.id, mudanca, origem: "mcp", forcar: Boolean(args.confirmar_aumento_grande) });
    }

    case "gerar_relatorio": {
      const c = await acharCliente(args.cliente);
      const { inicio, fim } = datas(args);
      const r = await rp.gerarRelatorio({
        clienteId: c.id, inicio, fim,
        resumo: args.analise ? String(args.analise).replace(/\s*[—–]\s*/g, ", ") : null,
      });
      return { link: `${contexto.base}/r/${r.codigo}`, criado_em: r.criado_em };
    }

    default:
      throw new Error(`Ferramenta desconhecida: ${nome}`);
  }
}

// ---------------------------------------------------------------
// JSON-RPC
// ---------------------------------------------------------------

async function responder(msg, contexto) {
  const { id, method, params } = msg || {};
  const ok = (result) => ({ jsonrpc: "2.0", id, result });
  const falha = (code, message) => ({ jsonrpc: "2.0", id: id ?? null, error: { code, message } });

  if (!method) return falha(-32600, "Requisição inválida");
  if (id === undefined || id === null) return null;   // notificação: não tem resposta

  if (method === "initialize") {
    const pedida = params?.protocolVersion;
    return ok({
      protocolVersion: VERSOES.includes(pedida) ? pedida : VERSOES[0],
      capabilities: { tools: { listChanged: false } },
      serverInfo: { name: "ousadia-report", title: "REPORT da agência", version: "1.0.0" },
      instructions: INSTRUCOES,
    });
  }
  if (method === "ping") return ok({});
  if (method === "tools/list") return ok({ tools: ferramentasVisiveis() });

  if (method === "tools/call") {
    const nome = params?.name;
    const def = FERRAMENTAS.find((f) => f.name === nome);
    if (!def || (def.gestao && !gestaoLigada())) return falha(-32602, `Ferramenta indisponível: ${nome}`);
    try {
      const resultado = await executar(nome, params?.arguments || {}, contexto);
      return ok({ content: [{ type: "text", text: JSON.stringify(resultado, null, 1) }] });
    } catch (e) {
      // Erro de ferramenta volta como resultado, para o Claude ler e corrigir.
      return ok({ content: [{ type: "text", text: e.message }], isError: true });
    }
  }

  return falha(-32601, `Método não suportado: ${method}`);
}

export async function atenderMcp(req, res, contexto) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Este servidor MCP só aceita POST (sem SSE)." });
  }

  const corpo = req.body;
  const lote = Array.isArray(corpo) ? corpo : [corpo];
  const respostas = (await Promise.all(lote.map((m) => responder(m, contexto)))).filter(Boolean);

  if (!respostas.length) return res.status(202).end();
  return res.status(200).json(Array.isArray(corpo) ? respostas : respostas[0]);
}
