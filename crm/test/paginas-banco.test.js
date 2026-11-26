// As travas da migração 045, contra um Postgres de verdade.
//
// São travas de BANCO, e por isso o teste é de banco: PGlite é o PostgreSQL
// compilado para WASM, lendo o MESMO arquivo sql/045_paginas.sql que vai para
// produção. Um dublê em JavaScript não prova nada sobre um check, um unique ou
// uma trigger, porque não é ele que vai recusar a gravação lá.
//
// Uma instância só, com subtestes em ordem, porque cada PGlite é um Postgres
// inteiro em WASM e meia dúzia deles estoura a memória do Node. O arquivo roda
// com --test-concurrency=1, como o resto da suíte.

import test from "node:test";
import assert from "node:assert/strict";
import { bancoPaginas, reverter045, reverter046, tentar } from "./banco.js";

test("a migração 045 e as travas do compositor", async (t) => {
  const pg = await bancoPaginas();

  const { rows: [cliente] } = await pg.query(
    "insert into clientes (nome, slug) values ('Ousadia', 'ousadia-045') returning id",
  );
  const { rows: [outro] } = await pg.query(
    "insert into clientes (nome, slug) values ('Massabor', 'massabor-045') returning id",
  );

  const criarPagina = async (clienteId, slug) => {
    const { rows } = await pg.query(
      "insert into paginas (cliente_id, slug, titulo) values ($1, $2, $3) returning id",
      [clienteId, slug, slug],
    );
    return rows[0].id;
  };

  let pagina;
  let paginaDoOutro;

  await t.test("as duas tabelas e a de domínios nascem com RLS ligada", async () => {
    const { rows } = await pg.query(`
      select c.relname, c.relrowsecurity, count(p.polname) as policies
      from pg_class c
      left join pg_policy p on p.polrelid = c.oid
      where c.relname in ('paginas', 'pagina_versoes', 'pagina_dominios')
      group by c.relname, c.relrowsecurity
      order by c.relname
    `);

    assert.equal(rows.length, 3);
    for (const linha of rows) {
      assert.equal(linha.relrowsecurity, true, `${linha.relname} sem RLS`);
      // Nenhuma policy é o desenho: só a service_role entra, e ela ignora RLS.
      // Uma policy aqui abriria a tabela para a chave anon do navegador.
      assert.equal(Number(linha.policies), 0, `${linha.relname} ganhou policy`);
    }
  });

  await t.test("o apelido é único no sistema inteiro, não por cliente", async () => {
    pagina = await criarPagina(cliente.id, "oferta-novembro");
    paginaDoOutro = await criarPagina(outro.id, "outra-oferta");

    const choque = await tentar(
      pg,
      "insert into paginas (cliente_id, slug, titulo) values ($1, 'oferta-novembro', 'x')",
      [outro.id],
    );
    assert.match(choque.erro || "", /paginas_slug/,
      "/p/<slug> não tem onde carregar de qual cliente a página é");
  });

  await t.test("apelido que não cabe numa URL é recusado pelo banco", async () => {
    for (const ruim of ["Oferta", "-oferta", "oferta-", "oferta/nova", "oferta nova", ""]) {
      const r = await tentar(
        pg,
        "insert into paginas (cliente_id, slug, titulo) values ($1, $2, 'x')",
        [cliente.id, ruim],
      );
      assert.match(r.erro || "", /paginas_slug_formato/, `"${ruim}" entrou e não devia`);
    }
  });

  await t.test("o número da versão sai do banco, e é por página", async () => {
    const inserir = async (paginaId, html) => {
      const { rows } = await pg.query(
        `insert into pagina_versoes (pagina_id, html, impressao, aprovada_em)
         values ($1, $2, 'sha256-x', now()) returning numero`,
        [paginaId, html],
      );
      return rows[0].numero;
    };

    assert.equal(await inserir(pagina, "<p>1</p>"), 1);
    assert.equal(await inserir(pagina, "<p>2</p>"), 2);
    assert.equal(await inserir(pagina, "<p>3</p>"), 3);
    // Página nova começa do 1: o número é da página, não do sistema.
    assert.equal(await inserir(paginaDoOutro, "<p>1</p>"), 1);

    const repetido = await tentar(
      pg,
      "insert into pagina_versoes (pagina_id, numero, impressao) values ($1, 2, 'sha256-y')",
      [pagina],
    );
    assert.ok(repetido.erro, "duas versões com o mesmo número na mesma página");
  });

  await t.test("publicação é tudo ou nada", async () => {
    const { rows: [v] } = await pg.query(
      "select id from pagina_versoes where pagina_id = $1 and numero = 1", [pagina],
    );

    const meia = await tentar(
      pg, "update paginas set versao_publicada_id = $1 where id = $2", [v.id, pagina],
    );
    assert.match(meia.erro || "", /paginas_publicacao_completa/,
      "versão apontada sem bytes servidos é página branca no ar");

    const inteira = await tentar(
      pg,
      `update paginas set versao_publicada_id = $1, publicado_html = '<p>no ar</p>',
              publicada_em = now() where id = $2`,
      [v.id, pagina],
    );
    assert.ok(inteira.ok, inteira.erro);
  });

  await t.test("a versão que está no ar não sai do histórico", async () => {
    const { rows: [p] } = await pg.query(
      "select versao_publicada_id from paginas where id = $1", [pagina],
    );

    const noAr = await tentar(pg, "delete from pagina_versoes where id = $1", [p.versao_publicada_id]);
    assert.match(noAr.erro || "", /paginas_versao_publicada_fk/,
      "apagar a versão no ar deixaria a página servindo bytes que ninguém consegue reproduzir");

    const velha = await tentar(
      pg, "delete from pagina_versoes where pagina_id = $1 and numero = 2", [pagina],
    );
    assert.ok(velha.ok, "versão antiga que não está no ar pode ser apagada");
  });

  await t.test("o domínio é único, e guardado como o Host chega", async () => {
    await pg.query(
      "insert into pagina_dominios (cliente_id, pagina_id, dominio) values ($1, $2, 'cliente-a.com.br')",
      [cliente.id, pagina],
    );

    const choque = await tentar(
      pg,
      "insert into pagina_dominios (cliente_id, pagina_id, dominio) values ($1, $2, 'cliente-a.com.br')",
      [outro.id, paginaDoOutro],
    );
    assert.match(choque.erro || "", /pagina_dominios_dominio/,
      "dois clientes com o mesmo domínio não é conflito para resolver na visita, é erro de cadastro");

    for (const ruim of ["Cliente-A.com.br", "cliente-a.com.br/landing", "localhost", "https://cliente-a.com.br", "cliente-a.com.br:443"]) {
      const r = await tentar(
        pg,
        "insert into pagina_dominios (cliente_id, pagina_id, dominio) values ($1, $2, $3)",
        [cliente.id, pagina, ruim],
      );
      assert.match(r.erro || "", /pagina_dominios_formato/, `"${ruim}" entrou e não devia`);
    }

    const estado = await tentar(
      pg,
      "insert into pagina_dominios (cliente_id, pagina_id, dominio, estado) values ($1, $2, 'b.com', 'quase')",
      [cliente.id, pagina],
    );
    assert.match(estado.erro || "", /pagina_dominios_estado_check/);
  });

  await t.test("apagar a página leva versões e domínios junto", async () => {
    // A publicação tem que ser desfeita primeiro, por causa do `restrict`: é
    // exatamente o que a rota de apagar faz antes de apagar.
    await pg.query(
      `update paginas set versao_publicada_id = null, publicado_html = null, publicada_em = null
       where id = $1`, [pagina],
    );
    await pg.query("delete from paginas where id = $1", [pagina]);

    const { rows: versoes } = await pg.query(
      "select count(*)::int as n from pagina_versoes where pagina_id = $1", [pagina],
    );
    const { rows: dominios } = await pg.query(
      "select count(*)::int as n from pagina_dominios where pagina_id = $1", [pagina],
    );
    assert.equal(versoes[0].n, 0);
    assert.equal(dominios[0].n, 0);
  });

  await t.test("a soma de visita e lead acontece no banco, e por dia", async () => {
    const nova = await criarPagina(cliente.id, "medida");

    await pg.query("select somar_evento_pagina($1, 'visita')", [nova]);
    await pg.query("select somar_evento_pagina($1, 'visita')", [nova]);
    await pg.query("select somar_evento_pagina($1, 'lead')", [nova]);

    const { rows } = await pg.query(
      "select visitas, leads from pagina_eventos_dia where pagina_id = $1", [nova],
    );
    assert.equal(rows.length, 1, "o mesmo dia soma na mesma linha, não cria outra");
    assert.equal(rows[0].visitas, 2);
    assert.equal(rows[0].leads, 1);

    // Duas visitas no mesmo instante com a conta feita em JavaScript
    // perderiam uma. É por isso que quem soma é o `on conflict`.
    const desconhecido = await tentar(pg, "select somar_evento_pagina($1, 'compra')", [nova]);
    assert.match(desconhecido.erro || "", /tipo de evento desconhecido/,
      "evento que ninguém definiu vira número que ninguém sabe explicar");

    await pg.query("delete from paginas where id = $1", [nova]);
    const { rows: sobrou } = await pg.query(
      "select count(*)::int as n from pagina_eventos_dia where pagina_id = $1", [nova],
    );
    assert.equal(sobrou[0].n, 0, "apagar a página leva a medição junto");
  });

  await t.test("arquivar é uma data, e não um apagar", async () => {
    const nova = await criarPagina(cliente.id, "arquivavel");
    await pg.query("update paginas set arquivada_em = now() where id = $1", [nova]);

    const { rows } = await pg.query(
      "select arquivada_em from paginas where id = $1", [nova],
    );
    assert.ok(rows[0].arquivada_em, "a linha continua inteira, só marcada");
    await pg.query("delete from paginas where id = $1", [nova]);
  });

  await t.test("a reversão não deixa rastro", async () => {
    // A 046 sai primeiro: a tabela de medição aponta para `paginas`, e o
    // Postgres recusa derrubar `paginas` enquanto ela existir. A ordem da
    // reversão é a ordem inversa da aplicação, e isto é o que prova.
    await reverter046(pg);
    const { rows: medicao } = await pg.query(`
      select count(*)::int as n from information_schema.tables
      where table_schema = 'public' and table_name = 'pagina_eventos_dia'
    `);
    assert.equal(medicao[0].n, 0);

    const { rows: coluna } = await pg.query(`
      select count(*)::int as n from information_schema.columns
      where table_name = 'paginas' and column_name = 'arquivada_em'
    `);
    assert.equal(coluna[0].n, 0, "coluna órfã é lixo que ninguém encontra depois");

    await reverter045(pg);
    const { rows } = await pg.query(`
      select count(*)::int as n from information_schema.tables
      where table_schema = 'public' and table_name in ('paginas', 'pagina_versoes', 'pagina_dominios')
    `);
    assert.equal(rows[0].n, 0);

    const { rows: funcoes } = await pg.query(
      "select count(*)::int as n from pg_proc where proname = 'pagina_versao_numero'",
    );
    assert.equal(funcoes[0].n, 0, "função órfã no esquema é lixo que ninguém encontra depois");
  });

  await pg.close();
});
