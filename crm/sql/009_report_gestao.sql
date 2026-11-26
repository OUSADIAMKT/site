-- CRM · módulo REPORT: conexão com a Meta, descoberta de contas e gestão
-- Idempotente. Detalhes em REPORT.md.

-- ---------------------------------------------------------------
-- Conexão com a Meta pelo perfil do operador (login do Facebook).
-- O token vai cifrado (AES-256-GCM, chave derivada do SESSION_SECRET):
-- quem ler o banco não consegue usar. Token de perfil dura ~60 dias.
-- ---------------------------------------------------------------
create table if not exists report_conexoes (
  id            uuid primary key default gen_random_uuid(),
  provedor      text not null default 'meta',
  usuario_id    text not null,            -- id do perfil no Facebook
  usuario_nome  text,
  token_cifrado text not null,
  escopos       text[] not null default '{}',
  expira_em     timestamptz,
  criado_em     timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  unique (provedor, usuario_id)
);

alter table report_conexoes enable row level security;

-- ---------------------------------------------------------------
-- Descoberta automática: a coleta lista tudo que o perfil enxerga.
-- Conta nova entra sem cliente e o operador atribui no painel.
-- ---------------------------------------------------------------
alter table report_contas alter column cliente_id drop not null;
alter table report_contas add column if not exists bm_id          text;
alter table report_contas add column if not exists bm_nome        text;
alter table report_contas add column if not exists status_externo text;   -- status da conta na Meta
alter table report_contas add column if not exists pagina_id      text;   -- IG: página que dá acesso a ele
alter table report_contas add column if not exists descoberta_em  timestamptz;

create index if not exists report_contas_sem_cliente on report_contas (plataforma) where cliente_id is null;

-- ---------------------------------------------------------------
-- Histórico de gestão: toda alteração feita em campanha, conjunto ou
-- anúncio, pelo painel ou pelo MCP, com o antes e o depois. É daqui que
-- sai "quem pausou isso?" e é o que permite desfazer.
-- ---------------------------------------------------------------
create table if not exists report_acoes (
  id           bigserial primary key,
  conta_id     uuid references report_contas(id) on delete set null,
  objeto_tipo  text not null,       -- campanha | conjunto | anuncio
  objeto_id    text not null,
  objeto_nome  text,
  acao         text not null,       -- status | orcamento_diario | orcamento_total | nome
  antes        jsonb,
  depois       jsonb,
  origem       text not null,       -- painel | mcp
  ok           boolean not null default true,
  erro         text,
  criado_em    timestamptz not null default now()
);

create index if not exists report_acoes_conta on report_acoes (conta_id, criado_em desc);
create index if not exists report_acoes_objeto on report_acoes (objeto_id, criado_em desc);

alter table report_acoes enable row level security;
