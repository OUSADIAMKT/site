-- CRM comercial: tarefas, anotações, automações, IA auditável e o que faltava
-- no contato e no negócio para o quadro virar ferramenta de venda.
--
-- Nada aqui apaga ou reescreve dado existente. São colunas novas com valor
-- padrão e tabelas novas. O que já está em `contatos`, `crm_negocios` e
-- `crm_etapas` continua exatamente como está.
--
-- A regra de isolamento entre empresas é do BANCO, não do código, seguindo o
-- que a migração 033 fez com as frentes: chave estrangeira COMPOSTA
-- `(alvo_id, cliente_id)`. Sem ela, uma tarefa poderia apontar para o negócio
-- de outra empresa e o Postgres aceitaria calado, porque o id é único no
-- mundo todo. Com ela, o banco recusa, mesmo que o código erre.
--
-- RLS ligada e sem política em tudo que nasce aqui, igual ao resto do CRM:
-- `anon` e `authenticated` não entram, todo acesso é do servidor com a chave
-- de serviço, atrás do recorte por `cliente_id`.

-- ---------------------------------------------------------------------------
-- 1. As chaves que tornam o isolamento possível
--
-- `(id, cliente_id)` é redundante do ponto de vista de unicidade, já que `id`
-- sozinho é chave primária. Ela existe para ser o ALVO da chave estrangeira
-- composta: o Postgres só aceita referenciar um conjunto de colunas que tenha
-- unicidade declarada.

do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'contatos_id_cliente') then
    alter table contatos add constraint contatos_id_cliente unique (id, cliente_id);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'crm_negocios_id_cliente') then
    alter table crm_negocios add constraint crm_negocios_id_cliente unique (id, cliente_id);
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- 2. O contato como ficha de cliente, e não só como telefone
--
-- `origem` continua sendo de onde o registro nasceu (importado, conversa,
-- pedido, crm) e não muda. `origem_id` é outra coisa: a origem COMERCIAL,
-- aquela que a empresa cadastra e usa no relatório de onde vêm os leads.

alter table contatos add column if not exists empresa        text;
alter table contatos add column if not exists documento      text;
alter table contatos add column if not exists campos         jsonb not null default '{}';
alter table contatos add column if not exists responsavel_id uuid references atendentes(id) on delete set null;
-- Score nulo é "ninguém avaliou ainda"; score zero é "avaliei e não vale
-- nada". São coisas diferentes, e a tela precisa poder dizer as duas, então a
-- coluna nasce nula em vez de nascer zero.
alter table contatos add column if not exists score          int;
alter table contatos add column if not exists origem_id      uuid references crm_origens(id) on delete set null;
alter table contatos add column if not exists canal          text;

-- Busca por nome, empresa, e-mail e documento numa tabela que vai crescer.
create index if not exists contatos_responsavel on contatos (cliente_id, responsavel_id);
create index if not exists contatos_empresa     on contatos (cliente_id, empresa);
create index if not exists contatos_documento   on contatos (cliente_id, documento);

-- ---------------------------------------------------------------------------
-- 3. O negócio: prioridade, prazo e a diferença entre estimado e registrado
--
-- `valor` é o que se espera ganhar. `valor_fechado` é o que foi efetivamente
-- registrado quando a venda foi ganha. Os dois existem separados porque somar
-- previsão com receita é como um painel comercial mente sem querer: o número
-- fica bonito e não corresponde a dinheiro nenhum.
--
-- `previsao_em` é a data em que a venda deveria fechar. É ela que responde
-- "esta oportunidade está atrasada?" sem depender de ninguém lembrar de olhar.

alter table crm_negocios add column if not exists prioridade    text not null default 'normal';
alter table crm_negocios add column if not exists previsao_em   timestamptz;
alter table crm_negocios add column if not exists valor_fechado numeric(12,2);
alter table crm_negocios add column if not exists score         int;

do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'contatos_score_check') then
    alter table contatos add constraint contatos_score_check
      check (score is null or (score >= 0 and score <= 100));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'crm_negocios_score_check') then
    alter table crm_negocios add constraint crm_negocios_score_check
      check (score is null or (score >= 0 and score <= 100));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'crm_negocios_prioridade_check') then
    alter table crm_negocios add constraint crm_negocios_prioridade_check
      check (prioridade in ('baixa', 'normal', 'alta', 'urgente'));
  end if;
