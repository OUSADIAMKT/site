// CRM: o funil de vendas em kanban ou em lista.
//
// Arrastar o cartão muda a etapa. Soltar numa coluna de "perdido" ou "ganho"
// pede o motivo antes de gravar, porque o motivo de fechamento é o que alimenta
// o relatório de por que se ganha e por que se perde.
//
// Duas regras atravessam o arquivo:
//
// 1. Quem filtra é o banco. O quadro corta em mil cartões, e peneirar depois
//    de carregar mostraria um recorte errado sem avisar para quem tem mais
//    negócios que o corte.
// 2. O cartão mostra o que a pessoa escolheu ver, não tudo que existe. Quinze
//    informações num cartão de 240px é um borrão; a escolha fica em
//    `src/quadroCampos.js` e é de quem olha, não da empresa.

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  KanbanSquare, List, Plus, Search, Settings2, Workflow, Download,
  SlidersHorizontal, MessageSquareText, Layers,
} from "lucide-react";
import { chamar } from "./api.js";
import {
  dinheiro, haQuanto, iniciais, telefoneBonito, corDaEtiqueta, Ficha,
  Segmentos, Vazio, Modal,
  PRIORIDADES, prioridadeDe, atrasoDe, dataCurta,
} from "./crmComum.jsx";
import { NaoLidas } from "./naoLidas.jsx";
import { CAMPOS, PADRAO, resolver, paraSalvar, quantosEscondidos } from "./quadroCampos.js";

import { FormNegocio, PainelNegocio, paraApi, faltaObrigatorio, negocioVazio } from "./Negocio.jsx";
import { EditorFunil } from "./CrmAjustes.jsx";
import CabecalhoPagina from "./CabecalhoPagina.jsx";

// Faixa pronta em vez de campo de data, pelo mesmo motivo do filtro de tempo
// da caixa de entrada: ninguém digita "de 14 a 21" para perguntar "o que
// entrou esta semana".
const PERIODOS = [
  { valor: "", rotulo: "Desde sempre" },
  { valor: "7", rotulo: "Últimos 7 dias" },
  { valor: "30", rotulo: "Últimos 30 dias" },
  { valor: "90", rotulo: "Últimos 90 dias" },
];

const SITUACOES = [
  { valor: "", rotulo: "Aberto e fechado" },
  { valor: "aberto", rotulo: "Só em aberto" },
  { valor: "ganho", rotulo: "Só ganhos" },
  { valor: "perdido", rotulo: "Só perdidos" },
];

const PONTUACOES = [
  { valor: "", rotulo: "Qualquer pontuação" },
  { valor: "40", rotulo: "Pontuação 40+" },
  { valor: "70", rotulo: "Pontuação 70+" },
];

const FILTRO_VAZIO = {
  busca: "", responsavel: "", etiqueta: "", origem: "", prioridade: "", atrasados: "",
  canal: "", vista: "", periodo: "", situacao: "", score_minimo: "",
};

// `conversas.canal` é texto no banco ("whatsapp", "instagram"), não o cadastro
// do canal: aqui só traduz a palavra.
const NOME_CANAL = { whatsapp: "WhatsApp", instagram: "Instagram" };

