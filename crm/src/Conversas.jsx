// A lista se atualiza sozinha a cada dez segundos e a conversa aberta a cada
// seis. A busca vai ao banco, porque a conversa que alguém procura quase sempre
// é velha e ficou fora das 100 mais recentes.

import { useState, useEffect, useRef, useCallback, useLayoutEffect, useId } from "react";
import {
  Search, Instagram, MessageCircle, MessagesSquare, ExternalLink, ArrowLeft,
  PanelRight, X, MailOpen, Workflow, MessageSquarePlus,
} from "lucide-react";
import { chamar } from "./api.js";
import Conversa from "./Conversa.jsx";
import {
  dinheiro, dataHora, iniciais as iniciaisDe, telefoneBonito, corDaEtiqueta,
  Ficha, Vazio, Modal,
} from "./crmComum.jsx";
import { PainelNegocio } from "./Negocio.jsx";
import { contarAbas, visiveisNaAba } from "./abasConversas.js";
import { NaoLidas } from "./naoLidas.jsx";
import PorNoFunil from "./PorNoFunil.jsx";
import "./conversas.css";
import CabecalhoPagina from "./CabecalhoPagina.jsx";

// No Instagram o nome do contato é o @ da pessoa, e sem a arroba ninguém
// reconhece que aquilo é um perfil que dá para procurar.
function quem(c) {
  if (!c.nome_contato) return telefoneBonito(c.telefone || c.contato) || "Sem nome";
  return c.canal === "instagram" ? `@${c.nome_contato}` : c.nome_contato;
}

// O relógio do WhatsApp: hora de hoje, "ontem", e data daí para trás.
function quando(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  const hoje = new Date();
  if (d.toDateString() === hoje.toDateString()) {
    return d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  }
  const ontem = new Date(hoje);
  ontem.setDate(hoje.getDate() - 1);
  if (d.toDateString() === ontem.toDateString()) return "ontem";
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
}

const SITUACAO = { fila: "na fila", humano: "com a equipe", ia: "com a IA" };
const LARGURA_CHAT = 760;
const LARGURA_DETALHES = 1100;

export default function Conversas({ cliente, eu, abrirId, aoAbrirPedida }) {
  return (
    <CaixaDeConversas
      key={cliente.id} cliente={cliente} eu={eu}
      abrirId={abrirId} aoAbrirPedida={aoAbrirPedida}
    />
  );
}

