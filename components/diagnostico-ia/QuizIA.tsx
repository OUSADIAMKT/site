"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, RotateCcw } from "lucide-react";
import {
  Armadilha,
  caiuNaArmadilha,
  Field,
  FormError,
  Input,
  LinkPolitica,
  Select,
} from "@/components/forms/fields";
import {
  DIMENSOES,
  FAIXAS_ETARIAS,
  MENOS_DE_18,
  PERGUNTAS_IA,
  calcularIA,
  payloadPlanilhaIA,
  salvarNaPlanilhaIA,
  type LeadIA,
  type ResultadoIA,
} from "@/lib/diagnostico-ia";

type Tela = "intro" | "quiz" | "captura" | "resultado";

const COMO_FUNCIONA = [
  {
    k: "01",
    t: "10 perguntas rápidas",
    d: "Sobre como você usa a IA hoje, como pede e o que confere. Leva uns 3 minutos.",
  },
  {
    k: "02",
    t: "Seu nível com a IA",
    d: "Você descobre em qual dos 4 níveis está e como vai em cada área.",
  },
  {
    k: "03",
    t: "Seus próximos passos",
    d: "Três coisas pra fazer já esta semana e por onde começar no curso.",
  },
];

export function QuizIA({
  cursoHref,
  waHref,
}: {
  cursoHref: string;
  waHref: string;
}) {
  const [tela, setTela] = useState<Tela>("intro");
  const [i, setI] = useState(0);
  const [respostas, setRespostas] = useState<number[]>([]);
  const [resultado, setResultado] = useState<ResultadoIA | null>(null);
  const [nome, setNome] = useState("");
  const [erro, setErro] = useState(false);
  const [consentErro, setConsentErro] = useState(false);

  const topo = useRef<HTMLDivElement>(null);
  function irParaTopo() {
    const el = topo.current;
    if (!el) return;
    const suave = !window.matchMedia("(prefers-reduced-motion: reduce)")
      .matches;
    const y = el.getBoundingClientRect().top + window.scrollY - 88;
    window.scrollTo({ top: y, behavior: suave ? "smooth" : "auto" });
  }

  const q = PERGUNTAS_IA[i];
  const escolhida = respostas[i];
  const progresso = Math.round((i / PERGUNTAS_IA.length) * 100);

  function escolher(k: number) {
    setRespostas((prev) => {
      const nova = [...prev];
      nova[i] = k;
      return nova;
    });
  }

  function avancar() {
    if (escolhida === undefined) return;
    if (i < PERGUNTAS_IA.length - 1) {
      setI(i + 1);
    } else {
      setTela("captura");
    }
    irParaTopo();
  }

  function enviarCaptura(ev: React.FormEvent<HTMLFormElement>) {
    ev.preventDefault();
    const form = ev.currentTarget;
    const dados = new FormData(form);
    const lead: LeadIA = {
      nome: String(dados.get("nome") ?? "").trim(),
      email: String(dados.get("email") ?? "").trim(),
      whatsapp: String(dados.get("whatsapp") ?? "").trim(),
      profissao: String(dados.get("profissao") ?? "").trim(),
      faixa: String(dados.get("faixa") ?? ""),
    };
    const menor = lead.faixa === MENOS_DE_18;

    const invalidos: string[] = [];
    if (lead.nome.length < 2) invalidos.push("nome");
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(lead.email)) invalidos.push("email");
    if (lead.whatsapp.replace(/\D/g, "").length < 10) invalidos.push("whatsapp");
    if (lead.profissao.length < 2) invalidos.push("profissao");
    if (!lead.faixa) invalidos.push("faixa");
    if (!menor && !dados.get("consent")) invalidos.push("consent");

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
    const res = calcularIA(respostas);
    // Menor de 18 vê o resultado, mas os dados não são gravados (LGPD, art. 14).
    if (!menor && !caiuNaArmadilha(form)) {
      salvarNaPlanilhaIA(payloadPlanilhaIA(respostas, res, lead));
    }
    setNome(lead.nome.split(/\s+/)[0]);
    setResultado(res);
    setTela("resultado");
    irParaTopo();
  }

  function recomecar() {
    setRespostas([]);
    setI(0);
    setResultado(null);
    setNome("");
    setTela("intro");
    irParaTopo();
  }

  return (
    <div ref={topo}>
      {tela === "quiz" && (
        <div className="mb-6">
          <div
            className="h-1.5 overflow-hidden rounded-full bg-white/10"
            role="progressbar"
            aria-valuenow={progresso}
            aria-valuemin={0}
            aria-valuemax={100}
          >
            <div
              className="h-full rounded-full bg-amarelo transition-all"
              style={{ width: `${progresso}%` }}
            />
          </div>
          <div className="mt-2 flex justify-between font-mono text-[10px] uppercase tracking-widest text-cinza-ink">
            <span>{q.tema}</span>
            <span>
              Pergunta {i + 1} de {PERGUNTAS_IA.length}
            </span>
          </div>
        </div>
      )}

      {tela === "intro" && (
        <section className="card-surface p-7 sm:p-10">
          <p className="eyebrow">Diagnóstico de IA</p>
          <p className="text-body mt-4 max-w-2xl">
            Responda 10 perguntas rápidas e descubra na hora em que ponto você
            está com a Inteligência Artificial: o quanto já usa, como pede e se
            confere o que ela responde. No fim, você recebe os seus próximos
            passos.
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
            {[
              "Gratuito",
              "~3 minutos",
              "Resultado na hora",
              "Sem certo ou errado",
            ].map((s) => (
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
                setTela("quiz");
                irParaTopo();
              }}
            >
              Quero descobrir meu nível <ArrowRight size={16} />
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
          {q.dica && <p className="text-body mt-3 text-sm italic">{q.dica}</p>}

          <div className="mt-7 space-y-3" role="radiogroup" aria-label={q.titulo}>
            {q.opcoes.map((o, k) => {
              const sel = escolhida === k;
              return (
                <button
                  key={o.lab}
                  type="button"
                  role="radio"
                  aria-checked={sel}
                  onClick={() => escolher(k)}
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
                    {sel && <span className="size-2 rounded-full bg-[#1a0b2e]" />}
                  </span>
                  <span className="text-sm leading-relaxed">{o.lab}</span>
                </button>
              );
            })}
          </div>

          <div className="mt-9 flex flex-col-reverse gap-3 sm:flex-row sm:justify-between">
            <button
              type="button"
              className="btn btn-ghost"
              disabled={i === 0}
              onClick={() => {
                setI(i - 1);
                irParaTopo();
              }}
            >
              <ArrowLeft size={16} /> Voltar
            </button>
            <button
              type="button"
              className="btn btn-primary"
              disabled={escolhida === undefined}
              onClick={avancar}
            >
              {i < PERGUNTAS_IA.length - 1 ? "Próxima" : "Ver meu resultado"}{" "}
              <ArrowRight size={16} />
            </button>
          </div>
        </section>
      )}

      {tela === "captura" && (
        <section className="card-surface p-7 sm:p-10">
          <p className="eyebrow">Seu resultado está pronto</p>
          <h2 className="headline-section mt-4">Antes, conta quem é você</h2>
          <p className="text-body mt-4 max-w-2xl">
            Com esses dados a gente entende quem está chegando na IA e pode te
            mandar conteúdos e novidades do curso. O resultado aparece aqui na
            hora.
          </p>

          <form
            onSubmit={enviarCaptura}
            noValidate
            className="relative mt-8 space-y-5"
          >
            <Armadilha />
            <div className="grid gap-5 sm:grid-cols-2">
              <Field id="ia_nome" label="Nome" required>
                <Input
                  id="ia_nome"
                  name="nome"
                  autoComplete="name"
                  maxLength={120}
                  placeholder="Como podemos te chamar"
                />
              </Field>
              <Field id="ia_email" label="E-mail" required>
                <Input
                  id="ia_email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  maxLength={120}
                  placeholder="voce@email.com"
                />
              </Field>
              <Field id="ia_wpp" label="WhatsApp" required>
                <Input
                  id="ia_wpp"
                  name="whatsapp"
                  inputMode="tel"
                  autoComplete="tel"
                  maxLength={30}
                  placeholder="(00) 00000-0000"
                />
              </Field>
              <Field id="ia_prof" label="Profissão" required>
                <Input
                  id="ia_prof"
                  name="profissao"
                  autoComplete="organization-title"
                  maxLength={120}
                  placeholder="Ex.: professora, dono de loja, estudante"
                />
              </Field>
              <Field id="ia_faixa" label="Faixa etária" required>
                <Select id="ia_faixa" name="faixa" defaultValue="">
                  <option value="" disabled>
                    Escolha
                  </option>
                  {FAIXAS_ETARIAS.map((f) => (
                    <option key={f} value={f}>
                      {f === MENOS_DE_18 ? f : `${f} anos`}
                    </option>
                  ))}
                </Select>
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
                Autorizo a Ousadia a guardar meus dados e minhas respostas e a
                me enviar conteúdos sobre IA e sobre o curso pelo e-mail e
                WhatsApp informados, conforme a <LinkPolitica />. Meus dados
                não são vendidos nem repassados a outras empresas, e posso
                pedir para sair quando quiser. Quem tem menos de 18 anos vê o
                resultado, mas os dados não são guardados.
              </span>
            </label>

            <FormError show={erro} />

            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-between">
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => {
                  setTela("quiz");
                  irParaTopo();
                }}
              >
                <ArrowLeft size={16} /> Voltar
              </button>
              <button type="submit" className="btn btn-primary">
                Ver meu resultado <ArrowRight size={16} />
              </button>
            </div>
          </form>
        </section>
      )}

      {tela === "resultado" && resultado && (
        <section className="space-y-6">
          <div className="card-surface p-7 sm:p-10">
            <p className="eyebrow">
              {nome ? `${nome}, seu nível com a IA` : "Seu nível com a IA"}
            </p>
            <h2 className="headline-section mt-3">
              <span className="text-amarelo">{resultado.nivel.nome}</span>
            </h2>
            <p className="font-display mt-4 text-lg">{resultado.nivel.frase}</p>
            <p className="text-body mt-4 max-w-2xl">
              {resultado.nivel.descricao}
            </p>
            <p className="mt-6 font-mono text-xs uppercase tracking-widest text-cinza-ink">
              {resultado.total} de {resultado.max} pontos
            </p>
          </div>

          <div className="card-surface p-7 sm:p-10">
            <p className="eyebrow mb-6">Como você vai em cada área</p>
            <ul className="space-y-5">
              {resultado.dims.map((d) => (
                <li key={d.dim}>
                  <div className="flex items-baseline justify-between gap-4">
                    <span className="font-display">{DIMENSOES[d.dim].nome}</span>
                    <span className="font-mono text-sm text-amarelo">
                      {d.pct}%
                    </span>
                  </div>
                  <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/10">
                    <div
                      className="h-full rounded-full bg-amarelo"
                      style={{ width: `${Math.max(d.pct, 3)}%` }}
                    />
                  </div>
                  <p className="text-body mt-1.5 text-xs">
                    {DIMENSOES[d.dim].d}
                  </p>
                </li>
              ))}
            </ul>
          </div>

          {resultado.alertaRisco && (
            <div className="rounded-2xl border-2 border-amarelo bg-amarelo/10 p-7 sm:p-8">
              <p className="font-mono text-xs uppercase tracking-widest text-amarelo">
                Atenção antes de tudo
              </p>
              <p className="font-display mt-3 text-lg">
                A IA pode inventar com toda a confiança, e o que você cola nela
                sai do seu controle.
              </p>
              <p className="text-body mt-3 text-sm">
                Use o semáforo: pra criar e rascunhar, sinal verde. Fatos,
                números, leis e saúde, sinal amarelo: confira na fonte original.
                Decisões sobre pessoas e dados pessoais (CPF, telefone, lista de
                clientes), sinal vermelho: não delegue e não cole.
              </p>
            </div>
          )}

          <div className="card-surface p-7 sm:p-10">
            <p className="eyebrow mb-6">Seus próximos passos</p>
            <ol className="space-y-4">
              {resultado.nivel.passos.map((p, k) => (
                <li key={p} className="flex gap-4">
                  <span className="font-display text-xl text-amarelo">
                    {String(k + 1).padStart(2, "0")}
                  </span>
                  <span className="text-body text-[0.95rem]">{p}</span>
                </li>
              ))}
            </ol>
          </div>

          <div className="card-surface p-7 sm:p-10">
            <p className="eyebrow">No curso</p>
            <h3 className="font-display mt-3 text-xl">
              Inteligência Artificial do Zero à Prática
            </h3>
            <p className="text-body mt-3 max-w-2xl">
              30 horas, 8 módulos, curso gravado e sem programação, com Jackson
              Queiroz. {resultado.nivel.modulos}
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link href={cursoHref} className="btn btn-primary">
                Conhecer o curso <ArrowRight size={16} />
              </Link>
              <a href={waHref} className="btn btn-secondary">
                Tirar dúvidas no WhatsApp
              </a>
            </div>
          </div>

          <button type="button" className="btn btn-ghost" onClick={recomecar}>
            <RotateCcw size={16} /> Refazer o diagnóstico
          </button>
        </section>
      )}
    </div>
  );
}
