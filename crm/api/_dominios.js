// O domínio do cliente apontado para a landing page dele.
//
// ESTE É O ÚNICO ARQUIVO QUE SABE QUEM HOSPEDA.
//
// A interface é pequena e não fala o nome de ninguém: registrar, estado,
// remover, e o que a tela precisa mostrar de DNS. Nem rota nem tela conhecem
// esse detalhe, e o teste de fronteira cobra isso lendo o código delas.
//
// Hoje a implementação chama a API da Vercel, que é onde a produção está:
// adicionar o domínio ao projeto já liga o SSL automático para aquele
// hostname. O CRM vai migrar para VPS, e lá o Caddy com on-demand TLS
// emite certificado por domínio sozinho e de graça. Quando isso acontecer,
// troca-se este arquivo, e só ele: a tabela `pagina_dominios` e a resolução
// pelo header Host não dependem de onde a aplicação roda.
//
// O que cada função promete, independente de quem hospeda:
//
//   registrar(dominio)  faz o domínio ser atendido com certificado, e devolve
//                       os registros de DNS que o cliente precisa criar.
//   estado(dominio)     diz se já está verificado e bem configurado.
//   remover(dominio)    para de atender aquele domínio.
//   hospedagemPronta()  se este servidor tem credencial para fazer isso.
//   comoConfigurar()    a frase que a tela mostra quando não tem.
//
// A credencial de hoje administra a CONTA INTEIRA da Vercel. Ela vive em
// variável de ambiente, nunca no código e nunca no pacote do painel, e quem
// chama estas funções é só o handler do operador. Se um dia uma dessas
// chamadas for exposta a atendente, o estrago não é a landing page: é a conta.
//
// Nada aqui chuta registro de DNS. O que a tela mostra para o cliente criar é
// exatamente o que a hospedagem respondeu, porque apex pede A, subdomínio
// pede CNAME, e os valores mudam sem aviso.

const BASE = "https://api.vercel.com";
const LIMITE_MS = 10000;

function credenciais() {
  const token = process.env.VERCEL_TOKEN;
  const projeto = process.env.VERCEL_PROJECT_ID;
  const equipe = process.env.VERCEL_TEAM_ID || null;
  return { token, projeto, equipe, pronto: Boolean(token && projeto) };
}

/** Este servidor tem credencial para apontar domínio de cliente? */
export function hospedagemPronta() {
  return credenciais().pronto;
}

/**
 * O que falta, em português, para a tela mostrar.
 *
 * Mora aqui, e não na tela, porque o nome das variáveis muda junto com a
 * hospedagem: na VPS não vai faltar token nenhum.
 */
export function comoConfigurar() {
  return "Faltam as variáveis de ambiente VERCEL_TOKEN e VERCEL_PROJECT_ID neste servidor.";
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

async function chamar(caminho, { metodo = "GET", corpo } = {}) {
  const { token, equipe, pronto } = credenciais();
  if (!pronto) {
    const e = new Error("A integração de domínios não está configurada neste servidor.");
    e.semConfiguracao = true;
    throw e;
  }

  const url = new URL(`${BASE}${caminho}`);
  if (equipe) url.searchParams.set("teamId", equipe);

  let resposta;
  try {
    resposta = await fetch(url, {
      method: metodo,
      headers: {
        Authorization: `Bearer ${token}`,
        ...(corpo ? { "Content-Type": "application/json" } : {}),
      },
      body: corpo ? JSON.stringify(corpo) : undefined,
      signal: AbortSignal.timeout(LIMITE_MS),
    });
  } catch (e) {
    const fora = e.name === "TimeoutError" || e.name === "AbortError";
    throw new Error(fora ? "A hospedagem demorou demais para responder." : `Falha de rede com a hospedagem: ${e.message}`);
  }

  const dados = await resposta.json().catch(() => null);
  if (!resposta.ok) {
    // A mensagem de quem hospeda é melhor que qualquer uma que eu escreva:
    // "domain already in use by another project" é exatamente o que a pessoa
    // precisa ler.
    const erro = new Error(dados?.error?.message || `A hospedagem respondeu ${resposta.status}.`);
    erro.status = resposta.status;
    erro.codigo = dados?.error?.code || null;
    throw erro;
  }
  return dados || {};
}

/** Passa a atender o domínio, com certificado. Devolve o DNS a criar. */
export async function registrar(dominio) {
  const { projeto } = credenciais();
  const dados = await chamar(`/v10/projects/${encodeURIComponent(projeto)}/domains`, {
    metodo: "POST",
    corpo: { name: dominio },
  });
  return leitura(dados);
}

/** Pergunta de novo se já está verificado e bem configurado. */
export async function estado(dominio) {
  const { projeto } = credenciais();
  const alvo = `${encodeURIComponent(projeto)}/domains/${encodeURIComponent(dominio)}`;
  const [registro, config] = await Promise.all([
    chamar(`/v9/projects/${alvo}`),
    chamar(`/v9/projects/${alvo}/config`).catch(() => ({})),
  ]);
  return { ...leitura(registro), maConfigurado: Boolean(config?.misconfigured) };
}

/** Para de atender o domínio. 404 da hospedagem não é erro: o fim era tirar. */
export async function remover(dominio) {
  const { projeto } = credenciais();
  await chamar(`/v9/projects/${encodeURIComponent(projeto)}/domains/${encodeURIComponent(dominio)}`, {
    metodo: "DELETE",
  });
  return { ok: true };
}

// O que a tela precisa, e só isso. A resposta da API de hoje tem dezenas de
// campos que mudam de versão para versão; guardar tudo em `jsonb` seria
// guardar o formato de um fornecedor para sempre. Estes quatro campos são os
// mesmos que o Caddy vai precisar na VPS: tipo, nome, valor, motivo.
function leitura(dados) {
  const registros = Array.isArray(dados?.verification) ? dados.verification : [];
  return {
    dominio: dados?.name || null,
    verificado: Boolean(dados?.verified),
    verificacao: registros.map((r) => ({
      tipo: r.type || null,
      nome: r.domain || null,
      valor: r.value || null,
      motivo: r.reason || null,
    })),
  };
}
