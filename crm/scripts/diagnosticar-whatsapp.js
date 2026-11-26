// O que a Meta sabe sobre o numero, antes de a gente mexer em qualquer coisa.
//
// Existe porque o caminho da etapa 2 muda inteiro conforme a resposta: numero
// ja registrado na Cloud API so troca de app, e nao pede verificacao nenhuma;
// numero nunca registrado, ou que precisa mudar de WABA, pede SMS ou chamada
// de voz, e com numero VoIP isso significa ligar para o suporte e esperar.
//
// Adivinhar isso custa caro: a gente so descobre que errou depois de ter
// tirado o provedor antigo, com o cliente ja sem atendimento.
//
// Uso:
//   node --env-file=.env scripts/diagnosticar-whatsapp.js
//
// Le do .env: OUSADIA_WABA_ID, OUSADIA_PHONE_NUMBER_ID, OUSADIA_TOKEN.
// Nao escreve nada, nem no banco nem na Meta. So pergunta.

const VERSAO = process.env.WA_API_VERSION || "v23.0";
const BASE = "https://graph.facebook.com";

const token = process.env.OUSADIA_TOKEN;
const waba = process.env.OUSADIA_WABA_ID;
const numero = process.env.OUSADIA_PHONE_NUMBER_ID;

if (!token) {
  console.error("Falta OUSADIA_TOKEN no .env. Veja o cabecalho deste arquivo.");
  process.exit(1);
}

async function perguntar(caminho) {
  const sep = caminho.includes("?") ? "&" : "?";
  const r = await fetch(`${BASE}/${VERSAO}/${caminho}${sep}access_token=${encodeURIComponent(token)}`);
  const corpo = await r.json().catch(() => ({}));
  return { ok: r.ok, status: r.status, corpo };
}

function titulo(t) {
  console.log(`\n${"=".repeat(60)}\n${t}\n${"=".repeat(60)}`);
}

// ---------------------------------------------------------------
titulo("O TOKEN");

const eu = await perguntar("me?fields=id,name");
if (!eu.ok) {
  console.error(`O token nao foi aceito: ${eu.corpo?.error?.message || eu.status}`);
  console.error("Sem token valido nao da para perguntar mais nada. Pare aqui.");
  process.exit(1);
}
console.log(`Aceito. Responde como: ${eu.corpo.name || "(sem nome)"} (${eu.corpo.id})`);

const debug = await perguntar(
  `debug_token?input_token=${encodeURIComponent(token)}`,
);
const d = debug.corpo?.data;
if (d) {
  const vence = d.expires_at
    ? new Date(d.expires_at * 1000).toLocaleString("pt-BR")
    : "nunca (token permanente)";
  console.log(`Tipo: ${d.type || "?"}`);
  console.log(`Vence: ${vence}`);
  console.log(`Permissoes: ${(d.scopes || []).join(", ") || "(nenhuma listada)"}`);

  const precisa = ["whatsapp_business_messaging", "whatsapp_business_management"];
  const faltando = precisa.filter((p) => !(d.scopes || []).includes(p));
  if (faltando.length) {
    console.log(`\nATENCAO: faltam permissoes: ${faltando.join(", ")}`);
    console.log("Sem elas o envio ou a configuracao vao falhar depois.");
  }
}

// ---------------------------------------------------------------
titulo("A CONTA DE WHATSAPP (WABA)");

if (!waba) {
  console.log("OUSADIA_WABA_ID nao esta no .env, entao pulei esta parte.");
} else {
  const conta = await perguntar(
    `${waba}?fields=id,name,timezone_id,message_template_namespace,account_review_status,business_verification_status`,
  );
  if (!conta.ok) {
    console.log(`Nao consegui ler: ${conta.corpo?.error?.message || conta.status}`);
    console.log("Isso costuma significar que o token nao tem acesso a esta WABA.");
  } else {
    for (const [k, v] of Object.entries(conta.corpo)) console.log(`${k}: ${v}`);
  }

  const apps = await perguntar(`${waba}/subscribed_apps`);
  console.log("\nApps inscritos no webhook desta conta:");
  const lista = apps.corpo?.data || [];
  if (!lista.length) {
    console.log("  nenhum. O RD ja saiu, ou nunca chegou a assinar.");
  }
  for (const a of lista) {
    console.log(`  - app ${a.whatsapp_business_api_data?.id || a.app_id || "?"}`
      + ` ${a.whatsapp_business_api_data?.name ? `(${a.whatsapp_business_api_data.name})` : ""}`);
  }
  console.log("\nSe aparecer um app que nao e o nosso, ele tambem recebe as mensagens");
  console.log("e pode responder junto. Dois respondendo e pior que nenhum.");
}

// ---------------------------------------------------------------
titulo("O NUMERO");

const caminhoNumero = numero
  || (waba ? `${waba}/phone_numbers` : null);

if (!caminhoNumero) {
  console.log("Sem OUSADIA_PHONE_NUMBER_ID e sem WABA_ID nao da para olhar o numero.");
} else {
  const campos = "id,display_phone_number,verified_name,code_verification_status,"
    + "quality_rating,platform_type,throughput,status,name_status";
  const r = numero
    ? await perguntar(`${numero}?fields=${campos}`)
    : await perguntar(`${waba}/phone_numbers?fields=${campos}`);

  if (!r.ok) {
    console.log(`Nao consegui ler: ${r.corpo?.error?.message || r.status}`);
  } else {
    const numeros = r.corpo.data || [r.corpo];
    for (const n of numeros) {
      console.log(`\n  numero: ${n.display_phone_number || "?"}  (id ${n.id})`);
      console.log(`  nome exibido: ${n.verified_name || "?"} [${n.name_status || "?"}]`);
      console.log(`  verificacao: ${n.code_verification_status || "?"}`);
      console.log(`  plataforma: ${n.platform_type || "?"}`);
      console.log(`  qualidade: ${n.quality_rating || "?"}`);
      console.log(`  status: ${n.status || "?"}`);
      console.log(`  limite: ${n.throughput?.level || "?"}`);

      console.log("\n  O que isso quer dizer:");
      if (n.platform_type === "CLOUD_API") {
        console.log("  - Ja esta na Cloud API. Trocar de app NAO pede verificacao.");
        console.log("    Caminho curto: assinar nosso webhook e tirar o outro app.");
      } else if (n.platform_type === "ON_PREMISE") {
        console.log("  - Esta na API antiga, no servidor do provedor. Migrar para a");
        console.log("    Cloud API PEDE verificacao por SMS ou chamada de voz.");
      } else {
        console.log("  - NAO esta registrado em nenhuma plataforma de API.");
        console.log("    Registrar PEDE verificacao por SMS ou chamada de voz.");
        console.log("    Com numero VoIP, e aqui que o suporte do VoIP entra.");
      }
      if (n.code_verification_status && n.code_verification_status !== "VERIFIED") {
        console.log(`  - A verificacao esta como ${n.code_verification_status}, nao VERIFIED.`);
      }
    }
  }
}

console.log("\nNada foi alterado. Este script so le.\n");
