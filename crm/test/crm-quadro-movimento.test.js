// O quadro quando duas pessoas mexem nele ao mesmo tempo, e o que sobra
// depois de recarregar a página.
//
// São as duas perguntas que o quadro precisa responder para servir a uma
// equipe em vez de a uma pessoa:
//
// 1. Se a Rita e a Lia arrastarem o mesmo cartão ao mesmo tempo, o que
//    acontece com o movimento de quem soltou primeiro? Sem trava, o segundo
//    pedido sobrescreve o primeiro em silêncio.
// 2. O cartão arrastado está no banco ou só na tela? A prova é pedir o quadro
//    de novo, como um F5 faria, e ver onde o cartão está.
//
// O dublê daqui guarda estado de propósito: um dublê que só devolve leitura
// não consegue responder nenhuma das duas.

import test from "node:test";
import assert from "node:assert/strict";

import conversas from "../api/painel-conversas.js";
import { gerarToken } from "../api/_painel.js";

const EMPRESA = "11111111-2222-3333-4444-555555555555";
const RITA = "22222222-3333-4444-5555-666666666666";

Object.assign(process.env, {
  SESSION_SECRET: "segredo-local-de-teste",
  SUPABASE_URL: "https://supabase.invalid",
  SUPABASE_SECRET_KEY: "chave-local-de-teste",
});

/** Os filtros `coluna=eq.valor` da URL, que é tudo que estes testes usam. */
function filtros(busca) {
  const pares = [];
  for (const [coluna, valor] of new URLSearchParams(busca)) {
    if (coluna.startsWith("select") || coluna.startsWith("order") || coluna === "limit") continue;
    if (String(valor).startsWith("eq.")) pares.push([coluna, String(valor).slice(3)]);
  }
  return pares;
}

function casa(linha, pares) {
  return pares.every(([coluna, valor]) => String(linha[coluna]) === valor);
}

/**
 * Banco dublado com memória: PATCH muda a linha guardada, e a leitura
 * seguinte enxerga a mudança. É o mínimo para medir sobrescrita.
 */
function mundoVivo(tabelas) {
  const dados = JSON.parse(JSON.stringify(tabelas));

  const falso = async (url, opcoes = {}) => {
    const u = new URL(String(url));
    const metodo = opcoes.method || "GET";
    if (u.host !== "supabase.invalid") throw new Error(`saiu do mundo dublado: ${u.host}`);

    if (u.pathname === "/rest/v1/atendentes" && /[?&]id=eq\./.test(u.search)) {
      return Response.json([{
        id: RITA, nome: "Rita", cliente_id: EMPRESA, papel: "atendente",
        ativo: true, disponivel: true, assuntos: ["suporte"], versao_sessao: 1,
        clientes: { ativo: true, modulos: {} },
      }]);
    }

    const tabela = u.pathname.replace("/rest/v1/", "");
    dados[tabela] = dados[tabela] || [];
    const pares = filtros(u.search);
    const objeto = String(opcoes.headers?.Accept || opcoes.headers?.accept || "")
      .includes("vnd.pgrst.object");

    let saida;
    if (metodo === "PATCH") {
      const corpo = JSON.parse(opcoes.body || "{}");
      saida = [];
      for (const linha of dados[tabela]) {
        if (!casa(linha, pares)) continue;
        Object.assign(linha, corpo);
        saida.push(linha);
      }
    } else if (metodo === "POST") {
      const corpo = JSON.parse(opcoes.body || "{}");
      const novas = (Array.isArray(corpo) ? corpo : [corpo])
        .map((l, i) => ({ id: `novo-${tabela}-${dados[tabela].length + i}`, ...l }));
      dados[tabela].push(...novas);
      saida = novas;
    } else {
      saida = dados[tabela].filter((l) => casa(l, pares));
    }

    if (objeto) {
      return saida.length ? Response.json(saida[0]) : new Response(null, { status: 204 });
    }
    return Response.json(saida);
  };

  return { dados, falso };
}

async function pedir(mundo, { metodo = "GET", query = {}, body, token }) {
  const req = { method: metodo, query, headers: { authorization: `Bearer ${token}` }, body };
  const res = {
    status(c) { this.code = c; return this; },
    json(b) { this.body = b; return this; },
  };
  const original = globalThis.fetch;
  globalThis.fetch = mundo.falso;
  try {
    await conversas(req, res);
  } finally {
    globalThis.fetch = original;
  }
  return res;
}

const token = () => gerarToken({ tipo: "atendente", atendente: RITA, cliente: EMPRESA });

