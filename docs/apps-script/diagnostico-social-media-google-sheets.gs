/**
 * OUSADIA MARKETING · Backend do Diagnóstico de Social Media (Apps Script)
 * -------------------------------------------------------------------
 * Guarda cada resposta de `/diagnostico/social-media` na aba "Respostas" de
 * uma planilha própria (separada da de IA), monta a aba "Painel" (contagens,
 * médias e gráficos) e devolve ao site a média de quem já fez
 * (GET ?medias=social-media).
 *
 * Planilha separada porque a mentora do Social Media Ousado, Tháscila
 * Lawanda, recebe esses leads (pedido de 18/10/2026). Compartilhe com ela só
 * esta planilha.
 *
 * COMO USAR:
 * 1. No Google Drive, crie uma planilha em branco, por exemplo
 *    "Leads Diagnóstico de Social Media".
 * 2. Na planilha: Extensões > Apps Script. Apague tudo e cole este arquivo.
 *    Salve. (O script fica preso à planilha, então SHEET_ID pode ficar vazio.)
 * 3. Implantar > Nova implantação > tipo "App da Web".
 *    - Executar como: Eu.
 *    - Quem tem acesso: Qualquer pessoa.
 * 4. Autorize o acesso quando o Google pedir.
 * 5. Abra a URL gerada no navegador: deve responder
 *    "Diagnóstico de Social Media online". Se pedir login do Google, a
 *    implantação não ficou pública: repita o passo 3 com "Qualquer pessoa".
 * 6. Cole a URL (termina em `/exec`) em
 *    `SHEET_ENDPOINT_DIAGNOSTICO_SOCIAL_MEDIA`, em `lib/site.ts`.
 * 7. Compartilhe a planilha com a Tháscila (Leitor basta pra ver os leads).
 *
 * Se mudar este código depois: Implantar > Gerenciar implantações > lápis >
 * Versão: "Nova versão". Sem isso a URL continua rodando o código antigo.
 *
 * SEGURANÇA: a URL é pública (precisa ser, pro site gravar). Por isso o script
 * corta cada campo num tamanho máximo, tira = + - @ do começo (viraria
 * fórmula no Sheets), exige e-mail válido e consentimento, e limita os avisos
 * por e-mail a AVISOS_POR_HORA. O GET de médias só devolve números agregados.
 */

// Vazio = a planilha onde este script foi colado (Extensões > Apps Script).
var SHEET_ID = "";

var TESTE = "social-media";
var NOME = "Diagnóstico de Social Media";
var ABA = "Respostas";

// E-mail que recebe aviso de cada resposta. Pra avisar a Tháscila também,
// acrescente o e-mail dela separado por vírgula. Vazio = sem aviso.
var EMAIL_AVISO = "ousadiamkt@gmail.com";

// Máximo de avisos por hora. Passou disso, a resposta é gravada sem aviso.
var AVISOS_POR_HORA = 20;

// Mesma ordem e mesmas chaves de `dimensoes` em `lib/diagnostico-social-media.ts`.
var DIMENSOES = [
  { key: "mentalidade", nome: "Mentalidade empreendedora" },
  { key: "ferramentas", nome: "Ferramentas" },
  { key: "conteudo", nome: "Conteúdo que prende" },
  { key: "negocio", nome: "Vender e cobrar" },
];

// Tamanho máximo de cada campo.
var LIMITE = { respostas: 400, profissao: 120, nome: 120, dificuldade: 120, objetivo: 120 };
var LIMITE_PADRAO = 80;

// Abaixo disso o site não mostra a média (poucos dados, risco de expor alguém).
var MINIMO_PARA_MEDIA = 10;

function colunas() {
  var c = ["data", "nome", "email", "whatsapp", "profissao", "faixa_etaria", "nivel", "pontos"];
  DIMENSOES.forEach(function (d) { c.push(d.key + "_pct"); });
  return c.concat(["dificuldade", "objetivo", "alerta", "respostas", "consentimento", "politica"]);
}

function planilha() {
  return SHEET_ID ? SpreadsheetApp.openById(SHEET_ID) : SpreadsheetApp.getActiveSpreadsheet();
}

function abaRespostas(p) {
  var sheet = p.getSheetByName(ABA);
  // Sem posição fixa: no fim. (O script da v1 gravava na 1ª aba da planilha.)
  if (!sheet) sheet = p.insertSheet(ABA);
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(colunas());
    sheet.setFrozenRows(1);
    sheet.getRange(1, 1, 1, colunas().length).setFontWeight("bold");
    sheet.getRange("A:A").setNumberFormat("dd/MM/yyyy HH:mm");
  }
  return sheet;
}

