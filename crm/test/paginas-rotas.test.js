// As rotas do compositor: quem entra, o que a rota pública serve, e o que ela
// nunca serve.
//
// O que este arquivo existe para impedir:
//
// 1. Rascunho abrir em endereço público. A tela de composição é do operador, e
//    o que o mundo alcança é /p/<slug> e o domínio do cliente. Página que
//    nunca foi publicada tem que responder igual a página que não existe: até
//    "existe mas não está publicada" entrega um endereço que o cliente ainda
//    não anunciou.
//
// 2. A rota pública ler coluna de rascunho. Não basta não devolver: o `select`
//    não pode nem pedir, senão a primeira mudança descuidada no formato da
//    resposta vaza.
//
// 3. Domínio de um cliente servir a página de outro. A resolução é pelo Host,
//    e Host que ninguém cadastrou não serve nada.
//
// 4. Atendente alcançar o compositor. É tela de implantação, igual a Mídias e
//    a Contexto: só do operador.
//
// 5. Publicar algo diferente do que a prévia mostrou, e gravar domínio que a
//    Vercel recusou.

import test from "node:test";
import assert from "node:assert/strict";

// O handler de verdade do deploy, e não as funções do módulo direto: o
// compositor não é função própria da Vercel (teto de 12 no plano Hobby), e
// quem o expõe é o despachante do api/report.js. Entrar por aqui é o que
// prova que a fiação está certa, e não só o módulo.
import report from "../api/report.js";
import { gerarToken } from "../api/_painel.js";
import { montarPublicacao } from "../api/_pagina.js";

const EMPRESA_A = "11111111-2222-3333-4444-555555555555";
const EMPRESA_B = "99999999-8888-7777-6666-555555555555";
const RITA = "22222222-3333-4444-5555-666666666666";

Object.assign(process.env, {
  SESSION_SECRET: "segredo-local-de-teste",
  SUPABASE_URL: "https://supabase.invalid",
  SUPABASE_SECRET_KEY: "chave-local-de-teste",
  VERCEL_TOKEN: "token-de-teste",
  VERCEL_PROJECT_ID: "prj_teste",
});

const RASCUNHO = {
  rascunho_html: "<h1>Oferta conferida</h1>",
  rascunho_css: "h1{color:#111}",
  rascunho_js: "",
};

function paginaDeExemplo(extra = {}) {
  return {
    id: "pag-a",
    cliente_id: EMPRESA_A,
    slug: "oferta",
    titulo: "Oferta",
    configuracoes: { titulo: "Oferta" },
    ...RASCUNHO,
    rascunho_em: "2026-11-25T10:00:00Z",
    versao_publicada_id: null,
    publicado_html: null,
    publicada_em: null,
    criado_em: "2026-11-20T10:00:00Z",
    atualizado_em: "2026-11-25T10:00:00Z",
    ...extra,
  };
}

/**
 * Banco e Vercel dublados.
 *
 * O dublê filtra por `eq` e por `in`, que é o que as rotas daqui usam, e
 * guarda tudo que saiu: é olhando `saiu` que o teste confere que o recorte foi
 * feito no banco, e não na memória depois de ler tudo.
 */
