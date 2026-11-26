// Onde a pessoa estava: a aba e o cliente escolhidos.
//
// Existe porque recarregar a página jogava todo mundo de volta na tela
// inicial. A sessão vem do armazenamento do navegador, e o efeito que reage a
// ela sempre forçava a aba padrão. Quem recarrega quer continuar onde estava:
// ou está atualizando a tela que está olhando, ou o navegador recarregou
// sozinho e a pessoa não pediu para sair dali.
//
// `quem` guarda de quem é o lugar. Duas pessoas no mesmo computador, ou o
// gestor e a atendente, não herdam a aba uma da outra. Uma aba que a próxima
// sessão não pode abrir cai no padrão dela, porque a regra de `abasPermitidas`
// continua valendo depois de restaurar.
//
// Mora fora do App.jsx para poder ser provado sem navegador.

export const LUGAR = "ousadia_lugar";

export function quemSou(sessao) {
  return [sessao?.tipo, sessao?.atendente || sessao?.cliente || sessao?.nome || ""].join(":");
}

/**
 * Lê o lugar guardado, e só devolve o que é desta sessão.
 *
 * Armazenamento quebrado, vazio ou de outra pessoa devolve `null`, que é o
 * sinal para o painel abrir no padrão. Nenhum desses casos é erro de tela.
 */
export function lugarSalvo(sessao, deposito = armazenamento()) {
  try {
    const salvo = JSON.parse(deposito?.getItem(LUGAR) || "null");
    return salvo && salvo.quem === quemSou(sessao) ? salvo : null;
  } catch {
    return null;
  }
}

/** Grava o lugar. Falha de armazenamento não interrompe nada. */
export function guardarLugar(sessao, aba, clienteId, deposito = armazenamento()) {
  if (!sessao) return;
  try {
    deposito?.setItem(LUGAR, JSON.stringify({
      quem: quemSou(sessao), aba, cliente: clienteId || null,
    }));
  } catch { /* sem armazenamento */ }
}

function armazenamento() {
  try {
    return typeof localStorage === "undefined" ? null : localStorage;
  } catch {
    return null;
  }
}
