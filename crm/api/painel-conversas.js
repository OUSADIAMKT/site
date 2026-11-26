// Conversas e leads. Serve para você auditar o que a IA respondeu de verdade.
// É olhando aqui que se descobre o que precisa apertar no contexto.

import { waitUntil } from "./_segundoPlano.js";
import { db, credenciaisDoCanal } from "./_db.js";
import { r2Ligado, lerDoR2, chaveDoBanco } from "./_r2.js";
import { arquivarDaMeta, TETO_ARQUIVO_TARDIO } from "./_arquivo.js";
import { listarTemplates, baixarMidia, fluxoDaMidia } from "./_wa.js";
import { barrou, barrouOperador, barrouGestor, sessao, clientePermitido } from "./_painel.js";
import { paraE164 } from "./_telefone.js";
import {
  listarContatos, historicoDoContato, salvarContato, importarContatos, lerCsv,
  etiquetasDoCliente, listarDisparos, verDisparo, criarDisparo, publicoDo,
  testarDisparo, enviarLote, possiveisDuplicados,
} from "./_crm.js";
import { soltarInativas } from "./_fila.js";
import { lerSemResposta, comSemResposta, semRespostaDe } from "./_semResposta.js";
import { lerNaoLidas, comNaoLidas, marcarLido, quemLe, NADA_NAO_LIDO } from "./_leitura.js";

// Quantas conversas a lista traz. Os contadores das abas contam o que está na
// lista, então este número é o teto deles também: era 100, e um cliente com
// mais que isso veria "Equipe 25" quando tem 40. Trezentas é folga de três
// vezes para o maior cliente de hoje, e a resposta continua leve porque prévia
// e contagens saem em três consultas agregadas, não uma por conversa.
const TETO_DA_LISTA = 300;
import * as neg from "./_negocios.js";
import * as com from "./_comercial.js";
import {
  listarFrentes, salvarFrente, desativarFrente, reativarFrente,
} from "./_frentes.js";
import { ASSUNTOS } from "./_assunto.js";

