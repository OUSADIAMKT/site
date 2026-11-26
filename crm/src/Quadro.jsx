import { useState, useEffect, useRef } from "react";
import { chamar } from "./api.js";
import Conversa from "./Conversa.jsx";
import Gaveta from "./Gaveta.jsx";
import Filtros, { FILTRO_VAZIO } from "./Filtros.jsx";
import { ORDENS, situacaoDaJanela, atrasado } from "./filtros.js";
import { frasePendente } from "./semResposta.jsx";
import { NaoLidas } from "./naoLidas.jsx";
import CabecalhoPagina from "./CabecalhoPagina.jsx";

// O quadro: as mesmas conversas da Fila, lidas em colunas.
//
// A Fila responde "quem está esperando há mais tempo". O quadro responde
// "como está o atendimento inteiro agora". São perguntas diferentes, e é por
// isso que as duas telas convivem em vez de uma substituir a outra.
//
// FILTRO. Ele vai ao servidor, inteiro, e não roda mais aqui. Antes rodava
// aqui, sobre as cinquenta linhas que o banco havia mandado, e então filtrar
// por etiqueta só encontrava quem já estava entre as cinquenta primeiras:
// trezentas conversas com a IA, quarenta com a etiqueta "matricula", e a tela
// mostrava nada. O contador tinha o mesmo defeito, e mentia sobre o tamanho da
// fila. Quem conta agora é `api/_quadro.js`, sobre todas as conversas que a
// sessão pode ver, e o número que aparece na coluna é o resultado do filtro.

const COLUNAS = [
  {
    chave: "precisa",
    titulo: "Aguardando atendimento",
    vazio: "Ninguém esperando. É isso que a gente quer.",
    acao: "enfileirar",
  },
  {
    chave: "atendendo",
    titulo: "Em atendimento",
    vazio: "Ninguém com a equipe agora.",
    acao: "atender",
  },
  {
    chave: "ia",
    titulo: "IA cuidando",
    vazio: "Nenhuma conversa aberta com a IA.",
    acao: "encerrar",
  },
  {
    chave: "encerrado",
    titulo: "Encerrado",
    vazio: "Nada encerrado nos últimos sete dias.",
    // Histórico. Ele se preenche sozinho quando um cartão sai de "Em
    // atendimento" para "IA cuidando": `encerrar` fecha o atendimento e
    // devolve a conversa para a IA na mesma tacada.
    acao: null,
  },
];

const ROTULO_DA_ACAO = {
  enfileirar: "Mandar para a fila",
  atender: "Assumir",
  encerrar: "Devolver para a IA",
};

// No Instagram o nome é o @ da pessoa, e é por ele que quem atende acha ela no
// aplicativo. Mesma regra da tela Fila.
function quem(c) {
  if (c.canal === "instagram" && c.nome && !c.nome.startsWith("@")) return `@${c.nome}`;
  return c.nome;
}

function desde(iso) {
  if (!iso) return "";
  const min = Math.round((Date.now() - new Date(iso)) / 60000);
  if (min < 1) return "agora";
  if (min < 60) return `${min} min`;
  if (min < 2880) return `${Math.round(min / 60)} h`;
  return `${Math.round(min / 1440)} d`;
}

function faltaPara(iso) {
  const min = Math.round((new Date(iso) - Date.now()) / 60000);
  if (min <= 0) return "fechada";
  if (min < 60) return `${min} min`;
  const horas = Math.floor(min / 60);
  const resto = min % 60;
  return resto ? `${horas}h${String(resto).padStart(2, "0")}` : `${horas}h`;
}

function dataHora(iso) {
  if (!iso) return "";
  return new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit",
  });
}

// O canal como marca de uma letra, não como palavra. "WhatsApp" escrito em
// cada cartão ocupa a largura de um nome e repete o que é igual em quase
// todos; a letra diz a mesma coisa num canto, e o título conta para quem usa
// leitor de tela.
function Canal({ canal }) {
  const ig = canal === "instagram";
  return (
    <span className="quadro-canal" data-canal={ig ? "instagram" : "whatsapp"}
          title={ig ? "Instagram" : "WhatsApp"} aria-label={ig ? "Instagram" : "WhatsApp"}>
      {ig ? "IG" : "WA"}
    </span>
  );
}

