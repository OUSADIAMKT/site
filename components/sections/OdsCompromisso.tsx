import {
  Equal,
  GraduationCap,
  Handshake,
  TrendingUp,
  Venus,
  type LucideIcon,
} from "lucide-react";
import { Reveal } from "@/components/ui/Reveal";

/**
 * Compromisso com os ODS da ONU (/sobre, 28/10/2026).
 *
 * Só entram os objetivos que a Ousadia entrega hoje, cada um com um número
 * confirmado pelo cliente. 12 e 15 (bioeconomia) ficam de fora até existir
 * case publicado: no tema Amazônia, promessa sem prova vira greenwashing.
 *
 * Cores e numeração seguem o guia de comunicação dos ODS. Uso informativo:
 * nada de emblema da ONU nem sugestão de parceria oficial.
 */

type Ods = {
  n: number;
  nome: string;
  /** Nome curto que cabe no selo quadrado. */
  selo: string;
  cor: string;
  Icon: LucideIcon;
  numero: string;
  rotulo: string;
  texto: string;
};

const PRINCIPAIS: Ods[] = [
  {
    n: 4,
    nome: "Educação de qualidade",
    selo: "Educação de qualidade",
    cor: "#C5192D",
    Icon: GraduationCap,
    numero: "500",
    rotulo: "alunos formados desde 2020",
    texto:
      "Metade em sala de aula, metade online. Método aplicado (Destrave, Mapa do UGC, Social Media) e oficinas de fotografia pra crianças.",
  },
  {
    n: 8,
    nome: "Trabalho decente e crescimento econômico",
    selo: "Trabalho decente",
    cor: "#A21942",
    Icon: TrendingUp,
    numero: "+50",
    rotulo: "alunos já ganham dinheiro com o que aprenderam",
    texto:
      "Campanhas pagas de UGC com marcas como Samsung, Oral-B e DIY, e alunos formados trabalhando nas coberturas dos grandes eventos da região.",
  },
  {
    n: 10,
    nome: "Redução das desigualdades",
    selo: "Menos desigualdade",
    cor: "#DD1367",
    Icon: Equal,
    numero: "250",
    rotulo: "alunos presenciais no interior do Pará",
    texto:
      "Turmas em Altamira e Brasil Novo e mais 250 alunos online pelo Norte. O mercado digital mora no eixo Rio–São Paulo; a gente traz ele pra cá.",
  },
];

const APOIO: Ods[] = [
  {
    n: 5,
    nome: "Igualdade de gênero",
    selo: "Igualdade de gênero",
    cor: "#FF3A21",
    Icon: Venus,
    numero: "70%",
    rotulo: "dos alunos são mulheres",
    texto: "Muitas mães que começaram gravando escondidas e hoje faturam com conteúdo.",
  },
  {
    n: 17,
    nome: "Parcerias e meios de implementação",
    selo: "Parcerias",
    cor: "#19486A",
    Icon: Handshake,
    numero: "2",
    rotulo: "edições do Amazon Marketing Day",
    texto: "E a Comunidade Creators da Amazônia, juntando marcas, creators e instituições da região.",
  },
];

/** Quadrado no formato dos ícones oficiais: número grande, nome, ícone. */
function Selo({ o, pequeno }: { o: Ods; pequeno?: boolean }) {
  return (
    <div
      className={`flex shrink-0 flex-col justify-between rounded-xl p-3 text-white ${pequeno ? "h-24 w-24" : "h-32 w-32"}`}
      style={{ background: o.cor }}
      aria-hidden
    >
      <span className={`font-display font-bold leading-none ${pequeno ? "text-2xl" : "text-4xl"}`}>
        {o.n}
      </span>
      <span
        className={`font-bold uppercase leading-tight tracking-wide ${pequeno ? "text-[0.55rem]" : "text-[0.62rem]"}`}
      >
        {o.selo}
      </span>
      <o.Icon size={pequeno ? 20 : 28} strokeWidth={1.75} className="self-center" />
    </div>
  );
}

export function OdsCompromisso() {
  return (
    <section
      id="ods"
      className="fold-light relative scroll-mt-20 border-t border-[#1a0b2e]/10"
    >
      <div className="container-site relative section-padding">
        <Reveal>
          <p className="eyebrow mb-4">Impacto</p>
          <h2 className="headline-section max-w-3xl">
            Nosso compromisso com os{" "}
            <span className="text-[var(--floresta-deep)]">ODS da ONU</span>
          </h2>
          <p className="text-body mt-5 max-w-2xl">
            A Agenda 2030 tem 17 Objetivos de Desenvolvimento Sustentável. A
            gente não abraça todos: escolheu os que já entrega no dia a dia,
            com número pra provar.
          </p>
        </Reveal>

        <div className="mt-12 grid gap-6 lg:grid-cols-3">
          {PRINCIPAIS.map((o, i) => (
            <Reveal key={o.n} delay={i * 0.06}>
              <article
                className="card-surface flex h-full flex-col overflow-hidden border-t-4 p-6"
                style={{ borderTopColor: o.cor }}
              >
                <div className="flex items-center gap-5">
                  <Selo o={o} />
                  <div>
                    <p
                      className="font-display text-4xl font-bold leading-none"
                      style={{ color: o.cor }}
                    >
                      {o.numero}
                    </p>
                    <p className="mt-2 text-sm font-semibold leading-snug text-[#241044]">
                      {o.rotulo}
                    </p>
                  </div>
                </div>
                <h3 className="mt-6 font-display text-lg">
                  ODS {o.n} · {o.nome}
                </h3>
                <p className="text-body mt-2 text-sm">{o.texto}</p>
              </article>
            </Reveal>
          ))}
        </div>

        <div className="mt-6 grid gap-6 md:grid-cols-2">
          {APOIO.map((o, i) => (
            <Reveal key={o.n} delay={0.2 + i * 0.06}>
              <article className="card-surface flex h-full items-center gap-5 p-5">
                <Selo o={o} pequeno />
                <div>
                  <h3 className="font-display text-base">
                    ODS {o.n} · {o.nome}
                  </h3>
                  <p className="mt-1 text-sm text-[#241044]">
                    <strong className="font-display text-xl" style={{ color: o.cor }}>
                      {o.numero}
                    </strong>{" "}
                    <span className="font-semibold">{o.rotulo}</span>
                  </p>
                  <p className="text-body mt-1 text-sm">{o.texto}</p>
                </div>
              </article>
            </Reveal>
          ))}
        </div>

        <p className="mt-10 max-w-2xl text-xs text-[#6b6178]">
          Uso informativo dos Objetivos de Desenvolvimento Sustentável. A Ousadia
          não tem vínculo oficial com a ONU.{" "}
          <a
            href="https://brasil.un.org/pt-br/sdgs"
            target="_blank"
            rel="noopener noreferrer"
            className="underline underline-offset-2 hover:text-[#241044]"
          >
            Conheça os 17 ODS
          </a>
          .
        </p>
      </div>
    </section>
  );
}
