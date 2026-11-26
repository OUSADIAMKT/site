// Mede se as respostas públicas a comentário variam de verdade.
//
//   node --env-file=.env scripts/testar-comentarios.js <slug> [quantas]
//
// Simula a mesma pessoa comentando a mesma coisa várias vezes, que é o pior
// caso real: num post que vai bem, metade dos comentários é "eu quero".
//
// Não grava nada no banco: só mostra o que sairia e quanto repetiu.

import { carregarTenantPorSlug } from "../api/_db.js";
import { responderComentario } from "../api/_agente.js";

const slug = process.argv[2];
const quantas = Math.min(Math.max(2, Number(process.argv[3]) || 8), 20);

if (!slug) {
  console.error("Uso: node --env-file=.env scripts/testar-comentarios.js <slug> [quantas]");
  process.exit(1);
}

const tenant = await carregarTenantPorSlug(slug);
if (!tenant) {
  console.error(`\nCliente "${slug}" não encontrado ou inativo.\n`);
  process.exit(1);
}

const COMENTARIOS = ["eu quero", "quero", "info", "eu", "como faço", "quero sim", "manda", "tenho interesse"];

const ctx = {
  cliente: tenant.cliente,
  config: tenant.config,
  midias: tenant.midias,
  profissionais: tenant.profissionais,
  links: tenant.links,
  conversa: null,
};

// Normaliza para comparar: sem acento, sem pontuação, minúsculo.
const chave = (t) => t.normalize("NFD").replace(/[̀-ͯ]/g, "")
  .toLowerCase().replace(/[^a-z0-9 ]/g, "").replace(/\s+/g, " ").trim();

console.log(`\n  ${tenant.cliente.nome} · ${quantas} comentários seguidos\n`);

const ditas = [];
for (let i = 0; i < quantas; i++) {
  const comentario = COMENTARIOS[i % COMENTARIOS.length];
  const { publico, privado } = await responderComentario(ctx, comentario, ditas);
  if (!publico) { console.log(`  "${comentario}" → (nada)\n`); continue; }
  ditas.push(publico);
  console.log(`  "${comentario}"`);
  console.log(`    público: ${publico}`);
  console.log(`    DM:      ${privado.slice(0, 90)}${privado.length > 90 ? "…" : ""}\n`);
}

// Repetição literal é a que o Instagram pega. Primeira palavra igual em
// sequência é o segundo padrão mais visível para quem lê os comentários.
const unicas = new Set(ditas.map(chave));
const primeiras = ditas.map((t) => chave(t).split(" ")[0]);
const repetiuPrimeira = primeiras.filter((p, i) => i > 0 && p === primeiras[i - 1]).length;

console.log("  " + "-".repeat(50));
console.log(`  respostas geradas:     ${ditas.length}`);
console.log(`  textos distintos:      ${unicas.size}${unicas.size < ditas.length ? "  ← repetiu" : ""}`);
console.log(`  começos iguais em fila: ${repetiuPrimeira}${repetiuPrimeira ? "  ← padrão visível" : ""}`);
console.log(`  palavras por resposta:  ${Math.round(ditas.reduce((s, t) => s + t.split(/\s+/).length, 0) / ditas.length)} na média (limite 12)`);

const longas = ditas.filter((t) => t.split(/\s+/).length > 12);
if (longas.length) console.log(`  ACIMA DE 12 PALAVRAS:   ${longas.length}`);
console.log("");

process.exit(unicas.size === ditas.length && !repetiuPrimeira ? 0 : 1);
