import { useState } from "react";
import { X, Pencil, Trash2 } from "lucide-react";
import { chamar } from "./api.js";
import { normalizarAtalho } from "./respostas.js";

// Gerenciar as respostas rápidas, dentro da própria conversa.
//
// Mora aqui, e não numa tela de configuração, porque o momento de criar uma
// resposta pronta é exatamente quando a pessoa percebe que está escrevendo a
// mesma coisa pela terceira vez. Usa o mesmo painel dos modelos aprovados.

export default function RespostasRapidas({ conversaId, respostas, podeEquipe, aoMudar, aoFechar }) {
  const vazio = { id: null, atalho: "", texto: "", pessoal: !podeEquipe };
  const [form, setForm] = useState(vazio);
  const [erro, setErro] = useState("");
  const [salvando, setSalvando] = useState(false);

  async function salvar(e) {
    e.preventDefault();
    setErro("");
    setSalvando(true);
    try {
      await chamar("painel-respostas", {
        method: "POST",
        body: { conversa: conversaId, id: form.id, atalho: form.atalho, texto: form.texto, pessoal: form.pessoal },
      });
      setForm(vazio);
      await aoMudar();
    } catch (falha) {
      setErro(falha.message);
    } finally {
      setSalvando(false);
    }
  }

  async function apagar(r) {
    if (!window.confirm(`Apagar a resposta /${r.atalho}?`)) return;
    try {
      await chamar(`painel-respostas?conversa=${conversaId}&id=${r.id}`, { method: "DELETE" });
      await aoMudar();
    } catch (falha) {
      setErro(falha.message);
    }
  }

  return (
    <div className="modelos">
      <div className="modelos-topo">
        <strong>Respostas rápidas</strong>
        <button type="button" className="btn secundario pequeno" onClick={aoFechar}>
          <X size={14} /> Fechar
        </button>
      </div>
      <p className="quadro-vazio">
        Digite <code>/</code> no campo de mensagem para usar. <code>{"{nome}"}</code> vira o primeiro nome da pessoa.
      </p>
      {erro && <p className="aviso erro">{erro}</p>}

      <ul className="modelos-lista">
        {(respostas || []).map((r) => (
          <li key={r.id} className="modelos-item respostas-item">
            <span className="modelos-nome">/{r.atalho} {r.atendente_id ? <em>(sua)</em> : <em>(equipe)</em>}</span>
            <span className="modelos-corpo">{r.texto}</span>
            {(r.atendente_id || podeEquipe) && (
              <span className="respostas-acoes">
                <button type="button" className="compor-icone" title="Editar" aria-label={`Editar /${r.atalho}`}
                        onClick={() => setForm({ id: r.id, atalho: r.atalho, texto: r.texto, pessoal: Boolean(r.atendente_id) })}>
                  <Pencil size={14} />
                </button>
                <button type="button" className="compor-icone" title="Apagar" aria-label={`Apagar /${r.atalho}`}
                        onClick={() => apagar(r)}>
                  <Trash2 size={14} />
                </button>
              </span>
            )}
          </li>
        ))}
        {!respostas?.length && <li className="quadro-vazio">Nenhuma resposta ainda.</li>}
      </ul>

      <form className="modelos-escolhido" onSubmit={salvar}>
        <p className="modelos-rotulo">{form.id ? "Editar resposta" : "Nova resposta"}</p>
        <label className="campo">
          <span>Atalho</span>
          <input type="text" value={form.atalho} placeholder="boas-vindas" maxLength={31}
                 onChange={(e) => setForm({ ...form, atalho: e.target.value })}
                 onBlur={() => setForm((f) => ({ ...f, atalho: normalizarAtalho(f.atalho) }))} />
        </label>
        <label className="campo">
          <span>Texto</span>
          <textarea rows={4} value={form.texto} maxLength={4000}
                    placeholder="Oi, {nome}! Que bom te ver por aqui. Me conta: você quer aprender ou contratar?"
                    onChange={(e) => setForm({ ...form, texto: e.target.value })} />
        </label>
        {podeEquipe && (
          <label className="caixa-marcar">
            <input type="checkbox" checked={form.pessoal}
                   onChange={(e) => setForm({ ...form, pessoal: e.target.checked })} />
            Só para mim (sem marcar, a equipe toda usa)
          </label>
        )}
        <div className="respostas-acoes">
          {form.id && <button type="button" className="btn secundario pequeno" onClick={() => setForm(vazio)}>Cancelar</button>}
          <button type="submit" className="btn pequeno" disabled={salvando || !form.atalho.trim() || !form.texto.trim()}>
            {salvando ? "Salvando…" : "Salvar"}
          </button>
        </div>
      </form>
    </div>
  );
}
