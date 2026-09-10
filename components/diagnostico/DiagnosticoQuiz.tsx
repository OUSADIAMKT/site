"use client";

import { useMemo, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, Lock } from "lucide-react";
import { Field, FormError, Input } from "@/components/forms/fields";
import { ResultadoDiagnostico } from "./ResultadoDiagnostico";
import { LEAD_VAZIO, type Lead } from "./tipos";
import {
  MAX_SCORE,
  QUESTIONS,
  compute,
  payloadPlanilha,
  salvarNaPlanilha,
  type Answers,
  type DimKey,
} from "@/lib/diagnostico";

type Tela = "intro" | "quiz" | "captura" | "resultado";

const ETAPAS = [
  {
    k: "01 · Quem",
    t: "Quem é você",
    d: "Entendemos o momento e o perfil que te trouxeram até aqui.",
  },
  {
    k: "02 · Onde",
    t: "Onde você está",
    d: "Medimos sua maturidade em 5 dimensões do método STORYSELL.",
  },
  {
    k: "03 · Próximo",
    t: "Próximo passo",
    d: "Indicamos o conteúdo, produto ou serviço certo, não a mesma coisa para todo mundo.",
  },
];

const SELOS = [
  "12 perguntas · ~4 min",
  "Resultado personalizado",
  "Sem julgamento, com direção",
];

