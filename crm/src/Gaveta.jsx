import { useEffect } from "react";

/**
 * A gaveta: um painel por cima da tela, sem sair da tela.
 *
 * No Quadro ela abre a conversa e o quadro continua atrás, contando e se
 * atualizando. Foi esse o pedido: abrir alguém, responder e voltar sem perder
 * de vista como está o resto do atendimento. Em Contatos ela abre o histórico
 * da pessoa pela mesma razão.
 */
export default function Gaveta({ titulo, canal, aoFechar, children }) {
  // Esc fecha. É o gesto que todo mundo tenta primeiro numa coisa que abriu
  // por cima, e sem ele a pessoa procura o X com o mouse.
  useEffect(() => {
    const aoTeclar = (e) => { if (e.key === "Escape") aoFechar(); };
    window.addEventListener("keydown", aoTeclar);
    return () => window.removeEventListener("keydown", aoTeclar);
  }, [aoFechar]);

  return (
    <div className="gaveta-fundo" onClick={aoFechar}>
      <aside
        className="gaveta"
        role="dialog" aria-modal="true" aria-label={titulo}
        onClick={(e) => e.stopPropagation()}
      >
        <header className="gaveta-topo">
          <div>
            <strong>{titulo}</strong>
            {/* Sem canal não é conversa de ninguém: é a gaveta de uma lista,
                e escrever "WhatsApp" ali seria inventar origem. */}
            {canal && (
              <span className="quadro-canal">{canal === "instagram" ? "Instagram" : "WhatsApp"}</span>
            )}
          </div>
          <button type="button" className="btn secundario pequeno" onClick={aoFechar}>
            Fechar
          </button>
        </header>
        <div className="gaveta-corpo">{children}</div>
      </aside>
    </div>
  );
}
