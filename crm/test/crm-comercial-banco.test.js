// Etapa 1: o que o BANCO garante sozinho no CRM comercial.
//
// Estes testes não exercitam código de aplicação de propósito. O que está sob
// prova é a migração 037: as travas que continuam valendo mesmo quando o
// servidor erra, quando alguém escreve SQL na mão ou quando dois pedidos
// chegam juntos. Um dublê em JavaScript não prova nada sobre chave estrangeira
// composta nem sobre índice único: quem recusa é o Postgres.

import test from "node:test";
import assert from "node:assert/strict";

import { bancoComercial, aplicar037, reverter037, duasEmpresas, tentar } from "./banco.js";

/** Um funil com uma etapa aberta, que é o mínimo para existir um negócio. */
async function funilCom(pg, empresa) {
  const { rows: [funil] } = await pg.query(
    "insert into crm_funis (cliente_id, nome) values ($1, 'Vendas') returning id", [empresa]);
  const { rows: [etapa] } = await pg.query(
    "insert into crm_etapas (cliente_id, funil_id, nome) values ($1, $2, 'Novos') returning id",
    [empresa, funil.id]);
  return { funil: funil.id, etapa: etapa.id };
}

async function negocioEm(pg, empresa, titulo = "Negócio") {
  const { funil, etapa } = await funilCom(pg, empresa);
  const { rows: [n] } = await pg.query(
    `insert into crm_negocios (cliente_id, funil_id, etapa_id, titulo)
     values ($1, $2, $3, $4) returning id`, [empresa, funil, etapa, titulo]);
  return n.id;
}

async function contatoEm(pg, empresa, nome = "Fulana") {
  const { rows: [c] } = await pg.query(
    "insert into contatos (cliente_id, nome, telefone_e164) values ($1, $2, '+5593999990000') returning id",
    [empresa, nome]);
  return c.id;
}

// ---------------------------------------------------------------------------
// A migração em si

test("a 037 roda duas vezes seguidas sem quebrar", async () => {
  // Migração que só roda uma vez é migração que trava o deploy quando alguém
  // reexecuta por engano, e reexecutar por engano acontece.
  const pg = await bancoComercial();
  try {
    const r = await tentar(pg, "select 1");
    assert.ok(r.ok);
    await aplicar037(pg); // segunda vez
    const { rows } = await pg.query("select count(*)::int as n from crm_tarefas");
    assert.equal(rows[0].n, 0, "a segunda execução não pode apagar nada");
  } finally { await pg.close(); }
});

test("a 037 não perde dado que já existia", async () => {
  // Contato e negócio gravados ANTES da migração continuam inteiros depois
  // dela, com os campos novos no padrão.
  const pg = await bancoComercial({ ate: "027" });
  try {
    const e = await duasEmpresas(pg);
    const contato = await contatoEm(pg, e.empresa_a, "Quem já estava aqui");
    const negocio = await negocioEm(pg, e.empresa_a, "Venda antiga");

    await aplicar037(pg);

    const { rows: [c] } = await pg.query("select nome, empresa, campos, score from contatos where id = $1", [contato]);
    assert.equal(c.nome, "Quem já estava aqui");
    assert.equal(c.empresa, null);
    assert.deepEqual(c.campos, {});
    assert.equal(c.score, null, "contato antigo fica sem score, não com zero");

    const { rows: [n] } = await pg.query(
      "select titulo, prioridade, previsao_em, valor_fechado from crm_negocios where id = $1", [negocio]);
    assert.equal(n.titulo, "Venda antiga");
    assert.equal(n.prioridade, "normal", "negócio antigo nasce com prioridade normal");
    assert.equal(n.previsao_em, null);
    assert.equal(n.valor_fechado, null, "sem venda registrada, nada de receita");
  } finally { await pg.close(); }
});

