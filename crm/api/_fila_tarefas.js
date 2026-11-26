// A fila de tarefas do sistema: o "relógio" do CRM.
//
// Na origem isto não existia (o plano grátis da Vercel não tinha cron de hora
// em hora), e por isso três gatilhos de automação apareciam na tela sem nunca
// disparar, e conversa esquecida na mão de alguém só voltava para a IA quando
// alguém abria o painel. Na VPS o processo não morre, então o próprio servidor
// dá uma volta por minuto:
//
//   1. agenda as tarefas periódicas, cada uma com uma `chave` da sua janela de
//      tempo (duas voltas no mesmo minuto não duplicam nada);
//   2. pega o que venceu com `pegar_tarefas` (skip locked: nunca a mesma
//      linha em dois lugares);
//   3. executa, e marca feita ou reagenda com espera crescente.
//
// Tarefa nova de qualquer parte do código entra com `agendar()`.

import { db } from "./_db.js";
import { dispararGatilho } from "./_comercial.js";
import { soltarInativas } from "./_fila.js";

const MINUTO = 60_000;
const DIA = 24 * 60 * MINUTO;

const estado = { ligada: false, ultimaVolta: null, rodando: false, temporizador: null };

/** Para a rota /api/saude. */
export function estadoDaFila() {
  return { ligada: estado.ligada, ultimaVolta: estado.ultimaVolta };
}

/**
 * Põe uma tarefa na fila. Com `chave`, é idempotente: a segunda tentativa com
 * a mesma chave é ignorada em silêncio.
 */
export async function agendar(sb, { tipo, carga = {}, executarEm = null, chave = null, clienteId = null, maxTentativas = 5 }) {
  const linha = {
    tipo,
    carga,
    cliente_id: clienteId,
    executar_em: (executarEm ? new Date(executarEm) : new Date()).toISOString(),
    chave,
    max_tentativas: maxTentativas,
  };
  const q = chave
    ? sb.from("tarefas_sistema").upsert(linha, { onConflict: "chave", ignoreDuplicates: true })
    : sb.from("tarefas_sistema").insert(linha);
  const { error } = await q;
  if (error) throw new Error(`agendar ${tipo}: ${error.message}`);
}

// ---------------------------------------------------------------------------
// O que é periódico

/** Hora e data de Brasília, sem depender do fuso da máquina. */
function brasilia(agora) {
  const p = Object.fromEntries(new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", hour12: false,
  }).formatToParts(agora).map((x) => [x.type, x.value]));
  return { data: `${p.year}-${p.month}-${p.day}`, hora: Number(p.hour) % 24 };
}

function janela(agora, minutos) {
  const t = Math.floor(agora.getTime() / (minutos * MINUTO)) * minutos * MINUTO;
  return new Date(t).toISOString().slice(0, 16);
}

export function periodicas(agora = new Date()) {
  const { data, hora } = brasilia(agora);
  const lista = [
    { tipo: "varrer-automacoes", chave: `varrer-automacoes:${janela(agora, 5)}` },
    { tipo: "soltar-inativas", chave: `soltar-inativas:${janela(agora, 15)}` },
    { tipo: "limpar-fila", chave: `limpar-fila:${data}` },
  ];
  // A coleta de anúncios da Meta, uma vez por dia, a partir das 9h.
  if (hora >= 9) lista.push({ tipo: "coleta-meta", chave: `coleta-meta:${data}`, maxTentativas: 3 });
  return lista;
}

// ---------------------------------------------------------------------------
// As tarefas

async function clientesAtivos(sb) {
  const { data, error } = await sb.from("clientes").select("id").eq("ativo", true);
  if (error) throw new Error(error.message);
  return (data || []).map((c) => c.id);
}

async function automacoesDo(sb, clienteId, gatilho) {
  const { data } = await sb.from("crm_automacoes").select("id, condicoes")
    .eq("cliente_id", clienteId).eq("gatilho", gatilho).eq("ativo", true);
  return data || [];
}

