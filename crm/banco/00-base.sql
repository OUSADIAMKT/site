-- 00 · o que o Supabase trazia pronto e um Postgres comum não traz
--
-- Rodar UMA vez, como superusuário, no banco `crm` recém-criado, antes do
-- 01-esquema.sql. Ver crm/README.md, seção "Banco".
--
-- O código fala com o banco por HTTP, pelo PostgREST, do mesmo jeito que
-- falava com o Supabase (que é PostgREST por baixo). Para isso o PostgREST
-- precisa de três papéis:
--
--   authenticator  o único que faz login. Não enxerga nada sozinho: ele só
--                  troca de papel conforme o token que chega.
--   service_role   o papel do servidor do CRM. Ignora RLS. É o único que lê e
--                  escreve, igual era no Supabase.
--   anon           quem chega sem token. Não tem permissão em nada.
--
-- A senha do `authenticator` NÃO está aqui: ela é definida na mão, uma vez,
-- e vai só no arquivo de configuração do PostgREST (ver README).

do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'anon') then
    create role anon nologin;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then
    create role authenticated nologin;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'service_role') then
    create role service_role nologin bypassrls;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticator') then
    create role authenticator login noinherit;
  end if;
end $$;

grant anon to authenticator;
grant service_role to authenticator;

-- As extensões moram num esquema próprio, como no Supabase. O 01-esquema.sql
-- e algumas funções procuram por `extensions.gen_random_bytes`.
create schema if not exists extensions;
grant usage on schema extensions to service_role, anon, authenticated;

-- O esquema `auth` do Supabase. O CRM não usa o login do Supabase (o login é
-- próprio, em `atendentes`), mas o esquema herdado aponta para dois objetos
-- dele: uma chave estrangeira em `atendentes.auth_user_id` e a função
-- `auth.uid()`, dentro de `cliente_do_usuario()`. Os dois ficam aqui como
-- casca vazia para o 01-esquema.sql aplicar sem erro.
create schema if not exists auth;

create table if not exists auth.users (
  id uuid primary key
);

create or replace function auth.uid() returns uuid
language sql stable
as $$
  select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
$$;

-- No Supabase o `search_path` padrão já inclui `extensions`, e o esquema
-- herdado conta com isso (`gen_random_bytes` em valor padrão de coluna, por
-- exemplo). Aqui vale para toda sessão nova neste banco, e o PostgREST
-- repete o mesmo em `db-extra-search-path`.
do $$
begin
  execute format('alter database %I set search_path = public, extensions', current_database());
end $$;
