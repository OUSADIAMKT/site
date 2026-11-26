-- CRM · 010 · canais
-- O WhatsApp identifica a pessoa por telefone. O Instagram identifica por IGSID,
-- que não é telefone nenhum. Então a conversa passa a ter `canal` + `contato`,
-- e `telefone` continua existindo porque a agenda marca consulta com telefone.
--
-- Rode no SQL Editor do Supabase. Idempotente.
-- ATENÇÃO: o editor do Supabase roda só o texto selecionado se houver seleção.
-- Clique fora, não selecione nada, e rode o arquivo inteiro.

-- ---------------------------------------------------------------
-- 1. Colunas novas
-- ---------------------------------------------------------------
alter table conversas add column if not exists canal   text not null default 'whatsapp';
alter table conversas add column if not exists contato text;

-- Quem já está no banco é WhatsApp, e o contato é o telefone.
-- Backfill antes de exigir not null, senão a migração falha com dado existente.
update conversas set contato = telefone where contato is null;

alter table conversas alter column telefone drop not null;
alter table conversas alter column contato  set not null;

-- ---------------------------------------------------------------
-- 2. A unicidade passa a ser por canal
-- ---------------------------------------------------------------
-- A tabela nasceu com `unique (cliente_id, telefone)`. Com dois canais isso
-- impediria a mesma pessoa de falar pelos dois, e não serve para o Instagram,
-- onde telefone é nulo. Localiza a restrição antiga pelas colunas, não pelo
-- nome, porque nome gerado pelo Postgres não é contrato.
do $$
declare
  antiga text;
begin
  select con.conname into antiga
  from pg_constraint con
  join pg_class rel on rel.oid = con.conrelid
  where rel.relname = 'conversas'
    and con.contype = 'u'
    and (
      select array_agg(att.attname::text order by att.attname)
      from unnest(con.conkey) k
      join pg_attribute att on att.attrelid = con.conrelid and att.attnum = k
    ) = array['cliente_id', 'telefone'];

  if antiga is not null then
    execute format('alter table conversas drop constraint %I', antiga);
  end if;
end $$;

create unique index if not exists conversas_cliente_canal_contato
  on conversas (cliente_id, canal, contato);

-- ---------------------------------------------------------------
-- 3. Canal válido
-- ---------------------------------------------------------------
do $$
begin
  alter table conversas
    add constraint conversas_canal_valido
    check (canal in ('whatsapp', 'instagram'));
exception
  when duplicate_object then null;
end $$;

create index if not exists conversas_cliente_canal on conversas (cliente_id, canal);

-- ---------------------------------------------------------------
-- 4. Deduplicação de mensagem, agora com índice
-- ---------------------------------------------------------------
-- `wa_message_id` passa a guardar o id da mensagem em qualquer canal. O webhook
-- consulta esta coluna em TODA mensagem recebida, para não processar duas vezes
-- o mesmo evento reenviado pela Meta, e até agora essa consulta varria a tabela
-- inteira. O índice único também torna a deduplicação uma garantia do banco, e
-- não só uma consulta que pode perder uma corrida.
create unique index if not exists mensagens_id_externo
  on mensagens (wa_message_id) where wa_message_id is not null;

comment on column mensagens.wa_message_id is
  'Id da mensagem no canal de origem (WhatsApp ou Instagram). Usado para deduplicar reenvio da Meta.';
comment on column conversas.contato is
  'Identificador da pessoa no canal: telefone no WhatsApp, IGSID no Instagram.';
comment on column conversas.telefone is
  'Telefone, quando existe. Nulo em conversa que nasceu no Instagram. A agenda usa este campo.';

-- ---------------------------------------------------------------
-- Confirmação
-- ---------------------------------------------------------------
select canal, count(*) as conversas, count(telefone) as com_telefone
from conversas
group by canal;
