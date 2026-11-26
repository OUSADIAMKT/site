import { useState, useEffect, useRef } from "react";
import { Play, Image as ImageIcon, FileText, Video, Download, X, Sticker } from "lucide-react";
import { chamar, baixar } from "./api.js";
import Compor from "./Compor.jsx";
import Modelos from "./Modelos.jsx";
import { AvisoSemResposta } from "./semResposta.jsx";
import { semOAviso } from "./midia.js";

// O painel de uma conversa: o que foi dito e o campo para responder.
//
// Mora num arquivo próprio porque agora tem dois donos: a tela Conversas, que
// abre a conversa em página cheia, e a gaveta do Quadro, que abre a mesma coisa
// por cima do quadro. Duas cópias disso iam divergir na primeira correção de
// regra, e a regra aqui é a que mais importa: quem pode escrever.

function quem(c) {
  if (!c?.nome_contato) return c?.telefone || c?.contato || "Sem nome";
  return c.canal === "instagram" ? `@${c.nome_contato}` : c.nome_contato;
}

function Mensagem({ mensagem }) {
  const rotulos = {
    enviar_midia: "enviou uma mídia",
    atualizar_lead: "anotou informação do lead",
    transferir_humano: "passou para a equipe",
  };

  const transcrito = /^\(áudio transcrito\)\s*/.test(mensagem.texto || "");
  const bruto = transcrito ? mensagem.texto.replace(/^\(áudio transcrito\)\s*/, "") : mensagem.texto;
  const texto = mensagem.anexo ? semOAviso(bruto) : bruto;

  return (
    <>
      {mensagem.anexo && <Anexo anexo={mensagem.anexo} papel={mensagem.papel} />}
      {texto && (
        <div className={`balao ${mensagem.papel}`}>
          {transcrito && <span className="balao-rotulo">Transcrição do áudio</span>}
          {texto}
        </div>
      )}
      {(mensagem.acoes || []).map((a, i) => (
        <div key={i} className="acao-ia">
          ⟶ {rotulos[a.ferramenta] || a.ferramenta}{a.detalhe ? `: ${a.detalhe}` : ""}
        </div>
      ))}
    </>
  );
}

const ROTULO_ANEXO = {
  audio: { Icone: Play, texto: "Ouvir áudio" },
  image: { Icone: ImageIcon, texto: "Ver foto" },
  video: { Icone: Video, texto: "Ver vídeo" },
  sticker: { Icone: Sticker, texto: "Ver figurinha" },
  document: { Icone: FileText, texto: "Abrir documento" },
};

// Imagem e figurinha carregam sozinhas, o resto espera um clique.
const SOZINHO = new Set(["image", "sticker"]);
const VELOCIDADES = [1, 1.5, 2];

/**
 * O arquivo que trafegou na conversa.
 *
 * Foto e figurinha aparecem sozinhas quando entram na tela: é o que se espera
 * de um chat, e carregar ao rolar evita buscar na Meta as cinquenta fotos de
 * uma conversa antiga que ninguém vai abrir. Áudio, vídeo e documento continuam
 * esperando um clique, porque são os pesados.
 */
