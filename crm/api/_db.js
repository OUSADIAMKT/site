import { createClient } from "@supabase/supabase-js";
import { decifrar } from "./_cifra.js";

let cliente;

export function db() {
  if (!cliente) {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SECRET_KEY;
    if (!url || !key) throw new Error("Supabase não configurado no servidor.");
    cliente = createClient(url, key, { auth: { persistSession: false } });
  }
  return cliente;
}

// Carrega cliente + config do agente + biblioteca de mídia a partir do
// phone_number_id que veio no webhook da Meta.
//
// O número mora em `canais_wa` desde o v2, não mais numa coluna de `clientes`,
// porque lá cabia um só por cliente. O que sai daqui continua com os mesmos
// nomes de antes, `wa_phone_number_id` e `wa_token`, de propósito: `_wa.js` e
// `_canal.js` não precisam saber que a origem mudou.
//
// Cliente antigo que ainda tem o número na coluna velha continua funcionando.
// Migração que exige desligar tudo numa noite é migração que não acontece.
export async function carregarTenant(phoneNumberId) {
  const { data: canal } = await db()
    .from("canais")
    .select("*")
    .eq("phone_number_id", phoneNumberId)
    .eq("ativo", true)
    .maybeSingle();

  if (!canal) return acharTenant("wa_phone_number_id", phoneNumberId);

  const tenant = await acharTenant("id", canal.cliente_id);
  if (!tenant) return null;

  return { ...tenant, cliente: comCredenciaisDoCanal(tenant.cliente, canal) };
}

// Junta o canal ao cliente, decifrando os segredos na hora do uso.
//
// O token decifrado existe só na memória desta requisição. Nunca volta para o
// banco, nunca entra em log: o `_wa.js` recebe, usa e o processo morre.
function comCredenciaisDoCanal(cliente, canal) {
  // O Instagram passou a morar na mesma tabela. Os nomes que saem daqui são
  // os mesmos de quando ele vivia em colunas de `clientes`, de propósito:
  // `_ig.js` não precisa saber que a origem mudou.
  if (canal.tipo === "instagram") {
    return {
      ...cliente,
      canal_id: canal.id,
      ig_user_id: canal.ig_user_id,
      ig_token: decifrar(canal.token_cifrado),
      ig_base: canal.ig_base || cliente.ig_base,
      wa_app_secret: canal.app_secret_cifrado
        ? decifrar(canal.app_secret_cifrado)
        : cliente.wa_app_secret,
    };
  }

  return {
    ...cliente,
    canal_id: canal.id,
    canal_wa_id: canal.id,
    // São dois ids diferentes para o mesmo número, e eles não servem um pelo
    // outro. A WABA é a conta de WhatsApp Business; ela recusa a API de
    // template com o erro 2388339. Quem aceita template, e quem recebe a
    // inscrição do app no webhook, é a conta de mensagens.
    wa_waba_id: canal.waba_id,
    wa_conta_id: canal.conta_mensagens_id || canal.waba_id,
    wa_phone_number_id: canal.phone_number_id,
    wa_numero: canal.numero_e164,
    wa_token: decifrar(canal.token_cifrado),
    wa_app_secret: canal.app_secret_cifrado
      ? decifrar(canal.app_secret_cifrado)
      : cliente.wa_app_secret,
    wa_verify_token: canal.verify_token,
    wa_coexistencia: canal.coexistencia,
  };
}

