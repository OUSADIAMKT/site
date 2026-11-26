import { useState, useRef, useEffect, useCallback } from "react";
import { Paperclip, Smile, Mic, Pause, Play, Trash2, X, Send, Zap } from "lucide-react";
import {
  conferirArquivo, paraBase64, subirParaCofre, rotuloDoTipo, tamanhoLegivel,
  LIMITE_UPLOAD,
  formatoDeGravacao, gravacaoDisponivel, prepararAudio, relogio,
} from "./midia.js";
import { GRUPOS, procurar } from "./emojis.js";
import { buscaDeAtalho, filtrarRespostas, preencherResposta } from "./respostas.js";

// O campo de escrever, com tudo que não é texto.
//
// Mora num arquivo próprio porque o campo cresceu: clipe, microfone, emojis,
// arrastar arquivo, pré-visualização com legenda e a confirmação antes de sair.
// Dentro do Conversa.jsx isso enterrava a regra que mais importa lá, que é
// quem pode escrever.
//
// Duas decisões que não são óbvias:
//
// 1. Nada sai sem confirmação explícita. Arrastar uma foto para a conversa de
//    uma cliente e ela já ter ido embora é um erro que não tem desfazer: a Meta
//    não apaga mensagem enviada. Então todo arquivo passa por uma ficha de
//    conferência, com o arquivo à mostra, antes do botão de enviar.
//
// 2. Falha depois do upload não vira novo upload. Quando a Meta aceitou o
//    arquivo e recusou a mensagem, o servidor devolve o `media_id`. O "tentar
//    de novo" manda só esse id, e o servidor confere se já gravou mensagem com
//    ele nesta conversa. Sem isso, cada tentativa é um risco de mandar duas
//    vezes a mesma coisa.

