// O filtro do quadro de atendimento.
//
// Estes testes existem por causa de um defeito concreto: o filtro rodava na
// TELA, sobre as cinquenta linhas que o banco havia mandado. Quem filtrava por
// etiqueta num cliente com trezentas conversas não encontrava nada, mesmo
// tendo quarenta com aquela etiqueta, porque as quarenta estavam atrás do
// corte de página. E o contador da coluna mostrava o tamanho da página, não o
// número de conversas que casam com o filtro.
//
// Daí a forma dos testes: quase todos montam MAIS candidatos que o limite de
// página, de propósito, e provam que o resultado fala do conjunto inteiro.

import { test } from "node:test";
import assert from "node:assert/strict";

import { montarQuadro, montarIndicadores } from "../api/_quadro.js";
import * as servidor from "../api/_filtros.js";
import * as tela from "../src/filtros.js";
import {
  FILTRO_VAZIO, passaNoFiltro, situacaoDaJanela, atrasado,
  horasDeEspera, esperaDesde, FECHANDO_HORAS, ATRASO_MIN,
} from "../api/_filtros.js";

Object.assign(process.env, {
  SUPABASE_URL: "https://supabase.invalid",
  SUPABASE_SECRET_KEY: "chave-local-de-teste",
});

const MINUTO = 60000;
const HORA = 60 * MINUTO;
const AGORA = new Date("2026-11-24T12:00:00.000Z");
const relogio = AGORA.getTime();
const atras = (ms) => new Date(relogio - ms).toISOString();
const adiante = (ms) => new Date(relogio + ms).toISOString();

function conversa(id, modo, extra = {}) {
  return {
    id, modo,
    canal: "whatsapp",
    nome_contato: `pessoa ${id}`,
    ultima_em: atras(10 * MINUTO),
    fila_desde: modo === "fila" ? atras(10 * MINUTO) : null,
    assumida_em: modo === "humano" ? atras(10 * MINUTO) : null,
    janela_expira_em: adiante(20 * HORA),
    etiquetas: [],
    ...extra,
  };
}

const filtro = (campos) => ({ ...FILTRO_VAZIO, ...campos });

// --------------------------------------------------------------------------
// Uma regra, dois lugares: o mesmo arquivo.

test("a tela e o servidor usam a MESMA função de filtro, não duas cópias", () => {
  // Duas cópias divergem na primeira vez que alguém mexe num limiar, e aí a
  // coluna mostra um número e a lista mostra outro.
  assert.equal(tela.passaNoFiltro, servidor.passaNoFiltro);
  assert.equal(tela.situacaoDaJanela, servidor.situacaoDaJanela);
  assert.equal(tela.FILTRO_VAZIO, servidor.FILTRO_VAZIO);
});

// --------------------------------------------------------------------------
// O defeito central: filtrar só o que caberia na página.

test("a etiqueta é encontrada mesmo na conversa que fica atrás do corte", () => {
  // Sessenta conversas com a IA, e a etiqueta está só na última. Com o corte
  // de cinquenta, a tela nunca via esta linha, e o filtro respondia "nada".
  const conversas = [];
  for (let n = 0; n < 60; n += 1) {
    conversas.push(conversa(`c${n}`, "ia", {
      ultima_em: atras(n * MINUTO),
      etiquetas: n === 59 ? ["matricula"] : [],
    }));
  }

  const quadro = montarQuadro({ conversas }, AGORA,
    { limite: 50, filtro: filtro({ etiqueta: "matricula" }) });

  assert.deepEqual(quadro.ia.map((c) => c.id), ["c59"]);
  assert.equal(quadro.total.ia, 1);
  assert.equal(quadro.truncado.ia, 0);
});

test("o contador da coluna é o resultado do filtro, não o tamanho da página", () => {
  const conversas = [];
  for (let n = 0; n < 120; n += 1) {
    conversas.push(conversa(`c${n}`, "ia", {
      ultima_em: atras(n * MINUTO),
      canal: n % 2 === 0 ? "instagram" : "whatsapp",
    }));
  }

  const quadro = montarQuadro({ conversas }, AGORA,
    { limite: 50, filtro: filtro({ canal: "instagram" }) });

  assert.equal(quadro.ia.length, 50, "a página continua sendo cinquenta");
  assert.equal(quadro.total.ia, 60, "mas o contador fala das sessenta do Instagram");
  assert.equal(quadro.truncado.ia, 10);
});

