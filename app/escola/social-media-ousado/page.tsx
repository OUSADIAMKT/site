import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, ChevronDown, MessageCircle } from "lucide-react";
import { Reveal } from "@/components/ui/Reveal";
import { WaveDivider } from "@/components/ui/WaveDivider";
import { PageHero } from "@/components/sections/PageHero";
import { CtaFinal } from "@/components/sections/CtaFinal";
import { FaqList, FaqJsonLd, type FaqItem } from "@/components/sections/Faq";
import { ContentSlot, MediaSlot } from "@/components/ui/MediaSlot";
import { GrafismoDiamonds, Paddle } from "@/components/ui/Motifs";
import { SITE, waThascila } from "@/lib/site";

export const metadata: Metadata = {
  title: "Social Media Ousado | Seu primeiro trabalho pago em 4 semanas · com Tháscila Lawanda",
  description:
    "Curso online de 4 semanas para jovens de 18 a 24 anos: escolha um serviço, ofereça ao comércio do seu bairro, feche, entregue e cobre. Tudo no celular, com 4 encontros de mentoria ao vivo e a Tháscila Lawanda como mentora. Turma de fim de ano: R$ 197 na condição Black, até 20/11.",
  alternates: { canonical: `${SITE.url}/escola/social-media-ousado` },
};

/**
 * Landing do Social Media Ousado, turma de fim de ano 2026, no molde da
 * `/aulao-ugc`. Fontes:
 * - PPC: `lib/PPC/PPC — Social Media Ousado (Turma Fim de Ano 2026).md` (17/10/2026)
 * - Roteiro da VSL: doc "Roteiro VSL — Social Media Ousado" no Claude Docs
 *   (claude.ai/artifact/RTck1AUmgYrA85XwZpgUxC). O vídeo ainda não foi gravado.
 * Esta rota estática tem prioridade sobre `/escola/[curso]`, que deixou de
 * gerar este slug.
 *
 * Fora da página de propósito: meta de 40 alunos e receita prevista (internos),
 * "vagas limitadas" (sem limite definido) e números de autoridade da Tháscila
 * (a VSL marca como "confirmar antes de gravar").
 * Plataforma de pagamento ainda não escolhida: enquanto `INSCRICAO_LINK` ficar
 * vazio, as CTAs caem no WhatsApp de atendimento.
 */

/** Checkout da turma. Vazio = WhatsApp de atendimento. */
const INSCRICAO_LINK: string | null = null;

/** As 4 semanas e suas metas (PPC, módulos 1 a 4). */
const SEMANAS = [
  {
    n: "1",
    datas: "23 a 29/nov",
    t: "Seu primeiro serviço",
    d: "Escolha o serviço, produza 3 amostras no CapCut e no Canva e mande as primeiras propostas, com script pronto pra não travar.",
    meta: "5 propostas enviadas",
  },
  {
    n: "2",
    datas: "30/nov a 6/dez",
    t: "Primeiro Pix",
    d: "Monte a oferta, descubra quanto cobrar, faça a proposta com IA e combine prazo e pagamento por escrito.",
    meta: "Primeiro trabalho fechado",
  },
  {
    n: "3",
    datas: "7 a 13/dez",
    t: "Entregar bem",
    d: "Gancho, roteiro, calendário, gravação e edição no celular, bem na época em que o comércio precisa de conteúdo de Natal.",
    meta: "Trabalho entregue e pago",
  },
  {
    n: "4",
    datas: "14 a 20/dez",
    t: "Cliente que volta",
    d: "Relatório de uma página, depoimento do cliente e um pacote mensal pra continuar trabalhando em janeiro.",
    meta: "Pacote mensal oferecido",
  },
];

/** Os 4 encontros de mentoria ao vivo (PPC, "Encontros ao vivo"). */
const ENCONTROS = [
  { data: "23/11", t: "Diagnóstico", leva: "Um diagnóstico pronto e as 5 propostas engatilhadas" },
  { data: "30/11", t: "Criação de conteúdo", leva: "Uma peça pronta pro cliente, feita e revisada ao vivo" },
  { data: "07/12", t: "Roteiro e calendário", leva: "Roteiros e calendário de dezembro do cliente" },
  { data: "14/12", t: "Estratégia de conteúdo", leva: "Proposta de pacote mensal com a estratégia de janeiro" },
];

