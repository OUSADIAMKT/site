import { useState } from "react";
import { chamar } from "./api.js";
import { normalizarSlug } from "../api/_pagina.js";
import { normalizarDominio } from "../api/_dominios.js";

// As três gavetas do compositor: histórico de versões, configurações e
// domínios. Moram fora do Paginas.jsx porque elas não participam do laço
// editor-prévia, que é o miolo daquela tela; aqui é cadastro.

// ---------------------------------------------------------------------------
// Histórico de versões
export function Historico({ versoes, noAr, aoAbrir, aoRestaurar, aoRepublicar, aoFechar }) {
  return (
    <aside className="lp-gaveta" aria-label="Histórico de versões">
      <div className="lp-gaveta-topo">
        <strong>Histórico de versões</strong>
        <button type="button" className="btn secundario pequeno" onClick={aoFechar}>Fechar</button>
      </div>

      {versoes.length === 0 ? (
        <p className="lp-vazio">
          Nenhuma versão ainda. Uma versão nasce a cada publicação, com o conteúdo exato
          que foi aprovado na prévia.
        </p>
      ) : (
        <ul className="lp-versoes">
          {versoes.map((v) => (
            <li key={v.id} className={v.id === noAr ? "no-ar" : ""}>
              <div className="lp-versao-linha">
                <strong>Versão {v.numero}</strong>
                {v.id === noAr && <span className="etiqueta ok">no ar</span>}
                <span className="lp-quando">
                  {new Date(v.criado_em).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}
                </span>
              </div>
              {v.rotulo && <div className="lp-rotulo">{v.rotulo}</div>}
              <div className="lp-versao-acoes">
                <button type="button" className="btn secundario pequeno" onClick={() => aoAbrir(v)}>
                  Ver o código
                </button>
                <button type="button" className="btn secundario pequeno" onClick={() => aoRestaurar(v)}>
                  Trazer para o editor
                </button>
                {v.id !== noAr && (
                  <button type="button" className="btn secundario pequeno" onClick={() => aoRepublicar(v)}>
                    Pôr no ar
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </aside>
  );
}

// ---------------------------------------------------------------------------
// Configurações da página
//
// O que está aqui vai para dentro do documento publicado. Por isso não existe
// campo de "código extra no head": o servidor monta o snippet do pixel a
// partir do identificador, e um campo de código livre seria um jeito de
// qualquer pessoa com acesso ao painel injetar script na página de um cliente.
export function Configuracoes({ pagina, aoSalvar, aoFechar }) {
  const [titulo, setTitulo] = useState(pagina.titulo || "");
  const [slug, setSlug] = useState(pagina.slug || "");
  const [c, setC] = useState({
    titulo: "", descricao: "", idioma: "pt-BR", pixel_meta: "", ga4: "",
    whatsapp: "", formulario_url: "", confirmacao_url: "", robots: true,
    ...(pagina.configuracoes || {}),
  });
  const [salvando, setSalvando] = useState(false);

  const campo = (chave) => ({
    value: c[chave] ?? "",
    onChange: (e) => setC((a) => ({ ...a, [chave]: e.target.value })),
  });

  async function salvar() {
    setSalvando(true);
    try {
      await aoSalvar({ titulo, slug: normalizarSlug(slug), configuracoes: c });
    } finally {
      setSalvando(false);
    }
  }

  return (
    <aside className="lp-gaveta" aria-label="Configurações da página">
      <div className="lp-gaveta-topo">
        <strong>Configurações</strong>
        <button type="button" className="btn secundario pequeno" onClick={aoFechar}>Fechar</button>
      </div>

      <div className="campo">
        <label htmlFor="lp-titulo">Nome da página</label>
        <input id="lp-titulo" type="text" value={titulo} onChange={(e) => setTitulo(e.target.value)} />
        <span className="dica">Só para você achar a página no painel.</span>
      </div>

      <div className="campo">
        <label htmlFor="lp-slug">Apelido no endereço</label>
        <input
          id="lp-slug" type="text" value={slug} spellCheck={false}
          onChange={(e) => setSlug(e.target.value)}
          onBlur={() => setSlug(normalizarSlug(slug))}
        />
        <span className="dica">
          A página fica em <code>/p/{normalizarSlug(slug) || "apelido"}</code>. Mudar o apelido
          muda o endereço, e o endereço antigo deixa de responder.
        </span>
      </div>

      <hr className="lp-risco" />

      <div className="campo">
        <label htmlFor="lp-titulo-aba">Título da aba do navegador</label>
        <input id="lp-titulo-aba" type="text" {...campo("titulo")} />
      </div>

      <div className="campo">
        <label htmlFor="lp-descricao">Descrição para busca e compartilhamento</label>
        <textarea id="lp-descricao" rows={2} {...campo("descricao")} />
      </div>

      <div className="linha">
        <div className="campo">
          <label htmlFor="lp-pixel">Pixel da Meta</label>
          <input id="lp-pixel" type="text" inputMode="numeric" {...campo("pixel_meta")} />
          <span className="dica">Só o número. Na prévia ele nunca é carregado.</span>
        </div>
        <div className="campo">
          <label htmlFor="lp-ga4">Medida do Google (GA4)</label>
          <input id="lp-ga4" type="text" placeholder="G-XXXXXXX" {...campo("ga4")} />
        </div>
      </div>

      <div className="linha">
        <div className="campo">
          <label htmlFor="lp-whatsapp">WhatsApp dos botões</label>
          <input id="lp-whatsapp" type="text" inputMode="tel" placeholder="+5593..." {...campo("whatsapp")} />
        </div>
        <div className="campo">
          <label htmlFor="lp-idioma">Idioma</label>
          <input id="lp-idioma" type="text" placeholder="pt-BR" {...campo("idioma")} />
        </div>
      </div>

      <div className="campo">
        <label htmlFor="lp-formulario">Endereço que recebe o formulário</label>
        <input id="lp-formulario" type="url" placeholder="https://..." {...campo("formulario_url")} />
        <span className="dica">
          Chega na página como <code>window.OUSADIA_CONFIG.formulario</code>. Na prévia o envio é
          interceptado e respondido com sucesso, sem sair daqui.
        </span>
      </div>

      <div className="campo">
        <label htmlFor="lp-confirmacao">Página de confirmação</label>
        <input id="lp-confirmacao" type="url" placeholder="https://..." {...campo("confirmacao_url")} />
      </div>

      <label className="lp-caixa">
        <input
          type="checkbox" checked={c.robots !== false}
          onChange={(e) => setC((a) => ({ ...a, robots: e.target.checked }))}
        />
        Deixar o Google indexar esta página
      </label>

      <div className="acoes">
        <button type="button" className="btn" onClick={salvar} disabled={salvando}>
          {salvando ? "Salvando…" : "Salvar configurações"}
        </button>
      </div>

      <p className="lp-aviso-leve">
        Configuração salva não vai sozinha para o ar: ela entra na próxima publicação, junto
        com o conteúdo aprovado na prévia.
      </p>
    </aside>
  );
}

// ---------------------------------------------------------------------------
// Domínios
//
// Os registros de DNS mostrados aqui são os que o servidor devolveu ao
// adicionar o domínio. Nada é chutado na tela: quem dita é a resposta dele.
//
// A tela não sabe quem hospeda: `prontos` e `aviso` chegam do servidor, que
// pergunta ao api/_dominios.js. Se a hospedagem mudar, nada aqui muda.
export function Dominios({ pagina, dominios, prontos, aviso, aoMudar, aoFechar }) {
  const [novo, setNovo] = useState("");
  const [erro, setErro] = useState("");
  const [ocupado, setOcupado] = useState("");

  async function agir(corpo, marca) {
    setErro("");
    setOcupado(marca);
    try {
      await chamar("painel-paginas", { method: "POST", body: { id: pagina.id, ...corpo } });
      await aoMudar();
    } catch (e) {
      setErro(e.message);
    } finally {
      setOcupado("");
    }
  }

  return (
    <aside className="lp-gaveta" aria-label="Domínios da página">
      <div className="lp-gaveta-topo">
        <strong>Domínio do cliente</strong>
        <button type="button" className="btn secundario pequeno" onClick={aoFechar}>Fechar</button>
      </div>

      {!prontos && (
        <div className="aviso" role="note">
          Este servidor ainda não tem a integração de domínios configurada.
          {aviso ? ` ${aviso}` : ""} Enquanto isso a página responde pelo
          endereço do CRM.
        </div>
      )}

      {erro && <div className="aviso erro" role="alert">{erro}</div>}

      <div className="campo">
        <label htmlFor="lp-dominio">Adicionar domínio</label>
        <div className="lp-dominio-novo">
          <input
            id="lp-dominio" type="text" value={novo} spellCheck={false}
            placeholder="cliente.com.br" disabled={!prontos}
            onChange={(e) => setNovo(e.target.value)}
          />
          <button
            type="button" className="btn"
            disabled={!prontos || !novo.trim() || ocupado === "novo"}
            onClick={async () => {
              await agir({ acao: "dominio-adicionar", dominio: normalizarDominio(novo) }, "novo");
              setNovo("");
            }}
          >
            {ocupado === "novo" ? "Adicionando…" : "Adicionar"}
          </button>
        </div>
        <span className="dica">
          O apex (cliente.com.br) e o www são dois domínios: adicione os dois se o cliente usa
          os dois.
        </span>
      </div>

      {dominios.length === 0 ? (
        <p className="lp-vazio">Nenhum domínio ainda.</p>
      ) : (
        <ul className="lp-dominios">
          {dominios.map((d) => (
            <li key={d.id}>
              <div className="lp-versao-linha">
                <strong>{d.dominio}</strong>
                <span className={`etiqueta ${d.estado === "ativo" ? "ok" : d.estado === "erro" ? "erro" : "frio"}`}>
                  {d.estado === "ativo" ? "no ar" : d.estado === "erro" ? "DNS errado" : "esperando DNS"}
                </span>
              </div>

              {d.estado !== "ativo" && (d.verificacao || []).length > 0 && (
                <div className="lp-dns">
                  <p>Peça ao cliente para criar estes registros no DNS dele:</p>
                  <table>
                    <thead><tr><th>Tipo</th><th>Nome</th><th>Valor</th></tr></thead>
                    <tbody>
                      {d.verificacao.map((r, i) => (
                        <tr key={i}>
                          <td>{r.tipo}</td>
                          <td><code>{r.nome}</code></td>
                          <td><code>{r.valor}</code></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {d.estado !== "ativo" && (d.verificacao || []).length === 0 && (
                <p className="lp-vazio">
                  O servidor não pediu registro nenhum ainda. Confira de novo em alguns
                  minutos.
                </p>
              )}

              <div className="lp-versao-acoes">
                <button
                  type="button" className="btn secundario pequeno" disabled={ocupado === d.id}
                  onClick={() => agir({ acao: "dominio-conferir", dominio_id: d.id }, d.id)}
                >
                  {ocupado === d.id ? "Conferindo…" : "Conferir agora"}
                </button>
                <button
                  type="button" className="btn perigo pequeno" disabled={ocupado === d.id}
                  onClick={() => {
                    if (!confirm(`Tirar ${d.dominio} desta página? O endereço para de responder.`)) return;
                    agir({ acao: "dominio-remover", dominio_id: d.id }, d.id);
                  }}
                >
                  Remover
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </aside>
  );
}
