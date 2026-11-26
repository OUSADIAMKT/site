import { useState, useEffect } from "react";
import { chamar } from "./api.js";
import { PERIODOS, faixaDe, brl, inteiro, pct, dataCurta } from "./reportComum.jsx";
import CabecalhoPagina from "./CabecalhoPagina.jsx";

// REPORT · gestão ao vivo das campanhas na Meta. Tudo que é lido aqui vem
// direto da API da Meta no momento; toda alteração passa pelo servidor, que
// confere, aplica e registra o antes e o depois.

const STATUS_EFETIVO = {
  ACTIVE: { nome: "Veiculando", classe: "ok" },
  PAUSED: { nome: "Pausado", classe: "neutro" },
  CAMPAIGN_PAUSED: { nome: "Campanha pausada", classe: "neutro" },
  ADSET_PAUSED: { nome: "Conjunto pausado", classe: "neutro" },
  IN_PROCESS: { nome: "Processando", classe: "atencao" },
  PENDING_REVIEW: { nome: "Em análise", classe: "atencao" },
  WITH_ISSUES: { nome: "Com problema", classe: "erro" },
  DISAPPROVED: { nome: "Reprovado", classe: "erro" },
};

const NIVEIS = { campanhas: "campanha", conjuntos: "conjunto", anuncios: "anuncio" };
const FILHO = { campanhas: "conjuntos", conjuntos: "anuncios" };

function resultados(m) {
  if (!m) return null;
  return (m.leads || 0) + (m.conversas_iniciadas || 0) + (m.conversoes || 0);
}