export default function Crm({ cliente, podeConfigurar, irPara, eu = null, irParaConversa }) {
  const [config, setConfig] = useState(null);
  const [funilId, setFunilId] = useState(null);
  const [negocios, setNegocios] = useState(null);
  const [vista, setVista] = useState(() => {
    try { return localStorage.getItem("ousadia_crm_vista") || "kanban"; } catch { return "kanban"; }
  });
  // Quem atende abre o funil nos negócios DELE: cada um cuida dos próprios
  // lançamentos e leads, e a visão da equipe está a um clique, em "De quem".
  const [filtro, setFiltro] = useState(() => (eu ? { ...FILTRO_VAZIO, vista: "meus" } : FILTRO_VAZIO));
  // Quais informações o cartão mostra. `null` é "ainda não sei": o quadro
  // espera a resposta em vez de desenhar com o padrão e piscar quando a
  // preferência chegar.
  const [campos, setCampos] = useState(null);
  const [escolhendoCampos, setEscolhendoCampos] = useState(false);
  const [editandoEtapas, setEditandoEtapas] = useState(false);
  // O painel do negócio pode vir aberto pela URL (?negocio=<id>), para
  // mandar um link direto para alguém da equipe.
  const [aberto, setAberto] = useState(
    () => new URLSearchParams(location.search).get("negocio") || null);
  const [novo, setNovo] = useState(null);
  const [fechando, setFechando] = useState(null);
  const [criandoFunil, setCriandoFunil] = useState(false);
  const [erro, setErro] = useState("");
  const [aviso, setAviso] = useState("");
  const [trazendo, setTrazendo] = useState(false);

  useEffect(() => { try { localStorage.setItem("ousadia_crm_vista", vista); } catch { /* sem armazenamento */ } }, [vista]);

  const carregarConfig = useCallback(async () => {
    try {
      const c = await chamar(`painel-crm?cliente=${cliente.id}&ver=config`);
      setConfig(c);
      setFunilId((atual) => (c.funis.some((f) => f.id === atual) ? atual : c.funis[0]?.id || null));
    } catch (e) {
      setErro(e.message);
    }
  }, [cliente.id]);

  useEffect(() => { setConfig(null); setNegocios(null); setFunilId(null); carregarConfig(); }, [carregarConfig]);

  // A preferência de cartão vem do banco, e não do navegador: quem atende de
  // dois lugares, ou troca de máquina, encontra o quadro do jeito que deixou.
  // Falhar aqui não impede o quadro de abrir, só devolve o conjunto padrão.
  useEffect(() => {
    let valendo = true;
    setCampos(null);
    chamar(`painel-crm?cliente=${cliente.id}&ver=campos`)
      .then((d) => { if (valendo) setCampos(d.campos || {}); })
      .catch(() => { if (valendo) setCampos({}); });
    return () => { valendo = false; };
  }, [cliente.id]);

  const carregarNegocios = useCallback(async () => {
    if (!funilId) return;
    try {
      const p = new URLSearchParams({ cliente: cliente.id, funil: funilId });
      for (const [k, v] of Object.entries(filtro)) if (v) p.set(k, v);
      const d = await chamar(`painel-crm?${p}`);
      setNegocios(d.negocios || []);
      setErro("");
    } catch (e) {
      setErro(e.message);
    }
  }, [cliente.id, funilId, filtro]);

  // A busca espera a pessoa parar de digitar: uma ida ao servidor por letra
  // deixaria a tela piscando.
  useEffect(() => {
    const t = setTimeout(carregarNegocios, filtro.busca ? 300 : 0);
    return () => clearTimeout(t);
  }, [carregarNegocios]);

  const funil = config?.funis.find((f) => f.id === funilId) || null;
  const abertos = (negocios || []).filter((n) => n.situacao === "aberto");
  const totalAberto = abertos.reduce((s, n) => s + Number(n.valor || 0), 0);
  const etiquetasDoFiltro = useMemo(() => [...new Set([
    ...(config?.etiquetas || []).map((e) => e.nome),
    ...(negocios || []).flatMap((n) => n.etiquetas || []),
  ])].sort(), [config, negocios]);

  async function mover(negocio, etapa, posicao, motivo = {}) {
    // Otimista: o cartão já aparece na coluna nova, porque esperar a ida ao
    // servidor para ele sair do lugar faz o arrastar parecer quebrado.
    //
    // A reversão é o cartão de antes, guardado aqui, e não uma recarga: quando
    // o servidor recusa porque a colega já moveu o mesmo cartão, recarregar
    // deixaria o cartão na coluna errada por mais uma volta de rede, com a
    // mensagem de erro já na tela. Volta na hora, e a recarga depois confirma
    // qual é a verdade do banco.
    const antes = negocio;
    setNegocios((lista) => lista.map((n) => (n.id === negocio.id
      ? { ...n, etapa_id: etapa.id, posicao, situacao: etapa.tipo === "aberta" ? "aberto" : etapa.tipo, etapa_desde: n.etapa_id === etapa.id ? n.etapa_desde : new Date().toISOString() }
      : n)));
    try {
      await chamar(`painel-crm?cliente=${cliente.id}`, {
        method: "POST",
        body: { acao: "mover-negocio", dados: { id: negocio.id, etapa_id: etapa.id, de_etapa_id: negocio.etapa_id, posicao, ...motivo } },
      });
      setErro("");
    } catch (e) {
      setNegocios((lista) => lista.map((n) => (n.id === antes.id ? antes : n)));
      setErro(e.message);
    }
    carregarNegocios();
  }

  // As conversas que já existiam antes do funil. Quem fala de agora em diante
  // entra sozinho; isto é para o passado.
  async function trazerConversas() {
    setTrazendo(true); setErro(""); setAviso("");
    try {
      const r = await chamar(`painel-crm?cliente=${cliente.id}`, {
        method: "POST", body: { acao: "trazer-conversas", funil: funilId, dias: 30 },
      });
      setAviso(r.criados
        ? `${r.criados} ${r.criados === 1 ? "conversa entrou" : "conversas entraram"} no funil.`
        : "Todas as conversas dos últimos 30 dias já estão no funil.");
      carregarNegocios();
    } catch (e) {
      setErro(e.message);
    } finally {
      setTrazendo(false);
    }
  }

  function aoSoltar(negocio, etapa, posicao) {
    if (etapa.id !== negocio.etapa_id && etapa.tipo !== "aberta") {
      setFechando({ negocio, etapa, posicao });
      return;
    }
    mover(negocio, etapa, posicao);
  }

  if (!config) {
    return (
      <>
        <CabecalhoPagina titulo="Funil de vendas" resumo="Carregando…" />
        {erro && <div className="aviso erro" role="alert">{erro}</div>}
      </>
    );
  }

  if (!config.funis.length) {
    return (
      <>
        <CabecalhoPagina titulo="Funil de vendas" resumo="Nenhum funil criado ainda." />
        <div className="cartao" style={{ marginTop: 22 }}>
          <Vazio
            Icone={Workflow}
            titulo="Crie o primeiro funil"
            texto="O funil é a sequência de etapas que um lead percorre até virar venda. Ele já vem com seis etapas prontas para você ajustar."
          >
            {podeConfigurar
              ? <button type="button" className="btn" onClick={() => setCriandoFunil(true)}>Criar funil →</button>
              : <p className="nota">Peça ao administrador da conta para criar o funil.</p>}
          </Vazio>
        </div>
        {criandoFunil && (
          <EditorFunil
            cliente={cliente} config={config}
            aoFechar={() => setCriandoFunil(false)}
            aoSalvar={() => { setCriandoFunil(false); carregarConfig(); }}
          />
        )}
      </>
    );
  }

  return (
    <>
      <CabecalhoPagina
        titulo="Funil de vendas"
        resumo={negocios === null ? "Carregando…" : `${abertos.length} ${abertos.length === 1 ? "negócio aberto" : "negócios abertos"}, ${dinheiro(totalAberto)} em jogo`}
        acoes={<>
        <Segmentos
          rotulo="Forma de ver" valor={vista} aoMudar={setVista}
          opcoes={[
            { valor: "kanban", rotulo: "Kanban", Icone: KanbanSquare },
            { valor: "lista", rotulo: "Lista", Icone: List },
          ]}
        />
        {podeConfigurar && (
          <button type="button" className="btn secundario" disabled={trazendo} onClick={trazerConversas}
            title="Coloca no funil as conversas dos últimos 30 dias que ainda não estão nele">
            <Download size={15} /> {trazendo ? "Trazendo…" : "Trazer conversas"}
          </button>
        )}
        <button
          type="button" className="btn secundario" onClick={() => setEscolhendoCampos(true)}
          title="Escolhe quais informações aparecem nos cartões deste quadro"
        >
          <SlidersHorizontal size={15} /> Cartões
          {campos && quantosEscondidos(campos) > 0 && (
            <span className="segmentos-conta">{CAMPOS.length - quantosEscondidos(campos)}</span>
          )}
        </button>
        {podeConfigurar && funil && (
          <button
            type="button" className="btn secundario" onClick={() => setEditandoEtapas(true)}
            title="Nome, cor, ordem e limite de dias das colunas deste funil"
          >
            <Layers size={15} /> Colunas
          </button>
        )}
        {podeConfigurar && irPara && (
          <button type="button" className="btn secundario" onClick={() => irPara("crm-ajustes")}>
            <Settings2 size={15} /> Configurar
          </button>
        )}
        <button type="button" className="btn" onClick={() => setNovo({ etapaId: null })}>
          <Plus size={15} /> Novo negócio
        </button>
        </>}
      />

      {erro && <div className="aviso erro" role="alert">{erro}</div>}
      {aviso && <div className="aviso" role="status">{aviso}</div>}

      <div className="crm-barra">
        {config.funis.length > 1 && (
          <Segmentos
            rotulo="Funil" valor={funilId} aoMudar={(id) => { setNegocios(null); setFunilId(id); }}
            opcoes={config.funis.map((f) => ({ valor: f.id, rotulo: f.nome }))}
          />
        )}
        <label className="busca-pilula">
          <Search size={15} aria-hidden="true" />
          <input
            type="text" value={filtro.busca} placeholder="Buscar nome, telefone ou e-mail"
            onChange={(e) => setFiltro({ ...filtro, busca: e.target.value })}
          />
        </label>
        {/* A vista é de quem olha, e por isso o servidor resolve quem é "eu"
            pela sessão. "Minhas" fica de fora para quem entra como gestor da
            plataforma: ele não tem caixa própria, e oferecer a vista para
            devolver vazio seria uma pegadinha. */}
        <Segmentos
          rotulo="De quem" valor={filtro.vista}
          aoMudar={(v) => setFiltro({ ...filtro, vista: v, responsavel: "" })}
          opcoes={[
            { valor: "", rotulo: "Todas" },
            ...(eu ? [{ valor: "meus", rotulo: "Minhas" }] : []),
            { valor: "equipe", rotulo: "Da equipe" },
            { valor: "sem", rotulo: "Sem dono" },
          ]}
        />
        <select aria-label="Responsável" value={filtro.responsavel} onChange={(e) => setFiltro({ ...filtro, responsavel: e.target.value })}>
          <option value="">Todos os responsáveis</option>
          <option value="nenhum">Sem responsável</option>
          {config.atendentes.map((a) => <option key={a.id} value={a.id}>{a.nome}</option>)}
        </select>
        <select aria-label="Etiqueta" value={filtro.etiqueta} onChange={(e) => setFiltro({ ...filtro, etiqueta: e.target.value })}>
          <option value="">Todas as etiquetas</option>
          {etiquetasDoFiltro.map((e) => <option key={e} value={e}>{e}</option>)}
        </select>
        <select aria-label="Origem" value={filtro.origem} onChange={(e) => setFiltro({ ...filtro, origem: e.target.value })}>
          <option value="">Todas as origens</option>
          {config.origens.map((o) => <option key={o.id} value={o.id}>{o.nome}</option>)}
        </select>
        <select aria-label="Prioridade" value={filtro.prioridade} onChange={(e) => setFiltro({ ...filtro, prioridade: e.target.value })}>
          <option value="">Qualquer prioridade</option>
          {PRIORIDADES.map((p) => <option key={p.valor} value={p.valor}>{p.rotulo}</option>)}
        </select>
        <select aria-label="Canal" value={filtro.canal} onChange={(e) => setFiltro({ ...filtro, canal: e.target.value })}>
          <option value="">Todos os canais</option>
          <option value="whatsapp">WhatsApp</option>
          <option value="instagram">Instagram</option>
        </select>
        <select aria-label="Situação comercial" value={filtro.situacao} onChange={(e) => setFiltro({ ...filtro, situacao: e.target.value })}>
          {SITUACOES.map((o) => <option key={o.valor} value={o.valor}>{o.rotulo}</option>)}
        </select>
        <select aria-label="Período de entrada" value={filtro.periodo} onChange={(e) => setFiltro({ ...filtro, periodo: e.target.value })}>
          {PERIODOS.map((o) => <option key={o.valor} value={o.valor}>{o.rotulo}</option>)}
        </select>
        <select aria-label="Pontuação do lead" value={filtro.score_minimo} onChange={(e) => setFiltro({ ...filtro, score_minimo: e.target.value })}>
          {PONTUACOES.map((o) => <option key={o.valor} value={o.valor}>{o.rotulo}</option>)}
        </select>
        <label className="caixa-marcar" title="Previsão vencida ou tempo na etapa acima do limite">
          <input
            type="checkbox" checked={filtro.atrasados === "1"}
            onChange={(e) => setFiltro({ ...filtro, atrasados: e.target.checked ? "1" : "" })}
          />
          <span>Só os atrasados</span>
        </label>
      </div>

      {negocios === null || campos === null ? (
        <div className="vazio">Carregando…</div>
      ) : vista === "kanban" ? (
        <Kanban
          funil={funil} negocios={negocios} config={config} campos={campos}
          aoAbrir={(n) => setAberto(n.id)}
          aoSoltar={aoSoltar}
          aoNovo={(etapaId) => setNovo({ etapaId })}
          aoAbrirConversa={irParaConversa}
        />
      ) : (
        <Lista funil={funil} negocios={negocios} config={config} aoAbrir={(n) => setAberto(n.id)} />
      )}

      {aberto && (
        <PainelNegocio
          cliente={cliente} config={config} negocioId={aberto}
          aoFechar={() => setAberto(null)} aoMudar={carregarNegocios}
        />
      )}

      {novo && (
        <NovoNegocio
          cliente={cliente} config={config}
          etapaId={novo.etapaId || funil?.etapas.find((e) => e.tipo === "aberta")?.id || funil?.etapas[0]?.id}
          aoFechar={() => setNovo(null)}
          aoSalvar={() => { setNovo(null); carregarNegocios(); }}
        />
      )}

      {escolhendoCampos && (
        <EscolherCampos
          cliente={cliente} campos={campos || {}}
          aoFechar={() => setEscolhendoCampos(false)}
          aoSalvar={(c) => { setCampos(c); setEscolhendoCampos(false); }}
        />
      )}

      {editandoEtapas && funil && (
        <EditorFunil
          cliente={cliente} config={config} funil={funil}
          aoFechar={() => setEditandoEtapas(false)}
          aoSalvar={() => { setEditandoEtapas(false); carregarConfig(); carregarNegocios(); }}
        />
      )}

      {fechando && (
        <MotivoFechamento
          {...fechando} config={config}
          aoFechar={() => setFechando(null)}
          aoConfirmar={(motivo) => { mover(fechando.negocio, fechando.etapa, fechando.posicao, motivo); setFechando(null); }}
        />
      )}
    </>
  );
}

