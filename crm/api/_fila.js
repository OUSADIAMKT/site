// A fila de atendimento. A IA transfere, a conversa entra aqui, e a fila
// entrega para quem está disponível com menos gente na mão.
//
// Cada passagem pela fila vira uma linha em `atendimentos`, que é o que
// permite calcular tempo de espera e de atendimento no relatório do gestor.
// Os campos em `conversas` guardam só o estado atual e são sobrescritos.

import { db } from "./_db.js";
import { assuntoDaConversa, etiquetasDoAssunto } from "./_assunto.js";

const agora = () => new Date().toISOString();

/** Fecha a passagem que estiver aberta para esta conversa. */
async function fecharPassagem(conversaId, desfecho) {
  await db().from("atendimentos")
    .update({ encerrada_em: agora(), desfecho })
    .eq("conversa_id", conversaId)
    .is("encerrada_em", null);
}

/**
 * Põe a conversa na fila e já tenta entregar a um atendente livre.
 * Se ninguém estiver disponível, ela fica esperando e alguém assume depois.
 */
export async function enfileirar(conversaId, motivo, assunto = null) {
  const sb = db();

  const { data: conversa, error } = await sb
    .from("conversas")
    .update({
      modo: "fila",
      atendente_id: null,
      assumida_em: null,
      assumido_por: null,
      fila_desde: agora(),
      motivo_fila: motivo || null,
    })
    .eq("id", conversaId)
    .select("id, cliente_id, etiquetas")
    .single();

  if (error) throw new Error(`Falha ao enfileirar: ${error.message}`);

  await fecharPassagem(conversaId, "abandonado");
  await sb.from("atendimentos").insert({
    cliente_id: conversa.cliente_id,
    conversa_id: conversa.id,
    entrou_fila: agora(),
    motivo: motivo || null,
  });

  // O assunto vem de quem transferiu; quando nao vem, as etiquetas que o
  // webhook pos na conversa respondem a mesma pergunta.
  return distribuir(conversa.id, conversa.cliente_id, assunto || assuntoDaConversa(conversa));
}

/**
 * Entrega a conversa ao atendente mais ocioso do cliente.
 * Devolve { atendente } se conseguiu, ou { esperando: true } se não há ninguém.
 */
export async function distribuir(conversaId, clienteId, assunto = null) {
  const sb = db();

  // Com assunto, quem atende aquele assunto vem primeiro; sem assunto, a conta
  // e a antiga, so carga. Nos dois casos ninguem disponivel fica de fora: se a
  // Lia nao estiver no ar, a conversa de matrícula vai para quem estiver, com a
  // etiqueta `matricula` na tela para ela retomar depois.
  const { data: escolhido, error } = assunto
    ? await sb.rpc("atendente_ocioso_assunto", { p_cliente: clienteId, p_assunto: assunto })
    : await sb.rpc("atendente_ocioso", { p_cliente: clienteId });
  if (error) throw new Error(`Falha ao escolher atendente: ${error.message}`);
  if (!escolhido) return { esperando: true };

  return atribuir(conversaId, escolhido);
}

/**
 * Marca a conversa como assumida por um atendente. Só funciona se ela ainda
 * estiver na fila, para dois pedidos simultâneos não roubarem um do outro.
 */
export async function atribuir(conversaId, atendenteId) {
  const sb = db();
  const momento = agora();

  const { data: atribuida } = await sb
    .from("conversas")
    .update({
      modo: "humano",
      atendente_id: atendenteId,
      assumida_em: momento,
      assumido_por: String(atendenteId),
    })
    .eq("id", conversaId)
    .eq("modo", "fila")
    .select("id")
    .maybeSingle();

  if (!atribuida) return { esperando: true };

  await sb.from("atendimentos")
    .update({ atendente_id: atendenteId, assumida_em: momento, assumido_por: String(atendenteId) })
    .eq("conversa_id", conversaId)
    .is("encerrada_em", null);

  await sb.from("atendentes").update({ ultima_atribuicao: momento }).eq("id", atendenteId);

  const { data: quem } = await sb
    .from("atendentes").select("id, nome").eq("id", atendenteId).maybeSingle();

  return { atendente: quem };
}

/**
 * Tenta esvaziar a fila. Chamado quando alguém fica disponível ou encerra
 * um atendimento, para o próximo da fila não ficar esperando à toa.
 */