type Aula = [titulo: string, min: number];

/** Grade completa do curso (PPC, módulos 0 a 5 + Módulo Extra). */
const MODULOS: { t: string; quando: string; aulas: Aula[] }[] = [
  {
    t: "Comece aqui",
    quando: "Liberado na compra",
    aulas: [
      ["Bem-vindo ao Social Media Ousado", 4],
      ["Prepare o celular", 6],
      ["Renda extra não é sorte, é oferta", 5],
    ],
  },
  {
    t: "Seu primeiro serviço",
    quando: "Semana 1",
    aulas: [
      ["Os serviços que o comércio do bairro compra", 6],
      ["O que é conteúdo bom para comércio local", 6],
      ["Três amostras em um dia", 7],
      ["Seu perfil como vitrine", 5],
      ["A lista de 20 e a primeira mensagem", 6],
      ["O “não” faz parte do placar", 4],
    ],
  },
  {
    t: "Primeiro Pix",
    quando: "Semana 2",
    aulas: [
      ["Oferta simples", 6],
      ["Quanto cobrar", 6],
      ["Proposta em 10 minutos com IA", 6],
      ["Do “quanto custa?” ao “fechado”", 7],
      ["Combinar e receber", 5],
      ["Primeiro Pix: separar, reinvestir, guardar", 4],
    ],
  },
  {
    t: "Entregar bem",
    quando: "Semana 3",
    aulas: [
      ["Os 3 segundos que seguram o vídeo", 5],
      ["Roteiro curto que vende", 6],
      ["Um mês de conteúdo em uma hora", 6],
      ["Gravar com o celular", 6],
      ["Reels ou TikTok em 15 minutos no CapCut", 7],
      ["Post e carrossel no Canva", 6],
      ["IA como sua equipe", 6],
      ["Prazo é reputação", 4],
    ],
  },
  {
    t: "Cliente que volta",
    quando: "Semana 4",
    aulas: [
      ["Agendar e organizar", 6],
      ["As 3 métricas que o comércio entende", 5],
      ["Relatório de uma página", 5],
      ["Pedir depoimento e indicação", 4],
      ["De bico para negócio", 6],
      ["Contar o case", 5],
    ],
  },
  {
    t: "Próximo nível",
    quando: "Liberado na semana 4",
    aulas: [
      ["Clientes e caixa numa planilha", 5],
      ["Formalizar quando fizer sentido", 5],
      ["Rotina de 30 minutos e o próximo degrau", 5],
    ],
  },
  {
    t: "Extra · IA como sua equipe, com Jackson",
    quando: "Bônus, liberado em 30/11",
    aulas: [
      ["A IA vira sua equipe", 5],
      ["Prompt que funciona", 6],
      ["Conhecer o cliente em 10 minutos", 6],
      ["Nunca mais ficar sem ideia", 6],
      ["Um assistente para cada cliente", 6],
      ["O que nunca terceirizar para a IA", 4],
    ],
  },
];

const FORMATO = [
  { valor: "4", label: "semanas, uma meta por semana" },
  { valor: "38", label: "aulas de 4 a 7 min, no formato do celular" },
  { valor: "4", label: "encontros de mentoria ao vivo" },
  { valor: "20h", label: "de certificado" },
];

/** Dores do público (PPC, "Público-alvo"). */
const PUBLICO = [
  {
    t: "Você passa horas no TikTok e no Instagram",
    d: "Sabe o que prende a atenção e o que é vergonha alheia. Só que isso ainda não virou dinheiro.",
  },
  {
    t: "Você quer o próprio dinheiro, agora",
    d: "Está estudando, procurando emprego ou fazendo bico, e quer algo seu, no seu tempo.",
  },
  {
    t: "Você só tem o celular",
    d: "E é o suficiente. O curso inteiro é feito no celular, com apps gratuitos: CapCut, Canva, WhatsApp Business e uma IA.",
  },
  {
    t: "Você topa executar",
    d: "Não é curso pra só assistir. Toda aula termina numa missão de até 20 minutos, feita pra um negócio de verdade.",
  },
];

