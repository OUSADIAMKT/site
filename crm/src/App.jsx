import { useState, useEffect, Component } from "react";
import { chamar, pegarToken, guardarToken, esquecerToken } from "./api.js";
import { lugarSalvo, guardarLugar } from "./lugar.js";
import Agente from "./Agente.jsx";
import Midias from "./Midias.jsx";
import Conversas from "./Conversas.jsx";
import Contatos from "./Contatos.jsx";
import Disparos from "./Disparos.jsx";
import Clientes from "./Clientes.jsx";
import Agenda from "./Agenda.jsx";
import Hoje from "./Hoje.jsx";
import Dashboard from "./Dashboard.jsx";
import Fila from "./Fila.jsx";
import Quadro from "./Quadro.jsx";
import Atendentes from "./Atendentes.jsx";
import Frentes from "./Frentes.jsx";
import Desempenho from "./Desempenho.jsx";
import Relatorios from "./Relatorios.jsx";
import Receita from "./Receita.jsx";
import Campanhas from "./Campanhas.jsx";
import Conexoes from "./Conexoes.jsx";
import Canais from "./Canais.jsx";
import Comercial from "./Comercial.jsx";
import Crm from "./Crm.jsx";
import Paginas from "./Paginas.jsx";
import CrmAjustes from "./CrmAjustes.jsx";
import Lateral, { abasPermitidas, ondeEstou } from "./Lateral.jsx";
import BarraSuperior from "./BarraSuperior.jsx";
import { lerTema, aplicarTema, guardarTema } from "./tema.js";

// A visão geral e a fila são densas e pedem mais largura que um formulário.
const LARGAS = ["visao", "fila", "quadro", "desempenho", "relatorios", "campanhas", "conexoes", "receita"];

// O kanban e as conversas em três colunas usam a tela inteira.
const CHEIAS = ["crm", "conversas", "paginas"];

// Erro em uma tela não pode apagar o painel.
//
// Sem isto, qualquer campo inesperado numa linha derruba o React inteiro e a
// pessoa vê uma página branca, sem menu, sem botão de sair e sem a menor ideia
// do que fazer. Já aconteceu com a aba Conversas numa resposta sem a chave que
// ela esperava. Agora cai só a tela, com o erro escrito, e o menu continua de
// pé para a pessoa ir para outra aba.
//
// Tem que ser classe: o React só avisa de erro de render por componentDidCatch,
// e não existe gancho equivalente para função.
class Cerca extends Component {
  constructor(props) {
    super(props);
    this.state = { erro: null };
  }

  static getDerivedStateFromError(erro) {
    return { erro };
  }

  componentDidCatch(erro, info) {
    console.error(`[painel] a aba "${this.props.aba}" quebrou:`, erro, info?.componentStack);
  }

  // Trocar de aba limpa o erro, senão a tela quebrada ficaria para sempre.
  componentDidUpdate(antes) {
    if (antes.aba !== this.props.aba && this.state.erro) this.setState({ erro: null });
  }

  render() {
    if (!this.state.erro) return this.props.children;
    return (
      <div className="aviso erro" role="alert">
        <strong>Esta tela não conseguiu abrir.</strong>
        <div style={{ marginTop: 6 }}>{this.state.erro.message}</div>
        <div style={{ marginTop: 6, fontSize: 13 }}>
          As outras abas continuam funcionando. Se repetir, me manda esta mensagem.
        </div>
      </div>
    );
  }
}

// Telas do REPORT: trabalham com os clientes da agência, não com o cliente
// do atendimento escolhido na lateral.
const DA_AGENCIA = ["relatorios", "campanhas", "conexoes"];

// A Meta devolve o login do Facebook para /?aba=contas&report=... Lê uma
// vez e limpa o endereço, para um F5 não repetir o aviso.
function retornoDoLogin() {
  const p = new URLSearchParams(window.location.search);
  if (!p.get("report")) return null;
  window.history.replaceState(null, "", window.location.pathname);
  return p.get("report") === "conectado"
    ? { tipo: "ok", texto: "Facebook conectado. As contas do seu perfil estão sendo carregadas." }
    : { tipo: "erro", texto: `A conexão com o Facebook não foi concluída: ${p.get("msg") || "tente de novo."}` };
}

function sessaoSalva() {
  try {
    return JSON.parse(localStorage.getItem("ousadia_sessao") || "null");
  } catch {
    return null;
  }
}

