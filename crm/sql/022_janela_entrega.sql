-- Etapa 2: janela de 24h e status de entrega.
--
-- A regra da Meta: fora de 24h da ultima mensagem DA PESSOA, so sai template
-- aprovado. Texto livre e recusado com erro 131047. Sem guardar quando a
-- janela fecha, a unica forma de descobrir e tentar enviar e tomar o erro,
-- o que ja e tarde: a mensagem nao saiu e ninguem sabe.
alter table conversas
  add column if not exists janela_expira_em timestamptz;

comment on column conversas.janela_expira_em is
  'Fim da janela de 24h da Cloud API. Depois disso, so template aprovado.';

-- Indice para a tela de Conversas poder marcar quais estao fechando.
create index if not exists conversas_janela on conversas (janela_expira_em)
  where janela_expira_em is not null;

-- O status chega em evento separado e fora de ordem: "read" pode chegar antes
-- de "delivered". Guardar a ordem como posto faria uma mensagem lida voltar
-- para "entregue". Esta funcao da um peso a cada estado, e o carimbo so sobe.
--
-- Vive no banco, e nao no JavaScript, porque a comparacao precisa acontecer
-- dentro do mesmo update que escreve: duas requisicoes simultaneas da Meta
-- lendo-e-depois-escrevendo em JavaScript perdem uma das duas.
create or replace function peso_status(s text) returns int
  language sql immutable as $$
  select case s
    when 'falhou'    then 5  -- falha e definitiva: nunca e sobrescrita
    when 'lida'      then 4
    when 'entregue'  then 3
    when 'enviada'   then 2
    when 'pendente'  then 1
    else 0
  end;
$$;

-- Carimba o status de uma mensagem pelo id da Meta, sem nunca regredir.
create or replace function carimbar_status(
  p_wa_message_id text,
  p_status        text,
  p_em            timestamptz,
  p_erro          text default null
) returns int language sql as $$
  with alvo as (
    update mensagens
       set status    = p_status,
           status_em = p_em,
           erro      = coalesce(p_erro, erro)
     where wa_message_id = p_wa_message_id
       and peso_status(p_status) > peso_status(coalesce(status, ''))
    returning 1
  )
  select coalesce(count(*)::int, 0) from alvo;
$$;

-- Uma resposta da IA sai em dois ou tres baloes, e a Meta da um id para CADA
-- balao. A coluna `wa_message_id`, no singular, nao cabe: guardar so o primeiro
-- faz a falha do segundo passar batida, que e exatamente o caso que machuca.
--
-- A linha continua sendo uma por turno, porque e assim que a IA le o historico.
-- O que vira lista e o id, nao a mensagem.
alter table mensagens
  add column if not exists wa_message_ids text[];

create index if not exists mensagens_wa_ids on mensagens using gin (wa_message_ids)
  where wa_message_ids is not null;

-- E o carimbo passa a procurar nos dois lugares.
create or replace function carimbar_status(
  p_wa_message_id text,
  p_status        text,
  p_em            timestamptz,
  p_erro          text default null
) returns int language sql as $$
  with alvo as (
    update mensagens
       set status    = p_status,
           status_em = p_em,
           erro      = coalesce(p_erro, erro)
     where (wa_message_id = p_wa_message_id
            or p_wa_message_id = any(wa_message_ids))
       and peso_status(p_status) > peso_status(coalesce(status, ''))
    returning 1
  )
  select coalesce(count(*)::int, 0) from alvo;
$$;
