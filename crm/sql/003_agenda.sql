-- CRM · módulo de agenda
-- Ver ESPECIFICACAO-AGENDA.md para as decisões de produto por trás disto.

-- A empresa é do Brasil; o servidor pode não ser. Todo horário é calculado no fuso
-- do cliente, nunca no do servidor.
alter table clientes add column if not exists fuso text not null default 'America/Belem';

-- ---------------------------------------------------------------
-- Quem atende
-- ---------------------------------------------------------------
create table if not exists profissionais (
  id            uuid primary key default gen_random_uuid(),
  cliente_id    uuid not null references clientes(id) on delete cascade,
  nome          text not null,
  especialidade text,
  ativo         boolean not null default true,
  criado_em     timestamptz not null default now(),
  unique (cliente_id, nome)
);

-- ---------------------------------------------------------------
-- Quando cada um está na unidade: a regra que se repete toda semana
-- ---------------------------------------------------------------
create table if not exists disponibilidade (
  id              uuid primary key default gen_random_uuid(),
  profissional_id uuid not null references profissionais(id) on delete cascade,
  dia_semana      int  not null check (dia_semana between 0 and 6),  -- 0 = domingo
  hora_inicio     time not null,
  hora_fim        time not null,
  check (hora_fim > hora_inicio)
);

create index if not exists disponibilidade_prof on disponibilidade (profissional_id, dia_semana);

-- ---------------------------------------------------------------
-- As exceções. Sem isto a IA marca paciente em dia de férias.
-- ---------------------------------------------------------------
create table if not exists bloqueios (
  id              uuid primary key default gen_random_uuid(),
  profissional_id uuid not null references profissionais(id) on delete cascade,
  inicio          timestamptz not null,
  fim             timestamptz not null,
  motivo          text,
  check (fim > inicio)
);

create index if not exists bloqueios_prof on bloqueios (profissional_id, inicio);

-- ---------------------------------------------------------------
-- Os pacientes marcados
-- ---------------------------------------------------------------
create table if not exists agendamentos (
  id                  uuid primary key default gen_random_uuid(),
  cliente_id          uuid not null references clientes(id) on delete cascade,
  profissional_id     uuid not null references profissionais(id) on delete cascade,
  conversa_id         uuid references conversas(id) on delete set null,
  paciente_nome       text not null,
  telefone            text not null,
  inicio              timestamptz not null,
  fim                 timestamptz not null,
  situacao            text not null default 'marcado',
  observacao          text,
  lembrete_enviado_em timestamptz,
  criado_em           timestamptz not null default now(),
  check (situacao in ('marcado','confirmado','em_atendimento','atendido','faltou','cancelado'))
);

-- Trava contra duplo agendamento: dois pacientes escolhendo o mesmo horário
-- ao mesmo tempo. O segundo insert falha e a IA reoferece.
create unique index if not exists agendamento_horario_unico
  on agendamentos (profissional_id, inicio)
  where situacao <> 'cancelado';

create index if not exists agendamentos_dia on agendamentos (cliente_id, inicio);
create index if not exists agendamentos_lembrete on agendamentos (inicio)
  where situacao = 'marcado' and lembrete_enviado_em is null;

-- ---------------------------------------------------------------
-- Horários livres = disponibilidade − bloqueios − já marcados
-- Fatiado de 30 em 30 minutos, no fuso do cliente.
-- ---------------------------------------------------------------
create or replace function horarios_livres(
  p_profissional     uuid,
  p_dias             int default 7,
  p_antecedencia_min int default 60
)
returns table (inicio timestamptz)
language sql
stable
as $$
  with prof as (
    select p.id, c.fuso
    from profissionais p
    join clientes c on c.id = p.cliente_id
    where p.id = p_profissional and p.ativo
  ),
  dias as (
    select ((now() at time zone (select fuso from prof))::date + i) as dia
    from generate_series(0, greatest(p_dias, 0)) as i
  ),
  slots as (
    select generate_series(
      ((d.dia + disp.hora_inicio) at time zone pr.fuso),
      ((d.dia + disp.hora_fim)    at time zone pr.fuso) - interval '30 minutes',
      interval '30 minutes'
    ) as inicio
    from dias d
    cross join prof pr
    join disponibilidade disp
      on disp.profissional_id = pr.id
     and disp.dia_semana = extract(dow from d.dia)
  )
  select s.inicio
  from slots s
  where s.inicio > now() + make_interval(mins => greatest(p_antecedencia_min, 0))
    and not exists (
      select 1 from bloqueios b
      where b.profissional_id = p_profissional
        and s.inicio >= b.inicio and s.inicio < b.fim
    )
    and not exists (
      select 1 from agendamentos a
      where a.profissional_id = p_profissional
        and a.inicio = s.inicio
        and a.situacao <> 'cancelado'
    )
  order by s.inicio;
$$;