export async function puxarDaFila(clienteId, limite = 5) {
  const sb = db();

  const { data: esperando } = await sb
    .from("conversas")
    .select("id, etiquetas")
    .eq("cliente_id", clienteId)
    .eq("modo", "fila")
    .order("fila_desde", { ascending: true })
    .limit(limite);

  const entregues = [];
  for (const c of esperando || []) {
    const r = await distribuir(c.id, clienteId, assuntoDaConversa(c));
    // Nao da para parar no primeiro `esperando`: quem esta no ar pode ser de
    // outro assunto e a fila seguiria travada atras de uma conversa so. Com
    // assunto, `distribuir` entrega para quem houver, entao `esperando` aqui
    // significa mesmo que nao sobrou ninguem.
    if (r.esperando) break;
    entregues.push({ conversa: c.id, atendente: r.atendente });
  }
  return entregues;
}

/**
 * Tira a conversa da IA e põe na mão de uma pessoa, sem passar pela fila.
 *
 * O caminho normal é a IA transferir e a fila distribuir. Este é o contrário:
 * alguém lendo a conversa decide entrar nela. Vale para conversa que está com
 * a IA e para conversa que está esperando na fila, e o registro em
 * `atendimentos` acontece igual, senão esse atendimento não existiria em
 * relatório nenhum.
 */
export async function atenderAgora(conversaId, atendenteId, motivo, quem = null) {
  const sb = db();
  const momento = agora();

  // Se a conversa já estava na fila, o motivo que a IA escreveu é a melhor
  // descrição que existe do problema. Trocar ele por vazio só porque alguém
  // clicou em "assumir" apagaria justamente o contexto que o atendente precisa.
  const { data: antes } = await sb.from("conversas")
    .select("motivo_fila").eq("id", conversaId).maybeSingle();
  const razao = motivo || antes?.motivo_fila || "Assumida pela equipe na aba Conversas.";

  // Quem pôs a mão nisto. `atendente_id` responde QUAL atendente, e fica nulo
  // quando quem assume é o gestor, que não tem linha em `atendentes`. Era esse
  // o buraco: a passagem existia, contava no total do relatório e não entrava
  // em pessoa nenhuma. `dono` nunca é nulo, e a palavra 'operador' é a mesma
  // que `quemLe` usa em `leituras_conversa`.
  const dono = quem || (atendenteId ? String(atendenteId) : "operador");

  const { data, error } = await sb
    .from("conversas")
    .update({
      modo: "humano",
      atendente_id: atendenteId || null,
      assumida_em: momento,
      assumido_por: dono,
      fila_desde: null,
      motivo_fila: razao,
    })
    .eq("id", conversaId)
    .neq("modo", "humano")
    .select("id, cliente_id")
    .maybeSingle();

  if (error) throw new Error(`Falha ao assumir: ${error.message}`);
  if (!data) return { ja_estava: true };

  await fecharPassagem(conversaId, "abandonado");
  await sb.from("atendimentos").insert({
    cliente_id: data.cliente_id,
    conversa_id: data.id,
    atendente_id: atendenteId || null,
    assumido_por: dono,
    entrou_fila: momento,
    assumida_em: momento,
    motivo: razao,
  });

  if (atendenteId) {
    await sb.from("atendentes").update({ ultima_atribuicao: momento }).eq("id", atendenteId);
  }
  return { ok: true };
}

/**
 * Passa a conversa de um atendente para outro, sem passar pela fila.
 *
 * Existe porque o assunto muda no meio da conversa. A Lia explica a mentoria,
 * a pessoa conta que já é aluna e está sem acesso, e aquilo virou suporte,
 * que é da Rita. Mandar para a fila para a fila devolver seria burrice: a fila
 * escolhe por assunto e carga, e podia devolver para a própria Lia.
 *
 * A conversa não volta para a IA em nenhum momento: sai de uma mão e entra na
 * outra, e `atendimentos` ganha duas linhas, uma fechada com desfecho
 * `passado` e uma aberta para quem recebeu. Sem isso o relatório contaria o
 * atendimento inteiro para quem começou.
 */
