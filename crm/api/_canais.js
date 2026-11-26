// Cadastro dos canais de atendimento de um cliente: a tabela `canais`.
//
// Um canal é um número de WhatsApp na Cloud API ou um perfil do Instagram. Os
// dois vivem na mesma tabela de propósito: o operador precisa de UMA lista
// para escolher em qual está trabalhando, e a empresa atende pelos dois.
//
// Mora aqui, e não num arquivo próprio em `api/`, porque o Vercel conta cada
// arquivo de `api/` como uma função e o plano já está no teto de 12. O prefixo
// `_` tira o arquivo dessa conta: ele é importado por `painel-clientes.js`.
//
// Até agora o único jeito de ligar um canal era rodar INSERT na mão no
// Supabase, com o token em texto puro dentro do editor de SQL. Esta tela
// existe para isso parar de acontecer.

import crypto from "node:crypto";
import { db } from "./_db.js";
import { barrou, sessao, clientePermitido } from "./_painel.js";
import { cifrar, decifrar, mascarar } from "./_cifra.js";
import { conferirNumero } from "./_wa.js";
import { conferirPerfil } from "./_ig.js";

const TIPOS = ["whatsapp", "instagram"];

// O endereço que vai no campo "Callback URL" do app na Meta.
//
// Sai do host da própria requisição, e não de variável de ambiente, porque é
// o único valor que está certo em qualquer lugar: produção, deploy de teste,
// domínio próprio no dia em que houver. `URL_PUBLICA` continua existindo
// como atalho para forçar outro endereço, mas ninguém precisa configurar.
function urlDoWebhook(req) {
  if (process.env.URL_PUBLICA) {
    return `${process.env.URL_PUBLICA.replace(/\/$/, "")}/api/webhook`;
  }
  const host = req.headers["x-forwarded-host"] || req.headers.host;
  if (!host) return null;
  const esquema = String(host).startsWith("localhost") ? "http" : "https";
  return `${esquema}://${host}/api/webhook`;
}

// O verify token não é digitado por ninguém: é sorteado aqui e copiado para a
// Meta. É só uma senha de ida e volta, que prova que a URL é nossa quando a
// Meta bate nela. Sorteado evita o "whatsapp123" que todo mundo escreve.
function sortearVerifyToken() {
  return crypto.randomBytes(24).toString("base64url");
}

function sanear(valor) {
  return String(valor ?? "").trim();
}

// O número como a Meta devolve ("55 11 99999-0000") não serve para comparar.
// Guardamos só os dígitos, com o país na frente, que é o formato que a Cloud
// API aceita no campo `to`.
function normalizarE164(valor) {
  return sanear(valor).replace(/\D/g, "");
}

// Cada tipo cobra o que é dele. O banco repete essa conta num CHECK, porque
// um canal pela metade aceita mensagem e nunca responde, e isso só aparece
// quando alguém de verdade escreve.
function erroDeValidacao(corpo) {
  const tipo = sanear(corpo.tipo) || "whatsapp";
  if (!TIPOS.includes(tipo)) return "Tipo de canal desconhecido.";

  if (tipo === "instagram") {
    if (!/^\d{6,}$/.test(sanear(corpo.ig_user_id))) {
      return "O ID do perfil do Instagram é só dígitos, e vem do painel da Meta.";
    }
    return null;
  }

  if (!/^\d{6,}$/.test(sanear(corpo.phone_number_id))) {
    return "O ID do número (phone number ID) é só dígitos, e vem do painel da Meta.";
  }
  if (!/^\d{6,}$/.test(sanear(corpo.waba_id))) {
    return "O ID da conta de WhatsApp Business (WABA ID) é só dígitos.";
  }
  if (normalizarE164(corpo.numero_e164).length < 10) {
    return "Escreva o número com país e DDD, por exemplo 5511999990000.";
  }
  return null;
}

