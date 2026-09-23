/**
 * Número de missão de vida — numerologia pitagórica clássica: soma todos os
 * dígitos da data de nascimento e reduz por soma sucessiva até sobrar um só
 * dígito, exceto quando o resultado intermediário é um número mestre (11,
 * 22 ou 33), que a tradição não reduz mais.
 */

export type NumeroMissao = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 11 | 22 | 33;

const NUMEROS_MESTRES = new Set([11, 22, 33]);

function somarDigitos(n: number): number {
  return String(n)
    .split("")
    .reduce((soma, d) => soma + Number(d), 0);
}

function reduzir(n: number): NumeroMissao {
  let atual = n;
  while (atual > 9 && !NUMEROS_MESTRES.has(atual)) {
    atual = somarDigitos(atual);
  }
  return atual as NumeroMissao;
}

/**
 * Calcula o número de missão a partir de uma data no formato ISO
 * (yyyy-mm-dd, como vem de um `<input type="date">`). Devolve `null` se a
 * data estiver vazia ou for inválida.
 */
export function calcularNumeroMissao(dataIso: string): NumeroMissao | null {
  const partes = dataIso.split("-");
  if (partes.length !== 3) return null;
  const [ano, mes, dia] = partes.map(Number);
  if (!ano || !mes || !dia) return null;

  const soma = somarDigitos(ano) + somarDigitos(mes) + somarDigitos(dia);
  return reduzir(soma);
}

export type BlocoMissao = { titulo: string; paragrafos: [string, string, string] };

