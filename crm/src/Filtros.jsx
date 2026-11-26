import { useState, useEffect } from "react";

// A barra de filtro, uma só, usada no Quadro e em Conversas.
//
// Duas barras separadas iam divergir: a pessoa aprende o filtro numa tela e
// espera o mesmo na outra. O que muda entre elas é quais campos aparecem, e
// isso vem por prop.

import { TEMPOS, JANELAS, FILTRO_VAZIO, algumFiltro, passaNoFiltro } from "./filtros.js";

export { TEMPOS, JANELAS, FILTRO_VAZIO, algumFiltro, passaNoFiltro };

export default function Filtros({
  valor, aoMudar,
  atendentes = [], etiquetas = [],
  mostrar = { busca: true, canal: true, atendente: true, etiqueta: true, tempo: true, parados: true },
  extra = null,
  placeholder = "Procurar por nome, @ do Instagram ou telefone",
}) {
  const [texto, setTexto] = useState(valor.busca || "");

  // Espera a pessoa parar de digitar. Sem isso, cada letra é uma consulta ao
  // banco e a lista pisca inteira no meio da digitação.
  useEffect(() => {
    if (texto === (valor.busca || "")) return;
    const t = setTimeout(() => aoMudar({ ...valor, busca: texto.trim() }), 300);
    return () => clearTimeout(t);
  }, [texto]);

  useEffect(() => { setTexto(valor.busca || ""); }, [valor.busca]);

  const trocar = (campo) => (e) => aoMudar({ ...valor, [campo]: e.target.value });

  return (
    <div className="filtros" role="group" aria-label="Filtrar">
      {mostrar.busca && (
        <input
          type="search" className="filtro-busca" value={texto}
          onChange={(e) => setTexto(e.target.value)} placeholder={placeholder}
          aria-label="Procurar"
        />
      )}

      {mostrar.canal && (
        <select value={valor.canal} onChange={trocar("canal")} aria-label="Canal">
          <option value="">Todos os canais</option>
          <option value="whatsapp">WhatsApp</option>
          <option value="instagram">Instagram</option>
        </select>
      )}

      {mostrar.atendente && atendentes.length > 0 && (
        <select value={valor.atendente} onChange={trocar("atendente")} aria-label="Atendente">
          <option value="">Qualquer atendente</option>
          <option value="sem">Sem atendente</option>
          {atendentes.map((a) => (
            <option key={a.id || a.nome} value={a.nome}>{a.nome}</option>
          ))}
        </select>
      )}

      {mostrar.etiqueta && etiquetas.length > 0 && (
        <select value={valor.etiqueta} onChange={trocar("etiqueta")} aria-label="Etiqueta">
          <option value="">Todas as etiquetas</option>
          {etiquetas.map((e) => {
            const nome = typeof e === "string" ? e : e.nome;
            const quantos = typeof e === "string" ? null : e.quantos;
            return (
              <option key={nome} value={nome}>
                {nome}{quantos ? ` (${quantos})` : ""}
              </option>
            );
          })}
        </select>
      )}

      {mostrar.parados && (
        <button
          type="button"
          className={`btn pequeno ${valor.parados ? "" : "secundario"}`}
          aria-pressed={Boolean(valor.parados)}
          onClick={() => aoMudar({ ...valor, parados: !valor.parados })}
        >
          Só sem resposta
        </button>
      )}

      {/* Não lida e sem resposta são duas coisas, e por isso dois botões. Sem
          resposta é da conversa: ninguém respondeu a pessoa, nem a equipe nem
          a IA. Não lida é de quem está olhando: entrou mensagem depois da
          última vez que ESSA pessoa abriu. Uma conversa pode estar respondida
          e não lida, e juntar as duas num botão só esconderia justamente o
          caso que faz alguém perder atendimento. */}
      {mostrar.naoLidas && (
        <button
          type="button"
          className={`btn pequeno ${valor.naoLidas ? "" : "secundario"}`}
          aria-pressed={Boolean(valor.naoLidas)}
          onClick={() => aoMudar({ ...valor, naoLidas: !valor.naoLidas })}
        >
          Só não lidas
        </button>
      )}

      {mostrar.tempo && (
        <select value={valor.tempo} onChange={trocar("tempo")} aria-label="Tempo de espera">
          {TEMPOS.map((t) => <option key={t.valor} value={t.valor}>{t.rotulo}</option>)}
        </select>
      )}

      {/* A janela da Meta é outro seletor, e não mais um item do tempo de
          espera. São informações diferentes: espera é quanto tempo a pessoa
          está parada aqui dentro, janela é quanto tempo o WhatsApp ainda
          deixa responder sem modelo aprovado. Juntas num seletor só, "mais de
          24h" parecia falar da janela e não falava. */}
      {mostrar.janela && (
        <select value={valor.janela} onChange={trocar("janela")} aria-label="Janela da Meta">
          {JANELAS.map((j) => <option key={j.valor} value={j.valor}>{j.rotulo}</option>)}
        </select>
      )}

      {extra}

      {algumFiltro(valor) && (
        <button type="button" className="btn secundario pequeno"
                onClick={() => { setTexto(""); aoMudar({ ...FILTRO_VAZIO }); }}>
          Limpar
        </button>
      )}
    </div>
  );
}
