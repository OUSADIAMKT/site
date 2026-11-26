// A parte de servidor do compositor: impressão digital, conferência de
// aprovação e saneamento das configurações.
//
// Separado do `_pagina.js` porque isto usa node:crypto e o outro é importado
// pelo navegador. A divisão não é estética: um import de node:crypto no painel
// quebra o build do Vite.

import crypto from "node:crypto";
import { serializar, slugValido, montarPublicacao } from "./_pagina.js";

/**
 * A impressão digital do conteúdo de uma versão.
 *
 * É o que liga "isto foi aprovado na prévia" a "isto foi publicado". O painel
 * nunca calcula: ele recebe a impressão do servidor na hora de aprovar e a
 * devolve na hora de publicar. Quem compara é sempre o servidor, recalculando
 * do conteúdo gravado, porque uma impressão que o cliente escolhe não prova
 * nada.
 */
export function impressao(conteudo) {
  return `sha256-${crypto.createHash("sha256").update(serializar(conteudo), "utf8").digest("hex")}`;
}

// As configurações que existem. Lista fechada de propósito: o que chega do
// painel vai para dentro do documento publicado, e campo livre em `jsonb` que
// é injetado em HTML é como nasce injeção de script numa página de cliente.
//
// `robots` é booleano e começa `true`: landing page existe para ser achada.
// `pixel_meta` e `ga4` são identificadores, não trechos de código: é o
// montador que escreve o snippet, e por isso a pessoa não consegue colar um
// script arbitrário por aqui.
export function sanearConfiguracoes(bruto = {}) {
  const texto = (valor, limite) => {
    const t = String(valor ?? "").trim();
    return t ? t.slice(0, limite) : null;
  };

  return {
    titulo: texto(bruto.titulo, 200),
    descricao: texto(bruto.descricao, 400),
    idioma: /^[a-zA-Z]{2}(-[a-zA-Z]{2})?$/.test(String(bruto.idioma || "")) ? bruto.idioma : "pt-BR",
    pixel_meta: texto(String(bruto.pixel_meta ?? "").replace(/[^0-9]/g, ""), 32),
    ga4: texto(String(bruto.ga4 ?? "").replace(/[^A-Za-z0-9-]/g, ""), 32),
    whatsapp: texto(String(bruto.whatsapp ?? "").replace(/[^0-9+]/g, ""), 20),
    formulario_url: urlSegura(bruto.formulario_url),
    confirmacao_url: urlSegura(bruto.confirmacao_url),
    robots: bruto.robots !== false,
  };
}

// Só http e https. `javascript:` num endereço que vai para dentro da página é
// script com outro nome.
function urlSegura(valor) {
  const t = String(valor ?? "").trim();
  if (!t) return null;
  try {
    const u = new URL(t);
    return u.protocol === "http:" || u.protocol === "https:" ? u.toString().slice(0, 500) : null;
  } catch {
    return null;
  }
}

// O limite de tamanho de cada arquivo. Um HTML de landing page com tudo
// embutido chega fácil a algumas centenas de KB; 2 MB por arquivo é folgado e
// ainda cabe numa linha de Postgres sem virar problema.
export const LIMITE_ARQUIVO = 2 * 1024 * 1024;

export function conferirConteudo({ html, css, js }) {
  for (const [nome, valor] of [["HTML", html], ["CSS", css], ["JS", js]]) {
    if (valor != null && typeof valor !== "string") {
      return `O ${nome} tem que ser texto.`;
    }
    if (String(valor || "").length > LIMITE_ARQUIVO) {
      return `O ${nome} passou de 2 MB. Separe o que é imagem e sirva por link.`;
    }
  }
  return null;
}

export function conferirSlug(slug) {
  if (!slugValido(slug)) {
    return "O apelido aceita letras minúsculas, números e hífen, e não pode começar nem terminar com hífen.";
  }
  return null;
}

/**
 * A conferência que impede publicar algo diferente do que foi aprovado.
 *
 * Três perguntas, todas feitas sobre a linha do banco e nenhuma sobre o que o
 * painel mandou:
 *
 *   1. A versão é desta página?
 *   2. Ela foi aprovada na prévia?
 *   3. O conteúdo gravado ainda bate com a impressão gravada, e com a
 *      impressão que quem publica diz ter aprovado?
 *
 * A terceira pergunta parece redundante e não é. A impressão gravada pega
 * conteúdo alterado no banco por fora. A impressão enviada pega o caso real:
 * duas abas abertas, uma aprova a versão 8, a outra tenta publicar a 7 que
 * ela ainda tem na tela.
 */
export function conferirAprovacao({ pagina, versao, impressaoEnviada }) {
  if (!versao) return { erro: "Essa versão não existe.", status: 404 };
  if (versao.pagina_id !== pagina.id) {
    return { erro: "Essa versão é de outra página.", status: 400 };
  }
  if (!versao.aprovada_em) {
    return {
      erro: "Essa versão não passou pela prévia. Abra a prévia, confira a página e aprove antes de publicar.",
      status: 409,
    };
  }

  const agora = impressao(versao);
  if (agora !== versao.impressao) {
    return {
      erro: "O conteúdo desta versão mudou depois de aprovado. Aprove de novo na prévia.",
      status: 409,
    };
  }
  if (impressaoEnviada && impressaoEnviada !== versao.impressao) {
    return {
      erro: "A versão aprovada na sua tela não é a mais recente. Recarregue, confira a prévia e aprove de novo.",
      status: 409,
    };
  }
  return { ok: true, impressao: agora };
}

/**
 * A conferência de "o que está no ar é o que a prévia mostrou".
 *
 * Quem publica manda o conteúdo que a prévia está renderizando NESTE momento,
 * capturado no instante em que o iframe recebeu o documento. O servidor
 * compara com o rascunho gravado, que é o que o salvamento automático mantém
 * igual ao editor.
 *
 * Quando os dois batem, publicar é publicar o que a pessoa viu. Quando não
 * batem, é porque alguém digitou depois da prévia ter sido montada, e aí a
 * publicação é recusada em vez de ir ao ar um texto que ninguém olhou. O
 * caminho de volta é curto: a prévia remonta sozinha em menos de um segundo.
 */
export function conferirCorrespondencia({ rascunho, previa }) {
  const daPrevia = impressao(previa);
  const doRascunho = impressao(rascunho);
  if (daPrevia !== doRascunho) {
    return {
      erro: "O editor mudou depois que a prévia foi montada. A prévia já está remontando: confira a página e publique de novo.",
      status: 409,
      previa: daPrevia,
      rascunho: doRascunho,
    };
  }
  return { ok: true, impressao: daPrevia };
}

/** Os bytes que vão para o ar, a partir da versão aprovada. */
export function bytesDaPublicacao(versao, paginaId) {
  return montarPublicacao({
    html: versao.html,
    css: versao.css,
    js: versao.js,
    configuracoes: versao.configuracoes,
    // Fora da impressão digital de propósito: a impressão é do CONTEÚDO que a
    // pessoa aprovou na prévia, e o identificador da página não é conteúdo.
    // Ver `serializar`, que lista o que entra na conta.
    pagina_id: paginaId,
  });
}
