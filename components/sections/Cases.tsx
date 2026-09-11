import Link from "next/link";
import Image from "next/image";
import { ArrowRight } from "lucide-react";
import { Reveal } from "@/components/ui/Reveal";
import { MediaSlot, ContentSlot } from "@/components/ui/MediaSlot";
import { YouTubeLite } from "@/components/ui/YouTubeLite";
import { casesDestaque, SERVICOS, type Case, type Frente } from "@/lib/portfolio";

/** Linha de etiquetas do case: serviço, cidade e nicho, sem os campos vazios. */
function Etiquetas({ c, className = "" }: { c: Case; className?: string }) {
  const servico = SERVICOS[c.servico];
  return (
    <div
      className={`flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-[0.65rem] uppercase tracking-widest ${className}`}
    >
      <span className={servico.cor}>{servico.label}</span>
      {c.cidade && <span className="text-cinza-ink">{c.cidade}</span>}
      <span className="text-cinza-ink">{c.nicho}</span>
    </div>
  );
}

/**
 * Cartão completo de case — usado em `/portfolio`.
 *
 * Cada bloco só aparece se o dado existir (ver `lib/portfolio.ts`): case com
 * meia história publica meia história, em vez de completar o resto no chute.
 */
export function CaseCard({ c }: { c: Case }) {
  return (
    <article id={c.slug} className="card-surface h-full overflow-hidden scroll-mt-24">
      {c.video ? (
        <YouTubeLite
          id={c.video}
          titulo={`Case ${c.cliente}`}
          poster={c.capa}
        />
      ) : c.capa ? (
        <Image
          src={c.capa}
          alt={`Case ${c.cliente}`}
          width={1200}
          height={900}
          className="aspect-[4/3] w-full object-cover"
        />
      ) : (
        <MediaSlot
          ratio="aspect-[4/3]"
          className="rounded-none border-x-0 border-t-0"
          label={`Foto real de ${c.cliente}: pessoa, produto ou bastidor. Zero stock.`}
        />
      )}

      <div className="p-6">
        <Etiquetas c={c} />

        <h3 className="font-display text-2xl mt-3">{c.cliente}</h3>
        {c.duracao && (
          <p className="mt-1 font-mono text-[0.65rem] uppercase tracking-widest text-cinza-ink">
            Institucional · {c.duracao}
          </p>
        )}
        <p className="text-body mt-3 text-[0.95rem]">{c.resumo}</p>

        {c.numeros && (
          <dl className="mt-6 grid grid-cols-3 gap-3 border-y border-border py-5">
            {c.numeros.map((n) => (
              <div key={n.label}>
                <dt className="sr-only">{n.label}</dt>
                <dd className="font-display text-xl text-amarelo">{n.valor}</dd>
                <p className="mt-1 font-mono text-[0.6rem] uppercase leading-tight tracking-widest text-cinza-ink">
                  {n.label}
                </p>
              </div>
            ))}
          </dl>
        )}

        {c.antes && c.depois ? (
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <div>
              <h4 className="font-mono text-[0.65rem] uppercase tracking-widest text-cinza-ink">
                Antes
              </h4>
              <p className="text-body mt-2 text-sm">{c.antes}</p>
            </div>
            <div>
              <h4 className="font-mono text-[0.65rem] uppercase tracking-widest text-floresta">
                Depois
              </h4>
              <p className="text-body mt-2 text-sm">{c.depois}</p>
            </div>
          </div>
        ) : (
          <ContentSlot
            className="mt-6"
            label={`Antes e depois de ${c.cliente}, uma frase cada, com número que dê pra conferir.`}
          />
        )}

        {c.oQueMudou && (
          <div className="mt-6 border-l-2 border-amarelo pl-4">
            <h4 className="font-mono text-[0.65rem] uppercase tracking-widest text-amarelo">
              O que mudou
            </h4>
            <p className="text-body mt-2 text-sm">{c.oQueMudou}</p>
          </div>
        )}

        {c.entregas && (
          <ul className="mt-6 flex flex-wrap gap-2">
            {c.entregas.map((e) => (
              <li
                key={e}
                className="rounded-full border border-border px-3 py-1 font-mono text-[0.65rem] text-cinza-ink"
              >
                {e}
              </li>
            ))}
          </ul>
        )}

        {c.galeria && (
          <ul className="mt-6 grid grid-cols-2 gap-2">
            {c.galeria.map((f) => (
              <li key={f.src}>
                <Image
                  src={f.src}
                  alt={f.alt}
                  width={800}
                  height={800}
                  className="aspect-square w-full rounded-lg object-cover"
                />
              </li>
            ))}
          </ul>
        )}

        {c.depoimento && (
          <blockquote className="mt-6 text-body text-sm italic">
            “{c.depoimento.texto}”
            <footer className="mt-2 font-mono text-[0.65rem] uppercase tracking-widest not-italic text-cinza-ink">
              {c.depoimento.autor}
            </footer>
          </blockquote>
        )}
      </div>
    </article>
  );
}

