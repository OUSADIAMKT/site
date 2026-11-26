// A etiqueta que a IA escreve, e a lista que ela tem que respeitar.
//
// O problema que isto trava: em 24/11/2026 a empresa tinha 48 etiquetas
// distintas em `conversas`, e quatro delas eram a mesma campanha escrita de
// quatro jeitos ("Black da Mentoria OM" 44, "black da mentoria om" 21, "Black
// Mentoria OM" 1, "black" 1). Filtrar por uma perdia as outras.
//
// Dois níveis de teste, porque são dois riscos diferentes:
//   - `canonizar`, no código, impede que volte a sujar;
//   - a migração 041, no Postgres de verdade, limpa o que já está lá. A
//     reescrita é um UPDATE que roda uma vez em produção; errar nela é errar
//     calado em 85 conversas.

import test from "node:test";
import assert from "node:assert/strict";

import { chave, canonizar } from "../api/_etiquetas.js";
import { bancoAte, aplicar041, reverter041 } from "./banco.js";

// ---------------------------------------------------------------------------
// Um Supabase de mentira com a lista da empresa dentro.

function bancoDeMentira(linhas) {
  const inseridas = [];
  const sb = {
    inseridas,
    from(tabela) {
      assert.equal(tabela, "etiquetas_conhecidas");
      return {
        select: () => ({ eq: async () => ({ data: linhas, error: null }) }),
        insert: async (novas) => {
          inseridas.push(...novas);
          linhas.push(...novas.map((n) => ({ ...n, apelidos: [] })));
          return { error: null };
        },
      };
    },
  };
  return sb;
}

const LISTA = () => [
  { etiqueta: "matricula", chave: "matricula", apelidos: ["mentoria om", "interesse matricula", "possivel aluno"] },
  { etiqueta: "lead", chave: "lead", apelidos: ["interesse", "interesse geral", "interesse ativo"] },
  { etiqueta: "agencia", chave: "agencia", apelidos: ["gestao de redes", "trafego pago"] },
  { etiqueta: "veio do disparo", chave: "veio do disparo", apelidos: ["veio de disparo", "chegou do disparo"] },
  { etiqueta: "black da mentoria om", chave: "black da mentoria om", apelidos: ["black mentoria om", "black"] },
  { etiqueta: "revenda", chave: "revenda", apelidos: ["revendedora"] },
];

const OUSADIA = "11111111-1111-1111-1111-111111111111";

// ---------------------------------------------------------------------------
// A chave

test("a chave tira acento, caixa e pontuação", () => {
  assert.equal(chave("Black da Mentoria OM"), "black da mentoria om");
  assert.equal(chave("  REPOSIÇÃO  "), "reposicao");
  assert.equal(chave("gestão_de_redes"), "gestao de redes");
  assert.equal(chave("São Luís"), "sao luis");
  assert.equal(chave("   "), "");
});

// ---------------------------------------------------------------------------
// O que já é conhecido

test("as quatro grafias da campanha viram uma etiqueta só", async () => {
  const sb = bancoDeMentira(LISTA());
  const r = await canonizar(sb, OUSADIA, ["Black da Mentoria OM", "Black Mentoria OM", "black"]);
  assert.deepEqual(r.etiquetas, ["black da mentoria om"]);
  assert.deepEqual(r.novas, []);
  assert.deepEqual(sb.inseridas, [], "não podia ter criado etiqueta nenhuma");
});

test("apelido cai na canônica", async () => {
  const sb = bancoDeMentira(LISTA());
  const r = await canonizar(sb, OUSADIA, ["veio de disparo", "gestao_de_redes", "interesse_matricula"]);
  assert.deepEqual(r.etiquetas.sort(), ["agencia", "matricula", "veio do disparo"]);
});

test("o que já está na conversa também passa pela lista", async () => {
  // Conversa antiga, etiquetada antes da lista existir. Quando a IA mexe nela,
  // o que estava torto sai acertado junto.
  const sb = bancoDeMentira(LISTA());
  const r = await canonizar(sb, OUSADIA, ["revendedora"], ["Black da Mentoria OM", "interesse"]);
  assert.deepEqual(r.etiquetas.sort(), ["black da mentoria om", "lead", "revenda"]);
});

