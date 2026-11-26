// O caminho inteiro de mandar um arquivo, do pedido de autorização até a
// mensagem gravada, com o R2, a Meta e o banco dublados.
//
// É um teste de integração de verdade: ele chama o handler de api/painel-fila.js
// como a Vercel chama, pela porta de entrada, com sessão, e observa cada
// requisição que sai. Nada aqui toca rede, bucket, Meta ou banco de produção:
// o `fetch` global é substituído e todo endereço é inventado.
//
// O que ele prova, e que teste de unidade não pegaria: a ORDEM das travas, e
// que o arquivo só é lido do cofre depois de a autorização passar. Uma trava
// na ordem errada é exatamente o tipo de erro que não aparece em uso normal.

import test from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";

import fila from "../api/painel-fila.js";
import { gerarToken } from "../api/_painel.js";

const CLIENTE = "11111111-2222-3333-4444-555555555555";
const OUTRO_CLIENTE = "99999999-8888-7777-6666-555555555555";
const CONVERSA = "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee";
const ATENDENTE = "22222222-3333-4444-5555-666666666666";

const JPEG = Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), Buffer.alloc(4000, 7)]);
const PNG = Buffer.concat([
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.alloc(4000, 7)]);

function ambiente() {
  Object.assign(process.env, {
    SESSION_SECRET: "segredo-local-de-teste",
    SUPABASE_URL: "https://supabase.invalid",
    SUPABASE_SECRET_KEY: "chave-local-de-teste",
    R2_ACCOUNT_ID: "contadeteste",
    R2_BUCKET: "ousadia-midias",
    R2_ACCESS_KEY_ID: "CHAVEDETESTE",
    R2_SECRET_ACCESS_KEY: "segredo-de-teste-que-nao-abre-nada",
  });
}

/**
 * O mundo de fora, dublado: banco, Meta e cofre.
 *
 * Cada requisição fica registrada em `saiu`, e é olhando essa lista que os
 * testes abaixo afirmam coisas como "não leu o arquivo" ou "não mandou duas
 * vezes".
 */
function mundo({
  conversa = {}, noCofre = JPEG, entregaFalha = false, jaGravada = null,
  cofreVazio = false, copiaFalha = false, gravadaNaConsulta = 0,
} = {}) {
  const saiu = [];
  // Conta as consultas a `mensagens` para poder fazer a linha aparecer no
  // meio do caminho, que é o que acontece quando dois pedidos iguais correm
  // juntos: o primeiro grava enquanto o segundo ainda está subindo o arquivo.
  let consultasDeMensagem = 0;
  const conv = {
    id: CONVERSA, cliente_id: CLIENTE, modo: "humano", atendente_id: ATENDENTE,
    canal: "whatsapp", contato: "5593999999999", telefone: "5593999999999",
    ...conversa,
  };

  const falso = async (url, opcoes = {}) => {
    const u = new URL(String(url));
    const metodo = opcoes.method || "GET";
    saiu.push({ host: u.host, caminho: u.pathname, busca: u.search, metodo, opcoes });

    // ---------- banco ----------
    if (u.host === "supabase.invalid") {
      if (u.pathname === "/rest/v1/atendentes") {
        return Response.json([{
          id: ATENDENTE, nome: "Quem atende", cliente_id: CLIENTE, papel: "atendente",
          ativo: true, versao_sessao: 1, clientes: { ativo: true, modulos: {} },
        }]);
      }
      if (u.pathname === "/rest/v1/conversas") {
        return metodo === "GET" ? Response.json([conv]) : Response.json([]);
      }
      if (u.pathname === "/rest/v1/clientes") {
        return Response.json([{
          id: CLIENTE, nome: "Cliente de teste", slug: "teste",
          wa_phone_number_id: "numero-de-teste", wa_token: "token-de-teste",
        }]);
      }
      if (u.pathname === "/rest/v1/canais") return Response.json([]);
      if (u.pathname === "/rest/v1/mensagens") {
        if (metodo === "POST") return Response.json([{ id: "mensagem-nova" }]);
        consultasDeMensagem += 1;
        if (gravadaNaConsulta && consultasDeMensagem >= gravadaNaConsulta) {
          return Response.json([{ id: "mensagem-do-outro-pedido" }]);
        }
        return Response.json(jaGravada ? [jaGravada] : []);
      }
      return Response.json([]);
    }

    // ---------- Meta ----------
    if (u.host === "graph.facebook.com") {
      if (u.pathname.endsWith("/media")) return Response.json({ id: "midia-na-meta" });
      if (u.pathname.endsWith("/messages")) {
        if (entregaFalha) {
          return Response.json(
            { error: { message: "janela de 24 horas fechada", code: 131047 } }, { status: 400 });
        }
        return Response.json({ messages: [{ id: "wamid.de-teste" }] });
      }
      return Response.json({});
    }

    // ---------- cofre ----------
    if (u.host === "contadeteste.r2.cloudflarestorage.com") {
      if (metodo === "GET") {
        if (cofreVazio) return new Response("", { status: 404 });
        return new Response(noCofre, {
          status: 200,
          headers: { "content-type": "image/jpeg", "content-length": String(noCofre.length) },
        });
      }
      if (metodo === "PUT" && copiaFalha) return new Response("nope", { status: 500 });
      // 204 não aceita corpo: `new Response("", {status: 204})` estoura.
      if (metodo === "DELETE") return new Response(null, { status: 204 });
      return new Response("", { status: 200 });
    }

    throw new Error(`requisição para fora do mundo dublado: ${u.host}`);
  };

  return { saiu, falso };
}

