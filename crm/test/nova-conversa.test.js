// Começar uma conversa com quem nunca escreveu.
//
// Antes disto, `conversas` só nascia pelo webhook: a equipe não tinha como
// falar primeiro com ninguém. O que os testes aqui seguram:
//
// 1. A ordem. Conferir o WhatsApp ANTES de gravar. Ao contrário, um cliente
//    com o WhatsApp fora do ar acumula contato e conversa que não servem para
//    nada, e a atendente fica esperando resposta de mensagem que não saiu.
//
// 2. O nono dígito. O WhatsApp manda o DDD 93 sem o nono e a lista importada
//    tem o mesmo número com ele. Procurar por uma forma só abriria uma SEGUNDA
//    conversa com a mesma pessoa, e dois históricos da mesma pessoa é coisa
//    que ninguém junta depois.
//
// 3. O nome que já existia. `salvarContato` grava nulo no que vier vazio, e
//    quem abre conversa sem digitar nome não pode apagar o nome que a
//    importação trouxe.

import test from "node:test";
import assert from "node:assert/strict";

import { comecarConversa } from "../api/painel-fila.js";
import { gerarToken, sessao } from "../api/_painel.js";
import { db } from "../api/_db.js";

const OUSADIA = "896d41cf-164a-4608-bf16-35ec341e1950";

Object.assign(process.env, {
  SUPABASE_URL: "https://supabase.invalid",
  SUPABASE_SECRET_KEY: "chave-local-de-teste",
  SESSION_SECRET: process.env.SESSION_SECRET || "segredo-local-de-teste",
});

/** Resposta falsa: devolve o que o teste mandar para cada tabela. */
function postgrestDeMentira(tabelas) {
  const chamadas = [];
  globalThis.fetch = async (url, op = {}) => {
    const u = new URL(String(url));
    const tabela = u.pathname.replace("/rest/v1/", "");
    const metodo = op.method || "GET";
    chamadas.push({
      tabela, metodo, busca: u.search,
      corpo: op.body ? JSON.parse(op.body) : null,
    });
    const bruta = tabelas[`${tabela}:${metodo}`] ?? tabelas[tabela] ?? [];
    const resposta = typeof bruta === "function" ? bruta(chamadas) : bruta;

    // `single()` e `maybeSingle()` pedem objeto, não lista, pelo cabeçalho
    // Accept. Devolver lista para eles faz o cliente entregar um array onde o
    // código espera uma linha, e aí `data.id` é undefined sem erro nenhum:
    // foi isso que quebrou a primeira versão deste arquivo.
    // O supabase-js manda um `Headers`, não um objeto simples: ler
    // `op.headers.Accept` devolve undefined e o teste passa a servir lista
    // para quem pediu linha.
    const aceita = op.headers instanceof Headers
      ? op.headers.get("accept") || ""
      : String(op.headers?.Accept || op.headers?.accept || "");
    const pedeUm = aceita.includes("pgrst.object");
    if (pedeUm) {
      const um = Array.isArray(resposta) ? resposta[0] : resposta;
      if (!um) return new Response(null, { status: 406 });
      return Response.json(um);
    }
    return Response.json(resposta);
  };
  return chamadas;
}

const WA_LIGADO = {
  clientes: [{ id: OUSADIA, nome: "Ousadia", wa_phone_number_id: "123", wa_token: "t" }],
  canais: [],
};

async function rodar(corpo, tabelas) {
  const original = globalThis.fetch;
  const chamadas = postgrestDeMentira(tabelas);
  const req = {
    method: "POST",
    headers: { authorization: `Bearer ${gerarToken({ tipo: "operador" })}` },
    body: { acao: "nova_conversa", cliente_id: OUSADIA, ...corpo },
  };
  const resposta = {};
  const res = {
    status(codigo) { resposta.codigo = codigo; return this; },
    json(dados) { resposta.dados = dados; return this; },
  };
  try {
    const s = await sessao(req);
    await comecarConversa(req, res, { s, sb: db() });
  } finally {
    globalThis.fetch = original;
  }
  return { ...resposta, chamadas };
}

const gravou = (chamadas, tabela, metodo) =>
  chamadas.filter((c) => c.tabela === tabela && c.metodo === metodo);

