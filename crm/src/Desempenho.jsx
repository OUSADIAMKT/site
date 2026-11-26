import { useState, useEffect, useRef } from "react";
import { chamar } from "./api.js";
import CabecalhoPagina from "./CabecalhoPagina.jsx";

const SITUACOES = {
  marcado:        { nome: "Marcado",        cor: "#4dd0b1" },
  confirmado:     { nome: "Confirmado",     cor: "#4ade80" },
  em_atendimento: { nome: "Em atendimento", cor: "#f5b544" },
  atendido:       { nome: "Atendido",       cor: "#5b9cf8" },
  faltou:         { nome: "Faltou",         cor: "#f97362" },
  cancelado:      { nome: "Cancelado",      cor: "#8fa5c4" },
};

const PERIODOS = [
  ["hoje", "Hoje"],
  ["semana", "7 dias"],
  ["mes", "30 dias"],
];

function duracao(seg) {
  if (seg === null || seg === undefined) return "n/d";
  const min = Math.round(seg / 60);
  if (min < 1) return `${Math.round(seg)}s`;
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  return `${h}h ${min % 60}min`;
}

function hora(iso, fuso) {
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: fuso, day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit",
  }).format(new Date(iso));
}

export default function Desempenho({ cliente }) {
  const [periodo, setPeriodo] = useState("hoje");
  const [d, setD] = useState(null);
  const [erro, setErro] = useState("");
  const timer = useRef(null);

  async function carregar(silencioso) {
    try {
      const q = cliente ? `&cliente=${cliente.id}` : "";
      setD(await chamar(`painel-desempenho?periodo=${periodo}${q}`));
      setErro("");
    } catch (e) {
      if (!silencioso) setErro(e.message);
    }
  }

  useEffect(() => {
    setD(null);
    carregar();
    // O gestor pediu tempo real: a tela se atualiza sozinha enquanto ele olha.
    timer.current = setInterval(() => carregar(true), 20000);
    return () => clearInterval(timer.current);
  }, [cliente?.id, periodo]);

  if (erro && !d) return <div className="aviso erro" role="alert">{erro}</div>;
  if (!d) return <div className="vazio">Carregando…</div>;

  const { agenda, atendimento, equipe } = d;
  const fuso = d.cliente.fuso;
  const totalConversas = atendimento.conversas || 0;
  // Sem conversa nenhuma, 0% dá a impressão de que a IA falhou. n/d é honesto.
  const autonomia = totalConversas
    ? `${Math.round((atendimento.resolvidas_pela_ia / totalConversas) * 100)}%`
    : "n/d";

  return (
    <>
      <CabecalhoPagina titulo={<>Desempenho{d.cliente.nome ? ` de ${d.cliente.nome}` : ""}</>}>
        Como está a agenda, o atendimento e a equipe. A tela se atualiza sozinha
        a cada 20 segundos.
      </CabecalhoPagina>

      <div className="acoes">
        {PERIODOS.map(([id, nome]) => (
          <button
            key={id}
            className={`btn ${periodo === id ? "" : "secundario"} pequeno`}
            onClick={() => setPeriodo(id)}
          >{nome}</button>
        ))}
        {atendimento.esperando_agora > 0 && (
          <span className="etiqueta quente">
            {atendimento.esperando_agora} esperando na fila agora
          </span>
        )}
      </div>

      {erro && <div className="aviso erro" role="alert">{erro}</div>}

      <div className="kpis">
        <Kpi cor="teal" rotulo="Consultas no período" valor={agenda.total}
             pe={`${agenda.hoje} marcadas para hoje`} />
        <Kpi cor="coral" rotulo="Taxa de falta"
             valor={agenda.taxa_falta === null ? "n/d" : `${agenda.taxa_falta.toFixed(0)}%`}
             pe={agenda.taxa_falta === null ? "sem histórico ainda" : `${agenda.faltas} de ${agenda.finalizados}`} />
        <Kpi cor="verde" rotulo="Resolvido pela IA" valor={autonomia}
             pe={totalConversas
               ? `${atendimento.resolvidas_pela_ia} de ${totalConversas} conversas`
               : "nenhuma conversa no período"} />
        <Kpi cor="ambar" rotulo="Passaram para a equipe" valor={atendimento.passaram_para_equipe}
             pe={`${atendimento.em_atendimento_agora} em andamento`} />
        <Kpi cor="indigo" rotulo="Espera média na fila" valor={duracao(atendimento.espera_media_seg)}
             pe="da transferência até alguém assumir" />
        <Kpi cor="violeta" rotulo="Duração média" valor={duracao(atendimento.duracao_media_seg)}
             pe="do início ao fim do atendimento" />
      </div>

      {atendimento.esperando_agora > 0 && atendimento.espera_mais_antiga && (
        <div className="aviso atencao">
          Alguém está esperando há {duracao((Date.now() - new Date(atendimento.espera_mais_antiga)) / 1000)} na
          fila. Se ninguém estiver disponível, a conversa não anda.
        </div>
      )}

      <div className="malha-2">
        <div className="bloco">
          <div className="bloco-topo">
            <h2>Situação das consultas</h2>
            <span className="canto">{agenda.total} no período</span>
          </div>
          <Somatorio contagens={agenda.por_situacao} />
        </div>

        <div className="bloco">
          <div className="bloco-topo">
            <h2>Próximas consultas</h2>
            <span className="canto">{agenda.proximos.length}</span>
          </div>
          <div className="compacta">
            {agenda.proximos.length === 0
              ? <div className="mini-vazio">Nenhuma consulta marcada daqui pra frente.</div>
              : agenda.proximos.map((a) => (
                  <div className="item" key={a.id}>
                    <span className="lado forte">{hora(a.inicio, fuso)}</span>
                    <div className="princ">
                      <b>{a.paciente_nome}</b>
                      <span>{a.profissionais?.nome || ""}</span>
                    </div>
                    <span className="etiqueta" style={{ color: SITUACOES[a.situacao]?.cor }}>
                      {SITUACOES[a.situacao]?.nome || a.situacao}
                    </span>
                  </div>
                ))}
          </div>
        </div>
      </div>

      <div className="bloco">
        <div className="bloco-topo">
          <h2>Equipe</h2>
          <span className="canto">no mês corrente</span>
        </div>
        {equipe.length === 0 ? (
          <div className="mini-vazio">Nenhum atendente cadastrado.</div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Pessoa</th>
                <th>Situação</th>
                <th className="num">Atendimentos</th>
                <th className="num">Em aberto</th>
                <th className="num">Espera média</th>
                <th className="num">Duração média</th>
              </tr>
            </thead>
            <tbody>
              {equipe.map((e) => (
                <tr key={e.nome}>
                  <td>
                    {e.nome}
                    {e.papel === "gestor" && (
                      <div style={{ color: "var(--apagado)", fontSize: 12.5, fontWeight: 400 }}>gestor</div>
                    )}
                  </td>
                  <td>
                    {e.disponivel
                      ? <span className="etiqueta humano">disponível</span>
                      : <span className="etiqueta frio">ausente</span>}
                  </td>
                  <td className="num">{e.atendimentos}</td>
                  <td className="num">{e.em_aberto}</td>
                  <td className="num">{duracao(e.espera_media_seg)}</td>
                  <td className="num">{duracao(e.duracao_media_seg)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <p style={{ margin: 0, fontSize: 12.5, color: "var(--apagado)" }}>
          Espera média é quanto o paciente ficou na fila até essa pessoa assumir.
          Duração média é quanto durou o atendimento dela.
        </p>
      </div>
    </>
  );
}

function Kpi({ cor, rotulo, valor, pe }) {
  return (
    <div className={`kpi ${cor}`}>
      <span className="rotulo">{rotulo}</span>
      <span className="valor">{valor}</span>
      <span className="pe">{pe}</span>
    </div>
  );
}

function Somatorio({ contagens }) {
  const itens = Object.entries(contagens || {}).filter(([, n]) => n > 0);
  const total = itens.reduce((s, [, n]) => s + n, 0);

  if (!total) return <div className="mini-vazio">Nenhuma consulta no período.</div>;

  return (
    <div className="somatorio">
      {itens.map(([chave, n]) => {
        const pct = Math.round((n / total) * 100);
        return (
          <div className="som-linha" key={chave}>
            <div className="som-topo">
              <span>{SITUACOES[chave]?.nome || chave}</span>
              <span className="n">{n} · {pct}%</span>
            </div>
            <div className="trilho">
              <span style={{ width: `${pct}%`, background: SITUACOES[chave]?.cor || "#4dd0b1" }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}
