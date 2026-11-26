-- Reversao da migracao 034. NAO roda no deploy.
--
-- Isto DESLIGA uma protecao. Reverter a 034 devolve `disparo_tentativas` ao
-- estado em que a 032 a deixou, que e o estado que a auditoria da Etapa 1
-- apontou como falha. So existe motivo para rodar isto se a RLS quebrar algo
-- que nao foi previsto, e nesse caso a informacao que interessa e QUAL acesso
-- quebrou, porque o painel usa a chave de servico e nao deveria ser afetado.
--
-- Nenhuma perda de dado: a 034 nao escreveu em nenhuma linha.

alter table disparo_tentativas disable row level security;

-- As concessoes de `anon` e `authenticated` NAO sao devolvidas aqui, de
-- proposito. Elas eram o padrao do Supabase, nao uma decisao deste projeto, e
-- nada no sistema as usa: o frontend nao fala com o Supabase direto. Devolver
-- a concessao junto com o disable seria reabrir a falha inteira em vez de
-- apenas desfazer a camada que se suspeita ter quebrado algo.
--
-- Se mesmo assim for preciso devolver, o comando esta aqui comentado:
--
-- do $$
-- begin
--   if exists (select 1 from pg_roles where rolname = 'anon') then
--     grant select, insert, update, delete on table disparo_tentativas to anon;
--   end if;
--   if exists (select 1 from pg_roles where rolname = 'authenticated') then
--     grant select, insert, update, delete on table disparo_tentativas to authenticated;
--   end if;
-- end $$;
