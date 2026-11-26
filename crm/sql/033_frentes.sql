-- Frentes de atendimento: Etapa 1.
--
-- Uma frente e um recorte de atendimento dentro de uma empresa. Hoje a
-- piloto tinha dois: o comercial, que era da Lia, e o atendimento geral, que era
-- da Rita. Esse recorte existe hoje espalhado em dois lugares que nao se
-- conhecem: a lista de palavras em `api/_assunto.js` e a coluna
-- `atendentes.assuntos`. Nenhum dos dois tem nome, nenhum tem dono explicito
-- e nenhum aparece numa tela. Esta tabela da nome ao recorte.
--
-- Migracao ADITIVA. Nao altera nenhuma coluna existente, nao apaga nada e nao
-- mexe em uma linha de dado. O que ela adiciona:
--
--   1. um unique em `atendentes (id, cliente_id)`, que nao muda
--      comportamento: `id` ja e chave primaria, entao o par ja era unico. Ele
--      existe so para a chave estrangeira composta do item 3 poder apontar.
--   2. a tabela `frentes`
--   3. `disparos.frente_id`, nula, para a campanha dizer de que frente ela e
--
-- O ISOLAMENTO ENTRE EMPRESAS NAO E FEITO EM CODIGO AQUI. Ele e feito por
-- chave estrangeira composta: `(responsavel_id, cliente_id)` aponta para
-- `atendentes (id, cliente_id)`, entao o Postgres recusa, sozinho, uma frente
-- de uma empresa com responsavel de outra. Nao ha como esquecer de validar,
-- nao ha como burlar por outra rota, e nao depende de trigger. O mesmo vale
-- para `disparos.frente_id`.
--
-- Reversao em sql/033_reversao.sql.

-- ---------------------------------------------------------------------------
-- 1. o alvo da chave composta
--
-- Cria so se ainda nao existir, e NUNCA derruba. A versao anterior desta
-- migracao fazia `drop constraint if exists` antes do add, e isso quebrava a
-- reexecucao: depois da 033 aplicada, esta constraint e o alvo da chave
-- estrangeira `frentes_responsavel_mesma_empresa`, e o Postgres recusa
-- derrubar uma unique de que uma chave estrangeira depende. `cascade`
-- resolveria derrubando a chave estrangeira junto, ou seja, abrindo o
-- isolamento entre empresas no meio da migracao. Nao se usa cascade aqui.

do $$
begin
  if not exists (
    select 1 from pg_constraint
     where conname = 'atendentes_id_cliente_key'
       and conrelid = 'atendentes'::regclass
  ) then
    alter table atendentes add constraint atendentes_id_cliente_key
      unique (id, cliente_id);
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- 2. as frentes

create table if not exists frentes (
  id             uuid primary key default gen_random_uuid(),
  cliente_id     uuid not null references clientes(id) on delete cascade,
  nome           text not null,
  -- Os assuntos que esta frente atende, como `api/_assunto.js` os devolve.
  -- Array e nao coluna unica de proposito: uma frente atende mais de um
  -- assunto, e o atendimento geral e o exemplo. Vazio e valido: a frente
  -- existe, tem dono, e ainda nao recebe nada por assunto.
  assuntos       text[] not null default '{}',
  -- A frente que recebe o que nao se encaixou em assunto nenhum. Serve para
  -- nao confundir "a frente do assunto pedido" com "a frente geral, que hoje
  -- por acaso atende pedido". Uma por empresa, no maximo.
  padrao         boolean not null default false,
  -- Responsavel ATUAL, nao dono permanente. Nula de proposito: frente sem
  -- responsavel e um estado legitimo, e trocar de responsavel e um update de
  -- uma coluna. Para mais de uma pessoa por frente no futuro, o caminho e uma
  -- tabela de ligacao, que nao entra agora porque nada a consome.
  responsavel_id uuid,
  ativa          boolean not null default true,
  criada_em      timestamptz not null default now(),
  atualizada_em  timestamptz,

  -- alvo da chave composta de `disparos.frente_id`
  unique (id, cliente_id),

  -- O isolamento. Com `responsavel_id` nula a regra nao se aplica, que e o
  -- comportamento desejado para frente sem responsavel.
  constraint frentes_responsavel_mesma_empresa
    foreign key (responsavel_id, cliente_id)
    references atendentes (id, cliente_id),

  constraint frentes_nome_nao_vazio check (length(btrim(nome)) > 0)
);

