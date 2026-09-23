/**
 * Parser de CSV mínimo, sem dependência externa — o site é 100% estático, e
 * o único uso é ler o CSV publicado da planilha do Google no Painel do
 * Educador (`SHEET_CSV_SATOYIRO`, `lib/site.ts`). Lida com campos entre
 * aspas, vírgula e aspas escapadas (`""`), como o Google Sheets exporta.
 */
export function parseCsv(texto: string): Record<string, string>[] {
  const linhas = parseLinhas(texto);
  if (!linhas.length) return [];

  const [cabecalho, ...resto] = linhas;
  return resto
    .filter((linha) => linha.some((valor) => valor !== ""))
    .map((linha) =>
      Object.fromEntries(cabecalho.map((chave, i) => [chave, linha[i] ?? ""])),
    );
}

function parseLinhas(texto: string): string[][] {
  const linhas: string[][] = [];
  let linha: string[] = [];
  let campo = "";
  let dentroAspas = false;

  for (let i = 0; i < texto.length; i++) {
    const c = texto[i];

    if (dentroAspas) {
      if (c === '"') {
        if (texto[i + 1] === '"') {
          campo += '"';
          i++;
        } else {
          dentroAspas = false;
        }
      } else {
        campo += c;
      }
      continue;
    }

    if (c === '"') {
      dentroAspas = true;
    } else if (c === ",") {
      linha.push(campo);
      campo = "";
    } else if (c === "\n") {
      linha.push(campo);
      linhas.push(linha);
      linha = [];
      campo = "";
    } else if (c === "\r") {
      // ignora — a quebra de linha real é o \n que vem em seguida
    } else {
      campo += c;
    }
  }

  if (campo.length || linha.length) {
    linha.push(campo);
    linhas.push(linha);
  }

  return linhas;
}
