// As ferramentas que o modelo pode acionar. O modelo decide quando e qual;
// quem executa é o sistema. É isso que separa "a IA fala sobre a foto" de
// "a IA manda a foto certa".

import { db } from "./_db.js";
import { horariosLivres, agruparPorDia, formatarHorario, marcar } from "./_agenda.js";
import { enfileirar } from "./_fila.js";
import { assuntoDaConversa, etiquetasDoAssunto } from "./_assunto.js";
import { canonizar } from "./_etiquetas.js";
import { corrigirOrigemDoNegocio } from "./_negocios.js";
import { consultarAcesso } from "./_acesso.js";

// A ordem é fixa de propósito: a lista de ferramentas entra no prefixo do
// cache, e qualquer mudança de ordem invalida o cache inteiro.
//
// Os blocos condicionais vêm primeiro e o núcleo estável por último. Cliente que
// não tem agenda, link nem consulta de acesso enxerga exatamente as três
// ferramentas do fim, e o cache dele não muda quando outro cliente ganha uma.
export function definirFerramentas({ midias = [], profissionais = [], links = [], cliente = {}, config = {} }) {
  const chaves = midias.map((m) => m.chave);
  const nomes = profissionais.map((p) => p.nome);

  const agenda = nomes.length ? [
    {
      name: "consultar_horarios",
      description:
        "Vê os horários livres de um profissional. Chame antes de falar qualquer horário. " +
        "Nunca cite um dia ou hora que não tenha saído desta ferramenta.",
      input_schema: {
        type: "object",
        properties: {
          profissional: { type: "string", enum: nomes, description: "Nome do profissional." },
          dias: {
            type: "integer",
            description: "Quantos dias à frente olhar. Use 7 por padrão; 14 se a pessoa pedir mais opções.",
          },
        },
        required: ["profissional"],
        additionalProperties: false,
      },
    },
    {
      name: "marcar_consulta",
      description:
        "Marca o horário escolhido. Só chame depois de consultar_horarios e da pessoa " +
        "escolher, e só com um horário que apareceu na consulta. Confirme o nome antes.",
      input_schema: {
        type: "object",
        properties: {
          profissional: { type: "string", enum: nomes },
          horario: {
            type: "string",
            description: "O código do horário escolhido, exatamente como veio de consultar_horarios.",
          },
          nome_paciente: { type: "string", description: "Nome de quem vai ser atendido." },
        },
        required: ["profissional", "horario", "nome_paciente"],
        additionalProperties: false,
      },
    },
  ] : [];

  // O cliente pode eleger um link de entrada, que vai na primeira resposta sem
  // a pessoa pedir. Quando ele existe, a descrição da ferramenta TEM que mudar
  // junto: a frase "só quando a pessoa demonstrar interesse ou pedir" pesa mais
  // que qualquer regra do prompt, e sozinha ela impede o disparo. Custou três
  // rodadas de teste descobrir que a contradição estava aqui, não lá.
  const inicial = links.some((l) => l.chave === config.link_inicial) ? config.link_inicial : null;
  const comTextoFixo = links.filter((l) => String(l.texto_fixo || "").trim()).map((l) => l.chave);

  const linksDisponiveis = links.length ? [
    {
      name: "enviar_link",
      description:
        "Manda um link do negócio para a pessoa: página de vendas, checkout, tela de entrar. " +
        "Escolha pela descrição. Mande um link por resposta. " +
        (comTextoFixo.length
          ? `Estes já vão com a mensagem escrita pela empresa: ${comTextoFixo.join(", ")}. ` +
            "Para eles, deixe o campo aviso vazio e não escreva a oferta você mesmo. " +
            "O mesmo link pode ser mandado mais de uma vez na conversa, em respostas " +
            "diferentes: quem voltou a perguntar não assistiu ainda. "
          : "") +
        (inicial
          ? `Na PRIMEIRA resposta da conversa, chame esta ferramenta com chave "${inicial}" ` +
            "antes de qualquer outra coisa, sem esperar a pessoa pedir. " +
            "Depois dessa, os outros links só quando ela demonstrar interesse ou pedir."
          : "Mande só quando a pessoa demonstrar interesse ou pedir. Nunca empurre link em " +
            "cima de uma dúvida que ainda não foi respondida."),
      input_schema: {
        type: "object",
        properties: {
          chave: {
            type: "string",
            enum: links.map((l) => l.chave),
            description: "A chave do link.",
          },
          aviso: {
            type: "string",
            description: "Frase curta enviada junto com o link, no seu tom de voz. Diga o que a pessoa vai encontrar lá.",
          },
        },
        required: ["chave"],
        additionalProperties: false,
      },
    },
  ] : [];

  // Só existe para cliente que tem plataforma própria com conta de usuário.
  const acesso = (cliente.acesso_url && cliente.acesso_token) ? [
    {
      name: "consultar_acesso",
      description:
        "Verifica se a pessoa tem conta na plataforma e em que situação ela está. " +
        "Use quando alguém disser que não consegue entrar, que não recebeu o acesso, " +
        "ou perguntar se a compra foi liberada. Peça o e-mail da compra ou o CPF antes. " +
        "NUNCA afirme que a pessoa tem ou não tem conta sem ter chamado esta ferramenta.",
      input_schema: {
        type: "object",
        properties: {
          email: { type: "string", description: "E-mail usado na compra." },
          cpf: { type: "string", description: "CPF, só os dígitos." },
        },
        required: [],
        additionalProperties: false,
      },
    },
  ] : [];

  return [
    ...agenda,
    ...linksDisponiveis,
    ...acesso,
    {
      name: "enviar_midia",
      description:
        "Envia uma foto, vídeo, áudio ou documento da biblioteca do negócio para a pessoa. " +
        "Use quando a mídia responder melhor que texto: mostrar um produto, o espaço, " +
        "um depoimento em áudio. Envie no máximo uma mídia por resposta.",
      input_schema: {
        type: "object",
        properties: {
          chave: {
            type: "string",
            enum: chaves.length ? chaves : ["nenhuma"],
            description: "A chave da mídia na biblioteca.",
          },
          aviso: {
            type: "string",
            description:
              "Frase curta enviada antes da mídia, no seu tom de voz. " +
              "Para áudio, anuncie que vai mandar um áudio.",
          },
        },
        required: ["chave"],
        additionalProperties: false,
      },
    },
    {
      name: "atualizar_lead",
      description:
        "Registra o que você descobriu sobre a pessoa. Chame assim que souber o nome, " +
        "o interesse ou o nível de urgência. Não avise a pessoa que está registrando.",
      input_schema: {
        type: "object",
        properties: {
          nome: { type: "string", description: "Nome da pessoa, se ela disse." },
          pontos: {
            type: "integer",
            description:
              "Quanto somar ao score. Dor ativa e urgência somam mais; " +
              "curiosidade sem intenção soma pouco. Use de -10 a 30.",
          },
          etiquetas: {
            type: "array",
            items: { type: "string" },
            description:
              "Marcadores curtos: interesse, perfil, objeção. Escreva do jeito " +
              "mais simples; o sistema junta com a etiqueta que a empresa já usa.",
          },
        },
        required: [],
        additionalProperties: false,
      },
    },
    {
      name: "transferir_humano",
      description:
        "Passa a conversa para uma pessoa da equipe e para de responder. Use quando: " +
        "a pessoa pedir para falar com alguém, a informação não estiver no seu contexto, " +
        "houver reclamação, ou o assunto exigir decisão que você não pode tomar " +
        "(preço final, desconto, prazo, condição de pagamento).",
      input_schema: {
        type: "object",
        properties: {
          motivo: { type: "string", description: "Por que está transferindo." },
          resumo: { type: "string", description: "Resumo do caso para quem vai assumir." },
          assunto: {
            type: "string",
            enum: ["matricula", "suporte", "agencia"],
            description:
              "De que trata a conversa, para ir à pessoa certa da equipe. " +
              "Use 'matricula' para quem quer entrar num curso, mentoria ou turma: preço, vagas, parcelamento, inscrição. " +
              "Use 'suporte' para aluno que já comprou: acesso, aula, certificado, nota, reembolso e cancelamento. Use 'agencia' para empresa que quer contratar a agência (gestão de redes, tráfego, conteúdo). " +
              "Se não souber, não mande este campo.",
          },
        },
        required: ["motivo"],
        additionalProperties: false,
      },
    },
  ];
}