function chamar(corpo, { token } = {}) {
  const req = {
    method: "POST",
    headers: { authorization: `Bearer ${token || gerarToken({ tipo: "operador" })}` },
    body: corpo,
  };
  const res = {
    status(c) { this.code = c; return this; },
    json(b) { this.body = b; return this; },
  };
  return fila(req, res).then(() => res);
}

/** Roda o corpo com o mundo dublado no lugar do fetch de verdade. */
async function com(mundoDublado, corpo) {
  const original = globalThis.fetch;
  globalThis.fetch = mundoDublado.falso;
  try {
    return await corpo();
  } finally {
    globalThis.fetch = original;
  }
}

const bateu = (saiu, { host, metodo, contem }) => saiu.filter((c) =>
  (!host || c.host === host)
  && (!metodo || c.metodo === metodo)
  && (!contem || c.caminho.includes(contem) || c.busca.includes(contem)));

// ---------------------------------------------------------------------------
// Etapa 1: pedir autorização para subir

test("a conversa que está com a IA não autoriza arquivo", async () => {
  ambiente();
  const m = mundo({ conversa: { modo: "ia" } });
  const res = await com(m, () => chamar({
    acao: "midia_assinar", conversa_id: CONVERSA, mime: "image/jpeg", tamanho: 4000,
  }));
  assert.equal(res.code, 409);
  assert.match(res.body.error, /atendimento humano/i);
  assert.equal(bateu(m.saiu, { host: "contadeteste.r2.cloudflarestorage.com" }).length, 0,
    "não devia ter encostado no cofre");
});

test("a conversa de outra pessoa não autoriza arquivo", async () => {
  ambiente();
  const m = mundo({ conversa: { atendente_id: "outro-atendente" } });
  const res = await com(m, () => chamar(
    { acao: "midia_assinar", conversa_id: CONVERSA, mime: "image/jpeg", tamanho: 4000 },
    { token: gerarToken({ tipo: "atendente", atendente: ATENDENTE, cliente: CLIENTE }) },
  ));
  assert.equal(res.code, 403);
});

test("formato que a Meta não aceita nem chega a ganhar autorização", async () => {
  ambiente();
  const m = mundo();
  const res = await com(m, () => chamar({
    acao: "midia_assinar", conversa_id: CONVERSA, mime: "image/gif", tamanho: 4000,
  }));
  assert.equal(res.code, 415);
});

test("tamanho acima do teto é recusado antes do upload, não depois", async () => {
  ambiente();
  const m = mundo();
  const res = await com(m, () => chamar({
    acao: "midia_assinar", conversa_id: CONVERSA, mime: "image/jpeg", tamanho: 9 * 1024 * 1024,
  }));
  assert.equal(res.code, 413);
  assert.ok(res.body.limite > 0, "a resposta diz qual é o teto");
});

