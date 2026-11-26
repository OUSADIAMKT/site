import { useEffect, useState } from "react";
import { chamar } from "./api.js";
import CabecalhoPagina from "./CabecalhoPagina.jsx";

// Receita por campanha: quanto cada campanha VENDEU, não só quanto custou
// cada lead. Gasto da Meta + vendas pagas da HeroSpark (menos reembolsos) +
// os leads do CRM, no mesmo período. A conta mora em api/_roas.js.

const dinheiro = (v) => (v === null || v === undefined ? "—"
  : v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }));
const vezes = (v) => (v === null || v === undefined ? "—" : `${v.toLocaleString("pt-BR", { maximumFractionDigits: 2 })}x`);
const pct = (v) => (v === null || v === undefined ? "—" : `${(v * 100).toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`);

function hoje() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(new Date());
}
function diasAtras(n) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(new Date(Date.now() - n * 86400000));
}

const ATALHOS = [
  { rotulo: "7 dias", dias: 6 },
  { rotulo: "30 dias", dias: 29 },
  { rotulo: "90 dias", dias: 89 },
];

export default function Receita({ cliente }) {
  const [inicio, setInicio] = useState(diasAtras(29));
  const [fim, setFim] = useState(hoje());
  const [dados, setDados] = useState(null);
  const [erro, setErro] = useState("");

  useEffect(() => {
    if (!cliente?.id) return;
    let valendo = true;
    setDados(null);
    setErro("");
    chamar(`painel-receita?cliente=${cliente.id}&inicio=${inicio}&fim=${fim}`)
      .then((d) => { if (valendo) setDados(d); })
      .catch((e) => { if (valendo) setErro(e.message); });
    return () => { valendo = false; };
  }, [cliente?.id, inicio, fim]);

  const t = dados?.totais;
  return (
    <>
      <CabecalhoPagina
        titulo="Receita por campanha"
        resumo={t ? `${dinheiro(t.receita)} de receita, ROAS ${vezes(t.roas)}` : erro ? "" : "Calculando…"}
        acoes={(
          <div className="receita-periodo">
            {ATALHOS.map((a) => (
              <button key={a.rotulo} type="button" className="btn secundario pequeno"
                      onClick={() => { setInicio(diasAtras(a.dias)); setFim(hoje()); }}>{a.rotulo}</button>
            ))}
            <input type="date" aria-label="De" value={inicio} max={fim} onChange={(e) => setInicio(e.target.value)} />
            <input type="date" aria-label="Até" value={fim} min={inicio} onChange={(e) => setFim(e.target.value)} />
          </div>
        )}
      >
        Gasto da Meta, vendas pagas na HeroSpark (já sem reembolsos) e leads do CRM, no mesmo período.
        Cada negócio conta para o anúncio de onde veio a conversa, ou para a <code>utm_campaign</code> do
        formulário, ou para a origem dele no CRM. É o primeiro toque que o CRM registrou, não o modelo de
        atribuição da Meta.
      </CabecalhoPagina>

      {erro && <div className="aviso erro" role="alert">{erro}</div>}

      {dados && dados.contas_de_anuncio === 0 && (
        <div className="aviso atencao">
          Nenhuma conta de anúncio conectada: a coluna de gasto fica em branco. Conecte em Agência &gt; Contas.
        </div>
      )}

      {t && (
        <div className="receita-cartoes">
          <div className="cartao"><span>Receita</span><strong>{dinheiro(t.receita)}</strong></div>
          <div className="cartao"><span>Investimento</span><strong>{dinheiro(t.gasto)}</strong></div>
          <div className="cartao"><span>ROAS</span><strong>{vezes(t.roas)}</strong></div>
          <div className="cartao"><span>Vendas</span><strong>{t.vendas}</strong></div>
          <div className="cartao"><span>Leads</span><strong>{t.leads}</strong></div>
          <div className="cartao"><span>Custo por venda</span><strong>{dinheiro(t.cac)}</strong></div>
        </div>
      )}

      {dados && (
        <div className="bloco">
          {dados.linhas.length === 0 ? (
            <div className="mini-vazio">Nada no período: nenhum gasto, lead ou venda entre essas datas.</div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Campanha ou origem</th>
                  <th className="num">Investimento</th>
                  <th className="num">Leads</th>
                  <th className="num">Custo por lead</th>
                  <th className="num">Vendas</th>
                  <th className="num">Conversão</th>
                  <th className="num">Receita</th>
                  <th className="num">ROAS</th>
                </tr>
              </thead>
              <tbody>
                {dados.linhas.map((l) => (
                  <tr key={l.chave}>
                    <td>{l.nome}{l.tipo !== "campanha" && <small className="receita-tipo"> {l.tipo === "utm" ? "UTM" : "origem"}</small>}</td>
                    <td className="num">{l.gasto ? dinheiro(l.gasto) : "—"}</td>
                    <td className="num">{l.leads}</td>
                    <td className="num">{dinheiro(l.cpl)}</td>
                    <td className="num">{l.vendas}</td>
                    <td className="num">{pct(l.conversao)}</td>
                    <td className="num">{dinheiro(l.receita)}</td>
                    <td className="num"><strong>{vezes(l.roas)}</strong></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </>
  );
}
