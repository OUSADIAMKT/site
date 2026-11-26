// O motor: monta o contexto, escolhe o modelo, roda o laço de ferramentas
// e devolve o texto final. Quem entrega no WhatsApp é o webhook.

import Anthropic from "@anthropic-ai/sdk";
import { definirFerramentas, executarFerramenta } from "./_ferramentas.js";
import { registrarUso } from "./_db.js";

let ia;
function anthropic() {
  if (!ia) ia = new Anthropic();
  return ia;
}

// USD por milhão de tokens. Cache de leitura custa 10% da entrada;
// gravação custa 1,25x. Mantenha sincronizado com a tabela de preços.
const PRECOS = {
  "claude-opus-5":    { entrada: 5.0, saida: 25.0, cacheLeitura: 0.50, cacheEscrita: 6.25 },
  "claude-haiku-4-5": { entrada: 1.0, saida: 5.0,  cacheLeitura: 0.10, cacheEscrita: 1.25 },
};

const MAX_VOLTAS = 6;

export function calcularCusto(modelo, usage) {
  // A API devolve o id com data (`claude-haiku-4-5-20251001`), e a tabela acima
  // usa o apelido. Sem tirar a data, a busca falha e o custo vira ZERO em
  // silêncio: a conta fecha, o atendimento funciona, e a margem some do
  // relatório. Já aconteceu, com as chamadas de comentário do Instagram.
  const p = PRECOS[modelo] || PRECOS[String(modelo).replace(/-\d{8}$/, "")];
  if (!p) {
    console.warn(`[uso] modelo sem preço na tabela: ${modelo}. Custo registrado como 0.`);
    return 0;
  }
  return (
    ((usage.input_tokens ?? 0) * p.entrada +
     (usage.output_tokens ?? 0) * p.saida +
     (usage.cache_read_input_tokens ?? 0) * p.cacheLeitura +
     (usage.cache_creation_input_tokens ?? 0) * p.cacheEscrita) / 1_000_000
  );
}

// Roteador. Haiku dá conta da maior parte do atendimento; Opus entra quando a
// conversa vira consultiva. Cada ponto que migra pro Haiku é margem: mas
// calibre com a tabela `uso`, não com palpite.
const GATILHOS_COMPLEXOS =
  /\b(caro|desconto|negocia|parcel|financi|orçament|proposta|contrato|concorr|compar|reclama|insatisf|cancel|problema|dúvida séria|por que|porque vocês)\b/i;

export function escolherModelo(texto, conversa, historico, config) {
  const padrao = config.modelo_padrao || "claude-haiku-4-5";
  const complexo = config.modelo_complexo || "claude-opus-5";

  if (String(texto).length > 180) return complexo;
  if (GATILHOS_COMPLEXOS.test(texto)) return complexo;

  // Conversa longa sozinha NÃO escala. Alguém respondendo "sim", "não" e
  // "quarta" dez vezes não deixou a conversa difícil, só comprida, e escalar
  // por isso fazia um "não" custar R$ 0,10. Só sobe quando a conversa já está
  // longa E a pessoa escreveu algo de fato substancial.
  if (historico.length >= 24 && String(texto).length > 60) return complexo;

  // O score também não entra aqui, pelo mesmo motivo: mede qualidade de lead,
  // não dificuldade de conversa.
  return padrao;
}

function catalogoDeMidia(midias) {
  if (!midias.length) return "A biblioteca de mídia está vazia. Não use a ferramenta enviar_midia.";
  return midias
    .map((m) => `- ${m.chave} (${m.tipo}): ${m.descricao}`)
    .join("\n");
}