function embaralhar(n: number) {
  const a = Array.from({ length: n }, (_, i) => i);
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const ORDEM_NATURAL = QUESTIONS.map((q) => q.options.map((_, i) => i));

/** Embaralha as opções das perguntas pontuadas; as de perfil mantêm a ordem. */
function sortearOrdens() {
  return QUESTIONS.map((q) =>
    q.shuffle ? embaralhar(q.options.length) : q.options.map((_, i) => i),
  );
}

export function DiagnosticoQuiz() {
  const [tela, setTela] = useState<Tela>("intro");
  const [i, setI] = useState(0);
  const [answers, setAnswers] = useState<Answers>({});
  const [lead, setLead] = useState<Lead>(LEAD_VAZIO);
  const [erro, setErro] = useState(false);
  // O consentimento é obrigatório, mas um checkbox não mostra borda de erro —
  // sinalizamos no texto do label para o motivo do bloqueio ficar visível.
  const [consentErro, setConsentErro] = useState(false);

  /**
   * A ordem das opções é sorteada quando o diagnóstico começa, não no render:
   * sortear durante o render faria o HTML do servidor divergir do cliente na
   * hidratação.
   */
  const [ordens, setOrdens] = useState<number[][]>(ORDEM_NATURAL);

  const topo = useRef<HTMLDivElement>(null);
  function irParaTopo() {
    const el = topo.current;
    if (!el) return;
    const suave = !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const y = el.getBoundingClientRect().top + window.scrollY - 88;
    window.scrollTo({ top: y, behavior: suave ? "smooth" : "auto" });
  }

  const q = QUESTIONS[i];
  const respostaAtual = answers[q.key];
  const parcial = useMemo(() => compute(answers), [answers]);
  const progresso = tela === "quiz" ? Math.round((i / QUESTIONS.length) * 100) : 100;

  function responder(idx: number) {
    const o = q.options[idx];
    setAnswers((prev) => ({
      ...prev,
      [q.key]: {
        idx,
        tag: o.tag ?? null,
        pts: q.scored ? (o.pts ?? 0) : null,
        dim: (q.dim as DimKey | undefined) ?? null,
      },
    }));
  }

  function avancar() {
    if (!respostaAtual) return;
    if (i < QUESTIONS.length - 1) {
      setI(i + 1);
    } else {
      setTela("captura");
    }
    irParaTopo();
  }

  function voltar() {
    if (i === 0) return;
    setI(i - 1);
    irParaTopo();
  }

  function reiniciar() {
    setAnswers({});
    setLead(LEAD_VAZIO);
    setI(0);
    setErro(false);
    setTela("intro");
    irParaTopo();
  }

  function enviarCaptura(ev: React.FormEvent<HTMLFormElement>) {
    ev.preventDefault();
    const form = ev.currentTarget;
    const dados = new FormData(form);
    const valores: Lead = {
      nome: String(dados.get("nome") ?? "").trim(),
      wpp: String(dados.get("wpp") ?? "").trim(),
      email: String(dados.get("email") ?? "").trim(),
      social: String(dados.get("social") ?? "").trim(),
      local: String(dados.get("local") ?? "").trim(),
    };

    const invalidos: string[] = [];
    if (valores.nome.length < 2) invalidos.push("nome");
    if (valores.wpp.replace(/\D/g, "").length < 10) invalidos.push("wpp");
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(valores.email)) invalidos.push("email");
    if (!dados.get("consent")) invalidos.push("consent");

    form.querySelectorAll<HTMLInputElement>("input[name]").forEach((f) => {
      f.setAttribute("aria-invalid", String(invalidos.includes(f.name)));
    });

    setConsentErro(invalidos.includes("consent"));

    if (invalidos.length) {
      setErro(true);
      form.querySelector<HTMLInputElement>(`[name="${invalidos[0]}"]`)?.focus();
      return;
    }

    setErro(false);
    setLead(valores);

    // Grava na planilha do Google (e dispara o e-mail de aviso do Apps Script).
    // Não esperamos a resposta: o envio segue em segundo plano e o resultado
    // aparece na hora. Se falhar, o CTA de WhatsApp leva a leitura completa —
    // o lead não some em silêncio.
    salvarNaPlanilha(payloadPlanilha(compute(answers), valores));

    setTela("resultado");
    irParaTopo();
  }

  return (
    <div ref={topo} className="scroll-mt-24">
      {/* Progresso */}
      {(tela === "quiz" || tela === "captura") && (
        <div className="sticky top-16 z-30 -mx-1 mb-6 bg-ink-deep/85 px-1 py-3 backdrop-blur-md">
          <div
            className="h-2 overflow-hidden rounded-full border border-border bg-white/5"
            role="progressbar"
            aria-valuenow={progresso}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="Progresso do diagnóstico"
          >
            <div
              className="h-full rounded-full bg-amarelo transition-[width] duration-500 ease-out motion-reduce:transition-none"
              style={{ width: `${progresso}%` }}
            />
          </div>
          <div className="mt-2 flex justify-between font-mono text-[10px] uppercase tracking-widest text-cinza-ink">
            <span>{tela === "captura" ? "Concluído" : `Bloco ${q.block}`}</span>
            <span>
              {tela === "captura"
                ? "Resultado pronto"
                : `Pergunta ${i + 1} de ${QUESTIONS.length}`}
            </span>
          </div>
        </div>
      )}

      {/* Intro */}
      {tela === "intro" && (
        <section className="card-surface p-7 sm:p-10">
          <p className="eyebrow">Como funciona</p>

          <ul className="mt-6 grid gap-4 sm:grid-cols-3">
            {ETAPAS.map((e) => (
              <li
                key={e.k}
                className="rounded-xl border border-border border-t-4 border-t-amarelo bg-white/[0.03] p-5"
              >
                <span className="font-mono text-[10px] uppercase tracking-widest text-rio">
                  {e.k}
                </span>
                <p className="font-display mt-2 text-lg">{e.t}</p>
                <p className="text-body mt-1 text-sm">{e.d}</p>
              </li>
            ))}
          </ul>

          <ul className="mt-7 flex flex-wrap gap-2">
            {SELOS.map((s) => (
              <li
                key={s}
                className="rounded-full border border-border bg-white/5 px-4 py-2 font-mono text-xs text-cinza-ink"
              >
                {s}
              </li>
            ))}
          </ul>

          <p className="text-body mt-8 border-l-4 border-amarelo pl-4 text-sm">
            A Ousadia atende quatro perfis com dores e capacidades muito
            diferentes: creator iniciante, empreendedor local, especialista e
            empresa estruturada. Este diagnóstico foi feito para{" "}
            <strong className="text-foreground">não</strong> tratar todo mundo
            igual.
          </p>

          <div className="mt-9">
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => {
                setOrdens(sortearOrdens());
                setTela("quiz");
                irParaTopo();
              }}
            >
              Começar meu diagnóstico <ArrowRight size={16} />
            </button>
          </div>
        </section>
      )}

      {/* Perguntas */}
      {tela === "quiz" && (
        <section className="card-surface p-7 sm:p-10">
          <p className="inline-block rounded-full bg-roxo-600 px-4 py-2 font-mono text-[10px] uppercase tracking-widest text-foreground">
            {q.blockName}
          </p>
          <p className="text-body mt-5 border-l-4 border-amarelo/50 pl-4 italic">
            {q.blockIntro}
          </p>

          <h2 className="font-display mt-7 text-[clamp(1.35rem,3.4vw,1.85rem)] leading-tight">
            <span className="text-amarelo">
              {String(i + 1).padStart(2, "0")}.
            </span>{" "}
            {q.title}
          </h2>
          <p className="text-body mt-3 text-sm italic">{q.hint}</p>

          <div
            className="mt-7 space-y-3"
            role="radiogroup"
            aria-label={q.title}
          >
            {ordens[i].map((idx) => {
              const o = q.options[idx];
              const sel = respostaAtual?.idx === idx;
              return (
                <button
                  key={idx}
                  type="button"
                  role="radio"
                  aria-checked={sel}
                  onClick={() => responder(idx)}
                  className={`flex w-full items-start gap-4 rounded-xl border p-4 text-left transition-colors ${
                    sel
                      ? "border-amarelo bg-amarelo/10"
                      : "border-border bg-white/[0.03] hover:border-amarelo/60 hover:bg-white/[0.06]"
                  }`}
                >
                  <span
                    className={`mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full border-2 ${
                      sel ? "border-amarelo bg-amarelo" : "border-input"
                    }`}
                    aria-hidden
                  >
                    {sel && (
                      <span className="size-2 rounded-full bg-[#1a0b2e]" />
                    )}
                  </span>
                  <span className="text-sm leading-relaxed">{o.lab}</span>
                </button>
              );
            })}
          </div>

          <div className="mt-8 flex items-center justify-between gap-4">
            <button
              type="button"
              onClick={voltar}
              className={`btn btn-ghost ${i === 0 ? "invisible" : ""}`}
            >
              <ArrowLeft size={16} /> Voltar
            </button>
            <button
              type="button"
              onClick={avancar}
              disabled={!respostaAtual}
              className={
                respostaAtual
                  ? "btn btn-primary"
                  : "btn pointer-events-none border border-border bg-white/5 text-cinza-ink"
              }
            >
              {i === QUESTIONS.length - 1 ? "Finalizar" : "Continuar"}{" "}
              <ArrowRight size={16} />
            </button>
          </div>
        </section>
      )}

      {/* Captura */}
      {tela === "captura" && (
        <section className="card-surface p-7 sm:p-10">
          <p className="eyebrow">Seu diagnóstico está pronto</p>
          <h2 className="headline-section mt-4">
            Para onde enviamos sua leitura completa?
          </h2>
          <p className="text-body mt-4 max-w-2xl">
            Encontramos o seu nível atual de maturidade digital e os principais
            pontos que estão limitando seu crescimento. Preencha para desbloquear
            o resultado detalhado.
          </p>

          <form onSubmit={enviarCaptura} noValidate className="mt-8 space-y-5">
            <div className="grid gap-5 sm:grid-cols-2">
              <Field id="d_nome" label="Nome" required>
                <Input
                  id="d_nome"
                  name="nome"
                  autoComplete="name"
                  placeholder="Como podemos te chamar"
                />
              </Field>
              <Field id="d_wpp" label="WhatsApp" required>
                <Input
                  id="d_wpp"
                  name="wpp"
                  inputMode="tel"
                  autoComplete="tel"
                  placeholder="(00) 00000-0000"
                />
              </Field>
              <Field id="d_email" label="E-mail" required>
                <Input
                  id="d_email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  placeholder="voce@email.com"
                />
              </Field>
              <Field id="d_social" label="Instagram ou site">
                <Input
                  id="d_social"
                  name="social"
                  placeholder="@seuperfil ou seusite.com"
                />
              </Field>
              <Field id="d_local" label="Cidade e estado" full>
                <Input id="d_local" name="local" placeholder="Ex.: Altamira, PA" />
              </Field>
            </div>

            <p className="flex items-center gap-3 rounded-xl border border-amarelo/30 bg-amarelo/5 px-5 py-4 text-sm">
              <Lock size={16} className="shrink-0 text-amarelo" aria-hidden />
              <span>
                <strong className="font-display text-amarelo">Prévia:</strong>{" "}
                seu estágio é{" "}
                <strong className="text-foreground">
                  {parcial.stage.name}
                </strong>{" "}
                ({parcial.total}/{MAX_SCORE}). Falta liberar a análise por
                dimensão e o plano dos próximos 30 dias.
              </span>
            </p>

            <label
              className={`flex items-start gap-3 text-sm ${
                consentErro ? "text-destructive" : "text-cinza-ink"
              }`}
            >
              <input
                type="checkbox"
                name="consent"
                value="sim"
                onChange={() => setConsentErro(false)}
                className={`mt-1 size-4 shrink-0 rounded-sm accent-[var(--amarelo)] ${
                  consentErro ? "outline outline-2 outline-destructive" : ""
                }`}
              />
              <span>
                Autorizo a Ousadia Marketing a enviar meu diagnóstico e conteúdos
                relacionados pelos canais informados.
              </span>
            </label>

            <FormError show={erro} />

            <button
              type="submit"
              className="btn btn-primary w-full sm:w-auto"
            >
              Ver meu diagnóstico completo{" "}
              <ArrowRight size={16} />
            </button>
          </form>
        </section>
      )}

      {/* Resultado */}
      {tela === "resultado" && (
        <ResultadoDiagnostico
          resultado={compute(answers)}
          lead={lead}
          onRefazer={reiniciar}
        />
      )}
    </div>
  );
}