// ---------------------------------------------------------------------------
// O que é parecido, mas não igual

test("sobra de palavra cai na etiqueta mais curta", async () => {
  const sb = bancoDeMentira([
    ...LISTA(),
    { etiqueta: "indicacao", chave: "indicacao", apelidos: [] },
  ]);
  const r = await canonizar(sb, OUSADIA, ["indicação jaqueline massaro"]);
  assert.deepEqual(r.etiquetas, ["indicacao"]);
});

test("palavra a mais no meio não cria etiqueta nova", async () => {
  const sb = bancoDeMentira(LISTA());
  const r = await canonizar(sb, OUSADIA, ["black da mentoria OM 2026"]);
  assert.deepEqual(r.etiquetas, ["black da mentoria om"]);
  assert.deepEqual(sb.inseridas, []);
});

test("erro de digitação em etiqueta longa não cria etiqueta nova", async () => {
  const sb = bancoDeMentira(LISTA());
  const r = await canonizar(sb, OUSADIA, ["veio do disparu"]);
  assert.deepEqual(r.etiquetas, ["veio do disparo"]);
});

test("etiqueta curta e diferente NÃO é tratada como erro de digitação", async () => {
  // "lead" e "leao" diferem por uma letra. Em etiqueta de quatro letras, uma
  // letra é o sentido inteiro, então aqui o certo é criar outra.
  const sb = bancoDeMentira(LISTA());
  const r = await canonizar(sb, OUSADIA, ["leao"]);
  assert.deepEqual(r.etiquetas, ["leao"]);
  assert.equal(sb.inseridas.length, 1);
});

// ---------------------------------------------------------------------------
// O que é novo de verdade

test("etiqueta sem nada parecido nasce na lista, marcada como da IA", async () => {
  const sb = bancoDeMentira(LISTA());
  const r = await canonizar(sb, OUSADIA, ["grávida"]);
  // O acento fica: a chave "gravida" é para comparar, a etiqueta "grávida" é
  // o que a equipe lê no filtro.
  assert.deepEqual(r.etiquetas, ["grávida"]);
  assert.deepEqual(r.novas, ["grávida"]);
  assert.equal(sb.inseridas.length, 1);
  assert.equal(sb.inseridas[0].origem, "ia");
  assert.equal(sb.inseridas[0].cliente_id, OUSADIA);
  assert.equal(sb.inseridas[0].etiqueta, "grávida");
  assert.equal(sb.inseridas[0].chave, "gravida");
});

test("duas grafias da mesma novidade na mesma chamada criam uma linha só", async () => {
  const sb = bancoDeMentira(LISTA());
  const r = await canonizar(sb, OUSADIA, ["Pele Oleosa", "pele oleosa"]);
  assert.deepEqual(r.etiquetas, ["pele oleosa"]);
  assert.equal(sb.inseridas.length, 1);
});

test("o modelo não pode despejar seis etiquetas novas de uma vez", async () => {
  const sb = bancoDeMentira(LISTA());
  const r = await canonizar(sb, OUSADIA, ["aa bb cc", "dd ee ff", "gg hh ii", "jj kk ll"]);
  assert.equal(sb.inseridas.length, 2, "o teto por chamada são duas");
  assert.equal(r.etiquetas.length, 2);
});

test("sem lista no banco, ainda assim normaliza a caixa", async () => {
  // A leitura falhou (tabela fora do ar, cliente sem lista). A ferramenta não
  // pode quebrar por causa disso, e o mínimo continua valendo.
  const sb = {
    from: () => ({
      select: () => ({ eq: async () => ({ data: null, error: { message: "sem tabela" } }) }),
    }),
  };
  const r = await canonizar(sb, OUSADIA, ["  Black  da   Mentoria OM "]);
  assert.deepEqual(r.etiquetas, ["black da mentoria om"]);
});

// ---------------------------------------------------------------------------
// A migração, em Postgres de verdade

