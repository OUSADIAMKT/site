import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, MapPin } from "lucide-react";
import { Reveal } from "@/components/ui/Reveal";
import { WaveDivider } from "@/components/ui/WaveDivider";
import { PageHero } from "@/components/sections/PageHero";
import { CtaFinal } from "@/components/sections/CtaFinal";
import { FaqList, FaqJsonLd, type FaqItem } from "@/components/sections/Faq";
import { ContentSlot, MediaSlot } from "@/components/ui/MediaSlot";
import { GrafismoDiamonds, Paddle } from "@/components/ui/Motifs";
import { SITE, wa } from "@/lib/site";

export const metadata: Metadata = {
  title: "Destrave | Online ao vivo e Imersão presencial em Altamira/PA",
  description:
    "O método da Ousadia pra quem trava na câmera, em dois formatos: Destrave Online, 6 semanas ao vivo pelo celular (Turma Fundadora, R$ 197), e Destrave Imersão, 2 dias presenciais em Altamira/PA em 30 e 31 de janeiro de 2027 (12 vagas, R$ 1.297).",
  alternates: { canonical: `${SITE.url}/escola/destrave` },
};

/**
 * Landing do Destrave, imersão presencial de 30 e 31/01/2027 em Altamira/PA.
 * Estrutura inspirada em fcxp.brainstorm.academy (dor, antes/depois, pilares,
 * o que se leva, quem conduz, investimento, FAQ).
 *
 * Dados confirmados pelo usuário em 18/10/2026: datas, cidade, 12 vagas,
 * R$ 1.297, condutores (Jackson, Tháscila e Juh) e "22 turmas / 200 pessoas".
 * Sem dado: horários, programação por dia, parcelamento, o que está incluso,
 * depoimentos e fotos. Ficam em slot de pendência, nunca inventados.
 * Esta rota estática ganha da `/escola/[curso]` (slug em COM_LANDING_PROPRIA).
 *
 * Em 19/10/2026 o STORYSELL virou Destrave Online, e Destrave passou a ser a
 * marca do método, com dois formatos. A seção "Formatos" apresenta os dois. O
 * resto da página continua sendo da Imersão. Os dados do Online vêm do plano
 * "Lançamento Semente". A garantia ainda não foi aprovada e por isso não
 * aparece na página.
 */

const LOCAL = "Altamira/PA";
const DATAS = "30 e 31 de janeiro de 2027";
const VAGAS = 12;
const PRECO = "R$ 1.297";

const ONLINE = {
  turma: "Turma Fundadora",
  periodo: "12/11 a 18/12/2026",
  vagas: 50,
  preco: "R$ 197",
  itens: [
    "6 semanas ao vivo, tudo pelo celular",
    "Segunda: a tarefa da semana. Quarta, 20h: encontro ao vivo. Sexta: você mostra o que publicou",
    "Os 5 passos do método Satoyiro: Sinal, Travessia, Ossada, Ritual e Colheita",
    "Você sai com a sua Frase-Sinal, 3 histórias mapeadas e 5 conteúdos publicados",
  ],
};

const NUMEROS = [
  { valor: "22", label: "turmas realizadas" },
  { valor: "200", label: "pessoas já passaram pelo Destrave" },
  { valor: "2", label: "dias presenciais" },
  { valor: String(VAGAS), label: "vagas nesta turma" },
];

const DORES = [
  {
    t: "Você tem o que dizer, mas trava na hora de aparecer",
    d: "A ideia existe, o conhecimento também. Entre uma coisa e outra tem a câmera, e a câmera pesa.",
  },
  {
    t: "Grava, assiste, odeia e apaga",
    d: "O vídeo que você nunca publica é o que mais te custa. O ciclo se repete e o perfil fica parado.",
  },
  {
    t: "Posta sem saber por quê",
    d: "Sem estratégia, cada conteúdo vira um tiro no escuro, e a falta de resultado reforça a vergonha.",
  },
  {
    t: "Já tentou “se jogar” e travou do mesmo jeito",
    d: "Motivação passa. O que muda o jogo é método, prática e gente do lado enquanto você faz.",
  },
];

