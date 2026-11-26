import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { Search, WrapText, Undo2, Redo2, X, ArrowUp, ArrowDown } from "lucide-react";
import { realcar } from "./realce.js";
import { formatar } from "./formatar.js";

// O editor de código do compositor.
//
// É um <textarea> com um <pre> colorido atrás, alinhado caractere a
// caractere. O porquê dessa escolha, e não de um CodeMirror, está no começo do
// realce.js. O que ela entrega de graça é o que mais custa imitar: seleção com
// mouse e teclado, acento, teclado de celular, leitor de tela, corretor
// desligado e rolagem nativa.
//
// As três camadas (números, texto colorido, campo) TÊM que compartilhar fonte,
// tamanho e altura de linha, senão o cursor descola da cor. Isso está travado
// no paginas.css com um comentário, e quem mexer numa tem que mexer nas três.

// Desfazer e refazer são nossos, não do navegador.
//
// Num <textarea> controlado pelo React o histórico nativo quebra: o React
// reescreve o valor e o navegador perde o rastro, então Ctrl+Z às vezes
// desfazia dez minutos de trabalho de uma vez. Com histórico próprio o passo
// é previsível: um passo por pausa de digitação.
const PAUSA_MS = 600;
const PASSO_MAXIMO = 60;   // caracteres digitados sem pausa que ainda viram um passo
const TETO = 200;          // passos guardados

function podeJuntar(anterior, agora, quando) {
  if (!anterior) return false;
  if (Date.now() - quando > PAUSA_MS) return false;
  return Math.abs(agora.length - anterior.length) < PASSO_MAXIMO;
}

