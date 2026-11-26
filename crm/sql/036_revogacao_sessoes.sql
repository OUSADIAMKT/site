begin;

alter table public.atendentes
  add column if not exists versao_sessao integer not null default 1;

create or replace function public.incrementar_versao_sessao_atendente()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.senha_hash is distinct from old.senha_hash
     or new.papel is distinct from old.papel
     or new.cliente_id is distinct from old.cliente_id
     or (old.ativo and not new.ativo) then
    new.versao_sessao := old.versao_sessao + 1;
  end if;
  return new;
end;
$$;

drop trigger if exists incrementar_versao_sessao on public.atendentes;
create trigger incrementar_versao_sessao
  before update on public.atendentes
  for each row
  execute function public.incrementar_versao_sessao_atendente();

create or replace function public.revogar_sessoes_cliente_desativado()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  update public.atendentes
     set versao_sessao = versao_sessao + 1
   where cliente_id = new.id;
  return new;
end;
$$;

drop trigger if exists revogar_sessoes_cliente_desativado on public.clientes;
create trigger revogar_sessoes_cliente_desativado
  after update of ativo on public.clientes
  for each row when (old.ativo and not new.ativo)
  execute function public.revogar_sessoes_cliente_desativado();

commit;
