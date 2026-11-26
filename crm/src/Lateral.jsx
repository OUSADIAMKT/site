import { useEffect, useRef, useState } from "react";
import {
  LayoutDashboard, ListChecks, Inbox, Building2, BookOpenText, Images,
  CalendarDays, Users, MessagesSquare, TrendingUp,
  BarChart3, Megaphone, Plug, Smartphone, KanbanSquare, Contact, Send,
  Workflow, SlidersHorizontal, Split, ChevronRight, X, Gauge, FileCode2,
} from "lucide-react";
import { TIPOS_DE_CANAL, nomeDoCanal } from "./canal.js";

// Cada função tem sua cor. Numa lateral escura a cor identifica a seção mais
// rápido que o texto. A pessoa aprende "o rosa é mídia" em dois dias.
const ITENS = {
  visao:      { Icone: LayoutDashboard, cor: "#4dd0b1", nome: "Visão geral", resumo: "Como o mês está indo" },
  desempenho: { Icone: TrendingUp,      cor: "#4dd0b1", nome: "Desempenho",  resumo: "Agenda, fila e equipe" },
  fila:       { Icone: Inbox,           cor: "#f97362", nome: "Fila",        resumo: "Quem a IA passou adiante" },
  quadro:     { Icone: KanbanSquare,    cor: "#38d9c0", nome: "Quadro",      resumo: "Atendimento em colunas" },
  hoje:       { Icone: ListChecks,      cor: "#f5b544", nome: "Dia",         resumo: "A fila de atendimento" },
  clientes:   { Icone: Building2,       cor: "#5b9cf8", nome: "Clientes",    resumo: "Quem você atende" },
  agente:     { Icone: BookOpenText,    cor: "#a78bfa", nome: "Contexto",    resumo: "O que a IA sabe" },
  midias:     { Icone: Images,          cor: "#f472b6", nome: "Mídias",      resumo: "O que ela pode mandar" },
  agenda:     { Icone: CalendarDays,    cor: "#4ade80", nome: "Agenda",      resumo: "Quando cada um atende" },
  atendentes: { Icone: Users,           cor: "#38d9c0", nome: "Atendentes",  resumo: "Quem recebe da fila" },
  conversas:  { Icone: MessagesSquare,  cor: "#38bdf8", nome: "Conversas",   resumo: "O que ela respondeu" },
  contatos:   { Icone: Contact,         cor: "#c084fc", nome: "Contatos",    resumo: "Quem já comprou ou falou" },
  disparos:   { Icone: Send,            cor: "#fb923c", nome: "Disparos",    resumo: "Mandar para uma lista" },
  canais:     { Icone: Smartphone,      cor: "#25d366", nome: "Canais",      resumo: "WhatsApp e Instagram" },
  relatorios: { Icone: BarChart3,       cor: "#fbbf5c", nome: "Relatórios",  resumo: "Números dos clientes" },
  campanhas:  { Icone: Megaphone,       cor: "#fb923c", nome: "Campanhas",   resumo: "Pausar, ativar, orçamento" },
  conexoes:   { Icone: Plug,            cor: "#94a3b8", nome: "Contas",      resumo: "Facebook e clientes" },
  crm:        { Icone: Workflow,        cor: "#437EE5", nome: "Funil de vendas", resumo: "Negócios em kanban" },
  comercial:  { Icone: Gauge,           cor: "#437EE5", nome: "Comercial",   resumo: "Números, tarefas, automações" },
  "crm-ajustes": { Icone: SlidersHorizontal, cor: "#437EE5", nome: "Configurações", resumo: "Funis, campos, produtos" },
  frentes:    { Icone: Split,           cor: "#fb923c", nome: "Frentes",     resumo: "Recortes de atendimento" },
  paginas:    { Icone: FileCode2,       cor: "#38bdf8", nome: "Landing Pages", resumo: "Páginas de campanha do cliente" },
};