export default async function handler(req, res) {
  if (await barrou(req, res)) return;

  // O funil de vendas (kanban, negócios e configurações) entra por aqui. Ao
  // contrário de contatos e disparos, ele é da equipe do cliente também.
  if (req.query?.rota === "crm") return funil(req, res);

  // O áudio, a foto ou o documento que a pessoa mandou, para tocar ou ver no
  // painel. Qualquer pessoa que atende pode ouvir: é o trabalho dela.
  if (req.query?.rota === "midia") return midia(req, res);

  // As frentes de atendimento. Entram antes do `crm()` porque o `crm()`
  // começa com `barrouOperador` e frente é tela que o gestor da empresa também
  // administra, pela matriz do plano. Atendente não entra: `barrouGestor`
  // recusa quem não é operador nem gestor, e é a mesma porta da agenda e do
  // desempenho. Nenhuma permissão existente muda por isto; a rota é nova.
  if (req.query?.rota === "frentes") return frentes(req, res);

  // O CRM entra por aqui, em `?rota=`, e não em arquivo próprio: `api/` está no
  // teto de 12 funções do plano Hobby. O `vercel.json` reescreve os endereços
  // bonitos (`/api/painel-contatos` e companhia) para cá.
  if (req.query?.rota) return crm(req, res);

  if (req.method !== "GET") return res.status(405).json({ error: "Método não permitido" });

  const sb = db();
  const s = await sessao(req);
  const clienteId = await clientePermitido(req, req.query?.cliente);
  const conversaId = req.query?.conversa;

  if (conversaId) {
    // Histórico de paciente é dado sensível: confere de quem é a conversa
    // antes de devolver, senão bastaria um id para ler a de qualquer cliente.
    const { data: dona } = await sb.from("conversas")
      .select("cliente_id").eq("id", conversaId).maybeSingle();
    if (!dona || !await clientePermitido(req, dona.cliente_id)) {
      return res.status(403).json({ error: "Conversa não permitida." });
    }

    const [msgs, passagens, atual] = await Promise.all([
      sb.from("mensagens")
        .select("id, papel, conteudo, criado_em, tipo, midia_id")
        .eq("conversa_id", conversaId)
        .order("criado_em"),
      // Toda vez que esta conversa passou pela mão de uma pessoa, com data,
      // com quem e com a dúvida que motivou. É o histórico de suporte humano.
      sb.from("atendimentos")
        .select("id, entrou_fila, assumida_em, encerrada_em, desfecho, motivo, assumido_por, atendentes(nome)")
        .eq("conversa_id", conversaId)
        .order("entrou_fila", { ascending: false }),
      // `canal` e `janela_expira_em` entram porque a tela precisa avisar ANTES
      // que a janela de 24h fechou. Sem isso a pessoa escreve a resposta
      // inteira, aperta enviar e recebe um erro cru da Meta.
      sb.from("conversas")
        .select("id, modo, canal, atendente_id, assumida_em, motivo_fila, ultima_em,"
          + " janela_expira_em, atendentes(nome)")
        .eq("id", conversaId).maybeSingle(),
    ]);

    if (msgs.error) return res.status(500).json({ error: "Falha ao ler mensagens", detalhe: msgs.error.message });

    // Quantas mensagens a pessoa mandou sem resposta. Vai no estado para a
    // tela poder avisar no alto da conversa, que é onde quem está atendendo
    // olha antes de começar a escrever.
    const parada = atual.data ? await semRespostaDe(conversaId) : null;

    // Abrir a conversa é o que marca como lida, e só para quem abriu. A
    // escrita só acontece se havia o que marcar: a tela recarrega a conversa
    // aberta a cada seis segundos, e gravar a cada volta encheria a tabela de
    // escrita inútil.
    //
    // `ler=0` existe para o Quadro espiar um cartão sem zerar o aviso de
    // ninguém.
    const quem = quemLe(s);
    const antes = await lerNaoLidas([conversaId], quem);
    let leitura = antes.get(conversaId) || NADA_NAO_LIDO;
    const tinhaOQueMarcar = leitura.nao_lidas > 0 || leitura.marcada;
    if (req.query?.ler !== "0" && tinhaOQueMarcar) {
      await marcarLido(conversaId, quem).catch((e) =>
        console.warn("[conversas] não deu para marcar como lida:", e.message));
      leitura = NADA_NAO_LIDO;
    }

    return res.status(200).json({
      mensagens: (msgs.data || []).map(paraTela).filter(Boolean),
      atendimentos: passagens.data || [],
      estado: atual.data ? { ...atual.data, ...parada, ...leitura } : null,
    });
  }

  if (!clienteId) return res.status(403).json({ error: "Cliente não permitido." });

  // Antes de listar, devolve para a IA o que está parado além do prazo de inatividade,
  // para a coluna "Situação" dizer a verdade.
  await soltarInativas(clienteId).catch((e) =>
    console.warn("[conversas] não deu para soltar as inativas:", e.message));

  // A busca é no banco, não na tela. Filtrar no navegador só acharia dentro das
  // 100 que a lista já trouxe, e quem está procurando uma pessoa pelo @ quase
  // sempre está atrás de uma conversa velha, que é justamente a que ficou de
  // fora. Procurar e não achar o que existe é pior que não ter busca.
  let consulta = sb.from("conversas")
    .select("id, canal, contato, telefone, nome_contato, modo, score, etiquetas, origem, ultima_em, criado_em,"
      + " atendente_id, assumido_por, janela_expira_em, atendentes(nome)")
    .eq("cliente_id", clienteId);

  // Vírgula e parênteses são a sintaxe do `or` do PostgREST: se passarem para
  // dentro do termo, a consulta vira outra coisa. Saem aqui.
  const busca = String(req.query?.busca || "").replace(/[,()%*\\]/g, "").trim();
  if (busca) {
    consulta = consulta.or(
      `nome_contato.ilike.%${busca}%,contato.ilike.%${busca}%,telefone.ilike.%${busca}%`,
    );
  }

  const { data, error } = await consulta
    .order("ultima_em", { ascending: false })
    .limit(TETO_DA_LISTA);

  if (error) return res.status(500).json({ error: "Falha ao listar conversas", detalhe: error.message });

  const lista = await comPrevia(sb, data || []);
  const ids = lista.map((c) => c.id);
  const [situacoes, leituras] = await Promise.all([
    lerSemResposta(ids),
    lerNaoLidas(ids, quemLe(s)),
  ]);
  return res.status(200).json({
    conversas: comNaoLidas(comSemResposta(lista, situacoes), leituras),
    // Quantas a lista trouxe de verdade. Com o teto atingido os contadores das
    // abas passam a falar só do pedaço carregado, e a tela precisa dizer isso
    // em vez de somar errado em silêncio.
    teto: TETO_DA_LISTA,
    cortou: lista.length >= TETO_DA_LISTA,
  });
}

