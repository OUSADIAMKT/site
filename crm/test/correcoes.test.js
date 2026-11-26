// Os testes das correções pré-deploy da Etapa 1.
//
// Um bloco por item da auditoria: RLS, reexecução da migração, autorização da
// API e preservação de dados na atualização parcial.
//
// O QUE ESTE ARQUIVO NÃO PROVA: concorrência real. PGlite é uma conexão só.
// A trava de concorrência do item 2 da auditoria é um `pg_advisory_xact_lock`,
// e a única prova possível aqui é que o lock existe, que ele é por empresa e
// que o comportamento sequencial continua certo. Que duas transações
// simultâneas se serializam de fato continua PENDENTE, e está registrado no
// relatório. Teste sequencial não é prova de segurança concorrente.

import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { PGlite } from "@electric-sql/pglite";

import { bancoLimpo, bancoAte, aplicar033, duasEmpresas, tentar } from "./banco.js";

const aqui = dirname(fileURLToPath(import.meta.url));
const sql = (arquivo) => readFileSync(join(aqui, "..", "sql", arquivo), "utf8");

// ---------------------------------------------------------------------------
// 1. RLS

test("frentes nasce com RLS ligada e sem política nenhuma", async () => {
  const pg = await bancoLimpo();
  const { rows } = await pg.query(`
    select c.relrowsecurity as rls,
           (select count(*)::int from pg_policy p where p.polrelid = c.oid) as politicas
      from pg_class c join pg_namespace n on n.oid = c.relnamespace
     where n.nspname = 'public' and c.relname = 'frentes'
  `);

  assert.equal(rows.length, 1, "a tabela frentes tem que existir");
  assert.equal(rows[0].rls, true, "RLS tem que estar ligada");
  assert.equal(rows[0].politicas, 0, "zero política: é assim que o resto do banco está");
});

test("RLS sem política nega de fato quem não é a chave de serviço", async () => {
  // A prova de que RLS ligada sem política basta. Um papel comum, com
  // concessão de leitura em mãos, não vê linha nenhuma: a RLS filtra antes.
  // Superusuário passa, e é por isso que o painel funciona: ele fala com o
  // banco pela chave de serviço, e `service_role` tem bypassrls.
  const pg = await bancoAte("032");
  try {
    await pg.exec("create role papel_publico nologin;");
    await aplicar033(pg);
    await pg.exec(`
      grant usage on schema public to papel_publico;
      grant select, insert, update, delete on table frentes to papel_publico;
    `);

    const e = await duasEmpresas(pg);
    await pg.query(
      "insert into frentes (cliente_id, nome, assuntos) values ($1, 'Vendas', '{matricula}')",
      [e.empresa_a],
    );

    const comoDono = await pg.query("select count(*)::int as n from frentes");
    assert.equal(comoDono.rows[0].n, 1, "o dono vê a linha");

    // `set role` em chamada separada: PGlite não aceita duas instruções numa
    // consulta com parâmetros.
    await pg.exec("set role papel_publico;");
    const comoPublico = await pg.query("select count(*)::int as n from frentes");
    assert.equal(
      comoPublico.rows[0].n, 0,
      "papel comum não vê nada: a RLS nega sem precisar de política",
    );

    const escrita = await tentar(
      pg, "insert into frentes (cliente_id, nome) values ($1, 'Invadida')", [e.empresa_a],
    );
    await pg.exec("reset role;");
    assert.ok(escrita.erro, "papel comum também não escreve");
    assert.match(escrita.erro, /row-level security|policy/i);
  } finally {
    await pg.close();
  }
});

