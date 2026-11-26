// A ficha do negócio: o formulário (novo ou edição) e o painel lateral que
// abre ao clicar num cartão do kanban, com Dados, Conversa e Histórico.

import { useEffect, useMemo, useState } from "react";
import { Plus, Trash2, MessageSquareText, History, FileText, CheckSquare, Check } from "lucide-react";
import { chamar } from "./api.js";
import Conversa from "./Conversa.jsx";
import {
  dinheiro, dataHora, telefoneBonito, corDaEtiqueta, Segmentos, Painel, Ficha,
  PRIORIDADES, prioridadeDe, atrasoDe, haQuanto,
} from "./crmComum.jsx";

const ROTULO_HISTORICO = {
  criado: "Negócio criado",
  etapa: "Mudou de etapa",
  ganho: "Marcado como ganho",
  perdido: "Marcado como perdido",
  valor: "Valor alterado",
  tarefa: "Tarefa criada",
  automacao: "Automação rodou",
};

export const TIPOS_TAREFA = [
  { valor: "tarefa", rotulo: "Tarefa" },
  { valor: "ligacao", rotulo: "Ligação" },
  { valor: "mensagem", rotulo: "Mensagem" },
  { valor: "reuniao", rotulo: "Reunião" },
  { valor: "proposta", rotulo: "Proposta" },
  { valor: "visita", rotulo: "Visita" },
];

export function rotuloTipoTarefa(v) {
  return TIPOS_TAREFA.find((t) => t.valor === v)?.rotulo || "Tarefa";
}

/** "2026-11-24T13:40:00Z" -> "2026-11-24T10:40", que é o que o input aceita. */
function paraCampoData(iso) {
  if (!iso) return "";
  const dt = new Date(iso);
  if (Number.isNaN(dt.getTime())) return "";
  const p = (n) => String(n).padStart(2, "0");
  return `${dt.getFullYear()}-${p(dt.getMonth() + 1)}-${p(dt.getDate())}T${p(dt.getHours())}:${p(dt.getMinutes())}`;
}

function vazio(config, etapaId) {
  const funil = config.funis[0];
  return {
    titulo: "", telefone: "", email: "",
    etapa_id: etapaId || funil?.etapas.find((e) => e.tipo === "aberta")?.id || funil?.etapas[0]?.id || "",
    valor: "", responsavel_id: "", origem_id: "",
    etiquetas: [], campos: {}, produtos: [], observacoes: "",
    motivo_id: "", motivo_texto: "",
    prioridade: "normal", previsao_em: "", score: "", valor_fechado: "",
  };
}

function doNegocio(n, produtos = []) {
  return {
    titulo: n.titulo || "", telefone: n.telefone ? telefoneBonito(n.telefone) : "", email: n.email || "",
    etapa_id: n.etapa_id, valor: n.valor ? decimal(n.valor) : "",
    responsavel_id: n.responsavel_id || "", origem_id: n.origem_id || "",
    etiquetas: n.etiquetas || [], campos: n.campos || {},
    produtos: produtos.map((p) => ({
      produto_id: p.produto_id || "", nome: p.nome,
      quantidade: String(Number(p.quantidade)), valor_unitario: decimal(p.valor_unitario),
    })),
    observacoes: n.observacoes || "",
    motivo_id: n.motivo_id || "", motivo_texto: n.motivo_texto || "",
    prioridade: n.prioridade || "normal",
    previsao_em: n.previsao_em ? String(n.previsao_em).slice(0, 10) : "",
    score: n.score === null || n.score === undefined ? "" : String(n.score),
    valor_fechado: n.valor_fechado === null || n.valor_fechado === undefined ? "" : decimal(n.valor_fechado),
  };
}

// 189.9 vira "189,90": é assim que a pessoa lê e digita dinheiro.
function decimal(v) {
  return Number(v || 0).toFixed(2).replace(".", ",");
}

function num(v) {
  const s = String(v ?? "").trim();
  const n = Number((s.includes(",") ? s.replace(/\./g, "").replace(",", ".") : s).replace(/[^\d.-]/g, ""));
  return Number.isFinite(n) ? n : 0;
}