export default function Compor({
  compacto = false,
  texto,
  aoMudarTexto,
  aoEnviarTexto,
  enviarMidia,
  // Pede ao servidor a autorização de envio para o cofre. Quando não vem (um
  // ensaio, uma tela que não ligou nada), o anexo cai no caminho antigo.
  assinarMidia,
  ocupado = false,
  podeEnviarTexto = false,
  desativado = false,
  // Respostas rápidas: a lista (equipe + pessoais), o nome do contato para
  // preencher {nome}, e quem abre a tela de gerenciar. Sem lista, nada aparece.
  respostas = null,
  nomeDoContato = "",
  aoGerenciarRespostas = null,
}) {
  const [anexo, setAnexo] = useState(null);       // { arquivo, tipo, url, legenda }
  const [subindo, setSubindo] = useState(false);
  const [erro, setErro] = useState("");
  const [repetir, setRepetir] = useState(null);   // { media_id, chave, tipo, legenda }
  const [progresso, setProgresso] = useState(0);  // 0 a 1, só durante o upload
  const [emojisAbertos, setEmojisAbertos] = useState(false);
  const [arrastando, setArrastando] = useState(false);
  const [escolhida, setEscolhida] = useState(0);

  // "/mat" no campo: mostra as respostas que casam. Some quando a pessoa
  // escreve um espaço, porque aí ela está escrevendo, não procurando.
  const termo = respostas ? buscaDeAtalho(texto) : null;
  const sugestoes = termo === null ? [] : filtrarRespostas(respostas, termo);
  useEffect(() => { setEscolhida(0); }, [termo]);

  function usarResposta(r) {
    aoMudarTexto(preencherResposta(r.texto, { nome: nomeDoContato }));
    requestAnimationFrame(() => campo.current?.focus());
  }

  const campo = useRef(null);
  const seletor = useRef(null);
  const enviandoAgora = useRef(false);

  // O endereço do blob da pré-visualização é soltado quando a ficha sai da
  // tela. Sem isso o navegador segura cada arquivo visto em memória.
  useEffect(() => {
    if (!anexo?.url) return;
    return () => URL.revokeObjectURL(anexo.url);
  }, [anexo?.url]);

  const receber = useCallback((arquivo) => {
    const { tipo, erro: recusa } = conferirArquivo(arquivo);
    if (recusa) { setErro(recusa); setRepetir(null); return; }
    setErro("");
    setRepetir(null);
    setAnexo({
      arquivo, tipo, legenda: "",
      url: tipo === "document" ? null : URL.createObjectURL(arquivo),
    });
  }, []);

  /**
   * Áudio gravado aqui mesmo vai direto, sem a ficha de conferência.
   *
   * Arquivo escolhido do computador continua passando pela ficha: ali a
   * conferência vale, porque a pessoa pode ter clicado no arquivo errado e não
   * tem como saber sem ver. Áudio gravado é diferente: quem gravou acabou de
   * falar, sabe o que disse, e o botão de parar é a decisão de mandar. É assim
   * que o WhatsApp funciona, e parar para ouvir o que você mesmo acabou de
   * dizer é uma etapa que ninguém pediu.
   *
   * Desistir continua existindo: a lixeira durante a gravação descarta sem
   * mandar nada.
   */
  // Sem useCallback de propósito: esta função chama `enviarAnexo`, que fecha
  // sobre a prop `enviarMidia`, que por sua vez carrega a conversa aberta.
  // Congelar esta função congelaria junto a conversa de um render antigo, e o
  // áudio sairia na conversa errada. Uma função nova por render não custa
  // nada; um áudio no cliente errado custa caro.
  async function receberGravacao(arquivo) {
    const { tipo, erro: recusa } = conferirArquivo(arquivo);
    if (recusa) { setErro(recusa); setRepetir(null); return; }
    setErro("");
    setRepetir(null);
    const gravado = { arquivo, tipo, legenda: "", url: null };
    setAnexo(gravado);
    await enviarAnexo(gravado);
  }

  function limpar() {
    setAnexo(null);
    setErro("");
    setRepetir(null);
    setSubindo(false);
    setProgresso(0);
  }

  /** Manda o que está na ficha. Uma vez só, mesmo com clique repetido. */
  async function mandar(corpo) {
    if (enviandoAgora.current) return;
    enviandoAgora.current = true;
    setSubindo(true);
    setErro("");
    try {
      await enviarMidia(corpo);
      limpar();
    } catch (e) {
      // Upload feito, entrega falhou: guarda o id para não subir de novo.
      const id = e?.dados?.media_id;
      if (id) {
        setRepetir({
          media_id: id,
          // A chave do cofre volta junto: o reenvio reaproveita o objeto que
          // já está lá em vez de subir o arquivo outra vez.
          chave: e.dados.chave || corpo.chave,
          tipo: e.dados.tipo || corpo.tipo,
          // O mime vai junto porque é ele que decide se o áudio chega como
          // mensagem de voz. Sem ele, um reenvio viraria anexo comum.
          mime: corpo.mime,
          legenda: corpo.legenda,
        });
        setErro(`${e.message} O arquivo já subiu, então tentar de novo não manda duas vezes.`);
      } else {
        setErro(e.message || "Não deu para enviar.");
      }
      setSubindo(false);
    } finally {
      enviandoAgora.current = false;
    }
  }

  /**
   * Leva o arquivo até onde o servidor consegue buscá-lo, e devolve o corpo da
   * confirmação.
   *
   * Dois caminhos. O do cofre: pede uma autorização de envio, sobe o arquivo
   * direto para lá e confirma com o nome do objeto. O antigo, que vale quando o
   * cofre não está configurado: o arquivo viaja dentro da requisição, em
   * base64, e aí o teto é de 3 MB.
   *
   * Quem decide qual caminho vale é o servidor, não esta tela: ela tenta o
   * primeiro e lê a resposta.
   */
  async function levarOArquivo(oAnexo) {
    const mime = oAnexo.arquivo.type;
    const nome = oAnexo.arquivo.name || undefined;
    const legenda = oAnexo.legenda.trim() || undefined;

    let autorizacao = null;
    if (assinarMidia) {
      try {
        autorizacao = await assinarMidia({ mime, tamanho: oAnexo.arquivo.size, nome });
      } catch (e) {
        // 409 com limite é o cofre desligado neste ambiente: cai no caminho
        // antigo. Qualquer outra recusa (formato, tamanho, conversa) é a
        // palavra final do servidor e aparece como está.
        const limite = e?.dados?.limite;
        if (!(e?.status === 409 && limite)) throw e;
        if (oAnexo.arquivo.size > limite) {
          throw new Error(`${e.message} Por esse caminho cabem ${tamanhoLegivel(limite)}; `
            + `este arquivo tem ${tamanhoLegivel(oAnexo.arquivo.size)}.`);
        }
      }
    }

    if (autorizacao?.url) {
      setProgresso(0);
      await subirParaCofre(oAnexo.arquivo, autorizacao.url, setProgresso);
      return { chave: autorizacao.chave, mime, nome, legenda };
    }

    if (oAnexo.arquivo.size > LIMITE_UPLOAD) {
      throw new Error(`Sem o cofre, o painel manda até ${tamanhoLegivel(LIMITE_UPLOAD)} por vez.`);
    }
    return { arquivo: { conteudo: await paraBase64(oAnexo.arquivo), mime, nome }, legenda };
  }

  async function enviarAnexo(oAnexo = anexo) {
    if (!oAnexo || enviandoAgora.current) return;

    // A trava fica de pé durante o upload também: num vídeo de 15 MB há tempo
    // de sobra para alguém apertar enviar duas vezes.
    enviandoAgora.current = true;
    setSubindo(true);
    setErro("");

    let corpo;
    try {
      corpo = await levarOArquivo(oAnexo);
    } catch (e) {
      setErro(e.message || "Não deu para enviar o arquivo.");
      setSubindo(false);
      setProgresso(0);
      enviandoAgora.current = false;
      return;
    }
    enviandoAgora.current = false;

    await mandar(corpo);
  }

  async function tentarDeNovo() {
    if (!repetir) return;
    await mandar({
      media_id: repetir.media_id,
      chave: repetir.chave,
      tipo: repetir.tipo,
      mime: repetir.mime,
      legenda: repetir.legenda || undefined,
    });
  }

  function inserirEmoji(emoji) {
    const area = campo.current;
    if (!area) { aoMudarTexto(`${texto}${emoji}`); return; }
    const ini = area.selectionStart ?? texto.length;
    const fim = area.selectionEnd ?? texto.length;
    aoMudarTexto(texto.slice(0, ini) + emoji + texto.slice(fim));
    // O cursor vai para depois do emoji, senão o próximo cai antes dele.
    requestAnimationFrame(() => {
      area.focus();
      const onde = ini + emoji.length;
      area.setSelectionRange(onde, onde);
    });
  }

  const travado = desativado || ocupado || subindo;

  return (
    <div
      className={`compor-tudo${arrastando ? " arrastando" : ""}`}
      onDragOver={(e) => { if (!travado) { e.preventDefault(); setArrastando(true); } }}
      onDragLeave={(e) => { if (!e.currentTarget.contains(e.relatedTarget)) setArrastando(false); }}
      onDrop={(e) => {
        e.preventDefault();
        setArrastando(false);
        if (travado) return;
        const arquivo = e.dataTransfer?.files?.[0];
        if (arquivo) receber(arquivo);
      }}
    >
      {arrastando && <div className="compor-alvo">Solte aqui para anexar</div>}

      {erro && (
        <div className="compor-erro" role="alert">
          <span>{erro}</span>
          {repetir ? (
            <button type="button" className="link-botao" disabled={subindo} onClick={tentarDeNovo}>
              Tentar de novo
            </button>
          ) : (
            <button type="button" className="link-botao" onClick={() => setErro("")}>Fechar</button>
          )}
        </div>
      )}

      {anexo && !repetir && (
        <FichaDoAnexo
          anexo={anexo}
          subindo={subindo}
          progresso={progresso}
          aoMudarLegenda={(v) => setAnexo((a) => ({ ...a, legenda: v }))}
          aoEnviar={enviarAnexo}
          aoCancelar={limpar}
        />
      )}

      {emojisAbertos && (
        <Emojis aoEscolher={inserirEmoji} aoFechar={() => setEmojisAbertos(false)} />
      )}

      {termo !== null && (
        <div className="compor-respostas" role="listbox" aria-label="Respostas rápidas">
          {sugestoes.length ? sugestoes.map((r, i) => (
            <button
              key={r.id} type="button" role="option" aria-selected={i === escolhida}
              className={i === escolhida ? "escolhida" : ""}
              onMouseDown={(e) => { e.preventDefault(); usarResposta(r); }}
            >
              <strong>/{r.atalho}</strong>
              {r.atendente_id && <span className="compor-respostas-tag">sua</span>}
              <span className="compor-respostas-texto">{r.texto}</span>
            </button>
          )) : (
            <p className="compor-respostas-vazio">Nenhuma resposta com "/{termo}".</p>
          )}
          {aoGerenciarRespostas && (
            <button type="button" className="link-botao compor-respostas-gerenciar"
                    onMouseDown={(e) => { e.preventDefault(); aoGerenciarRespostas(); }}>
              Gerenciar respostas rápidas
            </button>
          )}
        </div>
      )}

      <div className={compacto ? "responder at-compor" : "responder"}>
        <input
          ref={seletor}
          type="file"
          className="compor-oculto"
          onChange={(e) => {
            const arquivo = e.target.files?.[0];
            // O valor é limpo para que escolher o mesmo arquivo de novo depois
            // de um erro ainda dispare o onChange.
            e.target.value = "";
            if (arquivo) receber(arquivo);
          }}
        />

        <button
          type="button" className="compor-icone" title="Anexar arquivo"
          aria-label="Anexar arquivo" disabled={travado}
          onClick={() => seletor.current?.click()}
        >
          <Paperclip size={18} aria-hidden="true" />
        </button>

        <button
          type="button" className="compor-icone" title="Emojis"
          aria-label="Emojis" aria-expanded={emojisAbertos} disabled={travado}
          onClick={() => setEmojisAbertos((v) => !v)}
        >
          <Smile size={18} aria-hidden="true" />
        </button>

        {aoGerenciarRespostas && (
          <button
            type="button" className="compor-icone" title="Respostas rápidas (digite / no campo)"
            aria-label="Respostas rápidas" disabled={travado}
            onClick={aoGerenciarRespostas}
          >
            <Zap size={18} aria-hidden="true" />
          </button>
        )}

        <textarea
          ref={campo}
          aria-label="Escrever mensagem"
          value={texto}
          disabled={desativado}
          onChange={(e) => aoMudarTexto(e.target.value)}
          placeholder={compacto ? undefined : "Escreva aqui. Sai pelo mesmo canal em que a pessoa falou."}
          rows={compacto ? 1 : 2}
          onPaste={(e) => {
            // Foto colada da área de transferência: é como a maioria manda
            // print de tela, e sem isso o Ctrl+V não fazia nada.
            const arquivo = [...(e.clipboardData?.items || [])]
              .find((i) => i.kind === "file")?.getAsFile();
            if (arquivo && !travado) { e.preventDefault(); receber(arquivo); }
          }}
          onKeyDown={(e) => {
            if (sugestoes.length) {
              if (e.key === "ArrowDown") { e.preventDefault(); setEscolhida((i) => (i + 1) % sugestoes.length); return; }
              if (e.key === "ArrowUp") { e.preventDefault(); setEscolhida((i) => (i - 1 + sugestoes.length) % sugestoes.length); return; }
              if ((e.key === "Enter" || e.key === "Tab") && !e.shiftKey) {
                e.preventDefault();
                usarResposta(sugestoes[escolhida] || sugestoes[0]);
                return;
              }
            }
            if (termo !== null && e.key === "Escape") { e.preventDefault(); aoMudarTexto(""); return; }
            if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
              e.preventDefault();
              if (podeEnviarTexto && !travado) aoEnviarTexto();
            }
          }}
        />

        {texto.trim() ? (
          <BotaoEnviar compacto={compacto} ocupado={ocupado} disabled={!podeEnviarTexto || travado} aoClicar={aoEnviarTexto} />
        ) : (
          <Microfone
            travado={travado}
            aoGravar={(arquivo) => receberGravacao(arquivo)}
            aoFalhar={(m) => setErro(m)}
          />
        )}
      </div>
    </div>
  );
}

