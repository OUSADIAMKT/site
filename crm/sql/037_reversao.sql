-- Reversão da 037.
--
-- Derruba o que a 037 criou e devolve `contatos`, `crm_negocios` e
-- `crm_etapas` ao formato anterior. Nenhuma linha de dado antigo é tocada:
-- as colunas removidas aqui são as mesmas que a 037 acrescentou, e elas não
-- existiam antes dela.
--
-- O que esta reversão PERDE, e não tem como não perder: tarefas, anotações,
-- automações, execuções e sugestões de IA gravadas enquanto a 037 esteve no
-- ar, mais prioridade, previsão, valor fechado e score dos negócios. Se já
-- houver uso real, exporte essas tabelas antes de rodar isto.

drop table if exists crm_ia_sugestoes;
drop table if exists crm_ia_config;
drop table if exists crm_automacao_execucoes;
drop table if exists crm_automacoes;
drop table if exists crm_notas;
drop table if exists crm_tarefas;

alter table crm_etapas drop constraint if exists crm_etapas_limite_check;
alter table crm_etapas drop column if exists limite_dias;

alter table crm_negocios drop constraint if exists crm_negocios_prioridade_check;
alter table crm_negocios drop column if exists score;
alter table crm_negocios drop column if exists valor_fechado;
alter table crm_negocios drop column if exists previsao_em;
alter table crm_negocios drop column if exists prioridade;
drop index if exists crm_negocios_previsao;
drop index if exists crm_negocios_parado;

drop index if exists contatos_responsavel;
drop index if exists contatos_empresa;
drop index if exists contatos_documento;
alter table contatos drop column if exists canal;
alter table contatos drop column if exists origem_id;
alter table contatos drop column if exists score;
alter table contatos drop column if exists responsavel_id;
alter table contatos drop column if exists campos;
alter table contatos drop column if exists documento;
alter table contatos drop column if exists empresa;

-- As chaves compostas saem por último: as tabelas que dependiam delas já
-- foram derrubadas acima.
alter table crm_negocios drop constraint if exists crm_negocios_id_cliente;
alter table contatos     drop constraint if exists contatos_id_cliente;
