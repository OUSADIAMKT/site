// Envia um arquivo de backup (já cifrado) para o Cloudflare R2.
//
// Uso (o backup.sh chama sozinho):
//   node --env-file=/etc/ousadia-crm.env scripts/enviar-backup.js /var/backups/crm/crm-2026-12-01.dump.age
//
// Recusa arquivo que não termina em .age: backup do banco sai da máquina só
// cifrado. A chave privada que abre o arquivo NÃO fica na VPS (README,
// seção Backup).
//
// No R2 ele vai para backups/crm/<nome>. Quanto tempo fica lá é regra do
// próprio bucket (Cloudflare > R2 > bucket > Settings > Object lifecycle
// rules: apagar "backups/" depois de 30 dias).

import { readFile, stat } from "node:fs/promises";
import { basename } from "node:path";
import { gravarNoR2, r2Ligado } from "../api/_r2.js";

const arquivo = process.argv[2];
if (!arquivo) {
  console.error("Uso: node scripts/enviar-backup.js <arquivo.age>");
  process.exit(1);
}
if (!arquivo.endsWith(".age")) {
  console.error("Recusado: só sai da máquina backup cifrado (.age).");
  process.exit(1);
}
if (!r2Ligado()) {
  console.error("R2 não configurado (R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET).");
  process.exit(1);
}

const info = await stat(arquivo);
const chave = `backups/crm/${basename(arquivo)}`;
await gravarNoR2(chave, await readFile(arquivo), "application/octet-stream");
console.log(`[backup] enviado: ${chave} (${(info.size / 1048576).toFixed(1)} MB)`);