// A URL nunca entra no prompt, só a chave e a descrição. O modelo escolhe pela
// descrição e o sistema resolve a URL. Trocar a página de vendas depois não
// encosta no prompt, não invalida o cache e não corre risco de o modelo
// reproduzir um link errado de memória.
function catalogoDeLinks(links, config = {}) {
  if (!links.length) return [];

  const linkInicial = config.link_inicial;

  // A ordem importa mais do que parece: a regra de mandar o link de entrada tem
  // que ficar colada no catálogo, não lá em cima junto das regras do cliente.
  // Com ela longe daqui, o Haiku lê "mande a página de vendas", não associa com
  // nenhuma chave e acaba só falando que tem uma página. Testado três vezes.
  const inicial = links.some((l) => l.chave === linkInicial)
    ? [
      "",
      `SEMPRE mande o link \`${linkInicial}\` com enviar_link na sua PRIMEIRA resposta da`,
      "conversa, antes de qualquer outra coisa, sem perguntar se a pessoa quer.",
      "Depois de mandado, não ofereça ele de novo e não cobre resposta sobre ele.",
    ]
    : [];

  // Link com copy própria da empresa: o modelo não escreve o texto que vai
  // junto, e precisa saber disso. Sem este aviso ele escreve a frase de apoio e
  // a pessoa recebe a mesma oferta duas vezes, a dele e a da empresa.
  const comTextoFixo = links.filter((l) => String(l.texto_fixo || "").trim());
  const fixos = comTextoFixo.length ? [
    "",
    `Estes links já têm a mensagem escrita pela empresa: ${comTextoFixo.map((l) => l.chave).join(", ")}.`,
    "Quando mandar um deles, NÃO escreva o campo aviso e NÃO escreva a oferta você",
    "mesmo: o sistema envia o texto da empresa inteiro, com o link. Depois dele, não",
    "repita, não resuma e não reescreva o que ele diz.",
  ] : [];

  return [
    "",
    "# Links",
    "Você pode mandar estes links com a ferramenta enviar_link. Escolha pela descrição.",
    "Nunca escreva uma URL você mesmo: use sempre a ferramenta.",
    links.map((l) => `- ${l.chave}: ${l.descricao}`).join("\n"),
    ...fixos,
    ...inicial,
  ];
}

// Blocos estáveis por cliente. Tudo aqui entra no cache; nada volátil
// (nome, score, data) pode aparecer, ou o cache quebra a cada mensagem.
function montarSystemEstavel(config, midias, profissionais, links = []) {
  return [
    "# Quem você é",
    config.persona?.trim() || "Você é o atendente desta empresa no WhatsApp.",
    "",
    "# Como você conversa",
    "Você escreve como uma pessoa real no WhatsApp, não como um assistente corporativo.",
    "- Frases curtas. No máximo três por resposta.",
    "- Nada de listas, bullet points, títulos ou negrito. Isso é conversa, não documento.",
    "- Sem 'Como posso ajudá-lo?', 'Estou à disposição', 'Prezado'. Fale como gente fala.",
    "- Bom humor leve quando couber. Nunca forçado, nunca em cima de problema ou reclamação.",
    "- Descontraída e educada ao mesmo tempo. Gíria NÃO. O registro é o de uma pessoa",
    "  simpática do atendimento, não o de um amigo no grupo. Nada de \"opa\", \"e aí\",",
    "  \"qual é\", \"fala aí\", \"me fala aí\", \"beleza\", \"blz\", \"valeu\", \"tranquilo\",",
    "  \"suave\", \"firmeza\", \"demorou\", \"pode crer\", \"mano\", \"cara\", \"véi\", \"tá ligado\",",
    "  \"bora\", \"partiu\", \"massa\", \"top\", \"show\", \"maneiro\", \"tipo assim\", \"sacou\".",
    "  No lugar de \"Opa, me fala aí, qual é?\", escreva \"Oi! Em que posso ajudar?\".",
    "  Descontração vem do tom e do ritmo da frase, não de gíria: \"Claro!\", \"Perfeito!\",",
    "  \"Já vejo isso para você\" são leves e continuam formais.",
    "- Uma pergunta por mensagem, no máximo. Duas perguntas no mesmo balão viram",
    "  formulário, e formulário ninguém responde.",
    "- Se a resposta da pessoa vier confusa ou curta demais (\"sim\", \"aham\", \"ok\"), NÃO",
    "  repita a sua pergunta com outras palavras. Siga a conversa com o que você já ia",
    "  dizer. Insistir em pergunta que a pessoa não respondeu é o que faz ela sumir.",
    "- NUNCA use travessão (). Nem para separar ideia, nem para explicar, nem para dar ênfase.",
    "  Use ponto, vírgula ou dois-pontos. Travessão em WhatsApp entrega que o texto é de robô.",
    "- Emoji só quando ele acrescenta alguma coisa. No máximo um por mensagem.",
    "- Se perguntarem se você é robô, IA ou atendimento automático: responda a verdade,",
    "  curto, sem constrangimento e sem pedir desculpa, do jeito que está escrito em",
    "  \"Quem você é\". Uma frase, e volte para o assunto da pessoa.",
    "  PROIBIDO, em qualquer situação, escrever \"sou humano\", \"sou uma pessoa de",
    "  verdade\", \"não sou robô\", \"é gente respondendo\" ou variação disso. Negar é",
    "  mentira, e mentira descoberta custa muito mais do que a pergunta valia.",
    "- Se a pessoa preferir falar com alguém do time, chame: use transferir_humano.",
    "- Não anuncie sozinho que é assistente virtual sem ninguém ter perguntado. Isso não",
    "  é esconder: é a mesma coisa que um atendente não começar a conversa dizendo o",
    "  cargo dele.",
    "- Nunca responda a um cumprimento só com outro cumprimento. \"Oi! Tudo bem?\"",
    "  sozinho devolve o trabalho para a pessoa e mata a conversa: ela já disse oi,",
    "  agora é a sua vez de abrir a porta. Cumprimente E ofereça alguma coisa na",
    "  mesma mensagem: o que você resolve, ou uma pergunta que leve a algum lugar.",
    "",
    "# Limites (não negociáveis)",
    "- Responda apenas sobre o que está no contexto do negócio abaixo.",
    "- Se a informação não estiver lá, NÃO invente. Diga que vai confirmar e chame transferir_humano.",
    "- Nunca prometa resultado, prazo ou preço que não esteja escrito no contexto.",
    "- Nunca deduza o nome da pessoa. Só use um nome que esteja escrito \"Nome:\" no",
    "  seu contexto ou que a própria pessoa tenha escrito. E-mail, CPF, número de",
    "  pedido e assinatura NÃO são nome: \"mariaclara.rb@exemplo.com\" não vira",
    "  \"Maria Clara\", e chamar alguém pela metade do nome dela é pior do que não",
    "  chamar por nome nenhum. Na dúvida, escreva a frase sem nome.",
    "- Nunca ofereça desconto, condição especial ou exceção por conta própria.",
    config.regras?.trim() ? config.regras.trim() : "",
    "",
    "# Contexto do negócio",
    config.contexto?.trim() || "(sem contexto cadastrado: transfira qualquer pergunta para um humano)",
    "",
    "# Biblioteca de mídia",
    "Você pode enviar estes arquivos com a ferramenta enviar_midia. Escolha pela descrição.",
    catalogoDeMidia(midias),
    ...catalogoDeLinks(links, config),
    ...(profissionais.length ? [
      "",
      "# Agenda",
      "Profissionais que atendem aqui:",
      profissionais.map((p) => `- ${p.nome}${p.especialidade ? `, ${p.especialidade}` : ""}`).join("\n"),
      "",
      "Como marcar, sem exceção:",
      "1. Descubra com quem a pessoa quer ser atendida. Se ela não souber, não escolha por ela.",
      "2. Chame consultar_horarios. NUNCA diga um dia ou hora que não tenha vindo dessa ferramenta.",
      "3. Ofereça três ou quatro opções, em linguagem de conversa, e deixe ela escolher.",
      "4. Confirme o nome de quem vai ser atendido.",
      "5. Chame marcar_consulta com o codigo do horário escolhido.",
      "6. Repita o dia e a hora marcados.",
      "",
      "Ao falar de datas, sem exceção:",
      "- Diga sempre a data: \"quarta, 09/09\". NUNCA use \"semana que vem\", \"nos próximos dias\",",
      "  \"mês que vem\" ou qualquer expressão vaga para descrever o que a ferramenta devolveu.",
      "- Se a pessoa perguntar sobre um período que você não consultou, CHAME A FERRAMENTA DE NOVO",
      "  com dias maior. Nunca responda \"tem sim\" sem ter os horários daquele período em mãos.",
      "- Se não houver vaga no período, diga isso com a data exata e ofereça olhar mais adiante.",
      "- Não prometa quando o lembrete chega. Diga só que a pessoa será lembrada antes.",
    ] : []),
  ].filter((l) => l !== "").join("\n");
}

