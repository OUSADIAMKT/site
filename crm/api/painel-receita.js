// GET /api/painel-receita?inicio=AAAA-MM-DD&fim=AAAA-MM-DD[&cliente=]
//
// Receita por campanha (api/_roas.js). Só gestão e operador: é número de
// faturamento, e atendente não vê faturamento em lugar nenhum do painel.

import { db } from "./_db.js";
import { barrouGestor, clientePermitido } from "./_painel.js";
import { receitaPorCampanha } from "./_roas.js";

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).json({ error: "Método não permitido" });
  if (await barrouGestor(req, res)) return;
  const clienteId = await clientePermitido(req, req.query?.cliente);
  if (!clienteId) return res.status(400).json({ error: "Empresa não informada ou não permitida." });

  try {
    return res.status(200).json(await receitaPorCampanha(db(), clienteId, {
      inicio: req.query?.inicio, fim: req.query?.fim,
    }));
  } catch (e) {
    const periodo = /Período inválido/.test(e.message);
    if (!periodo) console.error("[receita]", e.message);
    return res.status(periodo ? 400 : 500).json({ error: periodo ? e.message : "Falha ao calcular." });
  }
}