test("a reversão devolve o banco ao formato anterior", async () => {
  const pg = await bancoComercial();
  try {
    const e = await duasEmpresas(pg);
    const contato = await contatoEm(pg, e.empresa_a);
    await reverter037(pg);

    const { rows } = await pg.query(`
      select count(*)::int as n from information_schema.tables
       where table_schema = 'public'
         and table_name in ('crm_tarefas','crm_notas','crm_automacoes',
                            'crm_automacao_execucoes','crm_ia_config','crm_ia_sugestoes')`);
    assert.equal(rows[0].n, 0, "as tabelas novas têm que sumir");

    const { rows: colunas } = await pg.query(`
      select count(*)::int as n from information_schema.columns
       where table_name = 'contatos' and column_name in ('empresa','documento','campos','score')`);
    assert.equal(colunas[0].n, 0, "as colunas novas têm que sumir");

    const { rows: [c] } = await pg.query("select nome from contatos where id = $1", [contato]);
    assert.ok(c, "o contato continua lá depois da reversão");
  } finally { await pg.close(); }
});

// ---------------------------------------------------------------------------
// Isolamento entre empresas: a trava é do banco

test("tarefa não aponta para negócio de outra empresa", async () => {
  // Este é o teste mais importante do arquivo. O id é único no mundo, então um
  // bug de código que troque o cliente_id gravaria a tarefa da empresa A no
  // negócio da empresa B sem nenhum erro. A chave composta recusa.
  const pg = await bancoComercial();
  try {
    const e = await duasEmpresas(pg);
    const negocioDoB = await negocioEm(pg, e.empresa_b);

    const r = await tentar(pg,
      "insert into crm_tarefas (cliente_id, negocio_id, titulo) values ($1, $2, 'ligar')",
      [e.empresa_a, negocioDoB]);

    assert.ok(r.erro, "o banco tinha que recusar");
    assert.match(r.erro, /crm_tarefas_negocio_mesma_empresa/);
  } finally { await pg.close(); }
});

test("anotação não aponta para contato de outra empresa", async () => {
  const pg = await bancoComercial();
  try {
    const e = await duasEmpresas(pg);
    const contatoDoB = await contatoEm(pg, e.empresa_b);

    const r = await tentar(pg,
      "insert into crm_notas (cliente_id, contato_id, texto) values ($1, $2, 'oi')",
      [e.empresa_a, contatoDoB]);

    assert.ok(r.erro);
    assert.match(r.erro, /crm_notas_contato_mesma_empresa/);
  } finally { await pg.close(); }
});

test("sugestão de IA não aponta para negócio de outra empresa", async () => {
  const pg = await bancoComercial();
  try {
    const e = await duasEmpresas(pg);
    const negocioDoB = await negocioEm(pg, e.empresa_b);

    const r = await tentar(pg,
      "insert into crm_ia_sugestoes (cliente_id, negocio_id, tipo) values ($1, $2, 'score')",
      [e.empresa_a, negocioDoB]);

    assert.ok(r.erro);
    assert.match(r.erro, /crm_ia_sugestoes_negocio_mesma_empresa/);
  } finally { await pg.close(); }
});

test("na mesma empresa, tudo isso passa", async () => {
  const pg = await bancoComercial();
  try {
    const e = await duasEmpresas(pg);
    const negocio = await negocioEm(pg, e.empresa_a);
    const contato = await contatoEm(pg, e.empresa_a);

    assert.ok((await tentar(pg,
      "insert into crm_tarefas (cliente_id, negocio_id, contato_id, titulo) values ($1,$2,$3,'ligar')",
      [e.empresa_a, negocio, contato])).ok);
    assert.ok((await tentar(pg,
      "insert into crm_notas (cliente_id, negocio_id, texto) values ($1,$2,'falei com ela')",
      [e.empresa_a, negocio])).ok);
    assert.ok((await tentar(pg,
      "insert into crm_ia_sugestoes (cliente_id, negocio_id, tipo) values ($1,$2,'resumo')",
      [e.empresa_a, negocio])).ok);
  } finally { await pg.close(); }
});

