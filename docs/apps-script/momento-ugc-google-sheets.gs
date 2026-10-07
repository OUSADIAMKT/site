/**
 * OUSADIA MARKETING · Backend do "Qual é o seu Momento UGC?" (Google Apps Script)
 * -------------------------------------------------------------------------------
 * Para cada menina que faz o diagnóstico em `/momento-ugc`, este script:
 *   1. grava todas as respostas numa planilha no seu Google Drive (aba "Respostas");
 *   2. manda pro e-mail DELA o diagnóstico completo (momento, travas, o que fazer,
 *      o que estudar, o que assistir e as próximas vitórias);
 *   3. mantém a aba "Painel" com a contagem da pesquisa (momentos, desejos,
 *      crenças, bloqueios, medos, tipo de ajuda...), atualizada sozinha;
 *   4. manda pra Ousadia um resumo por dia, em vez de um e-mail por resposta.
 * Tudo gratuito. Mesmo padrão dos outros scripts desta pasta.
 *
 * ⚠ LIMITE DE E-MAIL DO GOOGLE: uma conta Gmail comum envia no máximo ~100
 * e-mails por dia pelo Apps Script (Google Workspace: ~1.500). Se o grupo
 * inteiro responder no mesmo dia, as respostas são gravadas normalmente e os
 * e-mails que passarem do limite ficam "pendente" na planilha. A rotina
 * `reenviarPendentes` (instalada no passo 6) manda o restante nos dias
 * seguintes, sozinha. Por isso a página avisa que o e-mail "pode levar
 * algumas horas".
 *
 * COMO USAR (uma vez só):
 * 1. No Google Drive, crie uma planilha nova (ex.: "Momento UGC — respostas").
 * 2. Na planilha: Extensões > Apps Script. Apague o conteúdo e cole este arquivo.
 * 3. Ajuste EMAIL_AVISO abaixo, se quiser outro e-mail pro resumo diário.
 * 4. Salve (ícone de disquete). No topo, escolha a função `configurar` e clique
 *    em Executar. Autorize quando o Google pedir ("Avançado" > "Acessar…" se
 *    aparecer o aviso de app não verificado: o app é você mesmo).
 *    Isso cria as abas "Respostas" e "Painel" e instala as rotinas automáticas.
 * 5. Implantar > Nova implantação > tipo "App da Web".
 *    - Executar como: Eu.
 *    - Quem tem acesso: Qualquer pessoa.
 * 6. Teste a URL gerada no navegador: deve responder "Momento UGC online".
 *    Se pedir login do Google, a implantação não ficou pública: repita o
 *    passo 5 escolhendo "Qualquer pessoa".
 * 7. Cole a URL (termina em `/exec`) em `SHEET_ENDPOINT_MOMENTO_UGC`, no
 *    arquivo `lib/site.ts` do site.
 *
 * Se mudar este código depois: Implantar > Gerenciar implantações > lápis >
 * Versão: "Nova versão". Sem isso a URL continua rodando o código antigo.
 */

// E-mail que recebe o resumo diário. Vazio = sem resumo.
var EMAIL_AVISO = "ousadiamkt@gmail.com";

// true = também avisa a cada resposta (gasta a cota de e-mail que vai pras meninas).
var AVISO_A_CADA_RESPOSTA = false;

// Nome que aparece como remetente no e-mail da menina.
var REMETENTE = "Juh · Mapa do UGC";

var ABA_RESPOSTAS = "Respostas";
var ABA_PAINEL = "Painel";

// Ordem das colunas — as chaves têm que bater com `payloadPlanilha()` em
// `lib/momento-ugc.ts`. As duas últimas são preenchidas por este script.
var COLUNAS = [
  "data",
  "nome",
  "whatsapp",
  "email",
  "instagram",
  "faixa_idade",
  "menor_de_idade",
  "ddd",
  "uf",
  "momento",
  "frase_momento",
  "perfil_clt",
  "perfil_conta_propria",
  "perfil_estuda",
  "perfil_sem_renda",
  "perfil_mae",
  "perfil_mae_solo",
  "perfil_cuida_casa",
  "desejo",
  "desejo_outro",
  "meta",
  "crenca",
  "crenca_outro",
  "bloqueio",
  "bloqueio_outro",
  "medo",
  "medo_outro",
  "ajuda",
  "pergunta_para_juh",
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "email_status",
  "email_conteudo",
];

/* ------------------------------------------------------------------ *
 * Recebe cada resposta do site
 * ------------------------------------------------------------------ */