test("a 034 liga RLS em disparo_tentativas e tira a concessão dos papéis públicos", async () => {
  const pg = await bancoAte("032");
  try {
    const antes = await pg.query(`
      select c.relrowsecurity as rls from pg_class c
        join pg_namespace n on n.oid = c.relnamespace
       where n.nspname = 'public' and c.relname = 'disparo_tentativas'
    `);
    assert.equal(antes.rows[0].rls, false, "é exatamente a falha que a 032 deixou");

    // Os papéis do Supabase não existem num Postgres limpo. Criar os dois aqui
    // é o que faz o `do $$` da 034 entrar no ramo do revoke, que é a metade da
    // correção que não dá para ver só olhando `relrowsecurity`.
    await pg.exec("create role anon nologin; create role authenticated nologin;");
    await pg.exec(`
      grant usage on schema public to anon, authenticated;
      grant select, insert, update, delete on table disparo_tentativas to anon, authenticated;
    `);

    await pg.exec(sql("034_rls_disparo_tentativas.sql"));

    const depois = await pg.query(`
      select c.relrowsecurity as rls,
             (select count(*)::int from pg_policy p where p.polrelid = c.oid) as politicas
        from pg_class c join pg_namespace n on n.oid = c.relnamespace
       where n.nspname = 'public' and c.relname = 'disparo_tentativas'
    `);
    assert.equal(depois.rows[0].rls, true, "RLS ligada");
    assert.equal(depois.rows[0].politicas, 0, "sem política, como o resto do banco");

    for (const papel of ["anon", "authenticated"]) {
      await pg.exec(`set role ${papel};`);
      const r = await tentar(pg, "select count(*) from disparo_tentativas");
      await pg.exec("reset role;");
      assert.ok(r.erro, `${papel} não deveria nem ter concessão`);
      assert.match(r.erro, /permission denied/i, `${papel}: a concessão tem que ter saído`);
    }
  } finally {
    await pg.close();
  }
});

test("a 034 roda duas vezes sem erro", async () => {
  const pg = await bancoAte("032");
  try {
    await pg.exec(sql("034_rls_disparo_tentativas.sql"));
    await pg.exec(sql("034_rls_disparo_tentativas.sql"));
    const { rows } = await pg.query(`
      select c.relrowsecurity as rls from pg_class c
        join pg_namespace n on n.oid = c.relnamespace
       where n.nspname = 'public' and c.relname = 'disparo_tentativas'
    `);
    assert.equal(rows[0].rls, true);
  } finally {
    await pg.close();
  }
});

test("a 034 não toca em nenhuma linha nem em nenhuma coluna", async () => {
  const pg = await bancoAte("032");
  try {
    const colunas = async () => (await pg.query(`
      select column_name, data_type, is_nullable from information_schema.columns
       where table_schema = 'public' and table_name = 'disparo_tentativas'
       order by ordinal_position
    `)).rows;

    const antes = await colunas();
    await pg.exec(sql("034_rls_disparo_tentativas.sql"));
    assert.deepEqual(await colunas(), antes, "a 034 é só permissão, não é esquema");
  } finally {
    await pg.close();
  }
});

// ---------------------------------------------------------------------------
// 2. concorrência: o que dá para provar sem duas conexões

test("o trigger de assunto pega advisory lock por empresa", async () => {
  const pg = await bancoLimpo();
  const { rows } = await pg.query(`
    select prosrc from pg_proc where proname = 'frente_assunto_sem_conflito'
  `);
  assert.equal(rows.length, 1);
  assert.match(
    rows[0].prosrc, /pg_advisory_xact_lock\(1033, hashtext\(new\.cliente_id::text\)\)/,
    "sem o lock o trigger é consulta-e-permite, que duas transações atravessam",
  );

  // Chaves diferentes para empresas diferentes é o que faz uma empresa não
  // esperar a outra. Se as duas caíssem na mesma chave, toda a plataforma
  // serializaria em uma fila só.
  const e = await duasEmpresas(pg);
  const chaves = await pg.query(
    "select hashtext($1::text) as a, hashtext($2::text) as b",
    [e.empresa_a, e.empresa_b],
  );
  assert.notEqual(chaves.rows[0].a, chaves.rows[0].b);
});

