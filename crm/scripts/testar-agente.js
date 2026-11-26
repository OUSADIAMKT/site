// Conversa com o agente pelo terminal, sem WhatsApp nenhum.
// É aqui que se ajusta persona, contexto e regras antes de subir pra Meta.
//
//   node scripts/testar-agente.js <slug-do-cliente>
//
// Precisa de ANTHROPIC_API_KEY, SUPABASE_URL e SUPABASE_SECRET_KEY no ambiente.

import readline from "node:readline/promises";
import { stdin, stdout } from "node:process";
import { db, carregarTenantPorSlug, abrirConversa, lerHistorico, gravarMensagem } from "../api/_db.js";
import { responder, calcularCusto } from "../api/_agente.js";
import { abrirCanal } from "../api/_canal.js";

const slug = process.argv[2];
if (!slug) {
  console.error("Uso: node scripts/testar-agente.js <slug-do-cliente>");
  process.exit(1);
}

const { data: cli, error: erroCli } = await db()
  .from("clientes").select("slug").eq("slug", slug).maybeSingle();

if (erroCli) {
  console.error(`\nFalha ao consultar o banco: ${erroCli.message}`);
  console.error("Confira SUPABASE_URL (sem /rest/v1/) e se a chave é a service_role / secret.\n");
  process.exit(1);
}

if (!cli) {
  // Diferencia "seed não rodou" de "slug digitado errado": mostra o que existe.
  const { data: todos } = await db().from("clientes").select("slug, nome");
  console.error(`\nCliente "${slug}" não encontrado.`);
  if (!todos?.length) {
    console.error("A tabela `clientes` está vazia. Crie um cliente pelo painel, ou pela etapa `banco` do instalador.\n");
  } else {
    console.error("Slugs cadastrados: " + todos.map((c) => c.slug).join(", ") + "\n");
  }
  process.exit(1);
}

const tenant = await carregarTenantPorSlug(slug);
if (!tenant) {
  console.error(`\nO cliente "${slug}" existe mas está inativo. Ative em clientes.ativo.\n`);
  process.exit(1);
}
const telefone = `teste-${slug}`;
const conversa = await abrirConversa({
  clienteId: tenant.cliente.id,
  canal: "whatsapp",
  contato: telefone,
  nomeContato: "Teste local",
});

console.log(`\n  ${tenant.cliente.nome} · modo teste`);
console.log(
  `  ${tenant.midias.length} mídia(s), ${tenant.links.length} link(s). Ctrl+C para sair.\n`);

// O canal de teste imprime no terminal em vez de entregar na Meta. O resto do
// código é exatamente o mesmo que roda em produção, inclusive as ferramentas.
const ctx = {
  cliente: tenant.cliente,
  config: tenant.config,
  midias: tenant.midias,
  profissionais: tenant.profissionais,
  links: tenant.links,
  conversa,
  canal: abrirCanal({ canal: "teste" }),
  telefone,
  enviouAlgo: false,
  transferiu: false,
  modoTeste: true,
};

const terminal = readline.createInterface({ input: stdin, output: stdout });

while (true) {
  // `question` devolve undefined quando a entrada acaba. Acontece sempre que o
  // script é alimentado por pipe, que é como se testa um roteiro inteiro de uma
  // vez em vez de digitar à mão.
  const linha = await terminal.question("você  ").catch(() => null);
  if (linha == null) { terminal.close(); break; }
  const entrada = linha.trim();
  if (!entrada) continue;

  const historico = await lerHistorico(conversa.id);
  const inicio = Date.now();
  const r = await responder(ctx, historico, entrada);

  for (const m of r.historicoNovo) await gravarMensagem(conversa.id, m.role, m.content, null);

  if (r.texto) await ctx.canal.emBaloes(r.texto);
  if (r.transferiu) console.log("      ⟶ transferido para humano");

  const { data: gasto } = await db()
    .from("uso").select("modelo, custo_usd")
    .eq("conversa_id", conversa.id).order("criado_em", { ascending: false }).limit(1).maybeSingle();

  if (gasto) {
    const brl = (Number(gasto.custo_usd) * 5.2).toFixed(4);
    console.log(`      [${gasto.modelo} · ${Date.now() - inicio}ms · R$ ${brl}]\n`);
  } else {
    console.log("");
  }
}
