import Link from "next/link";
import Image from "next/image";
import type { Metadata } from "next";
import { ArrowRight } from "lucide-react";
import { Reveal } from "@/components/ui/Reveal";
import { WaveDivider } from "@/components/ui/WaveDivider";
import { FaqList, FaqJsonLd, type FaqItem } from "@/components/sections/Faq";
import { CasesVitrine } from "@/components/sections/Cases";
import { PilaresSumauma } from "@/components/sections/PilaresSumauma";
import { EcossistemaLosango } from "@/components/sections/EcossistemaLosango";
import { BlogHome } from "@/components/sections/BlogHome";
import { Depoimentos } from "@/components/sections/Depoimentos";
import { MatchComunidade } from "@/components/sections/MatchComunidade";
import {
  Leaf,
  Paddle,
  Canoe,
} from "@/components/ui/Motifs";
import {
  KeneField,
  KeneRule,
  KeneStrip,
  SectionDivider,
} from "@/components/ui/graphics/Kene";
import { STATS, wa } from "@/lib/site";

export const metadata: Metadata = {
  alternates: { canonical: "/" },
  title:
    "Ousadia Marketing | Agência Escola e Plataforma de Creators da Amazônia",
  description:
    "A primeira Agência Escola de Marketing do Norte do Brasil. Cursos, mentorias e comunidade para quem quer parar de postar no escuro e começar a vender com estratégia, criatividade e IA.",
};

/**
 * Marcas atendidas, na faixa da prova social rápida. Os arquivos em
 * `public/marcas-atendidas/` já são brancos monocromáticos, recortados e com a
 * mesma altura (160px): a harmonia vem do arquivo. A exceção é a Biorama, só
 * letreiro e muito larga, que aparece com ~68% da altura pra não pesar mais que as outras.
 */