test("o lock vem antes da saída antecipada, então desativar também serializa", async () => {
  const pg = await bancoLimpo();
  const { rows } = await pg.query(`
    select prosrc from pg_proc where proname = 'frente_assunto_sem_conflito'
  `);
  const corpo = rows[0].prosrc;
  const posLock = corpo.indexOf("pg_advisory_xact_lock");
  const posSaida = corpo.indexOf("if not new.ativa");
  assert.ok(posLock >= 0 && posSaida >= 0);
  assert.ok(
    posLock < posSaida,
    "lock depois do return deixaria a desativação concorrente fora da fila",
  );
});

test("o lock não mudou o que o trigger recusa e o que ele aceita", async () => {
  // Regressão: a correção de concorrência não pode ter afetado a regra.
  const pg = await bancoLimpo();
  const e = await duasEmpresas(pg);

  await pg.query(
    "insert into frentes (cliente_id, nome, assuntos) values ($1, 'Vendas', '{matricula}')",
    [e.empresa_a],
  );

  const mesmoAssunto = await tentar(
    pg, "insert into frentes (cliente_id, nome, assuntos) values ($1, 'Outra', '{matricula}')",
    [e.empresa_a],
  );
  assert.ok(mesmoAssunto.erro, "mesmo assunto na mesma empresa continua recusado");
  assert.match(mesmoAssunto.erro, /ja pertence a frente "Vendas"/);

  const outraEmpresa = await tentar(
    pg, "insert into frentes (cliente_id, nome, assuntos) values ($1, 'Vendas', '{matricula}')",
    [e.empresa_b],
  );
  assert.ok(outraEmpresa.ok, "outra empresa pode ter o mesmo assunto");

  const inativa = await tentar(
    pg, "insert into frentes (cliente_id, nome, assuntos, ativa) values ($1, 'Velha', '{matricula}', false)",
    [e.empresa_a],
  );
  assert.ok(inativa.ok, "frente inativa continua fora da conta");
});

// ---------------------------------------------------------------------------
// 3. reexecução da 033

test("a 033 roda duas vezes sem erro", async () => {
  const pg = await bancoAte("032");
  try {
    await aplicar033(pg);
    await aplicar033(pg);

    const { rows } = await pg.query(`
      select conname from pg_constraint
       where conname in ('atendentes_id_cliente_key', 'disparos_frente_mesma_empresa')
       order by conname
    `);
    assert.deepEqual(
      rows.map((r) => r.conname),
      ["atendentes_id_cliente_key", "disparos_frente_mesma_empresa"],
      "as duas constraints continuam de pé depois da segunda passada",
    );
  } finally {
    await pg.close();
  }
});

test("a reexecução não derruba a unique de que a chave estrangeira depende", async () => {
  // Este é o motivo de a 033 ter deixado de usar `drop constraint if exists`.
  // Com a 033 aplicada, derrubar a unique é recusado pelo próprio Postgres, e
  // a saída fácil seria `cascade`, que levaria a chave estrangeira do
  // isolamento junto. O teste prova que a recusa existe.
  const pg = await bancoAte("032");
  try {
    await aplicar033(pg);

    const r = await tentar(
      pg, "alter table atendentes drop constraint atendentes_id_cliente_key",
    );
    assert.ok(r.erro, "derrubar tinha que ser recusado");
    assert.match(r.erro, /depend on it/i);
    assert.match(r.erro, /atendentes_id_cliente_key/);
    // Quem é o dependente vem no DETAIL do erro, não na mensagem, e o DETAIL
    // é onde o Postgres nomeia `frentes_responsavel_mesma_empresa`.

    // A migração não pode contornar a recusa com cascade, que levaria a chave
    // estrangeira do isolamento junto. O `on delete cascade` de `cliente_id` é
    // outra coisa e tem que continuar lá: apagar a empresa leva as frentes
    // dela. Então o que o teste proíbe é cascade em drop, não a palavra.
    // Sem os comentários: o comentário que explica por que não se usa cascade
    // contém as duas palavras, e mediria a explicação em vez do SQL.
    const texto = sql("033_frentes.sql")
      .split("\n").filter((l) => !l.trimStart().startsWith("--")).join("\n");
    assert.ok(
      !/drop\s+(constraint|table|index)[^;]*cascade/i.test(texto),
      "nenhum drop desta migração pode usar cascade",
    );
    assert.ok(
      /references clientes\(id\) on delete cascade/.test(texto),
      "e o cascade de cliente_id, que é legítimo, tem que continuar",
    );
  } finally {
    await pg.close();
  }
});

