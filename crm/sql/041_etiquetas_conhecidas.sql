-- 041: a lista de etiquetas que cada cliente conhece, e a limpeza do que a IA
-- já escreveu em texto livre.
--
-- NÃO APLICADA. Espera autorização expressa.
--
-- O problema: `atualizar_lead` grava a etiqueta exatamente como o modelo
-- escreveu. "Black da Mentoria OM" e "black da mentoria om" são duas etiquetas
-- diferentes para o filtro do Quadro e do CRM, que compara texto. Quem filtra
-- por uma perde as conversas que ficaram na outra: 44 de um lado, 21 do outro,
-- mesma campanha.
--
-- A correção tem duas metades e as duas estão aqui:
--
--   1. Uma lista por cliente, com a forma canônica e os apelidos que caem
--      nela. É a lista que o código consulta antes de gravar.
--   2. Uma reescrita única do que já está em `conversas.etiquetas`, pela
--      mesma lista.
--
-- Nada aqui toca `contatos.etiquetas`: o CRM já passa por `limparEtiquetas`
-- no _crm.js e as duas etiquetas que existem lá estão limpas.
--
-- Só `service_role` entra, como no resto do esquema.

-- ---------------------------------------------------------------------------
-- 1. A chave de comparação
--
-- Sem acento, sem maiúscula, pontuação virando espaço. É a mesma regra do
-- `achatar` do _assunto.js, repetida aqui porque o banco precisa comparar
-- sozinho na reescrita abaixo e no índice único da tabela.
--
-- A chave existe para COMPARAR. O que aparece na tela é a coluna `etiqueta`,
-- que guarda acento e a forma que a equipe lê.

create or replace function public.etiqueta_chave(texto text)
returns text
language sql
immutable
as $$
  select nullif(
    trim(regexp_replace(
      lower(translate(
        coalesce(texto, ''),
        'áàâãäéèêëíìîïóòôõöúùûüçñÁÀÂÃÄÉÈÊËÍÌÎÏÓÒÔÕÖÚÙÛÜÇÑ',
        'aaaaaeeeeiiiiooooouuuucnAAAAAEEEEIIIIOOOOOUUUUCN'
      )),
      '[^a-z0-9]+', ' ', 'g'
    )),
    ''
  );
$$;

-- ---------------------------------------------------------------------------
-- 2. A lista conhecida
--
-- `origem` separa quem curou: 'lista' é etiqueta decidida por gente, 'ia' é
-- etiqueta que nasceu da ferramenta porque não havia nenhuma parecida. As
-- duas valem para filtrar; a diferença serve para o dia em que alguém quiser
-- revisar o que a IA inventou.
--
-- `apelidos` guarda chaves achatadas, não texto de tela: é contra elas que a
-- comparação roda.

create table if not exists public.etiquetas_conhecidas (
  id         uuid primary key default gen_random_uuid(),
  cliente_id uuid not null references clientes(id) on delete cascade,
  etiqueta   text not null,
  chave      text not null,
  apelidos   text[] not null default '{}',
  familia    text,
  origem     text not null default 'ia',
  criado_em  timestamptz not null default now(),
  constraint etiquetas_conhecidas_origem check (origem in ('lista', 'ia')),
  constraint etiquetas_conhecidas_unica unique (cliente_id, chave)
);

create index if not exists etiquetas_conhecidas_cliente
  on public.etiquetas_conhecidas (cliente_id, etiqueta);

alter table public.etiquetas_conhecidas enable row level security;

-- ---------------------------------------------------------------------------
-- 3. As etiquetas da Ousadia
--
-- Seis famílias. `assunto` é a única que o código escreve sozinho, pelo
-- _assunto.js; as outras saem do texto livre do modelo e caem aqui pelos
-- apelidos.

insert into public.etiquetas_conhecidas (cliente_id, etiqueta, chave, apelidos, familia, origem)
select
  c.id, v.etiqueta, public.etiqueta_chave(v.etiqueta), v.apelidos, v.familia, 'lista'
