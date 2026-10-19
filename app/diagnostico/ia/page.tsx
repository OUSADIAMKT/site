import type { Metadata } from "next";
import { OG_IMAGEM, wa } from "@/lib/site";
import { PageHero } from "@/components/sections/PageHero";
import { QuizArea } from "@/components/diagnostico-area/QuizArea";
import { DIAGNOSTICO_IA } from "@/lib/diagnostico-ia";

export const metadata: Metadata = {
  title: "Diagnóstico de IA da Ousadia: qual é o seu nível com a Inteligência Artificial?",
  description:
    "10 perguntas, ~4 minutos, resultado na hora. Descubra seu nível com a IA (Descobridor, Explorador, Praticante ou Estrategista), veja um painel das suas 4 competências e receba uma missão e um plano de 30 dias.",
  alternates: { canonical: "/diagnostico/ia" },
  openGraph: {
    title: "Diagnóstico de IA da Ousadia",
    description:
      "Descubra seu nível com a Inteligência Artificial, o que te trava e por onde continuar.",
    url: "/diagnostico/ia",
    images: OG_IMAGEM,
  },
};

export default function DiagnosticoIAPage() {
  return (
    <>
      <PageHero
        eyebrow="Diagnóstico de IA da Ousadia"
        motif="river"
        title={
          <>
            Qual é o seu nível com a{" "}
            <span className="text-amarelo">IA</span>?
          </>
        }
        lead="Experiência, comunicação com a IA, senso crítico e produtividade: um teste com situações reais pra mostrar onde você está, o que te trava e qual é o próximo passo. Sem julgamento, com direção."
      />

      <section className="relative overflow-hidden section-padding">
        <div className="container-site relative max-w-4xl">
          <QuizArea
            cfg={DIAGNOSTICO_IA}
            waHref={wa("escola", "Inteligência Artificial do Zero à Prática")}
          />
        </div>
      </section>
    </>
  );
}
