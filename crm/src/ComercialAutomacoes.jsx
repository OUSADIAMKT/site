// Automações e IA do comercial.
//
// Duas telas que mexem no comportamento da plataforma para a empresa inteira,
// e por isso só o operador e o gestor entram (o servidor confere de novo).
//
// Dois avisos que a tela repete porque eles são o contrato do módulo:
//
// 1. Nenhuma automação manda mensagem para ninguém. A ação "enviar mensagem"
//    existe, fica gravada na execução, e para aí: a janela de 24 horas do
//    WhatsApp e o template recusado pela Meta são decisões de quem opera, não
//    de uma regra que roda sozinha de madrugada.
// 2. A IA começa com tudo desligado. Classificar, pontuar e sugerir são
//    leitura; mover negócio sozinha e criar negócio sozinha são escrita, e
//    escrita só liga por decisão de quem é dono da conta.

import { useCallback, useEffect, useState } from "react";
import { Plus, Trash2, Workflow, Bot, Check, X } from "lucide-react";
import { chamar } from "./api.js";
import { dataHora, haQuanto, Ficha, Vazio, Modal } from "./crmComum.jsx";

const NOME_GATILHO = {
  contato_novo: "Contato novo",
  negocio_novo: "Negócio novo",
  etapa_mudou: "Mudou de etapa",
  etiqueta_mudou: "Mudou de etiqueta",
  responsavel_mudou: "Mudou de responsável",
  sem_interacao: "Ficou sem interação",
  tarefa_vencida: "Tarefa venceu",
  venda_ganha: "Venda ganha",
  venda_perdida: "Venda perdida",
  score_atingido: "Score atingiu o mínimo",
};

const NOME_ACAO = {
  criar_tarefa: "Criar tarefa",
  notificar: "Anotar aviso no negócio",
  adicionar_etiqueta: "Pôr etiqueta",
  remover_etiqueta: "Tirar etiqueta",
  atualizar_campo: "Mudar um campo",
  mover_etapa: "Mover de etapa",
  enviar_mensagem: "Enviar mensagem (só fica registrada)",
};

const CAMPOS_EDITAVEIS = [
  { valor: "prioridade", rotulo: "Prioridade" },
  { valor: "previsao_em", rotulo: "Previsão de fechamento" },
  { valor: "valor", rotulo: "Valor" },
  { valor: "score", rotulo: "Score" },
  { valor: "responsavel_id", rotulo: "Responsável" },
  { valor: "observacoes", rotulo: "Observações" },
];

// Os gatilhos de relógio rodam pela fila de tarefas do servidor
// (api/_fila_tarefas.js), a cada 5 minutos. A tela avisa o atraso, para
// ninguém esperar reação no mesmo segundo.
const SEM_DISPARO = {
  contato_novo: "Roda a cada 5 minutos, para contatos criados nas últimas 24 horas.",
  sem_interacao: "Roda a cada 5 minutos, para negócios abertos parados há tantos dias quanto o campo abaixo (3, se vazio).",
  tarefa_vencida: "Roda a cada 5 minutos, para tarefas abertas que venceram nos últimos 7 dias.",
};

/** As condições em português, não em chave de banco. */
function descreverCondicoes(condicoes, config) {
  const etapas = config.funis.flatMap((f) => f.etapas);
  return Object.entries(condicoes).map(([chave, valor]) => {
    if (chave === "etapa_id") return `só na etapa "${etapas.find((e) => e.id === valor)?.nome || "apagada"}"`;
    if (chave === "etapa_anterior") return `só saindo de "${etapas.find((e) => e.id === valor)?.nome || "apagada"}"`;
    if (chave === "prioridade") return `só prioridade ${valor}`;
    if (chave === "score_minimo") return `só score ${valor} ou mais`;
    if (chave === "dias_sem_interacao") return `parado há ${valor} dias ou mais`;
    if (chave === "responsavel_id") return `só de ${config.atendentes.find((a) => a.id === valor)?.nome || "pessoa removida"}`;
    return `${chave}=${valor}`;
  }).join(" · ");
}