// ---------------------------------------------------------------------------

function Kanban({ funil, negocios, config, campos, aoAbrir, aoSoltar, aoNovo, aoAbrirConversa }) {
  const [arrastando, setArrastando] = useState(null);
  const [sobre, setSobre] = useState(null);

  return (
    <div className="kanban" role="list">
      {funil.etapas.map((etapa) => {
        const cartoes = negocios.filter((n) => n.etapa_id === etapa.id).sort((a, b) => a.posicao - b.posicao);
        // Coluna de ganho soma o que foi registrado como fechado; as outras
        // somam a previsão. Misturar os dois faria a receita parecer maior do
        // que é.
        const soma = etapa.tipo === "ganho"
          ? cartoes.reduce((s, n) => s + Number(n.valor_fechado ?? 0), 0)
          : cartoes.reduce((s, n) => s + Number(n.valor || 0), 0);
        const semValor = etapa.tipo === "ganho"
          ? cartoes.filter((n) => n.valor_fechado === null || n.valor_fechado === undefined).length
          : 0;
        return (
          <Coluna
            key={etapa.id} etapa={etapa} cartoes={cartoes} soma={soma} semValor={semValor} config={config} campos={campos}
            aoAbrirConversa={aoAbrirConversa}
            ativa={sobre === etapa.id}
            arrastando={arrastando}
            aoEntrar={() => setSobre(etapa.id)}
            aoSair={() => setSobre((s) => (s === etapa.id ? null : s))}
            aoComecar={setArrastando}
            aoTerminar={() => { setArrastando(null); setSobre(null); }}
            aoSoltar={(posicao) => {
              const n = negocios.find((x) => x.id === arrastando);
              setArrastando(null); setSobre(null);
              if (n) aoSoltar(n, etapa, posicao);
            }}
            aoAbrir={aoAbrir}
            aoNovo={() => aoNovo(etapa.id)}
          />
        );
      })}
    </div>
  );
}

