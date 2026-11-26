// Verifica a montagem das colunas do quadro de atendimento, sem banco e sem rede.
//
//   node scripts/verificar-quadro.js
//   node --env-file=.env scripts/verificar-quadro.js --real
//
// A lógica das colunas é pura de propósito: recebe linhas e o relógio, devolve
// as colunas. É isso que torna possível provar o calor da janela de 24h sem
// esperar vinte e duas horas para ver a barra mudar de cor.

import { montarQuadro } from "../api/_quadro.js";

let falhas = 0;

function confere(titulo, real, esperado) {
  const bate = JSON.stringify(real) === JSON.stringify(esperado);
  if (bate) return console.log(`  ok     ${titulo}`);
  falhas++;
  console.log(`  FALHOU ${titulo}\n         esperava ${JSON.stringify(esperado)}\n         veio     ${JSON.stringify(real)}`);
}

const AGORA = new Date("2026-11-06T12:00:00Z");
const daquiA = (horas) => new Date(AGORA.getTime() + horas * 3600_000).toISOString();
const atras = (horas) => new Date(AGORA.getTime() - horas * 3600_000).toISOString();

let proximo = 0;
function conversa(modo, extra = {}) {
  proximo++;
  return {
    id: `c${proximo}`,
    canal: "whatsapp",
    contato: `559300000${proximo}`,
    telefone: `559300000${proximo}`,
    nome_contato: `Pessoa ${proximo}`,
    modo,
    score: 0,
    fila_desde: modo === "fila" ? atras(1) : null,
    assumida_em: modo === "humano" ? atras(1) : null,
    motivo_fila: null,
    atendente_id: null,
    ultima_em: atras(1),
    janela_expira_em: daquiA(20),
    ...extra,
  };
}

const monta = (conversas, opcoes) =>
  montarQuadro({ conversas, atendimentos: [], ultimas: [] }, AGORA, opcoes);

console.log("\nSepara as conversas pelo modo\n");
{
  const q = monta([conversa("fila"), conversa("humano"), conversa("ia"), conversa("ia")]);
  confere("uma na fila", q.precisa.length, 1);
  confere("uma em atendimento", q.atendendo.length, 1);
  confere("duas com a IA", q.ia.length, 2);
}

console.log("\nQuem espera há mais tempo vem primeiro\n");
{
  const q = monta([
    conversa("fila", { id: "nova", fila_desde: atras(1) }),
    conversa("fila", { id: "velha", fila_desde: atras(5) }),
  ]);
  confere("a mais antiga encabeça", q.precisa[0].id, "velha");
}

console.log("\nInstagram não tem janela de 24h\n");
{
  const q = monta([conversa("ia", { canal: "instagram", janela_expira_em: null })]);
  confere("sem janela, sem calor", q.ia[0].calor, null);
  confere("e não aparece como fechada", q.ia[0].janela_fechada, false);
}

console.log("\nO calor sobe conforme a janela fecha\n");
{
  const caso = (horas) => monta([conversa("ia", { janela_expira_em: daquiA(horas) })]).ia[0].calor;
  confere("faltando 20h, calor 1", caso(20), 1);
  confere("faltando 8h, calor 2", caso(8), 2);
  confere("faltando 4h, calor 3", caso(4), 3);
  confere("faltando 1h, calor 4", caso(1), 4);
}

console.log("\nJanela já vencida\n");
{
  const q = monta([conversa("ia", { janela_expira_em: atras(2) })]);
  confere("marca fechada", q.ia[0].janela_fechada, true);
  confere("e fica no calor máximo", q.ia[0].calor, 4);
}

console.log("\nSem nome, o cartão cai no contato\n");
{
  const q = monta([conversa("ia", { nome_contato: null, contato: "@fulano" })]);
  confere("mostra o @", q.ia[0].nome, "@fulano");
}
{
  const q = monta([conversa("ia", { nome_contato: "", contato: null, telefone: "5511999990000" })]);
  confere("nome vazio cai no telefone", q.ia[0].nome, "5511999990000");
}

