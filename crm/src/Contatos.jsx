import { useState, useEffect } from "react";
import { chamar } from "./api.js";
import Gaveta from "./Gaveta.jsx";
import Filtros, { FILTRO_VAZIO, passaNoFiltro } from "./Filtros.jsx";
import CabecalhoPagina from "./CabecalhoPagina.jsx";

// Contatos: a base de clientes do cliente.
//
// Separada de Conversas de propósito. Conversa é o que a pessoa falou; contato
// é a pessoa. Quem comprou em agosto e nunca mais escreveu não tem conversa
// viva, mas continua cliente e continua podendo receber disparo. É essa lista
// que o disparo usa para escolher o público.

function data(iso) {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "2-digit" });
}

function dinheiro(v) {
  return Number(v || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

// +5511999990000 vira +55 11 99999-0000. Telefone em bloco único ninguém
// confere de bater o olho, e conferir é exatamente o que se faz numa lista
// importada antes de disparar.
function telefoneLegivel(e164) {
  const n = String(e164 || "").replace(/\D/g, "");
  if (n.length < 12) return e164;
  const ddd = n.slice(2, 4);
  const resto = n.slice(4);
  const meio = resto.length === 9 ? `${resto.slice(0, 5)}-${resto.slice(5)}` : `${resto.slice(0, 4)}-${resto.slice(4)}`;
  return `+55 ${ddd} ${meio}`;
}

export default function Contatos({ cliente }) {
  const [d, setD] = useState(null);
  const [erro, setErro] = useState("");
  const [filtro, setFiltro] = useState({ ...FILTRO_VAZIO });
  const [aberto, setAberto] = useState(null);
  const [importando, setImportando] = useState(false);
  const [vendoDuplicados, setVendoDuplicados] = useState(
    () => new URLSearchParams(location.search).get("duplicados") === "1");

  async function carregar() {
    try {
      const q = new URLSearchParams({ cliente: cliente.id });
      if (filtro.busca) q.set("busca", filtro.busca);
      if (filtro.etiqueta) q.set("etiqueta", filtro.etiqueta);
      setD(await chamar(`painel-contatos?${q}`));
      setErro("");
    } catch (e) {
      setErro(e.message);
    }
  }

  useEffect(() => { setD(null); setFiltro({ ...FILTRO_VAZIO }); }, [cliente.id]);
  useEffect(() => { carregar(); }, [cliente.id, filtro.busca, filtro.etiqueta]);

  if (!d) return <div className="vazio">Carregando…</div>;

  // Etiqueta e busca vão ao banco; o tempo é da tela, porque a lista já veio.
  const agora = Date.now();
  const visiveis = d.contatos.filter((c) =>
    passaNoFiltro({ ultima_em: c.ultima_interacao_em, etiquetas: c.etiquetas }, { ...filtro, etiqueta: "" }, agora));

  return (
    <>
      <CabecalhoPagina titulo={<>Contatos de {cliente.nome}</>}>
        Quem já comprou, já escreveu ou entrou por uma lista. É daqui que o disparo
        tira o público, e é aqui que se vê tudo que já aconteceu com cada pessoa.
      </CabecalhoPagina>

      <div className="acoes">
        <button className="btn" onClick={() => setImportando(true)}>Importar lista</button>
        <button className="btn secundario" onClick={() => setVendoDuplicados(true)}>
          Possíveis duplicados
        </button>
        <span className="dica" style={{ margin: 0 }}>
          {d.total} {d.total === 1 ? "contato" : "contatos"}
          {d.etiquetas.length > 0 && ` · ${d.etiquetas.length} etiquetas`}
        </span>
      </div>

      <Filtros
        valor={filtro} aoMudar={setFiltro}
        etiquetas={d.etiquetas}
        mostrar={{ busca: true, canal: false, atendente: false, etiqueta: true, tempo: true }}
        placeholder="Procurar por nome, telefone ou e-mail"
      />

      {erro && <div className="aviso erro" role="alert">{erro}</div>}

      {visiveis.length === 0 ? (
        <div className="vazio">
          {d.total === 0
            ? "Nenhum contato ainda. Importe uma lista para começar."
            : "Ninguém bate com esse filtro."}
        </div>
      ) : (
        <div className="cartao">
          <table>
            <thead>
              <tr>
                <th>Pessoa</th>
                <th>Empresa</th>
                <th>Etiquetas</th>
                <th>Responsável</th>
                <th className="num">Última interação</th>
              </tr>
            </thead>
            <tbody>
              {visiveis.map((c) => (
                <tr key={c.id} className="clicavel" onClick={() => setAberto(c)}>
                  <td>
                    {c.nome || "Sem nome"}
                    <div style={{ color: "var(--apagado)", fontSize: 12.5, fontFamily: "var(--mono)" }}>
                      {telefoneLegivel(c.telefone_e164)}
                    </div>
                  </td>
                  <td style={{ color: "var(--texto-2)", fontSize: 13.5, fontWeight: 400 }}>
                    {c.empresa || <span style={{ color: "var(--apagado)" }}>{c.origem}</span>}
                  </td>
                  <td>
                    {(c.etiquetas || []).slice(0, 4).map((e) => (
                      <span key={e} className="etiqueta">{e}</span>
                    ))}
                    {Number(c.score) > 0 && <span className="etiqueta">score {c.score}</span>}
                    {c.opt_out && <span className="etiqueta quente">não quer receber</span>}
                  </td>
                  <td style={{ color: "var(--texto-2)", fontSize: 13.5, fontWeight: 400 }}>
                    {c.atendentes?.nome || <span style={{ color: "var(--apagado)" }}>ninguém</span>}
                  </td>
                  <td className="num" style={{ color: "var(--apagado)" }}>
                    {data(c.ultima_interacao_em) || "nunca"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {importando && (
        <Gaveta titulo="Importar lista" aoFechar={() => setImportando(false)}>
          <Importar cliente={cliente} aoPronto={() => { setImportando(false); carregar(); }} />
        </Gaveta>
      )}

      {vendoDuplicados && (
        <Gaveta titulo="Possíveis duplicados" aoFechar={() => setVendoDuplicados(false)}>
          <Duplicados
            cliente={cliente}
            aoAbrir={(c) => { setVendoDuplicados(false); setAberto(c); }}
          />
        </Gaveta>
      )}

      {aberto && (
        <Gaveta titulo={aberto.nome || telefoneLegivel(aberto.telefone_e164)}
                aoFechar={() => setAberto(null)}>
          <Historico
            cliente={cliente} contatoId={aberto.id} aoMudar={carregar}
            origens={d.origens} equipe={d.atendentes}
          />
        </Gaveta>
      )}
    </>
  );
}

/**
 * Importar: cola a planilha ou escolhe o arquivo.
 *
 * O que ele recusar volta na tela com o número da linha e o motivo.
 * Importação que engole erro em silêncio é a que faz a pessoa descobrir o
 * problema no meio do disparo.
 */
function Importar({ cliente, aoPronto }) {
  const [csv, setCsv] = useState("");
  const [etiquetas, setEtiquetas] = useState("");
  const [ocupado, setOcupado] = useState(false);
  const [erro, setErro] = useState("");
  const [saida, setSaida] = useState(null);

  async function enviar() {
    setOcupado(true);
    setErro("");
    try {
      const r = await chamar(`painel-importar?cliente=${cliente.id}`, {
        method: "POST",
        body: { csv, etiquetas: etiquetas.split(/[;,]/).filter((e) => e.trim()) },
      });
      setSaida(r);
    } catch (e) {
      setErro(e.message);
    } finally {
      setOcupado(false);
    }
  }

  function lerArquivo(e) {
    const arquivo = e.target.files?.[0];
    if (!arquivo) return;
    const leitor = new FileReader();
    leitor.onload = () => setCsv(String(leitor.result || ""));
    leitor.readAsText(arquivo, "utf-8");
  }

  if (saida) {
    return (
      <div className="conversa-painel">
        <div className="aviso">
          {saida.gravados} {saida.gravados === 1 ? "contato gravado" : "contatos gravados"}
          {saida.repetidos > 0 && `, sendo ${saida.repetidos} que já existiam e foram atualizados`}.
        </div>

        {saida.recusadas.length > 0 && (
          <>
            <p className="dica">
              {saida.recusadas.length} {saida.recusadas.length === 1 ? "linha ficou" : "linhas ficaram"} de
              fora. Corrija e importe de novo: quem já entrou não duplica.
            </p>
            <div className="cartao">
              <table>
                <thead><tr><th className="num">Linha</th><th>Valor</th><th>Motivo</th></tr></thead>
                <tbody>
                  {saida.recusadas.slice(0, 50).map((r) => (
                    <tr key={r.linha}>
                      <td className="num">{r.linha}</td>
                      <td style={{ fontFamily: "var(--mono)", fontSize: 12.5 }}>{r.valor || "(vazio)"}</td>
                      <td style={{ color: "var(--texto-2)", fontWeight: 400 }}>{r.motivo}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        <div className="acoes">
          <button className="btn" onClick={aoPronto}>Pronto</button>
          <button className="btn secundario" onClick={() => { setSaida(null); setCsv(""); }}>
            Importar outra
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="conversa-painel">
      <p className="dica" style={{ margin: 0 }}>
        Cole a planilha ou escolha o arquivo. As colunas podem vir em qualquer ordem,
        com ou sem cabeçalho: telefone, nome, email, etiquetas. Telefone que já existe
        é atualizado, não duplicado, e o nome que já estava salvo não se perde.
      </p>

      <div className="campo">
        <label htmlFor="csv">Planilha</label>
        <textarea
          id="csv" rows={10} value={csv} onChange={(e) => setCsv(e.target.value)}
          placeholder={"telefone,nome,email,etiquetas\n11999990000,Maria,maria@email.com,mentoria"}
          style={{ fontFamily: "var(--mono)", fontSize: 12.5 }}
        />
      </div>

      <div className="campo">
        <label htmlFor="arquivo">Ou um arquivo .csv</label>
        <input id="arquivo" type="file" accept=".csv,.txt,text/csv" onChange={lerArquivo} />
      </div>

      <div className="campo">
        <label htmlFor="etiq">Etiqueta para todos desta lista</label>
        <input
          id="etiq" type="text" value={etiquetas} onChange={(e) => setEtiquetas(e.target.value)}
          placeholder="lista ousadia"
        />
        <p className="dica">
          É por aqui que o disparo vai achar essa gente depois. Separe por vírgula
          para colocar mais de uma.
        </p>
      </div>

      {erro && <div className="aviso erro" role="alert">{erro}</div>}

      <div className="acoes">
        <button className="btn" disabled={ocupado || !csv.trim()} onClick={enviar}>
          {ocupado ? "Importando…" : "Importar"}
        </button>
      </div>
    </div>
  );
}

/** Tudo que já aconteceu com uma pessoa: conversas, atendimentos e disparos. */
function Historico({ cliente, contatoId, aoMudar, origens, equipe }) {
  const [h, setH] = useState(null);
  const [erro, setErro] = useState("");
  const [ocupado, setOcupado] = useState(false);

  async function carregar() {
    try {
      setH(await chamar(`painel-contatos?cliente=${cliente.id}&contato=${contatoId}`));
    } catch (e) {
      setErro(e.message);
    }
  }

  useEffect(() => { setH(null); carregar(); }, [contatoId]);

  async function trocarOptOut() {
    setOcupado(true);
    try {
      await chamar(`painel-contatos?cliente=${cliente.id}`, {
        method: "POST",
        body: { telefone: h.contato.telefone_e164, opt_out: !h.contato.opt_out,
                nome: h.contato.nome, email: h.contato.email, etiquetas: h.contato.etiquetas },
      });
      await carregar();
      aoMudar?.();
    } catch (e) {
      setErro(e.message);
    } finally {
      setOcupado(false);
    }
  }

  if (erro) return <div className="aviso erro" role="alert">{erro}</div>;
  if (!h) return <div className="vazio">Carregando…</div>;

  const c = h.contato;

  return (
    <div className="conversa-painel">
      <p className="dica" style={{ margin: 0, fontFamily: "var(--mono)" }}>
        {telefoneLegivel(c.telefone_e164)}{c.email ? ` · ${c.email}` : ""}
      </p>

      <p style={{ margin: 0 }}>
        {(c.etiquetas || []).map((e) => <span key={e} className="etiqueta">{e}</span>)}
        {c.opt_out && <span className="etiqueta quente">não quer receber</span>}
      </p>

      {c.opt_out && (
        <div className="aviso">
          Esta pessoa está fora de todo disparo, inclusive da contagem do público.
        </div>
      )}

      <div className="acoes">
        <button className="btn secundario" disabled={ocupado} onClick={trocarOptOut}>
          {c.opt_out ? "Voltar a incluir nos disparos" : "Tirar dos disparos"}
        </button>
      </div>

      <FichaContato
        cliente={cliente} contato={c} origens={origens} equipe={equipe}
        aoSalvar={async () => { await carregar(); aoMudar?.(); }}
      />

      <Bloco titulo="Oportunidades" vazio="Nenhum negócio no funil." itens={h.negocios || []}
             linha={(n) => (
               <tr key={n.id}>
                 <td style={{ fontWeight: 400 }}>{n.titulo}</td>
                 <td>{n.situacao === "aberto" ? "em andamento" : n.situacao}</td>
                 <td className="num">
                   {n.situacao === "ganho" && n.valor_fechado !== null && n.valor_fechado !== undefined
                     ? `${dinheiro(n.valor_fechado)} fechado`
                     : dinheiro(n.valor)}
                 </td>
                 <td className="num" style={{ color: "var(--apagado)" }}>{data(n.criado_em)}</td>
               </tr>
             )} />

      <Bloco titulo="A fazer" vazio="Nada marcado com esta pessoa." itens={h.tarefas || []}
             linha={(t) => (
               <tr key={t.id}>
                 <td style={{ fontWeight: 400 }}>{t.titulo}</td>
                 <td>{t.atendentes?.nome || "ninguém"}</td>
                 <td className="num" colSpan={2} style={{ color: "var(--apagado)" }}>
                   {t.vence_em ? data(t.vence_em) : "sem prazo"}
                 </td>
               </tr>
             )} />

      <Bloco titulo="Anotações" vazio="Nenhuma anotação." itens={h.notas || []}
             linha={(x) => (
               <tr key={x.id}>
                 <td colSpan={3} style={{ fontWeight: 400, whiteSpace: "pre-wrap" }}>{x.texto}</td>
                 <td className="num" style={{ color: "var(--apagado)" }}>
                   {data(x.criado_em)}{x.autor ? ` · ${x.autor}` : ""}
                 </td>
               </tr>
             )} />

      <Bloco titulo="Conversas" vazio="Nunca escreveu para a gente." itens={h.conversas}
             linha={(x) => (
               <tr key={x.id}>
                 <td style={{ fontWeight: 400 }}>{x.canal === "instagram" ? "Instagram" : "WhatsApp"}</td>
                 <td>{x.modo === "humano" ? "com a equipe" : x.modo === "fila" ? "esperando" : "com a IA"}</td>
                 <td className="num">{x.score}</td>
                 <td className="num" style={{ color: "var(--apagado)" }}>{data(x.ultima_em)}</td>
               </tr>
             )} />

      <Bloco titulo="Atendimentos humanos" vazio="Nunca passou pela mão de alguém."
             itens={h.atendimentos}
             linha={(a) => (
               <tr key={a.id}>
                 <td style={{ fontFamily: "var(--mono)", fontSize: 12.5 }}>{data(a.assumida_em || a.entrou_fila)}</td>
                 <td style={{ fontWeight: 400 }}>{a.atendentes?.nome || "Equipe"}</td>
                 <td style={{ color: "var(--texto-2)", fontWeight: 400 }} colSpan={2}>
                   {a.motivo || "Não informada"}
                 </td>
               </tr>
             )} />

      <Bloco titulo="Disparos recebidos" vazio="Nunca recebeu disparo." itens={h.disparos}
             linha={(x, i) => (
               <tr key={i}>
                 <td style={{ fontWeight: 400 }}>{x.disparos?.nome || "disparo"}</td>
                 <td>{x.estado}</td>
                 <td style={{ color: "var(--texto-2)", fontWeight: 400 }}>{x.motivo || ""}</td>
                 <td className="num" style={{ color: "var(--apagado)" }}>{data(x.enviado_em)}</td>
               </tr>
             )} />
    </div>
  );
}

/**
 * A ficha comercial do contato: o que se edita sobre a pessoa.
 *
 * Fica dentro da gaveta, acima do histórico. Telefone não entra aqui porque é
 * a identidade do contato no banco (um por empresa, com índice único): mudar
 * telefone é criar outro contato, e isso se faz importando ou conversando, não
 * corrigindo um campo.
 */
function FichaContato({ cliente, contato: c, origens, equipe, aoSalvar }) {
  const [f, setF] = useState(() => ({
    nome: c.nome || "",
    empresa: c.empresa || "",
    documento: c.documento || "",
    email: c.email || "",
    responsavel_id: c.responsavel_id || "",
    origem_id: c.origem_id || "",
    canal: c.canal || "",
    score: c.score === null || c.score === undefined ? "" : String(c.score),
    etiquetas: (c.etiquetas || []).join(", "),
  }));
  const [erro, setErro] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [salvo, setSalvo] = useState(false);
  const pega = (campo) => (e) => { setF({ ...f, [campo]: e.target.value }); setSalvo(false); };

  async function salvar() {
    setSalvando(true); setErro(""); setSalvo(false);
    try {
      await chamar(`painel-contatos?cliente=${cliente.id}`, {
        method: "POST",
        body: {
          telefone: c.telefone_e164,
          opt_out: c.opt_out,
          nome: f.nome,
          empresa: f.empresa,
          documento: f.documento,
          email: f.email,
          responsavel_id: f.responsavel_id || null,
          origem_id: f.origem_id || null,
          canal: f.canal || null,
          score: f.score === "" ? null : Number(f.score),
          etiquetas: f.etiquetas.split(",").map((x) => x.trim().toLowerCase()).filter(Boolean),
        },
      });
      setSalvo(true);
      await aoSalvar?.();
    } catch (e) {
      setErro(e.message);
    } finally {
      setSalvando(false);
    }
  }

  return (
    <div className="ficha-contato">
      {erro && <div className="aviso erro" role="alert">{erro}</div>}
      <div className="ficha-grade">
        <label>
          <span>Nome</span>
          <input type="text" value={f.nome} onChange={pega("nome")} placeholder="como a pessoa se chama" />
        </label>
        <label>
          <span>Empresa</span>
          <input type="text" value={f.empresa} onChange={pega("empresa")} placeholder="opcional" />
        </label>
        <label>
          <span>CPF ou CNPJ</span>
          <input type="text" value={f.documento} onChange={pega("documento")} placeholder="só números" />
        </label>
        <label>
          <span>E-mail</span>
          <input type="email" value={f.email} onChange={pega("email")} placeholder="opcional" />
        </label>
        <label>
          <span>Responsável comercial</span>
          <select value={f.responsavel_id} onChange={pega("responsavel_id")}>
            <option value="">Ninguém</option>
            {(equipe || []).map((a) => <option key={a.id} value={a.id}>{a.nome}</option>)}
          </select>
        </label>
        <label>
          <span>Origem</span>
          <select value={f.origem_id} onChange={pega("origem_id")}>
            <option value="">Não informada</option>
            {(origens || []).filter((o) => o.ativo || o.id === f.origem_id)
              .map((o) => <option key={o.id} value={o.id}>{o.nome}</option>)}
          </select>
        </label>
        <label>
          <span>Canal de preferência</span>
          <select value={f.canal} onChange={pega("canal")}>
            <option value="">Não informado</option>
            <option value="whatsapp">WhatsApp</option>
            <option value="instagram">Instagram</option>
            <option value="email">E-mail</option>
            <option value="telefone">Telefone</option>
            <option value="presencial">Presencial</option>
          </select>
        </label>
        <label>
          <span>Score (0 a 100)</span>
          <input type="number" min={0} max={100} step={1} value={f.score}
                 onChange={pega("score")} placeholder="em branco = sem score" />
        </label>
        <label className="largo">
          <span>Etiquetas, separadas por vírgula</span>
          <input type="text" value={f.etiquetas} onChange={pega("etiquetas")} placeholder="aluno, mentoria, comunidade" />
        </label>
      </div>
      <div className="acoes">
        <button className="btn" disabled={salvando} onClick={salvar}>
          {salvando ? "Salvando…" : "Salvar ficha"}
        </button>
        {salvo && <span className="dica" style={{ margin: 0 }}>Salvo.</span>}
      </div>
    </div>
  );
}

/**
 * Gente que pode ser a mesma pessoa.
 *
 * A tela aponta e para aí. Juntar duas linhas por conta própria apagaria uma
 * pessoa de verdade do cadastro, com as conversas dela: mesmo e-mail pode ser
 * mãe e filha com a conta de casa. Quem decide é gente, abrindo as duas.
 */
function Duplicados({ cliente, aoAbrir }) {
  const [g, setG] = useState(null);
  const [erro, setErro] = useState("");

  useEffect(() => {
    chamar(`painel-contatos?cliente=${cliente.id}&ver=duplicados`)
      .then((d) => setG(d.grupos || []))
      .catch((e) => setErro(e.message));
  }, [cliente.id]);

  if (erro) return <div className="aviso erro" role="alert">{erro}</div>;
  if (!g) return <div className="vazio">Carregando…</div>;
  if (!g.length) {
    return <p className="quadro-vazio">Nenhum contato com documento ou e-mail repetido.</p>;
  }

  return (
    <div className="conversa-painel">
      <div className="aviso">
        O CRM não junta contatos sozinho. Documento ou e-mail repetido pode
        ser a mesma pessoa cadastrada duas vezes, ou duas pessoas de verdade que
        dividem o mesmo e-mail. Abra as duas antes de decidir.
      </div>
      {g.map((grupo) => (
        <div key={`${grupo.tipo}:${grupo.valor}`}>
          <h2 style={{ fontSize: 14, margin: "0 0 8px" }}>
            {grupo.tipo === "documento" ? "Mesmo documento" : "Mesmo e-mail"}: {grupo.valor}
          </h2>
          <div className="cartao" style={{ padding: 0 }}>
            <table>
              <tbody>
                {grupo.contatos.map((c) => (
                  <tr key={c.id} className="clicavel" onClick={() => aoAbrir(c)}>
                    <td>{c.nome || "Sem nome"}{c.empresa ? ` · ${c.empresa}` : ""}</td>
                    <td style={{ fontFamily: "var(--mono)", fontSize: 12.5 }}>{telefoneLegivel(c.telefone_e164)}</td>
                    <td className="num" style={{ color: "var(--apagado)" }}>desde {data(c.criado_em)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}
    </div>
  );
}

function Bloco({ titulo, vazio, itens, linha }) {
  return (
    <div>
      <h2 style={{ fontSize: 14, margin: "0 0 8px" }}>{titulo}</h2>
      {itens.length === 0 ? (
        <p className="quadro-vazio">{vazio}</p>
      ) : (
        <div className="cartao" style={{ padding: 0 }}>
          <table><tbody>{itens.map(linha)}</tbody></table>
        </div>
      )}
    </div>
  );
}
