import { useState, useEffect } from "react";
import { chamar } from "./api.js";
import CabecalhoPagina from "./CabecalhoPagina.jsx";

// Os assuntos com o nome que a equipe usa. Mesma lista de `api/_assunto.js`,
// de `api/painel-atendentes.js` e de `Atendentes.jsx`. São quatro cópias do
// mesmo rótulo; juntar as quatro é limpeza para outra hora, e está anotado.
const NOME_ASSUNTO = {
  matricula: "Matrícula e cursos",
  suporte: "Suporte ao aluno",
  agencia: "Agência",
};

// A convenção da casa para rótulo de caixa de marcar é flex inline, como em
// `Atendentes.jsx`. Não existe classe para isso no index.css.
const LINHA_CAIXA = { display: "flex", alignItems: "center", gap: 8, fontWeight: 400 };

export default function Frentes({ cliente }) {
  const [dados, setDados] = useState(null);
  const [erro, setErro] = useState("");
  const [novo, setNovo] = useState(false);
  const [editando, setEditando] = useState(null);

  async function carregar() {
    try {
      setDados(await chamar(`painel-frentes?cliente=${cliente.id}`));
      setErro("");
    } catch (e) {
      setErro(e.message);
    }
  }

  useEffect(() => { setDados(null); setNovo(false); setEditando(null); carregar(); }, [cliente.id]);

  async function alternar(f) {
    const aviso = f.ativa
      ? `Desativar a frente "${f.nome}"? Ela sai de uso, o nome e os assuntos ficam livres `
        + "para outra frente, e as campanhas que já apontam para ela continuam apontando."
      : `Reativar "${f.nome}"? Só funciona se o nome e os assuntos dela estiverem livres.`;
    if (!confirm(aviso)) return;
    try {
      await chamar("painel-frentes", {
        method: "POST",
        body: { cliente: cliente.id, id: f.id, acao: f.ativa ? "desativar" : "reativar" },
      });
      carregar();
    } catch (e) {
      setErro(e.message);
    }
  }

  const frentes = dados?.frentes || [];

  return (
    <>
      <CabecalhoPagina titulo={<>Frentes de {cliente.nome}</>}>
        Uma frente é um recorte de atendimento com nome, dono e os assuntos que ela
        atende. Hoje esse recorte existe espalhado entre as palavras que a IA reconhece
        e os assuntos de cada atendente, sem nome e sem tela. Aqui ele tem nome.
      </CabecalhoPagina>

      {erro && <div className="aviso erro" role="alert">{erro}</div>}

      <div className="aviso" role="note">
        A frente de uma campanha não decide quem atende a resposta. Quem escreve dizendo o
        que precisa vai para a frente daquele assunto, mesmo que a campanha seja de outra.
        O roteamento automático ainda não está ligado.
      </div>

      {dados === null ? (
        <div className="vazio">Carregando…</div>
      ) : frentes.length === 0 ? (
        <div className="vazio">
          Nenhuma frente ainda. Sem frente nenhuma o atendimento segue como hoje, pelos
          assuntos de cada atendente.
        </div>
      ) : (
        <div className="cartao">
          <table>
            <thead>
              <tr>
                <th>Frente</th>
                <th>Atende</th>
                <th>Responsável</th>
                <th>Situação</th>
                <th className="num">Campanhas</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {frentes.map((f) => (
                <tr key={f.id} style={f.ativa ? undefined : { opacity: 0.55 }}>
                  <td>
                    {f.nome}
                    {f.padrao && (
                      <div style={{ color: "var(--apagado)", fontSize: 12.5, fontWeight: 400 }}>
                        recebe o que não se encaixa
                      </div>
                    )}
                  </td>
                  <td>
                    {(f.assuntos || []).length
                      ? (f.assuntos || []).map((x) => (
                          <span key={x} className="etiqueta" style={{ marginRight: 4 }}>
                            {NOME_ASSUNTO[x] || x}
                          </span>
                        ))
                      : <span style={{ color: "var(--apagado)", fontSize: 12.5 }}>nenhum assunto</span>}
                  </td>
                  <td>
                    {f.responsavel
                      ? f.responsavel.nome
                      : <span style={{ color: "var(--apagado)", fontSize: 12.5 }}>sem responsável</span>}
                  </td>
                  <td>
                    {f.ativa
                      ? <span className="etiqueta humano">ativa</span>
                      : <span className="etiqueta frio">desativada</span>}
                  </td>
                  <td className="num">{f.campanhas}</td>
                  <td className="num">
                    <button className="btn secundario pequeno" onClick={() => setEditando(f)}>
                      Editar
                    </button>{" "}
                    <button
                      className={`btn ${f.ativa ? "perigo" : "secundario"} pequeno`}
                      onClick={() => alternar(f)}
                    >
                      {f.ativa ? "Desativar" : "Reativar"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {editando && (
        <Formulario
          cliente={cliente}
          frente={editando}
          atendentes={dados?.atendentes || []}
          assuntos={dados?.assuntos || []}
          aoSalvar={() => { setEditando(null); carregar(); }}
          aoCancelar={() => setEditando(null)}
        />
      )}

      {novo ? (
        <Formulario
          cliente={cliente}
          atendentes={dados?.atendentes || []}
          assuntos={dados?.assuntos || []}
          aoSalvar={() => { setNovo(false); carregar(); }}
          aoCancelar={() => setNovo(false)}
        />
      ) : (
        !editando && (
          <div className="acoes">
            <button className="btn" onClick={() => setNovo(true)} disabled={dados === null}>
              Nova frente
            </button>
          </div>
        )
      )}
    </>
  );
}

function Formulario({ cliente, frente, atendentes, assuntos: disponiveis, aoSalvar, aoCancelar }) {
  const editar = !!frente;
  const [nome, setNome] = useState(frente?.nome || "");
  const [assuntos, setAssuntos] = useState(frente?.assuntos || []);
  const [padrao, setPadrao] = useState(frente?.padrao || false);
  const [responsavel, setResponsavel] = useState(frente?.responsavel_id || "");
  const [erro, setErro] = useState("");
  const [salvando, setSalvando] = useState(false);

  async function salvar() {
    setErro("");
    setSalvando(true);
    try {
      await chamar("painel-frentes", {
        method: "POST",
        body: {
          cliente: cliente.id,
          id: frente?.id,
          nome,
          assuntos,
          padrao,
          responsavel_id: responsavel || null,
        },
      });
      aoSalvar();
    } catch (e) {
      setErro(e.message);
      setSalvando(false);
    }
  }

  const alternarAssunto = (chave) => {
    setAssuntos(assuntos.includes(chave)
      ? assuntos.filter((x) => x !== chave)
      : [...assuntos, chave]);
  };

  return (
    <div className="cartao">
      <h2>{editar ? `Editar "${frente.nome}"` : "Nova frente"}</h2>

      <div className="linha">
        <div className="campo">
          <label htmlFor="fnome">Nome</label>
          <input
            id="fnome" type="text" value={nome} autoFocus maxLength={80}
            onChange={(e) => setNome(e.target.value)} placeholder="Vendas Ousadia"
          />
          <p className="dica">Como a equipe chama esse atendimento.</p>
        </div>

        <div className="campo">
          <label htmlFor="fresp">Responsável</label>
          <select id="fresp" value={responsavel} onChange={(e) => setResponsavel(e.target.value)}>
            <option value="">sem responsável</option>
            {atendentes.map((a) => (
              <option key={a.id} value={a.id}>{a.nome}</option>
            ))}
          </select>
          <p className="dica">
            Dá para trocar depois. A frente não fica presa a uma pessoa.
          </p>
        </div>

        <div className="campo">
          <label>Atende quais assuntos</label>
          <div style={{ display: "flex", flexDirection: "column", gap: 6, paddingTop: 2 }}>
            {disponiveis.map((chave) => (
              <label key={chave} style={LINHA_CAIXA}>
                <input
                  type="checkbox"
                  checked={assuntos.includes(chave)}
                  onChange={() => alternarAssunto(chave)}
                />
                {NOME_ASSUNTO[chave] || chave}
              </label>
            ))}
          </div>
          <p className="dica">
            Um assunto pertence a uma frente ativa só. Sem nenhum marcado, a frente existe
            mas não recebe nada por assunto.
          </p>
        </div>

        <div className="campo">
          <label>Frente padrão</label>
          <label style={{ ...LINHA_CAIXA, paddingTop: 2 }}>
            <input type="checkbox" checked={padrao} onChange={(e) => setPadrao(e.target.checked)} />
            Recebe o que não se encaixa em assunto nenhum
          </label>
          <p className="dica">
            Uma por empresa. É o que diferencia “a frente do assunto pedido” de “o
            atendimento geral, que hoje por acaso cuida de pedido”.
          </p>
        </div>
      </div>

      {erro && <div className="aviso erro" role="alert">{erro}</div>}

      <div className="acoes">
        <button className="btn" onClick={salvar} disabled={salvando || !nome.trim()}>
          {salvando ? "Salvando…" : editar ? "Salvar" : "Criar frente"}
        </button>
        <button className="btn secundario" onClick={aoCancelar}>Cancelar</button>
      </div>
    </div>
  );
}