comment on table frentes is
  'Recorte de atendimento de uma empresa. O isolamento entre empresas e por chave estrangeira composta, nao por codigo.';
comment on column frentes.assuntos is
  'Assuntos que esta frente atende, como api/_assunto.js os devolve. Vazio e valido.';
comment on column frentes.padrao is
  'A frente que recebe o que nao se encaixou em assunto nenhum. Uma por empresa.';
comment on column frentes.responsavel_id is
  'Responsavel atual, trocavel. Nao e dono permanente da frente.';

-- ---------------------------------------------------------------------------
-- 2b. quem pode falar com esta tabela
--
-- RLS ligada e ZERO politicas: e assim que todas as outras tabelas deste
-- projeto estao, e nao e descuido, e o desenho. Sem politica nenhuma, a RLS
-- nega tudo para `anon` e para `authenticated`, que sao os papeis que a chave
-- publica do Supabase assume. O painel nao e afetado porque fala com o banco
-- pela chave de servico, e `service_role` tem bypassrls.
--
-- O frontend deste projeto nao conversa com o Supabase direto: quem le e
-- escreve e sempre uma funcao em `api/`, atras de `barrouGestor` e do recorte
-- por `cliente_id`. Entao nao existe consulta legitima de `anon` para liberar,
-- e politica nenhuma precisa ser escrita.
--
-- A migracao 032 esqueceu esta linha em `disparo_tentativas`, e por isso
-- aquela tabela ficou sendo a unica do banco sem RLS. A correcao dela esta em
-- sql/034_rls_disparo_tentativas.sql, separada porque a tabela ja esta em
-- producao e esta migracao ainda nao foi aplicada.

alter table frentes enable row level security;

-- Segunda camada, independente da RLS: tirar a concessao em si. Um `grant`
-- esquecido deixa de importar quando a RLS nega, e uma RLS desligada por
-- engano deixa de importar quando a concessao nao existe. As duas juntas
-- precisam de dois erros para abrir.
--
-- Condicional porque estes papeis sao do Supabase e nao existem num Postgres
-- limpo, como o dos testes. `revoke` em papel inexistente e erro, nao no-op.
do $$
begin
  if exists (select 1 from pg_roles where rolname = 'anon') then
    revoke all on table frentes from anon;
  end if;
  if exists (select 1 from pg_roles where rolname = 'authenticated') then
    revoke all on table frentes from authenticated;
  end if;
end $$;

-- Nome unico por empresa, so entre as ativas: desativar uma frente libera o
-- nome de novo, e a linha antiga fica para o historico.
create unique index if not exists frentes_nome_idx
  on frentes (cliente_id, lower(btrim(nome))) where ativa;

-- No maximo uma frente padrao ativa por empresa.
create unique index if not exists frentes_padrao_idx
  on frentes (cliente_id) where ativa and padrao;

create index if not exists frentes_cliente_idx
  on frentes (cliente_id, ativa);

