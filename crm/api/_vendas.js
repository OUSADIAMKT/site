// Vendas da HeroSpark dentro do CRM.
//
// O caminho: a HeroSpark avisa (api/vendas.js) -> o evento é guardado inteiro
// em `vendas_eventos` -> a fila chama `processarVenda` -> o negócio da pessoa
// reflete a venda:
//
//   aprovada     o negócio aberto da pessoa vai para a etapa de ganho, com o
//                valor pago; sem negócio aberto, nasce um já ganho. Etiqueta
//                "aluno" e nota com o resumo.
//   reembolsada  o negócio ganho por aquela venda vai para perdido, com o
//                motivo "reembolso".
//   pendente     boleto/Pix gerado e não pago: nota no negócio aberto e tarefa
//                de recuperação para o dono.
//
// A HeroSpark não publica o formato do webhook. Por isso `lerVenda` procura
// os nomes de campo de costume em qualquer nível do JSON, e o que ela não
// entende vira "ignorado" sem se perder: depois da primeira venda real,
// ajusta-se a leitura aqui e roda-se scripts/reprocessar-vendas.js.

import { paraE164 } from "./_telefone.js";
import { salvarNegocio } from "./_negocios.js";
import { salvarTarefa } from "./_comercial.js";

export const QUEM = "HeroSpark";

// ---------------------------------------------------------------------------
// Leitura tolerante

function achatar(obj, prefixo = "", saida = {}) {
  if (obj === null || obj === undefined) return saida;
  if (Array.isArray(obj)) {
    obj.slice(0, 5).forEach((v, i) => achatar(v, `${prefixo}${i}.`, saida));
    return saida;
  }
  if (typeof obj === "object") {
    for (const [k, v] of Object.entries(obj)) achatar(v, `${prefixo}${k.toLowerCase()}.`, saida);
    return saida;
  }
  saida[prefixo.slice(0, -1)] = obj;
  return saida;
}

/**
 * O primeiro valor cujo caminho termina num dos nomes pedidos, preferindo o
 * que está dentro de um dos "donos" (buyer, customer...). Ex.: para "email",
 * `buyer.email` ganha de `producer.email`.
 */
function campo(plano, nomes, { donos = [], evitar = [] } = {}) {
  const candidatos = Object.entries(plano).filter(([caminho, v]) => {
    if (v === "" || v === null || v === undefined) return false;
    const ultimo = caminho.split(".").at(-1);
    if (!nomes.includes(ultimo)) return false;
    return !evitar.some((e) => caminho.split(".").includes(e));
  });
  if (!candidatos.length) return null;
  const nota = ([c]) => (donos.some((d) => c.split(".").includes(d)) ? 0 : 1) + c.split(".").length / 100;
  candidatos.sort((a, b) => nota(a) - nota(b));
  return candidatos[0][1];
}

const PESSOA = ["buyer", "customer", "client", "cliente", "comprador", "student", "aluno", "user", "contact"];
const NAO_PESSOA = ["producer", "produtor", "affiliate", "afiliado", "seller", "owner"];

const APROVADA = ["approved", "aprovada", "aprovado", "paid", "pago", "paga", "completed", "complete",
  "confirmed", "confirmada", "active", "ativa", "purchase_approved", "sale_approved", "order_paid", "succeeded"];
const REEMBOLSADA = ["refunded", "reembolsada", "reembolsado", "refund", "chargeback", "estornada",
  "estornado", "canceled", "cancelled", "cancelada", "cancelado", "purchase_refunded", "sale_refunded"];
const PENDENTE = ["pending", "pendente", "waiting_payment", "aguardando_pagamento", "billet_printed",
  "boleto_gerado", "pix_gerado", "waiting", "processing", "purchase_pending"];

export function statusDa(texto) {
  const t = String(texto || "").toLowerCase().trim().replace(/[\s.-]+/g, "_");
  if (!t) return "desconhecido";
  const tem = (lista) => lista.some((x) => t === x || t.endsWith(`_${x}`) || t.includes(x));
  if (tem(REEMBOLSADA)) return "reembolsada";
  if (tem(PENDENTE)) return "pendente";
  if (tem(APROVADA)) return "aprovada";
  return "desconhecido";
}

function numero(v) {
  if (v === null || v === undefined || v === "") return null;
  if (typeof v === "number") return v;
  const s = String(v).replace(/[^\d,.-]/g, "");
  // "1.234,56" (BR) ou "1234.56"
  const n = s.includes(",") ? Number(s.replace(/\./g, "").replace(",", ".")) : Number(s);
  return Number.isFinite(n) ? n : null;
}

