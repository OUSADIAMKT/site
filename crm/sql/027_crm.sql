-- CRM completo: funis com etapas, negócios no kanban, produtos, origem do lead,
-- campos personalizados, etiquetas com cor, motivos de fechamento, histórico e
-- automação por palavras. Mesmo desenho do CRM de CRMs de mercado, código nosso.
--
-- Tudo é tabela nova, prefixo crm_. Nenhuma tabela que já existe muda: o
-- `contatos` continua sendo a pessoa e o `conversas` o que ela falou; o negócio
-- aponta para os dois quando existem.
--
-- RLS ligado e sem política: só o servidor (chave secreta) lê e escreve, igual
-- às outras tabelas do CRM.

create table if not exists crm_funis (
  id          uuid primary key default gen_random_uuid(),
  cliente_id  uuid not null references clientes(id) on delete cascade,
  nome        text not null,
  ordem       int  not null default 0,
  ativo       boolean not null default true,
  criado_em   timestamptz not null default now()
);
create index if not exists crm_funis_cliente on crm_funis (cliente_id, ordem);

-- `tipo` diz o que a coluna significa: aberta, ganho ou perdido. É o que
-- permite contar conversão sem depender do nome que cada cliente deu.
create table if not exists crm_etapas (
  id          uuid primary key default gen_random_uuid(),
  cliente_id  uuid not null references clientes(id) on delete cascade,
  funil_id    uuid not null references crm_funis(id) on delete cascade,
  nome        text not null,
  cor         text not null default '#437EE5',
  ordem       int  not null default 0,
  tipo        text not null default 'aberta' check (tipo in ('aberta', 'ganho', 'perdido')),
  criado_em   timestamptz not null default now()
);
create index if not exists crm_etapas_funil on crm_etapas (funil_id, ordem);

create table if not exists crm_origens (
  id          uuid primary key default gen_random_uuid(),
  cliente_id  uuid not null references clientes(id) on delete cascade,
  nome        text not null,
  ativo       boolean not null default true,
  ordem       int  not null default 0,
  criado_em   timestamptz not null default now(),
  unique (cliente_id, nome)
);

create table if not exists crm_motivos (
  id          uuid primary key default gen_random_uuid(),
  cliente_id  uuid not null references clientes(id) on delete cascade,
  nome        text not null,
  tipo        text not null default 'perdido' check (tipo in ('ganho', 'perdido')),
  ativo       boolean not null default true,
  ordem       int  not null default 0,
  criado_em   timestamptz not null default now()
);
create index if not exists crm_motivos_cliente on crm_motivos (cliente_id);

create table if not exists crm_produtos (
  id          uuid primary key default gen_random_uuid(),
  cliente_id  uuid not null references clientes(id) on delete cascade,
  nome        text not null,
  descricao   text,
  valor       numeric(12,2) not null default 0,
  ativo       boolean not null default true,
  criado_em   timestamptz not null default now()
);
create index if not exists crm_produtos_cliente on crm_produtos (cliente_id);

create table if not exists crm_campos (
  id          uuid primary key default gen_random_uuid(),
  cliente_id  uuid not null references clientes(id) on delete cascade,
  nome        text not null,
  chave       text not null,
  tipo        text not null default 'texto'
              check (tipo in ('texto', 'inteiro', 'decimal', 'booleano', 'data', 'datahora')),
  obrigatorio boolean not null default false,
  ordem       int  not null default 0,
  ativo       boolean not null default true,
  criado_em   timestamptz not null default now(),
  unique (cliente_id, chave)
);

-- As etiquetas continuam sendo texto em `contatos.etiquetas` e
-- `conversas.etiquetas`. Esta tabela só dá cor e nome oficial a elas.
create table if not exists crm_etiquetas (
  id          uuid primary key default gen_random_uuid(),
  cliente_id  uuid not null references clientes(id) on delete cascade,
  nome        text not null,
  cor         text not null default '#437EE5',
  criado_em   timestamptz not null default now(),
  unique (cliente_id, nome)
);

