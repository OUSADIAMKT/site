import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, ChevronDown } from "lucide-react";
import { Reveal } from "@/components/ui/Reveal";
import { WaveDivider } from "@/components/ui/WaveDivider";
import { PageHero } from "@/components/sections/PageHero";
import { CtaFinal } from "@/components/sections/CtaFinal";
import { FaqList, FaqJsonLd, type FaqItem } from "@/components/sections/Faq";
import { ContentSlot } from "@/components/ui/MediaSlot";
import { GrafismoDiamonds, Paddle } from "@/components/ui/Motifs";
import { SITE, wa } from "@/lib/site";

export const metadata: Metadata = {
  title: "Inteligência Artificial do Zero à Prática | Curso com Jackson Queiroz · Escola Ousadia",
  description:
    "Curso de IA para quem nunca usou: 30 horas, 70% de prática e nenhuma programação. Em cada aula você sai com algo pronto: um texto, um plano, uma imagem, um fluxo de trabalho. Funciona no celular, com planos gratuitos. Com Jackson Queiroz.",
  alternates: { canonical: `${SITE.url}/escola/ia-para-iniciantes` },
};

/**
 * Landing do curso "Inteligência Artificial do Zero à Prática", no molde de
 * `/escola/social-media-ousado`. Fonte: `lib/PPC/PPC - IA Para Iniciantes.md`
 * (projeto pedagógico de 17/10/2026). Esta rota estática tem prioridade sobre
 * `/escola/[curso]`, que deixou de gerar este slug. O slug e o nome curto
 * ("IA para iniciantes") ficam iguais em `CURSOS` porque o Diagnóstico
 * recomenda o curso por esse nome.
 *
 * Formato definido pelo usuário em 18/10/2026: curso só GRAVADO, sem turma
 * presencial, sem encontros ao vivo e sem acompanhamento online. Por isso a
 * metodologia do PPC aparece no formato "Gravado" (vídeos curtos por momento
 * da aula, exercícios com gabarito comentado), sem duplas, presença ou nota.
 * Investimento e tempo de acesso ainda não foram definidos: enquanto
 * `INSCRICAO_LINK` ficar vazio, as CTAs caem no WhatsApp de atendimento.
 */

/** Checkout do curso. Vazio = WhatsApp de atendimento. */
const INSCRICAO_LINK: string | null = null;

const NAO_E = [
  "Não é curso de programação.",
  "Não ensina a “ficar rico com IA”.",
  "Não trata a IA como fonte infalível: ela é um assistente rápido, que erra e precisa de supervisão.",
];

/** Público do PPC (Etapa 1), com o exemplo de aplicação no curso. */
const PUBLICO = [
  { t: "Iniciante absoluto", d: "Pra perder o medo e entender o que é IA.", ex: "Primeira conversa com um assistente no celular" },
  { t: "Profissional, CLT ou autônomo", d: "Pra ganhar tempo em tarefas repetitivas.", ex: "E-mails, relatórios, atas e planilhas" },
  { t: "Pequeno empresário e MEI", d: "Pra vender mais e se organizar.", ex: "Posts, respostas a clientes, orçamentos, cardápios" },
  { t: "Criador de conteúdo e marketing", d: "Pra ter ideias, roteiros e peças visuais.", ex: "Calendário de conteúdo, roteiro de Reels, imagens" },
  { t: "Estudante", d: "Pra estudar melhor, sem colar.", ex: "Plano de estudos, explicações, simulados" },
  { t: "Educador", d: "Pra preparar aulas e materiais.", ex: "Planos de aula, atividades adaptadas, rubricas" },
];

const FORMATO = [
  { valor: "30h", label: "de curso, com certificado" },
  { valor: "8", label: "módulos, do zero ao projeto" },
  { valor: "20", label: "aulas gravadas" },
  { valor: "70%", label: "do tempo em prática" },
];

