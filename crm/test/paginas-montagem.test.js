// O compositor de landing pages: o isolamento da prévia, o modo de teste, e a
// correspondência entre o que foi aprovado e o que é publicado.
//
// Este arquivo é o que impede três acidentes, e os três já aconteceram em
// produtos parecidos:
//
// 1. O sandbox ganhar `allow-same-origin` numa revisão apressada, porque "a
//    prévia não estava funcionando". Isso entrega cookie, localStorage (onde
//    mora o token do painel) e o direito de chamar /api/ com credencial para o
//    JavaScript que um cliente colou no editor.
//
// 2. A prévia disparar de verdade. Lead fantasma no CRM, mensagem de WhatsApp
//    para a cliente que entrou ontem, e conversão inventada no dataset de
//    produção da Meta, que é dado que não dá para apagar e que estraga o
//    aprendizado da campanha.
//
// 3. Publicar uma coisa diferente da que foi aprovada. A pessoa olha a prévia,
//    digita mais uma frase, publica, e vai para o ar o texto que ninguém leu.
//
// Nenhum dos três é visível olhando a tela, e é por isso que estão aqui.

import test from "node:test";
import assert from "node:assert/strict";

import {
  SANDBOX, PREAMBULO_FONTE, montarPrevia, montarPublicacao,
  normalizarSlug, slugValido, serializar, FORMATOS,
} from "../api/_pagina.js";
import {
  impressao, sanearConfiguracoes, conferirConteudo, conferirSlug,
  conferirAprovacao, conferirCorrespondencia, bytesDaPublicacao, LIMITE_ARQUIVO,
} from "../api/_paginas.js";
import { normalizarDominio, dominioValido } from "../api/_dominios.js";

const PAGINA = {
  html: '<html><head><title>Oferta</title></head><body><h1>Oferta</h1>'
    + '<script src="https://exemplo.test/animacao.js"></script></body></html>',
  css: ".oferta{color:red}",
  js: "document.title = 'mexeu'",
  configuracoes: { titulo: "Oferta", pixel_meta: "998877", ga4: "G-ABC123", whatsapp: "+5593999" },
};

// --------------------------------------------------------------------------
// 1. O sandbox
// --------------------------------------------------------------------------

test("o sandbox da prévia não tem allow-same-origin", () => {
  assert.doesNotMatch(SANDBOX, /allow-same-origin/,
    "com allow-same-origin a página importada passa a ter a origem do painel, "
    + "e com ela o cookie, o localStorage com o token e a API privada");
});

test("o sandbox não deixa a página trocar o endereço da aba nem escapar por popup", () => {
  assert.doesNotMatch(SANDBOX, /allow-top-navigation/);
  assert.doesNotMatch(SANDBOX, /allow-popups-to-escape-sandbox/);
});

test("o sandbox libera o que a prévia precisa para ser prévia", () => {
  for (const liberado of ["allow-scripts", "allow-forms", "allow-modals"]) {
    assert.match(SANDBOX, new RegExp(liberado), `${liberado} é necessário para testar a página`);
  }
});

// --------------------------------------------------------------------------
// 2. Prévia e publicação são documentos diferentes
// --------------------------------------------------------------------------

