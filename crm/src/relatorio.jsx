// REPORT · a página que o cliente da agência abre pelo link (/r/<código>).
// Pública, sem login, só leitura. Mostra o retrato salvo no momento em que
// o relatório foi gerado: o número não muda depois de enviado.

import React, { useEffect, useState } from "react";
import ReactDOM from "react-dom/client";
import {
  dataCurta, indicadoresDe, Indicador, GraficoDiario, TabelaAnuncios, GradePosts,
} from "./reportComum.jsx";
import "./index.css";
import "./plataforma.css";

function codigo() {
  const doCaminho = window.location.pathname.match(/\/r\/([a-f0-9]{24})/);
  return doCaminho?.[1] || new URLSearchParams(window.location.search).get("c") || "";
}

function Relatorio() {
  const [r, setR] = useState(null);
  const [erro, setErro] = useState("");

  useEffect(() => {
    fetch(`/api/report?rota=publico&c=${encodeURIComponent(codigo())}`)
      .then(async (resp) => {
        if (!resp.ok) throw new Error(resp.status === 404 ? "Relatório não encontrado." : "Não foi possível abrir o relatório.");
        return resp.json();
      })
      .then((dados) => {
        setR(dados);
        document.title = `Relatório de ${dados.dados?.cliente?.nome || "marketing"}`;
      })
      .catch((e) => setErro(e.message));
  }, []);

  if (erro) return <div className="publico"><div className="vazio">{erro}</div></div>;
  if (!r) return <div className="publico"><div className="vazio">Carregando…</div></div>;

  const d = r.dados || {};
  const indicadores = indicadoresDe(d.plataformas);

  return (
    <div className="publico">
      <header className="publico-topo">
        <span className="publico-selo">Relatório de marketing</span>
        <h1>{d.cliente?.nome}</h1>
        <p>
          {dataCurta(r.inicio)} a {dataCurta(r.fim)}
          {r.comparar_inicio && <>, comparado com {dataCurta(r.comparar_inicio)} a {dataCurta(r.comparar_fim)}</>}
        </p>
        <button className="btn secundario pequeno publico-imprimir" onClick={() => window.print()}>Salvar em PDF</button>
      </header>

      <div className="kpis">
        {indicadores.map((i) => <Indicador key={i.rotulo} {...i} />)}
      </div>

      {r.resumo && (
        <section className="bloco publico-analise">
          <div className="bloco-topo"><h2>Análise</h2></div>
          {r.resumo.split(/\n{2,}/).map((par, i) =>
            par.trim().startsWith("- ")
              ? <ul key={i}>{par.split("\n").filter(Boolean).map((l, j) => <li key={j}>{l.replace(/^-\s*/, "")}</li>)}</ul>
              : <p key={i}>{par}</p>)}
        </section>
      )}

      {d.serie?.length > 0 && (
        <section className="bloco">
          <div className="bloco-topo"><h2>Dia a dia</h2></div>
          <GraficoDiario serie={d.serie} />
        </section>
      )}

      {d.anuncios?.length > 0 && (
        <section className="bloco">
          <div className="bloco-topo"><h2>Anúncios que mais investiram</h2></div>
          <TabelaAnuncios anuncios={d.anuncios} />
        </section>
      )}

      {d.posts?.length > 0 && (
        <section className="bloco">
          <div className="bloco-topo"><h2>Melhores publicações</h2><span className="canto">por alcance</span></div>
          <GradePosts posts={d.posts} />
        </section>
      )}

      <footer className="publico-rodape">
        Números da Meta (Facebook e Instagram) no fechamento de cada dia. Gerado em {dataCurta(r.criado_em)}.
      </footer>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<React.StrictMode><Relatorio /></React.StrictMode>);
