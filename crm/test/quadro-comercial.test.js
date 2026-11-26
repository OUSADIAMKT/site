// O quadro comercial: filtros, vistas, cartão e isolamento.
//
// O que este arquivo existe para impedir:
//
// 1. "Minhas oportunidades" virar "as de quem eu disser". A vista sai da
//    SESSÃO; a URL não tem voz nisso. Sessão sem id de atendente não vê a
//    caixa de todo mundo: vê vazio.
// 2. Filtro feito na memória. Período, pontuação, canal e situação têm que
//    chegar ao banco, senão o quadro carrega mil cartões para mostrar dez.
// 3. A bolinha de não lidas do cartão discordar da caixa de entrada. Mesma
//    função, mesma tabela, mesma identidade de leitura.
// 4. A preferência de cartão de uma pessoa mudar o cartão de outra, e uma
//    chave desconhecida ou um valor que não é booleano entrarem no banco.
// 5. Um campo novo do cartão nascer invisível para quem já tinha preferência
//    salva.

import test from "node:test";
import assert from "node:assert/strict";

import conversas from "../api/painel-conversas.js";
import { gerarToken } from "../api/_painel.js";
import { CAMPOS, PADRAO, mostra, resolver, quantosEscondidos, paraSalvar } from "../src/quadroCampos.js";

const EMPRESA_A = "11111111-2222-3333-4444-555555555555";
const EMPRESA_B = "99999999-8888-7777-6666-555555555555";
const RITA = "22222222-3333-4444-5555-666666666666";
const LIA = "33333333-4444-5555-6666-777777777777";

Object.assign(process.env, {
  SESSION_SECRET: "segredo-local-de-teste",
  SUPABASE_URL: "https://supabase.invalid",
  SUPABASE_SECRET_KEY: "chave-local-de-teste",
});

/** Mesmo dublê dos outros testes de rota: recorta por `cliente_id` e nada mais. */
function mundo(tabelas = {}) {
  const saiu = [];

  const falso = async (url, opcoes = {}) => {
    const u = new URL(String(url));
    const metodo = opcoes.method || "GET";
    saiu.push({ caminho: u.pathname, busca: u.search, metodo, corpo: opcoes.body });

    if (u.host !== "supabase.invalid") throw new Error(`saiu do mundo dublado: ${u.host}`);

    if (u.pathname === "/rest/v1/atendentes" && /[?&]id=eq\./.test(u.search)) {
      return Response.json([{
        id: RITA, nome: "Rita", cliente_id: EMPRESA_A, papel: "atendente",
        ativo: true, disponivel: true, assuntos: ["suporte"], versao_sessao: 1,
        clientes: { ativo: true, modulos: {} },
      }]);
    }

    const tabela = u.pathname.replace("/rest/v1/", "");
    const linhas = tabelas[tabela] || [];
    const dono = u.search.match(/cliente_id=eq\.([^&]+)/)?.[1];
    const recortadas = dono ? linhas.filter((l) => l.cliente_id === dono) : linhas;

    const aceita = String(opcoes.headers?.Accept || opcoes.headers?.accept || "");
    if (aceita.includes("vnd.pgrst.object")) {
      return recortadas.length
        ? Response.json(recortadas[0])
        : new Response(null, { status: 204 });
    }
    return Response.json(recortadas);
  };

  return { saiu, falso };
}

async function pedir(dublado, { metodo = "GET", query = {}, body, token }) {
  const req = { method: metodo, query, headers: { authorization: `Bearer ${token}` }, body };
  const res = {
    status(c) { this.code = c; return this; },
    json(b) { this.body = b; return this; },
  };
  const original = globalThis.fetch;
  globalThis.fetch = dublado.falso;
  try {
    await conversas(req, res);
  } finally {
    globalThis.fetch = original;
  }
  return res;
}

const comoAtendente = () => gerarToken({ tipo: "atendente", atendente: RITA, cliente: EMPRESA_A });
const comoOperador = () => gerarToken({ tipo: "operador" });

/** O que o quadro pediu ao banco de negócios, se pediu. */
const consultaDosNegocios = (m) => m.saiu.find((c) => c.caminho === "/rest/v1/crm_negocios");