// Três menus, um por papel.
//
// O atendente só opera a fila. O gestor da clínica opera e ainda cuida da
// agenda dos profissionais, que muda toda semana e não pode depender de
// ligar para o operador. Nenhum dos dois vê Visão geral, que traz o custo
// de IA, nem as telas de implantação, que são o serviço vendido.
//
// "Agência" é o REPORT: relatórios e campanhas dos clientes de marketing.
// Existe só no menu do operador, e a API confere de novo (barrouOperador).
const MENUS = {
  operador: {
    topo: ["visao"],
    grupos: [
      { titulo: "Operação",    itens: ["fila", "quadro", "hoje", "conversas", "disparos"] },
      { titulo: "CRM",         itens: ["crm", "comercial", "contatos", "crm-ajustes"] },
      { titulo: "Implantação", itens: ["clientes", "canais", "agente", "midias", "agenda", "atendentes", "frentes"] },
      // Landing page não é implantação: implantação é o que se faz uma vez
      // para o cliente entrar no ar. Página de campanha nasce e morre junto
      // com a campanha, e quem mexe nela está fazendo marketing.
      { titulo: "Marketing",   itens: ["paginas"] },
      { titulo: "Agência",     itens: ["relatorios", "campanhas", "conexoes"] },
    ],
  },
  gestor: {
    topo: ["desempenho"],
    grupos: [
      { titulo: "Gestão",      itens: ["agenda", "frentes"] },
      { titulo: "Atendimento", itens: ["fila", "quadro", "hoje", "conversas"] },
      { titulo: "CRM",         itens: ["crm", "comercial", "crm-ajustes"] },
    ],
  },
  // O atendente não tem painel de abertura: nem Visão geral, que traz custo
  // de IA, nem Desempenho, que é da gestão. O topo dele fica vazio, e nada
  // sobe de grupo nenhum para preencher: promover um item seria inventar uma
  // hierarquia que a permissão não deu.
  atendente: {
    topo: [],
    grupos: [
      { titulo: "Atendimento", itens: ["fila", "quadro", "hoje", "conversas"] },
      { titulo: "CRM",         itens: ["crm", "comercial"] },
    ],
  },
};

// O que o cliente contratou, de `clientes.modulos`.
//
// `{}` libera tudo: cliente que já existia não pode ficar com o painel em
// branco porque uma coluna nova nasceu. Só `{"ativos": [...]}` restringe.
// Item que o cliente não tem desaparece do menu; nada é apagado do banco.
//
// O topo é filtrado pela mesma régua dos grupos: gestor de cliente que não
// contratou Desempenho fica sem o item solto, e não ganha outro no lugar.
function filtrar(menu, modulos) {
  const ativos = modulos?.ativos;
  if (!Array.isArray(ativos)) return menu;

  return {
    topo: menu.topo.filter((i) => ativos.includes(i)),
    grupos: menu.grupos
      .map((g) => ({ ...g, itens: g.itens.filter((i) => ativos.includes(i)) }))
      .filter((g) => g.itens.length > 0), // grupo que esvaziou não vira título solto
  };
}

// `tipo` é operador ou atendente; `papel` distingue gestor de atendente comum.
//
// O operador não é filtrado por módulo: ele é a agência, e as telas de
// implantação são o serviço que ele vende. O recorte vale para a gente do
// cliente, que é quem enxerga só o que contratou.
//
// Devolve `{ topo, grupos }`. O topo são os itens que ficam soltos acima do
// acordeão; os grupos são as gavetas.
export function menuDe(tipo, papel, modulos) {
  if (tipo === "operador") return MENUS.operador;
  const base = papel === "gestor" ? MENUS.gestor : MENUS.atendente;
  return filtrar(base, modulos);
}

// Onde a pessoa está, para a barra superior escrever. Sai da mesma tabela que
// desenha o menu, então os dois nunca divergem. Item do topo não tem grupo,
// então vai sem sobrenome e a barra mostra só o título.
export function ondeEstou(tipo, papel, modulos, aba) {
  const { topo, grupos } = menuDe(tipo, papel, modulos);
  const titulo = ITENS[aba]?.nome || "";
  if (topo.includes(aba)) return { modulo: "", titulo };
  const grupo = grupos.find((g) => g.itens.includes(aba));
  return { modulo: grupo?.titulo || "", titulo };
}

// A ordem importa: é ela que decide a aba de entrada quando a pessoa chega
// sem aba escolhida. O topo vem primeiro, como na tela.
export function abasPermitidas(tipo, papel, modulos) {
  const { topo, grupos } = menuDe(tipo, papel, modulos);
  return [...topo, ...grupos.flatMap((g) => g.itens)];
}

// ---------------------------------------------------------------------------
// A lateral
// ---------------------------------------------------------------------------
//
// Uma barra só, da altura da janela. De cima para baixo: a marca, os
// seletores de cliente e canal, o item solto de abertura e os grupos em
// acordeão. As ações de conta não moram aqui: tema, nome e sair ficam no
// menu do usuário da barra superior, para a escolha de tema existir num
// lugar só.
//
// No estreito a mesma barra vira gaveta, escondida até alguém pedir pelo
// botão da barra superior. Quem controla isso é o App, porque o botão está
// na outra ponta da tela; aqui só chegam `aberta` e `aoFechar`.