export default function App() {
  const [sessao, setSessao] = useState(() => (pegarToken() ? sessaoSalva() : null));
  const [clientes, setClientes] = useState([]);
  const [clienteId, setClienteId] = useState(null);
  // `null` é "todos os canais", e é o padrão de propósito: quem abre o painel
  // quer ver tudo que chegou, não um pedaço escolhido na sessão passada.
  const [canais, setCanais] = useState([]);
  const [canalId, setCanalId] = useState(null);
  const [aba, setAba] = useState("fila");
  // A conversa que o quadro comercial pediu para abrir. Vira tela de
  // Conversas com aquela conversa aberta, e a caixa limpa o pedido assim que
  // o atende: sem isso, voltar para o quadro e para as Conversas reabriria a
  // mesma conversa para sempre.
  const [conversaPedida, setConversaPedida] = useState(null);
  const [erro, setErro] = useState("");
  const [tema, setTema] = useState(lerTema);
  const [esperando, setEsperando] = useState(0);
  const [retorno] = useState(retornoDoLogin);
  // A gaveta do estreito. Mora aqui porque quem abre é o botão da barra
  // superior e quem fecha é a lateral, e os dois são irmãos nesta árvore.
  const [menuAberto, setMenuAberto] = useState(false);
  const [lateralRecolhida, setLateralRecolhida] = useState(false);

  useEffect(() => { aplicarTema(tema); }, [tema]);

  // Só grava quando alguém escolhe de propósito. Abrir o painel no padrão
  // não vira preferência gravada, senão o padrão de hoje seria a escolha
  // de amanhã e uma troca de padrão nunca mais alcançaria ninguém.
  function escolherTema(novo) {
    setTema(novo);
    guardarTema(novo);
  }

  const tipo = sessao?.tipo || "operador";
  const papel = sessao?.papel || null;
  const modulos = sessao?.modulos || null;

  async function carregarClientes() {
    try {
      const { clientes: lista } = await chamar("painel-clientes");
      setClientes(lista);
      // Cliente guardado que já não existe, ou que saiu da mão deste
      // operador, cai no primeiro da lista. Deixar o id velho faria as telas
      // filtrarem por um cliente que não está no seletor e mostrarem vazio
      // sem explicar por quê.
      setClienteId((atual) => (lista.some((c) => c.id === atual) ? atual : lista[0]?.id || null));
    } catch (e) {
      setErro(e.message);
    }
  }

  // Conserta a sessão de quem já estava logada antes de o id passar a vir no
  // login. Sem isto, a aba "Meus" só voltaria a funcionar para elas depois de
  // sair e entrar de novo, ou depois de o token vencer em doze horas, e
  // ninguém ia ligar uma coisa na outra.
  useEffect(() => {
    if (!sessao || sessao.tipo !== "atendente" || sessao.atendente) return;
    let valendo = true;
    chamar(`painel-fila?rota=equipe&cliente=${sessao.cliente}`)
      .then((d) => {
        if (!valendo || !d?.sessao?.atendente) return;
        const completa = { ...sessao, atendente: d.sessao.atendente };
        try { localStorage.setItem("ousadia_sessao", JSON.stringify(completa)); } catch { /* sem armazenamento */ }
        setSessao(completa);
      })
      .catch(() => { /* fica como está; a próxima entrada traz o id */ });
    return () => { valendo = false; };
  }, [sessao?.tipo, sessao?.atendente, sessao?.cliente]);

  useEffect(() => {
    if (!sessao) return;
    // O retorno do Facebook manda para Contas e ganha de onde a pessoa
    // estava: ela acabou de sair daqui para conectar, e o que ela quer ver é
    // se conectou.
    const lugar = retorno ? null : lugarSalvo(sessao);
    if (tipo === "operador") {
      setAba(retorno ? "conexoes" : (lugar?.aba || "clientes"));
      if (lugar?.cliente) setClienteId(lugar.cliente);
      carregarClientes();
    } else {
      setAba(lugar?.aba || (sessao.papel === "gestor" ? "desempenho" : "fila"));
      setClienteId(sessao.cliente);
    }
  }, [sessao]);

  // Grava o lugar a cada troca de aba ou de cliente. Falha de armazenamento
  // não é erro de tela: sem ele o painel volta a abrir no padrão, que é como
  // era antes, e nada mais deixa de funcionar.
  useEffect(() => {
    if (!sessao) return;
    guardarLugar(sessao, aba, clienteId);
  }, [sessao, aba, clienteId]);

  // Os canais do cliente escolhido, para o seletor da lateral.
  //
  // Trocar de cliente zera a escolha de canal: um canal do cliente anterior
  // não existe no novo, e deixar o id velho faria as telas filtrarem por algo
  // que não está na lista, mostrando vazio sem explicar por quê.
  async function carregarCanais() {
    if (!clienteId) { setCanais([]); return; }
    try {
      const r = await chamar(`painel-clientes?rota=canais&cliente=${clienteId}`);
      setCanais(r.canais || []);
    } catch {
      setCanais([]); // sem lista, o seletor some; as telas seguem sem filtro
    }
  }

  useEffect(() => {
    if (!sessao) { setCanais([]); setCanalId(null); return; }
    setCanalId(null);
    carregarCanais();
  }, [sessao, clienteId]);

  // O contador de espera no menu é o que faz alguém olhar a fila sem precisar
  // ser avisado por fora do sistema.
  useEffect(() => {
    if (!sessao) return;
    let vivo = true;
    const buscar = async () => {
      try {
        const q = tipo === "operador" && clienteId ? `?cliente=${clienteId}` : "";
        if (tipo === "operador" && !clienteId) return;
        const r = await chamar(`painel-fila${q}`);
        if (vivo) setEsperando(r.esperando.length);
      } catch { /* silencioso: é só o contador */ }
    };
    buscar();
    const t = setInterval(buscar, 20000);
    return () => { vivo = false; clearInterval(t); };
  }, [sessao, clienteId, tipo]);

  function sair() {
    esquecerToken();
    try { localStorage.removeItem("ousadia_sessao"); } catch { /* sem armazenamento */ }
    setSessao(null);
  }

  if (!sessao) {
    return <Entrar aoEntrar={(s) => {
      try { localStorage.setItem("ousadia_sessao", JSON.stringify(s)); } catch { /* sem armazenamento */ }
      setSessao(s);
    }} />;
  }

  const cliente = tipo === "atendente"
    ? { id: sessao.cliente, nome: sessao.nomeCliente || "" }
    : clientes.find((c) => c.id === clienteId) || null;

  const permitidas = abasPermitidas(tipo, papel, modulos);
  const podeConfigurar = tipo === "operador" || papel === "gestor";
  const abaAtual = permitidas.includes(aba) ? aba : permitidas[0];
  const precisaCliente = abaAtual !== "clientes" && !DA_AGENCIA.includes(abaAtual);
  const onde = ondeEstou(tipo, papel, modulos, abaAtual);
  const emConversas = abaAtual === "conversas";

  return (
    <div className={emConversas ? "app conversas-shell" : "app"}
      data-lateral-recolhida={lateralRecolhida}>
      <Lateral
        tipo={tipo} papel={papel} nome={sessao.nome} modulos={modulos}
        aba={abaAtual} aoTrocarAba={setAba}
        clientes={clientes} clienteId={clienteId} aoTrocarCliente={setClienteId}
        canais={canais} canalId={canalId} aoTrocarCanal={setCanalId}
        esperando={esperando}
        aberta={menuAberto} aoFechar={() => setMenuAberto(false)}
      />

      <main className="conteudo">
        <BarraSuperior
          modulo={onde.modulo} titulo={onde.titulo}
          nome={sessao.nome} tipo={tipo} papel={papel}
          esperando={esperando}
          podeVerFila={permitidas.includes("fila")}
          aoIrParaFila={() => setAba("fila")}
          tema={tema} aoTrocarTema={escolherTema} aoSair={sair}
          aoAbrirMenu={() => setMenuAberto(true)}
          lateralRecolhida={lateralRecolhida}
          aoAlternarLateral={() => setLateralRecolhida((atual) => !atual)}
        />

        <div className={`conteudo-largura ${CHEIAS.includes(abaAtual) ? "cheia" : LARGAS.includes(abaAtual) ? "larga" : ""}`}>
          {erro && <div className="aviso erro" role="alert">{erro}</div>}

          {precisaCliente && !cliente ? (
            <div className="vazio">
              Cadastre um cliente na aba <strong>Clientes</strong> para começar.
            </div>
          ) : (
            <Cerca aba={abaAtual}>
              {abaAtual === "clientes"   && <Clientes clientes={clientes} aoMudar={carregarClientes} />}
              {abaAtual === "agente"     && <Agente cliente={cliente} />}
              {abaAtual === "midias"     && <Midias cliente={cliente} />}
              {abaAtual === "agenda"     && <Agenda cliente={cliente} />}
              {abaAtual === "atendentes" && <Atendentes cliente={cliente} />}
              {abaAtual === "frentes" && <Frentes cliente={cliente} />}
              {abaAtual === "paginas"    && <Paginas cliente={cliente} />}
              {abaAtual === "canais"     && <Canais cliente={cliente} aoMudar={carregarCanais} />}
              {abaAtual === "hoje"       && <Hoje cliente={cliente} />}
              {abaAtual === "visao"      && <Dashboard cliente={cliente} />}
              {abaAtual === "desempenho" && <Desempenho cliente={tipo === "operador" ? cliente : null} />}
              {abaAtual === "fila"       && (
                <Fila
                  cliente={tipo === "operador" ? cliente : null}
                  irParaConversa={(id) => { setConversaPedida(id); setAba("conversas"); }}
                />
              )}
              {abaAtual === "quadro"     && <Quadro cliente={tipo === "operador" ? cliente : null} />}
              {abaAtual === "conversas"  && (
                <Conversas
                  cliente={cliente} eu={sessao.atendente || null} config={null}
                  abrirId={conversaPedida}
                  aoAbrirPedida={() => setConversaPedida(null)}
                />
              )}
              {abaAtual === "crm"        && (
                <Crm
                  cliente={cliente} podeConfigurar={podeConfigurar} irPara={setAba}
                  eu={sessao.atendente || null}
                  irParaConversa={(id) => { setConversaPedida(id); setAba("conversas"); }}
                />
              )}
              {abaAtual === "crm-ajustes" && <CrmAjustes cliente={cliente} />}
              {abaAtual === "comercial"  && <Comercial cliente={cliente} podeConfigurar={podeConfigurar} />}
              {abaAtual === "receita"    && <Receita cliente={cliente} />}
              {abaAtual === "contatos"   && <Contatos cliente={cliente} />}
              {abaAtual === "disparos"   && <Disparos cliente={cliente} />}
              {abaAtual === "relatorios" && <Relatorios irPara={setAba} />}
              {abaAtual === "campanhas"  && <Campanhas irPara={setAba} />}
              {abaAtual === "conexoes"   && <Conexoes retorno={retorno} />}
            </Cerca>
          )}
        </div>
      </main>
    </div>
  );
}

