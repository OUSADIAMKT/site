// O cofre: nomes de objeto, portas de autorização e conferência de bytes.
//
// A assinatura em si está em test/sigv4.test.js, contra os vetores da AWS.
// Aqui ficam as regras que o briefing pede e que são nossas: separar por
// empresa, nome impossível de adivinhar, bucket privado, e nada que venha do
// navegador virando caminho de arquivo.
//
// As credenciais abaixo são inventadas e não abrem nada. Nenhum teste deste
// arquivo toca a rede.

import test from "node:test";
import assert from "node:assert/strict";

import {
  r2Ligado, r2Config, urlDeEnvio,
  chaveTemporaria, chavePermanente, chaveTemporariaDoCliente,
  paraBanco, chaveDoBanco, extensaoDoMime, bytesCombinam,
} from "../api/_r2.js";

const CLIENTE = "11111111-2222-3333-4444-555555555555";
const OUTRO = "99999999-8888-7777-6666-555555555555";

const FALSAS = {
  R2_ACCOUNT_ID: "contadeteste",
  R2_BUCKET: "ousadia-midias",
  R2_ACCESS_KEY_ID: "CHAVEDETESTE",
  R2_SECRET_ACCESS_KEY: "segredodeteste-nao-serve-para-nada",
};

function comCredenciais(corpo) {
  const antes = {};
  for (const [k, v] of Object.entries(FALSAS)) {
    antes[k] = process.env[k];
    process.env[k] = v;
  }
  try {
    return corpo();
  } finally {
    for (const [k, v] of Object.entries(antes)) {
      if (v === undefined) delete process.env[k];
      else process.env[k] = v;
    }
  }
}

// ---------------------------------------------------------------------------
// Ligar e desligar

test("sem configuração o cofre fica desligado em vez de quebrar", () => {
  // É o que mantém o painel funcionando num ambiente sem R2: ele volta ao
  // caminho antigo, de 3 MB pelo corpo da função, em vez de parar de mandar
  // arquivo.
  for (const chave of Object.keys(FALSAS)) delete process.env[chave];
  assert.equal(r2Ligado(), false);
  assert.equal(r2Config(), null);
  assert.throws(() => urlDeEnvio({ chave: "tmp/x/y.jpg" }), /não configurado/i);
});

test("faltando uma variável só, continua desligado", () => {
  comCredenciais(() => {
    delete process.env.R2_SECRET_ACCESS_KEY;
    assert.equal(r2Ligado(), false, "meia configuração é configuração nenhuma");
  });
});

test("o endereço do bucket sai da conta, e pode ser trocado por um próprio", () => {
  comCredenciais(() => {
    assert.equal(r2Config().host, "contadeteste.r2.cloudflarestorage.com");
    process.env.R2_ENDPOINT = "https://arquivos.exemplo.com/";
    assert.equal(r2Config().host, "arquivos.exemplo.com", "sem protocolo e sem barra no fim");
    delete process.env.R2_ENDPOINT;
  });
});

// ---------------------------------------------------------------------------
// Os nomes dos objetos

test("o arquivo de cada empresa mora na pasta dela", () => {
  const minha = chaveTemporaria({ clienteId: CLIENTE, mime: "image/jpeg" });
  const outra = chaveTemporaria({ clienteId: OUTRO, mime: "image/jpeg" });
  assert.ok(minha.startsWith(`tmp/${CLIENTE}/`));
  assert.ok(outra.startsWith(`tmp/${OUTRO}/`));
  assert.ok(minha.endsWith(".jpg"));
});

test("dois arquivos nunca ganham o mesmo nome, e nenhum é adivinhável", () => {
  const nomes = new Set();
  for (let i = 0; i < 200; i++) {
    nomes.add(chaveTemporaria({ clienteId: CLIENTE, mime: "image/png" }));
  }
  assert.equal(nomes.size, 200, "sorteio repetiu");
  const sorteado = [...nomes][0].split("/").pop().split(".")[0];
  assert.match(sorteado, /^[0-9a-f]{32}$/, "128 bits em hexadecimal");
});

test("o nome definitivo separa por empresa, mês e direção", () => {
  const chave = chavePermanente({
    clienteId: CLIENTE, mime: "audio/ogg", direcao: "entrada",
    quando: new Date("2026-03-09T12:00:00Z"),
  });
  assert.match(chave, new RegExp(`^wa/${CLIENTE}/2026/03/entrada/[0-9a-f]{32}\\.ogg$`));

  const saida = chavePermanente({ clienteId: CLIENTE, mime: "video/mp4", direcao: "saida" });
  assert.ok(saida.includes("/saida/"));
  assert.ok(saida.endsWith(".mp4"));
});