test("a 033 reaplicada depois da reversão não precisa tocar em atendentes", async () => {
  // A reversão deixa a unique de pé de propósito. Reaplicar a 033 em cima
  // disso tem que ser um não-evento.
  const pg = await bancoAte("032");
  try {
    await aplicar033(pg);
    await pg.exec(sql("033_reversao.sql"));

    const sobrou = await pg.query(`
      select conname from pg_constraint where conname = 'atendentes_id_cliente_key'
    `);
    assert.equal(sobrou.rows.length, 1, "a reversão não derruba a unique");

    await aplicar033(pg);
    const voltou = await pg.query("select count(*)::int as n from frentes");
    assert.equal(voltou.rows[0].n, 0, "a tabela voltou vazia e utilizável");
  } finally {
    await pg.close();
  }
});

// ---------------------------------------------------------------------------
// 4. autorização da API
//
// Testa os porteiros de verdade, de `api/_painel.js`, com token de verdade
// assinado pelo mesmo HMAC que produção usa. O que entra é um `req` falso,
// porque é só o portador do cabeçalho.

process.env.SESSION_SECRET = "segredo-de-teste-que-nao-vale-em-lugar-nenhum";
const { gerarToken, barrouGestor, clientePermitido } = await import("../api/_painel.js");

const EMPRESA = "11111111-1111-1111-1111-111111111111";
const OUTRA = "22222222-2222-2222-2222-222222222222";

process.env.SUPABASE_URL = "https://supabase.invalid";
process.env.SUPABASE_SECRET_KEY = "chave-local-de-teste";

function simularAtendente(t, papel) {
  t.mock.method(globalThis, "fetch", async (url) => {
    assert.equal(new URL(url).pathname, "/rest/v1/atendentes");
    return Response.json([{
      cliente_id: EMPRESA, papel, ativo: true, versao_sessao: 1,
      clientes: { ativo: true },
    }]);
  });
}

const req = (dados) => ({
  headers: dados ? { authorization: `Bearer ${gerarToken(dados)}` } : {},
  query: {},
});

function resFalso() {
  const r = { codigo: null, corpo: null };
  r.status = (c) => { r.codigo = c; return r; };
  r.json = (o) => { r.corpo = o; return r; };
  return r;
}

test("sem token a rota de frentes responde 401", async () => {
  const res = resFalso();
  assert.equal(await barrouGestor(req(null), res), true, "tem que barrar");
  assert.equal(res.codigo, 401);
});

test("token adulterado não passa", async () => {
  const bom = gerarToken({ tipo: "operador" });
  const res = resFalso();
  const r = { headers: { authorization: `Bearer ${bom.slice(0, -2)}xx` }, query: {} };
  assert.equal(await barrouGestor(r, res), true);
  assert.equal(res.codigo, 401, "assinatura quebrada é não autenticado, não 403");
});

test("atendente comum é barrado no backend, independente do menu", async (t) => {
  simularAtendente(t, "atendente");
  const res = resFalso();
  const barrou = await barrouGestor(
    req({ tipo: "atendente", atendente: "a", papel: "atendente", cliente: EMPRESA }), res,
  );
  assert.equal(barrou, true, "o menu não é a trava: o porteiro é");
  assert.equal(res.codigo, 403);
});

test("gestor e operador passam", async (t) => {
  simularAtendente(t, "gestor");
  for (const sessao of [
    { tipo: "atendente", atendente: "a", papel: "gestor", cliente: EMPRESA },
    { tipo: "operador" },
  ]) {
    const res = resFalso();
    assert.equal(await barrouGestor(req(sessao), res), false, JSON.stringify(sessao));
    assert.equal(res.codigo, null, "não respondeu nada, deixou passar");
  }
});

