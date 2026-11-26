-- Reversão da 043.
--
-- Desfaz as três coisas: a origem volta a ser nula nos negócios que a 043
-- preencheu, as origens criadas por ela saem do cadastro, e a coluna `chave`
-- some junto com o índice.
--
-- A ordem importa. Apagar a coluna primeiro deixaria as linhas de origem no
-- cadastro sem como distinguir quais nasceram aqui, e o seletor do CRM ficaria
-- com nomes que ninguém escolheu.
--
-- Origem escolhida à mão tem `chave` nula: não é apagada, e o negócio que
-- aponta para ela continua apontando.
update public.crm_negocios n
set origem_id = null
where n.origem_id in (select id from public.crm_origens where chave is not null);

delete from public.crm_origens where chave is not null;

drop index if exists crm_origens_cliente_chave;
alter table public.crm_origens drop column if exists chave;
