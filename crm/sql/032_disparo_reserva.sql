-- Etapa 0: reserva atomica, posse por tentativa e maquina de estados do envio.
--
-- O problema que isto resolve. Hoje `enviarLote` faz:
--
--     select ... from disparo_envios where estado = 'pendente' limit 40
--     ... chama a Meta ...
--     update disparo_envios set estado = 'enviado' where id = ...
--
-- Entre o select e o update nao existe transacao: sao duas chamadas HTTP
-- separadas. Dois processos que leiam no mesmo segundo recebem as MESMAS 40
-- linhas e mandam a mesma mensagem duas vezes para a mesma pessoa. O
-- `unique (disparo_id, telefone)` nao protege disso: ele impede duas LINHAS
-- para o mesmo numero, nao dois envios a partir da mesma linha.
--
-- O que muda. A escolha dos destinatarios passa a acontecer dentro de um unico
-- update no banco, com `for update skip locked`: a linha travada por um
-- processo e PULADA pelo outro, nao relida nem esperada. E cada reserva recebe
-- um `tentativa_id` novo, que funciona como senha: toda transicao seguinte
-- exige a senha correta, entao um processo atrasado cuja reserva ja foi
-- recuperada nao consegue escrever nada.
--
-- O que isto NAO promete. Entre gravar `enviando` e receber a resposta da Meta
-- existe uma janela em que a mensagem pode ter saido e nos nao sabemos.
-- Nenhuma verificacao local fecha essa janela. O desenho escolhe o lado
-- seguro: o que entra nela vira `desconhecido` e nunca e reenviado sozinho.

-- ---------------------------------------------------------------------------
-- 1. Colunas

-- `reservado_em` e o relogio da reserva. `tentativa_id` e a posse: quem nao
-- tem o valor atual na mao nao escreve. `tentativas` conta quantas vezes a
-- linha foi reservada, e e o que denuncia uma linha que fica girando.
alter table disparo_envios add column if not exists reservado_em  timestamptz;
alter table disparo_envios add column if not exists tentativa_id  uuid;
alter table disparo_envios add column if not exists tentativas    int not null default 0;
alter table disparo_envios add column if not exists atualizado_em timestamptz;
alter table disparo_envios add column if not exists erro_codigo   text;

comment on column disparo_envios.tentativa_id is
  'Senha da reserva atual. Toda transicao exige este valor; recuperar a reserva o anula, o que exclui o processo antigo.';
comment on column disparo_envios.reservado_em is
  'Quando a reserva atual foi feita. Passado o prazo, a reserva pode ser recuperada.';
comment on column disparo_envios.tentativas is
  'Quantas vezes esta linha foi reservada. Cresce a cada reserva e nunca diminui.';
comment on column disparo_envios.erro_codigo is
  'Codigo da Meta quando houve falha (131026, 131047, 132000...). Separado do motivo em texto.';

-- Os tres estados novos. O check antigo so conhecia quatro, e um update para
-- 'reservado' seria recusado pelo banco.
alter table disparo_envios drop constraint if exists disparo_envios_estado_check;
alter table disparo_envios add constraint disparo_envios_estado_check
  check (estado in ('pendente','reservado','enviando','enviado','falhou','pulado','desconhecido'));

-- A fila le por (disparo_id, estado) e ordena por id; o indice que ja existe
-- cobre o filtro. Este cobre a varredura de reservas e envios vencidos, que
-- olha o relogio e nao o disparo.
create index if not exists disparo_envios_relogio_idx
  on disparo_envios (estado, reservado_em)
  where estado in ('reservado','enviando');

-- Reconciliacao por id da Meta: o webhook de status chega com o
-- `wa_message_id` e nada mais.
create index if not exists disparo_envios_wa_id_idx
  on disparo_envios (wa_message_id)
  where wa_message_id is not null;