export async function executarFerramenta(nome, entrada, ctx) {
  try {
    if (nome === "consultar_horarios") return await ferramentaConsultarHorarios(entrada, ctx);
    if (nome === "marcar_consulta") return await ferramentaMarcarConsulta(entrada, ctx);
    if (nome === "enviar_link") return await ferramentaEnviarLink(entrada, ctx);
    if (nome === "consultar_acesso") return await ferramentaConsultarAcesso(entrada, ctx);
    if (nome === "enviar_midia") return await ferramentaEnviarMidia(entrada, ctx);
    if (nome === "atualizar_lead") return await ferramentaAtualizarLead(entrada, ctx);
    if (nome === "transferir_humano") return await ferramentaTransferirHumano(entrada, ctx);
    return { erro: `Ferramenta desconhecida: ${nome}` };
  } catch (e) {
    // O erro volta como resultado da ferramenta, não como exceção: assim o
    // modelo sabe que falhou e contorna, em vez de a conversa morrer.
    return { erro: e.message };
  }
}

function acharProfissional(nome, ctx) {
  return ctx.profissionais.find((p) => p.nome === nome);
}

async function ferramentaConsultarHorarios({ profissional, dias }, ctx) {
  const prof = acharProfissional(profissional, ctx);
  if (!prof) {
    return { erro: `Não existe "${profissional}".`, disponiveis: ctx.profissionais.map((p) => p.nome) };
  }

  const janela = dias || 7;
  const livres = await horariosLivres(prof.id, janela);
  const ate = new Date(Date.now() + janela * 86400000);
  const periodo = `de hoje até ${ate.toLocaleDateString("pt-BR")}`;

  if (!livres.length) {
    return {
      vazio: true,
      periodo_consultado: periodo,
      aviso: `NÃO existe nenhum horário ${periodo}. Diga isso com a data exata, ` +
             "sem prometer nada. Se a pessoa quiser mais adiante, chame de novo com dias maior.",
    };
  }

  // Recortar os 24 primeiros da lista escondia os dias seguintes: uma manhã
  // cheia consumia a cota inteira e a IA dizia que a agenda acabava ali.
  // Agora o corte é por dia, mantendo a visão de toda a semana.
  const fuso = ctx.cliente.fuso || "America/Belem";
  const todos = agruparPorDia(livres, fuso);
  const porDia = todos.slice(0, 5);

  // O último dia com vaga é dito explicitamente. Sem isso o modelo inferia o
  // limite sozinho e chamava os dias desta semana de "semana que vem".
  const ultimo = formatarHorario(livres[livres.length - 1].inicio, fuso);

  // Especialista que roda entre cidades tem dias em lugares diferentes. Se
  // isso aparece na consulta, a IA precisa dizer onde é, ou o paciente vai
  // para o endereço errado.
  const locais = new Set(porDia.map((d) => d.local).filter(Boolean));
  const variaOLocal = locais.size > 1;

  return {
    profissional: prof.nome,
    periodo_consultado: periodo,
    ultimo_horario_livre: ultimo,
    dias: porDia.map((d) => ({
      dia: d.dia,
      local: d.local || undefined,
      horarios: espalhar(d.horas, 4).map((h) => ({ hora: h.hora, codigo: h.iso })),
    })),
    aviso:
      "Ofereça no máximo 3 ou 4 opções, SEMPRE dizendo a data (\"quarta, 09/09\"), nunca " +
      "\"semana que vem\" ou \"nos próximos dias\". Fora dos dias listados aqui não existe vaga " +
      `${periodo}. Para outro período, chame de novo com dias maior. Para marcar, use o campo codigo.` +
      (variaOLocal
        ? " ATENÇÃO: este profissional atende em cidades diferentes conforme o dia. Diga SEMPRE a cidade junto com o horário, e confirme a cidade ao marcar."
        : ""),
  };
}

