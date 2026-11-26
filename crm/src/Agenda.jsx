import { useState, useEffect } from "react";
import { chamar } from "./api.js";
import CabecalhoPagina from "./CabecalhoPagina.jsx";

const DIAS = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];

const UFS = [
  "AC", "AL", "AM", "AP", "BA", "CE", "DF", "ES", "GO", "MA", "MG", "MS", "MT",
  "PA", "PB", "PE", "PI", "PR", "RJ", "RN", "RO", "RR", "RS", "SC", "SE", "SP", "TO",
];

function hhmm(hora) {
  return String(hora || "").slice(0, 5);
}

// "2026-10-01" sem hora é lido como meia-noite em UTC e, no fuso do Brasil,
// apareceria como 30/09. Por isso a hora local entra explicitamente.
function dataCurta(valor) {
  const texto = String(valor);
  const data = /^\d{4}-\d{2}-\d{2}$/.test(texto) ? new Date(`${texto}T12:00:00`) : new Date(texto);
  return data.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "2-digit" });
}

function ddmm(data) {
  return data.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
}

// "Quarta" sozinho é abstrato. Estas são as datas de verdade em que o
// profissional vai atender, já marcando as que caem numa ausência.
function proximasDatas(diaSemana, bloqueios, quantas = 3, de, ate) {
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);

  const inicio = de ? new Date(`${de}T00:00:00`) : null;
  const limite = ate ? new Date(`${ate}T00:00:00`) : null;
  const datas = [];

  for (let i = 0; i < 400 && datas.length < quantas; i++) {
    const d = new Date(hoje);
    d.setDate(d.getDate() + i);
    if (d.getDay() !== diaSemana) continue;
    if (inicio && d < inicio) continue;
    if (limite && d > limite) break;

    const ausente = (bloqueios || []).some((b) => {
      const ini = new Date(b.inicio); ini.setHours(0, 0, 0, 0);
      const fim = new Date(b.fim);
      return d >= ini && d <= fim;
    });
    datas.push({ data: d, ausente });
  }
  return datas;
}

export default function Agenda({ cliente }) {
  const [profissionais, setProfissionais] = useState(null);
  const [erro, setErro] = useState("");
  const [novo, setNovo] = useState(false);

  async function carregar() {
    try {
      const { profissionais } = await chamar(`painel-agenda?cliente=${cliente.id}`);
      setProfissionais(profissionais);
      setErro("");
    } catch (e) {
      setErro(e.message);
    }
  }

  useEffect(() => { setProfissionais(null); setNovo(false); carregar(); }, [cliente.id]);

  return (
    <>
      <CabecalhoPagina titulo={<>Agenda{cliente.nome ? ` de ${cliente.nome}` : ""}</>}>
        Diga quando cada profissional está na unidade. A IA só oferece horário que sai
        daqui, em blocos de 30 minutos, descontando o que já foi marcado.
      </CabecalhoPagina>

      {erro && <div className="aviso erro" role="alert">{erro}</div>}

      {profissionais === null ? (
        <div className="vazio">Carregando…</div>
      ) : profissionais.length === 0 ? (
        <div className="vazio">
          Nenhum profissional cadastrado. Enquanto não houver, a IA não oferece agendamento.
        </div>
      ) : (
        profissionais.map((p) => (
          <Profissional key={p.id} profissional={p} aoMudar={carregar} />
        ))
      )}

      {novo
        ? <FormProfissional cliente={cliente} aoSalvar={() => { setNovo(false); carregar(); }}
                            aoCancelar={() => setNovo(false)} />
        : <div className="acoes"><button className="btn" onClick={() => setNovo(true)}>Novo profissional</button></div>}
    </>
  );
}

