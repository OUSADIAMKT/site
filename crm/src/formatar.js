// Formatação automática de HTML, CSS e JavaScript.
//
// A regra que governa este arquivo inteiro: formatar SÓ pode mexer em espaço
// em branco. Nenhuma função daqui tem permissão de mudar um caractere do
// código, e isso não é promessa, é conferido: `somenteEspaco` compara o antes
// e o depois com todo espaço removido, e devolve o original se tiverem
// diferido. Um formatador que corrompe o JS de uma landing page de cliente
// custa mais caro que não ter formatador.
//
// O limite, dito de frente: isto não é Prettier. Não reflui linha comprida,
// não reposiciona chave, não sabe o que é expressão regular dentro de JS. O
// que ele faz é indentação consistente, que é o que resolve o caso real desta
// tela, que é HTML e CSS exportados de outra ferramenta, muitas vezes numa
// linha só.

const TAMANHO = 2;

function somenteEspaco(antes, depois) {
  return antes.replace(/\s+/g, "") === depois.replace(/\s+/g, "");
}

function seguro(antes, calcular) {
  try {
    const depois = calcular(antes);
    return somenteEspaco(antes, depois) ? depois : antes;
  } catch {
    // Formatador que levanta erro devolve o texto como estava. O editor não
    // pode perder o trabalho de alguém por um caso que eu não previ.
    return antes;
  }
}

// ---------------------------------------------------------------------------
// CSS
//
// Aqui vale quebrar linha de verdade, porque CSS minificado vem numa linha só
// e é ilegível. Quebra em `{`, `}` e `;`, respeitando string e comentário.
function formatarCssCru(css) {
  const pedacos = [];
  let atual = "";
  let i = 0;

  while (i < css.length) {
    const c = css[i];

    if (c === "/" && css[i + 1] === "*") {
      const fim = css.indexOf("*/", i + 2);
      const ate = fim < 0 ? css.length : fim + 2;
      atual += css.slice(i, ate);
      i = ate;
      continue;
    }
    if (c === '"' || c === "'") {
      let j = i + 1;
      while (j < css.length && css[j] !== c) j += css[j] === "\\" ? 2 : 1;
      atual += css.slice(i, j + 1);
      i = j + 1;
      continue;
    }
    if (c === "{" || c === "}" || c === ";") {
      pedacos.push(`${atual.trim()}${c}`);
      atual = "";
      i += 1;
      continue;
    }
    atual += c;
    i += 1;
  }
  if (atual.trim()) pedacos.push(atual.trim());

  let nivel = 0;
  const linhas = [];
  for (const bruto of pedacos) {
    const linha = bruto.trim();
    if (!linha) continue;
    if (linha.startsWith("}")) nivel = Math.max(0, nivel - 1);
    linhas.push(" ".repeat(nivel * TAMANHO) + linha);
    if (linha.endsWith("{")) nivel += 1;
  }
  return `${linhas.join("\n")}\n`;
}

export function formatarCss(css) {
  return seguro(String(css), formatarCssCru);
}

// ---------------------------------------------------------------------------
// JavaScript
//
// Só reindenta as linhas que já existem. Contar chave dentro de string ou de
// comentário daria indentação errada, então as duas são puladas na contagem.
function saldoDeLinha(linha) {
  let saldo = 0;
  let i = 0;

  while (i < linha.length) {
    const c = linha[i];
    if (c === "/" && linha[i + 1] === "/") break;
    if (c === "/" && linha[i + 1] === "*") {
      const fim = linha.indexOf("*/", i + 2);
      if (fim < 0) break;
      i = fim + 2;
      continue;
    }
    if (c === '"' || c === "'" || c === "`") {
      let j = i + 1;
      while (j < linha.length && linha[j] !== c) j += linha[j] === "\\" ? 2 : 1;
      i = j + 1;
      continue;
    }
    if (c === "{" || c === "[" || c === "(") saldo += 1;
    if (c === "}" || c === "]" || c === ")") saldo -= 1;
    i += 1;
  }
  return saldo;
}