test("sem filtro, o contador é o número de conversas da coluna", () => {
  const conversas = [conversa("a", "fila"), conversa("b", "fila"), conversa("c", "humano")];
  const quadro = montarQuadro({ conversas }, AGORA, { limite: 50 });
  assert.equal(quadro.total.precisa, 2);
  assert.equal(quadro.total.atendendo, 1);
  assert.equal(quadro.total.ia, 0);
});

test("coluna que bateu no teto de leitura é marcada como parcial", () => {
  // O teto existe para o cliente grande não derrubar a função. Quando ele é
  // alcançado o contador é um "pelo menos", e a resposta precisa dizer isso
  // em vez de mostrar um número redondo e errado.
  const quadro = montarQuadro(
    { conversas: [conversa("a", "ia")], parcial: { ia: true } },
    AGORA, { limite: 50 });

  assert.equal(quadro.parcial.ia, true);
  assert.equal(quadro.parcial.precisa, false);
});

test("o encerrado também passa pelo filtro, e não escapa dele", () => {
  // Antes a coluna do encerrado não tinha etiqueta nenhuma no cartão, e por
  // isso filtrar por etiqueta a esvaziava sempre, mesmo com conversa etiquetada
  // encerrada no mesmo dia.
  const atendimentos = [
    { id: "a1", conversa_id: "c1", encerrada_em: atras(HORA),
      conversas: { nome_contato: "com etiqueta", etiquetas: ["matricula"] } },
    { id: "a2", conversa_id: "c2", encerrada_em: atras(2 * HORA),
      conversas: { nome_contato: "sem etiqueta", etiquetas: [] } },
  ];

  const quadro = montarQuadro({ atendimentos }, AGORA,
    { limite: 50, filtro: filtro({ etiqueta: "matricula" }) });

  assert.deepEqual(quadro.encerrado.map((c) => c.id), ["a1"]);
  assert.equal(quadro.total.encerrado, 1);
});

// --------------------------------------------------------------------------
// Espera e janela da Meta são duas coisas.

test("tempo de espera e janela da Meta são filtros separados", () => {
  // `esperando` está parada há trinta horas, mas a pessoa mandou mensagem
  // agora e a janela está aberta. `fechada` acabou de ser assumida, e a janela
  // já fechou. Um seletor só não consegue dizer isto.
  const conversas = [
    conversa("esperando", "humano", {
      assumida_em: atras(30 * HORA), janela_expira_em: adiante(20 * HORA),
    }),
    conversa("fechada", "humano", {
      assumida_em: atras(5 * MINUTO), janela_expira_em: atras(HORA),
    }),
  ];

  const porEspera = montarQuadro({ conversas }, AGORA,
    { limite: 50, filtro: filtro({ tempo: "24" }) });
  assert.deepEqual(porEspera.atendendo.map((c) => c.id), ["esperando"]);

  const porJanela = montarQuadro({ conversas }, AGORA,
    { limite: 50, filtro: filtro({ janela: "fechada" }) });
  assert.deepEqual(porJanela.atendendo.map((c) => c.id), ["fechada"]);
});

test("a janela tem três situações, e cada uma é a sua", () => {
  const aberta = { janela_expira_em: adiante(20 * HORA) };
  const fechando = { janela_expira_em: adiante(30 * MINUTO) };
  const fechada = { janela_expira_em: atras(MINUTO) };

  assert.equal(situacaoDaJanela(aberta, relogio), "aberta");
  assert.equal(situacaoDaJanela(fechando, relogio), "fechando");
  assert.equal(situacaoDaJanela(fechada, relogio), "fechada");

  // A fronteira é o limiar declarado, não um número escrito à mão em dois
  // lugares diferentes.
  assert.equal(situacaoDaJanela({ janela_expira_em: adiante(FECHANDO_HORAS * HORA) }, relogio), "aberta");
  assert.equal(situacaoDaJanela({ janela_expira_em: adiante(FECHANDO_HORAS * HORA - MINUTO) }, relogio), "fechando");
});

