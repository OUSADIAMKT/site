import { useState } from "react";
import { chamar } from "./api.js";
import CabecalhoPagina from "./CabecalhoPagina.jsx";

const PLANOS = {
  essencial: { nome: "Essencial", teto: 200 },
  pro:       { nome: "Pro",       teto: 400 },
  prime:     { nome: "Prime",     teto: 800 },
};

export default function Clientes({ clientes, aoMudar }) {
  const [criando, setCriando] = useState(false);

  return (
    <>
      <CabecalhoPagina titulo="Clientes">
        Cada cliente tem seu próprio contexto, sua biblioteca de mídia e seu número de
        WhatsApp. O mesmo motor atende todos. O que muda é só o que você escreve aqui dentro.
      </CabecalhoPagina>

      {clientes.length === 0 ? (
        <div className="vazio">Nenhum cliente ainda. Cadastre o primeiro abaixo.</div>
      ) : (
        <div className="cartao">
          <table>
            <thead>
              <tr>
                <th>Cliente</th>
                <th>Plano</th>
                <th className="num">Conversas no mês</th>
                <th className="num">Custo de IA</th>
                <th>WhatsApp</th>
              </tr>
            </thead>
            <tbody>
              {clientes.map((c) => {
                const uso = c.teto_conversas ? c.conversas_mes / c.teto_conversas : 0;
                return (
                  <tr key={c.id}>
                    <td>
                      {c.nome}
                      {!c.ativo && <span className="etiqueta frio" style={{ marginLeft: 8 }}>pausado</span>}
                    </td>
                    <td>{PLANOS[c.plano]?.nome || c.plano}</td>
                    <td className="num">
                      {c.conversas_mes} / {c.teto_conversas}
                      {uso >= 0.8 && <span className="etiqueta morno" style={{ marginLeft: 6 }}>no limite</span>}
                    </td>
                    <td className="num">R$ {c.custo_brl_mes.toFixed(2)}</td>
                    <td>
                      {c.conectado
                        ? <span className="etiqueta humano">conectado</span>
                        : <span className="etiqueta frio">não conectado</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {criando
        ? <Formulario aoSalvar={() => { setCriando(false); aoMudar(); }} aoCancelar={() => setCriando(false)} />
        : <div className="acoes"><button className="btn" onClick={() => setCriando(true)}>Novo cliente</button></div>}
    </>
  );
}

function Formulario({ aoSalvar, aoCancelar }) {
  const [nome, setNome] = useState("");
  const [slug, setSlug] = useState("");
  const [plano, setPlano] = useState("essencial");
  const [erro, setErro] = useState("");
  const [salvando, setSalvando] = useState(false);

  // O apelido vira o identificador em comandos e no teste pelo terminal,
  // então é gerado a partir do nome em vez de ser digitado à mão.
  function aoDigitarNome(valor) {
    setNome(valor);
    setSlug(
      valor.toLowerCase()
        .normalize("NFD").replace(/[̀-ͯ]/g, "")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "")
    );
  }

  async function salvar() {
    setErro("");
    setSalvando(true);
    try {
      await chamar("painel-clientes", {
        method: "POST",
        body: { nome, slug, plano, teto_conversas: PLANOS[plano].teto },
      });
      aoSalvar();
    } catch (e) {
      setErro(e.message);
      setSalvando(false);
    }
  }

  return (
    <div className="cartao">
      <h2>Novo cliente</h2>

      <div className="linha">
        <div className="campo">
          <label htmlFor="nome">Nome</label>
          <input id="nome" type="text" value={nome} autoFocus
                 onChange={(e) => aoDigitarNome(e.target.value)}
                 placeholder="Clínica São Lucas" />
        </div>

        <div className="campo">
          <label htmlFor="slug">Apelido</label>
          <input id="slug" type="text" value={slug} onChange={(e) => setSlug(e.target.value)} />
          <p className="dica">Gerado do nome. Usado nos comandos de teste.</p>
        </div>

        <div className="campo">
          <label htmlFor="plano">Plano</label>
          <select id="plano" value={plano} onChange={(e) => setPlano(e.target.value)}>
            {Object.entries(PLANOS).map(([id, p]) => (
              <option key={id} value={id}>{p.nome}, até {p.teto} conversas</option>
            ))}
          </select>
        </div>
      </div>

      {erro && <div className="aviso erro" role="alert">{erro}</div>}

      <div className="acoes">
        <button className="btn" onClick={salvar} disabled={salvando || !nome || !slug}>
          {salvando ? "Criando…" : "Criar cliente"}
        </button>
        <button className="btn secundario" onClick={aoCancelar}>Cancelar</button>
      </div>
    </div>
  );
}
