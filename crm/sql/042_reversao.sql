-- Reversão da 042.
--
-- A view volta a ser só as atendentes, e o relatório volta a esconder o que o
-- gestor assumiu. As colunas caem e com elas o registro de quem pôs a mão em
-- cada passagem; `atendente_id` nunca foi tocado, então nada do que já era
-- atribuído a uma atendente se perde.

create or replace view desempenho_equipe as
select
  a.cliente_id,
  a.id                                as atendente_id,
  a.nome,
  a.papel,
  a.disponivel,
  count(t.id) filter (where t.assumida_em is not null)          as atendimentos,
  count(t.id) filter (where t.encerrada_em is null
                        and t.assumida_em is not null)          as em_aberto,
  avg(extract(epoch from (t.assumida_em - t.entrou_fila)))
    filter (where t.assumida_em is not null)                    as espera_media_seg,
  avg(extract(epoch from (t.encerrada_em - t.assumida_em)))
    filter (where t.encerrada_em is not null)                   as duracao_media_seg
from atendentes a
left join atendimentos t
  on t.atendente_id = a.id
 and t.entrou_fila >= date_trunc('month', now())
where a.ativo
group by a.cliente_id, a.id, a.nome, a.papel, a.disponivel;

alter table atendimentos drop column if exists assumido_por;
alter table conversas    drop column if exists assumido_por;
