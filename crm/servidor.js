// O servidor do CRM na VPS.
//
// O código de `api/` foi escrito para funções da Vercel: cada arquivo sem `_`
// na frente é um handler `(req, res)` que espera `req.query`, `req.body` e
// `res.status().json()`. Este arquivo é a casca que dá a eles exatamente isso,
// num processo Node só, sem framework, para nenhum handler precisar mudar.
//
// O que ele faz, nesta ordem:
//
//   1. Reescreve os endereços bonitos para o handler de verdade (o que o
//      vercel.json fazia). A tabela está em REESCRITAS, abaixo.
//   2. Entrega `/api/<nome>` ao handler `api/<nome>.js`.
//   3. Serve o painel construído (`dist/`), com `/` indo para o painel só nos
//      endereços do painel. Em qualquer outro domínio, `/` é a landing page do
//      cliente, que é como os domínios próprios das páginas funcionam.
//
// E abre uma segunda porta, só em 127.0.0.1, que o Caddy consulta antes de
// emitir certificado para um domínio novo (TLS sob demanda). Ela não passa
// pelo proxy e não é alcançável de fora.
//
// Corpo da requisição: igual à Vercel. JSON vira objeto, formulário vira
// objeto, texto vira string. O handler que exporta
// `config = { api: { bodyParser: false } }` (o webhook da Meta) recebe o
// fluxo intacto, porque precisa dos bytes crus para conferir a assinatura.

