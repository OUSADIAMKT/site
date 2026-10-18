/**
 * OUSADIA MARKETING · Backend do Diagnóstico de IA (Google Apps Script)
 * -------------------------------------------------------------------
 * Guarda cada resposta do teste "Em que ponto você está com a IA?"
 * (`/diagnostico/ia`) numa planilha do Google e (opcional) avisa por e-mail.
 * Mesmo padrão da Newsletter (`newsletter-google-sheets.gs`).
 *
 * COMO USAR:
 * 1. Abra a planilha (já criada em 18/10/2026):
 *    https://docs.google.com/spreadsheets/d/1lBB1aMhAjT3VglxVafMydlN69sFbQliiFQrFAhst3QM/edit
 * 2. Menu Extensões > Apps Script. Apague o conteúdo e cole este arquivo.
 * 3. Implantar > Nova implantação > tipo "App da Web".
 *    - Executar como: Eu.
 *    - Quem tem acesso: Qualquer pessoa.
 * 4. Autorize o acesso quando o Google pedir.
 * 5. Teste a URL gerada no navegador (GET): deve responder
 *    "Diagnóstico de IA online". Se pedir login do Google, a implantação não
 *    ficou pública: repita o passo 3 escolhendo "Qualquer pessoa".
 * 6. Cole a URL (termina em `/exec`) em `SHEET_ENDPOINT_DIAGNOSTICO_IA`, em
 *    `lib/site.ts`.
 *
 * Se mudar este código depois: Implantar > Gerenciar implantações > lápis >
 * Versão: "Nova versão". Sem isso a URL continua rodando o código antigo.
 *
 * SEGURANÇA: a URL é pública (precisa ser, pro site gravar). Por isso o script
 * corta cada campo num tamanho máximo, grava tudo como texto (célula começando
 * com = + - @ viraria fórmula no Sheets), exige e-mail válido e limita os
 * avisos por e-mail a AVISOS_POR_HORA.
 */

var SHEET_ID = "1lBB1aMhAjT3VglxVafMydlN69sFbQliiFQrFAhst3QM";

// E-mail que recebe aviso de cada resposta. Vazio = sem aviso.
var EMAIL_AVISO = "ousadiamkt@gmail.com";

// Máximo de avisos por hora. Passou disso, a resposta é gravada sem aviso.
var AVISOS_POR_HORA = 20;

// Ordem das colunas na planilha. O site manda exatamente estes nomes
// (ver `payloadPlanilhaIA()` em `lib/diagnostico-ia.ts`).
var COLUNAS = [
  "data", "nome", "email", "whatsapp", "profissao", "faixa_etaria",
  "nivel", "pontos", "uso_pct", "pedido_pct", "critico_pct",
  "alerta_risco", "respostas", "consentimento"
];

// Tamanho máximo de cada campo.
var LIMITE = { respostas: 1500, profissao: 120, nome: 120 };
var LIMITE_PADRAO = 80;

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

    var linha = COLUNAS.map(function (c) {
      if (c === "data") return new Date().toISOString();
      if (c === "email") return email;
      return limpar(dados[c], LIMITE[c] || LIMITE_PADRAO);
    });

    lock.waitLock(30000);
    var sheet = SpreadsheetApp.openById(SHEET_ID).getSheets()[0];
    if (sheet.getLastRow() === 0) sheet.appendRow(COLUNAS);
    sheet.appendRow(linha);
    lock.releaseLock();

    if (EMAIL_AVISO && podeAvisar()) {
      MailApp.sendEmail({
        to: EMAIL_AVISO,
        subject: "Diagnóstico de IA: " + limpar(dados.nome, 60) + " (" + limpar(dados.nivel, 40) + ")",
        body:
          "Nova resposta no Diagnóstico de IA:\n\n" +
          "Nome: " + limpar(dados.nome, 120) + "\n" +
          "E-mail: " + email + "\n" +
          "WhatsApp: " + limpar(dados.whatsapp, 40) + "\n" +
          "Profissão: " + limpar(dados.profissao, 120) + "\n" +
          "Faixa etária: " + limpar(dados.faixa_etaria, 40) + "\n" +
          "Nível: " + limpar(dados.nivel, 40) + " (" + limpar(dados.pontos, 10) + " pontos)\n\n" +
          "Planilha: https://docs.google.com/spreadsheets/d/" + SHEET_ID + "/edit",
      });
    }

    return json({ ok: true });
  } catch (err) {
    try { lock.releaseLock(); } catch (_) {}
    return json({ ok: false, erro: String(err) });
  }
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

// Permite testar a URL no navegador.
function doGet() {
  return ContentService.createTextOutput("Diagnóstico de IA online");
}
