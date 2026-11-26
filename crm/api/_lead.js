// O lead que chega pelos formulários do site.
//
// O site é estático (ousadiamarketing.com.br) e manda cada formulário para
// `/api/lead` em segundo plano, do mesmo jeito que manda para as planilhas.
// Aqui ele vira, no CRM da Ousadia:
//
//   - um contato (quando tem telefone; contato sem telefone não existe no
//     esquema, porque é o telefone que liga contato, conversa e disparo);
//   - um negócio na primeira etapa do funil de entrada automática ("Alunos"),
//     com a origem certa (Site, Diagnóstico, Newsletter);
//   - uma nota no negócio com tudo o que a pessoa preencheu, para ninguém
//     precisar abrir a planilha.
//
// Quem preenche duas vezes não vira dois negócios: se já existe negócio
// ABERTO naquele funil com o mesmo telefone ou e-mail, ele ganha só a nota
// nova. Negócio ganho ou perdido não é reaberto: a pessoa voltar é um
// negócio novo, e é assim que o funil conta.

import { paraE164 } from "./_telefone.js";
import { salvarNegocio } from "./_negocios.js";

export const QUEM = "formulário do site";

const CHAVES_NOME = ["nome", "name", "nome_completo"];
const CHAVES_EMAIL = ["email", "e-mail", "e_mail"];
const CHAVES_TELEFONE = ["whatsapp", "wpp", "telefone", "celular", "phone", "fone"];

const MAX_CAMPOS = 40;
const MAX_TEXTO = 500;

function texto(v) {
  if (v === null || v === undefined) return "";
  if (typeof v === "object") return JSON.stringify(v).slice(0, MAX_TEXTO);
  return String(v).trim().slice(0, MAX_TEXTO);
}

function primeiro(dados, chaves) {
  for (const k of chaves) {
    const v = texto(dados[k]);
    if (v) return v;
  }
  return "";
}

/** O formulário vira um identificador curto: "diagnostico-ia", "contato". */
export function slugDaOrigem(origem) {
  return texto(origem).normalize("NFD").replace(/[̀-ͯ]/g, "")
    .toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40) || "site";
}

/** Qual origem do CRM este formulário representa (chave de crm_origens). */
export function chaveDaOrigem(slug) {
  if (slug.startsWith("diagnostico") || slug === "momento-ugc" || slug === "metodo-satoyiro") return "diagnostico";
  if (slug.startsWith("newsletter")) return "newsletter";
  return "veio do site";
}

const EMAIL_OK = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/**
 * Lê e limpa o que o site mandou. Devolve null quando não há como falar com
 * a pessoa (nem e-mail válido nem telefone).
 */
export function lerLead(corpo) {
  const bruto = corpo && typeof corpo === "object" ? corpo : {};
  const dadosBrutos = bruto.dados && typeof bruto.dados === "object" ? bruto.dados : bruto;

  const dados = {};
  for (const [k, v] of Object.entries(dadosBrutos).slice(0, MAX_CAMPOS)) {
    if (["origem", "utms", "pagina", "dados", "_gotcha"].includes(k)) continue;
    const t = texto(v);
    if (t) dados[String(k).slice(0, 60)] = t;
  }

  const email = primeiro(dados, CHAVES_EMAIL).toLowerCase();
  const telefoneBruto = primeiro(dados, CHAVES_TELEFONE);
  const telefone = telefoneBruto ? paraE164(telefoneBruto) : null;
  const emailValido = EMAIL_OK.test(email) ? email : "";
  if (!emailValido && !telefone) return null;

  const utms = {};
  const utmsBrutas = bruto.utms && typeof bruto.utms === "object" ? bruto.utms : {};
  for (const [k, v] of Object.entries(utmsBrutas)) {
    if (/^utm_[a-z]+$/.test(k) && texto(v)) utms[k] = texto(v).slice(0, 120);
  }

  const origem = slugDaOrigem(bruto.origem);
  return {
    origem,
    nome: primeiro(dados, CHAVES_NOME).slice(0, 120),
    email: emailValido,
    telefone,
    utms,
    pagina: texto(bruto.pagina).slice(0, 200),
    dados,
  };
}

function nota(lead) {
  const linhas = [`Formulário do site: ${lead.origem}`];
  if (lead.pagina) linhas.push(`Página: ${lead.pagina}`);
  for (const [k, v] of Object.entries(lead.dados)) linhas.push(`${k}: ${v}`);
  const utms = Object.entries(lead.utms).map(([k, v]) => `${k}=${v}`).join(", ");
  if (utms) linhas.push(`UTMs: ${utms}`);
  return linhas.join("\n").slice(0, 4000);
}

/**
 * Grava o lead. `sb` é o cliente do banco; `slugCliente`, a empresa dona do
 * site (a Ousadia).
 */
export async function registrarLead(sb, slugCliente, lead) {
  const { data: cliente, error: e1 } = await sb.from("clientes")
    .select("id").eq("slug", slugCliente).eq("ativo", true).maybeSingle();
  if (e1) throw new Error(e1.message);
  if (!cliente) throw new Error(`Cliente "${slugCliente}" não encontrado.`);
  const clienteId = cliente.id;

  // O funil que recebe sozinho; sem nenhum marcado, o primeiro ativo.
  const { data: funis, error: e2 } = await sb.from("crm_funis")
    .select("id, entrada_automatica, ordem").eq("cliente_id", clienteId).eq("ativo", true).order("ordem");
  if (e2) throw new Error(e2.message);
  const funil = (funis || []).find((f) => f.entrada_automatica) || (funis || [])[0];
  if (!funil) throw new Error("Nenhum funil ativo para receber o lead.");

  const { data: etapas, error: e3 } = await sb.from("crm_etapas")
    .select("id, tipo, ordem").eq("cliente_id", clienteId).eq("funil_id", funil.id).order("ordem");
  if (e3) throw new Error(e3.message);
  const etapa = (etapas || []).find((e) => e.tipo === "aberta");
  if (!etapa) throw new Error("O funil de entrada não tem etapa aberta.");

  const { data: origem } = await sb.from("crm_origens")
    .select("id").eq("cliente_id", clienteId).eq("chave", chaveDaOrigem(lead.origem)).maybeSingle();

  // Já existe negócio aberto desta pessoa neste funil?
  let existente = null;
  for (const [coluna, valor] of [["telefone", lead.telefone], ["email", lead.email]]) {
    if (existente || !valor) continue;
    const { data } = await sb.from("crm_negocios")
      .select("id, contato_id").eq("cliente_id", clienteId).eq("funil_id", funil.id)
      .eq("situacao", "aberto").eq(coluna, valor).limit(1);
    existente = (data || [])[0] || null;
  }

  let negocio = existente;
  if (!negocio) {
    negocio = await salvarNegocio(sb, clienteId, {
      etapa_id: etapa.id,
      titulo: lead.nome || lead.email || lead.telefone,
      telefone: lead.telefone || undefined,
      email: lead.email || undefined,
      origem_id: origem?.id || null,
      etiquetas: ["veio do site", lead.origem],
      campos: { formulario: lead.origem, ...lead.utms },
    }, QUEM);
  }

  const { error: e4 } = await sb.from("crm_notas").insert({
    cliente_id: clienteId,
    negocio_id: negocio.id,
    contato_id: negocio.contato_id || null,
    texto: nota(lead),
    autor: QUEM,
  });
  if (e4) throw new Error(e4.message);

  return { negocio_id: negocio.id, novo: !existente };
}