function Anexo({ anexo, papel }) {
  const [url, setUrl] = useState(null);
  const [erro, setErro] = useState("");
  const [baixando, setBaixando] = useState(false);
  const [ampliada, setAmpliada] = useState(false);
  const [velocidade, setVelocidade] = useState(1);
  const moldura = useRef(null);
  const som = useRef(null);
  const pedido = useRef(false);
  const rotulo = ROTULO_ANEXO[anexo.tipo] || { Icone: FileText, texto: "Abrir arquivo" };

  useEffect(() => () => { if (url) URL.revokeObjectURL(url); }, [url]);

  async function abrir({ abrirAba = false } = {}) {
    if (pedido.current) return;
    pedido.current = true;
    setBaixando(true); setErro("");
    try {
      const blob = await baixar(`painel-conversas?rota=midia&mensagem=${anexo.id}`);
      const link = URL.createObjectURL(blob);
      if (abrirAba) window.open(link, "_blank", "noopener");
      setUrl(link);
    } catch (e) {
      setErro(e.message);
      pedido.current = false;
    } finally {
      setBaixando(false);
    }
  }

  // Carrega quando chega perto da tela, não quando a conversa abre.
  useEffect(() => {
    if (!SOZINHO.has(anexo.tipo) || url || !moldura.current) return;
    if (typeof IntersectionObserver === "undefined") { abrir(); return; }
    const olho = new IntersectionObserver((entradas) => {
      if (entradas.some((e) => e.isIntersecting)) { olho.disconnect(); abrir(); }
    }, { rootMargin: "300px" });
    olho.observe(moldura.current);
    return () => olho.disconnect();
  }, [anexo.tipo, anexo.id]);

  useEffect(() => { if (som.current) som.current.playbackRate = velocidade; }, [velocidade, url]);

  // Esc fecha a foto ampliada, que é o reflexo de todo mundo.
  useEffect(() => {
    if (!ampliada) return;
    const tecla = (e) => { if (e.key === "Escape") setAmpliada(false); };
    document.addEventListener("keydown", tecla);
    return () => document.removeEventListener("keydown", tecla);
  }, [ampliada]);

  const nome = `${anexo.tipo === "document" ? "documento" : anexo.tipo}-${anexo.id}`;

  return (
    <div className={`anexo ${papel}`} ref={moldura}>
      {!url ? (
        SOZINHO.has(anexo.tipo) && !erro ? (
          <span className="anexo-vazio">{baixando ? "Carregando…" : ""}</span>
        ) : (
          <button type="button" className="anexo-botao" disabled={baixando}
            onClick={() => abrir({ abrirAba: anexo.tipo === "document" })}>
            <rotulo.Icone size={15} aria-hidden="true" />
            {baixando ? "Carregando…" : erro ? "Tentar de novo" : rotulo.texto}
          </button>
        )
      ) : anexo.tipo === "audio" ? (
        <div className="anexo-audio">
          <audio ref={som} controls autoPlay src={url} />
          <div className="anexo-velocidade" role="group" aria-label="Velocidade do áudio">
            {VELOCIDADES.map((v) => (
              <button key={v} type="button" aria-pressed={v === velocidade}
                className={v === velocidade ? "escolhida" : ""}
                onClick={() => setVelocidade(v)}>
                {String(v).replace(".", ",")}×
              </button>
            ))}
          </div>
        </div>
      ) : anexo.tipo === "video" ? (
        <>
          <video controls src={url} />
          <a className="anexo-baixar" href={url} download={`${nome}.mp4`}>
            <Download size={13} aria-hidden="true" /> Baixar
          </a>
        </>
      ) : anexo.tipo === "document" ? (
        <div className="anexo-doc">
          <FileText size={15} aria-hidden="true" />
          <a href={url} download={nome}>Baixar documento</a>
          <a href={url} target="_blank" rel="noopener noreferrer">Abrir</a>
        </div>
      ) : (
        <>
          <button type="button" className="anexo-imagem" title="Ampliar"
            aria-label="Ampliar imagem" onClick={() => setAmpliada(true)}>
            <img src={url} alt="Arquivo de imagem da conversa" />
          </button>
          {ampliada && (
            <div className="anexo-lupa" role="dialog" aria-modal="true"
              aria-label="Imagem ampliada" onClick={() => setAmpliada(false)}>
              <img src={url} alt="Arquivo de imagem da conversa, ampliado"
                onClick={(e) => e.stopPropagation()} />
              <div className="anexo-lupa-acoes" onClick={(e) => e.stopPropagation()}>
                <a className="btn secundario" href={url} download={`${nome}.jpg`}>
                  <Download size={14} aria-hidden="true" /> Baixar
                </a>
                <button type="button" className="btn secundario" onClick={() => setAmpliada(false)}>
                  <X size={14} aria-hidden="true" /> Fechar
                </button>
              </div>
            </div>
          )}
        </>
      )}
      {erro && <span className="anexo-erro">{erro}</span>}
    </div>
  );
}

