// Um Postgres de verdade, isolado, para os testes de integridade.
//
// PGlite é o PostgreSQL compilado para WASM: roda dentro do Node, em memória,
// sem Docker, sem servidor e sem rede. Isso importa porque as travas da Etapa 1
// são travas de BANCO, não de código: chave estrangeira composta, índice único
// parcial e trigger. Um dublê em memória escrito em JavaScript não prova nada
// sobre elas, porque ele não é o que vai recusar a gravação em produção.
//
// O que ele NÃO resolve: concorrência real. É uma conexão só, então `for update
// skip locked` com processos simultâneos continua sem prova. Esse teste segue
// pendente e está em scripts/testar-concorrencia.js.
//
// LIMITE DE MEMÓRIA. Cada PGlite é um Postgres inteiro em WASM, e meia dúzia
// deles vivos ao mesmo tempo estoura o espaço de código do Node: o erro que
// aparece é "PGlite failed to initialize properly", que não parece memória mas
// é. Por isso os testes rodam um arquivo por vez, com `--test-concurrency=1`
// no script `test` do package.json. Rodar `node --test test/` na mão, sem essa
// opção, falha de forma confusa.

import { PGlite } from "@electric-sql/pglite";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const aqui = dirname(fileURLToPath(import.meta.url));
const sql = (arquivo) => readFileSync(join(aqui, "..", "sql", arquivo), "utf8");

// As tabelas que as migrações 031 a 033 encostam, com as colunas que elas
// usam. Espelha o que `information_schema` devolveu de produção em 20/11/2026.
// Não é o esquema inteiro do CRM de propósito: o que não é tocado pelas
// migrações sob teste não entra, senão este arquivo passa a ser uma segunda
// fonte da verdade que ninguém mantém.
//
// Se uma migração futura encostar numa tabela que não está aqui, o teste
// quebra com "relation does not exist", que é exatamente o aviso certo.
const BASE = `
  create table clientes (
    id         uuid primary key default gen_random_uuid(),
    nome       text not null,
    slug       text not null unique,
    ativo      boolean not null default true,
    ia_pausada boolean not null default false,
    modulos    jsonb not null default '{}'
  );

  create table atendentes (
    id         uuid primary key default gen_random_uuid(),
    cliente_id uuid not null references clientes(id) on delete cascade,
    nome       text not null,
    email      text not null,
    senha_hash text not null,
    papel      text not null default 'atendente',
    ativo      boolean not null default true,
    disponivel boolean not null default false,
    assuntos   text[] not null default '{}',
    criado_em  timestamptz not null default now()
  );

  create table conversas (
    id           uuid primary key default gen_random_uuid(),
    cliente_id   uuid not null references clientes(id) on delete cascade,
    contato      text not null,
    canal        text not null default 'whatsapp',
    modo         text not null default 'ia',
    atendente_id uuid references atendentes(id),
    etiquetas    text[] not null default '{}',
    -- De onde a conversa nasceu: o referral do clique no anúncio (ctwa_clid,
    -- source_id), o comentário do Instagram, ou o painel. Produção tem esta
    -- coluna desde o começo; ela entrou aqui com a 043, que lê este campo
    -- para descobrir a origem do negócio.
    origem       jsonb,
    motivo_fila  text,
    fila_desde   timestamptz,
    assumida_em  timestamptz,
    ultima_em    timestamptz not null default now(),
    criado_em    timestamptz not null default now()
  );

  create table atendimentos (
    id           uuid primary key default gen_random_uuid(),
    cliente_id   uuid not null references clientes(id) on delete cascade,
    conversa_id  uuid not null references conversas(id) on delete cascade,
    atendente_id uuid references atendentes(id),
    entrou_fila  timestamptz not null default now(),
    assumida_em  timestamptz,
    encerrada_em timestamptz,
    desfecho     text,
    motivo       text
  );

  create table disparos (
    id           uuid primary key default gen_random_uuid(),
    cliente_id   uuid not null references clientes(id) on delete cascade,
    nome         text not null,
    texto        text not null,
    publico      jsonb not null default '{}',
    estado       text not null default 'rascunho',
    totais       jsonb not null default '{}',
    criado_por   text,
    criado_em    timestamptz not null default now(),
    iniciado_em  timestamptz,
    concluido_em timestamptz,
    constraint disparos_estado_check
      check (estado in ('rascunho','testando','enviando','concluido','parado'))
  );

  create table disparo_envios (
    id            uuid primary key default gen_random_uuid(),
    disparo_id    uuid not null references disparos(id) on delete cascade,
    contato_id    uuid,
    telefone      text not null,
    estado        text not null default 'pendente',
    motivo        text,
    wa_message_id text,
    enviado_em    timestamptz,
    unique (disparo_id, telefone),
    constraint disparo_envios_estado_check
      check (estado in ('pendente','enviado','falhou','pulado'))
  );
`;

