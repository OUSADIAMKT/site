// O montador de documento da landing page. Puro, sem banco e sem node:*.
//
// Mora em api/ porque é o servidor que monta o que vai para o ar, mas o painel
// importa o MESMO arquivo para montar a prévia. São duas montagens diferentes
// de propósito, e a diferença entre elas é a coisa mais importante deste
// módulo:
//
//   montarPrevia      → leva o preâmbulo do modo de teste, e NÃO leva pixel
//                       nem medidor de produção.
//   montarPublicacao  → leva pixel e medidor de produção, e NÃO leva uma linha
//                       do preâmbulo.
//
// Um arquivo só, duas funções, para a diferença ser legível de uma vez. Se o
// modo de teste morasse no painel, a prévia dependeria da tela estar certa; se
// o pixel morasse no painel, o que vai para o ar dependeria do navegador de
// quem publicou. As duas montagens são aqui, e o teste compara as duas.

// ---------------------------------------------------------------------------
// O sandbox do iframe da prévia
//
// O que está escrito aqui é o isolamento inteiro. Em especial o que NÃO está:
//
//   allow-same-origin      JAMAIS. É ele que daria à página importada a mesma
//                          origem do painel, e com isso o cookie, o
//                          localStorage (onde vive o token da sessão) e o
//                          direito de chamar /api/ com credencial. Sem ele o
//                          iframe roda numa origem opaca, que não alcança
//                          nada do painel, e é essa a garantia.
//   allow-top-navigation   sem isso a página não consegue trocar o endereço
//                          da aba do painel por um site qualquer.
//   allow-popups-to-escape-sandbox
//                          sem isso uma aba aberta pela página continua
//                          dentro do mesmo sandbox, e não vira janela livre.
//
// O que está liberado é o que a prévia precisa para ser prévia de verdade:
// script (senão não há animação nem menu), formulário (senão não há validação
// de campo para testar), modal (alert e confirm da página) e popup (link com
// target=_blank, que continua preso ao sandbox).
export const SANDBOX = "allow-scripts allow-forms allow-modals allow-popups";

