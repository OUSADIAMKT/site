// Ponto de entrada da WhatsApp Cloud API.
// GET  → verificação do webhook na configuração do app na Meta.
// POST → mensagem recebida. Responde 200 na hora e processa em segundo plano:
//        a Meta reenvia o evento se demorarmos, e um turno do agente leva segundos.

import { waitUntil } from "./_segundoPlano.js";
import {
  db, carregarTenant, carregarTenantPorInstagram,
  abrirConversa, lerHistorico, gravarMensagem,
  registrarStatus, renovarJanela,
} from "./_db.js";
import { responder, responderComentario } from "./_agente.js";
import { abrirCanal } from "./_canal.js";
import { responderComentarioIG, responderPrivadoIG, usuarioDaConversaIG } from "./_ig.js";
import { combina } from "./_gatilho.js";
import { soltarSeInativa, enfileirar } from "./_fila.js";
import { marcarAssunto } from "./_assunto.js";
import { marcarOrigemDisparo } from "./_crm.js";
import { aplicarRegrasPalavras, garantirNegocioDaConversa } from "./_negocios.js";
import { transcricaoLigada, transcreverAudioWA } from "./_transcricao.js";
import { arquivarDaMeta } from "./_arquivo.js";
import { conferirAssinatura } from "./_assinatura.js";

// Precisamos do corpo cru para conferir a assinatura da Meta.
export const config = { api: { bodyParser: false } };

function lerCorpoCru(req) {
  return new Promise((resolve, reject) => {
    const pedacos = [];
    req.on("data", (p) => pedacos.push(p));
    req.on("end", () => resolve(Buffer.concat(pedacos)));
    req.on("error", reject);
  });
}

// A regra da assinatura mora em `_assinatura.js`, que não escreve log nem lê o
// ambiente. Aqui fica o único lugar que registra o veredito: uma linha por
// evento recusado, com o canal e o motivo, sem segredo, sem assinatura, sem
// corpo, sem telefone. Evento aceito não gera linha nenhuma.
function registrarVeredito(veredito, rotulo) {
  if (veredito.ok) return true;
  console.warn(`[${rotulo}] evento recusado: ${veredito.motivo}`);
  return false;
}

export default async function handler(req, res) {
  if (req.method === "GET") return verificar(req, res);
  if (req.method !== "POST") return res.status(405).json({ error: "Método não permitido" });

  const corpoCru = await lerCorpoCru(req);

  let evento;
  try {
    evento = JSON.parse(corpoCru.toString("utf8"));
  } catch {
    return res.status(400).json({ error: "Corpo inválido." });
  }

  // A Meta considera qualquer resposta diferente de 200 como falha e reenvia.
  // Confirmamos primeiro; o trabalho continua depois.
  res.status(200).json({ ok: true });
  waitUntil(processar(evento, corpoCru, req.headers["x-hub-signature-256"]));
}

async function verificar(req, res) {
  const modo = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const desafio = req.query["hub.challenge"];

  if (modo !== "subscribe" || !token) return res.status(400).send("Requisição inválida.");

  if (token === process.env.WA_VERIFY_TOKEN) return res.status(200).send(desafio);

  // Procura nos dois lugares. O token nasceu em `clientes.wa_verify_token`,
  // uma coluna por cliente, e se mudou para `canais_wa`, uma linha por número.
  // Canal cadastrado pela tela de Canais só existe no segundo: sem procurar
  // ali, a Meta não consegue verificar a URL e o número nunca entra no ar.
  const { data: porCliente } = await db()
    .from("clientes").select("id").eq("wa_verify_token", token).maybeSingle();
  if (porCliente) return res.status(200).send(desafio);

  const { data: porCanal } = await db()
    .from("canais").select("id").eq("verify_token", token).maybeSingle();
  if (porCanal) return res.status(200).send(desafio);

  return res.status(403).send("Token de verificação inválido.");
}

