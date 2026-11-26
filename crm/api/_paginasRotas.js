// O compositor de landing pages: rascunho, histórico, publicação, e a página
// publicada em si.
//
// Duas portas, exportadas separadamente:
//
//   atenderPaginas       o painel. Operador, e só operador: é tela de
//                        implantação, igual a Mídias e a Contexto.
//   servirPaginaPublica  /p/<slug> e o domínio do cliente. Sem sessão
//                        nenhuma, porque quem abre é o cliente final.
//
// Duas funções, e não uma com `if` no começo, para a diferença de porteiro
// ser estrutural e não uma linha que alguém pode mover. A rota pública NÃO
// aceita token e NÃO lê coluna de rascunho: o que a consulta não pede não
// vaza por descuido de resposta. As duas coisas estão no teste.
//
// Não é função própria da Vercel: o plano Hobby aceita 12 funções por deploy,
// e as 12 já estão em uso. Quem expõe estas duas portas é o api/report.js,
// que já é o handler de várias rotas, e o vercel.json reescreve os endereços
// bonitos para lá.

import { db } from "./_db.js";
import { barrouOperador } from "./_painel.js";
import {
  impressao, sanearConfiguracoes, conferirConteudo, conferirSlug,
  conferirAprovacao, conferirCorrespondencia, bytesDaPublicacao,
} from "./_paginas.js";
import { normalizarSlug } from "./_pagina.js";
import {
  normalizarDominio, dominioValido, registrar, estado as estadoDoDominio,
  remover, hospedagemPronta, comoConfigurar,
} from "./_dominios.js";

// Só as colunas que o painel precisa para listar. O corpo dos arquivos não
// entra: a listagem de dez páginas carregaria alguns megabytes sem motivo.
const COLUNAS_LISTA = `
  id, cliente_id, slug, titulo, configuracoes, rascunho_em,
  versao_publicada_id, publicada_em, arquivada_em, criado_em, atualizado_em
`;

export async function atenderPaginas(req, res) {
  if (await barrouOperador(req, res)) return;

  try {
    if (req.method === "GET") return await ler(req, res);
    if (req.method === "POST") return await gravar(req, res);
    return res.status(405).json({ error: "Método não suportado." });
  } catch (e) {
    return res.status(500).json({ error: "Falha no compositor de páginas.", detalhe: e.message });
  }
}

// ---------------------------------------------------------------------------
// A página publicada
//
// Serve os bytes gravados na publicação, e nada mais. Não remonta o documento,
// não lê o rascunho, não consulta versão: o que está em `publicado_html` é o
// que foi aprovado na prévia e publicado, e é isso que a pessoa recebe.
//
// Dois caminhos chegam aqui:
//
//   /p/<slug>   o endereço do próprio CRM, que existe desde o primeiro
//               dia e serve para testar e para quem não tem domínio.
//   /           no domínio do cliente, resolvido pelo header Host.
//
// O Host só é usado quando não veio apelido. Um apelido na URL é um pedido
// explícito; o Host é o que sobra quando a pessoa digitou só o domínio.
export async function servirPaginaPublica(req, res) {
  const slug = normalizarSlug(req.query?.slug || "");
  const sb = db();

  let pagina;
  try {
    pagina = slug ? await porApelido(sb, slug) : await porHost(sb, req.headers?.host);
  } catch {
    res.setHeader?.("Content-Type", "text/html; charset=utf-8");
    return res.status(500).send("<!doctype html><title>Erro</title><h1>Esta página não pôde ser carregada.</h1>");
  }

  // Rascunho não abre para o público. Página que existe mas nunca foi
  // publicada responde igualzinho a página que não existe, de propósito:
  // dizer "existe mas não está publicada" entrega o endereço que o cliente
  // ainda não anunciou.
  if (!pagina?.publicado_html || !pagina.publicada_em) return naoAchou(res);

  res.setHeader?.("Content-Type", "text/html; charset=utf-8");
  res.setHeader?.("Cache-Control", "public, max-age=60, s-maxage=300");
  if (pagina.configuracoes?.robots === false) res.setHeader?.("X-Robots-Tag", "noindex, nofollow");
  return res.status(200).send(pagina.publicado_html);
}

