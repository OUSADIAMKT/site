-- 043: a origem do negócio no CRM, preenchida pelo que o banco já sabia.
--
-- APLICADA em produção em 25/11/2026.
--
-- O problema: `crm_negocios.origem_id` existia e ninguém preenchia. 96
-- negócios com origem nula e o CRM mostrando "não informada" em todos, mais
-- `crm_origens` vazia, ou seja, nem à mão era possível escolher: a lista do
-- seletor não tinha uma única linha.
--
-- Não faltava dado. Faltava ligação, porque o de-onde-veio já estava gravado
-- em dois lugares:
--
--   1. A etiqueta da família `origem` da 041: "veio do disparo",
--      "veio do site", "instagram", "indicacao". Foi gente, ou a
--      IA lendo por gente, que disse de onde a pessoa veio.
--   2. `conversas.origem`, o que o próprio WhatsApp contou quando a conversa
--      nasceu: clique no anúncio (ctwa_clid/source_id), comentário do
--      Instagram, ou a conversa que a equipe começou pelo painel.
--
-- A etiqueta manda, porque é leitura da conversa. O sinal técnico é o que
-- responde quando não existe etiqueta.
--
-- Só `service_role` entra, como no resto do esquema.

-- ---------------------------------------------------------------------------
-- 1. A chave estável da origem
--
-- O nome é editável na tela de configurações; a chave não aparece lá. É o que
-- deixa renomear "Veio do disparo" para "Campanha de novembro" sem desligar o
-- preenchimento automático. Nula nas origens criadas à mão, que por isso nunca
-- são sobrescritas pelo código.
alter table public.crm_origens add column if not exists chave text;

create unique index if not exists crm_origens_cliente_chave
  on public.crm_origens (cliente_id, chave) where chave is not null;

-- ---------------------------------------------------------------------------
-- 2. As origens que vêm das etiquetas de cada cliente
--
-- Uma linha por etiqueta da família `origem`. O nome é a própria etiqueta com
-- a inicial maiúscula: quem leu "veio do disparo" no Quadro reconhece "Veio do
-- disparo" no CRM, e renomear depois é um campo de texto.
insert into public.crm_origens (cliente_id, nome, chave, ordem)
select ec.cliente_id,
       upper(left(ec.etiqueta, 1)) || substr(ec.etiqueta, 2),
       ec.chave,
       10
from public.etiquetas_conhecidas ec
where ec.familia = 'origem'
on conflict (cliente_id, chave) where chave is not null do nothing;

-- ---------------------------------------------------------------------------
-- 3. As origens de sinal, iguais para todo cliente
--
-- `direto` não é desconhecido: é quem mandou mensagem no número sem vir de
-- anúncio, de link ou de campanha. Dizer "WhatsApp direto" é mais honesto que
-- deixar em branco, e é o que o painel de dashboard já chamava de direto.
insert into public.crm_origens (cliente_id, nome, chave, ordem)
select c.id, v.nome, v.chave, v.ordem
from public.clientes c
cross join (values
  ('Anúncio',          'anuncio',   20),
  ('Instagram',        'instagram', 30),
  ('Equipe procurou',  'equipe',    40),
  ('WhatsApp direto',  'direto',    50)
) as v(nome, chave, ordem)
on conflict (cliente_id, chave) where chave is not null do nothing;

-- ---------------------------------------------------------------------------
-- 4. A origem dos negócios que já existem
--
-- Só preenche o que está nulo: origem escolhida à mão não é tocada. Rodar duas
-- vezes não muda nada na segunda.
with da_conversa as (
  select
    c.id as conversa_id,
    c.cliente_id,
    (
      select o.id
      from unnest(c.etiquetas) with ordinality as e(bruta, pos)
      join public.etiquetas_conhecidas ec
        on ec.cliente_id = c.cliente_id
       and ec.familia = 'origem'
       and ec.chave = public.etiqueta_chave(e.bruta)
      join public.crm_origens o
        on o.cliente_id = c.cliente_id and o.chave = ec.chave
      order by e.pos
      limit 1
    ) as por_etiqueta,
    case
      when c.origem ->> 'ctwa_clid' is not null then 'anuncio'
      when c.origem ->> 'source_id' is not null then 'anuncio'
      when c.origem ->> 'tipo' = 'painel' then 'equipe'
      when c.origem ->> 'tipo' = 'comentario' then 'instagram'
      when c.canal = 'instagram' then 'instagram'
      else 'direto'
    end as chave_sinal
  from public.conversas c
)
update public.crm_negocios n
set origem_id = coalesce(d.por_etiqueta, s.id)
from da_conversa d
join public.crm_origens s
  on s.cliente_id = d.cliente_id and s.chave = d.chave_sinal
where n.conversa_id = d.conversa_id
  and n.cliente_id = d.cliente_id
  and n.origem_id is null
  and coalesce(d.por_etiqueta, s.id) is not null;
