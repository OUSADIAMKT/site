// Cloudflare R2: o cofre privado das mídias do atendimento.
//
// Por que existe
// -------------
// O caminho antigo mandava o arquivo dentro do corpo da requisição, em base64.
// O corpo de uma função da Vercel para em 4,5 MB e base64 engorda um terço, o
// que deixava o teto real em 3 MB: menos do que a Meta aceita em vídeo e áudio
// (16 MB). Aqui o navegador sobe direto para o R2, com uma URL pré-assinada, e
// a função só recebe o nome do objeto. O arquivo não passa mais pelo corpo.
//
// E serve para a outra metade do problema, que é mais antiga: a Meta apaga a
// mídia recebida em cerca de 30 dias. Guardando uma cópia aqui, a conversa de
// três meses atrás continua mostrando a foto da peça quebrada.
//
// Por que assinar à mão
// ---------------------
// O R2 fala o protocolo S3, e assinar S3 é SigV4: HMAC-SHA256 em cima de um
// texto montado em ordem fixa. São umas cem linhas com node:crypto, contra uma
// dependência (@aws-sdk/client-s3) que pesa alguns megabytes em cada função e
// sobe o tempo de arranque de todas elas. A conta não fecha para quatro
// operações: ler, gravar, copiar e apagar.
//
// O risco de assinar à mão é errar e só descobrir com um 403 do serviço real.
// Por isso test/sigv4.test.js roda o conjunto de vetores oficial da AWS
// (test/vetores-sigv4), que traz o texto canônico, o texto a assinar e a
// assinatura esperada de cada caso. Se esta implementação divergir num espaço,
// numa ordem ou num acento, o teste aponta onde, sem precisar de credencial
// nem de rede.
//
// Nada aqui lê segredo fora de process.env, e nenhuma URL assinada de leitura
// chega ao navegador: quem vê mídia pede ao servidor, que repassa os bytes.

import crypto from "node:crypto";

const ALGORITMO = "AWS4-HMAC-SHA256";

// O R2 só aceita "auto" como região. Qualquer outra volta assinatura inválida.
export const REGIAO_R2 = "auto";
const SERVICO = "s3";

// Corpo vazio. É o hash que entra em GET, DELETE e nas assinaturas de consulta
// deste conjunto de vetores.
export const HASH_VAZIO = "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855";

// Em URL pré-assinada o corpo não entra na conta: quem sobe é o navegador, e
// ninguém conhece os bytes na hora de assinar.
export const SEM_ASSINAR_CORPO = "UNSIGNED-PAYLOAD";

const sha256 = (dados) => crypto.createHash("sha256").update(dados).digest("hex");
const hmac = (chave, texto) => crypto.createHmac("sha256", chave).update(texto, "utf8").digest();

// ---------------------------------------------------------------------------
// As regras chatas do SigV4

/**
 * UriEncode do SigV4, que não é o encodeURIComponent do JavaScript.
 *
 * Diferenças que custam um 403: o espaço vira %20 e nunca +, os dígitos
 * hexadecimais são maiúsculos, e os caracteres ! ' ( ) * precisam ser
 * codificados, coisa que o encodeURIComponent deixa passar.
 */
export function uriCodificar(valor) {
  return Array.from(Buffer.from(String(valor), "utf8"))
    .map((b) => {
      const ch = String.fromCharCode(b);
      if (/[A-Za-z0-9\-._~]/.test(ch)) return ch;
      return `%${b.toString(16).toUpperCase().padStart(2, "0")}`;
    })
    .join("");
}

/** O caminho codificado pedaço por pedaço: a barra é estrutura, não conteúdo. */
export function codificarCaminho(caminho) {
  const limpo = String(caminho || "/");
  if (!limpo.startsWith("/")) return codificarCaminho(`/${limpo}`);
  return limpo.split("/").map(uriCodificar).join("/");
}

/**
 * A consulta canônica: cada nome e cada valor codificados, e a lista ordenada
 * por nome DEPOIS de codificar. Ordenar antes dá outra ordem e outra
 * assinatura.
 */
export function consultaCanonica(pares) {
  const lista = Array.isArray(pares)
    ? pares.map(([n, v]) => [uriCodificar(n), uriCodificar(v ?? "")])
    : Object.entries(pares || {}).map(([n, v]) => [uriCodificar(n), uriCodificar(v ?? "")]);
  lista.sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : a[1] < b[1] ? -1 : a[1] > b[1] ? 1 : 0));
  return lista.map(([n, v]) => `${n}=${v}`).join("&");
}