test("apagar o negócio leva junto tarefas, anotações e sugestões", async () => {
  // Sem o cascade, apagar um negócio deixaria tarefa órfã aparecendo na
  // agenda de alguém apontando para coisa nenhuma.
  const pg = await bancoComercial();
  try {
    const e = await duasEmpresas(pg);
    const negocio = await negocioEm(pg, e.empresa_a);
    await pg.query("insert into crm_tarefas (cliente_id, negocio_id, titulo) values ($1,$2,'x')", [e.empresa_a, negocio]);
    await pg.query("insert into crm_notas (cliente_id, negocio_id, texto) values ($1,$2,'x')", [e.empresa_a, negocio]);

    await pg.query("delete from crm_negocios where id = $1", [negocio]);

    const { rows } = await pg.query(`
      select (select count(*)::int from crm_tarefas where negocio_id = $1) as t,
             (select count(*)::int from crm_notas   where negocio_id = $1) as n`, [negocio]);
    assert.deepEqual(rows[0], { t: 0, n: 0 });
  } finally { await pg.close(); }
});

// ---------------------------------------------------------------------------
// As regras de conteúdo

test("tarefa sem alvo não existe", async () => {
  const pg = await bancoComercial();
  try {
    const e = await duasEmpresas(pg);
    const r = await tentar(pg,
      "insert into crm_tarefas (cliente_id, titulo) values ($1, 'solta no mundo')", [e.empresa_a]);
    assert.ok(r.erro);
    assert.match(r.erro, /crm_tarefas_tem_alvo/);
  } finally { await pg.close(); }
});

test("tarefa e anotação sem texto não existem", async () => {
  const pg = await bancoComercial();
  try {
    const e = await duasEmpresas(pg);
    const negocio = await negocioEm(pg, e.empresa_a);
    const vazia = await tentar(pg,
      "insert into crm_tarefas (cliente_id, negocio_id, titulo) values ($1,$2,'   ')", [e.empresa_a, negocio]);
    assert.match(vazia.erro, /titulo_nao_vazio/);
    const nota = await tentar(pg,
      "insert into crm_notas (cliente_id, negocio_id, texto) values ($1,$2,'  ')", [e.empresa_a, negocio]);
    assert.match(nota.erro, /texto_nao_vazio/);
  } finally { await pg.close(); }
});

test("prioridade só aceita os quatro valores que a tela mostra", async () => {
  const pg = await bancoComercial();
  try {
    const e = await duasEmpresas(pg);
    const negocio = await negocioEm(pg, e.empresa_a);
    const r = await tentar(pg, "update crm_negocios set prioridade = 'altíssima' where id = $1", [negocio]);
    assert.match(r.erro, /crm_negocios_prioridade_check/);
    assert.ok((await tentar(pg, "update crm_negocios set prioridade = 'urgente' where id = $1", [negocio])).ok);
  } finally { await pg.close(); }
});

test("gatilho de automação fora da lista não entra", async () => {
  // A lista de gatilhos é contrato entre a tela, o motor e o banco. Um gatilho
  // inventado gravaria uma automação que nunca dispara, e ninguém descobriria
  // por que: ela aparece na tela, ligada, sem fazer nada.
  const pg = await bancoComercial();
  try {
    const e = await duasEmpresas(pg);
    const r = await tentar(pg,
      "insert into crm_automacoes (cliente_id, nome, gatilho) values ($1,'x','lua_cheia')", [e.empresa_a]);
    assert.match(r.erro, /crm_automacoes_gatilho_check/);
  } finally { await pg.close(); }
});

test("ação de automação tem que ser lista", async () => {
  const pg = await bancoComercial();
  try {
    const e = await duasEmpresas(pg);
    const r = await tentar(pg,
      `insert into crm_automacoes (cliente_id, nome, gatilho, acoes)
       values ($1,'x','negocio_novo','{"tipo":"tarefa"}'::jsonb)`, [e.empresa_a]);
    assert.match(r.erro, /acoes_lista/);
  } finally { await pg.close(); }
});