import http from "node:http";
import { readdir, readFile, stat } from "node:fs/promises";
import { extname, join, normalize, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const RAIZ = fileURLToPath(new URL(".", import.meta.url));
const PASTA_API = join(RAIZ, "api");
const PASTA_ESTATICA = join(RAIZ, "dist");

const PORTA = Number(process.env.PORTA || 3100);
const PORTA_INTERNA = Number(process.env.PORTA_INTERNA || 3101);
const ENDERECO = process.env.ENDERECO || "127.0.0.1";

// Corpo maior que isto é recusado antes de chegar ao handler. Os limites de
// verdade de cada rota (mídia, upload) moram nelas e são menores.
const TETO_CORPO = 30 * 1024 * 1024;

// Os endereços em que `/` é o painel. Qualquer outro host cai na landing
// page cadastrada para ele.
const HOSTS_DO_PAINEL = new Set(
  String(process.env.HOSTS_DO_PAINEL || "crm.ousadiamarketing.com.br,localhost,127.0.0.1")
    .split(",").map((h) => h.trim().toLowerCase()).filter(Boolean),
);

// ---------------------------------------------------------------------------
// Reescritas: o mesmo que o vercel.json da origem fazia.

const REESCRITAS = [
  ["/api/painel-agendamentos", "/api/painel-agenda", { recurso: "agendamentos" }],
  ["/api/report-callback", "/api/report", { rota: "callback" }],
  ["/api/report-coletar", "/api/report", { rota: "coletar" }],
  ["/api/painel-crm", "/api/painel-conversas", { rota: "crm" }],
  ["/api/painel-contatos", "/api/painel-conversas", { rota: "contatos" }],
  ["/api/painel-importar", "/api/painel-conversas", { rota: "importar" }],
  ["/api/painel-disparos", "/api/painel-conversas", { rota: "disparos" }],
  ["/api/painel-disparar", "/api/painel-conversas", { rota: "disparar" }],
  ["/api/painel-frentes", "/api/painel-conversas", { rota: "frentes" }],
  ["/api/painel-paginas", "/api/report", { rota: "paginas" }],
  ["/api/mcp", "/api/report", { rota: "mcp" }],
  [/^\/api\/mcp\/([^/]+)$/, "/api/report", (m) => ({ rota: "mcp", chave: m[1] })],
  [/^\/l\/([^/]+)$/, "/api/report", (m) => ({ rota: "ir", chave: m[1] })],
  [/^\/p\/([^/]+)$/, "/api/report", (m) => ({ rota: "pagina-publica", slug: m[1] })],
  [/^\/r\/[^/]+$/, "/relatorio.html", null],
];

/** Devolve { caminho, extra } depois das reescritas. */
export function reescrever(caminho, host) {
  for (const [de, para, params] of REESCRITAS) {
    if (typeof de === "string" ? caminho === de : de.test(caminho)) {
      const m = typeof de === "string" ? null : caminho.match(de);
      const extra = typeof params === "function" ? params(m) : (params || {});
      return { caminho: para, extra };
    }
  }
  if (caminho === "/") {
    return HOSTS_DO_PAINEL.has(host)
      ? { caminho: "/painel.html", extra: {} }
      : { caminho: "/api/report", extra: { rota: "pagina-publica" } };
  }
  return { caminho, extra: {} };
}

// ---------------------------------------------------------------------------
// Handlers

const handlers = new Map();

async function carregarHandlers() {
  for (const arquivo of await readdir(PASTA_API)) {
    if (!arquivo.endsWith(".js") || arquivo.startsWith("_")) continue;
    const modulo = await import(new URL(`./api/${arquivo}`, import.meta.url));
    handlers.set(arquivo.slice(0, -3), {
      fn: modulo.default,
      corpoCru: modulo.config?.api?.bodyParser === false,
    });
  }
}

// ---------------------------------------------------------------------------
// req e res no formato que os handlers esperam

function hostDe(req) {
  return String(req.headers["x-forwarded-host"] || req.headers.host || "")
    .split(",")[0].trim().toLowerCase().replace(/:\d+$/, "");
}

function consultaDe(url, extra) {
  const q = {};
  for (const [k, v] of url.searchParams) {
    if (k in q) q[k] = [].concat(q[k], v);
    else q[k] = v;
  }
  return { ...q, ...extra };
}

function lerCorpo(req) {
  return new Promise((resolver, rejeitar) => {
    const pedacos = [];
    let total = 0;
    req.on("data", (p) => {
      total += p.length;
      if (total > TETO_CORPO) {
        rejeitar(Object.assign(new Error("Corpo grande demais."), { status: 413 }));
        req.destroy();
        return;
      }
      pedacos.push(p);
    });
    req.on("end", () => resolver(Buffer.concat(pedacos)));
    req.on("error", rejeitar);
  });
}

function interpretarCorpo(bytes, tipo) {
  if (!bytes.length) return undefined;
  const t = String(tipo || "").toLowerCase();
  if (t.includes("application/json")) {
    try { return JSON.parse(bytes.toString("utf8")); } catch {
      throw Object.assign(new Error("JSON inválido."), { status: 400 });
    }
  }
  if (t.includes("application/x-www-form-urlencoded")) {
    return Object.fromEntries(new URLSearchParams(bytes.toString("utf8")));
  }
  if (t.startsWith("text/")) return bytes.toString("utf8");
  return bytes;
}

function enfeitarResposta(res) {
  res.status = (codigo) => { res.statusCode = codigo; return res; };
  res.json = (dado) => {
    if (!res.getHeader("Content-Type")) res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.end(JSON.stringify(dado));
    return res;
  };
  res.send = (dado) => {
    if (dado === undefined || dado === null) { res.end(); return res; }
    if (Buffer.isBuffer(dado)) {
      if (!res.getHeader("Content-Type")) res.setHeader("Content-Type", "application/octet-stream");
      res.end(dado);
      return res;
    }
    if (typeof dado === "object") return res.json(dado);
    if (!res.getHeader("Content-Type")) res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.end(String(dado));
    return res;
  };
  res.redirect = (a, b) => {
    const [codigo, destino] = typeof a === "number" ? [a, b] : [302, a];
    res.statusCode = codigo;
    res.setHeader("Location", destino);
    res.end();
    return res;
  };
  return res;
}

// ---------------------------------------------------------------------------
// Estático

const TIPOS = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".webmanifest": "application/manifest+json",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".ico": "image/x-icon",
  ".woff2": "font/woff2",
  ".txt": "text/plain; charset=utf-8",
};