/** Os corpos que o código mandou para aquela tabela, na ordem. */
const corpos = (chamadas, tabela, metodo) =>
  gravou(chamadas, tabela, metodo).map((c) => c.corpo);

// ---------------------------------------------------------------------------
// O que não passa

test("número que não é telefone brasileiro não cria nada", async () => {
  const r = await rodar({ telefone: "12345", nome: "Teste" }, WA_LIGADO);
  assert.equal(r.codigo, 400);
  assert.match(r.dados.error, /DDD/);
  assert.deepEqual(gravou(r.chamadas, "conversas", "POST"), []);
  assert.deepEqual(gravou(r.chamadas, "contatos", "POST"), []);
});

test("WhatsApp desconectado recusa antes de gravar contato ou conversa", async () => {
  const r = await rodar(
    { telefone: "93 99999-8888", nome: "Teste" },
    { clientes: [{ id: OUSADIA, nome: "Ousadia" }], canais: [] },
  );
  assert.equal(r.codigo, 409);
  assert.match(r.dados.error, /não está conectado/);
  assert.deepEqual(
    gravou(r.chamadas, "contatos", "POST"), [],
    "criar cadastro para descobrir depois que nada sai daqui é deixar lixo no Quadro"
  );
  assert.deepEqual(gravou(r.chamadas, "conversas", "POST"), []);
});

// ---------------------------------------------------------------------------
// O caminho normal

test("número novo vira contato, conversa e atendimento no nome de quem clicou", async () => {
  const r = await rodar({ telefone: "(93) 99999-8888", nome: "Dona Zezé" }, {
    ...WA_LIGADO,
    contatos: [],
    "contatos:POST": [{ id: "contato-1" }],
    conversas: [],
    "conversas:POST": [{ id: "conversa-1", cliente_id: OUSADIA, nome_contato: "Dona Zezé" }],
    // O PATCH do `atenderAgora` devolve a linha: é por ela que ele sabe que
    // pegou a conversa. Devolvendo vazio, ele responde `ja_estava` e não grava
    // passagem nenhuma, que foi o que aconteceu na primeira versão do teste.
    "conversas:PATCH": [{ id: "conversa-1", cliente_id: OUSADIA }],
    atendimentos: [],
  });

  assert.equal(r.codigo, 200);
  assert.equal(r.dados.conversa_id, "conversa-1");
  assert.equal(r.dados.ja_existia, false);
  assert.equal(r.dados.telefone, "+5593999998888");
  assert.equal(r.dados.janela, "fechada", "a tela precisa saber que texto livre não sai agora");

  const [contato] = corpos(r.chamadas, "contatos", "POST");
  assert.equal(contato.telefone_e164, "+5593999998888");
  assert.equal(contato.nome, "Dona Zezé");

  const [conversa] = corpos(r.chamadas, "conversas", "POST");
  assert.equal(
    conversa.contato, "5593999998888",
    "`conversas.contato` é o wa_id, só dígito: com o + o webhook abriria outra conversa"
  );
  assert.equal(conversa.telefone, "+5593999998888");

  // Entrou em atendimento humano, e a passagem tem dono (migração 042).
  const [passagem] = corpos(r.chamadas, "atendimentos", "POST");
  assert.equal(passagem.assumido_por, "operador");
  const estado = gravou(r.chamadas, "conversas", "PATCH").find((c) => c.corpo?.modo === "humano");
  assert.ok(estado, "sem atendimento humano a IA responderia por cima dela");
  assert.equal(estado.corpo.assumido_por, "operador");
});

