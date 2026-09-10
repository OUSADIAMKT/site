import type { Metadata } from "next";
import { PageHero } from "@/components/sections/PageHero";
import { DiagnosticoQuiz } from "@/components/diagnostico/DiagnosticoQuiz";

export const metadata: Metadata = {
  title: "Diagnóstico de Maturidade Digital",
  description:
    "12 perguntas, ~4 minutos. Descubra em que estágio da Escada Amazônica sua marca está (posicionamento, influência, planejamento, conteúdo e performance) e qual é o seu próximo passo.",
  alternates: { canonical: "/diagnostico" },
  openGraph: {
    title: "Diagnóstico de Maturidade Digital | Ousadia Marketing",
    description:
      "Avalie sua maturidade em 5 dimensões do método STORYSELL e receba um plano de 30 dias feito para o seu estágio.",
    url: "/diagnostico",
  },
};

export default function DiagnosticoPage() {
  return (
    <>
      <PageHero
        eyebrow="Diagnóstico de Maturidade Digital"
        motif="river"
        title={
          <>
            Descubra em que momento sua marca está no{" "}
            <span className="text-amarelo">digital</span>
          </>
        }
        lead="Em poucos minutos, avalie seu nível de maturidade em posicionamento, marketing de conteúdo, influência, planejamento e criação de conteúdo, e descubra qual deve ser o seu próximo passo dentro da Escada Amazônica da Ousadia."
      />

      <section className="relative overflow-hidden bg-ink section-padding">
        <div className="container-site relative max-w-4xl">
          <DiagnosticoQuiz />
        </div>
      </section>
    </>
  );
}
