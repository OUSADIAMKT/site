import type { Metadata } from "next";
import { Reveal } from "@/components/ui/Reveal";
import { WaveDivider } from "@/components/ui/WaveDivider";
import { PageHero } from "@/components/sections/PageHero";
import { CtaFinal } from "@/components/sections/CtaFinal";
import { MediaSlot, ContentSlot } from "@/components/ui/MediaSlot";
import { GrafismoBand, Leaf, RiverLines } from "@/components/ui/Motifs";
import { wa } from "@/lib/site";
import { ArrowRight } from "lucide-react";

export const metadata: Metadata = {
  title: "Sobre a Ousadia | A história por trás do movimento",
  description:
    "Por que a primeira Agência Escola de Marketing do Norte existe, e por que ela tinha que nascer aqui. A história do Jackson, o manifesto e os valores da Ousadia.",
};

const CAPITULOS = [
  {
    t: "A ruptura",
    p: [
      "Durante 18 anos, o Jackson foi servidor público. Do lado de fora, era o roteiro perfeito: estabilidade, contracheque no dia certo, aposentadoria no horizonte. Do lado de dentro, era outra coisa: a sensação diária de assistir a própria vida pela janela, como quem vê o rio passar e nunca entra na água.",
      "O incômodo não era com o trabalho. Era com a pergunta que não calava: “e se eu tivesse tentado?” Tem gente que aprende a conviver com essa pergunta. O Jackson não conseguiu.",
    ],
  },
  {
    t: "O salto",
    p: [
      "Largar 18 anos de estabilidade não foi um ato de coragem cinematográfica. Foi um ato de medo administrado. Sem investidor, sem equipe, sem mentor famoso, sem palco em São Paulo. Só um notebook, madrugadas e a Ousadia Marketing nascendo enquanto os números da tela ainda não mostravam resultado nenhum.",
      "Foi nessa fase que ele aprendeu, na pele, a tese que hoje sustenta tudo que a Ousadia ensina: ousadia não é ausência de medo. É ação apesar dele. E o perfeccionismo, aquele que manda regravar quinze vezes e adiar o lançamento “só mais uma semana”, não é padrão de qualidade. É medo de gente arrumada.",
    ],
  },
  {
    t: "A prova",
    p: [
      "O método foi testado em sala, não em tese. Foram mais de 22 turmas presenciais, centenas de alunos formados: a mãe que gravava escondida no quarto e hoje aparece todo dia, o lojista que achava que “isso de internet” não era pra ele, a creator que postava no escuro e aprendeu a ligar a luz.",
      "No meio do caminho, o Amazon Marketing Day, em duas edições, provou que dava pra encher um evento de marketing na Amazônia sem importar guru: o palco era nosso, o sotaque era nosso, e as cadeiras lotaram.",
    ],
  },
  {
    t: "O propósito",
    p: [
      "Em algum ponto, ficou claro que aquilo não era mais uma agência nem só uma escola. Era um movimento de reposicionamento de uma região inteira. Porque o Norte nunca teve problema de talento. Teve problema de espelho: passou décadas se enxergando pela lente de quem dizia que sucesso tinha endereço, e não era o nosso.",
      "O Norte nunca esteve atrasado. Tava só sem voz. A Ousadia existe pra ser o amplificador dessa voz, com estratégia, criatividade e IA, sem apagar o sotaque de ninguém.",
    ],
  },
];

const MARCOS = [
  {
    ano: "{{ANO}}",
    t: "A ruptura",
    d: "Jackson deixa 18 anos de serviço público e funda a Ousadia Marketing.",
  },
  {
    ano: "{{ANO}}",
    t: "Primeiras turmas",
    d: "O método sai do papel e vai pra sala de aula presencial, em formato de agência escola.",
  },
  {
    ano: "{{ANO}}",
    t: "Amazon Marketing Day, 1ª edição",
    d: "O primeiro grande palco de marketing da região, feito por gente daqui.",
  },
  {
    ano: "{{ANO}}",
    t: "Amazon Marketing Day, 2ª edição",
    d: "A prova de que não foi sorte: o evento cresce e consolida o movimento.",
  },
  {
    ano: "Hoje",
    t: "22+ turmas, +500 alunos",
    d: "A primeira Agência Escola de Marketing do Norte vira plataforma: cursos, mentoria, agência e a comunidade Creators da Amazônia.",
  },
];

const VALORES = [
  {
    t: "A verdade vende",
    d: "Prova social real, história real, resultado real. Aqui ninguém posa de rico alugado nem inventa print.",
  },
  {
    t: "Método > feeling",
    d: "Feeling é o nome bonito do improviso. Estratégia se aprende, se aplica e se mede.",
  },
  {
    t: "Autenticidade regional",
    d: "Sotaque não se apaga, se amplifica. A identidade da Amazônia é diferencial competitivo, não obstáculo.",
  },
  {
    t: "Execução > consumo",
    d: "Curso assistido não muda vida; projeto executado, sim. Você sai daqui com trabalho feito, não com PDF salvo.",
  },
  {
    t: "IA como ferramenta",
    d: "A máquina serve à sua voz, nunca a substitui. Velocidade sem perder a alma.",
  },
];

