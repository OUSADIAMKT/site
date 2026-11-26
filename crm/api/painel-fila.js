// A fila vista de dentro. O operador enxerga tudo do cliente escolhido;
// o atendente enxerga a fila do cliente dele e o que está na mão dele.

import { db, credenciaisDoCanal, abrirConversa } from "./_db.js";
import { barrou, sessao, clientePermitido } from "./_painel.js";
import { distribuir, devolver, encerrar, puxarDaFila, atenderAgora, soltarInativas, enfileirar, passarPara, atribuir } from "./_fila.js";
import { carregarQuadro, montarQuadro, montarIndicadores, lerPrevias } from "./_quadro.js";
import { lerSemResposta, comSemResposta } from "./_semResposta.js";
import { lerNaoLidas, comNaoLidas, marcarLido, marcarNaoLido, quemLe } from "./_leitura.js";
import { abrirCanal } from "./_canal.js";
import {
  subirMidia, tipoDoMime, TETO_META,
  listarTemplates, lerModelo, preencherModelo, enviarTemplate,
} from "./_wa.js";
import {
  r2Ligado, urlDeEnvio, chaveTemporaria, chaveTemporariaDoCliente, baixarDoR2,
  copiarNoR2, apagarDoR2, chavePermanente, paraBanco, bytesCombinam,
} from "./_r2.js";
import { TETO_REPASSE } from "./_arquivo.js";
import { paraE164, variantesE164 } from "./_telefone.js";
import { salvarContato } from "./_crm.js";
import { garantirNegocioDaConversa } from "./_negocios.js";