const MARCAS = [
  { src: "sicredi", nome: "Sicredi", w: 643 },
  { src: "certi", nome: "Fundação CERTI", w: 426 },
  { src: "biorama", nome: "Biorama", w: 1105, menor: true },
  { src: "jornada-amazonia", nome: "Jornada Amazônia", w: 721 },
  { src: "world-creativity-day", nome: "World Creativity Day 2024", w: 417 },
  { src: "bere-xikrin", nome: "Associação Indígena Berê Xikrin", w: 373 },
  { src: "creax", nome: "CREAX — Centro Regional de Educação Ambiental do Xingu", w: 571 },
  { src: "sindicato-produtores-rurais-altamira", nome: "Siralta — Sindicato dos Produtores Rurais de Altamira", w: 470 },
  { src: "gem-tv-pa", nome: "Gem TV Pará", w: 426 },
  { src: "rio-xingu-pousada-lodge", nome: "Rio Xingu Pousada · Lodge", w: 836 },
  { src: "viver-de-amazonia", nome: "Viver de Amazônia", w: 527 },
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
  "Você quer marketing genérico. Aqui não tem.",
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
    a: "Nos cursos da Escola, tem garantia de 7 dias. Entrou, achou que não é pra você, devolve o dinheiro. Sem drama, sem formulário gigante, sem ligação de retenção.",
  },
  {
    q: "“Preciso ter seguidores pra começar?”",
    a: "Não. Aliás, se você já tem, melhor; mas se não tem, melhor ainda. A gente prefere construir do zero do que desconstruir vícios.",
  },
  {
    q: "“Eu não sou da Amazônia. Posso participar?”",
    a: "Pode. A bandeira é regional, mas o método é universal. E nas turmas online dá pra estudar de qualquer lugar da Amazônia, e de fora dela também.",
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
        {/*
          Vídeo de fundo desligado até existir o arquivo: `public/video/hero.mp4`
          e `hero-poster.jpg` ainda não foram entregues (ver o README dessa
          pasta), e o componente pedia os dois a cada visita, gerando 2 erros
          404. Com os arquivos no lugar, é só voltar:
          <HeroVideo src="/video/hero.mp4" poster="/video/hero-poster.jpg" opacity={0.28} />
        */}
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

        <div className="container-site relative z-10 section-padding grid gap-10 lg:grid-cols-[0.95fr_1.2fr] lg:items-center lg:gap-14">
          <div>
            <Reveal>
              <p className="eyebrow mb-5">
                Agência Escola de Marketing do Norte
              </p>
            </Reveal>
            <Reveal delay={0.05}>
              <h1
                className="headline-hero max-w-2xl"
                style={{ fontSize: "clamp(1.95rem, 3.9vw, 3.4rem)" }}
              >
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
              <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
                <a href={wa("home")} className="btn btn-primary whitespace-nowrap">
                  Quero entrar pra Ousadia <ArrowRight size={16} />
                </a>
                <Link href="/diagnostico" className="btn btn-secondary whitespace-nowrap">
                  Fazer o diagnóstico
                </Link>
              </div>
            </Reveal>
          </div>

          <Reveal delay={0.2}>
            {/*
              Foto da equipe em plano americano (da cabeça à cintura/quadril),
              recortada em 3:2 de uma foto maior (`public/home/hero-equipe.webp`).
              O contorno amarelo vazado fica deslocado atrás, pra dar volume
              sem pesar.
            */}
            <figure className="relative">
              <div
                className="absolute -bottom-3 -right-3 h-full w-full rounded-2xl border border-amarelo/50"
                aria-hidden
              />
              <div className="glow-amarelo relative overflow-hidden rounded-2xl">
                <Image
                  src="/home/hero-equipe.webp"
                  alt="Equipe da Ousadia Marketing, de camisa preta e crachá de organização, sorrindo em um evento à noite"
                  width={1000}
                  height={667}
                  priority
                  sizes="(min-width: 1024px) 50vw, 100vw"
                  className="h-auto w-full"
                />
                <div
                  className="pointer-events-none absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/70 to-transparent"
                  aria-hidden
                />
                <figcaption className="absolute bottom-3 left-4 right-4 font-mono text-[0.7rem] uppercase tracking-widest text-white/90">
                  Quem faz a Ousadia acontecer, no chão do evento
                </figcaption>
              </div>
            </figure>
          </Reveal>
        </div>
        <KeneStrip motif="iso" height={22} className="text-amarelo opacity-80" />
      </section>

      {/* ============ 2 · PROVA SOCIAL RÁPIDA (roxo) ============ */}
      <section className="relative overflow-hidden bg-roxo">
        <KeneField motif="yapa" scale={92} opacity={0.045} className="text-white" />
        <div className="container-site relative section-padding !py-14">
          <Reveal>
            <p className="font-display text-xl sm:text-2xl leading-snug max-w-3xl">
              Mais de 80 marcas atendidas. Mais de mil creators destravados. Uma
              região inteira sendo{" "}
              <span className="text-amarelo">reposicionada no digital</span>.
            </p>
          </Reveal>
          <KeneRule
            motif="pushu"
            height={12}
            opacity={0.28}
            className="mt-9 max-w-sm text-amarelo"
          />
          <div className="mt-8 grid grid-cols-2 gap-6 md:grid-cols-4">
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
          <Reveal delay={0.1}>
            <div className="mt-12 border-t border-white/10 pt-10">
              <p className="font-mono text-xs uppercase tracking-widest text-cinza-ink">
                Marcas e projetos que já confiaram na Ousadia
              </p>
              <ul className="mt-8 flex flex-wrap items-center gap-x-12 gap-y-9">
                {MARCAS.map((m) => (
                  <li key={m.src}>
                    <Image
                      src={`/marcas-atendidas/${m.src}.webp`}
                      alt={m.nome}
                      title={m.nome}
                      width={m.w}
                      height={160}
                      className={`w-auto opacity-75 transition-opacity hover:opacity-100 ${
                        m.menor ? "h-[1.53rem] sm:h-[1.7rem]" : "h-9 sm:h-10"
                      }`}
                    />
                  </li>
                ))}
              </ul>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ============ 3 · MATCH DA COMUNIDADE (escuro) ============ */}
      <MatchComunidade />

      {/* ============ 4 · A VIRADA (claro) ============ */}
      <section className="fold-light relative overflow-hidden">
        <WaveDivider
          className="absolute inset-x-0 top-0 rotate-180"
          color="var(--ink-deep)"
        />
        <div className="container-site relative section-padding">
          <Reveal>
            <p className="eyebrow mb-4">A virada</p>
            <h2 className="headline-section max-w-3xl">
              A gente não te ensina a “fazer post bonitinho”. A gente te ensina a{" "}
              <span className="text-amarelo">pensar, comunicar e vender</span>.
            </h2>
            <p className="text-body mt-6 max-w-2xl">
              Na Amazônia, a sumaúma é chamada de mãe da floresta. Passa dos 50
              metros, floresce quando ninguém mais floresce, dá fruto lá no
              alto, espalha semente no vento por quilômetros, e as raízes dela
              já foram o jeito de mandar recado de um lado a outro da mata. Uma
              árvore que pensa, comunica, colhe e se multiplica. É isso que a gente quer pro seu marketing, e cada
              parte dela é um dos quatro pilares da Ousadia.
            </p>
          </Reveal>
          <Reveal delay={0.06}>
            <div className="mt-12">
              <PilaresSumauma />
            </div>
          </Reveal>
          <Reveal delay={0.1}>
            <div className="mt-12 flex flex-col gap-5 border-t border-[#241044]/10 pt-8 md:flex-row md:items-center md:justify-between">
              <p className="font-display text-xl max-w-xl">
                Cada parte sozinha já te dá sombra. As quatro juntas fazem você
                ser vista de longe, acima da mata.
              </p>
              <Link
                href="/diagnostico"
                className="inline-flex shrink-0 items-center gap-2 font-mono text-xs font-semibold uppercase tracking-wider text-floresta-deep transition-transform hover:translate-x-1"
              >
                Não sabe por onde começar? Diagnóstico completo{" "}
                <ArrowRight size={14} />
              </Link>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ============ 6 · ECOSSISTEMA (losango concêntrico, opção 5) ============ */}
      {/* O mapa de linhas (opção 4) segue em components/sections/EcossistemaLinhas.tsx. */}
      <EcossistemaLosango
        fotos={{
          agencia: "/home/hero-equipe.webp",
          escola: "/sobre/turma-certificados.webp",
          comunidade: "/sobre/comunidade-estudio.webp",
        }}
        links={{
          agencia: "/agencia",
          escola: "/escola",
          comunidade: "https://comunidade.ousadiamarketing.com.br/cadastro?perfil=talento",
        }}
        externos={{ comunidade: true }}
      />

      {/* ============ 7 · BLOG (escuro) ============ */}
      {/* Entrou no lugar de "Quem lidera" (27/10/2026); o Jackson segue
          na faixa de autoria dentro da seção e na página /sobre. */}
      <BlogHome />

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
            {/* Depoimentos com tag por área; as abas aparecem sozinhas
                quando houver mais de uma área (ver Depoimentos.tsx). */}
            <Depoimentos />

            <div>
              <h3 className="font-mono text-xs uppercase tracking-widest text-floresta-deep">
                Cases destrinchados
              </h3>
              <div className="mt-5">
                <CasesVitrine
                  slotLabel={(i) =>
                    `Case ${i}: Nome e cidade · Antes · Depois · O que mudou (1 frase).`
                  }
                />
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
        <KeneField motif="shahuu" scale={104} opacity={0.04} className="text-white" />
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
              Você é redirecionado(a) pro WhatsApp.
            </p>
            <SectionDivider
              motif="faba"
              height={13}
              opacity={0.32}
              className="relative mx-auto max-w-lg text-amarelo"
            />
            <ul className="relative flex flex-wrap justify-center gap-x-7 gap-y-2 font-mono text-xs text-cinza-ink">
              <li>🛡️ Garantia de 7 dias nos cursos da Escola.</li>
              <li>💬 Atendimento humano (não é bot).</li>
              <li>🔥 Vagas limitadas por turma.</li>
            </ul>
          </Reveal>
        </div>
      </section>
    </>
  );
}
