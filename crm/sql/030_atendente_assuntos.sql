-- Atendente por assunto. Hoje a fila entrega para quem tem menos gente na mão,
-- e nada mais: com a Lia fora do ar, toda conversa de matrícula caía na Rita,
-- que é suporte de pedido. O assunto passa a pesar antes da carga.
--
-- `assuntos` vazio significa "atende qualquer coisa", que é o comportamento de
-- hoje: nenhum atendente que já existe muda de lado sozinho.
alter table atendentes add column if not exists assuntos text[] not null default '{}';

comment on column atendentes.assuntos is
  'Assuntos que esta pessoa atende (matricula, suporte, agencia). Vazio = atende qualquer um.';

-- Mesma conta do `atendente_ocioso`, com uma ordenação a mais na frente: quem
-- tem o assunto na lista vem antes de quem atende tudo, e quem atende tudo vem
-- antes de quem é de outro assunto. Ninguém fica de fora: a conversa é sempre
-- entregue se existir alguém disponível, só muda a ordem da escolha.
create or replace function atendente_ocioso_assunto(p_cliente uuid, p_assunto text)
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
  group by a.id, a.ultima_atribuicao, a.assuntos
  order by
    case
      when p_assunto is null                      then 1
      when p_assunto = any (a.assuntos)           then 0
      when cardinality(a.assuntos) = 0            then 1
      else 2
    end asc,
    count(c.id) asc,
    a.ultima_atribuicao asc nulls first
  limit 1;
$$;
