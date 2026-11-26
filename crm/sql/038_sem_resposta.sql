-- 038: quantas mensagens da pessoa ainda não foram respondidas, por conversa.
--
-- Aplicada em produção em 24/11/2026.
--
-- Derivado das mensagens, nunca de um contador guardado: contador depende de
-- todo caminho de envio lembrar de zerar, e o dia em que um esquecer a bolinha
-- fica acesa para sempre numa conversa já respondida. Aqui a conta é feita na
-- hora e não tem como mentir.
--
-- Resposta é mensagem que saiu para a pessoa: `direcao = 'saida'`. Turno de
-- ferramenta da IA tem direção nula e não conta, porque não chegou em ninguém.
-- Nota interna também não conta.
--
-- Usa o índice mensagens(conversa_id, criado_em), que já existia.
create or replace function public.sem_resposta_das_conversas(ids uuid[])
returns table(
  conversa_id uuid,
  sem_resposta integer,
  desde timestamptz,
  respondida_em timestamptz,
  respondida_por text
)
language sql
stable
security definer
set search_path to 'public'
as $$
  with resposta as (
    select distinct on (m.conversa_id)
           m.conversa_id, m.criado_em, m.autor_atendente_id
    from mensagens m
    where m.conversa_id = any(ids)
      and m.direcao = 'saida'
      and coalesce(m.interna, false) = false
    order by m.conversa_id, m.criado_em desc
  )
  select c.id,
         count(m.id)::int,
         min(m.criado_em),
         r.criado_em,
         case
           when r.criado_em is null then null
           when r.autor_atendente_id is not null then 'atendente'
           else 'ia'
         end
  from unnest(ids) as c(id)
  left join resposta r on r.conversa_id = c.id
  left join mensagens m
         on m.conversa_id = c.id
        and m.direcao = 'entrada'
        and (r.criado_em is null or m.criado_em > r.criado_em)
  group by c.id, r.criado_em, r.autor_atendente_id
$$;

revoke all on function public.sem_resposta_das_conversas(uuid[]) from public, anon;
grant execute on function public.sem_resposta_das_conversas(uuid[]) to service_role;