/**
 * Os três gatilhos de relógio. Cada disparo leva uma `marca` do fato (não do
 * relógio), e o índice único de `crm_automacao_execucoes` recusa a repetição:
 * varrer de novo a mesma janela não executa nada duas vezes.
 */
export async function varrerAutomacoes(sb, agora = new Date()) {
  const feitos = { contato_novo: 0, sem_interacao: 0, tarefa_vencida: 0 };

  for (const clienteId of await clientesAtivos(sb)) {
    // contato_novo: contatos criados no último dia.
    if ((await automacoesDo(sb, clienteId, "contato_novo")).length) {
      const { data: novos } = await sb.from("contatos")
        .select("id, responsavel_id, score")
        .eq("cliente_id", clienteId).gte("criado_em", new Date(agora - DIA).toISOString()).limit(500);
      for (const c of novos || []) {
        await dispararGatilho(sb, clienteId, "contato_novo", {
          alvo_id: c.id, contato_id: c.id, responsavel_id: c.responsavel_id || null,
          score: c.score || 0, marca: "novo",
        });
        feitos.contato_novo += 1;
      }
    }

    // sem_interacao: negócio aberto parado há N dias (N por automação,
    // padrão 3). A marca é o `atualizado_em`: mexeu no negócio, conta de novo.
    const semInteracao = await automacoesDo(sb, clienteId, "sem_interacao");
    if (semInteracao.length) {
      const minimo = Math.min(...semInteracao.map((a) => Number(a.condicoes?.dias_sem_interacao) || 3));
      const { data: parados } = await sb.from("crm_negocios")
        .select("id, contato_id, responsavel_id, funil_id, etapa_id, score, prioridade, atualizado_em")
        .eq("cliente_id", clienteId).eq("situacao", "aberto")
        .lt("atualizado_em", new Date(agora - minimo * DIA).toISOString()).limit(500);
      for (const n of parados || []) {
        const dias = Math.floor((agora - new Date(n.atualizado_em)) / DIA);
        await dispararGatilho(sb, clienteId, "sem_interacao", {
          alvo_id: n.id, negocio_id: n.id, contato_id: n.contato_id || null,
          responsavel_id: n.responsavel_id || null, funil_id: n.funil_id, etapa_id: n.etapa_id,
          score: n.score || 0, prioridade: n.prioridade, dias_sem_interacao: dias,
          marca: n.atualizado_em,
        });
        feitos.sem_interacao += 1;
      }
    }

    // tarefa_vencida: tarefa aberta que venceu na última semana. Mais velha
    // que isso já foi vista, e disparar agora seria spam de automação.
    if ((await automacoesDo(sb, clienteId, "tarefa_vencida")).length) {
      const { data: vencidas } = await sb.from("crm_tarefas")
        .select("id, negocio_id, contato_id, responsavel_id, vence_em")
        .eq("cliente_id", clienteId).is("concluida_em", null)
        .lt("vence_em", agora.toISOString()).gte("vence_em", new Date(agora - 7 * DIA).toISOString())
        .limit(500);
      for (const t of vencidas || []) {
        await dispararGatilho(sb, clienteId, "tarefa_vencida", {
          alvo_id: t.id, tarefa_id: t.id, negocio_id: t.negocio_id || null,
          contato_id: t.contato_id || null, responsavel_id: t.responsavel_id || null,
          marca: t.vence_em,
        });
        feitos.tarefa_vencida += 1;
      }
    }
  }
  return feitos;
}

async function soltarTodas(sb) {
  let soltas = 0;
  for (const clienteId of await clientesAtivos(sb)) {
    soltas += Number(await soltarInativas(clienteId)) || 0;
  }
  return { soltas };
}