end $$;

create index if not exists crm_negocios_previsao on crm_negocios (cliente_id, previsao_em)
  where situacao = 'aberto';
create index if not exists crm_negocios_parado on crm_negocios (cliente_id, etapa_desde)
  where situacao = 'aberto';

-- Quantos dias uma oportunidade pode ficar nesta etapa antes de virar atraso.
-- Nulo quer dizer "sem prazo", que é o comportamento de hoje.
alter table crm_etapas add column if not exists limite_dias int;

do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'crm_etapas_limite_check') then
    alter table crm_etapas add constraint crm_etapas_limite_check
      check (limite_dias is null or limite_dias > 0);
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- 4. Tarefas e atividades
--
-- Uma tarefa pende de um negócio, de um contato, ou dos dois. Do contrário ela
-- não pende de nada e não aparece em tela nenhuma, então o check exige pelo
-- menos um.

create table if not exists crm_tarefas (
  id             uuid primary key default gen_random_uuid(),
  cliente_id     uuid not null references clientes(id) on delete cascade,
  negocio_id     uuid,
  contato_id     uuid,
  titulo         text not null,
  descricao      text,
  tipo           text not null default 'tarefa',
  vence_em       timestamptz,
  concluida_em   timestamptz,
  concluida_por  text,
  responsavel_id uuid references atendentes(id) on delete set null,
  criado_por     text,
  criado_em      timestamptz not null default now(),
  constraint crm_tarefas_titulo_nao_vazio check (length(btrim(titulo)) > 0),
  constraint crm_tarefas_tipo_check
    check (tipo in ('tarefa', 'ligacao', 'mensagem', 'reuniao', 'proposta', 'visita')),
  constraint crm_tarefas_tem_alvo
    check (negocio_id is not null or contato_id is not null),
  constraint crm_tarefas_negocio_mesma_empresa
    foreign key (negocio_id, cliente_id) references crm_negocios (id, cliente_id) on delete cascade,
  constraint crm_tarefas_contato_mesma_empresa
    foreign key (contato_id, cliente_id) references contatos (id, cliente_id) on delete cascade
);

-- A agenda de quem atende: o que vence, de quem é, ainda em aberto.
create index if not exists crm_tarefas_agenda on crm_tarefas (cliente_id, responsavel_id, vence_em)
  where concluida_em is null;
create index if not exists crm_tarefas_negocio on crm_tarefas (negocio_id, vence_em);
create index if not exists crm_tarefas_contato on crm_tarefas (contato_id, vence_em);

-- ---------------------------------------------------------------------------
-- 5. Anotações internas
--
-- Separadas de `crm_negocios.observacoes`, que é um campo só, sobrescrito a
-- cada edição e sem autor. Anotação é append: quem escreveu, quando, e fica.

create table if not exists crm_notas (
  id          uuid primary key default gen_random_uuid(),
  cliente_id  uuid not null references clientes(id) on delete cascade,
  negocio_id  uuid,
  contato_id  uuid,
  texto       text not null,
  autor       text,
  autor_id    uuid references atendentes(id) on delete set null,
  criado_em   timestamptz not null default now(),
  constraint crm_notas_texto_nao_vazio check (length(btrim(texto)) > 0),
  constraint crm_notas_tem_alvo check (negocio_id is not null or contato_id is not null),
  constraint crm_notas_negocio_mesma_empresa
    foreign key (negocio_id, cliente_id) references crm_negocios (id, cliente_id) on delete cascade,
  constraint crm_notas_contato_mesma_empresa
    foreign key (contato_id, cliente_id) references contatos (id, cliente_id) on delete cascade
);
create index if not exists crm_notas_negocio on crm_notas (negocio_id, criado_em desc);
create index if not exists crm_notas_contato on crm_notas (contato_id, criado_em desc);

-- ---------------------------------------------------------------------------
-- 6. Automações comerciais
--
-- `gatilho` é o que aconteceu, `condicoes` filtra, `acoes` é o que fazer. As
-- duas últimas são jsonb porque a forma de cada ação é diferente e uma tabela
-- por tipo de ação seria uma tabela por ideia nova.
--
-- A trava contra repetição mora em `crm_automacao_execucoes.chave`: quem
-- dispara monta uma chave com o gatilho, o alvo e o momento, e o índice único
-- recusa a segunda execução. Duas requisições simultâneas não executam duas
-- vezes porque a segunda bate no índice, não porque o código olhou antes.

