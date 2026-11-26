import { useState, useEffect } from "react";
import { chamar } from "./api.js";
import CabecalhoPagina from "./CabecalhoPagina.jsx";

// As cores de gráfico e de estado vivem em fichas de tema, não aqui. Antes
// eram 18 valores literais neste arquivo, iguais nos cinco temas: o gráfico
// não acompanhava a identidade da tela em que estava.
const CORES = ["var(--cat-1)", "var(--cat-2)", "var(--cat-3)", "var(--cat-4)", "var(--cat-5)", "var(--cat-6)"];

// A distinção entre as seis situações é semântica e foi preservada: cada
// uma aponta para a ficha do significado dela, não para um slot de paleta.
const SITUACOES = {
  marcado:        { nome: "Marcado",        cor: "var(--sit-marcado)" },
  confirmado:     { nome: "Confirmado",     cor: "var(--sit-confirmado)" },
  em_atendimento: { nome: "Em atendimento", cor: "var(--sit-atendimento)" },
  atendido:       { nome: "Atendido",       cor: "var(--sit-atendido)" },
  faltou:         { nome: "Faltou",         cor: "var(--sit-faltou)" },
  cancelado:      { nome: "Cancelado",      cor: "var(--sit-cancelado)" },
};

const brl = (n) => `R$ ${Number(n || 0).toFixed(2).replace(".", ",")}`;

function hora(iso, fuso) {
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: fuso, hour: "2-digit", minute: "2-digit",
  }).format(new Date(iso));
}

function quando(iso) {
  const min = Math.round((Date.now() - new Date(iso)) / 60000);
  if (min < 1) return "agora";
  if (min < 60) return `${min} min`;
  if (min < 1440) return `${Math.round(min / 60)} h`;
  return `${Math.round(min / 1440)} d`;
}