/** A coleta da Meta é a mesma rota que o cron chamava, pelo próprio servidor. */
async function coletaMeta() {
  const segredo = process.env.CRON_SECRET;
  if (!segredo) return { pulada: "sem CRON_SECRET" };
  const porta = process.env.PORTA || 3100;
  const r = await fetch(`http://127.0.0.1:${porta}/api/report-coletar`, {
    headers: { Authorization: `Bearer ${segredo}` },
    signal: AbortSignal.timeout(5 * MINUTO),
  });
  const corpo = await r.json().catch(() => ({}));
  // Sem conta da Meta conectada não é falha: é módulo ainda não usado.
  if (!r.ok && /token|conex|conect/i.test(corpo.error || "")) return { pulada: corpo.error };
  if (!r.ok) throw new Error(corpo.error || `coleta respondeu ${r.status}`);
  return corpo;
}

async function limparFila(sb, agora = new Date()) {
  const { error } = await sb.from("tarefas_sistema").delete()
    .eq("estado", "feita").lt("feito_em", new Date(agora - 30 * DIA).toISOString());
  if (error) throw new Error(error.message);
  return { ok: true };
}

/** Quem executa cada tipo. Outros módulos acrescentam aqui. */
export const EXECUTORES = {
  "varrer-automacoes": (sb) => varrerAutomacoes(sb),
  "soltar-inativas": (sb) => soltarTodas(sb),
  "coleta-meta": () => coletaMeta(),
  "limpar-fila": (sb) => limparFila(sb),
};

export function registrarExecutor(tipo, fn) {
  EXECUTORES[tipo] = fn;
}

// ---------------------------------------------------------------------------
// A volta

/** Espera antes da próxima tentativa: 1, 2, 4, 8... minutos, até 1 hora. */
export function espera(tentativas) {
  return Math.min(60, 2 ** Math.max(0, tentativas - 1)) * MINUTO;
}

export async function rodarVolta(sb = db(), agora = new Date()) {
  for (const p of periodicas(agora)) await agendar(sb, p);

  const { data: tarefas, error } = await sb.rpc("pegar_tarefas", { p_limite: 10 });
  if (error) throw new Error(`pegar_tarefas: ${error.message}`);

  const relatorio = [];
  for (const t of tarefas || []) {
    const executor = EXECUTORES[t.tipo];
    try {
      if (!executor) throw new Error(`tipo de tarefa desconhecido: ${t.tipo}`);
      const resultado = await executor(sb, t.carga || {}, t);
      await sb.from("tarefas_sistema").update({
        estado: "feita", feito_em: new Date().toISOString(), erro: null, resultado: resultado ?? null,
      }).eq("id", t.id);
      relatorio.push({ id: t.id, tipo: t.tipo, ok: true });
    } catch (e) {
      const desistiu = t.tentativas >= t.max_tentativas;
      await sb.from("tarefas_sistema").update({
        estado: desistiu ? "falhou" : "pendente",
        erro: String(e?.message || e).slice(0, 500),
        executar_em: new Date(Date.now() + espera(t.tentativas)).toISOString(),
      }).eq("id", t.id);
      console.error(`[fila] ${t.tipo} #${t.id} (tentativa ${t.tentativas}):`, e?.message || e);
      relatorio.push({ id: t.id, tipo: t.tipo, ok: false });
    }
  }
  return relatorio;
}

/** Liga o relógio. Chamado uma vez pelo servidor.js. */
export function ligarFila({ intervaloMs = MINUTO } = {}) {
  if (estado.ligada) return;
  estado.ligada = true;
  const volta = async () => {
    if (estado.rodando) return; // volta anterior ainda trabalhando
    estado.rodando = true;
    try {
      await rodarVolta();
      estado.ultimaVolta = Date.now();
    } catch (e) {
      console.error("[fila] volta:", e?.message || e);
    } finally {
      estado.rodando = false;
    }
  };
  estado.temporizador = setInterval(volta, intervaloMs);
  setTimeout(volta, 5000);
}
