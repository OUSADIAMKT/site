// REPORT · peças usadas pelo painel (Relatórios) e pela página pública do
// relatório que vai para o cliente. Nada aqui chama a API.

const fmtBrl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const fmtInt = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 0 });
const fmtDec = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 2 });

const vazio = (v) => v === null || v === undefined || v === "";
export const brl = (v) => (vazio(v) ? "n/d" : fmtBrl.format(Number(v)));
export const inteiro = (v) => (vazio(v) ? "n/d" : fmtInt.format(Number(v)));
export const decimal = (v) => (vazio(v) ? "n/d" : fmtDec.format(Number(v)));
export const pct = (v) => (vazio(v) ? "n/d" : `${fmtDec.format(Number(v))}%`);

export function dataCurta(iso) {
  if (!iso) return "";
  const [a, m, d] = iso.slice(0, 10).split("-");
  return `${d}/${m}/${a}`;
}

// ---------------------------------------------------------------
// Períodos prontos. "Ontem" é o último dia fechado: a Meta ainda está
// contando o de hoje.
// ---------------------------------------------------------------

function hojeSP() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(new Date());
}

function somar(dia, n) {
  const d = new Date(`${dia}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

export const PERIODOS = [
  { id: "7d", nome: "7 dias" },
  { id: "30d", nome: "30 dias" },
  { id: "mes", nome: "Este mês" },
  { id: "mes_passado", nome: "Mês passado" },
];

export function faixaDe(id) {
  const ontem = somar(hojeSP(), -1);
  if (id === "7d") return { inicio: somar(ontem, -6), fim: ontem };
  if (id === "mes") return { inicio: `${ontem.slice(0, 7)}-01`, fim: ontem };
  if (id === "mes_passado") {
    const fim = somar(`${hojeSP().slice(0, 7)}-01`, -1);
    return { inicio: `${fim.slice(0, 7)}-01`, fim };
  }
  return { inicio: somar(ontem, -29), fim: ontem };
}

// ---------------------------------------------------------------
// Indicadores com variação. Em custo, cair é bom.
// ---------------------------------------------------------------

export function Variacao({ v, menorMelhor = false }) {
  if (vazio(v)) return <span className="rp-var neutra">sem comparação</span>;
  const n = Number(v);
  if (n === 0) return <span className="rp-var neutra">igual ao anterior</span>;
  const bom = menorMelhor ? n < 0 : n > 0;
  return (
    <span className={`rp-var ${bom ? "bom" : "ruim"}`}>
      {n > 0 ? "▲" : "▼"} {fmtDec.format(Math.abs(n))}%
    </span>
  );
}

export function Indicador({ cor, rotulo, metrica, formato = inteiro, menorMelhor }) {
  const valor = formato(metrica?.atual);
  return (
    <div className={`kpi ${cor}`}>
      <span className="rotulo">{rotulo}</span>
      {/* "R$ 30.120,40" não cabe no tamanho cheio de um cartão estreito */}
      <span className={`valor ${valor.length > 9 ? "rp-longo" : ""}`}>{valor}</span>
      <span className="pe">
        <Variacao v={metrica?.variacao} menorMelhor={menorMelhor} />
        {!vazio(metrica?.anterior) && <> · antes {formato(metrica.anterior)}</>}
      </span>
    </div>
  );
}

// Escolhe os indicadores que existem para este cliente: quem só tem
// Instagram não ganha cartão de gasto vazio.
export function indicadoresDe(plataformas = {}) {
  const ads = plataformas.meta_ads;
  const ig = plataformas.instagram;
  const fb = plataformas.facebook;
  const lista = [];
  if (ads) {
    lista.push({ cor: "indigo", rotulo: "Investimento", metrica: ads.gasto, formato: brl });
    lista.push({ cor: "teal", rotulo: "Alcance dos anúncios", metrica: ads.alcance });
    if (Number(ads.leads?.atual) || Number(ads.leads?.anterior)) {
      lista.push({ cor: "verde", rotulo: "Leads", metrica: ads.leads });
      lista.push({ cor: "coral", rotulo: "Custo por lead", metrica: ads.custo_por_lead, formato: brl, menorMelhor: true });
    }
    if (Number(ads.conversas_iniciadas?.atual) || Number(ads.conversas_iniciadas?.anterior)) {
      lista.push({ cor: "verde", rotulo: "Conversas iniciadas", metrica: ads.conversas_iniciadas });
      lista.push({ cor: "coral", rotulo: "Custo por conversa", metrica: ads.custo_por_conversa, formato: brl, menorMelhor: true });
    }
    if (Number(ads.conversoes?.atual) || Number(ads.conversoes?.anterior)) {
      lista.push({ cor: "verde", rotulo: "Compras", metrica: ads.conversoes });
      lista.push({ cor: "ambar", rotulo: "ROAS", metrica: ads.roas, formato: decimal });
    }
    lista.push({ cor: "violeta", rotulo: "CTR", metrica: ads.ctr, formato: pct });
    lista.push({ cor: "ambar", rotulo: "CPC", metrica: ads.cpc, formato: brl, menorMelhor: true });
  }
  if (ig) {
    lista.push({ cor: "violeta", rotulo: "Seguidores no Instagram", metrica: ig.seguidores_fim });
    lista.push({ cor: "teal", rotulo: "Novos seguidores", metrica: ig.seguidores_novos });
    lista.push({ cor: "ambar", rotulo: "Interações", metrica: ig.interacoes });
    lista.push({ cor: "indigo", rotulo: "Visitas ao perfil", metrica: ig.visitas_perfil });
  }
  if (fb && !ig) lista.push({ cor: "indigo", rotulo: "Seguidores no Facebook", metrica: fb.seguidores_fim });
  return lista;
}

// ---------------------------------------------------------------
// Gráfico do período: investimento em barras, resultados em linha.
// ---------------------------------------------------------------

export function GraficoDiario({ serie = [] }) {
  if (!serie.length) return <div className="mini-vazio">Sem números diários neste período.</div>;

  const L = 44, R = 36, T = 12, B = 22, W = 640, H = 200;
  const resultados = serie.map((p) => p.leads + p.conversas);
  const maxGasto = Math.max(1, ...serie.map((p) => p.gasto));
  const maxRes = Math.max(1, ...resultados);
  const passo = (W - L - R) / serie.length;
  const yG = (v) => T + (H - T - B) * (1 - v / maxGasto);
  const yR = (v) => T + (H - T - B) * (1 - v / maxRes);
  const x = (i) => L + i * passo + passo / 2;
  const linha = resultados.map((v, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${yR(v).toFixed(1)}`).join(" ");
  const cada = Math.max(1, Math.ceil(serie.length / 8));

  return (
    <>
      <svg className="grafico" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Investimento e resultados por dia">
        {[0, 0.5, 1].map((f) => (
          <g key={f}>
            <line className="grade" x1={L} y1={yG(maxGasto * f)} x2={W - R} y2={yG(maxGasto * f)} strokeWidth="1" />
            <text className="eixo" x={L - 6} y={yG(maxGasto * f) + 3.5} textAnchor="end" fontSize="9.5">
              {fmtInt.format(maxGasto * f)}
            </text>
            <text className="eixo" x={W - R + 6} y={yR(maxRes * f) + 3.5} fontSize="9.5">
              {fmtInt.format(maxRes * f)}
            </text>
          </g>
        ))}
        {serie.map((p, i) => (
          <rect key={p.data} x={x(i) - passo * 0.32} width={passo * 0.64}
                y={yG(p.gasto)} height={Math.max(0, H - B - yG(p.gasto))}
                rx="2" fill="var(--serie-b)" opacity=".55">
            <title>{`${dataCurta(p.data)}: ${brl(p.gasto)}, ${resultados[i]} resultados`}</title>
          </rect>
        ))}
        <path className="linha-a" d={linha} fill="none" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
        {/* conta a partir do último dia: ele sempre aparece e nenhum rótulo encosta no outro */}
        {serie.map((p, i) => (serie.length - 1 - i) % cada === 0 && (
          <text className="eixo" key={`t${p.data}`} x={x(i)} y={H - 7} textAnchor="middle" fontSize="9.5">
            {p.data.slice(8, 10)}/{p.data.slice(5, 7)}
          </text>
        ))}
      </svg>
      <div className="rosca-legenda rp-legenda">
        <div className="rosca-item">
          <span className="rosca-cor" style={{ background: "var(--serie-b)", opacity: 0.55 }} />
          Investimento por dia (R$)
          <span className="n">{brl(serie.reduce((s, p) => s + p.gasto, 0))}</span>
        </div>
        <div className="rosca-item">
          <span className="rosca-cor" style={{ background: "var(--serie-a)" }} />
          Leads e conversas
          <span className="n">{inteiro(resultados.reduce((s, v) => s + v, 0))}</span>
        </div>
      </div>
    </>
  );
}