function Coluna({ etapa, cartoes, soma, semValor = 0, config, campos, ativa, arrastando, aoEntrar, aoSair, aoComecar, aoTerminar, aoSoltar, aoAbrir, aoNovo, aoAbrirConversa }) {
  const corpo = useRef(null);

  // A posição é calculada entre o cartão de cima e o de baixo de onde o mouse
  // soltou, para mover um cartão não renumerar a coluna inteira.
  function posicaoNoPonto(y) {
    const els = [...(corpo.current?.querySelectorAll("[data-negocio]") || [])]
      .filter((el) => el.dataset.negocio !== arrastando);
    const lista = cartoes.filter((c) => c.id !== arrastando);
    let i = els.findIndex((el) => {
      const r = el.getBoundingClientRect();
      return y < r.top + r.height / 2;
    });
    if (i === -1) i = lista.length;
    const antes = lista[i - 1]?.posicao;
    const depois = lista[i]?.posicao;
    if (antes === undefined && depois === undefined) return 1;
    if (antes === undefined) return depois - 1;
    if (depois === undefined) return antes + 1;
    return (antes + depois) / 2;
  }

  return (
    <section
      className={`kanban-coluna ${ativa ? "sobre" : ""} tipo-${etapa.tipo}`}
      role="listitem" aria-label={etapa.nome}
      onDragOver={(e) => { if (arrastando) { e.preventDefault(); aoEntrar(); } }}
      onDragLeave={(e) => { if (!e.currentTarget.contains(e.relatedTarget)) aoSair(); }}
      onDrop={(e) => { e.preventDefault(); aoSoltar(posicaoNoPonto(e.clientY)); }}
    >
      <header className="kanban-topo">
        <div className="kanban-titulo">
          <i style={{ background: etapa.cor }} aria-hidden="true" />
          <strong>{etapa.nome}</strong>
          <span className="kanban-conta">{cartoes.length}</span>
        </div>
        <span className="kanban-soma" title={etapa.tipo === "ganho" ? "Receita registrada nesta coluna" : "Valor previsto nesta coluna"}>
          {dinheiro(soma)}
          {semValor > 0 && <small title={`${semValor} ganho(s) sem valor registrado`}> +{semValor} sem valor</small>}
        </span>
      </header>

      <div className="kanban-corpo" ref={corpo}>
        {cartoes.map((n) => (
          <Cartao
            key={n.id} negocio={n} config={config} etapa={etapa} campos={campos}
            arrastado={arrastando === n.id}
            aoComecar={() => aoComecar(n.id)} aoTerminar={aoTerminar}
            aoAbrir={() => aoAbrir(n)}
            aoAbrirConversa={aoAbrirConversa}
          />
        ))}
        {cartoes.length === 0 && <p className="kanban-vazio">Arraste um negócio para cá</p>}
      </div>

      {etapa.tipo === "aberta" && (
        <button type="button" className="kanban-novo" onClick={aoNovo}>
          <Plus size={14} /> Adicionar
        </button>
      )}
    </section>
  );
}

