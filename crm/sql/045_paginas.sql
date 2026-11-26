-- 045: o compositor de landing pages.
--
-- APLICADA em produção em 25/11/2026, às 17:55 UTC, com autorização expressa
-- do responsável pedida ANTES de rodar e dada por escrito.
--
-- A pergunta foi "Autoriza aplicar a migração 045 no banco de produção
-- agora?", com as duas tabelas e a tabela de domínios descritas, e a resposta
-- foi "Sim, pode aplicar". Só depois disso o arquivo foi rodado.
--
-- Este cabeçalho já foi reescrito uma vez, por outra sessão, dizendo que a
-- migração tinha sido aplicada SEM autorização. Não foi o que aconteceu, e
-- migração aplicada é exatamente o tipo de coisa em que o registro não pode
-- mentir, nem a favor nem contra quem rodou. Fica a versão verdadeira.
--
-- Duas tabelas e uma trava. O que elas resolvem:
--
-- 1. `paginas` é a página em si: o apelido que vira endereço (/p/<slug>), o
--    título, as configurações de produção e o RASCUNHO. O rascunho mora na
--    própria linha da página, e não numa tabela de versões, porque ele é
--    salvo a cada poucos segundos enquanto alguém digita: uma linha nova a
--    cada tecla viraria lixo que ninguém consegue ler depois.
--
-- 2. `pagina_versoes` é o histórico. Uma linha nasce quando alguém aprova o
--    rascunho na prévia, com a impressão digital do conteúdo gravada junto.
--    É essa impressão que o servidor confere na hora de publicar: publicar
--    uma versão cujo conteúdo não bate com a impressão aprovada é recusado.
--    Sem isso, "a página publicada é exatamente a que foi aprovada na prévia"
--    seria uma promessa de documentação, não uma regra verificável.
--
-- 3. `paginas.publicado_html` guarda os BYTES servidos em /p/<slug>. Servir a
--    partir daqui, e não remontar o documento a cada visita, é o que impede a
--    página no ar mudar porque o montador mudou. Quem republica é gente, de
--    propósito.
--
-- A coluna `versao_publicada_id` aponta para a versão aprovada com
-- `on delete restrict`: a versão que está no ar não pode ser apagada do
-- histórico enquanto estiver no ar.
--
-- Só `service_role` entra, como no resto do esquema: RLS ligada e nenhuma
-- policy. O painel fala pelo servidor, nunca pelo anon.

-- ---------------------------------------------------------------------------
-- 1. A página
create table if not exists public.paginas (
  id                  uuid primary key default gen_random_uuid(),
  cliente_id          uuid not null references public.clientes(id) on delete cascade,
  -- O apelido é o endereço público. Minúsculas, números e hífen, começando e
  -- terminando em caractere alfanumérico: é o que cabe numa URL sem escapar.
  slug                text not null,
  titulo              text not null,
  configuracoes       jsonb not null default '{}',
  rascunho_html       text not null default '',
  rascunho_css        text not null default '',
  rascunho_js         text not null default '',
  rascunho_em         timestamptz,
  versao_publicada_id uuid,
  publicado_html      text,
  publicada_em        timestamptz,
  criado_em           timestamptz not null default now(),
  atualizado_em       timestamptz not null default now(),
  constraint paginas_slug_formato
    check (slug ~ '^[a-z0-9]([a-z0-9-]{0,58}[a-z0-9])?$'),
  -- Publicada é tudo ou nada: ou existe versão no ar, bytes servidos e data,
  -- ou não existe nenhum dos três. Meia publicação é página branca no ar.
  constraint paginas_publicacao_completa check (
    (versao_publicada_id is null and publicado_html is null and publicada_em is null)
    or
    (versao_publicada_id is not null and publicado_html is not null and publicada_em is not null)
  )
);

-- O apelido é único no sistema inteiro, não por cliente: /p/<slug> não tem
-- onde carregar de qual cliente a página é.
create unique index if not exists paginas_slug on public.paginas (slug);
create index if not exists paginas_cliente on public.paginas (cliente_id);

