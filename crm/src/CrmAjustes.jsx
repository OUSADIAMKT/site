// Configurações do CRM: funis, origem do lead, campos, etiquetas, produtos,
// motivos de fechamento e automação por palavras. As mesmas seções que o
// CRMs de mercado tem em Configurações, numa tela só com abas.

import { useCallback, useEffect, useState } from "react";
import {
  Workflow, Compass, TextCursorInput, Tags, Package, Flag, Zap,
  Plus, Pencil, Trash2, ArrowUp, ArrowDown,
} from "lucide-react";
import { chamar } from "./api.js";
import { dinheiro, dataHora, Segmentos, Vazio, Modal, Ficha } from "./crmComum.jsx";
import CabecalhoPagina from "./CabecalhoPagina.jsx";

const SECOES = [
  { valor: "funis", rotulo: "Funis", Icone: Workflow },
  { valor: "origens", rotulo: "Origem do lead", Icone: Compass },
  { valor: "campos", rotulo: "Campos", Icone: TextCursorInput },
  { valor: "etiquetas", rotulo: "Etiquetas", Icone: Tags },
  { valor: "produtos", rotulo: "Produtos", Icone: Package },
  { valor: "motivos", rotulo: "Motivos de fechamento", Icone: Flag },
  { valor: "regras", rotulo: "Automação por palavras", Icone: Zap },
];

const TIPOS_DE_CAMPO = {
  texto: "Texto", inteiro: "Número inteiro", decimal: "Número decimal",
  booleano: "Sim ou não", data: "Data", datahora: "Data e hora",
};

const CORES = ["#437EE5", "#0EA5E9", "#16A34A", "#A15C07", "#C2410C", "#B42318", "#7C3AED", "#DB2777", "#475569"];