console.log("\nColuna grande é cortada, e diz quanto cortou\n");
{
  const muitas = Array.from({ length: 120 }, () => conversa("ia"));
  const q = monta(muitas, { limite: 50 });
  confere("mostra 50", q.ia.length, 50);
  confere("e avisa que sobraram 70", q.truncado.ia, 70);
}
{
  const q = monta([conversa("ia")], { limite: 50 });
  confere("dentro do limite, não corta nada", q.truncado.ia, 0);
}

console.log("\nA prévia vem da última mensagem\n");
{
  const q = montarQuadro({
    conversas: [conversa("ia", { id: "c" })],
    atendimentos: [],
    ultimas: [{ conversa_id: "c", conteudo: [{ type: "text", text: "quanto custa a mentoria?" }] }],
  }, AGORA);
  confere("texto do bloco da Anthropic", q.ia[0].previa, "quanto custa a mentoria?");
}
{
  const q = montarQuadro({
    conversas: [conversa("ia", { id: "c" })],
    atendimentos: [],
    ultimas: [{ conversa_id: "c", conteudo: "oi, bom dia" }],
  }, AGORA);
  confere("conteúdo em texto puro", q.ia[0].previa, "oi, bom dia");
}
{
  const q = montarQuadro({
    conversas: [conversa("ia", { id: "c" })],
    atendimentos: [],
    ultimas: [{ conversa_id: "c", conteudo: [{ type: "tool_use", name: "consultar_horarios" }] }],
  }, AGORA);
  confere("sem bloco de texto, prévia vazia", q.ia[0].previa, "");
}

console.log("\nEncerrados viram histórico\n");
{
  const q = montarQuadro({
    conversas: [],
    atendimentos: [
      { id: "a1", conversa_id: "x", encerrada_em: atras(2), desfecho: "encerrado",
        conversas: { canal: "whatsapp", contato: "5593", nome_contato: "Ana" }, atendentes: { nome: "Lia" } },
    ],
    ultimas: [],
  }, AGORA);
  confere("um cartão no histórico", q.encerrado.length, 1);
  confere("com o nome de quem atendeu", q.encerrado[0].atendente, "Lia");
  confere("e o desfecho", q.encerrado[0].desfecho, "encerrado");
}


console.log("\nO total de cada coluna vem do banco, não do tamanho da lista\n");
{
  // Com o limite aplicado em SQL, a lista que chega já vem cortada. Se o
  // "quantos ficaram de fora" sair do tamanho dela, ele sempre dá zero e a
  // pessoa nunca descobre que existe mais gente esperando.
  const q = montarQuadro({
    conversas: [conversa("ia"), conversa("ia")],
    atendimentos: [],
    ultimas: [],
    totais: { precisa: 0, atendendo: 0, ia: 545 },
  }, AGORA, { limite: 50 });
  confere("mostra as duas que vieram", q.ia.length, 2);
  confere("e diz que 543 ficaram de fora", q.truncado.ia, 543);
}
{
  const q = montarQuadro({
    conversas: [conversa("fila")],
    atendimentos: [],
    ultimas: [],
    totais: { precisa: 1, atendendo: 0, ia: 0 },
  }, AGORA, { limite: 50 });
  confere("total igual ao que veio não corta nada", q.truncado.precisa, 0);
}