// Mesma coisa pelo lado do Instagram. A Meta manda os dois canais para a mesma
// URL de webhook, e o que diferencia é qual id vem no evento.
//
// Procura primeiro na tabela de canais, onde o token está cifrado, e cai para
// as colunas antigas de `clientes` se o perfil ainda não tiver sido movido.
// A queda não é gentileza: o Escola Exemplo está no ar com o perfil na coluna
// velha, e migração que exige desligar tudo numa noite é migração que não
// acontece. Quando ele for recadastrado pela tela de Canais, a queda para de
// ser usada sozinha, e aí as colunas velhas podem morrer.
export async function carregarTenantPorInstagram(igUserId) {
  const { data: canal } = await db()
    .from("canais")
    .select("*")
    .eq("ig_user_id", igUserId)
    .eq("ativo", true)
    .maybeSingle();

  if (!canal) return acharTenant("ig_user_id", igUserId);

  const tenant = await acharTenant("id", canal.cliente_id);
  if (!tenant) return null;

  return { ...tenant, cliente: comCredenciaisDoCanal(tenant.cliente, canal) };
}

// Pelo slug, para o teste no terminal. Existe porque o ajuste do contexto tem
// que acontecer ANTES de ligar qualquer canal: buscar pelo phone_number_id
// exigiria o WhatsApp já conectado, que é justamente o que ainda não existe
// quando se está escrevendo o contexto.
export async function carregarTenantPorSlug(slug) {
  return acharTenant("slug", slug);
}

async function acharTenant(coluna, valor) {
  const sb = db();
  if (!valor) return null;

  const { data: cli, error: erroCli } = await sb
    .from("clientes")
    .select("*")
    .eq(coluna, valor)
    .eq("ativo", true)
    .maybeSingle();

  if (erroCli) throw new Error(`Falha ao ler cliente: ${erroCli.message}`);
  if (!cli) return null;

  const [{ data: config }, { data: midias }, { data: profissionais }, { data: links }] =
    await Promise.all([
      sb.from("agente_config").select("*").eq("cliente_id", cli.id).maybeSingle(),
      sb.from("midias").select("chave, tipo, descricao, legenda, wa_media_id, url")
        .eq("cliente_id", cli.id).eq("ativo", true).order("chave"),
      sb.from("profissionais").select("id, nome, especialidade")
        .eq("cliente_id", cli.id).eq("ativo", true).order("nome"),
      sb.from("links").select("chave, url, descricao")
        .eq("cliente_id", cli.id).eq("ativo", true).order("chave"),
    ]);

  return {
    cliente: cli,
    config: config || {},
    midias: midias || [],
    profissionais: profissionais || [],
    links: links || [],
  };
}

// Busca ou cria a conversa daquela pessoa naquele canal. `origem` só é gravada
// na criação, para não sobrescrever a atribuição original do lead num contato
// posterior.
//
// A mesma pessoa no WhatsApp e no Instagram são duas conversas, de propósito:
// são dois históricos, dois ids e nenhuma forma confiável de saber que é a
// mesma pessoa. Juntar por palpite misturaria conversa de gente diferente.
export async function abrirConversa({
  clienteId, canal = "whatsapp", contato, telefone, nomeContato, origem,
}) {
  const sb = db();
  if (!contato) throw new Error("abrirConversa: contato é obrigatório.");

  const { data: existente } = await sb
    .from("conversas")
    .select("*")
    .eq("cliente_id", clienteId)
    .eq("canal", canal)
    .eq("contato", contato)
    .maybeSingle();

  if (existente) {
    await sb.from("conversas")
      .update({ ultima_em: new Date().toISOString() })
      .eq("id", existente.id);
    return existente;
  }

  const { data, error } = await sb.from("conversas").insert({
    cliente_id: clienteId,
    canal,
    contato,
    // No WhatsApp o contato É o telefone. No Instagram não existe telefone, e a
    // coluna fica nula: é a agenda que usa esse campo, não o atendimento.
    telefone: telefone ?? (canal === "whatsapp" ? contato : null),
    nome_contato: nomeContato || null,
    origem: origem || null,
  }).select().single();

  if (error) throw new Error(`Falha ao abrir conversa: ${error.message}`);
  return data;
}