// A Meta manda WhatsApp e Instagram para a MESMA URL do app. O que diferencia
// é o `object` do evento, e é por isso que o Instagram não precisou de uma
// função nova no Vercel.
async function processar(evento, corpoCru, assinatura) {
  try {
    if (evento.object === "instagram") {
      return await processarInstagram(evento, corpoCru, assinatura);
    }
    for (const entrada of evento.entry || []) {
      for (const mudanca of entrada.changes || []) {
        if (mudanca.field !== "messages") continue;
        await tratarMudanca(mudanca.value, corpoCru, assinatura);
      }
    }
  } catch (e) {
    console.error("[webhook] falha no processamento:", e.message);
  }
}

async function processarInstagram(evento, corpoCru, assinatura) {
  for (const entrada of evento.entry || []) {
    const tenant = await carregarTenantPorInstagram(entrada.id);
    if (!tenant) {
      console.warn(`[instagram] ig_user_id sem cliente ativo: ${entrada.id}`);
      continue;
    }

    const segredo = tenant.cliente.wa_app_secret || process.env.META_APP_SECRET;
    const veredito = conferirAssinatura({ corpoCru, cabecalho: assinatura, segredo });
    if (!registrarVeredito(veredito, `instagram ${tenant.cliente.slug}`)) continue;

    for (const m of entrada.messaging || []) {
      await tratarMensagemIG(tenant, m).catch((e) =>
        console.error(`[instagram] falha na mensagem: ${e.message}`));
    }
    for (const mudanca of entrada.changes || []) {
      if (mudanca.field !== "comments") continue;
      await tratarComentarioIG(tenant, mudanca.value).catch((e) =>
        console.error(`[instagram] falha no comentário: ${e.message}`));
    }
  }
}

async function tratarMensagemIG(tenant, evento) {
  // `is_echo` é a nossa própria mensagem voltando pelo webhook. Responder a ela
  // é conversar com o próprio bot, para sempre, pagando por isso.
  if (evento.message?.is_echo) return;
  // Leitura, reação e entrega não são mensagem.
  if (!evento.message || evento.read || evento.reaction || evento.delivery) return;
  if (evento.message.is_deleted) return;

  const igsid = evento.sender?.id;
  if (!igsid || igsid === tenant.cliente.ig_user_id) return;

  const conversa = await abrirConversa({
    clienteId: tenant.cliente.id,
    canal: "instagram",
    contato: igsid,
  });

  // Descobre o @ uma vez por pessoa. Vem ANTES da checagem de modo humano de
  // propósito: é justamente quem está atendendo à mão que precisa do nome para
  // achar a pessoa no Instagram. Falhou, segue sem: nome é conforto.
  if (!conversa.nome_contato) {
    const usuario = await usuarioDaConversaIG(tenant.cliente, igsid)
      .catch((e) => { console.warn("[ig] usuário não resolvido:", e.message); return null; });
    if (usuario) {
      conversa.nome_contato = usuario;
      await db().from("conversas").update({ nome_contato: usuario }).eq("id", conversa.id);
    }
  }

  // Toda pessoa que fala vira negócio no funil de entrada do CRM, como no
  // CRMs de mercado. Cliente sem funil marcado sai na primeira consulta; falha
  // aqui vira só um registro de erro, e a resposta segue.
  await garantirNegocioDaConversa(db(), tenant.cliente.id, conversa)
    .catch((e) => console.error("[crm] entrada automática:", e?.message || e));

  // Uma hora parada e a conversa volta para a IA sozinha. `abrirConversa`
  // devolve a linha como ela estava ANTES de carimbar `ultima_em`, então a
  // conta aqui é sobre a última mensagem de verdade, não sobre esta.
  if (await soltarSeInativa(conversa)) conversa.modo = "ia";
  if (conversa.modo === "humano") return;

  const sb = db();
  const { data: jaVisto } = await sb.from("mensagens")
    .select("id").eq("wa_message_id", evento.message.mid).maybeSingle();
  if (jaVisto) return;

  // Vem antes de abrir o canal: pausado, nada sai daqui, nem o aviso de anexo.
  if (tenant.cliente.ia_pausada) {
    return pausarNaFila(conversa, evento.message.text, evento.message.mid);
  }

  const canal = abrirCanal({ canal: "instagram", cliente: tenant.cliente, contato: igsid });

  // Figurinha, áudio, imagem e resposta a story chegam sem texto.
  const texto = evento.message.text;
  if (!texto) {
    // Áudio, foto, vídeo, figurinha: pede por escrito em vez de largar a
    // conversa com uma pessoa. Antes qualquer anexo jogava a conversa para o
    // modo humano, e quem mandava áudio, que é como muita gente fala no
    // Instagram, ficava sem atendimento automático para sempre.
    await canal.texto("Opa, não consigo abrir arquivo por aqui. Me escreve por mensagem o que você precisa que eu te respondo.");
    return;
  }

  await canal.digitando().catch(() => {});

  const ctx = {
    cliente: tenant.cliente,
    config: tenant.config,
    midias: tenant.midias,
    profissionais: tenant.profissionais,
    links: tenant.links,
    conversa,
    canal,
    telefone: null, // no Instagram não existe telefone
    enviouAlgo: false,
    transferiu: false,
  };

  const historico = await lerHistorico(conversa.id);
  const resultado = await responder(ctx, historico, texto);

  let linhaResposta = null;
  for (const [i, m] of resultado.historicoNovo.entries()) {
    const id = await gravarMensagem(
      conversa.id, m.role, m.content, i === 0 ? evento.message.mid : null,
      { direcao: m.role === "user" ? "entrada" : "saida" },
    );
    if (m.role === "assistant") linhaResposta = id;
  }

  await entregar(canal, resultado, conversa, linhaResposta);
}