/** O Kit Primeiro Pix e o que vem com ele (PPC, "Avaliação e projeto final"). */
const LEVA = [
  "Um cliente atendido",
  "Três trabalhos reais no portfólio",
  "Um relatório de uma página entregue ao cliente",
  "Um depoimento do cliente",
  "Um case publicado no seu perfil",
  "Certificado de 20 horas",
];

/** Respostas em texto puro — as únicas que entram no JSON-LD. */
const FAQ_TEXTO = [
  {
    q: "Não tenho seguidores. Consigo fazer o curso?",
    a: "Consegue. Seu cliente é o comércio do bairro, não o seu público. Seguidores não entram na conta.",
  },
  {
    q: "Só tenho celular. Serve?",
    a: "Serve. Todo o curso é feito no celular, com apps gratuitos: CapCut, Canva, WhatsApp Business e uma IA (ChatGPT ou Claude).",
  },
  {
    q: "Tenho vergonha de oferecer serviço.",
    a: "O curso dá script pronto, uma meta pequena (5 propostas na primeira semana) e um encontro ao vivo pra treinar a conversa.",
  },
  {
    q: "Não sei quanto cobrar.",
    a: "Tem aula só disso: você pesquisa 5 concorrentes da sua região e monta a sua tabela de preço.",
  },
  {
    q: "Não tenho muito tempo.",
    a: "As aulas têm de 4 a 7 minutos e cada missão leva até 20. São menos de 3 horas de vídeo no curso inteiro.",
  },
  {
    q: "Quando começa e como funcionam os encontros?",
    a: "As inscrições vão de 1º a 20 de novembro e as aulas começam no fim de novembro. São 4 encontros de mentoria online de 90 minutos, um por semana, com gravação disponível. O curso termina em 20 de dezembro.",
  },
  {
    q: "Quanto custa?",
    a: "O valor do curso é R$ 297. Pra turma de fim de ano tem a condição Black: R$ 197, só até 20 de novembro.",
  },
  {
    q: "O curso garante que eu vou ganhar dinheiro?",
    a: "Não. O curso entrega método, metas semanais e acompanhamento. A renda depende da sua execução.",
  },
  {
    q: "E se não for pra mim?",
    a: "Você tem 7 dias de garantia: entrou, achou que não é pra você, pede o dinheiro de volta. Sem burocracia.",
  },
  {
    q: "Como ganho o certificado?",
    a: "Com 80% das missões aprovadas e o Kit Primeiro Pix entregue. Quem não fechar um trabalho pago pode entregar o kit para um negócio real sem cobrar e recebe o certificado. Quem recebe o primeiro pagamento ganha também o selo Primeiro Pix.",
  },
];

const FAQ: FaqItem[] = [
  ...FAQ_TEXTO,
  {
    q: "Como pago? Dá pra parcelar?",
    a: (
      <>
        <ContentSlot label="Plataforma de pagamento, parcelamento e tempo de acesso às aulas gravadas (pendências do PPC)." />
        <p className="mt-3">Enquanto isso, chama a gente no WhatsApp.</p>
      </>
    ),
  },
];