function CaixaDeConversas({ cliente, eu, abrirId, aoAbrirPedida }) {
  const [conversas, setConversas] = useState(null);
  const [aberta, setAberta] = useState(null);
  const [mostrarChat, setMostrarChat] = useState(false);
  const [detalhes, setDetalhes] = useState(false);
  const [largura, setLargura] = useState(0);
  const [rascunhos, setRascunhos] = useState({});
  const [enviando, setEnviando] = useState(new Set());
  const enviosEmCurso = useRef(new Set());
  const [erro, setErro] = useState("");
  const [busca, setBusca] = useState("");
  const [aba, setAba] = useState("tudo");
  // A conversa que vai virar oportunidade. `null` e o normal; o painel so
  // existe enquanto alguem esta decidindo.
  const [porNoFunil, setPorNoFunil] = useState(null);
  const [canal, setCanal] = useState("");
  const [config, setConfig] = useState(null);
  const [atendimentos, setAtendimentos] = useState([]);
  const [nova, setNova] = useState(false);
  const carregarRef = useRef(null);
  const termoAtual = useRef("");
  const ultima = useRef(null);
  const requisicao = useRef(null);
  const espaco = useRef(null);
  const buscaRef = useRef(null);
  const itemOrigem = useRef(null);
  const tituloChat = useRef(null);
  const botaoDetalhes = useRef(null);
  const painel = useRef(null);
  const fecharPainel = useRef(null);
  const detalhesId = useId();
  const tituloDetalhesId = useId();
  const compacto = largura < LARGURA_CHAT;
  const emGaveta = largura < LARGURA_DETALHES;

  useLayoutEffect(() => {
    const observar = new ResizeObserver(([entrada]) => setLargura(entrada.contentRect.width));
    observar.observe(espaco.current);
    setLargura(espaco.current.clientWidth);
    return () => observar.disconnect();
  }, []);

  useEffect(() => {
    const viewport = window.visualViewport;
    if (!compacto || !viewport) return;
    const area = espaco.current;
    const atualizar = () => area.style.setProperty("--at-viewport", `${viewport.height}px`);
    atualizar();
    viewport.addEventListener("resize", atualizar);
    return () => {
      viewport.removeEventListener("resize", atualizar);
      area.style.removeProperty("--at-viewport");
    };
  }, [compacto]);

  useLayoutEffect(() => {
    const dialogo = painel.current;
    if (!dialogo) return;
    if (dialogo.open) dialogo.close();
    if (!detalhes) return;
    if (emGaveta) dialogo.showModal();
    else dialogo.show();
    fecharPainel.current?.focus({ preventScroll: true });
  }, [detalhes, emGaveta]);

  // Depois de criar, abre a conversa. `carregar` já deixou a lista nova em
  // `ultima.current` antes de devolver, então não precisa esperar o React
  // repintar para achar a conversa que acabou de nascer.
  async function abrirRecemCriada(id) {
    await carregarRef.current?.();
    const achada = (ultima.current || []).find((c) => c.id === id);
    if (!achada) return;
    setAberta(achada);
    setMostrarChat(true);
  }

  function fecharDetalhes() {
    painel.current?.close();
    setDetalhes(false);
    botaoDetalhes.current?.focus({ preventScroll: true });
  }

  useEffect(() => {
    const controle = new AbortController();
    chamar(`painel-crm?cliente=${cliente.id}&ver=config`, { signal: controle.signal })
      .then((d) => { if (!controle.signal.aborted) setConfig(d); })
      .catch(() => { if (!controle.signal.aborted) setConfig(false); });
    return () => controle.abort();
  }, [cliente.id]);

  const carregar = useCallback(async ({ silencioso = false } = {}) => {
    requisicao.current?.abort();
    const controle = new AbortController();
    requisicao.current = controle;
    try {
      const termo = termoAtual.current.trim();
      const q = termo ? `&busca=${encodeURIComponent(termo)}` : "";
      const d = await chamar(`painel-conversas?cliente=${cliente.id}${q}`, { signal: controle.signal });
      if (controle.signal.aborted) return;
      const vindo = d.conversas || [];
      const mudou = JSON.stringify(vindo) !== JSON.stringify(ultima.current);
      ultima.current = vindo;
      if (!silencioso || mudou) setConversas(vindo);
      setAberta((atual) => atual && (vindo.find((c) => c.id === atual.id) || atual));
      setErro("");
    } catch (e) {
      if (!silencioso && !controle.signal.aborted) setErro(e.message);
    }
  }, [cliente.id]);

  carregarRef.current = carregar;

  useEffect(() => {
    const t = setTimeout(() => { ultima.current = null; carregar(); }, busca ? 300 : 0);
    return () => { clearTimeout(t); requisicao.current?.abort(); };
  }, [busca, carregar]);

  // Alguem clicou numa conversa no quadro ou na fila. A lista ja carregou,
  // entao a conversa esta aqui; se nao estiver (foi arquivada, ou ficou atras
  // do corte da lista), a tela DIZ isso. Antes o pedido era descartado em
  // silencio, e o clique virava nada: a pessoa ficava olhando a lista sem
  // entender por que a conversa nao abriu.
  useEffect(() => {
    if (!abrirId || !conversas) return;
    const achada = conversas.find((c) => c.id === abrirId);
    aoAbrirPedida?.();
    if (!achada) {
      setErro(
        "Essa conversa não está nesta lista. Tente a aba Todas, ou procure pelo"
        + " nome ou telefone na busca."
      );
      return;
    }
    setAberta(achada);
    setMostrarChat(true);
    if ((achada.nao_lidas || 0) > 0 || achada.marcada) {
      setConversas((atuais) => (atuais || []).map((x) =>
        x.id === achada.id ? { ...x, nao_lidas: 0, marcada: false } : x));
    }
  }, [abrirId, conversas, aoAbrirPedida]);

  useEffect(() => {
    const ronda = () => { if (!document.hidden) carregar({ silencioso: true }); };
    const relogio = setInterval(ronda, 10000);
    document.addEventListener("visibilitychange", ronda);
    return () => { clearInterval(relogio); document.removeEventListener("visibilitychange", ronda); };
  }, [carregar]);

  useLayoutEffect(() => {
    if (!compacto) return;
    if (mostrarChat) tituloChat.current?.focus({ preventScroll: true });
    else if (itemOrigem.current?.isConnected) itemOrigem.current.focus({ preventScroll: true });
    else if (itemOrigem.current) buscaRef.current?.focus({ preventScroll: true });
  }, [compacto, mostrarChat]);

  const lista = conversas || [];
  // Contador e lista saem da mesma função, com o mesmo canal aplicado. Enquanto
  // eram duas contas separadas, uma podia mudar sem a outra e os números das
  // abas passavam a falar de um conjunto diferente do que a lista mostrava.
  const conta = contarAbas(lista, eu, canal);
  const visiveis = visiveisNaAba(lista, aba, eu, canal);

  const abas = [
    { valor: "tudo", rotulo: "Tudo" },
    { valor: "nao_lidas", rotulo: "Não lidas" },
    { valor: "parados", rotulo: "Sem resposta" },
    { valor: "meus", rotulo: "Meus", indisponivel: !eu },
    { valor: "fila", rotulo: "Fila" },
    { valor: "humano", rotulo: "Equipe" },
    { valor: "ia", rotulo: "IA" },
  ];

  function abrir(c, evento) {
    itemOrigem.current = evento.currentTarget;
    if (aberta?.id !== c.id) {
      setAtendimentos([]);
      setAberta(c);
    }
    setMostrarChat(true);
    // Tira o negrito na hora. Quem marca de verdade é o servidor, quando a
    // conversa carrega; esperar a próxima ronda da lista, dez segundos depois,
    // faria a conversa aberta continuar parecendo não lida na lista ao lado.
    if ((c.nao_lidas || 0) > 0 || c.marcada) {
      setConversas((atuais) => (atuais || []).map((x) =>
        x.id === c.id ? { ...x, nao_lidas: 0, marcada: false } : x));
    }
  }

  function mudarBusca(evento) {
    const termo = evento.target.value;
    termoAtual.current = termo;
    requisicao.current?.abort();
    setBusca(termo);
  }

  function editarRascunho(id, texto, enviado) {
    setRascunhos((atuais) => {
      // Uma confirmação só limpa a edição que originou aquele envio.
      if (enviado && atuais[id] !== enviado) return atuais;
      return { ...atuais, [id]: texto ? { texto } : undefined };
    });
  }

  function reservarEnvio(id) {
    const ativos = enviosEmCurso.current;
    if (ativos.has(id)) return null;
    ativos.add(id);
    setEnviando(new Set(ativos));
    return () => {
      ativos.delete(id);
      setEnviando(new Set(ativos));
    };
  }

  return (
    <section className="signature-conversas">
      <CabecalhoPagina
        titulo="Conversas"
        resumo={conversas !== null
          ? `${conta.fila ? `${conta.fila} na fila · ` : ""}${conta.humano} com a equipe · ${conta.ia} com a IA`
          : null}
      />
      {erro && <div className="aviso erro" role="alert">{erro}</div>}

      <div ref={espaco} className="atendimento" data-compacto={compacto}
        data-chat={mostrarChat} data-detalhes={detalhes && !emGaveta}>
        <aside className="at-lista" aria-label="Lista de conversas">
          <div className="at-lista-topo">
            <div className="at-busca-linha">
              <label className="busca-pilula">
                <Search size={16} aria-hidden="true" />
                <input ref={buscaRef} type="search" aria-label="Buscar conversas" value={busca}
                  onChange={mudarBusca} placeholder="Buscar nome, @ ou número" />
              </label>
              {/* Falar primeiro com alguém. Fica junto da busca porque é o
                  lugar em que a pessoa já procura antes de desistir e começar
                  uma conversa nova. */}
              <button type="button" className="icone-botao at-nova" onClick={() => setNova(true)}
                aria-label="Nova conversa" title="Nova conversa">
                <MessageSquarePlus size={18} />
              </button>
            </div>
            <div className="at-filtros" role="group" aria-label="Filtrar por situação">
              {abas.map(({ valor, rotulo, indisponivel }) => (
                <button key={valor} type="button" aria-pressed={aba === valor} disabled={indisponivel}
                  onClick={() => setAba(valor)}>
                  {rotulo} <span>{conta[valor]}</span>
                </button>
              ))}
            </div>
            <label className="at-canais">
              Canal
              <select value={canal} onChange={(e) => setCanal(e.target.value)}>
                <option value="">Todos os canais</option>
                <option value="whatsapp">WhatsApp</option>
                <option value="instagram">Instagram</option>
              </select>
            </label>
          </div>

          <div className="at-rolagem">
            {conversas === null && erro ? (
              <button type="button" className="btn secundario" onClick={() => carregar()}>Tentar novamente</button>
            ) : conversas === null ? (
              <p className="nota">Carregando conversas…</p>
            ) : visiveis.length === 0 ? (
              <p className="nota">{lista.length ? "Nenhuma conversa neste filtro." : busca
                ? `Ninguém encontrado com “${busca}”.`
                : "Nenhuma conversa ainda."}</p>
            ) : (
              visiveis.map((c) => (
                <ItemConversa key={c.id} conversa={c} config={config} ativa={c.id === aberta?.id}
                  aoAbrir={(evento) => abrir(c, evento)} />
              ))
            )}
          </div>
        </aside>

        <section className="at-chat" aria-label="Conversa aberta">
          {aberta ? (
            <>
              <header className="at-chat-topo">
                {compacto && (
                  <button type="button" className="btn secundario at-voltar" aria-label="Voltar à lista"
                    onClick={() => setMostrarChat(false)}><ArrowLeft size={17} aria-hidden="true" /></button>
                )}
                <div className="at-chat-identidade">
                  <h2 tabIndex={-1} ref={tituloChat} title={quem(aberta)}>{quem(aberta)}</h2>
                  <p>
                    {aberta.canal === "instagram" ? "Instagram" : telefoneBonito(aberta.telefone || aberta.contato)}
                    {" · "}{aberta.modo === "humano" && quemAtende(aberta)
                      ? `com ${quemAtende(aberta)}` : SITUACAO[aberta.modo] || ""}
                  </p>
                </div>
                {/* Marcar como não lida: a pessoa não está dizendo que não leu,
                    está dizendo que quer voltar aqui depois. Fecha a conversa
                    para a lista voltar a mostrá-la em negrito, senão o botão
                    parece não ter feito nada. */}
                <button type="button" className="btn secundario at-detalhes-acao"
                  title="Marcar como não lida e voltar para a lista"
                  onClick={async () => {
                    try {
                      await chamar("painel-fila", {
                        method: "POST",
                        body: { acao: "nao_lido", conversa_id: aberta.id },
                      });
                      setAberta(null);
                      setMostrarChat(false);
                      await carregar({ silencioso: true });
                    } catch (e) { setErro(e.message); }
                  }}>
                  <MailOpen size={17} aria-hidden="true" /> <span>Não lida</span>
                </button>
                {/* Por no funil: a decisao de que aquela conversa e uma
                    oportunidade comercial e tomada aqui, lendo o que a pessoa
                    escreveu, e nao depois, no quadro, de memoria. So aparece
                    quando a conta tem funil. */}
                {config?.funis?.length > 0 && (
                  <button type="button" className="btn secundario at-detalhes-acao"
                    title="Por esta conversa no funil de vendas"
                    onClick={() => setPorNoFunil(aberta)}>
                    <Workflow size={17} aria-hidden="true" /> <span>Funil</span>
                  </button>
                )}
                <button type="button" ref={botaoDetalhes} className="btn secundario at-detalhes-acao"
                  aria-expanded={detalhes} aria-controls={detalhesId} aria-label="Detalhes" title="Detalhes"
                  onClick={() => detalhes ? fecharDetalhes() : setDetalhes(true)}>
                  <PanelRight size={17} aria-hidden="true" /> <span>Detalhes</span>
                </button>
              </header>
              <div className="at-chat-corpo">
                <Conversa
                  key={aberta.id} conversaId={aberta.id} rolagemInterna
                  rascunho={rascunhos[aberta.id]}
                  enviando={enviando.has(aberta.id)}
                  aoReservarEnvio={() => reservarEnvio(aberta.id)}
                  aoEditarRascunho={(texto, enviado) => editarRascunho(aberta.id, texto, enviado)}
                  aoMudar={() => carregar({ silencioso: true })}
                  aoCarregar={(d) => {
                    setAberta((atual) => d.estado?.id && atual?.id === d.estado.id ? { ...atual, ...d.estado } : atual);
                    setAtendimentos(d.atendimentos || []);
                  }}
                />
              </div>
            </>
          ) : (
            <div className="at-nenhuma">
              <Vazio Icone={MessagesSquare} titulo="Escolha uma conversa" texto="Selecione um contato na lista para abrir o histórico." />
            </div>
          )}
        </section>

        {nova && (
          <NovaConversa
            cliente={cliente}
            aoFechar={() => setNova(false)}
            aoCriar={async (id) => { setNova(false); await abrirRecemCriada(id); }}
          />
        )}

        {aberta && (
          <dialog ref={painel} id={detalhesId} className="at-lead" data-gaveta={emGaveta}
            aria-labelledby={tituloDetalhesId}
            onCancel={(e) => { e.preventDefault(); fecharDetalhes(); }}
            onKeyDown={(e) => {
              if (e.key !== "Escape") return;
              e.preventDefault();
              if (!e.currentTarget.querySelector('[role="dialog"]')) fecharDetalhes();
            }}>
            <header className="at-lead-topo">
              <h2 id={tituloDetalhesId}>Detalhes</h2>
              <button type="button" ref={fecharPainel} className="btn secundario"
                aria-label="Fechar detalhes" onClick={fecharDetalhes}><X size={18} aria-hidden="true" /></button>
            </header>
            <div className="at-lead-corpo">
              <PainelLead key={aberta.id} cliente={cliente} conversa={aberta} config={config}
                atendimentos={atendimentos} aoMudar={() => carregar({ silencioso: true })} />
            </div>
          </dialog>
        )}

        {porNoFunil && (
          <PorNoFunil
            cliente={cliente} conversa={porNoFunil} config={config}
            aoFechar={() => setPorNoFunil(null)}
            aoCriar={() => { setPorNoFunil(null); carregar({ silencioso: true }); }}
          />
        )}
      </div>
    </section>
  );
}