// Quais grupos estão abertos. Só isso, e só nomes de grupo: nada de
// permissão, nada de sessão, nada que identifique alguém. Sem armazenamento
// a navegação abre com o grupo da página atual e continua funcionando.
const CHAVE_GRUPOS = "ousadia_nav_grupos";

function lerGrupos() {
  try {
    const guardado = JSON.parse(localStorage.getItem(CHAVE_GRUPOS));
    if (Array.isArray(guardado)) return guardado.filter((g) => typeof g === "string");
  } catch { /* sem armazenamento, ou lixo guardado: vale o padrão */ }
  return null;
}

function guardarGrupos(lista) {
  try {
    localStorage.setItem(CHAVE_GRUPOS, JSON.stringify(lista));
  } catch { /* sem armazenamento: vale só nesta sessão */ }
}

function Item({ id, ativo, aviso, aoEscolher, solto }) {
  const { Icone, cor, nome, resumo } = ITENS[id];
  return (
    <button
      type="button" title={resumo}
      className={`nav-item ${solto ? "solto" : ""} ${ativo ? "ativo" : ""}`}
      aria-current={ativo ? "page" : undefined}
      onClick={() => aoEscolher(id)}
    >
      <span className="nav-item-icone" style={{ color: cor }}>
        <Icone size={16} strokeWidth={1.8} aria-hidden="true" />
      </span>
      <span className="nav-item-nome">{nome}</span>
      {aviso > 0 && <span className="sino">{aviso}</span>}
    </button>
  );
}