/**
 * Os cabeçalhos canônicos: nome em minúscula, valor sem espaço nas pontas e
 * com espaços internos reduzidos a um. O host é obrigatório.
 */
export function cabecalhosCanonicos(cabecalhos) {
  const lista = Object.entries(cabecalhos || {})
    .map(([n, v]) => [n.toLowerCase().trim(), String(v).trim().replace(/\s+/g, " ")])
    .sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0));
  return {
    texto: lista.map(([n, v]) => `${n}:${v}\n`).join(""),
    assinados: lista.map(([n]) => n).join(";"),
  };
}

export function pedidoCanonico({ metodo, caminho, consulta, cabecalhos, hashCorpo }) {
  const { texto, assinados } = cabecalhosCanonicos(cabecalhos);
  return {
    texto: [
      String(metodo).toUpperCase(),
      codificarCaminho(caminho),
      typeof consulta === "string" ? consulta : consultaCanonica(consulta),
      texto,
      assinados,
      hashCorpo,
    ].join("\n"),
    assinados,
  };
}

/**
 * A consulta de uma URL pré-assinada: os parâmetros que já existiam mais os
 * cinco X-Amz-* que carregam a credencial, a hora, o prazo e a lista de
 * cabeçalhos assinados. Sai pronta e ordenada, porque a ordem faz parte da
 * assinatura.
 *
 * Vive aqui, e não dentro de urlDeEnvio, para o conjunto de vetores da AWS
 * poder exercitar exatamente esta função: o caso de consulta do conjunto é
 * montado assim.
 */
export function consultaDeAssinatura({
  pares = {}, credencial, amz, segundos, assinados = "host",
}) {
  return consultaCanonica({
    ...(Array.isArray(pares) ? Object.fromEntries(pares) : pares),
    "X-Amz-Algorithm": ALGORITMO,
    "X-Amz-Credential": credencial,
    "X-Amz-Date": amz,
    "X-Amz-Expires": String(segundos),
    "X-Amz-SignedHeaders": assinados,
  });
}

/** A data em dois formatos: o do carimbo e o do escopo. */
export function carimbos(quando) {
  const d = quando instanceof Date ? quando : new Date(quando);
  const amz = d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  return { amz, dia: amz.slice(0, 8) };
}

/**
 * A chave de assinatura: quatro HMAC em cadeia, começando no segredo com o
 * prefixo AWS4. Derivar errado é o erro silencioso clássico, porque o
 * resultado é um hash de aparência perfeita que o serviço recusa.
 */
export function chaveDeAssinatura(segredo, dia, regiao, servico) {
  const kData = hmac(`AWS4${segredo}`, dia);
  const kRegiao = hmac(kData, regiao);
  const kServico = hmac(kRegiao, servico);
  return hmac(kServico, "aws4_request");
}

/**
 * Assina um pedido e devolve as três coisas que o teste confere: o pedido
 * canônico, o texto a assinar e a assinatura.
 */
export function assinar({
  metodo, caminho, consulta = "", cabecalhos, hashCorpo,
  chaveId, segredo, quando, regiao = REGIAO_R2, servico = SERVICO,
}) {
  const { amz, dia } = carimbos(quando);
  const escopo = `${dia}/${regiao}/${servico}/aws4_request`;
  const canonico = pedidoCanonico({ metodo, caminho, consulta, cabecalhos, hashCorpo });
  const textoParaAssinar = [ALGORITMO, amz, escopo, sha256(canonico.texto)].join("\n");
  const assinatura = crypto
    .createHmac("sha256", chaveDeAssinatura(segredo, dia, regiao, servico))
    .update(textoParaAssinar, "utf8")
    .digest("hex");

  return {
    canonico: canonico.texto,
    assinados: canonico.assinados,
    textoParaAssinar,
    assinatura,
    escopo,
    amz,
    credencial: `${chaveId}/${escopo}`,
    autorizacao: `${ALGORITMO} Credential=${chaveId}/${escopo}, `
      + `SignedHeaders=${canonico.assinados}, Signature=${assinatura}`,
  };
}

// ---------------------------------------------------------------------------
// Configuração