test("a mesma execução de automação não grava duas vezes", async () => {
  // É assim que duas requisições simultâneas deixam de executar a mesma
  // automação duas vezes: a segunda bate no índice único, não na memória de
  // quem está rodando.
  const pg = await bancoComercial();
  try {
    const e = await duasEmpresas(pg);
    const { rows: [a] } = await pg.query(
      "insert into crm_automacoes (cliente_id, nome, gatilho) values ($1,'Boas-vindas','negocio_novo') returning id",
      [e.empresa_a]);

    const primeira = await tentar(pg,
      "insert into crm_automacao_execucoes (cliente_id, automacao_id, chave) values ($1,$2,'negocio_novo:abc')",
      [e.empresa_a, a.id]);
    const segunda = await tentar(pg,
      "insert into crm_automacao_execucoes (cliente_id, automacao_id, chave) values ($1,$2,'negocio_novo:abc')",
      [e.empresa_a, a.id]);

    assert.ok(primeira.ok);
    assert.ok(segunda.erro, "a segunda tem que ser recusada");
    assert.match(segunda.erro, /duplicate key|unique/i);
  } finally { await pg.close(); }
});

test("limite de dias da etapa não aceita zero nem negativo", async () => {
  const pg = await bancoComercial();
  try {
    const e = await duasEmpresas(pg);
    const { etapa } = await funilCom(pg, e.empresa_a);
    assert.match((await tentar(pg, "update crm_etapas set limite_dias = 0 where id = $1", [etapa])).erro,
      /crm_etapas_limite_check/);
    assert.ok((await tentar(pg, "update crm_etapas set limite_dias = 3 where id = $1", [etapa])).ok);
    assert.ok((await tentar(pg, "update crm_etapas set limite_dias = null where id = $1", [etapa])).ok,
      "nulo é 'sem prazo', que é o comportamento de hoje");
  } finally { await pg.close(); }
});

// ---------------------------------------------------------------------------
// Segurança

test("toda tabela nova nasce com RLS ligada e sem política", async () => {
  // Mesmo desenho do resto do CRM: ninguém entra pelo cliente anônimo, só
  // o servidor com a chave de serviço. Uma tabela nova sem RLS seria a única
  // porta aberta da casa.
  const pg = await bancoComercial();
  try {
    const { rows } = await pg.query(`
      select c.relname, c.relrowsecurity as rls,
             (select count(*)::int from pg_policy p where p.polrelid = c.oid) as politicas
        from pg_class c join pg_namespace n on n.oid = c.relnamespace
       where n.nspname = 'public'
         and c.relname in ('crm_tarefas','crm_notas','crm_automacoes',
                           'crm_automacao_execucoes','crm_ia_config','crm_ia_sugestoes')
       order by c.relname`);

    assert.equal(rows.length, 6, "faltou tabela");
    for (const t of rows) {
      assert.equal(t.rls, true, `${t.relname} está sem RLS`);
      assert.equal(t.politicas, 0, `${t.relname} ganhou política: o acesso é só pelo servidor`);
    }
  } finally { await pg.close(); }
});

test("as consultas que a tela faz todo dia têm índice", async () => {
  // Sem índice, o quadro de uma empresa com dez mil negócios varre a tabela a
  // cada abertura. Isso não aparece em teste funcional nenhum: aparece seis
  // meses depois, como lentidão que ninguém sabe explicar.
  const pg = await bancoComercial();
  try {
    const { rows } = await pg.query(
      "select indexname from pg_indexes where schemaname = 'public' and tablename like 'crm_%' or tablename = 'contatos'");
    const nomes = rows.map((r) => r.indexname);
    for (const esperado of [
      "crm_tarefas_agenda", "crm_tarefas_negocio", "crm_notas_negocio",
      "crm_automacoes_gatilho", "crm_negocios_previsao", "crm_negocios_parado",
      "contatos_responsavel", "contatos_documento",
    ]) {
      assert.ok(nomes.includes(esperado), `faltou o índice ${esperado}`);
    }
  } finally { await pg.close(); }
});