/**
 * O formulário do negócio. `inicial` é o estado já pronto (novo ou edição).
 * Devolve os dados no formato que a API espera.
 */
export function FormNegocio({ config, valor: f, aoMudar, compacto = false }) {
  const etapaAtual = config.funis.flatMap((x) => x.etapas).find((e) => e.id === f.etapa_id);
  const funilAtual = config.funis.find((x) => x.id === etapaAtual?.funil_id) || config.funis[0];
  const campos = config.campos.filter((c) => c.ativo);
  const etiquetasConhecidas = useMemo(
    () => [...new Set([...config.etiquetas.map((e) => e.nome), ...f.etiquetas])].sort(),
    [config.etiquetas, f.etiquetas],
  );
  const [novaEtiqueta, setNovaEtiqueta] = useState("");
  const pega = (campo) => (e) => aoMudar({ ...f, [campo]: e.target.value });
  const totalProdutos = f.produtos.reduce((s, p) => s + num(p.quantidade || 1) * num(p.valor_unitario), 0);
  const fechando = etapaAtual && etapaAtual.tipo !== "aberta";
  const motivos = config.motivos.filter((m) => m.ativo && m.tipo === (etapaAtual?.tipo === "ganho" ? "ganho" : "perdido"));

  function trocarEtiqueta(nome) {
    const tem = f.etiquetas.includes(nome);
    aoMudar({ ...f, etiquetas: tem ? f.etiquetas.filter((e) => e !== nome) : [...f.etiquetas, nome] });
  }

  function mudarProduto(i, mudanca) {
    const lista = f.produtos.map((p, j) => (j === i ? { ...p, ...mudanca } : p));
    aoMudar({ ...f, produtos: lista });
  }

  return (
    <div className={`form-negocio ${compacto ? "compacto" : ""}`}>
      <div className="grade-campos">
        <label className="campo largo">
          <span>Nome do negócio</span>
          <input type="text" value={f.titulo} onChange={pega("titulo")} placeholder="Ex.: Marina Alves, limpeza" autoFocus={!compacto} />
        </label>
        <label className="campo">
          <span>WhatsApp</span>
          <input type="tel" value={f.telefone} onChange={pega("telefone")} placeholder="(93) 99999-0000" />
        </label>
        <label className="campo">
          <span>E-mail</span>
          <input type="email" value={f.email} onChange={pega("email")} placeholder="opcional" />
        </label>

        <label className="campo">
          <span>Funil</span>
          <select
            value={funilAtual?.id || ""}
            onChange={(e) => {
              const novo = config.funis.find((x) => x.id === e.target.value);
              aoMudar({ ...f, etapa_id: novo?.etapas[0]?.id || "" });
            }}
          >
            {config.funis.map((x) => <option key={x.id} value={x.id}>{x.nome}</option>)}
          </select>
        </label>
        <label className="campo">
          <span>Etapa</span>
          <select value={f.etapa_id} onChange={pega("etapa_id")}>
            {(funilAtual?.etapas || []).map((e) => <option key={e.id} value={e.id}>{e.nome}</option>)}
          </select>
        </label>

        {fechando && (
          <>
            <label className="campo">
              <span>Motivo {etapaAtual.tipo === "ganho" ? "do ganho" : "da perda"}</span>
              <select value={f.motivo_id} onChange={pega("motivo_id")}>
                <option value="">Escolha</option>
                {motivos.map((m) => <option key={m.id} value={m.id}>{m.nome}</option>)}
              </select>
            </label>
            <label className="campo">
              <span>Detalhe do motivo</span>
              <input type="text" value={f.motivo_texto} onChange={pega("motivo_texto")} placeholder="opcional" />
            </label>
          </>
        )}

        <label className="campo">
          <span>Valor (R$)</span>
          {f.produtos.length > 0 ? (
            <input type="text" value={dinheiro(totalProdutos)} readOnly title="Soma dos produtos" />
          ) : (
            <input type="text" inputMode="decimal" value={f.valor} onChange={pega("valor")} placeholder="0,00" />
          )}
        </label>
        <label className="campo">
          <span>Responsável</span>
          <select value={f.responsavel_id} onChange={pega("responsavel_id")}>
            <option value="">Ninguém</option>
            {config.atendentes.map((a) => <option key={a.id} value={a.id}>{a.nome}</option>)}
          </select>
        </label>
        <label className="campo">
          <span>Origem do lead</span>
          <select value={f.origem_id} onChange={pega("origem_id")}>
            <option value="">Não informada</option>
            {config.origens.filter((o) => o.ativo || o.id === f.origem_id).map((o) => <option key={o.id} value={o.id}>{o.nome}</option>)}
          </select>
        </label>

        <label className="campo">
          <span>Prioridade</span>
          <select value={f.prioridade} onChange={pega("prioridade")}>
            {PRIORIDADES.map((p) => <option key={p.valor} value={p.valor}>{p.rotulo}</option>)}
          </select>
        </label>
        <label className="campo">
          <span>Previsão de fechamento</span>
          <input type="date" value={f.previsao_em} onChange={pega("previsao_em")} />
        </label>
        <label className="campo">
          <span>Score (0 a 100)</span>
          <input
            type="number" min={0} max={100} step={1} value={f.score}
            onChange={pega("score")} placeholder="em branco = sem score"
          />
        </label>

        {etapaAtual?.tipo === "ganho" && (
          <label className="campo">
            <span>Receita registrada (R$)</span>
            <input
              type="text" inputMode="decimal" value={f.valor_fechado} onChange={pega("valor_fechado")}
              placeholder="deixe em branco se ainda não sabe"
              title="Este é o número que entra na receita dos indicadores. Em branco, o negócio conta como ganho sem valor."
            />
          </label>
        )}
      </div>

      <div className="campo">
        <span>Etiquetas</span>
        <div className="fichas-escolha">
          {etiquetasConhecidas.map((nome) => (
            <button
              key={nome} type="button"
              className={`ficha-escolha ${f.etiquetas.includes(nome) ? "ativa" : ""}`}
              style={corDaEtiqueta(nome, config.etiquetas) ? { "--ficha-cor": corDaEtiqueta(nome, config.etiquetas) } : undefined}
              onClick={() => trocarEtiqueta(nome)}
            >
              <i aria-hidden="true" />{nome}
            </button>
          ))}
          <form
            className="ficha-nova"
            onSubmit={(e) => {
              e.preventDefault();
              const nome = novaEtiqueta.trim().toLowerCase();
              if (nome && !f.etiquetas.includes(nome)) aoMudar({ ...f, etiquetas: [...f.etiquetas, nome] });
              setNovaEtiqueta("");
            }}
          >
            <input type="text" value={novaEtiqueta} onChange={(e) => setNovaEtiqueta(e.target.value)} placeholder="+ etiqueta" />
          </form>
        </div>
      </div>

      {campos.length > 0 && (
        <div className="grade-campos">
          {campos.map((c) => (
            <CampoPersonalizado
              key={c.id} campo={c} valor={f.campos[c.chave]}
              aoMudar={(v) => aoMudar({ ...f, campos: { ...f.campos, [c.chave]: v } })}
            />
          ))}
        </div>
      )}

      <div className="campo">
        <span>Produtos</span>
        <div className="produtos-lista">
          {f.produtos.map((p, i) => (
            <div className="produto-linha" key={i}>
              <select
                value={p.produto_id}
                onChange={(e) => {
                  const prod = config.produtos.find((x) => x.id === e.target.value);
                  mudarProduto(i, prod
                    ? { produto_id: prod.id, nome: prod.nome, valor_unitario: decimal(prod.valor) }
                    : { produto_id: "" });
                }}
              >
                <option value="">Produto</option>
                {config.produtos.filter((x) => x.ativo || x.id === p.produto_id).map((x) => <option key={x.id} value={x.id}>{x.nome}</option>)}
              </select>
              <input type="text" inputMode="decimal" aria-label="Quantidade" value={p.quantidade}
                onChange={(e) => mudarProduto(i, { quantidade: e.target.value })} />
              <input type="text" inputMode="decimal" aria-label="Valor unitário" value={p.valor_unitario}
                onChange={(e) => mudarProduto(i, { valor_unitario: e.target.value })} />
              <span className="produto-total">{dinheiro(num(p.quantidade || 1) * num(p.valor_unitario))}</span>
              <button type="button" className="icone-botao" aria-label="Tirar produto"
                onClick={() => aoMudar({ ...f, produtos: f.produtos.filter((_, j) => j !== i) })}>
                <Trash2 size={15} />
              </button>
            </div>
          ))}
          {config.produtos.length === 0 && f.produtos.length === 0 ? (
            <p className="nota">Nenhum produto cadastrado. Cadastre em Configurações do CRM.</p>
          ) : (
            <button type="button" className="btn secundario pequeno" style={{ alignSelf: "flex-start" }}
              onClick={() => aoMudar({ ...f, produtos: [...f.produtos, { produto_id: "", nome: "", quantidade: "1", valor_unitario: "" }] })}>
              <Plus size={14} /> Adicionar produto
            </button>
          )}
        </div>
      </div>

      <label className="campo">
        <span>Observações</span>
        <textarea rows={compacto ? 2 : 3} value={f.observacoes} onChange={pega("observacoes")} placeholder="O que a equipe precisa saber deste negócio" />
      </label>
    </div>
  );
}