export default function EditorCodigo({
  idioma, valor, aoMudar, nome,
  aoImportar,
}) {
  const campo = useRef(null);
  const colorido = useRef(null);
  const numeros = useRef(null);

  const passado = useRef([]);
  const futuro = useRef([]);
  const ultimoEm = useRef(0);

  const [procurando, setProcurando] = useState(false);
  const [busca, setBusca] = useState("");
  const [troca, setTroca] = useState("");
  const [diferenciar, setDiferenciar] = useState(false);
  const [recado, setRecado] = useState("");

  const texto = valor ?? "";
  const linhas = useMemo(() => texto.split("\n").length, [texto]);
  const pintado = useMemo(() => realcar(texto, idioma), [texto, idioma]);

  // Trocar de arquivo zera o histórico: desfazer no CSS não pode voltar o HTML.
  useEffect(() => {
    passado.current = [];
    futuro.current = [];
  }, [nome]);

  const registrar = useCallback((anterior) => {
    const pilha = passado.current;
    const topo = pilha[pilha.length - 1];
    if (podeJuntar(topo, anterior, ultimoEm.current)) {
      // Digitação corrida vira um passo só: o topo da pilha continua sendo o
      // texto de antes da rajada.
    } else {
      pilha.push(anterior);
      if (pilha.length > TETO) pilha.shift();
    }
    ultimoEm.current = Date.now();
    futuro.current = [];
  }, []);

  function mudar(novo) {
    registrar(texto);
    aoMudar(novo);
  }

  function desfazer() {
    const anterior = passado.current.pop();
    if (anterior === undefined) { setRecado("Não há mais o que desfazer."); return; }
    futuro.current.push(texto);
    aoMudar(anterior);
  }

  function refazer() {
    const proximo = futuro.current.pop();
    if (proximo === undefined) { setRecado("Não há mais o que refazer."); return; }
    passado.current.push(texto);
    aoMudar(proximo);
  }

  // A rolagem das três camadas é uma só: quem rola é o campo, e as outras
  // duas seguem. Sem isso a cor e o número ficam para trás do cursor.
  function rolou() {
    const topo = campo.current.scrollTop;
    const lado = campo.current.scrollLeft;
    if (colorido.current) {
      colorido.current.scrollTop = topo;
      colorido.current.scrollLeft = lado;
    }
    if (numeros.current) numeros.current.scrollTop = topo;
  }

  function trocarPedaco(inicio, fim, novo, cursor) {
    const resultado = texto.slice(0, inicio) + novo + texto.slice(fim);
    registrar(texto);
    aoMudar(resultado);
    requestAnimationFrame(() => {
      const c = cursor ?? inicio + novo.length;
      campo.current?.setSelectionRange(c, c);
      campo.current?.focus();
    });
  }

  function aoTeclar(e) {
    const ctrl = e.ctrlKey || e.metaKey;

    if (ctrl && e.key.toLowerCase() === "z" && !e.shiftKey) { e.preventDefault(); desfazer(); return; }
    if (ctrl && (e.key.toLowerCase() === "y" || (e.key.toLowerCase() === "z" && e.shiftKey))) {
      e.preventDefault(); refazer(); return;
    }
    if (ctrl && e.key.toLowerCase() === "f") { e.preventDefault(); setProcurando(true); return; }
    if (ctrl && e.key.toLowerCase() === "s") { e.preventDefault(); return; }  // o salvamento é automático

    // Tab não troca de campo dentro do editor: ele indenta, como em qualquer
    // editor de código. Esc sai do editor, e é esse o caminho de teclado para
    // quem navega sem mouse não ficar preso aqui.
    if (e.key === "Tab") {
      e.preventDefault();
      const { selectionStart: a, selectionEnd: b } = e.target;
      if (a === b) { trocarPedaco(a, b, "  "); return; }

      // Com seleção, Tab indenta as linhas inteiras.
      const inicioLinha = texto.lastIndexOf("\n", a - 1) + 1;
      const pedaco = texto.slice(inicioLinha, b);
      const novo = e.shiftKey
        ? pedaco.replace(/^ {1,2}/gm, "")
        : pedaco.replace(/^/gm, "  ");
      registrar(texto);
      aoMudar(texto.slice(0, inicioLinha) + novo + texto.slice(b));
      requestAnimationFrame(() => {
        campo.current?.setSelectionRange(inicioLinha, inicioLinha + novo.length);
      });
      return;
    }

    // Enter mantém a indentação da linha de cima, que é o que faz escrever
    // HTML à mão não virar escada torta.
    if (e.key === "Enter") {
      const { selectionStart: a, selectionEnd: b } = e.target;
      const inicioLinha = texto.lastIndexOf("\n", a - 1) + 1;
      const espacos = (texto.slice(inicioLinha, a).match(/^[ \t]*/) || [""])[0];
      if (!espacos) return;
      e.preventDefault();
      trocarPedaco(a, b, `\n${espacos}`);
    }
  }

  // ------------------------------------------------------------- procurar
  const alvos = useMemo(() => {
    if (!busca) return [];
    const achados = [];
    const onde = diferenciar ? texto : texto.toLowerCase();
    const que = diferenciar ? busca : busca.toLowerCase();
    let i = onde.indexOf(que);
    while (i >= 0) {
      achados.push(i);
      i = onde.indexOf(que, i + Math.max(1, que.length));
    }
    return achados;
  }, [texto, busca, diferenciar]);

  const [atual, setAtual] = useState(0);

  function irPara(indice) {
    if (!alvos.length) return;
    const n = (indice + alvos.length) % alvos.length;
    setAtual(n);
    const inicio = alvos[n];
    campo.current?.focus();
    campo.current?.setSelectionRange(inicio, inicio + busca.length);
    // O navegador não rola um textarea para a seleção sozinho. A conta é por
    // linha, que é o que dá para fazer sem medir glifo.
    const linhaDoAchado = texto.slice(0, inicio).split("\n").length - 1;
    const alturaLinha = parseFloat(getComputedStyle(campo.current).lineHeight) || 20;
    campo.current.scrollTop = Math.max(0, (linhaDoAchado - 4) * alturaLinha);
    rolou();
  }

  function substituirAtual() {
    if (!alvos.length) return;
    const inicio = alvos[Math.min(atual, alvos.length - 1)];
    trocarPedaco(inicio, inicio + busca.length, troca, inicio + troca.length);
  }

  function substituirTodas() {
    if (!busca) return;
    const partes = [];
    let de = 0;
    for (const i of alvos) {
      partes.push(texto.slice(de, i), troca);
      de = i + busca.length;
    }
    partes.push(texto.slice(de));
    registrar(texto);
    aoMudar(partes.join(""));
    setRecado(`${alvos.length} ${alvos.length === 1 ? "troca feita" : "trocas feitas"}.`);
  }

  function formatarAgora() {
    const antes = texto;
    const depois = formatar(antes, idioma);
    if (depois === antes) {
      setRecado("Já estava formatado, ou a formatação não era segura neste trecho.");
      return;
    }
    registrar(antes);
    aoMudar(depois);
    setRecado("Formatado.");
  }

  useEffect(() => {
    if (!recado) return;
    const t = setTimeout(() => setRecado(""), 3000);
    return () => clearTimeout(t);
  }, [recado]);

  return (
    <div className="ed">
      <div className="ed-barra">
        <span className="ed-arquivo">{nome}</span>

        <div className="ed-botoes">
          <button type="button" className="ed-icone" onClick={desfazer} title="Desfazer (Ctrl+Z)">
            <Undo2 size={15} strokeWidth={1.8} aria-hidden="true" />
            <span className="ed-oculto">Desfazer</span>
          </button>
          <button type="button" className="ed-icone" onClick={refazer} title="Refazer (Ctrl+Shift+Z)">
            <Redo2 size={15} strokeWidth={1.8} aria-hidden="true" />
            <span className="ed-oculto">Refazer</span>
          </button>
          <button type="button" className="ed-icone" onClick={formatarAgora} title="Formatar">
            <WrapText size={15} strokeWidth={1.8} aria-hidden="true" />
            <span className="ed-oculto">Formatar</span>
          </button>
          <button
            type="button" className="ed-icone" onClick={() => setProcurando((a) => !a)}
            title="Procurar e substituir (Ctrl+F)" aria-pressed={procurando}
          >
            <Search size={15} strokeWidth={1.8} aria-hidden="true" />
            <span className="ed-oculto">Procurar</span>
          </button>
          {aoImportar && (
            <label className="ed-importar">
              Importar arquivo
              <input
                type="file" accept=".html,.htm,.css,.js,.mjs,.txt"
                onChange={(e) => { aoImportar(e.target.files); e.target.value = ""; }}
              />
            </label>
          )}
        </div>

        <span className="ed-conta">{linhas} {linhas === 1 ? "linha" : "linhas"} · {texto.length} caracteres</span>
      </div>

      {procurando && (
        <div className="ed-procura">
          <input
            type="text" value={busca} autoFocus placeholder="Procurar"
            onChange={(e) => { setBusca(e.target.value); setAtual(0); }}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); irPara(e.shiftKey ? atual - 1 : atual + 1); } }}
          />
          <input
            type="text" value={troca} placeholder="Substituir por"
            onChange={(e) => setTroca(e.target.value)}
          />
          <span className="ed-achados">
            {busca ? `${alvos.length ? Math.min(atual + 1, alvos.length) : 0} de ${alvos.length}` : ""}
          </span>
          <button type="button" className="ed-icone" onClick={() => irPara(atual - 1)} title="Anterior">
            <ArrowUp size={14} strokeWidth={2} aria-hidden="true" /><span className="ed-oculto">Anterior</span>
          </button>
          <button type="button" className="ed-icone" onClick={() => irPara(atual + 1)} title="Próximo">
            <ArrowDown size={14} strokeWidth={2} aria-hidden="true" /><span className="ed-oculto">Próximo</span>
          </button>
          <label className="ed-caixa">
            <input type="checkbox" checked={diferenciar} onChange={(e) => setDiferenciar(e.target.checked)} />
            Maiúsculas
          </label>
          <button type="button" className="btn secundario pequeno" onClick={substituirAtual} disabled={!alvos.length}>
            Substituir
          </button>
          <button type="button" className="btn secundario pequeno" onClick={substituirTodas} disabled={!alvos.length}>
            Todas
          </button>
          <button type="button" className="ed-icone" onClick={() => setProcurando(false)} title="Fechar">
            <X size={14} strokeWidth={2} aria-hidden="true" /><span className="ed-oculto">Fechar</span>
          </button>
        </div>
      )}

      <div className="ed-area">
        <div className="ed-numeros" ref={numeros} aria-hidden="true">
          {Array.from({ length: linhas }, (_, i) => <div key={i}>{i + 1}</div>)}
        </div>

        <div className="ed-pilha">
          {/* O colorido fica atrás e não recebe evento nenhum. O que a pessoa
              toca é sempre o textarea. */}
          <pre className="ed-colorido" ref={colorido} aria-hidden="true">
            <code dangerouslySetInnerHTML={{ __html: `${pintado}\n` }} />
          </pre>
          <textarea
            className="ed-campo" ref={campo} value={texto}
            onChange={(e) => mudar(e.target.value)}
            onScroll={rolou}
            onKeyDown={aoTeclar}
            spellCheck={false} autoCapitalize="off" autoCorrect="off"
            wrap="off"
            aria-label={`Código ${nome}`}
          />
        </div>
      </div>

      {recado && <div className="ed-recado" role="status">{recado}</div>}
    </div>
  );
}
