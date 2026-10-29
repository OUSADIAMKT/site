import { Check, GitMerge, Sailboat, Sprout, Waves } from "lucide-react";
import { Reveal } from "@/components/ui/Reveal";

/**
 * A Mentoria Social Media Ousado contada como um rio da Amazônia: 4 encontros
 * ao vivo, da nascente à foz. Os temas das semanas vêm do artefato do aulão
 * (posicionamento e portfólio, conteúdo e narrativa, métricas e relatório,
 * preço e prospecção); o conteúdo de cada um puxa do PPC do Social Media Ousado
 * (`lib/PPC/`), com o que mudou no mercado: busca dentro das redes, vídeo curto
 * e IA como equipe.
 *
 * Cada parada tem a dor que fica pra trás, a transformação e quem a pessoa se
 * torna. O rio é desenhado em trechos, um por parada: cada trecho sai do centro
 * da parada e chega ao centro da próxima serpenteando, então as curvas ficam
 * fortes seja qual for a altura do cartão. Nasce na 1ª parada e se abre no fim,
 * como uma foz. Fica no centro no desktop (cartões alternando de lado) e à
 * esquerda no celular.
 */

const PARADAS = [
  {
    icon: Sprout,
    lugar: "Nascente",
    semana: "Semana 1",
    t: "Posicionamento e portfólio",
    rio: "Todo rio grande começa num igarapé. Aqui você descobre de onde brota o seu trabalho.",
    dor: "Você posta, mas ninguém sabe o que você faz. O perfil parece o de qualquer pessoa e, sem portfólio, o cliente não tem por que confiar em você.",
    ganhos: [
      "Posicionamento a partir do seu território: o que você faz, pra quem e por que você",
      "Perfil vitrine, com bio, destaques e fixados que vendem o seu serviço",
      "Portfólio com 3 amostras feitas no celular, mesmo antes do primeiro cliente",
      "Seu perfil analisado ao vivo pela Tháscila",
    ],
    quem: "Uma social media com nome, lugar e vitrine.",
  },
  {
    icon: Waves,
    lugar: "Correnteza",
    semana: "Semana 2",
    t: "Conteúdo e narrativa",
    rio: "A água ganha força. É aqui que o conteúdo para de ficar parado e começa a levar gente junto.",
    dor: "Falta ideia, tudo sai no improviso e o conteúdo fica com cara de qualquer lugar. A IA até escreve, mas sem alma e sem a voz do cliente.",
    ganhos: [
      "Ganchos e roteiros de vídeo curto que seguram nos 3 primeiros segundos",
      "Narrativa com identidade: a história do cliente e do lugar viram diferencial",
      "Conteúdo pensado pra busca, porque hoje se pesquisa no Instagram e no TikTok como no Google",
      "IA como equipe pra pautas, roteiros e legendas, sem perder o seu jeito",
      "Calendário de 30 dias pronto pra um cliente real",
    ],
    quem: "Uma contadora de histórias que nunca mais fica sem pauta.",
  },
  {
    icon: GitMerge,
    lugar: "Encontro das Águas",
    semana: "Semana 3",
    t: "Métricas e relatório",
    rio: "Como o Negro e o Solimões, criatividade e número correm lado a lado. Um sem o outro não chega ao mar.",
    dor: "O cliente pergunta “e aí, deu resultado?” e você trava. Curtida sozinha não paga boleto, e sem prova ninguém renova.",
    ganhos: [
      "As métricas que o dono do negócio entende: alcance, salvamentos, compartilhamentos e mensagens",
      "Relatório de uma página que mostra o que o seu trabalho fez",
      "Ajuste de rota a partir dos números, não do achismo",
    ],
    quem: "Uma profissional que prova resultado e é chamada de novo.",
  },
  {
    icon: Sailboat,
    lugar: "Foz",
    semana: "Semana 4",
    t: "Preço e prospecção",
    rio: "O rio encontra o mar. Seu trabalho ganha o mundo, sem você sair de onde está.",
    dor: "Você cobra no chute, tem vergonha de oferecer e acaba aceitando qualquer valor, ou trabalhando de graça.",
    ganhos: [
      "Tabela de preço montada a partir do seu mercado, com pacotes claros",
      "Scripts de abordagem e proposta pronta em 10 minutos com IA",
      "Prospecção na sua cidade e fora dela, pelo WhatsApp e pelo Direct",
      "Pacote mensal pra trocar o trabalho avulso por renda que se repete",
    ],
    quem: "Uma social media pronta pra viver do que faz, de onde estiver.",
  },
];