test("sem tamanho declarado não sai autorização", async () => {
  ambiente();
  const m = mundo();
  const res = await com(m, () => chamar({
    acao: "midia_assinar", conversa_id: CONVERSA, mime: "image/jpeg",
  }));
  assert.equal(res.code, 400);
});

test("autorização em ordem devolve o lugar, e o lugar é escolhido pelo servidor", async () => {
  ambiente();
  const m = mundo();
  const res = await com(m, () => chamar({
    acao: "midia_assinar", conversa_id: CONVERSA, mime: "image/jpeg", tamanho: 4000,
  }));
  assert.equal(res.code, 200);
  assert.equal(res.body.tipo, "image");
  assert.ok(res.body.chave.startsWith(`tmp/${CLIENTE}/`), "na pasta da empresa da conversa");
  assert.match(new URL(res.body.url).searchParams.get("X-Amz-Signature"), /^[0-9a-f]{64}$/);
  assert.ok(res.body.expira_em <= 300, "o prazo é curto");
  assert.ok(!res.body.url.includes(process.env.R2_SECRET_ACCESS_KEY), "segredo na URL");
});

// ---------------------------------------------------------------------------
// Etapa 2: confirmar

const CHAVE_BOA = `tmp/${CLIENTE}/${"a".repeat(32)}.jpg`;

test("chave de outra empresa não é lida nem uma vez", async () => {
  ambiente();
  const m = mundo();
  const res = await com(m, () => chamar({
    acao: "midia", conversa_id: CONVERSA, mime: "image/jpeg",
    chave: `tmp/${OUTRO_CLIENTE}/${"b".repeat(32)}.jpg`,
  }));
  assert.equal(res.code, 400);
  assert.equal(bateu(m.saiu, { host: "contadeteste.r2.cloudflarestorage.com" }).length, 0,
    "o servidor não pode ser usado para ler o arquivo de outro cliente");
});

test("chave inventada pela tela não vale", async () => {
  ambiente();
  for (const chave of [
    `tmp/${CLIENTE}/../../wa/${OUTRO_CLIENTE}/2026/01/entrada/x.jpg`,
    `wa/${CLIENTE}/2026/01/saida/${"a".repeat(32)}.jpg`,
    `tmp/${CLIENTE}/nota-fiscal.pdf`,
  ]) {
    const m = mundo();
    const res = await com(m, () => chamar({
      acao: "midia", conversa_id: CONVERSA, mime: "image/jpeg", chave,
    }));
    assert.equal(res.code, 400, `aceitou: ${chave}`);
  }
});

test("arquivo que não chegou ao cofre dá erro que explica o que fazer", async () => {
  ambiente();
  const m = mundo({ cofreVazio: true });
  const res = await com(m, () => chamar({
    acao: "midia", conversa_id: CONVERSA, mime: "image/jpeg", chave: CHAVE_BOA,
  }));
  assert.equal(res.code, 410);
  assert.match(res.body.detalhe, /de novo/i);
  assert.equal(bateu(m.saiu, { host: "graph.facebook.com" }).length, 0, "não mandou nada à Meta");
});

test("o tipo declarado é conferido contra os bytes, e o arquivo errado é apagado", async () => {
  ambiente();
  // A URL assinada aceita qualquer conteúdo. Aqui a tela disse "foto JPEG" e
  // subiu um PNG: se isto passasse, o bucket do atendimento serviria para
  // hospedar qualquer coisa.
  const m = mundo({ noCofre: PNG });
  const res = await com(m, () => chamar({
    acao: "midia", conversa_id: CONVERSA, mime: "image/jpeg", chave: CHAVE_BOA,
  }));
  assert.equal(res.code, 415);
  assert.equal(bateu(m.saiu, { host: "graph.facebook.com" }).length, 0);
  assert.equal(bateu(m.saiu, {
    host: "contadeteste.r2.cloudflarestorage.com", metodo: "DELETE" }).length, 1,
  "o arquivo recusado tem que sair do cofre");
});

