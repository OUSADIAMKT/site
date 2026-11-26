import { useState, useEffect } from "react";
import { chamar } from "./api.js";
import {
  PERIODOS, faixaDe, dataCurta, indicadoresDe, Indicador,
  GraficoDiario, TabelaAnuncios, GradePosts,
} from "./reportComum.jsx";
import CabecalhoPagina from "./CabecalhoPagina.jsx";

// REPORT · relatórios de marketing dos clientes da AGÊNCIA (não dos clientes
// do atendimento). Só o operador chega aqui.
export default function Relatorios({ irPara }) {
  const [clientes, setClientes] = useState(null);
  const [clienteId, setClienteId] = useState("");
  const [periodo, setPeriodo] = useState("30d");
  const [faixa, setFaixa] = useState(faixaDe("30d"));
  const [dados, setDados] = useState(null);
  const [relatorios, setRelatorios] = useState([]);
  const [erro, setErro] = useState("");

  useEffect(() => {
    chamar("report?rota=clientes")
      .then(({ clientes: lista }) => {
        setClientes(lista);
        setClienteId((atual) => atual || lista[0]?.id || "");
      })
      .catch((e) => setErro(e.message));
  }, []);

  async function carregar() {
    if (!clienteId) return;
    setDados(null);
    setErro("");
    try {
      const q = `cliente=${clienteId}&inicio=${faixa.inicio}&fim=${faixa.fim}`;
      const [n, r] = await Promise.all([
        chamar(`report?rota=numeros&${q}`),
        chamar(`report?rota=relatorios&cliente=${clienteId}`),
      ]);
      setDados(n);
      setRelatorios(r.relatorios);
    } catch (e) {
      setErro(e.message);
    }
  }

  useEffect(() => { carregar(); }, [clienteId, faixa.inicio, faixa.fim]);

  function escolherPeriodo(id) {
    setPeriodo(id);
    if (id !== "livre") setFaixa(faixaDe(id));
  }

  if (clientes === null) return erro ? <div className="aviso erro" role="alert">{erro}</div> : <div className="vazio">Carregando…</div>;

  if (!clientes.length) {
    return (
      <>
        <CabecalhoPagina titulo="Relatórios">
          Os números de marketing dos clientes da agência, comparados com o período anterior.
        </CabecalhoPagina>
        <div className="vazio">
          Nenhum cliente da agência cadastrado ainda. Na aba{" "}
          <button className="rp-link" onClick={() => irPara("conexoes")}>Contas</button>{" "}
          você conecta o Facebook, cadastra o cliente e diz quais contas são dele.
        </div>
      </>
    );
  }

  const indicadores = dados ? indicadoresDe(dados.plataformas) : [];
  const semNumeros = dados && !Object.keys(dados.plataformas).length;
  const nome = clientes.find((c) => c.id === clienteId)?.nome || "";

  return (
    <>
      <CabecalhoPagina titulo={<>Relatório de {nome}</>}>
        {dataCurta(faixa.inicio)} a {dataCurta(faixa.fim)}
        {dados?.comparado_com && <>, comparado com {dataCurta(dados.comparado_com.inicio)} a {dataCurta(dados.comparado_com.fim)}</>}.
      </CabecalhoPagina>

      <div className="rp-barra">
        <div className="campo rp-cliente">
          <label htmlFor="rp-cliente">Cliente</label>
          <select id="rp-cliente" value={clienteId} onChange={(e) => setClienteId(e.target.value)}>
            {clientes.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
          </select>
        </div>
        <div className="rp-periodos" role="group" aria-label="Período">
          {PERIODOS.map((p) => (
            <button key={p.id} className={periodo === p.id ? "ativo" : ""} onClick={() => escolherPeriodo(p.id)}>
              {p.nome}
            </button>
          ))}
          <button className={periodo === "livre" ? "ativo" : ""} onClick={() => setPeriodo("livre")}>Outro</button>
        </div>
        {periodo === "livre" && (
          <div className="rp-datas">
            <input type="date" value={faixa.inicio} max={faixa.fim}
                   onChange={(e) => e.target.value && setFaixa({ ...faixa, inicio: e.target.value })} />
            <span>até</span>
            <input type="date" value={faixa.fim} min={faixa.inicio}
                   onChange={(e) => e.target.value && setFaixa({ ...faixa, fim: e.target.value })} />
          </div>
        )}
      </div>

      {erro && <div className="aviso erro" role="alert">{erro}</div>}
      {!dados && !erro && <div className="vazio">Carregando os números…</div>}

      {dados && (
        <>
          <Contas contas={dados.contas} irPara={irPara} />

          {semNumeros ? (
            <div className="vazio">
              Nenhum número coletado para este período. A coleta roda sozinha todo dia de manhã;
              para buscar agora, use <b>Coletar agora</b> na aba{" "}
              <button className="rp-link" onClick={() => irPara("conexoes")}>Contas</button>.
            </div>
          ) : (
            <>
              <div className="kpis">
                {indicadores.map((i) => <Indicador key={i.rotulo} {...i} />)}
              </div>

              <div className="bloco">
                <div className="bloco-topo">
                  <h2>Dia a dia</h2>
                  <span className="canto">investimento e resultados</span>
                </div>
                <GraficoDiario serie={dados.serie} />
              </div>

              <div className="malha-2">
                <div className="bloco">
                  <div className="bloco-topo"><h2>Anúncios que mais investiram</h2></div>
                  <TabelaAnuncios anuncios={dados.anuncios} />
                </div>
                <div className="bloco">
                  <div className="bloco-topo"><h2>Melhores posts</h2><span className="canto">por alcance</span></div>
                  <GradePosts posts={dados.posts} />
                </div>
              </div>
            </>
          )}

          <GerarRelatorio clienteId={clienteId} faixa={faixa} desabilitado={semNumeros}
                          relatorios={relatorios} aoGerar={carregar} />
        </>
      )}
    </>
  );
}

function Contas({ contas, irPara }) {
  const comErro = contas.filter((c) => c.ultimo_erro && c.ativo);
  if (!contas.length) {
    return (
      <div className="aviso atencao">
        Este cliente ainda não tem nenhuma conta ligada a ele. Atribua as contas na aba{" "}
        <button className="rp-link" onClick={() => irPara("conexoes")}>Contas</button>.
      </div>
    );
  }
  if (!comErro.length) return null;
  return (
    <div className="aviso atencao">
      A última coleta falhou em {comErro.map((c) => c.nome).join(", ")}: {comErro[0].ultimo_erro}
    </div>
  );
}

function GerarRelatorio({ clienteId, faixa, desabilitado, relatorios, aoGerar }) {
  const [comAnalise, setComAnalise] = useState(true);
  const [texto, setTexto] = useState("");
  const [gerando, setGerando] = useState(false);
  const [link, setLink] = useState("");
  const [erro, setErro] = useState("");
  const [copiado, setCopiado] = useState("");

  async function gerar() {
    setGerando(true);
    setErro("");
    setLink("");
    try {
      const r = await chamar("report?rota=relatorios", {
        method: "POST",
        body: { cliente_id: clienteId, inicio: faixa.inicio, fim: faixa.fim, com_analise: comAnalise, resumo: texto },
      });
      setLink(r.link);
      setTexto("");
      aoGerar();
    } catch (e) {
      setErro(e.message);
    } finally {
      setGerando(false);
    }
  }

  async function copiar(url) {
    try {
      await navigator.clipboard.writeText(url);
      setCopiado(url);
      setTimeout(() => setCopiado(""), 2000);
    } catch {
      window.prompt("Copie o link:", url);
    }
  }

  return (
    <div className="cartao">
      <h2>Relatório para o cliente</h2>
      <p>
        Gera uma página com os números deste período e um link para mandar ao cliente. O link não
        precisa de login e não mostra nada além deste relatório.
      </p>

      <div className="campo">
        <label htmlFor="rp-texto">Análise (opcional)</label>
        <textarea id="rp-texto" value={texto} onChange={(e) => setTexto(e.target.value)}
                  placeholder="Escreva a sua análise, ou deixe vazio e marque a opção abaixo para a IA escrever." />
      </div>

      <label className="rp-check">
        <input type="checkbox" checked={comAnalise} disabled={Boolean(texto.trim())}
               onChange={(e) => setComAnalise(e.target.checked)} />
        Se o campo acima estiver vazio, a IA escreve a análise a partir dos números
      </label>

      {erro && <div className="aviso erro" role="alert">{erro}</div>}
      {link && (
        <div className="aviso ok rp-linha-link">
          Relatório pronto: <a href={link} target="_blank" rel="noreferrer">{link}</a>
          <button className="btn pequeno secundario" onClick={() => copiar(link)}>
            {copiado === link ? "Copiado" : "Copiar"}
          </button>
        </div>
      )}

      <div className="acoes">
        <button className="btn" onClick={gerar} disabled={gerando || desabilitado}>
          {gerando ? (comAnalise && !texto.trim() ? "A IA está escrevendo…" : "Gerando…") : "Gerar relatório"}
        </button>
      </div>

      {relatorios.length > 0 && (
        <div className="compacta">
          {relatorios.slice(0, 8).map((r) => (
            <div className="item" key={r.id}>
              <div className="princ">
                <b>{dataCurta(r.inicio)} a {dataCurta(r.fim)}</b>
                <span>gerado em {dataCurta(r.criado_em)}{r.tem_analise ? " · com análise" : ""}</span>
              </div>
              <a className="btn pequeno secundario" href={r.link} target="_blank" rel="noreferrer">Abrir</a>
              <button className="btn pequeno secundario" onClick={() => copiar(r.link)}>
                {copiado === r.link ? "Copiado" : "Copiar link"}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
