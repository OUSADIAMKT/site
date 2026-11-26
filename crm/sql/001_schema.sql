-- CRM · schema inicial (Supabase / Postgres)
-- Rode no SQL Editor do Supabase. Idempotente.

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------
-- Cliente da plataforma (a clínica, o escritório, a concessionária)
-- ---------------------------------------------------------------
create table if not exists clientes (
  id                 uuid primary key default gen_random_uuid(),
  nome               text not null,
  slug               text unique not null,
  plano              text not null default 'essencial',   -- essencial | pro | prime
  teto_conversas     int  not null default 200,
  ativo              boolean not null default true,

  -- credenciais da WhatsApp Cloud API (uma por cliente)
  wa_phone_number_id text unique,
  wa_token           text,          -- token permanente do usuário do sistema
  wa_verify_token    text,          -- usado na verificação GET do webhook
  wa_app_secret      text,          -- valida a assinatura X-Hub-Signature-256

  criado_em          timestamptz not null default now()
);

-- ---------------------------------------------------------------
-- Área de inserção de contexto: o que a IA sabe e o que ela não diz
-- ---------------------------------------------------------------
create table if not exists agente_config (
  cliente_id      uuid primary key references clientes(id) on delete cascade,
  persona         text not null default '',   -- nome, cargo, jeito de falar
  contexto        text not null default '',   -- o documento do negócio (serviços, preços, prazos, FAQ)
  regras          text not null default '',   -- o que nunca dizer
  saudacao        text,                       -- primeira mensagem, opcional
  modelo_padrao   text not null default 'claude-haiku-4-5',
  modelo_complexo text not null default 'claude-opus-5',
  atualizado_em   timestamptz not null default now()
);

-- ---------------------------------------------------------------
-- Biblioteca de mídia: a IA escolhe pela descrição, o sistema envia
-- ---------------------------------------------------------------
create table if not exists midias (
  id           uuid primary key default gen_random_uuid(),
  cliente_id   uuid not null references clientes(id) on delete cascade,
  chave        text not null,        -- identificador legível: "hilux-srv-2024"
  tipo         text not null,        -- image | video | audio | document
  descricao    text not null,        -- descrição semântica: é isso que o modelo lê para decidir
  legenda      text,                 -- caption enviada junto com a mídia
  wa_media_id  text,                 -- id do upload na Meta (preferido: não expira em link quebrado)
  url          text,                 -- alternativa: link público https
  ativo        boolean not null default true,
  criado_em    timestamptz not null default now(),
  unique (cliente_id, chave),
  constraint midia_tem_origem check (wa_media_id is not null or url is not null)
);

create index if not exists midias_cliente_ativo on midias (cliente_id) where ativo;

-- ---------------------------------------------------------------
-- Conversas e leads
-- ---------------------------------------------------------------
create table if not exists conversas (
  id           uuid primary key default gen_random_uuid(),
  cliente_id   uuid not null references clientes(id) on delete cascade,
  telefone     text not null,
  nome_contato text,
  modo         text not null default 'ia',    -- ia | humano
  score        int  not null default 0,
  etiquetas    text[] not null default '{}',
  origem       jsonb,                          -- referral do CTWA: ctwa_clid, source_id, headline
  ultima_em    timestamptz not null default now(),
  criado_em    timestamptz not null default now(),
  unique (cliente_id, telefone)
);

create table if not exists mensagens (
  id            uuid primary key default gen_random_uuid(),
  conversa_id   uuid not null references conversas(id) on delete cascade,
  papel         text not null,   -- user | assistant
  conteudo      jsonb not null,  -- blocos no formato da Anthropic (text / tool_use / tool_result)
  wa_message_id text,
  criado_em     timestamptz not null default now()
);

create index if not exists mensagens_conversa on mensagens (conversa_id, criado_em);

-- ---------------------------------------------------------------
-- Uso e custo: é isto que substitui a estimativa por dado real
-- ---------------------------------------------------------------
create table if not exists uso (
  id                   bigserial primary key,
  cliente_id           uuid not null references clientes(id) on delete cascade,
  conversa_id          uuid references conversas(id) on delete set null,
  modelo               text not null,
  tokens_entrada       int not null default 0,
  tokens_cache_leitura int not null default 0,
  tokens_cache_escrita int not null default 0,
  tokens_saida         int not null default 0,
  custo_usd            numeric(12,6) not null default 0,
  criado_em            timestamptz not null default now()
);

create index if not exists uso_cliente_data on uso (cliente_id, criado_em);

-- Custo e volume do mês corrente, por cliente. É a base do faturamento
-- e do controle de teto de uso justo.
create or replace view uso_mes as
select
  u.cliente_id,
  c.nome,
  c.plano,
  c.teto_conversas,
  count(distinct u.conversa_id)          as conversas,
  sum(u.custo_usd)                       as custo_usd,
  round(sum(u.custo_usd) * 5.20, 2)      as custo_brl_estimado
from uso u
join clientes c on c.id = u.cliente_id
where u.criado_em >= date_trunc('month', now())
group by u.cliente_id, c.nome, c.plano, c.teto_conversas;