test("a prévia leva o modo de teste e a publicação não leva uma linha dele", () => {
  const previa = montarPrevia(PAGINA);
  const publicada = montarPublicacao(PAGINA);

  assert.match(previa, /instalarModoDeTeste\(window/);
  assert.match(previa, /OUSADIA_MODO_TESTE/);

  assert.doesNotMatch(publicada, /instalarModoDeTeste/);
  assert.doesNotMatch(publicada, /OUSADIA_MODO_TESTE/);
  assert.doesNotMatch(publicada, /OUSADIA_BLOQUEIOS/);
});

test("o pixel de produção só existe na publicação", () => {
  const previa = montarPrevia(PAGINA);
  const publicada = montarPublicacao(PAGINA);

  assert.match(publicada, /connect\.facebook\.net/);
  assert.match(publicada, /fbq\('init','998877'\)/);
  assert.match(publicada, /googletagmanager\.com\/gtag\/js\?id=G-ABC123/);

  assert.doesNotMatch(previa, /connect\.facebook\.net/);
  assert.doesNotMatch(previa, /998877/);
  assert.doesNotMatch(previa, /googletagmanager/);
});

test("a página sabe em qual dos dois mundos está", () => {
  assert.match(montarPrevia(PAGINA), /"teste":true/);
  assert.match(montarPublicacao(PAGINA), /"teste":false/);
});

test("o preâmbulo roda antes do script que a pessoa importou", () => {
  const previa = montarPrevia(PAGINA);
  const ondePreambulo = previa.indexOf("instalarModoDeTeste");
  const ondeDaPessoa = previa.indexOf("exemplo.test/animacao.js");
  assert.ok(ondePreambulo >= 0 && ondeDaPessoa >= 0);
  assert.ok(ondePreambulo < ondeDaPessoa,
    "script que roda depois não consegue impedir o envio que já aconteceu");
});

test("um </script> no JS importado não quebra o documento", () => {
  const documento = montarPublicacao({ ...PAGINA, js: 'var a = "</script><script>roubado()</script>"' });
  // O fechamento tem que sair escapado: se escapar inteiro, o parser de HTML
  // fecha o nosso script e executa o que vem depois como script da página.
  assert.doesNotMatch(documento, /<\/script><script>roubado/);
  assert.match(documento, /<\\\/script>/);
});

test("pedaço de HTML sem <html> vira documento, e documento completo é respeitado", () => {
  const pedaco = montarPublicacao({ html: "<section>oi</section>" });
  assert.match(pedaco, /^<!doctype html>/i);
  assert.match(pedaco, /<section>oi<\/section>/);

  const completo = montarPublicacao({ html: "<html><head></head><body>ok</body></html>" });
  assert.equal(completo.match(/<html/gi).length, 1, "não pode nascer um segundo <html>");
});

test("CSS e JS entram no documento, e vazio não cria tag vazia", () => {
  const cheio = montarPublicacao(PAGINA);
  assert.match(cheio, /<style data-ousadia="css">/);
  assert.match(cheio, /<script data-ousadia="js">/);

  const seco = montarPublicacao({ html: "<p>oi</p>" });
  assert.doesNotMatch(seco, /data-ousadia="css"/);
  assert.doesNotMatch(seco, /data-ousadia="js"/);
});

test("a configuração não deixa injetar script pelo título", () => {
  const documento = montarPublicacao({
    html: "<p>oi</p>",
    configuracoes: { titulo: '</title><script>roubado()</script>', descricao: '" onload="x' },
  });
  assert.doesNotMatch(documento, /<script>roubado/);
  assert.doesNotMatch(documento, /onload="x/);
});

test("os quatro formatos fixos de tela são os pedidos, e a livre é uma quinta opção", () => {
  // A largura personalizada não mora nesta lista de propósito: ela é um campo
  // na tela, e não um formato. Se um dia ela entrar aqui, este teste avisa.
  assert.deepEqual(FORMATOS.map((f) => f.largura), [1440, 1280, 768, 390]);
});

// --------------------------------------------------------------------------
// 3. O modo de teste, rodando de verdade
//
// O preâmbulo é executado com um `window` de mentira. Não é leitura do código:
// é o mesmo texto que vai para o iframe, rodando, com cada caminho de saída
// armado para EXPLODIR se for usado de verdade.
// --------------------------------------------------------------------------

function mundoDeMentira() {
  const ouvintes = {};
  const vazou = [];

  const janela = {
    navigator: { sendBeacon: () => { vazou.push("beacon de verdade"); return true; } },
    fetch: () => { vazou.push("fetch de verdade"); return Promise.resolve(); },
    open: () => { vazou.push("janela de verdade"); return {}; },
    XMLHttpRequest: function Verdadeira() { vazou.push("xhr de verdade"); },
    setInterval: () => 0,
    clearInterval: () => {},
    setTimeout: () => 0,
    // Um DOM de mentira, só o bastante para o aviso da prévia existir: a
    // faixa que a pessoa vê quando um clique é segurado é parte do que a
    // especificação pede ("testar dentro da prévia"), então ela é testada.
    document: {
      addEventListener(tipo, fn) { (ouvintes[tipo] = ouvintes[tipo] || []).push(fn); },
      criados: [],
      body: { filhos: [], appendChild(no) { this.filhos.push(no); return no; } },
      createElement() {
        const no = {
          style: {}, atributos: {},
          setAttribute(n, v) { this.atributos[n] = v; },
          set innerHTML(v) { throw new Error("innerHTML no aviso: endereço da pessoa viraria HTML"); },
        };
        this.criados.push(no);
        return no;
      },
      getElementById(id) {
        return this.body.filhos.find((f) => f.id === id) || null;
      },
    },
  };

  // Numa origem opaca o simples acesso ao localStorage levanta SecurityError.
  Object.defineProperty(janela, "localStorage", {
    get() { throw new Error("SecurityError"); },
    configurable: true,
  });

  const instalar = new Function(`${PREAMBULO_FONTE}; return instalarModoDeTeste;`)();
  const avisos = [];
  instalar(janela, (dado) => avisos.push(dado));

  // O que a pessoa lê na faixa dentro da prévia, se houver faixa.
  const naFaixa = () => {
    const faixa = janela.document.body.filhos.find((f) => f.id === "ousadia-aviso-teste");
    return faixa ? String(faixa.textContent || "") : null;
  };
  const disparar = (tipo, evento) => {
    for (const fn of ouvintes[tipo] || []) fn(evento);
  };
  return { janela, ouvintes, vazou, avisos, naFaixa, disparar };
}

// O evento de clique de mentira, com o <a> que a pessoa clicou.
function cliqueEm(href) {
  let impedido = false;
  return {
    evento: {
      target: { tagName: "A", getAttribute: () => href },
      preventDefault() { impedido = true; },
    },
    get impedido() { return impedido; },
  };
}

test("na prévia o envio do formulário não sai, e a página recebe um sucesso plausível", async () => {
  const { janela, vazou } = mundoDeMentira();

  const resposta = await janela.fetch("https://crm.cliente.test/leads", {
    method: "POST", body: '{"nome":"Maria"}',
  });

  assert.deepEqual(vazou, [], "nada pode ter saído de verdade");
  assert.equal(resposta.status, 200, "a página precisa seguir para a confirmação");
  assert.deepEqual(await resposta.json(), { ok: true, teste: true });

  const registrado = janela.OUSADIA_BLOQUEIOS.at(-1);
  assert.equal(registrado.tipo, "envio");
  assert.equal(registrado.url, "https://crm.cliente.test/leads");
  assert.equal(registrado.metodo, "POST");
});

test("XHR e sendBeacon também ficam dentro da prévia", () => {
  const { janela, vazou } = mundoDeMentira();

  const pedido = new janela.XMLHttpRequest();
  let respondeu = false;
  pedido.onload = () => { respondeu = true; };
  pedido.open("POST", "https://api.cliente.test/lead");
  pedido.send("x=1");

  janela.navigator.sendBeacon("https://medidor.test/evento");

  assert.deepEqual(vazou, []);
  assert.ok(respondeu, "a página espera a resposta: sem ela o botão fica girando para sempre");
  const vias = janela.OUSADIA_BLOQUEIOS.map((b) => b.via);
  assert.ok(vias.includes("xhr"));
  assert.ok(vias.includes("beacon"));
});

test("conversão nenhuma chega ao dataset de produção da Meta", () => {
  const { janela, avisos } = mundoDeMentira();

  janela.fbq("track", "Lead", { value: 100 });
  janela.gtag("event", "generate_lead");
  janela.dataLayer.push({ event: "conversao" });
  janela.ttq("track", "SubmitForm");

  const medidores = janela.OUSADIA_BLOQUEIOS.filter((b) => b.tipo === "conversao").map((b) => b.medidor);
  assert.deepEqual(medidores, ["fbq", "gtag", "dataLayer", "ttq"]);
  assert.equal(avisos.filter((a) => a.tipo === "conversao").length, 4,
    "cada conversão impedida é relatada para o painel mostrar");
});

test("o pixel que a própria página instalar depois perde para o stub", () => {
  const { janela } = mundoDeMentira();
  // Uma landing page exportada do Elementor traz o snippet dela no HTML. Ele
  // roda depois do preâmbulo e tenta sobrescrever `fbq`.
  assert.equal(typeof janela.fbq, "function");
  assert.equal(janela.fbq.__ousadia, true,
    "o stub tem que estar marcado, senão a reinstalação periódica o trata como pixel de verdade");
});

test("botão de WhatsApp na prévia não manda mensagem para ninguém", () => {
  const { janela, ouvintes } = mundoDeMentira();
  const clique = ouvintes.click[0];

  let impediu = false;
  clique({
    preventDefault() { impediu = true; },
    target: { tagName: "A", getAttribute: () => "https://wa.me/5593999999999?text=quero" },
  });

  assert.ok(impediu, "o clique não pode navegar: isso abre a conversa de verdade");
  assert.equal(janela.OUSADIA_BLOQUEIOS.at(-1).tipo, "whatsapp");
});

test("link interno continua funcionando, link externo é segurado", () => {
  const { janela, ouvintes } = mundoDeMentira();
  const clique = ouvintes.click[0];

  let impediuAncora = false;
  clique({
    preventDefault() { impediuAncora = true; },
    target: { tagName: "A", getAttribute: () => "#precos" },
  });
  assert.equal(impediuAncora, false, "âncora interna é navegação da própria página");

  let impediuFora = false;
  clique({
    preventDefault() { impediuFora = true; },
    target: { tagName: "A", getAttribute: () => "https://outro.site/" },
  });
  assert.ok(impediuFora, "sair para outro site apagaria a prévia");
  assert.equal(janela.OUSADIA_BLOQUEIOS.at(-1).tipo, "link");
});

test("o formulário é impedido de navegar, e os campos aparecem no relato", () => {
  const { janela, ouvintes } = mundoDeMentira();
  const enviar = ouvintes.submit[0];

  let impediu = false;
  enviar({
    preventDefault() { impediu = true; },
    target: {
      action: "https://cliente.test/obrigado",
      elements: [
        { name: "nome", type: "text", value: "Maria" },
        { name: "senha", type: "password", value: "segredo" },
      ],
    },
  });

  assert.ok(impediu);
  const relato = janela.OUSADIA_BLOQUEIOS.at(-1);
  assert.equal(relato.tipo, "formulario");
  assert.equal(relato.campos.nome, "Maria");
  assert.equal(relato.campos.senha, "(oculto)", "senha digitada na prévia não vai para o relato");
});

test("localStorage numa origem opaca não derruba a página", () => {
  const { janela } = mundoDeMentira();
  // Sem o remendo, este acesso levanta SecurityError e mata o script da
  // landing page na primeira linha.
  janela.localStorage.setItem("visitou", "1");
  assert.equal(janela.localStorage.getItem("visitou"), "1");
  assert.equal(janela.localStorage.getItem("nunca-gravado"), null);
});

// --------------------------------------------------------------------------
// 4. A impressão digital e a correspondência
// --------------------------------------------------------------------------

test("a impressão é estável e não depende da ordem das chaves", () => {
  const a = impressao({ html: "<p>a</p>", css: "", js: "", configuracoes: { titulo: "T", ga4: "G-1" } });
  const b = impressao({ html: "<p>a</p>", css: "", js: "", configuracoes: { ga4: "G-1", titulo: "T" } });
  assert.equal(a, b);
  assert.match(a, /^sha256-[0-9a-f]{64}$/);
});

test("a impressão muda com qualquer alteração de conteúdo", () => {
  const base = { html: "<p>a</p>", css: "a{}", js: "x", configuracoes: {} };
  const marca = impressao(base);
  assert.notEqual(marca, impressao({ ...base, html: "<p>b</p>" }));
  assert.notEqual(marca, impressao({ ...base, css: "a{ }" }));
  assert.notEqual(marca, impressao({ ...base, js: "y" }));
  assert.notEqual(marca, impressao({ ...base, configuracoes: { titulo: "T" } }));
});

test("o conteúdo canônico não confunde arquivos vizinhos", () => {
  // Sem separador, "ab" + "" e "a" + "b" dariam a mesma impressão.
  assert.notEqual(
    serializar({ html: "ab", css: "" }),
    serializar({ html: "a", css: "b" }),
  );
});

test("publicar o que a prévia está mostrando passa, e publicar outra coisa é recusado", () => {
  const rascunho = { html: "<p>versão conferida</p>", css: "", js: "", configuracoes: {} };

  const igual = conferirCorrespondencia({ rascunho, previa: { ...rascunho } });
  assert.equal(igual.ok, true);

  const diferente = conferirCorrespondencia({
    rascunho: { ...rascunho, html: "<p>frase digitada depois da prévia</p>" },
    previa: rascunho,
  });
  assert.equal(diferente.ok, undefined);
  assert.equal(diferente.status, 409);
  assert.notEqual(diferente.previa, diferente.rascunho);
});

test("republicar exige versão desta página, aprovada, e com o conteúdo intacto", () => {
  const pagina = { id: "pag-1" };
  const conteudo = { html: "<p>ok</p>", css: "", js: "", configuracoes: {} };
  const versao = {
    ...conteudo, id: "v1", pagina_id: "pag-1",
    aprovada_em: "2026-11-25T12:00:00Z", impressao: impressao(conteudo),
  };

  assert.equal(conferirAprovacao({ pagina, versao }).ok, true);

  assert.equal(conferirAprovacao({ pagina, versao: null }).status, 404);

  assert.equal(
    conferirAprovacao({ pagina, versao: { ...versao, pagina_id: "outra" } }).status,
    400, "versão de outra página não entra no ar aqui",
  );

  assert.equal(
    conferirAprovacao({ pagina, versao: { ...versao, aprovada_em: null } }).status,
    409, "versão que nunca passou pela prévia não publica",
  );

  // Conteúdo mexido no banco por fora, com a impressão antiga ainda gravada.
  assert.equal(
    conferirAprovacao({ pagina, versao: { ...versao, html: "<p>trocado no banco</p>" } }).status,
    409,
  );

  // Duas abas: a outra aprovou uma versão nova, esta tenta publicar a antiga.
  assert.equal(
    conferirAprovacao({ pagina, versao, impressaoEnviada: "sha256-outra" }).status,
    409,
  );
});

test("os bytes publicados são exatamente a montagem de produção da versão", () => {
  const versao = { ...PAGINA, id: "v1", pagina_id: "p1" };
  assert.equal(bytesDaPublicacao(versao), montarPublicacao(PAGINA));
});

// --------------------------------------------------------------------------
// 5. Saneamento
// --------------------------------------------------------------------------

test("a configuração não aceita endereço javascript: nem código no lugar do pixel", () => {
  const limpa = sanearConfiguracoes({
    formulario_url: "javascript:roubar()",
    confirmacao_url: "https://cliente.test/obrigado",
    pixel_meta: "<script>x</script>123",
    ga4: "G-OK_1",
    whatsapp: "(93) 99999-9999",
  });

  assert.equal(limpa.formulario_url, null);
  assert.equal(limpa.confirmacao_url, "https://cliente.test/obrigado");
  assert.equal(limpa.pixel_meta, "123");
  assert.equal(limpa.ga4, "G-OK1");
  assert.equal(limpa.whatsapp, "93999999999");
  assert.equal(limpa.robots, true, "landing page existe para ser achada");
  assert.equal(limpa.idioma, "pt-BR");
});

test("arquivo gigante é recusado antes de chegar ao banco", () => {
  assert.equal(conferirConteudo({ html: "<p>ok</p>" }), null);
  assert.match(conferirConteudo({ css: "x".repeat(LIMITE_ARQUIVO + 1) }), /2 MB/);
  assert.match(conferirConteudo({ js: 42 }), /texto/);
});

test("o apelido da página cabe numa URL", () => {
  assert.equal(normalizarSlug("Oferta de Novembro!"), "oferta-de-novembro");
  assert.equal(normalizarSlug("  Ação  "), "acao");
  assert.equal(normalizarSlug("--meio--"), "meio");
  assert.ok(slugValido("oferta-2026"));
  assert.ok(!slugValido("-oferta"));
  assert.ok(!slugValido("Oferta"));
  assert.match(conferirSlug("-x"), /minúsculas/);
});

test("o domínio é guardado como o navegador manda o Host", () => {
  assert.equal(normalizarDominio("HTTPS://Cliente.COM.br:443/landing?x=1"), "cliente.com.br");
  assert.equal(normalizarDominio("cliente.com.br."), "cliente.com.br");
  assert.ok(dominioValido("www.cliente.com.br"));
  assert.ok(!dominioValido("localhost"));
  assert.ok(!dominioValido("cliente.com.br/landing"));
});

// --------------------------------------------------------------------------
// 4. O que a pessoa VÊ quando a prévia segura algo
//
// Impedir e anotar na lateral não é testar: quem clica num botão de WhatsApp
// e não vê nada acontecer não sabe se o botão está quebrado ou se a prévia
// segurou. A faixa dentro da prévia é o que responde isso.
// --------------------------------------------------------------------------

test("formulário enviado na prévia avisa na própria página, e diz para onde iria publicada", () => {
  const m = mundoDeMentira();
  m.janela.OUSADIA_CONFIG = { teste: true, confirmacao: "https://cliente.test/obrigado" };

  let impedido = false;
  m.disparar("submit", {
    target: { action: "https://crm.cliente.test/leads", elements: [
      { name: "nome", type: "text", value: "Maria" },
      { name: "senha", type: "password", value: "nao-pode-aparecer" },
    ] },
    preventDefault() { impedido = true; },
  });

  assert.ok(impedido, "o envio de verdade tem que ser impedido");
  assert.deepEqual(m.vazou, [], "nada pode ter saído");

  const faixa = m.naFaixa();
  assert.match(faixa, /nada foi enviado/i);
  assert.match(faixa, /Nenhum lead de verdade/i);
  assert.match(faixa, /https:\/\/cliente\.test\/obrigado/,
    "a página de confirmação aparece como endereço, para a pessoa saber o que vem depois");
  assert.doesNotMatch(faixa, /nao-pode-aparecer/, "senha não vai para a tela");

  const anotado = m.janela.OUSADIA_BLOQUEIOS.at(-1);
  assert.equal(anotado.campos.senha, "(oculto)");
});

test("a faixa não navega para a página de confirmação", () => {
  const m = mundoDeMentira();
  m.janela.OUSADIA_CONFIG = { teste: true, confirmacao: "https://cliente.test/obrigado" };

  m.disparar("submit", { target: { action: "", elements: [] }, preventDefault() {} });

  // Página de confirmação de verdade é onde mora o pixel de conversão. Abrir
  // aquilo aqui disparava conversão no dataset de produção da Meta, que é o
  // que o modo de teste promete não fazer.
  assert.deepEqual(m.vazou, [], "nem fetch, nem janela, nem beacon");
  const faixa = m.janela.document.body.filhos.find((f) => f.id === "ousadia-aviso-teste");
  assert.equal(faixa.atributos.src, undefined);
  assert.equal(faixa.atributos.href, undefined);
});

test("clique no botão de WhatsApp avisa na prévia, e nenhuma mensagem sai", () => {
  const m = mundoDeMentira();
  const clique = cliqueEm("https://wa.me/5593999999999?text=oi");

  m.disparar("click", clique.evento);

  assert.ok(clique.impedido);
  assert.deepEqual(m.vazou, []);
  assert.match(m.naFaixa(), /nenhuma mensagem saiu pelo WhatsApp/i);
  assert.match(m.naFaixa(), /wa\.me/);
});

test("link externo avisa, e âncora da própria página passa sem faixa", () => {
  const m = mundoDeMentira();

  const externo = cliqueEm("https://outro-site.test/");
  m.disparar("click", externo.evento);
  assert.ok(externo.impedido);
  assert.match(m.naFaixa(), /iria para https:\/\/outro-site\.test/);

  // Menu e navegação interna da landing page são âncoras. Elas têm que
  // funcionar de verdade na prévia, sem faixa e sem impedimento.
  const m2 = mundoDeMentira();
  const ancora = cliqueEm("#planos");
  m2.disparar("click", ancora.evento);
  assert.equal(ancora.impedido, false, "âncora é navegação interna: tem que rolar a página");
  assert.equal(m2.naFaixa(), null, "âncora não é bloqueio, então não tem o que avisar");
  assert.equal(m2.janela.OUSADIA_BLOQUEIOS.length, 0);
});

test("envio por rede e medidor não levantam faixa, porque disparam no carregamento", async () => {
  const m = mundoDeMentira();

  await m.janela.fetch("https://crm.cliente.test/leads", { method: "POST" });

  assert.equal(m.janela.OUSADIA_BLOQUEIOS.length, 1, "entra na lista do painel");
  assert.equal(m.naFaixa(), null, "faixa aparecendo sozinha a cada atualização da prévia é barulho");
});

// --------------------------------------------------------------------------
// 5. O medidor, que só existe na página publicada
//
// É o único lugar de onde sai número para a galeria. Se ele contar o que não
// é visita, ou se ele aparecer na prévia, a tela passa a mostrar movimento
// que não existiu.
// --------------------------------------------------------------------------

const ID_DA_PAGINA = "11111111-2222-4333-8444-555555555555";

function corpoDoMedidor(documento) {
  const achado = documento.match(/<script data-ousadia="medidor">([\s\S]*?)<\/script>/);
  return achado ? achado[1] : null;
}

test("a página publicada leva o medidor, e a prévia não leva nada disso", () => {
  const publicada = montarPublicacao({ ...PAGINA, pagina_id: ID_DA_PAGINA });
  assert.match(publicada, /data-ousadia="medidor"/);
  assert.ok(publicada.includes(ID_DA_PAGINA), "o medidor precisa saber de qual página ele fala");

  const previa = montarPrevia(PAGINA, { avisarNoPai: false });
  assert.doesNotMatch(previa, /data-ousadia="medidor"/,
    "prévia que conta visita enche a galeria de movimento que não existiu");
  assert.doesNotMatch(previa, /pagina-evento/);
});

test("sem id de página não existe medidor: montagem solta não conta para ninguém", () => {
  const semId = montarPublicacao(PAGINA);
  assert.doesNotMatch(semId, /data-ousadia="medidor"/);
});

test("o medidor conta a visita uma vez, e o lead no envio do formulário", () => {
  const corpo = corpoDoMedidor(montarPublicacao({ ...PAGINA, pagina_id: ID_DA_PAGINA }));
  assert.ok(corpo, "o medidor tem que estar lá para ser testado");

  const enviados = [];
  const ouvintes = {};
  const janela = {
    self: null, top: null,
    navigator: { sendBeacon: (alvo, dado) => { enviados.push({ alvo, dado }); return true; } },
    document: { addEventListener: (tipo, fn) => { (ouvintes[tipo] = ouvintes[tipo] || []).push(fn); } },
    Blob: function Blob(partes) { this.partes = partes; },
  };
  janela.self = janela;
  janela.top = janela;

  const rodar = new Function("window", "navigator", "document", "Blob", "fetch", corpo);
  rodar(janela, janela.navigator, janela.document, janela.Blob,
    () => { throw new Error("não era para usar fetch: sendBeacon existe"); });

  assert.equal(enviados.length, 1, "uma visita por carregamento, nem duas nem nenhuma");
  assert.equal(enviados[0].alvo, "/api/report?rota=pagina-evento",
    "endereço relativo: a mesma página é servida pelo CRM e pelo domínio do cliente");
  const visita = JSON.parse(enviados[0].dado.partes[0]);
  assert.deepEqual(visita, { pagina: ID_DA_PAGINA, tipo: "visita" });

  for (const fn of ouvintes.submit || []) fn({});
  assert.equal(enviados.length, 2);
  assert.deepEqual(JSON.parse(enviados[1].dado.partes[0]), { pagina: ID_DA_PAGINA, tipo: "lead" });
});

test("o medidor não conta dentro de um quadro, que é onde a miniatura mora", () => {
  const corpo = corpoDoMedidor(montarPublicacao({ ...PAGINA, pagina_id: ID_DA_PAGINA }));

  const enviados = [];
  const janela = {
    navigator: { sendBeacon: (alvo, dado) => { enviados.push({ alvo, dado }); return true; } },
    document: { addEventListener: () => {} },
    Blob: function Blob(partes) { this.partes = partes; },
  };
  // Dentro de iframe `top` e `self` são janelas diferentes. A miniatura de
  // cada cartão da galeria é a página de verdade num iframe: sem esta trava,
  // abrir a galeria somaria uma visita por página, toda vez.
  janela.self = janela;
  janela.top = { outra: true };

  new Function("window", "navigator", "document", "Blob", "fetch", corpo)(
    janela, janela.navigator, janela.document, janela.Blob,
    () => { throw new Error("nem fetch nem beacon podiam sair daqui"); },
  );

  assert.deepEqual(enviados, []);
});

test("o medidor não entra na impressão digital do conteúdo", () => {
  // A impressão é do que a pessoa aprovou na prévia. O identificador da
  // página não é conteúdo: se entrasse, republicar a mesma versão daria
  // impressão diferente e o servidor recusaria a própria publicação.
  const comId = impressao({ ...PAGINA, pagina_id: ID_DA_PAGINA });
  const semId = impressao(PAGINA);
  assert.equal(comId, semId);
});