-- O mesmo assunto em duas frentes ativas da mesma empresa deixaria o
-- roteamento ambiguo: duas frentes diferentes responderiam pela mesma
-- pergunta. Nao da para expressar isso com `unique` nem com `exclude`, porque
-- o Postgres nao tem opclass gist para sobreposicao de text[]. Entao trigger.
--
-- Frente inativa nao entra na conta: desativar libera os assuntos dela.
--
-- CONCORRENCIA. Um trigger que consulta e depois permite e inseguro por
-- natureza: em `read committed`, que e o padrao, a consulta nao ve a linha de
-- uma transacao que ainda nao confirmou. Duas requisicoes simultaneas criando
-- frentes ativas com o mesmo assunto nao veriam uma a outra e as duas
-- confirmariam. Os indices unicos parciais acima nao tem esse problema porque
-- a insercao no indice e que bloqueia; aqui nao ha indice para bloquear,
-- porque o Postgres nao tem opclass gist para sobreposicao de text[].
--
-- A trava e um advisory lock de transacao por empresa. Ele serializa as
-- escritas de frentes de uma empresa so, e nao atrapalha outra empresa:
-- escritas de clientes diferentes seguem em paralelo. Quem chega depois espera
-- a primeira confirmar, e so entao faz a consulta, que ja ve a linha nova e
-- recusa. O lock cai no fim da transacao, sem precisar de unlock.
--
-- O lock vem ANTES da saida antecipada de proposito. Serializar tambem a
-- desativacao custa quase nada neste volume, poucas frentes por empresa
-- escritas a mao por um formulario, e fecha o caso em que uma desativacao
-- concorrente faria a checagem recusar por ver uma frente que ja estava
-- saindo. Recusa a mais e o lado seguro, mas nao precisa existir.
--
-- O par (1033, hash) e namespaced: 1033 e desta migracao, entao este lock nao
-- colide com advisory lock de outra parte do sistema. Dois cliente_id com o
-- mesmo hash de 32 bits se serializariam juntos sem necessidade, o que e
-- inofensivo.
--
-- Uma transacao que escrevesse frentes de DUAS empresas pegaria dois locks, e
-- duas dessas em ordem inversa poderiam travar uma na outra. Nenhuma rota faz
-- isso hoje: cada requisicao grava uma frente. Vale lembrar antes de escrever
-- a primeira operacao em lote.
create or replace function frente_assunto_sem_conflito() returns trigger
language plpgsql as $$
declare
  outra text;
begin
  perform pg_advisory_xact_lock(1033, hashtext(new.cliente_id::text));

  if not new.ativa or coalesce(array_length(new.assuntos, 1), 0) = 0 then
    return new;
  end if;

  select f.nome into outra
    from frentes f
   where f.cliente_id = new.cliente_id
     and f.id <> new.id
     and f.ativa
     and f.assuntos && new.assuntos
   limit 1;

  if outra is not null then
    raise exception
      'o assunto ja pertence a frente "%" nesta empresa', outra
      using errcode = 'unique_violation';
  end if;

  return new;
end $$;

drop trigger if exists frente_assunto_trg on frentes;
create trigger frente_assunto_trg
  before insert or update of assuntos, ativa, cliente_id on frentes
  for each row execute function frente_assunto_sem_conflito();

-- Toda escrita carimba a hora, para a tela mostrar o que mudou e quando.
create or replace function frente_carimbar() returns trigger
language plpgsql as $$
begin
  new.atualizada_em := now();
  return new;
end $$;

drop trigger if exists frente_carimbar_trg on frentes;
create trigger frente_carimbar_trg
  before update on frentes
  for each row execute function frente_carimbar();

-- ---------------------------------------------------------------------------
-- 3. a campanha diz de que frente ela e
--
-- Nula, e continua nula em toda campanha que ja existe: compatibilidade com o
-- que esta no banco sem tocar em nenhuma linha. A frente da campanha NAO
-- decide quem atende a resposta; isso e da Etapa 5 e a intencao do cliente
-- ganha dela. Aqui e so procedencia.

alter table disparos add column if not exists frente_id uuid;

-- Tambem condicional, pelo mesmo motivo do item 1: derrubar e recriar a chave
-- estrangeira numa reexecucao revalidaria a tabela `disparos` inteira e
-- deixaria o isolamento aberto durante a janela entre o drop e o add.
do $$
begin
  if not exists (
    select 1 from pg_constraint
     where conname = 'disparos_frente_mesma_empresa'
       and conrelid = 'disparos'::regclass
  ) then
    alter table disparos add constraint disparos_frente_mesma_empresa
      foreign key (frente_id, cliente_id)
      references frentes (id, cliente_id);
  end if;
end $$;

create index if not exists disparos_frente_idx
  on disparos (frente_id) where frente_id is not null;

comment on column disparos.frente_id is
  'De que frente esta campanha e. Procedencia, nao roteamento: a intencao do cliente ganha desta coluna.';