test("identificador de cliente estranho não vira pedaço de caminho", () => {
  // Sem esta trava, um id com barras escreve onde quiser dentro do bucket.
  for (const ruim of ["../outro", "tmp/x", "", null, "a".repeat(100), "c/../.."]) {
    assert.throws(() => chaveTemporaria({ clienteId: ruim, mime: "image/jpeg" }),
      /inválido/i, `passou: ${JSON.stringify(ruim)}`);
  }
});

test("mime desconhecido ainda ganha um nome, com extensão neutra", () => {
  assert.equal(extensaoDoMime("application/vnd.ms-excel"), "bin");
  assert.equal(extensaoDoMime(""), "bin");
  assert.equal(extensaoDoMime("AUDIO/OGG; codecs=opus"), "ogg");
});

// ---------------------------------------------------------------------------
// A porta: o que a tela pode dizer sobre um objeto

test("a tela só fala de arquivo que ela subiu, na pasta da própria empresa", () => {
  const minha = chaveTemporaria({ clienteId: CLIENTE, mime: "image/jpeg" });
  assert.equal(chaveTemporariaDoCliente(minha, CLIENTE), minha);

  // A mesma chave, pedida por outra empresa: não.
  assert.equal(chaveTemporariaDoCliente(minha, OUTRO), null,
    "uma sessão não pode ler o arquivo de outro cliente pelo nosso servidor");
});

test("chave torta não passa de jeito nenhum", () => {
  const tortas = [
    `tmp/${CLIENTE}/../../wa/${OUTRO}/2026/01/entrada/abc.jpg`,
    `tmp/${CLIENTE}/../${OUTRO}/aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa.jpg`,
    `wa/${CLIENTE}/2026/01/saida/aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa.jpg`,
    `tmp/${CLIENTE}/sub/pasta/aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa.jpg`,
    `tmp/${CLIENTE}/nome-escolhido-por-mim.jpg`,
    `tmp/${CLIENTE}/AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA.jpg`,
    `tmp/${CLIENTE}/aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa.jpeg2000`,
    `tmp/${CLIENTE}/aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa`,
    "", null, undefined, "tmp//aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa.jpg",
  ];
  for (const torta of tortas) {
    assert.equal(chaveTemporariaDoCliente(torta, CLIENTE), null, `passou: ${torta}`);
  }
});

test("chave definitiva não é aceita pela tela, mesmo sendo da empresa certa", () => {
  // O caminho de confirmação só mexe em arquivo temporário. Aceitar chave
  // definitiva deixaria alguém remandar mídia antiga de outra conversa.
  const definitiva = chavePermanente({ clienteId: CLIENTE, mime: "image/jpeg" });
  assert.equal(chaveTemporariaDoCliente(definitiva, CLIENTE), null);
});

// ---------------------------------------------------------------------------
// A URL pré-assinada

test("a URL de envio é privada, curta e completa", () => {
  comCredenciais(() => {
    const chave = chaveTemporaria({ clienteId: CLIENTE, mime: "image/jpeg" });
    const { url, expira_em } = urlDeEnvio({ chave, segundos: 300 });
    const u = new URL(url);

    assert.equal(u.host, "contadeteste.r2.cloudflarestorage.com");
    assert.equal(u.pathname, `/ousadia-midias/${chave}`);
    assert.equal(expira_em, 300);

    assert.equal(u.searchParams.get("X-Amz-Algorithm"), "AWS4-HMAC-SHA256");
    assert.equal(u.searchParams.get("X-Amz-Expires"), "300");
    assert.equal(u.searchParams.get("X-Amz-SignedHeaders"), "host");
    assert.match(u.searchParams.get("X-Amz-Signature"), /^[0-9a-f]{64}$/);
    // A região do R2 é sempre "auto": qualquer outra volta assinatura inválida.
    assert.match(u.searchParams.get("X-Amz-Credential"), /\/auto\/s3\/aws4_request$/);
    assert.match(u.searchParams.get("X-Amz-Date"), /^\d{8}T\d{6}Z$/);

    // O segredo NUNCA viaja. Se um dia alguém o colocar num parâmetro, este
    // teste é o que avisa antes de ele sair em log de navegador.
    assert.ok(!url.includes(FALSAS.R2_SECRET_ACCESS_KEY), "o segredo foi para a URL");
  });
});

