import type { Metadata } from "next";
import { Reveal } from "@/components/ui/Reveal";
import { WaveDivider } from "@/components/ui/WaveDivider";
import { PageHero } from "@/components/sections/PageHero";
import { CtaFinal } from "@/components/sections/CtaFinal";
import { ContentSlot } from "@/components/ui/MediaSlot";
import { Canoe, RiverLines } from "@/components/ui/Motifs";
import { KeneStrip } from "@/components/ui/graphics/Kene";
import { wa } from "@/lib/site";
import { ArrowRight } from "lucide-react";

export const metadata: Metadata = {
  title: "Comunidade Creators da Amazônia | Ousadia Marketing",
  description:
    "O lugar onde quem tá construindo troca com quem tá construindo, sem pose, sem panelinha, sem guru intocável. Encontros, conteúdo exclusivo, networking real e bastidor.",
};

const DENTRO = [
  {
    emoji: "🤝",
    t: "Encontros",
    d: "Presenciais e online, de mão na massa, não de plateia.",
  },
  {
    emoji: "🔐",
    t: "Conteúdo exclusivo",
    d: "Aulas, análises e ferramentas que não vão pro feed.",
  },
  {
    emoji: "🌐",
    t: "Networking real",
    d: "Parcerias, collabs e indicação de trampo entre membros.",
  },
  {
    emoji: "🎬",
    t: "Bastidor",
    d: "O que a Ousadia tá testando, errando e acertando, em tempo real.",
  },
];

export default function ComunidadePage() {
  return (
    <>
      <PageHero
        eyebrow="Comunidade · Creators da Amazônia"
        title={
          <>
            Onde as coisas acontecem antes de virarem{" "}
            <span className="text-amarelo">tendência</span>.
          </>
        }
        lead="A comunidade Creators da Amazônia é o coração do movimento: o lugar onde quem tá construindo troca com quem tá construindo, sem pose, sem panelinha, sem guru intocável."
      >
        <a href={wa("comunidade")} className="btn btn-primary">
          Quero entrar <ArrowRight size={16} />
        </a>
      </PageHero>

      {/* O que rola */}
      <section className="relative overflow-hidden bg-ink section-padding">
        <div className="container-site relative">
          <Reveal>
            <p className="eyebrow mb-4">Por dentro</p>
            <h2 className="headline-section max-w-2xl">O que rola por dentro</h2>
          </Reveal>
          <div className="mt-12 grid gap-6 sm:grid-cols-2">
            {DENTRO.map((d, i) => (
              <Reveal key={d.t} delay={i * 0.06}>
                <div className="card-surface h-full p-7">
                  <span className="text-2xl" aria-hidden>
                    {d.emoji}
                  </span>
                  <h3 className="font-display text-xl mt-3">{d.t}</h3>
                  <p className="text-body mt-2">{d.d}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Pertencimento */}
      <section className="relative overflow-hidden bg-ink-void section-padding">
        <KeneStrip
          motif="pushu"
          height={20}
          className="absolute inset-x-0 top-0 text-floresta opacity-70"
        />
        <RiverLines className="motif text-rio inset-0 h-full w-full opacity-[0.07]" />
        <Canoe className="motif motif-soft text-amarelo left-1/2 bottom-8 w-72 -translate-x-1/2" />
        <div className="container-site relative max-w-3xl text-center">
          <Reveal>
            <blockquote className="font-display text-2xl leading-snug sm:text-3xl">
              Ninguém constrói movimento sozinho. A gente acredita que{" "}
              <span className="text-amarelo">a verdade vende</span>, que o
              sotaque do Norte vende, e que, junto, isso vira força de região,
              não caso isolado.
            </blockquote>
            <p className="text-body mt-8 text-lg">
              A Amazônia não vai ficar de fora dessa. E quem entra agora, entra
              na <span className="text-floresta">fundação</span>.
            </p>
          </Reveal>
        </div>
      </section>

      {/* Como entrar */}
      <section className="fold-light relative overflow-hidden">
        <WaveDivider
          className="absolute inset-x-0 top-0 rotate-180"
          color="var(--ink-void)"
        />
        <div className="container-site relative section-padding max-w-2xl">
          <Reveal>
            <p className="eyebrow mb-4">Entrada</p>
            <h2 className="headline-section">Como entrar</h2>
            <ContentSlot
              className="mt-8"
              label="Condições, preço e critério de entrada da comunidade. Validar com o time. Ex.: aberta a alunos? assinatura mensal? convite?"
            />
          </Reveal>
        </div>
      </section>

      <CtaFinal
        waveColor="var(--paper)"
        title={
          <>
            Bora fazer parte dos{" "}
            <span className="text-amarelo">Creators da Amazônia</span>?
          </>
        }
        ctaLabel="Quero entrar"
        href={wa("comunidade")}
        microcopy="Você é redirecionado(a) pro WhatsApp. A gente te explica o caminho de entrada."
      />
    </>
  );
}
