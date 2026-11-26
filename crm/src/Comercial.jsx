// Comercial: os números do funil, o que está marcado para fazer e o que
// parou de andar.
//
// Três coisas que o quadro não mostra bem. O quadro responde "onde está cada
// negócio"; esta tela responde "como vai o mês", "o que eu tenho para hoje" e
// "o que está encalhado".
//
// Uma regra atravessa o arquivo inteiro: receita registrada e valor em
// negociação nunca aparecem no mesmo número. O primeiro é dinheiro que alguém
// digitou como fechado; o segundo é previsão de negócio aberto. Somar os dois
// dá um total que parece caixa e não é.

import { useCallback, useEffect, useMemo, useState } from "react";
import { Gauge, ListChecks, TimerOff, Check, Workflow, Bot } from "lucide-react";
import { chamar } from "./api.js";
import {
  dinheiro, dataHora, haQuanto, Ficha, Segmentos, Vazio,
  PRIORIDADES, prioridadeDe,
} from "./crmComum.jsx";
import { TIPOS_TAREFA, rotuloTipoTarefa } from "./Negocio.jsx";
import { PainelNegocio } from "./Negocio.jsx";
import Automacoes, { PainelIa } from "./ComercialAutomacoes.jsx";
import CabecalhoPagina from "./CabecalhoPagina.jsx";

const PERIODOS = [
  { valor: "7", rotulo: "7 dias" },
  { valor: "30", rotulo: "30 dias" },
  { valor: "90", rotulo: "90 dias" },
  { valor: "365", rotulo: "1 ano" },
];

export default function Comercial({ cliente, podeConfigurar }) {
  const [config, setConfig] = useState(null);
  // A aba pode vir na URL (?painel=parados). Serve para mandar um link
  // direto para a tela que interessa, e é como a prévia tira as capturas.
  const [aba, setAba] = useState(
    () => new URLSearchParams(location.search).get("painel") || "indicadores");
  const [erro, setErro] = useState("");
  const [negocioAberto, setNegocioAberto] = useState(null);
  const [recarga, setRecarga] = useState(0);

  useEffect(() => {
    setConfig(null); setErro("");
    chamar(`painel-crm?cliente=${cliente.id}&ver=config`)
      .then(setConfig)
      .catch((e) => setErro(e.message));
  }, [cliente.id]);

  const abas = [
    { valor: "indicadores", rotulo: "Indicadores", Icone: Gauge },
    { valor: "tarefas", rotulo: "A fazer", Icone: ListChecks },
    { valor: "parados", rotulo: "Parados", Icone: TimerOff },
    ...(podeConfigurar ? [
      { valor: "automacoes", rotulo: "Automações", Icone: Workflow },
      { valor: "ia", rotulo: "IA", Icone: Bot },
    ] : []),
  ];

  if (!config) {
    return (
      <>
        <CabecalhoPagina titulo="Como vai o funil" resumo={erro ? "" : "Carregando…"} />
        {erro && <div className="aviso erro" role="alert">{erro}</div>}
      </>
    );
  }

  if (!config.funis.length) {
    return (
      <>
        <CabecalhoPagina titulo="Como vai o funil" resumo="Nenhum funil criado ainda." />
        <div className="cartao" style={{ marginTop: 22 }}>
          <Vazio
            Icone={Workflow}
            titulo="Sem funil não há número"
            texto="Os indicadores saem dos negócios, e negócio precisa de etapa. Crie o funil na tela Funil de vendas."
          />
        </div>
      </>
    );
  }

  return (
    <>
      <CabecalhoPagina
        titulo="Como vai o funil"
        acoes={<Segmentos rotulo="Parte" valor={aba} aoMudar={setAba} opcoes={abas} />}
      />

      {erro && <div className="aviso erro" role="alert">{erro}</div>}

      {aba === "indicadores" && <Indicadores cliente={cliente} config={config} />}
      {aba === "tarefas" && <Tarefas cliente={cliente} config={config} chave={recarga} aoAbrirNegocio={setNegocioAberto} />}
      {aba === "parados" && <Parados cliente={cliente} config={config} chave={recarga} aoAbrirNegocio={setNegocioAberto} />}
      {aba === "automacoes" && podeConfigurar && <Automacoes cliente={cliente} config={config} />}
      {aba === "ia" && podeConfigurar && <PainelIa cliente={cliente} config={config} aoAbrirNegocio={setNegocioAberto} />}

      {negocioAberto && (
        <PainelNegocio
          cliente={cliente} config={config} negocioId={negocioAberto}
          aoFechar={() => setNegocioAberto(null)}
          aoMudar={() => setRecarga((n) => n + 1)}
        />
      )}
    </>
  );
}