/**
 * A IA está pausada: grava o que a pessoa escreveu e manda a conversa para a
 * fila humana, sem responder nada.
 *
 * Não confundir com `clientes.ativo = false`, que faz o webhook ignorar o
 * evento: ali a mensagem não existe em lugar nenhum, nem no CRM. Pausar é
 * calar o robô, não perder a pessoa que escreveu.
 */
async function pausarNaFila(conversa, texto, messageId, extras = {}) {
  await gravarMensagem(
    conversa.id,
    "user",
    [{ type: "text", text: texto || "(mensagem sem texto: áudio, foto ou figurinha)" }],
    messageId,
    extras,
  );

  // Uma passagem por conversa, não uma por mensagem. `enfileirar` fecha a
  // passagem aberta como abandonada antes de abrir outra, então chamar a cada
  // "oi" que chega zeraria o tempo de espera e enchia o relatório de lixo.
  if (conversa.modo === "ia") {
    await enfileirar(
      conversa.id,
      "IA pausada pela equipe. Esta conversa precisa de resposta à mão.",
    ).catch((e) => console.error("[pausa] não deu para enfileirar:", e.message));
  }
}

/**
 * Entrega a resposta. Se o canal recusar, põe a conversa na fila humana em vez
 * de deixar a pessoa falando sozinha.
 *
 * Neste ponto a resposta JÁ está gravada no banco, porque o histórico tem que
 * existir antes de qualquer coisa dar errado. O efeito colateral é que uma
 * falha de envio fazia o painel dizer "a IA respondeu" sobre uma mensagem que
 * nunca saiu. Aconteceu de verdade: no meio de uma conversa o Instagram parou
 * de aceitar os envios, a pessoa fez três perguntas seguidas sem receber nada,
 * e o histórico mostrava quatro respostas bonitas que ninguém leu.
 *
 * Mensagem que não chega não é erro de log: é uma pessoa sem resposta. Então
 * vira fila, com o motivo escrito, para alguém responder à mão.
 */
async function entregar(canal, resultado, conversa, linhaResposta) {
  try {
    let ids = [];
    if (resultado.texto) {
      ids = await canal.emBaloes(resultado.texto);
    } else if (!resultado.enviouAlgo) {
      const id = await canal.texto("Deixa eu confirmar isso certinho com a equipe e já te retorno.");
      if (id) ids = [id];
    }

    // Os ids chegam DEPOIS da linha estar gravada, porque a resposta tem que
    // existir no histórico mesmo que o envio falhe. Então o carimbo é um
    // update, não um insert.
    if (linhaResposta && ids?.length) {
      await db().from("mensagens")
        .update({ wa_message_ids: ids, status: "pendente" })
        .eq("id", linhaResposta);
    }
  } catch (e) {
    console.error(`[entrega] ${canal.nome} recusou a resposta: ${e.message}`);
    await enfileirar(
      conversa.id,
      `A resposta da IA NÃO chegou nesta pessoa. O ${canal.nome} recusou o envio: ${e.message}. Responda à mão.`,
    ).catch((err) => console.error("[entrega] e nem deu para enfileirar:", err.message));
  }
}

