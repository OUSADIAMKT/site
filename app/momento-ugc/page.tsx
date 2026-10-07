import type { Metadata } from "next";
import { PageHero } from "@/components/sections/PageHero";
import { MomentoQuiz } from "@/components/momento-ugc/MomentoQuiz";

export const metadata: Metadata = {
  title: "Qual é o seu Momento UGC? | Diagnóstico gratuito do Mapa do UGC",
  description:
    "8 perguntas, 3 minutos. Descubra onde você está no caminho pra trabalhar com marcas, o que está te travando e qual é o seu próximo passo. Gratuito, com a Juh Araújo.",
  alternates: { canonical: "/momento-ugc" },
  openGraph: {
    title: "Qual é o seu Momento UGC?",
    description:
      "Descubra onde você está no caminho pra trabalhar com marcas e receba o seu próximo passo. Diagnóstico gratuito do Mapa do UGC.",
    url: "/momento-ugc",
  },
};

/**
 * Diagnóstico gratuito do Mapa do UGC — e, antes de tudo, pesquisa de mercado
 * com o grupo de WhatsApp da Juh. Especificação: `docs/diagnostico-ugc.md`.
 * Fora do menu de propósito: é divulgado no grupo e no Instagram.
 */
export default function MomentoUgcPage() {
  return (
    <>
      <PageHero
        eyebrow="Diagnóstico gratuito · Mapa do UGC"
        motif="river"
        title={
          <>
            Qual é o seu <span className="text-amarelo">Momento UGC</span>?
          </>
        }
        lead="Descubra onde você está no caminho pra trabalhar com marcas."
      />

      <section className="relative overflow-hidden bg-ink section-padding">
        <div className="container-site relative max-w-4xl">
          <MomentoQuiz />
        </div>
      </section>
    </>
  );
}