function CampoPersonalizado({ campo, valor, aoMudar }) {
  const rotulo = <span>{campo.nome}{campo.obrigatorio ? " *" : ""}</span>;
  if (campo.tipo === "booleano") {
    return (
      <label className="campo">
        {rotulo}
        <select value={valor === true ? "sim" : valor === false ? "nao" : ""}
          onChange={(e) => aoMudar(e.target.value === "" ? null : e.target.value === "sim")}>
          <option value="">Não informado</option>
          <option value="sim">Sim</option>
          <option value="nao">Não</option>
        </select>
      </label>
    );
  }
  const tipo = { inteiro: "number", decimal: "text", data: "date", datahora: "datetime-local" }[campo.tipo] || "text";
  return (
    <label className="campo">
      {rotulo}
      <input
        type={tipo} inputMode={campo.tipo === "decimal" ? "decimal" : undefined}
        step={campo.tipo === "inteiro" ? 1 : undefined}
        value={valor ?? ""} onChange={(e) => aoMudar(e.target.value)}
      />
    </label>
  );
}

/** O que vai para a API a partir do estado do formulário. */
export function paraApi(f, extra = {}) {
  const dados = {
    titulo: f.titulo, telefone: f.telefone, email: f.email, etapa_id: f.etapa_id,
    responsavel_id: f.responsavel_id || null, origem_id: f.origem_id || null,
    etiquetas: f.etiquetas, campos: f.campos, observacoes: f.observacoes,
    motivo_id: f.motivo_id || null, motivo_texto: f.motivo_texto,
    prioridade: f.prioridade || "normal",
    previsao_em: f.previsao_em || null,
    score: f.score === "" ? null : num(f.score),
    produtos: f.produtos.map((p) => ({ ...p, quantidade: num(p.quantidade || 1), valor_unitario: num(p.valor_unitario) })),
    ...extra,
  };
  // Com produto na lista o valor é a soma deles, e quem soma é o servidor.
  if (!f.produtos.length) dados.valor = num(f.valor);
  // Receita registrada só vai quando alguém digitou. Mandar 0 porque o campo
  // está vazio transformaria "ganho sem valor" em "venda de zero real".
  if (String(f.valor_fechado ?? "").trim() !== "") dados.valor_fechado = num(f.valor_fechado);
  return dados;
}

