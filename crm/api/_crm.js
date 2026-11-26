// CRM: contatos, etiquetas e disparo.
//
// Mora num arquivo com underscore porque `api/` está no teto de 12 funções do
// plano Hobby: quem expõe isto na web é `painel-conversas.js`, por `?rota=`.
//
// A ideia que organiza o arquivo: `contatos` é a pessoa, `conversas` é o que
// ela falou. A pessoa sobrevive à conversa. Quem comprou em agosto e nunca
// mais escreveu não tem conversa viva, mas continua cliente e continua podendo
// receber disparo. Por isso o cruzamento entre as duas é pelo telefone, e não
// por chave estrangeira: casar tabela viva custa mais do que resolve.

import { credenciaisDoCanal } from "./_db.js";
import { paraE164, chaveTelefone, variantesE164 } from "./_telefone.js";
import { listarTarefas, listarNotas, score } from "./_comercial.js";

// Etiqueta fixa de origem. Fixa porque o quadro e os filtros contam por ela:
// se cada disparo escrevesse a sua, nao daria para somar nada.
export const ETIQUETA_DISPARO = "veio do disparo";
import { enviarTexto, enviarMidia, enviarTemplate, esperar, listarTemplates } from "./_wa.js";
import { filaDoBanco, rodarLote, LOTE } from "./_disparo.js";
import { frenteDaCampanha } from "./_frentes.js";
import { canonizar, chave } from "./_etiquetas.js";

// A janela da Meta é de 24h. Uso 23h30 para não mandar uma mensagem que sai
// daqui dentro do prazo e chega na Meta fora dele.
const JANELA_MS = 23.5 * 3_600_000;

// O tamanho do lote mora em `_disparo.js`, junto da reserva que o usa.

// Respiro entre mensagens. A Cloud API aguenta bem mais que isso no tier
// padrão; o que este intervalo protege é a reputação do número, que cai quando
// centenas de mensagens saem no mesmo segundo.
const PAUSA_MS = 350;

// ---------------------------------------------------------------------------
// Contatos

export async function etiquetasDoCliente(sb, clienteId) {
  const { data } = await sb.from("contatos").select("etiquetas").eq("cliente_id", clienteId);
  const conta = new Map();
  for (const linha of data || []) {
    for (const e of linha.etiquetas || []) conta.set(e, (conta.get(e) || 0) + 1);
  }
  return [...conta.entries()]
    .map(([nome, quantos]) => ({ nome, quantos }))
    .sort((a, b) => b.quantos - a.quantos || a.nome.localeCompare(b.nome));
}

export async function listarContatos(sb, clienteId, q = {}) {
  let consulta = sb.from("contatos")
    .select("id, telefone_e164, nome, email, etiquetas, origem, opt_out, ultima_interacao_em, criado_em,"
      + " empresa, documento, responsavel_id, score, canal, atendentes(nome)",
      { count: "exact" })
    .eq("cliente_id", clienteId);

  // Vírgula e parênteses são sintaxe do `or` do PostgREST: se entrarem no
  // termo, a consulta vira outra coisa. Saem aqui, igual em `painel-conversas`.
  const busca = String(q.busca || "").replace(/[,()%*\\]/g, "").trim();
  if (busca) {
    // Documento entra na busca só com dígito: quem digita "12.345" procura o
    // mesmo CPF de quem digita "12345".
    const digitos = soDigitos(busca);
    const porDocumento = digitos.length >= 3 ? `,documento.ilike.%${digitos}%` : "";
    consulta = consulta.or(
      `nome.ilike.%${busca}%,telefone_e164.ilike.%${busca}%,email.ilike.%${busca}%`
      + `,empresa.ilike.%${busca}%${porDocumento}`);
  }
  if (q.etiqueta) consulta = consulta.contains("etiquetas", [q.etiqueta]);
  if (q.origem) consulta = consulta.eq("origem", q.origem);
  if (q.opt_out === "1") consulta = consulta.eq("opt_out", true);

  const { data, error, count } = await consulta
    .order("ultima_interacao_em", { ascending: false, nullsFirst: false })
    .order("criado_em", { ascending: false })
    .limit(Math.min(Number(q.limite) || 200, 500));

  if (error) throw new Error(error.message);
  return { contatos: data || [], total: count || 0 };
}