function mundo(tabelas = {}, { hospedagem } = {}) {
  const saiu = [];
  const rpcs = [];
  let proximoNumero = 1;

  const falso = async (url, opcoes = {}) => {
    const u = new URL(String(url));
    const metodo = opcoes.method || "GET";
    const corpo = opcoes.body ? JSON.parse(opcoes.body) : null;
    saiu.push({ host: u.host, caminho: u.pathname, busca: u.search, metodo, corpo });

    if (u.host === "api.vercel.com") {
      if (!hospedagem) throw new Error("o teste não esperava chamada à hospedagem");
      return hospedagem(u, metodo, corpo);
    }

    if (u.host !== "supabase.invalid") throw new Error(`saiu do mundo dublado: ${u.host}`);

    // A sessão de atendente é consultada no banco pelo porteiro.
    if (u.pathname === "/rest/v1/atendentes") {
      return objetoOuLista(opcoes, [{
        id: RITA, nome: "Rita", cliente_id: EMPRESA_A, papel: "atendente",
        ativo: true, versao_sessao: 1, clientes: { ativo: true, modulos: {} },
      }]);
    }

    // A soma de visitas e leads é uma função do banco: o dublê anota a
    // chamada em vez de somar, porque quem tem que somar é o Postgres, e o
    // teste de que ele soma certo é o de banco, contra PGlite.
    if (u.pathname.startsWith("/rest/v1/rpc/")) {
      rpcs.push({ nome: u.pathname.replace("/rest/v1/rpc/", ""), argumentos: corpo });
      return Response.json(null);
    }

    const tabela = u.pathname.replace("/rest/v1/", "");
    const linhas = tabelas[tabela] || (tabelas[tabela] = []);

    if (metodo === "POST") {
      const novas = (Array.isArray(corpo) ? corpo : [corpo]).map((linha) => ({
        id: `${tabela}-${linhas.length + 1}`,
        numero: tabela === "pagina_versoes" ? proximoNumero++ : undefined,
        ...linha,
      }));
      linhas.push(...novas);
      return objetoOuLista(opcoes, novas);
    }

    const filtradas = filtrar(linhas, u.searchParams);

    if (metodo === "PATCH") {
      for (const linha of filtradas) Object.assign(linha, corpo);
      return objetoOuLista(opcoes, filtradas);
    }
    if (metodo === "DELETE") {
      for (const linha of filtradas) linhas.splice(linhas.indexOf(linha), 1);
      return objetoOuLista(opcoes, filtradas);
    }
    return objetoOuLista(opcoes, filtradas);
  };

  return { saiu, rpcs, falso, tabelas };
}

function filtrar(linhas, busca) {
  let saida = [...linhas];
  for (const [coluna, condicao] of busca.entries()) {
    if (coluna === "select" || coluna === "order" || coluna === "limit") continue;
    const [operador, ...resto] = String(condicao).split(".");
    const valor = resto.join(".");
    if (operador === "eq") saida = saida.filter((l) => String(l[coluna]) === valor);
    // `is.null` / `not.is.null`: é assim que a galeria separa arquivada de
    // ativa, e sem isso o dublê devolveria as duas.
    if (operador === "is") {
      saida = saida.filter((l) => (valor === "null" ? l[coluna] == null : String(l[coluna]) === valor));
    }
    if (operador === "not") {
      const [op2, ...resto2] = resto;
      const valor2 = resto2.join(".");
      if (op2 === "is" && valor2 === "null") saida = saida.filter((l) => l[coluna] != null);
    }
    if (operador === "gte") saida = saida.filter((l) => String(l[coluna]) >= valor);
    if (operador === "in") {
      const lista = valor.replace(/^\(|\)$/g, "").split(",").map((v) => v.replace(/^"|"$/g, ""));
      saida = saida.filter((l) => lista.includes(String(l[coluna])));
    }
  }
  return saida;
}

// `.single()` e `.maybeSingle()` pedem um objeto, e o supabase-js passa uma
// instância de Headers: ler `headers.Accept` devolveria undefined.
function objetoOuLista(opcoes, linhas) {
  const cabecas = new Headers(opcoes.headers || {});
  const aceita = cabecas.get("accept") || "";
  if (aceita.includes("vnd.pgrst.object")) {
    return linhas.length ? Response.json(linhas[0]) : new Response(null, { status: 204 });
  }
  return Response.json(linhas);
}