function BotaoEnviar({ compacto, ocupado, disabled, aoClicar }) {
  if (compacto) {
    return (
      <button type="button" className="at-enviar" disabled={disabled}
        onMouseDown={(e) => e.preventDefault()} onClick={aoClicar}>
        Enviar
      </button>
    );
  }
  return (
    <button className="btn" disabled={disabled} onClick={aoClicar}>
      {ocupado ? "Enviando…" : "Enviar"}
    </button>
  );
}

/**
 * A conferência antes de enviar. O arquivo aparece do tamanho em que vai
 * aparecer para a pessoa do outro lado, porque é aí que se percebe que a foto
 * errada foi escolhida.
 */
function FichaDoAnexo({ anexo, subindo, progresso = 0, aoMudarLegenda, aoEnviar, aoCancelar }) {
  const { arquivo, tipo, url, legenda } = anexo;
  const aceitaLegenda = tipo === "image" || tipo === "video" || tipo === "document";

  return (
    <div className="compor-ficha">
      <div className="compor-ficha-topo">
        <strong>Conferir antes de enviar</strong>
        <button type="button" className="compor-icone" title="Descartar"
          aria-label="Descartar anexo" disabled={subindo} onClick={aoCancelar}>
          <X size={16} aria-hidden="true" />
        </button>
      </div>

      <div className="compor-previa">
        {tipo === "image" || tipo === "sticker" ? (
          <img src={url} alt={`Prévia de ${arquivo.name || "imagem"}`} />
        ) : tipo === "video" ? (
          <video controls src={url} />
        ) : tipo === "audio" ? (
          <audio controls src={url} />
        ) : (
          <span className="compor-doc">{arquivo.name || "documento"}</span>
        )}
      </div>

      <p className="compor-meta">
        {rotuloDoTipo(tipo)} · {tamanhoLegivel(arquivo.size)}
        {/* Áudio só chega nesta ficha quando veio de arquivo escolhido do
            computador: o que é gravado aqui vai direto. */}
        {tipo === "audio" && " · ouça antes de mandar"}
        {tipo === "sticker" && " · vai como figurinha"}
      </p>

      {subindo && progresso > 0 && progresso < 1 && (
        // A barra só aparece enquanto há o que mostrar. Em arquivo pequeno o
        // upload termina antes de o olho achar a barra, e piscar uma barra que
        // vai de 0 a 100 num quadro parece defeito.
        <div className="compor-barra" role="progressbar"
          aria-valuenow={Math.round(progresso * 100)} aria-valuemin={0} aria-valuemax={100}>
          <span style={{ width: `${Math.round(progresso * 100)}%` }} />
        </div>
      )}

      {aceitaLegenda ? (
        <input
          type="text" value={legenda} disabled={subindo}
          placeholder="Legenda (opcional)"
          onChange={(e) => aoMudarLegenda(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && !subindo) aoEnviar(); }}
        />
      ) : (
        <p className="dica">O WhatsApp não aceita legenda em {rotuloDoTipo(tipo)}. Escreva numa mensagem separada.</p>
      )}

      <div className="acoes">
        <button type="button" className="btn" disabled={subindo} onClick={() => aoEnviar()}>
          {!subindo ? "Enviar"
            : progresso > 0 && progresso < 1 ? `Subindo ${Math.round(progresso * 100)}%`
              : "Enviando…"}
        </button>
        <button type="button" className="btn secundario" disabled={subindo} onClick={aoCancelar}>
          Cancelar
        </button>
      </div>
    </div>
  );
}

