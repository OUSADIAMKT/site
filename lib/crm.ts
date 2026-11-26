import { CRM_LEAD_ENDPOINT } from "@/lib/site";

/** Preserva as UTMs da sessão até o CRM. */
function utmsDaPagina(): Record<string, string> {
  if (typeof window === "undefined") return {};
  const utms: Record<string, string> = {};
  new URLSearchParams(window.location.search).forEach((v, k) => {
    if (k.startsWith("utm_")) utms[k] = v;
  });
  return utms;
}

/**
 * Manda uma cópia do formulário para o CRM. **Não bloqueia** e nunca lança:
 * o lead continua indo para a planilha (ou para o WhatsApp) do jeito de
 * sempre, e se o CRM estiver fora do ar nada muda para quem preencheu.
 *
 * Mesmo formato das planilhas: `text/plain` por `sendBeacon`, que é
 * requisição "simples" (sem preflight) e sobrevive se a pessoa fechar a aba.
 * O CRM confere a origem (só aceita ousadiamarketing.com.br), freia rajada e
 * descarta o que vier sem e-mail nem WhatsApp.
 *
 * `origem` é o nome do formulário ("diagnostico", "contato", "newsletter"...).
 * `dados` usa os mesmos nomes de campo das planilhas: `nome`, `email`,
 * `whatsapp` (ou `wpp`/`telefone`) são reconhecidos; o resto vira nota.
 */
export function enviarAoCrm(origem: string, dados: Record<string, unknown>): void {
  if (!CRM_LEAD_ENDPOINT || typeof window === "undefined") return;
  const corpo = JSON.stringify({
    origem,
    dados,
    utms: utmsDaPagina(),
    pagina: window.location.pathname,
  });

  try {
    if (navigator.sendBeacon) {
      const blob = new Blob([corpo], { type: "text/plain;charset=utf-8" });
      if (navigator.sendBeacon(CRM_LEAD_ENDPOINT, blob)) return;
    }
  } catch {
    // cai no fetch abaixo
  }
  try {
    void fetch(CRM_LEAD_ENDPOINT, {
      method: "POST",
      mode: "no-cors",
      keepalive: true,
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: corpo,
    }).catch(() => {});
  } catch {
    // nada: o CRM é cópia, não é o caminho principal
  }
}
