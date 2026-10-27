import type { Metadata } from "next";
import { Reveal } from "@/components/ui/Reveal";
import { WaveDivider } from "@/components/ui/WaveDivider";
import { PageHero } from "@/components/sections/PageHero";
import { CtaFinal } from "@/components/sections/CtaFinal";
import { OdsCompromisso } from "@/components/sections/OdsCompromisso";
import Image from "next/image";
import { ContentSlot } from "@/components/ui/MediaSlot";
import { Leaf, RiverLines } from "@/components/ui/Motifs";
import { KeneStrip } from "@/components/ui/graphics/Kene";
import { SITE, wa } from "@/lib/site";
import { ArrowRight } from "lucide-react";

export const metadata: Metadata = {
  alternates: { canonical: "/sobre" },
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
      "Começar do zero não foi um ato de coragem cinematográfica. Foi um ato de medo administrado. Sem investidor, sem equipe, sem mentor famoso, sem palco em São Paulo. Só um notebook, madrugadas e a Ousadia Marketing nascendo enquanto os números da tela ainda não mostravam resultado nenhum.",
      "Foi nessa fase que ele aprendeu, na pele, a tese que hoje sustenta tudo que a Ousadia ensina: ousadia não é ausência de medo. É ação apesar dele. E o perfeccionismo, aquele que manda regravar quinze vezes e adiar o lançamento “só mais uma semana”, não é padrão de qualidade. É medo de gente arrumada.",
    ],
  },
  {
    t: "A prova",
    p: [
      "Por trás de cada ano, gente. Mais de 30 turmas presenciais, 500 alunos formados e mais de mil pessoas impactadas entre cursos, palestras e eventos: a mãe que gravava escondida no quarto e hoje aparece todo dia, o lojista que achava que “isso de internet” não era pra ele, a creator que postava no escuro e aprendeu a ligar a luz.",
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

type Foto = { src: string; alt: string; w: number; h: number };

/** Fotos das turmas de 2020–2022: galeria na linha do tempo. */
const SALA_DE_AULA: Foto[] = [
  { src: "/sobre/turma-certificados.webp", alt: "Turma comemorando com os certificados na mão", w: 1200, h: 1047 },
  { src: "/sobre/aula-revisao.webp", alt: "Jackson dando aula diante de um flip chart com a revisão do dia", w: 540, h: 675 },
  { src: "/sobre/turma-educom.webp", alt: "Jackson com uma turma presencial", w: 1200, h: 1200 },
  { src: "/sobre/palestra-sebrae.webp", alt: "Jackson palestrando em evento do Sebrae", w: 919, h: 919 },
  { src: "/sobre/imersao-jornada-premium.webp", alt: "Jackson conduzindo a Imersão Jornada Premium", w: 1200, h: 1200 },
];

const MARCOS: {
  ano: string;
  t: string;
  d: string;
  fotos?: Foto[];
  /** Muitas fotos: grade de quadrados em vez de fotos grandes. */
  galeria?: boolean;
}[] = [
  {
    ano: "2020",
    t: "A primeira sala",
    d: "Janeiro, Brasil Novo: nasce a Imersão ABC do Marketing Digital. Sem marca, sem logo bonito, sem palco: uma turma presencial de gente querendo entender o digital e aprender a se comunicar com verdade. Ninguém sabia ainda, mas ali começava a Ousadia.",
    fotos: [
      { src: "/sobre/abc-brasil-novo-2020.webp", alt: "Turma da Imersão ABC do Marketing Digital em Brasil Novo, janeiro de 2020", w: 1080, h: 1080 },
      { src: "/sobre/abc-turma-selfie.webp", alt: "Jackson em selfie com uma turma do ABC do Marketing Digital", w: 1200, h: 901 },
    ],
  },
  {
    ano: "2021–2022",
    t: "Todo mundo pedia mais",
    d: "Turma atrás de turma, palestra atrás de palestra, e no fim de cada uma a mesma pergunta: “e agora, o que vem depois?”. Em 2022, o nome “ABC do Marketing” precisou mudar, porque pertencia a outra empresa. O Jackson perguntou pra quem tinha passado pelas turmas, e a resposta foi Destrave: o que travava as pessoas nunca foi técnica, era medo de aparecer. No mesmo ano, a primeira edição do Amazon Marketing Day provou que dava pra lotar um congresso de marketing na Amazônia sem importar guru.",
    fotos: SALA_DE_AULA,
    galeria: true,
  },
  {
    ano: "2023",
    t: "Primeiro pivô: agência e produtora",
    d: "Os alunos queriam mais, e as empresas também: queriam alguém que fizesse junto. A Ousadia escutou e abriu agência e produtora, e em outubro começou oficialmente como empresa. No mesmo ano, a segunda edição do Amazon Marketing Day mostrou que o primeiro palco não tinha sido sorte.",
    fotos: [
      { src: "/sobre/amd-plateia.webp", alt: "Jackson no palco da segunda edição do Amazon Marketing Day, com a plateia", w: 782, h: 444 },
      { src: "/sobre/amd-jackson-microfone.webp", alt: "Jackson com o microfone na segunda edição do Amazon Marketing Day", w: 1076, h: 607 },
    ],
  },
  {
    ano: "2024",
    t: "O tombo e a volta pra casa",
    d: "Agência e produtora a todo vapor, a Agência-Escola tomando forma e, em novembro, o time completo, de camisa da Ousadia e sorriso de fim de ano. Semanas depois, a empresa quebra financeiramente. A lição veio dura e clara: o coração da Ousadia sempre foi ensinar. Ainda no fim de 2024, ela volta pra sala de aula com turmas presenciais de Vídeo Maker, Social Media e Tráfego Pago.",
    fotos: [
      { src: "/sobre/time-ousadia-2024.webp", alt: "Time da Ousadia reunido em novembro de 2024", w: 738, h: 1200 },
    ],
  },
  {
    ano: "2025",
    t: "Segundo pivô: a região em cena",
    d: "Novas turmas, as primeiras mentorias em grupo e o nascimento do Método EVO. E quem se formou aqui vira equipe: com os alunos, a Ousadia vai pra cobertura dos grandes eventos da região, como FLIX, Expoalta, COP30, Corrida Viva Altamira, Forró APAExonado e os Jogos Indígenas, com talento local atrás e na frente das câmeras. No meio disso tudo, ficou claro o que faltava: um lugar pra essa gente toda se encontrar.",
    fotos: [
      { src: "/sobre/oficina-fotografia-rio.webp", alt: "Jackson com alunos, crianças e educadores numa oficina de fotografia à sombra de uma árvore, na beira do rio", w: 1200, h: 800 },
    ],
  },
  {
    ano: "Fev 2026",
    t: "Nasce a Creators da Amazônia",
    d: "O lançamento da Comunidade Creators da Amazônia junta creators e empreendedores da região num só lugar. Vêm junto a Gestão de UGC do Programa de Embaixadoras da Ekilibre Amazônia e mais uma cobertura dos Jogos Indígenas.",
    fotos: [
      { src: "/sobre/comunidade-lancamento-2026.webp", alt: "Evento de lançamento da Comunidade Creators da Amazônia, fevereiro de 2026", w: 908, h: 1191 },
    ],
  },
  {
    ano: "Ago 2026",
    t: "Terceiro pivô: bioeconomia",
    d: "A Ousadia se reposiciona no mercado e entende onde é o seu lugar: a bioeconomia. Estratégia, comunicação e creators a serviço de quem produz na Amazônia, contando a própria história com o próprio sotaque.",
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

/**
 * Página de perfil do fundador: aponta para a entidade `#fundador` declarada
 * no layout, em vez de repetir os dados. É o que o Google usa pra ligar a
 * pessoa à marca (autoria, painel de conhecimento) e o que as IAs citam.
 */
const perfilJsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": ["AboutPage", "ProfilePage"],
      "@id": `${SITE.url}/sobre/#pagina`,
      url: `${SITE.url}/sobre/`,
      name: "Sobre a Ousadia Marketing",
      inLanguage: "pt-BR",
      about: { "@id": `${SITE.url}/#organizacao` },
      mainEntity: { "@id": `${SITE.url}/#fundador` },
      isPartOf: { "@id": `${SITE.url}/#site` },
    },
    {
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Início", item: `${SITE.url}/` },
        { "@type": "ListItem", position: 2, name: "Sobre", item: `${SITE.url}/sobre/` },
      ],
    },
  ],
};