test("no Instagram não existe janela, e o filtro de janela não inventa uma", () => {
  const ig = { canal: "instagram", janela_expira_em: null };
  assert.equal(situacaoDaJanela(ig, relogio), null);
  assert.equal(passaNoFiltro(ig, filtro({ janela: "aberta" }), relogio), false,
    "dizer 'aberta' seria prometer uma garantia que a Meta não dá aqui");
  assert.equal(passaNoFiltro(ig, filtro({ janela: "fechada" }), relogio), false);
  assert.equal(passaNoFiltro(ig, FILTRO_VAZIO, relogio), true,
    "sem filtro de janela ele continua aparecendo");
});

test("a espera é lida do campo que aquela coluna tem", () => {
  assert.equal(esperaDesde({ fila_desde: atras(HORA) }), atras(HORA));
  assert.equal(esperaDesde({ assumida_em: atras(HORA) }), atras(HORA));
  assert.equal(esperaDesde({ ultima_em: atras(HORA) }), atras(HORA));
  assert.equal(esperaDesde({ encerrada_em: atras(HORA) }), atras(HORA));
  assert.equal(esperaDesde({}), null);

  assert.equal(Math.round(horasDeEspera({ fila_desde: atras(4 * HORA) }, relogio)), 4);
  assert.equal(horasDeEspera({}, relogio), null);
});

test("cartão sem data de espera não passa no filtro de tempo", () => {
  // Deixar passar faria "esperando mais de 24h" mostrar quem não tem relógio
  // nenhum, que é o contrário do que a pergunta quer.
  assert.equal(passaNoFiltro({}, filtro({ tempo: "1" }), relogio), false);
});

// --------------------------------------------------------------------------
// Sem resposta e não lida são duas coisas.

test("não lida e sem resposta são filtros diferentes", () => {
  // A conversa respondida e não lida é exatamente o caso que se perde quando
  // alguém junta as duas num botão só.
  const respondidaNaoLida = { sem_resposta: 0, nao_lidas: 3 };
  const semRespostaJaLida = { sem_resposta: 2, nao_lidas: 0 };

  assert.equal(passaNoFiltro(respondidaNaoLida, filtro({ naoLidas: true }), relogio), true);
  assert.equal(passaNoFiltro(respondidaNaoLida, filtro({ parados: true }), relogio), false);

  assert.equal(passaNoFiltro(semRespostaJaLida, filtro({ naoLidas: true }), relogio), false);
  assert.equal(passaNoFiltro(semRespostaJaLida, filtro({ parados: true }), relogio), true);
});

test("conversa marcada como não lida na mão passa no filtro de não lidas", () => {
  assert.equal(passaNoFiltro({ nao_lidas: 0, marcada: true }, filtro({ naoLidas: true }), relogio), true);
});

test("o filtro de não lidas encontra quem está atrás do corte", () => {
  const conversas = [];
  for (let n = 0; n < 80; n += 1) conversas.push(conversa(`c${n}`, "ia", { ultima_em: atras(n * MINUTO) }));

  const quadro = montarQuadro({
    conversas,
    nao_lidas: [{ conversa_id: "c70", nao_lidas: 4, marcada: false }],
  }, AGORA, { limite: 50, filtro: filtro({ naoLidas: true }) });

  assert.deepEqual(quadro.ia.map((c) => c.id), ["c70"]);
  assert.equal(quadro.total.ia, 1);
});

test("atrasado é sem resposta há mais de uma hora, não sem resposta", () => {
  const recem = { sem_resposta: 1, sem_resposta_desde: atras(5 * MINUTO) };
  const velho = { sem_resposta: 1, sem_resposta_desde: atras(3 * HORA) };

  assert.equal(atrasado(recem, relogio), false);
  assert.equal(atrasado(velho, relogio), true);
  assert.equal(atrasado({ sem_resposta: 0, sem_resposta_desde: atras(3 * HORA) }, relogio), false);
  assert.equal(atrasado({ sem_resposta: 2 }, relogio), false, "sem a data não dá para dizer que atrasou");
  assert.equal(atrasado({ sem_resposta: 1, sem_resposta_desde: atras(ATRASO_MIN * MINUTO) }, relogio), true);
});

// --------------------------------------------------------------------------
// Ordem.

