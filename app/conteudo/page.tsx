import type { Metadata } from "next";
import { PageHero } from "@/components/sections/PageHero";
import { CtaFinal } from "@/components/sections/CtaFinal";
import { ConteudoLista } from "@/components/sections/ConteudoLista";
import { wa } from "@/lib/site";
import { POSTS, paraLista } from "@/lib/posts";

export const metadata: Metadata = {
  title: "Conteúdo | Estratégia, bastidor e provocação útil",
  description:
    "O que a gente aprende fazendo, publicado sem filtro de guru. Artigos, podcast e cases, de dentro da floresta.",
};

export default function ConteudoPage() {
  return (
    <>
      <PageHero
        eyebrow="Conteúdo"
        title={
          <>
            Estratégia, bastidor e{" "}
            <span className="text-amarelo">provocação útil</span>.
          </>
        }
        lead="O que a gente aprende fazendo, publicado sem filtro de guru. Artigos, podcast e cases, de dentro da floresta."
      />

      <section className="relative overflow-hidden bg-ink section-padding">
        <div className="container-site relative">
          <ConteudoLista posts={paraLista(POSTS)} />
        </div>
      </section>

      <CtaFinal
        waveColor="var(--ink)"
        title={
          <>
            Ler é bom. <span className="text-amarelo">Aplicar</span> é melhor.
          </>
        }
        ctaLabel="Quero entrar pra Ousadia"
        href={wa("home")}
      />
    </>
  );
}