const doisNegocios = () => ({
  crm_negocios: [
    { id: "n1", cliente_id: EMPRESA_A, titulo: "da Rita", responsavel_id: RITA, conversa_id: "c1", situacao: "aberto" },
    { id: "n2", cliente_id: EMPRESA_A, titulo: "da Lia", responsavel_id: LIA, conversa_id: "c2", situacao: "aberto" },
  ],
});

// ---------------------------------------------------------------------------
// 1. As vistas saem da sessão, não da URL
// ---------------------------------------------------------------------------

test('vista "minhas" recorta pelo id da sessão', async () => {
  const m = mundo(doisNegocios());
  const res = await pedir(m, { query: { rota: "crm", vista: "meus" }, token: comoAtendente() });
  assert.equal(res.code, 200);
  const busca = consultaDosNegocios(m).busca;
  assert.match(busca, new RegExp(`responsavel_id=eq\\.${RITA}`));
});

test('vista "minhas" ignora o responsável mandado na URL', async () => {
  // Esta é a tentativa: pedir a vista "minhas" dizendo que "eu" sou a Lia.
  // A vista é de quem olha; o filtro é uma escolha dentro dela.
  const m = mundo(doisNegocios());
  await pedir(m, {
    query: { rota: "crm", vista: "meus", responsavel: LIA },
    token: comoAtendente(),
  });
  const busca = consultaDosNegocios(m).busca;
  assert.match(busca, new RegExp(`responsavel_id=eq\\.${RITA}`));
  assert.doesNotMatch(busca, new RegExp(`responsavel_id=eq\\.${LIA}`));
});

test('vista "minhas" sem id de atendente devolve vazio, não a caixa de todo mundo', async () => {
  // O gestor da plataforma não tem caixa própria. Devolver a de todo mundo
  // seria mentir no rótulo da tela.
  const m = mundo(doisNegocios());
  const res = await pedir(m, {
    query: { rota: "crm", vista: "meus", cliente: EMPRESA_A },
    token: comoOperador(),
  });
  assert.equal(res.code, 200);
  assert.deepEqual(res.body.negocios, []);
  assert.equal(consultaDosNegocios(m), undefined, "nem chegou a perguntar ao banco");
});

test('vista "da equipe" tira os meus e exige responsável', async () => {
  const m = mundo(doisNegocios());
  await pedir(m, { query: { rota: "crm", vista: "equipe" }, token: comoAtendente() });
  const busca = consultaDosNegocios(m).busca;
  assert.match(busca, new RegExp(`responsavel_id=neq\\.${RITA}`));
  assert.match(busca, /responsavel_id=not\.is\.null/);
});

test('vista "sem responsável" pede exatamente os sem dono', async () => {
  const m = mundo(doisNegocios());
  await pedir(m, { query: { rota: "crm", vista: "sem" }, token: comoAtendente() });
  assert.match(consultaDosNegocios(m).busca, /responsavel_id=is\.null/);
});

// ---------------------------------------------------------------------------
// 2. Os filtros chegam ao banco
// ---------------------------------------------------------------------------

