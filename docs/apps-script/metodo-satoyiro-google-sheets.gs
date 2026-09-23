/**
 * OUSADIA MARKETING · Backend do "Ouse Ser Você" (Google Apps Script)
 * -------------------------------------------------------------------
 * Guarda cada diagnóstico do método Satoyiro (`/metodo-satoyiro`) numa
 * planilha do Google Sheets e avisa por e-mail a cada novo aluno — com
 * destaque quando o resultado é "conversa prioritária" (PRESSIONADO +
 * AUTOCRITICO). 100% gratuito. Mesmo padrão do Diagnóstico de Maturidade e
 * da Newsletter — ver os outros arquivos desta pasta.
 *
 * COMO USAR:
 * 1. Abra a planilha (já criada):
 *    https://docs.google.com/spreadsheets/d/1X7qMGvddY7EcmdKzhzII7HCT8-sf-w3LjIINSQ4x-9k/edit
 * 2. Menu Extensões > Apps Script. Apague o conteúdo e cole este arquivo.
 * 3. Ajuste EMAIL_AVISO abaixo (ou deixe "" pra não receber e-mail a cada
 *    resposta).
 * 4. Implantar > Nova implantação > tipo "App da Web".
 *    - Executar como: Eu.
 *    - Quem tem acesso: Qualquer pessoa.
 * 5. Autorize o acesso quando o Google pedir.
 * 6. Teste a URL gerada no navegador (GET) — deve responder
 *    "Ouse Ser Você online". Se pedir login do Google, a implantação não
 *    ficou pública: repita o passo 4 escolhendo "Qualquer pessoa".
 * 7. Cole a URL (termina em `/exec`) em `SHEET_ENDPOINT_SATOYIRO`, em
 *    `lib/site.ts`.
 * 8. Para o Painel do Educador conseguir LER as respostas (o site é
 *    estático, sem banco de dados): na mesma planilha, Arquivo > Compartilhar
 *    > Publicar na Web > selecione a aba de respostas > formato CSV >
 *    Publicar. Cole essa URL (termina em `output=csv`) em
 *    `SHEET_CSV_SATOYIRO`, também em `lib/site.ts`.
 */

// ID da planilha onde as respostas serão gravadas.
var SHEET_ID = "1X7qMGvddY7EcmdKzhzII7HCT8-sf-w3LjIINSQ4x-9k";

// Coloque o e-mail que deve receber o aviso de cada novo aluno. Vazio = sem e-mail.
var EMAIL_AVISO = "ousadiamkt@gmail.com";

// Ordem das colunas na planilha (cabeçalho criado automaticamente).
var COLUNAS = [
  "data",
  "nome",
  "turma",
  "email",
  "contato",
  "rede_social",
  "data_nascimento",
  "numero_missao",
  "tipo_mbti",
  "apelido_mbti",
  "grupo",
  "como_me_vejo",
  "como_me_vejo_categoria",
  "meu_caminho",
  "meu_caminho_categoria",
  "sucesso_e_expectativas",
  "sucesso_e_expectativas_categoria",
  "conversa_prioritaria",
  "resposta_1",
  "resposta_2",
];

function doPost(e) {
  try {
    var dados = JSON.parse(e.postData.contents);
    var nome = String(dados.nome || "").trim();

    if (!nome) {
      return ContentService.createTextOutput(
        JSON.stringify({ ok: false, erro: "nome vazio" }),
      ).setMimeType(ContentService.MimeType.JSON);
    }

    var sheet = SpreadsheetApp.openById(SHEET_ID).getSheets()[0];

    // cria cabeçalho na primeira execução
    if (sheet.getLastRow() === 0) {
      sheet.appendRow(COLUNAS);
    }

    var linha = COLUNAS.map(function (chave) {
      return chave === "data" ? new Date().toISOString() : String(dados[chave] || "");
    });
    sheet.appendRow(linha);

    if (EMAIL_AVISO) {
      var prioritaria = String(dados.conversa_prioritaria || "").toLowerCase() === "sim";
      var assunto = prioritaria
        ? "[CONVERSA PRIORITÁRIA] Novo aluno no Ouse Ser Você: " + nome
        : "Novo aluno no Ouse Ser Você: " + nome;
      var corpo =
        "Nome: " + nome + "\n" +
        "Turma: " + (dados.turma || "não informado") + "\n" +
        "E-mail: " + (dados.email || "não informado") + "\n" +
        "Contato: " + (dados.contato || "não informado") + "\n" +
        "Rede social: " + (dados.rede_social || "não informado") + "\n" +
        "Número de missão: " + (dados.numero_missao || "não calculado") + "\n" +
        "Tipo: " + (dados.tipo_mbti || "") + " (" + (dados.apelido_mbti || "") + ")\n" +
        "Como me vejo: " + (dados.como_me_vejo || "") + "\n" +
        "Meu caminho: " + (dados.meu_caminho || "") + "\n" +
        "Sucesso e expectativas: " + (dados.sucesso_e_expectativas || "") + "\n" +
        (prioritaria ? "\n⚠ Resultado sinaliza conversa prioritária (Pressionado + Autocrítico).\n" : "");

      MailApp.sendEmail({ to: EMAIL_AVISO, subject: assunto, body: corpo });
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

// Permite testar a URL no navegador (deve responder "Ouse Ser Você online").
function doGet() {
  return ContentService.createTextOutput("Ouse Ser Você online");
}