/**
 * Tudo que já aconteceu com uma pessoa, num lugar só.
 *
 * É a tela que ele pediu para "manter o contato com esse cliente": as conversas
 * dela, as passagens pela mão de alguém e os disparos que ela recebeu. O
 * cruzamento com `conversas` é pela chave de telefone, que ignora o nono
 * dígito e o código do país.
 */
export async function historicoDoContato(sb, clienteId, contatoId) {
  const { data: contato } = await sb.from("contatos")
    .select("*").eq("id", contatoId).eq("cliente_id", clienteId).maybeSingle();
  if (!contato) return null;

  const chave = chaveTelefone(contato.telefone_e164);

  const [conversas, disparos] = await Promise.all([
    sb.from("conversas")
      .select("id, canal, contato, telefone, nome_contato, modo, score, etiquetas, ultima_em, criado_em")
      .eq("cliente_id", clienteId)
      .order("ultima_em", { ascending: false })
      .limit(200),
    sb.from("disparo_envios")
      .select("estado, motivo, enviado_em, disparos(id, nome, texto, criado_em)")
      .eq("telefone", contato.telefone_e164)
      .order("enviado_em", { ascending: false, nullsFirst: false })
      .limit(30),
  ]);

  // O filtro por chave é aqui, e não no banco, porque `conversas` guarda o
  // telefone cru e não tem coluna normalizada para comparar no SQL.
  const minhas = (conversas.data || []).filter(
    (c) => chaveTelefone(c.contato || c.telefone) === chave);

  const atendimentos = minhas.length
    ? (await sb.from("atendimentos")
      .select("id, conversa_id, entrou_fila, assumida_em, encerrada_em, desfecho, motivo, atendentes(nome)")
      .in("conversa_id", minhas.map((c) => c.id))
      .order("entrou_fila", { ascending: false })).data || []
    : [];

  // O lado comercial da ficha: as oportunidades da pessoa, o que está
  // marcado para fazer com ela e o que a equipe anotou. Falha em qualquer um
  // não derruba a ficha inteira, que é o que interessa a quem atende.
  const [negocios, tarefas, notas] = await Promise.all([
    sb.from("crm_negocios")
      .select("id, titulo, valor, valor_fechado, situacao, etapa_id, funil_id, prioridade,"
        + " previsao_em, criado_em, fechado_em, crm_etapas(nome, cor)")
      .eq("cliente_id", clienteId).eq("contato_id", contatoId)
      .order("criado_em", { ascending: false }).limit(50)
      .then((r) => r.data || [], () => []),
    listarTarefas(sb, clienteId, { contato: contatoId, concluidas: "1" }).catch(() => []),
    listarNotas(sb, clienteId, { contato: contatoId }).catch(() => []),
  ]);

  return {
    contato,
    conversas: minhas,
    atendimentos,
    disparos: disparos.data || [],
    negocios,
    tarefas,
    notas,
  };
}

/**
 * Gente que PODE ser a mesma pessoa.
 *
 * Isto não mescla nada, de propósito. Duas linhas com o mesmo e-mail podem ser
 * mãe e filha com a conta de casa, e juntar automaticamente apagaria uma
 * pessoa de verdade do cadastro, com as conversas dela. O que a função faz é
 * apontar; quem decide é gente.
 *
 * O telefone não entra aqui porque ele já é único por empresa, com índice: o
 * upsert de `salvarContato` impede o duplicado na origem.
 */