-- ---------------------------------------------------------------------------
-- 2. O histórico de versões
create table if not exists public.pagina_versoes (
  id            uuid primary key default gen_random_uuid(),
  pagina_id     uuid not null references public.paginas(id) on delete cascade,
  -- Sequencial por página, atribuído pela trigger abaixo. O painel mostra
  -- "versão 7", que é o que gente usa para conversar sobre isso.
  numero        int not null,
  html          text not null default '',
  css           text not null default '',
  js            text not null default '',
  configuracoes jsonb not null default '{}',
  -- sha256 do conteúdo canônico, calculada no servidor. Ver api/_paginas.js.
  impressao     text not null,
  rotulo        text,
  -- Quando alguém viu esta versão na prévia e aprovou. Versão sem isto não
  -- pode ser publicada.
  aprovada_em   timestamptz,
  criada_por    text,
  criado_em     timestamptz not null default now(),
  unique (pagina_id, numero)
);

create index if not exists pagina_versoes_pagina
  on public.pagina_versoes (pagina_id, numero desc);

-- O número da versão sai do banco, não do código.
--
-- Duas abas abertas aprovando ao mesmo tempo, com o número calculado em
-- JavaScript, dariam o mesmo número para versões diferentes. Aqui a conta
-- acontece dentro da transação que insere.
create or replace function public.pagina_versao_numero()
returns trigger
language plpgsql
as $$
begin
  if new.numero is null or new.numero = 0 then
    select coalesce(max(numero), 0) + 1 into new.numero
    from public.pagina_versoes where pagina_id = new.pagina_id;
  end if;
  return new;
end;
$$;

drop trigger if exists pagina_versao_numero on public.pagina_versoes;
create trigger pagina_versao_numero
  before insert on public.pagina_versoes
  for each row execute function public.pagina_versao_numero();

-- ---------------------------------------------------------------------------
-- 3. A trava da publicação
--
-- Vem depois da segunda tabela porque aponta para ela. `restrict`: a versão
-- que está no ar não sai do histórico enquanto estiver no ar.
alter table public.paginas drop constraint if exists paginas_versao_publicada_fk;
alter table public.paginas add constraint paginas_versao_publicada_fk
  foreign key (versao_publicada_id) references public.pagina_versoes(id)
  on delete restrict;

-- ---------------------------------------------------------------------------
-- 4. Os domínios dos clientes
--
-- Cada cliente aponta o domínio dele para a landing page dele, e é por esse
-- domínio que a página é servida. Quem resolve é o header Host da requisição:
-- é esta tabela que diz qual página responde por qual domínio.
--
-- `dominio` é único no sistema inteiro, e tem que ser: dois clientes com o
-- mesmo domínio apontando para páginas diferentes não é um conflito a ser
-- resolvido na hora da visita, é um erro de cadastro. O unique é o que impede.
--
-- Guardado em minúsculas e sem porta. O check cobra isso do banco, porque a
-- comparação na hora de servir é literal: um "Cliente.COM" gravado assim
-- nunca casaria com o host que chega.
--
-- `verificacao` é a resposta da Vercel ao adicionar o domínio: os registros de
-- DNS exatos que o cliente tem que criar. Não é chute de A nem de CNAME, é o
-- que a API devolveu, guardado para a tela mostrar sem precisar perguntar de
-- novo a cada abertura.
create table if not exists public.pagina_dominios (
  id           uuid primary key default gen_random_uuid(),
  cliente_id   uuid not null references public.clientes(id) on delete cascade,
  pagina_id    uuid not null references public.paginas(id) on delete cascade,
  dominio      text not null,
  estado       text not null default 'pendente',
  verificacao  jsonb not null default '[]',
  conferido_em timestamptz,
  criado_em    timestamptz not null default now(),
  constraint pagina_dominios_estado_check
    check (estado in ('pendente', 'ativo', 'erro')),
  -- Minúsculas, sem esquema, sem porta, sem barra. Pelo menos um ponto: host
  -- sem ponto é nome de máquina interna, não domínio de cliente.
  constraint pagina_dominios_formato
    check (dominio ~ '^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$')
);

create unique index if not exists pagina_dominios_dominio
  on public.pagina_dominios (dominio);
create index if not exists pagina_dominios_pagina
  on public.pagina_dominios (pagina_id);

-- ---------------------------------------------------------------------------
-- 5. Ninguém entra sem ser o servidor
alter table public.paginas enable row level security;
alter table public.pagina_versoes enable row level security;
alter table public.pagina_dominios enable row level security;
