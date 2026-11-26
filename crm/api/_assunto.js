// De que a conversa trata, decidido no código e não no prompt.
//
// Existe porque regra escrita só no prompt falha: a IA lê "matrícula é com a
// Lia" e ainda assim entrega para outra pessoa. Etiqueta e fila são coisas
// que a equipe audita depois, então saem de uma função que dá sempre a mesma
// resposta para o mesmo texto.
//
// Três assuntos, que são os três atendimentos da Ousadia:
//   matricula -> quer entrar na escola, numa mentoria, curso ou turma.
//   suporte   -> já é aluno: acesso, aula, certificado, nota, reembolso.
//   agencia   -> empresa querendo contratar a agência (redes, tráfego, conteúdo).
//
// `agencia` é a Ousadia vendendo serviço, não curso: quem chega perguntando
// isso é uma empresa que quer terceirizar o marketing, não alguém que quer
// aprender.

import { canonizar, chave } from "./_etiquetas.js";

/**
 * Os assuntos que existem. Exportado porque as frentes precisam validar o que
 * recebem contra esta lista, e duas listas iguais em arquivos diferentes viram
 * duas listas diferentes na primeira vez que alguém mexe numa delas.
 */
export const ASSUNTOS = ["matricula", "suporte", "agencia"];

/** Sem acento, sem maiúscula, pontuação virando espaço, com borda nas pontas. */
function achatar(texto) {
  return ` ${String(texto || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()} `;
}

const MATRICULA = [
  "matricula", "matricular", "me matricular", "inscricao", "inscrever", "me inscrever",
  "escola", "curso", "cursos", "mentoria", "mentorias", "turma", "turmas", "vaga", "vagas",
  "quanto custa", "valor do curso", "preco", "parcelar", "parcelamento", "pix",
  "quero entrar", "quero participar", "como faco para entrar", "proxima turma",
  "aulao", "metodo satoyiro", "satoyiro", "viver do digital", "ugc", "momento ugc",
  "mapa do ugc", "comunidade",
];

// Já é aluno. Ganha da matrícula quando aparece junto: "nao consigo acessar a
// mentoria" é problema de acesso, não venda.
const SUPORTE_FORTE = [
  "acesso", "acessar", "nao consigo acessar", "nao consigo entrar", "login", "senha",
  "esqueci a senha", "area de membros", "plataforma de aulas", "aula nao abre",
  "certificado", "nota fiscal", "nf", "boleto", "segunda via",
  "cancelar", "cancelamento", "reembolso", "estorno", "garantia",
  "ja sou aluno", "ja sou aluna", "sou aluno", "sou aluna", "minha turma",
];

const SUPORTE_FRACO = ["aula", "aulas", "modulo", "modulos", "comprei", "paguei"];

// Empresa querendo contratar a agência. Ganha da matrícula: quem fala em
// cuidar das redes da empresa dela não quer aprender, quer contratar.
//
// Nenhum termo solto demais aqui. "redes" sozinho aparece em pergunta de curso
// o dia inteiro ("o curso ensina redes sociais?"), então o que entra na lista
// é sempre o pedido de serviço: GESTAO de redes, cuidar das MINHAS redes.
const AGENCIA = [
  "agencia", "contratar a agencia", "servico de agencia",
  "gestao de redes", "gestao de redes sociais", "gestao de trafego", "trafego pago",
  "social media para minha empresa", "cuidar das minhas redes", "cuidar das redes da empresa",
  "cuidar do instagram da empresa", "gerenciar minhas redes", "gerenciar o instagram",
  "orcamento", "proposta comercial", "para minha empresa", "para a minha empresa",
  "terceirizar o marketing", "terceirizar marketing", "producao de conteudo",
];

function bate(alvo, lista) {
  return lista.some((termo) => {
    const t = achatar(termo).trim();
    return t && alvo.includes(` ${t} `);
  });
}

