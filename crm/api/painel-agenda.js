// Profissionais, a disponibilidade que se repete toda semana, e os bloqueios.
// Quem preenche é a clínica: o operador ou o gestor dela. A IA só lê.

import { db } from "./_db.js";
import { barrouGestor, clientePermitido } from "./_painel.js";
import { agendamentos } from "./_agendamentos.js";

// O gestor manda ids no corpo da requisição. Nada aqui confia neles sem
// antes conferir de qual cliente aquele registro é.
async function donoDoProfissional(sb, profissionalId) {
  const { data } = await sb.from("profissionais")
    .select("cliente_id").eq("id", profissionalId).maybeSingle();
  return data?.cliente_id || null;
}

export default async function handler(req, res) {
  // A fila do dia mora aqui dentro (ver _agendamentos.js). Desvia antes do
  // porteiro de gestor: o atendente comum também opera essa tela.
  if (req.query?.recurso === "agendamentos") return agendamentos(req, res);

  if (await barrouGestor(req, res)) return;
  const sb = db();

  if (req.method === "GET") {
    const clienteId = await clientePermitido(req, req.query?.cliente);
    if (!clienteId) return res.status(403).json({ error: "Cliente não informado ou não permitido." });

    const { data: profissionais, error } = await sb
      .from("profissionais")
      .select("*, disponibilidade(*), bloqueios(*)")
      .eq("cliente_id", clienteId)
      .order("nome");

    if (error) return res.status(500).json({ error: "Falha ao ler a agenda", detalhe: error.message });

    // Ordena o que veio aninhado, para a tela não depender da sorte.
    for (const p of profissionais || []) {
      p.disponibilidade?.sort((a, b) =>
        a.dia_semana - b.dia_semana || a.hora_inicio.localeCompare(b.hora_inicio));
      p.bloqueios?.sort((a, b) => a.inicio.localeCompare(b.inicio));
    }

    return res.status(200).json({ profissionais: profissionais || [] });
  }

  if (req.method === "POST") {
    const { acao } = req.body || {};

    if (acao === "profissional") {
      const { id, cliente_id, nome, especialidade, ativo } = req.body;

      const alvo = id ? await donoDoProfissional(sb, id) : cliente_id;
      if (!await clientePermitido(req, alvo)) {
        return res.status(403).json({ error: "Cliente não permitido." });
      }
      if (!nome?.trim()) return res.status(400).json({ error: "Informe o nome do profissional." });

      const registro = {
        cliente_id: alvo,
        nome: nome.trim(),
        especialidade: especialidade?.trim() || null,
        ativo: ativo !== false,
      };

      const { error } = id
        ? await sb.from("profissionais").update(registro).eq("id", id)
        : await sb.from("profissionais").insert(registro);

      if (error) {
        const repetido = error.code === "23505";
        return res.status(repetido ? 409 : 500).json({
          error: repetido ? "Já existe um profissional com esse nome." : "Falha ao salvar",
          detalhe: error.message,
        });
      }
      return res.status(200).json({ ok: true });
    }

    if (acao === "disponibilidade" || acao === "bloqueio") {
      // Numa edição o dono vem do registro que está sendo alterado, nunca do
      // profissional_id que o navegador mandou junto.
      let profissional_id = req.body.profissional_id;
      if (req.body.id) {
        const { data } = await sb.from(acao === "disponibilidade" ? "disponibilidade" : "bloqueios")
          .select("profissional_id").eq("id", req.body.id).maybeSingle();
        profissional_id = data?.profissional_id || null;
      }

      if (!profissional_id) return res.status(400).json({ error: "Profissional não informado." });
      if (!await clientePermitido(req, await donoDoProfissional(sb, profissional_id))) {
        return res.status(403).json({ error: "Profissional de outro cliente." });
      }

      if (acao === "disponibilidade") {
        // `faixas` permite mandar manhã e tarde de uma vez, para o mesmo dia
        // não precisar ser cadastrado duas vezes. `id` transforma em edição.
        const { id, dia_semana, faixas, vigencia_inicio, vigencia_fim, estado, cidade } = req.body;

        if (vigencia_inicio && vigencia_fim && vigencia_fim < vigencia_inicio) {
          return res.status(400).json({ error: "O fim do período tem que ser depois do começo." });
        }

        const local = {
          vigencia_inicio: vigencia_inicio || null,
          vigencia_fim: vigencia_fim || null,
          estado: estado?.trim()?.toUpperCase() || null,
          cidade: cidade?.trim() || null,
        };
        const lista = Array.isArray(faixas) && faixas.length
          ? faixas
          : [{ hora_inicio: req.body.hora_inicio, hora_fim: req.body.hora_fim }];

        for (const f of lista) {
          if (!f?.hora_inicio || !f?.hora_fim) {
            return res.status(400).json({ error: "Informe o começo e o fim de cada período." });
          }
          if (f.hora_fim <= f.hora_inicio) {
            return res.status(400).json({ error: "O fim tem que ser depois do início." });
          }
        }
        if (lista.length === 2 && lista[1].hora_inicio < lista[0].hora_fim) {
          return res.status(400).json({ error: "O segundo período precisa começar depois que o primeiro termina." });
        }

        if (id) {
          const { error } = await sb.from("disponibilidade").update({
            dia_semana: Number(dia_semana),
            hora_inicio: lista[0].hora_inicio,
            hora_fim: lista[0].hora_fim,
            ...local,
          }).eq("id", id);
          if (error) return res.status(500).json({ error: "Falha ao salvar", detalhe: error.message });
          return res.status(200).json({ ok: true });
        }

        const { error } = await sb.from("disponibilidade").insert(
          lista.map((f) => ({
            profissional_id,
            dia_semana: Number(dia_semana),
            hora_inicio: f.hora_inicio,
            hora_fim: f.hora_fim,
            ...local,
          })),
        );
        if (error) return res.status(500).json({ error: "Falha ao salvar", detalhe: error.message });
        return res.status(200).json({ ok: true, criados: lista.length });
      }

      const { inicio, fim, motivo } = req.body;
      if (!inicio || !fim) return res.status(400).json({ error: "Informe o começo e o fim." });
      if (new Date(fim) <= new Date(inicio)) {
        return res.status(400).json({ error: "O fim tem que ser depois do início." });
      }
      const { error } = await sb.from("bloqueios").insert({
        profissional_id, inicio, fim, motivo: motivo?.trim() || null,
      });
      if (error) return res.status(500).json({ error: "Falha ao salvar", detalhe: error.message });
      return res.status(200).json({ ok: true });
    }

    return res.status(400).json({ error: "Ação desconhecida." });
  }

  if (req.method === "DELETE") {
    const { tipo, id } = req.query || {};
    const tabelas = {
      profissional: "profissionais",
      disponibilidade: "disponibilidade",
      bloqueio: "bloqueios",
    };
    if (!tabelas[tipo] || !id) return res.status(400).json({ error: "Requisição inválida." });

    // Descobre a qual cliente o registro pertence antes de apagar.
    let dono = null;
    if (tipo === "profissional") {
      dono = await donoDoProfissional(sb, id);
    } else {
      const { data } = await sb.from(tabelas[tipo])
        .select("profissional_id").eq("id", id).maybeSingle();
      dono = data ? await donoDoProfissional(sb, data.profissional_id) : null;
    }
    if (!await clientePermitido(req, dono)) {
      return res.status(403).json({ error: "Registro de outro cliente." });
    }

    const { error } = await sb.from(tabelas[tipo]).delete().eq("id", id);
    if (error) return res.status(500).json({ error: "Falha ao excluir", detalhe: error.message });
    return res.status(200).json({ ok: true });
  }

  return res.status(405).json({ error: "Método não permitido" });
}