test("a 041 funde as grafias e tira o texto livre das conversas", async () => {
  const pg = await bancoAte("031");
  try {
    await pg.exec(`
      insert into clientes (id, nome, slug) values
        ('${OUSADIA}', 'Ousadia Marketing', 'ousadia'),
        ('22222222-2222-2222-2222-222222222222', 'Outra', 'outra');

      insert into conversas (cliente_id, contato, etiquetas) values
        ('${OUSADIA}', '5593900000001', array['Black da Mentoria OM','veio do disparo']),
        ('${OUSADIA}', '5593900000002', array['black da mentoria om','interesse_matricula']),
        ('${OUSADIA}', '5593900000003', array['Black Mentoria OM','São Luís','skincare']),
        ('${OUSADIA}', '5593900000004', array['gestao_de_redes','trafego_pago']),
        ('${OUSADIA}', '5593900000005', array['chegou do disparo','interesse geral','interesse']),
        ('${OUSADIA}', '5593900000006', array[]::text[]),
        ('22222222-2222-2222-2222-222222222222', '5593900000007', array['Black da Mentoria OM']);
    `);

    await aplicar041(pg);

    const ler = async (contato) => {
      const r = await pg.query("select etiquetas from conversas where contato = $1", [contato]);
      return r.rows[0].etiquetas;
    };

    assert.deepEqual(await ler("5593900000001"), ["black da mentoria om", "veio do disparo"]);
    assert.deepEqual(await ler("5593900000002"), ["black da mentoria om", "matricula"]);
    assert.deepEqual(
      await ler("5593900000003"), ["black da mentoria om"],
      "São Luís e skincare eram texto livre de uma conversa só e tinham que sair"
    );
    assert.deepEqual(await ler("5593900000004"), ["agencia"]);
    assert.deepEqual(await ler("5593900000005"), ["lead", "veio do disparo"]);
    assert.deepEqual(await ler("5593900000006"), [], "conversa sem etiqueta continua sem");

    assert.deepEqual(
      await ler("5593900000007"), ["Black da Mentoria OM"],
      "a migração é da empresa: não podia encostar em outro cliente"
    );

    const lista = await pg.query(
      "select count(*)::int as n from etiquetas_conhecidas where cliente_id = $1 and origem = 'lista'",
      [OUSADIA]
    );
    assert.equal(lista.rows[0].n, 18);

    const outra = await pg.query(
      "select count(*)::int as n from etiquetas_conhecidas where cliente_id <> $1", [OUSADIA]
    );
    assert.equal(outra.rows[0].n, 0, "a lista é por cliente; a outra empresa não ganha as 18");

    // Rodar de novo não pode mudar mais nada: a reescrita é idempotente.
    const antes = await pg.query("select contato, etiquetas from conversas order by contato");
    await aplicar041(pg);
    const depois = await pg.query("select contato, etiquetas from conversas order by contato");
    assert.deepEqual(depois.rows, antes.rows);

    await reverter041(pg);
    const sumiu = await pg.query(
      "select to_regclass('public.etiquetas_conhecidas') as t"
    );
    assert.equal(sumiu.rows[0].t, null);
  } finally {
    await pg.close();
  }
});

// ---------------------------------------------------------------------------
// Os dois caminhos que escreviam etiqueta sem passar pela lista
//
// `canonizar` só serve se TODO mundo passar por ela. Em 25/11/2026, uma
// conversa da empresa tinha "Black da Mentoria OM" com maiúscula enquanto a
// lista canônica diz "black da mentoria om". A IA não fez isso: foram duas
// funções que gravavam direto no banco.
//
//   - `marcarAssunto`, no webhook, a cada mensagem de texto que chega. Passava
//     as etiquetas que já existiam por `toLowerCase()`.
//   - `marcarOrigemDisparo` gravava o NOME DA CAMPANHA do jeito que alguém
//     digitou no formulário do disparo. É daqui que vinha a família de
//     duplicadas que a 041 limpou, e ia recriar na próxima campanha.

import { marcarAssunto, assuntoDaConversa } from "../api/_assunto.js";
import { marcarOrigemDisparo } from "../api/_crm.js";