export async function possiveisDuplicados(sb, clienteId) {
  const { data } = await sb.from("contatos")
    .select("id, nome, telefone_e164, email, documento, empresa, criado_em")
    .eq("cliente_id", clienteId).limit(5000);

  const grupos = new Map();
  for (const c of data || []) {
    for (const [tipo, valor] of [["documento", c.documento], ["email", (c.email || "").toLowerCase().trim()]]) {
      if (!valor) continue;
      const chave = `${tipo}:${valor}`;
      if (!grupos.has(chave)) grupos.set(chave, { tipo, valor, contatos: [] });
      grupos.get(chave).contatos.push(c);
    }
  }
  return [...grupos.values()]
    .filter((g) => g.contatos.length > 1)
    .sort((a, b) => b.contatos.length - a.contatos.length)
    .slice(0, 100);
}

export async function salvarContato(sb, clienteId, corpo) {
  const telefone = paraE164(corpo.telefone_e164 || corpo.telefone);
  if (!telefone) throw new Error("Telefone inválido.");

  const linha = {
    cliente_id: clienteId,
    telefone_e164: telefone,
    nome: corpo.nome?.trim() || null,
    email: corpo.email?.trim() || null,
    etiquetas: limparEtiquetas(corpo.etiquetas),
    atualizado_em: new Date().toISOString(),
  };
  if (typeof corpo.opt_out === "boolean") linha.opt_out = corpo.opt_out;
  if (corpo.origem) linha.origem = corpo.origem;

  // A ficha comercial (migração 037). Cada campo só é escrito quando veio na
  // requisição: um formulário parcial não pode apagar o que outra tela gravou.
  if (corpo.empresa !== undefined) linha.empresa = String(corpo.empresa || "").trim().slice(0, 160) || null;
  if (corpo.documento !== undefined) linha.documento = soDigitos(corpo.documento) || null;
  if (corpo.responsavel_id !== undefined) linha.responsavel_id = corpo.responsavel_id || null;
  if (corpo.origem_id !== undefined) linha.origem_id = corpo.origem_id || null;
  if (corpo.canal !== undefined) linha.canal = String(corpo.canal || "").trim().slice(0, 40) || null;
  // Em branco é nulo, não zero: a regra inteira mora em `score`, no
  // _comercial.js, para o contato e o negócio responderem igual.
  if (corpo.score !== undefined) linha.score = score(corpo.score);
  if (corpo.campos !== undefined && corpo.campos && typeof corpo.campos === "object") {
    linha.campos = corpo.campos;
  }

  const { data, error } = await sb.from("contatos")
    .upsert(linha, { onConflict: "cliente_id,telefone_e164" })
    .select().single();
  if (error) throw new Error(error.message);
  return data;
}

/**
 * CPF e CNPJ guardados só com dígito.
 *
 * Com pontuação, o mesmo documento entra como três registros diferentes
 * conforme quem digitou, e a busca por duplicado nunca acha nada.
 */
export function soDigitos(v) {
  return String(v ?? "").replace(/\D/g, "").slice(0, 20);
}

function limparEtiquetas(bruto) {
  const lista = Array.isArray(bruto) ? bruto : String(bruto || "").split(/[;,]/);
  const vistas = new Set();
  for (const e of lista) {
    const limpo = String(e).trim().toLowerCase().replace(/\s+/g, " ");
    if (limpo) vistas.add(limpo);
  }
  return [...vistas].slice(0, 20);
}

/**
 * Importa uma lista, vinda de CSV colado ou de arquivo.
 *
 * Telefone repetido atualiza em vez de duplicar, e o que já tinha nome não
 * perde o nome por causa de uma célula vazia na planilha nova. Linha sem
 * telefone válido não entra e volta na resposta com o motivo: importação que
 * engole erro em silêncio é a que faz a pessoa descobrir no disparo.
 */