// As colunas que a rota pública lê. `rascunho_*` não está aqui de propósito:
// o rascunho não tem como vazar por um caminho que nunca o pede.
const COLUNAS_PUBLICA = "id, slug, publicado_html, publicada_em, configuracoes";

async function porApelido(sb, slug) {
  const { data, error } = await sb.from("paginas")
    .select(COLUNAS_PUBLICA).eq("slug", slug).maybeSingle();
  if (error) throw new Error(error.message);
  return data;
}

/**
 * Qual página responde por este domínio.
 *
 * Domínio que ninguém cadastrou não serve nada: não cai numa página padrão,
 * não cai na primeira do banco, não cai no painel. Responde 404, que é a
 * resposta certa para um host que aponta para cá sem ter sido cadastrado.
 *
 * `www.` é tentado sem o prefixo como segunda chance, porque é o erro de
 * cadastro mais comum do mundo: a pessoa aponta os dois no DNS e cadastra um.
 * Fora disso a comparação é literal.
 */
async function porHost(sb, host) {
  const dominio = normalizarDominio(host || "");
  if (!dominio) return null;

  const candidatos = dominio.startsWith("www.") ? [dominio, dominio.slice(4)] : [dominio];

  const { data, error } = await sb.from("pagina_dominios")
    .select("dominio, pagina_id").in("dominio", candidatos);
  if (error) throw new Error(error.message);
  if (!data?.length) return null;

  // O exato ganha do sem-www: quem cadastrou os dois quis dois.
  const escolhido = data.find((d) => d.dominio === dominio) || data[0];

  const { data: pagina, error: erroPagina } = await sb.from("paginas")
    .select(COLUNAS_PUBLICA).eq("id", escolhido.pagina_id).maybeSingle();
  if (erroPagina) throw new Error(erroPagina.message);
  return pagina;
}

function naoAchou(res) {
  res.setHeader?.("Content-Type", "text/html; charset=utf-8");
  res.setHeader?.("X-Robots-Tag", "noindex, nofollow");
  return res.status(404).send(
    '<!doctype html><html lang="pt-BR"><meta charset="utf-8">'
    + "<title>Página não encontrada</title>"
    + "<h1>Página não encontrada</h1><p>Confira o endereço.</p></html>",
  );
}

// ---------------------------------------------------------------------------
// Leitura
async function ler(req, res) {
  const sb = db();
  // `recurso`, e não `rota`: `rota` é do despachante do api/report.js, e o
  // vercel.json já gasta esse nome para chegar aqui. Dois significados para a
  // mesma chave de query seria uma colisão silenciosa.
  const recurso = req.query?.recurso;

  if (recurso === "pagina") {
    const { data: pagina, error } = await sb.from("paginas")
      .select("*").eq("id", req.query.id).maybeSingle();
    if (error) throw new Error(error.message);
    if (!pagina) return res.status(404).json({ error: "Essa página não existe." });

    // O histórico vem sem o corpo dos arquivos: a lista mostra número, data e
    // rótulo, e quem abre uma versão pede ela por `recurso=versao`.
    const { data: versoes } = await sb.from("pagina_versoes")
      .select("id, numero, rotulo, impressao, aprovada_em, criada_por, criado_em")
      .eq("pagina_id", pagina.id).order("numero", { ascending: false }).limit(60);

    const { data: dominios } = await sb.from("pagina_dominios")
      .select("*").eq("pagina_id", pagina.id).order("criado_em");

    return res.status(200).json({
      pagina,
      versoes: versoes || [],
      dominios: dominios || [],
      // Sem credencial de hospedagem no servidor a tela de domínios aparece
      // explicando isso, em vez de oferecer um botão que sempre falha.
      dominios_prontos: hospedagemPronta(),
      // O aviso vem do módulo de domínios, não daqui e não da tela: o nome do
      // que falta muda junto com a hospedagem.
      dominios_aviso: hospedagemPronta() ? null : comoConfigurar(),
      // O painel precisa saber se o rascunho de agora é o que está no ar.
      impressao_rascunho: impressao({
        html: pagina.rascunho_html, css: pagina.rascunho_css,
        js: pagina.rascunho_js, configuracoes: pagina.configuracoes,
      }),
    });
  }

  if (recurso === "versao") {
    const { data, error } = await sb.from("pagina_versoes")
      .select("*").eq("id", req.query.id).maybeSingle();
    if (error) throw new Error(error.message);
    if (!data) return res.status(404).json({ error: "Essa versão não existe." });
    return res.status(200).json({ versao: data });
  }

  const clienteId = req.query?.cliente;
  if (!clienteId) return res.status(400).json({ error: "Cliente não informado." });

  // Arquivada não some: ela some DA GALERIA. Quem pede `arquivadas=1` recebe
  // só as arquivadas, que é como a pessoa volta atrás.
  const soArquivadas = String(req.query?.arquivadas || "") === "1";

  let consulta = sb.from("paginas")
    .select(COLUNAS_LISTA).eq("cliente_id", clienteId)
    .order("atualizado_em", { ascending: false });
  consulta = soArquivadas ? consulta.not("arquivada_em", "is", null) : consulta.is("arquivada_em", null);

  const { data, error } = await consulta;
  if (error) throw new Error(error.message);

  const paginas = data || [];
  const medida = await medirPaginas(sb, paginas.map((p) => p.id), req.query?.desde || null);
  const dominios = await dominiosDasPaginas(sb, paginas.map((p) => p.id));

  return res.status(200).json({
    paginas: paginas.map((p) => ({
      ...p,
      medida: medida.get(p.id) || { visitas: 0, leads: 0 },
      dominios: dominios.get(p.id) || [],
    })),
  });
}

