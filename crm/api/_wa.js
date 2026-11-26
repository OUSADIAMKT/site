// Camada fina sobre a WhatsApp Cloud API (API oficial da Meta).
// Nada aqui decide o que dizer, só entrega.

const VERSAO = process.env.WA_API_VERSION || "v23.0";

function endpoint(phoneNumberId) {
  return `https://graph.facebook.com/${VERSAO}/${phoneNumberId}/messages`;
}

async function postar(cliente, corpo) {
  let resposta;
  try {
    resposta = await fetch(endpoint(cliente.wa_phone_number_id), {
      method: "POST",
      headers: {
        Authorization: `Bearer ${cliente.wa_token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ messaging_product: "whatsapp", ...corpo }),
    });
  } catch (e) {
    // Sem resposta HTTP nenhuma: DNS, conexão cortada, prazo do runtime. Quem
    // chama precisa saber que isto é diferente de uma recusa, porque numa
    // recusa a mensagem não saiu e aqui não há como saber.
    const erro = new Error(`Cloud API sem resposta: ${e.message}`);
    erro.rede = true;
    throw erro;
  }

  const dados = await resposta.json().catch(() => ({}));
  if (!resposta.ok) {
    const detalhe = dados?.error?.message || resposta.statusText;
    // A mensagem do erro não muda: o painel e os logs dependem dela. O que
    // passa a viajar junto é o código, porque 4xx significa "recusado, não
    // saiu" e 5xx significa "pode ter saído", e os dois pedem tratamento
    // oposto no disparo.
    const erro = new Error(`Cloud API ${resposta.status}: ${detalhe}`);
    erro.status = resposta.status;
    erro.codigo = dados?.error?.code ?? null;
    throw erro;
  }
  return dados;
}

export function esperar(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Marca a mensagem como lida e mostra "digitando…".
// O indicador cai sozinho quando você responde, ou em 25s, o que vier primeiro.
// A Cloud API só tem o tipo "text": não existe "gravando áudio" na API oficial.
export async function marcarLidaEDigitando(cliente, messageId) {
  return postar(cliente, {
    status: "read",
    message_id: messageId,
    typing_indicator: { type: "text" },
  });
}

export async function enviarTexto(cliente, para, texto) {
  return postar(cliente, {
    to: para,
    type: "text",
    text: { preview_url: true, body: texto },
  });
}

// midia: { tipo, wa_media_id, url, legenda, nome, mime }
export async function enviarMidia(cliente, para, midia) {
  const alvo = midia.wa_media_id ? { id: midia.wa_media_id } : { link: midia.url };
  const aceitaLegenda = midia.tipo === "image" || midia.tipo === "video" || midia.tipo === "document";
  if (aceitaLegenda && midia.legenda) alvo.caption = midia.legenda;

  // O nome do arquivo só existe em documento, e sem ele quem recebe vê
  // "documento" e a extensão que a Meta adivinhar. Com ele vê "Nota 3649.pdf",
  // que é a diferença entre abrir e não abrir o anexo.
  if (midia.tipo === "document" && midia.nome) alvo.filename = midia.nome;

  // Mensagem de voz, que é a bolha com a onda e a foto de quem mandou, em vez
  // de um anexo de áudio com ícone de download.
  //
  // Durante um bom tempo a gente acreditou que bastava o arquivo ser .ogg com
  // OPUS. Não basta: o formato é condição, e o sinalizador `voice` é o que a
  // Meta lê para decidir. Sem ele vai como "basic audio message", que perde o
  // download automático, a foto e o ícone de microfone. Com outro formato que
  // não seja ogg/opus, ligar o sinalizador quebra a transcrição, então ele só
  // acompanha o ogg.
  if (midia.tipo === "audio" && ehOggOpus(midia.mime)) alvo.voice = true;

  return postar(cliente, { to: para, type: midia.tipo, [midia.tipo]: alvo });
}

/** O único formato que a Meta aceita como mensagem de voz. */
export function ehOggOpus(mime) {
  return String(mime || "").split(";")[0].trim().toLowerCase() === "audio/ogg";
}

// ---------------------------------------------------------------------------
// Mídia que SAI: primeiro sobe o arquivo, depois manda o id.
//
// Não existe atalho. A Cloud API aceita `link` em vez de `id`, mas aí o
// arquivo precisa estar numa URL que a Meta consiga buscar, o que significa
// publicar o anexo do atendimento na internet. O id resolve isso: o arquivo
// vive na Meta, por 30 dias, e só o nosso app alcança.
//
// O que a Cloud API aceita, por tipo de mensagem. A lista é curta de propósito:
// mandar um mime que ela não conhece volta 400 depois do upload, ou seja, erra
// caro e tarde. Conferir antes erra de graça.
export const MIDIA_ACEITA = {
  image: ["image/jpeg", "image/png"],
  sticker: ["image/webp"],
  audio: ["audio/aac", "audio/amr", "audio/mpeg", "audio/mp4", "audio/ogg"],
  video: ["video/mp4", "video/3gp", "video/3gpp"],
  document: [
    "application/pdf", "text/plain", "text/csv",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "application/vnd.ms-powerpoint",
    "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  ],
};

// Teto de cada tipo na Meta, em bytes. Documento vai a 100 MB na Cloud API,
// mas não por aqui: o corpo de uma função da Vercel para em 4,5 MB, e o
// arquivo chega em base64, que infla 1/3. O teto real deste caminho é o de
// baixo, e quem avisa isso é `LIMITE_UPLOAD` em quem recebe.
export const TETO_META = {
  image: 5 * 1024 * 1024,
  sticker: 500 * 1024,
  audio: 16 * 1024 * 1024,
  video: 16 * 1024 * 1024,
  document: 100 * 1024 * 1024,
};

/** O tipo de mensagem do WhatsApp para um mime, ou null se ele não serve. */
export function tipoDoMime(mime) {
  const limpo = String(mime || "").split(";")[0].trim().toLowerCase();
  for (const [tipo, aceitos] of Object.entries(MIDIA_ACEITA)) {
    if (aceitos.includes(limpo)) return tipo;
  }
  return null;
}

/**
 * Sobe o arquivo para a Meta e devolve o id da mídia.
 *
 * É `multipart/form-data`, não JSON: este é o único endereço da Cloud API que
 * não aceita JSON, e mandar JSON aqui volta um 400 que não explica nada.
 * `FormData` e `Blob` são globais no Node 18 e acima, então não entra
 * dependência nenhuma para montar o corpo.
 */
export async function subirMidia(cliente, { conteudo, mime, nome }) {
  const corpo = new FormData();
  corpo.append("messaging_product", "whatsapp");
  corpo.append("type", mime);
  corpo.append("file", new Blob([conteudo], { type: mime }), nome || "arquivo");

  let r;
  try {
    r = await fetch(
      `https://graph.facebook.com/${VERSAO}/${cliente.wa_phone_number_id}/media`,
      { method: "POST", headers: { Authorization: `Bearer ${cliente.wa_token}` }, body: corpo },
    );
  } catch (e) {
    const erro = new Error(`Cloud API sem resposta no upload: ${e.message}`);
    erro.rede = true;
    throw erro;
  }

  const dados = await r.json().catch(() => ({}));
  if (!r.ok) {
    const erro = new Error(`Cloud API ${r.status}: ${dados?.error?.message || r.statusText}`);
    erro.status = r.status;
    erro.codigo = dados?.error?.code ?? null;
    throw erro;
  }
  if (!dados.id) throw new Error("A Meta aceitou o upload e não devolveu id da mídia.");
  return dados.id;
}

// Quebra a resposta em balões curtos. Um parágrafo de cinco linhas entrega o
// bot na hora; duas ou três frases soltas soam como gente digitando.
export function dividirEmBaloes(texto, maximo = 3) {
  const limpo = String(texto || "").trim();
  if (!limpo) return [];

  const paragrafos = limpo.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean);
  const partes = [];

  for (const paragrafo of paragrafos) {
    if (paragrafo.length <= 320) {
      partes.push(paragrafo);
      continue;
    }
    // Parágrafo longo: corta por frase, agrupando até ~280 caracteres.
    let atual = "";
    for (const frase of paragrafo.split(/(?<=[.!?…])\s+/)) {
      if ((atual + " " + frase).trim().length > 280 && atual) {
        partes.push(atual.trim());
        atual = frase;
      } else {
        atual = (atual + " " + frase).trim();
      }
    }
    if (atual) partes.push(atual.trim());
  }

  if (partes.length <= maximo) return partes;
  // Excedeu: mantém os primeiros e junta o resto no último balão.
  return [...partes.slice(0, maximo - 1), partes.slice(maximo - 1).join(" ")];
}

// Tempo plausível de digitação: ~55ms por caractere, com piso e teto.
export function tempoDeDigitacao(texto) {
  return Math.min(6000, Math.max(700, String(texto).length * 55));
}

// ---------------------------------------------------------------------------
// Template: a única coisa que sai fora da janela de 24h.
//
// Fora dela a Cloud API recusa texto livre com o erro 131047. O template tem
// que estar aprovado na Meta ANTES, com o mesmo nome e o mesmo idioma: nome
// errado volta 132001, e não existe jeito de criar na hora.
//
// `variaveis` preenche os {{1}}, {{2}} do corpo, na ordem.
export async function enviarTemplate(cliente, para, nome, idioma = "pt_BR", variaveis = []) {
  const componentes = variaveis.length
    ? [{ type: "body", parameters: variaveis.map((v) => ({ type: "text", text: String(v) })) }]
    : [];

  return postar(cliente, {
    to: para,
    type: "template",
    template: { name: nome, language: { code: idioma }, ...(componentes.length && { components: componentes }) },
  });
}

// Os templates aprovados deste número, para o painel listar em vez de a equipe
// ter que decorar nomes. Só leitura: criar template continua sendo no painel
// da Meta, que é onde a aprovação acontece.
//
// O id aqui é o da conta de mensagens, não o da WABA. Com a WABA a Meta
// responde 2388339, "This API is not supported for this WhatsApp Business
// Account", que parece bloqueio da conta e não é: é id errado.
export async function listarTemplates(cliente) {
  const r = await fetch(
    `https://graph.facebook.com/${VERSAO}/${cliente.wa_conta_id || cliente.wa_waba_id}/message_templates`
    + `?fields=name,status,language,category,components&limit=100`,
    { headers: { Authorization: `Bearer ${cliente.wa_token}` } },
  );
  const dados = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(`Cloud API ${r.status}: ${dados?.error?.message || r.statusText}`);
  return (dados.data || []).filter((t) => t.status === "APPROVED");
}

/**
 * O template aprovado traduzido para o que a tela da conversa precisa.
 *
 * A Meta devolve o modelo em componentes (BODY, FOOTER, HEADER, BUTTONS) e a
 * atendente precisa de outra coisa: ler o texto que vai sair, saber quantos
 * campos ela tem que preencher, e ver que o botão de link é fixo.
 *
 * `campos` conta pelo MAIOR número entre {{1}}, {{2}}..., não pela quantidade
 * de ocorrências. Um corpo que usa {{1}} duas vezes tem um campo só, e a Meta
 * recusa a mensagem inteira quando o número de parâmetros não bate: 132000,
 * que não entrega e não explica.
 */
export function lerModelo(t) {
  const partes = t.components || [];
  const corpo = partes.find((c) => c.type === "BODY")?.text || "";
  const cabecalho = partes.find((c) => c.type === "HEADER") || null;
  const botoes = (partes.find((c) => c.type === "BUTTONS")?.buttons || [])
    .map((b) => ({ tipo: b.type, texto: b.text || null, url: b.url || null }));

  const campos = (String(corpo).match(/\{\{\s*(\d+)\s*\}\}/g) || [])
    .reduce((maior, m) => Math.max(maior, Number(m.replace(/\D/g, ""))), 0);

  return {
    nome: t.name,
    idioma: t.language || "pt_BR",
    categoria: t.category || null,
    corpo,
    rodape: partes.find((c) => c.type === "FOOTER")?.text || null,
    botoes,
    campos,
    // Cabeçalho de mídia pede parâmetro próprio (a imagem, o vídeo ou o
    // documento), que esta tela não manda. Marcar aqui é o que deixa a tela
    // dizer por que o modelo está indisponível, em vez de oferecer um envio
    // que a Meta vai recusar.
    cabecalho_de_midia: Boolean(cabecalho?.format && cabecalho.format !== "TEXT"),
  };
}

/** O corpo com os campos preenchidos, para a prévia e para o histórico. */
export function preencherModelo(corpo, valores = []) {
  return String(corpo).replace(/\{\{\s*(\d+)\s*\}\}/g, (inteiro, n) => {
    const v = valores[Number(n) - 1];
    return v === undefined || v === null || String(v).trim() === "" ? inteiro : String(v);
  });
}

// ---------------------------------------------------------------------------
// Mídia recebida: a Meta manda só um id, nunca o arquivo.
//
// São duas chamadas: uma para trocar o id por uma URL, outra para baixar. E a
// URL expira em 5 minutos e só abre com o token no cabeçalho, então não dá
// para guardar o link e mostrar no painel depois: tem que baixar os bytes.
export async function urlDaMidia(cliente, mediaId) {
  const r = await fetch(`https://graph.facebook.com/${VERSAO}/${mediaId}`, {
    headers: { Authorization: `Bearer ${cliente.wa_token}` },
  });
  const dados = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(`Cloud API ${r.status}: ${dados?.error?.message || r.statusText}`);
  return { url: dados.url, mime: dados.mime_type, bytes: dados.file_size, sha256: dados.sha256 };
}

/**
 * A mídia como fluxo, sem passar pela memória da função.
 *
 * Existe por causa de vídeo. `baixarMidia` junta o arquivo inteiro num Buffer
 * e a resposta de uma função da Vercel para em 4,5 MB, então vídeo de celular
 * batia em "grande demais para abrir no painel" justamente quando era o vídeo
 * do produto quebrado que a equipe precisava ver. Repassando o fluxo, o teto
 * da resposta não se aplica do mesmo jeito e o arquivo chega.
 *
 * Devolve `corpo` nulo quando a Meta não manda corpo legível; quem chama volta
 * para o caminho antigo nesse caso, em vez de responder vazio.
 */
export async function fluxoDaMidia(cliente, mediaId) {
  const { url, mime, bytes } = await urlDaMidia(cliente, mediaId);
  const r = await fetch(url, { headers: { Authorization: `Bearer ${cliente.wa_token}` } });
  if (!r.ok) throw new Error(`Download da mídia ${mediaId}: ${r.status}`);
  return {
    corpo: r.body || null,
    mime: mime || r.headers.get("content-type") || null,
    bytes: bytes || Number(r.headers.get("content-length")) || null,
  };
}

export async function baixarMidia(cliente, mediaId) {
  const { url, mime, bytes } = await urlDaMidia(cliente, mediaId);
  // O download exige o mesmo token. Sem ele a Meta devolve 401, mesmo com a
  // URL correta e dentro do prazo.
  const r = await fetch(url, { headers: { Authorization: `Bearer ${cliente.wa_token}` } });
  if (!r.ok) throw new Error(`Download da mídia ${mediaId}: ${r.status}`);
  return { conteudo: Buffer.from(await r.arrayBuffer()), mime, bytes };
}

// ---------------------------------------------------------------------------
// Conferencia do numero, para a tela de Canais.
//
// Credencial errada so aparece quando um cliente de verdade manda mensagem e
// nada acontece. Esta chamada pergunta para a Meta quem e o numero: se o token
// nao servir, ou nao tiver permissao sobre ESTE numero, a resposta e erro aqui
// e agora, com a mensagem da propria Meta, em vez de silencio depois.
//
// Recebe um objeto com `wa_phone_number_id` e `wa_token` apenas: serve tanto
// para um canal ja salvo quanto para credenciais que ainda estao no formulario.
export async function conferirNumero(cliente) {
  const campos = [
    "display_phone_number", "verified_name", "quality_rating",
    "code_verification_status", "throughput", "platform_type",
  ].join(",");

  const r = await fetch(
    `https://graph.facebook.com/${VERSAO}/${cliente.wa_phone_number_id}?fields=${campos}`,
    { headers: { Authorization: `Bearer ${cliente.wa_token}` } },
  );
  const dados = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(`Cloud API ${r.status}: ${dados?.error?.message || r.statusText}`);

  return {
    numero: dados.display_phone_number || null,
    nome_verificado: dados.verified_name || null,
    // GREEN, YELLOW, RED ou UNKNOWN. Vermelho e aviso de bloqueio chegando.
    qualidade: dados.quality_rating || null,
    // Quantas conversas por 24h a Meta libera. STANDARD = 1000.
    tier: dados.throughput?.level || null,
    // CLOUD_API, ou ON_PREMISE num numero que ainda nao migrou.
    plataforma: dados.platform_type || null,
    verificado: dados.code_verification_status === "VERIFIED",
  };
}