test("a ordem escolhida vale, e a padrão de cada coluna continua a dela", () => {
  const conversas = [
    conversa("nova", "ia", { ultima_em: atras(MINUTO), janela_expira_em: adiante(20 * HORA) }),
    conversa("velha", "ia", { ultima_em: atras(10 * HORA), janela_expira_em: adiante(HORA) }),
  ];

  const padrao = montarQuadro({ conversas }, AGORA, { limite: 50 });
  assert.deepEqual(padrao.ia.map((c) => c.id), ["nova", "velha"],
    "na coluna da IA o padrão é o movimento recente");

  const espera = montarQuadro({ conversas }, AGORA, { limite: 50, ordem: "espera" });
  assert.deepEqual(espera.ia.map((c) => c.id), ["velha", "nova"]);

  const janela = montarQuadro({ conversas }, AGORA, { limite: 50, ordem: "janela" });
  assert.deepEqual(janela.ia.map((c) => c.id), ["velha", "nova"]);

  const recente = montarQuadro({ conversas }, AGORA, { limite: 50, ordem: "recente" });
  assert.deepEqual(recente.ia.map((c) => c.id), ["nova", "velha"]);
});

test("ordenando por janela, quem não tem janela vai para o fim", () => {
  const conversas = [
    conversa("ig", "ia", { canal: "instagram", janela_expira_em: null, ultima_em: atras(MINUTO) }),
    conversa("wa", "ia", { janela_expira_em: adiante(10 * HORA), ultima_em: atras(2 * HORA) }),
  ];
  const quadro = montarQuadro({ conversas }, AGORA, { limite: 50, ordem: "janela" });
  assert.deepEqual(quadro.ia.map((c) => c.id), ["wa", "ig"]);
});

test("ordem desconhecida não derruba o quadro: cai no padrão da coluna", () => {
  const conversas = [conversa("a", "fila", { fila_desde: atras(HORA) })];
  const quadro = montarQuadro({ conversas }, AGORA, { limite: 50, ordem: "inventada" });
  assert.deepEqual(quadro.precisa.map((c) => c.id), ["a"]);
});

// --------------------------------------------------------------------------
// Os indicadores do alto.

test("os indicadores NÃO respeitam o filtro, de propósito", () => {
  // Se mudassem com o filtro, filtrar por um atendente faria o painel dizer
  // que ninguém está esperando.
  const conversas = [
    conversa("f1", "fila"),
    conversa("f2", "fila", { canal: "instagram" }),
    conversa("h1", "humano"),
    conversa("i1", "ia"),
  ];

  const dados = { conversas };
  const quadro = montarQuadro(dados, AGORA, { limite: 50, filtro: filtro({ canal: "instagram" }) });
  const i = montarIndicadores(dados, AGORA);

  assert.equal(quadro.total.precisa, 1, "o quadro mostra só o Instagram");
  assert.equal(i.aguardando, 2, "o indicador continua contando as duas da fila");
  assert.equal(i.humano, 1);
  assert.equal(i.ia, 1);
});

test("os indicadores contam sem resposta, atrasados e janela fechando", () => {
  const conversas = [
    conversa("parada", "humano"),
    conversa("fechando", "ia", { janela_expira_em: adiante(30 * MINUTO) }),
    conversa("tranquila", "ia"),
  ];
  const dados = {
    conversas,
    sem_resposta: [{ conversa_id: "parada", sem_resposta: 3, desde: atras(4 * HORA) }],
  };

  const i = montarIndicadores(dados, AGORA);
  assert.equal(i.sem_resposta, 1);
  assert.equal(i.atrasados, 1);
  assert.equal(i.janela_fechando, 1);
  assert.equal(i.parcial, false);
});

test("janela já fechada não conta como janela fechando", () => {
  // São avisos diferentes: uma pede pressa, a outra já pede modelo aprovado.
  const dados = { conversas: [conversa("x", "ia", { janela_expira_em: atras(HORA) })] };
  assert.equal(montarIndicadores(dados, AGORA).janela_fechando, 0);
});

test("indicador diz quando é um mínimo, porque alguma coluna bateu no teto", () => {
  const dados = { conversas: [conversa("x", "ia")], parcial: { ia: true } };
  assert.equal(montarIndicadores(dados, AGORA).parcial, true);
});

// --------------------------------------------------------------------------
// Combinações, que é como o filtro é usado de verdade.

