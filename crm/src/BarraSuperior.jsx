import { useCallback, useEffect, useRef, useState } from "react";
import { Search, Inbox, ChevronDown, LogOut, Check, Palette, Menu, PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { TEMAS } from "./tema.js";

// A barra superior.
//
// Mora dentro de `.conteudo`, acima do miolo, e não encosta na navegação
// lateral: a lateral continua sendo a coluna da esquerda, de altura cheia.
// Por isso a barra nunca cobre o trilho, e o painel flutuante da etapa 3,
// que tem z-index maior, passa por cima dela.
//
// Três zonas: onde você está, a busca, e você.

function iniciais(nome = "") {
  const p = nome.trim().split(/\s+/).filter(Boolean);
  return ((p[0]?.[0] || "") + (p.length > 1 ? p[p.length - 1][0] : "")).toUpperCase() || "IM";
}

const NOME_DO_PERFIL = {
  operador: "Operação",
  gestor: "Gestão",
  atendente: "Atendimento",
};

// A busca global ainda não existe. Esta é a casca, e ela é deliberadamente
// inerte: não é campo, não recebe foco, não escuta Ctrl+K. Um campo que
// aceita digitação e não busca nada é pior do que nenhum campo, porque a
// pessoa digita, espera, e conclui que o sistema está quebrado.
function Busca() {
  return (
    <div className="barra-busca" aria-hidden="true">
      <Search size={15} strokeWidth={1.8} />
      <span className="barra-busca-texto">Buscar no CRM...</span>
      <span className="barra-busca-nota">em breve</span>
    </div>
  );
}

function MenuUsuario({ nome, perfil, tema, aoTrocarTema, aoSair }) {
  const [aberto, setAberto] = useState(false);
  const area = useRef(null);
  const gatilho = useRef(null);

  const fechar = useCallback((devolverFoco) => {
    setAberto(false);
    if (devolverFoco) gatilho.current?.focus();
  }, []);

  // Clicar fora fecha. O ouvinte só existe enquanto o menu está aberto, para
  // não ficar um handler de documento vivo o painel inteiro.
  useEffect(() => {
    if (!aberto) return undefined;
    const aoClicarFora = (e) => {
      if (!area.current?.contains(e.target)) setAberto(false);
    };
    document.addEventListener("pointerdown", aoClicarFora);
    return () => document.removeEventListener("pointerdown", aoClicarFora);
  }, [aberto]);

  function aoTeclar(e) {
    if (e.key === "Escape" && aberto) {
      e.stopPropagation();
      fechar(true);
    }
  }

  return (
    <div className="menu-usuario" ref={area} onKeyDown={aoTeclar}>
      <button
        type="button" className="conta" ref={gatilho}
        onClick={() => setAberto((v) => !v)}
        aria-haspopup="menu" aria-expanded={aberto} aria-controls="menu-do-usuario"
        aria-label={`Sua conta: ${nome || "Você"}${perfil ? `, ${perfil}` : ""}`}
      >
        <span className="conta-avatar" aria-hidden="true">{iniciais(nome)}</span>
        <span className="conta-quem">
          <strong>{nome || "Você"}</strong>
          {perfil && <small>{perfil}</small>}
        </span>
        <ChevronDown size={15} strokeWidth={1.8} aria-hidden="true" />
      </button>

      {aberto && (
        <div className="menu-caixa" id="menu-do-usuario" role="menu">
          <div className="menu-cabeca">
            <span className="conta-avatar" aria-hidden="true">{iniciais(nome)}</span>
            <span>
              <strong>{nome || "Você"}</strong>
              {perfil && <small>{perfil}</small>}
            </span>
          </div>

          <div className="menu-secao" role="group" aria-label="Tema">
            <span className="menu-titulo"><Palette size={13} strokeWidth={1.8} aria-hidden="true" /> Tema</span>
            {TEMAS.map((t) => (
              <button
                key={t.id} type="button" role="menuitemradio"
                aria-checked={tema === t.id}
                aria-label={`Tema ${t.nome}`}
                className={`menu-item ${tema === t.id ? "escolhido" : ""}`}
                onClick={() => aoTrocarTema(t.id)}
              >
                <span className="menu-item-texto">
                  {t.nome}
                  <small>{t.resumo}</small>
                </span>
                {tema === t.id && <Check size={15} strokeWidth={2} aria-hidden="true" />}
              </button>
            ))}
          </div>

          {aoSair && (
            <div className="menu-secao menu-secao-fim">
              <button
                type="button" role="menuitem" aria-label="Sair da conta"
                className="menu-item menu-item-sair" onClick={aoSair}
              >
                <LogOut size={15} strokeWidth={1.8} aria-hidden="true" />
                <span className="menu-item-texto">Sair</span>
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function BarraSuperior({
  modulo, titulo,
  nome, tipo, papel,
  esperando = 0, podeVerFila = false, aoIrParaFila,
  tema, aoTrocarTema, aoSair,
  aoAbrirMenu,
  lateralRecolhida, aoAlternarLateral,
}) {
  const perfil = NOME_DO_PERFIL[tipo === "operador" ? "operador" : papel === "gestor" ? "gestor" : "atendente"];
  const IconeLateral = lateralRecolhida ? PanelLeftOpen : PanelLeftClose;
  const rotuloLateral = lateralRecolhida ? "Abrir navegação" : "Recolher navegação";

  return (
    <header className="barra-topo">
      {/* Só aparece no estreito, onde a lateral virou gaveta. O CSS o
          esconde no desktop, em que a lateral está sempre à vista. */}
      <button
        type="button" className="barra-icone barra-menu"
        onClick={aoAbrirMenu} aria-label="Abrir o menu" title="Menu"
      >
        <Menu size={18} strokeWidth={1.8} aria-hidden="true" />
      </button>

      {aoAlternarLateral && (
        <button type="button" className="barra-icone at-alternar-lateral" onClick={aoAlternarLateral}
          aria-expanded={!lateralRecolhida} aria-label={rotuloLateral} title={rotuloLateral}>
          <IconeLateral size={18} aria-hidden="true" />
        </button>
      )}

      <div className="barra-onde">
        {modulo && <span className="barra-modulo">{modulo}</span>}
        {titulo && <span className="barra-titulo">{titulo}</span>}
      </div>

      <Busca />

      <div className="barra-acoes">
        {/* Não é um sino de notificações: é a fila de atendimento, com o mesmo
            número que a lateral já mostra, vindo do mesmo estado. Chamar de
            "notificações" um contador de fila seria mentir sobre o que o
            número conta, e um painel de notificações de verdade ainda não
            existe. Só aparece para quem tem a Fila no menu. */}
        {podeVerFila && (
          <button
            type="button" className="barra-icone"
            onClick={aoIrParaFila}
            aria-label={esperando > 0
              ? `Fila de atendimento, ${esperando} esperando`
              : "Fila de atendimento, ninguém esperando"}
            title="Fila de atendimento"
          >
            <Inbox size={18} strokeWidth={1.8} aria-hidden="true" />
            {esperando > 0 && <span className="sino">{esperando}</span>}
          </button>
        )}

        <MenuUsuario
          nome={nome} perfil={perfil}
          tema={tema} aoTrocarTema={aoTrocarTema} aoSair={aoSair}
        />
      </div>
    </header>
  );
}