export default function Campanhas({ irPara }) {
  const [contas, setContas] = useState(null);
  const [clientes, setClientes] = useState([]);
  const [conta, setConta] = useState("");
  const [periodo, setPeriodo] = useState("7d");
  const [erro, setErro] = useState("");
  const [versao, setVersao] = useState(0);   // muda depois de cada alteração, para recarregar
  const [historico, setHistorico] = useState([]);

  useEffect(() => {
    Promise.all([chamar("report?rota=contas"), chamar("report?rota=clientes")])
      .then(([c, k]) => {
        const anuncios = c.contas.filter((x) => x.plataforma === "meta_ads" && x.ativo);
        setContas(anuncios);
        setClientes(k.clientes);
        setConta((atual) => atual || anuncios.find((x) => x.cliente_id)?.id_externo || anuncios[0]?.id_externo || "");
      })
      .catch((e) => setErro(e.message));
  }, []);

  useEffect(() => {
    chamar("report?rota=historico&limite=15").then((r) => setHistorico(r.acoes)).catch(() => {});
  }, [versao]);

  if (contas === null) return erro ? <div className="aviso erro" role="alert">{erro}</div> : <div className="vazio">Carregando…</div>;

  if (!contas.length) {
    return (
      <>
        <CabecalhoPagina titulo="Campanhas" />
        <div className="vazio">
          Nenhuma conta de anúncio encontrada. Conecte o Facebook na aba{" "}
          <button className="rp-link" onClick={() => irPara("conexoes")}>Contas</button>.
        </div>
      </>
    );
  }

  // Agrupa por cliente no seletor; as sem cliente vão para o fim.
  const nomeCliente = Object.fromEntries(clientes.map((c) => [c.id, c.nome]));
  const grupos = {};
  for (const c of contas) (grupos[c.cliente_id ? nomeCliente[c.cliente_id] : "Sem cliente"] ||= []).push(c);
  const ordem = Object.keys(grupos).sort((a, b) => (a === "Sem cliente") - (b === "Sem cliente") || a.localeCompare(b));
  const faixa = faixaDe(periodo);

  return (
    <>
      <CabecalhoPagina titulo="Campanhas">
        Estado ao vivo na Meta. Pausar, ativar e mudar orçamento vale na hora e fica registrado
        com o valor anterior. Métricas de {dataCurta(faixa.inicio)} a {dataCurta(faixa.fim)}.
      </CabecalhoPagina>

      <div className="rp-barra">
        <div className="campo rp-cliente">
          <label htmlFor="rp-conta">Conta de anúncio</label>
          <select id="rp-conta" value={conta} onChange={(e) => setConta(e.target.value)}>
            {ordem.map((g) => (
              <optgroup key={g} label={g}>
                {grupos[g].map((c) => (
                  <option key={c.id} value={c.id_externo}>
                    {c.nome}{c.status_externo && c.status_externo !== "ativa" ? ` (${c.status_externo})` : ""}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
        </div>
        <div className="rp-periodos" role="group" aria-label="Período das métricas">
          {PERIODOS.map((p) => (
            <button key={p.id} className={periodo === p.id ? "ativo" : ""} onClick={() => setPeriodo(p.id)}>{p.nome}</button>
          ))}
        </div>
      </div>

      {erro && <div className="aviso erro" role="alert">{erro}</div>}

      <div className="bloco">
        <Nivel key={`${conta}-${periodo}-${versao}`} nivel="campanhas" conta={conta} faixa={faixa}
               aoMudar={() => setVersao((v) => v + 1)} />
      </div>

      <div className="bloco">
        <div className="bloco-topo"><h2>Últimas alterações</h2><span className="canto">painel e Claude</span></div>
        <div className="compacta">
          {historico.length === 0
            ? <div className="mini-vazio">Nenhuma alteração feita pelo REPORT ainda.</div>
            : historico.map((a) => (
                <div className="item" key={a.id}>
                  <div className="princ">
                    <b>{a.objeto_nome || a.objeto_id}</b>
                    <span>{descreverAcao(a)}</span>
                  </div>
                  <span className={`etiqueta ${a.ok ? "" : "quente"}`}>{a.ok ? a.origem : "falhou"}</span>
                  <span className="lado">{new Date(a.criado_em).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}</span>
                </div>
              ))}
        </div>
      </div>
    </>
  );
}

function descreverAcao(a) {
  const partes = [];
  const antes = a.antes || {};
  const depois = a.depois || {};
  if ("status" in depois) partes.push(depois.status === "PAUSED" ? "pausou" : "ativou");
  if ("orcamento_diario" in depois) partes.push(`diário ${brl(antes.orcamento_diario)} → ${brl(depois.orcamento_diario)}`);
  if ("orcamento_total" in depois) partes.push(`total ${brl(antes.orcamento_total)} → ${brl(depois.orcamento_total)}`);
  if ("nome" in depois) partes.push(`renomeou para "${depois.nome}"`);
  return partes.join(" · ") + (a.erro ? ` · ${a.erro}` : "");
}

// Uma tabela por nível. Abrir uma linha carrega o nível de baixo.
function Nivel({ nivel, conta, pai, faixa, aoMudar }) {
  const [itens, setItens] = useState(null);
  const [erro, setErro] = useState("");
  const [aberto, setAberto] = useState(null);

  useEffect(() => {
    const alvo = nivel === "campanhas" ? `conta=${conta}` : `pai=${pai}`;
    chamar(`report?rota=campanhas&nivel=${nivel}&${alvo}&inicio=${faixa.inicio}&fim=${faixa.fim}`)
      .then((r) => setItens(r.itens))
      .catch((e) => setErro(e.message));
  }, [nivel, conta, pai]);

  if (erro) return <div className="aviso erro" role="alert">{erro}</div>;
  if (!itens) return <div className="mini-vazio">Buscando na Meta…</div>;
  if (!itens.length) return <div className="mini-vazio">Nada aqui.</div>;

  const titulo = { campanhas: "Campanha", conjuntos: "Conjunto", anuncios: "Anúncio" }[nivel];

  return (
    <div className="rp-rolagem">
      <table className={`rp-arvore ${nivel}`}>
        <thead>
          <tr>
            <th>{titulo}</th>
            <th>Status</th>
            {nivel !== "anuncios" && <th className="num">Orçamento</th>}
            <th className="num">Investido</th>
            <th className="num">Result.</th>
            <th className="num">Custo/result.</th>
            <th className="num">CTR</th>
          </tr>
        </thead>
        <tbody>
          {itens.map((o) => {
            const r = resultados(o.metricas);
            const gasto = o.metricas?.gasto;
            const ctr = o.metricas?.impressoes ? (o.metricas.cliques / o.metricas.impressoes) * 100 : null;
            return [
              <tr key={o.id} className={FILHO[nivel] ? "clicavel" : ""}
                  onClick={() => FILHO[nivel] && setAberto(aberto === o.id ? null : o.id)}>
                <td>
                  <b className="rp-nome">{FILHO[nivel] && <span className="rp-seta">{aberto === o.id ? "▾" : "▸"}</span>}{o.nome}</b>
                  {o.objetivo && <span className="rp-sub">{o.objetivo.replace(/^OUTCOME_/, "").toLowerCase()}</span>}
                </td>
                <td onClick={(e) => e.stopPropagation()}>
                  <ChaveStatus objeto={o} tipo={NIVEIS[nivel]} aoMudar={aoMudar} />
                </td>
                {nivel !== "anuncios" && (
                  <td className="num" onClick={(e) => e.stopPropagation()}>
                    <Orcamento objeto={o} tipo={NIVEIS[nivel]} aoMudar={aoMudar} />
                  </td>
                )}
                <td className="num">{brl(gasto)}</td>
                <td className="num">{inteiro(r)}</td>
                <td className="num">{r ? brl(gasto / r) : "n/d"}</td>
                <td className="num">{pct(ctr === null ? null : Math.round(ctr * 100) / 100)}</td>
              </tr>,
              aberto === o.id && (
                <tr key={`${o.id}-filho`} className="rp-filho">
                  <td colSpan={7}>
                    <Nivel nivel={FILHO[nivel]} pai={o.id} faixa={faixa} aoMudar={aoMudar} />
                  </td>
                </tr>
              ),
            ];
          })}
        </tbody>
      </table>
    </div>
  );
}

async function alterar(tipo, objeto, mudanca, pergunta) {
  if (!window.confirm(pergunta)) return false;
  try {
    await chamar("report?rota=alterar", { method: "POST", body: { tipo, id: objeto.id, mudanca } });
    return true;
  } catch (e) {
    // A trava de aumento grande pede uma segunda confirmação, explícita.
    if (/Confirme para seguir/.test(e.message) && window.confirm(`${e.message}\n\nTem certeza?`)) {
      try {
        await chamar("report?rota=alterar", { method: "POST", body: { tipo, id: objeto.id, mudanca, forcar: true } });
        return true;
      } catch (e2) {
        window.alert(e2.message);
        return false;
      }
    }
    window.alert(e.message);
    return false;
  }
}

function ChaveStatus({ objeto, tipo, aoMudar }) {
  const [salvando, setSalvando] = useState(false);
  const ativo = objeto.status === "ACTIVE";
  const efetivo = STATUS_EFETIVO[objeto.status_efetivo] || { nome: objeto.status_efetivo, classe: "neutro" };

  async function trocar() {
    setSalvando(true);
    const novo = ativo ? "PAUSED" : "ACTIVE";
    const ok = await alterar(tipo, objeto, { status: novo },
      `${ativo ? "Pausar" : "Ativar"} ${tipo} "${objeto.nome}"?\n\nVale na hora na Meta.`);
    setSalvando(false);
    if (ok) aoMudar();
  }

  return (
    <div className="rp-status">
      <button className={`rp-chave ${ativo ? "ligada" : ""}`} onClick={trocar} disabled={salvando}
              aria-label={ativo ? "Pausar" : "Ativar"} title={ativo ? "Pausar" : "Ativar"}>
        <span />
      </button>
      <span className={`rp-efetivo ${efetivo.classe}`}>{efetivo.nome}</span>
    </div>
  );
}

function Orcamento({ objeto, tipo, aoMudar }) {
  const campo = objeto.orcamento_diario !== null ? "orcamento_diario" : objeto.orcamento_total !== null ? "orcamento_total" : null;
  const [editando, setEditando] = useState(false);
  const [valor, setValor] = useState("");

  if (!campo) return <span className="rp-sub">no outro nível</span>;
  const atual = objeto[campo];
  const rotulo = campo === "orcamento_diario" ? "/dia" : " total";

  async function salvar() {
    const novo = Number(String(valor).replace(/\./g, "").replace(",", "."));
    if (!Number.isFinite(novo) || novo <= 0) return window.alert("Informe um valor em reais maior que zero.");
    const ok = await alterar(tipo, objeto, { [campo]: novo },
      `Mudar o orçamento${rotulo} de "${objeto.nome}" de ${brl(atual)} para ${brl(novo)}?`);
    if (ok) {
      setEditando(false);
      aoMudar();
    }
  }

  if (!editando) {
    return (
      <button className="rp-orcamento" onClick={() => { setValor(String(atual).replace(".", ",")); setEditando(true); }}
              title="Editar orçamento">
        {brl(atual)}<small>{rotulo}</small>
      </button>
    );
  }
  return (
    <span className="rp-editar">
      <input type="text" value={valor} onChange={(e) => setValor(e.target.value)} inputMode="decimal" autoFocus
             onKeyDown={(e) => { if (e.key === "Enter") salvar(); if (e.key === "Escape") setEditando(false); }} />
      <button className="btn pequeno" onClick={salvar}>Salvar</button>
      <button className="btn pequeno secundario" onClick={() => setEditando(false)}>×</button>
    </span>
  );
}
