// Um banco em memória com a forma do supabase-js (from().select().eq()...),
// para os testes dos módulos novos da Ousadia (lead, fila, vendas,
// comunidade, ROAS).
//
// O que ele prova: que o código encadeia as chamadas certas e grava o que
// devia. O que ele NÃO prova: SQL. As funções do Postgres (pegar_tarefas, os
// índices únicos) têm teste próprio em PGlite, em banco-vps.test.js. Aqui
// `unicos` declara quais colunas recusam repetição, para o dublê se comportar
// como o banco de verdade nesses casos.

let seq = 0;

export function bancoDeMentira(tabelas = {}, { unicos = {}, rpc = {} } = {}) {
  const t = (nome) => (tabelas[nome] ||= []);

  function consulta(nome) {
    const filtros = [];
    let acao = "select";
    let carga = null;
    let opcoes = {};
    let limite = null;
    let ordem = null;

    const q = {
      select() { return q; },
      eq(c, v) { filtros.push((l) => l[c] === v); return q; },
      neq(c, v) { filtros.push((l) => l[c] !== v); return q; },
      in(c, vs) { filtros.push((l) => vs.includes(l[c])); return q; },
      is(c, v) { filtros.push((l) => (l[c] ?? null) === v); return q; },
      gte(c, v) { filtros.push((l) => l[c] != null && l[c] >= v); return q; },
      gt(c, v) { filtros.push((l) => l[c] != null && l[c] > v); return q; },
      lt(c, v) { filtros.push((l) => l[c] != null && l[c] < v); return q; },
      lte(c, v) { filtros.push((l) => l[c] != null && l[c] <= v); return q; },
      not(c, op, v) { filtros.push((l) => !(op === "is" ? (l[c] ?? null) === v : l[c] === v)); return q; },
      order(c, o = {}) { ordem = [c, o.ascending !== false]; return q; },
      limit(n) { limite = n; return q; },
      insert(linhas) { acao = "insert"; carga = [].concat(linhas); return q; },
      upsert(linhas, o = {}) { acao = "upsert"; carga = [].concat(linhas); opcoes = o; return q; },
      update(obj) { acao = "update"; carga = obj; return q; },
      delete() { acao = "delete"; return q; },
      maybeSingle() { return executar().then((r) => (r.error ? r : { data: r.data[0] || null, error: null })); },
      single() {
        return executar().then((r) => (r.error ? r : r.data[0]
          ? { data: r.data[0], error: null } : { data: null, error: { message: "nenhuma linha" } }));
      },
      then(ok, erro) { return executar().then(ok, erro); },
    };

    function repetida(linha) {
      for (const cols of unicos[nome] || []) {
        if (cols.some((c) => linha[c] == null)) continue;
        if (t(nome).some((l) => cols.every((c) => l[c] === linha[c]))) return true;
      }
      return false;
    }

    async function executar() {
      if (acao === "insert" || acao === "upsert") {
        const novas = [];
        for (const l of carga) {
          const linha = { id: `id-${++seq}`, criado_em: new Date().toISOString(), ...l };
          if (repetida(linha)) {
            if (acao === "upsert" && opcoes.ignoreDuplicates) continue;
            if (acao === "upsert") {
              const cols = String(opcoes.onConflict || "").split(",").map((c) => c.trim());
              const alvo = t(nome).find((x) => cols.every((c) => x[c] === linha[c]));
              Object.assign(alvo, l);
              novas.push(alvo);
              continue;
            }
            return { data: null, error: { code: "23505", message: "duplicada" } };
          }
          t(nome).push(linha);
          novas.push(linha);
        }
        return { data: novas, error: null };
      }
      let achadas = t(nome).filter((l) => filtros.every((f) => f(l)));
      if (acao === "update") {
        for (const l of achadas) Object.assign(l, carga);
        return { data: achadas, error: null };
      }
      if (acao === "delete") {
        tabelas[nome] = t(nome).filter((l) => !achadas.includes(l));
        return { data: achadas, error: null };
      }
      if (ordem) {
        const [c, asc] = ordem;
        achadas = [...achadas].sort((a, b) => (a[c] > b[c] ? 1 : a[c] < b[c] ? -1 : 0) * (asc ? 1 : -1));
      }
      return { data: limite ? achadas.slice(0, limite) : achadas, error: null };
    }
    return q;
  }

  return {
    tabelas,
    from: consulta,
    async rpc(nome, args) {
      if (!rpc[nome]) return { data: null, error: { message: `rpc desconhecida: ${nome}` } };
      return { data: await rpc[nome](tabelas, args), error: null };
    },
  };
}
