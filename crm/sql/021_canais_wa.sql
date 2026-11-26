-- Etapa 2: o WhatsApp oficial, em tabela propria.

-- O numero sai de dentro de `clientes`.
--
-- Estava em `clientes.wa_phone_number_id` e `clientes.wa_token`, uma coluna
-- cada, o que prende o cliente a um numero so. A empresa ja nasce podendo ter
-- mais de um, e separar tambem permite trocar de numero sem mexer no cliente.
--
-- Token e app secret entram cifrados em AES-256-GCM, com a chave em variavel
-- de ambiente. A chave nao mora no banco de proposito: quem leva um dump do
-- banco nao leva junto o poder de mandar mensagem em nome do cliente.
create table if not exists canais_wa (
  id                uuid primary key default gen_random_uuid(),
  cliente_id        uuid not null references clientes(id) on delete cascade,
  waba_id           text not null,
  phone_number_id   text not null unique,
  numero_e164       text not null,
  nome_exibicao     text,
  token_cifrado     text not null,
  app_secret_cifrado text,
  verify_token      text not null,
  -- true quando o numero continua rodando no aplicativo do celular.
  coexistencia      boolean not null default false,
  -- quantas conversas por 24h a Meta libera: 250, 1000, 10000, ilimitado.
  tier              text,
  ativo             boolean not null default true,
  criado_em         timestamptz not null default now()
);

create index if not exists canais_wa_cliente on canais_wa (cliente_id) where ativo;
alter table canais_wa enable row level security;

-- Mensagem de verdade, nao so papel e conteudo.
--
-- A tabela nasceu para a IA, que so precisava saber quem falou o que. Agora
-- precisa de midia, de status de entrega e da nota interna, que e a mensagem
-- que a equipe escreve para ela mesma e o cliente nunca ve.
alter table mensagens
  add column if not exists direcao text,
  add column if not exists tipo text not null default 'texto',
  add column if not exists midia_id text,
  add column if not exists midia_url text,
  add column if not exists status text,
  add column if not exists status_em timestamptz,
  add column if not exists erro text,
  add column if not exists interna boolean not null default false,
  add column if not exists autor_atendente_id uuid references atendentes(id) on delete set null;

-- Status chega pelo webhook em evento separado, as vezes fora de ordem e as
-- vezes repetido. O indice e por wa_message_id, que e como a Meta identifica
-- a mensagem, e e por ele que o status acha a linha para carimbar.
create index if not exists mensagens_wa_id on mensagens (wa_message_id)
  where wa_message_id is not null;

-- Nota interna nunca sai para o cliente. Fica escrito aqui, no banco, e nao
-- so no codigo: regra que protege gente de ver o que nao devia merece viver
-- onde nenhum deploy errado apaga.
comment on column mensagens.interna is
  'Nota da equipe para a equipe. NUNCA enviar para o contato.';
