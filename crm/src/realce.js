// Destaque de sintaxe para HTML, CSS e JavaScript.
//
// Escrito aqui, sem dependência nova, e a razão é de peso: um editor de código
// de verdade (CodeMirror, Monaco) é entre 300 KB e 2 MB no pacote do painel,
// que hoje inteiro não chega perto disso. O editor desta tela precisa de
// numeração de linha, destaque, procurar e substituir, desfazer e formatar.
// Tudo isso cabe em três arquivos pequenos sobre um <textarea>, e o <textarea>
// traz de graça o que é mais difícil de imitar: seleção, acentuação, teclado
// de celular, leitor de tela e rolagem nativa.
//
// Como funciona o destaque: o texto colorido é um <pre> ATRÁS do <textarea>,
// alinhado caractere a caractere, e o <textarea> fica com o texto
// transparente e o cursor visível. Isso exige que os dois usem exatamente a
// mesma fonte, o mesmo tamanho e a mesma altura de linha, e é por isso que o
// CSS dessas duas camadas está junto, com um comentário dizendo que não se
// mexe numa sem a outra.
//
// O destaque é por expressão regular, e isso tem limite conhecido: ele não
// entende contexto. `/` pode ser divisão ou início de expressão regular, e
// aqui ele é divisão sempre. Para escrever e revisar landing page, que é o que
// esta tela faz, o limite não aparece. Está dito para quem vier depois não
// descobrir sozinho.

function escapar(texto) {
  return String(texto)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function marca(classe, texto) {
  return `<span class="re-${classe}">${escapar(texto)}</span>`;
}

// ---------------------------------------------------------------------------
// JavaScript

const PALAVRAS = new Set([
  "const", "let", "var", "function", "return", "if", "else", "for", "while", "do",
  "break", "continue", "new", "class", "extends", "super", "this", "typeof",
  "instanceof", "in", "of", "try", "catch", "finally", "throw", "switch", "case",
  "default", "delete", "void", "yield", "async", "await", "static", "import",
  "export", "from", "as", "with",
]);

const LITERAIS = new Set(["true", "false", "null", "undefined", "NaN", "Infinity"]);

const RE_JS = /(\/\*[\s\S]*?\*\/|\/\/[^\n]*)|('(?:\\[\s\S]|[^'\\\n])*'|"(?:\\[\s\S]|[^"\\\n])*"|`(?:\\[\s\S]|[^`\\])*`)|\b(0[xX][0-9a-fA-F]+|\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)\b|([A-Za-z_$][\w$]*)/g;

export function realcarJs(codigo) {
  let saida = "";
  let fim = 0;
  const texto = String(codigo);

  for (const achado of texto.matchAll(RE_JS)) {
    const [inteiro, comentario, cadeia, numero, nome] = achado;
    saida += escapar(texto.slice(fim, achado.index));
    fim = achado.index + inteiro.length;

    if (comentario) { saida += marca("comentario", inteiro); continue; }
    if (cadeia) { saida += marca("cadeia", inteiro); continue; }
    if (numero) { saida += marca("numero", inteiro); continue; }

    if (PALAVRAS.has(nome)) { saida += marca("palavra", inteiro); continue; }
    if (LITERAIS.has(nome)) { saida += marca("literal", inteiro); continue; }

    // Nome seguido de abre-parêntese é chamada de função. O olho usa isso
    // para achar onde o código faz algo, e é o destaque que mais ajuda depois
    // de string e comentário.
    const depois = texto.slice(fim).match(/^\s*\(/);
    saida += depois ? marca("funcao", inteiro) : escapar(inteiro);
  }

  return saida + escapar(texto.slice(fim));
}

// ---------------------------------------------------------------------------
// CSS

const RE_CSS = /(\/\*[\s\S]*?\*\/)|("(?:\\[\s\S]|[^"\\\n])*"|'(?:\\[\s\S]|[^'\\\n])*')|(@[\w-]+)|(#[0-9a-fA-F]{3,8}\b)|(-?\d*\.?\d+(?:px|em|rem|ex|ch|%|vh|vw|vmin|vmax|fr|s|ms|deg|turn|pt|cm|mm)?)|([-\w]+)(?=\s*:)|(![\w-]+)/g;

