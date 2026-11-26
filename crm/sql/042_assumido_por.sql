-- 042: quem assumiu a conversa, quando quem assumiu não é uma atendente.
--
-- NÃO APLICADA. Espera autorização expressa.
--
-- O problema: `atendimentos.atendente_id` é chave estrangeira para
-- `atendentes`, e o gestor não tem linha lá. Quando ele assume uma conversa
-- pela aba Conversas, o `atenderAgora` grava a passagem com `atendente_id`
-- nulo, e a passagem fica sem dono. No piloto eram 20 passagens assim, de
-- 13/11 a 24/11/2026.
--
-- O efeito é calado: a view `desempenho_equipe` junta por
-- `t.atendente_id = a.id`, então essas passagens não entram em pessoa nenhuma,
-- enquanto o total do relatório conta toda passagem com `assumida_em`. No mês
-- em que isto foi escrito: 154 no total, 134 somando por atendente.
--
-- A correção segue o caminho que `leituras_conversa` já abriu: uma coluna de
-- texto com o id da atendente OU a palavra 'operador', que é o que `quemLe`
-- devolve para quem entra como gestor. Texto e não chave estrangeira de
-- propósito: o gestor não é uma linha de `atendentes` e não deveria virar uma
-- só para caber num relatório.
--
-- `atendente_id` continua existindo e continua sendo a verdade sobre QUAL
-- atendente. `assumido_por` responde outra pergunta: quem pôs a mão nisto.

-- ---------------------------------------------------------------------------
-- 1. A coluna, nos dois lugares
--
-- Em `atendimentos` porque é lá que mora o histórico e o relatório. Em
-- `conversas` porque é de lá que a Fila e o Quadro leem o estado de agora: sem
-- ela, a conversa que o gestor está atendendo aparece na coluna "atendendo"
-- com o nome em branco.

alter table atendimentos add column if not exists assumido_por text;
alter table conversas    add column if not exists assumido_por text;

-- ---------------------------------------------------------------------------
-- 2. O que já está gravado
--
-- Duas passadas. A primeira preenche o que dá para saber com certeza: passagem
-- com atendente tem o id dela. A segunda é a correção de verdade: passagem
-- assumida sem atendente só pode ter vindo do `atenderAgora` com alvo nulo,
-- que é o gestor assumindo pela aba Conversas. Não há outro caminho no código
-- que produza `assumida_em` preenchido e `atendente_id` nulo.
--
-- Não é adivinhação de quem foi: 'operador' é exatamente o que o sistema
-- grava daqui em diante para esse mesmo caso, porque a plataforma não
-- distingue um gestor de outro.

update atendimentos
   set assumido_por = atendente_id::text
 where assumido_por is null
   and atendente_id is not null;

update atendimentos
   set assumido_por = 'operador'
 where assumido_por is null
   and assumida_em is not null
   and atendente_id is null;

update conversas
   set assumido_por = atendente_id::text
 where assumido_por is null
   and modo = 'humano'
   and atendente_id is not null;

-- ---------------------------------------------------------------------------
-- 3. O relatório volta a fechar
--
-- A view ganha uma linha por cliente com o que o gestor assumiu. Ela não sai
-- de `atendentes`, porque ele não está lá; sai das próprias passagens.
--
-- A janela continua sendo o mês corrente, igual à de antes, para a linha nova
-- somar na mesma conta das outras. Mudar a janela aqui seria consertar uma
-- divergência criando outra.

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
group by a.cliente_id, a.id, a.nome, a.papel, a.disponivel

union all

select
  t.cliente_id,
  null::uuid                                                    as atendente_id,
  'Gestor'                                                      as nome,
  'gestor'                                                      as papel,
  false                                                         as disponivel,
  count(t.id)                                                   as atendimentos,
  count(t.id) filter (where t.encerrada_em is null)             as em_aberto,
  avg(extract(epoch from (t.assumida_em - t.entrou_fila)))      as espera_media_seg,
  avg(extract(epoch from (t.encerrada_em - t.assumida_em)))
    filter (where t.encerrada_em is not null)                   as duracao_media_seg
from atendimentos t
where t.assumida_em is not null
  and t.atendente_id is null
  and t.assumido_por is not null
  and t.entrou_fila >= date_trunc('month', now())
group by t.cliente_id;
