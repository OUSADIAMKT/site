import type { Metadata } from "next";
import { OG_IMAGEM, wa } from "@/lib/site";
import { PageHero } from "@/components/sections/PageHero";
import { QuizArea } from "@/components/diagnostico-area/QuizArea";
import { DIAGNOSTICO_SOCIAL_MEDIA } from "@/lib/diagnostico-social-media";

export const metadata: Metadata = {
  title: "Diagnóstico de Social Media: você está pronto pro seu primeiro cliente?",
  description:
    "10 perguntas, ~4 minutos, resultado na hora. Descubra o seu momento como social media, veja um painel de mentalidade, ferramentas, conteúdo e negócio, e receba uma missão e um plano de 30 dias.",
  alternates: { canonical: "/diagnostico/social-media" },
  openGraph: {
    title: "Diagnóstico de Social Media | Ousadia Marketing",
    description:
      "Descubra o quanto falta pro seu primeiro trabalho pago de social media e receba os seus próximos passos.",
    url: "/diagnostico/social-media",
    images: OG_IMAGEM,
  },
};

export default function DiagnosticoSocialMediaPage() {
  return (
    <>
      <PageHero
        eyebrow="Diagnóstico · Social Media"
        motif="river"
        title={
          <>
            Quanto falta pro seu primeiro{" "}
            <span className="text-amarelo">Pix</span> com social media?
          </>
        }
        lead="Um teste com situações reais pra saber como você encara oferecer serviço, que ferramentas domina, se o seu conteúdo prende e se você sabe cobrar. Curtida sozinha não paga boleto: aqui você descobre o próximo passo."
      />

      <section className="relative overflow-hidden bg-ink section-padding">
        <div className="container-site relative max-w-4xl">
          <QuizArea
            cfg={DIAGNOSTICO_SOCIAL_MEDIA}
            waHref={wa("escola", "Social Media Ousado")}
          />
        </div>
      </section>
    </>
  );
}