// Estado que muda a cada mensagem. Fica DEPOIS do ponto de cache, de propósito.
export function montarSystemVolatil(conversa) {
  // No Instagram não existe telefone, e dizer "Telefone: undefined" fazia o
  // modelo inventar que tinha o número da pessoa.
  const partes = conversa.canal === "instagram"
    ? ["Esta conversa é por mensagem direta no Instagram. Você NÃO tem o telefone nem o e-mail desta pessoa."]
    // O aviso da segunda linha não é zelo: sem ele, quando a pessoa pedia para
    // falar com a empresa e não havia telefone da empresa no contexto, o modelo
    // oferecia o único número que tinha à mão, que é o da própria pessoa. Já
    // aconteceu duas vezes num teste só.
    : [
        `Telefone do contato: ${conversa.contato || conversa.telefone}.`,
        "Este número é o DA PESSOA com quem você fala, nunca o da empresa:",
        "jamais ofereça ele para a pessoa ligar ou entrar em contato.",
        "Se não houver telefone da empresa no que você sabe, diga que vai pedir",
        "para alguém da equipe retomar por aqui, em vez de inventar um número.",
      ];
  if (conversa.nome_contato) partes.push(`Nome: ${conversa.nome_contato}.`);
  if (conversa.etiquetas?.length) partes.push(`Já sabemos: ${conversa.etiquetas.join(", ")}.`);
  partes.push(`Score atual: ${conversa.score || 0}.`);

  // Quanto tempo a pessoa ficou fora. Sem isto o modelo não tem noção nenhuma
  // de tempo: para ele a conversa de onze horas atrás acabou de acontecer, e
  // um "Olá" depois do intervalo recebia um "Oi! Tudo bem?" seco, como se
  // fosse a continuação de uma frase. Quem voltou no fim do dia não está
  // continuando: está chegando de novo.
  //
  // `abrirConversa` devolve a linha ANTES de carimbar `ultima_em`, então esta
  // conta é sobre a última mensagem de verdade, não sobre a que chegou agora.
  const antes = conversa.ultima_em ? new Date(conversa.ultima_em).getTime() : 0;
  const horas = antes ? (Date.now() - antes) / 3600000 : 0;

  // Vai no fim e em linha propria, nao no meio do paragrafo. Junto com
  // "Score atual: 0." o modelo simplesmente nao via: testado duas vezes, a
  // resposta continuava sendo um "Oi!" seco.
  const sumiu = horas >= 168
    ? "sumiu por mais de uma semana e esta voltando agora"
    : "falou com voce hoje ou nos ultimos dias e esta voltando agora";
  const retomada = antes && horas >= 4
    ? `\n\nPRIMEIRA MENSAGEM DEPOIS DE UM INTERVALO: esta pessoa ja ${sumiu}. `
      + "Receba ela de volta numa mensagem so, com estas tres coisas juntas: que "
      + "e bom ve-la de novo, o NOME DA EMPRESA, e no que voce pode ajudar. "
      + "Exemplo do tom, para variar com as suas palavras: \"Oi! Que bom te ver "
      + "de novo por aqui. Em que posso te ajudar hoje no atendimento da "
      + "<empresa>?\". Dizer o nome da empresa aqui esta liberado e nao conta "
      + "como se anunciar: e so retomar o atendimento. Nao responda so com um "
      + "cumprimento e nao continue a frase anterior como se nada tivesse "
      + "acontecido."
    : "";

  return partes.join(" ") + retomada;
}