create table if not exists crm_negocios (
  id             uuid primary key default gen_random_uuid(),
  cliente_id     uuid not null references clientes(id) on delete cascade,
  funil_id       uuid not null references crm_funis(id) on delete cascade,
  etapa_id       uuid not null references crm_etapas(id) on delete restrict,
  contato_id     uuid references contatos(id) on delete set null,
  conversa_id    uuid references conversas(id) on delete set null,
  titulo         text not null,
  telefone       text,
  email          text,
  valor          numeric(12,2) not null default 0,
  responsavel_id uuid references atendentes(id) on delete set null,
  origem_id      uuid references crm_origens(id) on delete set null,
  motivo_id      uuid references crm_motivos(id) on delete set null,
  motivo_texto   text,
  situacao       text not null default 'aberto' check (situacao in ('aberto', 'ganho', 'perdido')),
  etiquetas      text[] not null default '{}',
  campos         jsonb not null default '{}',
  observacoes    text,
  posicao        double precision not null default 0,
  etapa_desde    timestamptz not null default now(),
  fechado_em     timestamptz,
  criado_por     text,
  criado_em      timestamptz not null default now(),
  atualizado_em  timestamptz not null default now()
);
create index if not exists crm_negocios_quadro   on crm_negocios (cliente_id, funil_id, etapa_id, posicao);
create index if not exists crm_negocios_conversa on crm_negocios (conversa_id);
create index if not exists crm_negocios_contato  on crm_negocios (contato_id);

create table if not exists crm_negocio_produtos (
  id             uuid primary key default gen_random_uuid(),
  negocio_id     uuid not null references crm_negocios(id) on delete cascade,
  produto_id     uuid references crm_produtos(id) on delete set null,
  nome           text not null,
  quantidade     numeric(12,2) not null default 1,
  valor_unitario numeric(12,2) not null default 0
);
create index if not exists crm_negocio_produtos_negocio on crm_negocio_produtos (negocio_id);

-- O que aconteceu com o negócio: criado, mudou de etapa, ganho, perdido,
-- valor alterado. É o "histórico de motivos" da tela de configurações e a
-- linha do tempo da gaveta.
create table if not exists crm_historico (
  id          uuid primary key default gen_random_uuid(),
  cliente_id  uuid not null references clientes(id) on delete cascade,
  negocio_id  uuid not null references crm_negocios(id) on delete cascade,
  tipo        text not null,
  detalhe     jsonb not null default '{}',
  quem        text,
  criado_em   timestamptz not null default now()
);
create index if not exists crm_historico_negocio on crm_historico (negocio_id, criado_em desc);
create index if not exists crm_historico_cliente on crm_historico (cliente_id, tipo, criado_em desc);

-- Automação por palavras: quando a mensagem do lead tem uma das palavras, o
-- negócio dele vai para a etapa escolhida (e nasce, se ainda não existir).
create table if not exists crm_regras_palavras (
  id          uuid primary key default gen_random_uuid(),
  cliente_id  uuid not null references clientes(id) on delete cascade,
  nome        text not null,
  palavras    text[] not null default '{}',
  funil_id    uuid not null references crm_funis(id) on delete cascade,
  etapa_id    uuid not null references crm_etapas(id) on delete cascade,
  ativo       boolean not null default true,
  criado_em   timestamptz not null default now()
);
create index if not exists crm_regras_cliente on crm_regras_palavras (cliente_id) where ativo;

alter table crm_funis            enable row level security;
alter table crm_etapas           enable row level security;
alter table crm_origens          enable row level security;
alter table crm_motivos          enable row level security;
alter table crm_produtos         enable row level security;
alter table crm_campos           enable row level security;
alter table crm_etiquetas        enable row level security;
alter table crm_negocios         enable row level security;
alter table crm_negocio_produtos enable row level security;
alter table crm_historico        enable row level security;
alter table crm_regras_palavras  enable row level security;