export default async function handler(req, res) {
  if (await barrou(req, res)) return;
  const s = await sessao(req);
  const sb = db();

  if (req.method === "GET") {
    // ---------- só a equipe ----------
    // A tela da conversa precisa da lista de colegas para o "passar para", e
    // nada mais. Atendente não pode chamar `painel-atendentes`, que é do
    // operador, e a leitura inteira da fila seriam cinco consultas por
    // conversa aberta. Esta é uma.
    //
    // Sai antes de todo o resto por dois motivos. Primeiro, o cliente pode vir
    // da conversa aberta: a sessão de operador, que é a do gestor, vale para
    // todos os clientes e por isso não carrega nenhum, e a tela da conversa só
    // conhece o id da conversa. Sem este caminho a lista voltava vazia para o
    // gestor, o botão de passar nem aparecia, e a única saída visível era
    // devolver para a IA. Segundo, montar uma lista de nomes é leitura: não tem
    // por que passar por `soltarInativas`, que escreve.
    if (req.query?.rota === "equipe") {
      let dono = req.query?.cliente || null;
      if (!dono && req.query?.conversa) {
        const { data: conversa } = await sb.from("conversas")
          .select("cliente_id").eq("id", req.query.conversa).maybeSingle();
        dono = conversa?.cliente_id || null;
      }
      const deQuem = await clientePermitido(req, dono);
      if (!deQuem) return res.status(403).json({ error: "Cliente não permitido." });

      const { data: equipe, error } = await sb.from("atendentes")
        .select("id, nome, disponivel, assuntos")
        .eq("cliente_id", deQuem).eq("ativo", true).order("nome");
      if (error) return res.status(500).json({ error: "Falha ao ler a equipe", detalhe: error.message });
      return res.status(200).json({
        sessao: { tipo: s.tipo, nome: s.nome, atendente: s.atendente || null },
        atendentes: equipe || [],
      });
    }

    // ---------- os modelos aprovados, para a tela da conversa ----------
    // Mesma porta da equipe, e pelos mesmos dois motivos: o cliente pode vir
    // da conversa aberta (a sessão do gestor não carrega cliente nenhum), e
    // listar modelos é leitura, não tem por que passar por `soltarInativas`.
    //
    // Os modelos vivem na Meta, não aqui. Quando a chamada falha, a resposta
    // sai com a lista vazia e o motivo escrito: a tela precisa dizer "não deu
    // para ler os modelos agora" em vez de "este número não tem modelo".
    if (req.query?.rota === "modelos") {
      let dono = req.query?.cliente || null;
      if (!dono && req.query?.conversa) {
        const { data: conversa } = await sb.from("conversas")
          .select("cliente_id").eq("id", req.query.conversa).maybeSingle();
        dono = conversa?.cliente_id || null;
      }
      const deQuem = await clientePermitido(req, dono);
      if (!deQuem) return res.status(403).json({ error: "Cliente não permitido." });

      const cli = await credenciaisDoCanal(deQuem, "whatsapp");
      if (!cli?.wa_token || !(cli.wa_conta_id || cli.wa_waba_id)) {
        return res.status(200).json({
          modelos: [],
          aviso: "O WhatsApp deste cliente ainda não está ligado na conta de mensagens, então não há modelo para listar.",
        });
      }
      try {
        const lista = await listarTemplates(cli);
        const modelos = lista.map(lerModelo)
          .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
        return res.status(200).json({ modelos });
      } catch (e) {
        console.warn("[fila] não deu para listar os modelos:", e.message);
        return res.status(200).json({
          modelos: [],
          aviso: `Não deu para ler os modelos na Meta agora: ${e.message}`,
        });
      }
    }

    const clienteId = await clientePermitido(req, req.query?.cliente);
    if (!clienteId) return res.status(403).json({ error: "Cliente não permitido." });

    // Antes de mostrar a fila, devolve para a IA o que está parado há mais de
    // o prazo de inatividade. Abrir a tela é o momento em que isso precisa
    // estar certo.
    await soltarInativas(clienteId).catch((e) =>
      console.warn("[fila] não deu para soltar as inativas:", e.message));

    // O quadro é outra leitura das mesmas conversas: em colunas, em vez de
    // duas listas. Sai antes e por um caminho próprio porque a tela Fila
    // depende da resposta de baixo exatamente como ela é hoje.

    if (req.query?.rota === "quadro") {
      const limite = Math.min(Number(req.query.limite) || 50, 200);

      // O filtro vem da tela e é aplicado AQUI, sobre todas as conversas que
      // esta sessão pode ver, e não sobre a página que a tela já tem na mão.
      // Era esse o defeito: filtrar na tela só encontrava quem já estava
      // dentro das cinquenta primeiras linhas de cada coluna.
      const filtro = {
        canal: req.query.canal || "",
        atendente: req.query.atendente || "",
        etiqueta: req.query.etiqueta || "",
        tempo: req.query.tempo || "",
        janela: req.query.janela || "",
        parados: req.query.parados === "1",
        naoLidas: req.query.naoLidas === "1",
      };

      const agora = new Date();
      const dados = await carregarQuadro(clienteId, {
        busca: req.query.busca, quem: quemLe(s),
      });

      // Monta duas vezes de propósito, e isso não custa ida ao banco nenhuma:
      // `montarQuadro` é pura. A primeira passada diz quais cartões a tela vai
      // mostrar; só então as prévias desses são buscadas. Buscar antes traria
      // prévia de seiscentas conversas para mostrar cinquenta.
      const previo = montarQuadro(dados, agora, { limite, filtro, ordem: req.query.ordem });
      const visiveis = [...previo.precisa, ...previo.atendendo, ...previo.ia]
        .map((c) => c.id);
      dados.ultimas = await lerPrevias(visiveis);

      const quadro = montarQuadro(dados, agora, { limite, filtro, ordem: req.query.ordem });
      const indicadores = montarIndicadores(dados, agora);

      const { data: equipe } = await sb.from("atendentes")
        .select("id, nome, disponivel").eq("cliente_id", clienteId).eq("ativo", true).order("nome");

      // As etiquetas de todas as conversas do cliente, para o seletor do
      // filtro. Saem daqui e não das que estão na tela: filtrar por uma
      // etiqueta que só existe atrás do corte precisa dela na lista.
      const { data: comEtiqueta } = await sb.from("conversas")
        .select("etiquetas").eq("cliente_id", clienteId).not("etiquetas", "is", null).limit(2000);
      const nomes = new Set();
      for (const linha of comEtiqueta || []) for (const e of linha.etiquetas || []) nomes.add(e);

      return res.status(200).json({
        sessao: { tipo: s.tipo, nome: s.nome, atendente: s.atendente || null },
        quadro,
        indicadores,
        atendentes: equipe || [],
        etiquetas: [...nomes].sort(),
      });
    }

    const [espera, comigo, atendentes, resumo, encerrados] = await Promise.all([
      sb.from("conversas")
        .select("id, canal, contato, telefone, nome_contato, score, etiquetas, fila_desde, motivo_fila")
        .eq("cliente_id", clienteId).eq("modo", "fila")
        .order("fila_desde", { ascending: true }),
      sb.from("conversas")
        .select("id, canal, contato, telefone, nome_contato, score, etiquetas, assumida_em, motivo_fila, atendente_id, assumido_por, atendentes(nome)")
        .eq("cliente_id", clienteId).eq("modo", "humano")
        .order("assumida_em", { ascending: true }),
      sb.from("atendentes")
        .select("id, nome, disponivel, ativo, assuntos")
        .eq("cliente_id", clienteId).eq("ativo", true).order("nome"),
      sb.from("fila_resumo").select("*").eq("cliente_id", clienteId).maybeSingle(),
      // O que já passou pela mão de alguém. Sem isto, atendimento encerrado
      // some da tela e ninguém sabe mais que aquela pessoa foi atendida, quando,
      // por quem e por quê.
      sb.from("atendimentos")
        .select("id, conversa_id, atendente_id, assumido_por, entrou_fila, assumida_em, encerrada_em, desfecho, motivo,"
          + " atendentes(nome), conversas(canal, contato, telefone, nome_contato)")
        .eq("cliente_id", clienteId)
        .not("encerrada_em", "is", null)
        .order("encerrada_em", { ascending: false })
        .limit(40),
    ]);

    const erro = espera.error || comigo.error || atendentes.error;
    if (erro) return res.status(500).json({ error: "Falha ao ler a fila", detalhe: erro.message });

    const todas = comigo.data || [];
    const minhasCruas = s.tipo === "atendente" ? todas.filter((c) => c.atendente_id === s.atendente) : todas;

    // Quantas mensagens cada pessoa mandou sem receber resposta. Numa chamada
    // só, para as duas listas: quem está esperando e quem está com a equipe.
    const situacoes = await lerSemResposta([
      ...(espera.data || []).map((c) => c.id),
      ...todas.map((c) => c.id),
    ]);
    const leituras = await lerNaoLidas([
      ...(espera.data || []).map((c) => c.id),
      ...todas.map((c) => c.id),
    ], quemLe(s));
    const esperando = comNaoLidas(comSemResposta(espera.data || [], situacoes), leituras);
    const minhas = comNaoLidas(comSemResposta(minhasCruas, situacoes), leituras);

    const eu = s.tipo === "atendente"
      ? (atendentes.data || []).find((a) => a.id === s.atendente) || null
      : null;

    return res.status(200).json({
      sessao: { tipo: s.tipo, nome: s.nome, atendente: s.atendente || null },
      eu,
      esperando,
      em_atendimento: minhas,
      todas_em_atendimento: s.tipo === "operador" ? comNaoLidas(comSemResposta(todas, situacoes), leituras) : undefined,
      atendentes: atendentes.data || [],
      resumo: resumo.data || null,
      encerrados: s.tipo === "atendente"
        ? (encerrados.data || []).filter((a) => a.atendente_id === s.atendente)
        : (encerrados.data || []),
    });
  }

  if (req.method !== "POST") return res.status(405).json({ error: "Método não permitido" });

  const { acao, conversa_id, texto } = req.body || {};

  // ---------- ficar disponível ou sair ----------
  if (acao === "disponibilidade") {
    if (s.tipo !== "atendente") return res.status(403).json({ error: "Só atendente muda a própria situação." });

    const { disponivel } = req.body;
    const { error } = await sb.from("atendentes")
      .update({ disponivel: Boolean(disponivel) }).eq("id", s.atendente);
    if (error) return res.status(500).json({ error: error.message });

    // Ao ficar disponível, puxa quem está esperando em vez de deixar parado.
    const entregues = disponivel ? await puxarDaFila(s.cliente) : [];
    return res.status(200).json({ ok: true, entregues: entregues.length });
  }

  // ---------- começar uma conversa do zero ----------
  // Não leva `conversa_id` porque é ela que cria a conversa. Fica aqui em
  // cima, antes da trava, de propósito.
  if (acao === "nova_conversa") {
    try {
      return await comecarConversa(req, res, { s, sb });
    } catch (e) {
      return res.status(500).json({ error: e.message });
    }
  }

  if (!conversa_id) return res.status(400).json({ error: "Conversa não informada." });

  // Confere que a conversa é do cliente que a sessão pode ver.
  const { data: conversa } = await sb.from("conversas")
    .select("id, cliente_id, modo, atendente_id, canal, contato, telefone")
    .eq("id", conversa_id).maybeSingle();
  if (!conversa) return res.status(404).json({ error: "Conversa não encontrada." });
  if (!await clientePermitido(req, conversa.cliente_id)) {
    return res.status(403).json({ error: "Conversa de outro cliente." });
  }

  try {
    // ---------- marcar como lida ou como não lida ----------
    // Marca interna do painel, por pessoa. Nada disto vira visto-azul no
    // WhatsApp: a Meta não fica sabendo que alguém abriu a conversa aqui.
    if (acao === "ler") {
      return res.status(200).json(await marcarLido(conversa_id, quemLe(s)));
    }
    if (acao === "nao_lido") {
      return res.status(200).json(await marcarNaoLido(conversa_id, quemLe(s)));
    }

    // ---------- pegar da fila para si ----------
    if (acao === "assumir") {
      const alvo = s.tipo === "atendente" ? s.atendente : req.body.atendente_id;
      if (!alvo) return res.status(400).json({ error: "Informe para quem atribuir." });

      // Era um UPDATE escrito à mão aqui, e ele gravava menos que o resto do
      // sistema: punha a conversa em atendimento sem tocar na passagem aberta
      // em `atendimentos`. O atendimento ficava sem `atendente_id` e sem
      // `assumido_por`, isto é, nascia órfão de novo, que é exatamente o que a
      // migração 042 existiu para acabar. `atribuir` faz as duas coisas e
      // mantém a mesma trava de corrida (só pega quem está na fila).
      const r = await atribuir(conversa_id, alvo);
      if (r.esperando) return res.status(409).json({ error: "Alguém pegou esta conversa antes." });
      return res.status(200).json({ ok: true, atendente: r.atendente || null });
    }

    // ---------- entrar numa conversa que está com a IA ----------
    // O "assumir" acima só pega quem está na fila. Este pega qualquer uma: é
    // alguém lendo a conversa na aba Conversas e decidindo entrar nela. A
    // partir daqui a IA cala, e só volta a falar quando a conversa for
    // encerrada ou passar do prazo de inatividade sem ninguém falar nada.
    if (acao === "atender") {
      const alvo = s.tipo === "atendente" ? s.atendente : (req.body.atendente_id || null);
      const resultado = await atenderAgora(conversa_id, alvo, req.body.motivo || null, quemLe(s));
      if (resultado.ja_estava) {
        return res.status(409).json({ error: "Esta conversa já está em atendimento humano." });
      }
      return res.status(200).json(resultado);
    }

    // ---------- mandar de volta para a fila, pelo quadro ----------
    // Difere de "devolver" em uma coisa só: carrega o motivo escrito por quem
    // moveu. Quem abrir o cartão depois precisa saber por que ele voltou.
    if (acao === "enfileirar") {
      const motivo = req.body.motivo || `Movida para a fila no quadro por ${s.nome || "alguém da equipe"}.`;
      return res.status(200).json(await enfileirar(conversa_id, motivo));
    }

    // ---------- passar a conversa para um colega ----------
    // Quem segura a conversa pode passar; gestor e operador podem passar
    // qualquer uma. Atendente que não está com ela na mão, não.
    if (acao === "passar") {
      const para = req.body.para_atendente_id;
      if (!para) return res.status(400).json({ error: "Informe para quem passar." });
      if (s.tipo === "atendente" && conversa.atendente_id !== s.atendente) {
        return res.status(403).json({ error: "Esta conversa não está com você." });
      }
      const r = await passarPara(conversa_id, para, req.body.motivo, s.nome || null);
      if (r.erro) return res.status(409).json({ error: r.erro });
      return res.status(200).json(r);
    }

    if (acao === "devolver") return res.status(200).json(await devolver(conversa_id));
    // Encerrar e devolver são a mesma porta e o mesmo efeito: a IA volta a
    // responder. O que muda é o que fica escrito no relatório.
    if (acao === "encerrar") {
      return res.status(200).json(await encerrar(conversa_id, req.body.desfecho));
    }
    if (acao === "distribuir") return res.status(200).json(await distribuir(conversa_id, conversa.cliente_id));

    // ---------- responder o paciente ----------
    // Escreve como o número do cliente. Depende da conexão com a Meta:
    // enquanto o WhatsApp não estiver ligado, isto devolve erro de credencial.
    if (acao === "responder") {
      if (!texto?.trim()) return res.status(400).json({ error: "Escreva a mensagem." });
      if (conversa.modo !== "humano") {
        return res.status(409).json({ error: "Esta conversa não está em atendimento humano." });
      }
      if (s.tipo === "atendente" && conversa.atendente_id !== s.atendente) {
        return res.status(403).json({ error: "Esta conversa está com outra pessoa." });
      }

      // `ig_base` não é detalhe: é o host da API, e ele muda conforme o tipo do
      // token. Sem essa coluna aqui, o envio caía no host padrão e o Instagram
      // respondia "401: Cannot parse access token" com um token perfeitamente
      // válido. O bot respondia normal e só a resposta humana morria.
      //
      // As credenciais vêm de `canais`, não das colunas de `clientes`. Quem foi
      // cadastrado na tela de Canais tem as colunas velhas vazias, e ler delas
      // aqui dizia "o WhatsApp deste cliente ainda não está conectado" com o
      // número no ar e a IA respondendo ao lado. Foi o caso da empresa.
      const cli = await credenciaisDoCanal(
        conversa.cliente_id,
        conversa.canal === "instagram" ? "instagram" : "whatsapp",
      );

      // A resposta sai pelo mesmo canal em que a pessoa escreveu. Mandar no
      // canal errado é falar com outra pessoa.
      const conectado = conversa.canal === "instagram"
        ? Boolean(cli?.ig_user_id && cli?.ig_token)
        : Boolean(cli?.wa_phone_number_id && cli?.wa_token);

      if (!conectado) {
        const nome = conversa.canal === "instagram" ? "Instagram" : "WhatsApp";
        return res.status(409).json({
          error: `O ${nome} deste cliente ainda não está conectado, então a mensagem não sai daqui.`,
        });
      }

      const canal = abrirCanal({
        canal: conversa.canal || "whatsapp",
        cliente: cli,
        contato: conversa.contato || conversa.telefone,
      });
      await canal.texto(texto.trim());

      await sb.from("mensagens").insert({
        conversa_id,
        papel: "assistant",
        conteudo: [{ type: "text", text: texto.trim() }],
      });
      await sb.from("conversas")
        .update({ ultima_em: new Date().toISOString() }).eq("id", conversa_id);

      return res.status(200).json({ ok: true });
    }

    // ---------- responder com modelo aprovado ----------
    // É o único jeito de falar primeiro com quem está fora da janela de 24h:
    // depois dela, a Meta recusa texto livre e aceita só modelo aprovado.
    //
    // Passa pelas mesmas travas do arquivo de propósito (atendimento humano,
    // titularidade, canal ligado), com a redação trocada. Duas cópias dessas
    // regras divergiriam na primeira correção, e a esquecida seria justamente
    // a que deixa alguém escrever numa conversa que não é dele.
    if (acao === "modelo") {
      const nome = String(req.body.modelo || "").trim();
      if (!nome) return res.status(400).json({ error: "Escolha um modelo." });

      const t = await travasDaMidia({
        s,
        conversa,
        textos: {
          instagram: "Modelo aprovado é coisa do WhatsApp. No Instagram não existe a janela de 24 horas "
            + "nem modelo: ali dá para escrever direto.",
          desconectado: "O WhatsApp deste cliente ainda não está conectado, então o modelo não sai daqui.",
        },
      });
      if (t.status) return res.status(t.status).json(t.corpo);

      // A lista vem da Meta, não da tela. Quem escolhe é a atendente, mas quem
      // diz quantos campos o modelo tem é o corpo aprovado: aceitar o número
      // que a tela mandar é aceitar um 132000 que não entrega e não explica.
      let modelo;
      try {
        modelo = (await listarTemplates(t.cli)).map(lerModelo).find((m) => m.nome === nome);
      } catch (e) {
        return res.status(502).json({ error: `Não deu para confirmar o modelo na Meta: ${e.message}` });
      }
      if (!modelo) {
        return res.status(404).json({
          error: "Esse modelo não está na lista de aprovados deste número. Recarregue a lista.",
        });
      }
      if (modelo.cabecalho_de_midia) {
        return res.status(409).json({
          error: "Esse modelo tem imagem ou arquivo no cabeçalho, e isso ainda não sai por aqui.",
        });
      }

      const campos = Array.isArray(req.body.campos) ? req.body.campos.map((v) => String(v ?? "")) : [];
      const preenchidos = campos.slice(0, modelo.campos);
      if (preenchidos.length !== modelo.campos || preenchidos.some((v) => !v.trim())) {
        return res.status(400).json({
          error: modelo.campos === 1
            ? "Esse modelo tem um campo para preencher, e ele não pode ficar em branco."
            : `Esse modelo tem ${modelo.campos} campos para preencher, e nenhum pode ficar em branco.`,
        });
      }

      // A Meta recusa quebra de linha e espaço duplo dentro de parâmetro.
      const valores = preenchidos.map((v) => v.replace(/\s+/g, " ").trim());
      const para = String(conversa.contato || conversa.telefone || "").replace("+", "");
      await enviarTemplate(t.cli, para, modelo.nome, modelo.idioma, valores);

      // Fica no histórico com o texto que a pessoa vai ler, não com o nome do
      // modelo: é o que a tela mostra e é o que a IA lê quando a conversa
      // volta para ela. O nome fica na linha de cima, entre parênteses, para
      // a equipe saber que não foi digitado na hora.
      const lido = preencherModelo(modelo.corpo, valores);
      await sb.from("mensagens").insert({
        conversa_id,
        papel: "assistant",
        conteudo: [{ type: "text", text: `(modelo ${modelo.nome})\n${lido}` }],
      });
      await sb.from("conversas")
        .update({ ultima_em: new Date().toISOString() }).eq("id", conversa_id);

      // A janela NÃO reabre com isso. Só a resposta da pessoa reabre, e é o
      // webhook que grava `janela_expira_em`. Prometer o contrário aqui faria
      // a tela liberar o campo de texto e as mensagens seguintes morrerem.
      return res.status(200).json({ ok: true, enviado: lido });
    }

    // ---------- responder com arquivo ----------
    // Mesma porta do texto, de propósito: as travas que importam aqui são as
    // do texto (conversa em atendimento humano, titularidade, canal ligado), e
    // duas cópias delas divergiriam na primeira correção de regra.
    if (acao === "midia") return await responderComMidia(req, res, { s, sb, conversa });

    // ---------- pedir o lugar para subir o arquivo ----------
    // Primeira das duas etapas do caminho novo: a tela pergunta onde pode
    // subir, o servidor confere tudo e devolve uma URL assinada para o R2. O
    // arquivo vai do navegador direto para o cofre, sem passar por aqui.
    if (acao === "midia_assinar") return await assinarEnvioDeMidia(req, res, { s, conversa });

    return res.status(400).json({ error: "Ação desconhecida." });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}

// ---------------------------------------------------------------------------
// O arquivo que a equipe manda. Sobe para a Meta, sai pelo canal, e fica
// gravado como mensagem com `tipo` e `midia_id`, que é o que faz ele aparecer
// de volta no histórico pela mesma rota que mostra o que a pessoa mandou.

// Quanto o arquivo pode ter. O limite NÃO é o da Meta (5 MB em foto, 16 em
// vídeo e áudio, 100 em documento): é o corpo de uma função da Vercel, que
// para em 4,5 MB, e o arquivo chega em base64, que infla um terço. Três
// megabytes de arquivo são quatro de corpo, e aí ainda cabe.
//
// Avisar isso na tela, antes de escolher, é o que separa "o sistema não manda
// vídeo grande" de "aperto enviar e some".
const LIMITE_UPLOAD = 3 * 1024 * 1024;

// Como a mensagem enviada fica escrita no histórico. Segue a convenção que o
// webhook já usa para o que chega ("(enviou uma foto)"), porque a mesma tela
// lê as duas e porque a IA lê isto como histórico quando a conversa volta
// para ela: "(enviou uma foto)" ela entende, um bloco inventado derruba a
// chamada inteira da API.
const ROTULO_SAIDA = {
  image: "uma foto", video: "um vídeo", audio: "um áudio",
  sticker: "uma figurinha", document: "um documento",
};

/**
 * As travas de mandar arquivo, num lugar só.
 *
 * As duas etapas do caminho novo (assinar e confirmar) e o caminho antigo
 * (base64) passam exatamente por elas, na mesma ordem. Em duas cópias, a
 * primeira correção de regra passaria a valer só num dos caminhos, e o
 * caminho esquecido seria justamente o que deixa alguém mandar arquivo numa
 * conversa que não é dele.
 *
 * Devolve `{ cli }` quando pode seguir, ou `{ status, corpo }` para a resposta.
 */
async function travasDaMidia({ s, conversa, textos = {} }) {
  if (conversa.modo !== "humano") {
    return { status: 409, corpo: { error: "Esta conversa não está em atendimento humano." } };
  }
  if (s.tipo === "atendente" && conversa.atendente_id !== s.atendente) {
    return { status: 403, corpo: { error: "Esta conversa está com outra pessoa." } };
  }

  // Mídia pelo painel é só WhatsApp. No Instagram a API oficial pede uma URL
  // pública do arquivo, e publicar o anexo de um atendimento na internet para
  // poder mandar é pior do que não mandar. O R2 não muda isso: o bucket é
  // privado de propósito, e abrir uma URL pública permanente para alimentar a
  // Meta desfaria a razão de ele existir.
  if (conversa.canal === "instagram") {
    return {
      status: 409,
      corpo: {
        error: textos.instagram
          || "Arquivo pela API oficial do Instagram ainda não: a Meta exige uma URL pública do arquivo. "
          + "Por aqui só texto; o WhatsApp aceita os dois.",
      },
    };
  }

  const cli = await credenciaisDoCanal(conversa.cliente_id, "whatsapp");
  if (!cli?.wa_phone_number_id || !cli?.wa_token) {
    return {
      status: 409,
      corpo: {
        error: textos.desconectado
          || "O WhatsApp deste cliente ainda não está conectado, então o arquivo não sai daqui.",
      },
    };
  }

  return { cli };
}

/**
 * Quanto cada tipo pode ter pelo caminho do R2.
 *
 * É o teto da Meta, com um corte no repasse: os bytes ainda passam pela função
 * na ida para o `/media` da Meta. Documento é o único que o corte alcança (a
 * Meta aceita 100 MB), e é melhor dizer 20 do que aceitar 100 e morrer no
 * tempo da função.
 */
export function tetoDoTipo(tipo) {
  return Math.min(TETO_META[tipo] ?? 0, TETO_REPASSE);
}

/**
 * Etapa 1: a tela diz o que quer mandar, o servidor devolve onde subir.
 *
 * Tudo que dá para conferir antes é conferido aqui: a conversa, a pessoa, o
 * canal, o formato e o tamanho declarado. Assinar uma URL para um arquivo que
 * a Meta vai recusar é gastar o upload de quem está atendendo para nada.
 *
 * O nome do objeto é escolhido AQUI, nunca pela tela. É o que garante que o
 * arquivo caia na pasta da empresa certa e com um nome que ninguém adivinha.
 */
async function assinarEnvioDeMidia(req, res, { s, conversa }) {
  const trava = await travasDaMidia({ s, conversa });
  if (trava.status) return res.status(trava.status).json(trava.corpo);

  if (!r2Ligado()) {
    return res.status(409).json({
      error: "O cofre de arquivos não está configurado neste ambiente.",
      limite: LIMITE_UPLOAD,
      detalhe: "Sem ele o painel ainda manda arquivo pequeno pelo caminho antigo.",
    });
  }

  const mime = String(req.body?.mime || "").split(";")[0].trim().toLowerCase();
  const tipo = tipoDoMime(mime);
  if (!tipo) {
    return res.status(415).json({
      error: `A API oficial da Meta não aceita ${mime || "este formato"} no WhatsApp.`,
    });
  }

  const tamanho = Number(req.body?.tamanho || 0);
  if (!Number.isFinite(tamanho) || tamanho <= 0) {
    return res.status(400).json({ error: "Tamanho do arquivo não informado." });
  }
  if (tamanho > tetoDoTipo(tipo)) {
    return res.status(413).json({
      error: `Este tipo vai até ${(tetoDoTipo(tipo) / 1048576).toFixed(1)} MB por arquivo.`,
      limite: tetoDoTipo(tipo),
    });
  }

  const chave = chaveTemporaria({ clienteId: conversa.cliente_id, mime });
  const { url, expira_em } = urlDeEnvio({ chave });

  return res.status(200).json({ chave, url, expira_em, tipo, limite: tetoDoTipo(tipo) });
}

/**
 * Essa mídia já virou mensagem nesta conversa?
 *
 * Duas marcas identificam o mesmo envio: a chave do objeto no cofre, sorteada
 * por upload, e o id que a Meta devolve ao receber o arquivo. Qualquer uma das
 * duas achando linha quer dizer que a mensagem já saiu.
 *
 * A consulta é chamada mais de uma vez de propósito, e a última vez é
 * imediatamente antes de entregar. Entre conferir e entregar existe uma janela
 * em que dois pedidos iguais passariam os dois, e cada ida ao banco antes da
 * entrega encurta essa janela.
 */
async function jaVirouMensagem(sb, conversaId, { chave = null, waMediaId = null }) {
  if (chave) {
    const { data } = await sb.from("mensagens")
      .select("id").eq("conversa_id", conversaId).eq("midia_url", paraBanco(chave)).maybeSingle();
    if (data) return data.id;
  }
  if (waMediaId) {
    const { data } = await sb.from("mensagens")
      .select("id").eq("conversa_id", conversaId).eq("midia_id", waMediaId).maybeSingle();
    if (data) return data.id;
  }
  return null;
}

async function responderComMidia(req, res, { s, sb, conversa }) {
  const { conversa_id, arquivo, mime, nome, legenda } = req.body || {};
  const conversaId = conversa_id;

  const trava = await travasDaMidia({ s, conversa });
  if (trava.status) return res.status(trava.status).json(trava.corpo);
  const cli = trava.cli;

  // Reenvio depois de uma falha: o arquivo já subiu e a tela devolveu o id.
  // Sem este caminho, "tentar novamente" sobe o arquivo de novo e manda de
  // novo, e quem recebe vê a mesma foto duas vezes quando a primeira na
  // verdade tinha saído e só a resposta se perdeu.
  let waMediaId = String(req.body?.media_id || "").trim() || null;
  let tipo = req.body?.tipo || null;

  // O nome do objeto no cofre, quando o arquivo veio por lá. Entra como
  // temporário (`tmp/`) e, depois de a Meta aceitar, muda para o nome
  // definitivo: é o que diferencia o arquivo entregue do arquivo que subiu e
  // nunca virou mensagem.
  const chaveCrua = String(req.body?.chave || "").trim() || null;
  let chaveTemporariaUsada = null;
  let chaveFinal = null;

  if (waMediaId) {
    const jaSaiu = await jaVirouMensagem(sb, conversaId, { waMediaId });
    if (jaSaiu) return res.status(200).json({ ok: true, repetido: true, mensagem: jaSaiu });
    if (!tipo || !ROTULO_SAIDA[tipo]) {
      return res.status(400).json({ error: "Reenvio sem o tipo do arquivo." });
    }

    // O reenvio não sobe o arquivo outra vez, mas carrega a mesma chave: sem
    // ela, a cópia no cofre ficaria órfã em `tmp/` e a regra de ciclo de vida
    // apagaria o arquivo de uma mensagem que foi entregue.
    if (chaveCrua) chaveTemporariaUsada = chaveTemporariaDoCliente(chaveCrua, conversa.cliente_id);
  } else if (chaveCrua) {
    // ---------- caminho do cofre ----------
    // O arquivo já subiu, direto do navegador para o R2. Daqui para a frente
    // nada do que a tela disse é levado na fé.

    // A chave tem que ser da pasta temporária DESTA empresa e ter o formato
    // que o servidor gera. Sem esta porta, uma sessão de atendente manda a
    // chave de outro cliente e usa o nosso servidor para ler o arquivo dele.
    const chave = chaveTemporariaDoCliente(chaveCrua, conversa.cliente_id);
    if (!chave) return res.status(400).json({ error: "Arquivo não reconhecido." });

    tipo = tipoDoMime(mime);
    if (!tipo) {
      return res.status(415).json({
        error: `A API oficial da Meta não aceita ${mime || "este formato"} no WhatsApp.`,
      });
    }

    // Confirmar duas vezes o mesmo arquivo não manda duas vezes. O par
    // conversa + chave é único porque a chave é sorteada por envio.
    const jaFoi = await jaVirouMensagem(sb, conversaId, { chave });
    if (jaFoi) return res.status(200).json({ ok: true, repetido: true, mensagem: jaFoi });

    const guardado = await baixarDoR2(chave).catch((e) => {
      console.error("[r2] leitura falhou:", e?.message || e);
      return null;
    });
    if (!guardado?.conteudo?.length) {
      return res.status(410).json({
        error: "O arquivo não chegou ao cofre, ou já saiu de lá.",
        detalhe: "Escolha o arquivo de novo. O envio tem cinco minutos entre escolher e confirmar.",
      });
    }

    const bytes = guardado.conteudo;
    // O tamanho declarado na etapa 1 não prova nada: a URL assinada aceita o
    // que o navegador mandar, dentro do prazo. Quem manda é o arquivo que
    // chegou.
    if (bytes.length > tetoDoTipo(tipo)) {
      await apagarDoR2(chave).catch(() => {});
      return res.status(413).json({
        error: `Este tipo vai até ${(tetoDoTipo(tipo) / 1048576).toFixed(1)} MB, e chegaram `
          + `${(bytes.length / 1048576).toFixed(1)} MB.`,
      });
    }

    // E o tipo declarado também não prova nada. Olhar o começo do arquivo é o
    // que impede o cofre do atendimento de virar hospedagem de arquivo
    // qualquer, pago pelo cliente.
    if (!bytesCombinam(mime, bytes)) {
      await apagarDoR2(chave).catch(() => {});
      return res.status(415).json({
        error: "O arquivo não é do tipo que foi declarado.",
      });
    }

    waMediaId = await subirMidia(cli, {
      conteudo: bytes,
      mime: String(mime).split(";")[0].trim(),
      nome: nome || "arquivo",
    });

    // A mudança de `tmp/` para o lugar definitivo não acontece aqui: acontece
    // depois de a mensagem ser entregue. Arquivo que subiu e não foi entregue
    // continua sendo lixo, e lixo tem que ficar onde a regra de ciclo de vida
    // alcança.
    chaveTemporariaUsada = chave;
  } else {
    if (!arquivo) return res.status(400).json({ error: "Nenhum arquivo recebido." });

    tipo = tipoDoMime(mime);
    if (!tipo) {
      return res.status(415).json({
        error: `A API oficial da Meta não aceita ${mime || "este formato"} no WhatsApp.`,
        detalhe: "Aceita JPEG e PNG em foto, WebP em figurinha, MP4 em vídeo, "
          + "OGG/Opus, MP3, AAC, AMR e MP4 em áudio, e PDF, texto, CSV, Word, Excel "
          + "e PowerPoint em documento.",
      });
    }

    let bytes;
    try {
      bytes = Buffer.from(String(arquivo), "base64");
    } catch {
      return res.status(400).json({ error: "Arquivo ilegível." });
    }
    if (!bytes.length) return res.status(400).json({ error: "Arquivo vazio." });

    if (bytes.length > LIMITE_UPLOAD) {
      return res.status(413).json({
        error: `Arquivo de ${(bytes.length / 1048576).toFixed(1)} MB. O limite deste caminho é `
          + `${(LIMITE_UPLOAD / 1048576).toFixed(0)} MB.`,
        detalhe: "Não é limite da Meta, é o tamanho máximo de uma requisição na Vercel. "
          + "Para vídeo grande, mande pelo celular por enquanto.",
      });
    }
    if (bytes.length > TETO_META[tipo]) {
      return res.status(413).json({
        error: `A Meta recusa ${tipo} acima de ${(TETO_META[tipo] / 1048576).toFixed(1)} MB.`,
      });
    }

    waMediaId = await subirMidia(cli, {
      conteudo: bytes,
      mime: String(mime).split(";")[0].trim(),
      nome: nome || "arquivo",
    });
  }

  const canal = abrirCanal({
    canal: "whatsapp",
    cliente: cli,
    contato: conversa.contato || conversa.telefone,
  });

  const textoLegenda = String(legenda || "").trim();

  // A última conferência antes de entregar.
  //
  // Subir o arquivo para a Meta leva segundos, e nesses segundos um segundo
  // pedido igual (duas abas, um toque duplo que a tela não bloqueou, um
  // reenvio automático depois de um tempo esgotado) pode ter entregado a mesma
  // mídia. Sem esta linha, a janela de duplicidade é o upload inteiro; com
  // ela, é só a chamada de entrega.
  const entregueAntes = await jaVirouMensagem(sb, conversaId, {
    chave: chaveTemporariaUsada, waMediaId,
  });
  if (entregueAntes) {
    // O objeto temporário já foi promovido pelo pedido que chegou primeiro, ou
    // segue em `tmp/` para a regra de ciclo de vida apagar. Nada a fazer aqui.
    return res.status(200).json({ ok: true, repetido: true, mensagem: entregueAntes });
  }

  try {
    // O mime vai junto porque é ele que decide se o áudio chega como mensagem
    // de voz ou como anexo. No reenvio depois de uma falha a tela manda o mime
    // de volta, então ele continua existindo aqui.
    await canal.midia({ tipo, wa_media_id: waMediaId, legenda: textoLegenda, nome, mime });
  } catch (e) {
    // O id volta junto com o erro: o arquivo já está na Meta, e com ele na mão
    // a tela tenta de novo sem subir nada e sem risco de mandar duas vezes.
    return res.status(502).json({
      error: `Não deu para entregar o arquivo: ${e.message}`,
      media_id: waMediaId,
      tipo,
      // A chave volta junto para o reenvio poder reaproveitar o objeto que já
      // está no cofre, em vez de subir o arquivo outra vez.
      chave: chaveTemporariaUsada || undefined,
    });
  }

  // Entregue. Agora o arquivo deixa de ser temporário: sai de `tmp/`, onde a
  // regra de ciclo de vida apaga o que ficou pela metade, e vai para o lugar
  // definitivo, separado por empresa e por mês. A cópia acontece dentro do R2,
  // sem os bytes passarem por aqui outra vez.
  if (chaveTemporariaUsada) {
    const destino = chavePermanente({
      clienteId: conversa.cliente_id,
      mime: mime || "application/octet-stream",
      direcao: "saida",
    });
    try {
      await copiarNoR2(chaveTemporariaUsada, destino);
      await apagarDoR2(chaveTemporariaUsada);
      chaveFinal = destino;
    } catch (e) {
      // Se a mudança falhar, a mensagem já saiu e isso não se desfaz. O
      // registro fica sem chave: o histórico continua mostrando a mídia pela
      // Meta, que guarda por cerca de 30 dias, e a cópia em `tmp/` será
      // apagada pela regra de ciclo de vida. Perde-se o arquivo de longo
      // prazo, não a mensagem.
      console.error("[r2] não deu para mover do temporário:", e?.message || e);
    }
  }

  // O que vai para o histórico. Dois blocos de texto: o aviso do que foi
  // enviado, no mesmo formato do que chega, e a legenda, quando houver.
  const descricao = tipo === "document" && nome
    ? `o documento ${nome}`
    : ROTULO_SAIDA[tipo] || "um arquivo";
  const blocos = [{ type: "text", text: `(enviou ${descricao})` }];
  if (textoLegenda) blocos.push({ type: "text", text: textoLegenda });

  const { data: gravada, error: erroGravar } = await sb.from("mensagens").insert({
    conversa_id: conversaId,
    papel: "assistant",
    conteudo: blocos,
    direcao: "saida",
    tipo,
    midia_id: waMediaId,
    // A chave do cofre, com o prefixo `r2:`. É por ela que o histórico mostra
    // o arquivo depois dos 30 dias em que a Meta apaga a cópia dela.
    midia_url: chaveFinal ? paraBanco(chaveFinal) : null,
    autor_atendente_id: s.tipo === "atendente" ? s.atendente : null,
  }).select("id").single();

  // Gravar depois de entregar: se o registro falhar, a mensagem já saiu e
  // mentir sobre isso é pior. O erro vai com `entregue: true` para a tela
  // avisar sem oferecer um "tentar novamente" que duplicaria.
  if (erroGravar) {
    return res.status(500).json({
      error: "O arquivo foi entregue, mas não deu para gravar no histórico.",
      detalhe: erroGravar.message,
      entregue: true,
    });
  }

  await sb.from("conversas")
    .update({ ultima_em: new Date().toISOString() }).eq("id", conversaId);

  return res.status(200).json({ ok: true, mensagem: gravada.id, tipo, media_id: waMediaId });
}

/**
 * Começa uma conversa com quem nunca escreveu, pelo ícone da tela de Conversas.
 *
 * Existia um buraco: `conversas` só nascia pelo webhook, isto é, só quando a
 * pessoa mandava mensagem primeiro. Quem atende não tinha como falar primeiro
 * com ninguém, e um contato novo só entrava por importação de CSV ou pela tela
 * de negócio do CRM, que não abre conversa.
 *
 * O que esta rota faz, nesta ordem, e por quê:
 *
 *   1. Confere o WhatsApp do cliente ANTES de gravar qualquer coisa. Criar
 *      contato e conversa para descobrir depois que nada sai daqui deixa lixo
 *      no Quadro e uma atendente esperando resposta de uma mensagem que nunca
 *      foi enviada.
 *   2. Reaproveita a conversa que já existir, inclusive a gravada com a outra
 *      forma do mesmo número. O WhatsApp manda o DDD 93 sem o nono dígito e a
 *      lista importada tem o mesmo número com ele: procurar por uma forma só
 *      criaria uma segunda conversa com a mesma pessoa, e aí são dois
 *      históricos que ninguém junta depois.
 *   3. Grava o contato no CRM, porque é lá que contato mora.
 *   4. Põe a conversa em atendimento humano no nome de quem clicou, com o
 *      `assumido_por` da 042. Sem isso a IA responderia por cima dela, e a
 *      trava de `travasDaMidia` recusaria o modelo que ela vai mandar logo em
 *      seguida.
 *   5. Põe no funil de entrada do CRM, se o cliente tiver um. A entrada
 *      automática morava só no webhook, isto é, só valia para quem escrevia
 *      primeiro: a conversa começada pela equipe ficava fora do funil até a
 *      pessoa responder. Quem a equipe procura é lead igual a quem procura a
 *      equipe, e quem está no Quadro Comercial tem que ser o mesmo conjunto
 *      nos dois casos.
 *
 * O que esta rota NÃO faz: enviar. Para número novo a janela de 24h está
 * fechada e a Meta aceita só modelo aprovado (131047 para texto livre). Quem
 * manda a primeira mensagem é o botão de modelos, que já existe na conversa e
 * já confere o modelo contra a lista de aprovados da Meta.
 *
 * Exportada para o teste. A ordem das quatro etapas é o que importa aqui, e
 * ela não aparece em teste de tela nenhum: só olhando o que foi gravado, e em
 * que ordem, dá para ver que ninguém criou conversa antes de saber que o
 * WhatsApp está no ar.
 */
export async function comecarConversa(req, res, { s, sb }) {
  const clienteId = s.tipo === "atendente" ? s.cliente : (req.body.cliente_id || s.cliente);
  if (!clienteId) return res.status(400).json({ error: "Escolha o cliente primeiro." });
  if (!await clientePermitido(req, clienteId)) {
    return res.status(403).json({ error: "Esse cliente não é seu." });
  }

  const e164 = paraE164(req.body.telefone);
  if (!e164) {
    return res.status(400).json({
      error: "Esse número não tem cara de telefone brasileiro. Escreva com DDD, como 93 99999-8888.",
    });
  }

  const cli = await credenciaisDoCanal(clienteId, "whatsapp");
  if (!cli?.wa_phone_number_id || !cli?.wa_token) {
    return res.status(409).json({
      error: "O WhatsApp deste cliente ainda não está conectado, então não dá para começar conversa daqui.",
    });
  }

  const nome = String(req.body.nome || "").trim().slice(0, 120) || null;

  // As formas em que esse número pode já estar gravado. `conversas.contato`
  // guarda o wa_id, que é só dígito, sem o `+`.
  const formas = [...new Set([e164, ...variantesE164(e164)])].map((f) => f.replace("+", ""));
  const { data: achadas } = await sb.from("conversas")
    .select("id, contato, nome_contato, modo, atendente_id")
    .eq("cliente_id", clienteId).eq("canal", "whatsapp").in("contato", formas)
    .order("ultima_em", { ascending: false });

  const jaExistia = achadas?.[0] || null;

  // O contato no CRM. O nome só é escrito quando ela digitou um: `salvarContato`
  // grava `null` no que vier vazio, e uma conversa nova não pode apagar o nome
  // que a importação já tinha trazido.
  let contato = null;
  try {
    const { data: fichaAntiga } = await sb.from("contatos")
      .select("nome").eq("cliente_id", clienteId).eq("telefone_e164", e164).maybeSingle();
    contato = await salvarContato(sb, clienteId, {
      telefone_e164: e164,
      nome: nome || fichaAntiga?.nome || null,
      origem: "painel",
    });
  } catch (e) {
    // Contato é cadastro, conversa é atendimento. Falhar o cadastro não pode
    // impedir alguém de falar com a pessoa.
    console.error("[nova conversa] contato:", e.message);
  }

  const conversa = jaExistia || await abrirConversa({
    clienteId,
    canal: "whatsapp",
    contato: e164.replace("+", ""),
    telefone: e164,
    nomeContato: nome,
    origem: { tipo: "painel", por: quemLe(s) },
  });

  // Nome digitado agora vale mais que o que estava lá: quem clicou acabou de
  // dizer quem é essa pessoa.
  if (nome && conversa.nome_contato !== nome) {
    await sb.from("conversas").update({ nome_contato: nome }).eq("id", conversa.id);
    conversa.nome_contato = nome;
  }

  const alvo = s.tipo === "atendente" ? s.atendente : (req.body.atendente_id || null);
  const assumiu = await atenderAgora(
    conversa.id, alvo,
    `Conversa começada pela equipe${nome ? ` com ${nome}` : ""}.`,
    quemLe(s),
  );

  // O negócio no funil. Nunca segura a resposta: funil é organização, e falhar
  // em organizar não pode impedir alguém de falar com a pessoa. Não duplica —
  // a própria função sai calada quando a conversa já tem negócio.
  let negocio = null;
  try {
    negocio = await garantirNegocioDaConversa(sb, clienteId, conversa);
  } catch (e) {
    console.error("[nova conversa] funil:", e.message);
  }

  return res.status(200).json({
    ok: true,
    conversa_id: conversa.id,
    negocio_id: negocio?.id || null,
    nome_contato: conversa.nome_contato || nome || null,
    telefone: e164,
    contato_id: contato?.id || null,
    ja_existia: Boolean(jaExistia),
    ja_estava_em_atendimento: Boolean(assumiu?.ja_estava),
    // A tela usa isto para dizer, antes de ela digitar, que texto livre não
    // sai agora: janela fechada, só modelo aprovado.
    janela: "fechada",
  });
}