async function tratarComentarioIG(tenant, valor) {
  const commentId = valor?.id;
  const autor = valor?.from?.id;
  if (!commentId || !autor) return;

  // A nossa própria resposta pública volta como comentário novo. Sem esta
  // linha o bot responde a si mesmo em laço, em público.
  if (autor === tenant.cliente.ig_user_id) return;

  // Só a chamada para ação do vídeo merece resposta. Elogio, emoji e pergunta
  // solta ficam sem resposta de propósito: responder tudo, sempre, em segundos,
  // é o padrão que faz o Instagram tratar a conta como automação.
  //
  // A checagem vem ANTES de qualquer coisa: comentário que não casa não grava
  // linha, não chama a IA e não custa nada.
  if (!combina(valor.text, tenant.config.gatilho_comentario)) return;

  // Pausado, o comentário fica para depois, e de propósito NÃO gravamos em
  // `ig_comentarios`: essa tabela é a trava de "uma DM por comentário", então
  // gravar agora queimaria a única chance de responder essa pessoa quando a IA
  // voltar.
  if (tenant.cliente.ia_pausada) return;

  const sb = db();

  // A trava de "uma DM por comentário" é o `unique` da tabela, não um if.
  // Se a Meta reenviar o evento, o insert falha e nada é enviado de novo.
  const { error: erroInsert } = await sb.from("ig_comentarios").insert({
    cliente_id: tenant.cliente.id,
    comment_id: commentId,
    ig_user_id: autor,
    texto: valor.text || null,
  });
  if (erroInsert) return; // já tratado antes, ou corrida perdida: não repete

  const conversa = await abrirConversa({
    clienteId: tenant.cliente.id,
    canal: "instagram",
    // O evento de comentário já traz o @ de quem escreveu, de graça. É a única
    // chance de saber quem é: quem só comentou não tem conversa na DM, e a
    // busca por lista de conversas nunca vai achar essa pessoa.
    nomeContato: valor.from?.username || null,
    contato: autor,
    origem: { tipo: "comentario", comment_id: commentId, media_id: valor.media?.id || null },
  });

  const ctx = {
    cliente: tenant.cliente,
    config: tenant.config,
    midias: tenant.midias,
    profissionais: tenant.profissionais,
    links: tenant.links,
    conversa,
  };

  // As últimas respostas públicas desta conta, para o modelo não repetir
  // nenhuma. Doze é o suficiente para forçar variedade sem inchar o prompt.
  const { data: anteriores } = await sb.from("ig_comentarios")
    .select("resposta_publica")
    .eq("cliente_id", tenant.cliente.id)
    .not("resposta_publica", "is", null)
    .order("criado_em", { ascending: false })
    .limit(12);

  const jaDitas = (anteriores || []).map((r) => r.resposta_publica);

  const { publico, privado } = await responderComentario(ctx, valor.text || "", jaDitas);
  if (!publico && !privado) return; // ofensa, spam ou fora de assunto

  if (publico) {
    await responderComentarioIG(tenant.cliente, commentId, publico);
    await sb.from("ig_comentarios")
      .update({ respondeu_publico: true, resposta_publica: publico })
      .eq("comment_id", commentId);
  }

  // Quem responde à nossa resposta pública gera um comentário NOVO, com id novo,
  // então a trava por comment_id não pega. Sem isto, uma conversa de três
  // comentários vira três DMs. Uma por pessoa a cada 7 dias basta: o convite já
  // foi feito, e insistir na DM é o que faz a conta ser denunciada.
  const desde = new Date(Date.now() - 7 * 86400000).toISOString();
  const { count: dmRecente } = await sb.from("ig_comentarios")
    .select("id", { count: "exact", head: true })
    .eq("cliente_id", tenant.cliente.id)
    .eq("ig_user_id", autor)
    .eq("respondeu_dm", true)
    .gte("criado_em", desde);

  if (privado && dmRecente > 0) {
    console.log(`[instagram] DM pulada: ${autor} já recebeu uma nos últimos 7 dias`);
  } else if (privado && conversa.modo !== "humano") {
    // Vai para `recipient: { comment_id }`, que é o que abre a DM a partir do
    // comentário. Só funciona uma vez, e só dentro de 7 dias.
    await responderPrivadoIG(tenant.cliente, commentId, privado);
    await sb.from("ig_comentarios")
      .update({ respondeu_dm: true, conversa_id: conversa.id })
      .eq("comment_id", commentId);

    // Guarda os dois lados no histórico: se a pessoa responder a DM, o agente
    // precisa saber o que ela comentou e o que ele já respondeu.
    await gravarMensagem(conversa.id, "user",
      [{ type: "text", text: `(comentou no Instagram) ${valor.text || ""}` }], null);
    await gravarMensagem(conversa.id, "assistant", [{ type: "text", text: privado }], null);
  }
}

