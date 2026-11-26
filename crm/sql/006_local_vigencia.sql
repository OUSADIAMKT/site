-- CRM · onde e até quando cada faixa de horário vale
--
-- Especialista costuma rodar entre clínicas e cidades. Sem isto, a única
-- forma de dizer "nesta semana ele está em Belém" era cadastrar uma ausência
-- na mão toda vez.

alter table disponibilidade add column if not exists vigencia_inicio date;
alter table disponibilidade add column if not exists vigencia_fim    date;
alter table disponibilidade add column if not exists estado          text;
alter table disponibilidade add column if not exists cidade          text;

-- ---------------------------------------------------------------
-- Horários livres, agora respeitando vigência e carregando o local
-- ---------------------------------------------------------------
-- Vigência nula dos dois lados significa "vale sempre", que é o caso de
-- quem atende fixo na unidade.
drop function if exists horarios_livres(uuid, int, int);

create or replace function horarios_livres(
  p_profissional     uuid,
  p_dias             int default 7,
  p_antecedencia_min int default 60
)
returns table (inicio timestamptz, cidade text, estado text)
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
    select
      generate_series(
        ((d.dia + disp.hora_inicio) at time zone pr.fuso),
        ((d.dia + disp.hora_fim)    at time zone pr.fuso) - interval '30 minutes',
        interval '30 minutes'
      ) as inicio,
      disp.cidade,
      disp.estado
    from dias d
    cross join prof pr
    join disponibilidade disp
      on disp.profissional_id = pr.id
     and disp.dia_semana = extract(dow from d.dia)
     and (disp.vigencia_inicio is null or d.dia >= disp.vigencia_inicio)
     and (disp.vigencia_fim    is null or d.dia <= disp.vigencia_fim)
  )
  select s.inicio, s.cidade, s.estado
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