export default function Lateral({
  tipo = "operador", papel, nome, modulos,
  aba, aoTrocarAba,
  clientes = [], clienteId, aoTrocarCliente,
  canais = [], canalId, aoTrocarCanal,
  esperando = 0,
  aberta = false, aoFechar,
}) {
  const { topo, grupos } = menuDe(tipo, papel, modulos);
  const grupoAtual = grupos.find((g) => g.itens.includes(aba))?.titulo;

  const area = useRef(null);
  const fechar = useRef(null);

  // Gaveta aberta leva o foco junto. Sem isto o foco continua no botão da
  // barra superior, fora da lateral, e o Esc não chega até aqui: medido no
  // navegador, a gaveta não fechava pelo teclado depois de abrir por toque.
  useEffect(() => {
    if (aberta) fechar.current?.focus();
  }, [aberta]);

  // Abertos: o que estava guardado, mais o grupo da página atual. A pessoa
  // chega sempre vendo onde está, sem perder o que tinha aberto antes.
  const [abertos, setAbertos] = useState(() => {
    const guardado = lerGrupos();
    const base = guardado ?? (grupoAtual ? [grupoAtual] : []);
    return grupoAtual && !base.includes(grupoAtual) ? [...base, grupoAtual] : base;
  });

  // Trocar de página por fora da lateral, pela barra superior por exemplo,
  // também abre o grupo de destino.
  useEffect(() => {
    if (!grupoAtual) return;
    setAbertos((lista) => (lista.includes(grupoAtual) ? lista : [...lista, grupoAtual]));
  }, [grupoAtual]);

  function alternarGrupo(titulo) {
    setAbertos((lista) => {
      const nova = lista.includes(titulo) ? lista.filter((t) => t !== titulo) : [...lista, titulo];
      guardarGrupos(nova);
      return nova;
    });
  }

  const escolheCanal = canais.length > 1;
  const temFila = (g) => g.itens.includes("fila") && esperando > 0;

  function escolher(id) {
    aoTrocarAba(id);
    // No estreito a gaveta sai da frente depois da escolha. No desktop ela
    // não é gaveta e `aoFechar` não faz nada.
    if (aberta) aoFechar?.();
  }

  // Esc fecha a gaveta. No desktop não há o que fechar.
  function aoTeclar(e) {
    if (e.key === "Escape" && aberta) {
      e.stopPropagation();
      aoFechar?.();
      return;
    }
    if (e.key !== "ArrowDown" && e.key !== "ArrowUp" && e.key !== "Home" && e.key !== "End") return;

    // Setas andam pelo que dá para focar agora. Item de grupo fechado está
    // dentro de um `inert`, então não entra na conta.
    const focaveis = [...area.current.querySelectorAll("button, select")].filter(
      (b) => !b.closest("[inert]") && b.offsetParent !== null,
    );
    const i = focaveis.indexOf(document.activeElement);
    if (i < 0) return;
    e.preventDefault();
    const destino =
      e.key === "Home" ? 0
      : e.key === "End" ? focaveis.length - 1
      : e.key === "ArrowDown" ? Math.min(i + 1, focaveis.length - 1)
      : Math.max(i - 1, 0);
    focaveis[destino]?.focus();
  }

  return (
    <>
      {/* O véu só existe no estreito, e só com a gaveta aberta. O CSS o
          esconde no desktop, onde a lateral não é gaveta. */}
      <div
        className="nav-veu" data-aberta={aberta ? "1" : "0"}
        onClick={aoFechar} aria-hidden="true"
      />

      <nav
        className="navegacao" ref={area} aria-label="Navegação principal"
        data-aberta={aberta ? "1" : "0"} onKeyDown={aoTeclar}
      >
        <div className="nav-topo">
          <span className="nav-logo"><img src="/favicon.svg" alt="" aria-hidden="true" /></span>
          <strong className="nav-marca">CRM Ousadia</strong>
          <button
            type="button" className="nav-fechar" onClick={aoFechar} ref={fechar}
            aria-label="Fechar o menu"
          >
            <X size={18} strokeWidth={1.8} aria-hidden="true" />
          </button>
        </div>

        <div className="nav-seletores">
          {tipo === "operador" ? (
            <div className="seletor">
              <label htmlFor="cliente">Cliente</label>
              <select id="cliente" value={clienteId || ""} onChange={(e) => aoTrocarCliente?.(e.target.value)}>
                {clientes.length === 0 && <option value="">Nenhum cadastrado</option>}
                {clientes.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
              </select>
            </div>
          ) : (
            <div className="seletor">
              <label>Você</label>
              <div className="quem-sou">{nome}</div>
            </div>
          )}

          {escolheCanal && (
            <div className="seletor">
              <label htmlFor="canal">Canal</label>
              <select id="canal" value={canalId || ""} onChange={(e) => aoTrocarCanal?.(e.target.value || null)}>
                <option value="">Todos os canais</option>
                {canais.map((c) => (
                  <option key={c.id} value={c.id}>
                    {TIPOS_DE_CANAL[c.tipo] || ""} {nomeDoCanal(c)}{!c.ativo ? " (desligado)" : ""}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        <div className="nav-rolagem">
          {/* O item de abertura fica solto acima dos grupos. Quem não tem
              direito a ele, o atendente, simplesmente não recebe nenhum: nada
              sobe de grupo nenhum para preencher o lugar. */}
          {topo.map((id) => (
            <Item key={id} id={id} solto ativo={aba === id} aoEscolher={escolher} />
          ))}

          {grupos.map((g) => {
            const aberto = abertos.includes(g.titulo);
            const idLista = `nav-grupo-${g.titulo.replace(/\s+/g, "-").toLowerCase()}`;
            return (
              <section className="nav-grupo" key={g.titulo} data-aberto={aberto ? "1" : "0"}>
                <h2 className="nav-grupo-cabeca">
                  <button
                    type="button" className="nav-grupo-titulo"
                    aria-expanded={aberto} aria-controls={idLista}
                    onClick={() => alternarGrupo(g.titulo)}
                  >
                    <ChevronRight className="nav-seta" size={14} strokeWidth={2.2} aria-hidden="true" />
                    <span>{g.titulo}</span>
                    {/* O aviso da fila sobe para o título enquanto o grupo
                        está fechado, senão o número some de vista. */}
                    {!aberto && temFila(g) && <span className="sino">{esperando}</span>}
                  </button>
                </h2>

                {/* Grupo fechado sai da ordem de Tab e da árvore de
                    acessibilidade por `inert`. Na etapa 3 ficou medido que
                    esconder só por CSS não tira os botões do foco. */}
                <div
                  className="nav-grupo-itens" id={idLista} role="group" aria-label={g.titulo}
                  {...(aberto ? {} : { inert: "" })}
                >
                  <div className="nav-grupo-lista">
                    {g.itens.map((id) => (
                      <Item
                        key={id} id={id} ativo={aba === id} aoEscolher={escolher}
                        aviso={id === "fila" ? esperando : 0}
                      />
                    ))}
                  </div>
                </div>
              </section>
            );
          })}
        </div>
      </nav>
    </>
  );
}
