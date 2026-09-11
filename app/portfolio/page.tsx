import type { Metadata } from "next";
import { Reveal } from "@/components/ui/Reveal";
import { WaveDivider } from "@/components/ui/WaveDivider";
import { PageHero } from "@/components/sections/PageHero";
import { CtaFinal } from "@/components/sections/CtaFinal";
import { CaseCard } from "@/components/sections/Cases";
import { MediaSlot, ContentSlot } from "@/components/ui/MediaSlot";
import { Leaf, RiverLines } from "@/components/ui/Motifs";
import { KeneStrip } from "@/components/ui/graphics/Kene";
import { casesPorServico, SERVICOS, type Servico } from "@/lib/portfolio";
import { wa } from "@/lib/site";

export const metadata: Metadata = {
  title: "Portfólio | Cases da Ousadia Marketing",
  description:
    "Campanhas de UGC, institucionais gravados em campo e turmas presenciais: o que a Ousadia já entregou para marcas, projetos e pessoas da Amazônia.",
};

/** Mesma ordem da apresentação comercial: rede, vídeo e formação. */
const ORDEM: Servico[] = ["redes", "audiovisual", "formacao"];

/** A dobra clara logo abaixo emenda a onda na cor da última dobra de case. */
const ULTIMA = SERVICOS[ORDEM[ORDEM.length - 1]];

const CRITERIOS = [
  {
    t: "Trabalho que a gente fez mesmo",
    d: "Todo case aqui saiu da nossa mão: roteiro, captação, edição, formação. Nada de logo de cliente que só pediu orçamento.",
  },
  {
    t: "Imagem própria, zero banco",
    d: "As fotos e os vídeos desta página foram captados pela Ousadia, em campo. A gente não ilustra a Amazônia com stock.",
  },
  {
    t: "Número que dá pra conferir",
    d: "Quando o resultado está medido, ele aparece. Quando não está, o espaço fica marcado como pendente em vez de virar número redondo inventado.",
  },
  {
    t: "Com autorização",
    d: "Rosto, nome e print só entram com o sim de quem aparece. Prova social não se pega emprestado.",
  },
];

/**
 * Uma frente de serviço com seus cases.
 *
 * Cada serviço pinta a própria dobra (`meta.fundo`), então percorrer a página
 * é ver a cor mudar a cada bloco — roxo, azul-rio, verde. A faixa de grafismo
 * no topo marca a emenda entre uma dobra e a anterior.
 */
function SecaoServico({ servico }: { servico: Servico }) {
  const meta = SERVICOS[servico];
  const cases = casesPorServico(servico);

  return (
    <section
      id={servico}
      className={`fold-case ${meta.fundo} overflow-hidden section-padding scroll-mt-24`}
    >
      <KeneStrip
        motif="ronoa"
        height={20}
        className="absolute inset-x-0 top-0 opacity-70"
        style={{ color: meta.acento }}
      />
      <RiverLines className="motif motif-soft inset-x-0 top-1/2 h-32 w-full text-white" />
      <div className="container-site relative">
        <Reveal>
          <p className="eyebrow mb-4">{meta.label}</p>
          <h2 className="headline-section">{meta.titulo}</h2>
          <p className="text-body mt-5 max-w-2xl">{meta.lead}</p>
        </Reveal>

        <div className="mt-12 grid items-start gap-6 lg:grid-cols-2">
          {cases.length > 0 ? (
            cases.map((c, i) => (
              <Reveal key={c.slug} delay={i * 0.05}>
                <CaseCard c={c} />
              </Reveal>
            ))
          ) : (
            <Reveal>
              <div className="card-surface h-full p-6">
                <ContentSlot
                  label={`Primeiro case de ${meta.label}: nome, nicho, o que foi entregue e o resultado.`}
                />
              </div>
            </Reveal>
          )}
        </div>
      </div>
    </section>
  );
}

