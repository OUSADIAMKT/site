"use client";

import { useMemo, useRef, useState } from "react";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { TelaBoasVindas } from "./telas/TelaBoasVindas";
import { CardEscolha } from "./telas/CardEscolha";
import { CardForcada } from "./telas/CardForcada";
import { CardAberta } from "./telas/CardAberta";
import { TelaCarregando } from "./telas/TelaCarregando";
import { TelaCaptura } from "./telas/TelaCaptura";
import { ResultadoSatoyiro } from "./dashboard/ResultadoSatoyiro";
import { CAPITULOS, PERGUNTAS, TOTAL_PERGUNTAS } from "@/lib/metodo-satoyiro/perguntas";
import { compute } from "@/lib/metodo-satoyiro/calculo";
import { payloadPlanilha, salvarNaPlanilha } from "@/lib/metodo-satoyiro/persistencia";
import { LEAD_ALUNO_VAZIO, type LeadAluno, type Respostas } from "@/lib/metodo-satoyiro/tipos";

type Tela = "boasVindas" | "quiz" | "carregando" | "captura" | "resultado";

function embaralhar(n: number) {
  const a = Array.from({ length: n }, (_, i) => i);
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function ordemNatural() {
  return PERGUNTAS.map((p) => (p.tipo === "escolha" ? p.opcoes.map((_, i) => i) : []));
}

function sortearOrdens() {
  return PERGUNTAS.map((p) => (p.tipo === "escolha" ? embaralhar(p.opcoes.length) : []));
}

function sortearInversoes() {
  return PERGUNTAS.map((p) => p.tipo === "forcada" && Math.random() < 0.5);
}

export function OuseSerVoceQuiz() {
  const [tela, setTela] = useState<Tela>("boasVindas");
  const [i, setI] = useState(0);
  const [respostas, setRespostas] = useState<Respostas>({});
  const [primeiroNome, setPrimeiroNome] = useState("");
  const [turma, setTurma] = useState("");
  const [lead, setLead] = useState<LeadAluno>(LEAD_ALUNO_VAZIO);
  const [ordens, setOrdens] = useState<number[][]>(ordemNatural());
  const [inversoes, setInversoes] = useState<boolean[]>(() => PERGUNTAS.map(() => false));

  const topo = useRef<HTMLDivElement>(null);
  function irParaTopo() {
    const el = topo.current;
    if (!el) return;
    const suave = !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const y = el.getBoundingClientRect().top + window.scrollY - 88;
    window.scrollTo({ top: y, behavior: suave ? "smooth" : "auto" });
  }

  const pergunta = PERGUNTAS[i];
  const capitulo = CAPITULOS[pergunta.capitulo];
  const respostaAtual = respostas[pergunta.chave];
  const podeAvancar = pergunta.tipo === "aberta" || !!respostaAtual;
  const progresso = Math.round((i / TOTAL_PERGUNTAS) * 100);

  const resultado = useMemo(
    () => (tela === "resultado" ? compute(respostas) : null),
    [tela, respostas],
  );

  function iniciar(nome: string, t: string) {
    setPrimeiroNome(nome);
    setTurma(t);
    setOrdens(sortearOrdens());
    setInversoes(sortearInversoes());
    setTela("quiz");
    irParaTopo();
  }

  function responder(chave: string, r: Respostas[string]) {
    setRespostas((prev) => ({ ...prev, [chave]: r }));
  }

  function avancar() {
    if (!podeAvancar) return;
    if (i < TOTAL_PERGUNTAS - 1) {
      setI(i + 1);
      irParaTopo();
      return;
    }
    setTela("carregando");
    irParaTopo();
  }

  function voltar() {
    if (i === 0) return;
    setI(i - 1);
    irParaTopo();
  }

  function finalizarCaptura(dadosLead: LeadAluno) {
    const leadFinal: LeadAluno = { ...dadosLead, primeiroNome, turma };
    setLead(leadFinal);
    const r = compute(respostas);
    salvarNaPlanilha(payloadPlanilha(r, leadFinal));
    setTela("resultado");
    irParaTopo();
  }

  function refazer() {
    setTela("boasVindas");
    setI(0);
    setRespostas({});
    setLead(LEAD_ALUNO_VAZIO);
    irParaTopo();
  }

  return (
    <div ref={topo} className="scroll-mt-24">
      {(tela === "quiz" || tela === "captura") && (
        <div className="sticky top-16 z-30 -mx-1 mb-6 bg-ink-deep/85 px-1 py-3 backdrop-blur-md">
          <div
            className="h-2 overflow-hidden rounded-full border border-border bg-white/5"
            role="progressbar"
            aria-valuenow={tela === "captura" ? 100 : progresso}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="Progresso do quiz"
          >
            <div
              className="h-full rounded-full bg-amarelo transition-[width] duration-500 ease-out motion-reduce:transition-none"
              style={{ width: `${tela === "captura" ? 100 : progresso}%` }}
            />
          </div>
          <div className="mt-2 flex justify-between font-mono text-[10px] uppercase tracking-widest text-cinza-ink">
            <span>{tela === "captura" ? "Concluído" : capitulo.nome.split(":")[0]}</span>
            <span>
              {tela === "captura" ? "Mapa pronto" : `Pergunta ${i + 1} de ${TOTAL_PERGUNTAS}`}
            </span>
          </div>
        </div>
      )}

      {tela === "boasVindas" && <TelaBoasVindas onComecar={iniciar} />}

      {tela === "quiz" && (
        <section className="card-surface animate-in fade-in duration-300 p-7 sm:p-10" key={pergunta.chave}>
          <p className="inline-block rounded-full bg-roxo-600 px-4 py-2 font-mono text-[10px] uppercase tracking-widest text-foreground">
            {capitulo.nome}
          </p>
          <p className="text-body mt-5 border-l-4 border-amarelo/50 pl-4 italic">
            {capitulo.intro}
          </p>

          {pergunta.tipo !== "forcada" && (
            <h2 className="font-display mt-7 text-[clamp(1.35rem,3.4vw,1.85rem)] leading-tight">
              <span className="text-amarelo">{String(i + 1).padStart(2, "0")}.</span>{" "}
              {pergunta.titulo}
            </h2>
          )}
          {pergunta.tipo === "forcada" && (
            <h2 className="font-display mt-7 text-[clamp(1.35rem,3.4vw,1.85rem)] leading-tight">
              <span className="text-amarelo">{String(i + 1).padStart(2, "0")}.</span>{" "}
              Qual frase é mais você?
            </h2>
          )}

          {pergunta.tipo === "escolha" && (
            <CardEscolha
              pergunta={pergunta}
              ordem={ordens[i]}
              selecionadaIdx={respostaAtual?.tipo === "escolha" ? respostaAtual.idx : undefined}
              onResponder={(idx) =>
                responder(pergunta.chave, {
                  tipo: "escolha",
                  idx,
                  categoria: pergunta.opcoes[idx].categoria,
                })
              }
            />
          )}

          {pergunta.tipo === "forcada" && (
            <CardForcada
              pergunta={pergunta}
              inverter={inversoes[i]}
              selecionada={respostaAtual?.tipo === "forcada" ? respostaAtual.letra : undefined}
              onResponder={(letra) => responder(pergunta.chave, { tipo: "forcada", letra })}
            />
          )}

          {pergunta.tipo === "aberta" && (
            <CardAberta
              pergunta={pergunta}
              valor={respostaAtual?.tipo === "aberta" ? respostaAtual.texto : ""}
              onMudar={(texto) => responder(pergunta.chave, { tipo: "aberta", texto })}
            />
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
              disabled={!podeAvancar}
              className={
                podeAvancar
                  ? "btn btn-primary"
                  : "btn pointer-events-none border border-border bg-white/5 text-cinza-ink"
              }
            >
              {i === TOTAL_PERGUNTAS - 1 ? "Finalizar" : "Continuar"} <ArrowRight size={16} />
            </button>
          </div>
        </section>
      )}

      {tela === "carregando" && <TelaCarregando onFim={() => setTela("captura")} />}

      {tela === "captura" && (
        <TelaCaptura primeiroNome={primeiroNome} onEnviar={finalizarCaptura} />
      )}

      {tela === "resultado" && resultado && (
        <ResultadoSatoyiro resultado={resultado} lead={lead} onRefazer={refazer} />
      )}
    </div>
  );
}