/** Versão curta do case, pras vitrines de Home, `/agencia` e `/mentoria`. */
function CaseResumo({ c }: { c: Case }) {
  return (
    <Link
      href={`/portfolio#${c.slug}`}
      className="card-surface group flex h-full flex-col overflow-hidden transition-colors hover:border-amarelo/40"
    >
      {c.capa && (
        <Image
          src={c.capa}
          alt=""
          width={800}
          height={450}
          className="aspect-video w-full object-cover"
          aria-hidden
        />
      )}
      <div className="flex flex-1 flex-col p-6">
        <Etiquetas c={c} />
        <h3 className="font-display text-xl mt-3">{c.cliente}</h3>
        <p className="text-body mt-2 text-sm">{c.resumo}</p>

        {c.numeros && (
          <div className="mt-5 flex flex-wrap gap-5">
            {c.numeros.slice(0, 2).map((n) => (
              <div key={n.label}>
                <p className="font-display text-xl text-amarelo">{n.valor}</p>
                <p className="font-mono text-[0.6rem] uppercase tracking-widest text-cinza-ink">
                  {n.label}
                </p>
              </div>
            ))}
          </div>
        )}

        <span className="mt-5 inline-flex items-center gap-2 pt-1 font-mono text-xs text-amarelo">
          {c.video ? "Assistir o case" : "Ver o case"}
          <ArrowRight
            size={14}
            className="transition-transform group-hover:translate-x-1"
          />
        </span>
      </div>
    </Link>
  );
}

/**
 * Vitrine curta de cases, reutilizada fora do portfólio.
 *
 * Sem case publicado pra aquela frente, mantém os slots rotulados que já
 * existiam nessas páginas — a página nunca fica com um buraco, e o que falta
 * continua visível pro cliente (PRD 7.3).
 */
export function CasesVitrine({
  frente,
  limite = 3,
  slotLabel,
  verTodos = true,
}: {
  frente?: Frente;
  limite?: number;
  /** Texto do slot quando ainda não há case. Recebe o índice do card. */
  slotLabel: (i: number) => string;
  verTodos?: boolean;
}) {
  const cases = casesDestaque(limite, frente);

  return (
    <>
      <div className="grid gap-5 md:grid-cols-3">
        {cases.length > 0
          ? cases.map((c, i) => (
              <Reveal key={c.slug} delay={i * 0.05}>
                <CaseResumo c={c} />
              </Reveal>
            ))
          : Array.from({ length: limite }, (_, i) => (
              <Reveal key={i} delay={i * 0.05}>
                <div className="card-surface h-full p-6">
                  <ContentSlot label={slotLabel(i + 1)} />
                </div>
              </Reveal>
            ))}
      </div>

      {verTodos && (
        <Reveal delay={0.1}>
          <Link
            href="/portfolio"
            className="mt-8 inline-flex items-center gap-2 font-mono text-xs uppercase tracking-widest text-amarelo underline-offset-4 hover:underline"
          >
            Ver o portfólio completo <ArrowRight size={14} />
          </Link>
        </Reveal>
      )}
    </>
  );
}
