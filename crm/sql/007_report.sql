-- CRM · módulo REPORT: relatórios de marketing da agência (área do operador)
-- Junta Meta Ads, Instagram e (depois) Google Ads dos clientes da agência.
-- Rode no SQL Editor do Supabase. Idempotente. Detalhes em REPORT.md.
--
-- Isolamento: tudo aqui tem prefixo report_ e não toca nas tabelas do
-- atendimento. Cliente da agência (report_clientes) é outra coisa que
-- cliente do CRM (clientes); a ponte opcional é crm_cliente_id.
-- Acesso só pelo service role, e as rotas da API passam por barrouOperador.

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------
-- Cliente da agência
-- ---------------------------------------------------------------
create table if not exists report_clientes (
  id                 uuid primary key default gen_random_uuid(),
  nome               text not null,
  slug               text unique not null,
  ativo              boolean not null default true,
  -- se o cliente também usa o atendimento do CRM: é o que permite
  -- cruzar gasto de anúncio com conversa e agendamento
  crm_cliente_id uuid references clientes(id) on delete set null,
  criado_em          timestamptz not null default now()
);

-- ---------------------------------------------------------------
-- Contas conectadas: uma linha por conta de anúncio, perfil ou página.
-- O token não fica aqui: é um só, do usuário do sistema, na Vercel.
-- ---------------------------------------------------------------
create table if not exists report_contas (
  id               uuid primary key default gen_random_uuid(),
  cliente_id       uuid not null references report_clientes(id) on delete cascade,
  plataforma       text not null,        -- meta_ads | instagram | facebook | google_ads
  id_externo       text not null,        -- act_123 | id do IG business | id da página | customer id
  nome             text,
  moeda            text not null default 'BRL',
  fuso             text not null default 'America/Sao_Paulo',
  ativo            boolean not null default true,
  ultima_coleta_em timestamptz,
  ultimo_erro      text,
  criado_em        timestamptz not null default now(),
  unique (plataforma, id_externo),
  constraint report_plataforma_valida
    check (plataforma in ('meta_ads','instagram','facebook','google_ads'))
);

create index if not exists report_contas_cliente on report_contas (cliente_id) where ativo;

-- ---------------------------------------------------------------
-- Números do dia, por conta. Colunas que não se aplicam ficam nulas
-- (Instagram não tem gasto, Meta Ads não tem seguidores).
--
-- ATENÇÃO: alcance diário NÃO soma. O alcance de um período é gente
-- única, e somar os dias conta a mesma pessoa várias vezes. Para
-- alcance de período, use report_metricas_periodo (vem pronto da API).
-- ---------------------------------------------------------------
create table if not exists report_metricas_diarias (
  conta_id            uuid not null references report_contas(id) on delete cascade,
  data                date not null,

  -- anúncios
  gasto               numeric(14,2),
  impressoes          bigint,
  alcance             bigint,
  cliques             bigint,
  cliques_link        bigint,
  conversoes          bigint,        -- resultado principal configurado na conta
  leads               bigint,
  conversas_iniciadas bigint,        -- mensagens iniciadas (CTWA / Direct)
  valor_conversoes    numeric(14,2), -- receita atribuída, quando houver pixel/CAPI

  -- perfil orgânico
  seguidores          bigint,        -- total no fim do dia
  seguidores_novos    bigint,
  visitas_perfil      bigint,
  interacoes          bigint,        -- curtidas + comentários + salvos + compartilhamentos
  cliques_site        bigint,

  extras              jsonb not null default '{}',   -- qualquer métrica nova sem migração
  atualizado_em       timestamptz not null default now(),
  primary key (conta_id, data)
);

create index if not exists report_metricas_data on report_metricas_diarias (data);

-- Alcance e frequência de um intervalo fechado, como a API devolve.
create table if not exists report_metricas_periodo (
  conta_id      uuid not null references report_contas(id) on delete cascade,
  inicio        date not null,
  fim           date not null,
  alcance       bigint,
  frequencia    numeric(8,2),
  extras        jsonb not null default '{}',
  atualizado_em timestamptz not null default now(),
  primary key (conta_id, inicio, fim)
);