export default function SobrePage() {
  return (
    <>
      <PageHero
        eyebrow="Sobre a Ousadia"
        title={
          <>
            Antes de mover uma região, a gente teve que se{" "}
            <span className="text-amarelo">mover primeiro</span>.
          </>
        }
        lead="Esta não é uma página institucional. É a história de por que a primeira Agência Escola de Marketing do Norte existe, e por que ela tinha que nascer aqui."
      />

      {/* A história */}
      <section className="relative overflow-hidden bg-ink section-padding">
        <RiverLines className="motif motif-soft text-rio inset-x-0 top-1/3 h-40 w-full" />
        <div className="container-site relative grid gap-12 lg:grid-cols-[1fr_1.4fr]">
          <Reveal>
            <MediaSlot
              className="glow-amarelo lg:sticky lg:top-24"
              label="Foto do Jackson em contexto regional: sem pose de guru, com verdade."
            />
          </Reveal>
          <div className="space-y-12">
            {CAPITULOS.map((c, i) => (
              <Reveal key={c.t} delay={i * 0.05}>
                <article>
                  <h2 className="font-display text-2xl text-amarelo sm:text-3xl">
                    {c.t}
                  </h2>
                  <div className="text-body mt-4 space-y-4">
                    {c.p.map((p) => (
                      <p key={p.slice(0, 24)}>{p}</p>
                    ))}
                  </div>
                  {c.t === "O salto" && (
                    <ContentSlot
                      className="mt-5"
                      label="Trecho na voz do próprio Jackson sobre os primeiros meses: o que quase deu errado, o que segurou ele."
                    />
                  )}
                </article>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Manifesto */}
      <section className="relative overflow-hidden bg-ink-void section-padding">
        <GrafismoBand
          color="#23b26f"
          height={20}
          className="absolute inset-x-0 top-0 opacity-70"
        />
        <Leaf className="motif motif-soft text-floresta -left-10 bottom-10 hidden w-64 -rotate-12 lg:block" />
        <div className="container-site relative max-w-3xl">
          <Reveal>
            <p className="eyebrow mb-6">Manifesto</p>
            <h2 className="font-display text-4xl leading-[1.05] sm:text-5xl">
              Por um marketing <span className="text-amarelo">maior</span>.
            </h2>
          </Reveal>
          <Reveal delay={0.1}>
            <div className="text-body mt-9 space-y-6 text-lg">
              <p>
                A gente acredita que{" "}
                <strong className="font-semibold text-amarelo">
                  a verdade vende
                </strong>
                . Que o sotaque do Norte vende. Que a história do servidor
                público que largou 18 anos de estabilidade vende. Que a mãe que
                grava escondida no quarto vende. Que a beira do rio vende mais
                que estúdio alugado.
              </p>
              <p>
                A gente acredita que marketing não é maquiagem: é comunicação
                com método. Que “post bonitinho” sem estratégia é{" "}
                <strong className="font-semibold text-foreground">
                  marketing Mobral
                </strong>
                . E que ninguém aqui precisa imitar guru de São Paulo pra
                crescer.
              </p>
              <p>
                A gente acredita que a Amazônia não vai ficar de fora dessa. Não
                como cenário.{" "}
                <span className="text-floresta">Como protagonista.</span>
              </p>
              <p className="font-display text-2xl text-foreground">
                E agora tem voz.
              </p>
            </div>
          </Reveal>
          <Reveal delay={0.15}>
            <a href={wa("comunidade")} className="btn btn-primary mt-10">
              Faço parte desse movimento <ArrowRight size={16} />
            </a>
          </Reveal>
        </div>
      </section>

      {/* Linha do tempo */}
      <section className="relative overflow-hidden bg-roxo section-padding">
        <div className="container-site relative">
          <Reveal>
            <p className="eyebrow mb-4">Linha do tempo</p>
            <h2 className="headline-section">Os marcos do caminho</h2>
            <ContentSlot
              className="mt-6 max-w-xl"
              label="Confirmar anos e ordem com o cliente antes de publicar."
            />
          </Reveal>
          <ol className="mt-12 space-y-0 border-l border-border">
            {MARCOS.map((m, i) => (
              <Reveal key={m.t} delay={i * 0.05}>
                <li className="relative pb-10 pl-8">
                  <span
                    className="absolute -left-[5px] top-1.5 h-2.5 w-2.5 rounded-full bg-amarelo"
                    aria-hidden
                  />
                  <span className="font-mono text-xs uppercase tracking-widest text-amarelo">
                    {m.ano}
                  </span>
                  <h3 className="font-display text-xl mt-1">{m.t}</h3>
                  <p className="text-body mt-2 max-w-xl text-[0.95rem]">{m.d}</p>
                </li>
              </Reveal>
            ))}
          </ol>
        </div>
      </section>

      {/* Valores */}
      <section className="fold-light relative overflow-hidden">
        <WaveDivider
          className="absolute inset-x-0 top-0 rotate-180"
          color="var(--roxo)"
        />
        <div className="container-site relative section-padding">
          <Reveal>
            <p className="eyebrow mb-4">Valores</p>
            <h2 className="headline-section max-w-2xl">
              No que a gente acredita (e cobra)
            </h2>
          </Reveal>
          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {VALORES.map((v, i) => (
              <Reveal key={v.t} delay={i * 0.05}>
                <div className="card-surface h-full p-6">
                  <h3 className="font-display text-lg">{v.t}</h3>
                  <p className="text-body mt-2 text-sm">{v.d}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <CtaFinal
        waveColor="var(--paper)"
        title={
          <>
            Gostou da história? Ela também pode ser o{" "}
            <span className="text-amarelo">começo da sua</span>.
          </>
        }
        ctaLabel="Quero conversar com a Ousadia"
        href={wa("sobre")}
        microcopy="Você é redirecionado(a) pro WhatsApp. Atendimento humano, sem robô de funil."
      />
    </>
  );
}
