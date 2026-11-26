// Guarda o canal de WhatsApp de um cliente, com os segredos cifrados.
//
// Existe para o token nunca passar por chat, por print nem por commit. Ele sai
// do .env, entra cifrado no banco, e o .env pode ser limpo em seguida.
//
// Uso:
//   node --env-file=.env scripts/conectar-whatsapp.js ousadia
//
// Le do .env, com o prefixo em maiusculas do slug:
//   OUSADIA_WABA_ID, OUSADIA_PHONE_NUMBER_ID, OUSADIA_TOKEN,
//   OUSADIA_NUMERO           (opcional: vem da Meta se faltar)
//   OUSADIA_APP_SECRET       (opcional: cai no do ambiente)
//   OUSADIA_COEXISTENCIA=1   (opcional: numero tambem roda no celular)
//
// Rodar de novo com o mesmo numero atualiza, nao duplica.

import crypto from "node:crypto";
import { db } from "../api/_db.js";
import { cifrar, mascarar } from "../api/_cifra.js";

const VERSAO = process.env.WA_API_VERSION || "v23.0";

const slug = process.argv[2];
if (!slug) {
  console.error("Falta o slug do cliente. Ex: node --env-file=.env scripts/conectar-whatsapp.js ousadia");
  process.exit(1);
}

const P = slug.toUpperCase().replace(/[^A-Z0-9]/g, "_");
const ler = (nome) => process.env[`${P}_${nome}`]?.trim() || null;

const waba = ler("WABA_ID");
const phoneNumberId = ler("PHONE_NUMBER_ID");
const token = ler("TOKEN");

const faltando = [
  !waba && `${P}_WABA_ID`,
  !phoneNumberId && `${P}_PHONE_NUMBER_ID`,
  !token && `${P}_TOKEN`,
].filter(Boolean);

if (faltando.length) {
  console.error(`Falta no .env: ${faltando.join(", ")}`);
  console.error("Veja o cabecalho deste arquivo.");
  process.exit(1);
}

const sb = db();

// ---------------------------------------------------------------
// 1. O cliente existe?
// ---------------------------------------------------------------
const { data: cliente } = await sb
  .from("clientes").select("id, nome, slug").eq("slug", slug).maybeSingle();

if (!cliente) {
  console.error(`Nao achei cliente com slug "${slug}".`);
  process.exit(1);
}
console.log(`Cliente: ${cliente.nome}`);

// ---------------------------------------------------------------
// 2. A Meta confirma o numero?
//
// Perguntar antes de gravar evita o pior caso: credencial errada guardada,
// webhook chegando e nada funcionando, sem ninguem saber onde olhar.
// ---------------------------------------------------------------
const r = await fetch(
  `https://graph.facebook.com/${VERSAO}/${phoneNumberId}`
  + `?fields=display_phone_number,verified_name,platform_type,code_verification_status`
  + `&access_token=${encodeURIComponent(token)}`,
);
const numero = await r.json().catch(() => ({}));

if (!r.ok) {
  console.error(`A Meta recusou: ${numero?.error?.message || r.status}`);
  console.error("Nada foi gravado. Confira o token e o Phone Number ID.");
  process.exit(1);
}

console.log(`Numero: ${numero.display_phone_number} (${numero.verified_name || "sem nome"})`);
console.log(`Plataforma: ${numero.platform_type || "?"} | verificacao: ${numero.code_verification_status || "?"}`);

// A WABA tambem e conferida. Gravar um waba_id errado nao quebra nada hoje,
// porque o webhook acha o canal pelo phone_number_id, mas quebra no dia dos
// modelos de mensagem, que sao pedidos na WABA. Erro barato de achar agora.
const rw = await fetch(
  `https://graph.facebook.com/${VERSAO}/${waba}`
  + `?fields=name,id&access_token=${encodeURIComponent(token)}`,
);
const contaWa = await rw.json().catch(() => ({}));

// Aviso, nao bloqueio. Conta do WhatsApp criada pelo aplicativo comercial
// existe de verdade mas a Graph API recusa le-la ("This API is not supported
// for this WhatsApp Business Account"), e nesse caso nao da para conferir id
// nenhum. Como o webhook acha o canal pelo phone_number_id, um waba_id nao
// conferido nao impede nada hoje: so vai doer no dia dos modelos de mensagem.
if (!rw.ok) {
  console.warn(`AVISO: nao deu para conferir a WABA. A Meta disse: ${contaWa?.error?.error_user_msg || contaWa?.error?.message || rw.status}`);
  console.warn("Gravando assim mesmo. Confira o WABA ID antes de mexer em modelos.");
} else {
  console.log(`WABA: ${contaWa.name || "sem nome"} (${contaWa.id})`);
}

// ---------------------------------------------------------------
// 3. Gravar, cifrado.
// ---------------------------------------------------------------
// O verify token e nosso, nao da Meta: e a senha que a gente escolhe e repete
// na configuracao do webhook, para a Meta provar que o GET veio dela.
const verifyToken = ler("VERIFY_TOKEN") || crypto.randomBytes(24).toString("base64url");

const linha = {
  cliente_id: cliente.id,
  waba_id: waba,
  phone_number_id: phoneNumberId,
  numero_e164: ler("NUMERO") || numero.display_phone_number?.replace(/\D/g, "") || "",
  nome_exibicao: numero.verified_name || null,
  token_cifrado: cifrar(token),
  app_secret_cifrado: cifrar(ler("APP_SECRET") || process.env.META_APP_SECRET),
  verify_token: verifyToken,
  coexistencia: ler("COEXISTENCIA") === "1",
  tier: null,
  ativo: true,
};

const { error } = await sb
  .from("canais")
  .upsert(linha, { onConflict: "phone_number_id" });

if (error) {
  console.error(`Falha ao gravar: ${error.message}`);
  process.exit(1);
}

console.log(`\nGravado em canais, cifrado. Token guardado: ${mascarar(token)}`);
console.log("\nAgora:");
console.log("  1. Apague as linhas do .env, que nao precisam mais ficar la.");
console.log("  2. No app da Meta, em WhatsApp > Configuracao, aponte o webhook para:");
console.log("       https://crm.ousadiamarketing.com.br/api/webhook");
console.log(`     e use este token de verificacao: ${verifyToken}`);
console.log("  3. Assine os campos 'messages' nesse webhook.\n");
