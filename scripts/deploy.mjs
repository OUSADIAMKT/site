/**
 * Publica o site na branch `deploy`, que e a branch que a Hostinger clona
 * dentro de `public_html`.
 *
 * A `main` guarda o codigo-fonte; a `deploy` guarda apenas o resultado do
 * `next build` (o conteudo de `out/`) na raiz. As duas nao compartilham
 * historico — `deploy` e uma branch orfa, recriada a cada publicacao — para
 * o repositorio nao inchar com uma copia inteira do site a cada deploy.
 *
 * Uso:  npm run deploy
 *
 * O push NAO e feito por aqui de proposito: o script para antes e mostra o
 * comando, para voce conferir o que vai ao ar antes de publicar.
 */

import { execFileSync } from "node:child_process";
import { existsSync, readdirSync, rmSync, cpSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const saida = path.join(raiz, "out");
const arvore = path.join(raiz, ".deploy-out");
const BRANCH = "deploy";

/** Roda um comando e deixa a saida aparecer no terminal. */
function run(cmd, args, opts = {}) {
  return execFileSync(cmd, args, { stdio: "inherit", cwd: raiz, ...opts });
}

/** Roda um comando git e devolve a saida como texto, sem imprimir. */
function gitOut(args, cwd = raiz) {
  return execFileSync("git", args, { cwd, encoding: "utf8" }).trim();
}

function passo(texto) {
  console.log(`\n\x1b[36m› ${texto}\x1b[0m`);
}

// --- 1. Recusa publicar por cima de trabalho nao commitado ------------------
// O que vai para a `deploy` e o build da arvore de trabalho atual. Se houver
// alteracao solta, o site publicado nao corresponderia a nenhum commit da
// `main` — e depois ninguem descobre o que exatamente esta no ar.
const sujo = gitOut(["status", "--porcelain"]);
if (sujo) {
  console.error(
    "\n\x1b[31mHa alteracoes nao commitadas:\x1b[0m\n" +
      sujo +
      "\n\nCommite (ou descarte) antes de publicar, para o que for ao ar\n" +
      "corresponder a um commit da main.\n",
  );
  process.exit(1);
}

const commitFonte = gitOut(["rev-parse", "--short", "HEAD"]);
const branchAtual = gitOut(["rev-parse", "--abbrev-ref", "HEAD"]);

// --- 2. Build --------------------------------------------------------------
passo("Gerando o site (next build)");
run("npm", ["run", "build"], { shell: process.platform === "win32" });

if (!existsSync(path.join(saida, "index.html"))) {
  console.error("\n\x1b[31mout/index.html nao foi gerado. Build falhou?\x1b[0m");
  process.exit(1);
}

// --- 3. Worktree da branch deploy ------------------------------------------
// Um worktree deixa a branch `deploy` montada numa pasta separada, sem trocar
// a branch da pasta principal — da para publicar sem interromper o que voce
// estiver editando.
passo(`Preparando a branch ${BRANCH}`);
if (existsSync(arvore)) {
  run("git", ["worktree", "remove", "--force", ".deploy-out"]);
}

const branchExiste = (() => {
  try {
    gitOut(["rev-parse", "--verify", `refs/heads/${BRANCH}`]);
    return true;
  } catch {
    return false;
  }
})();

if (branchExiste) {
  run("git", ["worktree", "add", ".deploy-out", BRANCH]);
} else {
  run("git", ["worktree", "add", "--orphan", "-b", BRANCH, ".deploy-out"]);
}

// --- 4. Troca o conteudo ---------------------------------------------------
// Apaga tudo menos `.git` para que arquivo removido do site suma do deploy
// tambem, em vez de ficar orfao no servidor.
passo("Copiando out/ para a raiz da branch");
for (const item of readdirSync(arvore)) {
  if (item === ".git") continue;
  rmSync(path.join(arvore, item), { recursive: true, force: true });
}
// `out/.` (com o ponto) copia tambem os arquivos ocultos, como o .htaccess.
cpSync(path.join(saida, "."), arvore, { recursive: true });

if (!existsSync(path.join(arvore, ".htaccess"))) {
  console.warn(
    "\n\x1b[33mAviso: .htaccess nao veio no build.\x1b[0m\n" +
      "Sem ele a Hostinger nao usa o 404.html do Next.\n" +
      "Confira se public/.htaccess existe.\n",
  );
}

// --- 5. Commit -------------------------------------------------------------
passo("Commitando");
run("git", ["add", "-A"], { cwd: arvore });

const mudou = gitOut(["status", "--porcelain"], arvore);
if (!mudou) {
  console.log(
    `\nO site gerado e identico ao que ja esta na ${BRANCH}. Nada a publicar.`,
  );
  run("git", ["worktree", "remove", "--force", ".deploy-out"]);
  process.exit(0);
}

const quando = new Date().toISOString().replace("T", " ").slice(0, 16);
run(
  "git",
  ["commit", "-q", "-m", `Deploy ${quando} (fonte: ${branchAtual} ${commitFonte})`],
  { cwd: arvore },
);

const commitDeploy = gitOut(["rev-parse", "--short", "HEAD"], arvore);
const arquivos = gitOut(["ls-files"], arvore).split("\n").length;

// --- 6. Fim ----------------------------------------------------------------
run("git", ["worktree", "remove", "--force", ".deploy-out"]);

console.log(
  `\n\x1b[32m✓ Branch ${BRANCH} pronta\x1b[0m` +
    `\n  commit ${commitDeploy} · ${arquivos} arquivos · fonte ${commitFonte}` +
    `\n\nPara publicar:\n\n    git push origin ${BRANCH}\n\n` +
    `Depois disso, a Hostinger puxa a ${BRANCH} (automatico via webhook, ou\n` +
    `pelo botao Deploy no painel de Git).\n`,
);
