-- Etapa 2: o canal deixa de ser so WhatsApp.
--
-- Uma empresa pode atender por Instagram E WhatsApp. Hoje os dois moram em lugares
-- diferentes e desiguais: o WhatsApp numa tabela propria, com token cifrado e
-- varios numeros por cliente; o Instagram em tres colunas soltas de `clientes`,
-- com o token em texto puro e um perfil so por cliente.
--
-- Essa diferenca nao tem razao de ser, e ela aparece na tela: o operador
-- precisa de UMA lista de canais para escolher em qual esta trabalhando, nao
-- de uma tabela para um canal e um punhado de colunas para o outro.
--
-- `canais_wa` esta com zero linhas, entao generalizar agora nao migra dado
-- nenhum e nao tem risco.

alter table canais_wa rename to canais;
alter index if exists canais_wa_cliente rename to canais_cliente;

-- O que separa um canal do outro. Tudo que ja existia nasceu WhatsApp.
alter table canais add column if not exists tipo text not null default 'whatsapp';
alter table canais add constraint canais_tipo_conhecido
  check (tipo in ('whatsapp', 'instagram'));

-- Os campos de WhatsApp param de ser obrigatorios, porque um canal de
-- Instagram nao tem numero, nem WABA, nem verify token proprio.
alter table canais alter column waba_id         drop not null;
alter table canais alter column phone_number_id drop not null;
alter table canais alter column numero_e164     drop not null;
alter table canais alter column verify_token    drop not null;

-- E os de Instagram entram.
alter table canais add column if not exists ig_user_id text;
-- O host da API do Instagram muda conforme o tipo da conta. Vive no banco
-- para nao precisar de deploy no dia em que a Meta mudar de ideia.
alter table canais add column if not exists ig_base text;

create unique index if not exists canais_ig on canais (ig_user_id)
  where ig_user_id is not null;

-- Cada tipo exige o seu. Vale no banco, e nao so no formulario, porque uma
-- linha pela metade aqui vira um canal que aceita mensagem e nao responde.
alter table canais add constraint canais_campos_do_tipo check (
  (tipo = 'whatsapp'  and phone_number_id is not null
                      and waba_id is not null
                      and numero_e164 is not null
                      and verify_token is not null)
  or
  (tipo = 'instagram' and ig_user_id is not null)
);

comment on table canais is
  'Um canal de atendimento de um cliente. WhatsApp Cloud API ou Instagram. '
  'Token sempre cifrado: a chave vive em variavel de ambiente, fora do banco.';

comment on column canais.tipo is 'whatsapp ou instagram.';
comment on column canais.verify_token is
  'So WhatsApp. O Instagram usa o verify token do app, nao um por canal.';