/**
 * A linha de previa de cada conversa na lista, como no WhatsApp.
 *
 * Uma chamada so para as 100, por uma funcao do banco: PostgREST nao faz
 * DISTINCT ON, e sem ela a previa custaria uma consulta por conversa, que e o
 * jeito classico de uma tela boa ficar lenta no cliente que cresceu.
 *
 * Se falhar, a lista sai sem previa. Tela sem a linha cinza continua
 * utilizavel; tela que nao abre, nao.
 */
async function comPrevia(sb, conversas) {
  if (!conversas.length) return conversas;

  const { data, error } = await sb.rpc("previa_das_conversas", {
    ids: conversas.map((c) => c.id),
  });
  if (error) {
    console.warn("[conversas] previa nao carregada:", error.message);
    return conversas;
  }

  const porConversa = new Map();
  for (const linha of data || []) {
    const tela = paraTela(linha);
    const texto = String(tela?.texto || "").replace(/\s+/g, " ").trim();
    porConversa.set(linha.conversa_id, {
      previa: texto.slice(0, 120) || rotuloSemTexto(tela),
      previa_papel: linha.papel,
    });
  }

  return conversas.map((c) => ({ ...c, ...(porConversa.get(c.id) || {}) }));
}

// Mensagem que nao tem texto nenhum ainda precisa dizer alguma coisa na lista:
// linha em branco parece conversa quebrada.
function rotuloSemTexto(tela) {
  if (!tela) return "";
  const acao = tela.acoes?.[0]?.ferramenta;
  if (acao === "enviar_midia") return "Mídia enviada";
  if (acao === "transferir_humano") return "Passou para a equipe";
  if (acao) return "Consulta feita";
  return "";
}

// O banco guarda os blocos no formato da Anthropic. A tela quer texto simples,
// mais um resumo do que a IA fez de ferramenta (mídia enviada, transferência).
function paraTela({ id, papel, conteudo, criado_em, tipo, midia_id }) {
  // A mídia (áudio, foto, vídeo, documento) vai junto pelo id da mensagem:
  // a tela pede os bytes em `?rota=midia`, nunca o id da Meta direto.
  const anexo = midia_id && tipo && tipo !== "texto" ? { id, tipo } : null;
  if (typeof conteudo === "string") return { papel, texto: conteudo, acoes: [], criado_em, anexo };

  const blocos = Array.isArray(conteudo) ? conteudo : [];
  const texto = blocos.filter((b) => b.type === "text").map((b) => b.text).join("\n\n");
  const acoes = blocos.filter((b) => b.type === "tool_use").map((b) => ({
    ferramenta: b.name,
    detalhe: b.input?.chave || b.input?.motivo || "",
  }));

  // Turnos que só carregam resultado de ferramenta não interessam na tela.
  const soResultado = blocos.length > 0 && blocos.every((b) => b.type === "tool_result");
  if (soResultado) return null;

  return { papel, texto, acoes, criado_em, anexo };
}

