// GET /api/saude: o que o monitor externo (UptimeRobot, Better Stack) consulta.
//
// Pública e sem dado nenhum: responde só se cada peça está de pé. 200 quando
// tudo responde, 503 quando o banco não responde ou a fila de tarefas parou,
// que é o código que faz o monitor mandar o alerta.
//
// O monitor tem que ser EXTERNO: se a VPS cair, nada daqui responde, e é
// justamente o silêncio que ele percebe.

import { db } from "./_db.js";
import { estadoDaFila } from "./_fila_tarefas.js";

const LIMITE_MS = 4000;

async function bancoResponde() {
  const consulta = db().from("clientes").select("id").limit(1);
  const tempo = new Promise((_, falha) => setTimeout(() => falha(new Error("tempo")), LIMITE_MS));
  const { error } = await Promise.race([consulta, tempo]);
  if (error) throw new Error(error.message);
}

export default async function handler(req, res) {
  if (req.method !== "GET" && req.method !== "HEAD") {
    return res.status(405).json({ error: "Método não permitido" });
  }
  res.setHeader("Cache-Control", "no-store");

  const pecas = { servidor: "ok", banco: "ok", fila: "ok" };
  try { await bancoResponde(); } catch { pecas.banco = "fora"; }

  const fila = estadoDaFila();
  if (fila.ligada && fila.ultimaVolta && Date.now() - fila.ultimaVolta > 5 * 60_000) pecas.fila = "parada";
  if (!fila.ligada) pecas.fila = "desligada";

  const ok = pecas.banco === "ok" && pecas.fila !== "parada";
  return res.status(ok ? 200 : 503).json({ ok, ...pecas });
}
