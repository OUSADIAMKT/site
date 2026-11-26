-- Funil que recebe as conversas sozinho, como nos CRMs de mercado: toda pessoa que
-- fala com o cliente vira um negócio na primeira etapa deste funil.
-- Um por cliente faz sentido; o código usa o primeiro marcado.
alter table crm_funis add column if not exists entrada_automatica boolean not null default false;

-- Os funis que já existiam (o primeiro de cada cliente) passam a receber.
update crm_funis set entrada_automatica = true
where id in (select distinct on (cliente_id) id from crm_funis order by cliente_id, ordem, criado_em);