function Cartao({ negocio: n, config, etapa, campos, arrastado, aoComecar, aoTerminar, aoAbrir, aoAbrirConversa }) {
  const ver = resolver(campos);
  const responsavel = n.atendentes?.nome;
  const comEquipe = n.conversas?.modo === "humano" || n.conversas?.modo === "fila";
  const prioridade = prioridadeDe(n.prioridade);
  const atraso = atrasoDe(n, etapa);
  const tarefa = n.proxima_tarefa;
  // A última interação é a última mensagem da conversa. Negócio criado na mão,
  // sem conversa, não tem nenhuma, e o cartão não inventa uma data.
  const ultima = n.conversas?.ultima_em || null;
  const naoLido = (n.nao_lidas || 0) > 0 || Boolean(n.marcada);
  const nomeDoContato = n.contatos?.nome || n.titulo;
  const foto = n.contatos?.foto_url || null;
  const fechado = n.situacao === "ganho" && n.valor_fechado !== null && n.valor_fechado !== undefined;

  // Quais fichas realmente têm o que dizer neste cartão. Calcular antes evita
  // a linha de fichas nascer vazia e abrir um buraco no meio do cartão.
  const fichas = [
    ver.prioridade && n.prioridade && n.prioridade !== "normal",
    ver.score && Number(n.score) > 0,
    comEquipe,
    ver.origem && n.crm_origens?.nome,
    ver.etiquetas && n.etiquetas?.length > 0,
  ].some(Boolean);

  return (
    <article
      className={`negocio-cartao ${arrastado ? "arrastado" : ""} ${atraso ? "atrasado" : ""}`}
      data-negocio={n.id}
      data-naolido={naoLido ? "sim" : "-"}
      draggable
      tabIndex={0}
      onDragStart={(e) => { e.dataTransfer.effectAllowed = "move"; e.dataTransfer.setData("text/plain", n.id); aoComecar(); }}
      onDragEnd={aoTerminar}
      onClick={aoAbrir}
      onKeyDown={(e) => { if (e.key === "Enter") aoAbrir(); }}
    >
      {n.prioridade && n.prioridade !== "normal" && (
        <i className="negocio-prioridade" style={{ background: prioridade.cor }}
          title={`Prioridade ${prioridade.rotulo.toLowerCase()}`} aria-hidden="true" />
      )}

      <div className="negocio-linha">
        {ver.foto && (
          // Iniciais é o normal, e não o remendo: a API do WhatsApp Cloud não
          // entrega a foto de perfil de quem fala com a empresa. Quando houver
          // foto cadastrada, ela entra no lugar.
          <span className="negocio-foto" title={nomeDoContato}>
            {foto
              ? <img src={foto} alt="" loading="lazy" />
              : <b aria-hidden="true">{iniciais(nomeDoContato)}</b>}
          </span>
        )}
        <strong className="negocio-titulo">{n.titulo}</strong>
        {ver.nao_lidas && naoLido && <NaoLidas conversa={n} />}
        {ver.valor && (fechado
          ? <span className="negocio-valor fechado" title="Receita registrada">{dinheiro(n.valor_fechado)}</span>
          : Number(n.valor) > 0 && <span className="negocio-valor" title="Valor previsto">{dinheiro(n.valor)}</span>)}
      </div>

      {(ver.contato || ver.canal || ver.empresa) && (
        <span className="negocio-sub">
          {ver.empresa && n.contatos?.empresa ? n.contatos.empresa : null}
          {ver.empresa && n.contatos?.empresa && ver.contato ? " · " : null}
          {ver.contato ? (n.telefone ? telefoneBonito(n.telefone) : n.email || "sem contato") : null}
          {ver.canal && n.conversas?.canal && <> · {NOME_CANAL[n.conversas.canal] || n.conversas.canal}</>}
        </span>
      )}

      {fichas && (
        <div className="negocio-fichas">
          {ver.prioridade && n.prioridade && n.prioridade !== "normal" && <Ficha texto={prioridade.rotulo.toLowerCase()} cor={prioridade.cor} />}
          {ver.score && Number(n.score) > 0 && <Ficha texto={`score ${n.score}`} cor={n.score >= 70 ? "#B42318" : n.score >= 40 ? "#A15C07" : undefined} />}
          {comEquipe && <Ficha texto={n.conversas.modo === "fila" ? "na fila" : "com a equipe"} cor="#A15C07" />}
          {ver.origem && n.crm_origens?.nome && <Ficha texto={n.crm_origens.nome} />}
          {ver.etiquetas && (n.etiquetas || []).slice(0, 3).map((e) => <Ficha key={e} texto={e} cor={corDaEtiqueta(e, config.etiquetas)} />)}
        </div>
      )}

      {atraso && <p className="negocio-atraso" title="Este negócio passou do prazo">{atraso.texto}</p>}

      {ver.previsao && n.previsao_em && (
        <p className="negocio-previsao">fecha em {dataCurta(n.previsao_em)}</p>
      )}

      {ver.tarefa && tarefa && (
        <p className={`negocio-tarefa ${tarefa.vence_em && new Date(tarefa.vence_em) < new Date() ? "vencida" : ""}`}>
          {tarefa.vence_em ? dataCurta(tarefa.vence_em) : "sem data"} · {tarefa.titulo}
        </p>
      )}

      <footer className="negocio-pe">
        {ver.tempo && <span className="negocio-tempo" title="Tempo nesta etapa">{haQuanto(n.etapa_desde)}</span>}
        {ver.ultima && ultima && <span className="negocio-tempo" title="Última mensagem na conversa">fala {haQuanto(ultima)}</span>}
        {/* Abrir o atendimento é a razão de o CRM e a caixa de entrada serem a
            mesma ferramenta. Para o clique não abrir o painel do negócio ao
            mesmo tempo, ele para aqui. */}
        {aoAbrirConversa && n.conversa_id && (
          <button
            type="button" className="negocio-ir"
            aria-label="Abrir o atendimento desta pessoa"
            title="Abrir o atendimento desta pessoa"
            onClick={(e) => { e.stopPropagation(); aoAbrirConversa(n.conversa_id); }}
          >
            <MessageSquareText size={13} aria-hidden="true" />
          </button>
        )}
        {ver.responsavel && (responsavel
          ? <span className="negocio-avatar" title={responsavel}>{iniciais(responsavel)}</span>
          : <span className="negocio-sem">sem responsável</span>)}
      </footer>
    </article>
  );
}

