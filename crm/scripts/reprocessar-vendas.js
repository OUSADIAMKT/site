// Põe de volta na fila os eventos da HeroSpark que não foram entendidos.
//
// Para depois de ajustar a leitura em api/_vendas.js (lerVenda), quando a
// primeira venda real mostrar o formato do webhook:
//   node --env-file=/etc/ousadia-crm.env scripts/reprocessar-vendas.js            (mostra)
//   node --env-file=/etc/ousadia-crm.env scripts/reprocessar-vendas.js --confirmar (reprocessa)
//
// Só mexe nos eventos "ignorado" e "erro". Evento já processado não é
// reprocessado: isso moveria negócio de novo.

import { db } from "../api/_db.js";
import { agendar } from "../api/_fila_tarefas.js";
import { lerVenda } from "../api/_vendas.js";

const confirmar = process.argv.includes("--confirmar");
const sb = db();
const { data, error } = await sb.from("vendas_eventos")
  .select("id, cliente_id, estado, erro, bruto, recebido_em").in("estado", ["ignorado", "erro"])
  .order("recebido_em").limit(500);
if (error) throw new Error(error.message);

for (const ev of data || []) {
  const v = lerVenda(ev.bruto);
  console.log(`${ev.recebido_em}  ${ev.estado} (${ev.erro || "-"})  ->  status=${v.status_venda} email=${v.email || "-"} valor=${v.valor ?? "-"}`);
  if (!confirmar) continue;
  await sb.from("vendas_eventos").update({ estado: "recebido", erro: null }).eq("id", ev.id);
  await agendar(sb, {
    tipo: "processar-venda", carga: { evento_id: ev.id }, clienteId: ev.cliente_id,
    chave: `processar-venda:${ev.id}:${Date.now()}`,
  });
}
console.log(confirmar ? `\n${(data || []).length} evento(s) de volta na fila.` : "\nNada mudou. Rode com --confirmar para reprocessar.");
