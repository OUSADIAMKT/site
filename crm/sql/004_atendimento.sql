-- CRM · atendentes, fila e distribuição
-- A IA transfere, a conversa entra na fila, a fila entrega para quem está livre.

-- ---------------------------------------------------------------
-- Quem atende quando a IA passa adiante
-- ---------------------------------------------------------------
create table if not exists atendentes (
  id                  uuid primary key default gen_random_uuid(),
  cliente_id          uuid not null references clientes(id) on delete cascade,
  nome                text not null,
  email               text not null unique,
  senha_hash          text not null,
  disponivel          boolean not null default false,
  ativo               boolean not null default true,
  -- Usado como critério de desempate na distribuição: entre dois atendentes
  -- com a mesma carga, recebe quem está parado há mais tempo.
  ultima_atribuicao   timestamptz,
  criado_em           timestamptz not null default now()
);

create index if not exists atendentes_cliente on atendentes (cliente_id) where ativo;

-- ---------------------------------------------------------------
-- A conversa ganha estado de fila
-- ---------------------------------------------------------------
-- modo: 'ia' (a IA responde) | 'fila' (esperando atendente) | 'humano' (com atendente)
alter table conversas add column if not exists atendente_id uuid references atendentes(id) on delete set null;
alter table conversas add column if not exists fila_desde   timestamptz;
alter table conversas add column if not exists assumida_em  timestamptz;
alter table conversas add column if not exists motivo_fila  text;

create index if not exists conversas_fila on conversas (cliente_id, fila_desde)
  where modo = 'fila';
create index if not exists conversas_do_atendente on conversas (atendente_id)
  where modo = 'humano';

-- ---------------------------------------------------------------
-- Quem está mais ocioso agora
-- ---------------------------------------------------------------
-- Entre os disponíveis, o de menor carga. Empatou, o parado há mais tempo.
-- Fica em SQL para a escolha e a marcação acontecerem na mesma ida ao banco.
create or replace function atendente_ocioso(p_cliente uuid)
returns uuid
language sql
stable
as $$
  select a.id
  from atendentes a
  left join conversas c
    on c.atendente_id = a.id and c.modo = 'humano'
  where a.cliente_id = p_cliente
    and a.ativo
    and a.disponivel
  group by a.id, a.ultima_atribuicao
  order by count(c.id) asc, a.ultima_atribuicao asc nulls first
  limit 1;
$$;

-- ---------------------------------------------------------------
-- Situação da fila, para a tela e para o alerta de espera
-- ---------------------------------------------------------------
create or replace view fila_resumo as
select
  c.cliente_id,
  count(*) filter (where c.modo = 'fila')                       as esperando,
  count(*) filter (where c.modo = 'humano')                     as em_atendimento,
  min(c.fila_desde) filter (where c.modo = 'fila')              as espera_mais_antiga,
  (select count(*) from atendentes a
    where a.cliente_id = c.cliente_id and a.ativo and a.disponivel) as atendentes_disponiveis
from conversas c
group by c.cliente_id;