// A Vercel não devolve resposta maior que 4,5 MB. Áudio de WhatsApp e foto
// cabem com folga; vídeo grande, não, e a tela avisa em vez de quebrar.
const LIMITE_MIDIA = 4 * 1024 * 1024;

async function midia(req, res) {
  const sb = db();
  const { data: msg } = await sb.from("mensagens")
    .select("id, midia_id, midia_url, tipo, direcao, conversas(cliente_id, canal)")
    .eq("id", req.query?.mensagem || "").maybeSingle();

  // A chave do cofre nunca vem do navegador: ela é lida da mensagem, e só
  // depois de a permissão daquele cliente ser conferida. Aceitar um nome de
  // objeto pela URL seria entregar o bucket inteiro a quem tem uma sessão.
  const chaveGuardada = chaveDoBanco(msg?.midia_url);

  if ((!msg?.midia_id && !chaveGuardada) || !await clientePermitido(req, msg?.conversas?.cliente_id)) {
    return res.status(404).json({ error: "Mídia não encontrada." });
  }
  if (msg.conversas?.canal === "instagram") {
    return res.status(400).json({ error: "Mídia do Instagram ainda não abre no painel." });
  }

  // ---------- a cópia do cofre, quando existe ----------
  // Vem primeiro porque é a única que não expira: a Meta apaga em cerca de 30
  // dias, e a conversa de três meses atrás é justamente a que alguém abre
  // quando a cliente volta falando do mesmo problema.
  if (chaveGuardada) {
    try {
      const guardado = await lerDoR2(chaveGuardada);
      if (guardado?.corpo) {
        res.setHeader("Content-Type", guardado.mime || "application/octet-stream");
        res.setHeader("Cache-Control", "private, max-age=3600");
        if (guardado.bytes) res.setHeader("Content-Length", String(guardado.bytes));
        return await repassarFluxo(guardado.corpo, res);
      }
      // Objeto sumiu do cofre. Não é motivo para desistir: enquanto a Meta
      // tiver a cópia dela, o caminho de baixo ainda mostra o arquivo.
      console.warn(`[r2] ${chaveGuardada} não está mais no cofre`);
    } catch (e) {
      console.error("[r2] leitura falhou, tentando pela Meta:", e?.message || e);
    }
    if (!msg.midia_id) {
      return res.status(410).json({ error: "O arquivo não está mais disponível." });
    }
  }

  try {
    const cliente = await credenciaisDoCanal(msg.conversas.cliente_id, "whatsapp");
    if (!cliente?.wa_token) return res.status(400).json({ error: "WhatsApp deste cliente sem credencial." });

    // Mídia de antes do cofre, ou que o webhook não conseguiu guardar na hora:
    // aproveita que alguém abriu para fazer a cópia. Vai solta, com waitUntil,
    // porque quem está atendendo não tem que esperar pelo arquivamento, e
    // baixa da Meta por conta própria em vez de dividir este fluxo, que é o
    // que está indo para a tela agora.
    if (r2Ligado() && !chaveGuardada) {
      waitUntil(arquivarDaMeta({
        cliente,
        mensagemId: msg.id,
        clienteId: msg.conversas.cliente_id,
        mediaId: msg.midia_id,
        direcao: msg.direcao === "saida" ? "saida" : "entrada",
        teto: TETO_ARQUIVO_TARDIO,
      }));
    }

    const { corpo, mime, bytes } = await fluxoDaMidia(cliente, msg.midia_id);
    res.setHeader("Content-Type", mime || "application/octet-stream");
    res.setHeader("Cache-Control", "private, max-age=3600");
    if (bytes) res.setHeader("Content-Length", String(bytes));

    // Repassa o fluxo quando a Meta manda um. Vídeo de celular passa de quatro
    // megabytes com facilidade, e juntar o arquivo inteiro na memória da função
    // é o que fazia ele não abrir.
    if (corpo) return await repassarFluxo(corpo, res);

    // Sem fluxo legível, o caminho antigo. Aqui o teto da resposta volta a
    // valer, então o aviso continua existindo.
    const { conteudo } = await baixarMidia(cliente, msg.midia_id);
    if (conteudo.length > LIMITE_MIDIA) {
      return res.status(413).json({ error: "Arquivo grande demais para abrir no painel. Veja pelo celular." });
    }
    res.removeHeader("Content-Length");
    return res.status(200).send(conteudo);
  } catch (e) {
    // A Meta apaga a mídia depois de um tempo (cerca de 30 dias).
    return res.status(410).json({ error: `Não deu para buscar a mídia na Meta: ${e.message}` });
  }
}

