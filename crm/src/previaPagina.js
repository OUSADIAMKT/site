// A aba protegida da prévia.
//
// Ela não tem token, não chama /api/ e não guarda nada. O documento chega por
// postMessage da aba que a abriu, e vai direto para um iframe sandbox, onde o
// código importado roda em origem opaca. Ou seja: mesmo nesta aba, que é do
// painel, o JS da landing page não alcança a sessão.
//
// Por que não um endereço com o rascunho dentro? Porque endereço se compartilha
// e fica no histórico. Um /previa/<id> precisaria de porteiro, e um porteiro
// com token na URL é o token no histórico do navegador. Aqui o rascunho nunca
// virou endereço: ele atravessa de aba para aba, pela memória do navegador.

import { SANDBOX } from "../api/_pagina.js";

const recado = document.getElementById("recado");

// A aba de cima é a única que pode mandar documento, e só da mesma origem.
// `event.source` é comparado com `window.opener` de propósito: origem igual
// não basta, porque qualquer aba do painel seria origem igual.
function daMinhaAba(ev) {
  return ev.origin === window.location.origin && ev.source === window.opener;
}

let quadro = null;

function mostrar(documento) {
  if (!quadro) {
    quadro = document.createElement("iframe");
    quadro.setAttribute("sandbox", SANDBOX);
    quadro.setAttribute("title", "Prévia da landing page");
    document.body.appendChild(quadro);
    recado?.remove();
  }
  quadro.srcdoc = String(documento || "");
}

window.addEventListener("message", (ev) => {
  if (!daMinhaAba(ev)) return;
  const dado = ev.data;
  if (dado?.ousadia === "previa-documento") mostrar(dado.documento);
});

// Pede o documento assim que carrega. A aba do painel responde com o que o
// iframe de lá está mostrando, o que faz as duas prévias serem a mesma.
if (window.opener) {
  window.opener.postMessage({ ousadia: "previa-pronta" }, window.location.origin);
} else if (recado) {
  recado.textContent = "Esta aba precisa ser aberta pelo botão de prévia do painel.";
}