-- ---------------------------------------------------------------
-- Desempenho por anúncio, por dia: "melhor anúncio por CPA" e
-- ranking de campanhas saem daqui.
-- ---------------------------------------------------------------
create table if not exists report_anuncios_diarios (
  conta_id            uuid not null references report_contas(id) on delete cascade,
  data                date not null,
  anuncio_id          text not null,
  anuncio_nome        text,
  conjunto_id         text,
  conjunto_nome       text,
  campanha_id         text,
  campanha_nome       text,
  objetivo            text,
  gasto               numeric(14,2),
  impressoes          bigint,
  alcance             bigint,
  cliques             bigint,
  cliques_link        bigint,
  conversoes          bigint,
  leads               bigint,
  conversas_iniciadas bigint,
  valor_conversoes    numeric(14,2),
  miniatura_url       text,
  extras              jsonb not null default '{}',
  atualizado_em       timestamptz not null default now(),
  primary key (conta_id, data, anuncio_id)
);

create index if not exists report_anuncios_campanha
  on report_anuncios_diarios (conta_id, campanha_id, data);

-- ---------------------------------------------------------------
-- Publicações orgânicas. Métricas são do total de vida do post e a
-- coleta atualiza os posts dos últimos 30 dias a cada rodada.
-- ---------------------------------------------------------------
create table if not exists report_posts (
  id                uuid primary key default gen_random_uuid(),
  conta_id          uuid not null references report_contas(id) on delete cascade,
  id_externo        text not null,
  tipo              text,          -- IMAGE | VIDEO | CAROUSEL_ALBUM | REELS | STORY
  legenda           text,
  link              text,
  miniatura_url     text,
  publicado_em      timestamptz not null,
  alcance           bigint,
  visualizacoes     bigint,
  curtidas          bigint,
  comentarios       bigint,
  salvos            bigint,
  compartilhamentos bigint,
  interacoes        bigint,
  extras            jsonb not null default '{}',
  atualizado_em     timestamptz not null default now(),
  unique (conta_id, id_externo)
);

create index if not exists report_posts_conta_data on report_posts (conta_id, publicado_em desc);

-- ---------------------------------------------------------------
-- Relatórios gerados: o resumo da IA e o link que vai para o cliente.
-- O link público usa `codigo` (aleatório), nunca o id nem o slug.
-- ---------------------------------------------------------------
create table if not exists report_relatorios (
  id              uuid primary key default gen_random_uuid(),
  cliente_id      uuid not null references report_clientes(id) on delete cascade,
  inicio          date not null,
  fim             date not null,
  comparar_inicio date,
  comparar_fim    date,
  resumo          text,
  dados           jsonb not null default '{}',   -- retrato dos números no momento da geração
  codigo          text unique not null default encode(gen_random_bytes(12), 'hex'),
  criado_em       timestamptz not null default now()
);

create index if not exists report_relatorios_cliente
  on report_relatorios (cliente_id, criado_em desc);

-- ---------------------------------------------------------------
-- Registro de cada coleta: quando a Meta muda algo, aparece aqui.
-- ---------------------------------------------------------------
create table if not exists report_coletas (
  id           bigserial primary key,
  conta_id     uuid references report_contas(id) on delete cascade,
  iniciada_em  timestamptz not null default now(),
  terminada_em timestamptz,
  status       text not null default 'rodando',   -- rodando | ok | erro
  linhas       int not null default 0,
  erro         text
);

create index if not exists report_coletas_conta on report_coletas (conta_id, iniciada_em desc);

