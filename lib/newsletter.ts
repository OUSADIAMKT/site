import { NEWSLETTER_ENDPOINT } from "@/lib/site";

/**
 * Dispara a inscrição na newsletter pro Apps Script. **Não bloqueia** — assim
 * como no Diagnóstico (`lib/diagnostico.ts`), o Apps Script não devolve
 * cabeçalho CORS e responde 302 pra outro domínio, então a resposta é sempre
 * opaca: não dá pra confirmar a gravação pelo navegador, só que a requisição
 * saiu. `sendBeacon` é o caminho certo (não segura a UI, sobrevive se a
 * pessoa fechar a aba); `fetch` com `no-cors` e `keepalive` cobre navegadores
 * sem beacon. Confirmação real fica pela planilha ou pelo e-mail de aviso.
 */
export function inscreverNewsletter(email: string): boolean {
  if (!NEWSLETTER_ENDPOINT) return false;
  const corpo = JSON.stringify({ email });

  try {
    if (typeof navigator !== "undefined" && navigator.sendBeacon) {
      const blob = new Blob([corpo], { type: "text/plain;charset=utf-8" });
      if (navigator.sendBeacon(NEWSLETTER_ENDPOINT, blob)) return true;
    }
  } catch {
    // cai no fetch abaixo
  }

  try {
    void fetch(NEWSLETTER_ENDPOINT, {
      method: "POST",
      mode: "no-cors",
      keepalive: true,
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: corpo,
    }).catch(() => {});
    return true;
  } catch {
    return false;
  }
}