/**
 * Um trecho de meandro: começa e termina no centro (x=50) com tangente
 * vertical, pra os trechos emendarem sem quebra.
 */
const RIO_PATH =
  "M50 0 C50 10 85 15 85 35 C85 55 15 50 15 70 C15 85 50 90 50 100";

function Rio({ className, foz }: { className: string; foz?: boolean }) {
  return (
    <svg
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
      aria-hidden
      className={className}
      style={
        foz
          ? { maskImage: "linear-gradient(to bottom, #000 55%, transparent)" }
          : undefined
      }
    >
      {/* margem */}
      <path
        d={RIO_PATH}
        fill="none"
        stroke="var(--roxo)"
        strokeWidth={30}
        strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
      />
      {/* água */}
      <path
        d={RIO_PATH}
        fill="none"
        stroke="var(--rio)"
        strokeOpacity={0.85}
        strokeWidth={20}
        strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
      />
      {/* correnteza */}
      <path
        d={RIO_PATH}
        fill="none"
        stroke="#ffffff"
        strokeOpacity={0.55}
        strokeWidth={2}
        strokeDasharray="10 14"
        strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
        className="rio-corrente"
      />
    </svg>
  );
}

export function JornadaRio() {
  return (
    <div className="relative mx-auto mt-14 max-w-5xl">
      <ol className="relative">
        {PARADAS.map((p, i) => {
          const esquerda = i % 2 === 0;
          return (
            <li
              key={p.lugar}
              className="relative grid grid-cols-[3rem_1fr] gap-x-5 pb-12 lg:grid-cols-[1fr_5rem_1fr] lg:gap-x-8 lg:pb-6"
            >
              {/* trecho do rio do centro desta parada ao centro da próxima: a
                  parada fica à mesma distância do topo em todo <li>, então
                  h-full fecha a conta. O 1º trecho nasce na parada. */}
              <Rio
                foz={i === PARADAS.length - 1}
                className="absolute left-0 top-11 h-full w-12 lg:left-1/2 lg:top-[3.25rem] lg:w-36 lg:-translate-x-1/2"
              />
              {/* parada no rio */}
              <div className="col-start-1 row-start-1 flex justify-center pt-5 lg:col-start-2">
                <span className="relative grid h-12 w-12 place-items-center rounded-full border-4 border-roxo-700 bg-amarelo text-ink shadow-[0_0_0_6px_rgba(255,198,26,.18)] lg:h-16 lg:w-16">
                  <p.icon size={22} />
                </span>
              </div>

              <Reveal
                delay={0.06}
                className={`relative col-start-2 row-start-1 ${esquerda ? "lg:col-start-1" : "lg:col-start-3"}`}
              >
                <article className="card-surface p-6 text-left lg:p-7">
                  <p className="font-mono text-xs uppercase tracking-wide text-amarelo">
                    {p.semana} · {p.lugar}
                  </p>
                  <h4 className="font-display mt-2 text-2xl">{p.t}</h4>
                  <p className="text-body mt-2 text-sm italic">{p.rio}</p>

                  <div className="mt-5 rounded-xl border border-white/10 bg-ink-void/40 p-4">
                    <p className="font-mono text-[11px] uppercase tracking-wide text-cinza-ink">
                      A dor que fica pra trás
                    </p>
                    <p className="text-body mt-1.5 text-sm">{p.dor}</p>
                  </div>

                  <p className="mt-5 font-mono text-[11px] uppercase tracking-wide text-rio">
                    A transformação
                  </p>
                  <ul className="mt-2 space-y-2">
                    {p.ganhos.map((g) => (
                      <li key={g} className="flex gap-2.5 text-sm text-foreground">
                        <Check size={16} className="mt-0.5 shrink-0 text-floresta" />
                        <span>{g}</span>
                      </li>
                    ))}
                  </ul>

                  <div className="mt-5 border-l-2 border-amarelo pl-4">
                    <p className="font-mono text-[11px] uppercase tracking-wide text-amarelo">
                      Quem você se torna
                    </p>
                    <p className="font-display mt-1 text-lg leading-snug">
                      {p.quem}
                    </p>
                  </div>
                </article>
              </Reveal>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
