import Link from "next/link";
import type { Metadata } from "next";
import { ArrowRight, Brain, Gem, Sparkles, Target } from "lucide-react";
import { Reveal } from "@/components/ui/Reveal";
import { WaveDivider } from "@/components/ui/WaveDivider";
import { MediaSlot, ContentSlot } from "@/components/ui/MediaSlot";
import { HeroVideo } from "@/components/ui/HeroVideo";
import { FaqList, FaqJsonLd, type FaqItem } from "@/components/sections/Faq";
import {
  Leaf,
  Paddle,
  Canoe,
  Tree,
  RiverLines,
  GrafismoBand,
  GrafismoDiamonds,
} from "@/components/ui/Motifs";
import { STATS, wa } from "@/lib/site";

export const metadata: Metadata = {
  title:
    "Ousadia Marketing | Agência Escola e Plataforma de Creators da Amazônia",
  description:
    "A primeira Agência Escola de Marketing do Norte do Brasil. Cursos, mentorias e comunidade para quem quer parar de postar no escuro e começar a vender com estratégia, criatividade e IA.",
};

const DORES = [
  {
    t: "“Eu sei que tenho potencial, mas não sei o caminho.”",
    d: "Conhecimento de sobra. Direção, zero. Você consome 8h de Reels por dia e termina mais perdido do que começou.",
  },
  {
    t: "“Posto e ninguém vê. Quando vê, ninguém compra.”",
    d: "Bio sem estratégia é igual currículo sem nome: ninguém entende quem você é, então ninguém aperta o botão.",
  },
  {
    t: "“Trava na hora de gravar.”",
    d: "Você sabe o que falar. Mas quando o celular acende a luz vermelha, vira outra pessoa. (Spoiler: isso tem técnica. Não tem nada a ver com talento.)",
  },
  {
    t: "“Vejo todo mundo crescendo, menos eu.”",
    d: "Calma. Esse “todo mundo” é uma curadoria de quem o algoritmo te entrega. A maioria também tá perdida, só posta com mais cara de quem não tá.",
  },
];

const PILARES = [
  {
    icon: Target,
    t: "Estratégia",
    d: "Você para de postar pelo feeling. Constrói um plano que tem início, meio e venda.",
  },
  {
    icon: Sparkles,
    t: "Criatividade",
    d: "Você descobre como gravar, editar e narrar com sua cara, sem virar mais um clone do guru de São Paulo.",
  },
  {
    icon: Brain,
    t: "Inteligência Artificial",
    d: "A IA deixa de ser bicho-papão. Vira sua cocriadora, sua editora, seu departamento inteiro.",
  },
  {
    icon: Gem,
    t: "Desenvolvimento pessoal",
    d: "Porque câmera trava no técnico, mas destrava no humano. A gente cuida dos dois.",
  },
];

const ECOSSISTEMA = [
  {
    emoji: "📚",
    t: "Cursos práticos",
    para: "Para quem tá começando ou quer profissionalizar.",
    itens: [
      "ABC do Marketing",
      "Destrave (vergonha de gravar? a gente quebra isso)",
      "Social Media na Prática",
      "Vídeo Maker e Edição",
    ],
    nota: "Você aprende executando, não anotando. Sai com projeto real, não com PDF salvo no celular.",
    cta: "Ver cursos",
    href: "/escola" as const,
  },
  {
    emoji: "💎",
    t: "Mentoria high ticket",
    para: "Para quem já tem base e quer acelerar.",
    itens: [],
    nota: "Acompanhamento direto com o Jackson e o time. Posicionamento, conteúdo, estratégia e venda: tudo desenhado pra você, não pra “todo mundo”. Vagas limitadas. Aplicação obrigatória.",
    cta: "Aplicar para a mentoria",
    href: "/mentoria" as const,
  },
  {
    emoji: "🚀",
    t: "Agência (para marcas)",
    para: "Para empresas que querem comunicar com alma e vender com método.",
    itens: [
      "Gestão de campanhas com creators",
      "Estratégia de conteúdo",
      "Posicionamento de marca",
      "UGC e influência local",
    ],
    nota: "Não fazemos “marketing bonito”. Fazemos marketing que vende.",
    cta: "Solicitar proposta",
    href: "/agencia" as const,
  },
  {
    emoji: "🌱",
    t: "Comunidade Creators da Amazônia",
    para: "Para quem quer estar onde as coisas acontecem antes de virarem tendência.",
    itens: [],
    nota: "Comunidade fechada com encontros, conteúdo exclusivo, networking real e bastidor do que a gente tá construindo.",
    cta: "Quero entrar",
    href: "/comunidade" as const,
  },
];