function doPost(e) {
  var lock = LockService.getScriptLock();
  try {
    var dados = JSON.parse(e.postData.contents);
    if (!String(dados.nome || "").trim()) return json({ ok: false, erro: "nome vazio" });

    var conteudo = dados.email_conteudo || null;
    dados.email_conteudo = conteudo ? JSON.stringify(conteudo) : "";
    dados.email_status = "pendente";

    // Várias meninas podem responder no mesmo segundo: a trava evita que duas
    // gravações disputem a mesma linha.
    lock.waitLock(30000);
    var sheet = abaRespostas();
    var linha = COLUNAS.map(function (c) {
      return c === "data" ? new Date() : String(dados[c] == null ? "" : dados[c]);
    });
    sheet.appendRow(linha);
    var numLinha = sheet.getLastRow();
    lock.releaseLock();

    var status = enviarDiagnostico(dados.email, conteudo);
    sheet.getRange(numLinha, COLUNAS.indexOf("email_status") + 1).setValue(status);

    if (AVISO_A_CADA_RESPOSTA && EMAIL_AVISO && MailApp.getRemainingDailyQuota() > 0) {
      MailApp.sendEmail({
        to: EMAIL_AVISO,
        subject: "Momento UGC: " + dados.nome + " (" + dados.momento + ")",
        body:
          "Nome: " + dados.nome + "\nWhatsApp: " + dados.whatsapp + "\nE-mail: " + dados.email +
          "\nMomento: " + dados.momento + "\nCrença: " + dados.crenca + "\nBloqueio: " + dados.bloqueio +
          "\nMedo: " + dados.medo + "\nPergunta pra Juh: " + (dados.pergunta_para_juh || "—"),
      });
    }

    return json({ ok: true });
  } catch (err) {
    try { lock.releaseLock(); } catch (_) {}
    return json({ ok: false, erro: String(err) });
  }
}

// Permite testar a URL no navegador.
function doGet() {
  return ContentService.createTextOutput("Momento UGC online");
}

