"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, Check, MessageCircle, TriangleAlert } from "lucide-react";
import { RadarMaturidade } from "./RadarMaturidade";
import { KeneStrip } from "@/components/ui/graphics/Kene";
import {
  DIM_MAX,
  DIM_TEXT,
  DIMS,
  MAX_SCORE,
  PLAN30,
  PRODUTO_LINKS,
  PROFILES,
  STAGES,
  type Resultado,
} from "@/lib/diagnostico";
import { waDiagnostico } from "@/lib/site";
import type { Lead } from "./tipos";

/** Monta a leitura em uma frase — mesma lógica do diagnóstico legado. */
function leitura(r: Resultado, primeiroNome: string) {
  const partes: string[] = [];
  const topGap = r.gaps[0];
  const topForce = [...r.dims].sort((a, b) => b.score - a.score)[0];

  partes.push(
    `${primeiroNome ? `${primeiroNome}, seu` : "Seu"} nível geral é <strong>${r.stage.name}</strong>.`,
  );
  if (topGap) {
    partes.push(
      `Seu maior gargalo está em <strong>${DIMS[topGap.key].label.toLowerCase()}</strong>: ${DIM_TEXT[topGap.key].low}`,
    );
  }
  if (topForce && topGap && topForce.score > topGap.score) {
    partes.push(
      `Por outro lado, <strong>${DIMS[topForce.key].label.toLowerCase()}</strong> está acima da média: ${DIM_TEXT[topForce.key].high}`,
    );
  }
  return partes.join(" ");
}

function Secao({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`border-t border-border px-6 py-10 sm:px-10 sm:py-12 ${className}`}
    >
      {children}
    </div>
  );
}