const E_PRA_VOCE = [
  "Você sente que tem potencial, mas não sabe o caminho",
  "Você tá disposto(a) a executar (não só consumir)",
  "Você quer construir algo de verdade, não viralizar por uma semana",
  "Você acredita que autenticidade vende mais que filtro",
  "Você tá cansado(a) de marketing genérico e quer estratégia real",
];

const NAO_E_PRA_VOCE = [
  "Você procura “fórmula mágica de fazer 100 mil em 30 dias”",
  "Você quer só assistir aula sem aplicar",
  "Você acha que método não importa, “feeling resolve”",
  "Você odeia ser desafiado(a)",
  "Você quer marketing Mobral. Aqui não tem.",
];

const FAQ_TXT = [
  {
    q: "“Será que isso funciona pra mim?”",
    a: "Funciona pra quem aplica. A gente já formou desde jovem de 18 anos sem direção até mãe de 35 com dois filhos e medo de gravar. O método é o mesmo. O que muda é o ponto de partida, e a gente respeita o seu.",
  },
  {
    q: "“E se eu não conseguir gravar / aparecer?”",
    a: "Tem um treinamento inteiro só pra isso. Chama Destrave. Não é motivacional: é técnica. A gente ensina como vencer a vergonha, passo a passo, sem você ter que “se forçar”.",
  },
  {
    q: "“E se eu investir e me arrepender?”",
    a: "Tem garantia de 7 dias. Entrou, achou que não é pra você, devolve o dinheiro. Sem drama, sem formulário gigante, sem ligação de retenção.",
  },
  {
    q: "“Preciso ter seguidores pra começar?”",
    a: "Não. Aliás, se você já tem, melhor; mas se não tem, melhor ainda. A gente prefere construir do zero do que desconstruir vícios.",
  },
  {
    q: "“Eu não sou da Amazônia. Posso participar?”",
    a: "Pode. A bandeira é regional, mas o método é universal. A gente já tem aluno em quase todo estado do Brasil.",
  },
  {
    q: "“É um curso ou uma comunidade?”",
    a: "É um ecossistema. Tem curso (conteúdo organizado), tem comunidade (gente fazendo junto), tem mentoria (acompanhamento direto). Você escolhe a porta de entrada.",
  },
  {
    q: "“E essa história de IA? Eu não entendo nada disso.”",
    a: "Melhor ainda. A gente parte do zero. IA na Ousadia é ferramenta, não buzzword. Você vai sair usando, e entendendo o porquê.",
  },
];

const FAQ: FaqItem[] = FAQ_TXT;

