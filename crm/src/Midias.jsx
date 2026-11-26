import { useState, useEffect } from "react";
import { chamar } from "./api.js";
import CabecalhoPagina from "./CabecalhoPagina.jsx";

const TIPOS = {
  image:    "Foto",
  video:    "Vídeo",
  audio:    "Áudio",
  document: "Documento",
};

const VAZIA = { chave: "", tipo: "image", descricao: "", legenda: "", url: "", wa_media_id: "" };

export default function Midias({ cliente }) {
  const [midias, setMidias] = useState(null);
  const [editando, setEditando] = useState(null);
  const [erro, setErro] = useState("");

  async function carregar() {
    try {
      const { midias } = await chamar(`painel-midias?cliente=${cliente.id}`);
      setMidias(midias);
    } catch (e) {
      setErro(e.message);
    }
  }

  useEffect(() => { setMidias(null); setEditando(null); carregar(); }, [cliente.id]);

  async function excluir(midia) {
    if (!confirm(`Excluir a mídia "${midia.chave}"? Isso não pode ser desfeito.`)) return;
    try {
      await chamar(`painel-midias?id=${midia.id}`, { method: "DELETE" });
      carregar();
    } catch (e) {
      setErro(e.message);
    }
  }

  return (
    <>
      <CabecalhoPagina titulo={<>Mídias de {cliente.nome}</>}>
        Fotos, vídeos e áudios que a IA pode enviar sozinha. Ela escolhe pela descrição,
        então a descrição é o que decide se o arquivo certo vai ou não vai.
      </CabecalhoPagina>

      {erro && <div className="aviso erro" role="alert">{erro}</div>}

      {midias === null ? (
        <div className="vazio">Carregando…</div>
      ) : midias.length === 0 ? (
        <div className="vazio">Nenhuma mídia ainda. A IA vai responder só com texto.</div>
      ) : (
        <div className="cartao">
          <table>
            <thead>
              <tr>
                <th>Apelido</th>
                <th>Tipo</th>
                <th>Quando a IA envia</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {midias.map((m) => (
                <tr key={m.id}>
                  <td>
                    <span style={{ fontFamily: "var(--mono)", fontSize: 13 }}>{m.chave}</span>
                    {!m.ativo && <span className="etiqueta frio" style={{ marginLeft: 8 }}>desligada</span>}
                  </td>
                  <td>{TIPOS[m.tipo] || m.tipo}</td>
                  <td style={{ color: "var(--texto-2)", fontSize: 13.5 }}>{m.descricao}</td>
                  <td className="num">
                    <button className="btn secundario pequeno" onClick={() => setEditando(m)}>Editar</button>{" "}
                    <button className="btn perigo pequeno" onClick={() => excluir(m)}>Excluir</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {editando
        ? <Formulario
            cliente={cliente}
            midia={editando}
            aoSalvar={() => { setEditando(null); carregar(); }}
            aoCancelar={() => setEditando(null)}
          />
        : <div className="acoes">
            <button className="btn" onClick={() => setEditando({ ...VAZIA })}>Nova mídia</button>
          </div>}
    </>
  );
}

function Formulario({ cliente, midia, aoSalvar, aoCancelar }) {
  const [dados, setDados] = useState({ ...VAZIA, ...midia });
  const [erro, setErro] = useState("");
  const [salvando, setSalvando] = useState(false);

  function mudar(campo, valor) {
    setDados((d) => ({ ...d, [campo]: valor }));
  }

  async function salvar() {
    setErro("");
    setSalvando(true);
    try {
      await chamar("painel-midias", {
        method: "POST",
        body: { ...dados, cliente_id: cliente.id },
      });
      aoSalvar();
    } catch (e) {
      setErro(e.message);
      setSalvando(false);
    }
  }

  return (
    <div className="cartao">
      <h2>{midia.id ? `Editando ${midia.chave}` : "Nova mídia"}</h2>

      <div className="linha">
        <div className="campo">
          <label htmlFor="chave">Apelido</label>
          <input id="chave" type="text" value={dados.chave}
                 onChange={(e) => mudar("chave", e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-"))}
                 placeholder="fachada-clinica" />
          <p className="dica">Só letras minúsculas, números e hífen.</p>
        </div>

        <div className="campo">
          <label htmlFor="tipo">Tipo</label>
          <select id="tipo" value={dados.tipo} onChange={(e) => mudar("tipo", e.target.value)}>
            {Object.entries(TIPOS).map(([id, nome]) => <option key={id} value={id}>{nome}</option>)}
          </select>
        </div>
      </div>

      <div className="campo">
        <label htmlFor="descricao">Quando a IA deve enviar</label>
        <textarea id="descricao" value={dados.descricao}
                  onChange={(e) => mudar("descricao", e.target.value)}
                  placeholder="Fachada da clínica na Av. Perimetral, mostrando a entrada e o estacionamento" />
        <p className="dica">
          Descreva o conteúdo, não o arquivo. A IA lê só isto para decidir. Se estiver vago,
          ela erra ou não envia.
        </p>
      </div>

      <div className="campo">
        <label htmlFor="legenda">Legenda que vai junto</label>
        <input id="legenda" type="text" value={dados.legenda || ""}
               onChange={(e) => mudar("legenda", e.target.value)}
               placeholder="É aqui na Perimetral, 1200, e o estacionamento é nosso mesmo." />
        <p className="dica">Opcional. Áudio não aceita legenda.</p>
      </div>

      <div className="campo">
        <label htmlFor="url">Link do arquivo</label>
        <input id="url" type="url" inputMode="url" value={dados.url || ""}
               onChange={(e) => mudar("url", e.target.value)}
               autoComplete="off" spellCheck={false}
               placeholder="https://site.com.br/fachada.jpg" />
        <p className="dica">
          Precisa ser um link público e direto para o arquivo. Para produção, o ideal é
          subir o arquivo na Meta e usar o ID dela, porque link público quebra com o tempo.
        </p>
      </div>

      <div className="campo">
        <label htmlFor="media">ID da mídia na Meta</label>
        <input id="media" type="text" value={dados.wa_media_id || ""}
               onChange={(e) => mudar("wa_media_id", e.target.value)}
               placeholder="opcional por enquanto" />
        <p className="dica">Se preenchido, tem preferência sobre o link.</p>
      </div>

      {dados.tipo === "audio" && (
        <div className="aviso atencao">
          Para o áudio chegar como mensagem de voz (a bolinha com a onda), o arquivo precisa
          ser <strong>.ogg com codec OPUS</strong>. Em qualquer outro formato ele chega como
          anexo, e o efeito de "gravei um áudio pra você" se perde.
        </div>
      )}

      {erro && <div className="aviso erro" role="alert">{erro}</div>}

      <div className="acoes">
        <button className="btn" onClick={salvar} disabled={salvando}>
          {salvando ? "Salvando…" : "Salvar mídia"}
        </button>
        <button className="btn secundario" onClick={aoCancelar}>Cancelar</button>
      </div>
    </div>
  );
}