async function pedir(dublado, { metodo = "GET", query = {}, body, token, host } = {}) {
  const req = {
    method: metodo,
    // `rota` é o que o vercel.json manda para o despachante: `paginas` para o
    // painel, `pagina-publica` para a página no ar. O resto da query é o que a
    // tela de verdade envia.
    query: { rota: "paginas", ...query },
    headers: { ...(token ? { authorization: `Bearer ${token}` } : {}), ...(host ? { host } : {}) },
    body,
  };
  const res = {
    cabecas: {},
    status(c) { this.code = c; return this; },
    json(b) { this.body = b; return this; },
    send(b) { this.enviado = b; return this; },
    setHeader(n, v) { this.cabecas[n] = v; return this; },
  };
  const original = globalThis.fetch;
  globalThis.fetch = dublado.falso;
  try {
    await report(req, res);
  } finally {
    globalThis.fetch = original;
  }
  return res;
}

const comoOperador = () => gerarToken({ tipo: "operador" });
const comoAtendente = () => gerarToken({ tipo: "atendente", atendente: RITA, cliente: EMPRESA_A });

// --------------------------------------------------------------------------
// 1. Quem entra
// --------------------------------------------------------------------------

test("atendente não entra no compositor", async () => {
  const res = await pedir(mundo(), { query: { cliente: EMPRESA_A }, token: comoAtendente() });
  assert.equal(res.code, 403);
});

test("sem token nenhum, só a rota pública responde", async () => {
  const res = await pedir(mundo(), { query: { cliente: EMPRESA_A } });
  assert.equal(res.code, 401);
});

test("o operador lista as páginas do cliente, com o recorte feito no banco", async () => {
  const m = mundo({
    paginas: [paginaDeExemplo(), paginaDeExemplo({ id: "pag-b", cliente_id: EMPRESA_B, slug: "outra" })],
  });
  const res = await pedir(m, { query: { cliente: EMPRESA_A }, token: comoOperador() });

  assert.equal(res.code, 200);
  assert.deepEqual(res.body.paginas.map((p) => p.id), ["pag-a"]);
  const leu = m.saiu.find((c) => c.caminho === "/rest/v1/paginas");
  assert.match(leu.busca, new RegExp(`cliente_id=eq\\.${EMPRESA_A}`));
});

// --------------------------------------------------------------------------
// 2. A rota pública
// --------------------------------------------------------------------------

test("a página publicada é servida sem token, com os bytes gravados na publicação", async () => {
  const bytes = "<!doctype html><html><body>no ar</body></html>";
  const m = mundo({ paginas: [paginaDeExemplo({
    versao_publicada_id: "v1", publicado_html: bytes, publicada_em: "2026-11-25T11:00:00Z",
  })] });

  const res = await pedir(m, { query: { rota: "pagina-publica", slug: "oferta" } });

  assert.equal(res.code, 200);
  assert.equal(res.enviado, bytes, "serve o que foi publicado, sem remontar nada");
  assert.match(res.cabecas["Content-Type"], /text\/html/);
});

test("rascunho não abre em endereço público", async () => {
  const m = mundo({ paginas: [paginaDeExemplo()] });   // nunca publicada
  const res = await pedir(m, { query: { rota: "pagina-publica", slug: "oferta" } });

  assert.equal(res.code, 404);
  assert.doesNotMatch(String(res.enviado), /Oferta conferida/,
    "o conteúdo do rascunho não pode aparecer nem na página de erro");
});

test("a rota pública não pede as colunas de rascunho ao banco", async () => {
  const m = mundo({ paginas: [paginaDeExemplo()] });
  await pedir(m, { query: { rota: "pagina-publica", slug: "oferta" } });

  const leu = m.saiu.find((c) => c.caminho === "/rest/v1/paginas");
  assert.doesNotMatch(leu.busca, /rascunho/,
    "o que a consulta não pede não vaza por descuido de resposta");
});

test("apelido que não existe responde 404 e pede para não ser indexado", async () => {
  const res = await pedir(mundo({ paginas: [] }), { query: { rota: "pagina-publica", slug: "nada" } });
  assert.equal(res.code, 404);
  assert.match(res.cabecas["X-Robots-Tag"], /noindex/);
});

