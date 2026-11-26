// O nome de um formulário do site como identificador curto:
// "Diagnóstico IA" -> "diagnostico-ia". Usado pela entrada de leads e pela
// lista de formulários de cada produto, que precisam casar letra a letra.

export function slugDaOrigem(origem) {
  const t = origem === null || origem === undefined ? "" : String(origem);
  return t.trim().normalize("NFD").replace(/[̀-ͯ]/g, "")
    .toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40) || "site";
}
