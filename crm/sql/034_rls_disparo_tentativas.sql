-- Correcao: liga RLS em `disparo_tentativas`.
--
-- POR QUE ESTA MIGRACAO EXISTE
--
-- A migracao 032 criou `disparo_tentativas` e esqueceu de ligar RLS. Com isso
-- aquela tabela ficou sendo a unica do banco com `relrowsecurity = false`.
-- Todas as outras tem RLS ligada com zero politicas, o que nega `anon` e
-- `authenticated` por completo. Esses dois papeis, por padrao do Supabase, tem
-- concessao cheia de select, insert, update e delete nas tabelas do schema
-- public: nas outras tabelas a concessao nao serve para nada porque a RLS nega
-- antes; nesta tabela ela valia sem nada para barrar.
--
-- O que estava segurando era a chave publica do projeto nao ser publicada: o
-- frontend deste projeto nao fala com o Supabase direto, e nem a chave nem a
-- referencia do projeto aparecem em `dist/` ou em `src/`. Isso e obscuridade,
-- nao controle de acesso, e nao e o que protege as outras tabelas.
--
-- Esta migracao e separada da 033 de proposito: `disparo_tentativas` ja esta
-- em producao desde 20/11/2026 e a 033 ainda nao foi aplicada. Sao dois
-- assuntos com dois momentos de aplicacao.
--
-- ADITIVA E SEM EFEITO NO PAINEL. Nao cria, nao apaga e nao altera coluna
-- nenhuma, e nao toca em uma linha de dado. O painel fala com o banco pela
-- chave de servico, e `service_role` tem bypassrls, entao a Etapa 0 continua
-- funcionando exatamente como funciona hoje: `reservar_envios`,
-- `marcar_enviando`, `registrar_resultado` e `expirar_enviando` sao funcoes
-- chamadas pelo backend com aquela chave.
--
-- Reversao em sql/034_reversao.sql.

-- ---------------------------------------------------------------------------
-- 1. a RLS

alter table disparo_tentativas enable row level security;

-- ---------------------------------------------------------------------------
-- 2. e a concessao, para precisar de dois erros em vez de um
--
-- Condicional porque `anon` e `authenticated` sao papeis do Supabase e nao
-- existem num Postgres limpo, como o dos testes: `revoke` em papel que nao
-- existe e erro, nao no-op.

do $$
begin
  if exists (select 1 from pg_roles where rolname = 'anon') then
    revoke all on table disparo_tentativas from anon;
  end if;
  if exists (select 1 from pg_roles where rolname = 'authenticated') then
    revoke all on table disparo_tentativas from authenticated;
  end if;
end $$;

comment on table disparo_tentativas is
  'Uma linha por chamada a Meta, para a tentativa ser rastreavel. RLS ligada sem politica: so a chave de servico entra.';

-- ---------------------------------------------------------------------------
-- 3. conferencia
--
-- Depois de rodar, isto tem que devolver uma linha com `rls` verdadeiro e
-- `politicas` zero, igual a todas as outras tabelas do banco:
--
--   select c.relname,
--          c.relrowsecurity as rls,
--          (select count(*) from pg_policy p where p.polrelid = c.oid) as politicas
--     from pg_class c join pg_namespace n on n.oid = c.relnamespace
--    where n.nspname = 'public' and c.relname = 'disparo_tentativas';
--
-- E isto tem que devolver zero linhas, ou seja, nenhuma tabela do schema
-- public sem RLS:
--
--   select c.relname
--     from pg_class c join pg_namespace n on n.oid = c.relnamespace
--    where n.nspname = 'public' and c.relkind = 'r' and not c.relrowsecurity;
