-- Contato criado a partir de um negócio do CRM ganha a origem "crm".
-- Só acrescenta um valor permitido: nenhum contato existente muda.
alter table contatos drop constraint contatos_origem_check;
alter table contatos add constraint contatos_origem_check
  check (origem = any (array['importado'::text, 'conversa'::text, 'pedido'::text, 'crm'::text]));
