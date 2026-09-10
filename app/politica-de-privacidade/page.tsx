import type { Metadata } from "next";
import { LegalPage } from "@/components/sections/LegalPage";

export const metadata: Metadata = {
  title: "Política de Privacidade",
  description:
    "Como a Ousadia Marketing coleta, usa e protege os dados pessoais dos visitantes do site, conforme a LGPD.",
};

export default function PrivacidadePage() {
  return (
    <LegalPage
      title="Política de Privacidade"
      escopo="Texto jurídico redigido/validado por profissional. Deve cobrir: dados coletados (formulários, cookies, analytics), finalidade, base legal, compartilhamento (Meta, Google), direitos do titular, contato do controlador com CNPJ, prazo de retenção e canal de solicitações."
    />
  );
}
