import type { Metadata } from "next";
import { PageHero } from "@/components/sections/PageHero";
import { OuseSerVoceQuiz } from "@/components/metodo-satoyiro/OuseSerVoceQuiz";

export const metadata: Metadata = {
  title: "Ouse Ser Você: Diagnóstico de Autoconhecimento e Projeto de Vida",
  description:
    "15 perguntas, método Satoyiro. Descubra como você se vê, seu caminho e sua relação com sucesso e expectativas, e receba um mapa com gráficos e recomendações feito pra você.",
  alternates: { canonical: "/metodo-satoyiro" },
  openGraph: {
    title: "Ouse Ser Você | Método Satoyiro",
    description:
      "Diagnóstico de autoconhecimento e projeto de vida para jovens do ensino médio. Responda o quiz e receba seu mapa personalizado.",
    url: "/metodo-satoyiro",
  },
};

export default function MetodoSatoyiroPage() {
  return (
    <>
      <PageHero
        eyebrow="Método Satoyiro"
        motif="leaf"
        title={
          <>
            OUSE SER <span className="text-amarelo">VOCÊ</span>
          </>
        }
        lead="Um quiz de autoconhecimento pra quem está no ensino médio e quer entender melhor como se vê, o caminho que está trilhando e a régua que usa pra medir sucesso. Sem julgamento, com direção."
      />

      <section className="relative overflow-hidden bg-ink section-padding">
        <div className="container-site relative max-w-4xl">
          <OuseSerVoceQuiz />
        </div>
      </section>
    </>
  );
}