export default function HomePage() {
  return (
    <>
      <FaqJsonLd items={FAQ_TXT} />

      {/* ============ 1 · HERO (escuro) ============ */}
      <section className="relative overflow-hidden">
        <HeroVideo
          src="/video/hero.mp4"
          poster="/video/hero-poster.jpg"
          opacity={0.28}
        />
        <div className="absolute inset-0 grid-lines opacity-60" aria-hidden />
        <div
          className="absolute -top-32 right-0 h-96 w-96 rounded-full bg-amarelo/20 blur-[120px]"
          aria-hidden
        />
        <div
          className="absolute top-40 -left-20 h-96 w-96 rounded-full bg-rio/20 blur-[120px]"
          aria-hidden
        />
        <Leaf className="motif motif-soft text-floresta -right-10 top-10 w-72 rotate-12" />
        <Paddle className="motif motif-soft text-amarelo left-[4%] bottom-8 w-20 -rotate-12 hidden xl:block" />

        <div className="container-site relative z-10 section-padding grid gap-12 lg:grid-cols-[1.25fr_1fr] lg:items-center">
          <div>
            <Reveal>
              <p className="eyebrow mb-5">
                Agência Escola de Marketing do Norte
              </p>
            </Reveal>
            <Reveal delay={0.05}>
              <h1 className="headline-hero max-w-3xl">
                Marketing feito na <span className="text-floresta">Amazônia</span>,
                com a força de quem nunca precisou de palco em São Paulo pra{" "}
                <span className="text-amarelo">vender</span>.
              </h1>
            </Reveal>
            <Reveal delay={0.1}>
              <p className="text-body mt-6 max-w-xl">
                Somos a primeira Agência Escola de Marketing do Norte do Brasil.
                Treinamos creators, social medias e empreendedores que querem
                viver do digital, unindo{" "}
                <strong className="font-semibold text-foreground">
                  estratégia, criatividade e inteligência artificial
                </strong>{" "}
                com a alma de quem é da terra.
              </p>
            </Reveal>
            <Reveal delay={0.15}>
              <div className="mt-9 flex flex-col gap-4 sm:flex-row sm:items-center">
                <a href={wa("home")} className="btn btn-primary">
                  Quero entrar pra Ousadia <ArrowRight size={16} />
                </a>
                <a
                  href="#a-dor"
                  className="font-mono text-xs uppercase tracking-wider text-cinza-ink underline-offset-4 transition-colors hover:text-amarelo hover:underline"
                >
                  Ainda explorando? Veja como a gente pensa →
                </a>
              </div>
            </Reveal>
          </div>

          <Reveal delay={0.2}>
            <MediaSlot
              kind="vídeo"
              ratio="aspect-[4/5]"
              className="glow-amarelo"
              label="Jackson em ambiente regional: beira do Tapajós ou palco do Amazon Marketing Day. Zero stock."
            />
          </Reveal>
        </div>
        <GrafismoBand color="#ffc61a" height={22} className="opacity-80" />
      </section>

      {/* ============ 2 · PROVA SOCIAL RÁPIDA (roxo) ============ */}
      <section className="relative overflow-hidden bg-roxo">
        <GrafismoDiamonds
          color="#ffffff"
          className="absolute inset-0 opacity-[0.04]"
        />
        <div className="container-site relative section-padding !py-14">
          <Reveal>
            <p className="font-display text-xl sm:text-2xl leading-snug max-w-3xl">
              Mais de 22 turmas formadas. Centenas de creators destravados. Uma
              região inteira sendo{" "}
              <span className="text-amarelo">reposicionada no digital</span>.
            </p>
          </Reveal>
          <div className="mt-10 grid grid-cols-2 gap-6 md:grid-cols-4">
            {STATS.map((s, i) => (
              <Reveal key={s.l} delay={i * 0.06}>
                <div>
                  <div className="font-display text-4xl font-bold text-amarelo">
                    {s.n}
                  </div>
                  <div className="mt-1 font-mono text-xs uppercase tracking-wider text-cinza-ink">
                    {s.l}
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
          <ContentSlot
            className="mt-10 max-w-xl"
            label="Faixa de logos: marcas atendidas, eventos onde a Ousadia palestrou, mídia que citou."
          />
        </div>
      </section>

      {/* ============ 3 · A DOR (escuro) ============ */}
      <section
        id="a-dor"
        className="relative overflow-hidden section-padding scroll-mt-20"
      >
        <RiverLines className="motif motif-soft text-rio inset-x-0 top-1/2 h-40 w-full -translate-y-1/2" />
        <div className="container-site relative">
          <Reveal>
            <p className="eyebrow mb-4">O problema</p>
            <h2 className="headline-section max-w-3xl">
              Você tem conteúdo. Você tem vontade. Mas o resultado{" "}
              <span className="text-floresta">não vem</span>.
            </h2>
          </Reveal>
          <div className="mt-12 grid gap-5 md:grid-cols-2">
            {DORES.map((d, i) => (
              <Reveal key={d.t} delay={i * 0.06}>
                <div className="card-surface h-full p-6">
                  <h3 className="font-display text-lg leading-snug text-amarelo">
                    {d.t}
                  </h3>
                  <p className="text-body mt-3 text-[0.95rem]">{d.d}</p>
                </div>
              </Reveal>
            ))}
          </div>
          <Reveal delay={0.1}>
            <p className="text-body mt-10 max-w-2xl border-l-2 border-floresta pl-5">
              Se bateu em pelo menos duas dessas, continua rolando. A gente vai
              resolver, sem enrolação.
            </p>
          </Reveal>
        </div>
      </section>

      {/* ============ 4 · A VIRADA (claro) ============ */}
      <section className="fold-light relative overflow-hidden">
        <WaveDivider
          className="absolute inset-x-0 top-0 rotate-180"
          color="var(--ink-deep)"
        />
        <Tree
          className="motif motif-soft text-floresta right-6 top-20 hidden w-64 md:block"
          style={{ color: "#128a52" }}
        />
        <div className="container-site relative section-padding">
          <Reveal>
            <p className="eyebrow mb-4">A virada</p>
            <h2 className="headline-section max-w-3xl">
              A gente não te ensina a “fazer post bonitinho”. A gente te ensina a{" "}
              <span className="text-amarelo">pensar, comunicar e vender</span>.
            </h2>
            <p className="text-body mt-6 max-w-2xl">
              Estratégia é como o projeto de uma casa: sem projeto, dá errado. A
              Ousadia te entrega a planta, e te ensina a construir.
            </p>
          </Reveal>
          <div className="mt-12 grid gap-6 sm:grid-cols-2">
            {PILARES.map((p, i) => (
              <Reveal key={p.t} delay={i * 0.06}>
                <div className="card-surface h-full p-6">
                  <p.icon className="text-floresta mb-4" size={28} />
                  <h3 className="font-display text-xl">{p.t}</h3>
                  <p className="text-body mt-2 text-[0.95rem]">{p.d}</p>
                </div>
              </Reveal>
            ))}
          </div>
          <Reveal delay={0.1}>
            <div className="mt-10 flex flex-col items-start gap-6 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-body max-w-md">
                Cada um desses pilares já transforma. Os quatro juntos? Mudam a
                sua história.
              </p>
              <a href={wa("home")} className="btn btn-primary shrink-0">
                Quero essa transformação <ArrowRight size={16} />
              </a>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ============ 5 · MANIFESTO (escuro profundo) ============ */}
      <section className="relative overflow-hidden bg-ink-void section-padding">
        <RiverLines className="motif text-rio inset-0 h-full w-full opacity-[0.07]" />
        <GrafismoBand
          color="#23b26f"
          height={20}
          className="absolute inset-x-0 top-0 opacity-70"
        />
        <div className="container-site relative max-w-3xl">
          <Reveal>
            <p className="eyebrow mb-6">Movimento Ousadia</p>
            <h2 className="font-display text-4xl leading-[1.05] sm:text-5xl">
              Por um marketing maior.
              <br />
              <span className="text-floresta">
                A Amazônia não vai ficar de fora dessa.
              </span>
            </h2>
          </Reveal>
          <Reveal delay={0.1}>
            <div className="text-body mt-10 space-y-6 text-lg">
              <p>
                Durante anos a gente ouviu que pra “estourar no digital”
                precisava ser de São Paulo. Falar bonito. Ostentar carro. Ter a
                barba aparada na foto preto e branco.
              </p>
              <p className="font-display text-2xl text-foreground">
                A Ousadia nasceu pra provar o contrário.
              </p>
              <p>
                A gente acredita que{" "}
                <strong className="font-semibold text-amarelo">
                  a verdade vende
                </strong>
                . Que sotaque do Norte vende. Que história de quem foi servidor
                público por 18 anos vende. Que mãe que tem vergonha de gravar,
                mas tem conhecimento de sobra, vende.
              </p>
              <p>
                Não é preciso matar partes de si pra caber no padrão de sucesso
                de ninguém.
              </p>
              <p>
                A gente tá construindo a{" "}
                <strong className="font-semibold text-foreground">
                  Plataforma de Creators da Amazônia
                </strong>,{" "}
                uma nova geração de criadores autênticos, estratégicos e
                prontos pro mercado. E queremos você dentro.
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

      {/* ============ 6 · ECOSSISTEMA (roxo) ============ */}
      <section className="relative overflow-hidden bg-roxo section-padding">
        <Leaf className="motif motif-soft text-floresta -left-8 bottom-4 hidden w-56 -rotate-45 lg:block" />
        <div className="container-site relative">
          <Reveal>
            <p className="eyebrow mb-4">O ecossistema</p>
            <h2 className="headline-section max-w-3xl">
              Existe um caminho pra você na Ousadia. Independentemente de{" "}
              <span className="text-amarelo">onde você esteja</span>.
            </h2>
            <p className="text-body mt-6 max-w-2xl">
              Tá começando do zero? Tem um lugar. Já tem público, mas não vende?
              Tem outro. Quer escalar marca? Tem um terceiro. Olha aí:
            </p>
          </Reveal>
          <div className="mt-12 grid gap-6 md:grid-cols-2">
            {ECOSSISTEMA.map((e, i) => (
              <Reveal key={e.t} delay={i * 0.06}>
                <div className="card-surface flex h-full flex-col p-7">
                  <span className="text-2xl" aria-hidden>
                    {e.emoji}
                  </span>
                  <h3 className="font-display text-xl mt-3">{e.t}</h3>
                  <p className="mt-2 font-mono text-xs uppercase tracking-wider text-rio">
                    {e.para}
                  </p>
                  {e.itens.length > 0 && (
                    <ul className="mt-4 space-y-1.5">
                      {e.itens.map((it) => (
                        <li
                          key={it}
                          className="text-body flex items-start gap-2 text-sm"
                        >
                          <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-floresta" />
                          {it}
                        </li>
                      ))}
                    </ul>
                  )}
                  <p className="text-body mt-4 text-sm">{e.nota}</p>
                  <Link
                    href={e.href}
                    className="mt-6 inline-flex items-center gap-2 self-start font-mono text-xs font-semibold uppercase tracking-wider text-amarelo transition-transform hover:translate-x-1"
                  >
                    {e.cta} <ArrowRight size={14} />
                  </Link>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ============ 7 · JACKSON (escuro) ============ */}
      <section className="relative overflow-hidden bg-ink section-padding">
        <Paddle className="motif motif-soft text-amarelo right-[6%] top-10 hidden w-20 rotate-6 lg:block" />
        <div className="container-site relative grid gap-12 lg:grid-cols-[1fr_1.3fr] lg:items-center">
          <Reveal>
            <MediaSlot
              className="glow-amarelo"
              label="Foto real do Jackson: sem pose de guru. Contexto regional."
            />
          </Reveal>
          <Reveal delay={0.1}>
            <div>
              <p className="eyebrow mb-4">Quem lidera</p>
              <h2 className="headline-section">
                Antes de te ensinar a se posicionar, eu mesmo precisei me{" "}
                <span className="text-amarelo">reposicionar</span>.
              </h2>
              <div className="text-body mt-7 space-y-4">
                <p>Trabalhei 18 anos como servidor público.</p>
                <p>
                  Tinha estabilidade, tinha salário, tinha “futuro garantido”.
                  Tinha também uma sensação chata de que eu tava deixando uma
                  versão minha morrer todo dia, na frente da tela do computador,
                  em uma sala que não era minha.
                </p>
                <p>
                  Aí eu fiz o que ninguém em sã consciência faz:{" "}
                  <strong className="font-semibold text-foreground">
                    pulei
                  </strong>
                  .
                </p>
                <p>
                  Estudei marketing como quem estuda pra concurso. Apliquei como
                  quem precisa pagar conta no fim do mês, porque eu precisava.
                  Errei muito. Acertei o suficiente.
                </p>
                <p>
                  Hoje, depois de <strong>22 turmas formadas</strong>, duas
                  edições do <strong>Amazon Marketing Day</strong> e do
                  reconhecimento de uma comunidade que cresce todo dia, eu
                  entendi uma coisa:
                </p>
                <p className="font-display text-2xl text-floresta">
                  O Norte não tá atrás. O Norte tava só sem voz.
                </p>
                <p>A Ousadia é a minha forma de devolver essa voz.</p>
              </div>
              <div className="mt-8 flex flex-col gap-4 sm:flex-row">
                <a href={wa("sobre")} className="btn btn-primary">
                  Quero conversar com a Ousadia <ArrowRight size={16} />
                </a>
                <Link href="/sobre" className="btn btn-secondary">
                  Ler a história completa
                </Link>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ============ 8 · PROVA SOCIAL PESADA (claro) ============ */}
      <section className="fold-light relative overflow-hidden">
        <WaveDivider
          className="absolute inset-x-0 top-0 rotate-180"
          color="var(--ink)"
        />
        <div className="container-site relative section-padding">
          <Reveal>
            <p className="eyebrow mb-4">Prova social</p>
            <h2 className="headline-section">Não é a gente que diz. São eles.</h2>
          </Reveal>

          <div className="mt-12 space-y-12">
            <div>
              <h3 className="font-mono text-xs uppercase tracking-widest text-floresta-deep">
                Depoimentos em vídeo
              </h3>
              <div className="mt-5 grid gap-5 sm:grid-cols-3">
                {[1, 2, 3].map((i) => (
                  <Reveal key={i} delay={i * 0.05}>
                    <MediaSlot
                      kind="vídeo"
                      ratio="aspect-[9/16]"
                      label={`Vídeo de aluno ${i} (15 a 30s): nome, cidade e antes/depois em uma frase.`}
                    />
                  </Reveal>
                ))}
              </div>
            </div>

            <div>
              <h3 className="font-mono text-xs uppercase tracking-widest text-floresta-deep">
                Prints de feedback
              </h3>
              <div className="mt-5 grid gap-5 sm:grid-cols-3">
                {[1, 2, 3].map((i) => (
                  <Reveal key={i} delay={i * 0.05}>
                    <MediaSlot
                      kind="print"
                      ratio="aspect-[4/3]"
                      label={`Print real de DM, comentário ou WhatsApp ${i}. Real e desorganizado é melhor que estilizado.`}
                    />
                  </Reveal>
                ))}
              </div>
            </div>

            <div>
              <h3 className="font-mono text-xs uppercase tracking-widest text-floresta-deep">
                Cases destrinchados
              </h3>
              <div className="mt-5 grid gap-5 md:grid-cols-3">
                {[1, 2, 3].map((i) => (
                  <Reveal key={i} delay={i * 0.05}>
                    <div className="card-surface h-full p-6">
                      <ContentSlot
                        label={`Case ${i}: Nome e cidade · Antes · Depois · O que mudou (1 frase).`}
                      />
                    </div>
                  </Reveal>
                ))}
              </div>
            </div>
          </div>

          <Reveal delay={0.1}>
            <div className="mt-12 flex flex-col items-start gap-5 sm:flex-row sm:items-center">
              <p className="font-display text-xl">
                Quer estar no próximo case?
              </p>
              <a href={wa("home")} className="btn btn-primary">
                Começar agora <ArrowRight size={16} />
              </a>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ============ 9 · PRA QUEM É (escuro profundo) ============ */}
      <section className="relative overflow-hidden bg-ink-void section-padding">
        <Leaf className="motif motif-soft text-floresta right-[3%] top-16 hidden w-40 rotate-12 md:block" />
        <div className="container-site relative">
          <Reveal>
            <p className="eyebrow mb-4">Filtro honesto</p>
            <h2 className="headline-section max-w-3xl">
              A Ousadia é pra todo mundo?{" "}
              <span className="text-amarelo">Não. E ainda bem.</span>
            </h2>
          </Reveal>
          <div className="mt-12 grid gap-6 md:grid-cols-2">
            <Reveal>
              <div className="card-surface h-full p-7">
                <h3 className="font-mono text-xs uppercase tracking-widest text-floresta">
                  ✅ É pra você se…
                </h3>
                <ul className="mt-5 space-y-3">
                  {E_PRA_VOCE.map((t) => (
                    <li key={t} className="text-body flex gap-3 text-[0.95rem]">
                      <span className="text-floresta">✓</span>
                      {t}
                    </li>
                  ))}
                </ul>
              </div>
            </Reveal>
            <Reveal delay={0.08}>
              <div className="card-surface h-full p-7">
                <h3 className="font-mono text-xs uppercase tracking-widest text-destructive">
                  ❌ Não é pra você se…
                </h3>
                <ul className="mt-5 space-y-3">
                  {NAO_E_PRA_VOCE.map((t) => (
                    <li key={t} className="text-body flex gap-3 text-[0.95rem]">
                      <span className="text-destructive">✕</span>
                      {t}
                    </li>
                  ))}
                </ul>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ============ 10 · FAQ (claro) ============ */}
      <section className="fold-light relative overflow-hidden">
        <WaveDivider
          className="absolute inset-x-0 top-0 rotate-180"
          color="var(--ink-void)"
        />
        <div className="container-site relative section-padding max-w-3xl">
          <Reveal>
            <p className="eyebrow mb-4">Dúvidas</p>
            <h2 className="headline-section mb-10">
              As perguntas que todo mundo faz antes de entrar.
            </h2>
          </Reveal>
          <FaqList items={FAQ} />
        </div>
      </section>

      {/* ============ 11 · CTA FINAL (roxo profundo) ============ */}
      <section className="relative overflow-hidden bg-roxo-700">
        <WaveDivider
          className="absolute inset-x-0 top-0 rotate-180"
          color="var(--paper)"
        />
        <Canoe className="motif motif-soft text-amarelo left-1/2 bottom-6 w-80 -translate-x-1/2" />
        <Paddle className="motif motif-soft text-floresta right-[10%] top-10 hidden w-20 rotate-12 md:block" />
        <div className="container-site relative section-padding text-center">
          <div
            className="absolute left-1/2 top-4 h-72 w-72 -translate-x-1/2 rounded-full bg-amarelo/20 blur-[120px]"
            aria-hidden
          />
          <Reveal>
            <h2 className="headline-section relative mx-auto max-w-3xl">
              Você pode continuar postando no escuro. Ou pode{" "}
              <span className="text-amarelo">ligar a luz</span>.
            </h2>
            <div className="text-body relative mx-auto mt-7 max-w-xl space-y-4">
              <p>
                Daqui a 6 meses, você vai estar exatamente onde está hoje, só
                que mais cansado de não sair do lugar.
              </p>
              <p>
                <strong className="font-semibold text-foreground">Ou</strong> vai
                estar com posicionamento, com método, com público que confia, e
                com os primeiros (ou os próximos) clientes na fila.
              </p>
              <p>
                A diferença entre os dois cenários cabe em uma decisão. Que você
                toma agora.
              </p>
            </div>
            <a href={wa("home")} className="btn btn-primary relative mt-9">
              Quero entrar pra Ousadia <ArrowRight size={16} />
            </a>
            <p className="relative mt-5 font-mono text-xs text-cinza-ink">
              Você é redirecionado(a) pro WhatsApp. Falamos com você em até 1h
              útil.
            </p>
            <ul className="relative mt-8 flex flex-wrap justify-center gap-x-7 gap-y-2 font-mono text-xs text-cinza-ink">
              <li>🛡️ Garantia de 7 dias. Sem letra miúda.</li>
              <li>💬 Atendimento humano (não é bot).</li>
              <li>🔥 Vagas limitadas por turma.</li>
            </ul>
          </Reveal>
        </div>
      </section>
    </>
  );
}
