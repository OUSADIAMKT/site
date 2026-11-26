// Cifra os segredos de cliente que moram no banco.
//
// Token de WhatsApp e app secret dão poder de mandar mensagem em nome do
// cliente e de ler tudo o que chega. Guardar isso em texto puro significa que
// um dump do banco, um backup esquecido ou um `select *` no painel do Supabase
// entrega a conta inteira. A chave fica em variável de ambiente justamente
// para não viajar junto com o banco.
//
// AES-256-GCM porque além de esconder ele autentica: se alguém editar o valor
// cifrado na mão, o decifrar falha em vez de devolver lixo silenciosamente.

import crypto from "node:crypto";

const ALGORITMO = "aes-256-gcm";

function chave() {
  const bruta = process.env.CHAVE_CIFRA;
  if (!bruta) {
    throw new Error("CHAVE_CIFRA não configurada no servidor.");
  }
  const bytes = Buffer.from(bruta, "base64");
  if (bytes.length !== 32) {
    throw new Error("CHAVE_CIFRA precisa ter 32 bytes em base64.");
  }
  return bytes;
}

// Formato: v1.<iv>.<etiqueta>.<texto cifrado>, tudo em base64url.
//
// A versão no começo não é enfeite: no dia em que a chave precisar trocar, é
// ela que diz qual valor já está no formato novo e qual ainda falta migrar.
export function cifrar(texto) {
  if (texto == null || texto === "") return null;

  const iv = crypto.randomBytes(12);
  const cifrador = crypto.createCipheriv(ALGORITMO, chave(), iv);
  const corpo = Buffer.concat([cifrador.update(String(texto), "utf8"), cifrador.final()]);
  const etiqueta = cifrador.getAuthTag();

  return [
    "v1",
    iv.toString("base64url"),
    etiqueta.toString("base64url"),
    corpo.toString("base64url"),
  ].join(".");
}

export function decifrar(guardado) {
  if (!guardado) return null;

  const [versao, iv, etiqueta, corpo] = String(guardado).split(".");
  if (versao !== "v1" || !iv || !etiqueta || !corpo) {
    throw new Error("Valor cifrado em formato desconhecido.");
  }

  const decifrador = crypto.createDecipheriv(
    ALGORITMO,
    chave(),
    Buffer.from(iv, "base64url"),
  );
  decifrador.setAuthTag(Buffer.from(etiqueta, "base64url"));

  return Buffer.concat([
    decifrador.update(Buffer.from(corpo, "base64url")),
    decifrador.final(),
  ]).toString("utf8");
}

// Para a tela de Conexões mostrar que o token existe sem mostrar o token.
export function mascarar(texto) {
  const s = String(texto || "");
  if (s.length <= 8) return "••••";
  return `${s.slice(0, 4)}••••${s.slice(-4)}`;
}
