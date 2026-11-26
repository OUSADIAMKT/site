// Ver a mídia no histórico: de onde vêm os bytes, e quem pode pedi-los.
//
// A pergunta que este arquivo responde é a do briefing: a mídia continua
// visível depois de a URL temporária vencer? Sim, porque o painel nunca recebe
// URL: ele pede ao servidor, que lê do cofre e repassa. E o cofre não apaga em
// 30 dias como a Meta.
//
// Tudo dublado: nem cofre, nem Meta, nem banco de verdade.

import test from "node:test";
import assert from "node:assert/strict";

import conversas from "../api/painel-conversas.js";
import { gerarToken } from "../api/_painel.js";

const CLIENTE = "11111111-2222-3333-4444-555555555555";
const OUTRO_CLIENTE = "99999999-8888-7777-6666-555555555555";
const MENSAGEM = "cccccccc-dddd-eeee-ffff-000000000000";
const CHAVE = `wa/${CLIENTE}/2026/03/entrada/${"a".repeat(32)}.jpg`;

const BYTES = Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), Buffer.alloc(900, 3)]);

// A rede fica fechada deste ponto em diante, e para sempre neste arquivo.
//
// Não é zelo: o arquivamento de longo prazo roda solto (waitUntil), e por isso
// pode terminar DEPOIS do teste que o disparou. Devolver o fetch de verdade ao
// fim de cada teste fazia essa promessa atrasada sair pela rede e bater na Meta
// com um token inventado. Um teste que alcança serviço de verdade é um teste
// que um dia manda mensagem de verdade.
let mundoAtual = null;
globalThis.fetch = (...argumentos) => (mundoAtual
  ? mundoAtual.falso(...argumentos)
  : Promise.reject(new Error("este teste tentou usar a rede de verdade")));

function ambiente() {
  Object.assign(process.env, {
    SESSION_SECRET: "segredo-local-de-teste",
    SUPABASE_URL: "https://supabase.invalid",
    SUPABASE_SECRET_KEY: "chave-local-de-teste",
    R2_ACCOUNT_ID: "contadeteste",
    R2_BUCKET: "ousadia-midias",
    R2_ACCESS_KEY_ID: "CHAVEDETESTE",
    R2_SECRET_ACCESS_KEY: "segredo-de-teste-que-nao-abre-nada",
  });
}

function mundo({ mensagem = {}, noCofre = BYTES, cofreVazio = false } = {}) {
  const saiu = [];
  const msg = {
    id: MENSAGEM, midia_id: "midia-na-meta", midia_url: null, tipo: "image",
    direcao: "entrada", conversas: { cliente_id: CLIENTE, canal: "whatsapp" },
    ...mensagem,
  };

  const falso = async (url, opcoes = {}) => {
    const u = new URL(String(url));
    const metodo = opcoes.method || "GET";
    saiu.push({ host: u.host, caminho: u.pathname, metodo });

    if (u.host === "supabase.invalid") {
      if (u.pathname === "/rest/v1/atendentes") {
        return Response.json([{
          id: "a", nome: "Quem atende", cliente_id: CLIENTE, papel: "atendente",
          ativo: true, versao_sessao: 1, clientes: { ativo: true, modulos: {} },
        }]);
      }
      if (u.pathname === "/rest/v1/mensagens") {
        return metodo === "GET" ? Response.json([msg]) : Response.json([{ id: MENSAGEM }]);
      }
      if (u.pathname === "/rest/v1/clientes") {
        return Response.json([{
          id: CLIENTE, nome: "Cliente", slug: "teste",
          wa_phone_number_id: "numero", wa_token: "token-de-teste",
        }]);
      }
      return Response.json([]);
    }

    if (u.host === "graph.facebook.com") {
      // Troca do id pela URL, e depois o download.
      if (u.pathname.endsWith("/midia-na-meta")) {
        return Response.json({
          url: "https://lookaside.invalid/arquivo", mime_type: "image/jpeg",
          file_size: BYTES.length,
        });
      }
      return new Response(BYTES, { headers: { "content-type": "image/jpeg" } });
    }
    if (u.host === "lookaside.invalid") {
      return new Response(BYTES, {
        headers: { "content-type": "image/jpeg", "content-length": String(BYTES.length) },
      });
    }

    if (u.host === "contadeteste.r2.cloudflarestorage.com") {
      if (cofreVazio && metodo === "GET") return new Response("", { status: 404 });
      if (metodo === "GET") {
        return new Response(noCofre, {
          headers: { "content-type": "image/jpeg", "content-length": String(noCofre.length) },
        });
      }
      return new Response("", { status: 200 });
    }

    throw new Error(`fora do mundo dublado: ${u.host}`);
  };

  return { saiu, falso };
}

/** Uma resposta de Node o bastante para receber um fluxo. */
function resposta() {
  const pedacos = [];
  return {
    cabecalhos: {},
    pedacos,
    status(c) { this.code = c; return this; },
    json(b) { this.body = b; return this; },
    send(b) { this.body = b; return this; },
    setHeader(n, v) { this.cabecalhos[n] = v; },
    removeHeader(n) { delete this.cabecalhos[n]; },
    write(p) { pedacos.push(Buffer.from(p)); return true; },
    once() { return this; },
    end() { this.terminou = true; return this; },
    get corpo() { return Buffer.concat(pedacos); },
  };
}

