// Os sinais da comunidade (Creators da Amazônia) dentro do CRM.
//
// A comunidade é outro sistema (repositório OUSADIAMKT/comunidade, Supabase
// próprio). Ela não muda por causa do CRM: só avisa, por Database Webhook,
// quando três coisas acontecem. O que cada uma vira aqui:
//
//   users (novo ou atualizado)   memória do membro + contato com a etiqueta
//                                "comunidade" (quando tem WhatsApp)
//   company_profiles (nova)      lead da AGÊNCIA: empresa que entrou na
//                                comunidade é o sinal comercial mais valioso
//   certificates (novo)          concluiu um curso grátis: lead quente para o
//                                curso pago, no funil de entrada, +20 de score
//
// Formato do Database Webhook do Supabase:
//   { type: "INSERT" | "UPDATE" | "DELETE", table, schema, record, old_record }

import { paraE164 } from "./_telefone.js";
import { salvarNegocio } from "./_negocios.js";

export const QUEM = "comunidade";

async function funil(sb, clienteId, { nome = null } = {}) {
  const { data } = await sb.from("crm_funis")
    .select("id, nome, entrada_automatica, ordem").eq("cliente_id", clienteId).eq("ativo", true).order("ordem");
  const lista = data || [];
  return (nome && lista.find((f) => f.nome.toLowerCase() === nome.toLowerCase()))
    || lista.find((f) => f.entrada_automatica) || lista[0] || null;
}

async function primeiraAberta(sb, clienteId, funilId) {
  const { data } = await sb.from("crm_etapas").select("id, tipo, ordem")
    .eq("cliente_id", clienteId).eq("funil_id", funilId).order("ordem");
  return (data || []).find((e) => e.tipo === "aberta") || null;
}

async function origem(sb, clienteId) {
  const { data } = await sb.from("crm_origens").select("id")
    .eq("cliente_id", clienteId).eq("chave", "comunidade").maybeSingle();
  return data?.id || null;
}

async function membro(sb, clienteId, userId) {
  if (!userId) return null;
  const { data } = await sb.from("comunidade_membros").select("*")
    .eq("cliente_id", clienteId).eq("user_id", userId).maybeSingle();
  return data;
}

async function negocioAberto(sb, clienteId, funilId, pessoa) {
  for (const [coluna, valor] of [["telefone", pessoa?.telefone], ["email", pessoa?.email]]) {
    if (!valor) continue;
    const { data } = await sb.from("crm_negocios").select("id, etiquetas, score, contato_id")
      .eq("cliente_id", clienteId).eq("funil_id", funilId).eq("situacao", "aberto").eq(coluna, valor).limit(1);
    if (data?.[0]) return data[0];
  }
  return null;
}

async function nota(sb, clienteId, negocio, texto) {
  await sb.from("crm_notas").insert({
    cliente_id: clienteId, negocio_id: negocio.id, contato_id: negocio.contato_id || null, texto, autor: QUEM,
  });
}

// ---------------------------------------------------------------------------

async function aoMembro(sb, clienteId, r) {
  const pessoa = {
    email: r.email ? String(r.email).toLowerCase().trim() : null,
    nome: r.full_name ? String(r.full_name).trim().slice(0, 120) : null,
    telefone: r.phone_whatsapp ? paraE164(String(r.phone_whatsapp)) : null,
  };

  let contatoId = null;
  if (pessoa.telefone) {
    const { data: existente } = await sb.from("contatos").select("id, etiquetas, nome, email")
      .eq("cliente_id", clienteId).eq("telefone_e164", pessoa.telefone).maybeSingle();
    if (existente) {
      const etiquetas = [...new Set([...(existente.etiquetas || []), "comunidade"])];
      await sb.from("contatos").update({
        etiquetas,
        ...(existente.nome ? {} : { nome: pessoa.nome }),
        ...(existente.email ? {} : { email: pessoa.email }),
        atualizado_em: new Date().toISOString(),
      }).eq("id", existente.id);
      contatoId = existente.id;
    } else {
      const { data: novo, error } = await sb.from("contatos").insert({
        cliente_id: clienteId, telefone_e164: pessoa.telefone, nome: pessoa.nome, email: pessoa.email,
        etiquetas: ["comunidade"], origem: "crm", origem_id: await origem(sb, clienteId), canal: "comunidade",
      }).select("id").single();
      if (error) throw new Error(error.message);
      contatoId = novo.id;
    }
  }

  const { error } = await sb.from("comunidade_membros").upsert({
    cliente_id: clienteId, user_id: r.id, ...pessoa, contato_id: contatoId,
    atualizado_em: new Date().toISOString(),
  }, { onConflict: "cliente_id,user_id" });
  if (error) throw new Error(error.message);
  return { contato_id: contatoId, ignorado: pessoa.telefone ? null : "membro sem WhatsApp: só guardado" };
}