// --------------------------------------------------------------------------
// 3. A resolução pelo Host
// --------------------------------------------------------------------------

function mundoComDominios() {
  return mundo({
    paginas: [
      paginaDeExemplo({
        id: "pag-a", publicado_html: "<p>página do cliente A</p>",
        versao_publicada_id: "v1", publicada_em: "2026-11-25T11:00:00Z",
      }),
      paginaDeExemplo({
        id: "pag-b", cliente_id: EMPRESA_B, slug: "outra",
        publicado_html: "<p>página do cliente B</p>",
        versao_publicada_id: "v2", publicada_em: "2026-11-25T11:00:00Z",
      }),
    ],
    pagina_dominios: [
      { id: "d1", cliente_id: EMPRESA_A, pagina_id: "pag-a", dominio: "cliente-a.com.br", estado: "ativo" },
      { id: "d2", cliente_id: EMPRESA_B, pagina_id: "pag-b", dominio: "cliente-b.com.br", estado: "ativo" },
    ],
  });
}

test("o domínio do cliente serve a página dele, e não a de outro", async () => {
  const a = await pedir(mundoComDominios(), { query: { rota: "pagina-publica" }, host: "cliente-a.com.br" });
  assert.equal(a.code, 200);
  assert.equal(a.enviado, "<p>página do cliente A</p>");

  const b = await pedir(mundoComDominios(), { query: { rota: "pagina-publica" }, host: "cliente-b.com.br:443" });
  assert.equal(b.code, 200);
  assert.equal(b.enviado, "<p>página do cliente B</p>");
});

test("domínio que ninguém cadastrou não serve nada", async () => {
  const res = await pedir(mundoComDominios(), { query: { rota: "pagina-publica" }, host: "dominio-estranho.com" });
  assert.equal(res.code, 404);
  assert.doesNotMatch(String(res.enviado), /cliente A|cliente B/,
    "host desconhecido não cai numa página padrão");
});

test("www cai no apex cadastrado, que é o erro de cadastro mais comum", async () => {
  const res = await pedir(mundoComDominios(), { query: { rota: "pagina-publica" }, host: "www.cliente-a.com.br" });
  assert.equal(res.code, 200);
  assert.equal(res.enviado, "<p>página do cliente A</p>");
});

test("domínio apontado para uma página que não está publicada responde 404", async () => {
  const m = mundo({
    paginas: [paginaDeExemplo()],
    pagina_dominios: [{ id: "d1", cliente_id: EMPRESA_A, pagina_id: "pag-a", dominio: "cliente-a.com.br" }],
  });
  const res = await pedir(m, { query: { rota: "pagina-publica" }, host: "cliente-a.com.br" });
  assert.equal(res.code, 404);
  assert.doesNotMatch(String(res.enviado), /Oferta conferida/);
});

// --------------------------------------------------------------------------
// 4. Publicar
// --------------------------------------------------------------------------

test("publicar o que a prévia mostra grava a versão e os bytes de produção", async () => {
  const m = mundo({ paginas: [paginaDeExemplo()], pagina_versoes: [] });

  const res = await pedir(m, {
    metodo: "POST", token: comoOperador(),
    body: {
      acao: "publicar", id: "pag-a",
      previa: { html: RASCUNHO.rascunho_html, css: RASCUNHO.rascunho_css, js: "" },
    },
  });

  assert.equal(res.code, 200);
  assert.equal(res.body.endereco, "/p/oferta");

  const versao = m.tabelas.pagina_versoes[0];
  assert.equal(versao.html, RASCUNHO.rascunho_html);
  assert.ok(versao.aprovada_em, "versão nascida da prévia já nasce aprovada");

  const pagina = m.tabelas.paginas[0];
  assert.equal(pagina.versao_publicada_id, versao.id);
  assert.ok(pagina.publicada_em);
  // A prova da correspondência: os bytes no ar são a montagem de produção do
  // conteúdo que a prévia estava renderizando.
  assert.equal(pagina.publicado_html, montarPublicacao({
    html: RASCUNHO.rascunho_html,
    css: RASCUNHO.rascunho_css,
    js: "",
    configuracoes: { titulo: "Oferta" },
    // O medidor vai junto nos bytes servidos, e não no conteúdo aprovado: é
    // o que conta a visita e o lead da página no ar. Ele não entra na
    // impressão digital, e o teste disso está no paginas-montagem.
    pagina_id: pagina.id,
  }));
  assert.doesNotMatch(pagina.publicado_html, /instalarModoDeTeste/,
    "o que vai para o ar não leva o modo de teste");
});

