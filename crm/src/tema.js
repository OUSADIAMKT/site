// O tema, num lugar só.
//
// Antes esta lógica vivia em vários lugares: App.jsx, as prévias e o
// script embutido de cada index.html. Cada cópia conhecia dois temas e
// transformava qualquer outro valor em "claro", o que faria uma escolha de
// "gold" virar "claro" ao abrir a prévia. Agora todos leem daqui.
//
// Este arquivo não sabe nada de sessão, de permissão nem de empresa. Tema é
// preferência de quem olha a tela, fica no navegador de cada um, e a recepção
// pode usar claro sem mudar o do dono.

export const CHAVE_TEMA = "ousadia_tema";

// A ordem desta lista é a ordem do menu.
export const TEMAS = [
  { id: "ousadia", nome: "Ousadia",       resumo: "Roxo profundo e amarelo, as cores da marca" },
  { id: "blue",   nome: "Azul",            resumo: "Azul-marinho e azul elétrico" },
  { id: "gold",   nome: "Dourado",         resumo: "Preto, grafite e champanhe" },
  { id: "light",  nome: "Claro azul",      resumo: "Claro, com a lateral azul" },
  { id: "claro",  nome: "Claro",           resumo: "O tema antigo", legado: true },
  { id: "escuro", nome: "Escuro",          resumo: "O tema antigo", legado: true },
];

// Quem nunca escolheu entra no tema Ousadia. Quem já escolheu mantém o que escolheu,
// inclusive os dois legados: a preferência antiga continua valendo e não é
// reescrita por este arquivo em momento nenhum.
export const TEMA_PADRAO = "ousadia";

// A cor da barra do navegador no celular. Sem isto, a faixa do topo fica
// escura por cima de um painel claro, ou o contrário.
const COR_DA_BARRA = {
  ousadia: "#100A1C",
  blue: "#060C20",
  gold: "#0C0D11",
  light: "#F5F7FC",
  claro: "#F5F6F7",
  escuro: "#131519",
};

export function ehTema(valor) {
  return TEMAS.some((t) => t.id === valor);
}

// Lê a preferência guardada. Valor desconhecido, nulo ou navegador sem
// armazenamento caem no padrão, e o valor guardado NÃO é apagado: pode ser
// de uma versão mais nova que esta aba ainda não conhece.
export function lerTema() {
  try {
    const guardado = localStorage.getItem(CHAVE_TEMA);
    if (ehTema(guardado)) return guardado;
  } catch { /* sem armazenamento: vale o padrão nesta sessão */ }
  return TEMA_PADRAO;
}

// Pinta. Devolve o tema que realmente ficou valendo, que pode não ser o
// pedido se alguém mandar lixo.
export function aplicarTema(pedido) {
  const tema = ehTema(pedido) ? pedido : TEMA_PADRAO;
  document.documentElement.dataset.tema = tema;

  const barra = document.querySelector('meta[name="theme-color"]');
  if (barra) barra.setAttribute("content", COR_DA_BARRA[tema]);

  return tema;
}

// Grava. Só é chamada quando alguém escolhe de propósito: abrir o painel não
// grava nada, senão o padrão de hoje viraria a escolha gravada de amanhã.
export function guardarTema(tema) {
  if (!ehTema(tema)) return;
  try {
    localStorage.setItem(CHAVE_TEMA, tema);
  } catch { /* sem armazenamento: o tema vale só nesta sessão */ }
}
