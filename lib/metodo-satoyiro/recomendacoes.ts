import type { Categoria, Grupo, Resultado } from "./tipos";

export type Recomendacao = {
  titulo: string;
  tipo: "filme" | "série" | "livro";
  frase: string;
  tag: string;
};

/**
 * Filmes, séries e livros por categoria — conteúdo definido no roteiro do
 * método Satoyiro (filmes/séries) mais uma leitura por categoria, escolhida
 * pra combinar com o mesmo resultado. Quando uma entrada do roteiro cobre 2
 * categorias ("DESCOBERTA / EXPLORADOR", por exemplo), a mesma lista fica
 * duplicada nas duas chaves, assim a busca por categoria do aluno funciona
 * direto. O livro vem sempre primeiro na lista — ver `intercalar()` abaixo,
 * que usa essa ordem pra garantir que o resultado final misture formatos.
 */
const POR_CATEGORIA: Partial<Record<Categoria, Recomendacao[]>> = {
  DESCOBERTA: [
    { titulo: "O Alquimista", tipo: "livro", tag: "DESCOBERTA", frase: "Sobre descobrir que os sinais do seu caminho já estavam dentro de você." },
    { titulo: "Soul", tipo: "filme", tag: "DESCOBERTA", frase: "Pra quem ainda está achando o que faz sentido, sem precisar ter certeza de nada." },
    { titulo: "Divertida Mente 2", tipo: "filme", tag: "DESCOBERTA", frase: "Mostra que suas emoções contraditórias também fazem parte de quem você é." },
    { titulo: "A Vida Secreta de Walter Mitty", tipo: "filme", tag: "DESCOBERTA", frase: "Sobre sair da imaginação e ir descobrir quem você é na prática." },
  ],
  EXPLORADOR: [
    { titulo: "O Alquimista", tipo: "livro", tag: "EXPLORADOR", frase: "Sobre descobrir que os sinais do seu caminho já estavam dentro de você." },
    { titulo: "Soul", tipo: "filme", tag: "EXPLORADOR", frase: "Pra quem ainda está achando o que faz sentido, sem precisar ter certeza de nada." },
    { titulo: "Divertida Mente 2", tipo: "filme", tag: "EXPLORADOR", frase: "Mostra que suas emoções contraditórias também fazem parte de quem você é." },
    { titulo: "A Vida Secreta de Walter Mitty", tipo: "filme", tag: "EXPLORADOR", frase: "Sobre sair da imaginação e ir descobrir quem você é na prática." },
  ],
  AUTOCRITICO: [
    { titulo: "A Coragem de Ser Imperfeito", tipo: "livro", tag: "AUTOCRITICO", frase: "Um convite pra trocar a régua da perfeição pela coragem de se aceitar como você é." },
    { titulo: "Extraordinário", tipo: "filme", tag: "AUTOCRITICO", frase: "Uma lição sobre se aceitar antes de esperar que os outros te aceitem." },
    { titulo: "Divertida Mente 2", tipo: "filme", tag: "AUTOCRITICO", frase: "Ansiedade e autocrítica em pessoa, literalmente, e como conviver com elas." },
    { titulo: "Hoje Eu Quero Voltar Sozinho", tipo: "filme", tag: "AUTOCRITICO", frase: "Sobre se descobrir sem deixar o julgamento alheio (nem o seu) decidir por você." },
  ],
  TRANQUILO: [
    { titulo: "Autoconhecimento por um Fio", tipo: "livro", tag: "TRANQUILO", frase: "Reflexões leves sobre quem você é, sem prometer uma resposta fechada." },
    { titulo: "Anne with an E", tipo: "série", tag: "TRANQUILO", frase: "Uma personagem que atravessa tudo sem perder o brilho de ser quem é." },
    { titulo: "Estrelas Além do Tempo", tipo: "filme", tag: "TRANQUILO", frase: "Competência tranquila, sem precisar provar nada aos gritos." },
  ],
  CONSCIENTE: [
    { titulo: "Autoconhecimento por um Fio", tipo: "livro", tag: "CONSCIENTE", frase: "Reflexões leves sobre quem você é, sem prometer uma resposta fechada." },
    { titulo: "Anne with an E", tipo: "série", tag: "CONSCIENTE", frase: "Uma personagem que atravessa tudo sem perder o brilho de ser quem é." },
    { titulo: "Estrelas Além do Tempo", tipo: "filme", tag: "CONSCIENTE", frase: "Competência tranquila, sem precisar provar nada aos gritos." },
  ],
  SONHADOR: [
    { titulo: "Mindset: A Nova Psicologia do Sucesso", tipo: "livro", tag: "SONHADOR", frase: "Mostra que talento é só o ponto de partida: o que você faz com ele é que conta." },
    { titulo: "À Procura da Felicidade", tipo: "filme", tag: "SONHADOR", frase: "De um sonho distante até o primeiro passo concreto, sem pular etapas." },
    { titulo: "O Menino que Descobriu o Vento", tipo: "filme", tag: "SONHADOR", frase: "Uma ideia impossível que só virou realidade porque alguém começou pequeno." },
    { titulo: "Ratatouille", tipo: "filme", tag: "SONHADOR", frase: "Sobre transformar um talento escondido em algo que o mundo consiga ver." },
  ],
  OCUPADO: [
    { titulo: "Essencialismo", tipo: "livro", tag: "OCUPADO", frase: "Sobre escolher fazer menos coisas, mas as certas, em vez de um pouco de tudo." },
    { titulo: "Soul", tipo: "filme", tag: "OCUPADO", frase: "Um alerta gentil: estar ocupado o tempo todo não é o mesmo que estar vivendo." },
    { titulo: "A Vida Secreta de Walter Mitty", tipo: "filme", tag: "OCUPADO", frase: "Sobre escolher pra onde vai sua energia, em vez de só reagir ao que aparece." },
  ],
  PROTAGONISTA: [
    { titulo: "Os 7 Hábitos das Pessoas Altamente Eficazes", tipo: "livro", tag: "PROTAGONISTA", frase: "Um manual prático pra transformar clareza em ação, hábito por hábito." },
    { titulo: "Coach Carter: Treino para a Vida", tipo: "filme", tag: "PROTAGONISTA", frase: "Disciplina e propósito andando juntos, sem abrir mão de nenhum dos dois." },
    { titulo: "Estrelas Além do Tempo", tipo: "filme", tag: "PROTAGONISTA", frase: "O que acontece quando alguém decide assumir o próprio lugar, mesmo contra a maré." },
  ],
  PRESSIONADO: [
    { titulo: "Divergente", tipo: "livro", tag: "PRESSIONADO", frase: "Uma heroína que descobre que não se encaixar também pode ser uma forma de força." },
    { titulo: "Sociedade dos Poetas Mortos", tipo: "filme", tag: "PRESSIONADO", frase: "Sobre a diferença entre viver a vida que esperam de você e a sua própria." },
    { titulo: "Billy Elliot", tipo: "filme", tag: "PRESSIONADO", frase: "Um talento que só floresce quando alguém para de pedir desculpas por tê-lo." },
    { titulo: "Driblando o Destino", tipo: "filme", tag: "PRESSIONADO", frase: "Sobre carregar uma expectativa gigante sem perder de vista quem você é." },
    { titulo: "Red: Crescer é uma Fera", tipo: "filme", tag: "PRESSIONADO", frase: "Expectativa de família, versão bem-humorada, e ainda assim muito real." },
  ],
  CONFLITO: [
    { titulo: "Divergente", tipo: "livro", tag: "CONFLITO", frase: "Uma heroína que descobre que não se encaixar também pode ser uma forma de força." },
    { titulo: "Sociedade dos Poetas Mortos", tipo: "filme", tag: "CONFLITO", frase: "Sobre a diferença entre viver a vida que esperam de você e a sua própria." },
    { titulo: "Billy Elliot", tipo: "filme", tag: "CONFLITO", frase: "Um talento que só floresce quando alguém para de pedir desculpas por tê-lo." },
    { titulo: "Driblando o Destino", tipo: "filme", tag: "CONFLITO", frase: "Sobre carregar uma expectativa gigante sem perder de vista quem você é." },
    { titulo: "Red: Crescer é uma Fera", tipo: "filme", tag: "CONFLITO", frase: "Expectativa de família, versão bem-humorada, e ainda assim muito real." },
  ],
  AUTONOMO: [
    { titulo: "Steve Jobs", tipo: "livro", tag: "AUTONOMO", frase: "A biografia de alguém que confiou na própria visão, mesmo quando ninguém mais enxergava." },
    { titulo: "O Menino que Descobriu o Vento", tipo: "filme", tag: "AUTONOMO", frase: "Alguém que confiou na própria ideia mesmo sem ninguém mais acreditar nela." },
    { titulo: "Coach Carter: Treino para a Vida", tipo: "filme", tag: "AUTONOMO", frase: "Sobre construir seu próprio padrão, em vez de aceitar o que já está posto." },
  ],
  ALINHADO: [
    { titulo: "Steve Jobs", tipo: "livro", tag: "ALINHADO", frase: "A biografia de alguém que confiou na própria visão, mesmo quando ninguém mais enxergava." },
    { titulo: "O Menino que Descobriu o Vento", tipo: "filme", tag: "ALINHADO", frase: "Alguém que confiou na própria ideia mesmo sem ninguém mais acreditar nela." },
    { titulo: "Coach Carter: Treino para a Vida", tipo: "filme", tag: "ALINHADO", frase: "Sobre construir seu próprio padrão, em vez de aceitar o que já está posto." },
  ],
};

