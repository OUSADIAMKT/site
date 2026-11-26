-- Reversão da 039.
--
-- Perde o estado de lido/não lido de todo mundo: depois disto a lista volta a
-- não ter negrito nem bolinha verde, e nada mais no painel depende dela. As
-- conversas e as mensagens não são tocadas.
drop function if exists public.nao_lidas_das_conversas(uuid[], text);
drop table if exists public.leituras_conversa;