// ---------------------------------------------------------------------------
// Indicadores

function Indicadores({ cliente, config }) {
  const [d, setD] = useState(null);
  const [erro, setErro] = useState("");
  const [f, setF] = useState({ dias: "30", funil: "", responsavel: "" });

  useEffect(() => {
    setD(null); setErro("");
    const p = new URLSearchParams({ cliente: cliente.id, ver: "indicadores", dias: f.dias });
    if (f.funil) p.set("funil", f.funil);
    if (f.responsavel) p.set("responsavel", f.responsavel);
    chamar(`painel-crm?${p}`).then(setD).catch((e) => setErro(e.message));
  }, [cliente.id, f.dias, f.funil, f.responsavel]);

  const etapas = useMemo(() => new Map(config.funis.flatMap((x) => x.etapas).map((e) => [e.id, e.nome])), [config]);
  const nomes = useMemo(() => ({
    etapa: (id) => etapas.get(id) || (id === "nenhum" ? "sem etapa" : "etapa apagada"),
    pessoa: (id) => (id === "nenhum" ? "sem responsável" : config.atendentes.find((a) => a.id === id)?.nome || "pessoa removida"),
    origem: (id) => (id === "nenhum" ? "origem não informada" : config.origens.find((o) => o.id === id)?.nome || "origem apagada"),
    motivo: (id) => (id === "nenhum" ? "sem motivo registrado" : config.motivos.find((m) => m.id === id)?.nome || "motivo apagado"),
  }), [config, etapas]);

  return (
    <>
      <div className="crm-barra">
        <Segmentos rotulo="Período" valor={f.dias} aoMudar={(v) => setF({ ...f, dias: v })} opcoes={PERIODOS} />
        {config.funis.length > 1 && (
          <select aria-label="Funil" value={f.funil} onChange={(e) => setF({ ...f, funil: e.target.value })}>
            <option value="">Todos os funis</option>
            {config.funis.map((x) => <option key={x.id} value={x.id}>{x.nome}</option>)}
          </select>
        )}
        <select aria-label="Responsável" value={f.responsavel} onChange={(e) => setF({ ...f, responsavel: e.target.value })}>
          <option value="">Todos os responsáveis</option>
          {config.atendentes.map((a) => <option key={a.id} value={a.id}>{a.nome}</option>)}
        </select>
      </div>

      {erro && <div className="aviso erro" role="alert">{erro}</div>}
      {!d && !erro && <div className="vazio">Carregando…</div>}

      {d && (
        <>
          <p className="nota" style={{ marginTop: 0 }}>
            Negócios criados nos últimos {d.periodo.dias} dias. Receita é o valor
            que alguém registrou no fechamento; valor em negociação é previsão de
            negócio aberto. São números diferentes e não se somam.
          </p>

          <div className="placar">
            <Numero titulo="Leads no período" valor={d.total_leads} />
            <Numero titulo="Em andamento" valor={d.abertos} />
            <Numero titulo="Ganhos" valor={d.ganhos} />
            <Numero titulo="Perdidos" valor={d.perdidos} />
            <Numero
              titulo="Conversão"
              valor={d.conversao === null ? "sem dado" : `${d.conversao}%`}
              nota={d.conversao === null ? "nenhum negócio fechado ainda" : `${d.ganhos} de ${d.ganhos + d.perdidos} fechados`}
            />
            <Numero
              titulo="Receita registrada"
              valor={dinheiro(d.receita)}
              nota={d.ganhos_sem_valor
                ? `${d.ganhos_sem_valor} ${d.ganhos_sem_valor === 1 ? "ganho sem valor" : "ganhos sem valor"} registrado`
                : "todos os ganhos têm valor"}
              alerta={d.ganhos_sem_valor > 0}
            />
            <Numero titulo="Em negociação" valor={dinheiro(d.em_negociacao)} nota="previsão dos negócios abertos" />
            <Numero
              titulo="Ticket médio"
              valor={d.ticket_medio === null ? "sem dado" : dinheiro(d.ticket_medio)}
              nota="só os ganhos com valor registrado"
            />
            <Numero
              titulo="Dias para fechar"
              valor={d.dias_para_fechar === null ? "sem dado" : String(d.dias_para_fechar)}
              nota="média do que foi ganho no período"
            />
            <Numero titulo="Atrasados" valor={d.atrasados} nota="previsão de fechamento vencida" alerta={d.atrasados > 0} />
          </div>

          <div className="grade-blocos">
            <Contagem titulo="Onde estão os abertos" itens={d.por_etapa} nome={nomes.etapa} />
            <Contagem titulo="Por responsável" itens={d.por_responsavel} nome={nomes.pessoa} />
            <Contagem titulo="Por origem" itens={d.por_origem} nome={nomes.origem} />
            <Contagem titulo="Motivos de perda" itens={d.motivos_de_perda} nome={nomes.motivo} />
          </div>
        </>
      )}
    </>
  );
}

