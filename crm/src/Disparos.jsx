import { useState, useEffect } from "react";
import { chamar } from "./api.js";
import Gaveta from "./Gaveta.jsx";
import CabecalhoPagina from "./CabecalhoPagina.jsx";

// Disparo: a mesma mensagem para um público escolhido por etiqueta.
//
// A tela existe em três tempos, e a ordem importa: escolher quem, escrever o
// quê, e só então mandar. O teste fica entre o escrever e o mandar, e não é
// enfeite: é a última chance de ver a mensagem como o cliente vai ver.

function data(iso) {
  if (!iso) return "";
  return new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit",
  });
}

const ESTADOS = {
  rascunho: "rascunho",
  testando: "testado, ainda não enviado",
  enviando: "enviando",
  concluido: "concluído",
  parado: "parado",
};

export default function Disparos({ cliente }) {
  const [d, setD] = useState(null);
  const [erro, setErro] = useState("");
  const [novo, setNovo] = useState(false);
  const [aberto, setAberto] = useState(null);

  async function carregar() {
    try {
      setD(await chamar(`painel-disparos?cliente=${cliente.id}`));
      setErro("");
    } catch (e) {
      setErro(e.message);
    }
  }

  useEffect(() => { setD(null); setNovo(false); setAberto(null); carregar(); }, [cliente.id]);

  if (!d) return <div className="vazio">Carregando…</div>;

  return (
    <>
      <CabecalhoPagina titulo={<>Disparos de {cliente.nome}</>}>
        A mesma mensagem para um público escolhido por etiqueta. Teste no seu próprio
        número antes de soltar: depois que sai, não volta.
      </CabecalhoPagina>

      <div className="acoes">
        <button className="btn" onClick={() => setNovo(true)}>Novo disparo</button>
      </div>

      {erro && <div className="aviso erro" role="alert">{erro}</div>}

      {d.disparos.length === 0 ? (
        <div className="vazio">Nenhum disparo ainda.</div>
      ) : (
        <div className="cartao">
          <table>
            <thead>
              <tr>
                <th>Disparo</th>
                <th>Situação</th>
                <th className="num">Alvo</th>
                <th className="num">Enviados</th>
                <th className="num">Cliques</th>
                <th className="num">Quando</th>
              </tr>
            </thead>
            <tbody>
              {d.disparos.map((x) => (
                <tr key={x.id} className="clicavel" onClick={() => setAberto(x.id)}>
                  <td>
                    {x.nome}
                    <div style={{ color: "var(--apagado)", fontSize: 12.5, fontWeight: 400 }}>
                      {x.texto.slice(0, 60)}{x.texto.length > 60 ? "…" : ""}
                    </div>
                  </td>
                  <td>
                    <span className={`etiqueta ${x.estado === "concluido" ? "" : "humano"}`}>
                      {ESTADOS[x.estado] || x.estado}
                    </span>
                  </td>
                  <td className="num">{x.totais?.alvo ?? 0}</td>
                  <td className="num">{x.totais?.enviados ?? 0}</td>
                  <td className="num">{x.links?.cliques ?? "—"}</td>
                  <td className="num" style={{ color: "var(--apagado)" }}>{data(x.criado_em)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {novo && (
        <Gaveta titulo="Novo disparo" aoFechar={() => setNovo(false)}>
          <Compor
            cliente={cliente} opcoes={d}
            aoCriar={(id) => { setNovo(false); carregar(); setAberto(id); }}
          />
        </Gaveta>
      )}

      {aberto && (
        <Gaveta titulo="Disparo" aoFechar={() => { setAberto(null); carregar(); }}>
          <Enviar cliente={cliente} id={aberto} />
        </Gaveta>
      )}
    </>
  );
}

/** Escolher o público, escrever a mensagem, anexar banner e link. */
function Compor({ cliente, opcoes, aoCriar }) {
  const [nome, setNome] = useState("");
  const [texto, setTexto] = useState("");
  const [etiquetas, setEtiquetas] = useState([]);
  const [midiaId, setMidiaId] = useState("");
  const [linkId, setLinkId] = useState("");
  const [template, setTemplate] = useState("");
  const [alvo, setAlvo] = useState(null);
  const [erro, setErro] = useState("");
  const [ocupado, setOcupado] = useState(false);

  // O número do público é a coisa que a pessoa olha antes de apertar o botão.
  // Ele se refaz sozinho a cada etiqueta marcada, porque conferir depois de
  // criar é tarde.
  useEffect(() => {
    let vivo = true;
    chamar(`painel-disparos?cliente=${cliente.id}`, {
      method: "POST", body: { acao: "contar", publico: { etiquetas } },
    }).then((r) => { if (vivo) setAlvo(r.alvo); }).catch(() => { if (vivo) setAlvo(null); });
    return () => { vivo = false; };
  }, [etiquetas.join("|")]);

  function marcar(nomeEtiqueta) {
    setEtiquetas((atual) => atual.includes(nomeEtiqueta)
      ? atual.filter((e) => e !== nomeEtiqueta)
      : [...atual, nomeEtiqueta]);
  }

  async function criar() {
    setOcupado(true);
    setErro("");
    try {
      const r = await chamar(`painel-disparos?cliente=${cliente.id}`, {
        method: "POST",
        body: {
          nome, texto,
          midia_id: template ? null : (midiaId || null),
          link_id: template ? null : (linkId || null),
          template_nome: template || null,
          publico: { etiquetas },
        },
      });
      aoCriar(r.disparo.id);
    } catch (e) {
      setErro(e.message);
    } finally {
      setOcupado(false);
    }
  }

  const imagens = opcoes.midias.filter((m) => m.tipo === "image");

  return (
    <div className="conversa-painel">
      <div className="campo">
        <label htmlFor="nome">Nome do disparo</label>
        <input id="nome" type="text" value={nome} onChange={(e) => setNome(e.target.value)}
               placeholder="Black da Mentoria, novembro" />
        <p className="dica">Só para você achar depois. O cliente não vê.</p>
      </div>

      <div className="campo">
        <label>Quem recebe</label>
        {opcoes.etiquetas.length === 0 ? (
          <p className="dica">
            Nenhuma etiqueta ainda. Importe uma lista em Contatos e marque a etiqueta
            lá: é por ela que o disparo acha essa gente.
          </p>
        ) : (
          <div className="escolhas">
            {opcoes.etiquetas.map((e) => (
              <button
                key={e.nome} type="button"
                className={etiquetas.includes(e.nome) ? "ativo" : ""}
                aria-pressed={etiquetas.includes(e.nome)}
                onClick={() => marcar(e.nome)}
              >
                {e.nome} <small>{e.quantos}</small>
              </button>
            ))}
          </div>
        )}
        <p className="dica">
          {alvo === null ? "…" : (
            etiquetas.length === 0
              ? `Sem etiqueta marcada, vai para todos os ${alvo} contatos.`
              : `${alvo} ${alvo === 1 ? "pessoa recebe" : "pessoas recebem"}.`
          )}
          {" "}Quem pediu para não receber já está fora desta conta.
        </p>
      </div>

      <div className="campo">
        <label htmlFor="texto">Mensagem</label>
        <textarea id="texto" rows={6} value={texto} onChange={(e) => setTexto(e.target.value)}
                  placeholder="Oi! A Black da Escola Ousadia começou..." />
        <p className="dica">
          Com banner, o texto vai como legenda da imagem e o WhatsApp corta em 1024
          caracteres. {texto.length} escritos.
        </p>
      </div>

      <div className="campo">
        <label htmlFor="template">Modelo aprovado</label>
        <select id="template" value={template} onChange={(e) => setTemplate(e.target.value)}>
          <option value="">Nenhum, só para quem falou nas últimas 24h</option>
          {(opcoes.templates || []).map((t) => (
            <option key={`${t.name}:${t.language}`} value={t.name}>
              {t.name} · {t.language}
            </option>
          ))}
        </select>
        <p className="dica">
          {template ? (
            <>
              Com modelo, o disparo alcança a lista inteira, inclusive quem nunca
              falou com a gente. O texto abaixo entra no miolo do modelo; o link e o
              banner saem, porque num modelo aprovado eles fazem parte do que a Meta
              já carimbou e não dá para trocar na hora.
            </>
          ) : (
            <>
              Sem modelo, o WhatsApp só entrega para quem falou com a gente nas
              últimas 24 horas. O resto da lista sai marcado como pulado, com o motivo
              escrito. {(opcoes.templates || []).length === 0
                && "Nenhum modelo aprovado ainda: a Meta leva de alguns minutos a um dia para aprovar."}
            </>
          )}
        </p>
      </div>

      {!template && (
      <>
      <div className="campo">
        <label htmlFor="midia">Banner</label>
        <select id="midia" value={midiaId} onChange={(e) => setMidiaId(e.target.value)}>
          <option value="">Sem imagem, só texto</option>
          {imagens.map((m) => (
            <option key={m.id} value={m.id}>{m.chave}{m.descricao ? ` · ${m.descricao}` : ""}</option>
          ))}
        </select>
        <p className="dica">
          As imagens vêm da aba Mídias. Imagem e texto saem numa mensagem só: separadas,
          dobram a chance de a pessoa ver só metade.
        </p>
      </div>

      <div className="campo">
        <label htmlFor="link">Link no fim da mensagem</label>
        <select id="link" value={linkId} onChange={(e) => setLinkId(e.target.value)}>
          <option value="">Nenhum</option>
          {opcoes.links.map((l) => (
            <option key={l.id} value={l.id}>
              {l.destino_rotulo || l.chave}{l.descricao ? ` · ${l.descricao}` : ""}
            </option>
          ))}
        </select>
        <p className="dica">
          É aqui que vai o WhatsApp da Lia. O link sai curto e contado: depois do
          clique a conversa acontece no aparelho dela, fora daqui, então o número de
          cliques é a única coisa que a gente consegue saber.
        </p>
        <NovoLink cliente={cliente} aoCriar={(l) => { opcoes.links.push(l); setLinkId(l.id); }} />
      </div>
      </>
      )}

      {erro && <div className="aviso erro" role="alert">{erro}</div>}

      <div className="acoes">
        <button className="btn" disabled={ocupado || !nome.trim() || !texto.trim()} onClick={criar}>
          {ocupado ? "Criando…" : "Criar e revisar"}
        </button>
      </div>
      <p className="dica" style={{ margin: 0 }}>
        Criar não manda nada. Na tela seguinte você testa no seu número e só então solta.
      </p>
    </div>
  );
}

/**
 * Criar um link na hora, sem sair do disparo.
 *
 * Existe porque o número para onde a pessoa vai responder não é o número que
 * manda: no primeiro disparo é o WhatsApp da Lia, que não está cadastrado como
 * canal e não vai estar hoje. Mandar a pessoa até uma tela de links para voltar
 * depois é perder o disparo no meio do caminho.
 */
function NovoLink({ cliente, aoCriar }) {
  const [abrindo, setAbrindo] = useState(false);
  const [telefone, setTelefone] = useState("");
  const [rotulo, setRotulo] = useState("");
  const [ocupado, setOcupado] = useState(false);
  const [erro, setErro] = useState("");

  if (!abrindo) {
    return (
      <button type="button" className="btn secundario pequeno" onClick={() => setAbrindo(true)}>
        Criar link de WhatsApp
      </button>
    );
  }

  async function criar() {
    setOcupado(true);
    setErro("");
    try {
      const r = await chamar(`painel-disparos?cliente=${cliente.id}`, {
        method: "POST",
        body: { acao: "link", telefone, rotulo: rotulo || "Fale aqui" },
      });
      aoCriar(r.link);
      setAbrindo(false);
    } catch (e) {
      setErro(e.message);
    } finally {
      setOcupado(false);
    }
  }

  return (
    <div className="sub-form">
      <div className="campo">
        <label htmlFor="novo-tel">Número que vai receber as respostas</label>
        <input id="novo-tel" type="tel" value={telefone}
               onChange={(e) => setTelefone(e.target.value)} placeholder="93 99999-0000" />
      </div>
      <div className="campo">
        <label htmlFor="novo-rot">Como chamar esse link na mensagem</label>
        <input id="novo-rot" type="text" value={rotulo}
               onChange={(e) => setRotulo(e.target.value)} placeholder="Fale com a Lia" />
      </div>
      {erro && <div className="aviso erro" role="alert">{erro}</div>}
      <div className="acoes">
        <button type="button" className="btn pequeno" disabled={ocupado || !telefone.trim()} onClick={criar}>
          {ocupado ? "Criando…" : "Criar"}
        </button>
        <button type="button" className="btn secundario pequeno" onClick={() => setAbrindo(false)}>
          Cancelar
        </button>
      </div>
    </div>
  );
}

/** Testar num número, depois soltar em lotes, vendo o progresso. */
function Enviar({ cliente, id }) {
  const [v, setV] = useState(null);
  const [erro, setErro] = useState("");
  const [aviso, setAviso] = useState("");
  const [telefone, setTelefone] = useState("");
  const [ocupado, setOcupado] = useState(false);
  const [enviando, setEnviando] = useState(false);

  async function carregar() {
    try {
      setV(await chamar(`painel-disparos?cliente=${cliente.id}&disparo=${id}`));
    } catch (e) {
      setErro(e.message);
    }
  }

  useEffect(() => { setV(null); carregar(); }, [id]);

  async function testar() {
    setOcupado(true);
    setErro("");
    setAviso("");
    try {
      const r = await chamar(`painel-disparar?cliente=${cliente.id}`, {
        method: "POST", body: { disparo: id, acao: "testar", telefone },
      });
      setAviso(`Teste enviado para ${r.para}. Confira no celular antes de soltar.`);
      await carregar();
    } catch (e) {
      setErro(e.message);
    } finally {
      setOcupado(false);
    }
  }

  // Manda em lotes até acabar. O servidor devolve quantos restam, e é esse
  // número que decide se chama de novo: se o navegador fechar no meio, o que
  // ficou pendente continua pendente e outra pessoa retoma daqui.
  async function soltar() {
    setEnviando(true);
    setErro("");
    try {
      for (;;) {
        const r = await chamar(`painel-disparar?cliente=${cliente.id}`, {
          method: "POST", body: { disparo: id },
        });
        await carregar();
        if (r.acabou) break;
      }
    } catch (e) {
      setErro(e.message);
    } finally {
      setEnviando(false);
    }
  }

  if (erro && !v) return <div className="aviso erro" role="alert">{erro}</div>;
  if (!v) return <div className="vazio">Carregando…</div>;

  const { disparo, contagem } = v;
  const testado = disparo.estado !== "rascunho";
  const acabou = disparo.estado === "concluido";
  const falhas = v.envios.filter((e) => e.estado === "falhou" || e.estado === "pulado");

  // Reservado e enviando sao o mesmo fato para quem olha a tela: alguem esta
  // tratando esta linha agora. A diferenca entre os dois so importa para a
  // recuperacao, e aparece no rastro, nao aqui.
  const andando = contagem.reservado + contagem.enviando;
  const semResposta = v.envios.filter((e) => e.estado === "desconhecido");

  return (
    <div className="conversa-painel">
      <div>
        <h2 style={{ fontSize: 15, margin: "0 0 4px" }}>{disparo.nome}</h2>
        <p className="dica" style={{ margin: 0 }}>
          {ESTADOS[disparo.estado]} · {disparo.totais?.alvo ?? v.envios.length} no público
        </p>
      </div>

      {/* A prévia é a mensagem como ela vai chegar, inclusive o link no fim. */}
      <div className="cartao">
        <div className="conversa">
          {disparo.midias && (
            <div className="balao assistant" style={{ padding: 6 }}>
              <img src={disparo.midias.url} alt="" style={{ maxWidth: "100%", borderRadius: 8, display: "block" }} />
            </div>
          )}
          <div className="balao assistant">
            {disparo.texto}
            {disparo.links && `\n\n${disparo.links.destino_rotulo || "Fale aqui"}: /l/${disparo.links.chave}`}
          </div>
        </div>
      </div>

      {!acabou && (
        <div className="campo">
          <label htmlFor="tel">Testar no seu número</label>
          <div className="responder">
            <input id="tel" type="tel" value={telefone} onChange={(e) => setTelefone(e.target.value)}
                   placeholder="93 99999-0000" style={{ flex: 1 }} />
            <button className="btn secundario" disabled={ocupado || !telefone.trim()} onClick={testar}>
              {ocupado ? "Mandando…" : "Mandar teste"}
            </button>
          </div>
          <p className="dica">
            O teste não entra na contagem do disparo. Pode mandar quantos quiser.
            Se der erro de 24 horas, mande qualquer mensagem para o WhatsApp da loja
            pelo seu celular e tente de novo: é a Meta que só deixa escrever primeiro
            para quem falou com a gente nas últimas 24h, ou com template aprovado.
          </p>
        </div>
      )}

      {aviso && <div className="aviso">{aviso}</div>}
      {erro && <div className="aviso erro" role="alert">{erro}</div>}

      {!testado && !acabou && (
        <div className="aviso">
          Você ainda não testou. Mande no seu número primeiro: é a última chance de
          ver a mensagem do jeito que o cliente vai ver.
        </div>
      )}

      <div className="progresso-disparo">
        <span><strong>{contagem.enviado}</strong> enviados</span>
        <span><strong>{contagem.pendente}</strong> na fila</span>
        <span><strong>{contagem.falhou}</strong> falharam</span>
        <span><strong>{contagem.pulado}</strong> pulados</span>
        {andando > 0 && <span><strong>{andando}</strong> saindo agora</span>}
        {contagem.desconhecido > 0 && (
          <span><strong>{contagem.desconhecido}</strong> sem confirmação</span>
        )}
      </div>

      {!acabou && (
        <div className="acoes">
          <button className="btn" disabled={enviando || contagem.pendente === 0} onClick={soltar}>
            {enviando
              ? `Enviando… faltam ${contagem.pendente}`
              : `Enviar para ${contagem.pendente}`}
          </button>
        </div>
      )}

      {semResposta.length > 0 && (
        <div>
          <h2 style={{ fontSize: 14, margin: "0 0 8px" }}>Sem confirmação da Meta</h2>
          <div className="aviso" role="status">
            Estas saíram do CRM e a Meta não respondeu se aceitou. Pode ser que a
            pessoa tenha recebido. O sistema não reenvia nenhuma delas sozinho, de
            propósito: reenviar aqui é assumir o risco de a pessoa receber duas vezes.
            Se o status chegar depois, a linha se resolve sozinha.
          </div>
          <div className="cartao" style={{ padding: 0 }}>
            <table>
              <tbody>
                {semResposta.slice(0, 60).map((e, i) => (
                  <tr key={i}>
                    <td style={{ fontFamily: "var(--mono)", fontSize: 12.5 }}>{e.telefone}</td>
                    <td style={{ color: "var(--texto-2)", fontWeight: 400 }}>{e.motivo}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {falhas.length > 0 && (
        <div>
          <h2 style={{ fontSize: 14, margin: "0 0 8px" }}>Quem não recebeu, e por quê</h2>
          <div className="cartao" style={{ padding: 0 }}>
            <table>
              <tbody>
                {falhas.slice(0, 60).map((e, i) => (
                  <tr key={i}>
                    <td style={{ fontFamily: "var(--mono)", fontSize: 12.5 }}>{e.telefone}</td>
                    <td style={{ color: "var(--texto-2)", fontWeight: 400 }}>{e.motivo}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