test("o filtro de canal vira junção interna com a conversa", async () => {
  // Negócio sem conversa não tem canal nenhum e não pode entrar no recorte
  // "só WhatsApp": junção solta deixaria ele passar.
  const m = mundo(doisNegocios());
  await pedir(m, { query: { rota: "crm", canal: "instagram" }, token: comoAtendente() });
  const { busca } = consultaDosNegocios(m);
  assert.match(decodeURIComponent(busca), /conversas!inner\(/);
  assert.match(decodeURIComponent(busca), /conversas\.canal=eq\.instagram/);
});

test("sem filtro de canal a junção fica solta", async () => {
  const m = mundo(doisNegocios());
  await pedir(m, { query: { rota: "crm" }, token: comoAtendente() });
  const alvo = decodeURIComponent(consultaDosNegocios(m).busca);
  assert.doesNotMatch(alvo, /conversas!inner\(/);
  assert.match(alvo, /conversas\(canal/);
});

test("o filtro de período corta por data de criação no banco", async () => {
  const m = mundo(doisNegocios());
  await pedir(m, { query: { rota: "crm", periodo: "7" }, token: comoAtendente() });
  const alvo = decodeURIComponent(consultaDosNegocios(m).busca);
  const corte = alvo.match(/criado_em=gte\.([^&]+)/)?.[1];
  assert.ok(corte, `faltou o corte de período em ${alvo}`);
  const dias = (Date.now() - new Date(corte).getTime()) / 86_400_000;
  assert.ok(dias > 6.9 && dias < 7.1, `o corte caiu em ${dias} dias`);
});

test("período vazio ou zero não manda corte nenhum", async () => {
  for (const valor of ["", "0", "abacaxi"]) {
    const m = mundo(doisNegocios());
    await pedir(m, { query: { rota: "crm", periodo: valor }, token: comoAtendente() });
    assert.doesNotMatch(consultaDosNegocios(m).busca, /criado_em=gte/, `periodo=${valor}`);
  }
});

test("a pontuação mínima corta no banco e deixa quem não foi avaliado de fora", async () => {
  // "Pelo menos 40" é afirmação sobre quem foi avaliado. Tratar score nulo
  // como zero misturaria "nota baixa" com "ninguém avaliou", e `gte` já deixa
  // o nulo fora: é isso que o teste prende.
  const m = mundo(doisNegocios());
  await pedir(m, { query: { rota: "crm", score_minimo: "40" }, token: comoAtendente() });
  assert.match(consultaDosNegocios(m).busca, /score=gte\.40/);
});

test("pontuação mínima zero não filtra nada", async () => {
  const m = mundo(doisNegocios());
  await pedir(m, { query: { rota: "crm", score_minimo: "0" }, token: comoAtendente() });
  assert.doesNotMatch(consultaDosNegocios(m).busca, /score=gte/);
});

test("situação e prioridade cortam no banco", async () => {
  const m = mundo(doisNegocios());
  await pedir(m, {
    query: { rota: "crm", situacao: "ganho", prioridade: "alta" },
    token: comoAtendente(),
  });
  const { busca } = consultaDosNegocios(m);
  assert.match(busca, /situacao=eq\.ganho/);
  assert.match(busca, /prioridade=eq\.alta/);
});

test("o cartão pede a foto e a empresa do contato junto", async () => {
  const m = mundo(doisNegocios());
  await pedir(m, { query: { rota: "crm" }, token: comoAtendente() });
  const alvo = decodeURIComponent(consultaDosNegocios(m).busca);
  assert.match(alvo.replace(/ /g, ""), /contatos\(nome,empresa,foto_url\)/);
});

// ---------------------------------------------------------------------------
// 3. As não lidas do cartão
// ---------------------------------------------------------------------------

test("o cartão recebe as não lidas da conversa dele", async () => {
  const m = mundo({
    ...doisNegocios(),
    "rpc/nao_lidas_das_conversas": [
      { conversa_id: "c1", nao_lidas: 3, marcada: false },
      { conversa_id: "c2", nao_lidas: 0, marcada: true },
    ],
  });
  const res = await pedir(m, { query: { rota: "crm" }, token: comoAtendente() });
  const porId = Object.fromEntries((res.body.negocios || []).map((n) => [n.id, n]));
  assert.equal(porId.n1.nao_lidas, 3);
  assert.equal(porId.n1.marcada, false);
  assert.equal(porId.n2.nao_lidas, 0);
  assert.equal(porId.n2.marcada, true);
});

test("a contagem usa a identidade de leitura de quem está olhando", async () => {
  // Mesma identidade da caixa de entrada: atendente é o id dela, gestor da
  // plataforma é 'operador'. Um cartão que diz "3" e uma conversa que diz
  // "nenhuma" seriam duas verdades sobre o mesmo fato.
  const m = mundo({ ...doisNegocios(), "rpc/nao_lidas_das_conversas": [] });
  await pedir(m, { query: { rota: "crm" }, token: comoAtendente() });
  const rpc = m.saiu.find((c) => c.caminho === "/rest/v1/rpc/nao_lidas_das_conversas");
  assert.ok(rpc, "o quadro não contou as não lidas");
  assert.equal(JSON.parse(rpc.corpo).p_quem, RITA);

  const g = mundo({ ...doisNegocios(), "rpc/nao_lidas_das_conversas": [] });
  await pedir(g, { query: { rota: "crm", cliente: EMPRESA_A }, token: comoOperador() });
  const rpcG = g.saiu.find((c) => c.caminho === "/rest/v1/rpc/nao_lidas_das_conversas");
  assert.equal(JSON.parse(rpcG.corpo).p_quem, "operador");
});

test("a bolinha some, mas o quadro abre, quando a contagem falha", async () => {
  // Perder o negrito é menos grave do que a tela não abrir.
  const m = mundo(doisNegocios());
  const original = m.falso;
  m.falso = async (url, opcoes) => {
    if (String(url).includes("/rpc/nao_lidas_das_conversas")) throw new Error("banco caiu");
    return original(url, opcoes);
  };
  const res = await pedir(m, { query: { rota: "crm" }, token: comoAtendente() });
  assert.equal(res.code, 200);
  assert.equal(res.body.negocios.length, 2);
  assert.equal(res.body.negocios[0].nao_lidas, 0);
});

// ---------------------------------------------------------------------------
// 4. A preferência de cartão
// ---------------------------------------------------------------------------

test("o cartão é lido pela identidade de quem olha", async () => {
  const m = mundo({
    crm_quadro_campos: [{ cliente_id: EMPRESA_A, quem: RITA, campos: { valor: false } }],
  });
  const res = await pedir(m, { query: { rota: "crm", ver: "campos" }, token: comoAtendente() });
  assert.equal(res.code, 200);
  assert.deepEqual(res.body.campos, { valor: false });
  const leu = m.saiu.find((c) => c.caminho === "/rest/v1/crm_quadro_campos");
  assert.match(leu.busca, new RegExp(`quem=eq\\.${RITA}`));
  assert.match(leu.busca, new RegExp(`cliente_id=eq\\.${EMPRESA_A}`));
});

test("o gestor da plataforma também tem cartão próprio", async () => {
  const m = mundo({ crm_quadro_campos: [] });
  const res = await pedir(m, {
    query: { rota: "crm", ver: "campos", cliente: EMPRESA_A },
    token: comoOperador(),
  });
  assert.equal(res.code, 200);
  assert.deepEqual(res.body.campos, {}, "sem linha salva, a tela abre no padrão");
  assert.match(m.saiu.find((c) => c.caminho === "/rest/v1/crm_quadro_campos").busca, /quem=eq\.operador/);
});

test("quem nunca escolheu nada recebe objeto vazio, não erro", async () => {
  const m = mundo({ crm_quadro_campos: [] });
  const res = await pedir(m, { query: { rota: "crm", ver: "campos" }, token: comoAtendente() });
  assert.equal(res.code, 200);
  assert.deepEqual(res.body.campos, {});
});

test("gravar o cartão guarda sob a identidade de quem olha", async () => {
  const m = mundo({ crm_quadro_campos: [] });
  const res = await pedir(m, {
    metodo: "POST",
    query: { rota: "crm" },
    body: { acao: "campos-do-quadro", campos: { valor: false, score: true } },
    token: comoAtendente(),
  });
  assert.equal(res.code, 200);
  const gravou = m.saiu.find((c) => c.caminho === "/rest/v1/crm_quadro_campos" && c.metodo === "POST");
  const linha = JSON.parse(gravou.corpo);
  assert.equal(linha.cliente_id, EMPRESA_A);
  assert.equal(linha.quem, RITA);
  assert.deepEqual(linha.campos, { valor: false, score: true });
});

test("chave estranha e valor que não é booleano não entram no banco", async () => {
  // O servidor confere a FORMA e não o vocabulário, de propósito: campo novo
  // da tela não exige deploy coordenado. Mas lixo não passa.
  const m = mundo({ crm_quadro_campos: [] });
  const res = await pedir(m, {
    metodo: "POST",
    query: { rota: "crm" },
    body: {
      acao: "campos-do-quadro",
      campos: {
        valor: true,
        "Valor; drop table": true,
        score: "sim",
        x: true,
        chave_longa_demais_para_caber: true,
        campo_novo: false,
      },
    },
    token: comoAtendente(),
  });
  assert.equal(res.code, 200);
  // `campo_novo` passa sem o servidor conhecer o nome: é isso que dispensa
  // deploy coordenado. `x` é curta demais, a chave com maiúscula e a longa
  // demais ficam fora, e `score: "sim"` não é booleano.
  assert.deepEqual(res.body.campos, { valor: true, campo_novo: false });
});

test("cartão que não é objeto é recusado", async () => {
  for (const ruim of [null, "valor", 7, ["valor"]]) {
    const res = await pedir(mundo({ crm_quadro_campos: [] }), {
      metodo: "POST",
      query: { rota: "crm" },
      body: { acao: "campos-do-quadro", campos: ruim },
      token: comoAtendente(),
    });
    assert.ok(res.code >= 400, `${JSON.stringify(ruim)} passou`);
  }
});

test("atendente de uma empresa não mexe no cartão de outra", async () => {
  const res = await pedir(mundo(), {
    metodo: "POST",
    query: { rota: "crm" },
    body: { acao: "campos-do-quadro", cliente: EMPRESA_B, campos: { valor: false } },
    token: comoAtendente(),
  });
  assert.equal(res.code, 403);
});

test("atendente de uma empresa não lê o cartão de outra", async () => {
  const res = await pedir(mundo(), {
    query: { rota: "crm", ver: "campos", cliente: EMPRESA_B },
    token: comoAtendente(),
  });
  assert.equal(res.code, 403);
});

// ---------------------------------------------------------------------------
// 5. A lista de campos, sozinha
// ---------------------------------------------------------------------------

test("campo ausente cai no padrão, e não em escondido", async () => {
  // É isto que deixa um campo novo aparecer para quem já tinha preferência
  // salva, em vez de ficar invisível para sempre porque o jsonb antigo não
  // falava dele.
  assert.equal(mostra({ valor: false }, "canal"), true);
  assert.equal(mostra({}, "valor"), true);
  assert.equal(mostra(null, "valor"), true);
});

test("campo desligado na mão fica desligado", async () => {
  assert.equal(mostra({ valor: false }, "valor"), false);
});

test("previsão e empresa nascem escondidas", async () => {
  assert.equal(PADRAO.previsao, false);
  assert.equal(PADRAO.empresa, false);
  assert.equal(mostra({}, "previsao"), false);
  // E quem ligou, ligou.
  assert.equal(mostra({ previsao: true }, "previsao"), true);
});

test("valor que não é booleano cai no padrão", async () => {
  assert.equal(mostra({ valor: "sim" }, "valor"), true);
  assert.equal(mostra({ previsao: 1 }, "previsao"), false);
});

test("resolver devolve todos os campos conhecidos", async () => {
  const ver = resolver({ valor: false, previsao: true });
  assert.equal(Object.keys(ver).length, CAMPOS.length);
  assert.equal(ver.valor, false);
  assert.equal(ver.previsao, true);
  assert.equal(ver.canal, true);
  // E não inventa chave nenhuma.
  assert.equal(ver.campo_inexistente, undefined);
});

test("resolver ignora chave que a tela não conhece mais", async () => {
  const ver = resolver({ campo_velho: false, valor: false });
  assert.equal(ver.campo_velho, undefined);
  assert.equal(ver.valor, false);
});

test("a conta de escondidos bate com o que está desligado", async () => {
  // Sem escolha nenhuma, os escondidos são os que nascem escondidos.
  const nascem = CAMPOS.filter((c) => !c.padrao).length;
  assert.equal(quantosEscondidos({}), nascem);
  assert.equal(quantosEscondidos({ valor: false }), nascem + 1);
  assert.equal(quantosEscondidos(paraSalvar({ previsao: true, empresa: true })), nascem - 2);
});

test("o que vai para o servidor é o conjunto inteiro, não só a diferença", async () => {
  // Mandar tudo é de propósito: assim mudar o padrão de um campo numa versão
  // nova da tela não muda o cartão de quem já escolheu.
  const salvar = paraSalvar({ valor: false });
  assert.equal(Object.keys(salvar).length, CAMPOS.length);
  assert.equal(salvar.valor, false);
  for (const v of Object.values(salvar)) assert.equal(typeof v, "boolean");
});

test("cada campo tem chave curta, minúscula e rótulo", async () => {
  // A chave precisa passar pela conferência do servidor, que é a mesma
  // expressão abaixo: um campo novo com chave fora do formato seria
  // silenciosamente descartado na gravação.
  const vistas = new Set();
  for (const c of CAMPOS) {
    assert.match(c.chave, /^[a-z][a-z_]{1,19}$/, `chave fora do formato: ${c.chave}`);
    assert.ok(c.rotulo && c.rotulo.length > 2, `rótulo faltando em ${c.chave}`);
    assert.equal(typeof c.padrao, "boolean", `padrão faltando em ${c.chave}`);
    assert.ok(!vistas.has(c.chave), `chave repetida: ${c.chave}`);
    vistas.add(c.chave);
  }
});
