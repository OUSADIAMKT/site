"use client";

import { useState } from "react";
import { Printer, Quote, RotateCcw, Share2 } from "lucide-react";
import { KeneStrip } from "@/components/ui/graphics/Kene";
import { KpiCards } from "./KpiCards";
import { BarrasDivergentes } from "./BarrasDivergentes";
import { RadarPolos } from "./RadarPolos";
import { Matriz2x2 } from "./Matriz2x2";
import { Rosca } from "./Rosca";
import { Recomendacoes } from "./Recomendacoes";
import { DesafioConfianca } from "./DesafioConfianca";
import {
  CAP1_MATRIZ,
  CAP1_TEXTO,
  CAP2_MATRIZ,
  CAP2_TEXTO,
  CAP3_MATRIZ,
  CAP3_TEXTO,
} from "@/lib/metodo-satoyiro/textos";
import { CAP1_CONFIANCA } from "@/lib/metodo-satoyiro/confianca";
import { recomendacoesPara } from "@/lib/metodo-satoyiro/recomendacoes";
import { compartilharOuBaixarImagem, gerarImagemStories } from "@/lib/metodo-satoyiro/compartilhar";
import type { LeadAluno, Resultado } from "@/lib/metodo-satoyiro/tipos";

const CORES_4 = ["var(--amarelo)", "var(--floresta)", "var(--rio)", "#a89fbc"];

function Secao({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`border-t border-border px-6 py-10 sm:px-10 sm:py-12 ${className}`}>
      {children}
    </div>
  );
}