// Histórico no formato de mensagens da Anthropic, mais antigo primeiro.
export async function lerHistorico(conversaId, limite = 30) {
  const sb = db();
  const { data, error } = await sb
    .from("mensagens")
    .select("papel, conteudo")
    .eq("conversa_id", conversaId)
    .order("criado_em", { ascending: false })
    .limit(limite);

  if (error) throw new Error(`Falha ao ler histórico: ${error.message}`);
  return (data || []).reverse().map((m) => ({ role: m.papel, content: m.conteudo }));
}

// Os três primeiros argumentos são o que sempre foram. O quarto é o id da Meta,
// e o quinto, opcional, é o que a etapa 2 trouxe: direção, tipo, mídia e status.
//
// Ficou opcional de propósito. O teste pelo terminal e o histórico da IA não
// têm direção nem entrega, e obrigá-los a inventar um valor só para satisfazer
// a assinatura é como se perde a capacidade de rodar o agente sem canal.
export async function gravarMensagem(conversaId, papel, conteudo, waMessageId, extras = {}) {
  const sb = db();
  const { data, error } = await sb.from("mensagens").insert({
    conversa_id: conversaId,
    papel,
    conteudo,
    wa_message_id: waMessageId || null,
    // 'user' entra, 'assistant' sai. Quem souber melhor que isso passa explícito:
    // um turno de ferramenta também é 'assistant' e nunca chega em ninguém.
    direcao: extras.direcao ?? (papel === "user" ? "entrada" : "saida"),
    tipo: extras.tipo ?? "texto",
    midia_id: extras.midiaId ?? null,
    midia_url: extras.midiaUrl ?? null,
    status: extras.status ?? null,
    interna: extras.interna ?? false,
    autor_atendente_id: extras.atendenteId ?? null,
  }).select("id").single();

  if (error) throw new Error(`Falha ao gravar mensagem: ${error.message}`);
  return data.id;
}

// Como a Meta nomeia os estados, e como a gente nomeia.
//
// 'accepted' e 'deleted' existem na API e não dizem nada sobre a entrega, então
// caem fora: carimbar 'accepted' por cima de 'entregue' seria perder informação.
const STATUS_META = {
  sent: "enviada",
  delivered: "entregue",
  read: "lida",
  failed: "falhou",
};

/**
 * Carimba o status de entrega de uma mensagem já gravada.
 *
 * A Meta manda esses eventos fora de ordem e repetidos: 'read' chega antes de
 * 'delivered' com frequência. Quem decide se o carimbo vale é o banco, dentro
 * do próprio update, porque duas chamadas simultâneas comparando em JavaScript
 * perderiam uma das duas.
 *
 * Devolve false quando não havia o que carimbar, o que é normal: status de
 * mensagem enviada por fora do CRM, pelo aplicativo do celular em número
 * com coexistência, não tem linha nossa para atualizar.
 */
export async function registrarStatus({ waMessageId, status, em, erro }) {
  const nosso = STATUS_META[status];
  if (!waMessageId || !nosso) return false;

  const { data, error } = await db().rpc("carimbar_status", {
    p_wa_message_id: waMessageId,
    p_status: nosso,
    p_em: em || new Date().toISOString(),
    p_erro: erro || null,
  });

  // O mesmo evento também resolve disparo, que não cria linha em `mensagens` e
  // por isso nunca era carimbado por aqui. É daqui que sai a entrega
  // confirmada de uma campanha, o número que não tem WhatsApp, e a única
  // reconciliação possível de um envio que ficou `desconhecido`: se a Meta
  // manda status com o id dele, a mensagem saiu.
  //
  // Vem ANTES do `return` de erro acima de propósito: os dois carimbos são
  // independentes, e um evento de disparo não pode ser perdido porque o
  // carimbo em `mensagens` falhou.
  //
  // Dentro de try/catch e com o erro só no log: status de mensagem normal não
  // pode falhar porque disparo falhou. É também o que faz este código conviver
  // com o banco antes da migração 032: a função ainda não existe, o PostgREST
  // devolve erro, e fica uma linha de aviso no log.
  try {
    const { error: erroEnvio } = await db().rpc("carimbar_envio_status", {
      p_wa_message_id: waMessageId,
      p_status: status,
      p_em: em || new Date().toISOString(),
      p_erro: erro || null,
      p_erro_codigo: null,
    });
    if (erroEnvio) {
      console.warn(`[status] disparo não carimbado ${waMessageId}: ${erroEnvio.message}`);
    }
  } catch (e) {
    console.warn(`[status] disparo não carimbado ${waMessageId}: ${e.message}`);
  }

  if (error) {
    console.warn(`[status] não deu para carimbar ${waMessageId}: ${error.message}`);
    return false;
  }
  return (data || 0) > 0;
}