export const NUMERO_MISSAO_TEXTO: Record<NumeroMissao, BlocoMissao> = {
  1: {
    titulo: "Missão 1: O Pioneiro",
    paragrafos: [
      "O 1 é o número de quem veio pra abrir caminho, não pra seguir o que já está pronto. Sua missão passa por aprender a confiar na própria iniciativa: começar algo mesmo sem garantia de que vai dar certo, e descobrir que essa coragem é sua maior ferramenta.",
      "O desafio de quem carrega o 1 costuma ser a impaciência com o ritmo dos outros e o medo de parecer arrogante ao assumir a liderança. Aprender a liderar sem atropelar, e a ser independente sem se isolar, é parte do seu aprendizado nessa vida.",
      "Quando você se permite ser o(a) primeiro(a) a tentar, a errar e a tentar de novo, você abre espaço pra que outras pessoas também ousem. Sua missão não é ser perfeito(a): é ser corajoso(a) o suficiente pra dar o primeiro passo.",
    ],
  },
  2: {
    titulo: "Missão 2: O Diplomata",
    paragrafos: [
      "O 2 é o número da parceria, da escuta e da sensibilidade. Sua missão tem a ver com construir pontes: unir pessoas, mediar conflitos e mostrar que cooperar é tão poderoso quanto competir.",
      "O desafio de quem carrega o 2 é não desaparecer tentando agradar todo mundo. Sua sensibilidade é um dom, não uma fraqueza, mas ela precisa vir acompanhada de limite: sua opinião também importa, mesmo quando é diferente da dos outros.",
      "Quando você se permite ter voz própria dentro das suas parcerias, sua capacidade de unir gente se torna ainda mais forte. Sua missão é lembrar o mundo que ninguém constrói nada importante sozinho, você inclusive.",
    ],
  },
  3: {
    titulo: "Missão 3: O Comunicador",
    paragrafos: [
      "O 3 é o número da expressão, da criatividade e da alegria contagiante. Sua missão passa por encontrar sua forma de se comunicar (seja falando, escrevendo, desenhando, cantando ou criando) e usá-la pra inspirar quem está por perto.",
      "O desafio de quem carrega o 3 costuma ser a dispersão: tantas ideias e talentos que fica difícil escolher um só pra levar a sério. Também vale ficar de olho na tendência de esconder tristeza atrás do bom humor, em vez de sentir o que precisa ser sentido.",
      "Quando você se permite focar numa forma de expressão e sustentar ela com constância, seu talento deixa de ser só brilho passageiro e vira algo que transforma gente. Sua missão é lembrar que alegria de verdade também cabe seriedade.",
    ],
  },
  4: {
    titulo: "Missão 4: O Construtor",
    paragrafos: [
      "O 4 é o número da estrutura, da disciplina e do trabalho bem feito. Sua missão tem a ver com construir algo sólido, passo a passo, numa época em que todo mundo quer resultado instantâneo.",
      "O desafio de quem carrega o 4 é a rigidez: tanta vontade de fazer certo que fica difícil se permitir errar, mudar de plano ou pedir ajuda. Vale lembrar que estrutura não é a mesma coisa que perfeição.",
      "Quando você se permite construir no seu ritmo, sem comparar seu processo com o de quem parece mais rápido, sua consistência vira sua marca registrada. Sua missão é provar que o que é feito com cuidado dura mais.",
    ],
  },
  5: {
    titulo: "Missão 5: O Explorador",
    paragrafos: [
      "O 5 é o número da liberdade, da curiosidade e da mudança. Sua missão passa por experimentar caminhos diferentes, sem se prender cedo demais a uma única versão de quem você deveria ser.",
      "O desafio de quem carrega o 5 é a dificuldade de sustentar compromisso: tantas possibilidades que fica fácil largar algo assim que aparece a próxima novidade. Aprender a terminar o que começa, mesmo sem perder a sede de explorar, é parte do caminho.",
      "Quando você se permite viver suas experiências sem culpa, mas também aprende a escolher onde vale a pena ficar por mais tempo, sua liberdade vira direção, não dispersão. Sua missão é mostrar que dá pra mudar de rota sem se perder de si mesmo(a).",
    ],
  },
  6: {
    titulo: "Missão 6: O Cuidador",
    paragrafos: [
      "O 6 é o número da responsabilidade, do cuidado e da harmonia. Sua missão tem a ver com criar ambientes onde as pessoas ao seu redor (família, amigos, comunidade) se sintam acolhidas e seguras.",
      "O desafio de quem carrega o 6 é se esquecer de cuidar de si mesmo(a) enquanto cuida de todo mundo. Vale prestar atenção em quando o cuidado vira controle, e em quando ajudar os outros virou uma forma de fugir das próprias questões.",
      "Quando você se permite receber cuidado tanto quanto oferece, sua capacidade de gerar harmonia deixa de custar seu próprio equilíbrio. Sua missão é lembrar que cuidar de você também é cuidar de quem você ama.",
    ],
  },
  7: {
    titulo: "Missão 7: O Buscador",
    paragrafos: [
      "O 7 é o número da introspecção, da análise e da busca por sentido. Sua missão passa por ir fundo: questionar, estudar, entender o porquê das coisas, em vez de aceitar respostas prontas.",
      "O desafio de quem carrega o 7 é o isolamento: tanto tempo pensando sozinho(a) que fica difícil deixar as pessoas chegarem perto. Vale lembrar que sabedoria também se constrói em conversa, não só em silêncio.",
      "Quando você se permite compartilhar o que descobre, em vez de guardar só pra si, sua profundidade vira farol pra quem também está em busca de respostas. Sua missão é lembrar que fazer as perguntas certas já é metade do caminho.",
    ],
  },
  8: {
    titulo: "Missão 8: O Realizador",
    paragrafos: [
      "O 8 é o número do poder pessoal, da ambição e da capacidade de transformar ideia em resultado concreto. Sua missão tem a ver com aprender a lidar bem com influência, dinheiro e conquista, sem culpa nem exagero.",
      "O desafio de quem carrega o 8 é confundir valor próprio com resultado alcançado: achar que só vale a pena quando está no topo. Vale lembrar que poder de verdade inclui saber perder, recomeçar e admitir quando algo não deu certo.",
      "Quando você se permite construir com ética, mesmo quando ninguém está olhando, sua ambição vira algo que inspira em vez de intimidar. Sua missão é provar que dá pra ter sucesso sem perder a própria integridade pelo caminho.",
    ],
  },
  9: {
    titulo: "Missão 9: O Humanitário",
    paragrafos: [
      "O 9 é o número da compaixão, da generosidade e da visão ampla. Sua missão passa por enxergar além de si mesmo(a): usar o que você aprende e conquista pra contribuir com algo maior que você.",
      "O desafio de quem carrega o 9 é se doar até se esvaziar, ou se apegar ao passado quando é hora de fechar um ciclo e seguir em frente. Vale lembrar que generosidade sustentável começa com limite, não com sacrifício.",
      "Quando você se permite soltar o que já cumpriu seu papel, seu jeito de olhar pro mundo se torna ainda mais generoso. Sua missão é lembrar que cuidar do coletivo também passa por cuidar de você primeiro.",
    ],
  },
  11: {
    titulo: "Missão 11: O Intuitivo",
    paragrafos: [
      "O 11 é um número mestre: carrega a sensibilidade do 2 elevada a um outro nível de intensidade. Sua missão tem a ver com confiar na sua intuição, mesmo quando ela não faz sentido lógico na hora, e usar essa percepção aguçada pra inspirar quem está por perto.",
      "O desafio de quem carrega o 11 é a ansiedade e a autocobrança: tanta sensibilidade que fica difícil filtrar o que é seu do que é do ambiente ao redor. Aprender a se aterrar (dormir bem, respirar, colocar os pés no chão) é parte essencial do caminho.",
      "Quando você se permite honrar sua sensibilidade em vez de tentar silenciá-la, sua intuição deixa de pesar e vira um dom que ilumina caminhos, seus e dos outros. Sua missão é lembrar que ser diferente não é a mesma coisa que estar errado(a).",
    ],
  },
  22: {
    titulo: "Missão 22: O Construtor Mestre",
    paragrafos: [
      "O 22 é um número mestre: junta a visão grande do 4 com uma capacidade rara de transformar sonho em realidade concreta e em larga escala. Sua missão passa por pensar grande e, ao mesmo tempo, ter a disciplina de construir isso passo a passo.",
      "O desafio de quem carrega o 22 é a pressão que vem junto do próprio potencial: a sensação de precisar fazer algo gigante, cedo demais. Vale lembrar que até os maiores construtores começaram com um tijolo de cada vez.",
      "Quando você se permite crescer no seu tempo, sem comparar seu início com a obra pronta de outra pessoa, sua capacidade de construir coisas grandes se revela naturalmente. Sua missão é lembrar que visão sem paciência não vira estrutura.",
    ],
  },
  33: {
    titulo: "Missão 33: O Mestre Professor",
    paragrafos: [
      "O 33 é o número mestre mais raro: une o cuidado do 6 a uma capacidade de amor, ensino e cura que vai além do que se espera na maioria das trajetórias. Sua missão tem a ver com servir e ensinar através do exemplo, não do discurso.",
      "O desafio de quem carrega o 33 é o peso de tanta responsabilidade sentida por outras pessoas: a vontade de curar tudo e todo mundo, até esquecer das próprias necessidades. Vale lembrar que ensinar cuidado de si também é parte do seu ensinamento.",
      "Quando você se permite cuidar de si com a mesma generosidade que dedica aos outros, sua presença se torna ainda mais transformadora pra quem está por perto. Sua missão é lembrar que o maior ensinamento costuma vir de como você vive, não do que você diz.",
    ],
  },
};