test("gestor não alcança outra empresa nem mandando o id dela", async (t) => {
  simularAtendente(t, "gestor");
  const r = req({ tipo: "atendente", atendente: "a", papel: "gestor", cliente: EMPRESA });
  assert.equal(await clientePermitido(r, OUTRA), null, "id de outra empresa é recusado");
  assert.equal(await clientePermitido(r, EMPRESA), EMPRESA, "o próprio é aceito");
  assert.equal(await clientePermitido(r, undefined), EMPRESA, "sem id, cai no da sessão");
  assert.equal(await clientePermitido(r, ""), EMPRESA);
});

test("o operador alcança qualquer empresa, que é o desenho", async () => {
  const r = req({ tipo: "operador" });
  assert.equal(await clientePermitido(r, OUTRA), OUTRA, "ele é a agência e atende todos");
  assert.equal(await clientePermitido(r, undefined), null, "mas sem escolher não vira nada");
});

test("sessão vencida não vale", () => {
  const vencido = gerarToken({ tipo: "operador" });
  const [corpo] = vencido.split(".");
  const carga = JSON.parse(Buffer.from(corpo, "base64url").toString());
  assert.ok(carga.exp > Date.now(), "o token novo vale agora");
  assert.ok(carga.exp - Date.now() <= 1000 * 60 * 60 * 12, "e vence em 12 horas");
});

// ---------------------------------------------------------------------------
// 5. atualização parcial não apaga campo
//
// Aqui o alvo é o payload que `salvarFrente` monta, não o banco: o defeito era
// mandar coluna que ninguém pediu para mudar. Então o dublê registra o que
// seria gravado e o teste olha o payload.

const { salvarFrente } = await import("../api/_frentes.js");

function sbFalso({ atendente = null, erro = null, linha = { id: "f1" } } = {}) {
  const registro = { update: null, insert: null, filtros: [] };

  const encadear = (resposta) => {
    const alvo = {
      eq: (coluna, valor) => { registro.filtros.push([coluna, valor]); return alvo; },
      select: () => alvo,
      maybeSingle: async () => ({ data: resposta, error: erro }),
      single: async () => ({ data: resposta, error: erro }),
    };
    return alvo;
  };

  const sb = {
    from(tabela) {
      if (tabela === "atendentes") {
        return { select: () => encadear(atendente) };
      }
      return {
        update: (campos) => { registro.update = campos; return encadear(linha); },
        insert: (campos) => { registro.insert = campos; return encadear(linha); },
      };
    },
  };
  return { sb, registro };
}

// `explicar` escreve no log de propósito. Nos testes que forçam erro isso
// sujaria a saída, então o log é silenciado e devolvido no fim.
async function semLog(fn) {
  const antes = console.error;
  const linhas = [];
  console.error = (...a) => linhas.push(a);
  try {
    return { resultado: await fn(), log: linhas };
  } catch (e) {
    return { erro: e, log: linhas };
  } finally {
    console.error = antes;
  }
}

test("editar mandando só o nome não encosta em mais nada", async () => {
  const { sb, registro } = sbFalso();
  await salvarFrente(sb, EMPRESA, { id: "f1", nome: "Vendas Ousadia" });

  assert.deepEqual(registro.update, { nome: "Vendas Ousadia" });
  for (const campo of ["assuntos", "padrao", "responsavel_id", "ativa", "cliente_id"]) {
    assert.ok(!(campo in registro.update), `${campo} não podia entrar no update`);
  }
});

test("a tela continua funcionando igual: corpo cheio grava os quatro campos", async () => {
  // O que `src/Frentes.jsx` manda hoje, campo por campo.
  const { sb, registro } = sbFalso({ atendente: { id: "a1", ativo: true, nome: "Lia" } });
  await salvarFrente(sb, EMPRESA, {
    cliente: EMPRESA, id: "f1", nome: "Vendas", assuntos: ["matricula"],
    padrao: false, responsavel_id: "a1",
  });

  assert.deepEqual(registro.update, {
    nome: "Vendas", assuntos: ["matricula"], padrao: false, responsavel_id: "a1",
  });
});