// Pega no máximo `quantos` itens bem distribuídos ao longo do dia, em vez dos
// primeiros: assim a IA oferece 8h, 9h30, 11h e não só o começo da manhã.
function espalhar(lista, quantos) {
  if (lista.length <= quantos) return lista;
  const passo = (lista.length - 1) / (quantos - 1);
  return Array.from({ length: quantos }, (_, i) => lista[Math.round(i * passo)]);
}

async function ferramentaMarcarConsulta({ profissional, horario, nome_paciente }, ctx) {
  const prof = acharProfissional(profissional, ctx);
  if (!prof) {
    return { erro: `Não existe "${profissional}".`, disponiveis: ctx.profissionais.map((p) => p.nome) };
  }

  const quando = new Date(horario);
  if (Number.isNaN(quando.getTime())) {
    return { erro: "Horário inválido. Use o codigo exato que veio de consultar_horarios." };
  }

  // Conversa nascida no Instagram não tem telefone, e a recepção precisa de um
  // para confirmar e para avisar. Falha explícita em vez de agendamento sem
  // contato nenhum.
  if (!ctx.telefone) {
    return {
      erro: "Falta o telefone para marcar.",
      aviso: "Peça o número de WhatsApp com DDD antes de marcar, e explique que é para a " +
             "confirmação e o lembrete.",
    };
  }

  const resultado = await marcar({
    clienteId: ctx.cliente.id,
    profissionalId: prof.id,
    conversaId: ctx.conversa.id,
    nome: nome_paciente,
    telefone: ctx.telefone,
    inicio: quando.toISOString(),
  });

  if (resultado.ocupado) {
    return {
      ocupado: true,
      aviso: "Alguém pegou esse horário agora há pouco. Peça desculpa, consulte de novo e ofereça outros.",
    };
  }

  const fuso = ctx.cliente.fuso || "America/Belem";
  ctx.marcou = true;

  return {
    ok: true,
    confirmado: formatarHorario(quando.toISOString(), fuso),
    profissional: prof.nome,
    aviso: "Confirme para a pessoa repetindo o dia e a hora, e avise que ela receberá um lembrete antes.",
  };
}