export function ResultadoSatoyiro({
  resultado: r,
  lead,
  onRefazer,
}: {
  resultado: Resultado;
  lead: LeadAluno;
  onRefazer: () => void;
}) {
  const [compartilhando, setCompartilhando] = useState(false);
  const primeiroNome = lead.primeiroNome || lead.nomeCompleto.split(" ")[0] || "";
  const hoje = new Intl.DateTimeFormat("pt-BR", { dateStyle: "long" }).format(new Date());
  const recomendacoes = recomendacoesPara(r);

  const roscaCap1 = Object.entries(r.cap1.contagem).map(([cat, valor], idx) => ({
    rotulo: CAP1_TEXTO[cat as keyof typeof CAP1_TEXTO].titulo,
    valor,
    cor: CORES_4[idx],
  }));
  const roscaCap2 = Object.entries(r.cap2.contagem).map(([cat, valor], idx) => ({
    rotulo: CAP2_TEXTO[cat as keyof typeof CAP2_TEXTO].titulo,
    valor,
    cor: CORES_4[idx],
  }));
  const roscaCap3 = Object.entries(r.cap3.contagem).map(([cat, valor], idx) => ({
    rotulo: CAP3_TEXTO[cat as keyof typeof CAP3_TEXTO].titulo,
    valor,
    cor: CORES_4[idx],
  }));

  async function compartilhar() {
    setCompartilhando(true);
    try {
      const blob = await gerarImagemStories(r, primeiroNome);
      if (blob) {
        await compartilharOuBaixarImagem(blob, `ouse-ser-voce-${r.mbti.tipo.toLowerCase()}.png`);
      }
    } finally {
      setCompartilhando(false);
    }
  }

  return (
    <article className="card-surface overflow-hidden">
      {/* Cabeçalho */}
      <header className="relative overflow-hidden px-6 py-10 sm:px-10 sm:py-12">
        <div
          className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full bg-amarelo/20 blur-[100px]"
          aria-hidden
        />
        <div className="relative">
          <p className="eyebrow">Ouse Ser Você · Método Satoyiro</p>
          <h2 className="headline-section mt-3">
            {primeiroNome ? `${primeiroNome}, este é o seu mapa` : "Este é o seu mapa"}
          </h2>
          <p className="mt-2 font-mono text-xs uppercase tracking-[0.18em] text-cinza-ink">
            {hoje}
          </p>
        </div>
      </header>

      {/* KPIs */}
      <Secao>
        <KpiCards resultado={r} />
      </Secao>

      {/* Barras divergentes + radar */}
      <Secao>
        <h3 className="font-display text-2xl">Seu jeito de ser, em 4 dimensões</h3>
        <p className="text-body mt-2 text-sm">
          Pra qual lado você pende em energia, percepção, decisão e organização.
        </p>
        <div className="mt-8 grid gap-10 lg:grid-cols-[1fr_300px] lg:items-center">
          <BarrasDivergentes dimensoes={r.mbti.dimensoes} />
          <RadarPolos dimensoes={r.mbti.dimensoes} />
        </div>
      </Secao>

      {/* Matrizes 2x2 */}
      <Secao>
        <h3 className="font-display text-2xl">Onde você está em cada capítulo</h3>
        <p className="text-body mt-2 text-sm">
          Cada matriz cruza dois eixos: seu quadrante aparece destacado.
        </p>
        <div className="mt-8 grid gap-8 sm:grid-cols-3">
          <Matriz2x2
            titulo="Como me vejo"
            eixoX={CAP1_MATRIZ.eixoX}
            eixoY={CAP1_MATRIZ.eixoY}
            pos={CAP1_MATRIZ.pos}
            rotulos={Object.fromEntries(
              Object.entries(CAP1_TEXTO).map(([k, v]) => [k, v.titulo]),
            ) as Record<keyof typeof CAP1_TEXTO, string>}
            destacado={r.cap1.principal}
            cor="var(--amarelo)"
          />
          <Matriz2x2
            titulo="Meu caminho"
            eixoX={CAP2_MATRIZ.eixoX}
            eixoY={CAP2_MATRIZ.eixoY}
            pos={CAP2_MATRIZ.pos}
            rotulos={Object.fromEntries(
              Object.entries(CAP2_TEXTO).map(([k, v]) => [k, v.titulo]),
            ) as Record<keyof typeof CAP2_TEXTO, string>}
            destacado={r.cap2.principal}
            cor="var(--floresta)"
          />
          <Matriz2x2
            titulo="Sucesso e expectativas"
            eixoX={CAP3_MATRIZ.eixoX}
            eixoY={CAP3_MATRIZ.eixoY}
            pos={CAP3_MATRIZ.pos}
            rotulos={Object.fromEntries(
              Object.entries(CAP3_TEXTO).map(([k, v]) => [k, v.titulo]),
            ) as Record<keyof typeof CAP3_TEXTO, string>}
            destacado={r.cap3.principal}
            cor="var(--rio)"
          />
        </div>
      </Secao>

      {/* Roscas */}
      <Secao>
        <h3 className="font-display text-2xl">Distribuição das suas respostas</h3>
        <p className="text-body mt-2 text-sm">
          As 3 respostas de cada capítulo, por categoria.
        </p>
        <div className="mt-8 grid gap-8 sm:grid-cols-3">
          <Rosca titulo="Como me vejo" fatias={roscaCap1} />
          <Rosca titulo="Meu caminho" fatias={roscaCap2} />
          <Rosca titulo="Sucesso e expectativas" fatias={roscaCap3} />
        </div>
      </Secao>

      {/* O que isso diz sobre você */}
      <Secao>
        <h3 className="font-display text-2xl">O que isso diz sobre você</h3>
        <div className="mt-6 grid gap-5 md:grid-cols-3">
          {[
            { cor: "var(--amarelo)", t: CAP1_TEXTO[r.cap1.principal] },
            { cor: "var(--floresta)", t: CAP2_TEXTO[r.cap2.principal] },
            { cor: "var(--rio)", t: CAP3_TEXTO[r.cap3.principal] },
          ].map(({ cor, t }) => (
            <div
              key={t.titulo}
              className="rounded-xl border border-border border-t-4 bg-white/[0.03] p-6"
              style={{ borderTopColor: cor }}
            >
              <h4 className="font-display text-lg" style={{ color: cor }}>
                {t.titulo}
              </h4>
              <p className="text-body mt-3 text-sm">{t.oQueDiz}</p>
              <p className="mt-4 text-sm font-semibold text-foreground/90">
                {t.proximoPasso}
              </p>
            </div>
          ))}
        </div>
      </Secao>

      {/* Autoconfiança e autoestima */}
      <Secao>
        <h3 className="font-display text-2xl">Construindo sua autoconfiança</h3>
        <p className="text-body mt-2 text-sm">
          Autoestima não se resolve num dia. Mas um passo pequeno, repetido por 21 dias, muda como você se enxerga.
        </p>
        <div className="mt-6">
          <DesafioConfianca bloco={CAP1_CONFIANCA[r.cap1.principal]} />
        </div>
      </Secao>

      {/* Suas palavras */}
      {r.abertas.length > 0 && (
        <Secao>
          <h3 className="font-display text-2xl">Suas palavras</h3>
          <div className="mt-6 space-y-4">
            {r.abertas.map((a) => (
              <blockquote
                key={a.chave}
                className="flex gap-3 rounded-xl border border-border bg-white/[0.03] p-5"
              >
                <Quote size={18} className="mt-0.5 shrink-0 text-amarelo" aria-hidden />
                <div>
                  <p className="text-sm text-cinza-ink">{a.titulo}</p>
                  <p className="text-body mt-1 text-[1.05rem] text-foreground/90">
                    “{a.texto}”
                  </p>
                </div>
              </blockquote>
            ))}
          </div>
        </Secao>
      )}

      {/* Recomendações */}
      <Secao>
        <h3 className="font-display text-2xl">Para te inspirar</h3>
        <p className="text-body mt-2 text-sm">
          Livros, filmes e séries que conversam com o seu resultado de hoje.
        </p>
        <div className="mt-6">
          <Recomendacoes itens={recomendacoes} />
        </div>
      </Secao>

      {/* Mensagem final + ações */}
      <div className="border-t border-border bg-white/[0.03] px-6 py-12 text-center sm:px-10">
        <p className="font-display mx-auto max-w-2xl text-xl leading-snug text-amarelo">
          “Esse mapa é um retrato de hoje, não um rótulo. Você pode mudar,
          crescer e reescrever sua história quando quiser. Ouse ser você.”
        </p>

        <div data-no-print className="mt-8 flex flex-col justify-center gap-4 sm:flex-row">
          <button type="button" className="btn btn-primary" onClick={() => window.print()}>
            <Printer size={16} /> Baixar meu mapa (PDF)
          </button>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={compartilhar}
            disabled={compartilhando}
          >
            <Share2 size={16} /> {compartilhando ? "Gerando imagem…" : "Compartilhar resultado"}
          </button>
          <button type="button" className="btn btn-ghost" onClick={onRefazer}>
            <RotateCcw size={16} /> Refazer o quiz
          </button>
        </div>

        <p className="mt-10 font-mono text-[10px] uppercase tracking-widest text-cinza-ink">
          Uma iniciativa Ousadia Marketing · Marketing, Desenvolvimento Pessoal e IA
        </p>
      </div>

      <KeneStrip motif="iso" height={18} className="text-amarelo opacity-60" />
    </article>
  );
}