function ItemConversa({ conversa: c, config, ativa, aoAbrir }) {
  const ig = c.canal === "instagram";
  // Não lida é de quem está olhando, e é o que decide o negrito. "Sem
  // resposta" é outra coisa (ninguém respondeu a pessoa, nem a IA) e vira
  // ficha de texto: duas bolinhas na mesma linha não se leem de relance.
  const naoLido = (c.nao_lidas || 0) > 0 || Boolean(c.marcada);
  const fichas = [];
  if (c.sem_resposta > 0) fichas.push(<Ficha key="sr" texto="sem resposta" cor="var(--erro)" />);
  if (c.modo === "fila") fichas.push(<Ficha key="fila" texto="aguardando atendimento" cor="var(--erro)" />);
  if (c.modo === "humano") fichas.push(<Ficha key="eq" texto={quemAtende(c, "equipe")} cor="var(--alerta)" />);
  if (c.origem?.ctwa_clid) fichas.push(<Ficha key="an" texto="anúncio" cor="var(--cat-1)" />);
  for (const e of (c.etiquetas || []).slice(0, 2)) {
    fichas.push(<Ficha key={`e${e}`} texto={e} cor={config ? corDaEtiqueta(e, config.etiquetas) : null} />);
  }

  const restantes = Math.max(0, (c.etiquetas?.length || 0) - 2);
  if (restantes) fichas.push(<Ficha key="mais" texto={`+${restantes} etiquetas`} />);
  const previa = c.previa
    ? `${c.previa_papel !== "user" ? "Você: " : ""}${c.previa}`
    : "Sem mensagem ainda.";

  return (
    <button aria-pressed={ativa} type="button" className={`at-item ${ativa ? "ativa" : ""}`} data-naolido={naoLido ? "sim" : undefined} onClick={aoAbrir}>
      <span className="at-avatar">
        {iniciaisDe(c.nome_contato || "")}
        <span className={`canal ${ig ? "ig" : ""}`} aria-hidden="true">
          {ig ? <Instagram size={8} strokeWidth={2.5} /> : <MessageCircle size={8} strokeWidth={2.5} />}
        </span>
      </span>
      <span className="at-corpo">
        <span className="at-linha">
          <strong className="at-nome">{quem(c)}</strong>
          <small className="at-hora">{quando(c.ultima_em)}</small>
        </span>
        <span className="at-previa" title={previa}>{previa}</span>
        <span className="at-fichas">{fichas}</span>
      </span>
      <span className="at-marca"><NaoLidas conversa={c} /></span>
    </button>
  );
}

