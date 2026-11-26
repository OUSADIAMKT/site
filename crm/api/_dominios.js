// O domínio do cliente apontado para a landing page dele.
//
// ESTE É O ÚNICO ARQUIVO QUE SABE QUEM HOSPEDA.
//
// A interface é pequena e não fala o nome de ninguém: registrar, estado,
// remover, e o que a tela precisa mostrar de DNS. Nem rota nem tela conhecem
// esse detalhe, e o teste de fronteira cobra isso lendo o código delas.
//
// Na VPS quem emite o certificado é o servidor web, sozinho, na primeira
// visita a um domínio novo (TLS sob demanda). Antes de emitir ele pergunta ao
// CRM se aquele domínio está cadastrado (ver `servidor.js`, porta interna), e
// é isso que impede alguém de apontar um domínio qualquer para o nosso IP e
// arrancar um certificado em nosso nome. Então aqui não existe chamada a
// fornecedor nenhum:
//
//   registrar(dominio)  confere que o domínio não é nosso e devolve o registro
//                       de DNS que o cliente precisa criar (A para o IP).
//   estado(dominio)     pergunta ao DNS público se o domínio já aponta para cá.
//   remover(dominio)    nada a fazer fora do banco: sem linha na tabela, o
//                       servidor web para de aceitar o domínio.
//   hospedagemPronta()  se este servidor sabe o próprio IP público.
//   comoConfigurar()    a frase que a tela mostra quando não sabe.
//
// Nada aqui chuta registro de DNS: o valor é o IP_PUBLICO do ambiente, o mesmo
// que o registro A de crm.ousadiamarketing.com.br usa.

const LIMITE_MS = 6000;

// A consulta de DNS vai por HTTPS a um resolvedor público, e não pelo
// resolvedor da máquina: o da máquina guarda cache, e quem acabou de criar o
// registro quer ver o resultado agora, não daqui a uma hora.
const RESOLVEDOR = "https://dns.google/resolve";

function ipPublico() {
  return String(process.env.IP_PUBLICO || "").trim();
}

// Os nossos próprios endereços nunca viram landing page de cliente.
function dominiosDaCasa() {
  const casa = new Set(["ousadiamarketing.com.br", "www.ousadiamarketing.com.br"]);
  for (const v of [process.env.PAINEL_BASE_URL, process.env.URL_PUBLICA]) {
    if (v) casa.add(normalizarDominio(v));
  }
  return casa;
}

/** Este servidor sabe o IP que o cliente precisa apontar? */
export function hospedagemPronta() {
  return Boolean(ipPublico());
}

/** O que falta, em português, para a tela mostrar. */
export function comoConfigurar() {
  return "Falta a variável de ambiente IP_PUBLICO (o IP da VPS) neste servidor.";
}

/**
 * O domínio em forma de host: minúsculas, sem esquema, sem porta, sem caminho.
 *
 * É a MESMA normalização usada na hora de servir, pelo header Host. Ter duas
 * seria o jeito de cadastrar um domínio que nunca casa com a visita.
 */
export function normalizarDominio(texto) {
  let t = String(texto || "").trim().toLowerCase();
  t = t.replace(/^[a-z]+:\/\//, "");   // esquema
  t = t.replace(/[/?#].*$/, "");       // caminho, busca, âncora
  t = t.replace(/:\d+$/, "");          // porta
  t = t.replace(/\.$/, "");            // ponto final do FQDN
  return t;
}

export function dominioValido(dominio) {
  return /^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$/.test(String(dominio || ""));
}

function semConfiguracao() {
  const e = new Error(comoConfigurar());
  e.semConfiguracao = true;
  return e;
}

function oQueCriar(dominio, ip) {
  return [{ tipo: "A", nome: dominio, valor: ip, motivo: "aponte o domínio para o servidor da Ousadia" }];
}

/** Os IPv4 para onde o domínio aponta hoje, segundo o DNS público. */
async function enderecos(dominio) {
  const url = new URL(RESOLVEDOR);
  url.searchParams.set("name", dominio);
  url.searchParams.set("type", "A");

  let resposta;
  try {
    resposta = await fetch(url, {
      headers: { Accept: "application/dns-json" },
      signal: AbortSignal.timeout(LIMITE_MS),
    });
  } catch (e) {
    const fora = e.name === "TimeoutError" || e.name === "AbortError";
    throw new Error(fora ? "O DNS demorou demais para responder." : `Falha de rede ao consultar o DNS: ${e.message}`);
  }
  if (!resposta.ok) throw new Error(`O DNS respondeu ${resposta.status}.`);

  const dados = await resposta.json().catch(() => ({}));
  // Status 3 é NXDOMAIN: o domínio não existe ainda. Não é erro, é pendente.
  return (dados.Answer || []).filter((r) => r.type === 1).map((r) => String(r.data).trim());
}

/** Passa a atender o domínio. Devolve o DNS a criar. */
export async function registrar(dominio) {
  const ip = ipPublico();
  if (!ip) throw semConfiguracao();
  if (dominiosDaCasa().has(dominio)) {
    const e = new Error("esse endereço é da própria Ousadia e não pode virar landing page.");
    e.status = 409;
    throw e;
  }

  // Se o DNS falhar agora, o domínio entra como pendente e a pessoa confere
  // depois: o cadastro não depende de o cliente já ter criado o registro.
  const apontados = await enderecos(dominio).catch(() => []);
  return { dominio, verificado: apontados.includes(ip), verificacao: oQueCriar(dominio, ip) };
}

/** Pergunta de novo se já aponta para cá. */
export async function estado(dominio) {
  const ip = ipPublico();
  if (!ip) throw semConfiguracao();
  const apontados = await enderecos(dominio);
  return {
    dominio,
    verificado: apontados.includes(ip),
    // Aponta, mas também para outro lugar: metade das visitas cairia fora.
    maConfigurado: apontados.includes(ip) && apontados.some((a) => a !== ip),
    verificacao: oQueCriar(dominio, ip),
  };
}

/** Para de atender o domínio. Basta sair da tabela, que é o que a rota faz. */
export async function remover() {
  return { ok: true };
}
