-- Etapa 1 do v2: diferenciar cliente por dado e configuracao, nao por codigo.

-- Quais modulos o cliente contratou.
--
-- `{}` significa sem restricao, e é o default de propósito: cliente que já
-- existe não pode ficar com o painel em branco porque uma coluna nova nasceu.
-- `{"ativos": [...]}` é lista do que aparece, e o resto some do menu sem que
-- nada seja apagado do banco.
--
-- Vale para gestor e atendente, que são a gente do cliente. NÃO vale para o
-- operador, que é a agência: ele precisa de Clientes, Contexto e Mídias para
-- implantar, e essas telas são justamente o serviço vendido.
alter table clientes
  add column if not exists modulos jsonb not null default '{}'::jsonb;

-- Login de verdade, pelo Supabase Auth.
--
-- Hoje o login é próprio, no painel-entrar.js, e existem 3 atendentes contra
-- zero usuários no auth. A coluna nasce nula e é preenchida conforme cada um
-- é criado no Auth, para ninguém perder o acesso no meio da troca.
alter table atendentes
  add column if not exists auth_user_id uuid references auth.users(id) on delete set null;

-- `papel` já existia, com 'gestor' e 'atendente'. O "admin" do pedido é o
-- gestor: quem manda dentro do cliente. Renomear para 'admin' quebraria o
-- menu, que decide por `papel === "gestor"` em Lateral.jsx, e a API junto.
-- Nome velho que funciona vale mais que nome novo que agrada.
alter table atendentes
  drop constraint if exists atendentes_papel_valido;
alter table atendentes
  add constraint atendentes_papel_valido check (papel in ('gestor', 'atendente'));

create unique index if not exists atendentes_auth_user
  on atendentes (auth_user_id) where auth_user_id is not null;

-- O cliente logado sai daqui, e é o que as politicas de RLS do v2 vão usar.
-- security definer para a função poder ler `atendentes` sem cair na própria
-- política que ela mesma alimenta, que seria recursão infinita.
create or replace function cliente_do_usuario()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select cliente_id from atendentes
  where auth_user_id = auth.uid() and ativo
  limit 1
$$;

comment on function cliente_do_usuario() is
  'O cliente do usuario logado. Base das politicas de RLS do v2.';

-- (A semente de cliente que existia aqui saiu: o CRM nasce limpo e o cliente
-- Ousadia entra por banco/semente-ousadia.sql.)