-- ---------------------------------------------------------------------------
-- 2. Rastro de tentativas
--
-- Uma linha por tentativa, nunca sobrescrita. `disparo_envios` guarda o estado
-- de agora; esta tabela guarda o que aconteceu. Sem ela, uma linha que foi
-- reservada, perdida, recuperada e enviada conta a mesma historia de uma que
-- foi enviada de primeira.
create table if not exists disparo_tentativas (
  id            uuid primary key default gen_random_uuid(),
  envio_id      uuid not null references disparo_envios(id) on delete cascade,
  disparo_id    uuid not null references disparos(id) on delete cascade,
  tentativa_id  uuid not null,
  numero        int  not null,
  reservada_em  timestamptz not null default now(),
  enviando_em   timestamptz,
  terminada_em  timestamptz,
  estado_final  text,
  wa_message_id text,
  motivo        text,
  erro_codigo   text,
  unique (envio_id, tentativa_id)
);

create index if not exists disparo_tentativas_disparo_idx
  on disparo_tentativas (disparo_id, reservada_em desc);

comment on table disparo_tentativas is
  'Rastro append-only de cada tentativa de envio. disparo_envios diz o agora; esta tabela diz o historico.';

-- ---------------------------------------------------------------------------
-- 3. Transicoes permitidas
--
-- A regra vive em trigger, e nao no codigo, porque o codigo nao e o unico que
-- escreve: um script de manutencao, uma correcao no painel do Supabase ou uma
-- funcao futura passam por aqui do mesmo jeito.
--
-- O que cada aresta significa:
--
--   pendente     -> reservado     alguem pegou a linha
--   pendente     -> pulado        fora da janela e sem template, decidido antes de reservar
--   reservado    -> enviando      posse conferida, a chamada a Meta vai sair agora
--   reservado    -> pendente      reserva recuperada; a chamada NAO saiu
--   reservado    -> pulado        fora da janela, decidido com a linha na mao
--   reservado    -> falhou        falha anterior a chamada (sem credencial, telefone invalido)
--   enviando     -> enviado       a Meta aceitou e devolveu id
--   enviando     -> falhou        a Meta recusou; a mensagem nao saiu
--   enviando     -> desconhecido  sem resposta confiavel; pode ter saido
--   desconhecido -> enviado       o webhook de status trouxe o id depois
--   desconhecido -> falhou        o webhook de status trouxe a recusa depois
--   enviado      -> falhou        a Meta reportou falha de entrega depois do aceite
--   pulado       -> pendente      alguem recolocou na fila de proposito
--   falhou       -> pendente      idem, para o que comprovadamente nao saiu
--
-- As duas ultimas sao portas para uma pessoa, nao para a automacao: nenhuma
-- funcao desta migracao as usa. Existem porque uma recusa por limite de taxa
-- (429) nao chegou a sair, e sem elas ficaria presa para sempre. Quem reabre
-- escreve no banco de proposito, e o rastro em `disparo_tentativas` mostra
-- quantas vezes a linha girou.
--
-- O que NAO existe, de proposito:
--
--   pendente     -> enviado       era o caminho antigo, o que permitia o envio duplo
--   desconhecido -> pendente      reenviar automaticamente o que pode ter saido
--   desconhecido -> reservado     idem
--   falhou       -> enviado       falha nao se conserta em sucesso sem passar pela fila
create or replace function disparo_envio_transicao_ok(de text, para text)
returns boolean language sql immutable as $$
  select case
    when de = para then true
    when de = 'pendente'     and para in ('reservado','pulado')                     then true
    when de = 'reservado'    and para in ('enviando','pendente','pulado','falhou')  then true
    when de = 'enviando'     and para in ('enviado','falhou','desconhecido')        then true
    when de = 'desconhecido' and para in ('enviado','falhou')                       then true
    when de = 'enviado'      and para in ('falhou')                                 then true
    when de = 'pulado'       and para in ('pendente')                               then true
    when de = 'falhou'       and para in ('pendente')                               then true
    else false
  end;
$$;