/** Um funil com três colunas abertas e um cartão na primeira. */
function quadro() {
  const etapa = (id, nome, ordem) => ({
    id, cliente_id: EMPRESA, funil_id: "f1", nome, ordem, tipo: "aberta", limite_dias: null,
  });
  return mundoVivo({
    crm_funis: [{ id: "f1", cliente_id: EMPRESA, nome: "Vendas", padrao: true }],
    crm_etapas: [etapa("e1", "Novos", 1), etapa("e2", "Conversando", 2), etapa("e3", "Proposta", 3)],
    crm_negocios: [{
      id: "n1", cliente_id: EMPRESA, funil_id: "f1", etapa_id: "e1", titulo: "Marina Alves",
      situacao: "aberto", posicao: 1000, valor: 189.9, etapa_desde: "2026-11-20T10:00:00.000Z",
      criado_em: "2026-11-20T10:00:00.000Z", etiquetas: [],
    }],
    crm_historico: [],
    crm_automacoes: [],
  });
}

const arrastar = (mundo, { de, para }) => pedir(mundo, {
  metodo: "POST",
  query: { rota: "crm", cliente: EMPRESA },
  token: token(),
  body: { acao: "mover-negocio", dados: { id: "n1", etapa_id: para, de_etapa_id: de, posicao: 1000 } },
});

// --------------------------------------------------------------------------

test("dois arrastos ao mesmo tempo: um vale, o outro é recusado", async () => {
  const m = quadro();
  // As duas pessoas pegaram o cartão na mesma coluna, e soltam juntas em
  // colunas diferentes. Sem `de_etapa_id` as duas passariam e a segunda
  // apagaria a primeira sem ninguém saber.
  const [a, b] = await Promise.all([
    arrastar(m, { de: "e1", para: "e2" }),
    arrastar(m, { de: "e1", para: "e3" }),
  ]);

  const respostas = [a, b];
  const venceu = respostas.filter((r) => r.code === 200);
  const recusado = respostas.filter((r) => r.code !== 200);
  assert.equal(venceu.length, 1, "exatamente um arrasto pode valer");
  assert.equal(recusado.length, 1);
  assert.match(recusado[0].body.error, /já foi movido por outra pessoa/);

  // E o cartão está numa coluna só, a de quem venceu.
  const cartao = m.dados.crm_negocios.find((n) => n.id === "n1");
  assert.equal(cartao.etapa_id, venceu[0].body.negocio.etapa_id);
  assert.ok(["e2", "e3"].includes(cartao.etapa_id));
});

test("quem moveu primeiro não perde o movimento para quem chegou depois", async () => {
  const m = quadro();
  const primeiro = await arrastar(m, { de: "e1", para: "e2" });
  assert.equal(primeiro.code, 200);

  // A segunda pessoa ainda via o cartão em "Novos" na tela dela.
  const atrasado = await arrastar(m, { de: "e1", para: "e3" });
  assert.notEqual(atrasado.code, 200);
  assert.equal(m.dados.crm_negocios[0].etapa_id, "e2");
});

test("sem dizer de onde veio, o arrasto ainda funciona", async () => {
  // A trava é opcional de propósito: o painel antigo em cache, uma automação
  // ou o próprio servidor movendo um cartão não mandam `de_etapa_id`, e isso
  // não pode virar erro.
  const m = quadro();
  const res = await pedir(m, {
    metodo: "POST",
    query: { rota: "crm", cliente: EMPRESA },
    token: token(),
    body: { acao: "mover-negocio", dados: { id: "n1", etapa_id: "e3", posicao: 1000 } },
  });
  assert.equal(res.code, 200);
  assert.equal(m.dados.crm_negocios[0].etapa_id, "e3");
});

test("o cartão movido continua na coluna nova depois de recarregar", async () => {
  const m = quadro();
  await arrastar(m, { de: "e1", para: "e2" });

  // O F5: o quadro pede tudo de novo, sem nada em memória do navegador.
  const recarregado = await pedir(m, { query: { rota: "crm", cliente: EMPRESA }, token: token() });
  assert.equal(recarregado.code, 200);
  const cartao = recarregado.body.negocios.find((n) => n.id === "n1");
  assert.equal(cartao.etapa_id, "e2");
  assert.equal(cartao.situacao, "aberto");
  // E a mudança ficou registrada no histórico, não só na linha do negócio.
  const mudancas = m.dados.crm_historico.filter((h) => h.tipo === "etapa");
  assert.equal(mudancas.length, 1);
  assert.deepEqual(
    { de: mudancas[0].detalhe.de, para: mudancas[0].detalhe.para },
    { de: "e1", para: "e2" },
  );
});