// Nunca devolve token nem app secret. A tela precisa saber que existem, não
// quais são: quem tem o token manda mensagem em nome do cliente.
//
// O resumo mascarado sai do token decifrado, não do texto cifrado: mascarar o
// cifrado mostraria quatro letras de ruído, que não ajudam ninguém a conferir
// se é o token certo. Se a decifragem falhar, a tela precisa dizer isso em vez
// de sumir com a linha: é o sintoma de CHAVE_CIFRA trocada, e o canal está
// morto até alguém salvar o token de novo.
function paraTela(canal) {
  let token_resumo;
  try {
    token_resumo = mascarar(decifrar(canal.token_cifrado));
  } catch {
    token_resumo = null;
  }

  return {
    token_resumo,
    token_ilegivel: token_resumo === null,
    id: canal.id,
    tipo: canal.tipo || "whatsapp",
    cliente_id: canal.cliente_id,
    ig_user_id: canal.ig_user_id,
    ig_base: canal.ig_base,
    waba_id: canal.waba_id,
    phone_number_id: canal.phone_number_id,
    numero_e164: canal.numero_e164,
    nome_exibicao: canal.nome_exibicao,
    coexistencia: canal.coexistencia,
    tier: canal.tier,
    ativo: canal.ativo,
    criado_em: canal.criado_em,
    verify_token: canal.verify_token,
    tem_app_secret: Boolean(canal.app_secret_cifrado),
  };
}

// Quem a tela devolve para um atendente.
//
// Ele precisa da lista para o seletor de canal da lateral funcionar na conta
// dele. Não precisa, e não pode ter, nada que seja credencial: sai o resumo do
// token, sai o verify token, sai o app secret. O que fica é nome, tipo e id,
// que é o suficiente para filtrar uma caixa de entrada.
function paraAtendente(c) {
  return {
    id: c.id, tipo: c.tipo, cliente_id: c.cliente_id,
    nome_exibicao: c.nome_exibicao, numero_e164: c.numero_e164,
    ig_user_id: c.ig_user_id, ativo: c.ativo,
  };
}