// ---------------------------------------------------------------------------
// O preâmbulo do modo de teste
//
// Vai como PRIMEIRO script do documento da prévia, antes de qualquer coisa que
// a pessoa importou. A ordem é a regra: script que roda depois não consegue
// impedir o envio que já aconteceu.
//
// É fonte, e não função deste módulo, porque ele roda DENTRO do iframe, que é
// outro mundo: não existe import lá. Fica como texto, é injetado, e o teste
// executa esse mesmo texto com um `window` de mentira para provar que ele
// realmente segura cada caminho de saída.
//
// O que ele segura, e por quê:
//
//   fetch, XMLHttpRequest, sendBeacon  → o formulário da landing page manda o
//     lead para algum lugar. Na prévia não pode nascer lead de verdade, então
//     a chamada é registrada e respondida com um sucesso plausível: assim a
//     página segue para a tela de obrigado e dá para testar a confirmação.
//   fbq, gtag, dataLayer, ttq, _hsq    → conversão. Na prévia o pixel não é
//     nem injetado (ver montarPrevia), mas a página importada pode trazer o
//     dela no HTML: o stub ganha do que a página instalar depois, porque
//     reinstala em cima a cada 250ms durante os primeiros 5 segundos.
//   submit de formulário               → a validação nativa do navegador roda
//     ANTES deste evento, então campo obrigatório vazio continua barrando o
//     envio e dá para testar. O que é impedido aqui é só a navegação.
//   clique em link do WhatsApp, tel: e mailto: → nenhuma mensagem sai.
//   clique em link externo             → não troca o documento da prévia por
//     um site de fora, que apagaria a prévia.
//   window.open                        → registrado, nada abre.
//   localStorage e sessionStorage       → numa origem opaca o simples acesso
//     levanta SecurityError e derruba a página inteira. Um armazenamento de
//     mentira, em memória, deixa a página rodar.
export const PREAMBULO_FONTE = `
function instalarModoDeTeste(j, avisar) {
  var contar = 0;

  j.OUSADIA_MODO_TESTE = true;
  j.OUSADIA_BLOQUEIOS = [];

  function registrar(dado) {
    contar += 1;
    var cheio = Object.assign({ n: contar }, dado);
    j.OUSADIA_BLOQUEIOS.push(cheio);
    try { if (avisar) avisar(cheio); } catch (e) {}
  }

  // --- o aviso dentro da própria prévia ----------------------------------
  //
  // A especificação pede para testar formulário, link, botão de WhatsApp e
  // página de confirmação dentro da prévia. Impedir e anotar na lateral do
  // painel não é testar: quem clica num botão de WhatsApp e não vê NADA
  // acontecer não sabe se o botão está quebrado ou se a prévia segurou.
  //
  // Então o que foi segurado aparece onde os olhos da pessoa estão: uma faixa
  // no pé da página, dizendo o que não saiu e para onde iria publicada.
  //
  // A página de confirmação aparece como endereço, e a faixa NÃO navega para
  // ela de propósito: página de confirmação de verdade é onde mora o pixel de
  // conversão, e abrir aquilo aqui disparava conversão no dataset de produção
  // da Meta, que é exatamente o que o modo de teste promete não fazer.
  //
  // Só aviso de coisa que a pessoa provocou com um clique. Envio por rede e
  // medidor disparam no carregamento, e faixa aparecendo sozinha a cada
  // atualização da prévia seria barulho; esses dois seguem só na lista do
  // painel.
  function enderecoDaConfirmacao() {
    try {
      var c = j.OUSADIA_CONFIG;
      return (c && c.confirmacao) ? String(c.confirmacao) : "";
    } catch (e) { return ""; }
  }

  function fraseDoAviso(dado) {
    var url = String(dado.url || "");
    if (dado.tipo === "formulario") {
      var confirma = enderecoDaConfirmacao();
      return "Modo de teste: o formulário foi validado e nada foi enviado. "
        + "Nenhum lead de verdade foi criado."
        + (confirma ? " Publicada, a página levaria o visitante para " + confirma + "." : "");
    }
    if (dado.tipo === "whatsapp") {
      return "Modo de teste: nenhuma mensagem saiu pelo WhatsApp. "
        + "Publicada, a página abriria " + url;
    }
    if (dado.tipo === "contato") {
      return "Modo de teste: o aplicativo de contato não foi aberto. "
        + "Publicada, a página abriria " + url;
    }
    return "Modo de teste: a prévia não saiu daqui. Publicada, iria para " + url;
  }

  function mostrarAviso(dado) {
    try {
      var d = j.document;
      if (!d || typeof d.createElement !== "function" || !d.body) return;

      var caixa = d.getElementById ? d.getElementById("ousadia-aviso-teste") : null;
      if (!caixa) {
        caixa = d.createElement("div");
        caixa.id = "ousadia-aviso-teste";
        // Estilo na mão, no próprio elemento: o CSS da página importada é da
        // pessoa, e um aviso que depende de classe dela é um aviso que some.
        caixa.setAttribute("style", [
          "position:fixed", "left:0", "right:0", "bottom:0", "z-index:2147483647",
          "background:#0f172a", "color:#f8fafc", "padding:10px 14px",
          "font:500 13px/1.45 system-ui,sans-serif", "text-align:left",
          "box-shadow:0 -6px 20px rgba(0,0,0,.35)", "cursor:pointer",
          "max-height:40vh", "overflow:auto", "word-break:break-word",
        ].join(";"));
        caixa.setAttribute("role", "status");
        caixa.onclick = function () { try { caixa.style.display = "none"; } catch (e) {} };
        d.body.appendChild(caixa);
      }
      caixa.style.display = "block";
      // textContent, nunca innerHTML: o endereço vem do HTML da pessoa.
      caixa.textContent = fraseDoAviso(dado) + "  (clique para fechar)";
    } catch (e) {}
  }

  function segurar(dado) {
    registrar(dado);
    mostrarAviso(dado);
  }

  // --- saída por rede ----------------------------------------------------
  j.fetch = function (entrada, opcoes) {
    var url = typeof entrada === "string" ? entrada : (entrada && entrada.url) || "";
    registrar({
      tipo: "envio", via: "fetch", url: String(url),
      metodo: (opcoes && opcoes.method) || "GET",
    });
    var corpo = JSON.stringify({ ok: true, teste: true });
    if (typeof Response === "function") {
      return Promise.resolve(new Response(corpo, {
        status: 200, headers: { "Content-Type": "application/json" },
      }));
    }
    return Promise.resolve({
      ok: true, status: 200, teste: true,
      json: function () { return Promise.resolve({ ok: true, teste: true }); },
      text: function () { return Promise.resolve(corpo); },
    });
  };

  function RequisicaoDeMentira() {
    this.readyState = 0; this.status = 0; this.responseText = "";
    this.onload = null; this.onreadystatechange = null; this.onerror = null;
  }
  RequisicaoDeMentira.prototype.open = function (metodo, url) {
    this._metodo = metodo; this._url = url;
  };
  RequisicaoDeMentira.prototype.setRequestHeader = function () {};
  RequisicaoDeMentira.prototype.getAllResponseHeaders = function () { return ""; };
  RequisicaoDeMentira.prototype.abort = function () {};
  RequisicaoDeMentira.prototype.send = function () {
    registrar({ tipo: "envio", via: "xhr", url: String(this._url || ""), metodo: this._metodo || "GET" });
    this.readyState = 4; this.status = 200;
    this.responseText = JSON.stringify({ ok: true, teste: true });
    if (this.onreadystatechange) this.onreadystatechange();
    if (this.onload) this.onload();
  };
  j.XMLHttpRequest = RequisicaoDeMentira;

  if (j.navigator) {
    try {
      j.navigator.sendBeacon = function (url) {
        registrar({ tipo: "envio", via: "beacon", url: String(url || ""), metodo: "POST" });
        return true;
      };
    } catch (e) {}
  }

  j.open = function (url) {
    registrar({ tipo: "janela", url: String(url || "") });
    return null;
  };

  // --- conversão ---------------------------------------------------------
  var medidores = ["fbq", "gtag", "ttq", "_hsq", "snaptr", "lintrk", "twq", "pintrk", "uetq"];
  function pararMedidores() {
    for (var i = 0; i < medidores.length; i++) {
      (function (nome) {
        var atual = j[nome];
        if (atual && atual.__ousadia) return;
        var falso = function () {
          var args = Array.prototype.slice.call(arguments);
          registrar({ tipo: "conversao", medidor: nome, argumentos: args.map(String) });
        };
        falso.__ousadia = true;
        falso.push = falso;
        falso.callMethod = falso;
        falso.queue = [];
        falso.loaded = true;
        try { j[nome] = falso; } catch (e) {}
      })(medidores[i]);
    }
    // dataLayer é lista, não função: o que precisa de stub é o push.
    try {
      if (!j.dataLayer) j.dataLayer = [];
      if (!j.dataLayer.__ousadia) {
        j.dataLayer.push = function () {
          var args = Array.prototype.slice.call(arguments);
          registrar({
            tipo: "conversao", medidor: "dataLayer",
            argumentos: args.map(function (a) { return JSON.stringify(a); }),
          });
          return 0;
        };
        j.dataLayer.__ousadia = true;
      }
    } catch (e) {}
  }
  pararMedidores();
  // A página pode instalar o pixel dela depois de nós. Reinstalar por um
  // tempinho é o que garante que o stub é o último a falar.
  if (typeof j.setInterval === "function") {
    var vigia = j.setInterval(pararMedidores, 250);
    if (typeof j.setTimeout === "function") {
      j.setTimeout(function () { j.clearInterval(vigia); }, 5000);
    }
  }

  // --- armazenamento numa origem opaca -----------------------------------
  function guardaDeMentira() {
    var dentro = {};
    return {
      getItem: function (c) {
        return Object.prototype.hasOwnProperty.call(dentro, c) ? dentro[c] : null;
      },
      setItem: function (c, v) { dentro[c] = String(v); },
      removeItem: function (c) { delete dentro[c]; },
      clear: function () { dentro = {}; },
      key: function (i) { return Object.keys(dentro)[i] || null; },
      get length() { return Object.keys(dentro).length; },
    };
  }
  var nomes = ["localStorage", "sessionStorage"];
  for (var k = 0; k < nomes.length; k++) {
    try {
      var sonda = j[nomes[k]];
      if (sonda) sonda.getItem("ousadia-sonda");
      else throw new Error("sem armazenamento");
    } catch (e) {
      try {
        Object.defineProperty(j, nomes[k], { value: guardaDeMentira(), configurable: true });
      } catch (e2) {}
    }
  }

  // --- cliques e formulários ---------------------------------------------
  var doc = j.document;
  if (doc && typeof doc.addEventListener === "function") {
    doc.addEventListener("submit", function (ev) {
      var formulario = ev.target || {};
      var campos = {};
      try {
        var elementos = formulario.elements || [];
        for (var i = 0; i < elementos.length; i++) {
          var campo = elementos[i];
          if (campo.name) {
            campos[campo.name] = campo.type === "password" ? "(oculto)" : String(campo.value || "");
          }
        }
      } catch (e) {}
      ev.preventDefault();
      segurar({ tipo: "formulario", acao: String(formulario.action || ""), campos: campos });
    }, true);

    doc.addEventListener("click", function (ev) {
      var alvo = ev.target;
      while (alvo && alvo.tagName !== "A") alvo = alvo.parentElement;
      if (!alvo) return;
      var href = String(alvo.getAttribute("href") || "");
      if (!href || href.charAt(0) === "#" || href.indexOf("javascript:") === 0) return;

      var baixo = href.toLowerCase();
      var zap = baixo.indexOf("wa.me") >= 0 || baixo.indexOf("api.whatsapp.com") >= 0
        || baixo.indexOf("web.whatsapp.com") >= 0 || baixo.indexOf("whatsapp://") === 0;
      if (zap) {
        ev.preventDefault();
        segurar({ tipo: "whatsapp", url: href });
        return;
      }
      if (baixo.indexOf("tel:") === 0 || baixo.indexOf("mailto:") === 0 || baixo.indexOf("sms:") === 0) {
        ev.preventDefault();
        segurar({ tipo: "contato", url: href });
        return;
      }
      if (/^https?:/i.test(href)) {
        ev.preventDefault();
        segurar({ tipo: "link", url: href });
      }
    }, true);
  }

  return j.OUSADIA_BLOQUEIOS;
}
`;