/** O ritmo de toda aula no formato gravado (PPC, Metodologia + "Adaptação por formato"). */
const AULA = [
  { h: "Vídeo", t: "Abertura com um problema real que a aula vai resolver" },
  { h: "Vídeo", t: "Conceito essencial: só o necessário pra fazer, com uma analogia" },
  { h: "Vídeo", t: "Demonstração na tela, incluindo um erro proposital da IA" },
  { h: "Você faz", t: "Prática guiada: pause o vídeo e faça junto, passo a passo" },
  { h: "Você faz", t: "Desafio com um problema seu, do seu trabalho ou da sua vida" },
  { h: "Gabarito", t: "Resposta comentada pra você conferir o que fez" },
  { h: "Fechamento", t: "Minuto do senso crítico, quiz rápido e registro no Diário de Prompts" },
];

/** Os 8 módulos e as 20 aulas (PPC, Etapa 2). */
const MODULOS: { t: string; aulas: string[]; sai: string }[] = [
  {
    t: "Desvendando a IA",
    aulas: ["O que é IA e como ela “pensa”", "O que a IA faz, o que não faz e quem são as ferramentas"],
    sai: "Primeiras conversas com uma IA, já sabendo por que ela às vezes inventa respostas",
  },
  {
    t: "Dominando os assistentes",
    aulas: ["Conhecendo ChatGPT, Gemini, Claude e Copilot", "Como conversar com uma IA", "IA no cotidiano: estudar, analisar e resolver"],
    sai: "Cinco tarefas reais do seu dia a dia resolvidas com IA",
  },
  {
    t: "Engenharia de prompts",
    aulas: ["Anatomia de um bom prompt: o Método RECEITA", "Refinar e encadear", "Minha biblioteca de prompts"],
    sai: "Dez prompts próprios, testados e guardados, e o tema do seu projeto final",
  },
  {
    t: "Produtividade e organização",
    aulas: ["Escrita do dia a dia", "Organização e decisões"],
    sai: "Um fluxo pessoal de produtividade em uma página",
  },
  {
    t: "Criatividade e conteúdo",
    aulas: ["Ideias, textos e roteiros", "Imagens e design com IA", "Vídeo, apresentações e direitos autorais"],
    sai: "Um projeto criativo completo, com texto, roteiro e peças visuais",
  },
  {
    t: "Negócios e marketing",
    aulas: ["Pesquisa, público e concorrência", "Marketing e campanhas", "Atendimento, vendas e propostas"],
    sai: "Uma solução de IA para um negócio real ou fictício",
  },
  {
    t: "Automação e assistentes",
    aulas: ["Assistentes, agentes e automações", "Minha primeira automação"],
    sai: "Uma automação simples ou um assistente personalizado funcionando",
  },
  {
    t: "Projeto final",
    aulas: ["Oficina do projeto final", "Projeto pronto e encerramento"],
    sai: "Um projeto pronto, que resolve um problema real com IA",
  },
];

/** Aulas de 1h30 somadas no formato "4h30". */
function duracao(aulas: number) {
  const min = aulas * 90;
  return `${Math.floor(min / 60)}h${min % 60 ? String(min % 60).padStart(2, "0") : ""}`;
}

/** O Método RECEITA (PPC, Módulo 3). */
const RECEITA = [
  { l: "R", t: "Responsável", d: "Quem a IA deve ser?" },
  { l: "E", t: "Entorno", d: "Qual é a situação?" },
  { l: "C", t: "Comando", d: "O que exatamente fazer?" },
  { l: "E", t: "Expectativa", d: "Pra que serve o resultado?" },
  { l: "I", t: "Instruções de limite", d: "O que evitar ou respeitar?" },
  { l: "T", t: "Tipo de resposta", d: "Como a resposta deve vir?" },
  { l: "A", t: "Amostra", d: "Tem um exemplo do que você quer?" },
];

const FIOS = [
  {
    t: "Diário de Prompts",
    d: "Você guarda os prompts que funcionaram. No fim do curso, ele vira a sua biblioteca pessoal.",
  },
  {
    t: "Projeto do aluno",
    d: "A partir do Módulo 3, cada um escolhe um problema real. Os módulos seguintes alimentam esse projeto.",
  },
  {
    t: "IA responsável",
    d: "Privacidade, LGPD, respostas inventadas e direitos autorais aparecem dentro das tarefas, na hora em que o risco surge.",
  },
];

