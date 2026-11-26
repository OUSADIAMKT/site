// REPORT · a única função do módulo de relatórios da agência. O plano Hobby
// da Vercel aceita 12 funções por deploy, então tudo entra por aqui e a rota
// vem em ?rota= (vercel.json reescreve os endereços bonitos para cá).
//
// Três portas, cada uma com o seu porteiro:
//   painel   → sessão de operador (barrouOperador). Atendente nunca entra.
//   máquina  → CRON_SECRET (coleta agendada e disparo por conta)
//   mcp      → REPORT_MCP_TOKEN
//   público  → só o retorno do login da Meta (com state assinado) e o
//              relatório por código aleatório.

import crypto from "node:crypto";
import { waitUntil } from "@vercel/functions";
import { db } from "./_db.js";
import { barrouOperador, sessaoDeOperador } from "./_painel.js";
import * as meta from "./_meta.js";
import * as rp from "./_report.js";
import { escreverAnalise } from "./_report_ia.js";
import { atenderMcp } from "./_mcp.js";
import { atenderPaginas, servirPaginaPublica, registrarEventoDaPagina } from "./_paginasRotas.js";

function base(req) {
  if (process.env.REPORT_BASE_URL) return process.env.REPORT_BASE_URL.replace(/\/$/, "");
  return `https://${req.headers["x-forwarded-host"] || req.headers.host}`;
}