async function servirEstatico(caminho, res) {
  // `normalize` + conferência de prefixo: `/../` nunca sai da pasta.
  const alvo = resolve(PASTA_ESTATICA, "." + normalize(decodeURIComponent(caminho)));
  if (!alvo.startsWith(PASTA_ESTATICA + sep)) return false;
  let info;
  try { info = await stat(alvo); } catch { return false; }
  if (!info.isFile()) return false;

  const tipo = TIPOS[extname(alvo).toLowerCase()] || "application/octet-stream";
  res.setHeader("Content-Type", tipo);
  // Os arquivos de `assets/` têm hash no nome: podem ficar em cache para sempre.
  res.setHeader("Cache-Control", caminho.startsWith("/assets/")
    ? "public, max-age=31536000, immutable"
    : "no-cache");
  res.end(await readFile(alvo));
  return true;
}

// ---------------------------------------------------------------------------
// O atendimento

export async function atender(req, res) {
  enfeitarResposta(res);
  const host = hostDe(req);
  const url = new URL(req.url, "http://interno");
  const { caminho, extra } = reescrever(url.pathname, host);

  try {
    const m = caminho.match(/^\/api\/([a-z0-9-]+)\/?$/);
    if (m) {
      const h = handlers.get(m[1]);
      if (!h) return res.status(404).json({ error: "Rota não encontrada." });

      req.query = consultaDe(url, extra);
      if (!h.corpoCru && !["GET", "HEAD"].includes(req.method)) {
        req.body = interpretarCorpo(await lerCorpo(req), req.headers["content-type"]);
      }
      await h.fn(req, res);
      return;
    }

    if (["GET", "HEAD"].includes(req.method) && await servirEstatico(caminho, res)) return;
    res.status(404).send("Não encontrado.");
  } catch (e) {
    console.error(`[servidor] ${req.method} ${url.pathname}:`, e?.stack || e);
    if (!res.headersSent) {
      res.status(e.status || 500).json({ error: e.status ? e.message : "Erro interno." });
    } else {
      res.end();
    }
  }
}

// ---------------------------------------------------------------------------
// A porta interna: o Caddy pergunta "posso emitir certificado para X?"

async function dominioCadastrado(dominio) {
  const { db } = await import("./api/_db.js");
  const { normalizarDominio, dominioValido } = await import("./api/_dominios.js");
  const d = normalizarDominio(dominio);
  if (!dominioValido(d)) return false;
  const { data, error } = await db().from("pagina_dominios").select("id").eq("dominio", d).limit(1);
  if (error) throw new Error(error.message);
  return (data || []).length > 0;
}

async function atenderInterno(req, res) {
  const url = new URL(req.url, "http://interno");
  if (url.pathname === "/tls") {
    try {
      const ok = await dominioCadastrado(url.searchParams.get("domain"));
      res.writeHead(ok ? 200 : 404).end();
    } catch (e) {
      console.error("[tls]", e.message);
      res.writeHead(500).end();
    }
    return;
  }
  if (url.pathname === "/saude") {
    res.writeHead(200, { "Content-Type": "text/plain" }).end("ok");
    return;
  }
  res.writeHead(404).end();
}

// ---------------------------------------------------------------------------

const ehPrincipal = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (ehPrincipal) {
  process.on("unhandledRejection", (e) => console.error("[servidor] promessa rejeitada:", e?.stack || e));

  await carregarHandlers();
  http.createServer(atender).listen(PORTA, ENDERECO, () => {
    console.log(`[servidor] CRM em http://${ENDERECO}:${PORTA} (${handlers.size} rotas)`);
  });
  http.createServer(atenderInterno).listen(PORTA_INTERNA, "127.0.0.1", () => {
    console.log(`[servidor] porta interna em http://127.0.0.1:${PORTA_INTERNA}`);
  });
}

export { carregarHandlers, handlers };