test("o quadro de uma empresa com cinco mil negócios continua respondendo", async () => {
  // Carga de verdade contra Postgres de verdade, com uma empresa vizinha do
  // mesmo tamanho no banco. O que está em prova é que a empresa grande abre o
  // quadro em tempo de tela, que a vizinha não entra junto, e que as buscas
  // estreitas do painel comercial usam índice em vez de varrer tudo.
  const pg = await bancoComercial();
  try {
    const { empresa_a: a, empresa_b: b } = await duasEmpresas(pg);
    const { funil, etapa } = await funilCom(pg, a);
    const { funil: funilB, etapa: etapaB } = await funilCom(pg, b);

    await pg.query(`
      insert into crm_negocios (cliente_id, funil_id, etapa_id, titulo, posicao, valor, situacao, previsao_em)
      select $1, $2, $3, 'Lead ' || g, g, (g % 400)::numeric, 'aberto',
             case when g % 250 = 0 then now() - interval '2 days' else null end
        from generate_series(1, 5000) g`, [a, funil, etapa]);
    await pg.query(`
      insert into crm_negocios (cliente_id, funil_id, etapa_id, titulo, posicao, situacao)
      select $1, $2, $3, 'Da vizinha ' || g, g, 'aberto'
        from generate_series(1, 5000) g`, [b, funilB, etapaB]);
    await pg.query("analyze crm_negocios");

    // 1. O quadro inteiro: tempo de tela, e só os cartões da empresa certa.
    const antes = Date.now();
    const { rows } = await pg.query(
      `select id, titulo, etapa_id, posicao, valor from crm_negocios
        where cliente_id = $1 and funil_id = $2
        order by posicao limit 1000`, [a, funil]);
    const levou = Date.now() - antes;

    assert.equal(rows.length, 1000, "o quadro trunca em mil cartões de propósito");
    assert.ok(rows.every((n) => n.titulo.startsWith("Lead ")), "entrou cartão da outra empresa");
    // Folga grande de propósito: o número que importa é a ordem de grandeza,
    // não a máquina de quem roda o teste.
    assert.ok(levou < 1500, `o quadro levou ${levou}ms com dez mil negócios no banco`);

    // 2. "Só os atrasados": vinte cartões no meio de dez mil. É aqui que
    //    varrer a tabela apareceria, e é para isto que existe o índice da 037.
    const atrasados = `select id from crm_negocios
                        where cliente_id = $1 and situacao = 'aberto' and previsao_em < now()`;
    const { rows: plano } = await pg.query(`explain (format text) ${atrasados}`, [a]);
    const texto = plano.map((r) => r["QUERY PLAN"]).join(" / ");
    assert.ok(/Index|Bitmap/.test(texto), `a busca de atrasados está varrendo a tabela: ${texto}`);

    const { rows: vencidos } = await pg.query(atrasados, [a]);
    assert.equal(vencidos.length, 20);
  } finally { await pg.close(); }
});

test("score em branco é nulo, e fora de 0 a 100 o banco recusa", async () => {
  // Zero não serve de "sem score": zero é uma avaliação, e a tela precisa
  // distinguir "ninguém olhou" de "olhei e não vale nada". Se a coluna fosse
  // not null default 0, salvar a ficha com o campo vazio quebraria em
  // produção, porque o servidor manda nulo de propósito.
  const pg = await bancoComercial();
  try {
    const { empresa_a: a } = await duasEmpresas(pg);
    const contato = await contatoEm(pg, a, "Sem score");

    const { rows: [linha] } = await pg.query("select score from contatos where id = $1", [contato]);
    assert.equal(linha.score, null, "contato novo nasce sem score, não com zero");

    const zero = await tentar(pg, "update contatos set score = 0 where id = $1", [contato]);
    assert.ok(zero.ok, "zero é avaliação válida");

    const alto = await tentar(pg, "update contatos set score = 140 where id = $1", [contato]);
    assert.ok(alto.erro, "score acima de 100 não existe");
    const negativo = await tentar(pg, "update contatos set score = -1 where id = $1", [contato]);
    assert.ok(negativo.erro, "score negativo não existe");

    const negocio = await negocioEm(pg, a, "Sem score");
    const fora = await tentar(pg, "update crm_negocios set score = 101 where id = $1", [negocio]);
    assert.ok(fora.erro, "o negócio tem o mesmo limite do contato");
  } finally { await pg.close(); }
});
