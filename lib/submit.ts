import { FORM_ENDPOINT, WHATSAPP_NUMBER } from "@/lib/site";

export type FormPayload = Record<string, string>;

/** Preserva as UTMs da sessão até o destino (PRD 10.2). */
export function getUtms(): FormPayload {
  if (typeof window === "undefined") return {};
  const params = new URLSearchParams(window.location.search);
  const utms: FormPayload = {};
  params.forEach((v, k) => {
    if (k.startsWith("utm_")) utms[k] = v;
  });
  return utms;
}

/**
 * Envia o formulário para o endpoint configurado.
 * Sem endpoint, devolve um link de WhatsApp com os dados preenchidos — assim
 * o lead chega ao time mesmo antes da integração existir.
 */
export async function submitForm(
  origem: string,
  data: FormPayload,
  labels: Record<string, string>,
): Promise<{ whatsappUrl?: string }> {
  const payload = { ...data, origem, utms: getUtms() };

  if (FORM_ENDPOINT) {
    try {
      await fetch(FORM_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      return {};
    } catch {
      // cai no fallback de WhatsApp abaixo
    }
  }

  const linhas = Object.entries(data)
    .filter(([, v]) => v)
    .map(([k, v]) => `${labels[k] ?? k}: ${v}`);
  const texto = [`Oi! Enviei o formulário de ${origem} pelo site.`, "", ...linhas].join(
    "\n",
  );

  return {
    whatsappUrl: `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(texto)}`,
  };
}