/**
 * Despeja um fluxo web na resposta do Node, pedaço por pedaço.
 *
 * Mora numa função própria e exportada para o teste poder exercitar o laço com
 * um fluxo falso: é código de infraestrutura, e infraestrutura que ninguém
 * testou é onde um vídeo chega pela metade sem ninguém notar.
 */
export async function repassarFluxo(corpo, res) {
  res.status(200);
  for await (const pedaco of corpo) {
    // `write` devolve false quando o buffer encheu. Ignorar isso é o que faz
    // a memória da função crescer com arquivo grande, que é justamente o caso
    // que esta função existe para resolver.
    if (!res.write(Buffer.from(pedaco))) {
      await new Promise((pronto) => res.once("drain", pronto));
    }
  }
  res.end();
  return res;
}

// ---------------------------------------------------------------------------
// Funil de vendas: kanban, negócios e configurações do CRM.
//
// Ler e mexer em negócio vale para qualquer pessoa do cliente: é o trabalho
// do dia a dia da equipe. Mudar a estrutura (funis, campos, produtos, motivos,
// etiquetas, origens, regras) é do operador e do gestor.
async function funil(req, res) {
  const sb = db();
  const s = await sessao(req);
  const q = req.query || {};
  const corpo = req.body || {};
  const clienteId = await clientePermitido(req, q.cliente || corpo.cliente);
  if (!clienteId) return res.status(403).json({ error: "Cliente não permitido." });

  const quem = s?.nome || (s?.tipo === "operador" ? "Operador" : null);
  // O id de quem está olhando. Sai da sessão e nunca da URL: é ele que
  // define as vistas "minhas" e "da equipe" e a contagem de não lidas de
  // cada cartão. Gestor da plataforma não tem id de atendente, e isso é
  // verdade sobre o login dele, não uma falta a contornar.
  const eu = s?.tipo === "atendente" && s.atendente ? String(s.atendente) : null;
  const podeConfigurar = s?.tipo === "operador" || s?.papel === "gestor";

  try {
    if (req.method === "GET") {
      if (q.negocio) {
        const visto = await neg.verNegocio(sb, clienteId, q.negocio);
        if (!visto) return res.status(404).json({ error: "Negócio não encontrado." });
        return res.status(200).json(visto);
      }
      if (q.conversa) return res.status(200).json({ negocios: await neg.negociosDaConversa(sb, clienteId, q.conversa) });
      if (q.ver === "fechamentos") return res.status(200).json({ historico: await neg.historicoDeFechamento(sb, clienteId) });
      if (q.ver === "config") return res.status(200).json(await neg.configuracao(sb, clienteId));
      if (q.ver === "campos") {
        return res.status(200).json({ campos: await neg.camposDoQuadro(sb, clienteId, quemLe(s)) });
      }

      // ---------- o lado comercial ----------
      // Tudo leitura, tudo recortado por `clienteId`, que veio da sessão e não
      // da URL. Quem é atendente vê o CRM da empresa dele; a tela decide o que
      // mostrar, o servidor decide o que existe.
      if (q.ver === "tarefas")     return res.status(200).json({ tarefas: await com.listarTarefas(sb, clienteId, q) });
      if (q.ver === "notas")       return res.status(200).json({ notas: await com.listarNotas(sb, clienteId, q) });
      if (q.ver === "indicadores") return res.status(200).json(await com.indicadores(sb, clienteId, q));
      if (q.ver === "parados")     return res.status(200).json({ negocios: await com.semAcompanhamento(sb, clienteId, q) });
      if (q.ver === "automacoes") {
        return res.status(200).json({
          automacoes: await com.listarAutomacoes(sb, clienteId),
          execucoes: await com.listarExecucoes(sb, clienteId),
          gatilhos: com.GATILHOS,
          acoes: com.ACOES,
        });
      }
      if (q.ver === "ia") {
        return res.status(200).json({
          config: await com.configIa(sb, clienteId),
          sugestoes: await com.listarSugestoes(sb, clienteId, q),
        });
      }
      return res.status(200).json({ negocios: await neg.listarNegocios(sb, clienteId, q, eu) });
    }

    if (req.method !== "POST") return res.status(405).json({ error: "Método não permitido" });

    switch (corpo.acao) {
      case "salvar-negocio":
        return res.status(200).json({ negocio: await neg.salvarNegocio(sb, clienteId, corpo.dados || {}, quem) });
      case "mover-negocio":
        return res.status(200).json({ negocio: await neg.moverNegocio(sb, clienteId, corpo.dados || {}, quem) });
      case "apagar-negocio":
        return res.status(200).json(await neg.apagarNegocio(sb, clienteId, corpo.id));

      // Quais informações aparecem no cartão. É preferência de quem olha, e
      // por isso fica deste lado da porteira e usa a mesma identidade da
      // caixa de entrada: o id da atendente, ou 'operador'.
      case "campos-do-quadro":
        return res.status(200).json(await neg.salvarCamposDoQuadro(sb, clienteId, quemLe(s), corpo.campos));

      // Tarefas e anotações são do dia a dia de quem atende, não da
      // configuração: ficam deste lado da porteira de propósito.
      case "salvar-tarefa":
        return res.status(200).json({ tarefa: await com.salvarTarefa(sb, clienteId, corpo.dados || {}, quem) });
      case "concluir-tarefa":
        return res.status(200).json({ tarefa: await com.concluirTarefa(sb, clienteId, corpo.id, corpo.concluida !== false, quem) });
      case "apagar-tarefa":
        return res.status(200).json(await com.apagarTarefa(sb, clienteId, corpo.id));
      case "criar-nota":
        return res.status(200).json({ nota: await com.criarNota(sb, clienteId, corpo.dados || {}, quem) });
      case "apagar-nota":
        return res.status(200).json(await com.apagarNota(sb, clienteId, corpo.id));

      // Aplicar uma sugestão da IA é decisão de gente, e por isso vive aqui e
      // não dentro do motor: quem aplica fica gravado com nome.
      case "aplicar-sugestao":
        return res.status(200).json({ sugestao: await com.aplicarSugestao(sb, clienteId, corpo.id, quem) });
      case "descartar-sugestao":
        return res.status(200).json(await com.descartarSugestao(sb, clienteId, corpo.id));
    }

    if (!podeConfigurar) {
      return res.status(403).json({ error: "Só o administrador muda a estrutura do CRM." });
    }

    switch (corpo.acao) {
      case "salvar-funil":
        return res.status(200).json({ funil: await neg.salvarFunil(sb, clienteId, corpo.dados || {}) });
      case "trazer-conversas":
        return res.status(200).json(await neg.trazerConversas(sb, clienteId, corpo.funil, corpo.dias));
      case "apagar-funil":
        return res.status(200).json(await neg.apagarFunil(sb, clienteId, corpo.id));
      case "salvar":
        return res.status(200).json({ item: await neg.salvarCadastro(sb, clienteId, corpo.tipo, corpo.dados || {}) });
      case "apagar":
        return res.status(200).json(await neg.apagarCadastro(sb, clienteId, corpo.tipo, corpo.id));
    }
    return res.status(400).json({ error: "Ação desconhecida." });
  } catch (e) {
    return res.status(400).json({ error: e.message });
  }
}