async function tratarMudanca(valor, corpoCru, assinatura) {
  // Carregar o cliente e conferir a assinatura vem ANTES de olhar o conteúdo.
  // Era ao contrário, e o efeito era que evento de status saía sem passar pela
  // conferência de assinatura nenhuma, porque a função já tinha retornado.
  const phoneNumberId = valor?.metadata?.phone_number_id;
  const tenant = await carregarTenant(phoneNumberId);
  if (!tenant) {
    console.warn(`[webhook] phone_number_id sem cliente ativo: ${phoneNumberId}`);
    return;
  }

  const segredo = tenant.cliente.wa_app_secret || process.env.META_APP_SECRET;
  const veredito = conferirAssinatura({ corpoCru, cabecalho: assinatura, segredo });
  if (!registrarVeredito(veredito, `webhook ${tenant.cliente.slug}`)) return;

  // Entrega, leitura e falha chegam em evento próprio, sem `messages`.
  if (valor?.statuses?.length) return tratarStatus(tenant, valor.statuses);

  let mensagem = valor?.messages?.[0];
  if (!mensagem) return; // reação, "played" e outros que ainda não tratamos

  // Áudio vira texto antes de tudo, e daí segue o caminho de qualquer
  // mensagem escrita: a IA lê, responde, a regra do CRM vê as palavras. O
  // texto vai marcado como áudio para a IA e a equipe saberem que foi falado.
  // Sem chave de transcrição, ou se a transcrição falhar, o áudio cai no
  // caminho antigo logo abaixo e vai para a fila humana.
  if (mensagem.type === "audio" && mensagem.audio?.id && transcricaoLigada()) {
    const texto = await transcreverAudioWA(tenant.cliente, mensagem.audio.id)
      .catch((e) => { console.error("[áudio] transcrição falhou:", e?.message || e); return ""; });
    if (texto) {
      mensagem = {
        ...mensagem, type: "text", text: { body: `(áudio transcrito) ${texto}` },
        // Guarda a referência do áudio: a equipe ouve o original no painel.
        audioId: mensagem.audio.id,
      };

      // E guarda o arquivo no cofre, para a equipe ainda poder ouvir o
      // original depois dos 30 dias em que a Meta apaga a cópia dela. Vai
      // solto: quem está falando não espera pelo arquivamento. A anotação é
      // pelo id da Meta, porque a linha da mensagem só nasce mais abaixo.
      waitUntil(arquivarDaMeta({
        cliente: tenant.cliente,
        waMessageId: mensagem.id,
        clienteId: tenant.cliente.id,
        mediaId: mensagem.audioId,
        direcao: "entrada",
      }));
    }
  }

  // Imagem, vídeo, documento e áudio sem transcrição ainda não são
  // interpretados: avisamos e passamos para um humano em vez de fingir.
  if (mensagem.type !== "text") {
    await responderNaoSuportado(tenant, valor, mensagem);
    return;
  }

  const telefone = mensagem.from;
  const perfil = valor?.contacts?.[0]?.profile?.name;
  const origem = mensagem.referral || null; // CTWA: ctwa_clid, source_id, headline

  const conversa = await abrirConversa({
    clienteId: tenant.cliente.id,
    canal: "whatsapp",
    contato: telefone,
    nomeContato: perfil,
    origem,
  });

  // Quem responde a um disparo chega aqui igual a quem escreveu sozinho. A
  // etiqueta e a unica coisa que separa os dois no quadro, e e ela que mede a
  // campanha. Vem antes de qualquer return: conversa que ja esta com um
  // atendente e justamente a que mais precisa da etiqueta na tela. Nao segura
  // a resposta: se falhar, a conversa segue sem etiqueta.
  marcarOrigemDisparo(db(), tenant.cliente.id, conversa)
    .catch((e) => console.error("[etiqueta] disparo:", e?.message || e));

  // De que a conversa trata: matrícula (Lia), suporte ou agência (Rita). Etiqueta aqui, ainda
  // antes de qualquer resposta, porque e a etiqueta que decide para quem a
  // fila entrega depois. Nao segura a resposta.
  const assunto = await marcarAssunto(db(), conversa, mensagem.text?.body)
    .catch((e) => { console.error("[assunto]", e?.message || e); return null; });

  // Automação por palavras do CRM. Cliente sem regra nenhuma sai na primeira
  // consulta; com regra, o negócio da conversa muda de etapa. Igual à
  // etiqueta: nunca segura a resposta.
  // Primeiro garante o negócio, depois a regra move: na ordem inversa a
  // regra criaria um negócio e a entrada automática não teria o que fazer.
  await garantirNegocioDaConversa(db(), tenant.cliente.id, conversa)
    .catch((e) => console.error("[crm] entrada automática:", e?.message || e))
    .then(() => aplicarRegrasPalavras(db(), tenant.cliente.id, conversa, mensagem.text?.body))
    .catch((e) => console.error("[crm] automação por palavras:", e?.message || e));
  // Espera as duas: com o `waitUntil` da Vercel, promessa solta depois que o
  // processamento termina pode ser cortada no meio.

  // Mensagem da pessoa reabre a janela de 24h. É o único evento que reabre:
  // responder não estende nada, por mais que a conversa pareça viva.
  await renovarJanela(conversa.id);
  // Uma hora parada e a conversa volta para a IA sozinha. `abrirConversa`
  // devolve a linha como ela estava ANTES de carimbar `ultima_em`, então a
  // conta aqui é sobre a última mensagem de verdade, não sobre esta.
  if (await soltarSeInativa(conversa)) conversa.modo = "ia";

  const sb = db();

  // A Meta reenvia o mesmo evento quando não confirmamos a tempo.
  const { data: jaVisto } = await sb.from("mensagens")
    .select("id").eq("wa_message_id", mensagem.id).maybeSingle();
  if (jaVisto) return;

  // Como a mensagem da pessoa fica gravada: texto, ou áudio transcrito com a
  // referência do áudio original para tocar no painel.
  const extrasEntrada = mensagem.audioId
    ? { direcao: "entrada", tipo: "audio", midiaId: mensagem.audioId }
    : { direcao: "entrada" };

  // Atendimento com a equipe: a IA fica calada, mas a mensagem TEM que ser
  // gravada. Antes saía daqui sem gravar, e quem atendia pelo painel não via
  // nada do que a pessoa escrevia depois de assumir a conversa.
  if (conversa.modo === "humano") {
    await gravarMensagem(conversa.id, "user", [{ type: "text", text: mensagem.text.body }], mensagem.id, extrasEntrada);
    return;
  }

  // Vem antes de abrir o canal: pausado, nada sai daqui.
  if (tenant.cliente.ia_pausada) {
    return pausarNaFila(conversa, mensagem.text?.body, mensagem.id, extrasEntrada);
  }

  const canal = abrirCanal({
    canal: "whatsapp",
    cliente: tenant.cliente,
    contato: telefone,
    referencia: mensagem.id,
  });

  await canal.digitando();

  const ctx = {
    cliente: tenant.cliente,
    config: tenant.config,
    midias: tenant.midias,
    profissionais: tenant.profissionais,
    links: tenant.links,
    conversa,
    canal,
    telefone,
    // O assunto que o codigo leu da mensagem. A transferencia usa isso para
    // escolher o atendente certo em vez de cair em quem estiver mais livre.
    assunto,
    enviouAlgo: false,
    transferiu: false,
  };

  const historico = await lerHistorico(conversa.id);
  const texto = mensagem.text.body;

  const resultado = await responder(ctx, historico, texto);

  // Grava o turno inteiro, incluindo chamadas de ferramenta, para o próximo
  // turno reconstruir o contexto exatamente como o modelo o viu.
  //
  // `linhaResposta` é a última linha gravada: a fala final do assistente, a que
  // de fato sai para a pessoa. É nela que os ids da Meta vão ser carimbados,
  // não nas chamadas de ferramenta do meio do caminho, que nunca saem daqui.
  let linhaResposta = null;
  for (const [i, m] of resultado.historicoNovo.entries()) {
    const id = await gravarMensagem(
      conversa.id, m.role, m.content, i === 0 ? mensagem.id : null,
      i === 0 ? extrasEntrada : { direcao: m.role === "user" ? "entrada" : "saida" },
    );
    if (m.role === "assistant") linhaResposta = id;
  }

  await entregar(canal, resultado, conversa, linhaResposta);

  if (resultado.transferiu) {
    console.log(`[transferência] ${tenant.cliente.slug} / ${telefone}: ${ctx.motivoTransferencia || "sem motivo"}`);
  }
}