async function ferramentaEnviarMidia({ chave, aviso }, ctx) {
  const midia = ctx.midias.find((m) => m.chave === chave);
  if (!midia) {
    return { erro: `Não existe mídia com a chave "${chave}".`, disponiveis: ctx.midias.map((m) => m.chave) };
  }

  if (aviso) {
    await ctx.canal.texto(aviso);
    // Pausa proporcional ao aviso: dá tempo de ler antes da mídia chegar.
    await ctx.canal.pausa(aviso);
  }

  await ctx.canal.midia(midia);
  ctx.enviouAlgo = true;
  return { ok: true, enviado: chave, tipo: midia.tipo };
}

async function ferramentaEnviarLink({ chave, aviso }, ctx) {
  const link = (ctx.links || []).find((l) => l.chave === chave);
  if (!link) {
    return {
      erro: `Não existe link com a chave "${chave}".`,
      disponiveis: (ctx.links || []).map((l) => l.chave),
    };
  }

  // Aviso e link vão no MESMO balão de propósito: o WhatsApp só monta a prévia
  // do link na mensagem que contém a URL, e link solto num balão sozinho parece
  // propaganda colada.
  // Copy da empresa ganha do modelo, sempre. Não é sobre ele escrever mal: é
  // que a oferta é do cliente, e quem é dono da oferta é dono das palavras dela.
  const fixo = String(link.texto_fixo || "").trim();

  // Sai o link curto, nao o destino. Mandar `link.url` direto era simples e
  // custava a unica medida que existe deste canal: quantas pessoas clicaram.
  // O contador de `links` so subia pelo disparo, entao todo link que a IA
  // mandou ate hoje saiu sem ser contado.
  //
  // Sem base configurada, volta a mandar o destino: link quebrado na mao da
  // pessoa e pior que clique nao contado.
  const base = process.env.PAINEL_BASE_URL?.replace(/\/$/, "");
  const endereco = base ? `${base}/l/${link.chave}` : link.url;

  const mensagem = fixo
    ? `${fixo}\n${endereco}`
    : (aviso ? `${aviso}\n${endereco}` : endereco);

  // O link também espera, pelo mesmo motivo que as outras mensagens: ele sai de
  // dentro da ferramenta, antes do texto final, então sem a pausa aqui a
  // primeira coisa que a pessoa recebe é uma oferta disparada no mesmo segundo
  // em que ela escreveu "oi". É exatamente a cara que robô tem.
  await ctx.canal.digitando?.().catch?.(() => {});
  await ctx.canal.pausa?.(mensagem);
  await ctx.canal.texto(mensagem);
  ctx.enviouAlgo = true;
  // Quem mandou o quê nesta resposta. O reforço automático lê isso para não
  // mandar o mesmo link duas vezes no mesmo fôlego.
  (ctx.linksEnviados ||= []).push(chave);

  // Texto da empresa: avisa o modelo do que já saiu, para ele não mandar a
  // mesma oferta de novo com outras palavras no balão seguinte.
  if (fixo) {
    return {
      ok: true,
      enviado: chave,
      ja_enviado: mensagem,
      instrucao:
        "Esta mensagem JÁ foi entregue à pessoa, inteira, com o link. Não repita, não " +
        "resuma e não reescreva nada dela. Se a pessoa não fez nenhuma pergunta, " +
        "responda com texto vazio: a mensagem já diz tudo o que tinha para dizer agora.",
    };
  }

  return { ok: true, enviado: chave };
}

