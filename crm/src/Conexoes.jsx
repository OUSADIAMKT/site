import { useState, useEffect } from "react";
import { chamar } from "./api.js";
import { dataCurta } from "./reportComum.jsx";
import CabecalhoPagina from "./CabecalhoPagina.jsx";

// REPORT · a porta de entrada: conectar o Facebook, cadastrar os clientes
// da agência e dizer de quem é cada conta que o perfil enxerga.

const PLATAFORMAS = {
  meta_ads: { nome: "Anúncios", cor: "#5479c4" },
  instagram: { nome: "Instagram", cor: "#c95f9a" },
  facebook: { nome: "Página", cor: "#4a8ad8" },
  google_ads: { nome: "Google Ads", cor: "#cf9a45" },
};

function apelido(nome) {
  return nome.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase()
    .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

export default function Conexoes({ retorno }) {
  const [status, setStatus] = useState(null);
  const [contas, setContas] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [erro, setErro] = useState("");
  const [aviso, setAviso] = useState(retorno || null);
  const [ocupado, setOcupado] = useState("");
  const [filtro, setFiltro] = useState("sem_cliente");
  const [busca, setBusca] = useState("");

  async function carregar() {
    try {
      const [s, c, k] = await Promise.all([
        chamar("report?rota=status"), chamar("report?rota=contas"), chamar("report?rota=clientes"),
      ]);
      setStatus(s);
      setContas(c.contas);
      setClientes(k.clientes);
      if (!c.contas.some((x) => !x.cliente_id)) setFiltro((f) => (f === "sem_cliente" ? "todas" : f));
    } catch (e) {
      setErro(e.message);
    }
  }

  useEffect(() => { carregar(); }, []);

  async function acao(nome, fn) {
    setOcupado(nome);
    setErro("");
    try {
      await fn();
    } catch (e) {
      setErro(e.message);
    } finally {
      setOcupado("");
    }
  }

  const conectar = () => acao("conectar", async () => {
    const { url } = await chamar("report?rota=conectar", { method: "POST" });
    window.location.href = url;
  });

  const sincronizar = () => acao("sincronizar", async () => {
    const r = await chamar("report?rota=sincronizar", { method: "POST" });
    setAviso({ tipo: "ok", texto: `${r.total} contas encontradas, ${r.novas} novas.` });
    await carregar();
  });

  const coletar = () => acao("coletar", async () => {
    const r = await chamar("report?rota=coletar", { method: "POST" });
    setAviso({ tipo: "ok", texto: `Coleta disparada para ${r.disparadas} de ${r.contas} contas. Os números aparecem em até 1 minuto.` });
  });

  const desconectar = () => {
    if (!window.confirm("Desconectar o Facebook? A coleta diária e a gestão de campanhas param até você conectar de novo.")) return;
    acao("desconectar", async () => {
      await chamar("report?rota=desconectar", { method: "POST" });
      await carregar();
    });
  };

  async function atribuir(conta, clienteId) {
    await acao(`conta-${conta.id}`, async () => {
      await chamar("report?rota=contas", { method: "PATCH", body: { id: conta.id, cliente_id: clienteId || null } });
      setContas((lista) => lista.map((c) => (c.id === conta.id ? { ...c, cliente_id: clienteId || null } : c)));
    });
  }

  async function alternar(conta) {
    await acao(`conta-${conta.id}`, async () => {
      await chamar("report?rota=contas", { method: "PATCH", body: { id: conta.id, ativo: !conta.ativo } });
      setContas((lista) => lista.map((c) => (c.id === conta.id ? { ...c, ativo: !c.ativo } : c)));
    });
  }

  if (!status) return erro ? <div className="aviso erro" role="alert">{erro}</div> : <div className="vazio">Carregando…</div>;

  const c = status.conexao;
  const b = busca.trim().toLowerCase();
  const visiveis = contas.filter((x) =>
    (filtro === "todas" || (filtro === "sem_cliente" ? !x.cliente_id : x.plataforma === filtro)) &&
    (!b || `${x.nome} ${x.bm_nome || ""} ${x.id_externo}`.toLowerCase().includes(b)));

  return (
    <>
      <CabecalhoPagina titulo="Contas">
        O REPORT enxerga tudo o que o seu perfil do Facebook enxerga. Aqui você conecta o perfil,
        cadastra os clientes da agência e diz de quem é cada conta. Só as contas com cliente entram
        na coleta diária.
      </CabecalhoPagina>

      {aviso && <div className={`aviso ${aviso.tipo === "erro" ? "erro" : "ok"}`}>{aviso.texto}</div>}
      {erro && <div className="aviso erro" role="alert">{erro}</div>}

      <div className="cartao">
        <h2>Conexão com a Meta</h2>
        {!status.app_configurado ? (
          <div className="aviso atencao">
            O app da Meta ainda não está configurado no servidor. Faltam as variáveis
            META_REPORT_APP_ID e META_REPORT_APP_SECRET no arquivo de ambiente do servidor. No app, a URI de
            redirecionamento válida é <code>{status.redirect_uri}</code>.
          </div>
        ) : c.conectado ? (
          <>
            <p>
              Conectado como <b>{c.usuario}</b>.{" "}
              {c.dias_restantes !== null && (
                c.dias_restantes <= 10
                  ? <span className="rp-var ruim">Vence em {c.dias_restantes} dias: reconecte para não parar a coleta.</span>
                  : <>Vale até {dataCurta(c.expira_em)} ({c.dias_restantes} dias).</>
              )}
            </p>
            {!c.pode_gerenciar && (
              <div className="aviso atencao">
                A permissão de gerenciar anúncios (ads_management) não foi concedida. Relatórios
                funcionam; pausar e mudar orçamento, não. Reconecte e aceite todas as permissões.
              </div>
            )}
            <div className="acoes">
              <button className="btn" onClick={coletar} disabled={Boolean(ocupado)}>
                {ocupado === "coletar" ? "Disparando…" : "Coletar agora"}
              </button>
              <button className="btn secundario" onClick={sincronizar} disabled={Boolean(ocupado)}>
                {ocupado === "sincronizar" ? "Procurando…" : "Procurar contas novas"}
              </button>
              <button className="btn secundario" onClick={conectar} disabled={Boolean(ocupado)}>Reconectar</button>
              <button className="btn perigo pequeno" onClick={desconectar} disabled={Boolean(ocupado)}>Desconectar</button>
            </div>
          </>
        ) : (
          <>
            <p>
              {c.usuario ? "A conexão venceu. " : ""}Entre com o perfil do Facebook que tem acesso às contas
              dos clientes. A Meta vai pedir para você aceitar as permissões de leitura e de gestão de anúncios.
            </p>
            <div className="acoes">
              <button className="btn" onClick={conectar} disabled={Boolean(ocupado)}>
                {ocupado === "conectar" ? "Abrindo…" : "Conectar com Facebook"}
              </button>
            </div>
          </>
        )}
      </div>

      <NovoCliente aoCriar={carregar} />

      <div className="bloco">
        <div className="bloco-topo">
          <h2>Contas encontradas</h2>
          <span className="canto">{contas.length} no total · {status.sem_cliente} sem cliente</span>
        </div>

        <div className="rp-barra">
          <div className="rp-periodos" role="group" aria-label="Filtro">
            {[["sem_cliente", "Sem cliente"], ["todas", "Todas"], ["meta_ads", "Anúncios"], ["instagram", "Instagram"], ["facebook", "Páginas"]]
              .map(([id, nome]) => (
                <button key={id} className={filtro === id ? "ativo" : ""} onClick={() => setFiltro(id)}>{nome}</button>
              ))}
          </div>
          <input className="rp-busca" type="text" placeholder="Buscar por nome ou BM" value={busca}
                 onChange={(e) => setBusca(e.target.value)} />
        </div>

        {visiveis.length === 0 ? (
          <div className="mini-vazio">
            {contas.length === 0 ? "Conecte o Facebook para as contas aparecerem aqui." : "Nenhuma conta neste filtro."}
          </div>
        ) : (
          <div className="rp-rolagem">
            <table>
              <thead>
                <tr><th>Conta</th><th>Cliente</th><th>Coleta</th><th className="num">Ativa</th></tr>
              </thead>
              <tbody>
                {visiveis.map((x) => {
                  const p = PLATAFORMAS[x.plataforma] || { nome: x.plataforma, cor: "#888" };
                  return (
                    <tr key={x.id} style={{ opacity: x.ativo ? 1 : 0.55 }}>
                      <td>
                        <b className="rp-nome">
                          <span className="rp-plataforma" style={{ color: p.cor, borderColor: p.cor }}>{p.nome}</span>
                          {x.nome}
                        </b>
                        <span className="rp-sub">
                          {x.bm_nome ? `${x.bm_nome} · ` : ""}{x.id_externo}
                          {x.status_externo && x.status_externo !== "ativa" ? ` · ${x.status_externo}` : ""}
                        </span>
                      </td>
                      <td>
                        <select value={x.cliente_id || ""} disabled={ocupado === `conta-${x.id}`}
                                onChange={(e) => atribuir(x, e.target.value)}>
                          <option value="">Sem cliente</option>
                          {clientes.map((k) => <option key={k.id} value={k.id}>{k.nome}</option>)}
                        </select>
                      </td>
                      <td>
                        {x.ultimo_erro
                          ? <span className="rp-var ruim" title={x.ultimo_erro}>erro: {x.ultimo_erro.slice(0, 60)}</span>
                          : <span className="rp-sub">{x.ultima_coleta_em ? dataCurta(x.ultima_coleta_em) : x.cliente_id ? "na próxima coleta" : "fora da coleta"}</span>}
                      </td>
                      <td className="num">
                        <button className={`rp-chave ${x.ativo ? "ligada" : ""}`} onClick={() => alternar(x)}
                                disabled={ocupado === `conta-${x.id}`} aria-label={x.ativo ? "Desativar" : "Ativar"}>
                          <span />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="cartao">
        <h2>Usar pelo Claude (MCP)</h2>
        {status.mcp_configurado ? (
          <p>
            No Claude, adicione um conector personalizado com o endereço{" "}
            <code>{window.location.origin}/api/mcp/SUA_CHAVE</code>, trocando SUA_CHAVE pelo valor de
            REPORT_MCP_TOKEN do arquivo de ambiente do servidor. Depois é só perguntar, por exemplo: "como foi a empresa em
            setembro contra agosto?" ou "pausa o conjunto que está com o custo por lead mais alto".
          </p>
        ) : (
          <div className="aviso atencao">
            Falta a variável REPORT_MCP_TOKEN no arquivo de ambiente do servidor. Sem ela o MCP recusa qualquer chamada.
          </div>
        )}
      </div>
    </>
  );
}

function NovoCliente({ aoCriar }) {
  const [nome, setNome] = useState("");
  const [slug, setSlug] = useState("");
  const [mexeuSlug, setMexeuSlug] = useState(false);
  const [erro, setErro] = useState("");
  const [salvando, setSalvando] = useState(false);

  async function criar(e) {
    e.preventDefault();
    setSalvando(true);
    setErro("");
    try {
      await chamar("report?rota=clientes", { method: "POST", body: { nome, slug } });
      setNome("");
      setSlug("");
      setMexeuSlug(false);
      aoCriar();
    } catch (err) {
      setErro(err.message);
    } finally {
      setSalvando(false);
    }
  }

  return (
    <form className="cartao" onSubmit={criar}>
      <h2>Novo cliente da agência</h2>
      <p>Cliente de marketing, separado dos clientes do atendimento por WhatsApp.</p>
      <div className="linha">
        <div className="campo">
          <label htmlFor="rp-nome">Nome</label>
          <input id="rp-nome" type="text" value={nome}
                 onChange={(e) => { setNome(e.target.value); if (!mexeuSlug) setSlug(apelido(e.target.value)); }} />
        </div>
        <div className="campo">
          <label htmlFor="rp-slug">Apelido</label>
          <input id="rp-slug" type="text" value={slug} onChange={(e) => { setSlug(e.target.value); setMexeuSlug(true); }} />
          <p className="dica">É por ele que você chama o cliente no Claude.</p>
        </div>
      </div>
      {erro && <div className="aviso erro" role="alert">{erro}</div>}
      <div className="acoes">
        <button className="btn" type="submit" disabled={salvando || !nome.trim() || !slug}>
          {salvando ? "Salvando…" : "Cadastrar cliente"}
        </button>
      </div>
    </form>
  );
}