const ANTES_DEPOIS = [
  { tema: "Câmera", antes: "Evita aparecer", depois: "Grava com naturalidade e publica" },
  { tema: "Conteúdo", antes: "Posta quando dá, sem rumo", depois: "Sabe o que dizer, pra quem e por quê" },
  { tema: "Marketing", antes: "Copia o que viu por aí", depois: "Tem posicionamento e um plano pra seguir" },
  { tema: "Rotina", antes: "Espera “estar pronto(a)”", depois: "Cria conteúdo com processo, toda semana" },
];

const PILARES = [
  {
    n: "01",
    tag: "Primeiro pilar",
    t: "Marketing",
    sub: "Saber pra quem você fala e o que dizer.",
    itens: [
      "Posicionamento: o que só você tem pra oferecer",
      "Quem é o seu público e o que ele quer ouvir",
      "Como o conteúdo vira cliente, e não só curtida",
    ],
  },
  {
    n: "02",
    tag: "Segundo pilar",
    t: "Criação de conteúdo",
    sub: "Transformar a ideia em vídeo publicado.",
    itens: [
      "Ideia, roteiro curto e gravação com o celular",
      "Técnica de corpo, voz e olhar pra câmera",
      "Rotina de criação que cabe na sua semana",
    ],
  },
  {
    n: "03",
    tag: "Terceiro pilar",
    t: "Perder o medo e a vergonha",
    sub: "Destravar na prática, com a turma do lado.",
    itens: [
      "Entender por que você trava (e que não é frescura)",
      "Exercícios progressivos de exposição, com feedback ao vivo",
      "Gravar e publicar ainda durante a imersão",
    ],
  },
];

const CONDUTORES = [
  {
    nome: "Jackson Satoyiro",
    papel: "Fundador da Ousadia",
    d: "Está à frente da Ousadia desde as primeiras turmas e ensina o marketing e a criação de conteúdo que a imersão coloca em prática.",
  },
  {
    nome: "Tháscila Lawanda",
    papel: "Social media e coordenadora de marcas",
    d: "Trabalha todo dia com conteúdo e marcas de verdade na Ousadia e traz o olhar prático de quem produz e publica.",
  },
  {
    nome: "Juh Araújo",
    papel: "UGC Creator da Amazônia",
    d: "Creator de Altamira com mais de 70 marcas atendidas. Mostra na prática como aparecer, gravar e vender o próprio conteúdo.",
  },
];

const PRA_VOCE = [
  "Você sabe do que fala, mas tem vergonha de gravar e aparecer",
  "Você tem negócio, projeto ou marca pessoal e não sabe comunicar",
  "Você já tentou criar conteúdo e parou no meio, mais de uma vez",
  "Você quer aprender fazendo, ao lado de gente que vive o mesmo",
];

const NAO_PRA_VOCE = [
  "Você quer só assistir, sem se expor nem praticar",
  "Você espera uma fórmula pronta sem colocar a cara",
  "Você não consegue estar nos dois dias inteiros",
];

