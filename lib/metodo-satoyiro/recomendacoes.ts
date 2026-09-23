import type { Categoria, Grupo, Resultado } from "./tipos";

export type Recomendacao = {
  titulo: string;
  tipo: "filme" | "série";
  frase: string;
  tag: string;
};

/**
 * Filmes e séries por categoria — conteúdo definido no roteiro do método
 * Satoyiro. Quando uma entrada do roteiro cobre 2 categorias ("DESCOBERTA /
 * EXPLORADOR", por exemplo), a mesma lista fica duplicada nas duas chaves,
 * assim a busca por categoria do aluno funciona direto.
 */
const POR_CATEGORIA: Partial<Record<Categoria, Recomendacao[]>> = {
  DESCOBERTA: [
    { titulo: "Soul", tipo: "filme", tag: "DESCOBERTA", frase: "Pra quem ainda está achando o que faz sentido, sem precisar ter certeza de nada." },
    { titulo: "Divertida Mente 2", tipo: "filme", tag: "DESCOBERTA", frase: "Mostra que suas emoções contraditórias também fazem parte de quem você é." },
    { titulo: "A Vida Secreta de Walter Mitty", tipo: "filme", tag: "DESCOBERTA", frase: "Sobre sair da imaginação e ir descobrir quem você é na prática." },
  ],
  EXPLORADOR: [
    { titulo: "Soul", tipo: "filme", tag: "EXPLORADOR", frase: "Pra quem ainda está achando o que faz sentido, sem precisar ter certeza de nada." },
    { titulo: "Divertida Mente 2", tipo: "filme", tag: "EXPLORADOR", frase: "Mostra que suas emoções contraditórias também fazem parte de quem você é." },
    { titulo: "A Vida Secreta de Walter Mitty", tipo: "filme", tag: "EXPLORADOR", frase: "Sobre sair da imaginação e ir descobrir quem você é na prática." },
  ],
  AUTOCRITICO: [
    { titulo: "Extraordinário", tipo: "filme", tag: "AUTOCRITICO", frase: "Uma lição sobre se aceitar antes de esperar que os outros te aceitem." },
    { titulo: "Divertida Mente 2", tipo: "filme", tag: "AUTOCRITICO", frase: "Ansiedade e autocrítica em pessoa, literalmente, e como conviver com elas." },
    { titulo: "Hoje Eu Quero Voltar Sozinho", tipo: "filme", tag: "AUTOCRITICO", frase: "Sobre se descobrir sem deixar o julgamento alheio (nem o seu) decidir por você." },
  ],
  TRANQUILO: [
    { titulo: "Anne with an E", tipo: "série", tag: "TRANQUILO", frase: "Uma personagem que atravessa tudo sem perder o brilho de ser quem é." },
    { titulo: "Estrelas Além do Tempo", tipo: "filme", tag: "TRANQUILO", frase: "Competência tranquila, sem precisar provar nada aos gritos." },
  ],
  CONSCIENTE: [
    { titulo: "Anne with an E", tipo: "série", tag: "CONSCIENTE", frase: "Uma personagem que atravessa tudo sem perder o brilho de ser quem é." },
    { titulo: "Estrelas Além do Tempo", tipo: "filme", tag: "CONSCIENTE", frase: "Competência tranquila, sem precisar provar nada aos gritos." },
  ],
  SONHADOR: [
    { titulo: "À Procura da Felicidade", tipo: "filme", tag: "SONHADOR", frase: "De um sonho distante até o primeiro passo concreto, sem pular etapas." },
    { titulo: "O Menino que Descobriu o Vento", tipo: "filme", tag: "SONHADOR", frase: "Uma ideia impossível que só virou realidade porque alguém começou pequeno." },
    { titulo: "Ratatouille", tipo: "filme", tag: "SONHADOR", frase: "Sobre transformar um talento escondido em algo que o mundo consiga ver." },
  ],
  OCUPADO: [
    { titulo: "Soul", tipo: "filme", tag: "OCUPADO", frase: "Um alerta gentil: estar ocupado o tempo todo não é o mesmo que estar vivendo." },
    { titulo: "A Vida Secreta de Walter Mitty", tipo: "filme", tag: "OCUPADO", frase: "Sobre escolher pra onde vai sua energia, em vez de só reagir ao que aparece." },
  ],
  PROTAGONISTA: [
    { titulo: "Coach Carter: Treino para a Vida", tipo: "filme", tag: "PROTAGONISTA", frase: "Disciplina e propósito andando juntos, sem abrir mão de nenhum dos dois." },
    { titulo: "Estrelas Além do Tempo", tipo: "filme", tag: "PROTAGONISTA", frase: "O que acontece quando alguém decide assumir o próprio lugar, mesmo contra a maré." },
  ],
  PRESSIONADO: [
    { titulo: "Sociedade dos Poetas Mortos", tipo: "filme", tag: "PRESSIONADO", frase: "Sobre a diferença entre viver a vida que esperam de você e a sua própria." },
    { titulo: "Billy Elliot", tipo: "filme", tag: "PRESSIONADO", frase: "Um talento que só floresce quando alguém para de pedir desculpas por tê-lo." },
    { titulo: "Driblando o Destino", tipo: "filme", tag: "PRESSIONADO", frase: "Sobre carregar uma expectativa gigante sem perder de vista quem você é." },
    { titulo: "Red: Crescer é uma Fera", tipo: "filme", tag: "PRESSIONADO", frase: "Expectativa de família, versão bem-humorada, e ainda assim muito real." },
  ],
  CONFLITO: [
    { titulo: "Sociedade dos Poetas Mortos", tipo: "filme", tag: "CONFLITO", frase: "Sobre a diferença entre viver a vida que esperam de você e a sua própria." },
    { titulo: "Billy Elliot", tipo: "filme", tag: "CONFLITO", frase: "Um talento que só floresce quando alguém para de pedir desculpas por tê-lo." },
    { titulo: "Driblando o Destino", tipo: "filme", tag: "CONFLITO", frase: "Sobre carregar uma expectativa gigante sem perder de vista quem você é." },
    { titulo: "Red: Crescer é uma Fera", tipo: "filme", tag: "CONFLITO", frase: "Expectativa de família, versão bem-humorada, e ainda assim muito real." },
  ],
  AUTONOMO: [
    { titulo: "O Menino que Descobriu o Vento", tipo: "filme", tag: "AUTONOMO", frase: "Alguém que confiou na própria ideia mesmo sem ninguém mais acreditar nela." },
    { titulo: "Coach Carter: Treino para a Vida", tipo: "filme", tag: "AUTONOMO", frase: "Sobre construir seu próprio padrão, em vez de aceitar o que já está posto." },
  ],
  ALINHADO: [
    { titulo: "O Menino que Descobriu o Vento", tipo: "filme", tag: "ALINHADO", frase: "Alguém que confiou na própria ideia mesmo sem ninguém mais acreditar nela." },
    { titulo: "Coach Carter: Treino para a Vida", tipo: "filme", tag: "ALINHADO", frase: "Sobre construir seu próprio padrão, em vez de aceitar o que já está posto." },
  ],
};

