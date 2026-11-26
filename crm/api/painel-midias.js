// Biblioteca de mídia. A IA escolhe pela descrição, então a descrição é o
// campo que decide se a foto certa vai ou não vai.

import { db } from "./_db.js";
import { barrouOperador } from "./_painel.js";

const TIPOS = ["image", "video", "audio", "document"];

export default async function handler(req, res) {
  if (await barrouOperador(req, res)) return;
  const sb = db();

  if (req.method === "GET") {
    const clienteId = req.query?.cliente;
    if (!clienteId) return res.status(400).json({ error: "Cliente não informado." });

    const { data, error } = await sb.from("midias")
      .select("*").eq("cliente_id", clienteId).order("chave");
    if (error) return res.status(500).json({ error: "Falha ao listar mídias", detalhe: error.message });
    return res.status(200).json({ midias: data || [] });
  }

  if (req.method === "POST") {
    const { id, cliente_id, chave, tipo, descricao, legenda, url, wa_media_id, ativo } = req.body || {};

    if (!cliente_id) return res.status(400).json({ error: "Cliente não informado." });
    if (!/^[a-z0-9-]+$/.test(chave || "")) {
      return res.status(400).json({ error: "O apelido da mídia só aceita letras minúsculas, números e hífen." });
    }
    if (!TIPOS.includes(tipo)) return res.status(400).json({ error: "Tipo de mídia inválido." });
    if (!descricao?.trim()) {
      return res.status(400).json({ error: "Descreva a mídia, porque é por ela que a IA decide quando enviar." });
    }
    if (!url?.trim() && !wa_media_id?.trim()) {
      return res.status(400).json({ error: "Informe o link do arquivo ou o ID da mídia na Meta." });
    }

    const registro = {
      cliente_id,
      chave,
      tipo,
      descricao: descricao.trim(),
      legenda: legenda?.trim() || null,
      url: url?.trim() || null,
      wa_media_id: wa_media_id?.trim() || null,
      ativo: ativo !== false,
    };

    const consulta = id
      ? sb.from("midias").update(registro).eq("id", id)
      : sb.from("midias").insert(registro);

    const { error } = await consulta;
    if (error) {
      const jaExiste = error.code === "23505";
      return res.status(jaExiste ? 409 : 500).json({
        error: jaExiste ? "Já existe uma mídia com esse apelido neste cliente." : "Falha ao salvar",
        detalhe: error.message,
      });
    }
    return res.status(200).json({ ok: true });
  }

  if (req.method === "DELETE") {
    const id = req.query?.id;
    if (!id) return res.status(400).json({ error: "Mídia não informada." });
    const { error } = await sb.from("midias").delete().eq("id", id);
    if (error) return res.status(500).json({ error: "Falha ao excluir", detalhe: error.message });
    return res.status(200).json({ ok: true });
  }

  return res.status(405).json({ error: "Método não permitido" });
}
