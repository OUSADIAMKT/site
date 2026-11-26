-- 044: um negócio automático por conversa, e a limpeza dos que duplicaram.
--
-- APLICADA em produção em 25/11/2026.
--
-- O problema é uma corrida. `garantirNegocioDaConversa` confere se a conversa
-- já tem negócio e, se não tem, insere. Duas mensagens chegando no mesmo
-- segundo fazem as duas conferências passarem antes de qualquer inserção, e
-- nascem dois negócios para a mesma pessoa. Em 24/11/2026 aconteceu cinco
-- vezes no piloto: 96 negócios para 91 conversas, cinco pares com milésimos
-- de diferença, mesmo título, mesma etapa, nada pendurado além do histórico de
-- criação. Dois cartões iguais no Quadro Comercial, e toda contagem por origem
-- ou por etapa inflada.
--
-- A trava não pode ser um unique em `conversa_id`, porque negócio repetido
-- para a mesma pessoa é legítimo quando é a equipe que abre: comprou, voltou
-- meses depois, é outra venda. O que nunca pode repetir é o automático, e é só
-- ele que o índice parcial alcança.
--
-- O `criado_por` dos dois caminhos automáticos está em `_negocios.js` como
-- QUEM_AUTOMATICO e QUEM_TRAZIDAS, e um teste compara os dois textos com este
-- arquivo: mudar a frase no código sem mudar aqui desligaria a trava calada.
--
-- Só `service_role` entra, como no resto do esquema.

-- ---------------------------------------------------------------------------
-- 1. Os duplicados que já existem
--
-- Fica o mais antigo de cada conversa, que é quem ganhou a corrida. A exceção
-- é o que tem coisa pendurada: se alguém escreveu nota, criou tarefa, lançou
-- produto ou mexeu na etapa de um dos dois, é esse que fica, porque apagar
-- cascateia tarefa, nota, produto e histórico junto.
--
-- O histórico de criação não entra no peso: todo negócio tem exatamente um, e
-- contar isso empataria todo mundo.
with carga as (
  select
    n.id, n.cliente_id, n.conversa_id, n.criado_em,
      (select count(*) from public.crm_tarefas t where t.negocio_id = n.id)
    + (select count(*) from public.crm_notas o where o.negocio_id = n.id)
    + (select count(*) from public.crm_negocio_produtos p where p.negocio_id = n.id)
    + (select count(*) from public.crm_historico h
        where h.negocio_id = n.id and h.tipo <> 'criado') as peso
  from public.crm_negocios n
  where n.conversa_id is not null
    and n.criado_por in ('entrada automática', 'conversas trazidas')
),
ordem as (
  select id, row_number() over (
    partition by cliente_id, conversa_id
    order by peso desc, criado_em, id
  ) as posicao
  from carga
)
delete from public.crm_negocios
where id in (select id from ordem where posicao > 1);

-- ---------------------------------------------------------------------------
-- 2. A trava
--
-- Parcial de propósito. Negócio aberto à mão pela equipe não entra no índice e
-- continua podendo repetir a conversa.
create unique index if not exists crm_negocios_conversa_automatica
  on public.crm_negocios (cliente_id, conversa_id)
  where conversa_id is not null
    and criado_por in ('entrada automática', 'conversas trazidas');