export function faltaObrigatorio(config, f) {
  if (!f.titulo.trim()) return "Dê um nome ao negócio.";
  if (!f.etapa_id) return "Escolha a etapa.";
  const falta = config.campos.find((c) => c.ativo && c.obrigatorio
    && (f.campos[c.chave] === undefined || f.campos[c.chave] === null || f.campos[c.chave] === ""));
  return falta ? `Preencha "${falta.nome}".` : "";
}

export function negocioVazio(config, etapaId, extra = {}) {
  return { ...vazio(config, etapaId), ...extra };
}

/** O painel do negócio aberto pelo kanban. */
export function PainelNegocio({ cliente, config, negocioId, aoFechar, aoMudar }) {
  const [visto, setVisto] = useState(null);
  const [f, setF] = useState(null);
  // Qual parte do negócio abre primeiro também pode vir na URL
  // (?negocio=<id>&parte=atividades), para o link cair direto no que interessa.
  const [aba, setAba] = useState(
    () => new URLSearchParams(location.search).get("parte") || "dados");
  const [erro, setErro] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [salvo, setSalvo] = useState(false);

  async function carregar() {
    try {
      const d = await chamar(`painel-crm?cliente=${cliente.id}&negocio=${negocioId}`);
      setVisto(d);
      setF(doNegocio(d.negocio, d.produtos));
    } catch (e) {
      setErro(e.message);
    }
  }
  useEffect(() => { carregar(); }, [negocioId]);

  async function salvar() {
    const falta = faltaObrigatorio(config, f);
    if (falta) { setErro(falta); return; }
    setSalvando(true); setErro(""); setSalvo(false);
    try {
      await chamar(`painel-crm?cliente=${cliente.id}`, {
        method: "POST", body: { acao: "salvar-negocio", dados: paraApi(f, { id: negocioId }) },
      });
      await carregar();
      aoMudar?.();
      setSalvo(true);
    } catch (e) {
      setErro(e.message);
    } finally {
      setSalvando(false);
    }
  }

  async function apagar() {
    if (!window.confirm("Apagar este negócio? O contato e a conversa continuam.")) return;
    try {
      await chamar(`painel-crm?cliente=${cliente.id}`, { method: "POST", body: { acao: "apagar-negocio", id: negocioId } });
      aoMudar?.();
      aoFechar();
    } catch (e) {
      setErro(e.message);
    }
  }

  const n = visto?.negocio;
  const etapas = config.funis.flatMap((x) => x.etapas);
  const etapa = etapas.find((e) => e.id === n?.etapa_id);
  const nomeEtapa = (id) => etapas.find((e) => e.id === id)?.nome || "etapa apagada";

  return (
    <Painel
      titulo={n?.titulo || "Negócio"}
      subtitulo={n
        ? [
          etapa?.nome,
          n.situacao === "ganho" && n.valor_fechado !== null && n.valor_fechado !== undefined
            ? `${dinheiro(n.valor_fechado)} fechado`
            : dinheiro(n.valor),
          n.prioridade && n.prioridade !== "normal" ? `prioridade ${prioridadeDe(n.prioridade).rotulo.toLowerCase()}` : null,
          atrasoDe(n, etapa)?.texto,
          n.telefone && telefoneBonito(n.telefone),
        ].filter(Boolean).join(" · ")
        : "Carregando…"}
      aoFechar={aoFechar}
      acoes={n && (
        <button type="button" className="icone-botao perigo" onClick={apagar} aria-label="Apagar negócio" title="Apagar negócio">
          <Trash2 size={17} />
        </button>
      )}
    >
      {!visto && !erro && <div className="vazio">Carregando…</div>}
      {erro && <div className="aviso erro" role="alert">{erro}</div>}

      {visto && (
        <>
          <Segmentos
            rotulo="Partes do negócio" valor={aba} aoMudar={setAba}
            opcoes={[
              { valor: "dados", rotulo: "Dados", Icone: FileText },
              { valor: "atividades", rotulo: "Atividades", Icone: CheckSquare,
                conta: (visto.tarefas || []).filter((t) => !t.concluida_em).length },
              { valor: "conversa", rotulo: "Conversa", Icone: MessageSquareText },
              { valor: "historico", rotulo: "Histórico", Icone: History, conta: visto.historico.length },
            ]}
          />

          {aba === "dados" && f && (
            <>
              <FormNegocio config={config} valor={f} aoMudar={(v) => { setF(v); setSalvo(false); }} />
              <div className="linha-acoes">
                {salvo && <span className="nota ok">Salvo.</span>}
                <button type="button" className="btn" disabled={salvando} onClick={salvar}>
                  {salvando ? "Salvando…" : "Salvar alterações"}
                </button>
              </div>
            </>
          )}

          {aba === "atividades" && (
            <Atividades
              cliente={cliente} config={config} negocioId={negocioId}
              tarefas={visto.tarefas || []} notas={visto.notas || []}
              aoMudar={async () => { await carregar(); aoMudar?.(); }}
            />
          )}

          {aba === "conversa" && (
            visto.conversa ? (
              <div className="painel-conversa">
                <Conversa conversaId={visto.conversa.id} aoMudar={aoMudar} />
              </div>
            ) : (
              <p className="nota">
                Nenhuma conversa ligada a este negócio. Quando a pessoa falar pelo WhatsApp com o
                número {n.telefone ? telefoneBonito(n.telefone) : "dela"}, a conversa aparece aqui.
              </p>
            )
          )}

          {aba === "historico" && (
            <ol className="linha-do-tempo">
              {visto.historico.map((h) => (
                <li key={h.id}>
                  <span className={`ponto-tempo ${h.tipo}`} aria-hidden="true" />
                  <div>
                    <strong>{ROTULO_HISTORICO[h.tipo] || h.tipo}</strong>
                    <p>
                      {h.tipo === "valor"
                        ? `${dinheiro(h.detalhe?.de)} para ${dinheiro(h.detalhe?.para)}`
                        : h.detalhe?.de
                          ? `${nomeEtapa(h.detalhe.de)} para ${h.detalhe.etapa || nomeEtapa(h.detalhe.para)}`
                          : h.detalhe?.etapa || ""}
                      {h.detalhe?.motivo ? ` · ${h.detalhe.motivo}` : ""}
                      {h.detalhe?.motivo_id ? ` · ${config.motivos.find((m) => m.id === h.detalhe.motivo_id)?.nome || ""}` : ""}
                    </p>
                    <small>{dataHora(h.criado_em)}{h.quem ? ` · ${h.quem}` : ""}</small>
                  </div>
                </li>
              ))}
              {visto.historico.length === 0 && <p className="nota">Nada registrado ainda.</p>}
            </ol>
          )}
        </>
      )}
    </Painel>
  );
}