function doPost(e) {
  var lock = LockService.getScriptLock();
  try {
    var bruto = e && e.postData ? String(e.postData.contents || "") : "";
    if (!bruto || bruto.length > 5000) return json({ ok: false, erro: "envio inválido" });
    var dados = JSON.parse(bruto) || {};

    var email = String(dados.email || "").trim().toLowerCase();
    if (email.length > 120 || !/^[^@\s=+\-][^@\s]*@[^@\s]+\.[^@\s]+$/.test(email)) {
      return json({ ok: false, erro: "e-mail inválido" });
    }
    if (String(dados.consentimento || "") !== "sim") {
      return json({ ok: false, erro: "sem consentimento" });
    }
    if (String(dados.teste || TESTE) !== TESTE) {
      return json({ ok: false, erro: "teste desconhecido" });
    }

    var linha = colunas().map(function (c) {
      if (c === "data") return new Date();
      if (c === "email") return email;
      return limpar(dados[c], LIMITE[c] || LIMITE_PADRAO);
    });

    lock.waitLock(30000);
    var p = planilha();
    var sheet = abaRespostas(p);
    sheet.appendRow(linha);
    if (!p.getSheetByName("Painel")) montarPainel();
    lock.releaseLock();

    if (EMAIL_AVISO && podeAvisar()) {
      MailApp.sendEmail({
        to: EMAIL_AVISO,
        subject: NOME + ": " + limpar(dados.nome, 60) + " (" + limpar(dados.nivel, 40) + ")",
        body:
          "Nova resposta no " + NOME + ":\n\n" +
          "Nome: " + limpar(dados.nome, 120) + "\n" +
          "E-mail: " + email + "\n" +
          "WhatsApp: " + limpar(dados.whatsapp, 40) + "\n" +
          "Profissão: " + limpar(dados.profissao, 120) + "\n" +
          "Faixa etária: " + limpar(dados.faixa_etaria, 40) + "\n" +
          "Nível: " + limpar(dados.nivel, 40) + " (" + limpar(dados.pontos, 10) + " pontos)\n" +
          "Dificuldade: " + limpar(dados.dificuldade, 120) + "\n" +
          "Objetivo: " + limpar(dados.objetivo, 120) + "\n\n" +
          "Planilha: " + p.getUrl(),
      });
    }

    return json({ ok: true });
  } catch (err) {
    try { lock.releaseLock(); } catch (_) {}
    return json({ ok: false, erro: String(err) });
  }
}

/**
 * GET sem parâmetro: teste de que está no ar.
 * GET ?medias=<teste>: média de cada competência (em %) e quantas respostas
 * existem. Só números agregados, nada de dado pessoal. Guardado 10 minutos.
 */
function doGet(e) {
  var pedido = e && e.parameter ? e.parameter.medias : null;
  if (!pedido) return ContentService.createTextOutput(NOME + " online");
  if (pedido !== TESTE) return json({ ok: false, erro: "teste desconhecido" });

  var cache = CacheService.getScriptCache();
  var guardado = cache.get("medias");
  if (guardado) return ContentService.createTextOutput(guardado).setMimeType(ContentService.MimeType.JSON);

  var sheet = planilha().getSheetByName(ABA);
  var resposta = { ok: true, n: 0, dims: null };
  if (sheet && sheet.getLastRow() > 1) {
    var valores = sheet.getDataRange().getValues();
    var cab = valores.shift();
    var linhas = valores.filter(function (l) { return l[1] !== ""; });
    resposta.n = linhas.length;
    if (linhas.length >= MINIMO_PARA_MEDIA) {
      resposta.dims = {};
      DIMENSOES.forEach(function (d) {
        var i = cab.indexOf(d.key + "_pct");
        var nums = linhas.map(function (l) { return Number(l[i]); }).filter(function (v) { return !isNaN(v); });
        var soma = nums.reduce(function (a, b) { return a + b; }, 0);
        resposta.dims[d.key] = nums.length ? Math.round(soma / nums.length) : 0;
      });
    }
  }
  var texto = JSON.stringify(resposta);
  cache.put("medias", texto, 600);
  return ContentService.createTextOutput(texto).setMimeType(ContentService.MimeType.JSON);
}

/**
 * Monta (ou remonta) a aba "Painel": números gerais, média das competências,
 * contagens por nível, dificuldade, objetivo, faixa etária e mês, e gráficos.
 * Tudo é fórmula: atualiza sozinho a cada nova resposta. Roda sozinho na
 * primeira resposta; para refazer, apague a aba Painel e rode esta função no
 * editor (botão Executar).
 */
