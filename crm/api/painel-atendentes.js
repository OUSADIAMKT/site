// Cadastro de quem atende. Só o operador mexe aqui.

import { db } from "./_db.js";
import { barrouOperador, hashSenha } from "./_painel.js";
// Os assuntos que a fila sabe rotear vêm de lá, nunca copiados para cá: com
// duas listas, um assunto novo nasce na fila e some da tela, e ninguém
// descobre até a conversa cair na pessoa errada.
import { ASSUNTOS } from "./_assunto.js";

export default async function handler(req, res) {
  if (await barrouOperador(req, res)) return;
  const sb = db();

  if (req.method === "GET") {
    const clienteId = req.query?.cliente;
    if (!clienteId) return res.status(400).json({ error: "Cliente não informado." });

    // A senha nunca sai do servidor, nem em hash.
    const { data, error } = await sb
      .from("atendentes")
      .select("id, nome, email, papel, disponivel, ativo, assuntos, ultima_atribuicao, criado_em")
      .eq("cliente_id", clienteId)
      .order("nome");

    if (error) return res.status(500).json({ error: "Falha ao listar", detalhe: error.message });

    // Quantas conversas cada um tem na mão agora.
    const { data: cargas } = await sb
      .from("conversas")
      .select("atendente_id")
      .eq("cliente_id", clienteId)
      .eq("modo", "humano");

    const porAtendente = {};
    for (const c of cargas || []) {
      if (c.atendente_id) porAtendente[c.atendente_id] = (porAtendente[c.atendente_id] || 0) + 1;
    }

    return res.status(200).json({
      atendentes: (data || []).map((a) => ({ ...a, em_atendimento: porAtendente[a.id] || 0 })),
    });
  }

  if (req.method === "POST") {
    const { id, cliente_id, nome, email, senha, ativo, papel, assuntos } = req.body || {};

    if (papel && !["atendente", "gestor"].includes(papel)) {
      return res.status(400).json({ error: "Papel inválido." });
    }

    // Os assuntos que a fila conhece. Lista vazia é válida e significa
    // "atende qualquer coisa", que é o padrão.
    let assuntosLimpos = null;
    if (Array.isArray(assuntos)) {
      assuntosLimpos = [...new Set(assuntos.map((a) => String(a).trim().toLowerCase()).filter(Boolean))];
      const fora = assuntosLimpos.filter((a) => !ASSUNTOS.includes(a));
      if (fora.length) {
        return res.status(400).json({ error: `Assunto desconhecido: ${fora.join(", ")}` });
      }
    }

    if (!id) {
      if (!cliente_id) return res.status(400).json({ error: "Cliente não informado." });
      if (!nome?.trim()) return res.status(400).json({ error: "Informe o nome." });
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email || "")) {
        return res.status(400).json({ error: "Informe um email válido." });
      }
      if (!senha || senha.length < 8) {
        return res.status(400).json({ error: "A senha precisa de pelo menos 8 caracteres." });
      }

      const { error } = await sb.from("atendentes").insert({
        cliente_id,
        nome: nome.trim(),
        email: email.trim().toLowerCase(),
        senha_hash: await hashSenha(senha),
        papel: papel || "atendente",
        assuntos: assuntosLimpos || [],
      });

      if (error) {
        const repetido = error.code === "23505";
        return res.status(repetido ? 409 : 500).json({
          error: repetido ? "Este email já está cadastrado." : "Falha ao criar",
          detalhe: error.message,
        });
      }
      return res.status(200).json({ ok: true });
    }

    // Edição: nome, situação e, se vier senha nova, troca a senha.
    const atualizacao = {};
    if (nome?.trim()) atualizacao.nome = nome.trim();
    if (papel) atualizacao.papel = papel;
    if (typeof ativo === "boolean") atualizacao.ativo = ativo;
    if (assuntosLimpos) atualizacao.assuntos = assuntosLimpos;
    if (senha) {
      if (senha.length < 8) {
        return res.status(400).json({ error: "A senha precisa de pelo menos 8 caracteres." });
      }
      atualizacao.senha_hash = await hashSenha(senha);
    }
    if (!Object.keys(atualizacao).length) return res.status(400).json({ error: "Nada para atualizar." });

    // Atendente desligado não pode ficar segurando conversa.
    if (atualizacao.ativo === false) {
      atualizacao.disponivel = false;
      await sb.from("conversas")
        .update({ modo: "fila", atendente_id: null, assumida_em: null, fila_desde: new Date().toISOString() })
        .eq("atendente_id", id).eq("modo", "humano");
    }

    const { error } = await sb.from("atendentes").update(atualizacao).eq("id", id);
    if (error) return res.status(500).json({ error: "Falha ao salvar", detalhe: error.message });
    return res.status(200).json({ ok: true });
  }

  return res.status(405).json({ error: "Método não permitido" });
}