test("publicar depois de digitar fora da prévia é recusado, e nada vai para o ar", async () => {
  const m = mundo({ paginas: [paginaDeExemplo()], pagina_versoes: [] });

  const res = await pedir(m, {
    metodo: "POST", token: comoOperador(),
    body: {
      acao: "publicar", id: "pag-a",
      // A prévia foi montada antes desta frase existir no editor.
      previa: { html: "<h1>Oferta antiga</h1>", css: RASCUNHO.rascunho_css, js: "" },
    },
  });

  assert.equal(res.code, 409);
  assert.notEqual(res.body.impressao_previa, res.body.impressao_rascunho);
  assert.equal(m.tabelas.pagina_versoes.length, 0, "nem versão foi criada");
  assert.equal(m.tabelas.paginas[0].publicado_html, null);
});

test("publicar sem prévia nenhuma é recusado", async () => {
  const m = mundo({ paginas: [paginaDeExemplo()] });
  const res = await pedir(m, {
    metodo: "POST", token: comoOperador(), body: { acao: "publicar", id: "pag-a" },
  });
  assert.equal(res.code, 400);
});

test("apelido fora do formato não cria página", async () => {
  const res = await pedir(mundo({ paginas: [] }), {
    metodo: "POST", token: comoOperador(),
    body: { acao: "criar", cliente_id: EMPRESA_A, titulo: "Oferta", slug: "---" },
  });
  assert.equal(res.code, 400);
});

// --------------------------------------------------------------------------
// 5. Domínios
// --------------------------------------------------------------------------

test("adicionar domínio grava os registros de DNS que a hospedagem devolveu", async () => {
  const m = mundo({ paginas: [paginaDeExemplo()], pagina_dominios: [] }, {
    hospedagem: (u, metodo) => {
      assert.equal(metodo, "POST");
      assert.match(u.pathname, /\/v10\/projects\/prj_teste\/domains$/);
      return Response.json({
        name: "cliente-a.com.br",
        verified: false,
        verification: [{ type: "TXT", domain: "_vercel.cliente-a.com.br", value: "vc-domain-verify=x", reason: "pending" }],
      });
    },
  });

  const res = await pedir(m, {
    metodo: "POST", token: comoOperador(),
    body: { acao: "dominio-adicionar", id: "pag-a", dominio: "HTTPS://Cliente-A.com.br/" },
  });

  assert.equal(res.code, 200);
  const gravado = m.tabelas.pagina_dominios[0];
  assert.equal(gravado.dominio, "cliente-a.com.br", "guardado como o Host chega");
  assert.equal(gravado.estado, "pendente");
  assert.deepEqual(gravado.verificacao, [{
    tipo: "TXT", nome: "_vercel.cliente-a.com.br", valor: "vc-domain-verify=x", motivo: "pending",
  }]);
});