/**
 * Comentário no Instagram: gera a resposta pública e a DM, numa chamada só.
 *
 * Não passa pelo laço de ferramentas de propósito. Comentário não é conversa:
 * é um disparo único, sem histórico e sem nada para consultar. Uma chamada sem
 * ferramenta custa uma fração do turno normal, e o bloco estável é o MESMO do
 * agente conversacional, então as duas coisas dividem o mesmo cache.
 *
 * Devolve { publico, privado }.
 */
export async function responderComentario(ctx, textoDoComentario, jaDitas = []) {
  // Dois modos, e quem escolhe é o cliente.
  //
  // Com `comentario_dm` ligado, o comentário puxa a pessoa para a DM, que é o
  // funil clássico. Desligado, a conversa fica no próprio comentário e o convite
  // é o link da bio: ninguém recebe mensagem sem ter pedido, e some a reclamação
  // de "me responde sem a mensagem automática", que já apareceu embaixo de post.
  const abreDm = ctx.config?.comentario_dm !== false;

  const instrucao = (abreDm ? [
    "Alguém comentou num post desta empresa no Instagram. Escreva DUAS respostas.",
    "",
    "1. `publico`: aparece embaixo do comentário e QUALQUER PESSOA vê, inclusive quem",
    "   revisa a conta na Meta. No máximo 12 palavras. Acolhe e convida para a DM.",
    "   NUNCA oferta, NUNCA preço, NUNCA link, NUNCA promessa.",
    "2. `privado`: a mensagem direta para a pessoa. Duas ou três frases, no seu tom.",
    "   Responde o que ela perguntou, se deu para entender, e abre espaço para ela falar.",
  ] : [
    "Alguém comentou num post desta empresa no Instagram. Responda ali mesmo, no",
    "comentário. Você NÃO vai mandar mensagem direta para esta pessoa.",
    "",
    "1. `publico`: aparece embaixo do comentário e QUALQUER PESSOA vê, inclusive quem",
    "   revisa a conta na Meta.",
    "   São dois tipos de comentário, e os dois terminam no mesmo lugar: a bio.",
    "",
    "   a) COMENTÁRIO GENÉRICO, que é a maioria: a palavra da chamada do vídeo",
    "      (\"currículo americano\", \"eu quero\", \"info\", \"🙋\", \"quero sim\"), elogio,",
    "      emoji. Não tem o que responder: mande a pessoa no LINK DA BIO e pronto.",
    "      Uma frase. Não invente pergunta para puxar assunto.",
    "",
    "   b) PERGUNTA DE VERDADE: responda a pergunta com a informação que está no",
    "      contexto do negócio, em no máximo duas frases, e AÍ mande para a bio.",
    "      Se a pergunta for grande demais para caber em duas frases, não tente",
    "      explicar tudo: diga que na bio tem uma aula completa sobre currículo",
    "      americano e sobre trabalhar nos Estados Unidos, e mande assistir.",
    "",
    "   Em qualquer um dos dois, a bio entra no fim. Escreva \"link da bio\", nunca um",
    "   endereço. NUNCA preço, NUNCA promessa.",
    "   Fale como gente comentando, não como atendimento. Sem \"olá\", sem \"prezado\".",
    "   Teto duro: 40 palavras. Passou disso, corta e manda para a aula da bio.",
    "2. `privado`: deixe SEMPRE vazio, string vazia. Não existe DM neste modo.",
  ]).concat([
    "",
    "COMENTÁRIO CURTO É LEAD, NÃO É VAZIO. \"eu\", \"info\", \"quero\", \"manda\", \"🙋\"",
    "são pessoas interessadas se manifestando, e TODAS merecem resposta.",
    "",
    "Devolva os dois campos vazios APENAS em ofensa, ameaça, spam de divulgação de",
    "outro negócio, ou assunto que não tem nada a ver. Não responda provocação.",
    "",
    'Responda APENAS JSON válido: {"publico": "...", "privado": "..."}',
  ]).join("\n");

  // A variedade não sai de pedir "varie": comentário quase sempre é a mesma
  // palavra ("quero", "info", "eu"), e entrada igual produz saída igual. O que
  // produz variedade de verdade é mostrar o que já foi dito e proibir repetir.
  //
  // Vai num bloco SEPARADO, depois do ponto de cache, porque muda a cada
  // comentário. Dentro do bloco estável, quebraria o cache toda vez.
  const antiRepeticao = jaDitas.length ? [
    "",
    "Estas são as suas últimas respostas públicas nesta conta:",
    jaDitas.map((t) => `- ${t}`).join("\n"),
    "",
    "NÃO repita nenhuma delas, nem com palavra trocada. Não comece com a mesma",
    "palavra das duas últimas. Varie a forma: às vezes pergunta, às vezes só",
    "acolhe, às vezes responde direto e convida depois. Repetição literal embaixo",
    "de post é o que faz o Instagram tratar a conta como automação.",
  ].join("\n") : "";

  const modelo = ctx.config.modelo_padrao || "claude-haiku-4-5";

  const resposta = await anthropic().messages.create({
    model: modelo,
    max_tokens: 500,
    system: [
      {
        type: "text",
        text: montarSystemEstavel(ctx.config, ctx.midias, ctx.profissionais || [], ctx.links || []),
        cache_control: { type: "ephemeral" },
      },
      { type: "text", text: instrucao + antiRepeticao },
    ],
    messages: [{ role: "user", content: `Comentário: ${textoDoComentario}` }],
  });

  await registrarUso(
    ctx.cliente.id, ctx.conversa?.id || null, modelo,
    resposta.usage, calcularCusto(modelo, resposta.usage),
  ).catch((e) => console.warn("[uso] não registrado:", e.message));

  const bruto = resposta.content.filter((b) => b.type === "text").map((b) => b.text).join("").trim();

  try {
    // O modelo às vezes embrulha em cerca de markdown e às vezes escreve uma
    // frase depois do JSON, explicando o que fez. Tirar só as cercas não basta:
    // recorta do primeiro "{" até o último "}".
    const abre = bruto.indexOf("{");
    const fecha = bruto.lastIndexOf("}");
    if (abre === -1 || fecha <= abre) throw new Error("sem JSON");
    const d = JSON.parse(bruto.slice(abre, fecha + 1));
    return { publico: semGenero(semRaciocinio(d.publico)), privado: semGenero(semRaciocinio(d.privado)) };
  } catch {
    // Sem JSON válido não dá para saber o que é público e o que é privado, e
    // publicar o texto errado embaixo de um post é o erro mais caro aqui.
    console.warn("[comentário] resposta não veio em JSON:", bruto.slice(0, 200));
    return { publico: "", privado: "" };
  }
}