function segredoConfere(recebido, esperado) {
  if (!recebido || !esperado) return false;
  const a = Buffer.from(String(recebido));
  const b = Buffer.from(String(esperado));
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

function bearer(req) {
  const h = req.headers.authorization || "";
  return h.startsWith("Bearer ") ? h.slice(7) : null;
}

const ehMaquina = (req) => segredoConfere(bearer(req), process.env.CRON_SECRET);

// Erro conhecido vira mensagem clara; o resto vira 500 com o detalhe.
function erro(res, e) {
  if (e.semConexao) return res.status(409).json({ error: e.message, semConexao: true });
  if (e.guarda) return res.status(422).json({ error: e.message, guarda: true });
  if (e instanceof meta.ErroMeta) {
    return res.status(e.tokenInvalido ? 409 : 502).json({
      error: e.tokenInvalido ? "A Meta recusou o token. Reconecte o Facebook na aba Contas." : `Meta: ${e.message}`,
      semConexao: e.tokenInvalido || undefined,
    });
  }
  return res.status(500).json({ error: "Falha no REPORT", detalhe: e.message });
}

function datas(q) {
  const ontem = rp.somarDias(rp.hojeNoFuso(), -1);
  const fim = /^\d{4}-\d{2}-\d{2}$/.test(q.fim || "") ? q.fim : ontem;
  const inicio = /^\d{4}-\d{2}-\d{2}$/.test(q.inicio || "") ? q.inicio : rp.somarDias(fim, -29);
  if (inicio > fim) throw Object.assign(new Error("O início precisa ser antes do fim."), { guarda: true });
  return { inicio, fim };
}

// ---------------------------------------------------------------
// Coleta: o cron chama sem conta; cada conta vira uma chamada própria,
// para uma conta lenta não estourar o tempo das outras.
// ---------------------------------------------------------------

async function dispararColeta(req) {
  const token = await rp.tokenAtivo();
  const sinc = await rp.sincronizarContas(token);
  const contas = await rp.contasParaColetar();

  const segredo = process.env.CRON_SECRET;
  if (!segredo) throw new Error("CRON_SECRET não configurado: sem ele a coleta não consegue se dividir por conta.");

  const respostas = await Promise.allSettled(contas.map((c) =>
    fetch(`${base(req)}/api/report?rota=coletar&conta=${c.id}`, {
      method: "POST", headers: { Authorization: `Bearer ${segredo}` },
    })));
  const disparadas = respostas.filter((r) => r.status === "fulfilled" && r.value.status === 202).length;
  return { sincronizadas: sinc, contas: contas.length, disparadas };
}

async function coletarUma(req, res, contaId) {
  const { data: conta } = await db().from("report_contas")
    .select("id, cliente_id, plataforma, id_externo, nome, fuso, ultima_coleta_em").eq("id", contaId).maybeSingle();
  if (!conta) return res.status(404).json({ error: "Conta não encontrada." });
  const token = await rp.tokenAtivo();
  waitUntil(rp.coletarConta(conta, token));
  return res.status(202).json({ ok: true, conta: conta.nome });
}

// ---------------------------------------------------------------
// Rotas
// ---------------------------------------------------------------

export default async function handler(req, res) {
  const q = req.query || {};
  const rota = q.rota;

  try {
    // ---------- públicas ----------
    if (rota === "callback") {
      const volta = (params) => res.redirect(302, `${base(req)}/?${new URLSearchParams({ aba: "contas", ...params })}`);
      if (q.error) return volta({ report: "erro", msg: q.error_description || q.error });
      if (!rp.stateValido(q.state)) return volta({ report: "erro", msg: "Login expirado ou inválido. Tente de novo." });
      const c = await meta.trocarCodigo(q.code, `${base(req)}/api/report-callback`);
      await rp.salvarConexao(c);
      waitUntil(rp.sincronizarContas(c.token).catch(() => {}));
      return volta({ report: "conectado" });
    }

    // ---------- link curto rastreado (público, sem sessão) ----------
    // O número da Lia não vai como wa.me direto dentro do disparo: vai como
    // /l/<chave>, que conta o clique e redireciona. Depois do clique a conversa
    // acontece no aparelho dela, fora daqui, então este contador é a única
    // coisa que a gente consegue saber. Sem sessão de propósito: quem abre é o
    // cliente final, no celular dele.
    if (rota === "ir") {
      const { data: link } = await db().from("links")
        .select("id, url, ativo").eq("chave", q.chave).eq("ativo", true).maybeSingle();
      if (!link) return res.status(404).send("Link não encontrado.");

      // O clique é contado depois do redirecionamento sair, não antes: o que
      // importa para a pessoa é chegar na Lia, e banco lento não pode segurar
      // isso. Perder um clique na contagem é barato; perder a pessoa não é.
      waitUntil(db().rpc("somar_clique", { p_link: link.id }).then(
        () => {}, (e) => console.warn("[link] não contou:", e.message)));

      res.setHeader("Cache-Control", "no-store");
      res.writeHead(302, { Location: link.url });
      return res.end();
    }

    if (rota === "publico") {
      const r = await rp.relatorioPublico(q.c);
      if (!r) return res.status(404).json({ error: "Relatório não encontrado." });
      res.setHeader("Cache-Control", "public, max-age=300");
      return res.status(200).json(r);
    }

    // ---------- landing pages ----------
    //
    // A landing page publicada, servida por /p/<slug> e pelo domínio do
    // cliente. Fica aqui em cima, junto das outras públicas, porque quem abre
    // é o cliente final: não tem sessão, não tem token, e não pode ter.
    //
    // O compositor do painel vem logo depois e exige operador, mas o porteiro
    // dele é o dele, dentro de atenderPaginas: as duas portas são funções
    // diferentes para a diferença de porteiro ser estrutural.
    if (rota === "pagina-publica") return servirPaginaPublica(req, res);
    // O contador da página publicada. Público porque quem chama é o navegador
    // do visitante, dentro da landing page do cliente.
    if (rota === "pagina-evento") return registrarEventoDaPagina(req, res);
    if (rota === "paginas") return atenderPaginas(req, res);

    // ---------- mcp ----------
    if (rota === "mcp") {
      const chave = bearer(req) || q.chave;
      if (!segredoConfere(chave, process.env.REPORT_MCP_TOKEN)) {
        return res.status(401).json({ error: "Chave do MCP inválida." });
      }
      return atenderMcp(req, res, { base: base(req) });
    }

    // ---------- coleta (máquina ou operador) ----------
    if (rota === "coletar") {
      const operador = sessaoDeOperador(req);
      if (!ehMaquina(req) && !operador) return res.status(401).json({ error: "Não autenticado." });
      if (q.conta) return coletarUma(req, res, q.conta);
      return res.status(200).json(await dispararColeta(req));
    }

    // ---------- painel: daqui para baixo, só operador ----------
    if (await barrouOperador(req, res)) return;
    const sb = db();

    if (rota === "status") {
      const conexao = await rp.statusConexao();
      const { count: contas } = await sb.from("report_contas").select("id", { count: "exact", head: true });
      const { count: semCliente } = await sb.from("report_contas").select("id", { count: "exact", head: true }).is("cliente_id", null);
      return res.status(200).json({
        conexao, contas: contas || 0, sem_cliente: semCliente || 0,
        app_configurado: Boolean(process.env.META_REPORT_APP_ID && process.env.META_REPORT_APP_SECRET),
        mcp_configurado: Boolean(process.env.REPORT_MCP_TOKEN),
        redirect_uri: `${base(req)}/api/report-callback`,
      });
    }

    if (rota === "conectar" && req.method === "POST") {
      return res.status(200).json({ url: meta.urlLogin(`${base(req)}/api/report-callback`, rp.assinarState()) });
    }

    if (rota === "desconectar" && req.method === "POST") {
      await sb.from("report_conexoes").delete().eq("provedor", "meta");
      return res.status(200).json({ ok: true });
    }

    if (rota === "sincronizar" && req.method === "POST") {
      return res.status(200).json(await rp.sincronizarContas(await rp.tokenAtivo()));
    }

    if (rota === "clientes") {
      if (req.method === "GET") {
        const { data, error } = await sb.from("report_clientes")
          .select("id, nome, slug, ativo, crm_cliente_id, criado_em").order("nome");
        if (error) throw error;
        return res.status(200).json({ clientes: data || [] });
      }
      if (req.method === "POST") {
        const { nome, slug } = req.body || {};
        if (!nome?.trim()) return res.status(400).json({ error: "Informe o nome do cliente." });
        if (!/^[a-z0-9-]+$/.test(slug || "")) {
          return res.status(400).json({ error: "O apelido só aceita letras minúsculas, números e hífen." });
        }
        const { data, error } = await sb.from("report_clientes").insert({ nome: nome.trim(), slug }).select().single();
        if (error) {
          const repetido = error.code === "23505";
          return res.status(repetido ? 409 : 500).json({
            error: repetido ? "Já existe um cliente com esse apelido." : "Falha ao criar cliente", detalhe: error.message,
          });
        }
        return res.status(200).json({ cliente: data });
      }
      if (req.method === "PATCH") {
        const { id, ...campos } = req.body || {};
        if (!id) return res.status(400).json({ error: "Cliente não informado." });
        const atualizacao = {};
        for (const k of ["nome", "ativo", "crm_cliente_id"]) if (k in campos) atualizacao[k] = campos[k];
        if (!Object.keys(atualizacao).length) return res.status(400).json({ error: "Nada para atualizar." });
        const { error } = await sb.from("report_clientes").update(atualizacao).eq("id", id);
        if (error) return res.status(500).json({ error: "Falha ao salvar", detalhe: error.message });
        return res.status(200).json({ ok: true });
      }
    }

    if (rota === "contas") {
      if (req.method === "GET") {
        const { data, error } = await sb.from("report_contas")
          .select("id, cliente_id, plataforma, id_externo, nome, bm_nome, status_externo, ativo, ultima_coleta_em, ultimo_erro, descoberta_em")
          .order("plataforma").order("nome");
        if (error) throw error;
        return res.status(200).json({ contas: data || [] });
      }
      if (req.method === "PATCH") {
        const { id, ...campos } = req.body || {};
        if (!id) return res.status(400).json({ error: "Conta não informada." });
        const atualizacao = {};
        if ("cliente_id" in campos) atualizacao.cliente_id = campos.cliente_id || null;
        if ("ativo" in campos) atualizacao.ativo = Boolean(campos.ativo);
        if (!Object.keys(atualizacao).length) return res.status(400).json({ error: "Nada para atualizar." });
        const { error } = await sb.from("report_contas").update(atualizacao).eq("id", id);
        if (error) return res.status(500).json({ error: "Falha ao salvar", detalhe: error.message });
        return res.status(200).json({ ok: true });
      }
    }

    if (rota === "numeros") {
      if (!q.cliente) return res.status(400).json({ error: "Cliente não informado." });
      const { inicio, fim } = datas(q);
      return res.status(200).json(await rp.numerosDoCliente(q.cliente, inicio, fim));
    }

    if (rota === "campanhas") {
      const token = await rp.tokenAtivo();
      const { inicio, fim } = datas(q);
      const nivel = q.nivel || "campanhas";
      if (nivel === "campanhas") {
        if (!/^act_\d+$/.test(q.conta || "")) return res.status(400).json({ error: "Conta de anúncio inválida." });
        return res.status(200).json({ itens: await meta.listarCampanhas(token, q.conta, inicio, fim) });
      }
      if (!/^\d+$/.test(q.pai || "")) return res.status(400).json({ error: "Informe o id do nível de cima." });
      const itens = nivel === "conjuntos"
        ? await meta.listarConjuntos(token, q.pai, inicio, fim)
        : await meta.listarAnuncios(token, q.pai, inicio, fim);
      return res.status(200).json({ itens });
    }

    if (rota === "alterar" && req.method === "POST") {
      const { tipo, id, mudanca, forcar } = req.body || {};
      return res.status(200).json(await rp.gerir({ tipo, id, mudanca: mudanca || {}, origem: "painel", forcar: Boolean(forcar) }));
    }

    if (rota === "historico") {
      return res.status(200).json({ acoes: await rp.historico({ limite: Math.min(Number(q.limite) || 50, 200) }) });
    }

    if (rota === "relatorios") {
      if (req.method === "GET") {
        let consulta = sb.from("report_relatorios")
          .select("id, cliente_id, inicio, fim, codigo, criado_em, resumo").order("criado_em", { ascending: false }).limit(50);
        if (q.cliente) consulta = consulta.eq("cliente_id", q.cliente);
        const { data, error } = await consulta;
        if (error) throw error;
        return res.status(200).json({
          relatorios: (data || []).map(({ resumo, ...r }) => ({ ...r, tem_analise: Boolean(resumo), link: `${base(req)}/r/${r.codigo}` })),
        });
      }
      if (req.method === "POST") {
        const { cliente_id, com_analise, resumo } = req.body || {};
        if (!cliente_id) return res.status(400).json({ error: "Cliente não informado." });
        const { inicio, fim } = datas(req.body || {});
        let texto = resumo?.trim() || null;
        if (!texto && com_analise) texto = await escreverAnalise(await rp.numerosDoCliente(cliente_id, inicio, fim));
        const r = await rp.gerarRelatorio({ clienteId: cliente_id, inicio, fim, resumo: texto });
        return res.status(200).json({ ...r, link: `${base(req)}/r/${r.codigo}` });
      }
    }

    return res.status(404).json({ error: "Rota do REPORT desconhecida." });
  } catch (e) {
    return erro(res, e);
  }
}