async function ferramentaConsultarAcesso({ email, cpf }, ctx) {
  const r = await consultarAcesso(ctx.cliente, { email, cpf });

  if (r.erro) return r;

  if (r.indisponivel) {
    return {
      indisponivel: true,
      aviso: "Não deu para consultar agora. NÃO afirme nada sobre a conta da pessoa. " +
             "Peça desculpa pela demora e chame transferir_humano.",
    };
  }

  if (!r.existe) {
    return {
      existe: false,
      aviso: "Não existe conta com esse dado. NÃO diga que a pessoa não comprou: pode ser " +
             "e-mail diferente do da compra, ou compra no nome de outra pessoa. Pergunte se " +
             "ela usou outro e-mail. Se insistir que comprou, chame transferir_humano.",
    };
  }

  if (!r.ativo) {
    return {
      existe: true, ativo: false, status: r.status,
      aviso: "A conta existe mas está desativada. Isso é reembolso, estorno ou decisão da " +
             "equipe, e NÃO é assunto que você resolve nem explica. Chame transferir_humano.",
    };
  }

  return {
    existe: true,
    ativo: true,
    senha_provisoria: r.senha_provisoria,
    primeiro_nome: r.primeiro_nome,
    aviso: r.senha_provisoria
      ? "A conta está ativa e a pessoa ainda não criou senha própria. Mande o link de entrar " +
        "com enviar_link e diga que no primeiro acesso ela cria a senha dela."
      : "A conta está ativa e a pessoa já tem senha própria. Mande o link de entrar com " +
        "enviar_link. Se ela não lembra a senha, diga para usar \"esqueci minha senha\" na " +
        "tela de login. Você NUNCA tem a senha de ninguém.",
  };
}