-- ---------------------------------------------------------------
-- Segurança: fechado para anon/authenticated.
-- ---------------------------------------------------------------
alter table report_clientes          enable row level security;
alter table report_contas            enable row level security;
alter table report_metricas_diarias  enable row level security;
alter table report_metricas_periodo  enable row level security;
alter table report_anuncios_diarios  enable row level security;
alter table report_posts             enable row level security;
alter table report_relatorios        enable row level security;
alter table report_coletas           enable row level security;

-- ---------------------------------------------------------------
-- Resumo de um período por plataforma, com as métricas derivadas.
-- Base do painel, do MCP e do comparar_periodos: chame duas vezes e
-- calcule a variação. De propósito não devolve alcance (não soma).
-- ---------------------------------------------------------------
create or replace function report_resumo_periodo(p_cliente uuid, p_inicio date, p_fim date)
returns table (
  plataforma          text,
  gasto               numeric,
  impressoes          bigint,
  cliques             bigint,
  cliques_link        bigint,
  conversoes          bigint,
  leads               bigint,
  conversas_iniciadas bigint,
  valor_conversoes    numeric,
  seguidores_novos    bigint,
  seguidores_fim      bigint,
  visitas_perfil      bigint,
  interacoes          bigint,
  ctr                 numeric,
  cpc                 numeric,
  cpm                 numeric,
  custo_por_conversao numeric,
  custo_por_lead      numeric,
  custo_por_conversa  numeric,
  roas                numeric
)
language sql
stable
security invoker
set search_path = public
as $$
  with base as (
    select
      c.plataforma,
      sum(m.gasto)                       as gasto,
      sum(m.impressoes)::bigint          as impressoes,
      sum(m.cliques)::bigint             as cliques,
      sum(m.cliques_link)::bigint        as cliques_link,
      sum(m.conversoes)::bigint          as conversoes,
      sum(m.leads)::bigint               as leads,
      sum(m.conversas_iniciadas)::bigint as conversas_iniciadas,
      sum(m.valor_conversoes)            as valor_conversoes,
      sum(m.seguidores_novos)::bigint    as seguidores_novos,
      sum(m.visitas_perfil)::bigint      as visitas_perfil,
      sum(m.interacoes)::bigint          as interacoes
    from report_contas c
    join report_metricas_diarias m on m.conta_id = c.id
    where c.cliente_id = p_cliente
      and m.data between p_inicio and p_fim
    group by c.plataforma
  ),
  seguidores as (
    -- último total de seguidores dentro do período, somado entre perfis
    select c.plataforma, sum(ult.seguidores)::bigint as seguidores_fim
    from report_contas c
    cross join lateral (
      select m.seguidores from report_metricas_diarias m
      where m.conta_id = c.id and m.data between p_inicio and p_fim and m.seguidores is not null
      order by m.data desc limit 1
    ) ult
    where c.cliente_id = p_cliente
    group by c.plataforma
  )
  select
    b.plataforma,
    b.gasto, b.impressoes, b.cliques, b.cliques_link, b.conversoes, b.leads,
    b.conversas_iniciadas, b.valor_conversoes, b.seguidores_novos,
    s.seguidores_fim, b.visitas_perfil, b.interacoes,
    round(100.0 * b.cliques / nullif(b.impressoes, 0), 2)  as ctr,
    round(b.gasto / nullif(b.cliques, 0), 2)               as cpc,
    round(1000.0 * b.gasto / nullif(b.impressoes, 0), 2)   as cpm,
    round(b.gasto / nullif(b.conversoes, 0), 2)            as custo_por_conversao,
    round(b.gasto / nullif(b.leads, 0), 2)                 as custo_por_lead,
    round(b.gasto / nullif(b.conversas_iniciadas, 0), 2)   as custo_por_conversa,
    round(b.valor_conversoes / nullif(b.gasto, 0), 2)      as roas
  from base b
  left join seguidores s on s.plataforma = b.plataforma;
$$;

revoke execute on function report_resumo_periodo(uuid, date, date) from public, anon, authenticated;
grant  execute on function report_resumo_periodo(uuid, date, date) to service_role;
