// A etiqueta que a IA escreve, antes de virar linha no banco.
//
// Existe porque `atualizar_lead` recebe texto livre do modelo e gravava esse
// texto como veio. O resultado foi "Black da Mentoria OM" em 44 conversas e
// "black da mentoria om" em 21: a mesma campanha, duas etiquetas, e um filtro
// que mostra metade. O modelo não erra por capricho, ele erra porque ninguém
// lhe deu a lista; dar a lista é o trabalho deste arquivo.
//
// A regra, em uma frase: toda etiqueta passa por uma chave achatada, a chave
// procura a etiqueta conhecida do cliente, e só quando não há nenhuma parecida
// é que nasce uma etiqueta nova.
//
// A chave é para COMPARAR, a etiqueta é para LER. "reposição" compara como
// "reposicao" e aparece na tela com o cedilha no lugar, porque tirar acento do
// que a equipe lê seria consertar o filtro estragando a tela.

import { db } from "./_db.js";

/** Teto por conversa. O mesmo 20 do `limparEtiquetas` do CRM. */
const MAX_POR_CONVERSA = 20;
/** Teto de uma etiqueta. Acima disso é frase, não etiqueta. */
const MAX_LETRAS = 40;
/**
 * Quantas etiquetas novas uma só chamada pode criar.
 *
 * Duas. Um modelo empolgado manda seis marcadores de uma vez e a lista do
 * cliente vira o próprio texto livre de novo, só que agora com carimbo de
 * oficial. As que passarem do teto são descartadas em silêncio: a informação
 * está na conversa, e a conversa é onde ela deveria estar.
 */
const MAX_NOVAS_POR_CHAMADA = 2;

