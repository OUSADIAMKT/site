-- 039: quem já leu o quê. O negrito da lista, no padrão do WhatsApp.
--
-- Aplicada em produção em 24/11/2026.
--
-- Leitura é de quem lê, não da conversa. Três consequências que o desenho
-- precisa garantir:
--
-- 1. A Lia abrir uma conversa não apaga o aviso da Rita.
-- 2. Resposta da IA, ou de colega, não conta como alguém ter lido. A conta
--    olha só `direcao = 'entrada'`, por isso nenhuma resposta entra nela.
-- 3. Nada disto é o visto-azul do WhatsApp. É marca interna do painel; a Meta
--    não fica sabendo que alguém abriu a conversa aqui.
--
-- `quem` é texto e não uma chave estrangeira para `atendentes` de propósito: o
-- gestor da plataforma entra no painel sem linha em `atendentes`, e sem isso
-- seria o único sem estado de leitura. O preço é linha órfã quando uma
-- atendente é apagada, que é lixo pequeno e inofensivo.
create table if not exists public.leituras_conversa (
  conversa_id   uuid not null references public.conversas(id) on delete cascade,
  quem          text not null,
  lido_ate      timestamptz not null default now(),
  nao_lido      boolean not null default false,
  atualizado_em timestamptz not null default now(),
  primary key (conversa_id, quem)
);

create index if not exists leituras_conversa_quem on public.leituras_conversa (quem);

-- A tela nunca fala com esta tabela direto: quem lê e escreve é a API, com a
-- chave de serviço, depois de conferir de quem é a conversa.
alter table public.leituras_conversa enable row level security;

-- Para ninguém estrear com a caixa inteira em negrito: o que já existe entra
-- como lido no momento da migração. Idempotente.
insert into public.leituras_conversa (conversa_id, quem, lido_ate)
select c.id, a.id::text, now()
from public.conversas c
join public.atendentes a on a.cliente_id = c.cliente_id
on conflict do nothing;

insert into public.leituras_conversa (conversa_id, quem, lido_ate)
select c.id, 'operador', now() from public.conversas c
on conflict do nothing;

-- Quantas mensagens da pessoa chegaram depois da última vez que QUEM abriu a
-- conversa. Derivado das mensagens e da marca de leitura, nunca de contador.
--
-- Conversa que essa pessoa nunca abriu não tem linha, e aí tudo que entrou
-- conta como não lido, que é o que o WhatsApp faz.
create or replace function public.nao_lidas_das_conversas(ids uuid[], p_quem text)
returns table(conversa_id uuid, nao_lidas integer, marcada boolean, lido_ate timestamptz)
language sql
stable
security definer
set search_path to 'public'
as $$
  select c.id,
         count(m.id)::int,
         coalesce(l.nao_lido, false),
         l.lido_ate
  from unnest(ids) as c(id)
  left join leituras_conversa l on l.conversa_id = c.id and l.quem = p_quem
  left join mensagens m
         on m.conversa_id = c.id
        and m.direcao = 'entrada'
        and (l.lido_ate is null or m.criado_em > l.lido_ate)
  group by c.id, l.nao_lido, l.lido_ate
$$;

revoke all on function public.nao_lidas_das_conversas(uuid[], text) from public, anon;
grant execute on function public.nao_lidas_das_conversas(uuid[], text) to service_role;
