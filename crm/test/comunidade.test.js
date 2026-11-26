// Sinais da comunidade (Creators da Amazônia): membro, empresa e certificado.

import test from "node:test";
import assert from "node:assert/strict";

Object.assign(process.env, {
  SUPABASE_URL: "https://supabase.invalid",
  SUPABASE_SECRET_KEY: "chave-local-de-teste",
  COMUNIDADE_CHAVE: "chave-da-comunidade",
});

const { bancoDeMentira } = await import("./bancoMemoria.js");
const { processarComunidade } = await import("../api/_comunidade.js");
const { usarBanco } = await import("../api/_db.js");
const { default: rota } = await import("../api/comunidade.js");

const EMP = "cli";

function mundo() {
  return bancoDeMentira({
    clientes: [{ id: EMP, slug: "ousadia", ativo: true }],
    crm_funis: [
      { id: "f-alunos", cliente_id: EMP, nome: "Alunos", ativo: true, entrada_automatica: true, ordem: 0 },
      { id: "f-agencia", cliente_id: EMP, nome: "Agência", ativo: true, entrada_automatica: false, ordem: 1 },
    ],
    crm_etapas: [
      { id: "e-al", cliente_id: EMP, funil_id: "f-alunos", nome: "Novo lead", tipo: "aberta", ordem: 0 },
      { id: "e-ag", cliente_id: EMP, funil_id: "f-agencia", nome: "Novo contato", tipo: "aberta", ordem: 0 },
    ],
    crm_origens: [{ id: "o-com", cliente_id: EMP, chave: "comunidade" }],
    contatos: [], comunidade_membros: [], comunidade_eventos: [], crm_negocios: [], crm_notas: [],
    crm_historico: [], crm_automacoes: [], tarefas_sistema: [],
  }, { unicos: { comunidade_membros: [["cliente_id", "user_id"]], contatos: [["cliente_id", "telefone_e164"]] } });
}

const evento = (sb, corpo) => {
  const ev = { id: `ev-${sb.tabelas.comunidade_eventos.length + 1}`, cliente_id: EMP, estado: "recebido", bruto: corpo };
  sb.tabelas.comunidade_eventos.push(ev);
  return ev.id;
};

const MEMBRO = { type: "INSERT", table: "users", record: {
  id: "u1", email: "Bia@Empresa.com", full_name: "Bia Lima", phone_whatsapp: "(93) 99999-1234",
} };

test("membro novo vira contato com a etiqueta comunidade, e fica na memória", async () => {
  const sb = mundo();
  await processarComunidade(sb, evento(sb, MEMBRO));
  const [c] = sb.tabelas.contatos;
  assert.equal(c.telefone_e164, "+5593999991234");
  assert.deepEqual(c.etiquetas, ["comunidade"]);
  assert.equal(c.origem_id, "o-com");
  assert.equal(sb.tabelas.comunidade_membros[0].email, "bia@empresa.com");
});

test("empresa cadastrada vira lead no funil da agência, com o contato do membro", async () => {
  const sb = mundo();
  await processarComunidade(sb, evento(sb, MEMBRO));
  await processarComunidade(sb, evento(sb, { type: "INSERT", table: "company_profiles", record: {
    user_id: "u1", company_name: "Açaí do Xingu", sector_niche: "Alimentação", city: "Altamira", state_uf: "PA",
    instagram_handle: "@acaidoxingu",
  } }));
  const [n] = sb.tabelas.crm_negocios;
  assert.equal(n.funil_id, "f-agencia");
  assert.equal(n.titulo, "Açaí do Xingu");
  assert.equal(n.telefone, "+5593999991234");
  assert.match(sb.tabelas.crm_notas[0].texto, /Setor: Alimentação/);
});

test("certificado de curso grátis vira lead quente no funil de entrada; o segundo soma score", async () => {
  const sb = mundo();
  await processarComunidade(sb, evento(sb, MEMBRO));
  const cert = (curso) => ({ type: "INSERT", table: "certificates", record: { user_id: "u1", course_title: curso, score: 90 } });
  await processarComunidade(sb, evento(sb, cert("Canva para Creators")));
  await processarComunidade(sb, evento(sb, cert("Captação de Clientes")));

  assert.equal(sb.tabelas.crm_negocios.length, 1, "o segundo certificado não duplica o negócio");
  const [n] = sb.tabelas.crm_negocios;
  assert.equal(n.funil_id, "f-alunos");
  assert.equal(n.score, 40);
  assert.ok(n.etiquetas.includes("concluiu: canva para creators") && n.etiquetas.includes("concluiu: captação de clientes"));
});

test("certificado de quem o CRM não conhece fica guardado como ignorado", async () => {
  const sb = mundo();
  await processarComunidade(sb, evento(sb, { type: "INSERT", table: "certificates", record: { user_id: "u9", course_title: "X" } }));
  assert.equal(sb.tabelas.comunidade_eventos[0].estado, "ignorado");
  assert.equal(sb.tabelas.crm_negocios.length, 0);
});

test("a rota exige a chave, aceita no cabeçalho e não guarda tabela que não interessa", async (t) => {
  const sb = mundo();
  usarBanco(sb);
  t.after(() => usarBanco(null));
  const pedido = (headers, body) => {
    const req = { method: "POST", query: {}, headers, body };
    const res = { code: 200, body: null, status(c) { this.code = c; return this; }, json(b) { this.body = b; return this; } };
    return { req, res };
  };

  const sem = pedido({}, MEMBRO);
  await rota(sem.req, sem.res);
  assert.equal(sem.res.code, 401);

  const outra = pedido({ "x-ousadia-chave": "chave-da-comunidade" }, { type: "INSERT", table: "forum_posts", record: {} });
  await rota(outra.req, outra.res);
  assert.equal(sb.tabelas.comunidade_eventos.length, 0);

  const ok = pedido({ "x-ousadia-chave": "chave-da-comunidade" }, MEMBRO);
  await rota(ok.req, ok.res);
  assert.equal(ok.res.code, 200);
  assert.equal(sb.tabelas.comunidade_eventos.length, 1);
  assert.equal(sb.tabelas.tarefas_sistema[0].tipo, "processar-comunidade");
});
