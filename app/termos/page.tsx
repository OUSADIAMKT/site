import type { Metadata } from "next";
import { LegalPage } from "@/components/sections/LegalPage";

export const metadata: Metadata = {
  title: "Termos de Uso",
  description:
    "Condições de uso do site da Ousadia Marketing, dos cursos, da mentoria e dos serviços de agência.",
};

export default function TermosPage() {
  return (
    <LegalPage
      title="Termos de Uso"
      escopo="Texto jurídico redigido/validado por profissional. Deve cobrir: uso do site e dos conteúdos, condições de matrícula e garantia de 7 dias, propriedade intelectual, responsabilidades, cancelamento/reembolso, foro e dados do contratante (CNPJ)."
    />
  );
}
