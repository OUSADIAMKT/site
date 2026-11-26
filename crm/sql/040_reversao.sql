-- Reversão da 040.
--
-- Perde as fotos que tiverem sido cadastradas e a escolha de campos do cartão
-- de cada pessoa. Depois disto o cartão volta a mostrar o conjunto padrão para
-- todo mundo, que é o comportamento de antes da 040. Negócios, contatos,
-- etapas e conversas não são tocados.
drop table if exists public.crm_quadro_campos;
drop index if exists public.crm_negocios_criado;
alter table contatos drop column if exists foto_url;
