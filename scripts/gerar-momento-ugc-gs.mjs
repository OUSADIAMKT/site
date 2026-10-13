/**
 * Copia os textos do "Qual é o seu Momento UGC?" (`lib/momento-ugc.ts`) para
 * dentro do Apps Script (`docs/apps-script/momento-ugc-google-sheets.gs`),
 * entre os marcadores `CONTEUDO GERADO`.
 *
 * Por quê: o e-mail da lead é montado no script, e não no navegador — se o
 * navegador mandasse o texto pronto, qualquer pessoa poderia usar a URL do
 * script para disparar e-mail com conteúdo e links próprios em nome da Juh.
 * Este gerador mantém `lib/momento-ugc.ts` como fonte única dos textos.
 *
 * Uso: `npm run gs:momento-ugc`, depois colar o `.gs` no Apps Script e
 * publicar uma "Nova versão" da implantação.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { registerHooks } from "node:module";
import { fileURLToPath, pathToFileURL } from "node:url";

const raiz = fileURLToPath(new URL("..", import.meta.url));

// Node 24 já roda TypeScript direto; só falta entender o atalho `@/` do tsconfig.
registerHooks({
  resolve(especificador, contexto, proximo) {
    if (especificador.startsWith("@/")) {
      return proximo(pathToFileURL(`${raiz}${especificador.slice(2)}.ts`).href, contexto);
    }
    return proximo(especificador, contexto);
  },
});

const m = await import(pathToFileURL(`${raiz}lib/momento-ugc.ts`).href);

/** Marcador que o script troca pelo primeiro nome da lead. */
const NOME = "{{NOME}}";

const resultado = (momento, extra = {}) => ({
  momento,
  crenca: { id: "", rotulo: "", texto: "" },
  bloqueio: { id: "", rotulo: "", texto: "" },
  medo: { id: "", rotulo: "", texto: "" },
  desejo: "",
  mae: false,
  menor: false,
  ...extra,
});

const lead = { nome: NOME, wpp: "", email: "", instagram: "", pergunta: "" };

// Parte fixa de cada momento. Abertura, travas, indicação para mães e aviso
// para menores dependem das escolhas e são montados pelo script.
const momentos = {};
let titulosTravas = [];
for (const momento of m.MOMENTOS) {
  const { abertura, travas, aviso_menor, primeiro_nome, ...base } = m.conteudoEmail(
    resultado(momento),
    lead,
  );
  momentos[momento.key] = base;
  titulosTravas = travas.map((t) => t.titulo);
}

const aberturas = { "": m.fraseAbertura(resultado(m.MOMENTOS[0]), NOME) };
for (const [id, desejo] of Object.entries(m.DESEJO_TEXTO)) {
  aberturas[id] = m.fraseAbertura(resultado(m.MOMENTOS[0], { desejo }), NOME);
}

/** Rótulo + texto de cada opção de crença, bloqueio e medo. */
function trava(key, textos) {
  const pergunta = m.PERGUNTAS.find((p) => p.key === key);
  const opcoes = { [m.OUTRO]: { rotulo: "Outro", texto: textos[m.OUTRO] } };
  for (const o of pergunta.opcoes) opcoes[o.id] = { rotulo: o.lab, texto: textos[o.id] };
  return opcoes;
}

const conteudo = {
  marcador_nome: NOME,
  momentos,
  aberturas,
  travas: {
    titulos: titulosTravas,
    crenca: trava("crenca", m.CRENCA_TEXTO),
    bloqueio: trava("bloqueio", m.BLOQUEIO_TEXTO),
    medo: trava("medo", m.MEDO_TEXTO),
  },
  indicacao_maes: m.INDICACAO_MAES,
  aviso_menor: m.AVISO_MENOR,
};

const arquivo = `${raiz}docs/apps-script/momento-ugc-google-sheets.gs`;
const INICIO = "// >>> CONTEUDO GERADO";
const FIM = "// <<< CONTEUDO GERADO";
const gs = readFileSync(arquivo, "utf8");
const i = gs.indexOf(INICIO);
const f = gs.indexOf(FIM);
if (i < 0 || f < i) throw new Error(`Marcadores "${INICIO}" / "${FIM}" não encontrados em ${arquivo}`);

const bloco =
  `${INICIO} por scripts/gerar-momento-ugc-gs.mjs a partir de lib/momento-ugc.ts.\n` +
  `// Não edite à mão: mude o texto lá e rode \`npm run gs:momento-ugc\`.\n` +
  `var CONTEUDO = ${JSON.stringify(conteudo, null, 2)};\n`;

writeFileSync(arquivo, gs.slice(0, i) + bloco + gs.slice(f));
console.log(`Textos do Momento UGC copiados para ${arquivo}`);