// ---------------------------------------------------------------------------
// Atividades do negócio: tarefas e anotações, sem sair do painel.
//
// Tarefa é compromisso com data; anotação é registro do que aconteceu. São
// listas separadas de propósito: misturar as duas faria a agenda do dia
// mostrar coisa que já passou.

function Atividades({ cliente, config, negocioId, tarefas, notas, aoMudar }) {
  const [nova, setNova] = useState({ titulo: "", tipo: "tarefa", vence_em: "", responsavel_id: "", descricao: "" });
  const [nota, setNota] = useState("");
  const [erro, setErro] = useState("");
  const [ocupado, setOcupado] = useState(false);
  const [verConcluidas, setVerConcluidas] = useState(false);

  async function acao(corpo) {
    setOcupado(true); setErro("");
    try {
      await chamar(`painel-crm?cliente=${cliente.id}`, { method: "POST", body: corpo });
      await aoMudar?.();
      return true;
    } catch (e) {
      setErro(e.message);
      return false;
    } finally {
      setOcupado(false);
    }
  }

  async function criarTarefa(e) {
    e.preventDefault();
    if (!nova.titulo.trim()) { setErro("Dê um nome à tarefa."); return; }
    const ok = await acao({ acao: "salvar-tarefa", dados: { ...nova, negocio_id: negocioId } });
    if (ok) setNova({ titulo: "", tipo: "tarefa", vence_em: "", responsavel_id: "", descricao: "" });
  }

  async function criarNota(e) {
    e.preventDefault();
    if (!nota.trim()) return;
    const ok = await acao({ acao: "criar-nota", dados: { negocio_id: negocioId, texto: nota } });
    if (ok) setNota("");
  }

  const abertas = tarefas.filter((t) => !t.concluida_em);
  const feitas = tarefas.filter((t) => t.concluida_em);
  const agora = Date.now();

  return (
    <div className="atividades">
      {erro && <div className="aviso erro" role="alert">{erro}</div>}

      <form className="tarefa-nova" onSubmit={criarTarefa}>
        <input
          type="text" value={nova.titulo} placeholder="O que precisa ser feito"
          onChange={(e) => setNova({ ...nova, titulo: e.target.value })}
        />
        <select aria-label="Tipo" value={nova.tipo} onChange={(e) => setNova({ ...nova, tipo: e.target.value })}>
          {TIPOS_TAREFA.map((t) => <option key={t.valor} value={t.valor}>{t.rotulo}</option>)}
        </select>
        <input
          type="datetime-local" aria-label="Vence em" value={nova.vence_em}
          onChange={(e) => setNova({ ...nova, vence_em: e.target.value })}
        />
        <select aria-label="Responsável pela tarefa" value={nova.responsavel_id} onChange={(e) => setNova({ ...nova, responsavel_id: e.target.value })}>
          <option value="">Ninguém</option>
          {config.atendentes.map((x) => <option key={x.id} value={x.id}>{x.nome}</option>)}
        </select>
        <button type="submit" className="btn pequeno" disabled={ocupado}><Plus size={14} /> Criar</button>
      </form>

      {abertas.length === 0 && <p className="nota">Nenhuma tarefa aberta neste negócio.</p>}

      <ul className="lista-tarefas">
        {abertas.map((t) => {
          const vencida = t.vence_em && new Date(t.vence_em).getTime() < agora;
          return (
            <li key={t.id} className={vencida ? "vencida" : ""}>
              <button
                type="button" className="icone-botao" title="Marcar como feita" aria-label="Marcar como feita"
                disabled={ocupado}
                onClick={() => acao({ acao: "concluir-tarefa", id: t.id, concluida: true })}
              >
                <Check size={15} />
              </button>
              <div>
                <strong>{t.titulo}</strong>
                <small>
                  {rotuloTipoTarefa(t.tipo)}
                  {t.vence_em ? ` · ${dataHora(t.vence_em)}` : " · sem prazo"}
                  {vencida ? " · atrasada" : ""}
                  {t.atendentes?.nome ? ` · ${t.atendentes.nome}` : ""}
                </small>
                {t.descricao && <p className="nota">{t.descricao}</p>}
              </div>
              <button
                type="button" className="icone-botao perigo" title="Apagar tarefa" aria-label="Apagar tarefa"
                disabled={ocupado}
                onClick={() => { if (window.confirm("Apagar esta tarefa?")) acao({ acao: "apagar-tarefa", id: t.id }); }}
              >
                <Trash2 size={15} />
              </button>
            </li>
          );
        })}
      </ul>

      {feitas.length > 0 && (
        <>
          <button type="button" className="btn secundario pequeno" style={{ alignSelf: "flex-start" }}
            onClick={() => setVerConcluidas((v) => !v)}>
            {verConcluidas ? "Esconder" : "Ver"} {feitas.length} {feitas.length === 1 ? "tarefa feita" : "tarefas feitas"}
          </button>
          {verConcluidas && (
            <ul className="lista-tarefas feitas">
              {feitas.map((t) => (
                <li key={t.id}>
                  <button type="button" className="icone-botao" title="Reabrir" aria-label="Reabrir tarefa"
                    disabled={ocupado} onClick={() => acao({ acao: "concluir-tarefa", id: t.id, concluida: false })}>
                    <Check size={15} />
                  </button>
                  <div>
                    <strong>{t.titulo}</strong>
                    <small>feita {haQuanto(t.concluida_em)}{t.concluida_por ? ` por ${t.concluida_por}` : ""}</small>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </>
      )}

      <form className="nota-nova" onSubmit={criarNota}>
        <textarea
          rows={2} value={nota} placeholder="Anotar o que aconteceu neste negócio"
          onChange={(e) => setNota(e.target.value)}
        />
        <button type="submit" className="btn secundario pequeno" disabled={ocupado || !nota.trim()}>Anotar</button>
      </form>

      <ol className="lista-notas">
        {notas.map((x) => (
          <li key={x.id}>
            <p>{x.texto}</p>
            <small>
              {dataHora(x.criado_em)}{x.autor ? ` · ${x.autor}` : ""}
              <button type="button" className="so-texto perigo"
                onClick={() => { if (window.confirm("Apagar esta anotação?")) acao({ acao: "apagar-nota", id: x.id }); }}>
                apagar
              </button>
            </small>
          </li>
        ))}
        {notas.length === 0 && <p className="nota">Nenhuma anotação ainda.</p>}
      </ol>
    </div>
  );
}

export { Ficha };