test("domínio recusado pela hospedagem não entra na nossa tabela", async () => {
  const m = mundo({ paginas: [paginaDeExemplo()], pagina_dominios: [] }, {
    hospedagem: () => Response.json(
      { error: { code: "domain_already_in_use", message: "domain already in use by another project" } },
      { status: 409 },
    ),
  });

  const res = await pedir(m, {
    metodo: "POST", token: comoOperador(),
    body: { acao: "dominio-adicionar", id: "pag-a", dominio: "cliente-a.com.br" },
  });

  assert.equal(res.code, 400);
  assert.match(res.body.error, /already in use/);
  assert.equal(m.tabelas.pagina_dominios.length, 0,
    "tabela que promete um domínio que a hospedagem não atende é pior que erro na tela");
});

test("remover domínio que a hospedagem não conseguiu tirar mantém o cadastro", async () => {
  const m = mundo({
    paginas: [paginaDeExemplo()],
    pagina_dominios: [{ id: "d1", cliente_id: EMPRESA_A, pagina_id: "pag-a", dominio: "cliente-a.com.br" }],
  }, {
    hospedagem: () => Response.json({ error: { message: "forbidden" } }, { status: 403 }),
  });

  const res = await pedir(m, {
    metodo: "POST", token: comoOperador(),
    body: { acao: "dominio-remover", id: "pag-a", dominio_id: "d1" },
  });

  assert.equal(res.code, 400);
  assert.equal(m.tabelas.pagina_dominios.length, 1,
    "domínio apagado daqui e vivo lá serviria uma página que ninguém mais administra");
});

test("domínio de outra página não é mexido por aqui", async () => {
  const m = mundo({
    paginas: [paginaDeExemplo()],
    pagina_dominios: [{ id: "d9", cliente_id: EMPRESA_B, pagina_id: "pag-b", dominio: "cliente-b.com.br" }],
  });

  const res = await pedir(m, {
    metodo: "POST", token: comoOperador(),
    body: { acao: "dominio-remover", id: "pag-a", dominio_id: "d9" },
  });

  assert.equal(res.code, 404);
  assert.equal(m.tabelas.pagina_dominios.length, 1);
});

// --------------------------------------------------------------------------
// 6. A fronteira da hospedagem
//
// O CRM vai sair da Vercel e ir para VPS, com Caddy emitindo certificado
// por domínio. Para isso ser troca de UM arquivo, e não de quinze, só o
// api/_dominios.js pode saber quem hospeda.
//
// Este teste é o que impede a volta: ele lê o código de verdade e cobra que
// nem rota nem tela tenham endereço de API, nome de variável de credencial ou
// chamada direta de fornecedor. Comentário explicando onde a produção roda
// pode ficar; o que não pode é a dependência.
// --------------------------------------------------------------------------

import { readFileSync } from "node:fs";

const SEGREDOS_DA_HOSPEDAGEM = [
  "api.vercel.com",
  "VERCEL_TOKEN",
  "VERCEL_PROJECT_ID",
  "VERCEL_TEAM_ID",
];

test("só o módulo de domínios sabe quem hospeda", () => {
  const fora = [
    "api/_paginasRotas.js",
    "api/_pagina.js",
    "api/_paginas.js",
    "src/Paginas.jsx",
    "src/paginasGavetas.jsx",
  ];

  for (const arquivo of fora) {
    const codigo = readFileSync(new URL(`../${arquivo}`, import.meta.url), "utf8");
    for (const segredo of SEGREDOS_DA_HOSPEDAGEM) {
      assert.ok(
        !codigo.includes(segredo),
        `${arquivo} fala "${segredo}" direto. Isso pertence ao api/_dominios.js: `
        + "na VPS esse nome não existe mais.",
      );
    }
  }
});

test("a interface de domínios não tem nome de fornecedor", async () => {
  const modulo = await import("../api/_dominios.js");
  const nomes = Object.keys(modulo).sort();

  assert.deepEqual(nomes, [
    "comoConfigurar", "dominioValido", "estado", "hospedagemPronta",
    "normalizarDominio", "registrar", "remover",
  ], "a interface é pequena de propósito: cresceu, revisar se o detalhe não vazou");

  for (const nome of nomes) {
    assert.ok(!/vercel|caddy|hostinger|cloudflare/i.test(nome),
      `"${nome}" nomeia um fornecedor, e a troca de fornecedor viraria troca de chamada`);
  }
});

