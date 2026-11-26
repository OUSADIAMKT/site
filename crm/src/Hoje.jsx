import { useState, useEffect } from "react";
import { chamar } from "./api.js";
import CabecalhoPagina from "./CabecalhoPagina.jsx";

// A fila do dia, na ordem em que a recepção trabalha.
const SITUACOES = {
  marcado:        { nome: "Marcado",       classe: "" },
  confirmado:     { nome: "Confirmado",    classe: "humano" },
  em_atendimento: { nome: "Em atendimento", classe: "morno" },
  atendido:       { nome: "Atendido",      classe: "frio" },
  faltou:         { nome: "Faltou",        classe: "quente" },
  cancelado:      { nome: "Cancelado",     classe: "frio" },
};

// O que faz sentido clicar a partir de cada situação.
const PROXIMOS = {
  marcado:        [["em_atendimento", "Chegou"], ["faltou", "Faltou"], ["cancelado", "Cancelar"]],
  confirmado:     [["em_atendimento", "Chegou"], ["faltou", "Faltou"], ["cancelado", "Cancelar"]],
  em_atendimento: [["atendido", "Finalizar"]],
  atendido:       [],
  faltou:         [["marcado", "Desfazer"]],
  cancelado:      [],
};

function hora(iso, fuso) {
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: fuso, hour: "2-digit", minute: "2-digit",
  }).format(new Date(iso));
}

function somarDias(diaISO, quantos) {
  const d = new Date(`${diaISO}T12:00:00`);
  d.setDate(d.getDate() + quantos);
  return d.toISOString().slice(0, 10);
}

export default function Hoje({ cliente }) {
  const [dia, setDia] = useState(null);
  const [dados, setDados] = useState(null);
  const [erro, setErro] = useState("");

  async function carregar(alvo) {
    try {
      const q = alvo ? `&dia=${alvo}` : "";
      const resposta = await chamar(`painel-agenda?recurso=agendamentos&cliente=${cliente.id}${q}`);
      setDados(resposta);
      setDia(resposta.dia);
      setErro("");
    } catch (e) {
      setErro(e.message);
    }
  }

  useEffect(() => { setDados(null); setDia(null); carregar(null); }, [cliente.id]);

  async function mover(agendamento, situacao) {
    try {
      await chamar("painel-agenda?recurso=agendamentos", { method: "POST", body: { id: agendamento.id, situacao } });
      carregar(dia);
    } catch (e) {
      setErro(e.message);
    }
  }

  const lista = dados?.agendamentos || [];
  const fuso = dados?.fuso || "America/Belem";

  const naFila = lista.filter((a) => !["cancelado", "atendido", "faltou"].includes(a.situacao)).length;

  return (
    <>
      <CabecalhoPagina titulo={<>Dia de {cliente.nome}</>}>
        A fila de atendimento. Marque quem chegou, quem foi atendido e quem faltou.
        É daqui que sai a taxa de falta no relatório do cliente.
      </CabecalhoPagina>

      <div className="acoes">
        <button className="btn secundario pequeno" onClick={() => carregar(somarDias(dia, -1))} disabled={!dia}>
          ← Dia anterior
        </button>
        <input
          type="date" value={dia || ""} onChange={(e) => carregar(e.target.value)}
          style={{ width: "auto" }}
        />
        <button className="btn secundario pequeno" onClick={() => carregar(somarDias(dia, 1))} disabled={!dia}>
          Próximo dia →
        </button>
        <button className="btn secundario pequeno" onClick={() => carregar(null)}>Hoje</button>
        {dados && <span style={{ color: "var(--apagado)", fontSize: 13.5 }}>{naFila} na fila</span>}
      </div>

      {erro && <div className="aviso erro" role="alert">{erro}</div>}

      {dados === null ? (
        <div className="vazio">Carregando…</div>
      ) : lista.length === 0 ? (
        <div className="vazio">Nenhum atendimento marcado para este dia.</div>
      ) : (
        <div className="cartao">
          <table>
            <thead>
              <tr>
                <th className="num">Hora</th>
                <th>Paciente</th>
                <th>Profissional</th>
                <th>Situação</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {lista.map((a) => {
                const s = SITUACOES[a.situacao] || { nome: a.situacao, classe: "" };
                return (
                  <tr key={a.id}>
                    <td className="num forte" style={{ textAlign: "left" }}>
                      {hora(a.inicio, fuso)}
                    </td>
                    <td>
                      {a.paciente_nome}
                      <div style={{ color: "var(--apagado)", fontSize: 12.5, fontFamily: "var(--mono)" }}>
                        {a.telefone}
                      </div>
                    </td>
                    <td style={{ color: "var(--texto-2)" }}>
                      {a.profissionais?.nome}
                      {a.profissionais?.especialidade && (
                        <div style={{ color: "var(--apagado)", fontSize: 12.5 }}>
                          {a.profissionais.especialidade}
                        </div>
                      )}
                    </td>
                    <td><span className={`etiqueta ${s.classe}`}>{s.nome}</span></td>
                    <td className="num">
                      {(PROXIMOS[a.situacao] || []).map(([destino, rotulo]) => (
                        <button
                          key={destino}
                          className={`btn ${destino === "faltou" || destino === "cancelado" ? "secundario" : ""} pequeno`}
                          style={{ marginLeft: 6 }}
                          onClick={() => mover(a, destino)}
                        >{rotulo}</button>
                      ))}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