/**
 * Um banco com a base e as migrações 031, 032 e 033 aplicadas, na ordem.
 *
 * As migrações são lidas do disco, não copiadas para cá: o que o teste exercita
 * é o arquivo que vai para produção. Se alguém editar o SQL e quebrar uma
 * trava, o teste quebra.
 *
 * Uma instância só por processo, de propósito. Cada PGlite é um Postgres
 * inteiro em WASM, e dezesseis deles vivos ao mesmo tempo estouram a memória do
 * Node: foi o que aconteceu na primeira versão deste arquivo. O isolamento
 * entre testes vem de `duasEmpresas`, que cria empresas novas a cada chamada,
 * e é o mesmo isolamento que o sistema tem em produção.
 */
let compartilhado = null;
export async function bancoLimpo() {
  if (!compartilhado) compartilhado = aplicar(new PGlite(), "033");
  return compartilhado;
}

/**
 * Uma instância PRÓPRIA parada na migração que você pedir, para o teste que
 * precisa gravar dados antes de aplicar a seguinte. Quem chama fecha, com
 * `await pg.close()`, senão a memória não volta.
 */
export async function bancoAte(ate) {
  return aplicar(new PGlite(), ate);
}

/** Aplica a 033 por cima de uma instância que estava parada antes dela. */
export async function aplicar033(pg) {
  await pg.exec(sql("033_frentes.sql"));
  return pg;
}

async function aplicar(pg, ate) {
  await pg.exec(BASE);
  await pg.exec(sql("031_esquema_atual_disparos.sql"));
  if (ate >= "032") await pg.exec(sql("032_disparo_reserva.sql"));
  if (ate >= "033") await pg.exec(sql("033_frentes.sql"));
  return pg;
}

/**
 * Duas empresas novas com gente dentro, para os testes de isolamento.
 *
 * Os slugs levam um sufixo porque a instância é compartilhada: duas chamadas
 * com o mesmo slug bateriam no unique de `clientes`, e o teste falharia por um
 * motivo que não é o que ele está medindo.
 */
let conta = 0;
export async function duasEmpresas(pg) {
  const n = ++conta;
  const { rows } = await pg.query(`
    with
    a as (insert into clientes (nome, slug) values ('Empresa A ${n}', 'empresa-a-${n}') returning id),
    b as (insert into clientes (nome, slug) values ('Empresa B ${n}', 'empresa-b-${n}') returning id),
    pa as (insert into atendentes (cliente_id, nome, email, senha_hash, assuntos)
           select a.id, 'Ana', 'ana@a.test', 'x', '{matricula}' from a returning id, cliente_id),
    pa2 as (insert into atendentes (cliente_id, nome, email, senha_hash, assuntos)
            select a.id, 'Bia', 'bia@a.test', 'x', '{suporte}' from a returning id, cliente_id),
    pb as (insert into atendentes (cliente_id, nome, email, senha_hash)
           select b.id, 'Caio', 'caio@b.test', 'x' from b returning id, cliente_id)
    select (select id from a) as empresa_a,
           (select id from b) as empresa_b,
           (select id from pa) as ana,
           (select id from pa2) as bia,
           (select id from pb) as caio
  `);
  return rows[0];
}

/**
 * Roda e devolve `{ ok }` ou `{ erro }`, sem derrubar o teste.
 *
 * Existe porque metade das provas aqui é "isto tem que ser RECUSADO", e
 * try/catch repetido vinte vezes esconde o que o teste está afirmando.
 */
export async function tentar(pg, texto, args = []) {
  try {
    const r = await pg.query(texto, args);
    return { ok: true, rows: r.rows };
  } catch (e) {
    return { erro: e.message };
  }
}

