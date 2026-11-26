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
