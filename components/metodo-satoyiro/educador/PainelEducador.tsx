"use client";

import { useMemo, useState } from "react";
import { AlertTriangle, Download, Lock, RefreshCw } from "lucide-react";
import { Field, Input, Select } from "@/components/forms/fields";
import { BarraLista } from "./BarraLista";
import { Dispersao } from "./Dispersao";
import {
  contarOcorrencias,
  dispersaoClarezaAcao,
  normalizarLinhas,
  paraCsv,
  type LinhaAluno,
} from "@/lib/metodo-satoyiro/educador";
import { SHEET_ENDPOINT_SATOYIRO } from "@/lib/site";

type RespostaPainel =
  | { ok: true; linhas: Record<string, string>[] }
  | { ok: false; erro: string };

/**
 * Pede as respostas ao Apps Script, que só devolve com a chave certa
 * (propriedade CHAVE_PAINEL do script, passo 8 de
 * `docs/apps-script/metodo-satoyiro-google-sheets.gs`). A chave não fica no
 * código do site: é digitada pelo educador e conferida do lado do Google.
 */
async function buscarRespostas(chave: string): Promise<RespostaPainel> {
  const url = `${SHEET_ENDPOINT_SATOYIRO}?chave=${encodeURIComponent(chave)}`;
  const resp = await fetch(url, { cache: "no-store" });
  if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
  return resp.json();
}

function Aviso({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <div className="card-surface flex gap-4 p-7 sm:p-9">
      <AlertTriangle size={22} className="mt-0.5 shrink-0 text-amarelo" aria-hidden />
      <div>
        <h2 className="font-display text-xl">{titulo}</h2>
        <div className="text-body mt-3 text-sm">{children}</div>
      </div>
    </div>
  );
}

function TelaSenha({
  onEntrar,
}: {
  onEntrar: (chave: string) => Promise<string | null>;
}) {
  const [valor, setValor] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  return (
    <section className="card-surface mx-auto max-w-md p-7 sm:p-9">
      <Lock size={24} className="text-amarelo" aria-hidden />
      <h1 className="font-display mt-4 text-2xl">Painel do Educador</h1>
      <p className="text-body mt-2 text-sm">
        Acesso restrito à equipe do método Satoyiro.
      </p>

      <form
        className="mt-6 space-y-4"
        onSubmit={async (ev) => {
          ev.preventDefault();
          if (!valor) return;
          setEnviando(true);
          setErro(await onEntrar(valor));
          setEnviando(false);
        }}
      >
        <Field id="ed_senha" label="Chave de acesso" required>
          <Input
            id="ed_senha"
            type="password"
            value={valor}
            onChange={(ev) => {
              setValor(ev.target.value);
              setErro(null);
            }}
            autoFocus
          />
        </Field>
        {erro && (
          <p role="alert" className="font-mono text-xs text-destructive">
            {erro}
          </p>
        )}
        <button type="submit" className="btn btn-primary w-full" disabled={enviando}>
          {enviando ? "Conferindo…" : "Entrar"}
        </button>
      </form>
    </section>
  );
}