from clientes c
cross join (values
  -- assunto: as três que o _assunto.js decide no código
  ('matricula',         array['mentoria om','interesse matricula','possivel aluno','interesse no curso','quer se matricular'], 'assunto'),
  ('suporte',           array['aluno com duvida','problema de acesso','ajuda','duvida de aluno'], 'assunto'),
  ('agencia',           array['gestao de redes','trafego pago','social media','orcamento agencia','quer contratar'], 'assunto'),

  -- estado da pessoa
  ('lead',              array['interesse','interesse geral','interesse ativo','procurando informacoes','possivel cliente'], 'estado'),
  ('aluno',             array['aluna','ja e aluno','aluno ativo','matriculado','matriculada','ja comprou'], 'estado'),
  ('transferido',       array['transferida','passou para humano'], 'estado'),

  -- de onde veio
  ('veio do disparo',   array['veio de disparo','chegou do disparo','veio da campanha','disparo'], 'origem'),
  ('veio do site',      array['site','veio pelo site','formulario do site'], 'origem'),
  ('instagram',         array['veio do instagram','ig','direct'], 'origem'),
  ('comunidade',        array['veio da comunidade','membro da comunidade'], 'origem'),
  ('indicacao',         array['indicado','veio por indicacao'], 'origem'),

  -- campanha
  ('black da mentoria om', array['black mentoria om','black','black friday','blackfriday'], 'campanha'),

  -- o que ela quer
  ('mentoria',          array['quer mentoria','interesse em mentoria'], 'intencao'),
  ('escola',            array['quer a escola','interesse na escola'], 'intencao'),
  ('parceria',          array['interesse em parceria','parceiro','quer parceria'], 'intencao'),

  -- detalhe de suporte
  ('acesso',            array['sem acesso','nao consegue acessar','login','senha'], 'suporte'),
  ('certificado',       array['quer certificado','pediu certificado'], 'suporte'),
  ('cancelamento',      array['quer cancelar','cancelar','cancelado','pediu cancelamento'], 'suporte')
) as v(etiqueta, apelidos, familia)
where c.slug = 'ousadia'
on conflict (cliente_id, chave) do nothing;

-- ---------------------------------------------------------------------------
-- 4. A reescrita do que já está gravado
--
-- Uma passada só, em `conversas` da Ousadia. Cada etiqueta vira a canônica
-- correspondente; a que não bate com nenhuma canônica e com nenhum apelido
-- sai da conversa.
--
-- O que sai é texto livre de uma conversa só: "São Luís", "pronta para
-- fechar", "skincare". A informação
-- continua no histórico da conversa, que é de onde ela veio; o que ela nunca
-- foi é filtro, porque filtro com uma linha não filtra nada.
--
-- `array_agg(distinct ...)` já devolve ordenado e sem repetição, então a
-- conversa que tinha "Black da Mentoria OM" e "black da mentoria om" fica com uma.

with mapa as (
  select cliente_id, chave, etiqueta from public.etiquetas_conhecidas
  union all
  select cliente_id, unnest(apelidos), etiqueta from public.etiquetas_conhecidas
),
novo as (
  select
    c.id,
    coalesce(
      array_agg(distinct m.etiqueta) filter (where m.etiqueta is not null),
      '{}'::text[]
    ) as lista
  from conversas c
  join clientes cl on cl.id = c.cliente_id and cl.slug = 'ousadia'
  cross join lateral unnest(c.etiquetas) as e(bruta)
  left join mapa m
    on m.cliente_id = c.cliente_id
   and m.chave = public.etiqueta_chave(e.bruta)
  where c.etiquetas is not null and array_length(c.etiquetas, 1) > 0
  group by c.id
)
update conversas c
set etiquetas = novo.lista
from novo
where c.id = novo.id
  and c.etiquetas is distinct from novo.lista;