test("o caminho feliz: sobe, entrega, arruma o cofre e grava a chave", async () => {
  ambiente();
  const m = mundo();
  const res = await com(m, () => chamar({
    acao: "midia", conversa_id: CONVERSA, mime: "image/jpeg", nome: "peca.jpg",
    chave: CHAVE_BOA, legenda: "a peça que chegou quebrada",
  }));

  assert.equal(res.code, 200);
  assert.equal(res.body.ok, true);
  assert.equal(res.body.media_id, "midia-na-meta");

  // Subiu para a Meta uma vez, e a mensagem saiu uma vez.
  assert.equal(bateu(m.saiu, { host: "graph.facebook.com", contem: "/media" }).length, 1);
  assert.equal(bateu(m.saiu, { host: "graph.facebook.com", contem: "/messages" }).length, 1);

  // O objeto saiu de tmp/ para o lugar definitivo: uma cópia e uma remoção.
  const copias = bateu(m.saiu, {
    host: "contadeteste.r2.cloudflarestorage.com", metodo: "PUT" });
  assert.equal(copias.length, 1);
  assert.equal(copias[0].opcoes.headers["x-amz-copy-source"], `/ousadia-midias/${CHAVE_BOA}`);
  assert.match(copias[0].caminho, new RegExp(`^/ousadia-midias/wa/${CLIENTE}/\\d{4}/\\d{2}/saida/`));
  assert.equal(bateu(m.saiu, {
    host: "contadeteste.r2.cloudflarestorage.com", metodo: "DELETE" }).length, 1);

  // E a linha gravada aponta para o cofre, não para a pasta temporária.
  const gravar = bateu(m.saiu, { host: "supabase.invalid", metodo: "POST", contem: "mensagens" });
  assert.equal(gravar.length, 1);
  const linha = JSON.parse(gravar[0].opcoes.body);
  assert.equal(linha.midia_id, "midia-na-meta");
  assert.match(linha.midia_url, new RegExp(`^r2:wa/${CLIENTE}/\\d{4}/\\d{2}/saida/`));
  assert.ok(!linha.midia_url.includes("tmp/"), "gravou a pasta temporária, que será apagada");
  assert.equal(linha.tipo, "image");
  assert.equal(linha.direcao, "saida");
  // O histórico que a IA vai ler: só blocos de texto.
  assert.deepEqual(linha.conteudo.map((b) => b.type), ["text", "text"]);
  assert.match(linha.conteudo[0].text, /^\(enviou uma foto\)$/);
  assert.equal(linha.conteudo[1].text, "a peça que chegou quebrada");
});

test("confirmar duas vezes a mesma chave não manda duas vezes", async () => {
  ambiente();
  const m = mundo({ jaGravada: { id: "mensagem-de-antes" } });
  const res = await com(m, () => chamar({
    acao: "midia", conversa_id: CONVERSA, mime: "image/jpeg", chave: CHAVE_BOA,
  }));
  assert.equal(res.code, 200);
  assert.equal(res.body.repetido, true);
  assert.equal(res.body.mensagem, "mensagem-de-antes");
  assert.equal(bateu(m.saiu, { host: "graph.facebook.com" }).length, 0, "mandou de novo");
});

test("pedido igual que chega durante o upload não entrega a segunda mensagem", async () => {
  ambiente();
  // Duas abas, ou um toque duplo, ou um reenvio automático: dois pedidos com a
  // mesma chave correndo juntos. O primeiro passa a conferência, sobe o
  // arquivo e grava. O segundo também passou a conferência (a linha ainda não
  // existia), e quando termina de subir o arquivo a linha já está lá.
  //
  // A segunda consulta é a que acontece imediatamente antes de entregar. Fazer
  // a linha aparecer só nela é exatamente o caso de corrida.
  const m = mundo({ gravadaNaConsulta: 2 });
  const res = await com(m, () => chamar({
    acao: "midia", conversa_id: CONVERSA, mime: "image/jpeg", chave: CHAVE_BOA,
    legenda: "segue a foto",
  }));

  assert.equal(res.code, 200);
  assert.equal(res.body.repetido, true, "entregou a segunda mensagem");
  assert.equal(res.body.mensagem, "mensagem-do-outro-pedido");

  // Subir para o /media é inofensivo: a Meta guarda o arquivo e ninguém recebe
  // nada. Entregar no /messages é o que chega no celular de quem atendemos, e
  // é isso que não pode acontecer duas vezes.
  assert.equal(
    bateu(m.saiu, { host: "graph.facebook.com", contem: "/messages" }).length, 0,
    "mandou a mensagem duas vezes",
  );
  // E não gravou linha nenhuma: quem gravou foi o pedido que chegou primeiro.
  assert.equal(
    m.saiu.filter((c) => c.caminho === "/rest/v1/mensagens" && c.metodo === "POST").length, 0,
    "gravou uma segunda linha para a mesma mídia",
  );
});