export function PainelEducador() {
  const [chave, setChave] = useState<string | null>(null);
  const [linhas, setLinhas] = useState<LinhaAluno[] | null>(null);
  const [erroCarregamento, setErroCarregamento] = useState(false);
  const [carregando, setCarregando] = useState(false);

  const [filtroTurma, setFiltroTurma] = useState("");
  const [filtroBusca, setFiltroBusca] = useState("");
  const [filtroDe, setFiltroDe] = useState("");
  const [filtroAte, setFiltroAte] = useState("");

  /** Devolve a mensagem de erro, ou null se entrou. */
  async function entrar(valor: string): Promise<string | null> {
    try {
      const r = await buscarRespostas(valor);
      if (!r.ok) return r.erro === "chave incorreta" ? "Chave incorreta." : r.erro;
      setLinhas(normalizarLinhas(r.linhas));
      setChave(valor);
      return null;
    } catch {
      return "Não consegui falar com a planilha. Tente de novo em instantes.";
    }
  }

  async function carregar() {
    if (!chave) return;
    setCarregando(true);
    setErroCarregamento(false);
    try {
      const r = await buscarRespostas(chave);
      if (!r.ok) throw new Error(r.erro);
      setLinhas(normalizarLinhas(r.linhas));
    } catch {
      setErroCarregamento(true);
    } finally {
      setCarregando(false);
    }
  }

  const turmas = useMemo(
    () => [...new Set((linhas ?? []).map((l) => l.turma).filter(Boolean))].sort(),
    [linhas],
  );

  const filtradas = useMemo(() => {
    return (linhas ?? []).filter((l) => {
      if (filtroTurma && l.turma !== filtroTurma) return false;
      if (filtroBusca && !l.nome.toLowerCase().includes(filtroBusca.toLowerCase())) return false;
      const dataAluno = l.data.slice(0, 10);
      if (filtroDe && dataAluno < filtroDe) return false;
      if (filtroAte && dataAluno > filtroAte) return false;
      return true;
    });
  }, [linhas, filtroTurma, filtroBusca, filtroDe, filtroAte]);

  const prioritarios = filtradas.filter((l) => l.conversaPrioritaria);

  function baixarCsv() {
    const blob = new Blob([paraCsv(filtradas)], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "ouse-ser-voce-alunos.csv";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  if (!chave) return <TelaSenha onEntrar={entrar} />;

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="eyebrow">Ouse Ser Você</p>
          <h1 className="headline-section mt-2">Painel do Educador</h1>
        </div>
        <button type="button" className="btn btn-secondary" onClick={carregar} disabled={carregando}>
          <RefreshCw size={16} className={carregando ? "animate-spin" : ""} /> Atualizar
        </button>
      </header>

      {erroCarregamento && (
        <Aviso titulo="Não consegui carregar as respostas">
          <p>
            A planilha não respondeu. Tente atualizar de novo; se continuar,
            confira se a chave mudou (propriedade <code>CHAVE_PAINEL</code> do
            Apps Script).
          </p>
        </Aviso>
      )}

      {linhas && (
        <>
          {/* Filtros */}
          <section className="card-surface grid gap-4 p-6 sm:grid-cols-4">
            <Field id="ed_busca" label="Buscar por nome">
              <Input
                id="ed_busca"
                value={filtroBusca}
                onChange={(ev) => setFiltroBusca(ev.target.value)}
                placeholder="Nome do aluno"
              />
            </Field>
            <Field id="ed_turma" label="Turma">
              <Select
                id="ed_turma"
                value={filtroTurma}
                onChange={(ev) => setFiltroTurma(ev.target.value)}
              >
                <option value="">Todas</option>
                {turmas.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </Select>
            </Field>
            <Field id="ed_de" label="De">
              <Input
                id="ed_de"
                type="date"
                value={filtroDe}
                onChange={(ev) => setFiltroDe(ev.target.value)}
              />
            </Field>
            <Field id="ed_ate" label="Até">
              <Input
                id="ed_ate"
                type="date"
                value={filtroAte}
                onChange={(ev) => setFiltroAte(ev.target.value)}
              />
            </Field>
          </section>

          {/* KPIs rápidos */}
          <section className="grid gap-4 sm:grid-cols-3">
            <div className="card-surface p-5">
              <p className="font-mono text-[10px] uppercase tracking-widest text-cinza-ink">
                Respostas
              </p>
              <p className="font-display mt-1 text-3xl">{filtradas.length}</p>
            </div>
            <div className="card-surface p-5">
              <p className="font-mono text-[10px] uppercase tracking-widest text-cinza-ink">
                Turmas
              </p>
              <p className="font-display mt-1 text-3xl">{turmas.length}</p>
            </div>
            <div className="card-surface border-t-4 border-t-destructive p-5">
              <p className="font-mono text-[10px] uppercase tracking-widest text-destructive">
                Conversa prioritária
              </p>
              <p className="font-display mt-1 text-3xl text-destructive">
                {prioritarios.length}
              </p>
              <p className="mt-1 text-xs text-cinza-ink">Pressionado + Autocrítico</p>
            </div>
          </section>

          {/* Distribuições */}
          <section className="card-surface grid gap-8 p-6 sm:grid-cols-2 lg:grid-cols-4 sm:p-8">
            <BarraLista
              titulo="16 tipos"
              itens={contarOcorrencias(filtradas.map((l) => l.tipoMbti))}
              cor="var(--amarelo)"
            />
            <BarraLista
              titulo="Como me vejo"
              itens={contarOcorrencias(filtradas.map((l) => l.comoMeVejoCategoria))}
              cor="var(--floresta)"
            />
            <BarraLista
              titulo="Sucesso e expectativas"
              itens={contarOcorrencias(filtradas.map((l) => l.sucessoExpectativasCategoria))}
              cor="var(--rio)"
            />
            <Dispersao pontos={dispersaoClarezaAcao(filtradas)} />
          </section>

          {/* Tabela */}
          <section className="card-surface p-6 sm:p-8">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <h2 className="font-display text-xl">Alunos</h2>
              <button type="button" className="btn btn-secondary" onClick={baixarCsv}>
                <Download size={16} /> Exportar CSV
              </button>
            </div>

            <div className="mt-5 overflow-x-auto">
              <table className="w-full min-w-[720px] text-left text-sm">
                <thead>
                  <tr className="border-b border-border font-mono text-[10px] uppercase tracking-widest text-cinza-ink">
                    <th className="py-2 pr-4">Nome</th>
                    <th className="py-2 pr-4">Turma</th>
                    <th className="py-2 pr-4">Tipo</th>
                    <th className="py-2 pr-4">Como me vejo</th>
                    <th className="py-2 pr-4">Meu caminho</th>
                    <th className="py-2 pr-4">Sucesso</th>
                  </tr>
                </thead>
                <tbody>
                  {filtradas.map((l, i) => (
                    <tr
                      key={`${l.nome}-${i}`}
                      className={`border-b border-border/60 ${
                        l.conversaPrioritaria ? "bg-destructive/10" : ""
                      }`}
                    >
                      <td className="py-2.5 pr-4">
                        {l.nome}
                        {l.conversaPrioritaria && (
                          <span className="ml-2 rounded-full bg-destructive/20 px-2 py-0.5 font-mono text-[9px] uppercase tracking-wider text-destructive">
                            Prioritário
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 pr-4 text-cinza-ink">{l.turma || "-"}</td>
                      <td className="py-2.5 pr-4 font-mono">{l.tipoMbti}</td>
                      <td className="py-2.5 pr-4">{l.comoMeVejo}</td>
                      <td className="py-2.5 pr-4">{l.meuCaminho}</td>
                      <td className="py-2.5 pr-4">{l.sucessoExpectativas}</td>
                    </tr>
                  ))}
                  {filtradas.length === 0 && (
                    <tr>
                      <td colSpan={6} className="py-6 text-center text-cinza-ink">
                        Nenhum aluno encontrado com esses filtros.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
    </div>
  );
}
