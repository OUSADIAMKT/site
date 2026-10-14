/**
 * OUSADIA MARKETING · Backend da Newsletter (Google Apps Script)
 * -------------------------------------------------------------------
 * Guarda cada inscrição da newsletter (rodapé do site) numa planilha do
 * Google Sheets e (opcional) avisa por e-mail a cada novo assinante.
 * 100% gratuito. Mesmo padrão do Diagnóstico — ver
 * `legado/site-estatico-crm/docs/system-design/integracao-google-sheets.gs`.
 *
 * COMO USAR:
 * 1. Abra a planilha (já criada):
 *    https://docs.google.com/spreadsheets/d/198NdIbJ413MZlK3RgkX-NRtjpJpK9yjuiv1A5Xq7MzM/edit
 * 2. Menu Extensões > Apps Script. Apague o conteúdo e cole este arquivo.
 * 3. Ajuste EMAIL_AVISO abaixo (ou deixe "" para não receber e-mail a cada
 *    inscrição — recomendável se o volume crescer muito).
 * 4. Implantar > Nova implantação > tipo "App da Web".
 *    - Executar como: Eu.
 *    - Quem tem acesso: Qualquer pessoa.
 * 5. Autorize o acesso quando o Google pedir.
 * 6. Teste a URL gerada no navegador (GET) — deve responder
 *    "Newsletter Ousadia online". Se pedir login do Google, a implantação
 *    não ficou pública: repita o passo 4 escolhendo "Qualquer pessoa".
 * 7. Cole a URL (termina em `/exec`) em `NEWSLETTER_ENDPOINT`, em `lib/site.ts`.
 *
 * Se mudar este código depois: Implantar > Gerenciar implantações > lápis >
 * Versão: "Nova versão". Sem isso a URL continua rodando o código antigo.
 *
 * SEGURANÇA: a URL é pública (precisa ser, pro site gravar), então qualquer
 * pessoa pode mandar dados pra ela. Por isso o script só aceita um e-mail
 * válido e curto, grava como texto (célula começando com = + - @ viraria
 * fórmula no Sheets) e limita os avisos por e-mail a AVISOS_POR_HORA, pra
 * ninguém lotar a sua caixa nem gastar a cota diária de e-mail do Google.
 */

// ID da planilha onde as inscrições serão gravadas.
var SHEET_ID = "198NdIbJ413MZlK3RgkX-NRtjpJpK9yjuiv1A5Xq7MzM";

// Coloque o e-mail que deve receber o aviso de novo assinante. Vazio = sem e-mail.
var EMAIL_AVISO = "ousadiamkt@gmail.com";

// Máximo de avisos por hora. Passou disso, a inscrição é gravada sem aviso.
var AVISOS_POR_HORA = 20;

// Ordem das colunas na planilha (cabeçalho criado automaticamente).
var COLUNAS = ["data", "email", "consentimento"];

function doPost(e) {
  var lock = LockService.getScriptLock();
  try {
    var bruto = e && e.postData ? String(e.postData.contents || "") : "";
    if (!bruto || bruto.length > 2000) return json({ ok: false, erro: "envio inválido" });
    var dados = JSON.parse(bruto);
    var email = String((dados && dados.email) || "").trim().toLowerCase();
    // Texto curto, e sem começar com = + - @ (viraria fórmula no Sheets).
    var consentimento = String((dados && dados.consentimento) || "").slice(0, 60).replace(/^[=+\-@]+/, "");

    if (email.length > 120 || !/^[^@\s=+\-][^@\s]*@[^@\s]+\.[^@\s]+$/.test(email)) {
      return json({ ok: false, erro: "e-mail inválido" });
    }

    // Duas inscrições no mesmo segundo não podem passar as duas pela checagem
    // de duplicado.
    lock.waitLock(30000);
    var sheet = SpreadsheetApp.openById(SHEET_ID).getSheets()[0];

    // cria cabeçalho na primeira execução
    if (sheet.getLastRow() === 0) {
      sheet.appendRow(COLUNAS);
    }

    // não duplica quem já é assinante
    // (getRange com 0 linhas dá erro, por isso a checagem antes)
    var linhas = sheet.getLastRow() - 1;
    var emailsExistentes = linhas < 1 ? [] : sheet
      .getRange(2, 2, linhas, 1)
      .getValues()
      .flat()
      .map(function (v) {
        return String(v).trim().toLowerCase();
      });

    var novo = emailsExistentes.indexOf(email) === -1;
    if (novo) sheet.appendRow([new Date().toISOString(), email, consentimento]);
    lock.releaseLock();

    if (novo && EMAIL_AVISO && podeAvisar()) {
      MailApp.sendEmail({
        to: EMAIL_AVISO,
        subject: "Nova inscrição na newsletter: " + email,
        body: "Novo e-mail na lista da newsletter:\n\n" + email,
      });
    }

    return json({ ok: true });
  } catch (err) {
    try { lock.releaseLock(); } catch (_) {}
    return json({ ok: false, erro: String(err) });
  }
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

// Permite testar a URL no navegador (deve responder "Newsletter Ousadia online").
function doGet() {
  return ContentService.createTextOutput("Newsletter Ousadia online");
}
