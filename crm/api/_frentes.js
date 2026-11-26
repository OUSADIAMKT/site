// As frentes de atendimento de uma empresa.
//
// Uma frente é um recorte de atendimento com nome, dono atual e os assuntos
// que ela atende. Hoje a empresa tem dois recortes reais, matrícula e suporte, mas
// eles existem espalhados entre a lista de palavras do `_assunto.js` e a
// coluna `atendentes.assuntos`, sem nome e sem tela. Isto dá nome a eles.
//
// O isolamento entre empresas NÃO é feito aqui. Ele é feito por chave
// estrangeira composta na migração 033: `(responsavel_id, cliente_id)` aponta
// para `atendentes (id, cliente_id)`, então o Postgres recusa sozinho uma
// frente com responsável de outra empresa. O que este arquivo faz é checar
// antes para dar uma mensagem que a pessoa entenda, em vez de deixar vazar o
// texto da constraint. A trava é o banco; isto é a educação.
//
// A tabela tem RLS ligada sem política nenhuma (migração 033), então `anon` e
// `authenticated` não entram nela de jeito nenhum. Todo acesso é por aqui, com
// a chave de serviço, atrás de `barrouGestor` e do recorte por `cliente_id`.
//
// Arquivo com `_`: não conta no teto de 12 funções da Vercel.

import { ASSUNTOS } from "./_assunto.js";

/** Nome limpo, do jeito que vai para o banco e para a comparação de unicidade. */
function limpar(nome) {
  return String(nome || "").trim().replace(/\s+/g, " ");
}

/**
 * Traduz erro do banco para frase de gente, e só ela sai daqui.
 *
 * As travas de integridade vivem no Postgres de propósito, então elas falam
 * em nome de constraint. A tela não pode mostrar isso, e não é só questão de
 * ser feio: o texto cru do Postgres carrega nome de tabela, de coluna e de
 * constraint, que é mapa da casa de graça para quem está testando a porta.
 *
 * Então o detalhe técnico vai para o log do servidor, onde eu leio, e para a
 * tela vai a frase. Erro que não está na lista virou frase genérica: o que a
 * pessoa precisa saber é que não salvou, e o que eu preciso saber está no log.
 *
 * O log leva código, mensagem e detalhe do Postgres. Nada disso tem segredo:
 * não passa chave, não passa token e não passa senha, porque o cliente do
 * Supabase não põe credencial no objeto de erro.
 */
function explicar(error, verbo) {
  console.error(`[frentes] falha ao ${verbo}:`, {
    code: error?.code || null,
    message: error?.message || null,
    details: error?.details || null,
    hint: error?.hint || null,
  });

  const t = `${error?.message || ""} ${error?.details || ""}`;
  if (t.includes("frentes_nome_idx")) return "Já existe uma frente ativa com esse nome.";
  if (t.includes("frentes_padrao_idx")) return "Já existe uma frente padrão nesta empresa.";
  if (t.includes("frentes_responsavel_mesma_empresa")) return "Esse responsável é de outra empresa.";
  if (t.includes("disparos_frente_mesma_empresa")) return "Essa frente é de outra empresa.";
  if (t.includes("frentes_nome_nao_vazio")) return "A frente precisa de um nome.";
  if (t.includes("ja pertence a frente")) {
    // A mensagem do trigger já é legível e carrega o nome da outra frente.
    const m = t.match(/o assunto ja pertence a frente "([^"]+)"/);
    return m ? `Esse assunto já é da frente "${m[1]}".` : "Esse assunto já é de outra frente.";
  }
  return `Não deu para ${verbo} a frente. O erro ficou registrado no servidor.`;
}

/**
 * As frentes da empresa, com o nome do responsável e quantas campanhas já
 * apontam para cada uma.
 *
 * Inclui as inativas, porque desativar não é apagar e a tela precisa mostrar
 * o que existiu. `apenasAtivas` serve para quem vai escolher uma frente.
 */