test("limpar de propósito continua limpando", async () => {
  // Lista vazia e nulo explícito são pedidos, não ausência. A correção não pode
  // ter transformado "tire o responsável" em "deixe como está".
  const { sb, registro } = sbFalso();
  await salvarFrente(sb, EMPRESA, {
    id: "f1", assuntos: [], responsavel_id: null, padrao: false,
  });

  assert.deepEqual(registro.update, { assuntos: [], padrao: false, responsavel_id: null });
});

test("criar sem os campos opcionais deixa o default da tabela trabalhar", async () => {
  const { sb, registro } = sbFalso();
  await salvarFrente(sb, EMPRESA, { nome: "Geral" });

  assert.deepEqual(registro.insert, { cliente_id: EMPRESA, nome: "Geral" });
  assert.equal(registro.update, null, "criar não é editar");
});

test("editar sem nada para mudar é recusado em vez de gravar vazio", async () => {
  const { sb, registro } = sbFalso();
  await assert.rejects(
    () => salvarFrente(sb, EMPRESA, { id: "f1" }),
    /nada para mudar/i,
  );
  assert.equal(registro.update, null, "nada foi gravado");
});

test("criar sem nome continua sendo erro", async () => {
  const { sb } = sbFalso();
  await assert.rejects(() => salvarFrente(sb, EMPRESA, {}), /precisa de um nome/i);
  await assert.rejects(() => salvarFrente(sb, EMPRESA, { nome: "   " }), /precisa de um nome/i);
});

// ---------------------------------------------------------------------------
// 6. a consulta de responsável e as mensagens de erro

test("a consulta de responsável filtra pela empresa autenticada", async () => {
  const { sb, registro } = sbFalso({ atendente: { id: "a1", ativo: true, nome: "Lia" } });
  await salvarFrente(sb, EMPRESA, { id: "f1", responsavel_id: "a1" });

  const porEmpresa = registro.filtros.filter(([c, v]) => c === "cliente_id" && v === EMPRESA);
  assert.ok(
    porEmpresa.length >= 1,
    "sem este filtro, acertar um id de outra empresa já conta que ele existe",
  );
  assert.ok(registro.filtros.some(([c, v]) => c === "id" && v === "a1"));
});

test("responsável de outra empresa e id inexistente dão a mesma resposta", async () => {
  // O oráculo fechado. Com o filtro por empresa na consulta, os dois casos
  // chegam como "não encontrei", e quem está testando ids não aprende nada.
  // Mesma ideia de `autenticarAtendente`, que não diz se errou email ou senha.
  for (const atendente of [null, undefined]) {
    const { sb } = sbFalso({ atendente });
    await assert.rejects(
      () => salvarFrente(sb, EMPRESA, { id: "f1", responsavel_id: "a9" }),
      /não encontrado nesta empresa/i,
    );
  }
});

test("responsável desligado continua recusado, com o nome na mensagem", async () => {
  const { sb } = sbFalso({ atendente: { id: "a1", ativo: false, nome: "Lia" } });
  await assert.rejects(
    () => salvarFrente(sb, EMPRESA, { id: "f1", responsavel_id: "a1" }),
    /Lia está desligado/i,
  );
});

test("erro do Postgres não chega ao navegador, e vai inteiro para o log", async () => {
  const cru = {
    code: "42P01",
    message: 'relation "frentes_secreta" does not exist',
    details: "detalhe interno que não é da conta de ninguém",
    hint: "dica interna",
  };
  const { sb } = sbFalso({ erro: cru });
  const { erro, log } = await semLog(
    () => salvarFrente(sb, EMPRESA, { id: "f1", nome: "Vendas" }),
  );

  assert.ok(erro, "tinha que falhar");
  assert.match(erro.message, /registrado no servidor/i);
  for (const vazamento of ["frentes_secreta", "42P01", "detalhe interno", "dica interna"]) {
    assert.ok(
      !erro.message.includes(vazamento),
      `"${vazamento}" não pode sair na mensagem da tela`,
    );
  }

  const logado = JSON.stringify(log);
  for (const guardado of ["frentes_secreta", "42P01", "detalhe interno", "dica interna"]) {
    assert.ok(logado.includes(guardado), `"${guardado}" tinha que ficar no log`);
  }
});