function Profissional({ profissional, aoMudar }) {
  const [editando, setEditando] = useState(null);   // null | "novo" | objeto
  const [addBloqueio, setAddBloqueio] = useState(false);
  const [erro, setErro] = useState("");

  async function excluir(tipo, id, aviso) {
    if (!confirm(aviso)) return;
    try {
      await chamar(`painel-agenda?tipo=${tipo}&id=${id}`, { method: "DELETE" });
      aoMudar();
    } catch (e) {
      setErro(e.message);
    }
  }

  const disp = profissional.disponibilidade || [];
  const bloq = (profissional.bloqueios || []).filter((b) => new Date(b.fim) >= new Date());

  return (
    <div className="cartao">
      <div style={{ display: "flex", alignItems: "baseline", gap: 10, flexWrap: "wrap" }}>
        <h2>{profissional.nome}</h2>
        {profissional.especialidade && <span className="etiqueta">{profissional.especialidade}</span>}
        {!profissional.ativo && <span className="etiqueta frio">inativo</span>}
        <button
          className="btn perigo pequeno" style={{ marginLeft: "auto" }}
          onClick={() => excluir("profissional", profissional.id,
            `Excluir ${profissional.nome}? Os agendamentos dele também somem.`)}
        >Excluir</button>
      </div>

      {erro && <div className="aviso erro" role="alert">{erro}</div>}

      <div>
        <p className="rotulo-secao">Dias e horários na unidade</p>
        {disp.length === 0 ? (
          <p style={{ margin: 0, fontSize: 13.5, color: "var(--alerta)" }}>
            Sem horário definido, a IA não vai oferecer nada deste profissional.
          </p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Dia</th>
                <th className="num">Horário</th>
                <th>Onde</th>
                <th>Período</th>
                <th>Próximas datas</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {disp.map((d) => {
                const datas = proximasDatas(d.dia_semana, bloq, 3, d.vigencia_inicio, d.vigencia_fim);
                return (
                  <tr key={d.id}>
                    <td className="forte" style={{ width: 110 }}>{DIAS[d.dia_semana]}</td>
                    <td className="num forte">{hhmm(d.hora_inicio)} às {hhmm(d.hora_fim)}</td>
                    <td className="forte">
                      {d.cidade || d.estado
                        ? `${d.cidade || ""}${d.cidade && d.estado ? "/" : ""}${d.estado || ""}`
                        : <span style={{ color: "var(--apagado)", fontWeight: 400 }}>na unidade</span>}
                    </td>
                    <td className="num" style={{ textAlign: "left", fontSize: 13 }}>
                      {d.vigencia_inicio || d.vigencia_fim
                        ? `${d.vigencia_inicio ? dataCurta(d.vigencia_inicio) : "sempre"} a ${d.vigencia_fim ? dataCurta(d.vigencia_fim) : "sem fim"}`
                        : <span style={{ color: "var(--apagado)", fontWeight: 400 }}>sempre</span>}
                    </td>
                    <td>
                      {datas.length === 0
                        ? <span className="etiqueta frio">encerrado</span>
                        : datas.map(({ data, ausente }, i) => (
                            <span key={i} className={`etiqueta ${ausente ? "morno" : ""}`}>
                              {ddmm(data)}{ausente ? " ausente" : ""}
                            </span>
                          ))}
                    </td>
                    <td className="num">
                      <button className="btn secundario pequeno" onClick={() => setEditando(d)}>Editar</button>{" "}
                      <button className="btn secundario pequeno"
                              onClick={() => excluir("disponibilidade", d.id, "Remover este horário?")}>
                        Remover
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {editando
        ? <FormHorario
            profissional={profissional}
            horario={editando === "novo" ? null : editando}
            aoSalvar={() => { setEditando(null); aoMudar(); }}
            aoCancelar={() => setEditando(null)} />
        : <div className="acoes">
            <button className="btn secundario pequeno" onClick={() => setEditando("novo")}>
              + Dia e horário
            </button>
          </div>}

      <div>
        <p className="rotulo-secao">Ausências<span className="leve">Férias, congresso, folga. Sem isto a IA marca em dia que ele não está.</span></p>
        {bloq.length === 0 ? (
          <p style={{ margin: 0, fontSize: 13.5, color: "var(--apagado)" }}>Nenhuma ausência marcada.</p>
        ) : (
          <table>
            <tbody>
              {bloq.map((b) => (
                <tr key={b.id}>
                  <td className="num forte" style={{ textAlign: "left" }}>
                    {dataCurta(b.inicio)} a {dataCurta(b.fim)}
                  </td>
                  <td style={{ color: "var(--texto-2)" }}>{b.motivo || ""}</td>
                  <td className="num">
                    <button className="btn secundario pequeno"
                            onClick={() => excluir("bloqueio", b.id, "Remover esta ausência?")}>
                      Remover
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {addBloqueio
        ? <FormBloqueio profissional={profissional}
                        aoSalvar={() => { setAddBloqueio(false); aoMudar(); }}
                        aoCancelar={() => setAddBloqueio(false)} />
        : <div className="acoes">
            <button className="btn secundario pequeno" onClick={() => setAddBloqueio(true)}>
              + Ausência
            </button>
          </div>}
    </div>
  );
}

function FormProfissional({ cliente, aoSalvar, aoCancelar }) {
  const [nome, setNome] = useState("");
  const [especialidade, setEspecialidade] = useState("");
  const [erro, setErro] = useState("");

  async function salvar() {
    try {
      await chamar("painel-agenda", {
        method: "POST",
        body: { acao: "profissional", cliente_id: cliente.id, nome, especialidade },
      });
      aoSalvar();
    } catch (e) { setErro(e.message); }
  }

  return (
    <div className="cartao">
      <h2>Novo profissional</h2>
      <div className="linha">
        <div className="campo">
          <label htmlFor="pnome">Nome</label>
          <input id="pnome" type="text" value={nome} autoFocus
                 onChange={(e) => setNome(e.target.value)} placeholder="Dra. Ana Souza" />
        </div>
        <div className="campo">
          <label htmlFor="pesp">Especialidade</label>
          <input id="pesp" type="text" value={especialidade}
                 onChange={(e) => setEspecialidade(e.target.value)} placeholder="Dermatologia" />
        </div>
      </div>
      {erro && <div className="aviso erro" role="alert">{erro}</div>}
      <div className="acoes">
        <button className="btn" onClick={salvar} disabled={!nome}>Salvar</button>
        <button className="btn secundario" onClick={aoCancelar}>Cancelar</button>
      </div>
    </div>
  );
}

function FormHorario({ profissional, horario, aoSalvar, aoCancelar }) {
  const editando = Boolean(horario);

  const [de, setDe] = useState(horario?.vigencia_inicio || "");
  const [ate, setAte] = useState(horario?.vigencia_fim || "");
  const [estado, setEstado] = useState(horario?.estado || "");
  const [cidade, setCidade] = useState(horario?.cidade || "");

  const [dia, setDia] = useState(String(horario?.dia_semana ?? 1));
  const [inicio, setInicio] = useState(hhmm(horario?.hora_inicio) || "08:00");
  const [fim, setFim] = useState(hhmm(horario?.hora_fim) || "12:00");

  // O turno da tarde existe para quem atende manhã e tarde no mesmo dia,
  // sem precisar cadastrar a mesma quarta-feira duas vezes.
  const [temTarde, setTemTarde] = useState(false);
  const [inicioTarde, setInicioTarde] = useState("14:00");
  const [fimTarde, setFimTarde] = useState("18:00");

  const [erro, setErro] = useState("");
  const [salvando, setSalvando] = useState(false);

  async function salvar() {
    setErro("");
    setSalvando(true);
    try {
      const faixas = [{ hora_inicio: inicio, hora_fim: fim }];
      if (!editando && temTarde) faixas.push({ hora_inicio: inicioTarde, hora_fim: fimTarde });

      await chamar("painel-agenda", {
        method: "POST",
        body: {
          acao: "disponibilidade",
          id: horario?.id,
          profissional_id: profissional.id,
          dia_semana: dia,
          vigencia_inicio: de || null,
          vigencia_fim: ate || null,
          estado: estado || null,
          cidade: cidade || null,
          faixas,
        },
      });
      aoSalvar();
    } catch (e) {
      setErro(e.message);
      setSalvando(false);
    }
  }

  const datas = proximasDatas(Number(dia), profissional.bloqueios || [], 3, de, ate);

  return (
    <div className="sub-form">
      <p className="rotulo-secao" style={{ margin: 0 }}>
        {editando ? `Editando ${DIAS[horario.dia_semana]}` : "Novo dia e horário"}
      </p>

      <div className="linha-agenda">
        <div className="campo">
          <label htmlFor="vde">Período de atendimento</label>
          <div className="par-datas">
            <input id="vde" type="date" value={de} onChange={(e) => setDe(e.target.value)} />
            <span>até</span>
            <input type="date" value={ate} onChange={(e) => setAte(e.target.value)} />
          </div>
          <p className="dica">
            Deixe vazio para valer sempre. Preencha quando o especialista fica
            só um tempo nesta unidade.
          </p>
        </div>

        <div className="campo">
          <label htmlFor="uf">Estado</label>
          <select id="uf" value={estado} onChange={(e) => setEstado(e.target.value)}>
            <option value="">Não informar</option>
            {UFS.map((uf) => <option key={uf} value={uf}>{uf}</option>)}
          </select>
        </div>

        <div className="campo">
          <label htmlFor="cid">Cidade</label>
          <input id="cid" type="text" value={cidade}
                 onChange={(e) => setCidade(e.target.value)} placeholder="Cidade" />
          <p className="dica">Onde ele atende nestes dias.</p>
        </div>
      </div>

      <div className="linha">
        <div className="campo">
          <label htmlFor="dia">Dia da semana</label>
          <select id="dia" value={dia} onChange={(e) => setDia(e.target.value)}>
            {DIAS.map((d, i) => <option key={i} value={i}>{d}</option>)}
          </select>
        </div>
        <div className="campo">
          <label htmlFor="hi">Manhã começa</label>
          <input id="hi" type="time" value={inicio} onChange={(e) => setInicio(e.target.value)} />
        </div>
        <div className="campo">
          <label htmlFor="hf">Manhã termina</label>
          <input id="hf" type="time" value={fim} onChange={(e) => setFim(e.target.value)} />
        </div>
      </div>

      {!editando && (
        <>
          <label className="marcador">
            <input type="checkbox" checked={temTarde}
                   onChange={(e) => setTemTarde(e.target.checked)} />
            Atendimento no turno da tarde neste mesmo dia
          </label>

          {temTarde && (
            <div className="linha">
              <div className="campo">
                <label htmlFor="hi2">Tarde começa</label>
                <input id="hi2" type="time" value={inicioTarde}
                       onChange={(e) => setInicioTarde(e.target.value)} />
              </div>
              <div className="campo">
                <label htmlFor="hf2">Tarde termina</label>
                <input id="hf2" type="time" value={fimTarde}
                       onChange={(e) => setFimTarde(e.target.value)} />
              </div>
            </div>
          )}
        </>
      )}

      <div className="aviso atencao" style={{ fontSize: 13.5 }}>
        {datas.length === 0
          ? "Nenhuma data cai neste período. Confira o intervalo e o dia da semana."
          : <>Vai valer em: <strong>{datas.map(({ data, ausente }) =>
              ddmm(data) + (ausente ? " (ausente)" : "")).join("   ")}</strong>
             {cidade ? <>, em <strong>{cidade}{estado ? `/${estado}` : ""}</strong></> : null}</>}
      </div>

      {erro && <div className="aviso erro" role="alert">{erro}</div>}

      <div className="acoes">
        <button className="btn" onClick={salvar} disabled={salvando}>
          {salvando ? "Salvando…" : editando ? "Salvar alteração" : "Adicionar"}
        </button>
        <button className="btn secundario" onClick={aoCancelar}>Cancelar</button>
      </div>
    </div>
  );
}

function FormBloqueio({ profissional, aoSalvar, aoCancelar }) {
  const [inicio, setInicio] = useState("");
  const [fim, setFim] = useState("");
  const [motivo, setMotivo] = useState("");
  const [erro, setErro] = useState("");

  async function salvar() {
    try {
      await chamar("painel-agenda", {
        method: "POST",
        body: {
          acao: "bloqueio",
          profissional_id: profissional.id,
          inicio: new Date(`${inicio}T00:00:00`).toISOString(),
          fim: new Date(`${fim}T23:59:59`).toISOString(),
          motivo,
        },
      });
      aoSalvar();
    } catch (e) { setErro(e.message); }
  }

  return (
    <div style={{ borderTop: "1px solid var(--borda)", paddingTop: 16, display: "flex", flexDirection: "column", gap: 14 }}>
      <div className="linha">
        <div className="campo">
          <label htmlFor="bi">Do dia</label>
          <input id="bi" type="date" value={inicio} onChange={(e) => setInicio(e.target.value)} />
        </div>
        <div className="campo">
          <label htmlFor="bf">Até o dia</label>
          <input id="bf" type="date" value={fim} onChange={(e) => setFim(e.target.value)} />
        </div>
        <div className="campo">
          <label htmlFor="bm">Motivo</label>
          <input id="bm" type="text" value={motivo}
                 onChange={(e) => setMotivo(e.target.value)} placeholder="Férias" />
        </div>
      </div>
      {erro && <div className="aviso erro" role="alert">{erro}</div>}
      <div className="acoes">
        <button className="btn pequeno" onClick={salvar} disabled={!inicio || !fim}>Adicionar</button>
        <button className="btn secundario pequeno" onClick={aoCancelar}>Cancelar</button>
      </div>
    </div>
  );
}
