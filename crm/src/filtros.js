// As regras do filtro moram em `api/_filtros.js`, do lado do servidor, e este
// arquivo só as reexporta para a tela.
//
// A razão é simples: o quadro passou a filtrar e contar no servidor, para o
// contador não mentir sobre quem ficou atrás do corte. Se a tela tivesse a sua
// própria cópia das regras, bastava alguém mexer num limiar num lado para a
// coluna mostrar um número e a lista mostrar outro.

export {
  TEMPOS, JANELAS, ORDENS, FILTRO_VAZIO, FECHANDO_HORAS, ATRASO_MIN,
  algumFiltro, passaNoFiltro, esperaDesde, horasDeEspera, horasDeJanela,
  situacaoDaJanela, atrasado,
} from "../api/_filtros.js";
