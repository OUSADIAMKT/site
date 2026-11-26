import { useState, useEffect } from "react";
import { chamar } from "./api.js";
import CabecalhoPagina from "./CabecalhoPagina.jsx";

export default function Atendentes({ cliente }) {
  const [lista, setLista] = useState(null);
  const [erro, setErro] = useState("");
  const [novo, setNovo] = useState(false);
  const [editando, setEditando] = useState(null);

  async function carregar() {
    try {
      const { atendentes } = await chamar(`painel-atendentes?cliente=${cliente.id}`);
      setLista(atendentes);
      setErro("");
    } catch (e) {
      setErro(e.message);
    }
  }

  useEffect(() => { setLista(null); setNovo(false); setEditando(null); carregar(); }, [cliente.id]);

  async function alternar(a) {
    const aviso = a.ativo
      ? `Desligar ${a.nome}? As conversas na mão dele voltam para a fila.`
      : `Reativar ${a.nome}?`;
    if (!confirm(aviso)) return;
    try {
      await chamar("painel-atendentes", { method: "POST", body: { id: a.id, ativo: !a.ativo } });
      carregar();
    } catch (e) {
      setErro(e.message);
    }
  }

  return (
    <>
      <CabecalhoPagina titulo={<>Atendentes de {cliente.nome}</>}>
        Quem recebe a conversa quando a IA passa adiante. Cada pessoa entra no painel com
        o email e a senha dela e vê apenas a fila deste cliente.
      </CabecalhoPagina>

      {erro && <div className="aviso erro" role="alert">{erro}</div>}

      {lista === null ? (
        <div className="vazio">Carregando…</div>
      ) : lista.length === 0 ? (
        <div className="vazio">
          Nenhum atendente. Enquanto não houver, a conversa transferida fica esperando na fila.
        </div>
      ) : (
        <div className="cartao">
          <table>
            <thead>
              <tr>
                <th>Nome</th>
                <th>Email</th>
                <th>Atende</th>
                <th>Situação</th>
                <th className="num">Na mão</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {lista.map((a) => (
                <tr key={a.id}>
                  <td>
                    {a.nome}
                    {a.papel === "gestor" && (
                      <div style={{ color: "var(--apagado)", fontSize: 12.5, fontWeight: 400 }}>gestor</div>
                    )}
                  </td>
                  <td style={{ fontWeight: 400, color: "var(--texto-2)", fontFamily: "var(--mono)", fontSize: 13 }}>
                    {a.email}
                  </td>
                  <td>
                    {(a.assuntos || []).length
                      ? (a.assuntos || []).map((x) => (
                          <span key={x} className="etiqueta" style={{ marginRight: 4 }}>{NOME_ASSUNTO[x] || x}</span>
                        ))
                      : <span style={{ color: "var(--apagado)", fontSize: 12.5 }}>qualquer assunto</span>}
                  </td>
                  <td>
                    {!a.ativo
                      ? <span className="etiqueta frio">desligado</span>
                      : a.disponivel
                        ? <span className="etiqueta humano">disponível</span>
                        : <span className="etiqueta">ausente</span>}
                  </td>
                  <td className="num">{a.em_atendimento}</td>
                  <td className="num">
                    <button className="btn secundario pequeno" onClick={() => setEditando(a)}>Editar</button>{" "}
                    <button className={`btn ${a.ativo ? "perigo" : "secundario"} pequeno`} onClick={() => alternar(a)}>
                      {a.ativo ? "Desligar" : "Reativar"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {editando && (
        <Editar
          atendente={editando}
          aoSalvar={() => { setEditando(null); carregar(); }}
          aoCancelar={() => setEditando(null)}
        />
      )}

      {novo
        ? <Formulario cliente={cliente} aoSalvar={() => { setNovo(false); carregar(); }}
                      aoCancelar={() => setNovo(false)} />
        : <div className="acoes"><button className="btn" onClick={() => setNovo(true)}>Novo atendente</button></div>}
    </>
  );
}

function Formulario({ cliente, aoSalvar, aoCancelar }) {
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [papel, setPapel] = useState("atendente");
  const [assuntos, setAssuntos] = useState([]);
  const [erro, setErro] = useState("");
  const [salvando, setSalvando] = useState(false);

  async function salvar() {
    setErro("");
    setSalvando(true);
    try {
      await chamar("painel-atendentes", {
        method: "POST",
        body: { cliente_id: cliente.id, nome, email, senha, papel, assuntos },
      });
      aoSalvar();
    } catch (e) {
      setErro(e.message);
      setSalvando(false);
    }
  }

  return (
    <div className="cartao">
      <h2>Novo atendente</h2>

      <div className="linha">
        <div className="campo">
          <label htmlFor="anome">Nome</label>
          <input id="anome" type="text" value={nome} autoFocus
                 onChange={(e) => setNome(e.target.value)} placeholder="Marina Alves" />
        </div>
        <div className="campo">
          <label htmlFor="aemail">Email</label>
          <input id="aemail" type="text" value={email}
                 onChange={(e) => setEmail(e.target.value)} placeholder="nome@empresa.com.br" />
          <p className="dica">É com ele que a pessoa entra no painel.</p>
        </div>
        <div className="campo">
          <label htmlFor="asenha">Senha inicial</label>
          <input id="asenha" type="text" value={senha}
                 onChange={(e) => setSenha(e.target.value)} placeholder="mínimo 8 caracteres" />
          <p className="dica">Combine com a pessoa e peça para trocar depois.</p>
        </div>

        <CampoPapel id="apapel" valor={papel} aoMudar={setPapel} />
        <CampoAssuntos valor={assuntos} aoMudar={setAssuntos} />
      </div>

      {erro && <div className="aviso erro" role="alert">{erro}</div>}

      <div className="acoes">
        <button className="btn" onClick={salvar} disabled={salvando || !nome || !email || senha.length < 8}>
          {salvando ? "Criando…" : "Criar atendente"}
        </button>
        <button className="btn secundario" onClick={aoCancelar}>Cancelar</button>
      </div>
    </div>
  );
}

// Os assuntos que a fila sabe rotear, com o nome que a equipe usa. Mesma lista
// de `api/_assunto.js` e de `api/painel-atendentes.js`.
const NOME_ASSUNTO = {
  matricula: "Matrícula e cursos",
  suporte: "Suporte ao aluno",
  agencia: "Agência",
};

// Nenhum assunto marcado quer dizer "recebe de tudo", que é o padrão de quem
// já estava cadastrado: ninguém muda de lado por causa desta tela.
function CampoAssuntos({ valor, aoMudar }) {
  const marcados = valor || [];
  const alternar = (chave) => {
    aoMudar(marcados.includes(chave)
      ? marcados.filter((x) => x !== chave)
      : [...marcados, chave]);
  };
  return (
    <div className="campo">
      <label>Atende quais assuntos</label>
      <div style={{ display: "flex", flexDirection: "column", gap: 6, paddingTop: 2 }}>
        {Object.entries(NOME_ASSUNTO).map(([chave, rotulo]) => (
          <label key={chave} style={{ display: "flex", alignItems: "center", gap: 8, fontWeight: 400 }}>
            <input type="checkbox" checked={marcados.includes(chave)}
                   onChange={() => alternar(chave)} />
            {rotulo}
          </label>
        ))}
      </div>
      <p className="dica">
        {marcados.length
          ? "A fila manda primeiro o que for desse assunto. Se não houver mais ninguém no ar, continua recebendo o resto."
          : "Nada marcado: recebe qualquer conversa, como hoje."}
      </p>
    </div>
  );
}

// O papel é a mesma escolha na criação e na edição, com a mesma explicação.
// Duas cópias do texto viram duas verdades diferentes na primeira vez que uma
// delas muda.
function CampoPapel({ id, valor, aoMudar }) {
  return (
    <div className="campo">
      <label htmlFor={id}>Papel</label>
      <select id={id} value={valor} onChange={(e) => aoMudar(e.target.value)}>
        <option value="atendente">Atendente</option>
        <option value="gestor">Gestor</option>
      </select>
      <p className="dica">
        {valor === "gestor"
          ? "Além da fila, vê o relatório de desempenho da equipe e mexe na agenda."
          : "Recebe da fila e responde. Não mexe em agenda nem vê relatório."}
      </p>
    </div>
  );
}

// Nome, nível de acesso e senha no mesmo lugar. A senha fica em branco por
// padrão: campo vazio não troca nada, só o que foi mexido é enviado.
function Editar({ atendente, aoSalvar, aoCancelar }) {
  const [nome, setNome] = useState(atendente.nome);
  const [papel, setPapel] = useState(atendente.papel || "atendente");
  const [assuntos, setAssuntos] = useState(atendente.assuntos || []);
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState("");
  const [salvando, setSalvando] = useState(false);

  const mesmaLista = (a, b) =>
    a.length === b.length && [...a].sort().every((x, i) => x === [...b].sort()[i]);
  const assuntosMudaram = !mesmaLista(assuntos, atendente.assuntos || []);
  const mudou = nome.trim() !== atendente.nome
    || papel !== (atendente.papel || "atendente")
    || assuntosMudaram
    || senha.length > 0;
  const senhaCurta = senha.length > 0 && senha.length < 8;

  async function salvar() {
    setErro("");
    setSalvando(true);
    try {
      const corpo = { id: atendente.id };
      if (nome.trim() !== atendente.nome) corpo.nome = nome;
      if (papel !== (atendente.papel || "atendente")) corpo.papel = papel;
      if (assuntosMudaram) corpo.assuntos = assuntos;
      if (senha) corpo.senha = senha;
      await chamar("painel-atendentes", { method: "POST", body: corpo });
      aoSalvar();
    } catch (e) {
      setErro(e.message);
      setSalvando(false);
    }
  }

  return (
    <div className="cartao">
      <h2>Editar {atendente.nome}</h2>

      <div className="linha">
        <div className="campo">
          <label htmlFor="enome">Nome</label>
          <input id="enome" type="text" value={nome} autoFocus
                 onChange={(e) => setNome(e.target.value)} />
        </div>

        <CampoPapel id="epapel" valor={papel} aoMudar={setPapel} />
        <CampoAssuntos valor={assuntos} aoMudar={setAssuntos} />

        <div className="campo">
          <label htmlFor="esenha">Nova senha</label>
          <input id="esenha" type="text" value={senha}
                 onChange={(e) => setSenha(e.target.value)} placeholder="deixe em branco para manter" />
          <p className="dica">
            {senhaCurta ? "Mínimo 8 caracteres." : "Só preencha se for trocar a senha."}
          </p>
        </div>
      </div>

      <p className="dica">
        O email não muda por aqui: é com ele que a pessoa entra no painel.
      </p>

      {erro && <div className="aviso erro" role="alert">{erro}</div>}

      <div className="acoes">
        <button className="btn" onClick={salvar} disabled={salvando || !mudou || senhaCurta || !nome.trim()}>
          {salvando ? "Salvando…" : "Salvar"}
        </button>
        <button className="btn secundario" onClick={aoCancelar}>Cancelar</button>
      </div>
    </div>
  );
}