/** Sem acento, sem maiúscula, pontuação virando espaço. Igual à do banco. */
export function chave(texto) {
  return String(texto || "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/** A forma que vai para a tela: sem sobra de espaço, minúscula, com acento. */
function paraTela(texto) {
  return String(texto || "").trim().replace(/\s+/g, " ").toLowerCase().slice(0, MAX_LETRAS);
}

/** Distância de edição, com corte: acima de `teto` não interessa quanto é. */
function distancia(a, b, teto) {
  if (Math.abs(a.length - b.length) > teto) return teto + 1;
  let linha = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    let anterior = linha[0];
    linha[0] = i;
    let menor = i;
    for (let j = 1; j <= b.length; j++) {
      const troca = anterior + (a[i - 1] === b[j - 1] ? 0 : 1);
      anterior = linha[j];
      linha[j] = Math.min(linha[j] + 1, linha[j - 1] + 1, troca);
      if (linha[j] < menor) menor = linha[j];
    }
    if (menor > teto) return teto + 1;
  }
  return linha[b.length];
}

/**
 * Duas chaves são a mesma coisa escrita diferente?
 *
 * Três testes, do mais seguro para o mais solto:
 *
 *   1. Uma começa pela outra, em borda de palavra. Pega "indicacao jaqueline
 *      massaro" caindo em "indicacao", e não pega "matricula" caindo em "clubinho".
 *   2. Todas as palavras de uma estão na outra. Pega "black mentoria om" e
 *      "black da mentoria om", que a distância de edição não pegaria.
 *   3. Erro de digitação: no máximo uma letra a cada oito, e nunca em etiqueta
 *      curta, onde uma letra trocada já muda o sentido ("lead" e "lida").
 */
function parecidas(a, b) {
  if (!a || !b) return false;
  if (a === b) return true;

  if (a.startsWith(`${b} `) || b.startsWith(`${a} `)) return true;

  const pa = a.split(" ").filter(Boolean);
  const pb = b.split(" ").filter(Boolean);
  if (pa.length && pb.length) {
    const curta = pa.length <= pb.length ? pa : pb;
    const longa = curta === pa ? pb : pa;
    // "do", "de", "da" não contam: são o que separa "veio do disparo" de
    // "veio de disparo", e essas duas são a mesma etiqueta.
    const uteis = curta.filter((p) => !["do", "de", "da", "em", "no", "na", "o", "a"].includes(p));
    // Duas palavras no mínimo, e aqui está o porquê: com uma só, `mentoria`
    // engoliria "black da mentoria om 2026", porque a palavra está lá dentro.
    // Etiqueta de uma palavra casa por igualdade, por apelido ou por erro de
    // digitação, nunca por estar contida em outra.
    if (uteis.length >= 2 && uteis.every((p) => longa.includes(p))) return true;
  }

  const menor = Math.min(a.length, b.length);
  if (menor < 8) return false;
  const teto = Math.floor(menor / 8);
  return teto > 0 && distancia(a, b, teto) <= teto;
}

/**
 * A lista conhecida do cliente, como mapa de chave -> etiqueta canônica.
 *
 * Devolve também as linhas inteiras, porque quem vai criar uma etiqueta nova
 * precisa comparar contra as canônicas, não contra os apelidos: apelido é
 * atalho conhecido, e parecer com um atalho não é motivo para virar ele.
 */
export async function listaConhecida(sb, clienteId) {
  const { data, error } = await (sb || db())
    .from("etiquetas_conhecidas")
    .select("etiqueta, chave, apelidos")
    .eq("cliente_id", clienteId);

  if (error) {
    // Sem lista, o comportamento é o de antes: normaliza o texto e grava.
    // Nunca derruba uma ferramenta da IA por causa de uma etiqueta.
    console.error("[etiquetas] lista:", error.message);
    return null;
  }

  const porChave = new Map();
  for (const linha of data || []) {
    porChave.set(linha.chave, linha.etiqueta);
    for (const apelido of linha.apelidos || []) porChave.set(chave(apelido), linha.etiqueta);
  }
  // Da mais específica para a mais genérica. Quem decide empate é o
  // comprimento: "pedido muito atrasado" tem que encontrar "pedido atrasado"
  // antes de encontrar "pedido".
  const canonicas = (data || [])
    .map((l) => ({ etiqueta: l.etiqueta, chave: l.chave }))
    .sort((x, y) => y.chave.length - x.chave.length);

  return { porChave, canonicas };
}

/**
 * Passa as etiquetas pela lista do cliente e devolve as canônicas.
 *
 * `brutas` é o que o modelo escreveu. `atuais` é o que já está na conversa, e
 * entra junto porque conversa antiga pode ter etiqueta de antes da lista.
 *
 * O que não bate com nada vira etiqueta nova na lista do cliente, com
 * `origem: 'ia'`. É de propósito: a lista nasce com 17 nomes e a empresa vai
 * descobrir o décimo oitavo em alguma conversa de terça-feira. O que não pode
 * é a décima oitava nascer três vezes com três grafias, e é disso que o
 * `parecidas` cuida.
 */
export async function canonizar(sb, clienteId, brutas, atuais = []) {
  const base = sb || db();
  const conhecida = clienteId ? await listaConhecida(base, clienteId) : null;

  const saida = new Map(); // chave -> etiqueta, para não repetir
  const novas = [];

  const guardar = (etiqueta) => {
    const k = chave(etiqueta);
    if (k && !saida.has(k)) saida.set(k, etiqueta);
  };

  for (const bruta of [...(atuais || []), ...(brutas || [])]) {
    const limpa = paraTela(bruta);
    const k = chave(limpa);
    if (!k) continue;

    if (!conhecida) {
      // Sem lista: ao menos a caixa e o espaço saem padronizados.
      guardar(limpa);
      continue;
    }

    const exata = conhecida.porChave.get(k);
    if (exata) {
      guardar(exata);
      continue;
    }

    const perto = conhecida.canonicas.find((c) => parecidas(k, c.chave));
    if (perto) {
      guardar(perto.etiqueta);
      continue;
    }

    // Nem igual nem parecida: é etiqueta nova. Pode ter nascido nesta mesma
    // chamada, então a lista de novas também entra na comparação.
    const jaNesta = novas.find((n) => n.chave === k || parecidas(k, n.chave));
    if (jaNesta) {
      guardar(jaNesta.etiqueta);
      continue;
    }
    if (novas.length >= MAX_NOVAS_POR_CHAMADA) continue;

    novas.push({ etiqueta: limpa, chave: k });
    guardar(limpa);
  }

  if (conhecida && novas.length) {
    const { error } = await base.from("etiquetas_conhecidas").insert(
      novas.map((n) => ({ cliente_id: clienteId, etiqueta: n.etiqueta, chave: n.chave, origem: "ia" }))
    );
    // Chave repetida é corrida de duas mensagens ao mesmo tempo, não erro:
    // a etiqueta já está lá e é a mesma. Qualquer outro erro vale um log, e
    // a conversa segue etiquetada do mesmo jeito.
    if (error && error.code !== "23505") console.error("[etiquetas] nova:", error.message);
  }

  return {
    etiquetas: [...saida.values()].slice(0, MAX_POR_CONVERSA),
    novas: novas.map((n) => n.etiqueta),
  };
}
