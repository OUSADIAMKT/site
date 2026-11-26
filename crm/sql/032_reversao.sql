-- Reversao da migracao 032. NAO roda no deploy; existe para ser colada a mao
-- se a Etapa 0 precisar ser desfeita no banco de producao.
--
-- Ordem importa. O passo 1 tem que vir antes de tudo, porque o proprio trigger
-- da 032 recusaria as transicoes que a reversao precisa fazer.
--
-- Depois de rodar este arquivo, rode scripts/restaurar-disparos.js para
-- devolver as 8 colunas originais das 297 linhas a partir do backup
-- backups/crm-disparos-pre-032-2026-11-19.json. Esta reversao cuida do
-- esquema; o script cuida dos dados.
--
-- Atencao ao que NAO e simetrico: uma linha que chegou a 'enviando' ou a
-- 'desconhecido' teve a chamada a Meta despachada. Devolver essas linhas a
-- 'pendente' faria o codigo antigo enviar de novo para a mesma pessoa. Por
-- isso o passo 2 manda essas duas para 'falhou' com o motivo escrito, e nao
-- para 'pendente'. Perder a linha e reversivel; a pessoa receber duas vezes
-- nao e.

-- 1. o guarda sai primeiro
drop trigger if exists disparo_envio_guarda_trg on disparo_envios;

-- 2. nenhum estado novo pode sobrar, senao o check antigo recusa
update disparo_envios
   set estado = 'pendente', motivo = 'reserva desfeita na reversao da 032'
 where estado = 'reservado';

update disparo_envios
   set estado = 'falhou',
       motivo = 'estado ' || estado || ' na reversao da 032; a chamada a Meta '
                || 'pode ter saido, conferir no painel da Meta antes de reenviar'
 where estado in ('enviando', 'desconhecido');

-- 3. o check volta aos quatro estados de 027/028
alter table disparo_envios drop constraint if exists disparo_envios_estado_check;
alter table disparo_envios add constraint disparo_envios_estado_check
  check (estado in ('pendente','enviado','falhou','pulado'));

-- 4. as funcoes
drop function if exists carimbar_envio_status(text, text, timestamptz, text, text);
drop function if exists expirar_enviando(uuid, interval);
drop function if exists recuperar_reservas(uuid, interval);
drop function if exists encerrar_reserva(uuid, uuid, text, text);
drop function if exists concluir_envio(uuid, uuid, text, text, text, text);
drop function if exists marcar_enviando(uuid, uuid, interval);
drop function if exists reservar_envios(uuid, int);
drop function if exists disparo_envio_guarda();
drop function if exists disparo_envio_transicao_ok(text, text);

-- 5. o rastro das tentativas. Se quiser guardar o historico, pule esta linha:
-- a tabela nao atrapalha o codigo antigo, que nem sabe que ela existe.
drop table if exists disparo_tentativas;

-- 6. os indices parciais
drop index if exists disparo_envios_relogio_idx;
drop index if exists disparo_envios_wa_id_idx;

-- 7. as colunas
alter table disparo_envios drop column if exists erro_codigo;
alter table disparo_envios drop column if exists atualizado_em;
alter table disparo_envios drop column if exists tentativas;
alter table disparo_envios drop column if exists tentativa_id;
alter table disparo_envios drop column if exists reservado_em;

-- A 031 nao precisa de reversao: ela so escreveu `comment on`. Se quiser
-- apagar os comentarios, `comment on ... is null` em cada um.