function formatarJsCru(js) {
  let nivel = 0;
  const linhas = [];

  for (const bruto of String(js).split("\n")) {
    const linha = bruto.trim();
    if (!linha) { linhas.push(""); continue; }

    // Linha que começa fechando desce um nível antes de ser escrita, senão
    // o `}` fica alinhado com o corpo do bloco em vez do começo dele.
    const fechaPrimeiro = /^[}\])]/.test(linha);
    const nivelDaLinha = fechaPrimeiro ? Math.max(0, nivel - 1) : nivel;
    linhas.push(" ".repeat(nivelDaLinha * TAMANHO) + linha);

    // O saldo já conta o fechamento que começa a linha, então o nível
    // seguinte sai do nível corrente mais o saldo, sem correção extra.
    const saldo = saldoDeLinha(linha);
    nivel = Math.max(0, nivel + saldo);
  }

  return `${linhas.join("\n").replace(/\n{3,}/g, "\n\n")}\n`;
}

export function formatarJs(js) {
  return seguro(String(js), formatarJsCru);
}

// ---------------------------------------------------------------------------
// HTML
//
// Quebra linha SÓ entre tags de bloco. Entre tags em linha o espaço em branco
// é significativo: `<b>a</b><i>b</i>` com uma quebra no meio vira "a b" na
// tela, com um espaço que ninguém pediu. É o tipo de estrago silencioso que um
// formatador bonito faz numa landing page.
const BLOCOS = new Set([
  "html", "head", "body", "div", "section", "header", "footer", "main", "nav",
  "article", "aside", "figure", "figcaption", "form", "fieldset", "p",
  "h1", "h2", "h3", "h4", "h5", "h6", "ul", "ol", "li", "dl", "dt", "dd",
  "table", "thead", "tbody", "tfoot", "tr", "td", "th", "script", "style",
  "meta", "link", "title", "nav", "video", "audio", "source", "picture",
  "iframe", "noscript", "template", "hr", "blockquote", "pre",
]);

const VAZIOS = new Set([
  "area", "base", "br", "col", "embed", "hr", "img", "input", "link", "meta",
  "param", "source", "track", "wbr",
]);

// Dentro destas tags o conteúdo fica exatamente como está: mexer no espaço de
// um <pre> muda o que a pessoa vê.
const INTOCAVEIS = new Set(["pre", "textarea"]);

function nomeDaTag(tag) {
  return (tag.match(/^<\/?\s*([a-zA-Z][\w:-]*)/) || [])[1]?.toLowerCase() || "";
}

function formatarHtmlCru(html) {
  const texto = String(html);

  // Primeiro as quebras entre blocos, em cima do texto original.
  const quebrado = texto.replace(/>\s*</g, (achado, pos, inteiro) => {
    const antes = nomeDaTag(inteiro.slice(inteiro.lastIndexOf("<", pos), pos + 1));
    const depoisTag = inteiro.slice(pos + achado.length - 1);
    const depois = nomeDaTag(depoisTag);
    if (BLOCOS.has(antes) || BLOCOS.has(depois)) return ">\n<";
    return achado;
  });

  let nivel = 0;
  let dentroDeIntocavel = null;
  const linhas = [];

  for (const bruto of quebrado.split("\n")) {
    const linha = bruto.trim();
    if (!linha) { linhas.push(""); continue; }

    if (dentroDeIntocavel) {
      linhas.push(bruto);
      if (new RegExp(`</\\s*${dentroDeIntocavel}`, "i").test(linha)) dentroDeIntocavel = null;
      continue;
    }

    const fechamento = /^<\//.test(linha);
    if (fechamento) nivel = Math.max(0, nivel - 1);
    linhas.push(" ".repeat(nivel * TAMANHO) + linha);

    const nome = nomeDaTag(linha);
    if (INTOCAVEIS.has(nome) && !new RegExp(`</\\s*${nome}`, "i").test(linha)) {
      dentroDeIntocavel = nome;
      continue;
    }

    // Abre nível quando a linha abre uma tag e não a fecha na mesma linha.
    const abre = /^<[a-zA-Z]/.test(linha)
      && !VAZIOS.has(nome)
      && !/\/>\s*$/.test(linha)
      && !/^<!/.test(linha)
      && !new RegExp(`</\\s*${nome}\\s*>`, "i").test(linha);
    if (abre) nivel += 1;
  }

  return `${linhas.join("\n").replace(/\n{3,}/g, "\n\n")}\n`;
}

export function formatarHtml(html) {
  return seguro(String(html), formatarHtmlCru);
}

/** Formata pelo idioma. Idioma desconhecido devolve o texto como estava. */
export function formatar(codigo, idioma) {
  if (idioma === "html") return formatarHtml(codigo);
  if (idioma === "css") return formatarCss(codigo);
  if (idioma === "js") return formatarJs(codigo);
  return codigo;
}