function montarPainel() {
  var p = planilha();
  abaRespostas(p);
  var velho = p.getSheetByName("Painel");
  if (velho) p.deleteSheet(velho);
  var painel = p.insertSheet("Painel");

  // Separador de argumentos das fórmulas: em planilha em português é ";"
  // (setFormula segue o idioma da planilha). Com "," dá #ERROR!.
  var S = /^(en|ja|zh|ko|th|he|hi)/.test(p.getSpreadsheetLocale()) ? "," : ";";
  var cols = colunas();
  var aba = "'" + ABA + "'";
  var L = function (nome) { return letra(cols.indexOf(nome) + 1); };
  var dados = aba + "!A1:" + letra(cols.length);
  var contaPor = function (nome, rotulo) {
    return '=IFERROR(QUERY(' + dados + S + '"select ' + L(nome) + ', count(B) where B is not null and ' +
      L(nome) + " <> '' group by " + L(nome) + " order by count(B) desc label " + L(nome) + " '" +
      rotulo + "', count(B) 'Pessoas'\"" + S + "1)" + S + "\"Sem respostas ainda\")";
  };

  painel.getRange("A1").setValue("Painel · " + NOME).setFontSize(16).setFontWeight("bold");
  painel.getRange("A2").setValue("Atualiza sozinho a cada resposta. Não edite: as fórmulas leem a aba " + ABA + ".")
    .setFontColor("#666666");

  painel.getRange("A4:B5").setValues([
    ["Total de respostas", "=COUNTA(" + aba + "!B2:B)"],
    ["Últimos 7 dias", "=COUNTIF(" + aba + "!A2:A" + S + '">="&(TODAY()-7))'],
  ]);

  painel.getRange("A7:B7").setValues([["Competência", "Média (%)"]]);
  DIMENSOES.forEach(function (d, k) {
    var c = L(d.key + "_pct");
    painel.getRange(8 + k, 1, 1, 2).setValues([[
      d.nome,
      "=IFERROR(ROUND(AVERAGE(" + aba + "!" + c + "2:" + c + ")" + S + "0)" + S + "\"\")",
    ]]);
  });

  painel.getRange("D3").setValue("Por nível").setFontWeight("bold");
  painel.getRange("D4").setFormula(contaPor("nivel", "Nível"));
  painel.getRange("D11").setValue("Por dificuldade").setFontWeight("bold");
  painel.getRange("D12").setFormula(contaPor("dificuldade", "Dificuldade"));
  painel.getRange("D22").setValue("Por objetivo").setFontWeight("bold");
  painel.getRange("D23").setFormula(contaPor("objetivo", "Objetivo"));
  painel.getRange("G3").setValue("Por faixa etária").setFontWeight("bold");
  painel.getRange("G4").setFormula(contaPor("faixa_etaria", "Faixa etária"));
  painel.getRange("G14").setValue("Por mês").setFontWeight("bold");
  painel.getRange("G15").setFormula(
    '=IFERROR(QUERY(' + dados + S + '"select year(A), month(A)+1, count(B) where A is not null group by year(A), month(A)+1 ' +
    "order by year(A), month(A)+1 label year(A) 'Ano', month(A)+1 'Mês', count(B) 'Pessoas'\"" + S + "1)" + S + "\"Sem respostas ainda\")"
  );

  [1, 4, 7].forEach(function (c) { painel.setColumnWidth(c, 230); });
  painel.getRangeList(["A4:A5", "A7:B7", "D4:E4", "D12:E12", "D23:E23", "G4:H4", "G15:I15"])
    .setFontWeight("bold");

  var grafico = function (tipo, faixa, titulo, linha) {
    painel.insertChart(
      painel.newChart()
        .setChartType(tipo)
        .addRange(painel.getRange(faixa))
        .setNumHeaders(1)
        .setOption("title", titulo)
        .setOption("legend", { position: tipo === Charts.ChartType.PIE ? "right" : "none" })
        .setPosition(linha, 11, 0, 0)
        .build()
    );
  };
  grafico(Charts.ChartType.COLUMN, "A7:B" + (7 + DIMENSOES.length), "Média das competências (%)", 1);
  grafico(Charts.ChartType.PIE, "D4:E8", "Pessoas por nível", 20);
  grafico(Charts.ChartType.BAR, "D12:E19", "O que mais atrapalha", 39);
  grafico(Charts.ChartType.BAR, "D23:E29", "O que querem conquistar", 58);
}

/** 1 → A, 27 → AA. */
function letra(n) {
  var s = "";
  while (n > 0) {
    var r = (n - 1) % 26;
    s = String.fromCharCode(65 + r) + s;
    n = Math.floor((n - 1) / 26);
  }
  return s;
}

/** Texto curto e sem começar com = + - @ (viraria fórmula no Sheets). */
function limpar(v, max) {
  return String(v == null ? "" : v)
    .replace(/[\r\n\t]+/g, " ")
    .trim()
    .slice(0, max)
    .replace(/^[=+\-@]+/, "");
}

/** Conta os avisos da hora corrente; false quando passou do limite. */
function podeAvisar() {
  var cache = CacheService.getScriptCache();
  var chave = "avisos:" + Utilities.formatDate(new Date(), "America/Belem", "yyyyMMddHH");
  var n = Number(cache.get(chave) || 0);
  if (n >= AVISOS_POR_HORA || MailApp.getRemainingDailyQuota() < 1) return false;
  cache.put(chave, String(n + 1), 3600);
  return true;
}

function json(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