/** O que dá para entender do evento. Nada aqui lança: o que falta vem nulo. */
export function lerVenda(bruto) {
  const plano = achatar(bruto || {});
  const statusBruto = campo(plano, ["status", "event", "evento", "type", "tipo", "situation", "situacao", "state"],
    { donos: ["sale", "venda", "purchase", "order", "transaction", "data"], evitar: ["product", "produto"] });
  let valor = numero(campo(plano, ["value", "valor", "amount", "price", "preco", "total", "net_value",
    "sale_value", "total_value", "paid_value", "full_price"], { donos: ["sale", "venda", "purchase", "payment", "order"] }));
  // Centavos: valor inteiro grande e o campo diz "cents"/"centavos".
  if (valor !== null && Object.keys(plano).some((k) => /cents|centavos/.test(k))) valor = valor / 100;
  const telefone = campo(plano, ["phone", "telefone", "celular", "whatsapp", "mobile", "cellphone", "phone_number"],
    { donos: PESSOA, evitar: NAO_PESSOA });
  const email = campo(plano, ["email", "e_mail", "mail"], { donos: PESSOA, evitar: NAO_PESSOA });

  const texto = (x) => (x === null || x === undefined ? null : String(x).slice(0, 200));
  return {
    status_venda: statusDa(statusBruto),
    id_externo: texto(campo(plano, ["transaction", "transaction_id", "sale_id", "order_id", "id_venda", "purchase_id",
      "code", "codigo", "id"], { donos: ["sale", "venda", "purchase", "order", "transaction"], evitar: ["product", "produto", ...PESSOA, ...NAO_PESSOA] })),
    produto_externo: texto(campo(plano, ["id", "product_id", "produto_id", "ucode", "code"], { donos: ["product", "produto", "offer", "course", "curso"] })),
    produto_nome: texto(campo(plano, ["name", "nome", "title", "titulo"], { donos: ["product", "produto", "offer", "course", "curso"], evitar: PESSOA.concat(NAO_PESSOA) })),
    valor,
    email: email ? String(email).trim().toLowerCase() : null,
    telefone: telefone ? paraE164(String(telefone)) : null,
    nome: texto(campo(plano, ["name", "nome", "full_name", "nome_completo", "first_name"], { donos: PESSOA, evitar: ["product", "produto", "offer", "course", ...NAO_PESSOA] })),
  };
}

// ---------------------------------------------------------------------------
// Processamento

async function produtoDaVenda(sb, clienteId, v) {
  const { data } = await sb.from("crm_produtos")
    .select("id, nome, valor, responsavel_id, herospark_ids, funil_id").eq("cliente_id", clienteId);
  const lista = data || [];
  const id = v.produto_externo != null ? String(v.produto_externo) : null;
  return lista.find((p) => id && (p.herospark_ids || []).includes(id))
    || lista.find((p) => v.produto_nome && p.nome.trim().toLowerCase() === String(v.produto_nome).trim().toLowerCase())
    || null;
}

async function funilPara(sb, clienteId, produto) {
  const { data: funis } = await sb.from("crm_funis")
    .select("id, entrada_automatica, ordem").eq("cliente_id", clienteId).eq("ativo", true).order("ordem");
  return (funis || []).find((f) => produto?.funil_id && f.id === produto.funil_id)
    || (funis || []).find((f) => f.entrada_automatica) || (funis || [])[0] || null;
}

async function etapaDoTipo(sb, clienteId, funilId, tipo) {
  const { data } = await sb.from("crm_etapas").select("id, tipo, ordem")
    .eq("cliente_id", clienteId).eq("funil_id", funilId).order("ordem");
  return (data || []).find((e) => e.tipo === tipo) || null;
}

async function negocioDaPessoa(sb, clienteId, v, situacao) {
  for (const [coluna, valor] of [["email", v.email], ["telefone", v.telefone]]) {
    if (!valor) continue;
    const { data } = await sb.from("crm_negocios")
      .select("id, funil_id, etiquetas, responsavel_id, titulo, contato_id")
      .eq("cliente_id", clienteId).eq("situacao", situacao).eq(coluna, valor)
      .order("criado_em", { ascending: false }).limit(1);
    if (data?.[0]) return data[0];
  }
  return null;
}

function resumo(v, produto) {
  const valor = v.valor !== null ? `R$ ${v.valor.toFixed(2).replace(".", ",")}` : "valor não informado";
  return `Venda HeroSpark ${v.status_venda}: ${produto?.nome || v.produto_nome || "produto não identificado"}, ${valor}`
    + (v.id_externo ? ` (transação ${v.id_externo})` : "");
}

async function nota(sb, clienteId, negocio, texto) {
  await sb.from("crm_notas").insert({
    cliente_id: clienteId, negocio_id: negocio.id, contato_id: negocio.contato_id || null, texto, autor: QUEM,
  });
}

/**
 * Processa um evento guardado. Devolve o que fez; quem chama grava o estado.
 * Idempotente: evento já processado não é processado de novo.
 */