test("o telefone sem o nono dígito acha a conversa gravada com ele", async () => {
  // O caso do DDD 93: o WhatsApp gravou 5593999998888 e ela digita o número
  // sem o nono. Tem que cair na mesma conversa.
  const r = await rodar({ telefone: "93 9999-8888" }, {
    ...WA_LIGADO,
    contatos: [{ nome: "Dona Zezé" }],
    "contatos:POST": [{ id: "contato-1" }],
    conversas: [{ id: "ja-existe", contato: "5593999998888", nome_contato: "Dona Zezé", modo: "ia" }],
    atendimentos: [],
  });

  assert.equal(r.codigo, 200);
  assert.equal(r.dados.conversa_id, "ja-existe");
  assert.equal(r.dados.ja_existia, true);
  assert.deepEqual(
    gravou(r.chamadas, "conversas", "POST"), [],
    "a conversa já existia: criar outra daria dois históricos da mesma pessoa"
  );

  // E a busca mandou as duas formas do número para o banco.
  const procura = r.chamadas.find((c) => c.tabela === "conversas" && c.metodo === "GET");
  assert.match(decodeURIComponent(procura.busca), /5593999998888/);
  assert.match(decodeURIComponent(procura.busca), /559399998888/);
});

test("abrir conversa sem digitar nome não apaga o nome que já estava no cadastro", async () => {
  const r = await rodar({ telefone: "93 99999-8888", nome: "" }, {
    ...WA_LIGADO,
    contatos: [{ nome: "Dona Zezé" }],
    "contatos:POST": [{ id: "contato-1" }],
    conversas: [],
    "conversas:POST": [{ id: "conversa-1", cliente_id: OUSADIA }],
    atendimentos: [],
  });

  assert.equal(r.codigo, 200);
  const [contato] = corpos(r.chamadas, "contatos", "POST");
  assert.equal(contato.nome, "Dona Zezé");
});

// ---------------------------------------------------------------------------
// O funil
//
// A entrada automática do CRM morava só no webhook, isto é, só valia para quem
// escrevia primeiro. Conversa começada pela equipe ficava fora do funil até a
// pessoa responder, e quem a equipe procurou não aparecia no Quadro Comercial.

/** Tabelas de um cliente com funil de entrada configurado. */
const COM_FUNIL = {
  ...WA_LIGADO,
  contatos: [],
  "contatos:POST": [{ id: "contato-1" }],
  // A primeira consulta é a procura pelas formas do número (não existe); a de
  // `salvarNegocio` busca a conversa pelo id e tem que achar.
  conversas: (chamadas) => {
    const atual = chamadas[chamadas.length - 1];
    if (decodeURIComponent(atual.busca).includes("contato=in.")) return [];
    return [{
      id: "conversa-1", cliente_id: OUSADIA, canal: "whatsapp",
      contato: "5593999998888", telefone: "+5593999998888", nome_contato: "Dona Zezé",
    }];
  },
  "conversas:POST": [{
    id: "conversa-1", cliente_id: OUSADIA, canal: "whatsapp",
    contato: "5593999998888", telefone: "+5593999998888", nome_contato: "Dona Zezé",
  }],
  "conversas:PATCH": [{ id: "conversa-1", cliente_id: OUSADIA }],
  atendimentos: [],
  crm_funis: [{ id: "funil-1" }],
  crm_etapas: [{ id: "etapa-1", funil_id: "funil-1", nome: "Novo lead", tipo: "aberta" }],
  crm_negocios: [],
  "crm_negocios:POST": [{ id: "negocio-1", funil_id: "funil-1", etapa_id: "etapa-1" }],
};

test("conversa começada pela equipe entra no funil de entrada do CRM", async () => {
  const r = await rodar({ telefone: "(93) 99999-8888", nome: "Dona Zezé" }, COM_FUNIL);

  assert.equal(r.codigo, 200);
  assert.equal(r.dados.negocio_id, "negocio-1");

  const [negocio] = corpos(r.chamadas, "crm_negocios", "POST");
  assert.equal(negocio.conversa_id, "conversa-1");
  assert.equal(negocio.etapa_id, "etapa-1");
  assert.equal(negocio.titulo, "Dona Zezé");
});

test("cliente sem funil de entrada não ganha negócio e a conversa abre do mesmo jeito", async () => {
  const r = await rodar({ telefone: "(93) 99999-8888", nome: "Dona Zezé" }, {
    ...COM_FUNIL,
    crm_funis: [],
  });

  assert.equal(r.codigo, 200);
  assert.equal(r.dados.conversa_id, "conversa-1");
  assert.equal(r.dados.negocio_id, null);
  assert.deepEqual(gravou(r.chamadas, "crm_negocios", "POST"), []);
});