async function aEmpresa(sb, clienteId, r) {
  const pessoa = await membro(sb, clienteId, r.user_id);
  const f = await funil(sb, clienteId, { nome: "Agência" });
  if (!f) throw new Error("Nenhum funil ativo.");
  const etapa = await primeiraAberta(sb, clienteId, f.id);
  if (!etapa) throw new Error("O funil da agência não tem etapa aberta.");

  const ja = await negocioAberto(sb, clienteId, f.id, pessoa);
  const linhas = [
    `Empresa cadastrada na comunidade: ${r.company_name}${r.trade_name ? ` (${r.trade_name})` : ""}`,
    r.sector_niche && `Setor: ${r.sector_niche}`,
    (r.city || r.state_uf) && `Local: ${[r.city, r.state_uf].filter(Boolean).join(" - ")}`,
    r.instagram_handle && `Instagram: ${r.instagram_handle}`,
    r.website_url && `Site: ${r.website_url}`,
    !pessoa && "Contato do responsável ainda não chegou da comunidade: ver o perfil lá.",
  ].filter(Boolean).join("\n");

  const negocio = ja || await salvarNegocio(sb, clienteId, {
    etapa_id: etapa.id,
    titulo: String(r.company_name || pessoa?.nome || "Empresa da comunidade").slice(0, 120),
    telefone: pessoa?.telefone || undefined,
    email: pessoa?.email || undefined,
    origem_id: await origem(sb, clienteId),
    etiquetas: ["comunidade", "empresa"],
    campos: { comunidade_empresa: r.slug || null, setor: r.sector_niche || null },
  }, QUEM);
  await nota(sb, clienteId, negocio, linhas);
  return { negocio_id: negocio.id, novo: !ja };
}

async function aoCertificado(sb, clienteId, r) {
  const pessoa = await membro(sb, clienteId, r.user_id);
  if (!pessoa?.telefone && !pessoa?.email) return { ignorado: "membro desconhecido (sem contato no CRM)" };
  const f = await funil(sb, clienteId);
  if (!f) throw new Error("Nenhum funil ativo.");
  const etapa = await primeiraAberta(sb, clienteId, f.id);
  if (!etapa) throw new Error("O funil de entrada não tem etapa aberta.");

  const curso = String(r.course_title || "curso").slice(0, 80);
  const etiqueta = `concluiu: ${curso}`.toLowerCase();
  const ja = await negocioAberto(sb, clienteId, f.id, pessoa);

  let negocio;
  if (ja) {
    negocio = await salvarNegocio(sb, clienteId, {
      id: ja.id,
      etiquetas: [...new Set([...(ja.etiquetas || []), "comunidade", etiqueta])],
      score: Math.min(100, Number(ja.score || 0) + 20),
    }, QUEM);
  } else {
    negocio = await salvarNegocio(sb, clienteId, {
      etapa_id: etapa.id,
      titulo: pessoa.nome || pessoa.email || pessoa.telefone,
      telefone: pessoa.telefone || undefined,
      email: pessoa.email || undefined,
      origem_id: await origem(sb, clienteId),
      etiquetas: ["comunidade", etiqueta],
      score: 20,
    }, QUEM);
  }
  await nota(sb, clienteId, negocio,
    `Concluiu o curso "${curso}" na comunidade${r.score ? ` com nota ${r.score}` : ""}. Bom momento para oferecer o curso pago.`);
  return { negocio_id: negocio.id, novo: !ja };
}

/** Processa um evento guardado em comunidade_eventos. */
export async function processarComunidade(sb, eventoId) {
  const { data: ev, error } = await sb.from("comunidade_eventos").select("*").eq("id", eventoId).maybeSingle();
  if (error) throw new Error(error.message);
  if (!ev || ev.estado === "processado") return { ja: true };

  const corpo = ev.bruto || {};
  const tabela = String(corpo.table || ev.tabela || "");
  const tipo = String(corpo.type || ev.tipo || "").toUpperCase();
  const r = corpo.record || {};

  let resultado;
  if (tabela === "users" && (tipo === "INSERT" || tipo === "UPDATE")) resultado = await aoMembro(sb, ev.cliente_id, r);
  else if (tabela === "company_profiles" && tipo === "INSERT") resultado = await aEmpresa(sb, ev.cliente_id, r);
  else if (tabela === "certificates" && tipo === "INSERT") resultado = await aoCertificado(sb, ev.cliente_id, r);
  else resultado = { ignorado: `evento não usado: ${tabela} ${tipo}` };

  await sb.from("comunidade_eventos").update({
    estado: resultado.ignorado && !resultado.contato_id ? "ignorado" : "processado",
    erro: resultado.ignorado || null,
    negocio_id: resultado.negocio_id || null,
    processado_em: new Date().toISOString(),
  }).eq("id", ev.id);
  return resultado;
}
