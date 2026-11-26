-- 02 · o que a Ousadia acrescentou ao esquema herdado (versões 1.0 e 1.5)
--
-- Rodar depois do 01-esquema.sql e antes do 03-permissoes.sql. Pode rodar de
-- novo: tudo aqui é `if not exists` / `create or replace`.
--
-- RLS ligada e nenhuma política em tudo que nasce aqui, igual ao resto: só o
-- service_role (o servidor do CRM) lê e escreve.

set search_path = public, extensions;

-- ---------------------------------------------------------------------------
-- 1. Fila de tarefas do sistema (versão 1.5)
--
-- O que antes precisaria de cron, Redis ou n8n mora aqui: o servidor do CRM
-- olha esta tabela a cada minuto, pega o que venceu e executa. As tarefas
-- periódicas (varrer automações, devolver conversas, coleta da Meta) entram
-- com uma `chave` por janela de tempo, então duas voltas no mesmo minuto não
-- criam a mesma tarefa duas vezes.

create table if not exists public.tarefas_sistema (
  id bigserial primary key,
  cliente_id uuid references public.clientes(id) on delete cascade,
  tipo text not null,
  carga jsonb not null default '{}'::jsonb,
  executar_em timestamptz not null default now(),
  estado text not null default 'pendente',
  tentativas integer not null default 0,
  max_tentativas integer not null default 5,
  erro text,
  resultado jsonb,
  chave text unique,
  pego_em timestamptz,
  feito_em timestamptz,
  criado_em timestamptz not null default now(),
  constraint tarefas_sistema_estado_check
    check (estado in ('pendente', 'rodando', 'feita', 'falhou'))
);

create index if not exists tarefas_sistema_fila
  on public.tarefas_sistema (executar_em) where estado in ('pendente', 'rodando');

alter table public.tarefas_sistema enable row level security;

-- Pega até `p_limite` tarefas vencidas e marca como "rodando", numa operação
-- só. `skip locked` faz duas voltas simultâneas (ou dois processos) nunca
-- pegarem a mesma linha. Tarefa "rodando" há mais de 10 minutos é de um
-- processo que morreu no meio: volta para a fila.
create or replace function public.pegar_tarefas(p_limite integer default 10)
returns setof public.tarefas_sistema
language sql
as $$
  update public.tarefas_sistema t
     set estado = 'rodando', pego_em = now(), tentativas = t.tentativas + 1
   where t.id in (
     select id from public.tarefas_sistema
      where (estado = 'pendente' and executar_em <= now())
         or (estado = 'rodando' and pego_em < now() - interval '10 minutes')
      order by executar_em
      limit greatest(1, least(p_limite, 50))
      for update skip locked
   )
  returning t.*;
$$;

-- ---------------------------------------------------------------------------
-- 2. Respostas rápidas (versão 1.0)
--
-- Texto pronto que a equipe insere digitando "/atalho" na conversa.
-- `atendente_id` nulo = resposta da equipe toda; preenchido = só daquela
-- pessoa. `{nome}` no texto vira o primeiro nome do contato.

create table if not exists public.respostas_rapidas (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid not null references public.clientes(id) on delete cascade,
  atendente_id uuid references public.atendentes(id) on delete cascade,
  atalho text not null,
  texto text not null,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  constraint respostas_rapidas_atalho_formato check (atalho ~ '^[a-z0-9][a-z0-9-]{0,29}$'),
  constraint respostas_rapidas_texto_tamanho check (char_length(texto) between 1 and 4000)
);

create unique index if not exists respostas_rapidas_atalho_unico
  on public.respostas_rapidas (cliente_id, coalesce(atendente_id, '00000000-0000-0000-0000-000000000000'::uuid), atalho);

alter table public.respostas_rapidas enable row level security;

-- ---------------------------------------------------------------------------
-- 3. Dono por produto (versão 1.5)
--
-- Cada produto tem um responsável (Jackson, Juh, Thascila...) e a lista dos
-- formulários do site que vendem esse produto. Lead que chega por um desses
-- formulários nasce com o produto e com o dono, e o dono ganha uma tarefa
-- de primeiro contato. `herospark_ids` liga o produto às vendas da HeroSpark.

