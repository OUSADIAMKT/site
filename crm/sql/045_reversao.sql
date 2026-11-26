-- Reversão da 045.
--
-- A ordem importa: a chave estrangeira da publicação liga as duas tabelas, e
-- `pagina_versoes` não cai enquanto ela existir. A trigger e a função morrem
-- junto com a tabela, mas a função é derrubada no nome para não sobrar uma
-- função órfã no esquema.
alter table if exists public.paginas drop constraint if exists paginas_versao_publicada_fk;

drop table if exists public.pagina_dominios;
drop table if exists public.pagina_versoes;
drop table if exists public.paginas;

drop function if exists public.pagina_versao_numero();