const FAQ_TEXTO = [
  {
    q: "Quando e onde acontece?",
    a: `Nos dias 30 e 31 de janeiro de 2027 (sábado e domingo), em Altamira, no Pará. Horário e endereço exato são enviados a quem garante a vaga.`,
  },
  {
    q: "Quantas vagas tem?",
    a: "12 vagas. A turma é pequena de propósito: cada pessoa grava, recebe feedback e tem espaço pra tirar as dúvidas do seu caso.",
  },
  {
    q: "Eu sou MUITO tímido(a). Isso funciona mesmo?",
    a: "Principalmente pra você. O Destrave foi desenhado pra quem trava, não pra quem já é desenvolto e quer polir. Os exercícios são progressivos e ninguém é jogado no fundo da piscina de uma vez.",
  },
  {
    q: "Preciso de equipamento?",
    a: "Seu celular resolve. Técnica vem antes de equipamento.",
  },
  {
    q: "Quanto custa?",
    a: "O investimento é de R$ 1.297 por pessoa. Pra saber as formas de pagamento disponíveis, chame o time no WhatsApp.",
  },
  {
    q: "Moro fora de Altamira. Dá pra participar?",
    a: "Dá, desde que você consiga estar em Altamira nos dois dias. Chame o time no WhatsApp e a gente te ajuda a se organizar.",
  },
];

const FAQ: FaqItem[] = [
  ...FAQ_TEXTO,
  {
    q: "O que está incluso?",
    a: (
      <>
        <ContentSlot label="O que está incluso no valor (materiais, alimentação, certificado, acesso ao conteúdo depois da imersão)." />
        <p className="mt-3">Enquanto isso, chama a gente no WhatsApp.</p>
      </>
    ),
  },
];

