import { useState, useEffect } from "react";
import { chamar } from "./api.js";
import CabecalhoPagina from "./CabecalhoPagina.jsx";

const LIMITE = 30000;

export default function Agente({ cliente }) {
  const [config, setConfig] = useState(null);
  const [erro, setErro] = useState("");
  const [salvo, setSalvo] = useState(false);
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    setConfig(null);
    setErro("");
    setSalvo(false);
    chamar(`painel-agente?cliente=${cliente.id}`)
      .then(({ config }) => setConfig(config))
      .catch((e) => setErro(e.message));
  }, [cliente.id]);

  function mudar(campo, valor) {
    setConfig((c) => ({ ...c, [campo]: valor }));
    setSalvo(false);
  }

  async function salvar() {
    setErro("");
    setSalvando(true);
    try {
      await chamar("painel-agente", {
        method: "POST",
        body: { cliente_id: cliente.id, ...config },
      });
      setSalvo(true);
    } catch (e) {
      setErro(e.message);
    }
    setSalvando(false);
  }

  if (erro && !config) return <div className="aviso erro" role="alert">{erro}</div>;
  if (!config) return <div className="vazio">Carregando…</div>;

  const tamanho = (config.contexto || "").length;
  const perto = tamanho > LIMITE * 0.8;

  return (
    <>
      <CabecalhoPagina titulo={<>Contexto de {cliente.nome}</>}>
        Isto é tudo que a IA sabe. Ela não busca nada fora daqui e não inventa:
        o que não estiver escrito, ela passa para um humano.
      </CabecalhoPagina>

      <div className="cartao">
        <h2>Quem ela é</h2>
        <p>O nome, o jeito de falar e o tom. Prefira dar a frase exata a usar adjetivo.</p>
        <textarea
          value={config.persona || ""}
          onChange={(e) => mudar("persona", e.target.value)}
          placeholder={'Você é a Bia, do atendimento da Ousadia Marketing.\nSimpática, direta, trata as pessoas por você.\n\nDiga: "quer que eu te mostre como funciona a próxima turma?"\nNão diga: "posso ajudar em mais alguma coisa?"'}
        />
      </div>

      <div className="cartao">
        <h2>O que o negócio faz</h2>
        <p>
          Serviços, preços, horários, endereço, convênios, prazos, perguntas frequentes.
          Escreva como explicaria para um funcionário no primeiro dia.
        </p>
        <textarea
          className="grande"
          value={config.contexto || ""}
          onChange={(e) => mudar("contexto", e.target.value)}
          placeholder={"A Ousadia Marketing é uma escola de marketing digital…\n\nCursos e mentorias:\n- Escola Ousadia: …\n- Mentoria: …\n\nComo funciona a matrícula: …"}
        />
        <div className={`contador ${perto ? "perto" : ""}`}>
          {tamanho.toLocaleString("pt-BR")} de {LIMITE.toLocaleString("pt-BR")} caracteres
        </div>
        {perto && (
          <div className="aviso atencao">
            Texto grande deixa cada resposta mais cara, porque ele é lido inteiro toda vez.
            Vale enxugar o que for repetido.
          </div>
        )}
      </div>

      <div className="cartao">
        <h2>O que ela nunca pode fazer</h2>
        <p>
          As travas. É aqui que mora a diferença entre um robô que ajuda e um que cria
          problema, principalmente em saúde e advocacia.
        </p>
        <textarea
          value={config.regras || ""}
          onChange={(e) => mudar("regras", e.target.value)}
          placeholder={"- Nunca pergunte sintoma nem opine sobre o caso da pessoa.\n- Nunca prometa prazo ou resultado.\n- Nunca ofereça desconto por conta própria."}
        />
      </div>

      {erro && <div className="aviso erro" role="alert">{erro}</div>}
      {salvo && (
        <div className="aviso ok" role="status">
          Salvo. Se o teste no terminal estiver aberto, feche e abra de novo, porque ele lê
          esta configuração só ao iniciar.
        </div>
      )}

      <div className="acoes">
        <button className="btn" onClick={salvar} disabled={salvando}>
          {salvando ? "Salvando…" : "Salvar contexto"}
        </button>
      </div>
    </>
  );
}
