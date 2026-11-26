import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import {
  Columns2, Code2, Monitor, ExternalLink, History, Settings, Globe,
  Upload, ShieldCheck, RotateCcw, ArrowLeft, Smartphone, Tablet, Laptop,
  Search, Plus, LayoutGrid, List, Pencil, Eye, Copy, Archive, ArchiveRestore,
  X, FileCode2,
} from "lucide-react";
import { chamar } from "./api.js";
import CabecalhoPagina from "./CabecalhoPagina.jsx";
import EditorCodigo from "./editorCodigo.jsx";
import { Historico, Configuracoes, Dominios } from "./paginasGavetas.jsx";
import { montarPrevia, SANDBOX, FORMATOS, normalizarSlug } from "../api/_pagina.js";
import "./paginas.css";

// O compositor de landing pages.
//
// Três decisões que sustentam esta tela, e que não são óbvias olhando o
// código:
//
// 1. A PRÉVIA É A ÚNICA PORTA PARA PUBLICAR. Não existe botão que mande o
//    editor direto para o ar. Publicar manda para o servidor o conteúdo que o
//    iframe da prévia está renderizando NESTE instante, capturado no momento
//    em que o documento entrou no iframe, e o servidor recusa se isso não for
//    igual ao rascunho gravado. Quem digitou depois da prévia montar tem que
//    esperar a prévia remontar, o que leva menos de um segundo. É assim que "a
//    página publicada é exatamente a versão aprovada na prévia" para de ser
//    uma frase e passa a ser uma trava.
//
// 2. O CÓDIGO IMPORTADO NUNCA RODA NA ORIGEM DO PAINEL. Ele roda dentro de um
//    iframe com sandbox sem `allow-same-origin`, o que o põe numa origem
//    opaca: sem cookie do painel, sem o localStorage onde vive o token, sem
//    direito de chamar /api/ com credencial. A lista do sandbox mora em
//    api/_pagina.js, com o porquê de cada item, e tem teste que falha se
//    `allow-same-origin` aparecer lá.
//
// 3. A PRÉVIA NÃO DISPARA NADA DE VERDADE. O documento da prévia leva um
//    preâmbulo que segura fetch, XHR, beacon, pixel, submit e link de
//    WhatsApp, e cada bloqueio é relatado para esta tela, que mostra a lista.
//    O documento publicado não leva uma linha desse preâmbulo, e leva o pixel
//    de produção, que a prévia nunca carrega.

const ESPERA_RASCUNHO = 1500;   // pausa de digitação antes de salvar
const ESPERA_PREVIA = 400;      // pausa antes de remontar a prévia

const ARQUIVOS = [
  { chave: "html", nome: "index.html", idioma: "html" },
  { chave: "css", nome: "estilo.css", idioma: "css" },
  { chave: "js", nome: "script.js", idioma: "js" },
];

const ICONE_FORMATO = {
  desktop: Monitor, notebook: Laptop, tablet: Tablet, smartphone: Smartphone,
};

function chaveLocal(id) {
  return `ousadia_lp_${id}`;
}

