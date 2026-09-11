import type { Metadata } from "next";
import { ArrowRight, Megaphone, PenLine, Compass, Video } from "lucide-react";
import { Reveal } from "@/components/ui/Reveal";
import { WaveDivider } from "@/components/ui/WaveDivider";
import { PageHero } from "@/components/sections/PageHero";
import { ContentSlot } from "@/components/ui/MediaSlot";
import { CasesVitrine } from "@/components/sections/Cases";
import { PropostaForm } from "@/components/forms/PropostaForm";
import { GrafismoDiamonds, RiverLines } from "@/components/ui/Motifs";
import { wa } from "@/lib/site";

export const metadata: Metadata = {
  title: "Agência Ousadia | Marketing que vende para marcas da região",
  description:
    "Estratégia, creators locais e conteúdo com identidade, medido por resultado, não por estética de portfólio. Solicite uma proposta.",
};

const SERVICOS = [
  {
    icon: Megaphone,
    t: "Gestão de campanhas com creators",
    d: "Seleção, briefing e gestão de creators da região: gente que fala a língua do seu público porque vive nela. Campanha com rosto, não com banco de imagem.",
  },
  {
    icon: PenLine,
    t: "Estratégia de conteúdo",
    d: "Calendário, linha editorial e produção orientados a objetivo de negócio. Cada post sabe por que existe.",
  },
  {
    icon: Compass,
    t: "Posicionamento de marca",
    d: "Diagnóstico, narrativa e identidade verbal. Sua marca deixa de “postar coisas” e passa a defender uma posição.",
  },
  {
    icon: Video,
    t: "UGC e influência local",
    d: "Conteúdo gerado por creators com cara de gente real, o formato que mais converte hoje, com autenticidade amazônica que nenhuma agência de fora replica.",
  },
];

const PROCESSO = [
  {
    t: "Diagnóstico",
    d: "Imersão na marca, no mercado e nos números. Sem achismo: a gente entende antes de propor.",
  },
  {
    t: "Estratégia",
    d: "Plano com posicionamento, canais, creators e metas, apresentado em linguagem de negócio, não de agência.",
  },
  {
    t: "Execução",
    d: "Produção, campanhas e gestão com cadência semanal e aprovações ágeis.",
  },
  {
    t: "Medição",
    d: "Relatório do que importa: alcance qualificado, leads e venda. O que não performa, a gente corta.",
  },
];

export default function AgenciaPage() {
  return (
    <>
      <PageHero
        eyebrow="Agência · Para marcas"
        motif="river"
        title={
          <>
            Marketing que <span className="text-amarelo">vende</span>, não
            marketing bonito.
          </>
        }
        lead="Para marcas que querem comunicar com alma e vender com método. Estratégia, creators locais e conteúdo com identidade, medido por resultado, não por estética de portfólio."
      >
        <a href={wa("agencia")} className="btn btn-primary">
          Solicitar proposta <ArrowRight size={16} />
        </a>
      </PageHero>

      {/* Serviços */}
      <section className="relative overflow-hidden bg-ink section-padding">
        <div className="container-site relative">
          <Reveal>
            <p className="eyebrow mb-4">Serviços</p>
            <h2 className="headline-section max-w-2xl">O que a gente entrega</h2>
          </Reveal>
          <div className="mt-12 grid gap-6 md:grid-cols-2">
            {SERVICOS.map((s, i) => (
              <Reveal key={s.t} delay={i * 0.06}>
                <div className="card-surface h-full p-7">
                  <s.icon className="text-rio mb-4" size={28} />
                  <h3 className="font-display text-xl">{s.t}</h3>
                  <p className="text-body mt-3 text-[0.95rem]">{s.d}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Processo */}
      <section className="fold-light relative overflow-hidden">
        <WaveDivider
          className="absolute inset-x-0 top-0 rotate-180"
          color="var(--ink)"
        />
        <div className="container-site relative section-padding">
          <Reveal>
            <p className="eyebrow mb-4">Método</p>
            <h2 className="headline-section max-w-2xl">Como trabalhamos</h2>
            <ContentSlot
              className="mt-6 max-w-xl"
              label="Validar etapas e prazos com o time. A estrutura abaixo é proposta."
            />
          </Reveal>
          <ol className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {PROCESSO.map((p, i) => (
              <Reveal key={p.t} delay={i * 0.06}>
                <li className="card-surface h-full p-6">
                  <span className="font-display text-3xl text-floresta-deep">
                    {i + 1}
                  </span>
                  <h3 className="font-display text-lg mt-2">{p.t}</h3>
                  <p className="text-body mt-2 text-sm">{p.d}</p>
                </li>
              </Reveal>
            ))}
          </ol>
        </div>
      </section>

      {/* Portfólio */}
      <section
        id="cases"
        className="relative overflow-hidden bg-ink-void section-padding scroll-mt-24"
      >
        <RiverLines className="motif motif-soft text-rio inset-x-0 top-1/2 h-32 w-full" />
        <div className="container-site relative">
          <Reveal>
            <p className="eyebrow mb-4">Portfólio</p>
            <h2 className="headline-section">Marcas que confiaram</h2>
          </Reveal>
          <div className="mt-10">
            <CasesVitrine
              frente="agencia"
              slotLabel={(i) => `Case de marca ${i}: logo, desafio e resultado.`}
            />
          </div>
        </div>
      </section>

      {/* Proposta */}
      <section className="relative overflow-hidden bg-roxo-700">
        <GrafismoDiamonds
          color="#ffffff"
          className="absolute inset-0 opacity-[0.04]"
        />
        <div className="container-site relative section-padding max-w-2xl">
          <Reveal>
            <p className="eyebrow mb-4">Proposta</p>
            <h2 className="headline-section">
              Solicite uma <span className="text-amarelo">proposta</span>
            </h2>
            <p className="text-body mt-5">
              Prefere ir direto?{" "}
              <a
                href={wa("agencia")}
                className="text-amarelo underline underline-offset-4"
              >
                Chama no WhatsApp
              </a>
              . Ou deixa os dados que a gente prepara a conversa:
            </p>
          </Reveal>
          <Reveal delay={0.08}>
            <div className="mt-10">
              <PropostaForm />
            </div>
          </Reveal>
        </div>
      </section>
    </>
  );
}
