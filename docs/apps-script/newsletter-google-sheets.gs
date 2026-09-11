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
 */

// ID da planilha onde as inscrições serão gravadas.
var SHEET_ID = "198NdIbJ413MZlK3RgkX-NRtjpJpK9yjuiv1A5Xq7MzM";

// Coloque o e-mail que deve receber o aviso de novo assinante. Vazio = sem e-mail.
var EMAIL_AVISO = "ousadiamkt@gmail.com";

// Ordem das colunas na planilha (cabeçalho criado automaticamente).
var COLUNAS = ["data", "email"];

function doPost(e) {
  try {
    var dados = JSON.parse(e.postData.contents);
    var email = String(dados.email || "").trim().toLowerCase();

    if (!email) {
      return ContentService.createTextOutput(
        JSON.stringify({ ok: false, erro: "e-mail vazio" }),
      ).setMimeType(ContentService.MimeType.JSON);
    }

    var sheet = SpreadsheetApp.openById(SHEET_ID).getSheets()[0];

    // cria cabeçalho na primeira execução
    if (sheet.getLastRow() === 0) {
      sheet.appendRow(COLUNAS);
    }

    // não duplica quem já é assinante
    var emailsExistentes = sheet
      .getRange(2, 2, Math.max(sheet.getLastRow() - 1, 0), 1)
      .getValues()
      .flat()
      .map(function (v) {
        return String(v).trim().toLowerCase();
      });

    if (emailsExistentes.indexOf(email) === -1) {
      sheet.appendRow([new Date().toISOString(), email]);

      if (EMAIL_AVISO) {
        MailApp.sendEmail({
          to: EMAIL_AVISO,
          subject: "Nova inscrição na newsletter: " + email,
          body: "Novo e-mail na lista da newsletter:\n\n" + email,
        });
      }
    }

    return ContentService.createTextOutput(
      JSON.stringify({ ok: true }),
    ).setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(
      JSON.stringify({ ok: false, erro: String(err) }),
    ).setMimeType(ContentService.MimeType.JSON);
  }
}

// Permite testar a URL no navegador (deve responder "Newsletter Ousadia online").
function doGet() {
  return ContentService.createTextOutput("Newsletter Ousadia online");
}