export function realcarCss(codigo) {
  let saida = "";
  let fim = 0;
  const texto = String(codigo);

  for (const achado of texto.matchAll(RE_CSS)) {
    const [inteiro, comentario, cadeia, arroba, cor, numero, propriedade, importante] = achado;
    saida += escapar(texto.slice(fim, achado.index));
    fim = achado.index + inteiro.length;

    if (comentario) saida += marca("comentario", inteiro);
    else if (cadeia) saida += marca("cadeia", inteiro);
    else if (arroba) saida += marca("palavra", inteiro);
    else if (cor) saida += marca("cor", inteiro);
    else if (numero) saida += marca("numero", inteiro);
    else if (propriedade) saida += marca("propriedade", inteiro);
    else if (importante) saida += marca("palavra", inteiro);
    else saida += escapar(inteiro);
  }

  return saida + escapar(texto.slice(fim));
}

// ---------------------------------------------------------------------------
// HTML
//
// Varre por tag, não por caractere. Dentro de cada tag, o nome e os atributos
// ganham cor numa segunda passada; fora das tags é texto comum. Bloco de
// <script> e de <style> é entregue ao destacador da linguagem certa, que é o
// que faz um HTML de uma página só ficar legível.

const RE_TAG = /<!--[\s\S]*?-->|<!\[CDATA\[[\s\S]*?\]\]>|<!doctype[^>]*>|<(script|style)\b[^>]*>[\s\S]*?<\/\1\s*>|<\/?[a-zA-Z][^>]*>/gi;

const RE_DENTRO = /^(<\/?)([a-zA-Z][\w:-]*)([\s\S]*?)(\/?>)$/;
const RE_ATRIBUTO = /([-\w:@.[\]()]+)(\s*=\s*)("[^"]*"|'[^']*'|[^\s>]+)|([-\w:@.]+)/g;

function realcarAtributos(trecho) {
  let saida = "";
  let fim = 0;

  for (const achado of trecho.matchAll(RE_ATRIBUTO)) {
    const [inteiro, nome, igual, valor, sozinho] = achado;
    saida += escapar(trecho.slice(fim, achado.index));
    fim = achado.index + inteiro.length;

    if (nome) saida += marca("atributo", nome) + escapar(igual) + marca("cadeia", valor);
    else saida += marca("atributo", sozinho);
  }

  return saida + escapar(trecho.slice(fim));
}

function realcarTag(tag) {
  const partes = tag.match(RE_DENTRO);
  if (!partes) return marca("tag", tag);
  const [, abre, nome, dentro, fecha] = partes;
  return marca("pontuacao", abre) + marca("tag", nome)
    + realcarAtributos(dentro) + marca("pontuacao", fecha);
}

// Um bloco inteiro de <script> ou <style>: tag de abertura, corpo pela
// linguagem de dentro, tag de fechamento.
function realcarBloco(bloco, linguagem) {
  const partes = bloco.match(/^(<[^>]*>)([\s\S]*)(<\/[a-zA-Z]+\s*>)$/);
  if (!partes) return realcarTag(bloco);
  const [, abertura, corpo, fechamento] = partes;
  const dentro = linguagem === "style" ? realcarCss(corpo) : realcarJs(corpo);
  return realcarTag(abertura) + dentro + realcarTag(fechamento);
}

export function realcarHtml(codigo) {
  let saida = "";
  let fim = 0;
  const texto = String(codigo);

  for (const achado of texto.matchAll(RE_TAG)) {
    const inteiro = achado[0];
    const bloco = achado[1];
    saida += escapar(texto.slice(fim, achado.index));
    fim = achado.index + inteiro.length;

    if (inteiro.startsWith("<!--")) saida += marca("comentario", inteiro);
    else if (/^<!doctype/i.test(inteiro)) saida += marca("palavra", inteiro);
    else if (bloco) saida += realcarBloco(inteiro, bloco.toLowerCase());
    else saida += realcarTag(inteiro);
  }

  return saida + escapar(texto.slice(fim));
}

/**
 * O destaque de um dos três idiomas do compositor.
 *
 * Idioma desconhecido devolve o texto escapado, sem cor: é melhor um editor
 * sem cor do que um editor que engole caractere.
 */
export function realcar(codigo, idioma) {
  if (idioma === "html") return realcarHtml(codigo);
  if (idioma === "css") return realcarCss(codigo);
  if (idioma === "js") return realcarJs(codigo);
  return escapar(codigo);
}