function json(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

/* ------------------------------------------------------------------ *
 * E-mail da menina
 * ------------------------------------------------------------------ */

/** Devolve o status que vai pra planilha: enviado, pendente, sem e-mail ou erro. */
function enviarDiagnostico(email, c) {
  email = String(email || "").trim();
  if (!email || !c) return "sem e-mail";
  if (MailApp.getRemainingDailyQuota() < 1) return "pendente";
  try {
    MailApp.sendEmail({
      to: email,
      name: REMETENTE,
      subject: c.primeiro_nome + ", o seu Momento UGC é " + c.momento,
      htmlBody: htmlEmail(c),
      body: textoEmail(c),
    });
    return "enviado " + Utilities.formatDate(new Date(), "America/Belem", "dd/MM HH:mm");
  } catch (err) {
    return "erro: " + String(err).slice(0, 120);
  }
}

function esc(s) {
  return String(s == null ? "" : s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

var COR = { roxo: "#2a1150", amarelo: "#f5c518", texto: "#2b2238", cinza: "#6b6178", fundo: "#f6f3fa" };

function titulo(t) {
  return '<h2 style="margin:32px 0 12px;font-size:19px;color:' + COR.roxo + ';">' + esc(t) + "</h2>";
}

function lista(itens) {
  return (
    '<ul style="margin:0;padding-left:20px;">' +
    itens.map(function (i) { return '<li style="margin:0 0 8px;">' + esc(i) + "</li>"; }).join("") +
    "</ul>"
  );
}

function botao(href, rotulo, primario) {
  return (
    '<a href="' + esc(href) + '" style="display:inline-block;margin:6px 6px 0 0;padding:12px 20px;border-radius:999px;' +
    "font-weight:bold;text-decoration:none;" +
    (primario ? "background:" + COR.amarelo + ";color:" + COR.roxo + ";" : "border:2px solid " + COR.roxo + ";color:" + COR.roxo + ";") +
    '">' + esc(rotulo) + "</a>"
  );
}

function htmlEmail(c) {
  var h = "";
  h += '<div style="background:' + COR.fundo + ';padding:24px 12px;font-family:Arial,Helvetica,sans-serif;color:' + COR.texto + ';line-height:1.55;font-size:15px;">';
  h += '<div style="max-width:600px;margin:0 auto;background:#ffffff;border-radius:16px;overflow:hidden;">';

  // Topo
  h += '<div style="background:' + COR.roxo + ';color:#ffffff;padding:32px 28px;">';
  h += '<p style="margin:0 0 20px;font-size:16px;">' + esc(c.abertura) + "</p>";
  h += '<p style="margin:0;font-size:12px;letter-spacing:2px;text-transform:uppercase;color:' + COR.amarelo + ';">Seu Momento UGC</p>';
  h += '<p style="margin:6px 0 0;font-size:28px;font-weight:bold;">' + esc(c.momento) + "</p>";
  h += '<p style="margin:10px 0 0;font-size:17px;color:' + COR.amarelo + ';">“' + esc(c.frase) + "”</p>";
  h += "</div>";

  h += '<div style="padding:8px 28px 32px;">';

  h += titulo("Seu diagnóstico");
  h += "<p style=\"margin:0;\">" + esc(c.diagnostico) + "</p>";

  h += titulo("O que está te travando");
  c.travas.forEach(function (t) {
    h += '<div style="margin:0 0 12px;padding:14px 16px;border-left:4px solid ' + COR.amarelo + ';background:' + COR.fundo + ';border-radius:8px;">';
    h += '<p style="margin:0;font-size:11px;letter-spacing:1px;text-transform:uppercase;color:' + COR.cinza + ';">' + esc(t.titulo) + "</p>";
    h += '<p style="margin:4px 0 6px;font-weight:bold;">' + esc(t.escolha) + "</p>";
    h += '<p style="margin:0;">' + esc(t.texto) + "</p>";
    h += "</div>";
  });

  h += titulo("O que você precisa fazer agora");
  h += '<div style="margin:0 0 14px;padding:14px 16px;border:2px solid ' + COR.amarelo + ';border-radius:10px;">';
  h += '<p style="margin:0;font-size:11px;letter-spacing:1px;text-transform:uppercase;color:' + COR.cinza + ';">Sua tarefa de hoje</p>';
  h += '<p style="margin:4px 0 0;">' + esc(c.tarefa) + "</p></div>";
  h += lista(c.fazer);

  h += titulo("Aula do seu momento");
  h += c.video_url
    ? '<p style="margin:0 0 8px;">' + esc(c.video_tema) + "</p>" + botao(c.video_url, "Assistir no YouTube", true)
    : '<p style="margin:0;"><strong>' + esc(c.video_tema) + "</strong><br>A Juh está preparando esta aula. Ela vai chegar primeiro no grupo do WhatsApp.</p>";

  h += titulo("O que começar a estudar");
  h += lista(c.estudar);

  h += titulo("Pra assistir e se inspirar");
  c.assistir.forEach(function (f) {
    h += '<p style="margin:0 0 12px;"><strong>' + esc(f.titulo) + "</strong> <span style=\"color:" + COR.cinza + ';font-size:13px;">(' + esc(f.tipo) + ")</span><br>" + esc(f.porque) + "</p>";
  });

  h += titulo("Suas próximas vitórias");
  c.vitorias.forEach(function (v, i) {
    h += '<p style="margin:0 0 10px;"><strong style="color:' + COR.roxo + ';">' + (i + 1) + ". " + esc(v.titulo) + ":</strong> " + esc(v.texto) + "</p>";
  });

  if (c.aviso_menor) {
    h += '<p style="margin:20px 0 0;padding:14px 16px;background:#e8f4fb;border-radius:8px;">' + esc(c.aviso_menor) + "</p>";
  }

  h += '<div style="margin:32px 0 0;padding:20px;background:' + COR.fundo + ';border-radius:12px;text-align:center;">';
  h += '<p style="margin:0 0 10px;font-weight:bold;">Fez a tarefa? Volte pro grupo e conte pra gente 💛</p>';
  h += botao(c.grupo_url, "Voltar pro grupo", true) + botao(c.whatsapp_url, "Falar com a Juh", false);
  h += "</div>";

  h += "</div></div>";
  h += '<p style="max-width:600px;margin:16px auto 0;font-size:12px;color:' + COR.cinza + ';text-align:center;">';
  h += "Você recebeu este e-mail porque fez o diagnóstico Qual é o seu Momento UGC? no site da Ousadia Marketing. ";
  h += "Se não quiser mais receber, é só responder este e-mail com a palavra SAIR.</p>";
  h += "</div>";
  return h;
}

/** Versão em texto puro, pra quem lê e-mail sem HTML. */
function textoEmail(c) {
  var t = [];
  t.push(c.abertura, "", "SEU MOMENTO UGC: " + c.momento, "“" + c.frase + "”", "");
  t.push("SEU DIAGNÓSTICO", c.diagnostico, "");
  t.push("O QUE ESTÁ TE TRAVANDO");
  c.travas.forEach(function (x) { t.push("- " + x.titulo + ": " + x.escolha, "  " + x.texto); });
  t.push("", "SUA TAREFA DE HOJE", c.tarefa, "", "O QUE VOCÊ PRECISA FAZER AGORA");
  c.fazer.forEach(function (x) { t.push("- " + x); });
  t.push("", "AULA DO SEU MOMENTO", c.video_tema + (c.video_url ? " — " + c.video_url : " (em breve no grupo)"));
  t.push("", "O QUE COMEÇAR A ESTUDAR");
  c.estudar.forEach(function (x) { t.push("- " + x); });
  t.push("", "PRA ASSISTIR");
  c.assistir.forEach(function (x) { t.push("- " + x.titulo + " (" + x.tipo + "): " + x.porque); });
  t.push("", "SUAS PRÓXIMAS VITÓRIAS");
  c.vitorias.forEach(function (x, i) { t.push(i + 1 + ". " + x.titulo + ": " + x.texto); });
  if (c.aviso_menor) t.push("", c.aviso_menor);
  t.push("", "Grupo: " + c.grupo_url, "Falar com a Juh: " + c.whatsapp_url);
  t.push("", "Para não receber mais, responda este e-mail com SAIR.");
  return t.join("\n");
}

/* ------------------------------------------------------------------ *
 * Rotinas automáticas (instaladas pelo `configurar`)
 * ------------------------------------------------------------------ */

/** Manda os e-mails que ficaram "pendente" por causa do limite diário. */
function reenviarPendentes() {
  var sheet = abaRespostas();
  var n = sheet.getLastRow() - 1;
  if (n < 1) return;
  var colStatus = COLUNAS.indexOf("email_status") + 1;
  var colEmail = COLUNAS.indexOf("email") + 1;
  var colConteudo = COLUNAS.indexOf("email_conteudo") + 1;
  var dados = sheet.getRange(2, 1, n, COLUNAS.length).getValues();

  for (var i = 0; i < dados.length; i++) {
    if (String(dados[i][colStatus - 1]) !== "pendente") continue;
    if (MailApp.getRemainingDailyQuota() < 1) break;
    var conteudo = null;
    try { conteudo = JSON.parse(dados[i][colConteudo - 1]); } catch (_) {}
    var status = enviarDiagnostico(dados[i][colEmail - 1], conteudo);
    sheet.getRange(i + 2, colStatus).setValue(status);
  }
}

/** Resumo das últimas 24h pra Ousadia. */
function resumoDiario() {
  if (!EMAIL_AVISO || MailApp.getRemainingDailyQuota() < 1) return;
  var sheet = abaRespostas();
  var n = sheet.getLastRow() - 1;
  if (n < 1) return;
  var dados = sheet.getRange(2, 1, n, COLUNAS.length).getValues();
  var desde = new Date(Date.now() - 24 * 60 * 60 * 1000);
  var colMomento = COLUNAS.indexOf("momento");
  var colStatus = COLUNAS.indexOf("email_status");
  var colPergunta = COLUNAS.indexOf("pergunta_para_juh");

  var novas = 0, porMomento = {}, pendentes = 0, perguntas = [];
  dados.forEach(function (l) {
    if (String(l[colStatus]) === "pendente") pendentes++;
    if (!(l[0] instanceof Date) || l[0] < desde) return;
    novas++;
    porMomento[l[colMomento]] = (porMomento[l[colMomento]] || 0) + 1;
    if (String(l[colPergunta]).trim()) perguntas.push("- " + l[colPergunta]);
  });
  if (!novas && !pendentes) return;

  var corpo = ["Momento UGC — últimas 24 horas", "", "Novas respostas: " + novas, "Total na planilha: " + n, ""];
  Object.keys(porMomento).forEach(function (m) { corpo.push(m + ": " + porMomento[m]); });
  if (pendentes) corpo.push("", "E-mails ainda na fila (limite diário do Google): " + pendentes);
  if (perguntas.length) corpo.push("", "Perguntas pra Juh:", perguntas.join("\n"));
  corpo.push("", "Planilha: " + SpreadsheetApp.getActiveSpreadsheet().getUrl());

  MailApp.sendEmail({ to: EMAIL_AVISO, subject: "Momento UGC: " + novas + " respostas novas", body: corpo.join("\n") });
}

/* ------------------------------------------------------------------ *
 * Configuração (rodar uma vez pelo editor)
 * ------------------------------------------------------------------ */

function configurar() {
  var sheet = abaRespostas();
  sheet.setFrozenRows(1);
  sheet.getRange(1, 1, 1, COLUNAS.length).setFontWeight("bold");
  // O conteúdo do e-mail é técnico (usado só pra reenviar): fica escondido.
  sheet.hideColumns(COLUNAS.indexOf("email_conteudo") + 1);

  montarPainel();

  ScriptApp.getProjectTriggers().forEach(function (t) {
    var f = t.getHandlerFunction();
    if (f === "reenviarPendentes" || f === "resumoDiario") ScriptApp.deleteTrigger(t);
  });
  ScriptApp.newTrigger("reenviarPendentes").timeBased().everyHours(6).create();
  ScriptApp.newTrigger("resumoDiario").timeBased().everyDays(1).atHour(8).create();
}

function abaRespostas() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(ABA_RESPOSTAS);
  if (!sheet) {
    // Planilha nova: aproveita a primeira aba, se estiver vazia.
    var primeira = ss.getSheets()[0];
    sheet = primeira.getLastRow() === 0 ? primeira.setName(ABA_RESPOSTAS) : ss.insertSheet(ABA_RESPOSTAS);
  }
  if (sheet.getLastRow() === 0) sheet.appendRow(COLUNAS);
  return sheet;
}

function letra(chave) {
  var n = COLUNAS.indexOf(chave) + 1, s = "";
  while (n > 0) {
    var r = (n - 1) % 26;
    s = String.fromCharCode(65 + r) + s;
    n = Math.floor((n - 1) / 26);
  }
  return s;
}

/**
 * Aba "Painel": a pesquisa contada sozinha. As fórmulas leem a aba
 * "Respostas", então se atualizam a cada nova resposta.
 */
function montarPainel() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var p = ss.getSheetByName(ABA_PAINEL) || ss.insertSheet(ABA_PAINEL);
  p.clear();
  var R = "'" + ABA_RESPOSTAS + "'!";
  var faixa = R + "A:" + letra(COLUNAS[COLUNAS.length - 1]);

  p.getRange("A1").setValue("Momento UGC — painel da pesquisa").setFontWeight("bold").setFontSize(14);
  p.getRange("A2").setValue("Total de respostas");
  p.getRange("B2").setFormula("=MAX(COUNTA(" + R + "A:A)-1,0)");

  // Contagem de cada pergunta, lado a lado (linha 4 em diante).
  var blocos = [
    ["momento", "Momento"],
    ["desejo", "Desejo"],
    ["meta", "Primeira vitória"],
    ["crenca", "Crença"],
    ["bloqueio", "Bloqueio"],
    ["medo", "Medo"],
    ["ajuda", "Tipo de ajuda"],
    ["faixa_idade", "Idade"],
    ["uf", "Estado (pelo DDD)"],
  ];
  blocos.forEach(function (b, i) {
    var col = i * 3 + 1, L = letra(b[0]);
    p.getRange(4, col).setValue(b[1]).setFontWeight("bold");
    p.getRange(5, col).setFormula(
      '=IFERROR(QUERY(' + faixa + ',"select ' + L + ", count(" + L + ") where " + L + " <> '' group by " + L +
      " order by count(" + L + ") desc label " + L + " '', count(" + L + ") 'Total'\",1),\"\")"
    );
  });

  // Perfil (pergunta de múltipla escolha): uma contagem por opção.
  var perfis = [
    ["perfil_clt", "CLT"],
    ["perfil_conta_propria", "Conta própria"],
    ["perfil_estuda", "Estuda"],
    ["perfil_sem_renda", "Sem renda fixa"],
    ["perfil_mae", "Mãe"],
    ["perfil_mae_solo", "Mãe solo"],
    ["perfil_cuida_casa", "Cuida da casa"],
    ["menor_de_idade", "Menores de 18"],
  ];
  p.getRange(20, 1).setValue("Perfil").setFontWeight("bold");
  perfis.forEach(function (x, i) {
    p.getRange(21 + i, 1).setValue(x[1]);
    p.getRange(21 + i, 2).setFormula('=COUNTIF(' + R + letra(x[0]) + ':' + letra(x[0]) + ',"sim")');
  });

  // Cruzamentos que mais ajudam a desenhar produto.
  var cruzamentos = [
    ["momento", "ajuda", "Momento × tipo de ajuda", 4],
    ["momento", "bloqueio", "Momento × bloqueio", 12],
  ];
  cruzamentos.forEach(function (x) {
    var A = letra(x[0]), B = letra(x[1]), col = x[3];
    p.getRange(20, col).setValue(x[2]).setFontWeight("bold");
    p.getRange(21, col).setFormula(
      '=IFERROR(QUERY(' + faixa + ',"select ' + A + ", count(" + A + ") where " + A + " <> '' group by " + A +
      " pivot " + B + "\",1),\"\")"
    );
  });

  p.setFrozenRows(2);
}
