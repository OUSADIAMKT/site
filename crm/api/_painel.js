// Acesso ao painel. Dois tipos de sessão:
//   operador  = você, entra com a senha única e enxerga todos os clientes
//   atendente = pessoa da equipe do cliente, entra com email e senha,
//               enxerga só o cliente dela e só as telas de atendimento

import crypto from "node:crypto";
import bcrypt from "bcryptjs";
import { db } from "./_db.js";

function segredo() {
  const s = process.env.SESSION_SECRET;
  if (!s) throw new Error("SESSION_SECRET não configurada no servidor.");
  return s;
}

function comparar(a, b) {
  const ba = Buffer.from(String(a));
  const bb = Buffer.from(String(b));
  if (ba.length !== bb.length) return false;
  return crypto.timingSafeEqual(ba, bb);
}

export function senhaConfere(senha) {
  const esperada = process.env.PAINEL_SENHA;
  if (!esperada) throw new Error("PAINEL_SENHA não configurada no servidor.");
  return comparar(senha, esperada);
}

export async function hashSenha(senha) {
  return bcrypt.hash(senha, 10);
}

// Procura o atendente pelo email e confere a senha. Devolve null em qualquer
// falha, sem dizer se foi o email ou a senha: isso evita descobrir quem existe.
export async function autenticarAtendente(email, senha) {
  if (!email || !senha) return null;

  const { data, error } = await db()
    .from("atendentes")
    .select("id, cliente_id, nome, senha_hash, ativo, papel, versao_sessao, clientes(nome, modulos, ativo)")
    .eq("email", String(email).trim().toLowerCase())
    .maybeSingle();

  if (error) throw new Error("Falha ao consultar a autenticação.");
  const cli = data?.clientes;
  if (!data?.ativo || !cli?.ativo) return null;
  if (!(await bcrypt.compare(senha, data.senha_hash))) return null;

  // O nome da clínica vai junto: as telas do atendente mostram "Agenda de X"
  // e ele não tem o seletor de cliente para descobrir isso sozinho.
  return {
    id: data.id,
    cliente_id: data.cliente_id,
    cliente_nome: cli?.nome || "",
    modulos: cli?.modulos || {},
    nome: data.nome,
    versao_sessao: data.versao_sessao,
    papel: data.papel || "atendente",
  };
}

// Se o cliente contratou aquele módulo.
//
// `{}` libera tudo, de propósito: cliente que já existia não pode ficar com o
// painel em branco porque uma coluna nova nasceu. Só `{"ativos": [...]}`
// restringe, e aí é lista do que aparece.
export function moduloPermitido(modulos, chave) {
  const ativos = modulos?.ativos;
  if (!Array.isArray(ativos)) return true;
  return ativos.includes(chave);
}

export function gerarToken(dados = {}) {
  const payload = {
    painel: true,
    tipo: dados.tipo || "operador",
    papel: dados.papel || null,
    atendente: dados.atendente || null,
    cliente: dados.cliente || null,
    nome: dados.nome || null,
    versao_sessao: dados.versao_sessao,
    exp: Date.now() + 1000 * 60 * 60 * 12,
  };
  const corpo = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const assinatura = crypto.createHmac("sha256", segredo()).update(corpo).digest("base64url");
  return `${corpo}.${assinatura}`;
}

// Devolve o conteúdo da sessão, ou null se o token for inválido ou vencido.
function sessaoAssinada(req) {
  const token = pegarToken(req);
  if (!token) return null;

  const [corpo, assinatura, extra] = String(token).split(".");
  if (!corpo || !assinatura || extra !== undefined) return null;

  const esperada = crypto.createHmac("sha256", segredo()).update(corpo).digest("base64url");
  if (!comparar(assinatura, esperada)) return null;

  try {
    const payload = JSON.parse(Buffer.from(corpo, "base64url").toString());
    if (!payload?.painel || !Number.isFinite(payload.exp) || payload.exp <= Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}

export function sessaoDeOperador(req) {
  return sessaoAssinada(req)?.tipo === "operador";
}

// A mesma decisão é usada pelo porteiro e pelos filtros de cliente da requisição.
const sessoesPorRequisicao = new WeakMap();

export function sessao(req) {
  if (!sessoesPorRequisicao.has(req)) {
    sessoesPorRequisicao.set(req, consultarSessao(req));
  }
  return sessoesPorRequisicao.get(req);
}

async function consultarSessao(req) {
  const token = sessaoAssinada(req);
  if (!token || token.tipo === "operador") return token;
  if (token.tipo !== "atendente" || !token.atendente || !token.cliente) return null;

  const { data, error } = await db()
    .from("atendentes")
    .select("cliente_id, nome, papel, ativo, versao_sessao, clientes(ativo, modulos)")
    .eq("id", token.atendente)
    .maybeSingle();

  if (error) throw new Error("Falha ao consultar a sessão.");
  if (!data?.ativo || !data.clientes?.ativo || data.cliente_id !== token.cliente) return null;
  if (data.versao_sessao !== (token.versao_sessao ?? 1)) return null;

  return {
    ...token,
    cliente: data.cliente_id,
    nome: data.nome,
    papel: data.papel,
    modulos: data.clientes.modulos,
  };
}

export function pegarToken(req) {
  const h = req.headers.authorization || "";
  return h.startsWith("Bearer ") ? h.slice(7) : null;
}

// Porteiro para qualquer sessão válida. Devolve true se já respondeu 401.
export async function barrou(req, res) {
  try {
    if (await sessao(req)) return false;
  } catch {
    res.status(500).json({ error: "Falha ao validar a sessão." });
    return true;
  }
  res.status(401).json({ error: "Não autenticado." });
  return true;
}

// Porteiro das telas de configuração. Atendente não cadastra cliente, não
// edita contexto e não mexe em mídia: essas telas são só do operador.
export async function barrouOperador(req, res) {
  if (await barrou(req, res)) return true;
  const s = await sessao(req);
  if (s.tipo !== "operador") {
    res.status(403).json({ error: "Esta área é do operador da plataforma." });
    return true;
  }
  return false;
}

// Porteiro das telas que o gestor da clínica também opera: agenda dos
// profissionais e relatório de desempenho. Atendente comum não entra.
export async function barrouGestor(req, res) {
  if (await barrou(req, res)) return true;
  const s = await sessao(req);
  if (s.tipo === "operador") return false;
  if (s.papel === "gestor") return false;

  res.status(403).json({ error: "Esta área é da gestão da clínica." });
  return true;
}

// Porteiro de módulo. O menu escondido no front não é segurança: quem souber
// o endereço do endpoint chama ele direto. Então a conta é feita de novo aqui,
// e lendo do banco, não do token: módulo desligado hoje tem que valer hoje,
// não só quando a sessão de 12 horas vencer.
//
// O operador passa sempre: ele é a agência, e as telas de implantação são
// justamente o serviço que ele vende.
export async function barrouModulo(req, res, chave) {
  if (await barrou(req, res)) return true;
  const s = await sessao(req);
  if (s.tipo === "operador") return false;

  if (moduloPermitido(s.modulos, chave)) return false;

  res.status(403).json({ error: "Este módulo não está ativo na sua conta." });
  return true;
}

// O atendente só enxerga o cliente dele. Devolve o id de cliente que a
// requisição pode usar, ou null se estiver tentando ver outro.
export async function clientePermitido(req, clienteIdPedido) {
  const s = await sessao(req);
  if (!s) return null;
  if (s.tipo === "operador") return clienteIdPedido || null;
  if (!clienteIdPedido || clienteIdPedido === s.cliente) return s.cliente;
  return null;
}