alter table public.crm_produtos add column if not exists responsavel_id uuid
  references public.atendentes(id) on delete set null;
alter table public.crm_produtos add column if not exists formularios text[] not null default '{}';
alter table public.crm_produtos add column if not exists herospark_ids text[] not null default '{}';
-- O funil onde o lead daquele produto entra. Vazio = o funil de entrada
-- automática (Alunos). A agência tem funil próprio.
alter table public.crm_produtos add column if not exists funil_id uuid
  references public.crm_funis(id) on delete set null;

-- ---------------------------------------------------------------------------
-- 4. Vendas da HeroSpark (versão 1.5)
--
-- Todo evento que a HeroSpark manda é guardado inteiro em `bruto`, antes de
-- qualquer leitura. O formato do webhook não tem documentação pública, então
-- a leitura (api/_vendas.js) pode precisar de ajuste depois da primeira venda
-- real; com o bruto guardado, basta reprocessar (scripts/reprocessar-vendas.js)
-- e nada se perde. O mesmo evento reenviado (mesma transação, mesmo status)
-- é reconhecido pelo índice único e não conta duas vezes.

create table if not exists public.vendas_eventos (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid not null references public.clientes(id) on delete cascade,
  fonte text not null default 'herospark',
  recebido_em timestamptz not null default now(),
  bruto jsonb not null,
  estado text not null default 'recebido',
  status_venda text,
  id_externo text,
  produto_externo text,
  produto_nome text,
  valor numeric(12,2),
  email text,
  telefone text,
  nome text,
  produto_id uuid references public.crm_produtos(id) on delete set null,
  negocio_id uuid references public.crm_negocios(id) on delete set null,
  erro text,
  processado_em timestamptz,
  constraint vendas_eventos_estado_check
    check (estado in ('recebido', 'processado', 'ignorado', 'erro')),
  constraint vendas_eventos_status_check
    check (status_venda is null or status_venda in ('aprovada', 'pendente', 'reembolsada', 'desconhecido'))
);

create unique index if not exists vendas_eventos_unico
  on public.vendas_eventos (cliente_id, fonte, id_externo, status_venda)
  where id_externo is not null and status_venda is not null;
create index if not exists vendas_eventos_por_estado
  on public.vendas_eventos (cliente_id, estado, recebido_em desc);
create index if not exists vendas_eventos_por_negocio
  on public.vendas_eventos (negocio_id) where negocio_id is not null;

alter table public.vendas_eventos enable row level security;

-- ---------------------------------------------------------------------------
-- 5. Sinais da comunidade (Creators da Amazônia) (versão 1.5)
--
-- O Supabase da comunidade manda Database Webhooks para /api/comunidade. O
-- evento é guardado inteiro e processado pela fila. `comunidade_membros` é a
-- memória de quem é quem lá: o webhook de empresa ou de certificado só traz
-- o `user_id`, e é por aqui que ele vira nome, e-mail e WhatsApp.

create table if not exists public.comunidade_eventos (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid not null references public.clientes(id) on delete cascade,
  recebido_em timestamptz not null default now(),
  tabela text,
  tipo text,
  bruto jsonb not null,
  estado text not null default 'recebido',
  erro text,
  negocio_id uuid references public.crm_negocios(id) on delete set null,
  processado_em timestamptz,
  constraint comunidade_eventos_estado_check
    check (estado in ('recebido', 'processado', 'ignorado', 'erro'))
);

create index if not exists comunidade_eventos_por_estado
  on public.comunidade_eventos (cliente_id, estado, recebido_em desc);

create table if not exists public.comunidade_membros (
  cliente_id uuid not null references public.clientes(id) on delete cascade,
  user_id uuid not null,
  email text,
  nome text,
  telefone text,
  contato_id uuid references public.contatos(id) on delete set null,
  atualizado_em timestamptz not null default now(),
  primary key (cliente_id, user_id)
);

alter table public.comunidade_eventos enable row level security;
alter table public.comunidade_membros enable row level security;
