-- CRM · 012 · guardar a resposta pública do comentário
--
-- Não é histórico por capricho: é o que impede o bot de repetir a mesma frase
-- embaixo de vinte posts. Antes de responder, ele lê as últimas respostas que
-- deu e é proibido de repetir qualquer uma.
--
-- Repetição literal é o padrão que o Instagram usa para identificar automação,
-- e numa conta já restringida isso custa a conta.
--
-- Idempotente. (A semente de cliente que existia aqui saiu do pacote de
-- transferencia: ela so tinha dado de um cliente especifico.)

alter table ig_comentarios add column if not exists resposta_publica text;

comment on column ig_comentarios.resposta_publica is
  'O texto publicado embaixo do comentário. Lido de volta para proibir repetição.';

-- A consulta é sempre "as últimas N deste cliente que têm resposta pública".
create index if not exists ig_comentarios_respostas
  on ig_comentarios (cliente_id, criado_em desc)
  where resposta_publica is not null;

select count(*) as comentarios, count(resposta_publica) as com_resposta
from ig_comentarios;