// `dadosIniciais` existe para conferir o desenho da tela sem banco nenhum.
// Em produção nunca é passado, e a tela busca os números de verdade.
export default function Dashboard({ cliente, dadosIniciais }) {
  const [d, setD] = useState(dadosIniciais || null);
  const [erro, setErro] = useState("");

  useEffect(() => {
    if (dadosIniciais) return;
    setD(null);
    setErro("");
    chamar(`painel-dashboard?cliente=${cliente.id}`)
      .then(setD)
      .catch((e) => setErro(e.message));
  }, [cliente.id, dadosIniciais]);

  if (erro) return <div className="aviso erro" role="alert">{erro}</div>;
  if (!d) return <Esqueleto />;

  const i = d.indicadores;
  const fuso = d.cliente.fuso;
  // Cliente sem teto cadastrado não tem percentual: o cálculo já devolvia 0,
  // mas o pé do indicador mostrava "87 de null" na tela. Agora segue o mesmo
  // padrão da taxa de falta, que é o outro indicador que pode não existir.
  const temTeto = Number(d.cliente.teto_conversas) > 0;
  const usoTeto = temTeto
    ? Math.round((i.conversas_mes / d.cliente.teto_conversas) * 100)
    : 0;

  return (
    <>
      <CabecalhoPagina titulo={<>Visão geral de {cliente.nome}</>}>
        O mês corrente, do primeiro dia até agora. Os números vêm do que a IA atendeu de verdade.
      </CabecalhoPagina>

      <div className="kpis">
        <Kpi cor="teal" rotulo="Atendimentos hoje" valor={i.atendimentos_hoje}
             pe={`${i.conversas_mes} no mês`} />
        <Kpi cor="verde" rotulo="Leads quentes" valor={i.leads_quentes}
             pe="score 70 ou mais" />
        <Kpi cor="ambar" rotulo="Consultas agendadas" valor={i.agendados}
             pe="daqui pra frente" />
        <Kpi cor="coral" rotulo="Taxa de falta"
             valor={i.taxa_falta === null ? "n/d" : `${i.taxa_falta.toFixed(0)}%`}
             pe={i.taxa_falta === null ? "sem histórico ainda" : "dos já finalizados"} />
        <Kpi cor="indigo" rotulo="Custo de IA no mês" valor={brl(i.custo_brl)}
             pe={`${brl(i.custo_por_conversa)} por conversa`} />
        <Kpi cor="violeta" rotulo="Uso do plano"
             valor={temTeto ? `${usoTeto}%` : "n/d"}
             pe={temTeto
               ? `${i.conversas_mes} de ${d.cliente.teto_conversas}`
               : "sem teto cadastrado"} />
      </div>

      {temTeto && usoTeto >= 80 && (
        <div className="aviso atencao">
          Este cliente já usou {usoTeto}% do teto do plano {d.cliente.plano}. Dois meses seguidos
          acima disso é hora de propor o upgrade.
        </div>
      )}

      <div className="malha-3">
        <div className="bloco">
          <div className="bloco-topo">
            <h2>Movimento do mês</h2>
            <span className="canto">conversas e agendamentos</span>
          </div>
          <Linhas serie={d.serie} />
        </div>

        <div className="bloco">
          <div className="bloco-topo"><h2>Onde o custo foi</h2></div>
          <Rosca modelos={d.modelos} />
        </div>

        <div className="bloco">
          <div className="bloco-topo"><h2>Situação da agenda</h2></div>
          <Somatorio situacoes={d.situacoes} />
        </div>
      </div>

      <div className="malha-3">
        <div className="bloco">
          <div className="bloco-topo">
            <h2>Agenda de hoje</h2>
            <span className="canto">{d.agenda_hoje.length}</span>
          </div>
          <div className="compacta">
            {d.agenda_hoje.length === 0
              ? <div className="mini-vazio">Nada marcado para hoje.</div>
              : d.agenda_hoje.map((a) => {
                  const s = SITUACOES[a.situacao] || {};
                  return (
                    <div className="item" key={a.id}>
                      <span className="lado forte">{hora(a.inicio, fuso)}</span>
                      <div className="princ">
                        <b>{a.paciente_nome}</b>
                        <span>{a.profissionais?.nome || ""}</span>
                      </div>
                      <span className="etiqueta" style={{ color: s.cor }}>
                        {s.nome || a.situacao}
                      </span>
                    </div>
                  );
                })}
          </div>
        </div>

        <div className="bloco">
          <div className="bloco-topo">
            <h2>Leads para olhar</h2>
            <span className="canto">score 40+</span>
          </div>
          <div className="compacta">
            {d.leads_quentes.length === 0
              ? <div className="mini-vazio">Nenhum lead qualificado ainda.</div>
              : d.leads_quentes.map((c) => (
                  <div className="item" key={c.id}>
                    <div className="princ">
                      <b>{c.nome_contato || "Sem nome"}</b>
                      <span>{c.telefone}</span>
                    </div>
                    <span className={`etiqueta ${c.score >= 70 ? "quente" : "morno"}`}>{c.score}</span>
                  </div>
                ))}
          </div>
        </div>

        <div className="bloco">
          <div className="bloco-topo">
            <h2>Últimas conversas</h2>
          </div>
          <div className="compacta">
            {d.conversas_recentes.length === 0
              ? <div className="mini-vazio">Nenhuma conversa este mês.</div>
              : d.conversas_recentes.map((c) => (
                  <div className="item" key={c.id}>
                    <div className="princ">
                      <b>{c.nome_contato || c.telefone}</b>
                      <span>{c.modo === "humano" ? "com a equipe" : "com a IA"}</span>
                    </div>
                    <span className="lado">{quando(c.ultima_em)}</span>
                  </div>
                ))}
          </div>
        </div>
      </div>

      <div className="malha-2">
        <div className="bloco">
          <div className="bloco-topo">
            <h2>De onde vieram</h2>
            <span className="canto">origem do primeiro contato</span>
          </div>
          <Somatorio
            situacoes={{ anuncio: d.origens.anuncio, direto: d.origens.direto }}
            rotulos={{ anuncio: "Veio de anúncio", direto: "Chegou direto" }}
            cores={{ anuncio: "var(--origem-anuncio)", direto: "var(--origem-direto)" }}
          />
          {d.origens.anuncio === 0 && (
            <p className="bloco-nota">
              Nenhum contato veio de anúncio ainda. Quando as campanhas apontarem para este
              número, a origem aparece aqui automaticamente.
            </p>
          )}
        </div>

        <div className="bloco">
          <div className="bloco-topo">
            <h2>O que a IA tem em mãos</h2>
          </div>
          <div className="compacta">
            <div className="item">
              <div className="princ"><b>Mídias na biblioteca</b></div>
              <span className="lado">{i.midias}</span>
            </div>
            <div className="item">
              <div className="princ"><b>Conversas passadas para a equipe</b></div>
              <span className="lado">{i.com_humano}</span>
            </div>
            <div className="item">
              <div className="princ"><b>Plano contratado</b></div>
              <span className="lado" style={{ textTransform: "capitalize" }}>{d.cliente.plano}</span>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

// O carregamento mostra a forma da tela, não a palavra "carregando". A
// pessoa já sabe onde cada coisa vai aparecer quando aparecer, e a troca de
// cliente não pisca entre dois tamanhos de página.
//
// Trocar de cliente volta para cá de propósito: `setD(null)` apaga os
// números do cliente anterior antes de buscar os novos. Número de uma
// empresa sob o nome de outra é pior do que esperar.
function Esqueleto() {
  return (
    <div className="esqueleto" aria-busy="true" aria-label="Carregando a visão geral">
      {/* A forma do cabeçalho enquanto os números não chegam. Tem classe
          própria, e não a do cabeçalho de verdade: isto é uma barra cinza
          com a altura certa, não um título. */}
      <div className="esqueleto-titulo">
        <div className="esq esq-titulo" />
        <div className="esq esq-linha" />
      </div>

      <div className="kpis">
        {Array.from({ length: 6 }, (_, i) => (
          <div className="kpi" key={i}>
            <div className="esq esq-rotulo" />
            <div className="esq esq-valor" />
            <div className="esq esq-pe" />
          </div>
        ))}
      </div>

      {[3, 3, 2].map((quantos, faixa) => (
        <div className={quantos === 3 ? "malha-3" : "malha-2"} key={faixa}>
          {Array.from({ length: quantos }, (_, i) => (
            <div className="bloco" key={i}>
              <div className="bloco-topo"><div className="esq esq-rotulo" /></div>
              <div className="esq esq-corpo" />
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

function Kpi({ cor, rotulo, valor, pe }) {
  return (
    <div className={`kpi ${cor}`}>
      <span className="rotulo">{rotulo}</span>
      <span className="valor">{valor}</span>
      <span className="pe">{pe}</span>
    </div>
  );
}

// Duas séries no mesmo eixo: conversas iniciadas e consultas marcadas.
function Linhas({ serie }) {
  // Mês sem nada ainda desenha duas retas rentes à base, com o eixo indo de
  // 0 a 1. Isso parece gráfico quebrado, não mês parado. Melhor dizer.
  const mexeu = serie.some((p) => p.atendimentos > 0 || p.marcados > 0);
  if (!mexeu) return <div className="mini-vazio">Nenhuma conversa nem agendamento este mês ainda.</div>;

  const L = 40, R = 8, T = 12, B = 22;
  const W = 420, H = 190;
  const maximo = Math.max(1, ...serie.map((p) => Math.max(p.atendimentos, p.marcados)));
  const passo = serie.length > 1 ? (W - L - R) / (serie.length - 1) : 0;
  const y = (v) => T + (H - T - B) * (1 - v / maximo);
  const x = (i) => L + i * passo;

  const caminho = (campo) =>
    serie.map((p, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(p[campo]).toFixed(1)}`).join(" ");

  const area = `${caminho("atendimentos")} L${x(serie.length - 1).toFixed(1)},${H - B} L${L},${H - B} Z`;

  const marcasY = [0, Math.round(maximo / 2), maximo];

  return (
    <>
      <svg className="grafico" viewBox={`0 0 ${W} ${H}`} role="img"
           aria-label="Conversas e agendamentos por dia no mês">
        <defs>
          <linearGradient id="areaAt" x1="0" y1="0" x2="0" y2="1">
            <stop className="area-topo" offset="0%" stopOpacity=".28" />
            <stop className="area-base" offset="100%" stopOpacity="0" />
          </linearGradient>
        </defs>

        {marcasY.map((v) => (
          <g key={v}>
            <line className="grade" x1={L} y1={y(v)} x2={W - R} y2={y(v)} strokeWidth="1" />
            <text className="eixo" x={L - 7} y={y(v) + 3.5} textAnchor="end" fontSize="9.5">{v}</text>
          </g>
        ))}

        <path d={area} fill="url(#areaAt)" />
        <path className="linha-a" d={caminho("atendimentos")} fill="none" strokeWidth="2"
              strokeLinejoin="round" strokeLinecap="round" />
        <path className="linha-b" d={caminho("marcados")} fill="none" strokeWidth="1.6"
              strokeDasharray="4 3" strokeLinejoin="round" strokeLinecap="round" />

        {serie.map((p, i) =>
          i === serie.length - 1 ? (
            <circle className="ponta" key={i} cx={x(i)} cy={y(p.atendimentos)} r="3.2" />
          ) : null
        )}

        {serie.map((p, i) =>
          i % 5 === 0 || i === serie.length - 1 ? (
            <text className="eixo" key={i} x={x(i)} y={H - 7} textAnchor="middle" fontSize="9.5">
              {p.dia}
            </text>
          ) : null
        )}
      </svg>

      <div className="rosca-legenda">
        <div className="rosca-item">
          <span className="rosca-cor" style={{ background: "var(--serie-a)" }} />
          Conversas iniciadas
          <span className="n">{serie.reduce((s, p) => s + p.atendimentos, 0)}</span>
        </div>
        <div className="rosca-item">
          <span className="rosca-cor" style={{ background: "var(--serie-b)" }} />
          Consultas marcadas
          <span className="n">{serie.reduce((s, p) => s + p.marcados, 0)}</span>
        </div>
      </div>
    </>
  );
}

function Rosca({ modelos }) {
  const itens = Object.entries(modelos).map(([modelo, v], idx) => ({
    nome: modelo.includes("haiku") ? "Haiku (barato)" : modelo.includes("opus") ? "Opus (consultivo)" : modelo,
    respostas: v.respostas,
    custo: v.custo_usd * 5.2,
    cor: modelo.includes("haiku") ? "var(--cat-1)" : modelo.includes("opus") ? "var(--cat-2)" : CORES[idx % CORES.length],
  }));

  const total = itens.reduce((s, it) => s + it.respostas, 0);

  if (!total) return <div className="mini-vazio">Nenhuma resposta este mês.</div>;

  const R = 52, ESP = 15, C = 70;
  const circ = 2 * Math.PI * R;
  let acumulado = 0;

  return (
    <>
      <svg className="grafico" viewBox="0 0 140 140" style={{ maxWidth: 170, margin: "0 auto" }}
           role="img" aria-label="Divisão das respostas por modelo">
        <circle className="trilha" cx={C} cy={C} r={R} fill="none" strokeWidth={ESP} />
        {itens.map((it) => {
          const fatia = (it.respostas / total) * circ;
          const el = (
            <circle
              key={it.nome} cx={C} cy={C} r={R} fill="none"
              stroke={it.cor} strokeWidth={ESP}
              strokeDasharray={`${fatia} ${circ - fatia}`}
              strokeDashoffset={-acumulado}
              transform={`rotate(-90 ${C} ${C})`}
            />
          );
          acumulado += fatia;
          return el;
        })}
        <text className="numero-centro" x={C} y={C - 2} textAnchor="middle" fontSize="19" fontWeight="700">
          {total}
        </text>
        <text className="rotulo-centro" x={C} y={C + 13} textAnchor="middle" fontSize="9">respostas</text>
      </svg>

      <div className="rosca-legenda">
        {itens.map((it) => (
          <div className="rosca-item" key={it.nome}>
            <span className="rosca-cor" style={{ background: it.cor }} />
            {it.nome}
            <span className="n">{Math.round((it.respostas / total) * 100)}% · {brl(it.custo)}</span>
          </div>
        ))}
      </div>
    </>
  );
}

function Somatorio({ situacoes, rotulos, cores }) {
  const itens = Object.entries(situacoes).filter(([, n]) => n > 0);
  const total = itens.reduce((s, [, n]) => s + n, 0);

  if (!total) return <div className="mini-vazio">Nada registrado ainda.</div>;

  return (
    <div className="somatorio">
      {itens.map(([chave, n]) => {
        const cor = cores?.[chave] || SITUACOES[chave]?.cor || "#4db8a4";
        const nome = rotulos?.[chave] || SITUACOES[chave]?.nome || chave;
        const pct = Math.round((n / total) * 100);
        return (
          <div className="som-linha" key={chave}>
            <div className="som-topo">
              <span>{nome}</span>
              <span className="n">{n} · {pct}%</span>
            </div>
            <div className="trilho">
              <span style={{ width: `${pct}%`, background: cor }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}