/**
 * O que precisa estar no ambiente. Sem isto o módulo fica desligado e o painel
 * volta ao caminho antigo, de 3 MB pelo corpo da função: falta de configuração
 * não pode derrubar o atendimento.
 */
export function r2Config() {
  const contaId = process.env.R2_ACCOUNT_ID;
  const bucket = process.env.R2_BUCKET;
  const chaveId = process.env.R2_ACCESS_KEY_ID;
  const segredo = process.env.R2_SECRET_ACCESS_KEY;
  if (!contaId || !bucket || !chaveId || !segredo) return null;
  return {
    contaId,
    bucket,
    chaveId,
    segredo,
    host: process.env.R2_ENDPOINT
      ? String(process.env.R2_ENDPOINT).replace(/^https?:\/\//, "").replace(/\/+$/, "")
      : `${contaId}.r2.cloudflarestorage.com`,
  };
}

export function r2Ligado() {
  return r2Config() !== null;
}

// ---------------------------------------------------------------------------
// Os nomes dos objetos
//
// Três exigências, e todas aparecem no nome:
//   1. separado por empresa, para uma conta nunca alcançar o arquivo de outra;
//   2. impossível de adivinhar, porque chave previsível com bucket privado
//      ainda é um convite a tentar;
//   3. sem nada que venha do navegador, porque nome de arquivo escolhido por
//      quem envia é como se escapa de uma pasta.

const EXTENSAO = {
  "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp",
  "audio/ogg": "ogg", "audio/mpeg": "mp3", "audio/mp4": "m4a",
  "audio/aac": "aac", "audio/amr": "amr",
  "video/mp4": "mp4", "video/3gpp": "3gp", "video/3gp": "3gp",
  "application/pdf": "pdf", "text/plain": "txt", "text/csv": "csv",
};

export function extensaoDoMime(mime) {
  const limpo = String(mime || "").split(";")[0].trim().toLowerCase();
  return EXTENSAO[limpo] || "bin";
}

/** 32 dígitos hexadecimais de verdade, do gerador do sistema. */
function sorteio() {
  return crypto.randomBytes(16).toString("hex");
}

/** Um uuid e nada mais. Qualquer outra coisa não vira pedaço de caminho. */
function conferirId(clienteId) {
  const id = String(clienteId || "");
  if (!/^[0-9a-fA-F-]{8,64}$/.test(id)) throw new Error("Identificador de cliente inválido.");
  return id.toLowerCase();
}

/**
 * O nome de quem acabou de subir e ainda não foi entregue. Mora em tmp/, que é
 * a pasta onde a regra de ciclo de vida do bucket apaga sozinho o que ficou
 * pela metade: o arquivo que subiu e nunca virou mensagem.
 */
export function chaveTemporaria({ clienteId, mime }) {
  return `tmp/${conferirId(clienteId)}/${sorteio()}.${extensaoDoMime(mime)}`;
}

/**
 * O nome definitivo, depois de a Meta aceitar. Separado por mês para a conta
 * do bucket ficar legível e para uma regra de ciclo de vida futura poder
 * apagar por idade sem varrer tudo.
 */
export function chavePermanente({ clienteId, mime, direcao = "saida", quando = new Date() }) {
  const d = quando instanceof Date ? quando : new Date(quando);
  const ano = d.getUTCFullYear();
  const mes = String(d.getUTCMonth() + 1).padStart(2, "0");
  const lado = direcao === "entrada" ? "entrada" : "saida";
  return `wa/${conferirId(clienteId)}/${ano}/${mes}/${lado}/${sorteio()}.${extensaoDoMime(mime)}`;
}

/**
 * Confere um nome que veio do navegador.
 *
 * O navegador só pode falar de objeto que ELE subiu, e só na pasta temporária
 * da própria empresa. Sem esta porta, quem tiver uma sessão de atendente manda
 * uma chave de outro cliente e usa o nosso servidor para ler o arquivo dele.
 */
export function chaveTemporariaDoCliente(chave, clienteId) {
  let prefixo;
  try {
    prefixo = `tmp/${conferirId(clienteId)}/`;
  } catch {
    return null;
  }
  const nome = String(chave || "");
  if (!nome.startsWith(prefixo)) return null;
  const resto = nome.slice(prefixo.length);
  if (!/^[0-9a-f]{32}\.[a-z0-9]{1,5}$/.test(resto)) return null;
  return nome;
}

// ---------------------------------------------------------------------------
// As quatro operações

function urlDoObjeto(cfg, chave) {
  return `https://${cfg.host}/${cfg.bucket}/${chave.split("/").map(uriCodificar).join("/")}`;
}

function caminhoDoObjeto(cfg, chave) {
  return `/${cfg.bucket}/${chave}`;
}

function deAmzParaData(amz) {
  return new Date(amz.replace(
    /^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z$/, "$1-$2-$3T$4:$5:$6Z"));
}

function assinarPedido(cfg, { metodo, chave, hashCorpo, extras = {} }) {
  const cabecalhos = {
    host: cfg.host,
    "x-amz-content-sha256": hashCorpo,
    "x-amz-date": carimbos(new Date()).amz,
    ...extras,
  };
  const { autorizacao } = assinar({
    metodo,
    caminho: caminhoDoObjeto(cfg, chave),
    cabecalhos,
    hashCorpo,
    chaveId: cfg.chaveId,
    segredo: cfg.segredo,
    quando: deAmzParaData(cabecalhos["x-amz-date"]),
  });
  return { ...cabecalhos, Authorization: autorizacao };
}

/**
 * URL pré-assinada de envio, para o navegador subir o arquivo direto.
 *
 * Só o host entra nos cabeçalhos assinados. Assinar content-type obrigaria o
 * navegador a mandar exatamente aquele texto, e um navegador que normaliza o
 * mime viraria um 403 sem explicação. O tipo é conferido depois, no servidor,
 * olhando os bytes: assinatura curta aqui, conferência de verdade lá.
 */
export function urlDeEnvio({ chave, segundos = 300 }) {
  const cfg = r2Config();
  if (!cfg) throw new Error("R2 não configurado.");
  const { amz, dia } = carimbos(new Date());
  const consulta = consultaDeAssinatura({
    credencial: `${cfg.chaveId}/${dia}/${REGIAO_R2}/${SERVICO}/aws4_request`,
    amz,
    segundos,
  });
  const { assinatura } = assinar({
    metodo: "PUT",
    caminho: caminhoDoObjeto(cfg, chave),
    consulta,
    cabecalhos: { host: cfg.host },
    hashCorpo: SEM_ASSINAR_CORPO,
    chaveId: cfg.chaveId,
    segredo: cfg.segredo,
    quando: deAmzParaData(amz),
  });
  return {
    url: `${urlDoObjeto(cfg, chave)}?${consulta}&X-Amz-Signature=${assinatura}`,
    expira_em: segundos,
  };
}

/** Os bytes do objeto, como fluxo, para repassar sem encher a memória. */
export async function lerDoR2(chave) {
  const cfg = r2Config();
  if (!cfg) throw new Error("R2 não configurado.");
  const r = await fetch(urlDoObjeto(cfg, chave), {
    headers: assinarPedido(cfg, { metodo: "GET", chave, hashCorpo: HASH_VAZIO }),
  });
  if (r.status === 404) return null;
  if (!r.ok) throw new Error(`R2 ${r.status} ao ler ${chave}`);
  return {
    corpo: r.body || null,
    mime: r.headers.get("content-type") || null,
    bytes: Number(r.headers.get("content-length")) || null,
  };
}

/** Os bytes inteiros, para quem precisa deles na mão (subir para a Meta). */
export async function baixarDoR2(chave) {
  const cfg = r2Config();
  if (!cfg) throw new Error("R2 não configurado.");
  const r = await fetch(urlDoObjeto(cfg, chave), {
    headers: assinarPedido(cfg, { metodo: "GET", chave, hashCorpo: HASH_VAZIO }),
  });
  if (r.status === 404) return null;
  if (!r.ok) throw new Error(`R2 ${r.status} ao ler ${chave}`);
  return {
    conteudo: Buffer.from(await r.arrayBuffer()),
    mime: r.headers.get("content-type") || null,
  };
}

export async function gravarNoR2(chave, conteudo, mime) {
  const cfg = r2Config();
  if (!cfg) throw new Error("R2 não configurado.");
  const bytes = Buffer.isBuffer(conteudo) ? conteudo : Buffer.from(conteudo);
  const r = await fetch(urlDoObjeto(cfg, chave), {
    method: "PUT",
    headers: assinarPedido(cfg, {
      metodo: "PUT",
      chave,
      hashCorpo: sha256(bytes),
      extras: {
        "content-type": mime || "application/octet-stream",
        "content-length": String(bytes.length),
      },
    }),
    body: bytes,
  });
  if (!r.ok) throw new Error(`R2 ${r.status} ao gravar ${chave}`);
  return chave;
}

/**
 * Copia dentro do bucket. Acontece no R2, sem os bytes passarem por aqui, que
 * é o que faz valer a pena mover de tmp/ para o lugar definitivo em vez de
 * subir duas vezes.
 */
export async function copiarNoR2(de, para) {
  const cfg = r2Config();
  if (!cfg) throw new Error("R2 não configurado.");
  const r = await fetch(urlDoObjeto(cfg, para), {
    method: "PUT",
    headers: assinarPedido(cfg, {
      metodo: "PUT",
      chave: para,
      hashCorpo: HASH_VAZIO,
      extras: { "x-amz-copy-source": `/${cfg.bucket}/${de}` },
    }),
  });
  if (!r.ok) throw new Error(`R2 ${r.status} ao copiar ${de}`);
  return para;
}

export async function apagarDoR2(chave) {
  const cfg = r2Config();
  if (!cfg) throw new Error("R2 não configurado.");
  const r = await fetch(urlDoObjeto(cfg, chave), {
    method: "DELETE",
    headers: assinarPedido(cfg, { metodo: "DELETE", chave, hashCorpo: HASH_VAZIO }),
  });
  if (!r.ok && r.status !== 404) throw new Error(`R2 ${r.status} ao apagar ${chave}`);
  return true;
}

// ---------------------------------------------------------------------------
// Como o banco guarda isto
//
// A coluna mensagens.midia_url já existia e estava sem uso. Em vez de uma
// migração, o nome do objeto entra ali com o prefixo r2:, que distingue uma
// chave do R2 de uma URL de verdade (a biblioteca de mídias da IA guarda URLs
// http numa coluna de mesmo nome, em outra tabela). Nada no painel exibe este
// texto.

export const MARCA_R2 = "r2:";

export function paraBanco(chave) {
  return `${MARCA_R2}${chave}`;
}

export function chaveDoBanco(valor) {
  const texto = String(valor || "");
  return texto.startsWith(MARCA_R2) ? texto.slice(MARCA_R2.length) : null;
}

// ---------------------------------------------------------------------------
// Conferência dos bytes
//
// A URL pré-assinada aceita qualquer conteúdo: quem a tem sobe o que quiser
// dentro do prazo. Então o tipo declarado na hora de pedir a assinatura não
// prova nada, e o servidor olha o começo do arquivo antes de entregá-lo à
// Meta. Sem isto o bucket do atendimento é um lugar para hospedar arquivo
// qualquer, pago pelo cliente.

const PRIMEIROS_BYTES = {
  "image/jpeg": (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff,
  "image/png": (b) => b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])),
  "image/webp": (b) => b.subarray(0, 4).toString("latin1") === "RIFF"
    && b.subarray(8, 12).toString("latin1") === "WEBP",
  "audio/ogg": (b) => b.subarray(0, 4).toString("latin1") === "OggS",
  "audio/mpeg": (b) => b.subarray(0, 3).toString("latin1") === "ID3"
    || (b[0] === 0xff && (b[1] & 0xe0) === 0xe0),
  "audio/mp4": (b) => b.subarray(4, 8).toString("latin1") === "ftyp",
  "video/mp4": (b) => b.subarray(4, 8).toString("latin1") === "ftyp",
  "video/3gpp": (b) => b.subarray(4, 8).toString("latin1") === "ftyp",
  "video/3gp": (b) => b.subarray(4, 8).toString("latin1") === "ftyp",
  "application/pdf": (b) => b.subarray(0, 5).toString("latin1") === "%PDF-",
};

/**
 * Diz se os bytes combinam com o mime declarado. Formato sem marca conhecida
 * (texto, CSV, Office) passa: não existe assinatura para conferir, e recusar o
 * que não dá para verificar tiraria do ar o envio de planilha.
 */
export function bytesCombinam(mime, bytes) {
  const limpo = String(mime || "").split(";")[0].trim().toLowerCase();
  const prova = PRIMEIROS_BYTES[limpo];
  if (!prova) return true;
  if (!bytes || bytes.length < 12) return false;
  try {
    return Boolean(prova(bytes));
  } catch {
    return false;
  }
}