/**
 * Visitas e leads por página, somados do dia a dia.
 *
 * Soma aqui e não no banco por uma razão chata: PostgREST não faz group by, e
 * a alternativa seria uma view ou uma função só para isso. São dezenas de
 * linhas por página, não milhares: dia é a menor unidade que a 046 guarda.
 *
 * `desde` é o recorte de período que a tela pede. Sem ele, a vida toda.
 */
async function medirPaginas(sb, ids, desde) {
  const soma = new Map();
  if (!ids.length) return soma;

  let consulta = sb.from("pagina_eventos_dia")
    .select("pagina_id, visitas, leads").in("pagina_id", ids);
  if (desde) consulta = consulta.gte("dia", desde);

  const { data, error } = await consulta;
  // Medição é informação a mais: se ela falhar, a galeria continua abrindo.
  // Página que não carrega porque o contador quebrou seria o pior negócio
  // possível desta tela.
  if (error) return soma;

  for (const linha of data || []) {
    const atual = soma.get(linha.pagina_id) || { visitas: 0, leads: 0 };
    atual.visitas += linha.visitas || 0;
    atual.leads += linha.leads || 0;
    soma.set(linha.pagina_id, atual);
  }
  return soma;
}

/** Os domínios de cada página, para o filtro e para o cartão. */
async function dominiosDasPaginas(sb, ids) {
  const mapa = new Map();
  if (!ids.length) return mapa;

  const { data, error } = await sb.from("pagina_dominios")
    .select("pagina_id, dominio, estado").in("pagina_id", ids);
  if (error) return mapa;

  for (const linha of data || []) {
    const lista = mapa.get(linha.pagina_id) || [];
    lista.push({ dominio: linha.dominio, estado: linha.estado });
    mapa.set(linha.pagina_id, lista);
  }
  return mapa;
}

// ---------------------------------------------------------------------------
/**
 * O contador da página publicada. Público, sem sessão, como a própria página.
 *
 * Quem chama é o medidor de duas linhas que vive no documento publicado, por
 * sendBeacon. Não devolve nada de útil de propósito: é um contador, e um
 * contador que responde dado é um contador que vira porta de leitura.
 *
 * O que entra é conferido aqui, não lá: o corpo vem do navegador de um
 * visitante qualquer, então só passa `pagina` que existe E está publicada, e
 * tipo que a função do banco conhece. A soma é feita pelo Postgres, dentro da
 * transação, porque duas visitas no mesmo instante somadas em JavaScript
 * perderiam uma.
 */