// Como descrever, por escrito, o que não é texto. O histórico da IA é texto, e
// a equipe lendo a conversa no painel precisa saber o que a pessoa mandou.
const NOME_DO_TIPO = {
  audio: "um áudio", image: "uma foto", video: "um vídeo",
  document: "um documento", sticker: "uma figurinha",
  location: "a localização", contacts: "um contato",
};

async function responderNaoSuportado(tenant, valor, mensagem) {
  const telefone = mensagem.from;
  const conversa = await abrirConversa({
    clienteId: tenant.cliente.id,
    canal: "whatsapp",
    contato: telefone,
    nomeContato: valor?.contacts?.[0]?.profile?.name,
    origem: mensagem.referral || null,
  });

  // Anexo também reabre a janela de 24h: para a Meta é mensagem da pessoa como
  // qualquer outra.
  await renovarJanela(conversa.id);

  // Toda pessoa que fala vira negócio no funil de entrada do CRM, como no
  // CRMs de mercado. Cliente sem funil marcado sai na primeira consulta; falha
  // aqui vira só um registro de erro, e a resposta segue.
  await garantirNegocioDaConversa(db(), tenant.cliente.id, conversa)
    .catch((e) => console.error("[crm] entrada automática:", e?.message || e));

  // Gravar vem ANTES de qualquer desvio, e é o que mudou aqui.
  //
  // Antes a função saía sem gravar nada em três caminhos diferentes, e o áudio
  // que a pessoa mandou simplesmente não existia em lugar nenhum: a conversa
  // pulava para o modo humano e quem abria o painel via um silêncio sem causa.
  // A legenda da foto, quando tinha, também se perdia.
  const anexo = mensagem[mensagem.type] || {};
  // O nome do arquivo entra no documento e só nele. Sem ele a equipe vê
  // "documento" e tem que baixar para descobrir se é a nota fiscal ou a foto
  // da etiqueta, e quem está atendendo uma troca abre os dois.
  const descricao = mensagem.type === "document" && anexo.filename
    ? `o documento ${anexo.filename}`
    : NOME_DO_TIPO[mensagem.type] || `um anexo do tipo ${mensagem.type}`;
  const legenda = anexo.caption ? ` com a legenda: "${anexo.caption}"` : "";

  const { data: jaVisto } = await db().from("mensagens")
    .select("id").eq("wa_message_id", mensagem.id).maybeSingle();

  if (!jaVisto) {
    const gravada = await gravarMensagem(
      conversa.id, "user",
      [{ type: "text", text: `(enviou ${descricao}${legenda})` }],
      mensagem.id,
      {
        direcao: "entrada",
        tipo: mensagem.type,
        // O id da Meta vale guardar de todo jeito: é por ele que o painel pede
        // a mídia enquanto ela existir lá, e é por ele que o arquivamento
        // busca o arquivo. A URL que a Meta dá expira em 5 minutos, então
        // guardar o link seria guardar lixo.
        midiaId: anexo.id || null,
      },
    ).catch((e) => {
      console.error("[anexo] não deu para gravar:", e.message);
      return null;
    });

    // A cópia no cofre, para o histórico não depender dos 30 dias da Meta.
    // Solta, porque a pessoa do outro lado está esperando resposta, e sem
    // derrubar nada se falhar: perder a cópia de longo prazo é ruim, perder a
    // mensagem é pior.
    if (gravada && anexo.id) {
      waitUntil(arquivarDaMeta({
        cliente: tenant.cliente,
        mensagemId: gravada,
        clienteId: tenant.cliente.id,
        mediaId: anexo.id,
        direcao: "entrada",
      }));
    }
  }

  if (conversa.modo === "humano") return;

  // Pausado, nem o aviso de anexo sai: este aviso também é o robô falando, e
  // esta função roda antes da checagem lá em cima, por causa do tipo.
  if (tenant.cliente.ia_pausada) {
    if (conversa.modo === "ia") {
      await enfileirar(conversa.id, `A pessoa enviou ${descricao} e a IA está pausada.`)
        .catch((e) => console.error("[anexo] não deu para enfileirar:", e.message));
    }
    return;
  }

  await db().from("conversas").update({ modo: "humano" }).eq("id", conversa.id);
  await enfileirar(conversa.id, `A pessoa enviou ${descricao}. A IA não lê anexo: responda à mão.`)
    .catch((e) => console.error("[anexo] não deu para enfileirar:", e.message));

  const canal = abrirCanal({
    canal: "whatsapp", cliente: tenant.cliente, contato: telefone, referencia: mensagem.id,
  });
  await canal.texto(
    "Recebi seu arquivo! Vou pedir pra uma pessoa da equipe dar uma olhada e te responder por aqui.");
}