const POR_GRUPO: Record<Grupo, Recomendacao[]> = {
  Estrategistas: [
    { titulo: "Rápido e Devagar: Duas Formas de Pensar", tipo: "livro", tag: "Estrategistas", frase: "Um mergulho em como a mente decide, no automático e no modo devagar e analítico." },
    { titulo: "O Jogo da Imitação", tipo: "filme", tag: "Estrategistas", frase: "Uma mente estratégica resolvendo o que parecia impossível resolver." },
  ],
  Inspiradores: [
    { titulo: "O Pequeno Príncipe", tipo: "livro", tag: "Inspiradores", frase: "Um clássico sobre enxergar o essencial com o coração, não só com os olhos." },
    { titulo: "Sociedade dos Poetas Mortos", tipo: "filme", tag: "Inspiradores", frase: "Sobre inspirar e ser inspirado a enxergar a vida com outros olhos." },
  ],
  Organizadores: [
    { titulo: "O Poder do Hábito", tipo: "livro", tag: "Organizadores", frase: "Sobre como pequenas rotinas, repetidas com consistência, constroem grandes resultados." },
    { titulo: "Estrelas Além do Tempo", tipo: "filme", tag: "Organizadores", frase: "Estrutura, método e consistência levando gente longe de verdade." },
  ],
  Realizadores: [
    { titulo: "Fora de Série (Outliers)", tipo: "livro", tag: "Realizadores", frase: "Mostra que domínio não é dom: é prática, tempo e as oportunidades certas." },
    { titulo: "Billy Elliot", tipo: "filme", tag: "Realizadores", frase: "Aprender fazendo, no próprio ritmo, até virar talento de verdade." },
  ],
};

