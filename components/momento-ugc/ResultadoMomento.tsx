"use client";

import { useState } from "react";
import {
  BookOpen,
  Brain,
  CircleAlert,
  Clapperboard,
  Construction,
  HeartHandshake,
  MapPin,
  MessageCircle,
  Mail,
  Share2,
  Trophy,
  Users,
} from "lucide-react";
import { KeneStrip } from "@/components/ui/graphics/Kene";
import { YouTubeLite } from "@/components/ui/YouTubeLite";
import { GRUPO_MAPA_UGC, SITE, waAulaoUgc } from "@/lib/site";
import {
  AVISO_MENOR,
  MOMENTOS,
  fraseAbertura,
  indicacoes,
  mensagemWhatsapp,
  type Lead,
  type Resultado,
} from "@/lib/momento-ugc";

function Secao({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`border-t border-border px-6 py-10 sm:px-10 sm:py-12 ${className}`}>{children}</div>;
}

function Titulo({ icone: Icone, children }: { icone: typeof Brain; children: React.ReactNode }) {
  return (
    <h3 className="font-display flex items-center gap-3 text-2xl">
      <Icone size={22} className="shrink-0 text-amarelo" aria-hidden />
      {children}
    </h3>
  );
}

export function ResultadoMomento({
  resultado: r,
  lead,
  onRefazer,
}: {
  resultado: Resultado;
  lead: Lead;
  onRefazer: () => void;
}) {
  const m = r.momento;
  const [copiado, setCopiado] = useState(false);

  const travas = [
    { icone: Brain, titulo: "O pensamento que está te segurando", ...r.crenca },
    { icone: Construction, titulo: "O que te impede hoje", ...r.bloqueio },
    { icone: HeartHandshake, titulo: "Sobre o seu medo", ...r.medo },
  ];

  async function compartilhar() {
    const texto = `Meu Momento UGC é ${m.emoji} ${m.nome}. Descobre o seu:`;
    const url = `${SITE.url}/momento-ugc`;
    try {
      if (navigator.share) {
        await navigator.share({ title: "Qual é o seu Momento UGC?", text: texto, url });
        return;
      }
      await navigator.clipboard.writeText(`${texto} ${url}`);
      setCopiado(true);
    } catch {
      // compartilhamento cancelado: nada a fazer
    }
  }

  return (
    <article className="card-surface overflow-hidden">
      {/* Momento */}
      <header className="relative overflow-hidden bg-roxo px-6 py-10 sm:px-10 sm:py-12">
        <div
          className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full bg-amarelo/25 blur-[100px]"
          aria-hidden
        />
        <div className="relative max-w-2xl">
          <p className="text-body text-lg text-foreground/90">{fraseAbertura(r, lead.nome)}</p>
          <p className="eyebrow mt-8">Seu Momento UGC</p>
          <h2 className="headline-section mt-3">
            <span aria-hidden>{m.emoji}</span> Momento {m.nome}
          </h2>
          <p className="font-display mt-4 text-xl leading-snug text-amarelo">“{m.frase}”</p>
        </div>

        {/* Escada dos 5 momentos */}
        <ol className="relative mt-10 grid grid-cols-5 gap-1.5 sm:gap-2">
          {MOMENTOS.map((x) => {
            const atual = x.key === m.key;
            return (
              <li
                key={x.key}
                aria-current={atual ? "step" : undefined}
                className={`relative rounded-lg px-1 py-2.5 text-center font-mono text-[10px] uppercase tracking-wider sm:text-[11px] ${
                  atual ? "bg-amarelo font-semibold text-[#1a0b2e]" : "bg-white/5 text-cinza-ink"
                }`}
              >
                {atual && (
                  <span className="absolute -top-6 left-1/2 flex -translate-x-1/2 items-center gap-0.5 whitespace-nowrap normal-case tracking-normal text-amarelo">
                    <MapPin size={12} aria-hidden /> você está aqui
                  </span>
                )}
                <span className="block text-xl leading-none sm:text-base" aria-hidden>
                  {x.emoji}
                </span>
                {/* No celular, 5 nomes não cabem lado a lado ("Descoberta" estoura):
                    fica só o emoji, e o nome do momento já está no título acima. */}
                <span className="sr-only sm:not-sr-only sm:mt-1 sm:block">
                  {x.nome.replace(/[“”]/g, "")}
                </span>
              </li>
            );
          })}
        </ol>
      </header>

      {/* Diagnóstico */}
      <Secao>
        <Titulo icone={Brain}>Seu diagnóstico</Titulo>
        <p className="text-body mt-4 text-[1.05rem] leading-relaxed">{m.diagnostico}</p>
      </Secao>

      {/* Travas */}
      <Secao>
        <Titulo icone={Construction}>O que está te travando</Titulo>
        <div className="mt-6 grid gap-5 md:grid-cols-3">
          {travas.map((t) => (
            <div
              key={t.titulo}
              className="rounded-xl border border-border border-t-4 border-t-amarelo bg-white/[0.03] p-6"
            >
              <p className="font-mono text-[10px] uppercase tracking-widest text-rio">{t.titulo}</p>
              <p className="font-display mt-3 text-lg leading-snug">{t.rotulo}</p>
              <p className="text-body mt-3 text-sm">{t.texto}</p>
            </div>
          ))}
        </div>
      </Secao>

      {/* O que fazer */}
      <Secao>
        <Titulo icone={Trophy}>O que você precisa fazer agora</Titulo>
        <div className="mt-6 rounded-xl border-2 border-amarelo bg-amarelo/10 p-6">
          <p className="font-mono text-[10px] uppercase tracking-widest text-amarelo">Sua tarefa de hoje</p>
          <p className="mt-2 text-[1.05rem] leading-relaxed">{m.tarefa}</p>
        </div>
        <ol className="mt-5 space-y-3">
          {m.fazer.map((f, k) => (
            <li key={f} className="flex items-start gap-4 rounded-xl border border-border bg-white/[0.03] p-4">
              <span className="font-display flex size-9 shrink-0 items-center justify-center rounded-full bg-amarelo text-[#1a0b2e]">
                {k + 1}
              </span>
              <span className="text-body text-sm">{f}</span>
            </li>
          ))}
        </ol>
      </Secao>

      {/* Vídeo */}
      <Secao>
        <Titulo icone={Clapperboard}>Aula do seu momento</Titulo>
        {m.video.youtubeId ? (
          <div className="mt-6 overflow-hidden rounded-2xl border-2 border-amarelo">
            <YouTubeLite id={m.video.youtubeId} titulo={m.video.tema} />
          </div>
        ) : (
          <div className="mt-6 rounded-2xl border border-dashed border-amarelo/40 bg-white/[0.03] p-6">
            <p className="font-mono text-[10px] uppercase tracking-widest text-amarelo">Em breve</p>
            <p className="font-display mt-2 text-lg">{m.video.tema}</p>
            <p className="text-body mt-2 text-sm">
              A Juh está preparando esta aula. Ela vai chegar primeiro no grupo do WhatsApp.
            </p>
          </div>
        )}
      </Secao>

      {/* Estudar e assistir */}
      <Secao>
        <div className="grid gap-10 md:grid-cols-2">
          <div>
            <Titulo icone={BookOpen}>O que começar a estudar</Titulo>
            <ul className="mt-5 space-y-3">
              {m.estudar.map((e) => (
                <li key={e} className="text-body flex gap-3 text-sm">
                  <span className="mt-1.5 size-2 shrink-0 rounded-full bg-amarelo" aria-hidden />
                  {e}
                </li>
              ))}
            </ul>
          </div>
          <div>
            <Titulo icone={Clapperboard}>Pra assistir e se inspirar</Titulo>
            <ul className="mt-5 space-y-4">
              {indicacoes(r).map((f) => (
                <li key={f.titulo} className="rounded-xl border border-border bg-white/[0.03] p-4">
                  <p className="font-display text-base">{f.titulo}</p>
                  <p className="font-mono text-[10px] uppercase tracking-widest text-cinza-ink">{f.tipo}</p>
                  <p className="text-body mt-2 text-sm">{f.porque}</p>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </Secao>

      {/* Próximas vitórias */}
      <Secao>
        <Titulo icone={Trophy}>Suas próximas vitórias</Titulo>
        <p className="text-body mt-2 text-sm">
          Uma de cada vez. Quando conquistar uma, comemore e parta pra próxima.
        </p>
        <ol className="mt-6 grid gap-4 sm:grid-cols-3">
          {m.vitorias.map((v, k) => (
            <li key={v.titulo} className="rounded-xl border border-border bg-white/[0.03] p-5">
              <span className="font-display text-3xl text-amarelo">{k + 1}</span>
              <p className="font-display mt-2 text-lg">{v.titulo}</p>
              <p className="text-body mt-1 text-sm">{v.texto}</p>
            </li>
          ))}
        </ol>

        {lead.idade === "menos_18" && (
          <p className="mt-8 flex gap-3 rounded-xl border border-rio/40 bg-rio/10 p-5 text-sm">
            <CircleAlert size={18} className="mt-0.5 shrink-0 text-rio" aria-hidden />
            <span>{AVISO_MENOR}</span>
          </p>
        )}
      </Secao>

      {/* Fechamento */}
      <div className="border-t border-border bg-white/[0.03] px-6 py-12 text-center sm:px-10">
        <p className="font-display mx-auto max-w-2xl text-xl leading-snug">
          Fez a tarefa? Volte pro grupo e conte:{" "}
          <span className="text-amarelo">
            “Fiz a tarefa do Momento {m.nome.replace(/[“”]/g, "")}!”
          </span>{" "}
          💛
        </p>

        <p className="text-body mx-auto mt-4 flex max-w-xl items-start justify-center gap-2 text-sm">
          <Mail size={16} className="mt-0.5 shrink-0 text-amarelo" aria-hidden />
          <span>
            Uma cópia deste diagnóstico vai pro e-mail <strong>{lead.email}</strong>. Pode
            levar algumas horas; confira também o spam e a aba Promoções.
          </span>
        </p>

        <div className="mt-8 flex flex-col justify-center gap-4 sm:flex-row">
          <a
            href={waAulaoUgc(mensagemWhatsapp(r, lead))}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-primary"
          >
            <MessageCircle size={16} /> Receber no WhatsApp da Juh
          </a>
          <a href={GRUPO_MAPA_UGC} target="_blank" rel="noopener noreferrer" className="btn btn-secondary">
            <Users size={16} /> Voltar pro grupo
          </a>
          <button type="button" onClick={compartilhar} className="btn btn-ghost">
            <Share2 size={16} /> {copiado ? "Link copiado!" : "Compartilhar meu momento"}
          </button>
        </div>

        <button
          type="button"
          onClick={onRefazer}
          className="mt-8 font-mono text-xs text-cinza-ink underline underline-offset-4 transition-colors hover:text-foreground"
        >
          Refazer o diagnóstico
        </button>
      </div>

      <KeneStrip motif="iso" height={18} className="text-amarelo opacity-60" />
    </article>
  );
}