export default function CrmAjustes({ cliente }) {
  const [config, setConfig] = useState(null);
  const [secao, setSecao] = useState("funis");
  const [editando, setEditando] = useState(null);
  const [erro, setErro] = useState("");

  const carregar = useCallback(async () => {
    try {
      setConfig(await chamar(`painel-crm?cliente=${cliente.id}&ver=config`));
      setErro("");
    } catch (e) {
      setErro(e.message);
    }
  }, [cliente.id]);
  useEffect(() => { setConfig(null); carregar(); }, [carregar]);

  async function apagar(tipo, item) {
    if (!window.confirm(`Apagar "${item.nome}"?`)) return;
    try {
      await chamar(`painel-crm?cliente=${cliente.id}`, {
        method: "POST",
        body: tipo === "funis" ? { acao: "apagar-funil", id: item.id } : { acao: "apagar", tipo, id: item.id },
      });
      carregar();
    } catch (e) {
      setErro(e.message);
    }
  }

  const atual = SECOES.find((s) => s.valor === secao);
  const lista = config ? config[secao] : [];

  return (
    <>
      <CabecalhoPagina
        titulo="Configurações do CRM"
        resumo={config ? `${config.funis.length} ${config.funis.length === 1 ? "funil" : "funis"}, ${config.produtos.length} produtos, ${config.campos.length} campos` : "Carregando…"}
      />

      {erro && <div className="aviso erro" role="alert">{erro}</div>}

      <div className="crm-barra">
        <Segmentos rotulo="Seções" valor={secao} aoMudar={(v) => { setSecao(v); setEditando(null); }} opcoes={SECOES} />
      </div>

      {config && (
        <div className="cartao ajustes-cartao">
          <header className="ajustes-topo">
            <div>
              <h2>{atual.rotulo}</h2>
              <p>{EXPLICA[secao]}</p>
            </div>
            <button type="button" className="btn" onClick={() => setEditando({ novo: true })}>
              <Plus size={15} /> {NOVO[secao]}
            </button>
          </header>

          {lista.length === 0 ? (
            <Vazio Icone={atual.Icone} titulo={`Nenhum item em ${atual.rotulo.toLowerCase()}.`} texto="Crie o primeiro no botão acima." />
          ) : (
            <ul className="ajustes-lista">
              {lista.map((item) => (
                <li key={item.id}>
                  <Linha secao={secao} item={item} config={config} />
                  <div className="ajustes-acoes">
                    <button type="button" className="icone-botao" aria-label={`Editar ${item.nome}`} onClick={() => setEditando(item)}>
                      <Pencil size={15} />
                    </button>
                    <button type="button" className="icone-botao perigo" aria-label={`Apagar ${item.nome}`} onClick={() => apagar(secao, item)}>
                      <Trash2 size={15} />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {config && secao === "motivos" && <HistoricoFechamentos cliente={cliente} config={config} />}

      {editando && secao === "funis" && (
        <EditorFunil
          cliente={cliente} config={config} funil={editando.novo ? null : editando}
          aoFechar={() => setEditando(null)} aoSalvar={() => { setEditando(null); carregar(); }}
        />
      )}
      {editando && secao !== "funis" && (
        <EditorCadastro
          cliente={cliente} config={config} tipo={secao} item={editando.novo ? null : editando}
          aoFechar={() => setEditando(null)} aoSalvar={() => { setEditando(null); carregar(); }}
        />
      )}
    </>
  );
}

const EXPLICA = {
  funis: "Cada funil é uma sequência de etapas. Um cliente pode ter mais de um, como Vendas e Pós-venda.",
  origens: "De onde o lead veio. Aparece no negócio e serve de filtro no kanban.",
  campos: "Informações próprias do seu negócio, preenchidas em cada negócio.",
  etiquetas: "Etiquetas com cor. As que a IA e o disparo já usam continuam valendo; aqui elas ganham cor.",
  produtos: "O que você vende. No negócio, a soma dos produtos vira o valor.",
  motivos: "Por que se ganha e por que se perde. É pedido ao mover para Ganho ou Perdido.",
  regras: "Quando a mensagem do lead tem uma das palavras, o negócio dele vai para a etapa escolhida.",
};

const NOVO = {
  funis: "Novo funil", origens: "Nova origem", campos: "Novo campo", etiquetas: "Nova etiqueta",
  produtos: "Novo produto", motivos: "Novo motivo", regras: "Nova regra",
};

function Linha({ secao, item, config }) {
  if (secao === "funis") {
    return (
      <div className="ajustes-linha">
        <strong>{item.nome} {item.entrada_automatica && <Ficha texto="recebe as conversas" cor="#16A34A" />}</strong>
        <div className="etapas-mini">
          {item.etapas.map((e) => <span key={e.id} className="etapa-ponto"><i style={{ background: e.cor }} />{e.nome}</span>)}
        </div>
      </div>
    );
  }
  if (secao === "produtos") {
    return (
      <div className="ajustes-linha">
        <strong>{item.nome} {!item.ativo && <Ficha texto="inativo" />}</strong>
        <small>
          {dinheiro(item.valor)}{item.descricao ? ` · ${item.descricao}` : ""}
          {item.responsavel_id ? ` · dono: ${config.atendentes.find((a) => a.id === item.responsavel_id)?.nome || "removido"}` : " · sem dono"}
          {item.formularios?.length ? ` · formulários: ${item.formularios.join(", ")}` : ""}
        </small>
      </div>
    );
  }
  if (secao === "campos") {
    return (
      <div className="ajustes-linha">
        <strong>{item.nome} {item.obrigatorio && <Ficha texto="obrigatório" />} {!item.ativo && <Ficha texto="inativo" />}</strong>
        <small>{TIPOS_DE_CAMPO[item.tipo]} · chave {item.chave}</small>
      </div>
    );
  }
  if (secao === "etiquetas") {
    return <div className="ajustes-linha"><Ficha texto={item.nome} cor={item.cor} /></div>;
  }
  if (secao === "motivos") {
    return (
      <div className="ajustes-linha">
        <strong>{item.nome} {!item.ativo && <Ficha texto="inativo" />}</strong>
        <small>{item.tipo === "ganho" ? "Motivo de ganho" : "Motivo de perda"}</small>
      </div>
    );
  }
  if (secao === "regras") {
    const funil = config.funis.find((f) => f.id === item.funil_id);
    const etapa = funil?.etapas.find((e) => e.id === item.etapa_id);
    return (
      <div className="ajustes-linha">
        <strong>{item.nome} {!item.ativo && <Ficha texto="desligada" />}</strong>
        <small>“{(item.palavras || []).join("”, “")}” → {funil?.nome || "funil apagado"} / {etapa?.nome || "etapa apagada"}</small>
      </div>
    );
  }
  return (
    <div className="ajustes-linha">
      <strong>{item.nome} {item.ativo === false && <Ficha texto="inativo" />}</strong>
    </div>
  );
}

/** Criar ou editar um funil e as etapas dele. Exportado para o kanban vazio. */
export function EditorFunil({ cliente, config, funil, aoFechar, aoSalvar }) {
  const [nome, setNome] = useState(funil?.nome || "Vendas");
  // O primeiro funil do cliente já nasce recebendo as conversas.
  const [entrada, setEntrada] = useState(funil ? !!funil.entrada_automatica : config.funis.length === 0);
  const [etapas, setEtapas] = useState(() => (funil?.etapas?.length
    ? funil.etapas.map((e) => ({ ...e }))
    : (config.modelo || []).map((e) => ({ ...e }))));
  const [erro, setErro] = useState("");
  const [salvando, setSalvando] = useState(false);

  function mudar(i, mudanca) { setEtapas(etapas.map((e, j) => (j === i ? { ...e, ...mudanca } : e))); }
  function trocar(i, j) {
    if (j < 0 || j >= etapas.length) return;
    const nova = [...etapas];
    [nova[i], nova[j]] = [nova[j], nova[i]];
    setEtapas(nova);
  }

  async function salvar() {
    setSalvando(true); setErro("");
    try {
      await chamar(`painel-crm?cliente=${cliente.id}`, {
        method: "POST", body: { acao: "salvar-funil", dados: { id: funil?.id, nome, etapas, entrada_automatica: entrada } },
      });
      aoSalvar();
    } catch (e) {
      setErro(e.message);
      setSalvando(false);
    }
  }

  return (
    <Modal
      titulo={funil ? "Editar funil" : "Novo funil"} aoFechar={aoFechar} largura={620}
      rodape={(
        <>
          <button type="button" className="btn secundario" onClick={aoFechar}>Cancelar</button>
          <button type="button" className="btn" disabled={salvando} onClick={salvar}>{salvando ? "Salvando…" : "Salvar funil →"}</button>
        </>
      )}
    >
      {erro && <div className="aviso erro" role="alert">{erro}</div>}
      <label className="campo">
        <span>Nome do funil</span>
        <input type="text" value={nome} onChange={(e) => setNome(e.target.value)} autoFocus />
      </label>

      <label className="check">
        <input type="checkbox" checked={entrada} onChange={(e) => setEntrada(e.target.checked)} />
        Toda pessoa que falar no WhatsApp ou no Instagram entra neste funil, na primeira etapa
      </label>

      <div className="campo">
        <span>Etapas, na ordem</span>
        <p className="nota" style={{ margin: "0 0 6px" }}>
          O campo de dias é o limite de tempo parado na etapa. Passando dele, o
          negócio aparece como atrasado no quadro e na tela de parados. Em
          branco, a etapa não tem limite.
        </p>
        <ul className="editor-etapas">
          {etapas.map((e, i) => (
            <li key={e.id || i}>
              <input type="color" aria-label="Cor" value={e.cor} onChange={(ev) => mudar(i, { cor: ev.target.value })} />
              <input type="text" aria-label="Nome da etapa" value={e.nome} onChange={(ev) => mudar(i, { nome: ev.target.value })} />
              <select aria-label="Tipo" value={e.tipo} onChange={(ev) => mudar(i, { tipo: ev.target.value })}>
                <option value="aberta">Em andamento</option>
                <option value="ganho">Ganho</option>
                <option value="perdido">Perdido</option>
              </select>
              <input
                type="number" min={1} step={1} className="estreito"
                aria-label="Limite de dias nesta etapa" placeholder="dias"
                title="Depois de quantos dias parado nesta etapa o negócio conta como atrasado. Em branco, a etapa não tem limite."
                value={e.limite_dias ?? ""}
                onChange={(ev) => mudar(i, { limite_dias: ev.target.value })}
              />
              <button type="button" className="icone-botao" aria-label="Subir" onClick={() => trocar(i, i - 1)}><ArrowUp size={15} /></button>
              <button type="button" className="icone-botao" aria-label="Descer" onClick={() => trocar(i, i + 1)}><ArrowDown size={15} /></button>
              <button type="button" className="icone-botao perigo" aria-label="Tirar etapa"
                onClick={() => setEtapas(etapas.filter((_, j) => j !== i))}><Trash2 size={15} /></button>
            </li>
          ))}
        </ul>
        <button type="button" className="btn secundario pequeno" style={{ alignSelf: "flex-start" }}
          onClick={() => setEtapas([...etapas.filter((e) => e.tipo === "aberta"),
            { nome: "", cor: CORES[etapas.length % CORES.length], tipo: "aberta", limite_dias: "" },
            ...etapas.filter((e) => e.tipo !== "aberta")])}>
          <Plus size={14} /> Adicionar etapa
        </button>
      </div>
    </Modal>
  );
}

function EditorCadastro({ cliente, config, tipo, item, aoFechar, aoSalvar }) {
  const [f, setF] = useState(() => item ? {
    ...item,
    valor: item.valor !== undefined ? Number(item.valor).toFixed(2).replace(".", ",") : undefined,
    palavras: item.palavras ? item.palavras.join(", ") : undefined,
    formularios: item.formularios ? item.formularios.join(", ") : "",
    herospark_ids: item.herospark_ids ? item.herospark_ids.join(", ") : "",
  } : {
    formularios: "", herospark_ids: "", responsavel_id: "", funil_id: "",
    nome: "", ativo: true, tipo: tipo === "campos" ? "texto" : tipo === "motivos" ? "perdido" : undefined,
    cor: tipo === "etiquetas" ? CORES[config.etiquetas.length % CORES.length] : undefined,
    valor: tipo === "produtos" ? "" : undefined, descricao: "", obrigatorio: false,
    palavras: "", funil_id: config.funis[0]?.id || "", etapa_id: config.funis[0]?.etapas[0]?.id || "",
  });
  const [erro, setErro] = useState("");
  const [salvando, setSalvando] = useState(false);
  const pega = (c) => (e) => setF({ ...f, [c]: e.target.type === "checkbox" ? e.target.checked : e.target.value });
  const funil = config.funis.find((x) => x.id === f.funil_id);

  async function salvar() {
    setSalvando(true); setErro("");
    const dados = { id: item?.id, nome: f.nome };
    if (["origens", "motivos", "produtos", "campos", "regras"].includes(tipo)) dados.ativo = !!f.ativo;
    if (tipo === "motivos") dados.tipo = f.tipo;
    if (tipo === "produtos") {
      Object.assign(dados, {
        valor: f.valor, descricao: f.descricao || null,
        responsavel_id: f.responsavel_id || "", funil_id: f.funil_id || "",
        formularios: f.formularios || "", herospark_ids: f.herospark_ids || "",
      });
    }
    if (tipo === "campos") Object.assign(dados, { tipo: f.tipo, obrigatorio: !!f.obrigatorio });
    if (tipo === "etiquetas") dados.cor = f.cor;
    if (tipo === "regras") Object.assign(dados, { palavras: f.palavras, funil_id: f.funil_id, etapa_id: f.etapa_id });
    try {
      await chamar(`painel-crm?cliente=${cliente.id}`, { method: "POST", body: { acao: "salvar", tipo, dados } });
      aoSalvar();
    } catch (e) {
      setErro(e.message);
      setSalvando(false);
    }
  }

  return (
    <Modal
      titulo={`${item ? "Editar" : NOVO[tipo]}`} aoFechar={aoFechar}
      rodape={(
        <>
          <button type="button" className="btn secundario" onClick={aoFechar}>Cancelar</button>
          <button type="button" className="btn" disabled={salvando} onClick={salvar}>{salvando ? "Salvando…" : "Salvar →"}</button>
        </>
      )}
    >
      {erro && <div className="aviso erro" role="alert">{erro}</div>}
      <div className="grade-campos">
        <label className="campo largo">
          <span>Nome</span>
          <input type="text" value={f.nome} onChange={pega("nome")} autoFocus />
        </label>

        {tipo === "motivos" && (
          <label className="campo largo">
            <span>Tipo</span>
            <select value={f.tipo} onChange={pega("tipo")}>
              <option value="perdido">Motivo de perda</option>
              <option value="ganho">Motivo de ganho</option>
            </select>
          </label>
        )}

        {tipo === "produtos" && (
          <>
            <label className="campo">
              <span>Valor (R$)</span>
              <input type="text" inputMode="decimal" value={f.valor} onChange={pega("valor")} placeholder="0,00" />
            </label>
            <label className="campo">
              <span>Descrição</span>
              <input type="text" value={f.descricao || ""} onChange={pega("descricao")} placeholder="opcional" />
            </label>
            <label className="campo">
              <span>Dono do produto</span>
              <select value={f.responsavel_id || ""} onChange={pega("responsavel_id")}>
                <option value="">Ninguém (lead fica sem responsável)</option>
                {config.atendentes.map((a) => <option key={a.id} value={a.id}>{a.nome}</option>)}
              </select>
            </label>
            <label className="campo">
              <span>Funil do lead</span>
              <select value={f.funil_id || ""} onChange={pega("funil_id")}>
                <option value="">O de entrada automática</option>
                {config.funis.map((x) => <option key={x.id} value={x.id}>{x.nome}</option>)}
              </select>
            </label>
            <label className="campo largo">
              <span>Formulários do site que vendem este produto</span>
              <input type="text" value={f.formularios || ""} onChange={pega("formularios")}
                     placeholder="momento-ugc, diagnostico-social-media" />
            </label>
            <label className="campo largo">
              <span>Ids do produto na HeroSpark</span>
              <input type="text" value={f.herospark_ids || ""} onChange={pega("herospark_ids")}
                     placeholder="opcional: liga a venda da HeroSpark a este produto" />
            </label>
          </>
        )}

        {tipo === "campos" && (
          <label className="campo largo">
            <span>Tipo do campo</span>
            <select value={f.tipo} onChange={pega("tipo")}>
              {Object.entries(TIPOS_DE_CAMPO).map(([v, r]) => <option key={v} value={v}>{r}</option>)}
            </select>
          </label>
        )}

        {tipo === "etiquetas" && (
          <div className="campo largo">
            <span>Cor</span>
            <div className="cores">
              {CORES.map((c) => (
                <button key={c} type="button" className={`cor ${f.cor === c ? "ativa" : ""}`} style={{ background: c }}
                  aria-label={`Cor ${c}`} onClick={() => setF({ ...f, cor: c })} />
              ))}
            </div>
          </div>
        )}

        {tipo === "regras" && (
          <>
            <label className="campo largo">
              <span>Palavras ou frases, separadas por vírgula</span>
              <textarea rows={2} value={f.palavras} onChange={pega("palavras")} placeholder="orçamento, quanto custa, preço" />
            </label>
            <label className="campo">
              <span>Funil</span>
              <select value={f.funil_id} onChange={(e) => {
                const novo = config.funis.find((x) => x.id === e.target.value);
                setF({ ...f, funil_id: e.target.value, etapa_id: novo?.etapas[0]?.id || "" });
              }}>
                {config.funis.map((x) => <option key={x.id} value={x.id}>{x.nome}</option>)}
              </select>
            </label>
            <label className="campo">
              <span>Mover para a etapa</span>
              <select value={f.etapa_id} onChange={pega("etapa_id")}>
                {(funil?.etapas || []).map((e) => <option key={e.id} value={e.id}>{e.nome}</option>)}
              </select>
            </label>
          </>
        )}
      </div>

      <div className="linha-checks">
        {tipo === "campos" && (
          <label className="check"><input type="checkbox" checked={!!f.obrigatorio} onChange={pega("obrigatorio")} /> Obrigatório</label>
        )}
        {["origens", "motivos", "produtos", "campos", "regras"].includes(tipo) && (
          <label className="check"><input type="checkbox" checked={!!f.ativo} onChange={pega("ativo")} /> {tipo === "regras" ? "Ligada" : "Ativo"}</label>
        )}
      </div>

      {tipo === "regras" && config.funis.length === 0 && (
        <p className="nota">Crie um funil antes de criar uma regra.</p>
      )}
      {tipo === "regras" && (
        <p className="nota">Vale para mensagens de texto que chegam pelo WhatsApp. Se o lead ainda não tem negócio neste funil, ele é criado na etapa escolhida.</p>
      )}
    </Modal>
  );
}

function HistoricoFechamentos({ cliente, config }) {
  const [historico, setHistorico] = useState(null);
  useEffect(() => {
    chamar(`painel-crm?cliente=${cliente.id}&ver=fechamentos`)
      .then((d) => setHistorico(d.historico || []))
      .catch(() => setHistorico([]));
  }, [cliente.id]);

  return (
    <div className="cartao ajustes-cartao" style={{ marginTop: 16 }}>
      <header className="ajustes-topo">
        <div>
          <h2>Histórico de fechamentos</h2>
          <p>Os últimos negócios ganhos e perdidos, com o motivo escolhido.</p>
        </div>
      </header>
      {historico === null ? <div className="vazio">Carregando…</div> : historico.length === 0 ? (
        <Vazio Icone={Flag} titulo="Nenhum fechamento ainda." texto="Quando um negócio for para Ganho ou Perdido, ele aparece aqui." />
      ) : (
        <table className="tabela-nova">
          <thead><tr><th>Quando</th><th>Negócio</th><th>Resultado</th><th>Motivo</th><th>Quem</th></tr></thead>
          <tbody>
            {historico.map((h) => (
              <tr key={h.id}>
                <td className="mono">{dataHora(h.criado_em)}</td>
                <td><strong>{h.crm_negocios?.titulo || "apagado"}</strong>{h.crm_negocios && <small>{dinheiro(h.crm_negocios.valor)}</small>}</td>
                <td><Ficha texto={h.tipo === "ganho" ? "ganho" : "perdido"} cor={h.tipo === "ganho" ? "#16A34A" : "#B42318"} /></td>
                <td>{[config.motivos.find((m) => m.id === h.detalhe?.motivo_id)?.nome, h.detalhe?.motivo].filter(Boolean).join(" · ") || <span className="apagado">sem motivo</span>}</td>
                <td>{h.quem || ""}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
