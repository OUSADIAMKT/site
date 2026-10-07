"use client";

import { useRef, useState } from "react";
import { ArrowLeft, ArrowRight, Check } from "lucide-react";
import {
  Field,
  FormError,
  Input,
  Select,
  Textarea,
} from "@/components/forms/fields";
import { ResultadoMomento } from "./ResultadoMomento";
import {
  OUTRO,
  PERGUNTAS,
  calcular,
  payloadPlanilha,
  salvarNaPlanilha,
  type Lead,
  type Resposta,
  type Respostas,
} from "@/lib/momento-ugc";

type Tela = "intro" | "quiz" | "aberta" | "captura" | "resultado";

const LEAD_VAZIO: Lead = {
  nome: "",
  wpp: "",
  email: "",
  instagram: "",
  pergunta: "",
};

const COMO_FUNCIONA = [
  {
    k: "01",
    t: "10 perguntas rápidas",
    d: "Sobre a sua vida, o seu momento e o que te trava. Leva uns 4 minutos.",
  },
  {
    k: "02",
    t: "Seu Momento UGC",
    d: "Você descobre em qual dos 5 momentos está e o que está te segurando.",
  },
  {
    k: "03",
    t: "Seu próximo passo",
    d: "O que fazer agora, o que estudar, o que assistir e as suas próximas vitórias.",
  },
];

