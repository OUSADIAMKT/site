// Os emojis do campo de mensagem.
//
// Lista própria, à mão, em vez de biblioteca: as prontas trazem de 1800 a 3600
// emojis com nome em inglês, e quem atende aqui escreve em português e usa
// trinta. O peso de uma dessas no pacote da tela é maior que o desta tela
// inteira, e procurar "coração" não acharia "heart".
//
// Cada item é [emoji, palavras de busca]. As palavras são o que a pessoa
// digitaria, não o nome oficial do Unicode.

export const GRUPOS = [
  {
    chave: "frequentes",
    nome: "Mais usados",
    icone: "🕘",
    itens: [
      ["😊", "sorriso feliz simpatico"],
      ["🙏", "obrigado obrigada por favor gratidao reza"],
      ["👍", "legal ok positivo joia curtir"],
      ["❤️", "coracao amor vermelho"],
      ["😂", "rindo risada engracado"],
      ["🥰", "amando apaixonada carinho"],
      ["✅", "certo confirmado feito ok"],
      ["🎉", "festa comemorar parabens"],
      ["📦", "caixa pacote pedido encomenda"],
      ["🚚", "caminhao entrega frete transporte"],
      ["💰", "dinheiro pagamento valor grana"],
      ["⏰", "relogio prazo horario alarme"],
    ],
  },
  {
    chave: "rostos",
    nome: "Rostos",
    icone: "😀",
    itens: [
      ["😀", "sorriso alegre"],
      ["😃", "feliz animado"],
      ["😄", "risonho alegre"],
      ["😁", "sorrisao dentes"],
      ["😊", "simpatico timido feliz"],
      ["🙂", "leve sorriso tranquilo"],
      ["😉", "piscada brincadeira"],
      ["😍", "encantada coracao olhos amor"],
      ["🥰", "apaixonada carinho"],
      ["😘", "beijo"],
      ["😂", "rindo chorando risada"],
      ["🤣", "rolando de rir gargalhada"],
      ["😅", "riso nervoso alivio"],
      ["😇", "anjo inocente"],
      ["🤗", "abraco acolhida"],
      ["🤔", "pensando duvida"],
      ["😐", "neutro sem expressao"],
      ["😴", "dormindo sono"],
      ["😢", "triste choro"],
      ["😭", "chorando muito"],
      ["😔", "desanimada pena"],
      ["😳", "surpresa vergonha"],
      ["😡", "raiva bravo irritado"],
      ["🤯", "chocada explodindo"],
      ["🥵", "calor suando"],
      ["🤒", "doente febre"],
      ["😎", "oculos estiloso tranquilo"],
      ["🤩", "maravilhada estrela"],
      ["😬", "constrangida tensa"],
      ["🙄", "revirando os olhos"],
    ],
  },
  {
    chave: "gestos",
    nome: "Gestos",
    icone: "👍",
    itens: [
      ["👍", "legal positivo ok joia"],
      ["👎", "ruim negativo nao"],
      ["👏", "palmas aplauso parabens"],
      ["🙏", "obrigado por favor gratidao"],
      ["🤝", "aperto de mao acordo parceria"],
      ["✌️", "paz e amor dois"],
      ["👌", "perfeito certo ok"],
      ["🤞", "dedos cruzados torcendo sorte"],
      ["💪", "forca musculo garra"],
      ["👋", "oi tchau ola"],
      ["🫶", "coracao com as maos amor"],
      ["👆", "aponta para cima acima"],
      ["👇", "aponta para baixo abaixo"],
      ["✍️", "escrevendo anotando"],
      ["🤲", "maos abertas pedido"],
    ],
  },
  {
    chave: "coracoes",
    nome: "Corações",
    icone: "❤️",
    itens: [
      ["❤️", "coracao vermelho amor"],
      ["🧡", "coracao laranja"],
      ["💛", "coracao amarelo"],
      ["💚", "coracao verde"],
      ["💙", "coracao azul"],
      ["💜", "coracao roxo lilas"],
      ["🤎", "coracao marrom"],
      ["🖤", "coracao preto"],
      ["🤍", "coracao branco"],
      ["💕", "dois coracoes amor"],
      ["💖", "coracao brilhando"],
      ["💗", "coracao crescendo"],
      ["💔", "coracao partido tristeza"],
      ["✨", "brilho estrelas magia"],
      ["🔥", "fogo quente bombando"],
    ],
  },
  {
    chave: "pedido",
    nome: "Pedido e entrega",
    icone: "📦",
    itens: [
      ["📦", "caixa pacote pedido encomenda"],
      ["🚚", "caminhao entrega frete"],
      ["✈️", "aviao aereo frete"],
      ["📮", "correios postagem caixa de correio"],
      ["🏷️", "etiqueta preco codigo"],
      ["🧾", "nota fiscal recibo comprovante"],
      ["📍", "localizacao endereco mapa"],
      ["🗓️", "calendario data prazo"],
      ["⏰", "relogio prazo horario"],
      ["📲", "celular telefone whatsapp"],
      ["💳", "cartao pagamento credito"],
      ["💰", "dinheiro valor pagamento"],
      ["🔁", "troca devolucao repetir"],
      ["📝", "anotacao pedido formulario"],
      ["🔍", "lupa buscar consultar rastreio"],
      ["🛒", "carrinho compra loja"],
    ],
  },
  {
    chave: "sinais",
    nome: "Sinais",
    icone: "✅",
    itens: [
      ["✅", "certo confirmado feito ok"],
      ["❌", "errado nao cancelado"],
      ["⚠️", "atencao cuidado alerta"],
      ["❗", "importante exclamacao"],
      ["❓", "duvida pergunta"],
      ["🚫", "proibido bloqueado"],
      ["🔴", "vermelho parado grave"],
      ["🟡", "amarelo atencao"],
      ["🟢", "verde liberado tudo certo"],
      ["⭐", "estrela avaliacao favorito"],
      ["💡", "ideia dica lampada"],
      ["📌", "fixar importante alfinete"],
      ["🔒", "cadeado seguro privado"],
      ["➡️", "seta direita proximo"],
      ["⬅️", "seta esquerda voltar"],
    ],
  },
  {
    chave: "comemorar",
    nome: "Comemorar",
    icone: "🎉",
    itens: [
      ["🎉", "festa comemorar parabens"],
      ["🎊", "confete festa"],
      ["🎁", "presente brinde mimo"],
      ["🥳", "comemorando festa"],
      ["🏆", "trofeu premio ganhou"],
      ["🙌", "maos ao alto comemorar"],
      ["🎂", "bolo aniversario"],
      ["🌟", "estrela destaque"],
      ["💐", "flores buque agradecimento"],
      ["🍀", "trevo sorte"],
    ],
  },
  {
    chave: "coisas",
    nome: "Coisas",
    icone: "🧴",
    itens: [
      ["🧴", "frasco produto creme cosmetico"],
      ["🧼", "sabonete limpeza"],
      ["💧", "gota agua hidratacao"],
      ["🌿", "folha natural planta"],
      ["🌸", "flor rosa delicado"],
      ["☀️", "sol dia tempo"],
      ["🌙", "lua noite"],
      ["🏠", "casa endereco"],
      ["🏢", "predio empresa"],
      ["☕", "cafe pausa"],
      ["📷", "foto camera imagem"],
      ["🎧", "fone audio ouvir"],
      ["📄", "documento papel arquivo"],
      ["🖼️", "imagem quadro foto"],
      ["🎬", "video filme gravacao"],
    ],
  },
];

/**
 * Procura por palavra. Sem acento e sem caixa, porque ninguém digita "coração"
 * com cedilha certo no meio do atendimento.
 */
export function procurar(termo) {
  const limpo = normalizar(termo);
  if (!limpo) return [];

  const achados = [];
  const vistos = new Set();
  for (const grupo of GRUPOS) {
    for (const [emoji, palavras] of grupo.itens) {
      if (vistos.has(emoji)) continue;
      if (normalizar(palavras).includes(limpo)) {
        achados.push([emoji, palavras]);
        vistos.add(emoji);
      }
    }
  }
  return achados;
}

function normalizar(texto) {
  return String(texto || "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();
}

export { normalizar };