export async function importarContatos(sb, clienteId, linhas, etiquetasExtras = []) {
  const extras = limparEtiquetas(etiquetasExtras);
  const bons = new Map();
  const recusadas = [];

  for (const [i, bruta] of (linhas || []).entries()) {
    const telefone = paraE164(bruta.telefone);
    if (!telefone) {
      recusadas.push({ linha: i + 1, valor: String(bruta.telefone || ""), motivo: "telefone inválido" });
      continue;
    }
    const anterior = bons.get(telefone);
    bons.set(telefone, {
      cliente_id: clienteId,
      telefone_e164: telefone,
      nome: bruta.nome?.trim() || anterior?.nome || null,
      email: bruta.email?.trim() || anterior?.email || null,
      etiquetas: limparEtiquetas([
        ...(anterior?.etiquetas || []), ...(bruta.etiquetas || []), ...extras,
      ]),
      origem: "importado",
      atualizado_em: new Date().toISOString(),
    });
  }

  const novas = [...bons.values()];
  if (!novas.length) return { gravados: 0, repetidos: 0, recusadas };

  // Quem já existe mantém nome e e-mail e ganha as etiquetas novas, em vez de
  // ser sobrescrito. Importar a lista da turma não pode apagar o nome que veio
  // da lista de compradores.
  const { data: existentes } = await sb.from("contatos")
    .select("telefone_e164, nome, email, etiquetas")
    .eq("cliente_id", clienteId)
    .in("telefone_e164", novas.map((n) => n.telefone_e164));

  const porTelefone = new Map((existentes || []).map((e) => [e.telefone_e164, e]));
  for (const nova of novas) {
    const velha = porTelefone.get(nova.telefone_e164);
    if (!velha) continue;
    nova.nome = nova.nome || velha.nome;
    nova.email = nova.email || velha.email;
    nova.etiquetas = limparEtiquetas([...(velha.etiquetas || []), ...nova.etiquetas]);
  }

  const { error } = await sb.from("contatos")
    .upsert(novas, { onConflict: "cliente_id,telefone_e164" });
  if (error) throw new Error(error.message);

  return { gravados: novas.length, repetidos: porTelefone.size, recusadas };
}

/**
 * CSV simples, em texto. Aceita vírgula ou ponto e vírgula.
 *
 * Sem biblioteca de propósito: a planilha que ele vai colar tem quatro colunas
 * e nenhum campo com separador dentro de aspas. Uma dependência a mais em
 * `api/` é peso em toda função fria.
 */
export function lerCsv(texto) {
  const linhas = String(texto || "").split(/\r?\n/).filter((l) => l.trim());
  if (!linhas.length) return [];

  const virgulas = (linhas[0].match(/,/g) || []).length;
  const pontos = (linhas[0].match(/;/g) || []).length;
  const separador = pontos > virgulas ? ";" : ",";
  const corta = (l) => l.split(separador).map((c) => c.trim().replace(/^"|"$/g, ""));

  const cabecalho = corta(linhas[0]).map((c) => c.toLowerCase());
  const temCabecalho = cabecalho.some((c) => /telefone|whats|celular|fone|nome|email/.test(c));

  const achar = (...nomes) => cabecalho.findIndex((c) => nomes.some((n) => c.includes(n)));
  const iTel = temCabecalho ? achar("telefone", "whats", "celular", "fone") : 0;
  const iNome = temCabecalho ? achar("nome") : 1;
  const iMail = temCabecalho ? achar("email", "e-mail") : 2;
  const iEtiq = temCabecalho ? achar("etiqueta", "tag", "grupo") : 3;

  return linhas.slice(temCabecalho ? 1 : 0).map((l) => {
    const c = corta(l);
    const pega = (i) => (i >= 0 && c[i] !== undefined ? c[i] : "");
    return {
      telefone: pega(iTel >= 0 ? iTel : 0),
      nome: pega(iNome),
      email: pega(iMail),
      etiquetas: pega(iEtiq) ? pega(iEtiq).split(/[|/]/) : [],
    };
  });
}

// ---------------------------------------------------------------------------
// Disparo

/**
 * Quem vai receber, pelas etiquetas escolhidas.
 *
 * `opt_out` nunca entra. É regra daqui e não da tela, porque a tela erra e o
 * banco não: quem pediu para parar de receber tem que sumir de toda contagem,
 * inclusive da que a pessoa olha antes de apertar o botão.
 */