/**
 * Evento de entrega: enviada, entregue, lida ou falhou.
 *
 * Chega separado da mensagem, fora de ordem e repetido. Quem garante que um
 * 'entregue' atrasado não apague um 'lida' já carimbado é o banco, em
 * `carimbar_status`, não este laço.
 *
 * A falha é o que justifica a função existir. Sem ela, uma mensagem recusada
 * pela Meta ficava no painel igualzinha a uma entregue, e a equipe só descobria
 * pelo silêncio da pessoa do outro lado.
 */
async function tratarStatus(tenant, statuses) {
  for (const s of statuses) {
    const em = s.timestamp ? new Date(Number(s.timestamp) * 1000).toISOString() : null;

    // `errors` só vem quando status é 'failed'. O código importa mais que o
    // texto: 131047 é janela fechada, 131026 é número sem WhatsApp, e são
    // coisas que a equipe resolve de formas diferentes.
    const falha = s.errors?.[0];
    const erro = falha ? `${falha.code}: ${falha.title || falha.message || "sem detalhe"}` : null;

    await registrarStatus({ waMessageId: s.id, status: s.status, em, erro });

    // A Meta diz, de graça, quando a janela daquela conversa fecha. Vale mais
    // que a nossa conta de 24h: quem recusa o envio é o relógio dela.
    const expira = s.conversation?.expiration_timestamp;
    if (expira && s.recipient_id) {
      const { data: conversa } = await db().from("conversas")
        .select("id")
        .eq("cliente_id", tenant.cliente.id)
        .eq("canal", "whatsapp")
        .eq("contato", s.recipient_id)
        .maybeSingle();
      if (conversa) {
        await renovarJanela(conversa.id, new Date(Number(expira) * 1000).toISOString());
      }
    }

    if (s.status === "failed") {
      console.error(`[entrega] ${tenant.cliente.slug} / ${s.recipient_id}: ${erro}`);
    }
  }
}