test("dois filtros juntos apertam, nunca soltam", () => {
  const conversas = [
    conversa("alvo", "humano", {
      canal: "instagram", etiquetas: ["matricula"], assumida_em: atras(30 * HORA),
    }),
    conversa("quase", "humano", {
      canal: "instagram", etiquetas: [], assumida_em: atras(30 * HORA),
    }),
    conversa("outro", "humano", {
      canal: "whatsapp", etiquetas: ["matricula"], assumida_em: atras(30 * HORA),
    }),
    conversa("novo", "humano", {
      canal: "instagram", etiquetas: ["matricula"], assumida_em: atras(MINUTO),
    }),
  ];

  const quadro = montarQuadro({ conversas }, AGORA, {
    limite: 50,
    filtro: filtro({ canal: "instagram", etiqueta: "matricula", tempo: "24" }),
  });

  assert.deepEqual(quadro.atendendo.map((c) => c.id), ["alvo"]);
  assert.equal(quadro.total.atendendo, 1);
});

test("o filtro de atendente separa quem tem atendente de quem não tem", () => {
  const conversas = [
    conversa("comRita", "humano", { atendentes: { nome: "Rita" } }),
    conversa("comLia", "humano", { atendentes: { nome: "Lia" } }),
    conversa("sozinha", "humano", { atendentes: null }),
  ];

  const daRita = montarQuadro({ conversas }, AGORA,
    { limite: 50, filtro: filtro({ atendente: "Rita" }) });
  assert.deepEqual(daRita.atendendo.map((c) => c.id), ["comRita"]);

  const semNinguem = montarQuadro({ conversas }, AGORA,
    { limite: 50, filtro: filtro({ atendente: "sem" }) });
  assert.deepEqual(semNinguem.atendendo.map((c) => c.id), ["sozinha"]);
});

test("filtro vazio não esconde ninguém", () => {
  const conversas = [
    conversa("a", "fila"),
    conversa("b", "humano"),
    conversa("c", "ia", { canal: "instagram", janela_expira_em: null }),
  ];
  const quadro = montarQuadro({ conversas }, AGORA, { limite: 50, filtro: { ...FILTRO_VAZIO } });
  assert.equal(quadro.total.precisa + quadro.total.atendendo + quadro.total.ia, 3);
});

test("quadro montado sem opções nenhumas continua funcionando", () => {
  // A assinatura antiga é chamada assim em outros lugares e em testes mais
  // velhos; mudar o padrão para "filtra tudo" esvaziaria aquelas telas.
  const quadro = montarQuadro({ conversas: [conversa("a", "ia")] }, AGORA);
  assert.equal(quadro.ia.length, 1);
});

// --------------------------------------------------------------------------
// Travas de desenho. São testes de texto do código de propósito: o que elas
// impedem é a volta de um defeito específico, e nenhuma delas é provável de
// quebrar por acidente.

import { readFileSync } from "node:fs";

const QUADRO = readFileSync(new URL("../src/Quadro.jsx", import.meta.url), "utf8");
const APP = readFileSync(new URL("../src/App.jsx", import.meta.url), "utf8");

test("o Quadro não filtra na tela: quem filtra e conta é o servidor", () => {
  assert.ok(!/passaNoFiltro/.test(QUADRO),
    "filtrar na tela só encontra quem já está dentro da página, e foi esse o defeito");
});

test("o Quadro manda o filtro inteiro na consulta", () => {
  for (const campo of ["canal", "atendente", "etiqueta", "tempo", "janela", "parados", "naoLidas"]) {
    assert.ok(QUADRO.includes(`p.set("${campo}"`), `o filtro ${campo} precisa ir ao servidor`);
  }
});

test("o contador da coluna vem do total do servidor, não do tamanho da lista", () => {
  assert.ok(/d\.quadro\.total\?\.\[coluna\.chave\]/.test(QUADRO));
  assert.ok(!/quadro-conta">\{cartoes\.length\}/.test(QUADRO));
});

test("o título do quadro não repete o nome do cliente", () => {
  // Ele já está no alto da plataforma, no seletor de cliente, e repetido aqui
  // empurrava as colunas para baixo sem dizer nada novo.
  assert.ok(QUADRO.includes('titulo="Quadro de atendimento"'));
  assert.ok(!/Quadro de atendimento\{cliente/.test(QUADRO));
});

test("recarregar consulta o lugar guardado antes de escolher a aba", () => {
  assert.ok(APP.includes("lugarSalvo(sessao)"),
    "sem isto todo F5 volta para a tela inicial");
  assert.ok(APP.includes("guardarLugar(sessao, aba, clienteId)"));
});