// ---------------------------------------------------------------------------
// CRM: contatos, etiquetas e disparo.
//
// Tudo aqui é de operador. Contato e disparo são a base de clientes inteira do
// cliente final, e atendente não precisa dela para atender a fila dele.
/**
 * Administração das frentes de atendimento.
 *
 * GET devolve as frentes, as pessoas que podem ser responsáveis e a lista de
 * assuntos que existem, porque a tela monta o formulário com os três.
 * POST cria, edita, desativa e reativa. Nada aqui apaga uma frente.
 */
async function frentes(req, res) {
  if (await barrouGestor(req, res)) return;

  const sb = db();
  const q = req.query || {};
  const corpo = req.body || {};
  const clienteId = await clientePermitido(req, q.cliente || corpo.cliente);
  if (!clienteId) return res.status(403).json({ error: "Cliente não permitido." });

  try {
    if (req.method === "GET") {
      const [frentes, pessoas] = await Promise.all([
        listarFrentes(sb, clienteId),
        sb.from("atendentes").select("id, nome, papel, ativo, assuntos")
          .eq("cliente_id", clienteId).eq("ativo", true).order("nome"),
      ]);
      return res.status(200).json({
        frentes,
        atendentes: pessoas.data || [],
        assuntos: ASSUNTOS,
      });
    }

    if (req.method === "POST") {
      if (corpo.acao === "desativar") {
        return res.status(200).json({ frente: await desativarFrente(sb, clienteId, corpo.id) });
      }
      if (corpo.acao === "reativar") {
        return res.status(200).json({ frente: await reativarFrente(sb, clienteId, corpo.id) });
      }
      return res.status(200).json({ frente: await salvarFrente(sb, clienteId, corpo) });
    }

    return res.status(405).json({ error: "Método não permitido" });
  } catch (e) {
    return res.status(400).json({ error: e.message });
  }
}