create or replace function disparo_envio_guarda() returns trigger
language plpgsql as $$
begin
  if not disparo_envio_transicao_ok(old.estado, new.estado) then
    raise exception
      'transicao de envio invalida: % -> % (envio %)', old.estado, new.estado, old.id
      using errcode = 'check_violation';
  end if;
  return new;
end $$;

drop trigger if exists disparo_envio_guarda_trg on disparo_envios;
create trigger disparo_envio_guarda_trg
  before update of estado on disparo_envios
  for each row execute function disparo_envio_guarda();

-- ---------------------------------------------------------------------------
-- 4. Reserva atomica
--
-- O coracao da etapa. `for update skip locked` e o idioma do Postgres para
-- fila de trabalho: a subconsulta trava as linhas que escolheu, e uma linha
-- travada por outra transacao e pulada, nao esperada. Dois processos que
-- chamem isto no mesmo instante saem com conjuntos disjuntos, sempre.
--
-- A escolha e o carimbo acontecem no MESMO comando. Nao existe aqui o
-- "le, depois escreve" que abria a janela no codigo antigo.
--
-- `order by id` da uma ordem estavel, o que reduz o cruzamento entre dois
-- processos que varrem a mesma fila.
create or replace function reservar_envios(
  p_disparo uuid,
  p_lote    int
) returns setof disparo_envios
language plpgsql as $$
declare
  linha disparo_envios;
begin
  for linha in
    update disparo_envios e
       set estado        = 'reservado',
           tentativa_id  = gen_random_uuid(),
           reservado_em  = now(),
           tentativas    = e.tentativas + 1,
           atualizado_em = now(),
           motivo        = null
     where e.id in (
       select id from disparo_envios
        where disparo_id = p_disparo
          and estado = 'pendente'
        order by id
        limit greatest(p_lote, 0)
        for update skip locked
     )
    returning e.*
  loop
    insert into disparo_tentativas
      (envio_id, disparo_id, tentativa_id, numero, reservada_em)
    values
      (linha.id, linha.disparo_id, linha.tentativa_id, linha.tentativas, linha.reservado_em);
    return next linha;
  end loop;
end $$;

comment on function reservar_envios(uuid, int) is
  'Reserva ate p_lote destinatarios pendentes de forma atomica. Devolve as linhas reservadas, cada uma com a sua tentativa_id.';

-- ---------------------------------------------------------------------------
-- 5. Transicoes com posse
--
-- Todas seguem a mesma forma: o `where` exige o estado de partida E a
-- tentativa correta. Quem nao satisfaz os dois recebe false e nao escreveu
-- nada. Nenhuma decisao aqui depende da memoria de quem chama.

-- Grava `enviando` ANTES da chamada externa. Quem recebe false nao pode
-- chamar a Meta: ou a reserva venceu, ou outro processo ja tomou a linha.
create or replace function marcar_enviando(
  p_envio     uuid,
  p_tentativa uuid,
  p_validade  interval default '10 minutes'
) returns boolean
language plpgsql as $$
declare
  achou int;
begin
  update disparo_envios
     set estado = 'enviando', atualizado_em = now()
   where id = p_envio
     and tentativa_id = p_tentativa
     and estado = 'reservado'
     and reservado_em > now() - p_validade;
  get diagnostics achou = row_count;

  if achou = 1 then
    update disparo_tentativas set enviando_em = now()
     where envio_id = p_envio and tentativa_id = p_tentativa;
  end if;
  return achou = 1;
end $$;

comment on function marcar_enviando(uuid, uuid, interval) is
  'Confere posse e prazo e persiste enviando antes da chamada a Meta. False significa: nao chame.';

-- Fecha a tentativa. Aceita `desconhecido -> enviado` quando chega um id da
-- Meta: isso e informacao nova sobre o que aconteceu, nao um reenvio.
create or replace function concluir_envio(
  p_envio         uuid,
  p_tentativa     uuid,
  p_estado        text,
  p_wa_message_id text default null,
  p_motivo        text default null,
  p_erro_codigo   text default null
) returns boolean
language plpgsql as $$
declare
  achou int;
