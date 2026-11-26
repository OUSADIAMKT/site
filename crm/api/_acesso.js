// Pergunta ao projeto dono do dado se aquela pessoa tem conta.
//
// Dado de candidato a visto é sensível, então o CRM NÃO recebe a chave do
// banco de candidatos. Ele pergunta por HTTP e recebe o mínimo: existe conta,
// está ativa, a senha ainda é provisória, o primeiro nome. Nunca hash, nunca
// CPF, nunca nada do perfil.
//
// Quem decide o que pode ser dito sobre o dado é quem é dono dele.
// Ver a documentação do sistema de alunos.

// Uma conversa não pode travar esperando um endpoint lento. Se estourar, a IA
// recebe "indisponivel" e transfere, em vez de ficar muda.
const LIMITE_MS = 6000;

/**
 * @param {object} cliente  linha de `clientes`, com acesso_url e acesso_token
 * @param {{email?: string, cpf?: string}} quem
 */
export async function consultarAcesso(cliente, quem) {
  if (!cliente.acesso_url || !cliente.acesso_token) {
    return { indisponivel: true, motivo: "Consulta de acesso não configurada para este cliente." };
  }

  const email = String(quem.email || "").trim().toLowerCase();
  const cpf = String(quem.cpf || "").replace(/\D/g, "");

  if (!email && !cpf) return { erro: "Informe e-mail ou CPF." };
  if (cpf && cpf.length !== 11 && cpf.length !== 14) {
    return { erro: "CPF incompleto. Peça os 11 dígitos." };
  }

  const corte = AbortSignal.timeout(LIMITE_MS);

  let resposta;
  try {
    resposta = await fetch(cliente.acesso_url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${cliente.acesso_token}`,
        "Content-Type": "application/json",
      },
      // O `auth.js` do sistema de alunos despacha pela `acao` no corpo, não pela URL.
      body: JSON.stringify({ acao: "consultar", ...(email ? { email } : { cpf }) }),
      signal: corte,
    });
  } catch (e) {
    const fora = e.name === "TimeoutError" || e.name === "AbortError";
    return {
      indisponivel: true,
      motivo: fora ? "A consulta demorou demais." : `Falha de rede: ${e.message}`,
    };
  }

  if (!resposta.ok) {
    // 401 aqui é erro de configuração, não do comprador. Registra e some do
    // caminho da conversa: a IA só precisa saber que não deu para confirmar.
    console.error(`[acesso] ${cliente.slug}: HTTP ${resposta.status}`);
    return { indisponivel: true, motivo: "Não foi possível consultar agora." };
  }

  const dados = await resposta.json().catch(() => null);
  if (!dados) return { indisponivel: true, motivo: "Resposta inválida da consulta." };

  return {
    existe: Boolean(dados.existe),
    ativo: Boolean(dados.ativo),
    senha_provisoria: Boolean(dados.senha_provisoria),
    status: dados.status || null,
    primeiro_nome: dados.primeiro_nome || null,
  };
}