/** O painel da direita: quem é a pessoa e o negócio dela no CRM. */
/**
 * O nome de quem está com a conversa. O gestor não tem linha em `atendentes`,
 * então `atendentes(nome)` não responde por ele e a tela ficava dizendo
 * "equipe" sobre uma conversa que tem dono.
 */
function quemAtende(linha, vazio = "") {
  if (linha?.atendentes?.nome) return linha.atendentes.nome;
  return linha?.assumido_por === "operador" ? "Gestor" : vazio;
}

const DESFECHOS = {
  encerrado: "encerrada pela equipe",
  devolvido_ia: "devolvida para a IA",
  inatividade: "voltou para a IA sem resposta",
  devolvido: "devolvida para a fila",
  abandonado: "interrompida",
  passado: "passada para outra pessoa",
};

function PainelLead({ cliente, conversa, config, atendimentos = [], aoMudar }) {
  return (
    <>
      <div className="at-bloco">
        <h3>Lead</h3>
        <dl className="at-dados">
          <dt>Nome</dt><dd>{conversa.nome_contato || "sem nome"}</dd>
          <dt>{conversa.canal === "instagram" ? "Perfil" : "WhatsApp"}</dt>
          <dd>{conversa.canal === "instagram" ? `@${conversa.nome_contato || conversa.contato}` : telefoneBonito(conversa.telefone || conversa.contato)}</dd>
          <dt>Situação</dt><dd>{conversa.modo === "humano" && quemAtende(conversa) ? `com ${quemAtende(conversa)}` : SITUACAO[conversa.modo] || conversa.modo}</dd>
          {conversa.score > 0 && (<><dt>Score</dt><dd className="mono">{conversa.score}</dd></>)}
          {conversa.origem?.headline && (<><dt>Anúncio</dt><dd>{conversa.origem.headline}</dd></>)}
          {conversa.origem?.ctwa_clid && !conversa.origem?.headline && (<><dt>Origem</dt><dd>Anúncio</dd></>)}
          <dt>Chegou</dt><dd className="mono">{dataHora(conversa.criado_em)}</dd>
        </dl>
        {(conversa.etiquetas || []).length > 0 && (
          <div className="negocio-fichas">
            {conversa.etiquetas.map((e) => <Ficha key={e} texto={e} cor={corDaEtiqueta(e, config?.etiquetas)} />)}
          </div>
        )}
      </div>

      {config ? (
        <NegociosDoLead cliente={cliente} conversa={conversa} config={config} aoMudar={aoMudar} />
      ) : (
        <div className="at-bloco">
          <h3>Negócio no CRM</h3>
          <p className="nota">{config === false ? "Detalhes do CRM indisponíveis." : "Carregando CRM…"}</p>
        </div>
      )}

      {atendimentos.length > 0 && (
        <div className="at-bloco">
          <h3>Atendimentos humanos</h3>
          <ol className="linha-do-tempo">
            {atendimentos.map((a) => (
              <li key={a.id}>
                <span className="ponto-tempo" aria-hidden="true" />
                <div>
                  <strong>{quemAtende(a, "Equipe")}</strong>
                  <p>{a.motivo || "Dúvida não informada"}</p>
                  <small>{dataHora(a.assumida_em || a.entrou_fila)} · {a.encerrada_em ? (DESFECHOS[a.desfecho] || a.desfecho || "encerrada") : "em andamento"}</small>
                </div>
              </li>
            ))}
          </ol>
        </div>
      )}
    </>
  );
}