export async function passarPara(conversaId, paraAtendenteId, motivo, quem) {
  const sb = db();
  const momento = agora();

  const { data: destino } = await sb.from("atendentes")
    .select("id, nome, cliente_id, ativo, assuntos").eq("id", paraAtendenteId).maybeSingle();
  if (!destino) return { erro: "Atendente não encontrado." };
  if (!destino.ativo) return { erro: `${destino.nome} está desligado.` };

  const { data: conversa } = await sb.from("conversas")
    .select("id, cliente_id, modo, atendente_id, etiquetas").eq("id", conversaId).maybeSingle();
  if (!conversa) return { erro: "Conversa não encontrada." };
  if (conversa.cliente_id !== destino.cliente_id) return { erro: "Atendente de outro cliente." };
  if (conversa.atendente_id === destino.id) return { erro: `A conversa já está com ${destino.nome}.` };

  const razao = motivo?.trim()
    || `Passada para ${destino.nome}${quem ? ` por ${quem}` : ""}.`;

  // Quem recebe atende um assunto só: a etiqueta desse assunto entra agora.
  // É o caso Lia -> Rita: deixou de ser conversa de matrícula e virou de suporte, e
  // o quadro tem que mostrar isso. Com dois assuntos ou nenhum, não mexe:
  // adivinhar qual deles vale seria pior do que não etiquetar.
  const atuais = (conversa.etiquetas || []).map((e) => String(e).toLowerCase());
  const etiquetas = (destino.assuntos || []).length === 1
    ? [...new Set([...atuais, ...etiquetasDoAssunto(destino.assuntos[0])])]
    : atuais;

  // `modo` continua humano: a trava é `eq("modo", "humano")`, para não roubar
  // uma conversa que voltou para a IA ou caiu na fila entre a tela e o clique.
  const { data: movida, error } = await sb.from("conversas")
    .update({
      atendente_id: destino.id,
      assumida_em: momento,
      assumido_por: String(destino.id),
      fila_desde: null,
      motivo_fila: razao,
      etiquetas,
    })
    .eq("id", conversaId)
    .eq("modo", "humano")
    .select("id, cliente_id")
    .maybeSingle();

  if (error) throw new Error(`Falha ao passar a conversa: ${error.message}`);
  if (!movida) return { erro: "Esta conversa não está em atendimento humano agora." };

  await fecharPassagem(conversaId, "passado");
  await sb.from("atendimentos").insert({
    cliente_id: movida.cliente_id,
    conversa_id: movida.id,
    atendente_id: destino.id,
    assumido_por: String(destino.id),
    entrou_fila: momento,
    assumida_em: momento,
    motivo: razao,
  });
  await sb.from("atendentes").update({ ultima_atribuicao: momento }).eq("id", destino.id);

  return { ok: true, atendente: { id: destino.id, nome: destino.nome }, motivo: razao };
}

/**
 * Quanto tempo uma conversa pode ficar parada na mão de alguém.
 *
 * Doze horas. Já foi uma, depois duas, e duas ainda devolvia conversa que
 * tinha dono: em 25/11/2026 uma cliente mandou o código do pedido, a Rita
 * não viu em duas horas, e a conversa voltou para a IA com a pergunta em pé.
 * A IA não sabia que ia pegar aquilo no meio, e a pessoa ficou sem resposta.
 *
 * Doze horas cobre o turno inteiro e a noite: quem escreve de madrugada
 * continua sendo da equipe quando a equipe abre. Isto não é o relógio do
 * expediente, é a rede de segurança da conversa ESQUECIDA, e conversa
 * esquecida não se mede em horas de trabalho. Quem sabe que acabou clica em
 * encerrar, e quem não quer mais ela clica em devolver para a IA.
 *
 * Mexer aqui muda o atendimento de todos os clientes de uma vez.
 */
export const INATIVIDADE_MIN = 720;

/**
 * Devolve para a IA toda conversa humana parada há mais de `minutos`.
 *
 * Sem isto, conversa assumida e esquecida fica presa para sempre: a pessoa
 * escreve, o webhook vê `modo = humano` e não responde nada. Já aconteceu, com
 * quatro conversas de uma vez, e ninguém percebeu porque silêncio não dá erro.
 *
 * Não existe agendador aqui: o plano da Vercel não dá cron de hora em hora.
 * Então a conta é feita na hora em que alguém olha a fila e na hora em que
 * chega mensagem, que são exatamente os dois momentos em que ela importa.
 */