function embaralhar(n: number) {
  const a = Array.from({ length: n }, (_, i) => i);
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const ORDEM_NATURAL = PERGUNTAS.map((q) => q.opcoes.map((_, i) => i));

export function MomentoQuiz() {
  const [tela, setTela] = useState<Tela>("intro");
  const [i, setI] = useState(0);
  const [respostas, setRespostas] = useState<Respostas>({});
  const [lead, setLead] = useState<Lead>(LEAD_VAZIO);
  const [pergunta, setPergunta] = useState("");
  const [erro, setErro] = useState(false);
  const [consentErro, setConsentErro] = useState(false);
  // Sorteada ao começar, não no render — senão o HTML do servidor diverge do
  // cliente na hidratação (mesmo cuidado do Diagnóstico de Maturidade).
  const [ordens, setOrdens] = useState<number[][]>(ORDEM_NATURAL);

  const topo = useRef<HTMLDivElement>(null);
  function irParaTopo() {
    const el = topo.current;
    if (!el) return;
    const suave = !window.matchMedia("(prefers-reduced-motion: reduce)")
      .matches;
    const y = el.getBoundingClientRect().top + window.scrollY - 88;
    window.scrollTo({ top: y, behavior: suave ? "smooth" : "auto" });
  }

  const q = PERGUNTAS[i];
  const atual: Resposta = respostas[q.key] ?? { ids: [], outro: "" };
  const respondida =
    q.key === "local"
      ? atual.ids.length > 0 && atual.outro.trim().length >= 2
      : atual.ids.length > 0 &&
        (!atual.ids.includes(OUTRO) || atual.outro.trim().length > 0);
  const total = PERGUNTAS.length + 1; // + o campo aberto
  const passo =
    tela === "quiz" ? i : tela === "aberta" ? PERGUNTAS.length : total;
  const progresso = Math.round((passo / total) * 100);

  function alternar(id: string) {
    setRespostas((prev) => {
      const r = prev[q.key] ?? { ids: [], outro: "" };
      const ids = q.multipla
        ? r.ids.includes(id)
          ? r.ids.filter((x) => x !== id)
          : [...r.ids, id]
        : [id];
      return { ...prev, [q.key]: { ...r, ids } };
    });
  }

  function escolherUf(uf: string) {
    setRespostas((prev) => ({
      ...prev,
      [q.key]: { ids: uf ? [uf] : [], outro: prev[q.key]?.outro ?? "" },
    }));
  }

  function escreverOutro(texto: string) {
    setRespostas((prev) => ({
      ...prev,
      [q.key]: {
        ids: prev[q.key]?.ids ?? (q.key === "local" ? [] : [OUTRO]),
        outro: texto,
      },
    }));
  }

  function avancar() {
    if (!respondida) return;
    if (i < PERGUNTAS.length - 1) setI(i + 1);
    else setTela("aberta");
    irParaTopo();
  }

  function voltar() {
    if (tela === "aberta") setTela("quiz");
    else if (i > 0) setI(i - 1);
    irParaTopo();
  }

  function reiniciar() {
    setRespostas({});
    setLead(LEAD_VAZIO);
    setPergunta("");
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
      instagram: String(dados.get("instagram") ?? "").trim(),
      pergunta: pergunta.trim(),
    };

    const invalidos: string[] = [];
    if (valores.nome.length < 2) invalidos.push("nome");
    if (valores.wpp.replace(/\D/g, "").length < 10) invalidos.push("wpp");
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(valores.email))
      invalidos.push("email");
    if (!dados.get("consent")) invalidos.push("consent");

    form
      .querySelectorAll<HTMLInputElement | HTMLSelectElement>("[name]")
      .forEach((f) => {
        f.setAttribute("aria-invalid", String(invalidos.includes(f.name)));
      });
    setConsentErro(invalidos.includes("consent"));

    if (invalidos.length) {
      setErro(true);
      form.querySelector<HTMLElement>(`[name="${invalidos[0]}"]`)?.focus();
      return;
    }

    setErro(false);
    setLead(valores);
    // Grava na planilha e pede ao Apps Script o e-mail com o diagnóstico.
    // Não espera resposta: o resultado aparece na hora.
    salvarNaPlanilha(payloadPlanilha(respostas, calcular(respostas), valores));
    setTela("resultado");
    irParaTopo();
  }

  return (
    <div ref={topo} className="scroll-mt-24">
      {(tela === "quiz" || tela === "aberta" || tela === "captura") && (
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
            <span>
              {tela === "quiz"
                ? q.tema
                : tela === "aberta"
                  ? "Sua voz"
                  : "Quase lá"}
            </span>
            <span>
              {tela === "quiz"
                ? `Pergunta ${i + 1} de ${PERGUNTAS.length}`
                : tela === "aberta"
                  ? "Opcional"
                  : "Resultado pronto"}
            </span>
          </div>
        </div>
      )}

      {tela === "intro" && (
        <section className="card-surface p-7 sm:p-10">
          <p className="eyebrow">
            Me ajuda a criar o próximo passo pra você? 💛
          </p>
          <p className="text-body mt-4 max-w-2xl">
            Responda 10 perguntas rápidas e receba na hora o seu diagnóstico: em
            que momento você está, o que está te travando e o que fazer agora.
            Suas respostas também vão guiar os próximos conteúdos e cursos da
            Ousadia.
          </p>

          <ul className="mt-8 grid gap-4 sm:grid-cols-3">
            {COMO_FUNCIONA.map((e) => (
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
            {["Gratuito", "~4 minutos", "Sem certo ou errado"].map((s) => (
              <li
                key={s}
                className="rounded-full border border-border bg-white/5 px-4 py-2 font-mono text-xs text-cinza-ink"
              >
                {s}
              </li>
            ))}
          </ul>

          <div className="mt-9">
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => {
                setOrdens(
                  PERGUNTAS.map((p) =>
                    p.embaralhar
                      ? embaralhar(p.opcoes.length)
                      : p.opcoes.map((_, k) => k),
                  ),
                );
                setTela("quiz");
                irParaTopo();
              }}
            >
              Quero descobrir meu momento <ArrowRight size={16} />
            </button>
          </div>
        </section>
      )}

      {tela === "quiz" && (
        <section className="card-surface p-7 sm:p-10">
          <p className="inline-block rounded-full bg-roxo-600 px-4 py-2 font-mono text-[10px] uppercase tracking-widest text-foreground">
            {q.tema}
          </p>
          <h2 className="font-display mt-6 text-[clamp(1.35rem,3.4vw,1.85rem)] leading-tight">
            <span className="text-amarelo">
              {String(i + 1).padStart(2, "0")}.
            </span>{" "}
            {q.titulo}
          </h2>
          <p className="text-body mt-3 text-sm italic">{q.dica}</p>

          {q.key === "local" ? (
            <div className="mt-7 grid gap-5 sm:grid-cols-2">
              <Field id="m_uf" label="Estado">
                <Select
                  id="m_uf"
                  value={atual.ids[0] ?? ""}
                  onChange={(e) => escolherUf(e.target.value)}
                >
                  <option value="" disabled>
                    Escolha o estado
                  </option>
                  {q.opcoes.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.lab}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field id="m_cidade" label="Cidade">
                <Input
                  id="m_cidade"
                  maxLength={80}
                  autoComplete="address-level2"
                  value={atual.outro}
                  onChange={(e) => escreverOutro(e.target.value)}
                  placeholder="Ex.: Altamira"
                />
              </Field>
            </div>
          ) : (
            <div
              className="mt-7 space-y-3"
              role={q.multipla ? "group" : "radiogroup"}
              aria-label={q.titulo}
            >
              {[
                ...ordens[i].map((k) => q.opcoes[k]),
                ...(q.outro ? [{ id: OUTRO, lab: "Outro" }] : []),
              ].map((o) => {
                const sel = atual.ids.includes(o.id);
                return (
                  <button
                    key={o.id}
                    type="button"
                    role={q.multipla ? "checkbox" : "radio"}
                    aria-checked={sel}
                    onClick={() => alternar(o.id)}
                    className={`flex w-full items-start gap-4 rounded-xl border p-4 text-left transition-colors ${
                      sel
                        ? "border-amarelo bg-amarelo/10"
                        : "border-border bg-white/[0.03] hover:border-amarelo/60 hover:bg-white/[0.06]"
                    }`}
                  >
                    <span
                      className={`mt-0.5 flex size-5 shrink-0 items-center justify-center border-2 ${
                        q.multipla ? "rounded-[4px]" : "rounded-full"
                      } ${sel ? "border-amarelo bg-amarelo" : "border-input"}`}
                      aria-hidden
                    >
                      {sel &&
                        (q.multipla ? (
                          <Check
                            size={14}
                            className="text-[#1a0b2e]"
                            strokeWidth={3}
                          />
                        ) : (
                          <span className="size-2 rounded-full bg-[#1a0b2e]" />
                        ))}
                    </span>
                    <span className="text-sm leading-relaxed">{o.lab}</span>
                  </button>
                );
              })}
            </div>
          )}

          {q.key !== "local" && atual.ids.includes(OUTRO) && (
            <div className="mt-4">
              <label htmlFor={`outro_${q.key}`} className="sr-only">
                Escreva com as suas palavras
              </label>
              <Input
                id={`outro_${q.key}`}
                autoFocus
                maxLength={200}
                value={atual.outro}
                onChange={(e) => escreverOutro(e.target.value)}
                placeholder="Escreva com as suas palavras"
              />
            </div>
          )}

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
              disabled={!respondida}
              className={
                respondida
                  ? "btn btn-primary"
                  : "btn pointer-events-none border border-border bg-white/5 text-cinza-ink"
              }
            >
              Continuar <ArrowRight size={16} />
            </button>
          </div>
        </section>
      )}

      {tela === "aberta" && (
        <section className="card-surface p-7 sm:p-10">
          <p className="inline-block rounded-full bg-roxo-600 px-4 py-2 font-mono text-[10px] uppercase tracking-widest text-foreground">
            Sua voz · opcional
          </p>
          <h2 className="font-display mt-6 text-[clamp(1.35rem,3.4vw,1.85rem)] leading-tight">
            Se pudesse perguntar uma coisa para a Juh sobre UGC, o que seria?
          </h2>
          <p className="text-body mt-3 text-sm italic">
            Pode escrever do seu jeito. As perguntas mais repetidas viram
            conteúdo.
          </p>
          <div className="mt-7">
            <label htmlFor="m_pergunta" className="sr-only">
              Sua pergunta para a Juh
            </label>
            <Textarea
              id="m_pergunta"
              maxLength={600}
              value={pergunta}
              onChange={(e) => setPergunta(e.target.value)}
              placeholder="Ex.: Preciso de CNPJ pra trabalhar com marca?"
            />
          </div>
          <div className="mt-8 flex items-center justify-between gap-4">
            <button type="button" onClick={voltar} className="btn btn-ghost">
              <ArrowLeft size={16} /> Voltar
            </button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => {
                setTela("captura");
                irParaTopo();
              }}
            >
              {pergunta.trim() ? "Continuar" : "Pular"} <ArrowRight size={16} />
            </button>
          </div>
        </section>
      )}

      {tela === "captura" && (
        <section className="card-surface p-7 sm:p-10">
          <p className="eyebrow">Seu diagnóstico está pronto ✨</p>
          <h2 className="headline-section mt-4">
            Pra onde a gente manda o seu Momento UGC?
          </h2>
          <p className="text-body mt-4 max-w-2xl">
            Você vê o resultado aqui na hora, e a gente também manda uma cópia
            completa pro seu e-mail, pra você consultar quando quiser.
          </p>

          <form onSubmit={enviarCaptura} noValidate className="mt-8 space-y-5">
            <div className="grid gap-5 sm:grid-cols-2">
              <Field id="m_nome" label="Nome" required>
                <Input
                  id="m_nome"
                  name="nome"
                  autoComplete="name"
                  placeholder="Como podemos te chamar"
                />
              </Field>
              <Field id="m_wpp" label="WhatsApp" required>
                <Input
                  id="m_wpp"
                  name="wpp"
                  inputMode="tel"
                  autoComplete="tel"
                  placeholder="(00) 00000-0000"
                />
              </Field>
              <Field id="m_email" label="E-mail" required>
                <Input
                  id="m_email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  placeholder="voce@email.com"
                />
              </Field>
              <Field id="m_instagram" label="Instagram">
                <Input
                  id="m_instagram"
                  name="instagram"
                  placeholder="@seuperfil"
                />
              </Field>
            </div>

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
                Autorizo a Ousadia e a Juh a guardar minhas respostas e me
                enviar o diagnóstico e conteúdos sobre UGC pelo e-mail e
                WhatsApp informados. Meus dados não são repassados a ninguém, e
                posso pedir para sair quando quiser.
              </span>
            </label>

            <FormError show={erro} />

            <button type="submit" className="btn btn-primary w-full sm:w-auto">
              Ver meu Momento UGC <ArrowRight size={16} />
            </button>
          </form>
        </section>
      )}

      {tela === "resultado" && (
        <ResultadoMomento
          resultado={calcular(respostas)}
          lead={lead}
          onRefazer={reiniciar}
        />
      )}
    </div>
  );
}
