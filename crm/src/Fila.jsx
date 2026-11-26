import { useState, useEffect, useRef } from "react";
import { chamar } from "./api.js";
import { Pendente, frasePendente } from "./semResposta.jsx";
import CabecalhoPagina from "./CabecalhoPagina.jsx";

// No Instagram o nome do contato é o @ da pessoa. Quem atende precisa dele para
// achar a pessoa no aplicativo: o número que vem no lugar não serve para nada.
function quem(c) {
  if (!c.nome_contato) return "Sem nome";
  return c.canal === "instagram" ? `@${c.nome_contato}` : c.nome_contato;
}

const DESFECHOS = {
  encerrado: "encerrada pela equipe",
  devolvido_ia: "devolvida para a IA",
  inatividade: "voltou para a IA por doze horas sem resposta",
  devolvido: "devolvida para a fila",
  abandonado: "interrompida",
  passado: "passada para outra pessoa",
};

/**
 * O nome de quem está com a conversa. Sem o `assumido_por`, a conversa que o
 * gestor assumiu aparecia com a coluna vazia: ele não tem linha em
 * `atendentes`, então `atendentes(nome)` não devolve nada para ele.
 */
function quemAtende(linha, vazio = "") {
  if (linha.atendentes?.nome) return linha.atendentes.nome;
  return linha.assumido_por === "operador" ? "Gestor" : vazio;
}

// No histórico a data inteira importa, não "3 h atrás".
function dataHora(iso) {
  if (!iso) return "";
  return new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit", month: "2-digit", year: "2-digit", hour: "2-digit", minute: "2-digit",
  });
}

function espera(iso) {
  if (!iso) return "";
  const min = Math.round((Date.now() - new Date(iso)) / 60000);
  if (min < 1) return "agora";
  if (min < 60) return `${min} min`;
  return `${Math.round(min / 60)} h`;
}

// Espera longa é o que estraga a percepção do atendimento, então ela muda de cor.
function gravidade(iso) {
  const min = (Date.now() - new Date(iso)) / 60000;
  if (min >= 15) return "quente";
  if (min >= 5) return "morno";
  return "";
}

/**
 * O nome do contato, clicável, levando para a conversa de verdade.
 *
 * A fila listava e não abria nada: dava para distribuir e devolver, mas não
 * para LER. Quem recebia uma conversa tinha que ir até a aba Conversas e achar
 * a pessoa na lista pelo nome. Agora o nome é o caminho, nas três tabelas, e o
 * destino é a tela de Conversas, não uma cópia pobre dela aqui dentro: lá tem
 * áudio, mídia, modelo aprovado e o histórico inteiro.
 */
function NomeDoContato({ conversa, id, ir }) {
  const nome = quem(conversa);
  if (!ir || !id) return <>{nome}</>;
  return (
    <button type="button" className="link-conversa" onClick={() => ir(id)} title="Abrir a conversa">
      {nome}
    </button>
  );
}