async function crm(req, res) {
  if (await barrouOperador(req, res)) return;

  const sb = db();
  const s = await sessao(req);
  const q = req.query || {};
  const corpo = req.body || {};
  const clienteId = await clientePermitido(req, q.cliente || corpo.cliente);
  if (!clienteId) return res.status(403).json({ error: "Cliente não permitido." });

  // O endereço público deste deploy, para montar o link curto que vai dentro
  // da mensagem. Vem do cabeçalho porque o domínio muda entre o preview e o ar.
  const base = process.env.PAINEL_BASE_URL?.replace(/\/$/, "")
    || `https://${req.headers["x-forwarded-host"] || req.headers.host}`;

  try {
    if (q.rota === "contatos") {
      if (req.method === "GET") {
        if (q.contato) {
          const h = await historicoDoContato(sb, clienteId, q.contato);
          if (!h) return res.status(404).json({ error: "Contato não encontrado." });
          return res.status(200).json(h);
        }
        // Quem PODE ser a mesma pessoa. Aponta e não mescla: ver _crm.js.
        if (q.ver === "duplicados") {
          return res.status(200).json({ grupos: await possiveisDuplicados(sb, clienteId) });
        }
        const lista = await listarContatos(sb, clienteId, q);
        return res.status(200).json({ ...lista, etiquetas: await etiquetasDoCliente(sb, clienteId) });
      }
      if (req.method === "POST") {
        return res.status(200).json({ contato: await salvarContato(sb, clienteId, corpo) });
      }
      return res.status(405).json({ error: "Método não permitido" });
    }

    if (q.rota === "importar") {
      if (req.method !== "POST") return res.status(405).json({ error: "Método não permitido" });
      const linhas = Array.isArray(corpo.linhas) ? corpo.linhas : lerCsv(corpo.csv);
      if (!linhas.length) return res.status(400).json({ error: "Nada para importar." });
      return res.status(200).json(await importarContatos(sb, clienteId, linhas, corpo.etiquetas));
    }

    if (q.rota === "disparos") {
      if (req.method === "GET") {
        if (q.disparo) {
          const visto = await verDisparo(sb, clienteId, q.disparo);
          if (!visto) return res.status(404).json({ error: "Disparo não encontrado." });
          return res.status(200).json(visto);
        }
        const [disparos, etiquetas, midias, links, templates] = await Promise.all([
          listarDisparos(sb, clienteId),
          etiquetasDoCliente(sb, clienteId),
          sb.from("midias").select("id, chave, tipo, descricao, url, wa_media_id")
            .eq("cliente_id", clienteId).eq("ativo", true).order("chave"),
          sb.from("links").select("id, chave, url, descricao, cliques, destino_rotulo")
            .eq("cliente_id", clienteId).eq("ativo", true).order("chave"),
          // Os templates vivem na Meta, não aqui. Se a chamada falhar, a tela
          // ainda abre sem a lista: perder o disparo inteiro porque a Meta
          // demorou para responder seria pior que escolher o nome na mão.
          credenciaisDoCanal(clienteId, "whatsapp")
            .then((c) => (c?.wa_token ? listarTemplates(c) : []))
            .catch((e) => {
              console.warn("[crm] não deu para listar templates:", e.message);
              return [];
            }),
        ]);
        return res.status(200).json({
          disparos, etiquetas, templates,
          midias: midias.data || [], links: links.data || [],
        });
      }
      if (req.method !== "POST") return res.status(405).json({ error: "Método não permitido" });

      // Cria o link curto rastreado. Mora aqui, e não numa tela de links,
      // porque o único uso dele hoje é o disparo: é o WhatsApp da Lia, que
      // vai dentro da mensagem para a pessoa continuar a conversa com ela.
      if (corpo.acao === "link") {
        const numero = paraE164(corpo.telefone);
        const url = numero
          ? `https://wa.me/${numero.replace("+", "")}${corpo.mensagem ? `?text=${encodeURIComponent(corpo.mensagem)}` : ""}`
          : corpo.url;
        if (!url) return res.status(400).json({ error: "Informe um telefone ou um endereço." });

        // A chave é curta porque vai dentro de uma mensagem de WhatsApp, e
        // link comprido ali parece golpe.
        const chave = (corpo.chave || Math.random().toString(36).slice(2, 8))
          .toLowerCase().replace(/[^a-z0-9-]/g, "").slice(0, 24);

        // `descricao` é obrigatória na tabela, que nasceu para os links que a
        // IA manda e onde a descrição é o que ensina o modelo quando usar cada
        // um. Aqui ninguém vai escrever isso, então o rótulo serve.
        const { data, error } = await sb.from("links").upsert({
          cliente_id: clienteId, chave, url,
          descricao: corpo.descricao || corpo.rotulo || "Link de disparo",
          destino_rotulo: corpo.rotulo || null,
          ativo: true,
        }, { onConflict: "cliente_id,chave" }).select().single();
        if (error) return res.status(400).json({ error: error.message });
        return res.status(200).json({ link: data });
      }

      // Conta o público sem criar nada. É o número que a pessoa vê antes de
      // apertar qualquer botão, e ver isso errado é mandar para quem não devia.
      if (corpo.acao === "contar") {
        const alvo = await publicoDo(sb, clienteId, corpo.publico || {});
        return res.status(200).json({ alvo: alvo.length });
      }
      return res.status(200).json(await criarDisparo(sb, clienteId, corpo, s?.nome || null));
    }

    if (q.rota === "disparar") {
      if (req.method !== "POST") return res.status(405).json({ error: "Método não permitido" });
      if (!corpo.disparo) return res.status(400).json({ error: "Disparo não informado." });

      if (corpo.acao === "testar") {
        return res.status(200).json(
          await testarDisparo(sb, clienteId, corpo.disparo, corpo.telefone, base));
      }
      return res.status(200).json(await enviarLote(sb, clienteId, corpo.disparo, base));
    }

    return res.status(400).json({ error: "Rota desconhecida." });
  } catch (e) {
    return res.status(400).json({ error: e.message });
  }
}
