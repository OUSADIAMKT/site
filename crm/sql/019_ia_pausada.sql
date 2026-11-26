-- Botão de desligar a IA, por cliente.
--
-- Já existia `clientes.ativo`, e ele NÃO serve para isto: cliente inativo faz o
-- webhook ignorar o evento, então a mensagem não é gravada, não entra na fila e
-- não aparece no CRM. Quem pausa quer calar o robô, não perder de vista a
-- pessoa que escreveu.
--
-- Pausado é o contrário: a mensagem entra, fica gravada e a conversa vai para a
-- fila humana com o motivo escrito. Ninguém fica falando sozinho.

alter table clientes
  add column if not exists ia_pausada boolean not null default false;