/** Materiais complementares (PPC completo em PDF, Etapa 4). */
const MATERIAIS = [
  { t: "Biblioteca de 50 prompts", d: "Modelos prontos pra adaptar, em 8 finalidades: estudar, escrever, organizar, criar conteúdo, vender, atender, revisar e automatizar." },
  { t: "Apostila do aluno", d: "O essencial de cada módulo em uma página, pra revisar antes e depois de cada módulo." },
  { t: "Guia de ferramentas gratuitas", d: "Quais assistentes e apps usar, pra quê, o que o plano gratuito permite e quais as alternativas." },
  { t: "Guia de IA responsável", d: "Privacidade, LGPD, respostas inventadas, vieses, direitos autorais e golpes com voz e imagem falsas." },
  { t: "Checklist de boas práticas", d: "O que conferir antes de pedir, antes de usar a resposta e antes de publicar. Pra imprimir ou salvar no celular." },
  { t: "Glossário de 40 termos", d: "Prompt, alucinação, agente, automação, deepfake e outros, explicados em linguagem simples." },
];

/** Exemplos de projeto final (PPC, Módulo 8). */
const PROJETOS = [
  "Calendário de conteúdo de um mês para um salão de beleza",
  "Kit de atendimento de uma loja de material de construção",
  "Atas e relatórios de uma cooperativa em metade do tempo",
  "Sequência de aulas de Ciências com atividades adaptadas",
  "Formulário de encomendas de uma confeitaria ligado a uma planilha",
  "Rotina semanal, compras e controle de gastos de uma família",
];

/** Respostas em texto puro — as únicas que entram no JSON-LD. */
const FAQ_TEXTO = [
  {
    q: "Preciso saber programar?",
    a: "Não. O curso não tem programação. Até a automação do Módulo 7 é feita com ferramentas sem código.",
  },
  {
    q: "Nunca usei IA. O curso é pra mim?",
    a: "É exatamente pra você. Basta saber navegar na internet pelo celular ou computador, ter um e-mail ativo e saber copiar e colar texto. O curso vai no seu ritmo: pode pausar e rever cada aula quantas vezes precisar.",
  },
  {
    q: "Só tenho celular. Consigo fazer?",
    a: "Consegue. As atividades foram pensadas para os aplicativos de celular dos assistentes de IA.",
  },
  {
    q: "Vou precisar pagar alguma ferramenta?",
    a: "Não. Nenhuma atividade obrigatória exige assinatura paga. Quando uma ferramenta paga aparece em aula, a aula mostra a alternativa gratuita, e você aprende a alternar entre ferramentas quando o limite gratuito acabar.",
  },
  {
    q: "Como funciona o curso?",
    a: "É 100% gravado: você assiste quando e onde quiser, no seu ritmo. Cada aula é dividida em vídeos curtos, de 8 a 12 minutos, com exercícios passo a passo e gabarito comentado. Não há encontros ao vivo nem acompanhamento online: tudo o que você precisa está nas aulas e nos materiais.",
  },
  {
    q: "A IA vai tomar o meu emprego?",
    a: "O curso trata isso sem alarmismo e sem promessa: a IA muda tarefas antes de mudar profissões. Julgamento, relacionamento, responsabilidade e conhecimento do contexto local continuam humanos, e quem entende a ferramenta tem mais opções.",
  },
  {
    q: "Como sei se estou aprendendo?",
    a: "Cada aula termina com um quiz rápido e cada exercício tem resposta comentada, pra você mesmo conferir o que fez. O foco é no que você consegue fazer, não no que decorou: ao longo dos módulos você monta um portfólio de entregas e, no fim, um projeto que resolve um problema real seu.",
  },
];