export async function processarVenda(sb, eventoId) {
  const { data: ev, error } = await sb.from("vendas_eventos").select("*").eq("id", eventoId).maybeSingle();
  if (error) throw new Error(error.message);
  if (!ev) return { ignorado: "evento não existe" };
  if (ev.estado === "processado") return { ja: true };

  const v = lerVenda(ev.bruto);
  const fechar = async (estado, extra = {}) => {
    const { error: e } = await sb.from("vendas_eventos").update({
      ...v, estado, processado_em: new Date().toISOString(), ...extra,
    }).eq("id", ev.id);
    // Mesma transação com o mesmo status já registrada: é reenvio da HeroSpark.
    if (e?.code === "23505") {
      await sb.from("vendas_eventos").update({
        estado: "ignorado", erro: "evento repetido", processado_em: new Date().toISOString(),
      }).eq("id", ev.id);
      return { repetido: true };
    }
    if (e) throw new Error(e.message);
    return { estado, ...extra };
  };

  if (v.status_venda === "desconhecido") return fechar("ignorado", { erro: "status não reconhecido" });

  // Reenvio da HeroSpark: a mesma transação com o mesmo status já foi
  // processada. Confere ANTES de mexer no funil, senão o segundo envio
  // criaria outro negócio.
  if (v.id_externo) {
    const { data: antes } = await sb.from("vendas_eventos").select("id")
      .eq("cliente_id", ev.cliente_id).eq("fonte", ev.fonte).eq("id_externo", v.id_externo)
      .eq("status_venda", v.status_venda).eq("estado", "processado").limit(1);
    if (antes?.some((x) => x.id !== ev.id)) {
      await sb.from("vendas_eventos").update({
        estado: "ignorado", erro: "evento repetido", processado_em: new Date().toISOString(),
      }).eq("id", ev.id);
      return { repetido: true };
    }
  }
  if (!v.email && !v.telefone) return fechar("ignorado", { erro: "sem e-mail nem telefone do comprador" });

  const clienteId = ev.cliente_id;
  const produto = await produtoDaVenda(sb, clienteId, v);

  if (v.status_venda === "aprovada") {
    const aberto = await negocioDaPessoa(sb, clienteId, v, "aberto");
    const funil = aberto ? { id: aberto.funil_id } : await funilPara(sb, clienteId, produto);
    if (!funil) throw new Error("Nenhum funil ativo.");
    const ganho = await etapaDoTipo(sb, clienteId, funil.id, "ganho");
    if (!ganho) throw new Error("O funil não tem etapa de ganho.");

    const etiquetas = [...new Set([...(aberto?.etiquetas || []), "aluno"])];
    const negocio = await salvarNegocio(sb, clienteId, {
      ...(aberto ? { id: aberto.id } : {
        titulo: v.nome || v.email || v.telefone,
        telefone: v.telefone || undefined,
        email: v.email || undefined,
        responsavel_id: produto?.responsavel_id || null,
      }),
      etapa_id: ganho.id,
      etiquetas,
      ...(v.valor !== null ? { valor_fechado: v.valor, ...(aberto ? {} : { valor: v.valor }) } : {}),
      ...(!aberto && produto ? {
        produtos: [{ produto_id: produto.id, nome: produto.nome, quantidade: 1, valor_unitario: v.valor ?? produto.valor }],
      } : {}),
    }, QUEM);
    await nota(sb, clienteId, negocio, resumo(v, produto));
    return fechar("processado", { negocio_id: negocio.id, produto_id: produto?.id || null });
  }

  if (v.status_venda === "reembolsada") {
    // O negócio que esta transação ganhou; sem ele, o último ganho da pessoa.
    let alvo = null;
    if (v.id_externo) {
      const { data } = await sb.from("vendas_eventos").select("negocio_id")
        .eq("cliente_id", clienteId).eq("id_externo", v.id_externo).eq("status_venda", "aprovada").limit(1);
      if (data?.[0]?.negocio_id) {
        const { data: n } = await sb.from("crm_negocios").select("id, funil_id, contato_id")
          .eq("id", data[0].negocio_id).maybeSingle();
        alvo = n;
      }
    }
    alvo ||= await negocioDaPessoa(sb, clienteId, v, "ganho");
    if (!alvo) return fechar("ignorado", { erro: "reembolso sem venda correspondente no CRM" });

    const perdido = await etapaDoTipo(sb, clienteId, alvo.funil_id, "perdido");
    if (!perdido) throw new Error("O funil não tem etapa de perdido.");
    const negocio = await salvarNegocio(sb, clienteId, {
      id: alvo.id, etapa_id: perdido.id, motivo_texto: "Reembolso na HeroSpark",
    }, QUEM);
    await nota(sb, clienteId, negocio, resumo(v, produto));
    return fechar("processado", { negocio_id: negocio.id, produto_id: produto?.id || null });
  }

  // pendente: só faz sentido em quem já está no funil.
  const aberto = await negocioDaPessoa(sb, clienteId, v, "aberto");
  if (!aberto) return fechar("ignorado", { erro: "pagamento pendente de quem não está no funil" });
  await nota(sb, clienteId, aberto, resumo(v, produto));
  const dono = aberto.responsavel_id || produto?.responsavel_id || null;
  if (dono) {
    await salvarTarefa(sb, clienteId, {
      titulo: `Recuperar pagamento pendente: ${aberto.titulo}`,
      tipo: "mensagem",
      vence_em: new Date(Date.now() + 3600_000).toISOString(),
      negocio_id: aberto.id,
      responsavel_id: dono,
    }, QUEM);
  }
  return fechar("processado", { negocio_id: aberto.id, produto_id: produto?.id || null });
}