begin
  if p_estado not in ('enviado','falhou','desconhecido') then
    raise exception 'estado final invalido: %', p_estado using errcode = 'check_violation';
  end if;

  update disparo_envios
     set estado        = p_estado,
         wa_message_id = coalesce(p_wa_message_id, wa_message_id),
         enviado_em    = case when p_estado = 'enviado' then coalesce(enviado_em, now()) else enviado_em end,
         motivo        = p_motivo,
         erro_codigo   = p_erro_codigo,
         atualizado_em = now()
   where id = p_envio
     and tentativa_id = p_tentativa
     and (estado = 'enviando'
          or (estado = 'desconhecido' and p_estado = 'enviado' and p_wa_message_id is not null));
  get diagnostics achou = row_count;

  if achou = 1 then
    update disparo_tentativas
       set terminada_em = now(), estado_final = p_estado,
           wa_message_id = coalesce(p_wa_message_id, wa_message_id),
           motivo = p_motivo, erro_codigo = p_erro_codigo
     where envio_id = p_envio and tentativa_id = p_tentativa;
  end if;
  return achou = 1;
end $$;

comment on function concluir_envio(uuid, uuid, text, text, text, text) is
  'Fecha a tentativa em enviado, falhou ou desconhecido, exigindo posse e estado enviando.';

-- Sai da reserva sem ter chamado a Meta: pulado (fora da janela), falhou (erro
-- anterior a chamada) ou pendente (devolucao voluntaria). Exige estado
-- 'reservado', entao nao ha como carimbar isto sobre algo que ja saiu.
create or replace function encerrar_reserva(
  p_envio     uuid,
  p_tentativa uuid,
  p_estado    text,
  p_motivo    text default null
) returns boolean
language plpgsql as $$
declare
  achou int;
begin
  if p_estado not in ('pulado','falhou','pendente') then
    raise exception 'estado invalido para encerrar reserva: %', p_estado using errcode = 'check_violation';
  end if;

  update disparo_envios
     set estado        = p_estado,
         motivo        = p_motivo,
         tentativa_id  = case when p_estado = 'pendente' then null else tentativa_id end,
         reservado_em  = case when p_estado = 'pendente' then null else reservado_em end,
         atualizado_em = now()
   where id = p_envio and tentativa_id = p_tentativa and estado = 'reservado';
  get diagnostics achou = row_count;

  if achou = 1 then
    update disparo_tentativas
       set terminada_em = now(), estado_final = p_estado, motivo = p_motivo
     where envio_id = p_envio and tentativa_id = p_tentativa;
  end if;
  return achou = 1;
end $$;

comment on function encerrar_reserva(uuid, uuid, text, text) is
  'Encerra uma reserva que nunca chamou a Meta: pulado, falhou ou devolucao a pendente.';

-- ---------------------------------------------------------------------------
-- 6. Recuperacao
--
-- Duas varreduras com riscos opostos, e por isso duas funcoes.
--
-- `recuperar_reservas` devolve para `pendente` o que ficou em `reservado`
-- alem do prazo. E seguro porque `reservado` significa, por construcao, que a
-- chamada a Meta nao saiu: quem fosse chamar tinha de passar por
-- `marcar_enviando` primeiro. Anular a `tentativa_id` e o que exclui o
-- processo antigo: se ele voltar e tentar `marcar_enviando`, o `where` nao
-- casa e ele recebe false.
create or replace function recuperar_reservas(
  p_disparo  uuid default null,
  p_validade interval default '10 minutes'
) returns int
language plpgsql as $$
declare
  quantas int;
begin
  update disparo_tentativas t
     set terminada_em = now(), estado_final = 'recuperada',
         motivo = 'reserva recuperada por prazo vencido'
   where t.terminada_em is null
     and t.enviando_em is null
     and t.reservada_em < now() - p_validade
     and (p_disparo is null or t.disparo_id = p_disparo);

  with voltaram as (
    update disparo_envios
       set estado        = 'pendente',
           tentativa_id  = null,
           reservado_em  = null,
           motivo        = 'reserva recuperada por prazo vencido',
           atualizado_em = now()
     where estado = 'reservado'
       and reservado_em < now() - p_validade
       and (p_disparo is null or disparo_id = p_disparo)
    returning id
  )
  select count(*)::int into quantas from voltaram;

  return quantas;
