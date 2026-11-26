// Respostas rápidas: GET lista, POST cria/edita, DELETE apaga.
//
// Quem pode o quê:
//   - qualquer pessoa da empresa lê as da equipe e as próprias;
//   - qualquer pessoa cria e edita as PRÓPRIAS;
//   - as da equipe (atendente_id nulo) só o gestor e o operador mexem.
//
// A empresa vem da sessão (atendente) ou de `cliente`/`conversa` (operador),
// sempre conferida por `clientePermitido`.

import { db } from "./_db.js";
import { barrou, sessao, clientePermitido } from "./_painel.js";
import { normalizarAtalho } from "../src/respostas.js";

async function clienteDaRequisicao(req, sb) {
  let pedido = req.query?.cliente || req.body?.cliente || null;
  const conversa = req.query?.conversa || req.body?.conversa || null;
  if (!pedido && conversa) {
    const { data } = await sb.from("conversas").select("cliente_id").eq("id", conversa).maybeSingle();
    pedido = data?.cliente_id || null;
  }
  return clientePermitido(req, pedido);
}

function podeMexerNaEquipe(s) {
  return s.tipo === "operador" || s.papel === "gestor";
}

export default async function handler(req, res) {
  if (await barrou(req, res)) return;
  const sb = db();
  const s = await sessao(req);
  const clienteId = await clienteDaRequisicao(req, sb);
  if (!clienteId) return res.status(400).json({ error: "Empresa não informada ou não permitida." });
  const eu = s.tipo === "atendente" ? s.atendente : null;

  if (req.method === "GET") {
    const { data, error } = await sb.from("respostas_rapidas")
      .select("id, atendente_id, atalho, texto, atualizado_em")
      .eq("cliente_id", clienteId).order("atalho");
    if (error) return res.status(500).json({ error: "Falha ao listar.", detalhe: error.message });
    // Pessoais de outra pessoa não saem daqui.
    const visiveis = (data || []).filter((r) => !r.atendente_id || r.atendente_id === eu);
    return res.status(200).json({ respostas: visiveis, pode_equipe: podeMexerNaEquipe(s) });
  }

  if (req.method === "POST") {
    const corpo = req.body || {};
    const atalho = normalizarAtalho(corpo.atalho);
    const texto = String(corpo.texto || "").trim().slice(0, 4000);
    if (!atalho) return res.status(400).json({ error: "Dê um atalho, por exemplo: boas-vindas." });
    if (!texto) return res.status(400).json({ error: "Escreva o texto da resposta." });

    // Pessoal só existe para quem é atendente; o operador grava na equipe.
    const pessoal = Boolean(corpo.pessoal) && Boolean(eu);
    if (!pessoal && !podeMexerNaEquipe(s)) {
      return res.status(403).json({ error: "Só a gestão cria respostas da equipe. Marque como pessoal." });
    }

    let anterior = null;
    if (corpo.id) {
      const { data } = await sb.from("respostas_rapidas").select("id, atendente_id")
        .eq("id", corpo.id).eq("cliente_id", clienteId).maybeSingle();
      anterior = data;
      if (!anterior) return res.status(404).json({ error: "Resposta não encontrada." });
      const minha = anterior.atendente_id && anterior.atendente_id === eu;
      if (!minha && !(anterior.atendente_id === null && podeMexerNaEquipe(s))) {
        return res.status(403).json({ error: "Essa resposta não é sua." });
      }
    }

    const linha = {
      cliente_id: clienteId,
      atendente_id: pessoal ? eu : null,
      atalho,
      texto,
      atualizado_em: new Date().toISOString(),
    };
    const q = anterior
      ? sb.from("respostas_rapidas").update(linha).eq("id", anterior.id)
      : sb.from("respostas_rapidas").insert(linha);
    const { data, error } = await q.select("id, atendente_id, atalho, texto, atualizado_em").single();
    if (error) {
      const repetido = error.code === "23505";
      return res.status(repetido ? 409 : 500).json({
        error: repetido ? `Já existe uma resposta com o atalho /${atalho}.` : "Falha ao gravar.",
      });
    }
    return res.status(200).json({ resposta: data });
  }

  if (req.method === "DELETE") {
    const id = req.query?.id;
    const { data: r } = await sb.from("respostas_rapidas").select("id, atendente_id")
      .eq("id", id).eq("cliente_id", clienteId).maybeSingle();
    if (!r) return res.status(404).json({ error: "Resposta não encontrada." });
    const minha = r.atendente_id && r.atendente_id === eu;
    if (!minha && !(r.atendente_id === null && podeMexerNaEquipe(s))) {
      return res.status(403).json({ error: "Essa resposta não é sua." });
    }
    const { error } = await sb.from("respostas_rapidas").delete().eq("id", r.id);
    if (error) return res.status(500).json({ error: "Falha ao apagar." });
    return res.status(200).json({ ok: true });
  }

  return res.status(405).json({ error: "Método não permitido" });
}