/**
 * Roda um turno completo do agente.
 * ctx: { cliente, config, midias, conversa, telefone }
 * Devolve { texto, historicoNovo, transferiu, enviouAlgo }
 */
// A janela de histórico corta por quantidade de mensagens, e esse corte pode
// cair no meio de um par tool_use/tool_result. Quando sobra o resultado sem a
// chamada, a API devolve 400 e o atendimento morre em silêncio, sem resposta
// nenhuma para a pessoa. Aconteceu em teste; em produção seria uma conversa
// perdida sem rastro. Aqui a gente descarta o órfão do começo e segue.
function semToolResultOrfao(historico) {
  let i = 0;
  while (i < historico.length) {
    const conteudo = historico[i].content;
    const comecaComResultado = Array.isArray(conteudo)
      && conteudo.some((b) => b?.type === "tool_result");
    if (!comecaComResultado) break;
    i++;
  }
  if (i) console.warn(`[histórico] ${i} mensagem(ns) com tool_result órfão descartada(s) do início.`);
  return i ? historico.slice(i) : historico;
}

// O modelo às vezes escreve o raciocínio como TEXTO COMUM, entre <thinking>,
// em vez de usar o bloco de raciocínio da API. Filtrar por `type === "text"`
// não pega isso, porque para a API aquilo é texto igual ao resto.
//
// Já chegou numa pessoa de verdade: ela perguntou "você é um robô?" e recebeu o
// raciocínio inteiro, com a instrução de nunca dizer que é IA, antes da resposta.
// Pior resultado possível para a pergunta pior possível. Nunca mais.
const TAGS_DE_RACIOCINIO = "thinking|reasoning|scratchpad|pensamento|analysis";