// ---------------------------------------------------------------------------
// Apelido, que é endereço
//
// O mesmo formato do check da migração 045. Vale nos dois lugares de
// propósito: aqui para a pessoa ver o apelido corrigido enquanto digita, e lá
// porque o banco é quem recusa de verdade.
export function normalizarSlug(texto) {
  return String(texto || "")
    .normalize("NFD").replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+/, "")
    .slice(0, 60)
    .replace(/-+$/, "");
}

export function slugValido(slug) {
  return /^[a-z0-9]([a-z0-9-]{0,58}[a-z0-9])?$/.test(String(slug || ""));
}

// ---------------------------------------------------------------------------
// O conteúdo em forma canônica
//
// É sobre esta string que a impressão digital é calculada. Precisa ser
// estável: a mesma página tem que dar a mesma string hoje e amanhã, mesmo que
// as chaves das configurações cheguem em outra ordem de um JSON do banco.
export function canonico(valor) {
  if (Array.isArray(valor)) return valor.map(canonico);
  if (valor && typeof valor === "object") {
    const saida = {};
    for (const chave of Object.keys(valor).sort()) saida[chave] = canonico(valor[chave]);
    return saida;
  }
  return valor;
}

export function serializar({ html = "", css = "", js = "", configuracoes = {} } = {}) {
  return JSON.stringify([String(html), String(css), String(js), canonico(configuracoes || {})]);
}