// ---------------------------------------------------------------
// Listas
// ---------------------------------------------------------------

export function TabelaAnuncios({ anuncios = [] }) {
  if (!anuncios.length) return <div className="mini-vazio">Nenhum anúncio com entrega no período.</div>;
  return (
    <div className="rp-rolagem">
      <table>
        <thead>
          <tr>
            <th>Anúncio</th>
            <th className="num">Investido</th>
            <th className="num">Resultados</th>
            <th className="num">Custo/result.</th>
            <th className="num">CTR</th>
          </tr>
        </thead>
        <tbody>
          {anuncios.map((a) => (
            <tr key={a.anuncio_id}>
              <td>
                <b className="rp-nome">{a.nome}</b>
                <span className="rp-sub">{a.campanha}</span>
              </td>
              <td className="num">{brl(a.gasto)}</td>
              <td className="num">{inteiro(a.resultados)}</td>
              <td className="num">{brl(a.custo_por_resultado)}</td>
              <td className="num">{pct(a.ctr)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function GradePosts({ posts = [] }) {
  if (!posts.length) return <div className="mini-vazio">Nenhuma publicação no período.</div>;
  return (
    <div className="rp-posts">
      {posts.map((p) => (
        <a className="rp-post" key={p.id_externo} href={p.link || undefined} target="_blank" rel="noreferrer">
          {p.miniatura_url
            ? <img src={p.miniatura_url} alt="" loading="lazy" referrerPolicy="no-referrer" />
            : <div className="rp-post-sem">{p.tipo || "post"}</div>}
          <div className="rp-post-info">
            <span>{dataCurta(p.publicado_em)} · {p.tipo === "REELS" ? "Reels" : p.tipo === "CAROUSEL_ALBUM" ? "Carrossel" : p.tipo === "VIDEO" ? "Vídeo" : "Foto"}</span>
            <b>{inteiro(p.alcance)} de alcance</b>
            <span>{inteiro(p.curtidas)} curtidas · {inteiro(p.comentarios)} coment. · {inteiro(p.salvos)} salvos</span>
          </div>
        </a>
      ))}
    </div>
  );
}