/**
 * As fichas de situação do cartão, em ordem de gravidade.
 *
 * Verde é não lida, amarelo é janela perto de fechar, vermelho é janela
 * fechada ou atendimento atrasado. Cada uma diz o que é por escrito: cor
 * sozinha não é informação para quem não distingue as duas pontas da faixa.
 *
 * A não lida não entra aqui porque já tem a bolinha verde no alto do cartão,
 * e a mesma informação duas vezes no mesmo cartão é ruído.
 */
function fichasDe(cartao, agora) {
  const fichas = [];
  const janela = situacaoDaJanela(cartao, agora);

  if (janela === "fechada") {
    fichas.push({ chave: "fechada", tom: "vermelho", texto: "janela fechada",
      dica: "Depois da janela de 24h o WhatsApp só deixa reabrir com modelo aprovado." });
  } else if (janela === "fechando") {
    fichas.push({ chave: "fechando", tom: "amarelo", texto: `fecha em ${faltaPara(cartao.janela_expira_em)}`,
      dica: "A janela de 24h da Meta está perto de fechar." });
  }

  // "Há quanto tempo está esperando resposta" é a pergunta que decide qual
  // cartão abrir primeiro, e por isso ela vira ficha com o tempo escrito, e
  // não um rótulo seco. Vermelho depois de uma hora, que é quando o painel já
  // trata a conversa como atrasada.
  if ((cartao.sem_resposta || 0) > 0 && cartao.sem_resposta_desde) {
    fichas.push({
      chave: "sem_resposta",
      tom: atrasado(cartao, agora) ? "vermelho" : "amarelo",
      texto: `sem resposta há ${desde(cartao.sem_resposta_desde)}`,
      dica: frasePendente(cartao),
    });
  }

  return fichas;
}