const FAQ: FaqItem[] = [
  ...FAQ_TEXTO,
  {
    q: "Quanto custa e por quanto tempo tenho acesso?",
    a: (
      <>
        <ContentSlot label="Investimento, forma de pagamento e tempo de acesso às aulas gravadas." />
        <p className="mt-3">Enquanto isso, chama a gente no WhatsApp.</p>
      </>
    ),
  },
];

export default function IaParaIniciantesPage() {
  const atendimento = wa("escola", "Inteligência Artificial do Zero à Prática");
  const inscricaoHref = INSCRICAO_LINK ?? atendimento;

  const cursoJsonLd = {
    "@context": "https://schema.org",
    "@type": "Course",
    name: "Inteligência Artificial do Zero à Prática",
    description:
      "Curso de 30 horas para iniciantes, sem programação: assistentes de IA, prompts, produtividade, criação de conteúdo, negócios e automação sem código, com 70% do tempo em prática.",
    provider: {
      "@type": "Organization",
      name: "Ousadia Marketing",
      sameAs: "https://instagram.com/ousadiamkt",
    },
    instructor: { "@type": "Person", name: "Jackson Queiroz" },
    hasCourseInstance: {
      "@type": "CourseInstance",
      courseMode: "Online",
      courseWorkload: "PT30H",
      instructor: { "@type": "Person", name: "Jackson Queiroz" },
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
        eyebrow="Curso · 30 horas · 70% prática · com Jackson Queiroz"
        motif="river"
        title={
          <>
            Inteligência Artificial{" "}
            <span className="text-amarelo">do Zero à Prática</span>
          </>
        }
        lead="Pra quem nunca usou IA e quer sair de cada aula com algo pronto nas mãos: um texto, um plano, uma imagem, um fluxo de trabalho. Sem programação, com calma, com exemplos brasileiros e sem prometer milagre."
      >
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <a href={inscricaoHref} className="btn btn-primary">
            Quero fazer o curso <ArrowRight size={16} />
          </a>
          <span className="font-mono text-xs text-cinza-ink">
            Curso gravado · no seu ritmo · só planos gratuitos
          </span>
        </div>
      </PageHero>

      {/* Por que */}
      <section className="relative overflow-hidden bg-ink section-padding">
        <Paddle className="motif motif-soft text-amarelo right-[8%] top-12 hidden w-20 rotate-6 lg:block" />
        <div className="container-site relative">
          <div className="grid gap-12 lg:grid-cols-[1.2fr_.8fr]">
            <Reveal>
              <p className="eyebrow mb-4">IA como ferramenta de trabalho</p>
              <h2 className="headline-section max-w-2xl">
                A IA já está no seu celular. Falta saber usar bem
              </h2>
              <div className="text-body mt-8 space-y-5 text-lg">
                <p>
                  Ela já está no WhatsApp, no buscador, no editor de texto e no
                  Canva. Quem não entende o que ela faz usa mal, ou não usa.
                </p>
                <p>
                  O ganho real vem do uso de todo dia: escrever um e-mail
                  difícil, resumir um documento, planejar a semana, criar um
                  post. Isso se aprende em horas, não em meses.
                </p>
                <p>
                  E o risco também é real: respostas inventadas, dados de
                  clientes vazados, golpes com voz e imagem falsas.{" "}
                  <strong className="font-semibold text-foreground">
                    Usar com segurança também se aprende.
                  </strong>
                </p>
              </div>
            </Reveal>
            <Reveal delay={0.08}>
              <div className="card-surface h-full p-7">
                <p className="font-mono text-xs uppercase tracking-wide text-amarelo">
                  O que o curso não é
                </p>
                <ul className="mt-5 space-y-4">
                  {NAO_E.map((t) => (
                    <li key={t} className="flex items-start gap-3">
                      <span className="mt-0.5 text-destructive" aria-hidden>
                        ✕
                      </span>
                      <span className="text-body text-[0.95rem]">{t}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* Público */}
      <section className="fold-light relative overflow-hidden">
        <WaveDivider
          className="absolute inset-x-0 top-0 rotate-180"
          color="var(--ink)"
        />
        <div className="container-site relative section-padding">
          <Reveal>
            <p className="eyebrow mb-4">Público</p>
            <h2 className="headline-section max-w-2xl">
              Pra quem nunca usou IA, ou usa sem saber direito
            </h2>
          </Reveal>
          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {PUBLICO.map((p, i) => (
              <Reveal key={p.t} delay={i * 0.05}>
                <div className="card-surface flex h-full flex-col p-6">
                  <h3 className="font-display text-lg">{p.t}</h3>
                  <p className="text-body mt-2 text-sm">{p.d}</p>
                  <p className="mt-auto pt-4 font-mono text-[11px] uppercase tracking-wide text-floresta-deep">
                    No curso · {p.ex}
                  </p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Formato e ritmo da aula */}
      <section className="relative overflow-hidden bg-roxo section-padding">
        <GrafismoDiamonds
          color="#ffffff"
          className="absolute inset-0 opacity-[0.04]"
        />
        <div className="container-site relative">
          <div className="grid gap-12 lg:grid-cols-[.9fr_1.1fr]">
            <Reveal>
              <p className="eyebrow mb-4">Formato</p>
              <h2 className="headline-section">
                Mão na massa em{" "}
                <span className="text-amarelo">toda aula</span>
              </h2>
              <p className="text-body mt-5 max-w-md">
                O curso é gravado e toda aula segue o mesmo ritmo, pra você
                saber o que esperar: vídeos curtos de 8 a 12 minutos, e a maior
                parte do tempo com você fazendo no seu celular, com gabarito
                comentado pra conferir.
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
              <ol className="card-surface divide-y divide-white/10 p-2">
                {AULA.map((a) => (
                  <li key={a.t} className="flex gap-5 px-4 py-3.5">
                    <span className="w-24 shrink-0 font-mono text-xs uppercase tracking-wide text-amarelo">
                      {a.h}
                    </span>
                    <span className="text-sm text-foreground">{a.t}</span>
                  </li>
                ))}
              </ol>
            </Reveal>
          </div>
        </div>
      </section>

      {/* Quem conduz */}
      <section className="relative overflow-hidden bg-ink-void section-padding">
        <div className="container-site relative">
          <div className="grid items-center gap-12 lg:grid-cols-[.85fr_1.15fr]">
            <Reveal>
              <Image
                src="/sobre/aula-revisao.webp"
                alt="Jackson Queiroz dando aula diante de um flip chart com a revisão do dia"
                width={540}
                height={675}
                className="mx-auto w-full max-w-sm rounded-2xl border-2 border-amarelo object-cover shadow-[0_24px_60px_rgba(0,0,0,.35)]"
              />
            </Reveal>
            <Reveal delay={0.08}>
              <div>
                <p className="eyebrow mb-4">Quem conduz</p>
                <h2 className="headline-section max-w-xl">
                  Conheça <span className="text-amarelo">Jackson Queiroz</span>,
                  quem vai conduzir o curso
                </h2>
                <div className="mt-6 flex flex-wrap gap-2">
                  {[
                    "Fundador da Ousadia",
                    "Turmas presenciais desde 2020",
                    "Amazon Marketing Day",
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
                    O Jackson foi servidor público por 18 anos antes de fundar a
                    Ousadia Marketing. Desde 2020 conduz turmas presenciais de
                    marketing e conteúdo no Norte do Brasil: a Imersão ABC do
                    Marketing Digital, que depois virou o Destrave, e o Amazon
                    Marketing Day, congresso de marketing feito na Amazônia.
                  </p>
                  <p>
                    No Inteligência Artificial do Zero à Prática, ele leva o
                    mesmo jeito de ensinar: uma ideia por vez, com analogia e
                    exemplo da região, e muito tempo de prática. Pra quem chega
                    com medo de “não saber mexer”, o primeiro objetivo é sair da
                    primeira aula tendo conversado com uma IA.
                  </p>
                </div>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* Módulos (âncora usada pelo Diagnóstico de IA, nível Praticante) */}
      <section id="modulos" className="fold-light relative scroll-mt-20 overflow-hidden">
        <WaveDivider
          className="absolute inset-x-0 top-0 rotate-180"
          color="var(--ink-void)"
        />
        <div className="container-site relative section-padding">
          <div className="grid gap-12 lg:grid-cols-[.8fr_1.2fr]">
            <Reveal>
              <p className="eyebrow mb-4">A trilha</p>
              <h2 className="headline-section">
                8 módulos, do primeiro “oi” ao projeto
              </h2>
              <p className="text-body mt-5 max-w-md">
                Entender, conversar, instruir com precisão, aplicar no trabalho,
                conectar ferramentas e resolver um problema real. Cada módulo usa
                o anterior e termina com uma entrega que vai pro seu portfólio.
              </p>
              <p className="text-body mt-6 max-w-md border-l-2 border-floresta-deep pl-4 text-sm">
                <strong>Já usa IA no trabalho?</strong> O curso é um só, e o
                conteúdo mais denso está nos módulos finais: produtividade com
                medição (4), conteúdo (5), negócios e marketing (6), automação e
                assistentes (7) e o projeto final (8). Pra você, os primeiros
                servem de revisão rápida.
              </p>
            </Reveal>
            <Reveal delay={0.06}>
              <ol className="space-y-3">
                {MODULOS.map((m, i) => (
                  <li key={m.t}>
                    <details className="card-surface group p-5 [&_summary::-webkit-details-marker]:hidden">
                      <summary className="flex cursor-pointer list-none items-start gap-4">
                        <span className="w-8 shrink-0 font-display text-xl text-amarelo">
                          {String(i + 1).padStart(2, "0")}
                        </span>
                        <span className="flex-1">
                          <h3 className="font-display text-base">{m.t}</h3>
                          <span className="font-mono text-[11px] uppercase tracking-wide text-cinza-ink">
                            {m.aulas.length} aulas · {duracao(m.aulas.length)}
                          </span>
                        </span>
                        <ChevronDown
                          size={18}
                          className="mt-1 shrink-0 text-amarelo transition-transform group-open:rotate-180"
                          aria-hidden
                        />
                      </summary>
                      <div className="mt-4 pl-12">
                        <ul className="text-body space-y-1.5 text-sm">
                          {m.aulas.map((a) => (
                            <li key={a}>· {a}</li>
                          ))}
                        </ul>
                        <p className="text-body mt-4 text-sm">
                          <span className="font-mono text-[11px] uppercase tracking-wide text-floresta-deep">
                            Você sai com ·{" "}
                          </span>
                          {m.sai}
                        </p>
                      </div>
                    </details>
                  </li>
                ))}
              </ol>
            </Reveal>
          </div>
        </div>
      </section>

      {/* Método RECEITA e os fios condutores */}
      <section className="relative overflow-hidden bg-ink section-padding">
        <div className="container-site relative">
          <Reveal>
            <p className="eyebrow mb-4">O método</p>
            <h2 className="headline-section max-w-2xl">
              Não existe prompt mágico. Existe{" "}
              <span className="text-amarelo">instrução clara</span>
            </h2>
            <p className="text-body mt-5 max-w-2xl">
              No Módulo 3 você aprende o Método RECEITA: sete ingredientes,
              numa palavra fácil de lembrar, pra escrever pedidos que funcionam
              de primeira, sem depender de prompt pronto da internet.
            </p>
          </Reveal>
          <ol className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-7">
            {RECEITA.map((r, i) => (
              <Reveal key={r.t} delay={i * 0.04}>
                <li className="card-surface h-full p-5">
                  <span className="font-display text-4xl leading-none text-amarelo">
                    {r.l}
                  </span>
                  <h3 className="font-display mt-2 text-sm">{r.t}</h3>
                  <p className="text-body mt-1 text-xs">{r.d}</p>
                </li>
              </Reveal>
            ))}
          </ol>
          <div className="mt-14 grid gap-6 md:grid-cols-3">
            {FIOS.map((f, i) => (
              <Reveal key={f.t} delay={i * 0.06}>
                <div className="card-surface h-full p-7">
                  <p className="font-mono text-xs uppercase tracking-wide text-amarelo">
                    Atravessa o curso
                  </p>
                  <h3 className="font-display text-lg mt-2">{f.t}</h3>
                  <p className="text-body mt-2 text-sm">{f.d}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Projeto final e certificado */}
      <section className="fold-light relative overflow-hidden">
        <WaveDivider
          className="absolute inset-x-0 top-0 rotate-180"
          color="var(--ink)"
        />
        <div className="container-site relative section-padding">
          <div className="grid gap-12 lg:grid-cols-2">
            <Reveal>
              <p className="eyebrow mb-4">Projeto final</p>
              <h2 className="headline-section max-w-xl">
                Você termina resolvendo{" "}
                <span className="text-floresta-deep">um problema real</span>
              </h2>
              <p className="text-body mt-5 max-w-md">
                Cada aluno escolhe um problema do próprio trabalho, negócio ou
                vida e monta a solução ao longo do curso: o que fez com IA, o que
                conferiu e o que continua sendo decisão sua. O último módulo traz
                o checklist pra revisar o projeto antes de usar de verdade.
              </p>
            </Reveal>
            <Reveal delay={0.06}>
              <p className="font-mono text-xs uppercase tracking-wide text-floresta-deep">
                Exemplos de projeto
              </p>
              <ul className="mt-4 space-y-3">
                {PROJETOS.map((t) => (
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

      {/* Materiais (PPC completo, Etapa 4) */}
      <section className="relative overflow-hidden bg-ink section-padding">
        <div className="container-site relative">
          <Reveal>
            <p className="eyebrow mb-4">Materiais</p>
            <h2 className="headline-section max-w-2xl">
              Você leva o curso <span className="text-amarelo">pra casa</span>
            </h2>
            <p className="text-body mt-5 max-w-2xl">
              Além das aulas, cada aluno recebe o material de apoio pra revisar
              e continuar usando depois de terminar o curso.
            </p>
          </Reveal>
          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {MATERIAIS.map((m, i) => (
              <Reveal key={m.t} delay={i * 0.04}>
                <div className="card-surface h-full p-6">
                  <h3 className="font-display text-lg">{m.t}</h3>
                  <p className="text-body mt-2 text-sm">{m.d}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Turma */}
      <section className="relative overflow-hidden bg-roxo section-padding">
        <GrafismoDiamonds
          color="#ffffff"
          className="absolute inset-0 opacity-[0.04]"
        />
        <div className="container-site relative">
          <Reveal>
            <p className="eyebrow mb-4 text-center">Acesso</p>
            <h2 className="headline-section mx-auto max-w-2xl text-center">
              Comece quando quiser, <span className="text-amarelo">no seu ritmo</span>
            </h2>
            <p className="text-body mx-auto mt-5 max-w-xl text-center">
              20 aulas gravadas, em vídeos curtos, com exercícios e gabarito
              comentado. Sem dia nem horário marcado: você assiste pelo celular
              ou computador quando der.
            </p>
          </Reveal>
          <ContentSlot
            className="mx-auto mt-10 max-w-xl"
            label="Investimento, forma de pagamento e tempo de acesso às aulas gravadas."
          />
          <Reveal delay={0.12}>
            <div className="mt-10 flex flex-col items-center gap-3">
              <a href={inscricaoHref} className="btn btn-primary">
                Quero fazer o curso <ArrowRight size={16} />
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
            A IA erra, ajuda e muda rápido.{" "}
            <span className="text-amarelo">Quem sabe usar decide melhor.</span>
          </>
        }
        lead="Trinta horas pra sair do zero e usar IA no trabalho com autonomia, senso crítico e responsabilidade."
        ctaLabel="Quero fazer o curso"
        href={inscricaoHref}
        waveColor="var(--paper)"
      />
    </>
  );
}
