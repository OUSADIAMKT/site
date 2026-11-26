-- CRM · papel de gestor e histórico de atendimento

-- ---------------------------------------------------------------
-- Terceiro papel: gestor da clínica
-- ---------------------------------------------------------------
-- atendente = recebe da fila e responde
-- gestor    = tudo do atendente, mais a agenda dos profissionais
--             e o relatório de desempenho da equipe
alter table atendentes add column if not exists papel text not null default 'atendente';

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'atendentes_papel_valido'
  ) then
    alter table atendentes
      add constraint atendentes_papel_valido check (papel in ('atendente','gestor'));
  end if;
end $$;

-- ---------------------------------------------------------------
-- Histórico de cada passagem pela fila
-- ---------------------------------------------------------------
-- CUIDADO: `atendimentos` é o atendimento humano (a passagem pela fila).
-- Não confundir com `agendamentos`, que é a consulta marcada do paciente.
--
-- Os campos de fila em `conversas` guardam só o estado ATUAL e são apagados
-- a cada ciclo. Sem esta tabela não existe "tempo médio de espera", só chute.
create table if not exists atendimentos (
  id            uuid primary key default gen_random_uuid(),
  cliente_id    uuid not null references clientes(id) on delete cascade,
  conversa_id   uuid not null references conversas(id) on delete cascade,
  atendente_id  uuid references atendentes(id) on delete set null,
  entrou_fila   timestamptz not null default now(),
  assumida_em   timestamptz,
  encerrada_em  timestamptz,
  desfecho      text,        -- 'encerrado' | 'devolvido' | 'abandonado' | 'passado'
  motivo        text
);

create index if not exists atendimentos_cliente on atendimentos (cliente_id, entrou_fila);
create index if not exists atendimentos_atendente on atendimentos (atendente_id, encerrada_em);
-- A passagem em aberto de uma conversa: é ela que recebe assumida_em e encerrada_em.
create index if not exists atendimentos_aberto on atendimentos (conversa_id)
  where encerrada_em is null;

-- ---------------------------------------------------------------
-- Desempenho por atendente, no mês corrente
-- ---------------------------------------------------------------
create or replace view desempenho_equipe as
select
  a.cliente_id,
  a.id                                as atendente_id,
  a.nome,
  a.papel,
  a.disponivel,
  count(t.id) filter (where t.assumida_em is not null)          as atendimentos,
  count(t.id) filter (where t.encerrada_em is null
                        and t.assumida_em is not null)          as em_aberto,
  avg(extract(epoch from (t.assumida_em - t.entrou_fila)))
    filter (where t.assumida_em is not null)                    as espera_media_seg,
  avg(extract(epoch from (t.encerrada_em - t.assumida_em)))
    filter (where t.encerrada_em is not null)                   as duracao_media_seg
from atendentes a
left join atendimentos t
  on t.atendente_id = a.id
 and t.entrou_fila >= date_trunc('month', now())
where a.ativo
group by a.cliente_id, a.id, a.nome, a.papel, a.disponivel;

alter table atendimentos enable row level security;