export default async function canais(req, res) {
  // Porteiro próprio, por método. Ler a lista é coisa de qualquer sessão, mas
  // sempre só do cliente dela: `clientePermitido` devolve null quando um
  // atendente pede o cliente de outro. Cadastrar, editar e apagar continuam
  // sendo só do operador, porque mexem em credencial.
  if (await barrou(req, res)) return;
  const s = await sessao(req);
  const sb = db();

  const ehOperador = s.tipo === "operador";
  if (req.method !== "GET" && !ehOperador) {
    return res.status(403).json({ error: "Esta área é do operador da plataforma." });
  }

  if (req.method === "GET") {
    const clienteId = await clientePermitido(req, req.query.cliente);
    if (!clienteId) return res.status(400).json({ error: "Cliente não informado." });

    const { data, error } = await sb
      .from("canais").select("*").eq("cliente_id", clienteId)
      .order("ativo", { ascending: false }).order("criado_em");

    if (error) return res.status(500).json({ error: "Falha ao listar canais", detalhe: error.message });
    return res.status(200).json({
      canais: (data || []).map(ehOperador ? paraTela : paraAtendente),
      ...(ehOperador && { webhook_url: urlDoWebhook(req) }),
    });
  }

  if (req.method === "POST") {
    const corpo = req.body || {};

    // Conferir não grava nada. Serve para descobrir que o token está errado
    // enquanto o formulário ainda está aberto, e não semanas depois.
    if (corpo.acao === "testar") {
      let tipo = sanear(corpo.tipo) || "whatsapp";
      let phoneNumberId = sanear(corpo.phone_number_id);
      let igUserId = sanear(corpo.ig_user_id);
      let igBase = sanear(corpo.ig_base) || null;
      let token = sanear(corpo.token);

      // Canal já salvo: o token vem do banco, decifrado só nesta requisição.
      if (corpo.id) {
        const { data } = await sb.from("canais")
          .select("tipo, phone_number_id, ig_user_id, ig_base, token_cifrado")
          .eq("id", corpo.id).maybeSingle();
        if (!data) return res.status(404).json({ error: "Canal não encontrado." });

        tipo = data.tipo || "whatsapp";
        phoneNumberId = data.phone_number_id;
        igUserId = data.ig_user_id;
        igBase = data.ig_base;
        try {
          token = decifrar(data.token_cifrado);
        } catch {
          return res.status(500).json({
            error: "O token guardado não pôde ser decifrado.",
            detalhe: "Provavelmente a CHAVE_CIFRA mudou. Salve o token de novo.",
          });
        }
      }

      if (!token) return res.status(400).json({ error: "Informe o token de acesso." });

      if (tipo === "instagram") {
        if (!igUserId) return res.status(400).json({ error: "Informe o ID do perfil." });
        try {
          const info = await conferirPerfil({
            ig_user_id: igUserId, ig_token: token, ig_base: igBase,
          });
          // O host que respondeu é descoberta, não configuração: guarda, para
          // o envio não precisar adivinhar de novo a cada mensagem.
          if (corpo.id && info.base && info.base !== igBase) {
            await sb.from("canais").update({ ig_base: info.base }).eq("id", corpo.id);
          }
          return res.status(200).json({ ok: true, tipo, info });
        } catch (e) {
          return res.status(200).json({ ok: false, tipo, erro: e.message });
        }
      }

      if (!phoneNumberId) return res.status(400).json({ error: "Informe o ID do número." });
      try {
        const info = await conferirNumero({ wa_phone_number_id: phoneNumberId, wa_token: token });

        // O tier é informação que muda sozinha do lado da Meta. Se o canal já
        // existe, aproveita a ida e guarda o valor novo.
        if (corpo.id && info.tier) {
          await sb.from("canais").update({ tier: info.tier }).eq("id", corpo.id);
        }
        return res.status(200).json({ ok: true, tipo, info });
      } catch (e) {
        return res.status(200).json({ ok: false, tipo, erro: e.message });
      }
    }

    const invalido = erroDeValidacao(corpo);
    if (invalido) return res.status(400).json({ error: invalido });
    if (!corpo.cliente_id) return res.status(400).json({ error: "Cliente não informado." });
    if (!sanear(corpo.token)) return res.status(400).json({ error: "Informe o token de acesso." });

    // O app secret deixou de ser opcional. Sem ele o webhook não tem como
    // conferir a assinatura da Meta e, em produção, recusa o evento: o canal
    // nasceria surdo, e isso só apareceria quando alguém de verdade escreve.
    // Vale para o Instagram também, porque o mesmo segredo assina os dois.
    if (!sanear(corpo.app_secret)) {
      return res.status(400).json({
        error: "Informe o app secret. Sem ele o webhook recusa os eventos da Meta.",
      });
    }

    let token_cifrado;
    let app_secret_cifrado;
    try {
      token_cifrado = cifrar(sanear(corpo.token));
      app_secret_cifrado = cifrar(sanear(corpo.app_secret)) || null;
    } catch (e) {
      return res.status(500).json({ error: "Não foi possível cifrar o token", detalhe: e.message });
    }

    const tipo = sanear(corpo.tipo) || "whatsapp";
    const ehIG = tipo === "instagram";

    const { data, error } = await sb.from("canais").insert({
      cliente_id: corpo.cliente_id,
      tipo,
      // O Instagram não tem número, nem WABA, nem verify token próprio: ele
      // usa o do app, que é o mesmo para todos os perfis. Mandar string vazia
      // em vez de null faria o CHECK do banco passar com campo de mentira.
      waba_id: ehIG ? null : sanear(corpo.waba_id),
      phone_number_id: ehIG ? null : sanear(corpo.phone_number_id),
      numero_e164: ehIG ? null : normalizarE164(corpo.numero_e164),
      verify_token: ehIG ? null : sortearVerifyToken(),
      ig_user_id: ehIG ? sanear(corpo.ig_user_id) : null,
      ig_base: ehIG ? (sanear(corpo.ig_base) || null) : null,
      nome_exibicao: sanear(corpo.nome_exibicao) || null,
      token_cifrado,
      app_secret_cifrado,
      coexistencia: Boolean(corpo.coexistencia),
    }).select().single();

    if (error) {
      const jaExiste = error.code === "23505";
      return res.status(jaExiste ? 409 : 500).json({
        error: jaExiste
          ? (ehIG
              ? "Esse perfil do Instagram já está cadastrado, em algum cliente."
              : "Esse número já está cadastrado, em algum cliente. O ID do número é único na plataforma.")
          : "Falha ao criar o canal",
        detalhe: error.message,
      });
    }

    return res.status(200).json({ canal: paraTela(data) });
  }

  if (req.method === "PATCH") {
    const { id, ...campos } = req.body || {};
    if (!id) return res.status(400).json({ error: "Canal não informado." });

    const atualizacao = {};
    if ("nome_exibicao" in campos) atualizacao.nome_exibicao = sanear(campos.nome_exibicao) || null;
    if ("numero_e164" in campos) atualizacao.numero_e164 = normalizarE164(campos.numero_e164);
    if ("waba_id" in campos) atualizacao.waba_id = sanear(campos.waba_id);
    if ("ig_base" in campos) atualizacao.ig_base = sanear(campos.ig_base) || null;
    if ("coexistencia" in campos) atualizacao.coexistencia = Boolean(campos.coexistencia);
    if ("ativo" in campos) atualizacao.ativo = Boolean(campos.ativo);

    // Campo em branco quer dizer "não mexe", e não "apaga". A tela mostra o
    // token mascarado: deixar o campo vazio é o caso normal de quem só veio
    // corrigir o nome de exibição.
    try {
      if (sanear(campos.token)) atualizacao.token_cifrado = cifrar(sanear(campos.token));
      if (sanear(campos.app_secret)) atualizacao.app_secret_cifrado = cifrar(sanear(campos.app_secret));
    } catch (e) {
      return res.status(500).json({ error: "Não foi possível cifrar o token", detalhe: e.message });
    }

    // Sortear de novo é o botão de pânico: se o token vazou, trocar aqui
    // derruba qualquer webhook configurado com o antigo.
    if (campos.novo_verify_token) atualizacao.verify_token = sortearVerifyToken();

    if (!Object.keys(atualizacao).length) return res.status(400).json({ error: "Nada para atualizar." });

    // Religar um canal sem app secret devolveria ao ar um número que o webhook
    // vai recusar em produção. Confere antes, lendo o canal, sem alterar nada
    // dele. Só no caminho de religar: editar nome ou número não passa por aqui.
    if (atualizacao.ativo === true && !atualizacao.app_secret_cifrado) {
      const { data: atual, error: erroAtual } = await sb.from("canais")
        .select("app_secret_cifrado").eq("id", id).maybeSingle();
      if (erroAtual) return res.status(500).json({ error: "Falha ao ler o canal", detalhe: erroAtual.message });
      if (!atual) return res.status(404).json({ error: "Canal não encontrado." });
      if (!atual.app_secret_cifrado) {
        return res.status(400).json({
          error: "Este canal não tem app secret. Salve o app secret antes de religar:"
            + " sem ele o webhook recusa os eventos da Meta.",
        });
      }
    }

    const { data, error } = await sb.from("canais")
      .update(atualizacao).eq("id", id).select().single();

    if (error) return res.status(500).json({ error: "Falha ao salvar", detalhe: error.message });
    return res.status(200).json({ canal: paraTela(data) });
  }

  if (req.method === "DELETE") {
    const id = req.query.id;
    if (!id) return res.status(400).json({ error: "Canal não informado." });

    const { error } = await sb.from("canais").delete().eq("id", id);
    if (error) return res.status(500).json({ error: "Falha ao apagar", detalhe: error.message });
    return res.status(200).json({ ok: true });
  }

  return res.status(405).json({ error: "Método não permitido" });
}
