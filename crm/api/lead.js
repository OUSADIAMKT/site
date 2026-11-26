// POST /api/lead: a porta pública dos formulários do site.
//
// É a única rota do CRM que aceita requisição de fora sem sessão, então ela
// tem quatro porteiros, nesta ordem:
//
//   1. Origem: só aceita o que vem das páginas da Ousadia (ORIGENS_DO_SITE),
//      pelo cabeçalho Origin ou, na falta dele, pelo Referer.
//   2. Freio por IP: poucas tentativas por janela, na memória do processo.
//   3. Isca: o campo `_gotcha` fica escondido no formulário. Gente não
//      preenche; robô preenche. Com isca preenchida a resposta é "ok" e nada é
//      gravado, para o robô não aprender a desviar.
//   4. Conteúdo: sem e-mail válido nem telefone, não há lead.
//
// O site manda como `text/plain` (sendBeacon), que é requisição "simples":
// sem preflight e sem precisar ler a resposta. Por isso o corpo pode chegar
// como texto e é lido aqui.

import { db } from "./_db.js";
import { lerLead, registrarLead } from "./_lead.js";

const LIMITE = 10;
const JANELA = 1000 * 60 * 10;
const tentativas = new Map();

function origensPermitidas() {
  return String(process.env.ORIGENS_DO_SITE
    || "https://ousadiamarketing.com.br,https://www.ousadiamarketing.com.br")
    .split(",").map((o) => o.trim().replace(/\/$/, "")).filter(Boolean);
}

export function origemDaRequisicao(req) {
  const origin = req.headers.origin;
  if (origin && origin !== "null") return String(origin).replace(/\/$/, "");
  try { return new URL(req.headers.referer).origin; } catch { return null; }
}

function excedeu(ip) {
  const agora = Date.now();
  const r = tentativas.get(ip);
  if (!r || agora - r.desde > JANELA) {
    tentativas.set(ip, { contagem: 1, desde: agora });
    // Limpa de vez em quando para o mapa não crescer para sempre.
    if (tentativas.size > 5000) {
      for (const [k, v] of tentativas) if (agora - v.desde > JANELA) tentativas.delete(k);
    }
    return false;
  }
  r.contagem += 1;
  return r.contagem > LIMITE;
}

export default async function handler(req, res) {
  const origem = origemDaRequisicao(req);
  const permitida = origem && origensPermitidas().includes(origem);

  if (permitida) {
    res.setHeader("Access-Control-Allow-Origin", origem);
    res.setHeader("Vary", "Origin");
  }
  if (req.method === "OPTIONS") {
    if (!permitida) return res.status(403).end();
    res.setHeader("Access-Control-Allow-Methods", "POST");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
    res.setHeader("Access-Control-Max-Age", "86400");
    return res.status(204).end();
  }
  if (req.method !== "POST") return res.status(405).json({ error: "Método não permitido" });
  if (!permitida) return res.status(403).json({ error: "Origem não permitida." });

  const ip = req.headers["x-forwarded-for"]?.split(",")[0]?.trim() || req.socket?.remoteAddress || "?";
  if (excedeu(ip)) return res.status(429).json({ error: "Muitos envios. Tente daqui a pouco." });

  let corpo = req.body;
  if (Buffer.isBuffer(corpo)) corpo = corpo.toString("utf8");
  if (typeof corpo === "string") {
    try { corpo = JSON.parse(corpo); } catch { return res.status(400).json({ error: "Corpo inválido." }); }
  }
  if (!corpo || typeof corpo !== "object") return res.status(400).json({ error: "Corpo inválido." });

  const isca = corpo._gotcha ?? corpo.dados?._gotcha;
  if (isca) return res.status(200).json({ ok: true });

  const lead = lerLead(corpo);
  if (!lead) return res.status(400).json({ error: "Informe e-mail ou WhatsApp." });

  try {
    const r = await registrarLead(db(), process.env.CLIENTE_DO_SITE || "ousadia", lead);
    return res.status(200).json({ ok: true, novo: r.novo });
  } catch (e) {
    console.error("[lead]", e.message);
    return res.status(500).json({ error: "Não foi possível registrar agora." });
  }
}