function NegociosDoLead({ cliente, conversa, config, aoMudar }) {
  const [negocios, setNegocios] = useState(null);
  const [aberto, setAberto] = useState(null);
  const [erro, setErro] = useState("");
  const [ocupado, setOcupado] = useState(false);
  const primeiroFunil = config.funis[0];
  const [novo, setNovo] = useState({
    funil: primeiroFunil?.id || "",
    etapa: primeiroFunil?.etapas.find((e) => e.tipo === "aberta")?.id || primeiroFunil?.etapas[0]?.id || "",
    valor: "",
  });
  const etapas = config.funis.flatMap((f) => f.etapas);

  const carregar = useCallback(async () => {
    try {
      const d = await chamar(`painel-crm?cliente=${cliente.id}&conversa=${conversa.id}`);
      setNegocios(d.negocios || []);
    } catch (e) {
      setErro(e.message);
      setNegocios([]);
    }
  }, [cliente.id, conversa.id]);
  useEffect(() => { carregar(); }, [carregar]);

  async function criar() {
    setOcupado(true); setErro("");
    try {
      await chamar(`painel-crm?cliente=${cliente.id}`, {
        method: "POST",
        body: { acao: "salvar-negocio", dados: { conversa_id: conversa.id, etapa_id: novo.etapa, valor: novo.valor || 0 } },
      });
      await carregar();
      aoMudar?.();
    } catch (e) {
      setErro(e.message);
    } finally {
      setOcupado(false);
    }
  }

  async function mover(n, etapaId) {
    const etapa = etapas.find((e) => e.id === etapaId);
    // Ganho e perdido pedem motivo: abre a ficha inteira em vez de mover calado.
    if (etapa && etapa.tipo !== "aberta") { setAberto(n.id); return; }
    setErro("");
    try {
      await chamar(`painel-crm?cliente=${cliente.id}`, { method: "POST", body: { acao: "mover-negocio", dados: { id: n.id, etapa_id: etapaId } } });
      carregar();
    } catch (e) {
      setErro(e.message);
    }
  }

  const funilNovo = config.funis.find((f) => f.id === novo.funil);

  return (
    <>
      <div className="at-bloco">
        <h3>Negócio no CRM</h3>
        {erro && <div className="aviso erro" role="alert">{erro}</div>}

        {negocios === null ? <p className="nota">Carregando…</p> : negocios.map((n) => {
          const funil = config.funis.find((f) => f.id === n.funil_id);
          return (
            <div className="at-negocio" key={n.id}>
              <div className="at-negocio-topo">
                <strong>{n.titulo}</strong>
                <span>{dinheiro(n.valor)}</span>
              </div>
              <select aria-label="Etapa" value={n.etapa_id} onChange={(e) => mover(n, e.target.value)}>
                {(funil?.etapas || []).map((e) => <option key={e.id} value={e.id}>{funil.nome}: {e.nome}</option>)}
              </select>
              {n.etiquetas?.length > 0 && (
                <div className="negocio-fichas">{n.etiquetas.map((e) => <Ficha key={e} texto={e} cor={corDaEtiqueta(e, config.etiquetas)} />)}</div>
              )}
              <button type="button" className="link-botao" onClick={() => setAberto(n.id)}>
                Abrir ficha do negócio <ExternalLink size={12} />
              </button>
            </div>
          );
        })}

        {negocios !== null && negocios.length === 0 && (
          config.funis.length === 0 ? (
            <p className="nota">Nenhum funil criado ainda. Crie o funil na tela Funil de vendas para colocar este lead no CRM.</p>
          ) : (
            <>
              <p className="nota">Este lead ainda não está no funil.</p>
              {config.funis.length > 1 && (
                <select aria-label="Funil" value={novo.funil} onChange={(e) => {
                  const f = config.funis.find((x) => x.id === e.target.value);
                  setNovo({ ...novo, funil: e.target.value, etapa: f?.etapas[0]?.id || "" });
                }}>
                  {config.funis.map((f) => <option key={f.id} value={f.id}>{f.nome}</option>)}
                </select>
              )}
              <select aria-label="Etapa" value={novo.etapa} onChange={(e) => setNovo({ ...novo, etapa: e.target.value })}>
                {(funilNovo?.etapas || []).filter((e) => e.tipo === "aberta").map((e) => <option key={e.id} value={e.id}>{e.nome}</option>)}
              </select>
              <input type="text" inputMode="decimal" aria-label="Valor" placeholder="Valor (R$), opcional"
                value={novo.valor} onChange={(e) => setNovo({ ...novo, valor: e.target.value })} />
              <button type="button" className="btn pequeno" disabled={ocupado || !novo.etapa} onClick={criar}>
                {ocupado ? "Adicionando…" : "Adicionar ao funil →"}
              </button>
            </>
          )
        )}
      </div>

      {aberto && (
        <PainelNegocio
          cliente={cliente} config={config} negocioId={aberto}
          aoFechar={() => setAberto(null)} aoMudar={() => { carregar(); aoMudar?.(); }}
        />
      )}
    </>
  );
}

