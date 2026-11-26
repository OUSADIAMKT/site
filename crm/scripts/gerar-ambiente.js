// Gera o arquivo de ambiente do CRM na VPS, com os segredos sorteados.
//
// Uso, NA VPS, uma vez só:
//   node scripts/gerar-ambiente.js /etc/ousadia-crm.env
//
// Escreve o arquivo com permissão 600 e se recusa a sobrescrever um que já
// exista: perder a CHAVE_CIFRA de um ambiente em uso desliga todos os canais
// de WhatsApp e Instagram sem volta. Para refazer, apague o arquivo à mão
// sabendo o que está fazendo.
//
// Imprime na tela só o que precisa ir para outro lugar:
//   - o segredo do PostgREST (vai em /etc/postgrest/crm.conf, jwt-secret)
//   - a senha do operador do painel (vai para o gerenciador de senhas)
//   - o CRON_SECRET (vai em /etc/cron.d/ousadia-crm)
//   - o WA_VERIFY_TOKEN (vai no app da Meta, quando houver número)
//
// Sem dependência nenhuma: roda antes de qualquer npm install.

import crypto from "node:crypto";
import { existsSync, writeFileSync } from "node:fs";

const destino = process.argv[2];
if (!destino) {
  console.error("Uso: node scripts/gerar-ambiente.js /etc/ousadia-crm.env");
  process.exit(1);
}
if (existsSync(destino)) {
  console.error(`\n  PARADO: ${destino} já existe. Nada foi alterado.\n`);
  process.exit(1);
}

const hex = (n) => crypto.randomBytes(n).toString("hex");
const b64url = (buf) => Buffer.from(buf).toString("base64url");

// A chave do banco é um JWT HS256 com o papel service_role, assinado com o
// segredo do PostgREST. É exatamente o formato da "service_role key" do
// Supabase, por isso o código não muda.
function jwtDoServico(segredo) {
  const cabecalho = b64url(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const agora = Math.floor(Date.now() / 1000);
  const corpo = b64url(JSON.stringify({ role: "service_role", iss: "ousadia-crm", iat: agora }));
  const assinatura = crypto.createHmac("sha256", segredo).update(`${cabecalho}.${corpo}`).digest("base64url");
  return `${cabecalho}.${corpo}.${assinatura}`;
}

// Senha que dá para digitar: quatro blocos sem letra ambígua.
function senhaLegivel() {
  const letras = "abcdefghjkmnpqrstuvwxyz23456789";
  const bytes = crypto.randomBytes(16);
  const s = Array.from(bytes, (b) => letras[b % letras.length]).join("");
  return s.match(/.{4}/g).join("-");
}

const segredoJwt = hex(32);
const v = {
  SUPABASE_URL: "http://127.0.0.1:3102",
  SUPABASE_SECRET_KEY: jwtDoServico(segredoJwt),
  SESSION_SECRET: hex(32),
  // 32 bytes em base64: é o formato que api/_cifra.js exige.
  CHAVE_CIFRA: crypto.randomBytes(32).toString("base64"),
  WA_VERIFY_TOKEN: hex(20),
  CRON_SECRET: hex(32),
  PAINEL_SENHA: senhaLegivel(),
};

const texto = `# Ambiente do CRM Ousadia. Gerado em ${new Date().toISOString()}.
# Permissão 600. Nunca versionar, colar em chat nem mandar por email.

# --- banco (PostgREST local, ver crm/README.md) ---
SUPABASE_URL=${v.SUPABASE_URL}
SUPABASE_SECRET_KEY=${v.SUPABASE_SECRET_KEY}

# --- segredos desta instalação ---
SESSION_SECRET=${v.SESSION_SECRET}
# CHAVE_CIFRA decifra os tokens de WhatsApp e Instagram guardados no banco.
# Perder esta linha = reconectar todos os canais do zero. Guarde uma cópia
# fora da máquina HOJE.
CHAVE_CIFRA=${v.CHAVE_CIFRA}
WA_VERIFY_TOKEN=${v.WA_VERIFY_TOKEN}
CRON_SECRET=${v.CRON_SECRET}
PAINEL_SENHA=${v.PAINEL_SENHA}

# --- endereços ---
PAINEL_BASE_URL=https://crm.ousadiamarketing.com.br
URL_PUBLICA=https://crm.ousadiamarketing.com.br
REPORT_BASE_URL=https://crm.ousadiamarketing.com.br
HOSTS_DO_PAINEL=crm.ousadiamarketing.com.br
# O IP da VPS: é o que as landing pages em domínio próprio mandam apontar.
IP_PUBLICO=

# --- IA (preencher quando a chave existir) ---
ANTHROPIC_API_KEY=

# --- WhatsApp / Meta (preencher quando houver número) ---
META_APP_SECRET=

# --- relatórios de anúncios da Meta ---
META_REPORT_APP_ID=
META_REPORT_APP_SECRET=
META_REPORT_CONFIG_ID=
REPORT_MCP_TOKEN=

# --- cofre de mídias (opcional, Cloudflare R2) ---
R2_ACCOUNT_ID=
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_BUCKET=
R2_ENDPOINT=

# --- transcrição de áudio (opcional: openai ou groq) ---
TRANSCRICAO_PROVEDOR=
OPENAI_API_KEY=
GROQ_API_KEY=

# --- formulários do site ---
# Origens que podem mandar lead para /api/lead, separadas por vírgula.
ORIGENS_DO_SITE=https://ousadiamarketing.com.br,https://www.ousadiamarketing.com.br

# O freio do disparo em massa: com 0 a campanha roda e NÃO envia.
DISPARO_ENVIO_REAL=0
`;

writeFileSync(destino, texto, { mode: 0o600 });

console.log(`
  Escrito: ${destino} (permissão 600)

  1. Segredo do PostgREST. Vai em /etc/postgrest/crm.conf, na linha jwt-secret:
       ${segredoJwt}

  2. Senha do operador do painel (entrar com o email vazio). Guarde no
     gerenciador de senhas:
       ${v.PAINEL_SENHA}

  3. CRON_SECRET, para /etc/cron.d/ousadia-crm:
       ${v.CRON_SECRET}

  4. Preencha IP_PUBLICO no arquivo. ANTHROPIC_API_KEY e as da Meta ficam
     vazias até existirem.

  5. Copie o arquivo inteiro para fora da máquina (por causa da CHAVE_CIFRA).
`);