export async function publicoDo(sb, clienteId, publico = {}) {
  let consulta = sb.from("contatos")
    .select("id, telefone_e164, nome, ultima_interacao_em")
    .eq("cliente_id", clienteId)
    .eq("opt_out", false);

  const etiquetas = (publico.etiquetas || []).filter(Boolean);
  if (etiquetas.length) consulta = consulta.overlaps("etiquetas", etiquetas);

  const { data, error } = await consulta.limit(5000);
  if (error) throw new Error(error.message);
  return data || [];
}

export async function listarDisparos(sb, clienteId) {
  const { data, error } = await sb.from("disparos")
    .select("id, nome, texto, estado, totais, publico, criado_por, criado_em, iniciado_em, concluido_em, frente_id,"
      + " midias(chave, tipo, url), links(chave, url, cliques, destino_rotulo)")
    .eq("cliente_id", clienteId)
    .order("criado_em", { ascending: false })
    .limit(50);
  if (error) throw new Error(error.message);
  return data || [];
}

export async function verDisparo(sb, clienteId, id) {
  const { data: disparo } = await sb.from("disparos")
    .select("*, midias(chave, tipo, url, wa_media_id), links(chave, url, cliques, destino_rotulo)")
    .eq("id", id).eq("cliente_id", clienteId).maybeSingle();
  if (!disparo) return null;

  const { data: envios } = await sb.from("disparo_envios")
    .select("telefone, estado, motivo, enviado_em")
    .eq("disparo_id", id)
    .order("enviado_em", { ascending: false, nullsFirst: false })
    .limit(500);

  // Os sete estados, sempre presentes mesmo em zero: a tela soma estas chaves,
  // e uma chave ausente apareceria como "undefined" em vez de "0".
  const contagem = {
    pendente: 0, reservado: 0, enviando: 0,
    enviado: 0, falhou: 0, pulado: 0, desconhecido: 0,
  };
  for (const e of envios || []) contagem[e.estado] = (contagem[e.estado] || 0) + 1;

  return { disparo, envios: envios || [], contagem };
}

/**
 * Cria o disparo e já grava uma linha por destinatário, em `pendente`.
 *
 * Gravar a lista inteira antes de mandar a primeira mensagem é o que permite
 * processar em lote, retomar de onde parou se o navegador fechar e dizer depois
 * quem recebeu o quê. O `unique (disparo_id, telefone)` é a trava contra mandar
 * duas vezes para a mesma pessoa.
 */
export async function criarDisparo(sb, clienteId, corpo, quem) {
  if (!corpo.texto?.trim()) throw new Error("Escreva o texto da mensagem.");
  if (!corpo.nome?.trim()) throw new Error("Dê um nome ao disparo, para achar depois.");

  const alvo = await publicoDo(sb, clienteId, corpo.publico || {});
  if (!alvo.length) throw new Error("Nenhum contato bate com essas etiquetas.");

  // De que frente é esta campanha. Opcional, e é só procedência: quem atende a
  // resposta continua sendo decidido pela intenção de quem escreveu, não por
  // esta coluna. A chave estrangeira composta recusa frente de outra empresa;
  // isto confere antes para a mensagem ser legível.
  const frenteId = await frenteDaCampanha(sb, clienteId, corpo.frente_id || corpo.frente);

  const { data: disparo, error } = await sb.from("disparos").insert({
    cliente_id: clienteId,
    frente_id: frenteId,
    nome: corpo.nome.trim(),
    texto: corpo.texto.trim(),
    midia_id: corpo.midia_id || null,
    link_id: corpo.link_id || null,
    template_nome: corpo.template_nome || null,
    template_idioma: corpo.template_idioma || "pt_BR",
    publico: corpo.publico || {},
    estado: "rascunho",
    totais: { alvo: alvo.length, enviados: 0, falhas: 0 },
    criado_por: quem || null,
  }).select().single();
  if (error) throw new Error(error.message);

  const envios = alvo.map((c) => ({
    disparo_id: disparo.id,
    contato_id: c.id,
    telefone: c.telefone_e164,
    estado: "pendente",
  }));

  const { error: erroEnvios } = await sb.from("disparo_envios").insert(envios);
  if (erroEnvios) throw new Error(erroEnvios.message);

  return { disparo, alvo: alvo.length };
}