export default function SocialMediaOusadoPage() {
  const atendimento = waThascila(
    "Oi, Tháscila! Quero saber sobre o curso Social Media Ousado (turma de fim de ano).",
  );
  const inscricaoHref = INSCRICAO_LINK ?? atendimento;

  const cursoJsonLd = {
    "@context": "https://schema.org",
    "@type": "Course",
    name: "Social Media Ousado",
    description:
      "Curso online de 4 semanas para conseguir o primeiro trabalho pago de social media atendendo o comércio local: oferecer, fechar, entregar e cobrar, tudo no celular.",
    provider: {
      "@type": "Organization",
      name: "Ousadia Marketing",
      sameAs: "https://instagram.com/ousadiamkt",
    },
    instructor: { "@type": "Person", name: "Tháscila Lawanda" },
    hasCourseInstance: {
      "@type": "CourseInstance",
      courseMode: "online",
      courseWorkload: "PT20H",
      instructor: { "@type": "Person", name: "Tháscila Lawanda" },
    },
    offers: {
      "@type": "Offer",
      name: "Condição Black · turma de fim de ano",
      price: "197",
      priceCurrency: "BRL",
      category: "Paid",
      validFrom: "2026-11-01T00:00:00-03:00",
      validThrough: "2026-11-20T23:59:59-03:00",
    },
    inLanguage: "pt-BR",
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(cursoJsonLd) }}
      />
      <FaqJsonLd items={FAQ_TEXTO} />

      <PageHero
        eyebrow="Curso online · 4 semanas · Turma de fim de ano · com Tháscila Lawanda"
        motif="river"
        title={
          <>
            O comércio do seu bairro posta mal.{" "}
            <span className="text-amarelo">Isso é uma vaga de trabalho.</span>
          </>
        }
        lead="Em 4 semanas, você sai do celular parado pro seu primeiro trabalho pago de social media: oferecer, fechar, entregar e cobrar. Tudo no celular, sem precisar de seguidores."
      >
        <MediaSlot
          kind="vídeo"
          ratio="aspect-video"
          className="max-w-3xl border-2 border-amarelo"
          label="VSL do Social Media Ousado com a Tháscila (cerca de 5 min, roteiro pronto no Claude Docs)."
        />
        <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:items-center">
          <a href={inscricaoHref} className="btn btn-primary">
            Quero garantir minha vaga <ArrowRight size={16} />
          </a>
          <span className="font-mono text-xs text-cinza-ink">
            R$ 197 na condição Black · inscrições de 1º a 20/nov
          </span>
        </div>
      </PageHero>

      {/* Quebra de crença */}
      <section className="relative overflow-hidden bg-ink section-padding">
        <Paddle className="motif motif-soft text-amarelo right-[8%] top-12 hidden w-20 rotate-6 lg:block" />
        <div className="container-site relative max-w-3xl">
          <Reveal>
            <p className="eyebrow mb-4">Seu cliente não é seu seguidor</p>
            <h2 className="headline-section max-w-2xl">
              Você não precisa de seguidores. Precisa de um cliente.
            </h2>
          </Reveal>
          <Reveal delay={0.06}>
            <div className="text-body mt-8 space-y-5 text-lg">
              <p>
                Você entende de rede social melhor do que muito dono de loja.
                Mas toda vez que pensa em trabalhar com isso, vem a voz:{" "}
                <em>“eu não tenho seguidores”</em>, <em>“eu só tenho celular”</em>
                , <em>“quem vai me pagar?”</em>
              </p>
              <p>
                Pra ganhar dinheiro com social media, você não precisa ser
                influenciador. Seu cliente é o salão, a oficina, a loja da feira,
                o açaí da esquina: gente que sabe que precisa estar nas redes,
                mas não tem tempo e posta do jeito que dá.
              </p>
              <p>
                E dezembro é quando o comércio mais precisa de conteúdo. Por isso
                a meta desta turma é o{" "}
                <strong className="font-semibold text-foreground">
                  primeiro Pix antes do Natal
                </strong>
                .
              </p>
              <p className="text-base">
                Curtida sozinha não paga boleto. Cliente paga.
              </p>
            </div>
          </Reveal>
        </div>
      </section>

      {/* As 4 semanas */}
      <section className="fold-light relative overflow-hidden">
        <WaveDivider
          className="absolute inset-x-0 top-0 rotate-180"
          color="var(--ink)"
        />
        <div className="container-site relative section-padding">
          <Reveal>
            <p className="eyebrow mb-4">O método</p>
            <h2 className="headline-section max-w-2xl">
              4 semanas, 4 metas, um primeiro trabalho pago
            </h2>
            <p className="text-body mt-5 max-w-2xl">
              Um módulo por semana, liberado na segunda-feira. O Módulo 0 chega
              na compra, pra você começar com o celular pronto e uma lista de 10
              negócios que podem virar clientes.
            </p>
          </Reveal>
          <ol className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {SEMANAS.map((s, i) => (
              <Reveal key={s.n} delay={i * 0.06}>
                <li className="card-surface flex h-full flex-col p-6">
                  <span className="font-display text-3xl text-amarelo">
                    0{s.n}
                  </span>
                  <p className="mt-2 font-mono text-[11px] uppercase tracking-wide text-cinza-ink">
                    Semana {s.n} · {s.datas}
                  </p>
                  <h3 className="font-display text-lg mt-1">{s.t}</h3>
                  <p className="text-body mt-2 text-sm">{s.d}</p>
                  <p className="mt-auto pt-4 font-mono text-[11px] uppercase tracking-wide text-floresta-deep">
                    Meta · {s.meta}
                  </p>
                </li>
              </Reveal>
            ))}
          </ol>
        </div>
      </section>

      {/* Encontros ao vivo */}
      <section className="relative overflow-hidden bg-roxo section-padding">
        <GrafismoDiamonds
          color="#ffffff"
          className="absolute inset-0 opacity-[0.04]"
        />
        <div className="container-site relative">
          <div className="grid gap-12 lg:grid-cols-[.9fr_1.1fr]">
            <Reveal>
              <p className="eyebrow mb-4">Mentoria ao vivo</p>
              <h2 className="headline-section">
                4 encontros pra te{" "}
                <span className="text-amarelo">colocar em ação</span>
              </h2>
              <p className="text-body mt-5 max-w-md">
                Não são aulas. São 90 minutos por semana, às segundas, pra
                abordar o cliente, criar conteúdo e fazer diferença rápido nas
                redes dele. Cada encontro fica gravado.
              </p>
              <p className="mt-4 font-mono text-xs text-cinza-ink">
                Datas previstas · horário a confirmar
              </p>
            </Reveal>
            <Reveal delay={0.06}>
              <ol className="card-surface divide-y divide-white/10 p-2">
                {ENCONTROS.map((e) => (
                  <li key={e.data} className="flex gap-5 px-4 py-4">
                    <span className="w-14 shrink-0 font-mono text-sm text-amarelo">
                      {e.data}
                    </span>
                    <span>
                      <span className="block text-sm font-semibold text-foreground">
                        {e.t}
                      </span>
                      <span className="text-body block text-sm">
                        Você sai com: {e.leva}
                      </span>
                    </span>
                  </li>
                ))}
              </ol>
            </Reveal>
          </div>
        </div>
      </section>

      {/* Mentora */}
      <section className="relative overflow-hidden bg-ink-void section-padding">
        <div className="container-site relative">
          <div className="grid items-center gap-12 lg:grid-cols-[.85fr_1.15fr]">
            <Reveal>
              <MediaSlot
                ratio="aspect-[4/5]"
                className="mx-auto w-full max-w-sm border-2 border-amarelo"
                label="Foto da Tháscila Lawanda (retrato vertical)."
              />
            </Reveal>
            <Reveal delay={0.08}>
              <div>
                <p className="eyebrow mb-4">Quem conduz</p>
                <h2 className="headline-section max-w-xl">
                  Conheça{" "}
                  <span className="text-amarelo">Tháscila Lawanda</span>,
                  especialista e mentora do curso
                </h2>
                <div className="mt-6 flex flex-wrap gap-2">
                  {[
                    "Social media da Ousadia",
                    "Coordenadora de marcas",
                    "Mentora do Social Media Ousado",
                  ].map((t) => (
                    <span
                      key={t}
                      className="rounded-full border border-amarelo/50 bg-amarelo/10 px-4 py-1.5 font-mono text-xs text-amarelo"
                    >
                      {t}
                    </span>
                  ))}
                </div>
                <div className="text-body mt-6 space-y-4">
                  <p>
                    A Tháscila é social media e coordena marcas atendidas pela
                    Ousadia Marketing. Foi com essa experiência que ela atualizou
                    o Social Media Ousado inteiro, pra ficar mais direto, mais
                    prático e focado no que o cliente realmente quer.
                  </p>
                  <p>
                    Não é teoria. É o método que a Ousadia usa todo dia com
                    cliente de verdade.
                  </p>
                  <p>
                    No módulo extra de inteligência artificial, o curso recebe{" "}
                    <strong className="font-semibold text-foreground">
                      Jackson Satoyiro
                    </strong>
                    , fundador da Ousadia, pra te ensinar a usar a IA como a sua
                    equipe: proposta, roteiro e legenda em minutos.
                  </p>
                </div>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* Para quem é */}
      <section className="fold-light relative overflow-hidden">
        <WaveDivider
          className="absolute inset-x-0 top-0 rotate-180"
          color="var(--ink-void)"
        />
        <div className="container-site relative section-padding">
          <Reveal>
            <p className="eyebrow mb-4">Público</p>
            <h2 className="headline-section">
              Pra quem tem de 18 a 24 anos e um celular na mão
            </h2>
          </Reveal>
          <div className="mt-12 grid gap-6 sm:grid-cols-2">
            {PUBLICO.map((p, i) => (
              <Reveal key={p.t} delay={i * 0.06}>
                <div className="card-surface h-full p-7">
                  <h3 className="font-display text-lg">{p.t}</h3>
                  <p className="text-body mt-2 text-sm">{p.d}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Conteúdo */}
      <section className="relative overflow-hidden bg-ink section-padding">
        <div className="container-site relative">
          <div className="grid gap-12 lg:grid-cols-[.8fr_1.2fr]">
            <Reveal>
              <p className="eyebrow mb-4">O conteúdo</p>
              <h2 className="headline-section">
                Aula curta, <span className="text-amarelo">missão prática</span>
              </h2>
              <p className="text-body mt-5 max-w-md">
                Cada aula ensina uma ideia, mostra na tela do celular com
                exemplo de comércio amazônico e termina com uma missão de até 20
                minutos, feita pra um cliente de verdade. A missão vai pro mural
                da turma e recebe retorno do monitor.
              </p>
              <dl className="mt-8 grid grid-cols-2 gap-4">
                {FORMATO.map((f) => (
                  <div key={f.label} className="card-surface p-4">
                    <dt className="sr-only">{f.label}</dt>
                    <dd className="font-display text-3xl leading-none text-amarelo">
                      {f.valor}
                    </dd>
                    <dd className="text-body mt-1.5 text-xs">{f.label}</dd>
                  </div>
                ))}
              </dl>
            </Reveal>
            <Reveal delay={0.06}>
              <ol className="space-y-3">
                {MODULOS.map((m, i) => (
                  <li key={m.t}>
                    <details className="card-surface group p-5 [&_summary::-webkit-details-marker]:hidden">
                      <summary className="flex cursor-pointer list-none items-start gap-4">
                        <span className="w-8 shrink-0 font-display text-xl text-amarelo">
                          {i < MODULOS.length - 1 ? String(i).padStart(2, "0") : "+"}
                        </span>
                        <span className="flex-1">
                          <span className="font-display block text-base text-foreground">
                            {m.t}
                          </span>
                          <span className="font-mono text-[11px] uppercase tracking-wide text-cinza-ink">
                            {m.quando} · {m.aulas.length} aulas
                          </span>
                        </span>
                        <ChevronDown
                          size={18}
                          className="mt-1 shrink-0 text-amarelo transition-transform group-open:rotate-180"
                          aria-hidden
                        />
                      </summary>
                      <ul className="text-body mt-4 space-y-1.5 pl-12 text-sm">
                        {m.aulas.map(([titulo, min]) => (
                          <li key={titulo} className="flex justify-between gap-4">
                            <span>{titulo}</span>
                            <span className="shrink-0 font-mono text-xs text-cinza-ink">
                              {min} min
                            </span>
                          </li>
                        ))}
                      </ul>
                    </details>
                  </li>
                ))}
              </ol>
            </Reveal>
          </div>
        </div>
      </section>

      {/* O que você leva */}
      <section className="fold-light relative overflow-hidden">
        <WaveDivider
          className="absolute inset-x-0 top-0 rotate-180"
          color="var(--ink)"
        />
        <div className="container-site relative section-padding">
          <div className="grid gap-12 lg:grid-cols-2">
            <Reveal>
              <p className="eyebrow mb-4">O que você leva</p>
              <h2 className="headline-section max-w-xl">
                No fim das 4 semanas, o{" "}
                <span className="text-floresta-deep">Kit Primeiro Pix</span>
              </h2>
              <p className="text-body mt-5 max-w-md">
                Você é avaliado pelo que entrega a um negócio real, não por
                prova. E quem recebe o primeiro pagamento ganha o selo Primeiro
                Pix e entra no mural da turma.
              </p>
              <p className="mt-6 max-w-md font-mono text-xs leading-relaxed text-cinza-ink">
                O curso promete método, metas e acompanhamento, não um valor de
                ganho. A renda depende da execução de cada aluno.
              </p>
            </Reveal>
            <Reveal delay={0.06}>
              <ul className="space-y-3">
                {LEVA.map((t) => (
                  <li key={t} className="card-surface flex items-start gap-3 p-4">
                    <span className="mt-0.5 text-floresta" aria-hidden>
                      ✓
                    </span>
                    <span className="text-body text-[0.95rem]">{t}</span>
                  </li>
                ))}
              </ul>
            </Reveal>
          </div>
        </div>
      </section>

      {/* Ingressos */}
      <section className="relative overflow-hidden bg-roxo section-padding">
        <GrafismoDiamonds
          color="#ffffff"
          className="absolute inset-0 opacity-[0.04]"
        />
        <div className="container-site relative">
          <Reveal>
            <p className="eyebrow mb-4 text-center">Turma de fim de ano</p>
            <h2 className="headline-section mx-auto max-w-2xl text-center">
              Condição Black,{" "}
              <span className="text-amarelo">só até 20/11</span>
            </h2>
            <p className="text-body mx-auto mt-5 max-w-xl text-center">
              Inscrições de 1º a 20 de novembro. As aulas começam no fim de
              novembro e o curso termina em 20 de dezembro.
            </p>
          </Reveal>
          <div className="mx-auto mt-12 grid max-w-3xl gap-6 sm:grid-cols-2">
            <Reveal>
              <div className="card-surface h-full p-8 text-center opacity-80">
                <p className="font-mono text-xs uppercase tracking-wide text-cinza-ink">
                  Valor do curso
                </p>
                <p className="font-display mt-4 text-5xl leading-none line-through decoration-2">
                  R$ 297
                </p>
                <p className="text-body mt-4 text-sm">
                  O preço de sempre do Social Media Ousado.
                </p>
              </div>
            </Reveal>
            <Reveal delay={0.08}>
              <div className="card-surface h-full border-2 border-amarelo p-8 text-center">
                <p className="font-mono text-xs uppercase tracking-wide text-amarelo">
                  Condição Black · de 1º a 20/nov
                </p>
                <p className="font-display mt-4 text-5xl leading-none">R$ 197</p>
                <p className="text-body mt-4 text-sm">
                  R$ 100 a menos, só pra esta turma.
                </p>
              </div>
            </Reveal>
          </div>
          <Reveal delay={0.12}>
            <div className="mt-10 flex flex-col items-center gap-3">
              <a href={inscricaoHref} className="btn btn-primary">
                Quero garantir minha vaga <ArrowRight size={16} />
              </a>
              <span className="font-mono text-xs text-cinza-ink">
                Garantia de 7 dias · sem burocracia
              </span>
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
            Seu primeiro Pix com social media,{" "}
            <span className="text-amarelo">antes do Natal</span>
          </>
        }
        lead="O açaí da esquina, o salão, a loja da feira: eles vão precisar de alguém pra cuidar das redes neste fim de ano. Pode ser você."
        ctaLabel="Quero garantir minha vaga"
        href={inscricaoHref}
        waveColor="var(--paper)"
        secondary={
          INSCRICAO_LINK ? (
            <a href={atendimento} className="btn btn-secondary">
              <MessageCircle size={16} /> Tirar dúvida no WhatsApp
            </a>
          ) : undefined
        }
        microcopy="R$ 197 na condição Black, até 20/11 · garantia de 7 dias."
      />
    </>
  );
}