function Cartao({ cartao, coluna, aoArrastar, aoSoltarFora, aoAgir, aoAbrir, ocupado }) {
  const [menu, setMenu] = useState(false);
  const agora = Date.now();

  // Encerrado é histórico e não sai dele. Arrastar já era proibido ali; o menu
  // não pode oferecer o que o arrastar recusa. E o `id` do cartão encerrado é
  // a linha de `atendimentos`, não a conversa: mandar ele para a rota daria
  // "Conversa não encontrada" nas três opções.
  const destinos = coluna === "encerrado"
    ? []
    : COLUNAS.filter((c) => c.acao && c.chave !== coluna);

  const fichas = coluna === "encerrado" ? [] : fichasDe(cartao, agora);

  // A linha do meio responde "há quanto tempo e com quem", que é a pergunta
  // que se faz do cartão antes de abrir. Cada coluna conta isso com o campo
  // que ela tem.
  const linha = coluna === "encerrado"
    ? `${dataHora(cartao.encerrada_em)}${cartao.atendente ? ` · ${cartao.atendente}` : ""}`
    : coluna === "precisa" ? `espera há ${desde(cartao.fila_desde)}`
    : coluna === "atendendo" ? `${cartao.atendente || "a equipe"} · há ${desde(cartao.assumida_em)}`
    : `última há ${desde(cartao.ultima_em)}`;

  return (
    <article
      className="quadro-cartao"
      // A borda vermelha é para o atendimento ATRASADO, não para toda
      // conversa sem resposta: mensagem que chegou há cinco minutos ainda não
      // é problema, e pintar todas de vermelho ensina a pessoa a ignorar o
      // vermelho justamente no cartão que importa.
      data-pendente={coluna !== "encerrado" && atrasado(cartao, agora) ? "sim" : undefined}
      // O cartão inteiro abre a conversa. O arrastar continua funcionando
      // porque `dragstart` e `click` são eventos diferentes: o navegador não
      // dispara o clique quando o gesto virou arrasto.
      role="button"
      tabIndex={0}
      onClick={() => aoAbrir?.(cartao, coluna)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") { e.preventDefault(); aoAbrir?.(cartao, coluna); }
      }}
      draggable={coluna !== "encerrado"}
      onDragStart={(e) => {
        e.dataTransfer.effectAllowed = "move";
        // O Firefox não começa arrasto nenhum sem um setData. No Chrome isto
        // não faz falta, e foi por isso que quase passou batido.
        e.dataTransfer.setData("text/plain", cartao.id);
        aoArrastar(cartao, coluna);
      }}
      onDragEnd={aoSoltarFora}
      aria-busy={ocupado || undefined}
    >
      <header className="quadro-cartao-topo">
        <strong>{quem(cartao)}</strong>
        <NaoLidas conversa={cartao} />
        <Canal canal={cartao.canal} />
      </header>

      {/* O motivo da transferencia vira a dica da linha, e nao mais um
          paragrafo proprio: e texto longo, aparece em poucos cartoes e
          empurrava a etiqueta e a previa para fora da altura do cartao. */}
      <p className="quadro-linha" title={cartao.motivo || undefined}>
        {linha}
        {cartao.motivo && <span className="quadro-porque" aria-hidden="true"> ?</span>}
      </p>

      {(cartao.etiquetas || []).length > 0 && (
        <p className="quadro-etiquetas">
          {cartao.etiquetas.slice(0, 3).map((e) => (
            <span key={e} className="etiqueta">{e}</span>
          ))}
          {cartao.etiquetas.length > 3 && (
            <span className="etiqueta" title={cartao.etiquetas.join(", ")}>
              +{cartao.etiquetas.length - 3}
            </span>
          )}
        </p>
      )}

      {cartao.previa && <p className="quadro-previa">{cartao.previa}</p>}

      {fichas.length > 0 && (
        <p className="quadro-fichas">
          {fichas.map((f) => (
            <span key={f.chave} className="quadro-ficha" data-tom={f.tom} title={f.dica}>
              {f.texto}
            </span>
          ))}
        </p>
      )}

      {destinos.length > 0 && (
        <div className="quadro-acoes" onClick={(e) => e.stopPropagation()}>
          <button type="button" className="btn secundario pequeno" onClick={() => setMenu(!menu)}
                  aria-expanded={menu} aria-label={`Mover ${quem(cartao)}`}>
            Mover
          </button>
          {menu && (
            <div className="quadro-menu" role="menu">
              {destinos.map((d) => (
                <button key={d.chave} type="button" role="menuitem" disabled={ocupado}
                        onClick={() => { setMenu(false); aoAgir(d.acao, cartao, coluna); }}>
                  {ROTULO_DA_ACAO[d.acao]}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </article>
  );
}

/**
 * Os números do alto, acima das colunas.
 *
 * Não respeitam o filtro de propósito: o filtro responde "me mostra só isto",
 * e estes respondem "como está o atendimento agora". Se mudassem com o filtro,
 * a pessoa filtraria por um atendente e o painel diria que ninguém espera.
 */
function Indicadores({ i }) {
  if (!i) return null;
  const itens = [
    { chave: "aguardando", rotulo: "aguardando", valor: i.aguardando, tom: i.aguardando > 0 ? "amarelo" : null },
    { chave: "humano", rotulo: "com a equipe", valor: i.humano },
    { chave: "ia", rotulo: "com a IA", valor: i.ia },
    { chave: "sem_resposta", rotulo: "sem resposta", valor: i.sem_resposta, tom: i.sem_resposta > 0 ? "vermelho" : null },
    { chave: "janela_fechando", rotulo: "janela fechando", valor: i.janela_fechando, tom: i.janela_fechando > 0 ? "amarelo" : null },
  ];
  return (
    <div className="quadro-numeros" role="group" aria-label="Situação do atendimento">
      {itens.map((n) => (
        <span key={n.chave} className="quadro-numero" data-tom={n.tom || undefined}>
          <b>{n.valor}</b> {n.rotulo}
        </span>
      ))}
      {i.parcial && (
        <span className="quadro-numero" title="O cliente tem mais conversas que o teto de leitura por coluna, então estes números são um mínimo.">
          pelo menos
        </span>
      )}
    </div>
  );
}

export default function Quadro({ cliente }) {
  const [d, setD] = useState(null);
  const [erro, setErro] = useState("");
  const [filtro, setFiltro] = useState({ ...FILTRO_VAZIO });
  const [ordem, setOrdem] = useState("");
  const [aberta, setAberta] = useState(null);
  const [arrastando, setArrastando] = useState(null);
  const [alvo, setAlvo] = useState(null);
  const [ocupado, setOcupado] = useState(null);
  const timer = useRef(null);
  const topoRef = useRef(null);
  const gradeRef = useRef(null);

  // O filtro inteiro vira consulta. Fica numa função para a recarga automática
  // e a recarga por mudança de filtro mandarem exatamente a mesma pergunta: se
  // divergissem, o quadro se contradiria a cada trinta segundos.
  function consulta() {
    const p = new URLSearchParams({ rota: "quadro" });
    if (cliente) p.set("cliente", cliente.id);
    if (filtro.busca) p.set("busca", filtro.busca);
    if (filtro.canal) p.set("canal", filtro.canal);
    if (filtro.atendente) p.set("atendente", filtro.atendente);
    if (filtro.etiqueta) p.set("etiqueta", filtro.etiqueta);
    if (filtro.tempo) p.set("tempo", filtro.tempo);
    if (filtro.janela) p.set("janela", filtro.janela);
    if (filtro.parados) p.set("parados", "1");
    if (filtro.naoLidas) p.set("naoLidas", "1");
    if (ordem) p.set("ordem", ordem);
    return `painel-fila?${p}`;
  }

  async function carregar(silencioso) {
    try {
      const r = await chamar(consulta());
      setD(r);
      if (!silencioso) setErro("");
    } catch (e) {
      if (!silencioso) setErro(e.message);
    }
  }

  useEffect(() => {
    setD(null);
    setAberta(null);
    carregar();
  }, [cliente?.id]);

  // Qualquer mudança de filtro ou de ordem é uma pergunta nova ao banco, agora
  // que é o banco que filtra e conta. A busca já vem adiada de dentro de
  // `Filtros`, então digitar não dispara uma consulta por letra.
  //
  // `d &&` evita a ida dobrada na primeira pintura: o efeito de cima já
  // carregou. E a recarga é silenciosa de propósito: mexer no filtro não deve
  // apagar a tela e mostrar "Carregando", só trocar o conteúdo das colunas.
  const chave = JSON.stringify([filtro, ordem]);
  useEffect(() => {
    if (d) carregar(true);
  }, [chave]);

  useEffect(() => {
    // Meio minuto. O quadro muda sozinho porque a IA transfere conversa sem
    // ninguém clicar em nada, e um quadro parado mente. A gaveta aberta não
    // impede: o quadro atrás continua certo.
    timer.current = setInterval(() => carregar(true), 30000);
    return () => clearInterval(timer.current);
  }, [cliente?.id, chave]);

  // As quatro colunas vão até o pé da janela, e todas com a mesma altura.
  //
  // A conta não dá para ficar só no CSS porque o alto do quadro muda de
  // altura: o filtro quebra em duas linhas quando a tela é estreita, e um
  // `calc` com número fixo erraria por uma linha inteira justamente ali. O que
  // se mede é onde o alto termina; o resto da janela é do quadro.
  useEffect(() => {
    if (!d) return undefined;
    const medir = () => {
      const topo = topoRef.current;
      const grade = gradeRef.current;
      if (!topo || !grade) return;
      const alto = window.innerHeight - topo.getBoundingClientRect().bottom - 28;
      grade.style.setProperty("--quadro-alto", `${Math.max(300, Math.round(alto))}px`);
    };
    medir();
    const observador = new ResizeObserver(medir);
    if (topoRef.current) observador.observe(topoRef.current);
    window.addEventListener("resize", medir);
    return () => {
      observador.disconnect();
      window.removeEventListener("resize", medir);
    };
  }, [Boolean(d)]);

  async function mover(acao, cartao, origem) {
    setOcupado(cartao.id);
    setErro("");
    try {
      // Soltar o cartão na coluna "IA cuidando" é devolver, não encerrar: a
      // pessoa que arrastou não disse que resolveu, disse que a IA que siga.
      await chamar("painel-fila", {
        method: "POST",
        body: {
          acao,
          conversa_id: cartao.id,
          ...(acao === "encerrar" && { desfecho: "devolvido_ia" }),
        },
      });
      await carregar(true);
    } catch (e) {
      // 409 é o caso de duas pessoas mexendo no mesmo cartão. Não é falha do
      // sistema, é corrida: recarregar mostra onde o cartão realmente está.
      setErro(/já está|alguém pegou/i.test(e.message)
        ? "Alguém mexeu nesta conversa antes de você. O quadro está atualizado."
        : e.message);
      await carregar(true);
    } finally {
      setOcupado(null);
      setArrastando(null);
      setAlvo(null);
    }
  }

  // Soltar fora, ou desistir com Esc, dispara `dragend` e não `dragleave`.
  // Sem limpar aqui, a coluna ficava com o contorno teal aceso dizendo que
  // recebe um cartão que já não está sendo arrastado.
  function limparArrasto() {
    setAlvo(null);
    setArrastando(null);
  }

  // O cartão de "Encerrado" guarda o id do atendimento, não o da conversa:
  // é linha de `atendimentos`. Mandar esse id para a conversa daria
  // "Conversa não encontrada", então ali a gente usa o `conversa_id`.
  function abrir(cartao, coluna) {
    const id = coluna === "encerrado" ? cartao.conversa_id : cartao.id;
    if (!id) return;
    setAberta({ id, nome: quem(cartao), canal: cartao.canal });
  }

  function soltar(coluna) {
    const atual = arrastando;
    limparArrasto();
    if (!atual || !coluna.acao || atual.origem === coluna.chave) return;
    mover(coluna.acao, atual.cartao, atual.origem);
  }

  if (!d) return <div className="vazio">Carregando…</div>;

  // O nome do cliente não entra no título: ele já está no alto da plataforma,
  // no seletor de cliente, e repetido aqui empurrava as colunas para baixo sem
  // dizer nada que a tela não dissesse. O resumo também não: os números logo
  // abaixo dizem a mesma coisa, e com mais detalhe.
  const i = d.indicadores;

  return (
    <>
      <div className="quadro-topo" ref={topoRef}>
        <CabecalhoPagina titulo="Quadro de atendimento" />
        <Indicadores i={i} />

        {erro && <div className="aviso erro" role="alert">{erro}</div>}

        <Filtros
          valor={filtro} aoMudar={setFiltro}
          atendentes={d.atendentes || []} etiquetas={d.etiquetas || []}
          mostrar={{
            busca: true, canal: true, atendente: true, etiqueta: true,
            tempo: true, janela: true, parados: true, naoLidas: true,
          }}
          extra={(
            <select value={ordem} onChange={(e) => setOrdem(e.target.value)} aria-label="Ordenar">
              {ORDENS.map((o) => <option key={o.valor} value={o.valor}>{o.rotulo}</option>)}
            </select>
          )}
        />
      </div>

      <div className="quadro" ref={gradeRef}>
        {COLUNAS.map((coluna) => {
          const cartoes = d.quadro[coluna.chave] || [];
          const total = d.quadro.total?.[coluna.chave] ?? cartoes.length;
          const cortados = d.quadro.truncado?.[coluna.chave] || 0;
          const parcial = d.quadro.parcial?.[coluna.chave];

          return (
            <section
              key={coluna.chave}
              className={`quadro-coluna ${alvo === coluna.chave ? "alvo" : ""}`}
              onDragOver={(e) => {
                if (!coluna.acao || !arrastando || arrastando.origem === coluna.chave) return;
                e.preventDefault();
                setAlvo(coluna.chave);
              }}
              onDragLeave={() => setAlvo(null)}
              onDrop={(e) => { e.preventDefault(); soltar(coluna); }}
            >
              <header className="quadro-coluna-topo">
                <h2>{coluna.titulo}</h2>
                <span className="quadro-conta"
                      title={parcial
                        ? "O cliente tem mais conversas nesta coluna que o teto de leitura, então este número é um mínimo."
                        : `${total} nesta coluna`}>
                  {parcial ? `${total}+` : total}
                </span>
              </header>

              <div className="quadro-pilha">
                {cartoes.length === 0 ? (
                  <p className="quadro-vazio">{coluna.vazio}</p>
                ) : (
                  cartoes.map((cartao) => (
                    <Cartao
                      key={cartao.id}
                      cartao={cartao}
                      coluna={coluna.chave}
                      ocupado={ocupado === cartao.id}
                      aoArrastar={(c, origem) => setArrastando({ cartao: c, origem })}
                      aoSoltarFora={limparArrasto}
                      aoAgir={mover}
                      aoAbrir={abrir}
                    />
                  ))
                )}
              </div>

              {cortados > 0 && (
                <p className="quadro-corte">
                  mostrando {cartoes.length} de {parcial ? `${total}+` : total}
                </p>
              )}
            </section>
          );
        })}
      </div>

      {aberta && (
        <Gaveta titulo={aberta.nome} canal={aberta.canal} aoFechar={() => setAberta(null)}>
          <Conversa
            conversaId={aberta.id}
            aoMudar={() => carregar(true)}
          />
        </Gaveta>
      )}
    </>
  );
}
