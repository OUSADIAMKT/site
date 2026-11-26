// O relógio do CRM. Os três gatilhos de tempo existiam na tela e nunca
// disparavam; agora a fila os dispara. O que importa provar: dispara, não
// dispara duas vezes o mesmo fato, e falha sem derrubar a volta.

import test from "node:test";
import assert from "node:assert/strict";

Object.assign(process.env, {
  SUPABASE_URL: "https://supabase.invalid",
  SUPABASE_SECRET_KEY: "chave-local-de-teste",
});

const { bancoDeMentira } = await import("./bancoMemoria.js");
const { periodicas, espera, varrerAutomacoes, rodarVolta, registrarExecutor, agendar } =
  await import("../api/_fila_tarefas.js");

const EMP = "cli-1";
const DIA = 86400000;
const AGORA = new Date("2026-12-01T15:00:00Z"); // 12h em Brasília

function pegarTarefas(tabelas, { p_limite }) {
  const agora = new Date().toISOString();
  const prontas = (tabelas.tarefas_sistema || [])
    // `estado` e `tentativas` têm valor padrão no banco; o dublê não tem.
    .filter((t) => (t.estado ?? "pendente") === "pendente" && t.executar_em <= agora)
    .slice(0, p_limite);
  for (const t of prontas) {
    t.estado = "rodando"; t.tentativas = (t.tentativas || 0) + 1; t.max_tentativas ??= 5;
  }
  return prontas.map((t) => ({ ...t }));
}

function mundo(extra = {}) {
  return bancoDeMentira({
    clientes: [{ id: EMP, ativo: true }],
    crm_automacoes: [], crm_automacao_execucoes: [], crm_tarefas: [], crm_notas: [],
    crm_negocios: [], contatos: [], tarefas_sistema: [],
    ...extra,
  }, {
    unicos: { crm_automacao_execucoes: [["automacao_id", "chave"]], tarefas_sistema: [["chave"]] },
    rpc: { pegar_tarefas: pegarTarefas },
  });
}

const automacao = (gatilho, condicoes = {}) => ({
  id: `a-${gatilho}`, cliente_id: EMP, nome: `quando ${gatilho}`, gatilho, condicoes, ativo: true,
  acoes: [{ tipo: "criar_tarefa", titulo: `follow-up ${gatilho}` }],
});

test("as periódicas têm chave por janela: duas voltas no mesmo minuto não duplicam", () => {
  const a = periodicas(AGORA).map((p) => p.chave);
  const b = periodicas(new Date(AGORA.getTime() + 20_000)).map((p) => p.chave);
  assert.deepEqual(a, b);
  assert.ok(a.some((c) => c.startsWith("coleta-meta:2026-12-01")), "depois das 9h de Brasília entra a coleta");
  const cedo = periodicas(new Date("2026-12-01T10:00:00Z")).map((p) => p.tipo); // 7h em Brasília
  assert.ok(!cedo.includes("coleta-meta"));
});

test("a espera cresce e para em uma hora", () => {
  assert.equal(espera(1), 60_000);
  assert.equal(espera(3), 4 * 60_000);
  assert.equal(espera(20), 60 * 60_000);
});

test("negócio parado dispara sem_interacao uma vez só, respeitando os dias da automação", async () => {
  const sb = mundo({
    crm_automacoes: [automacao("sem_interacao", { dias_sem_interacao: "5" })],
    crm_negocios: [
      { id: "n-velho", cliente_id: EMP, situacao: "aberto", atualizado_em: new Date(AGORA - 6 * DIA).toISOString(), responsavel_id: "juh" },
      { id: "n-quase", cliente_id: EMP, situacao: "aberto", atualizado_em: new Date(AGORA - 4 * DIA).toISOString() },
      { id: "n-ganho", cliente_id: EMP, situacao: "ganho", atualizado_em: new Date(AGORA - 30 * DIA).toISOString() },
    ],
  });

  await varrerAutomacoes(sb, AGORA);
  await varrerAutomacoes(sb, AGORA); // a mesma janela de novo

  assert.equal(sb.tabelas.crm_tarefas.length, 1, "só o parado há 6 dias, e só uma vez");
  assert.equal(sb.tabelas.crm_tarefas[0].negocio_id, "n-velho");
  assert.equal(sb.tabelas.crm_tarefas[0].responsavel_id, "juh", "o follow-up vai para o dono do negócio");
});

test("tarefa vencida e contato novo também disparam", async () => {
  const sb = mundo({
    crm_automacoes: [automacao("tarefa_vencida"), automacao("contato_novo")],
    crm_negocios: [{ id: "n1", cliente_id: EMP }, { id: "n2", cliente_id: EMP }],
    crm_tarefas: [
      { id: "t1", cliente_id: EMP, negocio_id: "n1", concluida_em: null, vence_em: new Date(AGORA - DIA).toISOString() },
      { id: "t-antiga", cliente_id: EMP, negocio_id: "n2", concluida_em: null, vence_em: new Date(AGORA - 30 * DIA).toISOString() },
    ],
    contatos: [{ id: "c1", cliente_id: EMP, criado_em: new Date(AGORA - 3600_000).toISOString() }],
  });

  const r = await varrerAutomacoes(sb, AGORA);
  assert.equal(r.tarefa_vencida, 1, "a de 30 dias atrás não entra");
  assert.equal(r.contato_novo, 1);
  const titulos = sb.tabelas.crm_tarefas.map((t) => t.titulo).filter((x) => x?.startsWith("follow-up"));
  assert.deepEqual(titulos.sort(), ["follow-up contato_novo", "follow-up tarefa_vencida"]);
});

test("sem automação do gatilho, a varredura nem consulta os dados", async () => {
  const sb = mundo({ crm_negocios: [{ id: "n", cliente_id: EMP, situacao: "aberto", atualizado_em: "2020-01-01T00:00:00Z" }] });
  const r = await varrerAutomacoes(sb, AGORA);
  assert.deepEqual(r, { contato_novo: 0, sem_interacao: 0, tarefa_vencida: 0 });
});

test("a volta executa, marca feita, e uma falha é reagendada sem parar as outras", async () => {
  const sb = mundo();
  let chamadas = 0;
  registrarExecutor("teste-ok", async () => { chamadas += 1; return { ok: true }; });
  registrarExecutor("teste-quebra", async () => { throw new Error("fora do ar"); });
  // As periódicas também entram, então os executores delas precisam de dados.
  await agendar(sb, { tipo: "teste-quebra", chave: "q1" });
  await agendar(sb, { tipo: "teste-ok", chave: "k1" });
  await agendar(sb, { tipo: "teste-ok", chave: "k1" }); // repetida: ignorada

  await rodarVolta(sb, new Date());

  const porChave = Object.fromEntries(sb.tabelas.tarefas_sistema.map((t) => [t.chave, t]));
  assert.equal(chamadas, 1);
  assert.equal(porChave.k1.estado, "feita");
  assert.equal(porChave.q1.estado, "pendente", "volta para a fila");
  assert.match(porChave.q1.erro, /fora do ar/);
  assert.ok(porChave.q1.executar_em > new Date().toISOString(), "com espera antes da próxima tentativa");
  assert.ok(sb.tabelas.tarefas_sistema.some((t) => t.tipo === "varrer-automacoes"), "as periódicas foram agendadas");
});