export async function listarFrentes(sb, clienteId, { apenasAtivas = false } = {}) {
  let q = sb.from("frentes")
    .select("id, nome, assuntos, padrao, responsavel_id, ativa, criada_em, atualizada_em")
    .eq("cliente_id", clienteId)
    .order("ativa", { ascending: false })
    .order("padrao", { ascending: false })
    .order("nome");
  if (apenasAtivas) q = q.eq("ativa", true);

  const { data: frentes, error } = await q;
  if (error) throw new Error(explicar(error, "listar"));
  if (!frentes?.length) return [];

  // Dois selects em vez de um join aninhado: o join por chave composta não é
  // expressável no PostgREST, e a empresa tem poucas frentes e poucas pessoas.
  const [{ data: pessoas }, { data: campanhas }] = await Promise.all([
    sb.from("atendentes").select("id, nome, ativo").eq("cliente_id", clienteId),
    sb.from("disparos").select("frente_id").eq("cliente_id", clienteId).not("frente_id", "is", null),
  ]);

  const porId = new Map((pessoas || []).map((p) => [p.id, p]));
  const conta = new Map();
  for (const c of campanhas || []) conta.set(c.frente_id, (conta.get(c.frente_id) || 0) + 1);

  return frentes.map((f) => ({
    ...f,
    responsavel: f.responsavel_id ? porId.get(f.responsavel_id) || null : null,
    campanhas: conta.get(f.id) || 0,
  }));
}

/**
 * Cria ou edita uma frente.
 *
 * `corpo.id` presente edita; ausente cria. Nunca apaga: para tirar uma frente
 * de circulação existe `desativarFrente`, que preserva o histórico.
 *
 * NA EDIÇÃO, CAMPO AUSENTE FICA COMO ESTÁ. A versão anterior montava os cinco
 * campos sempre, lendo `corpo.padrao === true` e `Array.isArray(corpo.assuntos)
 * ? ... : []`, então uma chamada com só `{id, nome}` zerava `padrao`, apagava
 * os assuntos e tirava o responsável sem erro nenhum. A tela sempre manda tudo,
 * então isso nunca aconteceu, mas era uma armadilha esperando o primeiro
 * chamador que mandasse menos.
 *
 * Isso não muda nada no que a tela faz hoje: `src/Frentes.jsx` envia nome,
 * assuntos, padrao e responsavel_id em toda gravação, inclusive os vazios, e
 * campo presente continua sendo escrito exatamente como vem. Quem manda
 * `assuntos: []` continua limpando os assuntos de propósito; quem não manda a
 * chave é que passou a não mexer neles.
 *
 * Na criação nada disso vale: campo ausente cai no default da tabela, que é
 * `'{}'` para assuntos, `false` para padrao e `true` para ativa.
 */