// ---------------------------------------------------------------------------
// O banco do CRM comercial (migração 037)
//
// Instância própria, não a compartilhada: a 037 encosta em `contatos` e nas
// tabelas `crm_*`, que a BASE de cima não tem porque as migrações 031 a 033
// não as tocam. Quem chama fecha com `await pg.close()`.
//
// `CONTATOS` espelha o que `information_schema` devolveu de produção em
// 24/11/2026, antes da 037. É a tabela real que a migração vai alterar lá.
const CONTATOS = `
  create table contatos (
    id                  uuid primary key default gen_random_uuid(),
    cliente_id          uuid not null references clientes(id) on delete cascade,
    telefone_e164       text,
    nome                text,
    email               text,
    etiquetas           text[] not null default '{}',
    origem              text not null default 'conversa',
    opt_out             boolean not null default false,
    ultima_interacao_em timestamptz,
    criado_em           timestamptz not null default now(),
    atualizado_em       timestamptz not null default now(),
    constraint contatos_origem_check
      check (origem = any (array['importado','conversa','pedido','crm']))
  );
`;

export async function bancoComercial({ ate = "037" } = {}) {
  const pg = new PGlite();
  await pg.exec(BASE);
  await pg.exec(CONTATOS);
  await pg.exec(sql("027_crm.sql"));
  if (ate >= "037") await pg.exec(sql("037_crm_comercial.sql"));
  if (ate >= "040") await pg.exec(sql("040_quadro_comercial.sql"));
  return pg;
}

/** Aplica a 037 por cima de uma instância parada antes dela. */
export async function aplicar037(pg) {
  await pg.exec(sql("037_crm_comercial.sql"));
  return pg;
}

/** Desfaz a 037. */
export async function reverter037(pg) {
  await pg.exec(sql("037_reversao.sql"));
  return pg;
}

/** Aplica a 040 por cima de uma instância parada antes dela. */
export async function aplicar040(pg) {
  await pg.exec(sql("040_quadro_comercial.sql"));
  return pg;
}

/** Desfaz a 040. */
export async function reverter040(pg) {
  await pg.exec(sql("040_reversao.sql"));
  return pg;
}

/** Aplica a 041 por cima de uma instância parada antes dela. */
export async function aplicar041(pg) {
  await pg.exec(sql("041_etiquetas_conhecidas.sql"));
  return pg;
}

/** Desfaz a 041. */
export async function reverter041(pg) {
  await pg.exec(sql("041_reversao.sql"));
  return pg;
}

/** Aplica a 043 por cima de uma instância parada antes dela. */
export async function aplicar043(pg) {
  await pg.exec(sql("043_origem_do_negocio.sql"));
  return pg;
}

/** Desfaz a 043. */
export async function reverter043(pg) {
  await pg.exec(sql("043_reversao.sql"));
  return pg;
}

/** Aplica a 044 por cima de uma instância parada antes dela. */
export async function aplicar044(pg) {
  await pg.exec(sql("044_negocio_unico_por_conversa.sql"));
  return pg;
}

/** Desfaz a 044. */
export async function reverter044(pg) {
  await pg.exec(sql("044_reversao.sql"));
  return pg;
}

// ---------------------------------------------------------------------------
// O banco do compositor de páginas (migração 045)
//
// Instância própria, não a compartilhada: a 045 só encosta em `clientes`, que
// a BASE tem, e as tabelas dela nascem do zero. Quem chama fecha com
// `await pg.close()`.
export async function bancoPaginas({ ate = "046" } = {}) {
  const pg = new PGlite();
  await pg.exec(BASE);
  if (ate >= "045") await pg.exec(sql("045_paginas.sql"));
  if (ate >= "046") await pg.exec(sql("046_metricas_paginas.sql"));
  return pg;
}

/** Aplica a 045 por cima de uma instância parada antes dela. */
export async function aplicar045(pg) {
  await pg.exec(sql("045_paginas.sql"));
  return pg;
}

/** Desfaz a 045. */
export async function reverter045(pg) {
  await pg.exec(sql("045_reversao.sql"));
  return pg;
}

/** Aplica a 046 por cima de uma instância parada na 045. */
export async function aplicar046(pg) {
  await pg.exec(sql("046_metricas_paginas.sql"));
  return pg;
}

/** Desfaz a 046. */
export async function reverter046(pg) {
  await pg.exec(sql("046_reversao.sql"));
  return pg;
}