export default function Fila({ cliente, irParaConversa }) {
  const [d, setD] = useState(null);
  const [erro, setErro] = useState("");
  const timer = useRef(null);

  async function carregar(silencioso) {
    try {
      const q = cliente ? `?cliente=${cliente.id}` : "";
      const r = await chamar(`painel-fila${q}`);
      setD(r);
      setErro("");
    } catch (e) {
      if (!silencioso) setErro(e.message);
    }
  }

  useEffect(() => {
    setD(null);
    carregar();
    // A fila é a única tela que muda sozinha: quem está esperando não
    // aparece por clique, aparece porque a IA transferiu agora.
    timer.current = setInterval(() => carregar(true), 15000);
    return () => clearInterval(timer.current);
  }, [cliente?.id]);

  async function agir(acao, corpo = {}) {
    try {
      const r = await chamar("painel-fila", { method: "POST", body: { acao, ...corpo } });
      // A distribuição automática pode não achar ninguém livre. Isso não é
      // erro, é informação: alguém precisa ficar disponível.
      if (r?.esperando) {
        setErro("Ninguém está disponível para receber agora. A conversa continua na fila.");
      } else {
        setErro("");
      }
      await carregar();
    } catch (e) {
      setErro(e.message);
    }
  }

  if (erro && !d) return <div className="aviso erro" role="alert">{erro}</div>;
  if (!d) return <div className="vazio">Carregando…</div>;

  const souAtendente = d.sessao.tipo === "atendente";
  const disponiveis = d.atendentes.filter((a) => a.disponivel).length;

  return (
    <>
      <CabecalhoPagina titulo={<>Fila de atendimento{cliente ? ` de ${cliente.nome}` : ""}</>}>
        Quando a IA passa uma conversa adiante, ela entra aqui e vai para quem está
        disponível com menos gente na mão.
      </CabecalhoPagina>

      {erro && <div className="aviso erro" role="alert">{erro}</div>}

      {souAtendente && (
        <div className="cartao">
          <div className="acoes">
            <span className={`etiqueta ${d.eu?.disponivel ? "humano" : "frio"}`}>
              {d.eu?.disponivel ? "Você está disponível" : "Você está ausente"}
            </span>
            <button
              className={`btn ${d.eu?.disponivel ? "secundario" : ""}`}
              onClick={() => agir("disponibilidade", { disponivel: !d.eu?.disponivel })}
            >
              {d.eu?.disponivel ? "Ficar ausente" : "Ficar disponível"}
            </button>
            <span style={{ color: "var(--apagado)", fontSize: 13.5 }}>
              {d.em_atendimento.length} na sua mão
            </span>
          </div>
          {!d.eu?.disponivel && (
            <p style={{ margin: 0, fontSize: 13.5, color: "var(--apagado)" }}>
              Ausente, você não recebe conversa nova. As que já estão com você continuam.
            </p>
          )}
        </div>
      )}

      {d.esperando.length > 0 && disponiveis === 0 && (
        <div className="aviso atencao">
          {d.esperando.length} {d.esperando.length === 1 ? "pessoa está esperando" : "pessoas estão esperando"} e
          ninguém está disponível. Alguém precisa ficar disponível para a fila andar.
        </div>
      )}

      <div className="cartao">
        <h2>Esperando ({d.esperando.length})</h2>
        {d.esperando.length === 0 ? (
          <div className="mini-vazio">Ninguém na fila.</div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Contato</th>
                <th>Por que veio</th>
                <th className="num">Espera</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {d.esperando.map((c) => (
                <tr key={c.id}>
                  <td>
                    <NomeDoContato conversa={c} id={c.id} ir={irParaConversa} /> <Pendente conversa={c} />
                    <div style={{ color: "var(--apagado)", fontSize: 12.5, fontFamily: "var(--mono)" }}>
                      {c.telefone || c.contato}
                    </div>
                  </td>
                  <td style={{ color: "var(--texto-2)", fontSize: 13.5, fontWeight: 400 }}>
                    {c.motivo_fila || "Não informado"}
                    {c.sem_resposta > 0 && (
                      <div className="fila-pendente">{frasePendente(c)}</div>
                    )}
                  </td>
                  <td className="num">
                    <span className={`etiqueta ${gravidade(c.fila_desde)}`}>{espera(c.fila_desde)}</span>
                  </td>
                  <td className="num">
                    <button className="btn pequeno" onClick={() => agir("assumir", { conversa_id: c.id })}>
                      {souAtendente ? "Atender" : "Distribuir"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="cartao">
        <h2>{souAtendente ? "Com você" : "Em atendimento"} ({d.em_atendimento.length})</h2>
        {d.em_atendimento.length === 0 ? (
          <div className="mini-vazio">Nenhum atendimento em andamento.</div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Contato</th>
                {!souAtendente && <th>Atendente</th>}
                <th className="num">Desde</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {d.em_atendimento.map((c) => (
                <tr key={c.id}>
                  <td>
                    <NomeDoContato conversa={c} id={c.id} ir={irParaConversa} /> <Pendente conversa={c} />
                    <div style={{ color: "var(--apagado)", fontSize: 12.5, fontFamily: "var(--mono)" }}>
                      {c.telefone || c.contato}
                    </div>
                    {c.sem_resposta > 0 && (
                      <div className="fila-pendente">{frasePendente(c)}</div>
                    )}
                  </td>
                  {!souAtendente && (
                    <td style={{ fontWeight: 400, color: "var(--texto-2)" }}>{quemAtende(c)}</td>
                  )}
                  <td className="num">{espera(c.assumida_em)}</td>
                  <td className="num">
                    <button className="btn pequeno" onClick={() => irParaConversa?.(c.id)}>Abrir</button>{" "}
                    <button className="btn secundario pequeno" onClick={() => agir("devolver", { conversa_id: c.id })}>
                      Devolver
                    </button>{" "}
                    <button className="btn secundario pequeno" onClick={() => agir("encerrar", { conversa_id: c.id, desfecho: "devolvido_ia" })}>
                      Devolver para a IA
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="cartao">
        <h2>Já atendidos</h2>
        {(d.encerrados || []).length === 0 ? (
          <div className="mini-vazio">Nenhum atendimento encerrado ainda.</div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Quando</th>
                <th>Quem falou</th>
                <th>Atendente</th>
                <th>Dúvida que motivou</th>
                <th>Situação</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {d.encerrados.map((a) => (
                <tr key={a.id}>
                  <td style={{ whiteSpace: "nowrap", fontFamily: "var(--mono)", fontSize: 12.5 }}>
                    {dataHora(a.assumida_em || a.entrou_fila)}
                  </td>
                  <td>
                    <NomeDoContato conversa={a.conversas || {}} id={a.conversa_id} ir={irParaConversa} />
                  </td>
                  <td style={{ fontWeight: 400, color: "var(--texto-2)" }}>
                    {quemAtende(a, "Equipe")}
                  </td>
                  <td style={{ color: "var(--texto-2)", fontSize: 13.5, fontWeight: 400 }}>
                    {a.motivo || "Não informada"}
                  </td>
                  <td style={{ color: "var(--apagado)", fontSize: 13 }}>{DESFECHOS[a.desfecho] || a.desfecho}</td>
                  <td className="num">
                    {/*
                      Duas formas de puxar de volta, porque são duas decisões
                      diferentes. "Atender" é quem está lendo dizendo "deixa
                      comigo". "Pela etiqueta" devolve para a fila, e a fila
                      escolhe pelo assunto que está etiquetado na conversa:
                      matrícula é da Lia, suporte é da Rita. Sem isto, conversa
                      que voltou para a IA sem resposta só voltava a ter gente
                      se alguém a encontrasse por acaso na aba Conversas.
                    */}
                    <button
                      className="btn pequeno"
                      onClick={() => agir("atender", { conversa_id: a.conversa_id })}
                    >
                      Atender
                    </button>{" "}
                    {!souAtendente && (
                      <button
                        className="btn secundario pequeno"
                        onClick={() => agir("enfileirar", { conversa_id: a.conversa_id })}
                      >
                        Pela etiqueta
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="cartao">
        <h2>Quem está de plantão</h2>
        {d.atendentes.length === 0 ? (
          <div className="mini-vazio">Nenhum atendente cadastrado para este cliente.</div>
        ) : (
          <div className="acoes">
            {d.atendentes.map((a) => (
              <span key={a.id} className={`etiqueta ${a.disponivel ? "humano" : "frio"}`}>
                {a.nome}{a.disponivel ? "" : " (ausente)"}
              </span>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