async function pedirMidia(m, { mensagem = MENSAGEM, cliente, esperar = 0 } = {}) {
  mundoAtual = m;
  const res = resposta();
  await conversas({
    method: "GET",
    headers: { authorization: `Bearer ${gerarToken({ tipo: "operador" })}` },
    query: { rota: "midia", mensagem, cliente },
  }, res);
  // O arquivamento vai solto e termina depois da resposta. Quem quiser afirmar
  // algo sobre ele espera aqui.
  if (esperar) await new Promise((pronto) => setTimeout(pronto, esperar));
  return res;
}

// ---------------------------------------------------------------------------

test("tendo cópia no cofre, é dela que vêm os bytes", async () => {
  ambiente();
  const m = mundo({ mensagem: { midia_url: `r2:${CHAVE}` } });
  const res = await pedirMidia(m);

  assert.equal(res.code, 200);
  assert.deepEqual(res.corpo, BYTES);
  assert.equal(res.cabecalhos["Content-Type"], "image/jpeg");
  assert.match(res.cabecalhos["Cache-Control"], /private/,
    "mídia de atendimento não pode ficar em cache compartilhado");

  const cofre = m.saiu.filter((c) => c.host === "contadeteste.r2.cloudflarestorage.com");
  assert.equal(cofre.length, 1);
  assert.equal(cofre[0].caminho, `/ousadia-midias/${CHAVE}`);
  assert.equal(m.saiu.filter((c) => c.host === "graph.facebook.com").length, 0,
    "com cópia no cofre, não se pergunta nada à Meta");
});

test("sem cópia, busca na Meta e aproveita para guardar", async () => {
  ambiente();
  const m = mundo();
  const res = await pedirMidia(m, { esperar: 150 });

  assert.equal(res.code, 200);
  assert.deepEqual(res.corpo, BYTES);
  assert.ok(m.saiu.some((c) => c.host === "graph.facebook.com"), "buscou na Meta");

  const guardou = m.saiu.filter((c) =>
    c.host === "contadeteste.r2.cloudflarestorage.com" && c.metodo === "PUT");
  assert.equal(guardou.length, 1, "não guardou a cópia de longo prazo");
  assert.match(guardou[0].caminho, new RegExp(`^/ousadia-midias/wa/${CLIENTE}/\\d{4}/\\d{2}/entrada/`));
});

test("a chave do cofre nunca vem da URL do pedido", async () => {
  ambiente();
  // Mesmo mandando uma chave de outra empresa no lugar do id da mensagem, o
  // servidor só olha o que está gravado na mensagem.
  const m = mundo();
  const res = await pedirMidia(m, {
    mensagem: `wa/${OUTRO_CLIENTE}/2026/01/entrada/x.jpg`, esperar: 150 });
  // A consulta é por id de mensagem: um nome de objeto não é id de mensagem.
  assert.ok(res.code === 200 || res.code === 404, `resposta inesperada: ${res.code}`);
  const lidos = m.saiu.filter((c) => c.host === "contadeteste.r2.cloudflarestorage.com");
  for (const leitura of lidos) {
    assert.ok(!leitura.caminho.includes(OUTRO_CLIENTE),
      "leu um objeto cujo nome veio do pedido");
  }
});

test("mensagem de outro cliente não abre", async () => {
  ambiente();
  const m = mundo({
    mensagem: {
      midia_url: `r2:${CHAVE}`,
      conversas: { cliente_id: OUTRO_CLIENTE, canal: "whatsapp" },
    },
  });
  // Sessão de operador pedindo explicitamente outro cliente: a permissão é
  // conferida contra o cliente da conversa, não contra o que o pedido diz.
  mundoAtual = m;
  const res = resposta();
  await conversas({
    method: "GET",
    headers: { authorization: `Bearer ${gerarToken({ tipo: "atendente", atendente: "a", cliente: CLIENTE })}` },
    query: { rota: "midia", mensagem: MENSAGEM },
  }, res);
  assert.equal(res.code, 404);
  assert.equal(m.saiu.filter((c) => c.host === "contadeteste.r2.cloudflarestorage.com").length, 0);
});

test("cópia que sumiu do cofre volta a ser buscada na Meta", async () => {
  ambiente();
  // Acontece se alguém apagar o objeto, ou se uma regra de ciclo de vida
  // alcançar o arquivo. Enquanto a Meta tiver, o painel ainda mostra.
  const m = mundo({ mensagem: { midia_url: `r2:${CHAVE}` }, cofreVazio: true });
  const res = await pedirMidia(m);
  assert.equal(res.code, 200);
  assert.deepEqual(res.corpo, BYTES);
  assert.ok(m.saiu.some((c) => c.host === "graph.facebook.com"));
});

test("sem cópia e sem id da Meta, a resposta é clara em vez de vazia", async () => {
  ambiente();
  const m = mundo({ mensagem: { midia_id: null, midia_url: `r2:${CHAVE}` }, cofreVazio: true });
  const res = await pedirMidia(m);
  assert.equal(res.code, 410);
  assert.match(res.body.error, /não está mais disponível/i);
});

test("mensagem sem mídia nenhuma dá 404", async () => {
  ambiente();
  const m = mundo({ mensagem: { midia_id: null, midia_url: null } });
  const res = await pedirMidia(m);
  assert.equal(res.code, 404);
});