/**
 * O assunto da mensagem, ou null quando não dá para dizer.
 *
 * Nunca devolve um assunto por dúvida: conversa sem assunto claro segue o
 * caminho de hoje, que é a fila por carga.
 */
export function assuntoDaMensagem(texto) {
  const alvo = achatar(texto);
  if (alvo.trim().length < 2) return null;

  const matricula = bate(alvo, MATRICULA);
  const forte = bate(alvo, SUPORTE_FORTE);
  const fraco = bate(alvo, SUPORTE_FRACO);
  const agencia = bate(alvo, AGENCIA);

  // Ordem, e o porquê de cada degrau. Suporte vem primeiro: quem já é aluno e
  // está sem acesso precisa de ajuda agora, mesmo que a conversa fale em
  // mentoria. Agência vem antes de matrícula porque "quero contratar a gestão
  // de redes, vocês têm curso também?" bate nas duas listas e é agência.
  if (forte) return "suporte";
  if (agencia) return "agencia";
  if (matricula) return "matricula";
  if (fraco) return "suporte";
  return null;
}

/**
 * As etiquetas que o assunto carrega.
 *
 * `matricula` vira duas: `lead`, porque quem pergunta de curso ainda não
 * comprou e é isso que a tela de CRM precisa contar, e `matricula`, que é a
 * etiqueta por onde a equipe comercial filtra o que é dela.
 */
export function etiquetasDoAssunto(assunto) {
  if (assunto === "matricula") return ["lead", "matricula"];
  if (assunto === "suporte") return ["suporte"];
  // Mesma lógica da matrícula: quem pergunta de agência ainda não contratou,
  // e `lead` é o que o CRM conta.
  if (assunto === "agencia") return ["lead", "agencia"];
  return [];
}

/**
 * Lê a mensagem, etiqueta a conversa e devolve o assunto para quem for
 * transferir depois.
 *
 * Escreve uma vez só: se as etiquetas já estão lá, não toca no banco. Quem
 * chama ignora o erro, porque isto nunca pode segurar a resposta da pessoa.
 */
export async function marcarAssunto(sb, conversa, texto) {
  if (!conversa?.id) return null;
  const assunto = assuntoDaMensagem(texto);
  if (!assunto) return null;

  const novas = etiquetasDoAssunto(assunto);
  // A comparação é por chave, não por minúscula: `chave` tira acento e
  // pontuação também, e é a mesma regra que a lista conhecida usa.
  const atuais = conversa.etiquetas || [];
  const jaTem = new Set(atuais.map(chave));
  const faltando = novas.filter((e) => !jaTem.has(chave(e)));
  if (!faltando.length) return assunto;

  // Antes aqui havia um `toLowerCase()` em cima do que a conversa já tinha, e
  // a gravação ia direto para o banco, sem passar pela lista do cliente. Numa
  // lista canônica com maiúscula isso reescrevia a etiqueta da empresa a cada
  // mensagem de texto que chega, que é o caminho mais quente do sistema.
  const { etiquetas: juntas } = await canonizar(sb, conversa.cliente_id, faltando, atuais);
  const { error } = await sb.from("conversas")
    .update({ etiquetas: juntas }).eq("id", conversa.id);
  if (error) {
    console.error("[assunto] etiqueta:", error.message);
    return assunto;
  }

  conversa.etiquetas = juntas;
  console.log(`[assunto] conversa ${conversa.id}: ${assunto} (+${faltando.join(", ")})`);
  return assunto;
}

/** O assunto já etiquetado na conversa, para quem não tem o texto na mão. */
export function assuntoDaConversa(conversa) {
  // Por chave: a etiqueta pode estar gravada como "Agência" e continuar
  // sendo o assunto `agencia`.
  const tags = new Set((conversa?.etiquetas || []).map(chave));
  if (tags.has("matricula")) return "matricula";
  if (tags.has("suporte")) return "suporte";
  if (tags.has("agencia")) return "agencia";
  return null;
}