/**
 * Renova a janela de 24h da conversa.
 *
 * Fora dessa janela a Cloud API recusa texto livre e só aceita template
 * aprovado. A Meta diz quando a janela fecha no evento de status, no campo
 * `conversation.expiration_timestamp`; quando ela não diz, a conta é 24h a
 * partir da última mensagem da pessoa, que é a regra escrita.
 *
 * Preferimos sempre o que a Meta informa: a conta de 24h é a regra no papel,
 * mas quem recusa o envio é o servidor dela, com o relógio dela.
 */
export async function renovarJanela(conversaId, expiraEm) {
  const quando = expiraEm || new Date(Date.now() + 24 * 3600 * 1000).toISOString();
  const { error } = await db().from("conversas")
    .update({ janela_expira_em: quando })
    .eq("id", conversaId);
  if (error) console.warn(`[janela] não deu para renovar: ${error.message}`);
  return quando;
}

// A janela está aberta? Conversa sem carimbo é tratada como ABERTA de propósito:
// toda conversa que já existia antes desta etapa está sem o campo, e assumir
// fechada faria o CRM parar de responder todo mundo de uma vez.
export function janelaAberta(conversa) {
  if (!conversa?.janela_expira_em) return true;
  return new Date(conversa.janela_expira_em).getTime() > Date.now();
}

export async function registrarUso(clienteId, conversaId, modelo, usage, custoUsd) {
  const sb = db();
  await sb.from("uso").insert({
    cliente_id: clienteId,
    conversa_id: conversaId,
    modelo,
    tokens_entrada: usage.input_tokens ?? 0,
    tokens_cache_leitura: usage.cache_read_input_tokens ?? 0,
    tokens_cache_escrita: usage.cache_creation_input_tokens ?? 0,
    tokens_saida: usage.output_tokens ?? 0,
    custo_usd: custoUsd,
  });
}

/**
 * As credenciais de um canal do cliente, pelo id do cliente.
 *
 * `carregarTenant` entra pelo id que a Meta manda no webhook, que é o caminho
 * de quem recebe mensagem. O painel precisa do contrário: tem o cliente na mão
 * e quer saber por onde falar com ele. Sem isto, quem lê as credenciais no
 * painel acaba lendo as colunas velhas de `clientes`, que para quem já foi
 * cadastrado na tela de Canais estão vazias. O sintoma é cruel porque mente:
 * "o WhatsApp deste cliente ainda não está conectado", com o número no ar e a
 * IA respondendo normalmente ao lado.
 *
 * A queda para as colunas de `clientes` continua, para quem ainda não migrou.
 */
export async function credenciaisDoCanal(clienteId, tipo = "whatsapp") {
  const sb = db();

  const { data: cli } = await sb.from("clientes").select("*").eq("id", clienteId).maybeSingle();
  if (!cli) return null;

  const { data: canal } = await sb.from("canais").select("*")
    .eq("cliente_id", clienteId).eq("tipo", tipo).eq("ativo", true)
    .order("criado_em", { ascending: true }).limit(1).maybeSingle();

  return canal ? comCredenciaisDoCanal(cli, canal) : cli;
}
