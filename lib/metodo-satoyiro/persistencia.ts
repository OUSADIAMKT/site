import { SHEET_ENDPOINT_SATOYIRO } from "@/lib/site";
import { calcularNumeroMissao } from "./numerologia";
import type { LeadAluno, Resultado } from "./tipos";

/**
 * Monta a linha da planilha. As chaves têm que bater exatamente com o array
 * `COLUNAS` do Apps Script — qualquer nome diferente vira célula vazia. Ver
 * `docs/apps-script/metodo-satoyiro-google-sheets.gs`.
 */
export function payloadPlanilha(r: Resultado, lead: LeadAluno) {
  return {
    data: new Date().toISOString(),
    nome: lead.nomeCompleto || lead.primeiroNome,
    turma: lead.turma,
    email: lead.email,
    contato: lead.contato,
    rede_social: lead.redeSocial,
    data_nascimento: lead.dataNascimento,
    numero_missao: calcularNumeroMissao(lead.dataNascimento) ?? "",
    tipo_mbti: r.mbti.tipo,
    apelido_mbti: r.mbti.apelido,
    grupo: r.mbti.grupo,
    como_me_vejo: r.cap1.rotulo,
    como_me_vejo_categoria: r.cap1.principal,
    meu_caminho: r.cap2.rotulo,
    meu_caminho_categoria: r.cap2.principal,
    sucesso_e_expectativas: r.cap3.rotulo,
    sucesso_e_expectativas_categoria: r.cap3.principal,
    conversa_prioritaria:
      r.cap3.principal === "PRESSIONADO" && r.cap1.principal === "AUTOCRITICO"
        ? "sim"
        : "não",
    resposta_1: r.abertas.find((a) => a.chave === "q14")?.texto ?? "",
    resposta_2: r.abertas.find((a) => a.chave === "q15")?.texto ?? "",
  };
}

/**
 * Dispara a gravação do lead na planilha. **Não bloqueia**: o mapa aparece
 * na hora e o envio segue em segundo plano. Mesmo motivo do Diagnóstico de
 * Maturidade (ver `lib/diagnostico.ts`) — o Apps Script responde com 302 pra
 * outro domínio e sem cabeçalho CORS, então a chamada precisa ser "simples"
 * e a resposta é sempre opaca.
 */
export function salvarNaPlanilha(
  payload: ReturnType<typeof payloadPlanilha>,
): boolean {
  if (!SHEET_ENDPOINT_SATOYIRO) return false;
  const corpo = JSON.stringify(payload);

  try {
    if (typeof navigator !== "undefined" && navigator.sendBeacon) {
      const blob = new Blob([corpo], { type: "text/plain;charset=utf-8" });
      if (navigator.sendBeacon(SHEET_ENDPOINT_SATOYIRO, blob)) return true;
    }
  } catch {
    // cai no fetch abaixo
  }

  try {
    void fetch(SHEET_ENDPOINT_SATOYIRO, {
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
