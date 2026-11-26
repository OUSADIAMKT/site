// Prova de atomicidade da reserva, contra um Postgres de verdade.
//
// Isto é o que o dublê em `test/duplo.js` não pode provar: que o
// `for update skip locked` entrega conjuntos disjuntos a processos simultâneos.
// Só um banco responde essa pergunta, e por um motivo concreto: no Supabase a
// chamada passa pelo pooler em modo transação, e é o pooler que decide se cada
// `select ... for update` cai na mesma transação que o `update`.
//
// NÃO RODA SOZINHO e não faz parte de `npm test`. Precisa de um projeto
// isolado, apontado por variáveis próprias, e recusa produção por ref.
//
//   CRM_TESTE_URL=https://xxxx.supabase.co \
//   CRM_TESTE_KEY=<service key do projeto de teste> \
//   node scripts/testar-concorrencia.js
//
// O que ele cria: um cliente de teste com slug `teste-concorrencia`, um
// disparo e 100 destinatários com números da faixa de documentação
// (+5500000000xx), que não existem no WhatsApp. Nenhuma mensagem é enviada:
// o script chama apenas as funções de reserva e posse, nunca a Cloud API.
// Ao fim, apaga o que criou.

import { createClient } from "@supabase/supabase-js";

const QUANTOS = 100;
const PROCESSOS = 4;
const LOTE = 40;

const url = process.env.CRM_TESTE_URL;
const key = process.env.CRM_TESTE_KEY;

function parar(motivo) {
  console.error(`\n  PARADO: ${motivo}\n`);
  process.exit(1);
}

if (!url || !key) {
  parar("faltam CRM_TESTE_URL e CRM_TESTE_KEY. Este teste não roda sem ambiente isolado.");
}
// Trava contra o banco de produção: o endereço de teste não pode ser o mesmo
// que o CRM usa no ar.
if (process.env.SUPABASE_URL && url === process.env.SUPABASE_URL) {
  parar("CRM_TESTE_URL aponta para o mesmo banco de produção. Use um banco isolado.");
}
if (process.env.SUPABASE_URL && process.env.SUPABASE_URL === url) {
  parar("a URL de teste é igual à URL de produção configurada no ambiente.");
}

const sb = createClient(url, key, { auth: { persistSession: false } });

let falhas = 0;
function conferir(ok, descricao, detalhe = "") {
  console.log(`${ok ? "  ok  " : "  FALHOU  "} ${descricao}${detalhe ? ` — ${detalhe}` : ""}`);
  if (!ok) falhas += 1;
}

async function erroDo(p) {
  const { data, error } = await p;
  if (error) throw new Error(error.message);
  return data;
}

async function montarCenario() {
  const cliente = await erroDo(sb.from("clientes").insert({
    nome: "Teste de concorrência", slug: `teste-concorrencia-${Date.now()}`,
  }).select().single());

  const disparo = await erroDo(sb.from("disparos").insert({
    cliente_id: cliente.id,
    nome: "concorrência",
    texto: "mensagem que nunca sai",
    estado: "rascunho",
  }).select().single());

  const envios = Array.from({ length: QUANTOS }, (_, i) => ({
    disparo_id: disparo.id,
    // Faixa reservada para documentação: não existe no WhatsApp.
    telefone: `+5500000000${String(i).padStart(2, "0")}`,
    estado: "pendente",
  }));
  await erroDo(sb.from("disparo_envios").insert(envios));

  return { cliente, disparo };
}

async function limpar(cliente) {
  // disparo_envios e disparo_tentativas caem por cascade do disparo, e o
  // disparo cai por cascade do cliente.
  await sb.from("clientes").delete().eq("id", cliente.id);
}

async function testeReservaDisjunta(disparo) {
  // Quatro processos pedindo lotes ao mesmo tempo, até a fila secar. Se a
  // reserva não fosse atômica, dois deles sairiam com a mesma linha.
  const colhido = [];

  async function processo(n) {
    const meus = [];
    for (;;) {
      const linhas = await erroDo(sb.rpc("reservar_envios", {
        p_disparo: disparo.id, p_lote: LOTE,
      }));
      if (!linhas?.length) break;
      for (const l of linhas) meus.push({ id: l.id, tentativa: l.tentativa_id, processo: n });
    }
    return meus;
  }

  const lotes = await Promise.all(
    Array.from({ length: PROCESSOS }, (_, n) => processo(n + 1)),
  );
  for (const l of lotes) colhido.push(...l);

  const ids = colhido.map((x) => x.id);
  const unicos = new Set(ids);

  conferir(colhido.length === QUANTOS,
    `as ${QUANTOS} linhas foram reservadas uma vez cada`,
    `reservadas ${colhido.length}`);
  conferir(unicos.size === ids.length,
    "nenhuma linha foi reservada por dois processos",
    `${ids.length - unicos.size} sobreposições`);

  const senhas = new Set(colhido.map((x) => x.tentativa));
  conferir(senhas.size === colhido.length, "cada reserva recebeu uma senha própria");

  const porProcesso = {};
  for (const c of colhido) porProcesso[c.processo] = (porProcesso[c.processo] || 0) + 1;
  console.log(`       divisão entre os processos: ${JSON.stringify(porProcesso)}`);

  return colhido;
}

