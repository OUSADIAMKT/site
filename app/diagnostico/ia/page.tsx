import type { Metadata } from "next";
import { OG_IMAGEM, wa } from "@/lib/site";
import { PageHero } from "@/components/sections/PageHero";
import { QuizIA } from "@/components/diagnostico-ia/QuizIA";

export const metadata: Metadata = {
  title: "Diagnóstico de IA: em que ponto você está com a Inteligência Artificial?",
  description:
    "10 perguntas, ~3 minutos, resultado na hora. Descubra seu nível com a IA, como você vai em uso, pedidos e senso crítico, e quais são os seus próximos passos.",
  alternates: { canonical: "/diagnostico/ia" },
  openGraph: {
    title: "Diagnóstico de IA | Ousadia Marketing",
    description:
      "Descubra seu nível com a Inteligência Artificial e receba os seus próximos passos.",
    url: "/diagnostico/ia",
    images: OG_IMAGEM,
  },
};

export default function DiagnosticoIAPage() {
  return (
    <>
      <PageHero
        eyebrow="Diagnóstico · Inteligência Artificial"
        motif="river"
        title={
          <>
            Em que ponto você está com a{" "}
            <span className="text-amarelo">IA</span>?
          </>
        }
        lead="Um teste rápido pra saber o quanto você já usa a Inteligência Artificial, como pede e se confere o que ela responde. Sem julgamento, com direção."
      />

      <section className="relative overflow-hidden bg-ink section-padding">
        <div className="container-site relative max-w-4xl">
          <QuizIA
            cursoHref="/escola/ia-para-iniciantes"
            waHref={wa("escola", "Inteligência Artificial do Zero à Prática")}
          />
        </div>
      </section>
    </>
  );
}