function Numero({ titulo, valor, nota, alerta }) {
  return (
    <div className={`placar-item ${alerta ? "alerta" : ""}`}>
      <span className="placar-titulo">{titulo}</span>
      <strong className="placar-valor">{valor}</strong>
      {nota && <small className="placar-nota">{nota}</small>}
    </div>
  );
}

function Contagem({ titulo, itens, nome }) {
  const total = itens.reduce((s, x) => s + x.quantos, 0);
  return (
    <div className="cartao">
      <h2 className="bloco-titulo">{titulo}</h2>
      {itens.length === 0 ? (
        <p className="nota" style={{ margin: 0 }}>Nada no período.</p>
      ) : (
        <ul className="barras">
          {itens.map((x) => (
            <li key={x.id}>
              <span className="barra-nome">{nome(x.id)}</span>
              <span className="barra-trilho"><i style={{ width: `${total ? (x.quantos / total) * 100 : 0}%` }} /></span>
              <span className="barra-conta mono">{x.quantos}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// A fazer

function Tarefas({ cliente, config, chave, aoAbrirNegocio }) {
  const [lista, setLista] = useState(null);
  const [erro, setErro] = useState("");
  const [f, setF] = useState({ responsavel: "", concluidas: "" });
  const [ocupado, setOcupado] = useState(false);

  const carregar = useCallback(async () => {
    try {
      const p = new URLSearchParams({ cliente: cliente.id, ver: "tarefas" });
      if (f.responsavel) p.set("responsavel", f.responsavel);
      if (f.concluidas) p.set("concluidas", "1");
      const d = await chamar(`painel-crm?${p}`);
      setLista(d.tarefas || []);
      setErro("");
    } catch (e) {
      setErro(e.message);
      setLista([]);
    }
  }, [cliente.id, f.responsavel, f.concluidas]);

  useEffect(() => { setLista(null); carregar(); }, [carregar, chave]);

  async function concluir(t, feita) {
    setOcupado(true);
    try {
      await chamar(`painel-crm?cliente=${cliente.id}`, {
        method: "POST", body: { acao: "concluir-tarefa", id: t.id, concluida: feita },
      });
      await carregar();
    } catch (e) {
      setErro(e.message);
    } finally {
      setOcupado(false);
    }
  }

  const agora = Date.now();
  const grupos = useMemo(() => {
    const vazio = { vencidas: [], hoje: [], proximas: [], semData: [], feitas: [] };
    if (!lista) return vazio;
    const fimDoDia = new Date(); fimDoDia.setHours(23, 59, 59, 999);
    for (const t of lista) {
      if (t.concluida_em) { vazio.feitas.push(t); continue; }
      if (!t.vence_em) { vazio.semData.push(t); continue; }
      const q = new Date(t.vence_em).getTime();
      if (q < agora) vazio.vencidas.push(t);
      else if (q <= fimDoDia.getTime()) vazio.hoje.push(t);
      else vazio.proximas.push(t);
    }
    return vazio;
  }, [lista, agora]);

  return (
    <>
      <div className="crm-barra">
        <select aria-label="Responsável" value={f.responsavel} onChange={(e) => setF({ ...f, responsavel: e.target.value })}>
          <option value="">Todo mundo</option>
          <option value="nenhum">Sem responsável</option>
          {config.atendentes.map((a) => <option key={a.id} value={a.id}>{a.nome}</option>)}
        </select>
        <label className="caixa-marcar">
          <input type="checkbox" checked={f.concluidas === "1"}
                 onChange={(e) => setF({ ...f, concluidas: e.target.checked ? "1" : "" })} />
          <span>Mostrar as feitas</span>
        </label>
      </div>

      {erro && <div className="aviso erro" role="alert">{erro}</div>}
      {!lista && <div className="vazio">Carregando…</div>}

      {lista && lista.length === 0 && (
        <div className="cartao">
          <Vazio
            Icone={ListChecks}
            titulo="Nada marcado"
            texto="Tarefa nasce dentro do negócio, na aba Atividades, ou de uma automação. Aqui ficam todas juntas, na ordem de vencimento."
          />
        </div>
      )}

      {lista && lista.length > 0 && (
        <div className="grade-blocos">
          <GrupoTarefas titulo="Atrasadas" itens={grupos.vencidas} tom="erro" {...{ ocupado, concluir, aoAbrirNegocio }} />
          <GrupoTarefas titulo="Para hoje" itens={grupos.hoje} tom="alerta" {...{ ocupado, concluir, aoAbrirNegocio }} />
          <GrupoTarefas titulo="Mais adiante" itens={grupos.proximas} {...{ ocupado, concluir, aoAbrirNegocio }} />
          <GrupoTarefas titulo="Sem prazo" itens={grupos.semData} {...{ ocupado, concluir, aoAbrirNegocio }} />
          {f.concluidas === "1" && (
            <GrupoTarefas titulo="Feitas" itens={grupos.feitas} feitas {...{ ocupado, concluir, aoAbrirNegocio }} />
          )}
        </div>
      )}
    </>
  );
}

function GrupoTarefas({ titulo, itens, tom, feitas, ocupado, concluir, aoAbrirNegocio }) {
  if (!itens.length) return null;
  return (
    <div className="cartao">
      <h2 className="bloco-titulo">{titulo} <span className="kanban-conta">{itens.length}</span></h2>
      <ul className="lista-tarefas">
        {itens.map((t) => (
          <li key={t.id} className={tom === "erro" ? "vencida" : ""}>
            <button type="button" className="icone-botao" disabled={ocupado}
                    title={feitas ? "Reabrir" : "Marcar como feita"}
                    aria-label={feitas ? "Reabrir tarefa" : "Marcar como feita"}
                    onClick={() => concluir(t, !feitas)}>
              <Check size={15} />
            </button>
            <div>
              <strong>{t.titulo}</strong>
              <small>
                {rotuloTipoTarefa(t.tipo)}
                {t.vence_em ? ` · ${dataHora(t.vence_em)}` : " · sem prazo"}
                {t.atendentes?.nome ? ` · ${t.atendentes.nome}` : " · ninguém"}
                {feitas && t.concluida_em ? ` · feita ${haQuanto(t.concluida_em)}` : ""}
              </small>
              {t.crm_negocios?.titulo && (
                <button type="button" className="so-texto" onClick={() => aoAbrirNegocio(t.crm_negocios.id)}>
                  {t.crm_negocios.titulo}
                </button>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Parados

function Parados({ cliente, config, chave, aoAbrirNegocio }) {
  const [lista, setLista] = useState(null);
  const [erro, setErro] = useState("");
  const [f, setF] = useState({ funil: "", responsavel: "", dias_parado: "" });

  useEffect(() => {
    setLista(null); setErro("");
    const p = new URLSearchParams({ cliente: cliente.id, ver: "parados" });
    for (const [k, v] of Object.entries(f)) if (v) p.set(k, v);
    chamar(`painel-crm?${p}`)
      .then((d) => setLista(d.negocios || []))
      .catch((e) => { setErro(e.message); setLista([]); });
  }, [cliente.id, f.funil, f.responsavel, f.dias_parado, chave]);

  const etapas = useMemo(() => new Map(config.funis.flatMap((x) => x.etapas).map((e) => [e.id, e])), [config]);

  return (
    <>
      <div className="crm-barra">
        {config.funis.length > 1 && (
          <select aria-label="Funil" value={f.funil} onChange={(e) => setF({ ...f, funil: e.target.value })}>
            <option value="">Todos os funis</option>
            {config.funis.map((x) => <option key={x.id} value={x.id}>{x.nome}</option>)}
          </select>
        )}
        <select aria-label="Responsável" value={f.responsavel} onChange={(e) => setF({ ...f, responsavel: e.target.value })}>
          <option value="">Todos os responsáveis</option>
          {config.atendentes.map((a) => <option key={a.id} value={a.id}>{a.nome}</option>)}
        </select>
        <select aria-label="Limite para etapas sem limite próprio"
                value={f.dias_parado} onChange={(e) => setF({ ...f, dias_parado: e.target.value })}>
          <option value="">Só etapas com limite configurado</option>
          <option value="3">Tratar sem limite como 3 dias</option>
          <option value="7">Tratar sem limite como 7 dias</option>
          <option value="15">Tratar sem limite como 15 dias</option>
          <option value="30">Tratar sem limite como 30 dias</option>
        </select>
      </div>

      {erro && <div className="aviso erro" role="alert">{erro}</div>}
      {!lista && <div className="vazio">Carregando…</div>}

      {lista && lista.length === 0 && (
        <div className="cartao">
          <Vazio
            Icone={TimerOff}
            titulo="Nada encalhado"
            texto="Entram aqui os negócios abertos com previsão de fechamento vencida, ou parados na etapa além do limite dela. Etapa sem limite configurado não acusa atraso, e o filtro acima deixa você experimentar um limite sem mexer na configuração."
          />
        </div>
      )}

      {lista && lista.length > 0 && (
        <div className="cartao tabela-cartao">
          <table className="tabela-nova">
            <thead>
              <tr>
                <th>Negócio</th><th>Etapa</th><th>Prioridade</th><th>Responsável</th>
                <th className="num">Parado</th><th>Por que entrou</th>
              </tr>
            </thead>
            <tbody>
              {lista.map((n) => {
                const e = etapas.get(n.etapa_id);
                const p = prioridadeDe(n.prioridade);
                return (
                  <tr key={n.id} tabIndex={0} onClick={() => aoAbrirNegocio(n.id)}
                      onKeyDown={(ev) => { if (ev.key === "Enter") aoAbrirNegocio(n.id); }}>
                    <td><strong>{n.titulo}</strong><small>{dinheiro(n.valor)}</small></td>
                    <td><span className="etapa-ponto"><i style={{ background: e?.cor }} />{e?.nome || "etapa apagada"}</span></td>
                    <td><Ficha texto={p.rotulo.toLowerCase()} cor={n.prioridade && n.prioridade !== "normal" ? p.cor : undefined} /></td>
                    <td>{n.atendentes?.nome || <span className="apagado">ninguém</span>}</td>
                    <td className="num mono">{n.dias_parado} {n.dias_parado === 1 ? "dia" : "dias"}</td>
                    <td>
                      {n.venceu && <Ficha texto="previsão vencida" cor="#B42318" />}
                      {n.parado && <Ficha texto={`limite de ${n.limite_dias} dias`} cor="#A15C07" />}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

export { PERIODOS, TIPOS_TAREFA, PRIORIDADES };