export default function PortfolioPage() {
  return (
    <>
      <PageHero
        eyebrow="Portfólio"
        title={
          <>
            Tem história que{" "}
            <span className="text-amarelo">banco de imagem nenhum</span> vai
            contar.
          </>
        }
        lead="A da floresta, só quem vive nela consegue captar. Campanha, institucional e formação — tudo gravado em campo, com quem produz."
        motif="river"
      >
        <nav aria-label="Frentes do portfólio" className="flex flex-wrap gap-2">
          {ORDEM.map((s) => (
            <a
              key={s}
              href={`#${s}`}
              className="rounded-full border border-border px-4 py-2 font-mono text-xs uppercase tracking-wider text-cinza-ink transition-colors hover:border-amarelo hover:text-amarelo"
            >
              {SERVICOS[s].label}
            </a>
          ))}
        </nav>
      </PageHero>

      {/* Tese — por que território não é cenário */}
      <section className="relative overflow-hidden bg-ink-void section-padding">
        <Leaf className="motif motif-soft text-floresta -right-10 top-10 hidden w-64 rotate-12 lg:block" />
        <div className="container-site relative grid gap-10 lg:grid-cols-2">
          <Reveal>
            <h2 className="font-display text-3xl leading-tight sm:text-4xl">
              Sua marca nasceu de um território. Por que a comunicação dela
              parece ter nascido em{" "}
              <span className="text-amarelo">qualquer lugar</span>?
            </h2>
          </Reveal>
          <Reveal delay={0.08}>
            <div className="text-body space-y-4">
              <p>
                A Ousadia nasceu na Amazônia e entende que território não é
                cenário: é estratégia, repertório e diferenciação. Antes de
                produzir qualquer campanha, a gente mergulha na origem da marca,
                no contexto em que ela atua e nas pessoas que fazem parte da sua
                história.
              </p>
              <p>
                Do posicionamento ao conteúdo. Da narrativa ao audiovisual. Da
                estratégia à distribuição. A gente não coloca uma folha verde
                numa campanha e chama de Amazônia —{" "}
                <strong className="font-semibold text-foreground">
                  constrói comunicação a partir dela.
                </strong>
              </p>
            </div>
          </Reveal>
        </div>
      </section>

      {ORDEM.map((s) => (
        <SecaoServico key={s} servico={s} />
      ))}

      {/* Critério — o que faz um trabalho virar case aqui */}
      <section className="fold-light relative overflow-hidden">
        <WaveDivider
          className="absolute inset-x-0 top-0 rotate-180"
          color={ULTIMA.fundoVar}
        />
        <div className="container-site relative section-padding">
          <Reveal>
            <p className="eyebrow mb-4">Critério</p>
            <h2 className="headline-section max-w-2xl">
              O que precisa acontecer pra virar case aqui
            </h2>
            <p className="text-body mt-5 max-w-2xl">
              “Marketing Mobral” também acontece em portfólio: logo de cliente
              que nunca fechou contrato, print recortado, número sem base. Esses
              são os quatro filtros que a gente aplica antes de publicar.
            </p>
          </Reveal>
          <div className="mt-12 grid gap-6 sm:grid-cols-2">
            {CRITERIOS.map((c, i) => (
              <Reveal key={c.t} delay={i * 0.05}>
                <div className="card-surface h-full p-6">
                  <h3 className="font-display text-lg">{c.t}</h3>
                  <p className="text-body mt-2 text-sm">{c.d}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Marcas e palcos */}
      <section className="relative overflow-hidden bg-ink section-padding">
        <KeneStrip
          motif="pushu"
          height={20}
          className="absolute inset-x-0 top-0 text-floresta opacity-70"
        />
        <div className="container-site relative">
          <Reveal>
            <p className="eyebrow mb-4">Marcas e palcos</p>
            <h2 className="headline-section">Por onde a Ousadia passou</h2>
          </Reveal>
          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }, (_, i) => (
              <Reveal key={i} delay={i * 0.05}>
                <MediaSlot
                  kind="foto"
                  ratio="aspect-[3/2]"
                  label={`Logo ${i + 1} de marca atendida, evento ou mídia. Só quem autorizou aparecer.`}
                />
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <CtaFinal
        waveColor="var(--ink)"
        title={
          <>
            Vamos transformar a sua origem em um conteúdo que o mercado{" "}
            <span className="text-amarelo">entende e compra</span>?
          </>
        }
        lead="Marca querendo campanha, projeto querendo institucional ou equipe querendo formação: começa do mesmo jeito, com uma conversa."
        ctaLabel="Quero conversar com a Ousadia"
        href={wa("portfolio")}
        microcopy="Você é redirecionado(a) pro WhatsApp. Atendimento humano, sem robô de funil."
      />
    </>
  );
}