end $$;

comment on function recuperar_reservas(uuid, interval) is
  'Devolve a pendente as reservas vencidas. Seguro porque reservado significa que a chamada a Meta nao saiu. Anula a tentativa_id, excluindo o processo antigo.';

-- `expirar_enviando` trata o caso oposto: ficou em `enviando` alem do prazo,
-- entao a chamada SAIU e nao sabemos o fim. Nunca volta para `pendente`.
-- Vira `desconhecido`, que e terminal para a automacao e item de fila para
-- uma pessoa.
create or replace function expirar_enviando(
  p_disparo  uuid default null,
  p_validade interval default '5 minutes'
) returns int
language plpgsql as $$
declare
  quantas int;
  recado  text := 'sem resposta da Meta dentro do prazo; pode ter sido entregue';
begin
  update disparo_tentativas t
     set terminada_em = now(), estado_final = 'desconhecido', motivo = recado
   where t.terminada_em is null
     and t.enviando_em is not null
     and t.enviando_em < now() - p_validade
     and (p_disparo is null or t.disparo_id = p_disparo);

  with venceram as (
    update disparo_envios
       set estado        = 'desconhecido',
           motivo        = recado,
           atualizado_em = now()
     where estado = 'enviando'
       and atualizado_em < now() - p_validade
       and (p_disparo is null or disparo_id = p_disparo)
    returning id
  )
  select count(*)::int into quantas from venceram;

  return quantas;
end $$;

comment on function expirar_enviando(uuid, interval) is
  'Marca como desconhecido o que ficou em enviando alem do prazo. Nunca devolve a pendente: a chamada saiu.';

-- ---------------------------------------------------------------------------
-- 7. Reconciliacao pelo webhook de status
--
-- A Meta ja manda `statuses[]` e o webhook ja trata, em `tratarStatus`. O que
-- nao existia era o destino: `carimbar_status` escreve em `mensagens`, e
-- disparo nao cria linha em `mensagens`. Esta funcao e a irma dela para
-- `disparo_envios`, e nao encosta na outra.
--
-- `sent`, `delivered` e `read` nao mudam nada de quem ja esta `enviado`: so
-- confirmam. O que importa aqui sao dois casos:
--   - `failed`: a mensagem nao chegou, mesmo tendo sido aceita.
--   - qualquer status para uma linha `desconhecido`: prova que ela saiu, e
--     resolve o estado sem palpite.
create or replace function carimbar_envio_status(
  p_wa_message_id text,
  p_status        text,
  p_em            timestamptz default now(),
  p_erro          text default null,
  p_erro_codigo   text default null
) returns int
language plpgsql as $$
declare
  quantas int;
begin
  if p_wa_message_id is null then return 0; end if;

  with alvo as (
    update disparo_envios
       set estado = case
             when p_status = 'failed'      then 'falhou'
             when estado = 'desconhecido'  then 'enviado'
             when estado = 'enviando'      then 'enviado'
             else estado
           end,
           motivo = case when p_status = 'failed' then coalesce(p_erro, motivo) else motivo end,
           erro_codigo = case when p_status = 'failed' then coalesce(p_erro_codigo, erro_codigo) else erro_codigo end,
           enviado_em = coalesce(enviado_em, p_em),
           atualizado_em = now()
     where wa_message_id = p_wa_message_id
       and estado in ('enviado','desconhecido','enviando')
    returning 1
  )
  select count(*)::int into quantas from alvo;
  return quantas;
end $$;

comment on function carimbar_envio_status(text, text, timestamptz, text, text) is
  'Reconcilia disparo_envios com o status da Meta pelo wa_message_id. Nao toca em mensagens nem em carimbar_status.';
