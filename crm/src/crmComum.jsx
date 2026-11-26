// Peças pequenas que o CRM, a ficha do negócio e a tela de conversas dividem.

import { useEffect } from "react";
import { X } from "lucide-react";

export function dinheiro(v) {
  return Number(v || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

// "há 3 d" é o que cabe no rodapé do cartão; a data inteira fica no título.
export function haQuanto(iso) {
  if (!iso) return "";
  const min = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  if (min < 60) return `${min} min`;
  const h = Math.round(min / 60);
  if (h < 24) return `${h} h`;
  return `${Math.round(h / 24)} d`;
}

export function dataHora(iso) {
  if (!iso) return "";
  return new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit", month: "2-digit", year: "2-digit", hour: "2-digit", minute: "2-digit",
  });
}

export function iniciais(nome = "") {
  const p = String(nome).trim().split(/\s+/).filter(Boolean);
  if (!p.length) return "·";
  return ((p[0][0] || "") + (p.length > 1 ? p[p.length - 1][0] : "")).toUpperCase();
}

export function telefoneBonito(t) {
  const d = String(t || "").replace(/\D/g, "");
  const local = d.startsWith("55") && d.length >= 12 ? d.slice(2) : d;
  if (local.length === 11) return `(${local.slice(0, 2)}) ${local.slice(2, 7)}-${local.slice(7)}`;
  if (local.length === 10) return `(${local.slice(0, 2)}) ${local.slice(2, 6)}-${local.slice(6)}`;
  return t || "";
}

/** A cor de uma etiqueta: a cadastrada, ou o azul da marca. */
export function corDaEtiqueta(nome, etiquetas = []) {
  return etiquetas.find((e) => e.nome === nome)?.cor || null;
}

export function Ficha({ texto, cor }) {
  return (
    <span className="ficha" style={cor ? { "--ficha-cor": cor } : undefined}>
      {cor && <i aria-hidden="true" />}
      {texto}
    </span>
  );
}

/** Abas segmentadas: trilho cinza em pílula, a ativa em pílula branca. */
export function Segmentos({ opcoes, valor, aoMudar, rotulo }) {
  return (
    <div className="segmentos" role="tablist" aria-label={rotulo}>
      {opcoes.map((o) => (
        <button
          key={o.valor} type="button" role="tab"
          aria-selected={valor === o.valor}
          className={valor === o.valor ? "ativo" : ""}
          onClick={() => aoMudar(o.valor)}
        >
          {o.Icone && <o.Icone size={15} strokeWidth={1.8} aria-hidden="true" />}
          {o.rotulo}
          {o.conta !== undefined && <span className="segmentos-conta">{o.conta}</span>}
        </button>
      ))}
    </div>
  );
}

/** Estado vazio: ícone num círculo, título, uma linha e a ação. */
export function Vazio({ Icone, titulo, texto, children }) {
  return (
    <div className="vazio-novo">
      {Icone && <span className="vazio-icone"><Icone size={20} strokeWidth={1.6} /></span>}
      <strong>{titulo}</strong>
      {texto && <p>{texto}</p>}
      {children}
    </div>
  );
}

/** Janela no meio da tela, com véu. Esc e clique fora fecham. */
export function Modal({ titulo, passo, aoFechar, children, rodape, largura = 520 }) {
  useEffect(() => {
    const aoTeclar = (e) => { if (e.key === "Escape") aoFechar(); };
    window.addEventListener("keydown", aoTeclar);
    return () => window.removeEventListener("keydown", aoTeclar);
  }, [aoFechar]);

  return (
    <div className="modal-veu" onMouseDown={aoFechar}>
      <div
        className="modal-novo" role="dialog" aria-modal="true" aria-label={titulo}
        style={{ width: `min(${largura}px, calc(100vw - 32px))` }}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <header className="modal-novo-topo">
          <div>
            {passo && <span className="modal-passo">{passo}</span>}
            <h2>{titulo}</h2>
          </div>
          <button type="button" className="icone-botao" onClick={aoFechar} aria-label="Fechar">
            <X size={18} />
          </button>
        </header>
        <div className="modal-novo-corpo">{children}</div>
        {rodape && <footer className="modal-novo-rodape">{rodape}</footer>}
      </div>
    </div>
  );
}

/** Painel que desliza da direita, com o mesmo cabeçalho dos modais. */
export function Painel({ titulo, subtitulo, aoFechar, children, acoes }) {
  useEffect(() => {
    const aoTeclar = (e) => { if (e.key === "Escape") aoFechar(); };
    window.addEventListener("keydown", aoTeclar);
    return () => window.removeEventListener("keydown", aoTeclar);
  }, [aoFechar]);

  return (
    <div className="painel-veu" onMouseDown={aoFechar}>
      <aside className="painel-lado" role="dialog" aria-modal="true" aria-label={titulo}
        onMouseDown={(e) => e.stopPropagation()}>
        <header className="painel-lado-topo">
          <div>
            <h2>{titulo}</h2>
            {subtitulo && <p>{subtitulo}</p>}
          </div>
          <div className="painel-lado-acoes">
            {acoes}
            <button type="button" className="icone-botao" onClick={aoFechar} aria-label="Fechar">
              <X size={18} />
            </button>
          </div>
        </header>
        <div className="painel-lado-corpo">{children}</div>
      </aside>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Prioridade e atraso. Os dois vivem aqui porque o cartão do quadro, a lista e
// o painel lateral mostram a mesma coisa, e três cópias dessa tabela
// divergiriam na primeira vez que alguém mudasse uma cor.

export const PRIORIDADES = [
  { valor: "baixa", rotulo: "Baixa", cor: "#6B7280" },
  { valor: "normal", rotulo: "Normal", cor: "#0F766E" },
  { valor: "alta", rotulo: "Alta", cor: "#A15C07" },
  { valor: "urgente", rotulo: "Urgente", cor: "#B42318" },
];

export function prioridadeDe(valor) {
  return PRIORIDADES.find((p) => p.valor === valor) || PRIORIDADES[1];
}

/**
 * O negócio está atrasado?
 *
 * Duas formas de atrasar, e são diferentes de propósito: a previsão de
 * fechamento já passou, ou o cartão está parado na etapa há mais dias do que a
 * etapa permite. A segunda só existe quando a etapa tem limite configurado;
 * sem limite, ficar parado não é atraso, é só ficar parado.
 */
export function atrasoDe(negocio, etapa) {
  if (!negocio || negocio.situacao !== "aberto") return null;
  const agora = Date.now();
  if (negocio.previsao_em && new Date(negocio.previsao_em).getTime() < agora) {
    return { tipo: "previsao", texto: `previsão venceu ${haQuanto(negocio.previsao_em)}` };
  }
  const limite = Number(etapa?.limite_dias || 0);
  if (limite > 0 && negocio.etapa_desde) {
    const dias = Math.floor((agora - new Date(negocio.etapa_desde).getTime()) / 86400000);
    if (dias > limite) return { tipo: "parado", texto: `${dias} dias na etapa, o limite é ${limite}` };
  }
  return null;
}

/** Data curta, do jeito que cabe num cartão: "12 mar". */
export function dataCurta(iso) {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" }).replace(".", "");
}