/**
 * O miolo da conversa. `aoMudar` avisa quem abriu que o estado mudou, para o
 * quadro atrás se recarregar sem a pessoa precisar fechar a gaveta.
 */
// O assunto em duas palavras, para caber na lista de quem recebe a conversa.
const ASSUNTO_CURTO = {
  matricula: "matrícula e cursos",
  suporte: "suporte ao aluno",
  agencia: "agência",
};

export default function Conversa({
  conversaId, cabecalho, aoMudar, aoCarregar, rolarSozinho = true,
  rolagemInterna = false, rascunho, aoEditarRascunho,
  enviando = false, aoReservarEnvio,
}) {
  const [mensagens, setMensagens] = useState(null);
  const [estado, setEstado] = useState(null);
  const [erro, setErro] = useState("");
  const [textoLocal, setTextoLocal] = useState("");
  const texto = aoEditarRascunho ? rascunho?.texto || "" : textoLocal;
  const setTexto = aoEditarRascunho ?? setTextoLocal;
  const [ocupado, setOcupado] = useState(false);
  const [equipe, setEquipe] = useState(null);
  const [sessao, setSessao] = useState(null);
  const [passando, setPassando] = useState(false);
  const [modelos, setModelos] = useState(false);
  const [paraQuem, setParaQuem] = useState("");
  const [motivoPassar, setMotivoPassar] = useState("");
  const fim = useRef(null);
  const caixa = useRef(null);
  const ultimo = useRef(null);
  const coladoNoFim = useRef(true);
  const requisicao = useRef(null);
  const montada = useRef(true);

  async function carregar({ silencioso = false } = {}) {
    const controle = rolagemInterna ? new AbortController() : null;
    if (controle) {
      requisicao.current?.abort();
      requisicao.current = controle;
    }
    try {
      const d = await chamar(`painel-conversas?conversa=${conversaId}`, controle ? { signal: controle.signal } : undefined);
      if (controle?.signal.aborted) return;
      const vindo = d.mensagens || [];

      // No modo silencioso só troca o estado quando alguma coisa mudou de
      // verdade. Trocar a lista por outra igual re-renderiza tudo e puxa a
      // rolagem de volta para o fim a cada seis segundos, no meio da leitura.
      const mudou = JSON.stringify(vindo) !== JSON.stringify(ultimo.current);
      ultimo.current = vindo;

      if (!silencioso || mudou) setMensagens(vindo);
      setEstado(d.estado || null);
      setErro("");
      // Quem abriu pode querer o resto do que veio junto, como o histórico de
      // atendimentos, sem pagar uma segunda ida ao mesmo endereço.
      if (rolagemInterna || !silencioso || mudou) aoCarregar?.(d);
    } catch (e) {
      // Falha de uma ronda silenciosa não vira aviso vermelho na tela: a
      // próxima ronda tenta de novo em segundos, e o erro piscando por cima de
      // uma conversa que está inteira ali só assusta quem está atendendo.
      if (!silencioso && !controle?.signal.aborted) setErro(e.message);
    }
  }

  useEffect(() => {
    montada.current = true;
    setMensagens(null);
    setEstado(null);
    setTextoLocal("");
    ultimo.current = null;
    coladoNoFim.current = true;
    carregar();
    return () => {
      montada.current = false;
      requisicao.current?.abort();
    };
  }, [conversaId]);

  // A equipe existe para uma coisa só: saber para quem a conversa pode ser
  // passada.
  //
  // Vai amarrada à conversa aberta, e não carrega uma vez e fica, porque é a
  // conversa que diz de qual cliente é a equipe. A sessão do gestor vale para
  // todos os clientes e não carrega nenhum: sem mandar a conversa aqui, o
  // servidor não tinha como saber de quem pedir a lista, devolvia 403, a lista
  // ficava vazia e o botão de passar não era desenhado. O gestor via só
  // "devolver para a IA" numa conversa que ele mesmo tinha assumido.
  useEffect(() => {
    if (!conversaId) return;
    let valendo = true;
    chamar(`painel-fila?rota=equipe&conversa=${conversaId}`)
      .then((d) => {
        if (!valendo) return;
        setEquipe(d.atendentes || []);
        setSessao(d.sessao || null);
      })
      .catch(() => { if (valendo) setEquipe([]); });
    return () => { valendo = false; };
  }, [conversaId]);

  // A conversa aberta se atualiza sozinha.
  //
  // Antes ela era uma fotografia: carregava na abertura e nunca mais. Quem
  // devolvia a conversa para a IA e continuava lendo não via mais nada do que
  // chegava, nem a pessoa escrevendo nem a IA respondendo, e não tinha como
  // saber disso. Só fechar e abrir de novo mostrava.
  //
  // Para quando a aba sai da frente: painel esquecido aberto a noite inteira
  // não precisa bater no servidor a cada seis segundos.
  useEffect(() => {
    if (!conversaId) return;

    const ronda = () => { if (!document.hidden) carregar({ silencioso: true }); };
    const relogio = setInterval(ronda, 6000);
    const aoVoltar = () => { if (!document.hidden) carregar({ silencioso: true }); };
    document.addEventListener("visibilitychange", aoVoltar);

    return () => { clearInterval(relogio); document.removeEventListener("visibilitychange", aoVoltar); };
  }, [conversaId]);

  // A conversa abre no fim, que é onde está a última mensagem. Abrir no começo
  // obriga a pessoa a rolar toda vez só para ver o que acabou de chegar.
  useEffect(() => {
    // Só desce sozinho quem já estava no fim. Quem subiu para reler alguma
    // coisa fica onde está: mensagem nova chegando e arrancando a tela da mão
    // da pessoa é pior do que não avisar que chegou.
    if (rolarSozinho && mensagens && coladoNoFim.current) {
      if (rolagemInterna && caixa.current) caixa.current.scrollTop = caixa.current.scrollHeight;
      else fim.current?.scrollIntoView({ block: "end" });
    }
  }, [mensagens, rolarSozinho, rolagemInterna]);

  const historicoVisivel = mensagens !== null;
  useEffect(() => {
    const historico = caixa.current;
    if (!rolagemInterna || !rolarSozinho || !historico) return;
    const observar = new ResizeObserver(() => {
      if (coladoNoFim.current) historico.scrollTop = historico.scrollHeight;
    });
    observar.observe(historico);
    return () => observar.disconnect();
  }, [historicoVisivel, rolagemInterna, rolarSozinho]);

  const comigo = estado?.modo === "humano";

  // Quem pode passar: quem está com a conversa na mão, e gestor ou operador em
  // qualquer uma que esteja com uma pessoa. Atendente não tira conversa da mão
  // de colega.
  const souEu = sessao?.tipo === "atendente" ? sessao.atendente : null;
  const podePassar = comigo && (
    sessao?.tipo !== "atendente" || (souEu && estado?.atendente_id === souEu)
  );
  const colegas = (equipe || []).filter((a) => a.id !== estado?.atendente_id);

  async function passar() {
    if (!paraQuem) return;
    await agir("passar", { para_atendente_id: paraQuem, motivo: motivoPassar.trim() || undefined });
    setPassando(false);
    setParaQuem("");
    setMotivoPassar("");
  }

  // A janela de 24h da Meta. Depois que ela fecha, o WhatsApp só aceita
  // template aprovado, e qualquer coisa escrita aqui volta como erro. No
  // Instagram essa janela não existe.
  const janelaFechada = estado
    && estado.canal !== "instagram"
    && estado.janela_expira_em
    && new Date(estado.janela_expira_em) <= new Date();

  async function agir(acao, extra = {}) {
    let liberarEnvio;
    if (acao === "responder" && aoReservarEnvio) {
      liberarEnvio = aoReservarEnvio();
      if (!liberarEnvio) return;
    }
    setOcupado(true);
    setErro("");
    try {
      await chamar("painel-fila", { method: "POST", body: { acao, conversa_id: conversaId, ...extra } });
      if (acao === "responder") {
        if (aoEditarRascunho) aoEditarRascunho("", rascunho);
        else setTextoLocal("");
      }
      if (rolagemInterna && !montada.current) return;
      await carregar();
      aoMudar?.();
    } catch (e) {
      setErro(e.message);
    } finally {
      liberarEnvio?.();
      setOcupado(false);
    }
  }

  /**
   * Manda arquivo. Vai como uma ação do mesmo endereço que já responde texto,
   * porque `api/` está no teto de 12 funções da Vercel e arquivo novo ali
   * derruba o deploy inteiro.
   *
   * Erro sobe para o Compor em vez de virar aviso daqui: é lá que fica o botão
   * de tentar de novo, e é lá que o `media_id` da falha precisa chegar.
   */
  /**
   * Pede ao servidor onde subir o arquivo.
   *
   * Vai e volta antes de o arquivo sair do computador: é aqui que o servidor
   * confere a conversa, a pessoa, o canal, o formato e o tamanho, e é aqui que
   * ele escolhe o nome do objeto no cofre. A tela nunca escolhe esse nome.
   */
  async function assinarMidia(corpo) {
    return await chamar("painel-fila", {
      method: "POST",
      body: { acao: "midia_assinar", conversa_id: conversaId, ...corpo },
    });
  }

  async function enviarMidia(corpo) {
    const resposta = await chamar("painel-fila", {
      method: "POST",
      body: { acao: "midia", conversa_id: conversaId, ...corpo },
    });
    if (rolagemInterna && !montada.current) return resposta;
    await carregar();
    aoMudar?.();
    return resposta;
  }

  const avisoIa = "A IA está calada nesta conversa. Ela volta a responder quando você encerrar ou devolver, ou sozinha depois de doze horas sem ninguém falar nada.";
  const podeEnviar = Boolean(texto.trim()) && !ocupado && !enviando;

  return (
    <div className="conversa-painel">
      {cabecalho}

      <div className="acoes">
        {estado && (comigo ? (
          <>
            {/* Dois caminhos para a mesma porta, e a diferença é o que fica
                escrito: "encerrei, não tem mais o que tratar agora" não é a
                mesma coisa que "isto não é comigo, a IA que siga". */}
            <button className="btn secundario" disabled={ocupado} onClick={() => agir("encerrar")}>
              Encerrar conversa
            </button>
            <button
              className="btn secundario"
              disabled={ocupado}
              onClick={() => agir("encerrar", { desfecho: "devolvido_ia" })}
            >
              {rolagemInterna ? "Devolver à IA" : "Devolver para a IA"}
            </button>
          </>
        ) : (
          <button className="btn" disabled={ocupado} onClick={() => agir("atender")}>
            {rolagemInterna ? "Assumir conversa" : "Assumir esta conversa"}
          </button>
        ))}
        {estado && !comigo && estado.modo !== "fila" && (
          <button className="btn secundario" disabled={ocupado} onClick={() => agir("enfileirar")}>
            {rolagemInterna ? "Mandar à fila" : "Mandar para a fila"}
          </button>
        )}
        {podePassar && colegas.length > 0 && !passando && (
          <button className="btn secundario" disabled={ocupado} onClick={() => setPassando(true)}>
            {rolagemInterna ? "Transferir conversa" : "Passar para outra pessoa"}
          </button>
        )}
      </div>

      {passando && (
        <div className="cartao" style={{ marginBottom: 12 }}>
          <div className="linha">
            <div className="campo">
              <label htmlFor="passar-quem">Passar para</label>
              <select id="passar-quem" value={paraQuem} onChange={(e) => setParaQuem(e.target.value)}>
                <option value="">escolha…</option>
                {colegas.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.nome}
                    {(a.assuntos || []).length ? ` · ${(a.assuntos || []).map((x) => ASSUNTO_CURTO[x] || x).join(", ")}` : ""}
                    {a.disponivel ? "" : " · ausente"}
                  </option>
                ))}
              </select>
            </div>
            <div className="campo">
              <label htmlFor="passar-motivo">Por quê (quem recebe lê isto)</label>
              <input id="passar-motivo" type="text" value={motivoPassar}
                     placeholder="ex.: já é aluna, virou suporte de acesso"
                     onChange={(e) => setMotivoPassar(e.target.value)} />
            </div>
          </div>
          <p className="dica">
            A conversa sai da sua mão e entra na dela na hora, sem passar pela fila e
            sem voltar para a IA. Quem recebe atende um assunto só ganha a etiqueta dele.
          </p>
          <div className="acoes">
            <button className="btn" disabled={ocupado || !paraQuem} onClick={passar}>
              {ocupado ? "Passando…" : "Passar"}
            </button>
            <button className="btn secundario" disabled={ocupado} onClick={() => setPassando(false)}>
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* Antes de tudo: esta conversa está esperando resposta? É a primeira
          coisa que quem abre precisa saber, e a que se perdia quando conversa
          respondida e conversa parada tinham a mesma cara. */}
      <AvisoSemResposta estado={estado} />

      {comigo && (rolagemInterna ? (
        <details className="at-aviso-ia">
          <summary>IA pausada nesta conversa</summary>
          <p>{avisoIa}</p>
        </details>
      ) : <div className="aviso">{avisoIa}</div>)}

      {erro && <div className="aviso erro" role="alert">{erro}</div>}

      {mensagens === null ? (
        <div className="vazio">Carregando…</div>
      ) : (
        <>
          <div
            className="conversa"
            ref={caixa}
            role={rolagemInterna ? "region" : undefined}
            aria-label={rolagemInterna ? "Histórico de mensagens" : undefined}
            tabIndex={rolagemInterna ? 0 : undefined}
            onScroll={(e) => {
              const el = e.currentTarget;
              coladoNoFim.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
            }}
          >
            {mensagens.length === 0 && <p className="quadro-vazio">Nenhuma mensagem ainda.</p>}
            {mensagens.map((m, i) => <Mensagem key={i} mensagem={m} />)}
            <div ref={fim} />
          </div>

          {/* O campo só existe depois de assumir. O servidor recusa resposta em
              conversa que não está em atendimento humano, e tela que oferece o
              que o servidor nega é pior que tela sem o botão. */}
          {comigo && janelaFechada && (
            <div className="aviso erro">
              A janela de 24 horas fechou. A Meta só deixa escrever primeiro para quem
              falou com a gente nas últimas 24 horas, ou com modelo aprovado. Enquanto
              isso, o que você escrever aqui volta como erro. Se a pessoa mandar qualquer
              mensagem, a janela reabre na hora.
            </div>
          )}

          {/* O caminho que existe quando o campo de texto não serve. Fica à mão
              também com a janela aberta, porque modelo é útil para abrir
              assunto, e some no Instagram, onde não existe nem janela nem
              modelo. */}
          {comigo && estado?.canal !== "instagram" && (
            modelos ? (
              <Modelos
                conversaId={conversaId}
                aoFechar={() => setModelos(false)}
                aoEnviar={async () => { await carregar(); aoMudar?.(); }}
              />
            ) : (
              <button
                type="button"
                className={janelaFechada ? "btn" : "btn secundario pequeno modelos-abrir"}
                onClick={() => setModelos(true)}
              >
                <FileText size={14} /> Modelos aprovados
              </button>
            )
          )}

          {comigo ? (
            <Compor
              compacto={rolagemInterna}
              texto={texto}
              aoMudarTexto={setTexto}
              aoEnviarTexto={() => agir("responder", { texto })}
              enviarMidia={enviarMidia}
        assinarMidia={assinarMidia}
              ocupado={ocupado || enviando}
              podeEnviarTexto={podeEnviar}
            />
          ) : (
            <p className="conversa-travada">
              Assuma a conversa para poder responder. Enquanto ela estiver com a IA,
              o WhatsApp sai no nome do robô e as duas respostas se atropelam.
            </p>
          )}
        </>
      )}
    </div>
  );
}

// O Anexo sai junto para o ensaio da tela poder montá-lo com mídia de
// mentira, sem banco e sem conversa de ninguém.
export { quem, Anexo };