// --------------------------------------------------------------------------
// 7. A medição, a cópia e o arquivo
//
// Tudo o que a galeria mostra de número sai daqui. "Exclusivamente dados
// reais" quer dizer que não existe caminho neste arquivo em que um número
// apareça sem alguém ter visitado ou mandado formulário de verdade.
// --------------------------------------------------------------------------

// O contador recebe o id direto do navegador de um visitante qualquer, então
// ele só aceita o que tem forma de id de verdade. Nestes testes as páginas
// usam uuid de verdade por isso.
const UUID_PUBLICADA = "11111111-2222-4333-8444-555555555555";
const UUID_RASCUNHO = "99999999-8888-4777-8666-555555555555";

test("o contador só soma para página que existe E está publicada", async () => {
  const publicada = paginaDeExemplo({ id: UUID_PUBLICADA, publicada_em: "2026-11-25T12:00:00Z" });
  const rascunho = paginaDeExemplo({ id: UUID_RASCUNHO, slug: "rascunho", publicada_em: null });

  // Página publicada: soma, e quem soma é a função do banco.
  const m = mundo({ paginas: [publicada, rascunho] });
  const res = await pedir(m, {
    metodo: "POST", query: { rota: "pagina-evento" },
    body: { pagina: UUID_PUBLICADA, tipo: "visita" },
  });
  assert.equal(res.code, 204);
  assert.deepEqual(m.rpcs, [{
    nome: "somar_evento_pagina",
    argumentos: { p_pagina: UUID_PUBLICADA, p_tipo: "visita" },
  }]);

  // Rascunho: não soma. Rascunho não tem endereço público, então visita em
  // rascunho é alguém chamando o contador na mão.
  const m2 = mundo({ paginas: [publicada, rascunho] });
  const res2 = await pedir(m2, {
    metodo: "POST", query: { rota: "pagina-evento" },
    body: { pagina: UUID_RASCUNHO, tipo: "visita" },
  });
  assert.equal(res2.code, 204);
  assert.deepEqual(m2.rpcs, [], "rascunho não conta visita");
});

test("o contador recusa o que não é visita nem lead, e id que não é id", async () => {
  const m = mundo({ paginas: [paginaDeExemplo({ id: UUID_PUBLICADA, publicada_em: "2026-11-25T12:00:00Z" })] });

  for (const corpo of [
    { pagina: UUID_PUBLICADA, tipo: "compra" },
    { pagina: UUID_PUBLICADA, tipo: "" },
    { pagina: "nao-e-uuid", tipo: "visita" },
    {},
  ]) {
    const res = await pedir(m, { metodo: "POST", query: { rota: "pagina-evento" }, body: corpo });
    assert.equal(res.code, 400, `passou: ${JSON.stringify(corpo)}`);
  }
  assert.deepEqual(m.rpcs, [], "nada disso pode ter somado");
});

test("o contador não é porta de leitura: GET não passa", async () => {
  const m = mundo({ paginas: [paginaDeExemplo({ id: UUID_PUBLICADA, publicada_em: "2026-11-25T12:00:00Z" })] });
  const res = await pedir(m, { query: { rota: "pagina-evento", pagina: UUID_PUBLICADA, tipo: "visita" } });
  assert.equal(res.code, 405);
  assert.deepEqual(m.rpcs, []);
});

test("a galeria traz a medição somada por página, e zero é zero medido", async () => {
  const m = mundo({
    paginas: [paginaDeExemplo({ publicada_em: "2026-11-20T12:00:00Z" })],
    pagina_eventos_dia: [
      { pagina_id: "pag-a", dia: "2026-11-24", visitas: 10, leads: 2 },
      { pagina_id: "pag-a", dia: "2026-11-25", visitas: 5, leads: 1 },
    ],
  });

  const res = await pedir(m, { query: { cliente: EMPRESA_A }, token: comoOperador() });
  assert.equal(res.code, 200);
  assert.deepEqual(res.body.paginas[0].medida, { visitas: 15, leads: 3 });
});