console.log("\nO cartão do encerrado guarda a conversa, não só o atendimento\n");
{
  // `id` é a linha de atendimentos. Quem quiser agir sobre a conversa precisa
  // de `conversa_id`: mandar o id do atendimento para a rota dá 404.
  const q = montarQuadro({
    conversas: [],
    atendimentos: [
      { id: "atendimento-1", conversa_id: "conversa-1", encerrada_em: atras(2),
        desfecho: "encerrado", conversas: { canal: "whatsapp", contato: "5593", nome_contato: "Ana" },
        atendentes: { nome: "Lia" } },
    ],
    ultimas: [],
  }, AGORA);
  confere("os dois ids são diferentes", q.encerrado[0].id !== q.encerrado[0].conversa_id, true);
  confere("e a conversa está lá", q.encerrado[0].conversa_id, "conversa-1");
}
// A rota, chamada direto no handler, sem subir servidor. O token é forjado com
// o mesmo segredo que o painel usa, então o porteiro é exercitado de verdade.
if (process.argv.includes("--rota")) {
  const { default: handler } = await import("../api/painel-fila.js");
  const { gerarToken } = await import("../api/_painel.js");
  const { db } = await import("../api/_db.js");

  const { data: cliente } = await db().from("clientes").select("id, nome").limit(1).maybeSingle();
  if (!cliente) throw new Error("Preciso de pelo menos um cliente no banco para exercitar a rota.");

  function resposta() {
    const r = { code: null, corpo: null };
    r.status = (c) => { r.code = c; return r; };
    r.json = (o) => { r.corpo = o; return r; };
    r.send = (o) => { r.corpo = o; return r; };
    return r;
  }

  const chamada = async (query, token) => {
    const res = resposta();
    await handler({ method: "GET", query, headers: { authorization: `Bearer ${token}` }, body: {} }, res);
    return res;
  };

  const comoOperador = gerarToken({ tipo: "operador", nome: "verificação" });
  const comoAtendente = gerarToken({ tipo: "atendente", cliente: "00000000-0000-0000-0000-000000000000" });

  console.log("\nA rota do quadro\n");
  {
    const r = await chamada({ rota: "quadro", cliente: cliente.id }, comoOperador);
    confere("responde 200", r.code, 200);
    confere("traz as quatro colunas",
      ["precisa", "atendendo", "ia", "encerrado"].every((k) => Array.isArray(r.corpo?.quadro?.[k])), true);
    confere("e o que ficou de fora", typeof r.corpo?.quadro?.truncado, "object");
  }

  console.log("\nA rota antiga continua igual, senão a tela Fila quebra\n");
  {
    const r = await chamada({ cliente: cliente.id }, comoOperador);
    confere("responde 200", r.code, 200);
    confere("traz esperando", Array.isArray(r.corpo?.esperando), true);
    confere("traz em_atendimento", Array.isArray(r.corpo?.em_atendimento), true);
    confere("traz encerrados", Array.isArray(r.corpo?.encerrados), true);
  }

  console.log("\nCliente de outro dono é barrado\n");
  {
    const r = await chamada({ rota: "quadro", cliente: cliente.id }, comoAtendente);
    confere("responde 403", r.code, 403);
  }
}

if (process.argv.includes("--real")) {
  const { carregarQuadro } = await import("../api/_quadro.js");
  const { db } = await import("../api/_db.js");
  const { data: cliente } = await db().from("clientes").select("id, nome").eq("nome", "Escola Exemplo").maybeSingle();
  if (!cliente) {
    console.log("\nEscola Exemplo não está no banco: pulando a leitura real.\n");
  } else {
    console.log(`\nLendo o quadro de verdade de ${cliente.nome}\n`);
    const comeco = Date.now();
    const dados = await carregarQuadro(cliente.id, 50);
    const q = montarQuadro(dados, new Date(), { limite: 50 });
    console.log(`  precisa de gente  ${q.precisa.length}  (de ${q.precisa.length + q.truncado.precisa})`);
    console.log(`  em atendimento    ${q.atendendo.length}  (de ${q.atendendo.length + q.truncado.atendendo})`);
    console.log(`  IA cuidando       ${q.ia.length}  (de ${q.ia.length + q.truncado.ia})`);
    console.log(`  encerrado 7 dias  ${q.encerrado.length}`);
    console.log(`\n  levou ${Date.now() - comeco}ms`);
  }
}

console.log(falhas ? `\n${falhas} falha(s).\n` : "\nTudo certo.\n");
process.exit(falhas ? 1 : 0);
