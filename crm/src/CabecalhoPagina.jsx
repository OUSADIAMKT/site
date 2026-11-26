// O cabeçalho de página do CRM Ousadia.
//
// A barra do topo (BarraSuperior) diz ONDE você está, e é do aplicativo.
// Este aqui diz O QUE esta tela é, e é do módulo. São coisas diferentes e
// moram em lugares diferentes de propósito: a barra não muda de tela para
// tela, este muda em todas.
//
// A forma oficial é a da página Conversas: o título grande à esquerda, o
// resumo numérico à direita na MESMA linha de base, e a descrição embaixo.
// Sem linha divisória: quem separa o cabeçalho do miolo é o espaço, não um
// traço, que é a mesma regra de "uma camada de caixa só" do resto do painel.
//
// O resumo é dado (quantas conversas, quantos esperando). A descrição é
// explicação. Têm cores diferentes porque são leituras diferentes, e um
// módulo pode ter os dois, um só, ou nenhum.
//
// `acoes` é para o controle que pertence ao cabeçalho e não ao miolo: a
// forma de ver, o período, o botão de criar. Fica numa linha própria embaixo,
// e não ao lado do título, porque ao lado ele cabe numa tela larga e quebra
// numa estreita: o cabeçalho mudaria de forma conforme a janela, que é
// exatamente o que um padrão existe para impedir. Linha de botões solta logo
// abaixo do cabeçalho continua valendo, como já era na maioria das telas; não
// vale a pena mudar o que funciona só para passar por aqui.
export default function CabecalhoPagina({ titulo, resumo, acoes, children }) {
  return (
    <header className="pagina-titulo">
      <div className="pagina-titulo-linha">
        <h1>{titulo}</h1>
        {resumo ? <p className="pagina-resumo">{resumo}</p> : null}
      </div>
      {children ? <p className="pagina-descricao">{children}</p> : null}
      {acoes ? <div className="pagina-acoes">{acoes}</div> : null}
    </header>
  );
}