async function ferramentaAtualizarLead({ nome, pontos, etiquetas }, ctx) {
  const sb = db();
  const atualizacao = { ultima_em: new Date().toISOString() };

  if (nome) atualizacao.nome_contato = nome;
  if (Number.isInteger(pontos)) atualizacao.score = (ctx.conversa.score || 0) + pontos;
  if (etiquetas?.length) {
    // Não grava o que o modelo escreveu: grava a etiqueta conhecida do cliente
    // que corresponde ao que ele escreveu. Sem isto, "Black da Mentoria OM" e
    // "black da mentoria om" viram duas etiquetas e o filtro do Quadro mostra
    // metade das conversas da mesma campanha.
    const { etiquetas: canonicas } = await canonizar(
      sb, ctx.cliente?.id, etiquetas, ctx.conversa.etiquetas || []
    );
    atualizacao.etiquetas = canonicas;
  }

  const { data, error } = await sb.from("conversas")
    .update(atualizacao).eq("id", ctx.conversa.id).select().single();
  if (error) return { erro: error.message };

  ctx.conversa = data;

  // A etiqueta de origem chega depois do negócio: o negócio nasce na primeira
  // mensagem e só agora se sabe que a pessoa veio do disparo. Sem esta linha o
  // relatório por origem registraria todo mundo como "WhatsApp direto".
  // Nunca estoura: relatório não pode derrubar a resposta da IA.
  if (atualizacao.etiquetas) {
    try {
      await corrigirOrigemDoNegocio(sb, ctx.cliente?.id, data);
    } catch (e) {
      console.error("[crm] corrigir origem:", e.message);
    }
  }

  return { ok: true, score: data.score, etiquetas: data.etiquetas };
}

async function ferramentaTransferirHumano({ motivo, resumo, assunto }, ctx) {
  const sb = db();
  // Aqui ficava um `.toLowerCase()` em cima das etiquetas que a conversa já
  // tinha. Ele desfazia a 041 a cada transferência: "Black da Mentoria OM"
  // voltava a ser "black da mentoria om", e o filtro do Quadro passava a mostrar
  // metade das conversas da mesma campanha. Agora passa pelo mesmo
  // normalizador do `atualizar_lead`, que é quem decide a grafia.
  const { etiquetas } = await canonizar(
    sb, ctx.cliente?.id,
    ["transferido", ...etiquetasDoAssunto(assunto)],
    ctx.conversa.etiquetas || [],
  );
  // `canonizar` corta em 20 etiquetas, as antigas primeiro. Numa conversa já
  // cheia, a sacrificada seria justo a `transferido`, que é por onde a equipe
  // acha a conversa na tela.
  if (!etiquetas.includes("transferido")) etiquetas.unshift("transferido");

  const { error } = await sb.from("conversas").update({
    etiquetas,
    ultima_em: new Date().toISOString(),
  }).eq("id", ctx.conversa.id);

  if (error) return { erro: error.message };

  // A conversa entra na fila e a fila procura quem está livre. Se ninguém
  // estiver disponível, ela fica esperando e o painel mostra o tempo de espera.
  // Tres fontes, nesta ordem: o que o modelo disse, o que o codigo leu da
  // mensagem no webhook, e as etiquetas que ficaram na conversa. A do codigo
  // vale mais que a do modelo quando o modelo nao disse nada.
  const assuntoFinal = assunto || ctx.assunto || assuntoDaConversa(ctx.conversa);
  const entrega = await enfileirar(ctx.conversa.id, resumo || motivo, assuntoFinal);

  ctx.transferiu = true;
  ctx.motivoTransferencia = resumo || motivo;

  if (entrega.esperando) {
    return {
      ok: true,
      esperando: true,
      aviso: "Ninguém está disponível agora. Encerre avisando que a equipe vai responder assim que possível, sem prometer prazo.",
    };
  }

  return {
    ok: true,
    atendente: entrega.atendente?.nome,
    aviso: "Alguém da equipe já recebeu a conversa. Encerre com uma frase curta avisando que essa pessoa assume agora. Não diga o nome dela.",
  };
}