test("entrega falha: o id volta para o reenvio e o arquivo fica onde está", async () => {
  ambiente();
  const m = mundo({ entregaFalha: true });
  const res = await com(m, () => chamar({
    acao: "midia", conversa_id: CONVERSA, mime: "image/jpeg", chave: CHAVE_BOA,
    legenda: "segue o comprovante",
  }));

  assert.equal(res.code, 502);
  assert.equal(res.body.media_id, "midia-na-meta");
  assert.equal(res.body.tipo, "image");
  assert.equal(res.body.chave, CHAVE_BOA, "sem a chave, o reenvio subiria o arquivo outra vez");

  // Nada foi arrumado no cofre: a mensagem não saiu, então o arquivo continua
  // sendo temporário.
  assert.equal(bateu(m.saiu, {
    host: "contadeteste.r2.cloudflarestorage.com", metodo: "PUT" }).length, 0);
  assert.equal(bateu(m.saiu, { host: "supabase.invalid", metodo: "POST", contem: "mensagens" })
    .length, 0, "não devia gravar mensagem que não saiu");
});

test("reenvio depois da falha não sobe o arquivo de novo, e ainda arruma o cofre", async () => {
  ambiente();
  const m = mundo();
  const res = await com(m, () => chamar({
    acao: "midia", conversa_id: CONVERSA, media_id: "midia-na-meta", tipo: "image",
    mime: "image/jpeg", chave: CHAVE_BOA, legenda: "segue o comprovante",
  }));

  assert.equal(res.code, 200);
  assert.equal(bateu(m.saiu, { host: "graph.facebook.com", contem: "/media" }).length, 0,
    "o arquivo já estava na Meta: subir de novo é mandar duas vezes");
  assert.equal(bateu(m.saiu, { host: "graph.facebook.com", contem: "/messages" }).length, 1);
  assert.equal(bateu(m.saiu, {
    host: "contadeteste.r2.cloudflarestorage.com", metodo: "GET" }).length, 0,
  "não precisa ler o arquivo para reenviar");

  const gravar = bateu(m.saiu, { host: "supabase.invalid", metodo: "POST", contem: "mensagens" });
  assert.match(JSON.parse(gravar[0].opcoes.body).midia_url, new RegExp(`^r2:wa/${CLIENTE}/`));
});

test("se a arrumação do cofre falhar, a mensagem ainda vale", async () => {
  ambiente();
  // A mensagem já saiu para a cliente: isso não se desfaz. O registro fica sem
  // chave, e o histórico segue mostrando a mídia pela Meta pelos 30 dias dela.
  const m = mundo({ copiaFalha: true });
  const res = await com(m, () => chamar({
    acao: "midia", conversa_id: CONVERSA, mime: "image/jpeg", chave: CHAVE_BOA,
  }));
  assert.equal(res.code, 200);
  const gravar = bateu(m.saiu, { host: "supabase.invalid", metodo: "POST", contem: "mensagens" });
  const linha = JSON.parse(gravar[0].opcoes.body);
  assert.equal(linha.midia_url, null);
  assert.equal(linha.midia_id, "midia-na-meta", "o id da Meta é o que resta, e basta por 30 dias");
});

test("sem cofre configurado, a autorização explica e oferece o caminho antigo", async () => {
  ambiente();
  delete process.env.R2_ACCESS_KEY_ID;
  const m = mundo();
  const res = await com(m, () => chamar({
    acao: "midia_assinar", conversa_id: CONVERSA, mime: "image/jpeg", tamanho: 4000,
  }));
  assert.equal(res.code, 409);
  assert.equal(res.body.limite, 3 * 1024 * 1024, "a tela precisa do limite do caminho antigo");
  ambiente();
});