/**
 * O texto final, com o link rastreado colado no fim.
 *
 * O número da Lia não vai como `wa.me` direto: vai como link curto deste
 * domínio, que conta o clique e redireciona. É assim que se sabe que a pessoa
 * foi falar com ela, já que depois disso a conversa acontece fora daqui.
 */
export function montarTexto(disparo, base) {
  const texto = disparo.texto;
  const link = disparo.links;
  if (!link?.chave) return texto;

  const curto = `${base}/l/${link.chave}`;
  if (texto.includes(curto)) return texto;
  return `${texto}\n\n${link.destino_rotulo || "Fale aqui"}: ${curto}`;
}

/**
 * Manda uma mensagem só, para um número digitado na hora.
 *
 * É o teste que ele faz no próprio número antes de soltar. Não grava em
 * `disparo_envios` de propósito: teste não é destinatário, e contaminar a
 * contagem do disparo com os próprios testes é como se perde a conta de quantos
 * clientes de verdade receberam.
 */
export async function testarDisparo(sb, clienteId, id, telefoneBruto, base) {
  const para = paraE164(telefoneBruto);
  if (!para) throw new Error("Telefone de teste inválido.");

  const visto = await verDisparo(sb, clienteId, id);
  if (!visto) throw new Error("Disparo não encontrado.");

  const cliente = await credenciaisDoCanal(clienteId, "whatsapp");
  if (!cliente?.wa_phone_number_id || !cliente?.wa_token) {
    throw new Error("O WhatsApp deste cliente não está conectado.");
  }

  const quantas = visto.disparo.template_nome
    ? await variaveisDoTemplate(cliente, visto.disparo.template_nome)
    : null;

  const r = await entregar(cliente, para.replace("+", ""), visto.disparo, base, quantas);
  await sb.from("disparos").update({ estado: "testando" }).eq("id", id);
  return { ok: true, para, wa_message_id: r?.messages?.[0]?.id || null };
}

/** A entrega em si: template, imagem com legenda, ou texto puro. */
/**
 * Quantas variaveis o corpo do template aprovado tem.
 *
 * Existe porque a Meta conta os parametros: mandar um {{1}} para um modelo que
 * nao tem nenhum volta 132000 e NAO entrega, e mandar nenhum para um modelo
 * que tem volta o mesmo erro. Os dois casos existem de verdade aqui, porque o
 * `ousadia_aviso` leva o recado numa variavel e o `ousadia_black_mentoria` tem
 * a campanha inteira escrita e aprovada dentro do corpo.
 *
 * Uma consulta por disparo, nao por numero: 297 chamadas a mais para descobrir
 * a mesma coisa 297 vezes seria o jeito caro de errar.
 *
 * Nao achou o modelo na lista: devolve null, e quem chama manda do jeito
 * antigo. Adivinhar aqui transformaria uma falha de leitura em disparo mudo.
 */
async function variaveisDoTemplate(cliente, nome) {
  try {
    const lista = await listarTemplates(cliente);
    const t = (lista || []).find((x) => x.name === nome);
    if (!t) return null;

    const corpo = (t.components || []).find((c) => c.type === "BODY");
    const achadas = new Set(String(corpo?.text || "").match(/\{\{\s*\d+\s*\}\}/g) || []);
    return achadas.size;
  } catch (e) {
    console.warn("[disparo] não deu para ler o modelo aprovado:", e.message);
    return null;
  }
}