export default function DestravePage() {
  const inscricaoHref = wa("escola", "Destrave (imersão de janeiro em Altamira)");
  const onlineHref = wa("escola", "Destrave Online (Turma Fundadora)");

  const eventJsonLd = {
    "@context": "https://schema.org",
    "@type": "Event",
    name: "Destrave | Imersão presencial",
    description:
      "Imersão presencial de 2 dias para aprender marketing, criar conteúdo e perder o medo e a vergonha de aparecer.",
    startDate: "2027-01-30",
    endDate: "2027-01-31",
    eventStatus: "https://schema.org/EventScheduled",
    eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
    location: {
      "@type": "Place",
      name: "Altamira",
      address: {
        "@type": "PostalAddress",
        addressLocality: "Altamira",
        addressRegion: "PA",
        addressCountry: "BR",
      },
    },
    organizer: {
      "@type": "Organization",
      name: "Ousadia Marketing",
      url: SITE.url,
    },
    performer: [
      { "@type": "Person", name: "Jackson Satoyiro" },
      { "@type": "Person", name: "Tháscila Lawanda" },
      { "@type": "Person", name: "Juliana Araújo" },
    ],
    maximumAttendeeCapacity: VAGAS,
    offers: {
      "@type": "Offer",
      price: "1297",
      priceCurrency: "BRL",
      availability: "https://schema.org/InStock",
      url: `${SITE.url}/escola/destrave`,
    },
    inLanguage: "pt-BR",
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(eventJsonLd) }}
      />
      <FaqJsonLd items={FAQ_TEXTO} />

      <PageHero
        eyebrow={`Destrave · Online ao vivo ou presencial em ${LOCAL}`}
        motif="river"
        title={
          <>
            Você sabe o que dizer.{" "}
            <span className="text-amarelo">Falta destravar a câmera.</span>
          </>
        }
        lead="Dois dias em Altamira para aprender marketing, criar conteúdo e perder o medo e a vergonha de aparecer. Turma de 12 pessoas, com Jackson, Tháscila e Juh do seu lado."
      >
        <div className="mt-2 flex flex-col gap-4 sm:flex-row sm:items-center">
          <a href={inscricaoHref} className="btn btn-primary">
            Quero garantir minha vaga <ArrowRight size={16} />
          </a>
          <a href="#formatos" className="btn btn-ghost">
            Ver os dois formatos
          </a>
        </div>
        <dl className="mt-10 grid max-w-3xl grid-cols-2 gap-4 sm:grid-cols-4">
          {NUMEROS.map((n) => (
            <div key={n.label} className="card-surface p-4">
              <dt className="sr-only">{n.label}</dt>
              <dd className="font-display text-3xl leading-none text-amarelo">
                {n.valor}
              </dd>
              <dd className="text-body mt-1.5 text-xs">{n.label}</dd>
            </div>
          ))}
        </dl>
      </PageHero>

      {/* Formatos */}
      <section
        id="formatos"
        className="fold-light relative scroll-mt-24 overflow-hidden"
      >
        <div className="container-site relative section-padding">
          <Reveal>
            <p className="eyebrow mb-4">Dois formatos, o mesmo método</p>
            <h2 className="headline-section max-w-2xl">
              Destrave de onde você estiver
            </h2>
            <p className="text-body mt-5 max-w-2xl text-lg">
              O método é o mesmo nos dois formatos. Muda só o jeito de fazer:
              no Online, você aplica no seu negócio ao longo de 6 semanas, com
              a turma ao vivo. Na Imersão, são dois dias inteiros em Altamira,
              frente a frente com a gente.
            </p>
          </Reveal>
          <div className="mt-12 grid gap-6 lg:grid-cols-2">
            <Reveal>
              <div className="card-surface flex h-full flex-col border-2 border-amarelo p-7">
                <p className="font-mono text-[11px] uppercase tracking-wide text-floresta-deep">
                  Destrave Online · {ONLINE.turma}
                </p>
                <h3 className="font-display mt-2 text-2xl">
                  6 semanas ao vivo, pelo celular
                </h3>
                <p className="text-body mt-2 text-sm">
                  {ONLINE.periodo} · {ONLINE.vagas} vagas · {ONLINE.preco}
                </p>
                <ul className="text-body mt-5 flex-1 space-y-2 text-sm">
                  {ONLINE.itens.map((it) => (
                    <li key={it} className="flex gap-2">
                      <span className="text-floresta" aria-hidden>
                        ✓
                      </span>
                      <span>{it}</span>
                    </li>
                  ))}
                </ul>
                <a
                  href={onlineHref}
                  className="btn btn-primary mt-7 w-full justify-center"
                >
                  Quero ser fundadora <ArrowRight size={16} />
                </a>
              </div>
            </Reveal>
            <Reveal delay={0.08}>
              <div className="card-surface flex h-full flex-col p-7">
                <p className="font-mono text-[11px] uppercase tracking-wide text-floresta-deep">
                  Destrave Imersão · presencial
                </p>
                <h3 className="font-display mt-2 text-2xl">
                  2 dias em {LOCAL}
                </h3>
                <p className="text-body mt-2 inline-flex items-center gap-1.5 text-sm">
                  <MapPin size={14} aria-hidden /> {DATAS} · {VAGAS} vagas ·{" "}
                  {PRECO}
                </p>
                <ul className="text-body mt-5 flex-1 space-y-2 text-sm">
                  {[
                    "Marketing, criação de conteúdo e o fim do medo de aparecer",
                    "Turma de 12 pessoas, com Jackson, Tháscila e Juh",
                    "Você grava e publica ainda durante a imersão",
                  ].map((it) => (
                    <li key={it} className="flex gap-2">
                      <span className="text-floresta" aria-hidden>
                        ✓
                      </span>
                      <span>{it}</span>
                    </li>
                  ))}
                </ul>
                <a
                  href={inscricaoHref}
                  className="btn btn-primary mt-7 w-full justify-center"
                >
                  Quero a imersão <ArrowRight size={16} />
                </a>
              </div>
            </Reveal>
          </div>
          <p className="text-body mt-8 max-w-2xl text-sm">
            Daqui pra baixo, a página fala da Imersão presencial.
          </p>
        </div>
      </section>

      {/* Dor */}
      <section className="relative overflow-hidden bg-ink section-padding">
        <Paddle className="motif motif-soft text-amarelo right-[8%] top-12 hidden w-20 rotate-6 lg:block" />
        <div className="container-site relative">
          <Reveal>
            <p className="eyebrow mb-4">O que trava você</p>
            <h2 className="headline-section max-w-2xl">
              Não é falta de assunto. É medo de se expor.
            </h2>
            <p className="text-body mt-5 max-w-2xl text-lg">
              Quase todo mundo que chega ao Destrave tem conhecimento de sobra.
              O que falta é método pra transformar isso em vídeo publicado.
            </p>
          </Reveal>
          <div className="mt-12 grid gap-6 sm:grid-cols-2">
            {DORES.map((p, i) => (
              <Reveal key={p.t} delay={i * 0.06}>
                <div className="card-surface h-full p-7">
                  <h3 className="font-display text-lg">{p.t}</h3>
                  <p className="text-body mt-2 text-sm">{p.d}</p>
                </div>
              </Reveal>
            ))}
          </div>
          <Reveal delay={0.1}>
            <p className="text-body mt-10 max-w-2xl text-base">
              Isso não é falta de talento. É falta de prática guiada. E{" "}
              <strong className="font-semibold text-foreground">
                motivação não é método
              </strong>
              .
            </p>
          </Reveal>
        </div>
      </section>

      {/* Antes e depois */}
      <section className="fold-light relative overflow-hidden">
        <WaveDivider
          className="absolute inset-x-0 top-0 rotate-180"
          color="var(--ink)"
        />
        <div className="container-site relative section-padding">
          <Reveal>
            <p className="eyebrow mb-4">A transformação</p>
            <h2 className="headline-section max-w-2xl">
              Você entra travado(a). Sai gravando.
            </h2>
          </Reveal>
          <div className="mt-12 overflow-hidden rounded-2xl border border-black/10">
            <div className="grid grid-cols-[.7fr_1fr_1fr] bg-black/5 px-4 py-3 font-mono text-[11px] uppercase tracking-wide text-cinza-ink sm:px-6">
              <span />
              <span>Antes</span>
              <span className="text-floresta-deep">Depois</span>
            </div>
            {ANTES_DEPOIS.map((r) => (
              <div
                key={r.tema}
                className="grid grid-cols-[.7fr_1fr_1fr] gap-3 border-t border-black/10 px-4 py-4 text-sm sm:px-6"
              >
                <span className="font-display text-base">{r.tema}</span>
                <span className="text-body">{r.antes}</span>
                <span className="font-semibold text-floresta-deep">
                  {r.depois}
                </span>
              </div>
            ))}
          </div>
          <Reveal delay={0.1}>
            <div className="mt-10">
              <a href={inscricaoHref} className="btn btn-primary">
                Quero garantir minha vaga <ArrowRight size={16} />
              </a>
            </div>
          </Reveal>
        </div>
      </section>

      {/* Pilares */}
      <section className="relative overflow-hidden bg-roxo section-padding">
        <GrafismoDiamonds
          color="#ffffff"
          className="absolute inset-0 opacity-[0.04]"
        />
        <div className="container-site relative">
          <Reveal>
            <p className="eyebrow mb-4">O que você aprende</p>
            <h2 className="headline-section max-w-2xl">
              Três pilares em{" "}
              <span className="text-amarelo">dois dias de imersão</span>
            </h2>
            <p className="text-body mt-5 max-w-2xl">
              Marketing, criação de conteúdo e o fim do medo de aparecer. Tudo
              praticado ao vivo, com o seu caso na mesa.
            </p>
          </Reveal>
          <div className="mt-12 grid gap-6 lg:grid-cols-3">
            {PILARES.map((p, i) => (
              <Reveal key={p.t} delay={i * 0.08}>
                <div className="card-surface flex h-full flex-col p-7">
                  <span className="font-display text-3xl text-amarelo">
                    {p.n}
                  </span>
                  <p className="mt-2 font-mono text-[11px] uppercase tracking-wide text-cinza-ink">
                    {p.tag}
                  </p>
                  <h3 className="font-display mt-1 text-xl">{p.t}</h3>
                  <p className="text-body mt-2 text-sm">{p.sub}</p>
                  <ul className="text-body mt-5 space-y-2 text-sm">
                    {p.itens.map((it) => (
                      <li key={it} className="flex gap-2">
                        <span className="text-amarelo" aria-hidden>
                          ✓
                        </span>
                        <span>{it}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </Reveal>
            ))}
          </div>
          <Reveal delay={0.1}>
            <div className="mt-10 max-w-xl">
              <ContentSlot label="Programação dia a dia (horários e blocos de 30 e 31/01). Hoje só os três pilares estão definidos." />
            </div>
          </Reveal>
        </div>
      </section>

      {/* Formato */}
      <section className="fold-light relative overflow-hidden">
        <WaveDivider
          className="absolute inset-x-0 top-0 rotate-180"
          color="var(--roxo)"
        />
        <div className="container-site relative section-padding">
          <Reveal>
            <p className="eyebrow mb-4">Como funciona</p>
            <h2 className="headline-section max-w-2xl">
              Dois dias. Uma sala. Turma pequena.
            </h2>
          </Reveal>
          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { l: "Quando", v: DATAS, n: "Sábado e domingo" },
              { l: "Onde", v: LOCAL, n: "Endereço enviado a quem se inscreve" },
              {
                l: "Com quem",
                v: "Jackson, Tháscila e Juh",
                n: "Os três acompanham a turma",
              },
              {
                l: "Turma",
                v: `${VAGAS} vagas`,
                n: "Feedback direto, sem plateia anônima",
              },
            ].map((c, i) => (
              <Reveal key={c.l} delay={i * 0.06}>
                <div className="card-surface h-full p-6">
                  <p className="font-mono text-[11px] uppercase tracking-wide text-cinza-ink">
                    {c.l}
                  </p>
                  <p className="font-display mt-2 text-xl">{c.v}</p>
                  <p className="text-body mt-2 text-sm">{c.n}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Quem conduz */}
      <section className="relative overflow-hidden bg-ink-void section-padding">
        <div className="container-site relative">
          <Reveal>
            <p className="eyebrow mb-4">Quem conduz</p>
            <h2 className="headline-section max-w-2xl">
              Três pessoas que{" "}
              <span className="text-amarelo">fazem isso todo dia</span>
            </h2>
          </Reveal>
          <div className="mt-12 grid gap-6 lg:grid-cols-3">
            {CONDUTORES.map((c, i) => (
              <Reveal key={c.nome} delay={i * 0.08}>
                <div className="card-surface h-full p-6">
                  <MediaSlot
                    ratio="aspect-[4/5]"
                    className="mb-5 border-2 border-amarelo"
                    label={`Foto de ${c.nome} (retrato vertical).`}
                  />
                  <h3 className="font-display text-xl">{c.nome}</h3>
                  <p className="mt-1 font-mono text-[11px] uppercase tracking-wide text-amarelo">
                    {c.papel}
                  </p>
                  <p className="text-body mt-3 text-sm">{c.d}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Prova */}
      <section className="fold-light relative overflow-hidden">
        <WaveDivider
          className="absolute inset-x-0 top-0 rotate-180"
          color="var(--ink-void)"
        />
        <div className="container-site relative section-padding">
          <Reveal>
            <p className="eyebrow mb-4">Quem já passou</p>
            <h2 className="headline-section max-w-2xl">
              22 turmas. 200 pessoas destravadas.
            </h2>
            <p className="text-body mt-5 max-w-2xl">
              O Destrave nasceu como Imersão ABC do Marketing Digital, em 2020,
              em Brasil Novo (PA). De lá pra cá, muita gente trocou o medo da
              câmera por um perfil no ar.
            </p>
          </Reveal>
          <Reveal delay={0.08}>
            <div className="mt-10 max-w-2xl">
              <ContentSlot label="Depoimentos de ex-alunos do Destrave (nome, turma e fala), em texto ou vídeo." />
            </div>
          </Reveal>
        </div>
      </section>

      {/* Pra quem é */}
      <section className="relative overflow-hidden bg-ink section-padding">
        <div className="container-site relative">
          <Reveal>
            <p className="eyebrow mb-4">É pra você?</p>
            <h2 className="headline-section max-w-2xl">
              O Destrave foi feito pra quem trava
            </h2>
          </Reveal>
          <div className="mt-12 grid gap-6 lg:grid-cols-2">
            <Reveal>
              <div className="card-surface h-full border-2 border-amarelo/60 p-7">
                <h3 className="font-display text-lg text-amarelo">
                  É pra você se…
                </h3>
                <ul className="text-body mt-5 space-y-3 text-sm">
                  {PRA_VOCE.map((t) => (
                    <li key={t} className="flex gap-3">
                      <span className="text-floresta" aria-hidden>
                        ✓
                      </span>
                      <span>{t}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </Reveal>
            <Reveal delay={0.08}>
              <div className="card-surface h-full p-7">
                <h3 className="font-display text-lg">Não é pra você se…</h3>
                <ul className="text-body mt-5 space-y-3 text-sm">
                  {NAO_PRA_VOCE.map((t) => (
                    <li key={t} className="flex gap-3">
                      <span className="text-cinza-ink" aria-hidden>
                        ✕
                      </span>
                      <span>{t}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* Investimento */}
      <section className="relative overflow-hidden bg-roxo section-padding">
        <GrafismoDiamonds
          color="#ffffff"
          className="absolute inset-0 opacity-[0.04]"
        />
        <div className="container-site relative">
          <Reveal>
            <p className="eyebrow mb-4 text-center">Investimento</p>
            <h2 className="headline-section mx-auto max-w-2xl text-center">
              {VAGAS} vagas em{" "}
              <span className="text-amarelo">{LOCAL}</span>
            </h2>
          </Reveal>
          <Reveal delay={0.08}>
            <div className="card-surface mx-auto mt-12 max-w-md border-2 border-amarelo p-8 text-center">
              <p className="font-mono text-xs uppercase tracking-wide text-amarelo">
                Imersão Destrave · {DATAS}
              </p>
              <p className="font-display mt-4 text-5xl leading-none">{PRECO}</p>
              <p className="text-body mt-4 text-sm">
                Formas de pagamento: chama o time no WhatsApp.
              </p>
              <a
                href={inscricaoHref}
                className="btn btn-primary mt-6 w-full justify-center"
              >
                Quero garantir minha vaga <ArrowRight size={16} />
              </a>
            </div>
          </Reveal>
        </div>
      </section>

      {/* FAQ */}
      <section className="fold-light relative overflow-hidden">
        <WaveDivider
          className="absolute inset-x-0 top-0 rotate-180"
          color="var(--roxo)"
        />
        <div className="container-site relative section-padding max-w-3xl">
          <Reveal>
            <p className="eyebrow mb-4">Dúvidas</p>
            <h2 className="headline-section mb-10">Perguntas frequentes</h2>
          </Reveal>
          <FaqList items={FAQ} />
          <Reveal>
            <Link
              href="/escola"
              className="mt-10 inline-flex items-center gap-2 font-mono text-xs uppercase tracking-wider text-floresta-deep hover:underline"
            >
              ← Ver todos os cursos da Escola
            </Link>
          </Reveal>
        </div>
      </section>

      <CtaFinal
        title={
          <>
            Seu primeiro vídeo está a{" "}
            <span className="text-amarelo">uma imersão</span> de distância
          </>
        }
        lead="Dois dias em Altamira, 12 pessoas, três mentores. Chega de gravar, assistir e apagar."
        ctaLabel="Quero garantir minha vaga"
        href={inscricaoHref}
        waveColor="var(--paper)"
        microcopy={`${DATAS} · ${LOCAL} · ${PRECO}`}
      />
    </>
  );
}