export default function Automacoes({ cliente, config }) {
  const [d, setD] = useState(null);
  const [erro, setErro] = useState("");
  const [editando, setEditando] = useState(null);

  const carregar = useCallback(async () => {
    try {
      setD(await chamar(`painel-crm?cliente=${cliente.id}&ver=automacoes`));
      setErro("");
    } catch (e) {
      setErro(e.message);
    }
  }, [cliente.id]);

  useEffect(() => { setD(null); carregar(); }, [carregar]);

  async function apagar(a) {
    if (!window.confirm(`Apagar a automação "${a.nome}"? O histórico de execuções dela sai junto.`)) return;
    try {
      await chamar(`painel-crm?cliente=${cliente.id}`, { method: "POST", body: { acao: "apagar-automacao", id: a.id } });
      carregar();
    } catch (e) {
      setErro(e.message);
    }
  }

  async function ligar(a, ativo) {
    try {
      await chamar(`painel-crm?cliente=${cliente.id}`, {
        method: "POST",
        body: { acao: "salvar-automacao", dados: { ...a, ativo } },
      });
      carregar();
    } catch (e) {
      setErro(e.message);
    }
  }

  if (!d) return <div className="vazio">{erro ? <span className="aviso erro">{erro}</span> : "Carregando…"}</div>;

  return (
    <>
      <div className="aviso">
        Automação não manda mensagem. A ação de enviar existe, fica registrada na
        execução e não sai da plataforma: mensagem para cliente sai de quem
        atende, dentro da janela de 24 horas do WhatsApp.
      </div>

      {erro && <div className="aviso erro" role="alert">{erro}</div>}

      <div className="crm-barra">
        <button type="button" className="btn" onClick={() => setEditando({ novo: true })}>
          <Plus size={15} /> Nova automação
        </button>
      </div>

      {d.automacoes.length === 0 ? (
        <div className="cartao">
          <Vazio
            Icone={Workflow}
            titulo="Nenhuma automação"
            texto="Uma automação é um gatilho mais uma lista de ações: quando o negócio muda de etapa, criar uma tarefa; quando a venda é ganha, pôr uma etiqueta. Ela nunca fala com o cliente."
          />
        </div>
      ) : (
        <div className="cartao tabela-cartao">
          <table className="tabela-nova">
            <thead>
              <tr><th>Automação</th><th>Quando</th><th>Faz o que</th><th>Estado</th><th /></tr>
            </thead>
            <tbody>
              {d.automacoes.map((a) => (
                <tr key={a.id}>
                  <td><strong>{a.nome}</strong></td>
                  <td>
                    {NOME_GATILHO[a.gatilho] || a.gatilho}
                    {SEM_DISPARO[a.gatilho] && <small style={{ color: "var(--alerta)" }}>{SEM_DISPARO[a.gatilho]}</small>}
                    {Object.keys(a.condicoes || {}).length > 0 && (
                      <small>{descreverCondicoes(a.condicoes, config)}</small>
                    )}
                  </td>
                  <td>
                    <div className="negocio-fichas">
                      {(a.acoes || []).map((x, i) => <Ficha key={i} texto={NOME_ACAO[x.tipo] || x.tipo} />)}
                    </div>
                  </td>
                  <td>
                    <label className="caixa-marcar">
                      <input type="checkbox" checked={!!a.ativo} onChange={(e) => ligar(a, e.target.checked)} />
                      <span>{a.ativo ? "ligada" : "desligada"}</span>
                    </label>
                  </td>
                  <td className="num">
                    <button type="button" className="so-texto" onClick={() => setEditando(a)}>editar</button>
                    <button type="button" className="so-texto perigo" onClick={() => apagar(a)}>apagar</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="cartao">
        <h2 className="bloco-titulo">Últimas execuções</h2>
        {d.execucoes.length === 0 ? (
          <p className="nota" style={{ margin: 0 }}>Nenhuma automação rodou ainda.</p>
        ) : (
          <ul className="lista-tarefas">
            {d.execucoes.map((x) => (
              <li key={x.id} className={x.erro ? "vencida" : ""}>
                <span className="negocio-tempo">{x.erro ? <X size={15} /> : <Check size={15} />}</span>
                <div>
                  <strong>{x.crm_automacoes?.nome || "automação apagada"}</strong>
                  <small>
                    {NOME_GATILHO[x.crm_automacoes?.gatilho] || x.crm_automacoes?.gatilho || "gatilho"} · {dataHora(x.criado_em)}
                    {x.profundidade > 0 ? ` · em cadeia (nível ${x.profundidade})` : ""}
                  </small>
                  {x.erro && <p className="nota">{x.erro}</p>}
                  {!x.erro && (x.resultado?.acoes || []).length > 0 && (
                    <small>{x.resultado.acoes.map(rotuloFeito).join(", ")}</small>
                  )}
                  {!x.erro && !(x.resultado?.acoes || []).length && (
                    <small>nenhuma ação se aplicou a este alvo</small>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {editando && (
        <EditorAutomacao
          cliente={cliente} config={config}
          automacao={editando.novo ? null : editando}
          gatilhos={d.gatilhos} acoesPossiveis={d.acoes}
          aoFechar={() => setEditando(null)}
          aoSalvar={() => { setEditando(null); carregar(); }}
        />
      )}
    </>
  );
}

function EditorAutomacao({ cliente, config, automacao, gatilhos, acoesPossiveis, aoFechar, aoSalvar }) {
  const etapas = config.funis.flatMap((f) => f.etapas.map((e) => ({ ...e, funil: f.nome })));
  const [f, setF] = useState(() => ({
    nome: automacao?.nome || "",
    gatilho: automacao?.gatilho || "negocio_novo",
    ativo: automacao?.ativo !== false,
    condicoes: automacao?.condicoes || {},
    acoes: automacao?.acoes?.length ? automacao.acoes.map((a) => ({ ...a })) : [{ tipo: "criar_tarefa", titulo: "" }],
  }));
  const [erro, setErro] = useState("");
  const [salvando, setSalvando] = useState(false);

  function mudarAcao(i, mudanca) {
    setF({ ...f, acoes: f.acoes.map((a, j) => (j === i ? { ...a, ...mudanca } : a)) });
  }

  function mudarCondicao(chave, valor) {
    const c = { ...f.condicoes };
    if (valor === "" || valor === null) delete c[chave];
    else c[chave] = valor;
    setF({ ...f, condicoes: c });
  }

  async function salvar() {
    setSalvando(true); setErro("");
    try {
      await chamar(`painel-crm?cliente=${cliente.id}`, {
        method: "POST",
        body: { acao: "salvar-automacao", dados: { ...f, id: automacao?.id } },
      });
      aoSalvar();
    } catch (e) {
      setErro(e.message);
      setSalvando(false);
    }
  }

  return (
    <Modal
      titulo={automacao ? "Editar automação" : "Nova automação"} aoFechar={aoFechar} largura={680}
      rodape={(
        <>
          <button type="button" className="btn secundario" onClick={aoFechar}>Cancelar</button>
          <button type="button" className="btn" disabled={salvando} onClick={salvar}>
            {salvando ? "Salvando…" : "Salvar automação →"}
          </button>
        </>
      )}
    >
      {erro && <div className="aviso erro" role="alert">{erro}</div>}

      <div className="grade-campos">
        <label className="campo largo">
          <span>Nome</span>
          <input type="text" value={f.nome} onChange={(e) => setF({ ...f, nome: e.target.value })}
                 placeholder="Ex.: ganhou, marcar pós-venda" autoFocus />
        </label>
        <label className="campo">
          <span>Quando acontecer</span>
          <select value={f.gatilho} onChange={(e) => setF({ ...f, gatilho: e.target.value })}>
            {(gatilhos || Object.keys(NOME_GATILHO)).map((g) => (
              <option key={g} value={g}>{NOME_GATILHO[g] || g}</option>
            ))}
          </select>
        </label>
        <label className="campo">
          <span>Estado</span>
          <select value={f.ativo ? "1" : "0"} onChange={(e) => setF({ ...f, ativo: e.target.value === "1" })}>
            <option value="1">Ligada</option>
            <option value="0">Desligada</option>
          </select>
        </label>
      </div>

      {SEM_DISPARO[f.gatilho] && (
        <div className="aviso atencao">
          {SEM_DISPARO[f.gatilho]}
        </div>
      )}

      <div className="grade-campos">
        <label className="campo">
          <span>Só se a etapa for</span>
          <select value={f.condicoes.etapa_id || ""} onChange={(e) => mudarCondicao("etapa_id", e.target.value)}>
            <option value="">Qualquer etapa</option>
            {etapas.map((e) => <option key={e.id} value={e.id}>{e.funil}: {e.nome}</option>)}
          </select>
        </label>
        {/* Entrada e saída são o mesmo gatilho visto dos dois lados: a etapa
            acima é para onde o negócio foi, esta é de onde ele saiu. O motor já
            manda as duas no contexto do `etapa_mudou`; faltava a tela deixar
            escolher. Só serve a esse gatilho, e some nos outros para não
            prometer um recorte que nunca bateria. */}
        {f.gatilho === "etapa_mudou" && (
          <label className="campo">
            <span>Só se saiu da etapa</span>
            <select value={f.condicoes.etapa_anterior || ""} onChange={(e) => mudarCondicao("etapa_anterior", e.target.value)}>
              <option value="">Qualquer etapa</option>
              {etapas.map((e) => <option key={e.id} value={e.id}>{e.funil}: {e.nome}</option>)}
            </select>
          </label>
        )}
        <label className="campo">
          <span>Só se a prioridade for</span>
          <select value={f.condicoes.prioridade || ""} onChange={(e) => mudarCondicao("prioridade", e.target.value)}>
            <option value="">Qualquer prioridade</option>
            <option value="baixa">Baixa</option>
            <option value="normal">Normal</option>
            <option value="alta">Alta</option>
            <option value="urgente">Urgente</option>
          </select>
        </label>
        {f.gatilho === "sem_interacao" && (
          <label className="campo">
            <span>Parado há pelo menos (dias)</span>
            <input type="number" min={1} max={365} value={f.condicoes.dias_sem_interacao || ""}
                   onChange={(e) => mudarCondicao("dias_sem_interacao", e.target.value)} placeholder="3" />
          </label>
        )}
        <label className="campo">
          <span>Só se o score for pelo menos</span>
          <input type="number" min={0} max={100} value={f.condicoes.score_minimo || ""}
                 onChange={(e) => mudarCondicao("score_minimo", e.target.value)} placeholder="qualquer" />
        </label>
      </div>

      <div className="campo">
        <span>Fazer o que</span>
        <div className="produtos-lista">
          {f.acoes.map((a, i) => (
            <div className="acao-linha" key={i}>
              <select aria-label="Tipo de ação" value={a.tipo} onChange={(e) => mudarAcao(i, { tipo: e.target.value })}>
                {(acoesPossiveis || Object.keys(NOME_ACAO)).map((t) => (
                  <option key={t} value={t}>{NOME_ACAO[t] || t}</option>
                ))}
              </select>

              {a.tipo === "criar_tarefa" && (
                <>
                  <input type="text" aria-label="Título da tarefa" placeholder="Título da tarefa"
                         value={a.titulo || ""} onChange={(e) => mudarAcao(i, { titulo: e.target.value })} />
                  <input type="number" min={0} aria-label="Vence em quantos dias" placeholder="dias"
                         value={a.dias_para_vencer || ""} onChange={(e) => mudarAcao(i, { dias_para_vencer: e.target.value })} />
                </>
              )}

              {(a.tipo === "adicionar_etiqueta" || a.tipo === "remover_etiqueta") && (
                <input type="text" aria-label="Etiqueta" placeholder="etiqueta"
                       value={a.etiqueta || ""} onChange={(e) => mudarAcao(i, { etiqueta: e.target.value })} />
              )}

              {a.tipo === "atualizar_campo" && (
                <>
                  <select aria-label="Campo" value={a.campo || ""} onChange={(e) => mudarAcao(i, { campo: e.target.value })}>
                    <option value="">Escolha o campo</option>
                    {CAMPOS_EDITAVEIS.map((c) => <option key={c.valor} value={c.valor}>{c.rotulo}</option>)}
                  </select>
                  <input type="text" aria-label="Valor" placeholder="valor"
                         value={a.valor || ""} onChange={(e) => mudarAcao(i, { valor: e.target.value })} />
                </>
              )}

              {a.tipo === "mover_etapa" && (
                <select aria-label="Etapa de destino" value={a.etapa_id || ""} onChange={(e) => mudarAcao(i, { etapa_id: e.target.value })}>
                  <option value="">Escolha a etapa</option>
                  {etapas.map((e) => <option key={e.id} value={e.id}>{e.funil}: {e.nome}</option>)}
                </select>
              )}

              {(a.tipo === "notificar" || a.tipo === "enviar_mensagem") && (
                <input type="text" aria-label="Texto" placeholder="texto"
                       value={a.texto || ""} onChange={(e) => mudarAcao(i, { texto: e.target.value })} />
              )}

              <button type="button" className="icone-botao perigo" aria-label="Tirar ação"
                      onClick={() => setF({ ...f, acoes: f.acoes.filter((_, j) => j !== i) })}>
                <Trash2 size={15} />
              </button>
            </div>
          ))}
          <button type="button" className="btn secundario pequeno" style={{ alignSelf: "flex-start" }}
                  disabled={f.acoes.length >= 10}
                  onClick={() => setF({ ...f, acoes: [...f.acoes, { tipo: "criar_tarefa", titulo: "" }] })}>
            <Plus size={14} /> Adicionar ação
          </button>
        </div>
      </div>

      {f.acoes.some((a) => a.tipo === "enviar_mensagem") && (
        <div className="aviso atencao">
          A ação de enviar mensagem fica registrada na execução e não sai da
          plataforma. Nenhuma mensagem chega ao cliente por automação.
        </div>
      )}

      {f.acoes.some((a) => a.tipo === "mover_etapa") && (
        <p className="nota">
          Mover de etapa dispara o gatilho de mudança de etapa outra vez. A
          plataforma para na terceira volta, mas duas automações que se movem
          uma para a outra fazem o cartão andar sozinho: confira o destino.
        </p>
      )}
    </Modal>
  );
}

// ---------------------------------------------------------------------------
// IA do comercial

const INTERRUPTORES = [
  { chave: "classificar", titulo: "Classificar o lead", texto: "A IA propõe uma etiqueta a partir do que a pessoa escreveu. Só propõe." },
  { chave: "pontuar", titulo: "Dar score", texto: "A IA propõe uma nota de 0 a 100 para o interesse do lead. Só propõe." },
  { chave: "resumir", titulo: "Resumir a conversa", texto: "A IA escreve um resumo do que foi conversado, para quem assume não precisar ler tudo." },
  { chave: "sugerir_acao", titulo: "Sugerir a próxima ação", texto: "A IA propõe o que fazer em seguida com o lead." },
  { chave: "sugerir_etapa", titulo: "Sugerir a etapa", texto: "A IA propõe mover o negócio para outra etapa. Quem move é gente." },
  {
    chave: "mover_sozinha",
    titulo: "Deixar a IA mover o negócio",
    texto: "A IA aplica a etapa que ela mesma sugeriu, sem passar por ninguém. Precisa de sugerir a etapa ligado.",
    escrita: true,
  },
  {
    chave: "criar_negocio",
    titulo: "Deixar a IA criar negócio",
    texto: "A IA abre um negócio no funil quando entende que a conversa virou oportunidade.",
    escrita: true,
  },
];

const NOME_SUGESTAO = {
  classificacao: "Etiqueta",
  score: "Score",
  resumo: "Resumo",
  proxima_acao: "Próxima ação",
  etapa: "Etapa",
  interesse: "Interesse",
  negocio: "Negócio",
};

export function PainelIa({ cliente, config, aoAbrirNegocio }) {
  const [d, setD] = useState(null);
  const [erro, setErro] = useState("");
  const [ocupado, setOcupado] = useState(false);

  const carregar = useCallback(async () => {
    try {
      setD(await chamar(`painel-crm?cliente=${cliente.id}&ver=ia`));
      setErro("");
    } catch (e) {
      setErro(e.message);
    }
  }, [cliente.id]);

  useEffect(() => { setD(null); carregar(); }, [carregar]);

  async function trocar(chave, valor) {
    setOcupado(true); setErro("");
    try {
      const dados = { [chave]: valor };
      // Desligar a sugestão de etapa desliga o mover sozinha junto: o servidor
      // já faz isso, e a tela diz na hora em vez de deixar a pessoa descobrir
      // depois de recarregar.
      if (chave === "sugerir_etapa" && !valor) dados.mover_sozinha = false;
      await chamar(`painel-crm?cliente=${cliente.id}`, { method: "POST", body: { acao: "salvar-ia", dados } });
      await carregar();
    } catch (e) {
      setErro(e.message);
    } finally {
      setOcupado(false);
    }
  }

  async function responder(s, aplicar) {
    setOcupado(true); setErro("");
    try {
      await chamar(`painel-crm?cliente=${cliente.id}`, {
        method: "POST",
        body: { acao: aplicar ? "aplicar-sugestao" : "descartar-sugestao", id: s.id },
      });
      await carregar();
    } catch (e) {
      setErro(e.message);
    } finally {
      setOcupado(false);
    }
  }

  if (!d) return <div className="vazio">{erro ? <span className="aviso erro">{erro}</span> : "Carregando…"}</div>;

  const pendentes = d.sugestoes.filter((s) => !s.aplicada);

  return (
    <>
      <div className="aviso">
        Por padrão a IA não move nada e não manda nada. Ela lê, propõe, e a
        proposta espera alguém aqui. Os dois interruptores de escrita começam
        desligados e só a empresa liga.
      </div>

      {erro && <div className="aviso erro" role="alert">{erro}</div>}

      <div className="cartao">
        <h2 className="bloco-titulo">O que a IA pode fazer no comercial</h2>
        <ul className="lista-interruptores">
          {INTERRUPTORES.map((i) => {
            const travado = i.chave === "mover_sozinha" && !d.config.sugerir_etapa;
            return (
              <li key={i.chave} className={i.escrita ? "escrita" : ""}>
                <div>
                  <strong>{i.titulo}{i.escrita && <Ficha texto="escreve" cor="#A15C07" />}</strong>
                  <p className="nota">{i.texto}</p>
                  {travado && <p className="nota">Ligue "Sugerir a etapa" primeiro.</p>}
                </div>
                <label className="caixa-marcar">
                  <input
                    type="checkbox" checked={!!d.config[i.chave]} disabled={ocupado || travado}
                    onChange={(e) => trocar(i.chave, e.target.checked)}
                  />
                  <span>{d.config[i.chave] ? "ligado" : "desligado"}</span>
                </label>
              </li>
            );
          })}
        </ul>
      </div>

      <div className="cartao">
        <h2 className="bloco-titulo">
          Propostas da IA {pendentes.length > 0 && <span className="kanban-conta">{pendentes.length}</span>}
        </h2>
        {d.sugestoes.length === 0 ? (
          <Vazio
            Icone={Bot}
            titulo="Nenhuma proposta"
            texto="Quando os interruptores de leitura estiverem ligados e a IA tiver algo a propor sobre um negócio, a proposta aparece aqui esperando resposta."
          />
        ) : (
          <ul className="lista-tarefas">
            {d.sugestoes.map((s) => (
              <li key={s.id}>
                <span className="negocio-tempo">{s.aplicada ? <Check size={15} /> : <Bot size={15} />}</span>
                <div>
                  <strong>
                    {NOME_SUGESTAO[s.tipo] || s.tipo}
                    {s.crm_negocios?.titulo && (
                      <>
                        {" · "}
                        <button type="button" className="so-texto" onClick={() => aoAbrirNegocio?.(s.crm_negocios.id)}>
                          {s.crm_negocios.titulo}
                        </button>
                      </>
                    )}
                  </strong>
                  <p className="nota">{descreverSugestao(s, config)}</p>
                  <small>
                    {haQuanto(s.criado_em)}
                    {s.aplicada ? ` · aplicada${s.aplicada_por ? ` por ${s.aplicada_por}` : ""}` : ""}
                  </small>
                </div>
                {!s.aplicada && (
                  <span className="acoes">
                    <button type="button" className="btn pequeno" disabled={ocupado} onClick={() => responder(s, true)}>
                      Aplicar
                    </button>
                    <button type="button" className="so-texto perigo" disabled={ocupado} onClick={() => responder(s, false)}>
                      descartar
                    </button>
                  </span>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  );
}

/** "enviar_mensagem:registrado" em português. */
function rotuloFeito(t) {
  if (t === "enviar_mensagem:registrado") return "mensagem só registrada, não enviada";
  return NOME_ACAO[t] || t;
}

/** A proposta em português, não em JSON. */
function descreverSugestao(s, config) {
  const v = s.sugestao || {};
  if (s.tipo === "score") return `Pôr o score em ${v.score ?? "?"}.`;
  if (s.tipo === "classificacao") return `Pôr a etiqueta "${v.etiqueta || "?"}".`;
  if (s.tipo === "etapa") {
    const nome = config.funis.flatMap((f) => f.etapas).find((e) => e.id === v.etapa_id)?.nome;
    return `Mover para "${nome || "etapa que não existe mais"}".`;
  }
  if (v.texto) return v.texto;
  return JSON.stringify(v);
}