async function entregar(cliente, para, disparo, base, variaveisEsperadas) {
  const texto = montarTexto(disparo, base);

  if (disparo.template_nome) {
    // O recado da campanha pode entrar como {{1}} do corpo aprovado, quando o
    // modelo tem variavel. Quando a campanha inteira ja esta escrita e
    // aprovada dentro do corpo, nao vai parametro nenhum.
    //
    // O link NÃO vai aqui: num template com botão de URL ele mora no botão,
    // que é fixo e aprovado junto. Por isso vai `disparo.texto` cru, e não o
    // `montarTexto`, que colaria o link curto de novo dentro do corpo.
    const recado = String(disparo.texto || "").replace(/\s+/g, " ").trim().slice(0, 900);
    const quantas = variaveisEsperadas == null ? (recado ? 1 : 0) : variaveisEsperadas;

    return enviarTemplate(
      cliente, para, disparo.template_nome, disparo.template_idioma || "pt_BR",
      Array.from({ length: quantas }, (_, i) => (i === 0 ? recado : " ")),
    );
  }

  const midia = disparo.midias;
  if (midia) {
    // Uma mensagem só, imagem com legenda. Mandar a imagem e o texto separados
    // dobra a chance de a pessoa ver só metade, e dobra o custo.
    return enviarMidia(cliente, para, {
      tipo: midia.tipo || "image",
      wa_media_id: midia.wa_media_id,
      url: midia.url,
      legenda: texto.slice(0, 1024),
    });
  }

  return enviarTexto(cliente, para, texto);
}

/**
 * Processa um lote de pendentes. A tela chama de novo até acabar.
 *
 * Fora da janela de 24h o WhatsApp só aceita template aprovado. Quando não há
 * template escolhido, os de fora da janela são marcados `pulado` com o motivo
 * escrito, em vez de virarem erro da Meta: falha explicada vale mais que
 * quarenta linhas de "Cloud API 400".
 */
export async function enviarLote(sb, clienteId, id, base) {
  // Trava de liberação da Etapa 0. Enquanto a variável não estiver ligada,
  // nenhuma mensagem sai, nem por acidente, nem por alguém apertando o botão
  // na tela. Nada foi perdido por isso: nenhum disparo jamais saiu deste
  // sistema, então não existe campanha no meio para interromper.
  if (process.env.DISPARO_ENVIO_REAL !== "1") {
    throw new Error(
      "O envio real está desligado nesta instalação (DISPARO_ENVIO_REAL). "
      + "O mecanismo novo de reserva está instalado e testado, e espera liberação.",
    );
  }

  const visto = await verDisparo(sb, clienteId, id);
  if (!visto) throw new Error("Disparo não encontrado.");
  const { disparo } = visto;

  const cliente = await credenciaisDoCanal(clienteId, "whatsapp");
  if (!cliente?.wa_phone_number_id || !cliente?.wa_token) {
    throw new Error("O WhatsApp deste cliente não está conectado.");
  }

  if (disparo.estado !== "enviando") {
    await sb.from("disparos")
      .update({ estado: "enviando", iniciado_em: disparo.iniciado_em || new Date().toISOString() })
      .eq("id", id);
  }

  // Quem falou com a gente nas últimas 24h pode receber texto livre. O resto
  // só com template. A leitura é uma por lote, antes de reservar: o conjunto
  // não muda por causa de quem foi reservado.
  const corte = new Date(Date.now() - JANELA_MS).toISOString();
  const abertos = new Set();
  if (!disparo.template_nome) {
    const { data: recentes } = await sb.from("conversas")
      .select("contato, telefone, ultima_em")
      .eq("cliente_id", clienteId).gte("ultima_em", corte).limit(1000);
    for (const c of recentes || []) {
      const k = chaveTelefone(c.contato || c.telefone);
      if (k) abertos.add(k);
    }
  }

  // Uma leitura por lote, nao por numero. O que ela responde decide se vai
  // parametro no template, e parametro a mais ou a menos nao entrega nada.
  const quantas = disparo.template_nome
    ? await variaveisDoTemplate(cliente, disparo.template_nome)
    : null;

  const resultado = await rodarLote({
    fila: filaDoBanco(sb),
    disparoId: id,
    // Fora da janela e sem template aprovado: falha explicada vale mais que
    // quarenta linhas de "Cloud API 400". Devolver o motivo em vez de `true`
    // é o que marca a linha como `pulado`.
    podeSair: (envio) => (
      disparo.template_nome || abertos.has(chaveTelefone(envio.telefone))
        ? true
        : "fora da janela de 24h e o disparo não tem template aprovado"
    ),
    respirar: () => esperar(PAUSA_MS),
    entregar: (envio) => entregar(
      cliente, envio.telefone.replace("+", ""), disparo, base, quantas,
    ),
  });

  const depois = await verDisparo(sb, clienteId, id);

  await sb.from("disparos").update({
    estado: resultado.acabou ? "concluido" : "enviando",
    concluido_em: resultado.acabou ? new Date().toISOString() : null,
    totais: {
      alvo: disparo.totais?.alvo || depois.envios.length,
      enviados: depois.contagem.enviado,
      falhas: depois.contagem.falhou,
      pulados: depois.contagem.pulado,
      desconhecidos: depois.contagem.desconhecido,
    },
  }).eq("id", id);

  return { ...resultado, contagem: depois.contagem };
}

