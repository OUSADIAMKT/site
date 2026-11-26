-- Documentacao do esquema que JA EXISTE em producao para disparo.
--
-- Esta migracao nao cria, nao altera e nao apaga nada. Ela existe porque
-- `disparos`, `disparo_envios` e `contatos` foram criadas em 027/028 e o
-- arquivo de origem nao descreve as colunas que hoje estao no banco. Sem este
-- registro, qualquer pessoa que leia a pasta `sql/` em ordem monta um esquema
-- diferente do real, e a proxima migracao erra o alvo.
--
-- A unica coisa executavel aqui e `comment on`, que escreve no catalogo e nao
-- toca em uma linha de dado. Se este arquivo rodar duas vezes, o resultado e
-- identico.
--
-- Levantado em 19/11/2026 direto do information_schema do banco de origem.
--
-- ---------------------------------------------------------------------------
-- disparos  (como esta hoje)
--
--   id               uuid         not null  default gen_random_uuid()
--   cliente_id       uuid         not null
--   nome             text         not null
--   texto            text
--   midia_id         uuid
--   link_id          uuid
--   template_nome    text
--   template_idioma  text
--   publico          jsonb
--   estado           text         not null  default 'rascunho'
--   totais           jsonb
--   criado_por       text                   <- texto livre, nao e FK
--   criado_em        timestamptz
--   iniciado_em      timestamptz
--   concluido_em     timestamptz
--
--   check (estado in ('rascunho','testando','enviando','concluido','parado'))
--   index disparos_cliente_idx (cliente_id, criado_em desc)
--
-- disparo_envios  (como esta hoje)
--
--   id             uuid         not null  default gen_random_uuid()
--   disparo_id     uuid         not null
--   contato_id     uuid
--   telefone       text         not null
--   estado         text         not null  default 'pendente'
--   motivo         text
--   wa_message_id  text
--   enviado_em     timestamptz
--
--   check (estado in ('pendente','enviado','falhou','pulado'))
--   unique (disparo_id, telefone)          <- trava contra dois envios ao
--                                             mesmo numero no mesmo disparo
--   index disparo_envios_fila_idx (disparo_id, estado)
--
-- O que este esquema NAO tem, e e o motivo da migracao 032: nenhuma coluna
-- diz quem esta tratando a linha agora. `pendente` significa ao mesmo tempo
-- "ninguem pegou" e "alguem pegou e esta no meio da chamada a Meta". Dois
-- processos lendo `estado = 'pendente'` veem a mesma lista.
-- ---------------------------------------------------------------------------

comment on table disparos is
  'Campanha de WhatsApp. Uma linha por campanha; os destinatarios ficam em disparo_envios.';

comment on column disparos.criado_por is
  'Nome de quem criou, como texto livre. Nao e chave estrangeira para atendentes.';

comment on column disparos.totais is
  'Resumo denormalizado {alvo, enviados, falhas, pulados}, reescrito ao fim de cada lote.';

comment on table disparo_envios is
  'Um destinatario de uma campanha. Criada em pendente junto com a campanha, antes de qualquer envio.';

comment on column disparo_envios.telefone is
  'E.164 com o +. Compoe o unique (disparo_id, telefone).';

comment on column disparo_envios.wa_message_id is
  'Id devolvido pela Meta no envio. Unico identificador confiavel para reconciliar entrega.';
