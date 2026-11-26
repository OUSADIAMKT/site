// A bolinha verde de mensagens não lidas, a mesma na lista e no quadro.
//
// Não lida é de quem está olhando: conta as mensagens que entraram depois da
// última vez que ESSA pessoa abriu a conversa. É diferente de "sem resposta",
// que é vermelha e fala da conversa, não de quem lê: ninguém respondeu a
// pessoa, nem a equipe nem a IA.
//
// As duas convivem na mesma tela de propósito, mas nunca como duas bolinhas na
// mesma linha: a verde é a bolinha, a vermelha é frase ou ficha de texto.

/** Quantas não lidas, em palavras, para quem lê com leitor de tela. */
export function fraseNaoLidas(n) {
  if (n <= 0) return "marcada como não lida";
  return n === 1 ? "1 mensagem não lida" : `${n} mensagens não lidas`;
}

export function NaoLidas({ conversa }) {
  const n = conversa?.nao_lidas || 0;
  if (n <= 0 && !conversa?.marcada) return null;
  return (
    <span className="nao-lido" aria-label={fraseNaoLidas(n)} title={fraseNaoLidas(n)}>
      {n > 99 ? "99+" : (n || "")}
    </span>
  );
}