create table if not exists crm_automacoes (
  id          uuid primary key default gen_random_uuid(),
  cliente_id  uuid not null references clientes(id) on delete cascade,
  nome        text not null,
  gatilho     text not null,
  condicoes   jsonb not null default '{}',
  acoes       jsonb not null default '[]',
  ativo       boolean not null default true,
  criado_em   timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  constraint crm_automacoes_nome_nao_vazio check (length(btrim(nome)) > 0),
  constraint crm_automacoes_gatilho_check check (gatilho in (
    'contato_novo', 'negocio_novo', 'etapa_mudou', 'etiqueta_mudou',
    'responsavel_mudou', 'sem_interacao', 'tarefa_vencida',
    'venda_ganha', 'venda_perdida', 'score_atingido'
  )),
  constraint crm_automacoes_acoes_lista check (jsonb_typeof(acoes) = 'array')
);
create index if not exists crm_automacoes_gatilho on crm_automacoes (cliente_id, gatilho) where ativo;

create table if not exists crm_automacao_execucoes (
  id           uuid primary key default gen_random_uuid(),
  cliente_id   uuid not null references clientes(id) on delete cascade,
  automacao_id uuid not null references crm_automacoes(id) on delete cascade,
  chave        text not null,
  alvo_id      uuid,
  profundidade int not null default 0,
  resultado    jsonb not null default '{}',
  erro         text,
  criado_em    timestamptz not null default now(),
  unique (automacao_id, chave)
);
create index if not exists crm_execucoes_cliente on crm_automacao_execucoes (cliente_id, criado_em desc);

-- ---------------------------------------------------------------------------
-- 7. IA comercial
--
-- Tudo desligado por padrão, de propósito. A IA não move oportunidade nem
-- manda mensagem sozinha até a empresa ligar cada coisa, uma por uma, e cada
-- sugestão fica gravada em `crm_ia_sugestoes` com o que ela propôs, se foi
-- aplicada e por quem. Automático sem rastro é automático que ninguém audita.

create table if not exists crm_ia_config (
  cliente_id     uuid primary key references clientes(id) on delete cascade,
  classificar    boolean not null default false,
  pontuar        boolean not null default false,
  resumir        boolean not null default false,
  sugerir_acao   boolean not null default false,
  sugerir_etapa  boolean not null default false,
  mover_sozinha  boolean not null default false,
  criar_negocio  boolean not null default false,
  atualizado_em  timestamptz not null default now()
);

create table if not exists crm_ia_sugestoes (
  id          uuid primary key default gen_random_uuid(),
  cliente_id  uuid not null references clientes(id) on delete cascade,
  negocio_id  uuid,
  conversa_id uuid references conversas(id) on delete set null,
  tipo        text not null,
  sugestao    jsonb not null default '{}',
  aplicada    boolean not null default false,
  aplicada_em timestamptz,
  aplicada_por text,
  criado_em   timestamptz not null default now(),
  constraint crm_ia_sugestoes_tipo_check check (tipo in (
    'classificacao', 'score', 'resumo', 'proxima_acao', 'etapa', 'interesse', 'negocio'
  )),
  constraint crm_ia_sugestoes_negocio_mesma_empresa
    foreign key (negocio_id, cliente_id) references crm_negocios (id, cliente_id) on delete cascade
);
create index if not exists crm_ia_sugestoes_negocio on crm_ia_sugestoes (negocio_id, criado_em desc);
create index if not exists crm_ia_sugestoes_pendentes on crm_ia_sugestoes (cliente_id, tipo, criado_em desc)
  where not aplicada;

-- ---------------------------------------------------------------------------
-- 8. RLS

alter table crm_tarefas              enable row level security;
alter table crm_notas                enable row level security;
alter table crm_automacoes           enable row level security;
alter table crm_automacao_execucoes  enable row level security;
alter table crm_ia_config            enable row level security;
alter table crm_ia_sugestoes         enable row level security;
