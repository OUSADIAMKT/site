import { useState, useEffect, useMemo } from "react";
import { Search, Send, X, ChevronLeft } from "lucide-react";
import { chamar } from "./api.js";

// Os modelos aprovados na Meta, dentro da conversa.
//
// Existe por um motivo só: depois que a janela de 24 horas fecha, o WhatsApp
// recusa texto livre e aceita apenas modelo aprovado. Antes disso a tela
// avisava que a janela fechou e parava ali, e a atendente não tinha saída
// nenhuma de dentro do painel: ou decorava o nome do modelo e abria a tela de
// disparo, ou abandonava a conversa.
//
// Três decisões que não são óbvias:
//
// 1. A lista vem da Meta a cada abertura, não de um cache nosso. Modelo
//    aprovado e modelo pausado mudam no painel da Meta, e oferecer da memória
//    um modelo que foi pausado lá é prometer um envio que volta erro.
//
// 2. Nada sai sem a prévia preenchida à mostra. O corpo é aprovado e fixo: o
//    que a atendente escolhe são os campos. Ver o texto final antes é o que
//    separa "mandei o modelo certo" de "mandei {{1}} para a cliente".
//
// 3. Campo em branco não habilita o botão. A Meta recusa parâmetro vazio com
//    132000, que não entrega e não explica nada na tela.

export default function Modelos({ conversaId, aoFechar, aoEnviar }) {
  const [modelos, setModelos] = useState(null);
  const [aviso, setAviso] = useState("");
  const [erro, setErro] = useState("");
  const [busca, setBusca] = useState("");
  const [escolhido, setEscolhido] = useState(null);
  const [campos, setCampos] = useState([]);
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    let vivo = true;
    (async () => {
      try {
        const r = await chamar(`painel-fila?rota=modelos&conversa=${conversaId}`);
        if (!vivo) return;
        setModelos(r.modelos || []);
        setAviso(r.aviso || "");
      } catch (e) {
        if (vivo) { setModelos([]); setErro(e.message); }
      }
    })();
    return () => { vivo = false; };
  }, [conversaId]);

  const lista = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    if (!termo) return modelos || [];
    return (modelos || []).filter((m) =>
      m.nome.toLowerCase().includes(termo) || m.corpo.toLowerCase().includes(termo));
  }, [modelos, busca]);

  function abrir(m) {
    setEscolhido(m);
    setCampos(Array.from({ length: m.campos }, () => ""));
    setErro("");
  }

  const previa = escolhido
    ? escolhido.corpo.replace(/\{\{\s*(\d+)\s*\}\}/g, (inteiro, n) => {
      const v = campos[Number(n) - 1];
      return v && v.trim() ? v.trim() : inteiro;
    })
    : "";

  const faltaCampo = !escolhido
    || campos.length !== escolhido.campos
    || campos.some((v) => !v.trim());

  async function enviar() {
    if (faltaCampo || enviando) return;
    setEnviando(true);
    setErro("");
    try {
      await chamar("painel-fila", {
        method: "POST",
        body: { acao: "modelo", conversa_id: conversaId, modelo: escolhido.nome, campos },
      });
      aoEnviar?.();
      aoFechar?.();
    } catch (e) {
      setErro(e.message);
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="modelos">
      <div className="modelos-topo">
        <strong>Modelos aprovados</strong>
        <button type="button" className="btn secundario pequeno" onClick={aoFechar}>
          <X size={14} /> Fechar
        </button>
      </div>

      {modelos === null && <p className="quadro-vazio">Lendo os modelos na Meta…</p>}
      {aviso && <p className="aviso atencao">{aviso}</p>}
      {erro && <p className="aviso erro">{erro}</p>}

      {modelos !== null && modelos.length > 0 && !escolhido && (
        <>
          <div className="modelos-busca">
            <Search size={14} />
            <input
              type="text"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Procurar pelo nome ou pelo texto"
            />
          </div>
          <ul className="modelos-lista">
            {lista.map((m) => (
              <li key={m.nome}>
                <button
                  type="button"
                  className="modelos-item"
                  onClick={() => abrir(m)}
                  disabled={m.cabecalho_de_midia}
                >
                  <span className="modelos-nome">{m.nome}</span>
                  <span className="modelos-corpo">{m.corpo}</span>
                  <span className="modelos-ficha">
                    {m.categoria === "UTILITY" ? "atendimento" : "promocional"}
                    {m.campos > 0 && ` · ${m.campos} ${m.campos === 1 ? "campo" : "campos"} para preencher`}
                    {m.botoes.some((b) => b.tipo === "URL") && " · botão de link fixo"}
                    {m.cabecalho_de_midia && " · tem imagem no cabeçalho, ainda não sai por aqui"}
                  </span>
                </button>
              </li>
            ))}
            {lista.length === 0 && <li className="quadro-vazio">Nenhum modelo com esse texto.</li>}
          </ul>
        </>
      )}

      {modelos !== null && modelos.length === 0 && !aviso && !erro && (
        <p className="quadro-vazio">
          Este número não tem modelo aprovado na Meta. Criar e aprovar modelo é no painel da Meta.
        </p>
      )}

      {escolhido && (
        <div className="modelos-escolhido">
          <button type="button" className="btn secundario pequeno" onClick={() => setEscolhido(null)}>
            <ChevronLeft size={14} /> Voltar para a lista
          </button>
          <p className="modelos-nome">{escolhido.nome}</p>

          {Array.from({ length: escolhido.campos }, (vazio, i) => (
            <div className="campo" key={i}>
              <label htmlFor={`modelo-campo-${i}`}>Campo {i + 1}</label>
              <input
                id={`modelo-campo-${i}`}
                type="text"
                value={campos[i] || ""}
                onChange={(e) => {
                  const copia = [...campos];
                  copia[i] = e.target.value;
                  setCampos(copia);
                }}
                placeholder={i === 0 ? "O nome da pessoa, normalmente" : ""}
              />
            </div>
          ))}

          <p className="modelos-rotulo">Como vai chegar</p>
          <p className="modelos-previa">{previa}</p>
          {escolhido.rodape && <p className="modelos-rodape">{escolhido.rodape}</p>}
          {escolhido.botoes.map((b, i) => (
            <p key={i} className="modelos-rodape">
              Botão: {b.texto}{b.url ? ` → ${b.url}` : ""}
            </p>
          ))}

          <p className="modelos-nota">
            O corpo é aprovado pela Meta e não dá para mudar aqui. Enviar o modelo não reabre a
            janela de 24 horas: ela só reabre quando a pessoa responder.
          </p>

          <button type="button" className="btn" onClick={enviar} disabled={faltaCampo || enviando}>
            <Send size={14} /> {enviando ? "Enviando…" : "Enviar este modelo"}
          </button>
          {faltaCampo && escolhido.campos > 0 && (
            <p className="modelos-nota">
              Preencha {escolhido.campos === 1 ? "o campo" : "todos os campos"} para poder enviar.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