// "deixa eu chamar ela", "vou passar para alguém da equipe", "já aviso o time".
// Só dispara quando o próprio texto promete: nunca transfere por conta própria.
const PROMETEU_CHAMAR_HUMANO =
  /\b(chamar|chamo|chamando|avisar|aviso|avisando|passar|passo|transferir|transfiro)\b[^.!?]{0,45}\b(ela|ele|algu[ée]m|uma pessoa|a equipe|da equipe|o time|do time|atendente|a Keury)\b/i;

// Resposta que passa disso não cabe em duas frases, que é o limite combinado com
// o cliente. É o mesmo corte que o divisor de balões usa para dizer que um
// parágrafo é longo demais.
const TAMANHO_DE_RESPOSTA_LONGA = 320;

// Quem perguntou de novo não assistiu ainda, então o link vai de novo: dizer "a
// aula que eu te mandei" obriga a pessoa a rolar a conversa inteira para achar o
// endereço, e ela não rola. Mas repetir sem fim o mesmo bloco de texto é o que
// faz a conversa virar anúncio, então existe um teto.
const TETO_DE_REFORCOS = 3;

function vezesQueMandouLink(historico, chave) {
  return historico.filter((m) =>
    Array.isArray(m.content) && m.content.some(
      (b) => b?.type === "tool_use" && b.name === "enviar_link" && b.input?.chave === chave)).length;
}

// "Bem-vindo" e "bem-vinda" erram o genero de metade de quem escreve, e o erro
// cai logo na primeira palavra da conversa. A regra existe no prompt desde o
// comeco e o modelo furou duas vezes no mesmo dia: instrucao de prompt e
// pedido, nao garantia. Aqui vira garantia.
//
// Troca a saudacao inteira em vez de so apagar a palavra, senao sobra "Oi! A
// Ousadia Marketing!" na tela da pessoa.
// Giria que o modelo solta e que nao combina com atendimento de marca.
//
// O cliente pediu descontraido COM formalidade, e a diferenca mora quase toda
// na saudacao: "Opa, me fala ai, qual e?" e "Oi! Em que posso ajudar?" dizem a
// mesma coisa, e so a segunda parece a empresa falando.
//
// So entra aqui troca que nao tem como piorar a frase. O resto e trabalho do
// prompt: reescrever no escuro estraga mais do que conserta.
const GIRIAS = [
  // Interjeicao de abertura, no comeco da mensagem ou de uma frase.
  // `\b` nao serve aqui: em JavaScript ele so conhece letra ASCII, entao
  // depois do "i" de "e ai" ele nao enxerga fim de palavra e a troca nao
  // acontece. `(?![\p{L}])` com a bandeira `u` enxerga.
  [/(^|[.!?]\s+)(opa|e a[ií]|ea[ií]|salve|fala a[ií]|firmeza|suave|demorou)(?![\p{L}])[!,.…]*\s*/giu, "$1Oi! "],
  [/,?\s*me fala a[ií],?\s*/gi, " "],
  [/\bqual\s+[eé]\?/gi, "em que posso ajudar?"],
  [/\bbeleza\?/gi, "tudo bem?"],
  [/\bblz\b/gi, "tudo bem"],
  [/,?\s*t[aá]\s+ligad[oa]\?/gi, "?"],
  [/\bpode crer\b/gi, "com certeza"],
];

const BOAS_VINDAS = [
  [/\b(?:sejam?\s+)?bem[-\s]?vind[oa]s?\s+ao\s+/gi, "que bom te ver no "],
  [/\b(?:sejam?\s+)?bem[-\s]?vind[oa]s?\s+[aà]\s+/gi, "que bom te ver na "],
  [/\b(?:sejam?\s+)?bem[-\s]?vind[oa]s?\b/gi, "que bom te ver por aqui"],
];