/**
 * Intercala as listas item a item (1º de cada lista, depois o 2º de cada...)
 * em vez de concatenar uma inteira atrás da outra. Como o livro é sempre o
 * primeiro item de cada lista, isso garante que o resultado final misture
 * formatos (livro, filme, série) em vez de só devolver filmes.
 */
function intercalar(listas: Recomendacao[][]): Recomendacao[] {
  const max = Math.max(...listas.map((l) => l.length));
  const resultado: Recomendacao[] = [];
  for (let i = 0; i < max; i++) {
    for (const lista of listas) {
      if (lista[i]) resultado.push(lista[i]);
    }
  }
  return resultado;
}

/** Reúne de 4 a 6 recomendações únicas, cruzando os quadrantes e o grupo do aluno. */
export function recomendacoesPara(r: Resultado): Recomendacao[] {
  const candidatas = intercalar([
    POR_CATEGORIA[r.cap1.principal] ?? [],
    POR_CATEGORIA[r.cap2.principal] ?? [],
    POR_CATEGORIA[r.cap3.principal] ?? [],
    POR_GRUPO[r.mbti.grupo],
  ]);

  const vistos = new Set<string>();
  const unicas: Recomendacao[] = [];
  for (const rec of candidatas) {
    if (vistos.has(rec.titulo)) continue;
    vistos.add(rec.titulo);
    unicas.push(rec);
  }

  return unicas.slice(0, 6);
}