function Entrar({ aoEntrar }) {
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState("");
  const [enviando, setEnviando] = useState(false);

  async function enviar(e) {
    e.preventDefault();
    setErro("");
    setEnviando(true);
    try {
      // Sem email é o operador da plataforma. Com email é atendente.
      const corpo = email.trim() ? { email: email.trim(), senha } : { senha };
      const { token, sessao } = await chamar("painel-entrar", { method: "POST", body: corpo });
      guardarToken(token);
      aoEntrar(sessao);
    } catch (err) {
      setErro(err.message);
      setEnviando(false);
    }
  }

  return (
    <div className="entrar">
      {/* O logotipo fica fora do cartão, sobre o fundo escuro da página. Ele
          não tem fundo próprio e o nome é branco: dentro do cartão ele
          sumiria no tema claro, onde o cartão é branco. */}
      <h1 className="marca"><img src="/logo-crm.svg" alt="Ousadia CRM" /></h1>
      <form onSubmit={enviar}>
        <p>Leads, funil, WhatsApp e campanhas da Ousadia Marketing.</p>

        <div className="campo">
          <label htmlFor="email">Email</label>
          {/* Fica em `text`, e não em `email`, porque o operador entra com o
              campo vazio e o navegador barraria o envio. `inputMode` já traz
              o teclado certo no celular, e `autoComplete` deixa o gerenciador
              de senhas preencher os dois campos de uma vez. */}
          <input
            id="email" type="text" inputMode="email" value={email} autoFocus
            autoComplete="username" spellCheck={false}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="deixe vazio se você é o operador"
          />
        </div>

        <div className="campo">
          <label htmlFor="senha">Senha</label>
          <input
            id="senha" type="password" value={senha}
            autoComplete="current-password"
            onChange={(e) => setSenha(e.target.value)}
          />
        </div>

        {erro && <div className="aviso erro" role="alert">{erro}</div>}

        <button className="btn" type="submit" disabled={enviando || !senha}>
          {enviando ? "Entrando…" : "Entrar"}
        </button>
      </form>
    </div>
  );
}