export function ResultadoDiagnostico({
  resultado: r,
  lead,
  onRefazer,
}: {
  resultado: Resultado;
  lead: Lead;
  onRefazer: () => void;
}) {
  // As barras entram animadas só depois da montagem — sem salto de layout.
  const [preencher, setPreencher] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setPreencher(true), 140);
    return () => clearTimeout(t);
  }, []);

  const primeiroNome = (lead.nome || "").trim().split(" ")[0] ?? "";
  const forcas = r.forces.length
    ? r.forces
    : [[...r.dims].sort((a, b) => b.score - a.score)[0]];

  const waTexto = [
    "Olá! Fiz o Diagnóstico de Maturidade Digital da Ousadia.",
    `Nome: ${lead.nome || "não informado"}`,
    `Estágio: ${r.stage.name} (${r.total}/${MAX_SCORE})`,
    `Perfil: ${PROFILES[r.profile]}`,
    "Quero conversar sobre o próximo passo.",
  ].join("\n");

  return (
    <article className="card-surface overflow-hidden">
      {/* Hero do estágio */}
      <header
        className="relative overflow-hidden px-6 py-10 sm:px-10 sm:py-12"
        style={{ background: r.stage.grad }}
      >
        <div
          className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full blur-[100px]"
          style={{ background: r.stage.accent, opacity: 0.25 }}
          aria-hidden
        />

        <div className="relative flex flex-wrap items-start justify-between gap-6">
          <div className="max-w-2xl">
            <p className="eyebrow" style={{ color: r.stage.accent }}>
              Seu estágio de maturidade
            </p>
            <h2 className="headline-section mt-3">{r.stage.name}</h2>
            <p
              className="mt-3 font-mono text-xs uppercase tracking-[0.22em]"
              style={{ color: r.stage.accent }}
            >
              {r.stage.sub}
            </p>
            <p className="text-body mt-5 text-foreground/85">{r.stage.desc}</p>
          </div>

          <div className="rounded-2xl border border-white/15 bg-white/5 px-6 py-4 text-center backdrop-blur-sm">
            <p className="font-display text-4xl leading-none text-amarelo">
              {r.total}
              <span className="text-base opacity-60">/{MAX_SCORE}</span>
            </p>
            <p className="mt-2 font-mono text-[10px] uppercase tracking-[0.18em] text-cinza-ink">
              Pontuação
            </p>
          </div>
        </div>

        {/* Trilha dos 4 estágios */}
        <ol className="relative mt-8 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {STAGES.map((s) => {
            const atual = s.key === r.stage.key;
            return (
              <li
                key={s.key}
                aria-current={atual ? "step" : undefined}
                className={`rounded-lg px-2 py-2 text-center font-mono text-[10px] uppercase tracking-wider ${
                  atual
                    ? "bg-amarelo font-semibold text-[#1a0b2e]"
                    : "bg-white/5 text-cinza-ink"
                }`}
              >
                {s.name}
              </li>
            );
          })}
        </ol>
      </header>

      {/* Leitura */}
      <Secao>
        <p
          className="rounded-xl border border-amarelo/25 bg-amarelo/5 px-6 py-5 text-[1.05rem] leading-relaxed text-foreground/90 [&_strong]:text-amarelo"
          dangerouslySetInnerHTML={{ __html: leitura(r, primeiroNome) }}
        />
      </Secao>

      {/* Dimensões */}
      <Secao>
        <h3 className="font-display text-2xl">Sua maturidade por dimensão</h3>
        <p className="text-body mt-2 text-sm">
          Cinco dimensões conectadas ao método STORYSELL. Cada uma vale de 0 a{" "}
          {DIM_MAX} pontos.
        </p>

        <div className="mt-8 grid items-center gap-10 md:grid-cols-[300px_1fr]">
          <div className="justify-self-center">
            <RadarMaturidade dims={r.dims} />
          </div>

          <ul className="space-y-4">
            {r.dims.map((d) => (
              <li key={d.key}>
                <div className="mb-2 flex items-baseline justify-between gap-3 text-sm">
                  <span className="font-medium">
                    {DIMS[d.key].label}{" "}
                    <span className="font-mono text-[10px] uppercase tracking-wider text-cinza-ink">
                      · {DIMS[d.key].pillar}
                    </span>
                  </span>
                  <span className="font-mono text-xs text-cinza-ink">
                    {d.score}/{DIM_MAX}
                  </span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-white/8">
                  <div
                    className="h-full rounded-full transition-[width] duration-700 ease-out motion-reduce:transition-none"
                    style={{
                      width: preencher ? `${d.pct}%` : 0,
                      background: DIMS[d.key].color,
                    }}
                  />
                </div>
              </li>
            ))}
          </ul>
        </div>
      </Secao>

      {/* Forças e gargalos */}
      <Secao>
        <div className="grid gap-5 md:grid-cols-2">
          <div className="rounded-xl border border-border border-t-4 border-t-floresta bg-white/[0.03] p-6">
            <h4 className="font-display text-lg text-floresta">
              Suas principais forças
            </h4>
            <ul className="mt-4 space-y-3">
              {forcas.map((d) => (
                <li key={d.key} className="flex gap-3 text-sm">
                  <Check
                    size={16}
                    className="mt-0.5 shrink-0 text-floresta"
                    aria-hidden
                  />
                  <span>
                    <strong className="font-semibold">{DIMS[d.key].label}.</strong>{" "}
                    <span className="text-cinza-ink">
                      {DIM_TEXT[d.key].high}
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-xl border border-border border-t-4 border-t-destructive bg-white/[0.03] p-6">
            <h4 className="font-display text-lg text-destructive">
              Seus 3 gargalos prioritários
            </h4>
            <ul className="mt-4 space-y-3">
              {r.gaps.map((d) => (
                <li key={d.key} className="flex gap-3 text-sm">
                  <TriangleAlert
                    size={16}
                    className="mt-0.5 shrink-0 text-destructive"
                    aria-hidden
                  />
                  <span>
                    <strong className="font-semibold">{DIMS[d.key].label}.</strong>{" "}
                    <span className="text-cinza-ink">{DIM_TEXT[d.key].low}</span>
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </Secao>

      {/* Risco e plano */}
      <Secao>
        <h3 className="font-display text-2xl">Seu principal risco agora</h3>
        <p className="text-body mt-3">{r.stage.risk}</p>

        <h3 className="font-display mt-10 text-2xl">
          Plano recomendado para os próximos 30 dias
        </h3>
        <p className="text-body mt-2 text-sm">
          Passos alinhados ao seu estágio: do que é urgente ao que sustenta o
          crescimento.
        </p>

        <ol className="mt-6 space-y-3">
          {PLAN30[r.stage.key].map(([semana, acao], i) => (
            <li
              key={semana}
              className="flex items-start gap-4 rounded-xl border border-border bg-white/[0.03] p-4"
            >
              <span className="font-display flex size-10 shrink-0 items-center justify-center rounded-full bg-amarelo text-lg text-[#1a0b2e]">
                {i + 1}
              </span>
              <span>
                <span className="font-mono block text-xs uppercase tracking-wider text-amarelo">
                  {semana}
                </span>
                <span className="text-body mt-1 block text-sm">{acao}</span>
              </span>
            </li>
          ))}
        </ol>
      </Secao>

      {/* Oferta indicada */}
      <Secao>
        <div className="relative overflow-hidden rounded-2xl border border-border bg-ink-void p-7 sm:p-9">
          <div
            className="pointer-events-none absolute -right-10 -top-20 h-56 w-72 rounded-full bg-roxo-600/60 blur-[90px]"
            aria-hidden
          />
          <div className="relative">
            <p className="eyebrow">Solução Ousadia indicada para o seu perfil</p>
            <h3 className="font-display mt-3 text-2xl">{r.route.label}</h3>
            <p className="text-body mt-4">{r.route.intro}</p>

            {r.storysell && (
              <p className="mt-4 text-sm font-semibold text-amarelo">
                ✦ Seu perfil tem alta aderência ao método STORYSELL: a
                metodologia foi desenhada exatamente para quem precisa
                transformar voz e conhecimento em autoridade.
              </p>
            )}

            <ul className="mt-6 flex flex-wrap gap-2">
              {r.produtos.map((p, i) => {
                const classe = `rounded-full px-4 py-2 font-mono text-xs transition-colors ${
                  i === 0
                    ? "bg-amarelo font-semibold text-[#1a0b2e]"
                    : "border border-amarelo/30 bg-white/5 text-foreground/85"
                }`;
                const href = PRODUTO_LINKS[p];
                return (
                  <li key={p}>
                    {href ? (
                      <Link href={href} className={`${classe} hover:border-amarelo`}>
                        {p}
                      </Link>
                    ) : (
                      <span className={classe}>{p}</span>
                    )}
                  </li>
                );
              })}
            </ul>

            <p className="mt-5 font-mono text-xs text-cinza-ink">
              {r.route.ladder}
            </p>
          </div>
        </div>
      </Secao>

      {/* CTA final */}
      <div className="border-t border-border bg-white/[0.03] px-6 py-12 text-center sm:px-10">
        <p className="font-display mx-auto max-w-2xl text-xl leading-snug text-amarelo">
          “{r.stage.quote}”
        </p>

        <div className="mt-8 flex flex-col justify-center gap-4 sm:flex-row">
          <a
            href={waDiagnostico(waTexto)}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-primary"
          >
            <MessageCircle size={16} /> {r.stage.ctaLabel}
          </a>
          <Link href="/escola" className="btn btn-secondary">
            Ver a Escola Ousadia <ArrowRight size={16} />
          </Link>
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