export async function registrarEventoDaPagina(req, res) {
  res.setHeader?.("Cache-Control", "no-store");
  if (req.method !== "POST") return res.status(405).json({ ok: false });

  let corpo = req.body;
  if (typeof corpo === "string") {
    try { corpo = JSON.parse(corpo); } catch (e) { corpo = null; }
  }
  const pagina = String(corpo?.pagina || "");
  const tipo = String(corpo?.tipo || "");
  if (!UUID.test(pagina) || (tipo !== "visita" && tipo !== "lead")) {
    return res.status(400).json({ ok: false });
  }

  const sb = db();
  const { data: existe } = await sb.from("paginas")
    .select("id").eq("id", pagina).not("publicada_em", "is", null).maybeSingle();
  if (!existe) return res.status(204).end?.() ?? res.status(204).json({ ok: false });

  const { error } = await sb.rpc("somar_evento_pagina", { p_pagina: pagina, p_tipo: tipo });
  if (error) return res.status(500).json({ ok: false });
  return res.status(204).end?.() ?? res.status(204).json({ ok: true });
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// ---------------------------------------------------------------------------
// Escrita
async function gravar(req, res) {
  const sb = db();
  const corpo = req.body || {};
  const acao = corpo.acao;

  if (acao === "criar") {
    if (!corpo.cliente_id) return res.status(400).json({ error: "Cliente não informado." });
    const titulo = String(corpo.titulo || "").trim();
    if (!titulo) return res.status(400).json({ error: "Dê um nome para a página." });

    const slug = normalizarSlug(corpo.slug || titulo);
    const recusa = conferirSlug(slug);
    if (recusa) return res.status(400).json({ error: recusa });

    const { data, error } = await sb.from("paginas").insert({
      cliente_id: corpo.cliente_id,
      slug,
      titulo,
      configuracoes: sanearConfiguracoes({ titulo }),
    }).select(COLUNAS_LISTA).single();

    if (error) {
      const repetido = error.code === "23505";
      return res.status(repetido ? 409 : 500).json({
        error: repetido ? `O apelido "${slug}" já é de outra página.` : "Falha ao criar a página.",
        detalhe: error.message,
      });
    }
    return res.status(200).json({ pagina: data });
  }

  // Daqui para baixo tudo mexe numa página que já existe.
  const pagina = await pegarPagina(sb, corpo.id);
  if (!pagina) return res.status(404).json({ error: "Essa página não existe." });

  if (acao === "rascunho") {
    const recusa = conferirConteudo(corpo);
    if (recusa) return res.status(400).json({ error: recusa });

    const { error } = await sb.from("paginas").update({
      rascunho_html: String(corpo.html ?? pagina.rascunho_html),
      rascunho_css: String(corpo.css ?? pagina.rascunho_css),
      rascunho_js: String(corpo.js ?? pagina.rascunho_js),
      rascunho_em: new Date().toISOString(),
      atualizado_em: new Date().toISOString(),
    }).eq("id", pagina.id);
    if (error) throw new Error(error.message);

    return res.status(200).json({
      ok: true,
      impressao_rascunho: impressao({
        html: corpo.html ?? pagina.rascunho_html,
        css: corpo.css ?? pagina.rascunho_css,
        js: corpo.js ?? pagina.rascunho_js,
        configuracoes: pagina.configuracoes,
      }),
    });
  }

  if (acao === "configurar") {
    const dados = { atualizado_em: new Date().toISOString() };

    if (corpo.titulo !== undefined) {
      const titulo = String(corpo.titulo || "").trim();
      if (!titulo) return res.status(400).json({ error: "Dê um nome para a página." });
      dados.titulo = titulo;
    }
    if (corpo.slug !== undefined) {
      const slug = normalizarSlug(corpo.slug);
      const recusa = conferirSlug(slug);
      if (recusa) return res.status(400).json({ error: recusa });
      dados.slug = slug;
    }
    if (corpo.configuracoes !== undefined) {
      dados.configuracoes = sanearConfiguracoes(corpo.configuracoes);
    }

    const { error } = await sb.from("paginas").update(dados).eq("id", pagina.id);
    if (error) {
      const repetido = error.code === "23505";
      return res.status(repetido ? 409 : 500).json({
        error: repetido ? "Esse apelido já é de outra página." : "Falha ao salvar as configurações.",
        detalhe: error.message,
      });
    }
    return res.status(200).json({ ok: true, configuracoes: dados.configuracoes ?? pagina.configuracoes });
  }

  // -------------------------------------------------------------- publicar
  //
  // O corpo traz `previa`, que é exatamente o conteúdo que o iframe da prévia
  // está renderizando. A conferência compara com o rascunho gravado, e é essa
  // comparação que faz da publicação a página que a pessoa olhou.
  if (acao === "publicar") {
    if (!corpo.previa) return res.status(400).json({ error: "Abra a prévia antes de publicar." });

    const rascunho = {
      html: pagina.rascunho_html, css: pagina.rascunho_css,
      js: pagina.rascunho_js, configuracoes: pagina.configuracoes,
    };
    const previa = {
      html: String(corpo.previa.html || ""),
      css: String(corpo.previa.css || ""),
      js: String(corpo.previa.js || ""),
      configuracoes: pagina.configuracoes,
    };

    const confere = conferirCorrespondencia({ rascunho, previa });
    if (!confere.ok) {
      return res.status(confere.status).json({
        error: confere.erro,
        impressao_previa: confere.previa,
        impressao_rascunho: confere.rascunho,
      });
    }

    const { data: versao, error: erroVersao } = await sb.from("pagina_versoes").insert({
      pagina_id: pagina.id,
      html: previa.html,
      css: previa.css,
      js: previa.js,
      configuracoes: previa.configuracoes,
      impressao: confere.impressao,
      rotulo: String(corpo.rotulo || "").trim() || null,
      aprovada_em: new Date().toISOString(),
      criada_por: corpo.quem || "operador",
    }).select("*").single();
    if (erroVersao) throw new Error(erroVersao.message);

    return publicarVersao(sb, res, pagina, versao, confere.impressao);
  }

  // ------------------------------------------------------------ republicar
  //
  // Voltar uma versão antiga para o ar. Não passa pela prévia de novo porque
  // ela já passou uma vez: a versão guarda a impressão de quando foi aprovada,
  // e a conferência confirma que o conteúdo gravado continua sendo aquele.
  if (acao === "republicar") {
    const { data: versao, error } = await sb.from("pagina_versoes")
      .select("*").eq("id", corpo.versao).maybeSingle();
    if (error) throw new Error(error.message);

    const confere = conferirAprovacao({ pagina, versao, impressaoEnviada: corpo.impressao });
    if (!confere.ok) return res.status(confere.status).json({ error: confere.erro });

    return publicarVersao(sb, res, pagina, versao, confere.impressao);
  }

  if (acao === "restaurar") {
    const { data: versao, error } = await sb.from("pagina_versoes")
      .select("*").eq("id", corpo.versao).maybeSingle();
    if (error) throw new Error(error.message);
    if (!versao || versao.pagina_id !== pagina.id) {
      return res.status(404).json({ error: "Essa versão não existe nesta página." });
    }

    const { error: erroUp } = await sb.from("paginas").update({
      rascunho_html: versao.html,
      rascunho_css: versao.css,
      rascunho_js: versao.js,
      rascunho_em: new Date().toISOString(),
      atualizado_em: new Date().toISOString(),
    }).eq("id", pagina.id);
    if (erroUp) throw new Error(erroUp.message);

    return res.status(200).json({ ok: true, versao });
  }

  if (acao === "despublicar") {
    const { error } = await sb.from("paginas").update({
      versao_publicada_id: null, publicado_html: null, publicada_em: null,
      atualizado_em: new Date().toISOString(),
    }).eq("id", pagina.id);
    if (error) throw new Error(error.message);
    return res.status(200).json({ ok: true });
  }

  // ------------------------------------------------------------- domínios
  //
  // Duas gravações por domínio: a hospedagem e a nossa tabela. A ordem é a
  // hospedagem primeiro, de propósito: domínio recusado por ela (já em uso em
  // outro projeto, por exemplo) não entra na nossa tabela, e assim a tabela
  // nunca promete um domínio que não vai atender.
  //
  // Quem hospeda é detalhe do api/_dominios.js. Aqui não entra nome de
  // fornecedor nem chamada de API dele.
  if (acao === "dominio-adicionar") {
    const dominio = normalizarDominio(corpo.dominio);
    if (!dominioValido(dominio)) {
      return res.status(400).json({ error: "Escreva o domínio como ele é digitado no navegador, por exemplo cliente.com.br." });
    }

    let hospedado;
    try {
      hospedado = await registrar(dominio);
    } catch (e) {
      return res.status(e.semConfiguracao ? 503 : 400).json({
        error: e.semConfiguracao
          ? `A integração de domínios não está configurada neste servidor. ${comoConfigurar()}`
          : `O domínio foi recusado: ${e.message}`,
      });
    }

    const { data, error } = await sb.from("pagina_dominios").insert({
      cliente_id: pagina.cliente_id,
      pagina_id: pagina.id,
      dominio,
      estado: hospedado.verificado ? "ativo" : "pendente",
      verificacao: hospedado.verificacao,
      conferido_em: new Date().toISOString(),
    }).select("*").single();

    if (error) {
      const repetido = error.code === "23505";
      return res.status(repetido ? 409 : 500).json({
        error: repetido ? "Esse domínio já está cadastrado em outra página." : "Falha ao gravar o domínio.",
        detalhe: error.message,
      });
    }
    return res.status(200).json({ dominio: data });
  }

  if (acao === "dominio-conferir") {
    const { data: linha, error } = await sb.from("pagina_dominios")
      .select("*").eq("id", corpo.dominio_id).maybeSingle();
    if (error) throw new Error(error.message);
    if (!linha || linha.pagina_id !== pagina.id) {
      return res.status(404).json({ error: "Esse domínio não é desta página." });
    }

    let hospedado;
    try {
      hospedado = await estadoDoDominio(linha.dominio);
    } catch (e) {
      return res.status(e.semConfiguracao ? 503 : 400).json({ error: e.message });
    }

    const situacao = hospedado.verificado && !hospedado.maConfigurado ? "ativo"
      : hospedado.verificado ? "erro" : "pendente";

    const { data, error: erroUp } = await sb.from("pagina_dominios").update({
      estado: situacao,
      verificacao: hospedado.verificacao,
      conferido_em: new Date().toISOString(),
    }).eq("id", linha.id).select("*").single();
    if (erroUp) throw new Error(erroUp.message);

    return res.status(200).json({ dominio: data, mal_configurado: hospedado.maConfigurado });
  }

  if (acao === "dominio-remover") {
    const { data: linha, error } = await sb.from("pagina_dominios")
      .select("*").eq("id", corpo.dominio_id).maybeSingle();
    if (error) throw new Error(error.message);
    if (!linha || linha.pagina_id !== pagina.id) {
      return res.status(404).json({ error: "Esse domínio não é desta página." });
    }

    // A hospedagem primeiro, outra vez: se ela falhar, o domínio continua
    // cadastrado aqui e a tela continua mostrando. Apagar daqui e falhar lá
    // deixaria um domínio servindo uma página que ninguém mais administra.
    try {
      await remover(linha.dominio);
    } catch (e) {
      // Domínio que já não está lá não é erro: o fim era tirar.
      if (e.status !== 404) {
        return res.status(e.semConfiguracao ? 503 : 400).json({ error: e.message });
      }
    }

    const { error: erroDel } = await sb.from("pagina_dominios").delete().eq("id", linha.id);
    if (erroDel) throw new Error(erroDel.message);
    return res.status(200).json({ ok: true });
  }

  // Arquivar é o "não quero mais ver isso na galeria" sem perder nada: o
  // histórico de versões e a medição continuam inteiros, e a página continua
  // no ar se estiver no ar. Quem quer tirar do ar despublica, que é outra
  // ação, de propósito.
  if (acao === "arquivar" || acao === "desarquivar") {
    const quando = acao === "arquivar" ? new Date().toISOString() : null;
    const { error } = await sb.from("paginas")
      .update({ arquivada_em: quando, atualizado_em: new Date().toISOString() })
      .eq("id", pagina.id);
    if (error) throw new Error(error.message);
    return res.status(200).json({ ok: true, arquivada_em: quando });
  }

  // Duplicar copia o RASCUNHO, as configurações e o conteúdo, e nada mais.
  //
  // A cópia nasce despublicada e sem histórico, e tem que ser assim: versão
  // é o registro de uma aprovação na prévia, e aprovação de uma página não
  // vale para outra. Herdar o histórico seria herdar aprovação que ninguém
  // deu.
  if (acao === "duplicar") {
    const titulo = String(corpo.titulo || `${pagina.titulo} (cópia)`).trim().slice(0, 120);
    const slug = normalizarSlug(corpo.slug || `${pagina.slug}-copia`);
    const recusa = conferirSlug(slug);
    if (recusa) return res.status(400).json({ error: recusa });

    // O rascunho da cópia é o que está NO AR na original, quando existe, e o
    // rascunho dela quando não: duplicar uma página publicada e receber o
    // rascunho pela metade de outra pessoa seria a surpresa errada.
    let fonte = {
      html: pagina.rascunho_html, css: pagina.rascunho_css, js: pagina.rascunho_js,
    };
    if (pagina.versao_publicada_id) {
      const { data: noAr } = await sb.from("pagina_versoes")
        .select("html, css, js").eq("id", pagina.versao_publicada_id).maybeSingle();
      if (noAr) fonte = { html: noAr.html, css: noAr.css, js: noAr.js };
    }

    const { data, error } = await sb.from("paginas").insert({
      cliente_id: pagina.cliente_id,
      slug,
      titulo,
      // O domínio NÃO vem junto: domínio é único no sistema, e duas páginas
      // apontadas para o mesmo endereço é erro de cadastro, não cópia.
      configuracoes: pagina.configuracoes || {},
      rascunho_html: fonte.html || "",
      rascunho_css: fonte.css || "",
      rascunho_js: fonte.js || "",
      rascunho_em: new Date().toISOString(),
    }).select(COLUNAS_LISTA).single();

    if (error) {
      const repetido = error.code === "23505";
      return res.status(repetido ? 409 : 500).json({
        error: repetido ? "Já existe uma página com esse endereço." : "Falha ao duplicar.",
        detalhe: error.message,
      });
    }
    return res.status(200).json({ pagina: data });
  }

  if (acao === "apagar") {
    // Despublica primeiro: a chave estrangeira da publicação é `restrict`, e
    // apagar a página com uma versão no ar seria recusado pelo banco com uma
    // mensagem que ninguém entende.
    await sb.from("paginas").update({
      versao_publicada_id: null, publicado_html: null, publicada_em: null,
    }).eq("id", pagina.id);
    const { error } = await sb.from("paginas").delete().eq("id", pagina.id);
    if (error) throw new Error(error.message);
    return res.status(200).json({ ok: true });
  }

  return res.status(400).json({ error: "Ação desconhecida." });
}

async function pegarPagina(sb, id) {
  if (!id) return null;
  const { data, error } = await sb.from("paginas").select("*").eq("id", id).maybeSingle();
  if (error) throw new Error(error.message);
  return data;
}

// Os bytes são montados aqui e gravados junto com o apontamento da versão. Uma
// gravação só: ou a página passa a servir estes bytes com esta versão, ou nada
// muda. É o que a trava `paginas_publicacao_completa` cobra do banco.
async function publicarVersao(sb, res, pagina, versao, marca) {
  const html = bytesDaPublicacao(versao, pagina.id);
  const quando = new Date().toISOString();

  const { error } = await sb.from("paginas").update({
    versao_publicada_id: versao.id,
    publicado_html: html,
    publicada_em: quando,
    atualizado_em: quando,
  }).eq("id", pagina.id);
  if (error) throw new Error(error.message);

  return res.status(200).json({
    ok: true,
    versao: { id: versao.id, numero: versao.numero, impressao: marca },
    publicada_em: quando,
    endereco: `/p/${pagina.slug}`,
    tamanho: html.length,
  });
}