test("o período recorta a medição no banco, não na tela", async () => {
  const m = mundo({
    paginas: [paginaDeExemplo({ publicada_em: "2026-11-20T12:00:00Z" })],
    pagina_eventos_dia: [
      { pagina_id: "pag-a", dia: "2026-10-01", visitas: 100, leads: 50 },
      { pagina_id: "pag-a", dia: "2026-11-25", visitas: 5, leads: 1 },
    ],
  });

  const res = await pedir(m, {
    query: { cliente: EMPRESA_A, desde: "2026-11-01" }, token: comoOperador(),
  });
  assert.deepEqual(res.body.paginas[0].medida, { visitas: 5, leads: 1 },
    "o dia de outubro não entra no recorte de novembro");
});

test("arquivar tira da galeria sem apagar nada, e desarquivar devolve", async () => {
  const m = mundo({ paginas: [paginaDeExemplo()] });

  await pedir(m, {
    metodo: "POST", token: comoOperador(),
    body: { acao: "arquivar", id: "pag-a" },
  });
  assert.ok(m.tabelas.paginas[0].arquivada_em, "a data de arquivo tem que ficar gravada");

  const galeria = await pedir(m, { query: { cliente: EMPRESA_A }, token: comoOperador() });
  assert.equal(galeria.body.paginas.length, 0, "arquivada não aparece na galeria");

  const arquivo = await pedir(m, {
    query: { cliente: EMPRESA_A, arquivadas: "1" }, token: comoOperador(),
  });
  assert.equal(arquivo.body.paginas.length, 1, "e aparece no arquivo");

  await pedir(m, {
    metodo: "POST", token: comoOperador(),
    body: { acao: "desarquivar", id: "pag-a" },
  });
  assert.equal(m.tabelas.paginas[0].arquivada_em, null);
});

test("duplicar copia o que está no ar, e a cópia nasce sem publicação e sem histórico", async () => {
  const m = mundo({
    paginas: [paginaDeExemplo({
      publicada_em: "2026-11-20T12:00:00Z",
      versao_publicada_id: "v-no-ar",
      rascunho_html: "<p>mexido depois</p>",
    })],
    pagina_versoes: [{
      id: "v-no-ar", pagina_id: "pag-a", numero: 3,
      html: "<p>o que está no ar</p>", css: "p{color:red}", js: "",
    }],
  });

  const res = await pedir(m, {
    metodo: "POST", token: comoOperador(),
    body: { acao: "duplicar", id: "pag-a" },
  });

  assert.equal(res.code, 200);
  const copia = m.tabelas.paginas.at(-1);
  assert.equal(copia.rascunho_html, "<p>o que está no ar</p>",
    "duplicar uma página no ar e receber o rascunho pela metade de outra pessoa é a surpresa errada");
  assert.equal(copia.slug, "oferta-copia");
  assert.equal(copia.publicada_em, undefined, "cópia nasce fora do ar");
  assert.equal(copia.versao_publicada_id, undefined,
    "versão é registro de aprovação na prévia, e aprovação de uma página não vale para outra");
});

test("duplicar não leva o domínio junto", async () => {
  const m = mundo({
    paginas: [paginaDeExemplo()],
    pagina_dominios: [{ id: "d1", cliente_id: EMPRESA_A, pagina_id: "pag-a", dominio: "cliente-a.com.br" }],
  });

  await pedir(m, { metodo: "POST", token: comoOperador(), body: { acao: "duplicar", id: "pag-a" } });

  assert.equal(m.tabelas.pagina_dominios.length, 1,
    "domínio é único no sistema: duas páginas no mesmo endereço é erro de cadastro, não cópia");
});
