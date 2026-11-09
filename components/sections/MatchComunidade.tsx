import {
  ArrowRight,
  Bell,
  Building2,
  Check,
  FileCheck2,
  Handshake,
  MessageCircle,
  ShieldCheck,
  Star,
  Wallet,
} from "lucide-react";
import { Reveal } from "@/components/ui/Reveal";

/**
 * "Como funciona" da Plataforma de Creators da Amazônia, na home.
 * Três passos + o celular do match + as garantias. O WhatsApp só abre quando
 * empresa e talento aceitam.
 */

const URL_PLATAFORMA = "https://comunidade.ousadiamarketing.com.br";

const PASSOS = [
  {
    n: "1",
    t: "Busque ou publique",
    d: "Filtre talentos por especialidade, cidade, nicho e orçamento, ou publique sua demanda e receba candidaturas.",
    chave: false,
  },
  {
    n: "2",
    t: "Dê match",
    d: "A empresa demonstra interesse e o talento aceita. Só então o WhatsApp é liberado para os dois. Nada de spam.",
    chave: true,
  },
  {
    n: "3",
    t: "Combine, entregue e avalie",
    d: "Escopo, prazo e valor ficam registrados antes de começar. Cada entrega vira avaliação e portfólio no perfil.",
    chave: false,
  },
];

const GARANTIAS = [
  { Icon: ShieldCheck, t: "Perfis moderados", d: "A equipe revisa os perfis antes de irem para a vitrine." },
  { Icon: Handshake, t: "Aceite dos dois lados", d: "O contato só abre quando empresa e talento dizem sim." },
  { Icon: FileCheck2, t: "Combinado registrado", d: "Escopo, prazo e valor ficam claros antes do trabalho." },
  { Icon: Wallet, t: "Pagamento direto", d: "A empresa paga o talento diretamente, sem atravessador." },
];

export function MatchComunidade() {
  return (
    <section
      id="match"
      className="relative overflow-hidden section-padding scroll-mt-20"
      aria-labelledby="match-titulo"
    >
      <div className="container-site relative">
        <div className="grid items-center gap-14 lg:grid-cols-[1fr_auto] lg:gap-20">
          <div>
            <Reveal>
              <p className="eyebrow mb-4">Plataforma de Creators da Amazônia</p>
              <h2 id="match-titulo" className="headline-section max-w-2xl">
                Do primeiro contato à entrega,{" "}
                <span className="text-floresta">em três passos</span>.
              </h2>
              <p className="text-body mt-5 max-w-xl">
                Sem intermediário e sem mensagem perdida: o WhatsApp só é
                liberado quando os dois lados dizem sim.
              </p>
            </Reveal>

            <ol className="mt-10 space-y-4">
              {PASSOS.map((p, i) => (
                <Reveal key={p.n} delay={i * 0.07}>
                  <li
                    className={`card-surface flex items-start gap-4 p-5 ${
                      p.chave ? "!border-amarelo" : ""
                    }`}
                  >
                    <span className="grid size-10 shrink-0 rotate-45 place-items-center rounded-md bg-amarelo">
                      <span className="-rotate-45 font-display font-bold text-[#1a1405]">
                        {p.n}
                      </span>
                    </span>
                    <div>
                      <h3 className="flex flex-wrap items-center gap-2 font-display text-lg">
                        {p.t}
                        {p.chave && (
                          <span className="rounded-full bg-amarelo px-2.5 py-0.5 font-mono text-[0.6rem] font-bold uppercase tracking-[0.14em] text-[#1a1405]">
                            O momento-chave
                          </span>
                        )}
                      </h3>
                      <p className="text-body mt-1 text-sm">{p.d}</p>
                    </div>
                  </li>
                </Reveal>
              ))}
            </ol>

            <Reveal delay={0.2}>
              <a
                href={URL_PLATAFORMA}
                target="_blank"
                rel="noopener"
                className="btn btn-primary mt-8"
              >
                Conhecer a plataforma <ArrowRight size={16} />
              </a>
            </Reveal>
          </div>

          <Reveal delay={0.1}>
            <CelularMatch />
          </Reveal>
        </div>

        <ul className="mt-16 grid gap-px overflow-hidden rounded-2xl border border-white/10 bg-white/10 sm:grid-cols-2 lg:grid-cols-4">
          {GARANTIAS.map(({ Icon, t, d }) => (
            <li key={t} className="flex gap-3 bg-ink p-5">
              <Icon className="mt-0.5 size-5 shrink-0 text-floresta" aria-hidden />
              <span>
                <span className="block text-sm font-semibold">{t}</span>
                <span className="text-body mt-0.5 block text-sm leading-snug">{d}</span>
              </span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

function CelularMatch() {
  return (
    <div className="relative mx-auto w-[17.5rem] sm:w-[19rem]" aria-hidden>
      <span className="absolute -left-14 top-24 z-20 hidden items-center gap-2 rounded-xl bg-white px-3 py-2 text-xs font-semibold text-[#1a1405] shadow-lg sm:flex">
        <ShieldCheck className="size-4 text-floresta" /> Perfil verificado
      </span>
      <span className="absolute -right-14 bottom-24 z-20 hidden items-center gap-2 rounded-xl bg-white px-3 py-2 text-xs font-semibold text-[#1a1405] shadow-lg sm:flex">
        <Star className="size-4 fill-amarelo text-amarelo" /> Avaliação 5,0
      </span>

      <div className="relative rounded-[2.6rem] border-[10px] border-black/85 bg-[#10061f] p-3 shadow-[0_40px_90px_-30px_rgba(36,16,68,0.65)]">
        <span className="absolute left-1/2 top-2 h-5 w-20 -translate-x-1/2 rounded-full bg-black" />
        <div className="flex h-[31rem] flex-col gap-3 overflow-hidden rounded-[1.8rem] bg-gradient-to-b from-[#1b0e36] to-[#0e0620] px-3 pb-3 pt-9 text-white">
          <div className="flex items-center justify-between px-1">
            <span className="font-display text-lg font-bold">Matches</span>
            <span className="relative grid size-8 place-items-center rounded-full bg-white/10">
              <Bell className="size-4" />
              <span className="absolute right-1 top-1 size-2 rounded-full bg-amarelo" />
            </span>
          </div>

          <div className="flex items-center gap-3 rounded-2xl bg-white/10 p-3">
            <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-rio/30 text-rio">
              <Building2 className="size-5" />
            </span>
            <span className="text-xs leading-snug">
              <b className="block text-sm">Uma empresa quer falar com você</b>
              <span className="text-white/60">Procura UGC Creator em Altamira</span>
            </span>
          </div>

          <div className="flex items-center gap-3 rounded-2xl bg-white/10 p-3">
            <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-floresta/30 text-floresta">
              <Check className="size-5" />
            </span>
            <span className="text-xs leading-snug">
              <b className="block text-sm">Você aceitou</b>
              <span className="text-white/60">Agora é com os dois lados</span>
            </span>
          </div>

          <div className="mt-auto rounded-3xl bg-amarelo p-4 text-center text-[#1a1405]">
            <Handshake className="mx-auto size-9" />
            <p className="mt-1 font-display text-2xl font-bold leading-none">É um match!</p>
            <p className="mt-1 text-xs font-medium">Empresa e talento se escolheram</p>
            <span className="mt-3 flex items-center justify-center gap-2 rounded-xl bg-[#06150e] py-2 text-xs font-bold uppercase tracking-wider text-floresta">
              <MessageCircle className="size-4" /> Abrir WhatsApp
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
