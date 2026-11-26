-- 040: o que faltava para o quadro comercial virar kanban de trabalho.
--
-- NÃO APLICADA. Espera autorização expressa.
--
-- Três coisas, e nenhuma delas reescreve dado existente:
--
-- 1. Uma coluna de foto no contato. Hoje o cartão mostra iniciais, e iniciais
--    é o que ele vai continuar mostrando enquanto não houver foto: a API do
--    WhatsApp Cloud não entrega a foto de perfil de quem fala com a empresa.
--    Quem preenche é gente, pelo cadastro do contato, ou o Instagram, que
--    entrega `profile_pic` do remetente. A coluna existe para a foto caber
--    quando houver, não para inventar uma.
--
-- 2. Quais informações cada pessoa quer ver no cartão. É preferência de quem
--    olha, não configuração da empresa: a Lia pode querer ver valor e a Rita
--    não, na mesma conta. Por isso a chave é `(cliente_id, quem)`, com `quem`
--    igual ao de `leituras_conversa`: o id da atendente, ou a string
--    'operador' para o gestor da plataforma, que não tem linha em
--    `atendentes`.
--
-- 3. Um índice para o filtro de período. Sem ele, "negócios dos últimos 7
--    dias" varre a tabela inteira do cliente.
--
-- RLS ligada e sem política, como no resto do CRM: `anon` e
-- `authenticated` não entram, todo acesso é do servidor com a chave de
-- serviço, atrás do recorte por `cliente_id`.

-- ---------------------------------------------------------------------------
-- 1. A foto do contato

alter table contatos add column if not exists foto_url text;

-- ---------------------------------------------------------------------------
-- 2. O cartão de cada pessoa
--
-- `campos` é jsonb e não uma coluna por informação porque a lista de
-- informações do cartão muda a cada ideia nova, e uma coluna por ideia seria
-- uma migração por ideia. A forma é `{"valor": true, "score": false, ...}`, e
-- campo que não está no jsonb cai no padrão que o código decide: assim um
-- campo novo nasce visível sem ninguém ter que marcar nada.
--
-- Não há chave estrangeira para `atendentes` de propósito, pelo mesmo motivo
-- de `leituras_conversa`: o gestor da plataforma entra sem linha lá e seria o
-- único sem preferência própria. O preço é linha órfã quando uma atendente é
-- apagada, que é lixo pequeno e inofensivo.

create table if not exists crm_quadro_campos (
  cliente_id    uuid not null references clientes(id) on delete cascade,
  quem          text not null,
  campos        jsonb not null default '{}',
  atualizado_em timestamptz not null default now(),
  primary key (cliente_id, quem),
  constraint crm_quadro_campos_objeto check (jsonb_typeof(campos) = 'object')
);

-- ---------------------------------------------------------------------------
-- 3. O índice do filtro de período

create index if not exists crm_negocios_criado on crm_negocios (cliente_id, criado_em desc);

-- ---------------------------------------------------------------------------
-- 4. RLS

alter table crm_quadro_campos enable row level security;
