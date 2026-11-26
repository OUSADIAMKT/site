// Uma porta só para falar com o servidor. Guarda o token e trata erro
// de sessão vencida num lugar único.

const CHAVE = "ousadia_token";

export function pegarToken() {
  return localStorage.getItem(CHAVE);
}

export function guardarToken(token) {
  localStorage.setItem(CHAVE, token);
}

export function esquecerToken() {
  localStorage.removeItem(CHAVE);
}

export async function chamar(caminho, opcoes = {}) {
  const token = pegarToken();

  const resposta = await fetch(`/api/${caminho}`, {
    ...opcoes,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...opcoes.headers,
    },
    body: opcoes.body ? JSON.stringify(opcoes.body) : undefined,
  });

  if (resposta.status === 401) {
    esquecerToken();
    window.location.reload();
    throw new Error("Sessão expirada.");
  }

  const dados = await resposta.json().catch(() => ({}));

  if (!resposta.ok) {
    // O `detalhe` é o que o banco realmente disse. Esconder ele fazia toda
    // falha virar "Falha ao listar", sem pista nenhuma de onde olhar.
    const partes = [dados.error || "Algo deu errado. Tente de novo."];
    if (dados.detalhe) partes.push(dados.detalhe);
    const erro = new Error(partes.join(" · "));
    // O corpo inteiro vai junto. Quem envia mídia precisa do `media_id` que a
    // falha devolve: sem ele, tentar de novo sobe o arquivo outra vez e corre o
    // risco de mandar duas vezes a mesma foto.
    erro.status = resposta.status;
    erro.dados = dados;
    throw erro;
  }

  return dados;
}

// Para arquivos (áudio, foto, documento): devolve os bytes, não JSON. O
// `<audio>` não manda o token sozinho, então a tela baixa aqui e toca o blob.
export async function baixar(caminho) {
  const token = pegarToken();
  const resposta = await fetch(`/api/${caminho}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!resposta.ok) {
    const dados = await resposta.json().catch(() => ({}));
    throw new Error(dados.error || "Não deu para abrir o arquivo.");
  }
  return resposta.blob();
}
