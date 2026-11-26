-- 02 · quem pode o quê, depois do 01-esquema.sql
--
-- Igual ao Supabase: RLS ligada em todas as tabelas e nenhuma política. Com
-- isso só o `service_role`, que ignora RLS, lê e escreve. O `anon` não recebe
-- nada: um token vazado de navegador não abre o banco.
--
-- Pode rodar de novo sem efeito colateral (por exemplo depois de uma
-- migração nova, para a tabela nova ganhar as mesmas permissões).

revoke all on schema public from public;
grant usage on schema public to service_role;

grant all on all tables in schema public to service_role;
grant all on all sequences in schema public to service_role;
grant execute on all functions in schema public to service_role;

revoke all on all tables in schema public from anon, authenticated;
revoke all on all sequences in schema public from anon, authenticated;
revoke execute on all functions in schema public from public, anon, authenticated;

-- O que for criado depois, pelo dono do banco, nasce com as mesmas regras.
alter default privileges in schema public grant all on tables to service_role;
alter default privileges in schema public grant all on sequences to service_role;
alter default privileges in schema public grant execute on functions to service_role;
alter default privileges in schema public revoke execute on functions from public;
