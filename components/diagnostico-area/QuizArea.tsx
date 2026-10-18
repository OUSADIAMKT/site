"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Check, Copy, RotateCcw } from "lucide-react";
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
  BarrasArea,
  LegendaNiveis,
  RadarArea,
  Velocimetro,
} from "@/components/diagnostico-area/GraficosArea";
import {
  FAIXAS_ETARIAS,
  MENOS_DE_18,
  buscarMedias,
  calcularArea,
  payloadPlanilhaArea,
  salvarNaPlanilhaArea,
  sortearOrdens,
  type DiagnosticoArea,
  type LeadArea,
  type MediasArea,
  type ResultadoArea,
} from "@/lib/diagnostico-area";
import { waDiagnostico } from "@/lib/site";

type Tela = "intro" | "quiz" | "captura" | "resultado";

/**
 * Tela de um diagnóstico por área. O conteúdo vem de `cfg` (ver
 * `lib/diagnostico-area.ts`). `waHref` é o WhatsApp de dúvidas do curso.
 */
export function QuizArea({
  cfg,
  waHref,
}: {
  cfg: DiagnosticoArea;
  waHref: string;
}) {
  const [tela, setTela] = useState<Tela>("intro");
  const [i, setI] = useState(0);
  // Ordem das opções de cada pergunta, sorteada ao começar o teste.
  const [ordens, setOrdens] = useState<number[][]>([]);
  // Índice da opção escolhida na ordem ORIGINAL de `opcoes`.
  const [respostas, setRespostas] = useState<number[]>([]);
  const [resultado, setResultado] = useState<ResultadoArea | null>(null);
  const [medias, setMedias] = useState<MediasArea | null>(null);
  const [nome, setNome] = useState("");
  const [erro, setErro] = useState(false);
  const [consentErro, setConsentErro] = useState(false);
  const [copiado, setCopiado] = useState(false);

  const topo = useRef<HTMLDivElement>(null);
  function irParaTopo() {
    const el = topo.current;
    if (!el) return;
    const suave = !window.matchMedia("(prefers-reduced-motion: reduce)")
      .matches;
    const y = el.getBoundingClientRect().top + window.scrollY - 88;
    window.scrollTo({ top: y, behavior: suave ? "smooth" : "auto" });
  }

  // A média de quem já fez chega depois do resultado; se não vier, o painel
  // mostra só a pessoa.
  useEffect(() => {
    if (tela !== "resultado") return;
    let vivo = true;
    buscarMedias(cfg).then((m) => {
      if (vivo) setMedias(m);
    });
    return () => {
      vivo = false;
    };
  }, [tela, cfg]);

  const q = cfg.perguntas[i];
  const escolhida = respostas[i];
  const progresso = Math.round((i / cfg.perguntas.length) * 100);
  const ordem = ordens[i] ?? q.opcoes.map((_, k) => k);

  function comecar() {
    setOrdens(sortearOrdens(cfg));
    setTela("quiz");
    irParaTopo();
  }

  function escolher(k: number) {
    setRespostas((prev) => {
      const nova = [...prev];
      nova[i] = k;
      return nova;
    });
  }

  function avancar() {
    if (escolhida === undefined) return;
    if (i < cfg.perguntas.length - 1) {
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
    const lead: LeadArea = {
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
    const res = calcularArea(cfg, respostas);
    // Menor de 18 vê o resultado, mas os dados não são gravados (LGPD, art. 14).
    if (!menor && !caiuNaArmadilha(form)) {
      salvarNaPlanilhaArea(cfg.endpoint, payloadPlanilhaArea(cfg, respostas, res, lead));
    }
    setNome(lead.nome.split(/\s+/)[0]);
    setResultado(res);
    setTela("resultado");
    irParaTopo();
  }

  async function copiar(texto: string) {
    try {
      await navigator.clipboard.writeText(texto);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2500);
    } catch {
      // Sem permissão de área de transferência: o texto continua na tela.
    }
  }

  function recomecar() {
    setRespostas([]);
    setOrdens([]);
    setI(0);
    setResultado(null);
    setMedias(null);
    setNome("");
    setTela("intro");
    irParaTopo();
  }

  const id = (campo: string) => `${cfg.teste}_${campo}`;

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
              Pergunta {i + 1} de {cfg.perguntas.length}
            </span>
          </div>
        </div>
      )}

      {tela === "intro" && (
        <section className="card-surface p-7 sm:p-10">
          <p className="eyebrow">{cfg.nome}</p>
          <p className="text-body mt-4 max-w-2xl">{cfg.intro}</p>

          {cfg.dado && (
            <figure className="mt-7 rounded-xl border-l-4 border-amarelo bg-white/[0.04] p-5">
              <blockquote className="font-display text-lg leading-snug">
                {cfg.dado.texto}
              </blockquote>
              <figcaption className="mt-2 font-mono text-[11px] text-cinza-ink">
                Fonte:{" "}
                <a
                  href={cfg.dado.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline underline-offset-2 hover:text-amarelo"
                >
                  {cfg.dado.fonte}
                </a>
              </figcaption>
            </figure>
          )}

          <ul className="mt-8 grid gap-4 sm:grid-cols-3">
            {cfg.comoFunciona.map((e) => (
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
            {["Gratuito", "~4 minutos", "Resultado na hora", "Sem pegadinha"].map(
              (s) => (
                <li
                  key={s}
                  className="rounded-full border border-border bg-white/5 px-4 py-2 font-mono text-xs text-cinza-ink"
                >
                  {s}
                </li>
              ),
            )}
          </ul>

          <div className="mt-9">
            <button type="button" className="btn btn-primary" onClick={comecar}>
              {cfg.textoBotaoInicio} <ArrowRight size={16} />
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

          {q.contexto && (
            <div className="mt-6 rounded-xl border border-rio/40 bg-rio/10 p-5">
              <p className="font-mono text-[10px] uppercase tracking-widest text-rio">
                {q.contexto.rotulo}
              </p>
              <p className="mt-2 leading-relaxed">{q.contexto.texto}</p>
            </div>
          )}

          <div className="mt-7 space-y-3" role="radiogroup" aria-label={q.titulo}>
            {ordem.map((k) => {
              const o = q.opcoes[k];
              const sel = escolhida === k;
              return (
                <button
                  key={`${q.key}-${k}`}
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
              {i < cfg.perguntas.length - 1 ? "Próxima" : "Ver meu resultado"}{" "}
              <ArrowRight size={16} />
            </button>
          </div>
        </section>
      )}

      {tela === "captura" && (
        <section className="card-surface p-7 sm:p-10">
          <p className="eyebrow">Seu resultado está pronto</p>
          <h2 className="headline-section mt-4">Antes, conta quem é você</h2>
          <p className="text-body mt-4 max-w-2xl">{cfg.textoCaptura}</p>

          <form
            onSubmit={enviarCaptura}
            noValidate
            className="relative mt-8 space-y-5"
          >
            <Armadilha />
            <div className="grid gap-5 sm:grid-cols-2">
              <Field id={id("nome")} label="Nome" required>
                <Input
                  id={id("nome")}
                  name="nome"
                  autoComplete="name"
                  maxLength={120}
                  placeholder="Como podemos te chamar"
                />
              </Field>
              <Field id={id("email")} label="E-mail" required>
                <Input
                  id={id("email")}
                  name="email"
                  type="email"
                  autoComplete="email"
                  maxLength={120}
                  placeholder="voce@email.com"
                />
              </Field>
              <Field id={id("wpp")} label="WhatsApp" required>
                <Input
                  id={id("wpp")}
                  name="whatsapp"
                  inputMode="tel"
                  autoComplete="tel"
                  maxLength={30}
                  placeholder="(00) 00000-0000"
                />
              </Field>
              <Field id={id("prof")} label="Profissão" required>
                <Input
                  id={id("prof")}
                  name="profissao"
                  autoComplete="organization-title"
                  maxLength={120}
                  placeholder="Ex.: professora, dono de loja, estudante"
                />
              </Field>
              <Field id={id("faixa")} label="Faixa etária" required>
                <Select id={id("faixa")} name="faixa" defaultValue="">
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
                Autorizo a Ousadia
                {cfg.compartilhaCom ? ` e ${cfg.compartilhaCom},` : ""} a
                guardar meus dados e minhas respostas e a me enviar{" "}
                {cfg.textoConsentimento} pelo e-mail e WhatsApp informados,
                conforme a <LinkPolitica />. Meus dados não são vendidos
                {cfg.compartilhaCom
                  ? " nem repassados a mais ninguém"
                  : " nem repassados a outras empresas"}
                , e posso pedir para sair quando quiser. Quem tem menos de 18
                anos vê o resultado, mas os dados não são guardados.
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
        <Resultado
          cfg={cfg}
          res={resultado}
          medias={medias}
          nome={nome}
          waHref={waHref}
          copiado={copiado}
          onCopiar={copiar}
          onRecomecar={recomecar}
        />
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * Resultado: painel enxuto + plano
 * ------------------------------------------------------------------ */

function Resultado({
  cfg,
  res,
  medias,
  nome,
  waHref,
  copiado,
  onCopiar,
  onRecomecar,
}: {
  cfg: DiagnosticoArea;
  res: ResultadoArea;
  medias: MediasArea | null;
  nome: string;
  waHref: string;
  copiado: boolean;
  onCopiar: (t: string) => void;
  onRecomecar: () => void;
}) {
  const nivel = res.nivel;
  const proximo = cfg.niveis[cfg.niveis.indexOf(nivel) + 1];
  const destino = nivel.destino;
  const comando = res.objetivo?.comando;

  const kpis = [
    { rotulo: "Nível", valor: nivel.nome, cor: nivel.cor },
    { rotulo: "Pontuação", valor: `${res.total} de ${res.max}` },
    { rotulo: "Mais forte", valor: `${res.forte.curto} · ${res.forte.pct}%` },
    { rotulo: "Pra trabalhar", valor: `${res.fraca.curto} · ${res.fraca.pct}%` },
  ];

  return (
    <section className="space-y-6">
      {/* Cabeçalho */}
      <div className="card-surface p-7 sm:p-10">
        <p className="eyebrow">
          {nome
            ? `${nome}, ${cfg.rotuloResultado}`
            : cfg.rotuloResultado.charAt(0).toUpperCase() +
              cfg.rotuloResultado.slice(1)}
        </p>
        <h2 className="headline-section mt-3" style={{ color: nivel.cor }}>
          {nivel.nome}
        </h2>
        <p className="font-display mt-4 text-lg">“{nivel.frase}”</p>
        <p className="text-body mt-4 max-w-2xl">{nivel.descricao}</p>
        <p className="mt-4 max-w-2xl border-l-2 border-amarelo pl-4">{nivel.mensagem}</p>
      </div>

      {/* Painel */}
      <div className="card-surface p-7 sm:p-10">
        <p className="eyebrow">Seu painel</p>

        <dl className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
          {kpis.map((k) => (
            <div
              key={k.rotulo}
              className="rounded-xl border border-border bg-white/[0.03] p-4"
            >
              <dt className="font-mono text-[10px] uppercase tracking-widest text-cinza-ink">
                {k.rotulo}
              </dt>
              <dd
                className="font-display mt-1.5 text-lg leading-tight"
                style={k.cor ? { color: k.cor } : undefined}
              >
                {k.valor}
              </dd>
            </div>
          ))}
        </dl>

        <div className="mt-8 grid items-center gap-8 md:grid-cols-2">
          <div>
            <p className="mb-2 text-center font-mono text-[10px] uppercase tracking-widest text-cinza-ink">
              Pontuação
            </p>
            <Velocimetro cfg={cfg} res={res} />
            <LegendaNiveis cfg={cfg} res={res} />
          </div>
          <div>
            <p className="mb-2 text-center font-mono text-[10px] uppercase tracking-widest text-cinza-ink">
              Competências
            </p>
            <RadarArea res={res} medias={medias?.dims} />
            {medias && (
              <p className="mt-2 flex items-center justify-center gap-4 font-mono text-[10px] text-cinza-ink">
                <span className="flex items-center gap-1.5">
                  <span className="h-0.5 w-4 bg-amarelo" aria-hidden /> você
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="h-0 w-4 border-t border-dashed border-white/60" aria-hidden />{" "}
                  média de {medias.n} pessoas
                </span>
              </p>
            )}
          </div>
        </div>

        <div className="mt-8 border-t border-border pt-8">
          <BarrasArea res={res} medias={medias?.dims} />
        </div>

        {res.barrado && proximo && (
          <p className="text-body mt-6 text-sm">
            Sua pontuação chegou à faixa de <strong>{proximo.nome}</strong>, mas
            esse nível pede nota mínima em algumas perguntas-chave. Por isso o
            seu resultado ficou em {nivel.nome}.
          </p>
        )}
      </div>

      {res.alerta && cfg.alerta && (
        <div className="rounded-2xl border-2 border-amarelo bg-amarelo/10 p-7 sm:p-8">
          <p className="font-mono text-xs uppercase tracking-widest text-amarelo">
            {cfg.alerta.titulo}
          </p>
          <p className="font-display mt-3 text-lg">{cfg.alerta.destaque}</p>
          <p className="text-body mt-3 text-sm">{cfg.alerta.texto}</p>
        </div>
      )}

      {/* O que te trava */}
      <div className="card-surface p-7 sm:p-10">
        <p className="eyebrow">O que está te travando</p>
        <div className="mt-6 grid gap-6 md:grid-cols-2">
          {res.dificuldade && (
            <div>
              <p className="font-mono text-[10px] uppercase tracking-widest text-cinza-ink">
                Você disse
              </p>
              <p className="font-display mt-1.5 text-lg">“{res.dificuldade.lab}”</p>
              <p className="text-body mt-2 text-sm">{res.dificuldade.leitura}</p>
            </div>
          )}
          <div>
            <p className="font-mono text-[10px] uppercase tracking-widest text-cinza-ink">
              Sua prioridade
            </p>
            <p className="font-display mt-1.5 text-lg">{res.fraca.nome}</p>
            <p className="text-body mt-2 text-sm">{res.fraca.prioridade}</p>
          </div>
        </div>
      </div>

      {/* Missão */}
      <div className="card-surface p-7 sm:p-10">
        <p className="eyebrow">Sua missão de hoje</p>
        <p className="font-display mt-4 text-lg leading-snug">{nivel.missao}</p>

        {res.objetivo?.oportunidades && (
          <>
            <p className="mt-7 font-mono text-[10px] uppercase tracking-widest text-cinza-ink">
              Pro seu objetivo: {res.objetivo.lab.toLowerCase()}
            </p>
            <ul className="mt-3 space-y-2">
              {res.objetivo.oportunidades.map((o) => (
                <li key={o} className="text-body flex gap-3 text-[0.95rem]">
                  <Check size={16} className="mt-1 shrink-0 text-amarelo" aria-hidden />
                  {o}
                </li>
              ))}
            </ul>
          </>
        )}

        {comando && (
          <div className="mt-7 rounded-xl border border-border bg-black/25 p-5">
            <div className="flex items-center justify-between gap-4">
              <p className="font-mono text-[10px] uppercase tracking-widest text-rio">
                Comando pronto pra colar
              </p>
              <button
                type="button"
                className="btn btn-ghost !px-3 !py-1.5 text-xs"
                onClick={() => onCopiar(comando)}
              >
                {copiado ? <Check size={14} /> : <Copy size={14} />}
                {copiado ? "Copiado" : "Copiar"}
              </button>
            </div>
            <p className="mt-3 font-mono text-[0.85rem] leading-relaxed">{comando}</p>
            <p className="text-body mt-3 text-xs">
              Troque o que está entre colchetes pelas suas informações.
            </p>
          </div>
        )}
      </div>

      {/* Plano */}
      <div className="card-surface p-7 sm:p-10">
        <p className="eyebrow">Seu plano de 30 dias</p>
        <ol className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {nivel.plano.map((p) => (
            <li
              key={p.semana}
              className="rounded-xl border border-border border-t-4 bg-white/[0.03] p-4"
              style={{ borderTopColor: nivel.cor }}
            >
              <p className="font-mono text-[10px] uppercase tracking-widest text-cinza-ink">
                {p.semana}
              </p>
              <p className="mt-2 text-[0.95rem] leading-snug">{p.foco}</p>
              <p className="mt-2 font-mono text-[11px] text-rio">{p.onde}</p>
            </li>
          ))}
        </ol>
      </div>

      {/* Destino */}
      <div className="rounded-2xl border border-amarelo/50 bg-amarelo/[0.06] p-7 sm:p-10">
        <p className="eyebrow">Seu próximo passo</p>
        <h3 className="font-display mt-3 text-xl">{destino.titulo}</h3>
        <p className="text-body mt-3 max-w-2xl">{destino.texto}</p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          {destino.tipo === "curso" ? (
            <>
              <Link href={destino.href} className="btn btn-primary">
                {destino.botao} <ArrowRight size={16} />
              </Link>
              <a href={waHref} className="btn btn-secondary">
                Tirar dúvidas no WhatsApp
              </a>
            </>
          ) : (
            <>
              <a
                href={waDiagnostico(destino.mensagem)}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-primary"
              >
                {destino.botao} <ArrowRight size={16} />
              </a>
              {destino.extra && (
                <Link href={destino.extra.href} className="btn btn-secondary">
                  {destino.extra.botao}
                </Link>
              )}
            </>
          )}
        </div>
      </div>

      <p className="text-body text-xs">
        Este diagnóstico é um índice próprio da Ousadia, feito pra orientar o
        seu próximo passo. Não é um teste científico nem uma certificação.
      </p>

      <button type="button" className="btn btn-ghost" onClick={onRecomecar}>
        <RotateCcw size={16} /> Refazer o diagnóstico
      </button>
    </section>
  );
}