// ---------------------------------------------------------------------------
// Quais informações o cartão mostra
//
// Preferência de quem olha, guardada no banco por pessoa: ver
// `src/quadroCampos.js` e `sql/040`. O botão fica no cabeçalho do quadro, e
// não em Configurações, porque a decisão é tomada olhando o quadro.

function EscolherCampos({ cliente, campos, aoFechar, aoSalvar }) {
  const [f, setF] = useState(() => resolver(campos));
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");

  async function salvar() {
    setSalvando(true); setErro("");
    try {
      const d = await chamar(`painel-crm?cliente=${cliente.id}`, {
        method: "POST", body: { acao: "campos-do-quadro", campos: paraSalvar(f) },
      });
      aoSalvar(d.campos || paraSalvar(f));
    } catch (e) {
      setErro(e.message);
      setSalvando(false);
    }
  }

  const ligados = CAMPOS.filter((c) => f[c.chave]).length;

  return (
    <Modal
      titulo="Informações do cartão" aoFechar={aoFechar} largura={560}
      rodape={(
        <>
          <button type="button" className="btn secundario" onClick={() => setF({ ...PADRAO })}>
            Voltar ao padrão
          </button>
          <button type="button" className="btn" disabled={salvando} onClick={salvar}>
            {salvando ? "Salvando…" : "Salvar →"}
          </button>
        </>
      )}
    >
      {erro && <div className="aviso erro" role="alert">{erro}</div>}
      <p className="nota" style={{ marginTop: 0 }}>
        Vale só para você, em qualquer aparelho. {ligados} de {CAMPOS.length} ligadas.
      </p>
      <ul className="escolher-campos">
        {CAMPOS.map((c) => (
          <li key={c.chave}>
            <label className="check">
              <input
                type="checkbox" checked={Boolean(f[c.chave])}
                onChange={(e) => setF({ ...f, [c.chave]: e.target.checked })}
              />
              <span>
                {c.rotulo}
                {c.nota && <small>{c.nota}</small>}
              </span>
            </label>
          </li>
        ))}
      </ul>
    </Modal>
  );
}