export async function soltarInativas(clienteId, minutos = INATIVIDADE_MIN) {
  const sb = db();
  const limite = Date.now() - minutos * 60000;

  const { data: emMao } = await sb
    .from("conversas")
    .select("id, ultima_em, assumida_em")
    .eq("cliente_id", clienteId)
    .eq("modo", "humano");

  // A hora que conta é a mais recente entre a última mensagem e o momento em
  // que alguém assumiu, não a última mensagem sozinha.
  //
  // Olhar só `ultima_em` quebrava o caso mais comum que existe: abrir uma
  // conversa velha e assumir para responder. A conversa é de semana passada,
  // então ela já nasce "parada há muito tempo", e o próximo refresh do
  // quadro, que roda a cada trinta segundos, devolvia ela para a IA antes de a
  // pessoa terminar de digitar. O sintoma era a tela dizer "a IA está calada
  // nesta conversa" e o envio responder "esta conversa não está em atendimento
  // humano", as duas coisas verdadeiras com meio segundo de diferença.
  const paradas = (emMao || []).filter((c) => {
    const mensagem = c.ultima_em ? new Date(c.ultima_em).getTime() : 0;
    const assumida = c.assumida_em ? new Date(c.assumida_em).getTime() : 0;
    return Math.max(mensagem, assumida) < limite;
  });

  for (const c of paradas) await soltar(c.id);
  return paradas.length;
}

/**
 * A mesma regra, para uma conversa só. Devolve true se soltou.
 *
 * Conta pelo mais recente entre a última mensagem e o momento em que alguém
 * assumiu, igual a `soltarInativas`. Olhando só `ultima_em`, esta aqui roubava
 * a conversa de quem tinha acabado de assumir: a atendente abre uma conversa
 * de semana passada, assume, a cliente responde, e o webhook via "parada há
 * dias", devolvia para a IA e deixava o robô responder por cima dela.
 */
export async function soltarSeInativa(conversa, minutos = INATIVIDADE_MIN) {
  if (conversa?.modo !== "humano") return false;
  const mensagem = conversa.ultima_em ? new Date(conversa.ultima_em).getTime() : 0;
  const assumida = conversa.assumida_em ? new Date(conversa.assumida_em).getTime() : 0;
  if (Date.now() - Math.max(mensagem, assumida) < minutos * 60000) return false;
  await soltar(conversa.id);
  return true;
}

async function soltar(conversaId) {
  const sb = db();
  await sb.from("conversas")
    .update({ modo: "ia", atendente_id: null, assumida_em: null, assumido_por: null, fila_desde: null, motivo_fila: null })
    .eq("id", conversaId);
  // Desfecho próprio: no relatório, atendimento que morreu de inatividade não
  // é a mesma coisa que atendimento que a pessoa encerrou.
  await fecharPassagem(conversaId, "inatividade");
}

/** Devolve a conversa para a fila, para outro atendente pegar. */
export async function devolver(conversaId) {
  const sb = db();

  const { data, error } = await sb
    .from("conversas")
    .update({ modo: "fila", atendente_id: null, assumida_em: null, assumido_por: null, fila_desde: agora() })
    .eq("id", conversaId)
    .select("id, cliente_id")
    .single();

  if (error) throw new Error(`Falha ao devolver: ${error.message}`);

  // A passagem anterior fecha como devolvida e uma nova começa: assim o
  // tempo de quem largou não entra na conta de quem assumir depois.
  await fecharPassagem(conversaId, "devolvido");
  await sb.from("atendimentos").insert({
    cliente_id: data.cliente_id,
    conversa_id: data.id,
    entrou_fila: agora(),
  });

  return distribuir(data.id, data.cliente_id);
}

/** Encerra o atendimento humano e devolve a conversa para a IA. */
export async function encerrar(conversaId, desfecho = "encerrado") {
  const sb = db();

  const { data, error } = await sb
    .from("conversas")
    .update({ modo: "ia", atendente_id: null, assumida_em: null, assumido_por: null, fila_desde: null, motivo_fila: null })
    .eq("id", conversaId)
    .select("id, cliente_id")
    .single();

  if (error) throw new Error(`Falha ao encerrar: ${error.message}`);

  // "encerrado" e "devolvido" acabam no mesmo lugar (a IA volta a responder),
  // mas não são a mesma coisa no relatório: um é a atendente dizendo que
  // resolveu, o outro é ela dizendo que aquilo não era com ela. Guardar os
  // dois como "encerrado" apagava a diferença justamente de quem precisa dela.
  await fecharPassagem(conversaId, desfecho === "devolvido_ia" ? "devolvido_ia" : "encerrado");
  await puxarDaFila(data.cliente_id);
  return { ok: true };
}
