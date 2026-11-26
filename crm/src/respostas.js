// A lógica das respostas rápidas, sem React, para os testes importarem.

/** "/mat" no campo vazio de resto: a pessoa está procurando um atalho. */
export function buscaDeAtalho(texto) {
  const m = /^\/([a-z0-9-]*)$/i.exec(String(texto || ""));
  return m ? m[1].toLowerCase() : null;
}

/**
 * As respostas que casam com o que foi digitado depois da barra. As da
 * própria pessoa vêm antes das da equipe; dentro de cada grupo, quem começa
 * com o termo vem antes de quem só contém.
 */
export function filtrarRespostas(lista, termo, max = 8) {
  const t = String(termo || "").toLowerCase();
  const pontos = (r) => {
    const a = r.atalho.toLowerCase();
    if (t && !a.includes(t) && !r.texto.toLowerCase().includes(t)) return -1;
    return (r.atendente_id ? 4 : 0) + (a.startsWith(t) ? 2 : a.includes(t) ? 1 : 0);
  };
  return (lista || [])
    .map((r) => [pontos(r), r])
    .filter(([p]) => p >= 0)
    .sort((x, y) => y[0] - x[0] || x[1].atalho.localeCompare(y[1].atalho))
    .slice(0, max)
    .map(([, r]) => r);
}

/** Troca {nome} pelo primeiro nome do contato; sem nome, tira a marca. */
export function preencherResposta(texto, { nome } = {}) {
  const primeiro = String(nome || "").trim().split(/\s+/)[0] || "";
  return String(texto || "")
    .replace(/\{nome\}/gi, primeiro)
    .replace(/[ \t]+([,.!?])/g, "$1")
    .replace(/[ \t]{2,}/g, " ");
}

/** Atalho como o banco aceita: minúsculo, sem acento, hífen no lugar de espaço. */
export function normalizarAtalho(bruto) {
  return String(bruto || "").normalize("NFD").replace(/[̀-ͯ]/g, "")
    .toLowerCase().replace(/^\/+/, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 30);
}
