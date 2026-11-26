import { db } from "./_db.js";
import { barrouOperador } from "./_painel.js";
import canais from "./_canais.js";

export default async function handler(req, res) {
  // Os canais entram por aqui, e não num arquivo próprio, porque o Vercel
  // conta cada arquivo de `api/` como uma função e o plano está no teto de 12.
  //
  // `canais()` NÃO é rota aberta: ela roda o próprio porteiro, mais fino que
  // este. Exige sessão válida em todos os métodos; POST, PATCH e DELETE
  // continuam exigindo operador, igual aqui; e o GET, que o atendente precisa
  // para o seletor de canal da lateral, passa por `clientePermitido`, que
  // recusa o atendente que pedir o cliente de outro, e devolve a lista sem
  // token, sem verify token e sem app secret.
  if (req.query.rota === "canais") return canais(req, res);

  if (await barrouOperador(req, res)) return;

  const sb = db();

  if (req.method === "GET") {
    // Lista com o custo do mês já somado, para a tela inicial mostrar
    // quanto cada cliente consumiu sem uma segunda chamada.
    const { data: clientes, error } = await sb
      .from("clientes")
      .select("id, nome, slug, plano, teto_conversas, ativo, wa_phone_number_id, wa_token, criado_em")
      .order("nome");
    if (error) return res.status(500).json({ error: "Falha ao listar clientes", detalhe: error.message });

    const { data: uso } = await sb.from("uso_mes").select("*");
    const porCliente = Object.fromEntries((uso || []).map((u) => [u.cliente_id, u]));

    return res.status(200).json({
      clientes: (clientes || []).map(({ wa_token, wa_phone_number_id, ...c }) => ({
        ...c,
        // Conectado de verdade é ter número E credencial. O id do número
        // sozinho pode ser um valor de exemplo, e o token nunca vai pra tela.
        conectado: Boolean(wa_token) && /^\d{6,}$/.test(String(wa_phone_number_id || "")),
        conversas_mes: porCliente[c.id]?.conversas ?? 0,
        custo_brl_mes: Number(porCliente[c.id]?.custo_brl_estimado ?? 0),
      })),
    });
  }

  if (req.method === "POST") {
    const { nome, slug, plano, teto_conversas } = req.body || {};
    if (!nome?.trim()) return res.status(400).json({ error: "Informe o nome do cliente." });
    if (!/^[a-z0-9-]+$/.test(slug || "")) {
      return res.status(400).json({ error: "O apelido só aceita letras minúsculas, números e hífen." });
    }

    const { data, error } = await sb.from("clientes")
      .insert({
        nome: nome.trim(),
        slug,
        plano: plano || "essencial",
        teto_conversas: Number(teto_conversas) || 200,
      })
      .select().single();

    if (error) {
      const jaExiste = error.code === "23505";
      return res.status(jaExiste ? 409 : 500).json({
        error: jaExiste ? "Já existe um cliente com esse apelido." : "Falha ao criar cliente",
        detalhe: error.message,
      });
    }

    // Todo cliente nasce com uma configuração vazia, para o painel ter o que editar.
    await sb.from("agente_config").insert({ cliente_id: data.id });

    return res.status(200).json({ cliente: data });
  }

  if (req.method === "PATCH") {
    const { id, ...campos } = req.body || {};
    if (!id) return res.status(400).json({ error: "Cliente não informado." });

    const permitidos = ["nome", "plano", "teto_conversas", "ativo",
                        "wa_phone_number_id", "wa_token", "wa_verify_token", "wa_app_secret"];
    const atualizacao = {};
    for (const campo of permitidos) {
      if (campo in campos) atualizacao[campo] = campos[campo];
    }
    if (!Object.keys(atualizacao).length) return res.status(400).json({ error: "Nada para atualizar." });

    const { error } = await sb.from("clientes").update(atualizacao).eq("id", id);
    if (error) return res.status(500).json({ error: "Falha ao salvar", detalhe: error.message });
    return res.status(200).json({ ok: true });
  }

  return res.status(405).json({ error: "Método não permitido" });
}