/**
 * Começar uma conversa com quem nunca escreveu.
 *
 * Dois campos e nada mais: nome e telefone. O que esta janela NÃO tenta fazer
 * é mandar a mensagem. Para número novo a janela de 24 horas está fechada e a
 * Meta recusa texto livre, então quem manda a primeira é o botão de modelos,
 * que já existe dentro da conversa. A janela diz isso em uma linha, antes de
 * ela clicar, porque descobrir depois é descobrir com a mensagem recusada.
 */
function NovaConversa({ cliente, aoFechar, aoCriar }) {
  const [nome, setNome] = useState("");
  const [telefone, setTelefone] = useState("");
  const [erro, setErro] = useState("");
  const [ocupado, setOcupado] = useState(false);

  async function criar(e) {
    e.preventDefault();
    if (ocupado) return;
    setOcupado(true);
    setErro("");
    try {
      const d = await chamar("painel-fila", {
        method: "POST",
        body: { acao: "nova_conversa", cliente_id: cliente.id, nome, telefone },
      });
      await aoCriar(d.conversa_id);
    } catch (erroDaRota) {
      setErro(erroDaRota.message);
      setOcupado(false);
    }
  }

  return (
    <Modal titulo="Nova conversa" aoFechar={aoFechar} largura={460}
      rodape={(
        <>
          <button type="button" className="btn secundario" onClick={aoFechar}>Cancelar</button>
          <button type="submit" form="form-nova-conversa" className="btn" disabled={ocupado || !telefone.trim()}>
            {ocupado ? "Abrindo…" : "Abrir conversa"}
          </button>
        </>
      )}>
      <form id="form-nova-conversa" onSubmit={criar} className="form-nova-conversa">
        <label className="campo">
          Nome
          <input value={nome} onChange={(e) => setNome(e.target.value)}
            placeholder="Como você vai chamar essa pessoa" autoFocus />
        </label>
        <label className="campo">
          Telefone
          <input value={telefone} onChange={(e) => setTelefone(e.target.value)}
            inputMode="tel" placeholder="93 99999-8888" required />
        </label>
        <p className="nota">
          Com número novo o WhatsApp só aceita modelo aprovado. A conversa abre no seu nome
          e a primeira mensagem sai pelo botão de modelos, dentro dela.
        </p>
        {erro && <div className="aviso erro" role="alert">{erro}</div>}
      </form>
    </Modal>
  );
}