function Lista({ funil, negocios, config, aoAbrir }) {
  const etapas = new Map(funil.etapas.map((e) => [e.id, e]));
  const ordenados = [...negocios].sort((a, b) =>
    (etapas.get(a.etapa_id)?.ordem ?? 0) - (etapas.get(b.etapa_id)?.ordem ?? 0) || a.posicao - b.posicao);

  if (!ordenados.length) {
    return <div className="cartao"><Vazio titulo="Nenhum negócio neste funil." texto="Crie um negócio ou ajuste os filtros." /></div>;
  }

  return (
    <div className="cartao tabela-cartao">
      <table className="tabela-nova">
        <thead>
          <tr>
            <th>Negócio</th><th>Etapa</th><th className="num">Valor</th><th>Prioridade</th>
            <th>Responsável</th><th>Origem</th><th>Próxima atividade</th><th className="num">Na etapa</th>
          </tr>
        </thead>
        <tbody>
          {ordenados.map((n) => {
            const e = etapas.get(n.etapa_id);
            const p = prioridadeDe(n.prioridade);
            const atraso = atrasoDe(n, e);
            const fechado = n.situacao === "ganho" && n.valor_fechado !== null && n.valor_fechado !== undefined;
            return (
              <tr key={n.id} onClick={() => aoAbrir(n)} tabIndex={0} onKeyDown={(ev) => { if (ev.key === "Enter") aoAbrir(n); }}>
                <td>
                  <strong>{n.titulo}</strong>
                  {n.telefone && <small>{telefoneBonito(n.telefone)}</small>}
                  <div className="negocio-fichas">
                    {(n.etiquetas || []).map((t) => <Ficha key={t} texto={t} cor={corDaEtiqueta(t, config.etiquetas)} />)}
                  </div>
                </td>
                <td><span className="etapa-ponto"><i style={{ background: e?.cor }} />{e?.nome}</span></td>
                <td className="num mono" title={fechado ? "Receita registrada" : "Valor previsto"}>
                  {fechado ? dinheiro(n.valor_fechado) : dinheiro(n.valor)}
                  {fechado && <small className="apagado"> fechado</small>}
                </td>
                <td><Ficha texto={p.rotulo.toLowerCase()} cor={n.prioridade && n.prioridade !== "normal" ? p.cor : undefined} /></td>
                <td>{n.atendentes?.nome || <span className="apagado">ninguém</span>}</td>
                <td>{n.crm_origens?.nome || <span className="apagado">não informada</span>}</td>
                <td>
                  {n.proxima_tarefa
                    ? <span>{n.proxima_tarefa.vence_em ? `${dataCurta(n.proxima_tarefa.vence_em)} · ` : ""}{n.proxima_tarefa.titulo}</span>
                    : <span className="apagado">nenhuma</span>}
                </td>
                <td className="num mono">
                  {haQuanto(n.etapa_desde)}
                  {atraso && <small style={{ color: "var(--alerta)" }}> atrasado</small>}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function NovoNegocio({ cliente, config, etapaId, aoFechar, aoSalvar }) {
  const [f, setF] = useState(() => negocioVazio(config, etapaId));
  const [erro, setErro] = useState("");
  const [salvando, setSalvando] = useState(false);

  async function salvar() {
    const falta = faltaObrigatorio(config, f);
    if (falta) { setErro(falta); return; }
    setSalvando(true); setErro("");
    try {
      await chamar(`painel-crm?cliente=${cliente.id}`, { method: "POST", body: { acao: "salvar-negocio", dados: paraApi(f) } });
      aoSalvar();
    } catch (e) {
      setErro(e.message);
      setSalvando(false);
    }
  }

  return (
    <Modal
      titulo="Novo negócio" aoFechar={aoFechar} largura={640}
      rodape={(
        <>
          <button type="button" className="btn secundario" onClick={aoFechar}>Cancelar</button>
          <button type="button" className="btn" disabled={salvando} onClick={salvar}>{salvando ? "Salvando…" : "Criar negócio →"}</button>
        </>
      )}
    >
      {erro && <div className="aviso erro" role="alert">{erro}</div>}
      <FormNegocio config={config} valor={f} aoMudar={setF} />
    </Modal>
  );
}

function MotivoFechamento({ negocio, etapa, config, aoFechar, aoConfirmar }) {
  const tipo = etapa.tipo === "ganho" ? "ganho" : "perdido";
  const motivos = config.motivos.filter((m) => m.ativo && m.tipo === tipo);
  const [motivoId, setMotivoId] = useState(motivos[0]?.id || "");
  const [texto, setTexto] = useState("");

  return (
    <Modal
      titulo={tipo === "ganho" ? "Negócio ganho" : "Negócio perdido"}
      aoFechar={aoFechar}
      rodape={(
        <>
          <button type="button" className="btn secundario" onClick={aoFechar}>Cancelar</button>
          <button type="button" className="btn" onClick={() => aoConfirmar({ motivo_id: motivoId || null, motivo_texto: texto })}>
            Mover para {etapa.nome} →
          </button>
        </>
      )}
    >
      <p className="nota" style={{ marginTop: 0 }}>
        <strong>{negocio.titulo}</strong> vai para <strong>{etapa.nome}</strong>. O motivo entra no histórico de fechamentos.
      </p>
      <div className="grade-campos">
        <label className="campo">
          <span>Motivo</span>
          <select value={motivoId} onChange={(e) => setMotivoId(e.target.value)}>
            <option value="">Sem motivo</option>
            {motivos.map((m) => <option key={m.id} value={m.id}>{m.nome}</option>)}
          </select>
        </label>
        <label className="campo">
          <span>Detalhe</span>
          <input type="text" value={texto} onChange={(e) => setTexto(e.target.value)} placeholder="opcional" autoFocus />
        </label>
      </div>
      {motivos.length === 0 && (
        <p className="nota">Nenhum motivo de {tipo === "ganho" ? "ganho" : "perda"} cadastrado. Dá para cadastrar em Configurações do CRM.</p>
      )}
    </Modal>
  );
}