export default function SobrePage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(perfilJsonLd) }}
      />
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
            <Image
              src="/sobre/jackson-amd-palco.webp"
              alt="Jackson de braços abertos no Amazon Marketing Day, com a plateia atrás"
              width={1200}
              height={679}
              priority
              className="glow-amarelo w-full rounded-2xl lg:sticky lg:top-24"
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
                    <>
                      <ContentSlot
                        className="mt-5"
                        label="Trecho na voz do próprio Jackson sobre os primeiros meses: o que quase deu errado, o que segurou ele."
                      />
                      <div id="historico" className="mt-10 scroll-mt-24">
                        <p className="eyebrow mb-3">A construção</p>
                        <ol className="mt-6 space-y-0 border-l border-border">
                          {MARCOS.map((m, mi) => (
                            <Reveal key={m.t} delay={mi * 0.05}>
                              <li className="relative pb-8 pl-8">
                                <span
                                  className="absolute -left-[5px] top-1.5 h-2.5 w-2.5 rounded-full bg-amarelo"
                                  aria-hidden
                                />
                                <span className="font-mono text-xs uppercase tracking-widest text-amarelo">
                                  {m.ano}
                                </span>
                                <h3 className="font-display text-lg mt-1">
                                  {m.t}
                                </h3>
                                <p className="text-body mt-2 text-[0.95rem]">
                                  {m.d}
                                </p>
                                {m.fotos && (
                                  <div
                                    className={`mt-4 grid gap-3 ${m.galeria ? "grid-cols-2 sm:grid-cols-3" : m.fotos.length > 1 ? "sm:grid-cols-2" : "max-w-md"}`}
                                  >
                                    {m.fotos.map((f) => (
                                      <Image
                                        key={f.src}
                                        src={f.src}
                                        alt={f.alt}
                                        width={f.w}
                                        height={f.h}
                                        className={`w-full rounded-lg object-cover ${m.galeria ? "aspect-square" : "max-h-96"}`}
                                      />
                                    ))}
                                  </div>
                                )}
                              </li>
                            </Reveal>
                          ))}
                        </ol>
                      </div>
                    </>
                  )}
                </article>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Manifesto */}
      <section className="relative overflow-hidden bg-ink-void section-padding">
        <KeneStrip
          motif="pushu"
          height={20}
          className="absolute inset-x-0 top-0 text-floresta opacity-70"
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
                  marketing de copia e cola
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

      {/* Valores */}
      <section className="fold-light relative overflow-hidden">
        <WaveDivider
          className="absolute inset-x-0 top-0 rotate-180"
          color="var(--ink-void)"
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

      <OdsCompromisso />

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