/**
 * O microfone. Grava, pausa, cancela, e no fim entrega um arquivo para a mesma
 * ficha de conferência: quem gravou ouve antes de mandar.
 */
function Microfone({ travado, aoGravar, aoFalhar }) {
  const [estado, setEstado] = useState("parado"); // parado | gravando | pausado
  const [segundos, setSegundos] = useState(0);
  const gravador = useRef(null);
  const pedacos = useRef([]);
  const trilha = useRef(null);
  const cancelado = useRef(false);

  // O microfone fica aberto enquanto grava. Se a tela fechar no meio, a luz da
  // câmera continua acesa e o navegador segura o aparelho.
  useEffect(() => () => pararTrilha(), []);

  useEffect(() => {
    if (estado !== "gravando") return;
    const t = setInterval(() => setSegundos((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, [estado]);

  function pararTrilha() {
    trilha.current?.getTracks().forEach((t) => t.stop());
    trilha.current = null;
  }

  async function comecar() {
    if (!gravacaoDisponivel()) {
      aoFalhar("Este navegador não grava áudio. Use o Chrome, o Edge ou o Firefox atualizados.");
      return;
    }
    const mime = formatoDeGravacao();
    try {
      // Mono de propósito: a Meta só aceita mensagem de voz com uma faixa de
      // áudio ("mono input only"), e um microfone estéreo passaria duas. É um
      // pedido, não uma garantia; o navegador atende quando pode.
      const fluxo = await navigator.mediaDevices.getUserMedia({
        audio: { channelCount: 1 },
      });
      trilha.current = fluxo;
      const g = new MediaRecorder(fluxo, mime ? { mimeType: mime } : undefined);
      pedacos.current = [];
      cancelado.current = false;

      g.ondataavailable = (e) => { if (e.data?.size) pedacos.current.push(e.data); };
      g.onstop = async () => {
        pararTrilha();
        setEstado("parado");
        setSegundos(0);
        if (cancelado.current) return;
        if (!pedacos.current.length) { aoFalhar("A gravação saiu vazia. Tente de novo."); return; }
        try {
          const bruto = new Blob(pedacos.current, { type: g.mimeType || mime || "" });
          aoGravar(await prepararAudio(bruto, g.mimeType || mime));
        } catch (e) {
          aoFalhar(`Não deu para preparar o áudio: ${e.message}`);
        }
      };

      g.start(1000);
      gravador.current = g;
      setSegundos(0);
      setEstado("gravando");
    } catch (e) {
      pararTrilha();
      aoFalhar(
        e?.name === "NotAllowedError"
          ? "O navegador bloqueou o microfone. Libere o acesso no cadeado ao lado do endereço e tente de novo."
          : `Não deu para abrir o microfone: ${e.message}`,
      );
    }
  }

  function pausar() { gravador.current?.pause(); setEstado("pausado"); }
  function retomar() { gravador.current?.resume(); setEstado("gravando"); }
  function concluir() { gravador.current?.stop(); }
  function cancelar() { cancelado.current = true; gravador.current?.stop(); }

  if (estado === "parado") {
    return (
      <button type="button" className="compor-icone compor-mic" title="Gravar áudio"
        aria-label="Gravar áudio" disabled={travado} onClick={comecar}>
        <Mic size={18} aria-hidden="true" />
      </button>
    );
  }

  return (
    <div className="compor-gravando" role="group" aria-label="Gravando áudio">
      <span className="compor-ponto" data-ativo={estado === "gravando"} aria-hidden="true" />
      <span className="compor-tempo">{relogio(segundos)}</span>
      <button type="button" className="compor-icone" title="Descartar gravação"
        aria-label="Descartar gravação" onClick={cancelar}>
        <Trash2 size={16} aria-hidden="true" />
      </button>
      {estado === "gravando" ? (
        <button type="button" className="compor-icone" title="Pausar" aria-label="Pausar" onClick={pausar}>
          <Pause size={16} aria-hidden="true" />
        </button>
      ) : (
        <button type="button" className="compor-icone" title="Continuar" aria-label="Continuar" onClick={retomar}>
          <Play size={16} aria-hidden="true" />
        </button>
      )}
      <button type="button" className="at-enviar compor-ok" title="Enviar áudio"
        aria-label="Enviar áudio" onClick={concluir}>
        <Send size={15} aria-hidden="true" />
      </button>
    </div>
  );
}

/** O quadro de emojis, com categorias e busca. */
function Emojis({ aoEscolher, aoFechar }) {
  const [grupo, setGrupo] = useState(GRUPOS[0].chave);
  const [busca, setBusca] = useState("");
  const achados = busca.trim() ? procurar(busca) : null;
  const atual = GRUPOS.find((g) => g.chave === grupo) || GRUPOS[0];
  const itens = achados ?? atual.itens;

  return (
    <div className="compor-emojis" onKeyDown={(e) => { if (e.key === "Escape") aoFechar(); }}>
      <div className="compor-emojis-topo">
        <input type="text" value={busca} autoFocus
          placeholder="Procurar: coração, entrega, obrigado…"
          onChange={(e) => setBusca(e.target.value)} />
        <button type="button" className="compor-icone" title="Fechar"
          aria-label="Fechar emojis" onClick={aoFechar}>
          <X size={16} aria-hidden="true" />
        </button>
      </div>

      {!achados && (
        <div className="compor-emojis-abas" role="tablist" aria-label="Categorias de emoji">
          {GRUPOS.map((g) => (
            <button key={g.chave} type="button" role="tab" title={g.nome}
              aria-selected={g.chave === grupo} aria-label={g.nome}
              className={g.chave === grupo ? "escolhida" : ""}
              onClick={() => setGrupo(g.chave)}>
              {g.icone}
            </button>
          ))}
        </div>
      )}

      <div className="compor-emojis-grade">
        {itens.length === 0 && <p className="dica">Nada com esse nome.</p>}
        {itens.map(([emoji, palavras]) => (
          <button key={emoji} type="button" title={palavras.split(" ")[0]}
            aria-label={palavras.split(" ")[0]} onClick={() => aoEscolher(emoji)}>
            {emoji}
          </button>
        ))}
      </div>
    </div>
  );
}
