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
 * 8. Chave do Painel do Educador (`/metodo-satoyiro/educador`): no editor do
 *    Apps Script, ícone de engrenagem (Configurações do projeto) > Propriedades
 *    do script > Adicionar propriedade. Nome: CHAVE_PAINEL. Valor: uma frase
 *    longa que só a equipe sabe (ex.: 4 ou 5 palavras soltas). É essa frase
 *    que o educador digita no painel. Para trocar, mude o valor ali; não
 *    precisa reimplantar.
 *
 *    NÃO publique a planilha na web (Arquivo > Publicar na Web): o link de
 *    publicação é aberto e expõe nome, e-mail e data de nascimento dos
 *    alunos para qualquer pessoa que o tenha. O painel lê os dados por este
 *    script, que só responde com a chave certa.
 *
 * Se mudar este código depois: Implantar > Gerenciar implantações > lápis >
 * Versão: "Nova versão". Sem isso a URL continua rodando o código antigo.
 *
 * SEGURANÇA: a URL é pública (precisa ser, pro site gravar). O script corta o
 * tamanho do envio e de cada célula, grava como texto o que começa com
 * = + - @ (senão o Sheets executaria como fórmula), limita os avisos por
 * e-mail a AVISOS_POR_HORA e trava o painel por 1 hora depois de
 * TENTATIVAS_POR_HORA chaves erradas.
 */

// ID da planilha onde as respostas serão gravadas.
var SHEET_ID = "1X7qMGvddY7EcmdKzhzII7HCT8-sf-w3LjIINSQ4x-9k";

// Coloque o e-mail que deve receber o aviso de cada novo aluno. Vazio = sem e-mail.
var EMAIL_AVISO = "ousadiamkt@gmail.com";

// Máximo de avisos por hora. Passou disso, a resposta é gravada sem aviso.
var AVISOS_POR_HORA = 30;

// Chaves erradas aceitas por hora no Painel do Educador, somando todo mundo.
var TENTATIVAS_POR_HORA = 20;

var LIMITE_CORPO = 30000;
var LIMITE_CELULA = 2000;

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
    var bruto = e && e.postData ? String(e.postData.contents || "") : "";
    if (!bruto || bruto.length > LIMITE_CORPO) return json({ ok: false, erro: "envio inválido" });
    var dados = JSON.parse(bruto);
    if (!dados || typeof dados !== "object") return json({ ok: false, erro: "envio inválido" });
    var nome = String(dados.nome || "").trim().slice(0, 120);
    if (!nome) return json({ ok: false, erro: "nome vazio" });

    var sheet = SpreadsheetApp.openById(SHEET_ID).getSheets()[0];

    // cria cabeçalho na primeira execução
    if (sheet.getLastRow() === 0) {
      sheet.appendRow(COLUNAS);
    }

    var linha = COLUNAS.map(function (chave) {
      return chave === "data" ? new Date().toISOString() : celula(dados[chave]);
    });
    sheet.appendRow(linha);

    if (EMAIL_AVISO && dentroDoLimite("avisos", AVISOS_POR_HORA) && MailApp.getRemainingDailyQuota() > 0) {
      var v = function (chave, padrao) { return String(dados[chave] || padrao || "").slice(0, 300); };
      var prioritaria = v("conversa_prioritaria").toLowerCase() === "sim";
      var assunto = prioritaria
        ? "[CONVERSA PRIORITÁRIA] Novo aluno no Ouse Ser Você: " + nome
        : "Novo aluno no Ouse Ser Você: " + nome;
      var corpo =
        "Nome: " + nome + "\n" +
        "Turma: " + v("turma", "não informado") + "\n" +
        "E-mail: " + v("email", "não informado") + "\n" +
        "Contato: " + v("contato", "não informado") + "\n" +
        "Rede social: " + v("rede_social", "não informado") + "\n" +
        "Número de missão: " + v("numero_missao", "não calculado") + "\n" +
        "Tipo: " + v("tipo_mbti") + " (" + v("apelido_mbti") + ")\n" +
        "Como me vejo: " + v("como_me_vejo") + "\n" +
        "Meu caminho: " + v("meu_caminho") + "\n" +
        "Sucesso e expectativas: " + v("sucesso_e_expectativas") + "\n" +
        (prioritaria ? "\n⚠ Resultado sinaliza conversa prioritária (Pressionado + Autocrítico).\n" : "");

      MailApp.sendEmail({ to: EMAIL_AVISO, subject: assunto, body: corpo });
    }

    return json({ ok: true });
  } catch (err) {
    return json({ ok: false, erro: String(err) });
  }
}

/**
 * Sem parâmetro: teste da URL no navegador (responde "Ouse Ser Você online").
 * Com `?chave=...`: devolve as respostas pro Painel do Educador, se a chave
 * bater com a propriedade CHAVE_PAINEL (passo 8).
 */
function doGet(e) {
  var chave = e && e.parameter ? String(e.parameter.chave || "") : "";
  if (!chave) return ContentService.createTextOutput("Ouse Ser Você online");

  var certa = PropertiesService.getScriptProperties().getProperty("CHAVE_PAINEL");
  if (!certa) return json({ ok: false, erro: "painel sem chave configurada" });

  var cache = CacheService.getScriptCache();
  var chaveBloqueio = "falhas:" + horaAtual();
  if (Number(cache.get(chaveBloqueio) || 0) >= TENTATIVAS_POR_HORA) {
    return json({ ok: false, erro: "muitas tentativas, tente daqui a 1 hora" });
  }
  if (chave !== certa) {
    dentroDoLimite("falhas", Infinity);
    return json({ ok: false, erro: "chave incorreta" });
  }

  var sheet = SpreadsheetApp.openById(SHEET_ID).getSheets()[0];
  var valores = sheet.getLastRow() > 0 ? sheet.getDataRange().getValues() : [];
  var cabecalho = valores.shift() || [];
  var linhas = valores.map(function (l) {
    var o = {};
    cabecalho.forEach(function (c, i) {
      o[c] = l[i] instanceof Date ? l[i].toISOString() : String(l[i]);
    });
    return o;
  });
  return json({ ok: true, linhas: linhas });
}

function json(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

/** Valor de uma célula: texto, cortado no limite e protegido contra fórmula. */
function celula(v) {
  var s = String(v == null ? "" : v).slice(0, LIMITE_CELULA);
  return /^[=+\-@]/.test(s) ? "'" + s : s;
}

function horaAtual() {
  return Utilities.formatDate(new Date(), "America/Belem", "yyyyMMddHH");
}

/** Soma 1 no contador da hora corrente; false quando ele já chegou no limite. */
function dentroDoLimite(nome, limite) {
  var cache = CacheService.getScriptCache();
  var chave = nome + ":" + horaAtual();
  var n = Number(cache.get(chave) || 0);
  if (n >= limite) return false;
  cache.put(chave, String(n + 1), 3600);
  return true;
}
