import type { CSSProperties, ReactNode } from "react";

/**
 * Entrada suave (sobe e aparece) quando o bloco chega na tela.
 *
 * Feito em CSS (`.reveal` em `app/globals.css`) + o script `REVEAL_SCRIPT`,
 * que roda direto no HTML, antes do React. Antes era um `motion.div` que
 * começava com `opacity: 0` no próprio HTML: sem JavaScript (ou até o React
 * carregar) a página inteira, inclusive o topo da home, ficava invisível —
 * lento pra quem visita e ruim pro Google.
 *
 * Agora o conteúdo só é escondido quando o script já marcou o `<html>` com a
 * classe `js`, e aparece assim que entra na tela. Quem pede menos movimento
 * no sistema vê tudo direto, sem animação.
 */
export function Reveal({
  children,
  delay = 0,
  className = "",
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
}) {
  return (
    <div
      className={`reveal ${className}`}
      style={delay ? ({ "--reveal-delay": `${delay}s` } as CSSProperties) : undefined}
      // O script acrescenta `is-visible` antes do React hidratar.
      suppressHydrationWarning
    >
      {children}
    </div>
  );
}

/**
 * Vai inline no `<body>` (ver `app/layout.tsx`). Marca o `<html>` com `js` e
 * observa cada `.reveal`, inclusive os que aparecem depois numa navegação.
 * Sem IntersectionObserver (navegador muito antigo), não esconde nada.
 */
export const REVEAL_SCRIPT = `(function(){
if(!("IntersectionObserver" in window))return;
document.documentElement.classList.add("js");
var io=new IntersectionObserver(function(es){es.forEach(function(e){
if(e.isIntersecting){e.target.classList.add("is-visible");io.unobserve(e.target);}
});},{rootMargin:"0px 0px -80px 0px"});
var agendado=false;
function varrer(){agendado=false;document.querySelectorAll(".reveal:not(.is-visible)").forEach(function(el){io.observe(el);});}
function agendar(){if(!agendado){agendado=true;requestAnimationFrame(varrer);}}
document.addEventListener("DOMContentLoaded",function(){varrer();new MutationObserver(agendar).observe(document.body,{childList:true,subtree:true});});
})();`;
