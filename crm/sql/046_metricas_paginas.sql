-- 046: quantas pessoas viram a landing page, e quantas deixaram contato.
--
-- APLICADA em produção em 25/11/2026
-- pedida ANTES de rodar e dada por escrito.
--
-- A pergunta foi "Visitantes, leads e taxa de conversão não existem no banco
-- hoje: a 045 não conta acesso nem lead. Como ficam esses três indicadores?",
-- com três caminhos, e a resposta escolhida foi "Implementa a contagem,
-- autorizo a 046". Só depois disso o arquivo foi rodado.
--
-- Três coisas que esta migração resolve, e uma que ela recusa:
--
-- 1. `pagina_eventos_dia` guarda SOMA POR DIA, não uma linha por visita. Uma
--    linha por visita é a tabela que ninguém consegue mais ler depois de seis
--    meses de campanha, e nada do que a tela pede (total, taxa, filtro por
--    período) precisa da visita individual. Fica barato de contar e barato de
--    somar.
--
-- 2. Quem soma é uma função no banco, `somar_evento_pagina`, e não o
--    JavaScript: duas visitas no mesmo segundo com a conta feita no servidor
--    de aplicação perderiam uma. O `on conflict` resolve isso dentro da
--    transação, igual ao número da versão na 045.
--
-- 3. `paginas.arquivada_em` tira a página da galeria sem apagar nada. Apagar
--    uma landing page que já esteve no ar apaga o histórico de versões e a
--    medição junto; arquivar é o que a pessoa quer quando diz "não quero mais
--    ver isso aqui".
--
-- O que ela recusa: guardar QUEM visitou. Sem IP, sem identificador de
-- pessoa, sem user agent. A tela pede quantidade, e quantidade é o que entra.
-- Guardar mais que o necessário em tabela de terceiro é dívida de privacidade
-- que não se paga depois.
--
-- Só `service_role` entra, como no resto do esquema: RLS ligada e nenhuma
-- policy.

-- ---------------------------------------------------------------------------
-- 1. A soma por dia
create table if not exists public.pagina_eventos_dia (
  id        uuid primary key default gen_random_uuid(),
  pagina_id uuid not null references public.paginas(id) on delete cascade,
  dia       date not null,
  -- Visita é carregamento da página publicada por alguém de fora. Lead é
  -- envio de formulário dentro dela. Nada mais entra aqui: o que não tem
  -- definição curta vira número que ninguém sabe explicar na reunião.
  visitas   int not null default 0,
  leads     int not null default 0,
  criado_em timestamptz not null default now(),
  constraint pagina_eventos_dia_nao_negativo check (visitas >= 0 and leads >= 0),
  unique (pagina_id, dia)
);

create index if not exists pagina_eventos_dia_pagina
  on public.pagina_eventos_dia (pagina_id, dia desc);

-- ---------------------------------------------------------------------------
-- 2. A soma acontece no banco
--
-- `p_tipo` é texto e não enum de propósito: enum novo pede migração, e a
-- função já recusa o que não conhece. O check está aqui embaixo.
create or replace function public.somar_evento_pagina(p_pagina uuid, p_tipo text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_tipo not in ('visita', 'lead') then
    raise exception 'tipo de evento desconhecido: %', p_tipo;
  end if;

  insert into public.pagina_eventos_dia (pagina_id, dia, visitas, leads)
  values (
    p_pagina,
    (now() at time zone 'America/Sao_Paulo')::date,
    case when p_tipo = 'visita' then 1 else 0 end,
    case when p_tipo = 'lead' then 1 else 0 end
  )
  on conflict (pagina_id, dia) do update set
    visitas = public.pagina_eventos_dia.visitas + excluded.visitas,
    leads   = public.pagina_eventos_dia.leads   + excluded.leads;
end;
$$;

-- O dia é o dia de São Paulo, e não UTC, porque quem lê o painel conta o dia
-- dele: campanha que vira às 21h de Santarém não pode aparecer como de amanhã.

-- ---------------------------------------------------------------------------
-- 3. Arquivar sem apagar
alter table public.paginas add column if not exists arquivada_em timestamptz;

-- A galeria lista o que não está arquivado, e este índice é o que ela usa.
create index if not exists paginas_cliente_ativas
  on public.paginas (cliente_id) where arquivada_em is null;

-- ---------------------------------------------------------------------------
-- 4. Ninguém entra sem ser o servidor
alter table public.pagina_eventos_dia enable row level security;