export function semGenero(texto) {
  let saida = String(texto || "");
  for (const [de, para] of BOAS_VINDAS) saida = saida.replace(de, para);
  const trocouGenero = saida !== String(texto || "");

  const antesDaGiria = saida;
  for (const [de, para] of GIRIAS) saida = saida.replace(de, para);
  const trocouGiria = saida !== antesDaGiria;

  if (!trocouGenero && !trocouGiria) return saida;
  if (trocouGenero) console.warn("[registro] a resposta trazia \"bem-vindo\" e foi reescrita antes de sair.");
  if (trocouGiria) console.warn("[registro] a resposta trazia giria e foi reescrita antes de sair:", antesDaGiria.slice(0, 80));

  // A troca deixa minuscula no meio da frase e no comeco tambem. Recapitaliza
  // depois de ponto final, de "!" e de "?", e no primeiro caractere.
  return saida.replace(/(^|[.!?]\s+)([a-zà-ú])/gu, (_, antes, letra) => antes + letra.toUpperCase());
}

export function semRaciocinio(texto) {
  const limpo = String(texto || "")
    .replace(new RegExp(`<(?:antml:)?(?:${TAGS_DE_RACIOCINIO})>[\\s\\S]*?</(?:antml:)?(?:${TAGS_DE_RACIOCINIO})>`, "gi"), "")
    // Bloco aberto e nunca fechado: corta dali até o fim, senão sobra metade do
    // raciocínio na tela.
    .replace(new RegExp(`<(?:antml:)?(?:${TAGS_DE_RACIOCINIO})>[\\s\\S]*$`, "i"), "")
    .replace(new RegExp(`</?(?:antml:)?(?:${TAGS_DE_RACIOCINIO})>`, "gi"), "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  if (limpo !== String(texto || "").trim()) {
    console.warn("[raciocínio] bloco de pensamento removido da resposta antes de enviar.");
  }
  return limpo;
}