const POR_GRUPO: Record<Grupo, Recomendacao> = {
  Estrategistas: {
    titulo: "O Jogo da Imitação",
    tipo: "filme",
    tag: "Estrategistas",
    frase: "Uma mente estratégica resolvendo o que parecia impossível resolver.",
  },
  Inspiradores: {
    titulo: "Sociedade dos Poetas Mortos",
    tipo: "filme",
    tag: "Inspiradores",
    frase: "Sobre inspirar e ser inspirado a enxergar a vida com outros olhos.",
  },
  Organizadores: {
    titulo: "Estrelas Além do Tempo",
    tipo: "filme",
    tag: "Organizadores",
    frase: "Estrutura, método e consistência levando gente longe de verdade.",
  },
  Realizadores: {
    titulo: "Billy Elliot",
    tipo: "filme",
    tag: "Realizadores",
    frase: "Aprender fazendo, no próprio ritmo, até virar talento de verdade.",
  },
};

/** Reúne de 4 a 6 recomendações únicas, cruzando os quadrantes e o grupo do aluno. */
export function recomendacoesPara(r: Resultado): Recomendacao[] {
  const candidatas = [
    ...(POR_CATEGORIA[r.cap1.principal] ?? []),
    ...(POR_CATEGORIA[r.cap2.principal] ?? []),
    ...(POR_CATEGORIA[r.cap3.principal] ?? []),
    POR_GRUPO[r.mbti.grupo],
  ];

  const vistos = new Set<string>();
  const unicas: Recomendacao[] = [];
  for (const rec of candidatas) {
    if (vistos.has(rec.titulo)) continue;
    vistos.add(rec.titulo);
    unicas.push(rec);
  }

  return unicas.slice(0, 6);
}