export default function Paginas({ cliente }) {
  const [lista, setLista] = useState(null);
  const [abertaId, setAbertaId] = useState(null);
  const [modoAberto, setModoAberto] = useState("dividido");
  const [erro, setErro] = useState("");
  const [recado, setRecado] = useState("");
  const [criando, setCriando] = useState(false);
  const [ocupado, setOcupado] = useState("");

  // O recorte da galeria. Tudo numa estrutura só porque todo filtro mexe na
  // mesma lista, e espalhar isso em cinco useState vira cinco lugares para
  // esquecer de limpar.
  const [recorte, setRecorte] = useState({
    busca: "", estado: "todas", dominio: "todos", periodo: "sempre", arquivadas: false,
  });
  const [visao, setVisao] = useState(() => {
    try { return localStorage.getItem(CHAVE_VISAO) || "grade"; } catch (e) { return "grade"; }
  });

  useEffect(() => {
    try { localStorage.setItem(CHAVE_VISAO, visao); } catch (e) {}
  }, [visao]);

  const carregarLista = useCallback(async () => {
    try {
      const desde = desdeDoPeriodo(recorte.periodo);
      const busca = new URLSearchParams({ cliente: cliente.id });
      if (desde) busca.set("desde", desde);
      if (recorte.arquivadas) busca.set("arquivadas", "1");
      const r = await chamar(`painel-paginas?${busca}`);
      setLista(r.paginas || []);
      setErro("");
    } catch (e) {
      setErro(e.message);
      setLista([]);
    }
  }, [cliente.id, recorte.periodo, recorte.arquivadas]);

  useEffect(() => { setLista(null); carregarLista(); }, [carregarLista]);
  useEffect(() => { setAbertaId(null); }, [cliente.id]);

  async function agir(corpo, aviso) {
    setOcupado(corpo.id + corpo.acao);
    setErro("");
    try {
      const r = await chamar("painel-paginas", { method: "POST", body: corpo });
      setRecado(aviso);
      await carregarLista();
      return r;
    } catch (e) {
      setErro(e.message);
      return null;
    } finally {
      setOcupado("");
    }
  }

  // Os domínios que existem, para o filtro. Sai da própria lista: domínio que
  // ninguém cadastrou não vira opção de filtro que nunca acha nada.
  const dominios = useMemo(() => {
    const todos = new Set();
    for (const p of lista || []) for (const d of p.dominios || []) todos.add(d.dominio);
    return [...todos].sort();
  }, [lista]);

  const vistas = useMemo(() => filtrar(lista || [], recorte), [lista, recorte]);
  const numeros = useMemo(() => somar(vistas), [vistas]);

  if (abertaId) {
    return (
      <Compositor
        id={abertaId}
        modoInicial={modoAberto}
        aoVoltar={() => { setAbertaId(null); setModoAberto("dividido"); carregarLista(); }}
      />
    );
  }

  const abrir = (p, modo = "dividido") => { setModoAberto(modo); setAbertaId(p.id); };

  return (
    <>
      <CabecalhoPagina
        titulo="Landing Pages"
        resumo={lista ? `${lista.length} ${lista.length === 1 ? "página" : "páginas"}` : null}
        acoes={
          <div className="lp-ferramentas">
            <div className="lp-busca">
              <Search size={14} strokeWidth={2} aria-hidden="true" />
              <input
                type="search" value={recorte.busca} placeholder="Buscar por nome ou endereço"
                aria-label="Buscar landing page"
                onChange={(e) => setRecorte({ ...recorte, busca: e.target.value })}
              />
            </div>

            <select
              value={recorte.estado} aria-label="Filtrar por situação"
              onChange={(e) => setRecorte({ ...recorte, estado: e.target.value })}
            >
              <option value="todas">Todas as situações</option>
              <option value="no-ar">No ar</option>
              <option value="rascunho">Rascunho</option>
              <option value="pendente">Com alteração não publicada</option>
            </select>

            <select
              value={recorte.dominio} aria-label="Filtrar por domínio"
              onChange={(e) => setRecorte({ ...recorte, dominio: e.target.value })}
            >
              <option value="todos">Todos os domínios</option>
              <option value="plataforma">Endereço do CRM</option>
              {dominios.map((d) => <option key={d} value={d}>{d}</option>)}
            </select>

            <select
              value={recorte.periodo} aria-label="Período da medição"
              onChange={(e) => setRecorte({ ...recorte, periodo: e.target.value })}
            >
              <option value="7">Últimos 7 dias</option>
              <option value="30">Últimos 30 dias</option>
              <option value="90">Últimos 90 dias</option>
              <option value="sempre">Desde o começo</option>
            </select>

            <div className="lp-visao" role="group" aria-label="Forma de ver a galeria">
              <button
                type="button" className={`ed-icone ${visao === "grade" ? "ativo" : ""}`}
                onClick={() => setVisao("grade")} aria-pressed={visao === "grade"} title="Grade"
              >
                <LayoutGrid size={15} strokeWidth={1.8} aria-hidden="true" />
                <span className="ed-oculto">Grade</span>
              </button>
              <button
                type="button" className={`ed-icone ${visao === "lista" ? "ativo" : ""}`}
                onClick={() => setVisao("lista")} aria-pressed={visao === "lista"} title="Lista"
              >
                <List size={15} strokeWidth={1.8} aria-hidden="true" />
                <span className="ed-oculto">Lista</span>
              </button>
            </div>

            <button type="button" className="btn lp-nova-botao" onClick={() => setCriando(true)}>
              <Plus size={15} strokeWidth={2.2} aria-hidden="true" /> Nova landing page
            </button>
          </div>
        }
      />

      {erro && <div className="aviso erro" role="alert">{erro}</div>}
      {recado && <div className="aviso" role="status">{recado}</div>}

      <Indicadores lista={lista} vistas={vistas} numeros={numeros} periodo={recorte.periodo} />

      <div className="lp-abas-arquivo">
        <button
          type="button" className={`lp-aba ${!recorte.arquivadas ? "ativo" : ""}`}
          onClick={() => setRecorte({ ...recorte, arquivadas: false })}
        >
          Ativas
        </button>
        <button
          type="button" className={`lp-aba ${recorte.arquivadas ? "ativo" : ""}`}
          onClick={() => setRecorte({ ...recorte, arquivadas: true })}
        >
          Arquivadas
        </button>
      </div>

      {lista === null ? (
        <div className="lp-galeria-vazia">Carregando…</div>
      ) : vistas.length === 0 ? (
        <Vazio
          temPaginas={(lista || []).length > 0}
          arquivadas={recorte.arquivadas}
          aoCriar={() => setCriando(true)}
        />
      ) : (
        <div className={`lp-galeria ${visao}`}>
          {vistas.map((p) => (
            <Cartao
              key={p.id} pagina={p} visao={visao} ocupado={ocupado}
              aoAbrir={abrir}
              aoDuplicar={() => agir({ acao: "duplicar", id: p.id }, "Página duplicada.")}
              aoArquivar={() => agir(
                { acao: p.arquivada_em ? "desarquivar" : "arquivar", id: p.id },
                p.arquivada_em ? "Página devolvida para a galeria." : "Página arquivada.",
              )}
            />
          ))}
        </div>
      )}

      {criando && (
        <NovaPagina
          cliente={cliente}
          aoFechar={() => setCriando(false)}
          aoCriar={(p) => { setCriando(false); carregarLista(); abrir(p); }}
        />
      )}
    </>
  );
}