async function testePosse(colhido) {
  const [a, b] = colhido;

  conferir(
    await erroDo(sb.rpc("marcar_enviando", {
      p_envio: a.id, p_tentativa: b.tentativa, p_validade: "10 minutes",
    })) === false,
    "senha de outra linha não autoriza envio",
  );

  conferir(
    await erroDo(sb.rpc("marcar_enviando", {
      p_envio: a.id, p_tentativa: a.tentativa, p_validade: "10 minutes",
    })) === true,
    "a senha correta autoriza envio",
  );

  conferir(
    await erroDo(sb.rpc("marcar_enviando", {
      p_envio: a.id, p_tentativa: a.tentativa, p_validade: "10 minutes",
    })) === false,
    "a mesma senha não autoriza duas vezes",
  );
}

async function testeRecuperacaoFencing(disparo, colhido) {
  const alvo = colhido[2];

  // Envelhece a reserva na mão, para não esperar dez minutos.
  await erroDo(sb.from("disparo_envios")
    .update({ reservado_em: new Date(Date.now() - 20 * 60_000).toISOString() })
    .eq("id", alvo.id));

  const quantas = await erroDo(sb.rpc("recuperar_reservas", {
    p_disparo: disparo.id, p_validade: "10 minutes",
  }));
  conferir(quantas >= 1, "a reserva vencida voltou para pendente", `recuperadas ${quantas}`);

  conferir(
    await erroDo(sb.rpc("marcar_enviando", {
      p_envio: alvo.id, p_tentativa: alvo.tentativa, p_validade: "10 minutes",
    })) === false,
    "o processo antigo não reutiliza a reserva recuperada",
  );
}

async function testeDesconhecidoNaoVolta(disparo) {
  const linhas = await erroDo(sb.rpc("reservar_envios", { p_disparo: disparo.id, p_lote: 1 }));
  const l = linhas[0];
  await erroDo(sb.rpc("marcar_enviando", {
    p_envio: l.id, p_tentativa: l.tentativa_id, p_validade: "10 minutes",
  }));
  await erroDo(sb.from("disparo_envios")
    .update({ atualizado_em: new Date(Date.now() - 20 * 60_000).toISOString() })
    .eq("id", l.id));

  const quantos = await erroDo(sb.rpc("expirar_enviando", {
    p_disparo: disparo.id, p_validade: "5 minutes",
  }));
  conferir(quantos >= 1, "enviando vencido virou desconhecido");

  const depois = await erroDo(sb.from("disparo_envios").select("estado").eq("id", l.id).single());
  conferir(depois.estado === "desconhecido", "o estado gravado é desconhecido", depois.estado);

  // E a varredura de reservas não pode tocar nisso.
  await erroDo(sb.rpc("recuperar_reservas", { p_disparo: disparo.id, p_validade: "1 minute" }));
  const final = await erroDo(sb.from("disparo_envios").select("estado").eq("id", l.id).single());
  conferir(final.estado === "desconhecido",
    "recuperar_reservas não devolve desconhecido para a fila", final.estado);
}

async function testeTransicaoInvalida(disparo) {
  // Direto na tabela, que é o caminho de um script de manutenção ou do painel
  // do Supabase. O trigger precisa recusar.
  const l = await erroDo(sb.from("disparo_envios")
    .select("id").eq("disparo_id", disparo.id).eq("estado", "pendente").limit(1).single());

  const { error } = await sb.from("disparo_envios")
    .update({ estado: "enviado" }).eq("id", l.id);
  conferir(!!error, "pendente -> enviado é recusado pelo trigger", error?.message || "passou");

  const { error: erro2 } = await sb.from("disparo_envios")
    .update({ estado: "pendente" }).eq("estado", "desconhecido").eq("disparo_id", disparo.id);
  conferir(!!erro2, "desconhecido -> pendente é recusado pelo trigger", erro2?.message || "passou");
}

async function main() {
  console.log(`\nAmbiente de teste: ${url}\n`);
  const { cliente, disparo } = await montarCenario();
  try {
    const colhido = await testeReservaDisjunta(disparo);
    await testePosse(colhido);
    await testeRecuperacaoFencing(disparo, colhido);
    await testeDesconhecidoNaoVolta(disparo);
    await testeTransicaoInvalida(disparo);
  } finally {
    await limpar(cliente);
    console.log("\n  cenário apagado");
  }

  console.log(falhas === 0 ? "\nTudo passou.\n" : `\n${falhas} verificações falharam.\n`);
  process.exit(falhas === 0 ? 0 : 1);
}

main().catch((e) => {
  console.error(`\n  ERRO: ${e.message}\n`);
  process.exit(1);
});