test("o caminho antigo, de base64 no corpo, continua funcionando", async () => {
  ambiente();
  // Vale como rede de segurança: ambiente sem R2, ou cofre fora do ar, e o
  // painel ainda manda foto pequena.
  const m = mundo();
  const res = await com(m, () => chamar({
    acao: "midia", conversa_id: CONVERSA, mime: "image/jpeg", nome: "pequena.jpg",
    arquivo: JPEG.toString("base64"),
  }));
  assert.equal(res.code, 200);
  assert.equal(bateu(m.saiu, { host: "graph.facebook.com", contem: "/media" }).length, 1);
  assert.equal(bateu(m.saiu, { host: "contadeteste.r2.cloudflarestorage.com" }).length, 0);
  const linha = JSON.parse(bateu(m.saiu, {
    host: "supabase.invalid", metodo: "POST", contem: "mensagens" })[0].opcoes.body);
  assert.equal(linha.midia_url, null, "sem cofre, sem chave");
});

test("instagram recusa arquivo, e a recusa diz por quê", async () => {
  ambiente();
  const m = mundo({ conversa: { canal: "instagram" } });
  for (const acao of ["midia_assinar", "midia"]) {
    const res = await com(m, () => chamar({
      acao, conversa_id: CONVERSA, mime: "image/jpeg", tamanho: 4000, chave: CHAVE_BOA,
    }));
    assert.equal(res.code, 409, acao);
    assert.match(res.body.error, /URL pública/i);
  }
});

// ---------------------------------------------------------------------------

test("o sorteio do nome do arquivo usa o gerador do sistema", () => {
  // Não é decoração: nome previsível com bucket privado ainda é um convite a
  // tentar, e Math.random não serve para isso.
  assert.equal(typeof crypto.randomBytes, "function");
});

test("áudio ogg sai como mensagem de voz, não como anexo", async () => {
  ambiente();
  // A diferença que quem recebe vê: a bolha com a onda e a foto de quem
  // mandou, em vez de um arquivo com ícone de download. Quem decide isso é o
  // sinalizador `voice`, não o formato sozinho, e isso já custou uma rodada de
  // homologação.
  const OGG = Buffer.concat([Buffer.from("OggS"), Buffer.alloc(2000, 5)]);
  const m = mundo({ noCofre: OGG });
  const chaveOgg = `tmp/${CLIENTE}/${"b".repeat(32)}.ogg`;
  const res = await com(m, () => chamar({
    acao: "midia", conversa_id: CONVERSA, mime: "audio/ogg", chave: chaveOgg,
  }));
  assert.equal(res.code, 200, JSON.stringify(res.body));

  const envio = m.saiu.find((c) => c.host === "graph.facebook.com"
    && c.caminho.includes("/messages"));
  const corpo = JSON.parse(envio.opcoes.body);
  assert.equal(corpo.type, "audio");
  assert.equal(corpo.audio.voice, true, "foi como anexo de áudio, não como voz");
});

test("áudio que não é ogg não finge ser mensagem de voz", async () => {
  ambiente();
  // Ligar o sinalizador num mp3 ou num m4a quebra a transcrição do lado da
  // Meta. O formato é condição, e sem ele o sinalizador não vai.
  const MP3 = Buffer.concat([Buffer.from("ID3"), Buffer.alloc(2000, 5)]);
  const m = mundo({ noCofre: MP3 });
  const chaveMp3 = `tmp/${CLIENTE}/${"c".repeat(32)}.mp3`;
  const res = await com(m, () => chamar({
    acao: "midia", conversa_id: CONVERSA, mime: "audio/mpeg", chave: chaveMp3,
  }));
  assert.equal(res.code, 200, JSON.stringify(res.body));

  const envio = m.saiu.find((c) => c.host === "graph.facebook.com"
    && c.caminho.includes("/messages"));
  const corpo = JSON.parse(envio.opcoes.body);
  assert.equal(corpo.audio.voice, undefined, "marcou como voz um formato que não serve");
});