/**
 * Carimba na conversa de onde ela veio, quando veio de um disparo.
 *
 * Sem isto o quadro mostra trinta conversas iguais e ninguem sabe quais sao
 * gente que escreveu sozinha e quais sao gente que so respondeu a uma
 * campanha. As duas pedem atendimento diferente, e a segunda mede a campanha.
 *
 * Roda a cada mensagem que entra, mas so escreve uma vez: se a etiqueta ja
 * esta la, sai calada. Nunca derruba as etiquetas que a IA ja pos.
 *
 * Nunca deixa a mensagem da pessoa esperar: quem chama ignora o erro.
 */
export async function marcarOrigemDisparo(sb, clienteId, conversa) {
  if (!conversa?.id || !conversa.contato) return null;
  // Por chave, porque a etiqueta pode estar gravada em qualquer grafia.
  if ((conversa.etiquetas || []).some((e) => chave(e) === chave(ETIQUETA_DISPARO))) return null;

  const formas = variantesE164(conversa.contato);
  if (!formas.length) return null;

  // 7 dias: resposta a disparo chega em horas, mas gente que so le o WhatsApp
  // no fim de semana existe. Depois disso a conversa e nova de verdade.
  const desde = new Date(Date.now() - 7 * 86400000).toISOString();

  const { data: envios } = await sb
    .from("disparo_envios")
    .select("disparo_id, disparos!inner(nome, cliente_id)")
    .in("telefone", formas)
    .eq("estado", "enviado")
    .eq("disparos.cliente_id", clienteId)
    .gte("enviado_em", desde)
    .order("enviado_em", { ascending: false })
    .limit(1);

  const envio = envios?.[0];
  if (!envio) return null;

  // Duas etiquetas de proposito: a fixa e para filtrar e contar sempre do
  // mesmo jeito, o nome da campanha e para o atendente saber do que a pessoa
  // esta falando antes de abrir a conversa.
  // O nome da campanha vem do que alguem digitou no formulario do disparo, e
  // ia direto para a conversa sem passar pela lista do cliente. Era por aqui
  // que "Black da Mentoria OM" conviveu com "black da mentoria om": a IA grava a
  // canonica pela `canonizar` e esta funcao gravava o nome cru. Foi o que
  // criou as familias de duplicadas que a 041 limpou, e ia recriar.
  const nome = String(envio.disparos?.nome || "").trim().slice(0, 40);
  const { etiquetas } = await canonizar(
    sb, clienteId,
    [ETIQUETA_DISPARO, ...(nome ? [nome] : [])],
    conversa.etiquetas || [],
  );
  await sb.from("conversas").update({ etiquetas }).eq("id", conversa.id);
  conversa.etiquetas = etiquetas;
  return etiquetas;
}