export async function responder(ctx, historico, mensagemUsuario) {
  // Zera aqui, não em quem chama: isto é estado DESTA resposta. O webhook monta
  // um ctx novo a cada mensagem, mas o script de teste reaproveita o mesmo, e
  // com a lista acumulando o reforço nunca disparava no teste. Teste que mente
  // é pior que teste nenhum.
  ctx.linksEnviados = [];

  const ferramentas = definirFerramentas(ctx);
  const modelo = escolherModelo(mensagemUsuario, ctx.conversa, historico, ctx.config);

  // Link de entrada: na primeira resposta da conversa ele vai, ponto.
  //
  // Pedir isso no prompt não funciona. Foram seis rodadas de teste com a regra
  // no topo das regras, no fim, e dentro da descrição da ferramenta: o Haiku
  // responde a dúvida e esquece o link. Então aqui a gente não pede, a gente
  // obriga: tool_choice força a chamada e a chave vem do cadastro, não da
  // escolha do modelo. O que continua sendo dele é o que falar junto.
  const linkInicial = (ctx.links || []).some((l) => l.chave === ctx.config?.link_inicial)
    ? ctx.config.link_inicial
    : null;
  // "Primeira resposta" é a primeira vez que a IA fala, não histórico vazio: a
  // conversa já nasce com a mensagem da pessoa dentro, e com o comentário do
  // Instagram ela nasce com duas.
  const historicoLimpo = semToolResultOrfao(historico);
  const forcarLink = Boolean(linkInicial) && !historicoLimpo.some((m) => m.role === "assistant");

  const mensagens = [...historicoLimpo, { role: "user", content: mensagemUsuario }];
  const novos = [{ role: "user", content: mensagemUsuario }];

  let textoFinal = "";

  for (let volta = 0; volta < MAX_VOLTAS; volta++) {
    const parametros = {
      model: modelo,
      max_tokens: 4000,
      tools: ferramentas,
      system: [
        {
          type: "text",
          text: montarSystemEstavel(ctx.config, ctx.midias, ctx.profissionais || [], ctx.links || []),
          cache_control: { type: "ephemeral" },
        },
        { type: "text", text: montarSystemVolatil(ctx.conversa) },
      ],
      messages: mensagens,
    };

    // Opus 5 pensa por padrão; esforço baixo mantém o custo em pé sem
    // desligar o raciocínio: desligar tem efeitos colaterais conhecidos.
    if (modelo.startsWith("claude-opus-5")) {
      parametros.output_config = { effort: "low" };
    }

    if (forcarLink && volta === 0) {
      parametros.tool_choice = { type: "tool", name: "enviar_link" };
    }

    const resposta = await anthropic().messages.create(parametros);

    // Contabilidade nunca derruba um atendimento: se falhar, registra e segue.
    await registrarUso(
      ctx.cliente.id, ctx.conversa.id, modelo,
      resposta.usage, calcularCusto(modelo, resposta.usage),
    ).catch((e) => console.warn("[uso] não registrado:", e.message));

    if (resposta.stop_reason === "refusal") {
      ctx.transferiu = true;
      return { texto: "", historicoNovo: novos, transferiu: true, enviouAlgo: ctx.enviouAlgo };
    }

    const texto = semGenero(semRaciocinio(
      resposta.content
        .filter((b) => b.type === "text")
        .map((b) => b.text)
        .join("\n\n"),
    ));
    if (resposta.stop_reason !== "tool_use") {
      if (texto) textoFinal = texto;
      break;
    }

    // Texto que vem ANTES de uma chamada de ferramenta é a frase que apresenta o
    // que vem em seguida: "deixa eu te mandar a aula", "olha essa foto aqui".
    // Então ele sai agora, não no fim.
    //
    // Guardar para o fim invertia a ordem e ficava absurdo: a pessoa recebia a
    // aula com o link e, depois dela, o "deixa eu te mandar uma aula".
    if (texto) {
      await ctx.canal.emBaloes(texto);
      ctx.enviouAlgo = true;
    }

    mensagens.push({ role: "assistant", content: resposta.content });
    novos.push({ role: "assistant", content: resposta.content });

    const usos = resposta.content.filter((b) => b.type === "tool_use");
    const resultados = [];
    for (const uso of usos) {
      // Na chamada forçada, a chave é a do cadastro mesmo que o modelo escolha
      // outra: quem decide qual link abre a conversa é o cliente, não o modelo.
      const forcado = forcarLink && volta === 0 && uso.name === "enviar_link";
      const entrada = forcado ? { ...uso.input, chave: linkInicial } : uso.input;
      const saida = await executarFerramenta(uso.name, entrada, ctx);
      resultados.push({
        type: "tool_result",
        tool_use_id: uso.id,
        content: JSON.stringify(saida),
        is_error: Boolean(saida?.erro),
      });
    }

    mensagens.push({ role: "user", content: resultados });
    novos.push({ role: "user", content: resultados });
  }

  // Rede de segurança: o modelo às vezes PROMETE chamar uma pessoa e não chama a
  // ferramenta. "Deixa eu chamar ela pra conversar com você" e fim, sem ninguém
  // avisado do outro lado. É a pior falha possível aqui, porque a pessoa fica
  // esperando um humano que nunca soube que existia uma conversa. Testado com
  // três jeitos de pedir: prometeu nas três, não chamou em nenhuma.
  if (!ctx.transferiu && textoFinal && PROMETEU_CHAMAR_HUMANO.test(textoFinal)) {
    console.warn("[transferência] o modelo prometeu chamar uma pessoa e não chamou. Forçando.");
    await executarFerramenta("transferir_humano", {
      motivo: "A pessoa pediu para falar com alguém da equipe.",
      resumo: textoFinal,
    }, ctx);
  }

  // Reforço: resposta longa termina com o link, não com uma promessa de link.
  //
  // O prompt manda não explicar tudo por mensagem e mandar a aula no lugar. O
  // Haiku não obedece: escreve três balões de explicação e termina com "a aula
  // que eu te mandei", sem mandar, e a pessoa teria que rolar a conversa inteira
  // para achar o endereço. O Opus obedece, mas custa vinte vezes mais em toda
  // mensagem para consertar uma minoria delas. Então aqui não se pede: entrega.
  const reforco = (ctx.links || []).some((l) => l.chave === ctx.config?.link_reforco)
    ? ctx.config.link_reforco
    : null;

  const precisaReforcar = Boolean(reforco)
    && textoFinal.length > TAMANHO_DE_RESPOSTA_LONGA
    && !(ctx.linksEnviados || []).includes(reforco)
    && vezesQueMandouLink(historicoLimpo, reforco) < TETO_DE_REFORCOS;

  if (precisaReforcar) {
    // O texto sai daqui mesmo, antes do link, e por isso volta vazio lá embaixo:
    // quem recebe primeiro a resposta e depois o link entende a ordem das coisas.
    // O contrário parece anúncio interrompendo a conversa.
    await ctx.canal.emBaloes(textoFinal);
    ctx.enviouAlgo = true;
    await executarFerramenta("enviar_link", { chave: reforco }, ctx);
  }

  if (textoFinal) novos.push({ role: "assistant", content: [{ type: "text", text: textoFinal }] });

  return {
    texto: precisaReforcar ? "" : textoFinal,
    historicoNovo: novos,
    transferiu: Boolean(ctx.transferiu),
    enviouAlgo: Boolean(ctx.enviouAlgo),
  };
}