/** Um `sb` de mentira com a lista, as conversas e os envios do disparo. */
function bancoCompleto({ lista = LISTA(), envios = [] } = {}) {
  const gravado = [];
  const sb = {
    gravado,
    from(tabela) {
      if (tabela === "etiquetas_conhecidas") {
        return {
          select: () => ({ eq: async () => ({ data: lista, error: null }) }),
          insert: async (novas) => {
            lista.push(...novas.map((n) => ({ ...n, apelidos: [] })));
            return { error: null };
          },
        };
      }
      if (tabela === "conversas") {
        return {
          update: (linha) => ({ eq: async () => { gravado.push(linha); return { error: null }; } }),
        };
      }
      if (tabela === "disparo_envios") {
        const cadeia = {
          select: () => cadeia, in: () => cadeia, eq: () => cadeia, gte: () => cadeia,
          order: () => cadeia, limit: async () => ({ data: envios, error: null }),
        };
        return cadeia;
      }
      throw new Error(`tabela inesperada no teste: ${tabela}`);
    },
  };
  return sb;
}

test("o assunto etiqueta pela lista, sem rebaixar o que já estava gravado", async () => {
  const sb = bancoCompleto();
  const conversa = {
    id: "c1", cliente_id: OUSADIA,
    // Já canônica. O toLowerCase() de antes não a mudaria porque a canônica da
    // Ousadia é minúscula; numa lista com maiúscula, reescrevia a cada
    // mensagem.
    etiquetas: ["black da mentoria om"],
  };

  const assunto = await marcarAssunto(sb, conversa, "quero saber da próxima turma da mentoria");

  assert.equal(assunto, "matricula");
  const [gravado] = sb.gravado;
  assert.deepEqual(
    [...gravado.etiquetas].sort(),
    ["black da mentoria om", "lead", "matricula"],
    "entram as do assunto e a que já existia continua com a grafia da lista"
  );
});

test("o assunto não grava de novo o que a conversa já tem em outra grafia", async () => {
  const sb = bancoCompleto();
  const conversa = { id: "c1", cliente_id: OUSADIA, etiquetas: ["Matrícula", "Lead"] };

  await marcarAssunto(sb, conversa, "quero saber da próxima turma da mentoria");

  assert.deepEqual(
    sb.gravado, [],
    "comparar por chave evita um UPDATE por mensagem numa conversa já etiquetada"
  );
  assert.equal(assuntoDaConversa(conversa), "matricula", "e o assunto é lido por chave também");
});

test("o nome da campanha entra pela lista, não como alguém digitou", async () => {
  const sb = bancoCompleto({
    envios: [{ disparo_id: "d1", disparos: { nome: "Black da Mentoria OM", cliente_id: OUSADIA } }],
  });
  const conversa = { id: "c1", cliente_id: OUSADIA, contato: "5593999998888", etiquetas: [] };

  const etiquetas = await marcarOrigemDisparo(sb, OUSADIA, conversa);

  assert.ok(
    etiquetas.includes("black da mentoria om"),
    "era aqui que a campanha voltava a existir com outra grafia"
  );
  assert.ok(!etiquetas.includes("Black da Mentoria OM"));
  assert.ok(etiquetas.includes("veio do disparo"));
});

test("campanha com nome novo vira etiqueta nova, uma vez só", async () => {
  const lista = LISTA();
  const sb = bancoCompleto({
    lista,
    envios: [{ disparo_id: "d1", disparos: { nome: "Natal 2026", cliente_id: OUSADIA } }],
  });
  const conversa = { id: "c1", cliente_id: OUSADIA, contato: "5593999998888", etiquetas: [] };

  const etiquetas = await marcarOrigemDisparo(sb, OUSADIA, conversa);

  // `paraTela` rebaixa a caixa de toda etiqueta nova: a convenção da casa é
  // que etiqueta nasce minúscula, e é por isso que a lista da empresa é
  // minúscula inteira. Quem quiser maiúscula renomeia na lista.
  assert.ok(etiquetas.includes("natal 2026"), "campanha nova é etiqueta legítima");
  assert.ok(
    lista.some((e) => e.chave === "natal 2026"),
    "e passa a existir na lista do cliente, para a próxima conversa reaproveitar"
  );
});