test("as travas de integridade continuam virando frase de gente", async () => {
  const casos = [
    ["duplicate key value violates unique constraint \"frentes_nome_idx\"", /ativa com esse nome/i],
    ["duplicate key value violates unique constraint \"frentes_padrao_idx\"", /frente padrão nesta empresa/i],
    ['violates foreign key constraint "frentes_responsavel_mesma_empresa"', /de outra empresa/i],
    ['o assunto ja pertence a frente "Vendas" nesta empresa', /já é da frente "Vendas"/i],
  ];

  for (const [mensagem, esperado] of casos) {
    const { sb } = sbFalso({ erro: { message: mensagem, code: "23505" } });
    const { erro } = await semLog(
      () => salvarFrente(sb, EMPRESA, { id: "f1", nome: "Vendas" }),
    );
    assert.match(erro.message, esperado, mensagem);
    assert.ok(
      !erro.message.includes("constraint"),
      "a frase não pode carregar o vocabulário do Postgres",
    );
  }
});

// ---------------------------------------------------------------------------
// 7. nada disso mexeu na Etapa 0 nem no esquema de produção

test("as correções não mudaram nenhuma estrutura da Etapa 0", async () => {
  const pg = await bancoLimpo();

  const esperadas = [
    "carimbar_envio_status", "concluir_envio", "disparo_envio_guarda",
    "disparo_envio_transicao_ok", "encerrar_reserva", "expirar_enviando",
    "marcar_enviando", "recuperar_reservas", "reservar_envios",
  ];
  const funcoes = await pg.query(`
    select proname from pg_proc p join pg_namespace n on n.oid = p.pronamespace
     where n.nspname = 'public' and proname = any($1) order by proname
  `, [esperadas]);
  assert.deepEqual(
    funcoes.rows.map((r) => r.proname), esperadas,
    "as nove funções da 032 continuam todas lá",
  );

  const estados = await pg.query(`
    select pg_get_constraintdef(oid) as def from pg_constraint
     where conname = 'disparo_envios_estado_check'
  `);
  for (const estado of ["reservado", "enviando", "desconhecido"]) {
    assert.match(estados.rows[0].def, new RegExp(estado), `${estado} continua no check`);
  }
});

test("a 033 continua sem escrever em linha nenhuma que já existia", async () => {
  const pg = new PGlite();
  try {
    await pg.exec(`
      create table clientes (id uuid primary key default gen_random_uuid(),
        nome text not null, slug text not null unique, modulos jsonb not null default '{}');
      create table atendentes (id uuid primary key default gen_random_uuid(),
        cliente_id uuid not null references clientes(id) on delete cascade,
        nome text not null, ativo boolean not null default true, assuntos text[] not null default '{}');
      create table disparos (id uuid primary key default gen_random_uuid(),
        cliente_id uuid not null references clientes(id) on delete cascade, nome text not null);
    `);
    const { rows: [c] } = await pg.query(
      "insert into clientes (nome, slug) values ('X', 'x') returning id",
    );
    await pg.query("insert into atendentes (cliente_id, nome) values ($1, 'Lia')", [c.id]);
    await pg.query("insert into disparos (cliente_id, nome) values ($1, 'Campanha velha')", [c.id]);

    const antes = await pg.query("select id, nome, ativo, assuntos from atendentes");
    await pg.exec(sql("033_frentes.sql"));

    const depois = await pg.query("select id, nome, ativo, assuntos from atendentes");
    assert.deepEqual(depois.rows, antes.rows, "atendentes intacta");

    const campanha = await pg.query("select nome, frente_id from disparos");
    assert.equal(campanha.rows[0].frente_id, null, "campanha anterior fica sem frente");
    assert.equal(campanha.rows[0].nome, "Campanha velha");
  } finally {
    await pg.close();
  }
});
