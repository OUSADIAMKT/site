-- Reversao da migracao 033. NAO roda no deploy.
--
-- Perda de informacao, nomeada: cai a tabela `frentes` e o valor de
-- `disparos.frente_id`. Nada mais. Nenhuma conversa, nenhum atendimento,
-- nenhum envio e nenhuma campanha e afetado, porque a 033 nao escreveu em
-- nenhuma linha que ja existia: `frente_id` nasce nula e continua nula em
-- toda campanha anterior a ela.
--
-- Se quiser guardar o que havia antes de reverter, a tabela e pequena:
--   copy (select * from frentes) to stdout with csv header;
-- ou um `select *` pelo painel do Supabase.

-- O passo 1 tem que vir antes do 3: enquanto `disparos.frente_id` apontar
-- para `frentes`, o drop da tabela e recusado.
alter table disparos drop constraint if exists disparos_frente_mesma_empresa;
drop index if exists disparos_frente_idx;
alter table disparos drop column if exists frente_id;

drop trigger if exists frente_assunto_trg on frentes;
drop trigger if exists frente_carimbar_trg on frentes;
drop function if exists frente_assunto_sem_conflito();
drop function if exists frente_carimbar();
drop table if exists frentes;

-- A RLS e as concessoes de `frentes` nao precisam de linha propria: elas
-- moram na tabela e caem com ela no `drop table` acima.

-- Por ultimo o unique em atendentes, que so existia para a chave composta da
-- 033 poder apontar. Remover e opcional: ele nao custa nada e nao muda
-- comportamento, porque `id` ja e chave primaria. Deixar e o certo: a 033
-- agora cria essa constraint so se ela nao existir, entao deixa-la aqui faz a
-- reaplicacao da 033 funcionar sem tocar em `atendentes`.
-- alter table atendentes drop constraint if exists atendentes_id_cliente_key;