test("prazo curto é o padrão, e dá para encurtar mais", () => {
  comCredenciais(() => {
    const chave = chaveTemporaria({ clienteId: CLIENTE, mime: "image/png" });
    assert.equal(urlDeEnvio({ chave }).expira_em, 300);
    assert.equal(new URL(urlDeEnvio({ chave, segundos: 60 }).url)
      .searchParams.get("X-Amz-Expires"), "60");
  });
});

test("duas assinaturas do mesmo objeto não são iguais ao longo do tempo", () => {
  comCredenciais(() => {
    const chave = chaveTemporaria({ clienteId: CLIENTE, mime: "image/png" });
    const a = new URL(urlDeEnvio({ chave, segundos: 300 }).url).searchParams.get("X-Amz-Signature");
    const b = new URL(urlDeEnvio({ chave, segundos: 600 }).url).searchParams.get("X-Amz-Signature");
    assert.notEqual(a, b, "o prazo entra na assinatura");
  });
});

// ---------------------------------------------------------------------------
// Como a chave fica no banco

test("a chave vai e volta do banco com a marca que a distingue de uma URL", () => {
  const chave = chavePermanente({ clienteId: CLIENTE, mime: "image/jpeg" });
  assert.equal(chaveDoBanco(paraBanco(chave)), chave);

  // A mesma coluna existe em outra tabela guardando URL http de verdade (a
  // biblioteca de mídias da IA). Ler uma dessas como chave do cofre faria o
  // painel pedir ao R2 um objeto chamado "https:".
  assert.equal(chaveDoBanco("https://exemplo.com/foto.jpg"), null);
  assert.equal(chaveDoBanco(""), null);
  assert.equal(chaveDoBanco(null), null);
});

// ---------------------------------------------------------------------------
// Os bytes

const JPEG = Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), Buffer.alloc(20)]);
const PNG = Buffer.concat([
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.alloc(20)]);
const WEBP = Buffer.concat([
  Buffer.from("RIFF"), Buffer.alloc(4), Buffer.from("WEBP"), Buffer.alloc(20)]);
const OGG = Buffer.concat([Buffer.from("OggS"), Buffer.alloc(20)]);
const MP4 = Buffer.concat([Buffer.alloc(4), Buffer.from("ftyp"), Buffer.alloc(20)]);
const PDF = Buffer.concat([Buffer.from("%PDF-1.7"), Buffer.alloc(20)]);

test("o começo do arquivo tem que combinar com o tipo declarado", () => {
  assert.equal(bytesCombinam("image/jpeg", JPEG), true);
  assert.equal(bytesCombinam("image/png", PNG), true);
  assert.equal(bytesCombinam("image/webp", WEBP), true);
  assert.equal(bytesCombinam("audio/ogg", OGG), true);
  assert.equal(bytesCombinam("video/mp4", MP4), true);
  assert.equal(bytesCombinam("application/pdf", PDF), true);
  assert.equal(bytesCombinam("image/jpeg; charset=binary", JPEG), true, "mime com parâmetro");
});

test("tipo declarado que não bate com o conteúdo é recusado", () => {
  // Esta é a trava que impede o cofre do atendimento de virar hospedagem de
  // arquivo qualquer: a URL assinada aceita qualquer conteúdo, então quem
  // confere é o servidor, olhando os bytes.
  assert.equal(bytesCombinam("image/jpeg", PNG), false);
  assert.equal(bytesCombinam("image/png", JPEG), false);
  assert.equal(bytesCombinam("audio/ogg", MP4), false);
  assert.equal(bytesCombinam("image/webp", Buffer.concat([
    Buffer.from("RIFF"), Buffer.alloc(4), Buffer.from("AVI "), Buffer.alloc(20)])), false,
  "RIFF sozinho não é WebP");
});

test("arquivo curto demais para ter assinatura não passa", () => {
  assert.equal(bytesCombinam("image/jpeg", Buffer.from([0xff, 0xd8, 0xff])), false);
  assert.equal(bytesCombinam("image/jpeg", Buffer.alloc(0)), false);
  assert.equal(bytesCombinam("image/jpeg", null), false);
});

test("formato sem assinatura conhecida passa, em vez de barrar planilha", () => {
  // Texto, CSV e os formatos do Office não têm marca que dê para conferir, e
  // recusar o que não dá para verificar tiraria do ar o envio de nota fiscal
  // em planilha.
  assert.equal(bytesCombinam("text/plain", Buffer.from("qualquer coisa aqui")), true);
  assert.equal(bytesCombinam("text/csv", Buffer.from("a,b,c\n1,2,3\n")), true);
  assert.equal(bytesCombinam(
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    Buffer.concat([Buffer.from("PK"), Buffer.alloc(20)])), true);
});
