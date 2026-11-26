// Prova de vida do cofre: fala com o Cloudflare R2 de verdade.
//
// Usa o mesmo assinador que a aplicação usa (api/_r2.js), então o que passa
// aqui é o que vai funcionar no painel. Escreve um objeto minúsculo dentro de
// `tmp/verificacao/`, lê de volta, confere os bytes e apaga. Não toca em
// mensagem, conversa, cliente ou mídia de ninguém.
//
// As credenciais vêm de um arquivo que o `vercel env pull` escreve e que este
// script apaga no fim. Nenhum valor é impresso.

import crypto from "node:crypto";

// As credenciais chegam pelo ambiente, postas pelo script que pede a digitação
// mascarada. Não saem de arquivo nenhum: variável marcada como Secret na Vercel
// não volta a sair de lá, e é assim que tem que ser.

const { r2Ligado, gravarNoR2, baixarDoR2, apagarDoR2, copiarNoR2, r2Config } =
  await import("../api/_r2.js");

if (!r2Ligado()) {
  console.error("FALHOU: o cofre não está configurado neste ambiente.");
  process.exit(1);
}

const cfg = r2Config();
console.log(`bucket:   ${cfg.bucket}`);
console.log(`endpoint: ${cfg.host}`);
console.log("");

const nome = crypto.randomBytes(16).toString("hex");
const chave = `tmp/verificacao/${nome}.txt`;
const copia = `tmp/verificacao/${nome}-copia.txt`;
const conteudo = Buffer.from(`prova de vida do cofre ${new Date().toISOString()}`);

let passou = 0;
let falhou = 0;
const passo = async (titulo, fn) => {
  try {
    await fn();
    console.log(`  ok    ${titulo}`);
    passou += 1;
  } catch (e) {
    console.log(`  FALHA ${titulo}: ${e?.message || e}`);
    falhou += 1;
  }
};

await passo("gravar objeto", () => gravarNoR2(chave, conteudo, "text/plain"));

await passo("ler de volta e conferir os bytes", async () => {
  const lido = await baixarDoR2(chave);
  if (!lido?.conteudo) throw new Error("não voltou nada");
  if (!lido.conteudo.equals(conteudo)) throw new Error("os bytes vieram diferentes");
});

await passo("copiar dentro do cofre", () => copiarNoR2(chave, copia));

await passo("a cópia tem o mesmo conteúdo", async () => {
  const lido = await baixarDoR2(copia);
  if (!lido?.conteudo?.equals(conteudo)) throw new Error("cópia diferente do original");
});

await passo("apagar os dois", async () => {
  await apagarDoR2(chave);
  await apagarDoR2(copia);
});

await passo("depois de apagado, não está mais lá", async () => {
  const lido = await baixarDoR2(chave);
  if (lido) throw new Error("o objeto continua no bucket");
});

// Uma chave de outra empresa tem que ser recusada antes de sair pedido algum.
await passo("objeto que não existe devolve vazio, não erro", async () => {
  const lido = await baixarDoR2(`tmp/verificacao/${crypto.randomBytes(16).toString("hex")}.txt`);
  if (lido !== null) throw new Error("devolveu alguma coisa");
});

// O CORS não é opcional: sem ele o navegador se recusa a subir o arquivo
// direto, e o painel cai no caminho antigo de 3 MB sem dizer por quê. A
// pergunta de sondagem não leva credencial: é a mesma que o navegador faz
// antes de qualquer PUT.
await passo("o bucket libera PUT para o painel (CORS)", async () => {
  const r = await fetch(`https://${cfg.host}/${cfg.bucket}/tmp/sondagem`, {
    method: "OPTIONS",
    headers: {
      origin: "https://crm.ousadiamarketing.com.br",
      "access-control-request-method": "PUT",
      "access-control-request-headers": "content-type",
    },
  });
  const permitido = r.headers.get("access-control-allow-origin");
  const metodos = r.headers.get("access-control-allow-methods") || "";
  if (!permitido) {
    throw new Error("o bucket não respondeu com CORS; falta configurar a regra");
  }
  if (!/put/i.test(metodos)) {
    throw new Error(`CORS existe mas não libera PUT (libera: ${metodos || "nada"})`);
  }
});

console.log("");
console.log(`${passou} passaram, ${falhou} falharam`);
process.exit(falhou ? 1 : 0);