// ---------------------------------------------------------------------------
// Montagem
//
// `</script>` dentro do corpo de um script fecha a tag, mesmo dentro de uma
// string JavaScript: é o parser de HTML que vê, e ele não sabe o que é string.
// Um `</script>` solto no JS importado quebraria o documento inteiro.
function corpoDeScript(js) {
  return String(js || "").replace(/<\/(script)/gi, "<\\/$1");
}

function corpoDeEstilo(css) {
  return String(css || "").replace(/<\/(style)/gi, "<\\/$1");
}

function escapar(texto) {
  return String(texto || "")
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// Documento inteiro, a partir do que a pessoa importou.
//
// Quem importa um .html exportado de qualquer ferramenta traz <html>, <head> e
// <body>. Quem cola um pedaço traz só o miolo. Os dois têm que render, então
// pedaço ganha um documento em volta.
function emDocumento(html, idioma) {
  const texto = String(html || "");
  if (/<html[\s>]/i.test(texto)) return texto;
  return `<!doctype html>
<html lang="${escapar(idioma || "pt-BR")}">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head>
<body>
${texto}
</body>
</html>`;
}

// Enfia pedaços logo depois da abertura do <head>. Sem <head>, abre um logo
// depois da abertura do <html>; sem <html>, vai no começo.
function naCabeca(documento, pedaco) {
  if (!pedaco || !pedaco.trim()) return documento;
  const cabeca = documento.match(/<head[^>]*>/i);
  if (cabeca) {
    const i = documento.indexOf(cabeca[0]) + cabeca[0].length;
    return `${documento.slice(0, i)}\n${pedaco}${documento.slice(i)}`;
  }
  const abre = documento.match(/<html[^>]*>/i);
  if (abre) {
    const i = documento.indexOf(abre[0]) + abre[0].length;
    return `${documento.slice(0, i)}\n<head>\n${pedaco}\n</head>${documento.slice(i)}`;
  }
  return `${pedaco}\n${documento}`;
}

// Enfia pedaços imediatamente antes do </body>, que é onde script de página
// mora: o DOM já existe quando ele roda.
function noFim(documento, pedaco) {
  if (!pedaco || !pedaco.trim()) return documento;
  const i = documento.toLowerCase().lastIndexOf("</body>");
  if (i < 0) return `${documento}\n${pedaco}`;
  return `${documento.slice(0, i)}${pedaco}\n${documento.slice(i)}`;
}

function estilo(css) {
  const corpo = corpoDeEstilo(css);
  return corpo.trim() ? `<style data-ousadia="css">\n${corpo}\n</style>` : "";
}

function script(js) {
  const corpo = corpoDeScript(js);
  return corpo.trim() ? `<script data-ousadia="js">\n${corpo}\n</script>` : "";
}

function cabecalhoDeConfig(config) {
  const partes = [];
  if (config.titulo) partes.push(`<title>${escapar(config.titulo)}</title>`);
  if (config.descricao) partes.push(`<meta name="description" content="${escapar(config.descricao)}">`);
  if (config.robots === false) partes.push('<meta name="robots" content="noindex,nofollow">');
  return partes.join("\n");
}

// O que a página importada pode ler para saber com quem falar. Os mesmos
// nomes nas duas montagens, e `teste` é o que diz qual das duas é.
function configuracaoDaPagina(config, teste) {
  const dado = {
    teste: Boolean(teste),
    whatsapp: config.whatsapp || null,
    formulario: config.formulario_url || null,
    confirmacao: config.confirmacao_url || null,
  };
  return `<script data-ousadia="config">window.OUSADIA_CONFIG=${JSON.stringify(dado)};</script>`;
}

/**
 * O documento da prévia: com o modo de teste, sem nada de produção.
 *
 * `avisarNoPai` liga o relato de cada bloqueio para a janela de cima, que é
 * como o painel escreve a lista do que a prévia impediu. Dá para desligar no
 * teste automatizado, que monta sem janela nenhuma em volta.
 */
export function montarPrevia(conteudo = {}, { avisarNoPai = true } = {}) {
  const config = canonico(conteudo.configuracoes || {});
  let documento = emDocumento(conteudo.html, config.idioma);

  const relato = avisarNoPai
    ? 'function(dado){try{parent.postMessage({ousadia:"previa",dado:dado},"*")}catch(e){}}'
    : "null";

  const preambulo = `<script data-ousadia="modo-de-teste">
${PREAMBULO_FONTE}
instalarModoDeTeste(window, ${relato});
</script>`;

  // O preâmbulo primeiro, o resto depois: nada além dele precisa ser o
  // primeiro, e ele precisa ser o primeiro.
  documento = naCabeca(documento, [
    preambulo,
    configuracaoDaPagina(config, true),
    cabecalhoDeConfig(config),
  ].filter(Boolean).join("\n"));

  return noFim(documento, `${estilo(conteudo.css)}\n${script(conteudo.js)}`);
}

/**
 * O documento publicado: com pixel e medidor de produção, sem uma linha do
 * modo de teste.
 *
 * É esta função que gera os bytes gravados em `paginas.publicado_html`, e são
 * esses bytes que /p/<slug> serve. Remontar na hora da visita deixaria a
 * página no ar mudar porque este arquivo mudou.
 */
/**
 * O medidor do CRM, que só existe na página publicada.
 *
 * Conta duas coisas, e só duas: a visita (carregou a página) e o lead (mandou
 * um formulário dentro dela). Não guarda quem: nem IP, nem identificador de
 * pessoa, nem user agent. O painel pede quantidade, e quantidade é o que sai
 * daqui.
 *
 * Três cuidados que não são óbvios:
 *
 * 1. Não conta quando a página está dentro de um quadro. A miniatura do
 *    cartão na galeria é a página de verdade num iframe reduzido, e cada
 *    abertura do painel somaria uma visita que não existiu.
 *
 * 2. Endereço relativo. A mesma página é servida pelo endereço do CRM e
 *    pelo domínio do cliente, e os dois chegam no mesmo projeto: endereço
 *    absoluto quebraria num dos dois.
 *
 * 3. Tudo dentro de try/catch e sem await de nada. Medição que derruba a
 *    landing page do cliente é pior do que não medir.
 */
function medidorDoCRM(paginaId) {
  if (!paginaId) return "";
  return `<script data-ousadia="medidor">
(function () {
  try {
    if (window.top !== window.self) return;
    var alvo = "/api/report?rota=pagina-evento";
    function contar(tipo) {
      try {
        var corpo = JSON.stringify({ pagina: ${JSON.stringify(String(paginaId))}, tipo: tipo });
        if (navigator.sendBeacon) {
          navigator.sendBeacon(alvo, new Blob([corpo], { type: "application/json" }));
          return;
        }
        fetch(alvo, {
          method: "POST", keepalive: true,
          headers: { "Content-Type": "application/json" }, body: corpo,
        }).catch(function () {});
      } catch (e) {}
    }
    contar("visita");
    document.addEventListener("submit", function () { contar("lead"); }, true);
  } catch (e) {}
})();
</script>`;
}

export function montarPublicacao(conteudo = {}) {
  const config = canonico(conteudo.configuracoes || {});
  let documento = emDocumento(conteudo.html, config.idioma);

  const medidores = [];
  if (config.pixel_meta) {
    const id = String(config.pixel_meta).replace(/[^0-9]/g, "");
    if (id) {
      medidores.push(`<script data-ousadia="pixel">
!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?
n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;
n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;
t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,
document,'script','https://connect.facebook.net/en_US/fbevents.js');
fbq('init','${id}');fbq('track','PageView');
</script>`);
    }
  }
  if (config.ga4) {
    const id = String(config.ga4).replace(/[^A-Za-z0-9-]/g, "");
    if (id) {
      medidores.push(`<script async src="https://www.googletagmanager.com/gtag/js?id=${escapar(id)}"></script>
<script data-ousadia="ga4">
window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments)}
gtag('js',new Date());gtag('config','${escapar(id)}');
</script>`);
    }
  }

  documento = naCabeca(documento, [
    cabecalhoDeConfig(config),
    configuracaoDaPagina(config, false),
    ...medidores,
    medidorDoCRM(conteudo.pagina_id),
  ].filter(Boolean).join("\n"));

  return noFim(documento, `${estilo(conteudo.css)}\n${script(conteudo.js)}`);
}

// As medidas de tela da prévia. Ficam aqui, e não na tela, porque o teste
// confere a lista: largura personalizada é a quinta opção, e não uma troca
// das outras quatro.
export const FORMATOS = [
  { chave: "desktop", nome: "Desktop", largura: 1440, altura: 900 },
  { chave: "notebook", nome: "Notebook", largura: 1280, altura: 800 },
  { chave: "tablet", nome: "Tablet", largura: 768, altura: 1024 },
  { chave: "smartphone", nome: "Smartphone", largura: 390, altura: 844 },
];