// ---------------------------------------------------------------------------
// Os indicadores
//
// Cinco números, numa linha só. Os dois primeiros saem da própria listagem;
// os três últimos saem da medição da 046, que começou a contar no dia em que
// entrou. Página publicada antes disso aparece com zero porque é zero MEDIDO,
// e não porque o número se perdeu: inventar estimativa aqui seria o começo de
// um painel em que ninguém confia.
function Indicadores({ lista, vistas, numeros, periodo }) {
  const publicadas = (vistas || []).filter((p) => p.publicada_em).length;
  const taxa = numeros.visitas > 0 ? (numeros.leads / numeros.visitas) * 100 : null;

  const fichas = [
    { chave: "total", nome: "Páginas", valor: lista === null ? "—" : String(vistas.length) },
    { chave: "ar", nome: "No ar", valor: lista === null ? "—" : String(publicadas) },
    { chave: "visitas", nome: "Visitantes", valor: lista === null ? "—" : numeroBonito(numeros.visitas) },
    { chave: "leads", nome: "Leads captados", valor: lista === null ? "—" : numeroBonito(numeros.leads) },
    {
      chave: "taxa", nome: "Taxa de conversão",
      // Sem visita não existe taxa: dividir por zero e mostrar 0% diria que
      // ninguém converteu, quando o que houve é que ninguém chegou.
      valor: lista === null ? "—" : taxa === null ? "—" : `${taxa.toFixed(1).replace(".", ",")}%`,
    },
  ];

  return (
    <div className="lp-indicadores">
      {fichas.map((f) => (
        <div key={f.chave} className="lp-indicador" data-chave={f.chave}>
          <span className="lp-indicador-valor">{f.valor}</span>
          <span className="lp-indicador-nome">{f.nome}</span>
        </div>
      ))}
      <p className="lp-indicadores-nota">
        {periodo === "sempre" ? "Desde o começo da medição." : `Últimos ${periodo} dias.`}
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// O cartão
//
// A miniatura é a PÁGINA DE VERDADE, num iframe reduzido apontado para o
// endereço público dela, com o mesmo sandbox da prévia. Não é foto, não é
// aproximação e não envelhece: publicou, mudou aqui.
//
// Captura de imagem de verdade pediria navegador headless, que não cabe numa
// função serverless; e imagem genérica de exemplo seria justamente o que a
// especificação proíbe. Página que nunca foi publicada não tem endereço
// público, então não tem miniatura: ela mostra o lugar vazio, dizendo isso.
//
// O medidor da página publicada não conta visita dentro de quadro, então
// abrir esta galeria não mexe no número de ninguém.
function Cartao({ pagina, visao, ocupado, aoAbrir, aoDuplicar, aoArquivar }) {
  const p = pagina;
  const medida = p.medida || { visitas: 0, leads: 0 };
  const taxa = medida.visitas > 0 ? (medida.leads / medida.visitas) * 100 : null;
  const dominio = (p.dominios || []).find((d) => d.estado === "ativo") || (p.dominios || [])[0];
  const endereco = dominio ? dominio.dominio : `/p/${p.slug}`;
  const pendente = Boolean(p.publicada_em) && new Date(p.atualizado_em) > new Date(p.publicada_em);

  return (
    <article className={`lp-cartao ${visao}`}>
      <button
        type="button" className="lp-mini" onClick={() => aoAbrir(p)}
        aria-label={`Abrir ${p.titulo} no compositor`}
      >
        {p.publicada_em ? (
          <iframe
            title={`Miniatura de ${p.titulo}`} src={`/p/${p.slug}`}
            sandbox={SANDBOX} scrolling="no" tabIndex={-1} loading="lazy"
          />
        ) : (
          <span className="lp-mini-vazia">
            <FileCode2 size={20} strokeWidth={1.6} aria-hidden="true" />
            Ainda não publicada
          </span>
        )}
      </button>

      <div className="lp-cartao-corpo">
        <div className="lp-cartao-topo">
          <button type="button" className="lp-cartao-nome" onClick={() => aoAbrir(p)}>
            {p.titulo}
          </button>
          <Situacao pagina={p} pendente={pendente} />
        </div>

        <code className="lp-cartao-endereco" title={endereco}>{endereco}</code>

        <dl className="lp-cartao-numeros">
          <div><dt>Visitantes</dt><dd>{numeroBonito(medida.visitas)}</dd></div>
          <div><dt>Leads</dt><dd>{numeroBonito(medida.leads)}</dd></div>
          <div>
            <dt>Conversão</dt>
            <dd>{taxa === null ? "—" : `${taxa.toFixed(1).replace(".", ",")}%`}</dd>
          </div>
        </dl>

        <p className="lp-cartao-data">Alterada em {quandoBonito(p.atualizado_em)}</p>

        <div className="lp-cartao-acoes">
          <button type="button" className="btn secundario pequeno" onClick={() => aoAbrir(p)}>
            <Pencil size={13} strokeWidth={2} aria-hidden="true" /> Editar
          </button>
          <button
            type="button" className="ed-icone" title="Pré-visualizar"
            onClick={() => aoAbrir(p, "previa")}
          >
            <Eye size={15} strokeWidth={1.8} aria-hidden="true" />
            <span className="ed-oculto">Pré-visualizar</span>
          </button>
          <a
            className={`ed-icone ${p.publicada_em ? "" : "desligado"}`}
            href={p.publicada_em ? `/p/${p.slug}` : undefined}
            target="_blank" rel="noreferrer"
            title={p.publicada_em ? "Acessar a página no ar" : "Ainda não está no ar"}
            aria-disabled={p.publicada_em ? undefined : true}
          >
            <ExternalLink size={15} strokeWidth={1.8} aria-hidden="true" />
            <span className="ed-oculto">Acessar</span>
          </a>
          <button
            type="button" className="ed-icone" title="Duplicar"
            onClick={aoDuplicar} disabled={ocupado === p.id + "duplicar"}
          >
            <Copy size={15} strokeWidth={1.8} aria-hidden="true" />
            <span className="ed-oculto">Duplicar</span>
          </button>
          {/* Publicar abre o compositor de propósito, e não publica daqui: o
              que vai para o ar é o que foi aprovado na prévia, e daqui não
              existe prévia para aprovar. A trava mora no servidor, mas um
              botão que sempre falha é um botão que não devia existir. */}
          <button
            type="button" className="ed-icone"
            title={pendente || !p.publicada_em ? "Publicar na prévia" : "Já está no ar"}
            onClick={() => aoAbrir(p, "previa")}
          >
            <Upload size={15} strokeWidth={1.8} aria-hidden="true" />
            <span className="ed-oculto">Publicar</span>
          </button>
          <button
            type="button" className="ed-icone"
            title={p.arquivada_em ? "Devolver para a galeria" : "Arquivar"}
            onClick={aoArquivar} disabled={ocupado === p.id + "arquivar"}
          >
            {p.arquivada_em
              ? <ArchiveRestore size={15} strokeWidth={1.8} aria-hidden="true" />
              : <Archive size={15} strokeWidth={1.8} aria-hidden="true" />}
            <span className="ed-oculto">{p.arquivada_em ? "Desarquivar" : "Arquivar"}</span>
          </button>
        </div>
      </div>
    </article>
  );
}

function Situacao({ pagina, pendente }) {
  if (pagina.arquivada_em) return <span className="etiqueta frio">arquivada</span>;
  if (!pagina.publicada_em) return <span className="etiqueta frio">rascunho</span>;
  // Etiqueta curta porque ela divide a linha com o nome da página. O que ela
  // quer dizer por extenso está no title e na faixa do compositor.
  if (pendente) {
    return (
      <span className="etiqueta morno" title="Existe alteração que ainda não foi publicada">
        pendente
      </span>
    );
  }
  return <span className="etiqueta ok">no ar</span>;
}

// ---------------------------------------------------------------------------
// O estado vazio
function Vazio({ temPaginas, arquivadas, aoCriar }) {
  if (arquivadas) {
    return (
      <div className="lp-vazio">
        <Archive size={26} strokeWidth={1.4} aria-hidden="true" />
        <strong>Nenhuma página arquivada</strong>
        <p>O que for arquivado aparece aqui, inteiro, e volta quando você quiser.</p>
      </div>
    );
  }
  if (temPaginas) {
    return (
      <div className="lp-vazio">
        <Search size={26} strokeWidth={1.4} aria-hidden="true" />
        <strong>Nenhuma página com esse recorte</strong>
        <p>Mude a busca ou os filtros para ver as outras.</p>
      </div>
    );
  }
  return (
    <div className="lp-vazio">
      <FileCode2 size={26} strokeWidth={1.4} aria-hidden="true" />
      <strong>Nenhuma landing page ainda</strong>
      <p>
        Escreva o HTML, o CSS e o JavaScript, confira numa prévia isolada e publique no
        endereço do CRM ou no domínio do cliente.
      </p>
      <button type="button" className="btn" onClick={aoCriar}>
        <Plus size={15} strokeWidth={2.2} aria-hidden="true" /> Nova landing page
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// A criação, numa janela
//
// O endereço nasce do nome e continua nascendo do nome ENQUANTO ninguém mexer
// nele. No instante em que a pessoa digita o endereço na mão, ele para de
// seguir o nome: endereço que muda sozinho depois de escolhido é o jeito certo
// de publicar no lugar errado.
function NovaPagina({ cliente, aoCriar, aoFechar }) {
  const [titulo, setTitulo] = useState("");
  const [slug, setSlug] = useState("");
  const [naMao, setNaMao] = useState(false);
  const [erro, setErro] = useState("");
  const [criando, setCriando] = useState(false);
  const primeiro = useRef(null);

  useEffect(() => { primeiro.current?.focus(); }, []);

  const endereco = normalizarSlug(naMao ? slug : titulo);

  async function criar(e) {
    e.preventDefault();
    setErro("");
    setCriando(true);
    try {
      const r = await chamar("painel-paginas", {
        method: "POST",
        body: { acao: "criar", cliente_id: cliente.id, titulo, slug: endereco },
      });
      aoCriar(r.pagina);
    } catch (e2) {
      setErro(e2.message);
    } finally {
      setCriando(false);
    }
  }

  return (
    <div
      className="lp-janela-fundo" role="dialog" aria-modal="true" aria-label="Nova landing page"
      onKeyDown={(e) => { if (e.key === "Escape") aoFechar(); }}
    >
      <form className="lp-janela" onSubmit={criar}>
        <div className="lp-janela-topo">
          <strong>Nova landing page</strong>
          <button type="button" className="ed-icone" onClick={aoFechar} title="Fechar">
            <X size={16} strokeWidth={2} aria-hidden="true" />
            <span className="ed-oculto">Fechar</span>
          </button>
        </div>

        <div className="campo">
          <label htmlFor="lp-nova-titulo">Nome</label>
          <input
            id="lp-nova-titulo" ref={primeiro} type="text" value={titulo}
            placeholder="Campanha de novembro"
            onChange={(e) => setTitulo(e.target.value)}
          />
        </div>

        <div className="campo">
          <label htmlFor="lp-nova-slug">URL da página</label>
          <div className="lp-url">
            <span>/p/</span>
            <input
              id="lp-nova-slug" type="text" spellCheck={false}
              value={naMao ? slug : endereco}
              placeholder="campanha-de-novembro"
              onChange={(e) => { setNaMao(true); setSlug(e.target.value); }}
            />
          </div>
          <span className="dica">
            {naMao
              ? "Escrito à mão. Minúsculas, números e hífen."
              : "Vem do nome. Dá para escrever outro."}
          </span>
        </div>

        {erro && <div className="aviso erro" role="alert">{erro}</div>}

        <div className="lp-janela-pe">
          <button type="button" className="btn secundario" onClick={aoFechar}>Cancelar</button>
          <button className="btn" type="submit" disabled={criando || !titulo.trim() || !endereco}>
            {criando ? "Criando…" : "Criar página"}
          </button>
        </div>
      </form>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Contas pequenas da galeria
const CHAVE_VISAO = "ousadia_lp_visao";

function desdeDoPeriodo(periodo) {
  if (periodo === "sempre") return null;
  const dias = Number(periodo);
  if (!Number.isFinite(dias)) return null;
  const d = new Date();
  d.setDate(d.getDate() - dias + 1);
  return d.toISOString().slice(0, 10);
}

function filtrar(lista, recorte) {
  const busca = recorte.busca.trim().toLowerCase();
  return lista.filter((p) => {
    if (busca) {
      const alvo = `${p.titulo} ${p.slug} ${(p.dominios || []).map((d) => d.dominio).join(" ")}`;
      if (!alvo.toLowerCase().includes(busca)) return false;
    }

    if (recorte.estado !== "todas") {
      const pendente = Boolean(p.publicada_em) && new Date(p.atualizado_em) > new Date(p.publicada_em);
      if (recorte.estado === "no-ar" && !p.publicada_em) return false;
      if (recorte.estado === "rascunho" && p.publicada_em) return false;
      if (recorte.estado === "pendente" && !pendente) return false;
    }

    if (recorte.dominio !== "todos") {
      const tem = (p.dominios || []).some((d) => d.dominio === recorte.dominio);
      if (recorte.dominio === "plataforma" ? (p.dominios || []).length > 0 : !tem) return false;
    }

    return true;
  });
}

function somar(lista) {
  return lista.reduce((acc, p) => ({
    visitas: acc.visitas + (p.medida?.visitas || 0),
    leads: acc.leads + (p.medida?.leads || 0),
  }), { visitas: 0, leads: 0 });
}

function numeroBonito(n) {
  return Number(n || 0).toLocaleString("pt-BR");
}

function quandoBonito(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
}

// ---------------------------------------------------------------------------
// O compositor em si
function Compositor({ id, aoVoltar, modoInicial = "dividido" }) {
  const [dados, setDados] = useState(null);
  const [erro, setErro] = useState("");
  const [recado, setRecado] = useState("");

  const [arquivos, setArquivos] = useState({ html: "", css: "", js: "" });
  const [qual, setQual] = useState("html");

  const [modo, setModo] = useState(modoInicial);
  const [divisao, setDivisao] = useState(52);

  const [formato, setFormato] = useState("desktop");
  const [larguraLivre, setLarguraLivre] = useState(1100);
  const [paisagem, setPaisagem] = useState(false);
  const [zoom, setZoom] = useState(0.6);

  const [gaveta, setGaveta] = useState(null);
  const [versaoVista, setVersaoVista] = useState(null);
  const [bloqueios, setBloqueios] = useState([]);

  const [impressaoRascunho, setImpressaoRascunho] = useState(null);
  const [salvando, setSalvando] = useState(false);
  const [sujo, setSujo] = useState(false);
  const [publicando, setPublicando] = useState(false);

  const quadro = useRef(null);
  const abaPrevia = useRef(null);
  const documentoAtual = useRef("");
  // O conteúdo que o iframe está renderizando agora. É ISTO que vai no
  // pedido de publicação, e não o estado do editor: entre um e outro pode ter
  // havido uma tecla.
  const naPrevia = useRef(null);
  const primeiraCarga = useRef(true);

  const carregar = useCallback(async () => {
    try {
      const r = await chamar(`painel-paginas?recurso=pagina&id=${id}`);
      setDados(r);
      setImpressaoRascunho(r.impressao_rascunho);
      if (primeiraCarga.current) {
        setArquivos({
          html: r.pagina.rascunho_html || "",
          css: r.pagina.rascunho_css || "",
          js: r.pagina.rascunho_js || "",
        });
        primeiraCarga.current = false;
      }
      setErro("");
    } catch (e) {
      setErro(e.message);
    }
  }, [id]);

  useEffect(() => { carregar(); }, [carregar]);

  // ---------------------------------------------------------- salvamento
  //
  // Salva no navegador na hora e no servidor depois da pausa. A cópia local
  // existe para o caso em que o servidor não responde: o trabalho da pessoa
  // não pode depender da rede estar boa naquele segundo.
  useEffect(() => {
    if (primeiraCarga.current) return;
    try {
      localStorage.setItem(chaveLocal(id), JSON.stringify({ ...arquivos, em: Date.now() }));
    } catch { /* sem armazenamento: o salvamento no servidor continua */ }

    setSujo(true);
    const t = setTimeout(async () => {
      setSalvando(true);
      try {
        const r = await chamar("painel-paginas", {
          method: "POST",
          body: { acao: "rascunho", id, ...arquivos },
        });
        setImpressaoRascunho(r.impressao_rascunho);
        setSujo(false);
        setErro("");
      } catch (e) {
        setErro(`O rascunho não foi salvo no servidor: ${e.message} O que você escreveu está guardado neste navegador.`);
      } finally {
        setSalvando(false);
      }
    }, ESPERA_RASCUNHO);
    return () => clearTimeout(t);
  }, [arquivos, id]);

  // ---------------------------------------------------------------- prévia
  const config = dados?.pagina?.configuracoes || {};

  useEffect(() => {
    if (!dados) return;
    const t = setTimeout(() => {
      const conteudo = { ...arquivos, configuracoes: config };
      const documento = montarPrevia(conteudo);
      documentoAtual.current = documento;
      naPrevia.current = conteudo;
      setBloqueios([]);
      if (quadro.current) quadro.current.srcdoc = documento;
      mandarParaAba(documento);
    }, ESPERA_PREVIA);
    return () => clearTimeout(t);
  }, [arquivos, dados, JSON.stringify(config)]);

  function mandarParaAba(documento) {
    const aba = abaPrevia.current;
    if (!aba || aba.closed) return;
    aba.postMessage({ ousadia: "previa-documento", documento }, window.location.origin);
  }

  // Duas conversas no mesmo ouvinte: o relato do que a prévia impediu, que vem
  // do iframe (origem opaca, então a conferência é pela janela), e o pedido de
  // documento da aba separada, que tem que ser da mesma origem E ser a aba que
  // nós abrimos.
  useEffect(() => {
    function ouvir(ev) {
      if (ev.data?.ousadia === "previa" && ev.source === quadro.current?.contentWindow) {
        // Dado vindo da página importada. Entra na lista para a pessoa ler, e
        // nada mais: nunca é executado nem usado em decisão.
        setBloqueios((lista) => [...lista.slice(-49), ev.data.dado]);
        return;
      }
      if (
        ev.data?.ousadia === "previa-pronta"
        && ev.origin === window.location.origin
        && ev.source === abaPrevia.current
      ) {
        mandarParaAba(documentoAtual.current);
      }
    }
    window.addEventListener("message", ouvir);
    return () => window.removeEventListener("message", ouvir);
  }, []);

  function abrirEmAba() {
    const aba = window.open("/previa-pagina.html", `previa-${id}`);
    abaPrevia.current = aba;
    if (!aba) setRecado("O navegador bloqueou a nova aba. Libere o pop-up para este endereço.");
  }

  // ------------------------------------------------------------- importar
  async function importar(arquivosEscolhidos) {
    const lidos = { ...arquivos };
    let quantos = 0;
    for (const arquivo of arquivosEscolhidos || []) {
      const texto = await arquivo.text();
      const nome = arquivo.name.toLowerCase();
      if (nome.endsWith(".css")) lidos.css = texto;
      else if (nome.endsWith(".js") || nome.endsWith(".mjs")) lidos.js = texto;
      else lidos.html = texto;
      quantos += 1;
    }
    if (!quantos) return;
    setArquivos(lidos);
    setRecado(`${quantos} ${quantos === 1 ? "arquivo importado" : "arquivos importados"}.`);
  }

  // ------------------------------------------------------------- publicar
  const versaoNoAr = dados?.versoes?.find((v) => v.id === dados.pagina.versao_publicada_id) || null;
  const noArIgual = Boolean(versaoNoAr && impressaoRascunho && versaoNoAr.impressao === impressaoRascunho);
  const temMudancaNaoPublicada = !noArIgual || sujo;

  async function publicar() {
    if (!naPrevia.current) { setRecado("Abra a prévia antes de publicar."); return; }
    setPublicando(true);
    setErro("");
    try {
      const r = await chamar("painel-paginas", {
        method: "POST",
        body: {
          acao: "publicar", id,
          previa: {
            html: naPrevia.current.html,
            css: naPrevia.current.css,
            js: naPrevia.current.js,
          },
        },
      });
      setRecado(`Versão ${r.versao.numero} no ar em ${r.endereco}.`);
      await carregar();
    } catch (e) {
      setErro(e.message);
    } finally {
      setPublicando(false);
    }
  }

  async function agir(corpo, aviso) {
    setErro("");
    try {
      await chamar("painel-paginas", { method: "POST", body: { id, ...corpo } });
      await carregar();
      if (aviso) setRecado(aviso);
    } catch (e) {
      setErro(e.message);
    }
  }

  // ------------------------------------------------------------- divisória
  //
  // Arrastar com o ponteiro e também com o teclado: a divisória é um
  // `separator` com `aria-valuenow`, e as setas movem 2% por toque. Sem isso
  // quem navega por teclado não consegue mudar a proporção.
  const area = useRef(null);

  function arrastar(e) {
    e.preventDefault();
    const caixa = area.current.getBoundingClientRect();
    const mover = (ev) => {
      const pos = ((ev.clientX - caixa.left) / caixa.width) * 100;
      setDivisao(Math.min(85, Math.max(15, pos)));
    };
    const soltar = () => {
      window.removeEventListener("pointermove", mover);
      window.removeEventListener("pointerup", soltar);
    };
    window.addEventListener("pointermove", mover);
    window.addEventListener("pointerup", soltar);
  }

  useEffect(() => {
    if (!recado) return;
    const t = setTimeout(() => setRecado(""), 5000);
    return () => clearTimeout(t);
  }, [recado]);

  const medida = useMemo(() => {
    const achado = FORMATOS.find((f) => f.chave === formato);
    const base = achado || { largura: larguraLivre, altura: 900 };
    return paisagem && achado
      ? { largura: base.altura, altura: base.largura }
      : { largura: base.largura, altura: base.altura };
  }, [formato, larguraLivre, paisagem]);

  if (!dados) {
    return (
      <>
        {erro && <div className="aviso erro" role="alert">{erro}</div>}
        <div className="vazio">Carregando a página…</div>
      </>
    );
  }

  const pagina = dados.pagina;
  const arquivoAtual = ARQUIVOS.find((a) => a.chave === qual);

  return (
    <div className="lp">
      {/* A barra de cima: o que a especificação pede, nesta ordem, mais o
          aviso de alteração não publicada, que é o item que mais evita
          confusão de "eu não publiquei isso". */}
      <div className="lp-barra">
        <button type="button" className="btn secundario pequeno" onClick={aoVoltar}>
          <ArrowLeft size={14} strokeWidth={2} aria-hidden="true" /> Páginas
        </button>

        <strong className="lp-nome">{pagina.titulo}</strong>
        <code className="lp-endereco">/p/{pagina.slug}</code>

        <span className="lp-estado">
          {salvando ? "Salvando rascunho…" : sujo ? "Rascunho com alteração não salva" : "Rascunho salvo"}
        </span>

        <div className="lp-barra-acoes">
          <button
            type="button" className="btn secundario pequeno"
            onClick={() => setArquivos({ ...arquivos })}
            title="Forçar o salvamento agora"
          >
            Salvar rascunho
          </button>

          <div className="lp-modos" role="group" aria-label="Formas de ver">
            <button
              type="button" className={`ed-icone ${modo === "editor" ? "ativo" : ""}`}
              onClick={() => setModo("editor")} title="Só o editor" aria-pressed={modo === "editor"}
            >
              <Code2 size={15} strokeWidth={1.8} aria-hidden="true" /><span className="ed-oculto">Só o editor</span>
            </button>
            <button
              type="button" className={`ed-icone ${modo === "dividido" ? "ativo" : ""}`}
              onClick={() => setModo("dividido")} title="Editor e prévia" aria-pressed={modo === "dividido"}
            >
              <Columns2 size={15} strokeWidth={1.8} aria-hidden="true" /><span className="ed-oculto">Editor e prévia</span>
            </button>
            <button
              type="button" className={`ed-icone ${modo === "previa" ? "ativo" : ""}`}
              onClick={() => setModo("previa")} title="Prévia em tela cheia" aria-pressed={modo === "previa"}
            >
              <Monitor size={15} strokeWidth={1.8} aria-hidden="true" /><span className="ed-oculto">Prévia</span>
            </button>
          </div>

          <button type="button" className="btn secundario pequeno" onClick={abrirEmAba}>
            <ExternalLink size={14} strokeWidth={2} aria-hidden="true" /> Prévia em outra aba
          </button>

          <button
            type="button" className={`btn secundario pequeno ${gaveta === "historico" ? "ativo" : ""}`}
            onClick={() => setGaveta(gaveta === "historico" ? null : "historico")}
          >
            <History size={14} strokeWidth={2} aria-hidden="true" /> Histórico
          </button>
          <button
            type="button" className={`btn secundario pequeno ${gaveta === "config" ? "ativo" : ""}`}
            onClick={() => setGaveta(gaveta === "config" ? null : "config")}
          >
            <Settings size={14} strokeWidth={2} aria-hidden="true" /> Configurações
          </button>
          <button
            type="button" className={`btn secundario pequeno ${gaveta === "dominios" ? "ativo" : ""}`}
            onClick={() => setGaveta(gaveta === "dominios" ? null : "dominios")}
          >
            <Globe size={14} strokeWidth={2} aria-hidden="true" /> Domínio
          </button>

          <button type="button" className="btn" onClick={publicar} disabled={publicando}>
            {publicando ? "Publicando…" : pagina.publicada_em ? "Atualizar publicação" : "Publicar"}
          </button>
        </div>
      </div>

      {temMudancaNaoPublicada && (
        <div className="lp-nao-publicado" role="status">
          <strong>Existe alteração que não está no ar.</strong>{" "}
          {pagina.publicada_em
            ? <>O que o público vê é a versão {versaoNoAr?.numero ?? "publicada"}. Confira a prévia e use Atualizar publicação.</>
            : <>Esta página nunca foi publicada. Confira a prévia e use Publicar.</>}
        </div>
      )}

      {erro && <div className="aviso erro" role="alert">{erro}</div>}
      {recado && <div className="aviso" role="status">{recado}</div>}

      <div className="lp-miolo" ref={area} data-modo={modo}>
        {modo !== "previa" && (
          <section
            className="lp-lado lp-editor"
            style={modo === "dividido" ? { width: `${divisao}%` } : undefined}
          >
            <div className="lp-abas" role="tablist" aria-label="Arquivos">
              {ARQUIVOS.map((a) => (
                <button
                  key={a.chave} type="button" role="tab"
                  aria-selected={qual === a.chave}
                  className={`lp-aba ${qual === a.chave ? "ativa" : ""}`}
                  onClick={() => setQual(a.chave)}
                >
                  {a.nome}
                  {arquivos[a.chave] ? "" : <span className="lp-vazia"> vazio</span>}
                </button>
              ))}
              <label className="ed-importar lp-importar">
                <Upload size={14} strokeWidth={2} aria-hidden="true" /> Importar
                <input
                  type="file" multiple accept=".html,.htm,.css,.js,.mjs,.txt"
                  onChange={(e) => { importar(e.target.files); e.target.value = ""; }}
                />
              </label>
            </div>

            <EditorCodigo
              nome={arquivoAtual.nome}
              idioma={arquivoAtual.idioma}
              valor={arquivos[qual]}
              aoMudar={(novo) => setArquivos((a) => ({ ...a, [qual]: novo }))}
            />
          </section>
        )}

        {modo === "dividido" && (
          <div
            className="lp-divisoria" role="separator" tabIndex={0}
            aria-orientation="vertical" aria-label="Largura do editor"
            aria-valuenow={Math.round(divisao)} aria-valuemin={15} aria-valuemax={85}
            onPointerDown={arrastar}
            onKeyDown={(e) => {
              if (e.key === "ArrowLeft") { e.preventDefault(); setDivisao((d) => Math.max(15, d - 2)); }
              if (e.key === "ArrowRight") { e.preventDefault(); setDivisao((d) => Math.min(85, d + 2)); }
            }}
          />
        )}

        {modo !== "editor" && (
          <section className="lp-lado lp-previa">
            <div className="lp-previa-barra">
              <span className="lp-selo" title="O código da página roda isolado, numa origem opaca">
                <ShieldCheck size={14} strokeWidth={2} aria-hidden="true" /> Modo de teste
              </span>

              <div className="lp-formatos" role="group" aria-label="Tamanho da tela">
                {FORMATOS.map((f) => {
                  const Icone = ICONE_FORMATO[f.chave] || Monitor;
                  return (
                    <button
                      key={f.chave} type="button"
                      className={`ed-icone ${formato === f.chave ? "ativo" : ""}`}
                      onClick={() => setFormato(f.chave)} aria-pressed={formato === f.chave}
                      title={`${f.nome} (${f.largura}px)`}
                    >
                      <Icone size={15} strokeWidth={1.8} aria-hidden="true" />
                      <span className="ed-oculto">{f.nome}</span>
                    </button>
                  );
                })}
                <button
                  type="button" className={`ed-icone ${formato === "livre" ? "ativo" : ""}`}
                  onClick={() => setFormato("livre")} aria-pressed={formato === "livre"}
                  title="Largura personalizada"
                >
                  <span aria-hidden="true">px</span>
                  <span className="ed-oculto">Largura personalizada</span>
                </button>
                {formato === "livre" && (
                  <input
                    type="number" className="lp-largura" min={240} max={2560} step={10}
                    value={larguraLivre} aria-label="Largura em pixels"
                    onChange={(e) => setLarguraLivre(Number(e.target.value) || 240)}
                  />
                )}
              </div>

              <button
                type="button" className="btn secundario pequeno"
                onClick={() => setPaisagem((p) => !p)} aria-pressed={paisagem}
                disabled={formato === "livre"}
              >
                <RotateCcw size={14} strokeWidth={2} aria-hidden="true" />
                {paisagem ? "Paisagem" : "Retrato"}
              </button>

              <label className="lp-zoom">
                Zoom
                <input
                  type="range" min={0.25} max={1} step={0.05} value={zoom}
                  onChange={(e) => setZoom(Number(e.target.value))}
                />
                <span className="num">{Math.round(zoom * 100)}%</span>
              </label>

              <span className="lp-medida num">{medida.largura}×{medida.altura}</span>
            </div>

            <div className="lp-palco">
              <div
                className="lp-moldura"
                style={{
                  width: medida.largura, height: medida.altura,
                  transform: `scale(${zoom})`,
                }}
              >
                {/* O `sandbox` é o isolamento. A lista vem de api/_pagina.js,
                    onde está escrito por que `allow-same-origin` nunca entra. */}
                <iframe
                  ref={quadro} sandbox={SANDBOX} title="Prévia da landing page"
                  // O `srcdoc` é posto por efeito, não aqui, para a prévia não
                  // recarregar a cada render do painel.
                />
              </div>
            </div>

            <div className="lp-bloqueios">
              <strong>O que a prévia impediu</strong>
              {bloqueios.length === 0 ? (
                <p>
                  Nada ainda. Clique nos botões, mande o formulário e teste os links: nada sai
                  desta prévia, e o que for impedido aparece aqui.
                </p>
              ) : (
                <ul>
                  {bloqueios.map((b, i) => (
                    <li key={i}>
                      <span className="etiqueta frio">{rotuloDoBloqueio(b?.tipo)}</span>
                      <code>{String(b?.url || b?.medidor || b?.acao || "").slice(0, 120) || "sem endereço"}</code>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </section>
        )}

        {gaveta === "historico" && (
          <Historico
            versoes={dados.versoes} noAr={pagina.versao_publicada_id}
            aoFechar={() => { setGaveta(null); setVersaoVista(null); }}
            aoAbrir={async (v) => {
              try {
                const r = await chamar(`painel-paginas?recurso=versao&id=${v.id}`);
                setVersaoVista(r.versao);
              } catch (e) { setErro(e.message); }
            }}
            aoRestaurar={async (v) => {
              if (!confirm(`Trazer a versão ${v.numero} para o editor? O rascunho de agora é substituído.`)) return;
              try {
                const r = await chamar("painel-paginas", {
                  method: "POST", body: { acao: "restaurar", id, versao: v.id },
                });
                setArquivos({ html: r.versao.html, css: r.versao.css, js: r.versao.js });
                setRecado(`Versão ${v.numero} está no editor. Confira a prévia antes de publicar.`);
                carregar();
              } catch (e) { setErro(e.message); }
            }}
            aoRepublicar={(v) => {
              if (!confirm(`Pôr a versão ${v.numero} no ar agora?`)) return;
              agir({ acao: "republicar", versao: v.id, impressao: v.impressao }, `Versão ${v.numero} no ar.`);
            }}
          />
        )}

        {gaveta === "config" && (
          <Configuracoes
            pagina={pagina}
            aoFechar={() => setGaveta(null)}
            aoSalvar={async (corpo) => {
              await agir({ acao: "configurar", ...corpo }, "Configurações salvas.");
            }}
          />
        )}

        {gaveta === "dominios" && (
          <Dominios
            pagina={pagina} dominios={dados.dominios || []}
            prontos={dados.dominios_prontos}
            aviso={dados.dominios_aviso}
            aoMudar={carregar} aoFechar={() => setGaveta(null)}
          />
        )}
      </div>

      {versaoVista && (
        <div className="lp-versao-vista">
          <div className="lp-gaveta-topo">
            <strong>Versão {versaoVista.numero}</strong>
            <button type="button" className="btn secundario pequeno" onClick={() => setVersaoVista(null)}>
              Fechar
            </button>
          </div>
          {ARQUIVOS.map((a) => (
            <details key={a.chave}>
              <summary>{a.nome}</summary>
              <pre>{versaoVista[a.chave] || "(vazio)"}</pre>
            </details>
          ))}
        </div>
      )}
    </div>
  );
}

function rotuloDoBloqueio(tipo) {
  if (tipo === "envio") return "envio de dado";
  if (tipo === "conversao") return "conversão";
  if (tipo === "formulario") return "formulário";
  if (tipo === "whatsapp") return "WhatsApp";
  if (tipo === "contato") return "telefone ou e-mail";
  if (tipo === "link") return "link externo";
  if (tipo === "janela") return "nova janela";
  return "bloqueio";
}