export async function salvarFrente(sb, clienteId, corpo = {}) {
  const editando = Boolean(corpo.id);
  const campos = {};

  // `cliente_id` só na criação. No update ele não entra nem para confirmar: a
  // linha é encontrada pelo `.eq("cliente_id")`, e reescrever a coluna com o
  // mesmo valor só serviria para fazer o trigger de assunto disparar de novo.
  if (!editando) campos.cliente_id = clienteId;

  // Nome: obrigatório na criação, opcional na edição.
  if (corpo.nome !== undefined || !editando) {
    const nome = limpar(corpo.nome);
    if (!nome) throw new Error("A frente precisa de um nome.");
    if (nome.length > 80) throw new Error("O nome da frente passou de 80 caracteres.");
    campos.nome = nome;
  }

  if (corpo.assuntos !== undefined) {
    if (!Array.isArray(corpo.assuntos)) throw new Error("Os assuntos têm que vir em lista.");
    const assuntos = [...new Set(
      corpo.assuntos.map((a) => String(a || "").trim().toLowerCase()).filter(Boolean),
    )];
    const desconhecido = assuntos.find((a) => !ASSUNTOS.includes(a));
    if (desconhecido) {
      throw new Error(`Assunto desconhecido: "${desconhecido}". Os que existem são ${ASSUNTOS.join(", ")}.`);
    }
    campos.assuntos = assuntos;
  }

  if (typeof corpo.padrao === "boolean") campos.padrao = corpo.padrao;
  if (typeof corpo.ativa === "boolean") campos.ativa = corpo.ativa;

  // Responsável: `null` explícito tira o responsável, chave ausente deixa como
  // está. São coisas diferentes e precisam continuar diferentes.
  const mandouResponsavel = "responsavel_id" in corpo || "responsavel" in corpo;
  if (mandouResponsavel) {
    const responsavelId = corpo.responsavel_id || corpo.responsavel || null;
    if (responsavelId) {
      // O `.eq("cliente_id")` aqui é o que fecha o oráculo: sem ele, acertar um
      // id de outra empresa devolvia "é de outra empresa" em vez de "não
      // encontrado", e isso já conta que aquele id existe em algum lugar do
      // sistema. É a mesma razão pela qual `autenticarAtendente` não diz se
      // errou o email ou a senha. Uma mensagem só para os dois casos.
      //
      // A trava de verdade continua sendo a chave estrangeira composta da
      // migração 033, que recusaria igual. Isto é a mensagem legível.
      const { data: quem, error } = await sb.from("atendentes")
        .select("id, ativo, nome")
        .eq("id", responsavelId).eq("cliente_id", clienteId).maybeSingle();
      if (error) throw new Error(explicar(error, "salvar"));
      if (!quem) throw new Error("Responsável não encontrado nesta empresa.");
      if (!quem.ativo) throw new Error(`${quem.nome} está desligado e não pode ser responsável.`);
    }
    campos.responsavel_id = responsavelId;
  }

  if (editando) {
    if (!Object.keys(campos).length) throw new Error("Não veio nada para mudar na frente.");

    // `eq("cliente_id")` no update é o que impede editar frente de outra
    // empresa mesmo com o id em mão: sem a linha bater, nada é escrito.
    const { data, error } = await sb.from("frentes")
      .update(campos).eq("id", corpo.id).eq("cliente_id", clienteId)
      .select("id, nome, assuntos, padrao, responsavel_id, ativa").maybeSingle();
    if (error) throw new Error(explicar(error, "salvar"));
    if (!data) throw new Error("Frente não encontrada nesta empresa.");
    return data;
  }

  const { data, error } = await sb.from("frentes")
    .insert(campos)
    .select("id, nome, assuntos, padrao, responsavel_id, ativa").single();
  if (error) throw new Error(explicar(error, "salvar"));
  return data;
}

/**
 * Tira a frente de circulação sem apagar nada.
 *
 * Desativar libera o nome e os assuntos dela para outra frente, e as
 * campanhas que apontam para ela continuam apontando: o histórico de qual
 * campanha era de qual frente não pode sumir porque a frente saiu de uso.
 */
export async function desativarFrente(sb, clienteId, id) {
  const { data, error } = await sb.from("frentes")
    .update({ ativa: false })
    .eq("id", id).eq("cliente_id", clienteId)
    .select("id, nome, ativa").maybeSingle();
  if (error) throw new Error(explicar(error, "desativar"));
  if (!data) throw new Error("Frente não encontrada nesta empresa.");
  return data;
}

/** Reativa uma frente desativada, se o nome e os assuntos estiverem livres. */
export async function reativarFrente(sb, clienteId, id) {
  const { data, error } = await sb.from("frentes")
    .update({ ativa: true })
    .eq("id", id).eq("cliente_id", clienteId)
    .select("id, nome, ativa").maybeSingle();
  if (error) throw new Error(explicar(error, "reativar"));
  if (!data) throw new Error("Frente não encontrada nesta empresa.");
  return data;
}

/**
 * Confere se uma frente serve para uma campanha desta empresa.
 *
 * Usada na criação de campanha para recusar antes de tentar gravar. A chave
 * estrangeira composta recusaria igual; isto existe para a mensagem.
 * Devolve o id validado, ou null quando não veio frente nenhuma.
 */
export async function frenteDaCampanha(sb, clienteId, frenteId) {
  if (!frenteId) return null;
  const { data, error } = await sb.from("frentes")
    .select("id, ativa").eq("id", frenteId).eq("cliente_id", clienteId).maybeSingle();
  // Falha de banco não pode virar "essa frente não existe": a campanha seria
  // recusada com o motivo errado e eu não saberia por quê.
  if (error) throw new Error(explicar(error, "conferir"));
  if (!data) throw new Error("Essa frente é de outra empresa ou não existe.");
  if (!data.ativa) throw new Error("Essa frente está desativada.");
  return data.id;
}
