import { useState, useEffect } from "react";
import { MessageCircle, Instagram } from "lucide-react";
import { chamar } from "./api.js";
import { nomeDoCanal, numeroBonito as bonito } from "./canal.js";
import CabecalhoPagina from "./CabecalhoPagina.jsx";

// Os canais de atendimento do cliente: números de WhatsApp e perfis do
// Instagram, na mesma lista.
//
// Antes desta tela, ligar um canal era rodar INSERT na mão no Supabase, com
// o token colado em texto puro dentro do editor de SQL. Agora o token entra
// por um campo de senha, é cifrado no servidor e nunca mais volta para a tela.
//
// O nome é Canais, e não Conexões, porque Conexões já é a tela do REPORT, que
// liga as contas de anúncio do Facebook. Coisas diferentes, menus diferentes.

export const TIPOS = {
  whatsapp:  { nome: "WhatsApp",  Icone: MessageCircle, cor: "#25d366" },
  instagram: { nome: "Instagram", Icone: Instagram,     cor: "#e1306c" },
};

const QUALIDADE = {
  GREEN:  { rotulo: "boa",     classe: "humano" },
  YELLOW: { rotulo: "atenção", classe: "morno" },
  RED:    { rotulo: "ruim",    classe: "quente" },
};

// O tier é quantas conversas por 24h a Meta libera. Número novo começa em 250
// e sobe sozinho conforme a qualidade se mantém.
const TIER = {
  STANDARD: "1.000 conversas/dia",
  TIER_50: "50 conversas/dia",
  TIER_250: "250 conversas/dia",
  TIER_1K: "1.000 conversas/dia",
  TIER_10K: "10.000 conversas/dia",
  TIER_100K: "100.000 conversas/dia",
  TIER_UNLIMITED: "sem limite",
};

function Copiar({ valor, children }) {
  const [copiou, setCopiou] = useState(false);

  async function copiar() {
    try {
      await navigator.clipboard.writeText(valor);
      setCopiou(true);
      setTimeout(() => setCopiou(false), 1800);
    } catch {
      // Navegador sem permissão de área de transferência: o valor está na
      // tela de qualquer jeito, dá para selecionar na mão.
    }
  }

  return (
    <button className="btn secundario pequeno" onClick={copiar} title={valor}>
      {copiou ? "copiado" : children || "copiar"}
    </button>
  );
}

export default function Canais({ cliente, aoMudar }) {
  const [lista, setLista] = useState(null);
  const [webhook, setWebhook] = useState(null);
  const [erro, setErro] = useState("");
  const [novo, setNovo] = useState(null); // o tipo que está sendo criado
  const [editando, setEditando] = useState(null);
  const [testes, setTestes] = useState({});
  const [testando, setTestando] = useState(null);

  async function carregar() {
    try {
      const r = await chamar(`painel-clientes?rota=canais&cliente=${cliente.id}`);
      setLista(r.canais);
      setWebhook(r.webhook_url);
      setErro("");
      // A lateral mostra a mesma lista. Sem isto, ligar um canal novo so
      // aparece no seletor depois de um F5.
      aoMudar?.();
    } catch (e) {
      setErro(e.message);
    }
  }

  useEffect(() => {
    setLista(null); setNovo(null); setEditando(null); setTestes({});
    carregar();
  }, [cliente.id]);

  async function conferir(canal) {
    setTestando(canal.id);
    try {
      const r = await chamar("painel-clientes?rota=canais", {
        method: "POST", body: { acao: "testar", id: canal.id },
      });
      setTestes((t) => ({ ...t, [canal.id]: r }));
      if (r.ok) carregar(); // tier e host podem ter mudado do lado da Meta
    } catch (e) {
      setTestes((t) => ({ ...t, [canal.id]: { ok: false, erro: e.message } }));
    } finally {
      setTestando(null);
    }
  }

  async function alternar(canal) {
    const aviso = canal.ativo
      ? `Desligar ${nomeDoCanal(canal)}? As mensagens que chegarem nele param de ser respondidas.`
      : `Religar ${nomeDoCanal(canal)}?`;
    if (!confirm(aviso)) return;
    try {
      await chamar("painel-clientes?rota=canais", {
        method: "PATCH", body: { id: canal.id, ativo: !canal.ativo },
      });
      carregar();
    } catch (e) {
      setErro(e.message);
    }
  }

  async function apagar(canal) {
    const texto = `Apagar o canal ${nomeDoCanal(canal)} de vez?\n\n`
      + "As conversas e as mensagens continuam no banco. O que some é a credencial: "
      + "o canal para de receber e você precisa cadastrar tudo de novo para voltar.";
    if (!confirm(texto)) return;
    try {
      await chamar(`painel-clientes?rota=canais&id=${canal.id}`, { method: "DELETE" });
      carregar();
    } catch (e) {
      setErro(e.message);
    }
  }

  const formAberto = novo || editando;

  return (
    <>
      <CabecalhoPagina titulo={<>Canais de {cliente.nome}</>}>
        Por onde este cliente atende. O token é cifrado antes de entrar no banco
        e não volta para esta tela: para trocar, cole um novo.
      </CabecalhoPagina>

      {erro && <div className="aviso erro" role="alert">{erro}</div>}

      {lista === null ? (
        <div className="vazio">Carregando…</div>
      ) : lista.length === 0 ? (
        <div className="vazio">
          Nenhum canal ligado. Enquanto não houver, este cliente não recebe nem
          responde nada.
        </div>
      ) : (
        lista.map((c) => (
          <Cartao
            key={c.id}
            canal={c}
            webhook={webhook}
            teste={testes[c.id]}
            testando={testando === c.id}
            aoConferir={() => conferir(c)}
            aoAlternar={() => alternar(c)}
            aoApagar={() => apagar(c)}
            aoEditar={() => { setNovo(null); setEditando(c); }}
          />
        ))
      )}

      {editando && (
        <Formulario
          cliente={cliente}
          canal={editando}
          tipo={editando.tipo}
          aoSalvar={() => { setEditando(null); carregar(); }}
          aoCancelar={() => setEditando(null)}
        />
      )}

      {novo && (
        <Formulario
          cliente={cliente}
          tipo={novo}
          aoSalvar={() => { setNovo(null); carregar(); }}
          aoCancelar={() => setNovo(null)}
        />
      )}

      {!formAberto && (
        <div className="acoes">
          <button className="btn" onClick={() => setNovo("whatsapp")}>
            Ligar um WhatsApp
          </button>
          <button className="btn secundario" onClick={() => setNovo("instagram")}>
            Ligar um Instagram
          </button>
        </div>
      )}
    </>
  );
}

function Cartao({ canal, webhook, teste, testando, aoConferir, aoAlternar, aoApagar, aoEditar }) {
  const [mostrarMeta, setMostrarMeta] = useState(false);
  const ehIG = canal.tipo === "instagram";
  const { Icone, cor, nome: nomeDoTipo } = TIPOS[canal.tipo] || TIPOS.whatsapp;
  const q = QUALIDADE[teste?.info?.qualidade];

  return (
    <div className="cartao">
      <h2 style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <Icone size={18} strokeWidth={2} style={{ color: cor }} aria-label={nomeDoTipo} />
        {nomeDoCanal(canal)}
        {!canal.ativo && <span className="etiqueta frio">desligado</span>}
        {canal.coexistencia && <span className="etiqueta">coexistência</span>}
      </h2>

      <p>
        {nomeDoTipo}
        {!ehIG && canal.tier && <> · {TIER[canal.tier] || canal.tier}</>}
      </p>

      <table>
        <tbody>
          {ehIG ? (
            <Linha rotulo="ID do perfil" valor={canal.ig_user_id} />
          ) : (
            <>
              <Linha rotulo="ID do número" valor={canal.phone_number_id} />
              <Linha rotulo="WABA" valor={canal.waba_id} />
            </>
          )}
          <tr>
            <td style={{ width: "11rem", color: "var(--texto-2)", fontWeight: 400 }}>Token</td>
            <td style={{ fontFamily: "var(--mono)", fontSize: 13 }}>
              {canal.token_ilegivel
                ? <span className="etiqueta quente">não decifra</span>
                : canal.token_resumo}
              {!canal.tem_app_secret && (
                <> <span className="etiqueta morno">sem app secret</span></>
              )}
            </td>
          </tr>
        </tbody>
      </table>

      {canal.token_ilegivel && (
        <div className="aviso erro" role="alert">
          O token guardado não abre com a chave atual do servidor. Este canal não
          consegue enviar nada. Cole o token de novo em <strong>Editar</strong>.
        </div>
      )}

      {teste && (teste.ok ? (
        <div className="aviso ok" role="status">
          <strong>A Meta respondeu.</strong>{" "}
          {ehIG ? (
            <>
              Perfil <strong>@{teste.info.usuario}</strong>
              {teste.info.nome && <> ({teste.info.nome})</>}
              {teste.info.seguidores != null && <>, {teste.info.seguidores.toLocaleString("pt-BR")} seguidores</>}.
            </>
          ) : (
            <>
              Número {teste.info.numero}, em nome de <strong>{teste.info.nome_verificado}</strong>.
              {q && <> Qualidade <span className={`etiqueta ${q.classe}`}>{q.rotulo}</span>.</>}
              {teste.info.tier && <> Libera {TIER[teste.info.tier] || teste.info.tier}.</>}
              {!teste.info.verificado && (
                <div style={{ marginTop: 6 }}>
                  O número ainda não concluiu a verificação por código na Meta.
                </div>
              )}
            </>
          )}
        </div>
      ) : (
        <div className="aviso erro" role="alert">
          <strong>A Meta recusou.</strong> {teste.erro}
          <div style={{ marginTop: 6, fontSize: 13 }}>
            Token vencido, token de outro app, ou o app sem permissão sobre este canal.
          </div>
        </div>
      ))}

      <div className="acoes">
        <button className="btn secundario" onClick={aoConferir} disabled={testando}>
          {testando ? "Perguntando à Meta…" : "Conferir credencial"}
        </button>
        {!ehIG && (
          <button className="btn secundario" onClick={() => setMostrarMeta((m) => !m)}>
            {mostrarMeta ? "Esconder dados do webhook" : "Dados para a Meta"}
          </button>
        )}
        <button className="btn secundario" onClick={aoEditar}>Editar</button>
        <button className={`btn ${canal.ativo ? "perigo" : "secundario"}`} onClick={aoAlternar}>
          {canal.ativo ? "Desligar" : "Religar"}
        </button>
        <button className="btn perigo" onClick={aoApagar}>Apagar</button>
      </div>

      {mostrarMeta && !ehIG && (
        <>
          <h2 style={{ marginTop: 18 }}>No app da Meta, em Webhooks</h2>
          <p>
            Cole estes dois valores no app do WhatsApp e assine o campo <strong>messages</strong>.
            Sem a assinatura desse campo a Meta aceita a URL mas nunca manda nada para ela.
          </p>

          <div className="campo">
            <label>Callback URL</label>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <input readOnly value={webhook || "não foi possível descobrir o endereço"} />
              {webhook && <Copiar valor={webhook} />}
            </div>
          </div>

          <div className="campo">
            <label>Verify token</label>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <input readOnly value={canal.verify_token || ""} />
              {canal.verify_token && <Copiar valor={canal.verify_token} />}
            </div>
            <p className="dica">
              Sorteado quando o canal foi criado. Ele só prova que a URL é nossa quando
              a Meta bate nela, então pode ficar à vista.
            </p>
          </div>
        </>
      )}
    </div>
  );
}

function Linha({ rotulo, valor }) {
  return (
    <tr>
      <td style={{ width: "11rem", color: "var(--texto-2)", fontWeight: 400 }}>{rotulo}</td>
      <td style={{ fontFamily: "var(--mono)", fontSize: 13 }}>{valor}</td>
    </tr>
  );
}

function Formulario({ cliente, canal, tipo, aoSalvar, aoCancelar }) {
  const editando = Boolean(canal);
  const ehIG = tipo === "instagram";
  const { nome: nomeDoTipo } = TIPOS[tipo] || TIPOS.whatsapp;

  const [waba, setWaba] = useState(canal?.waba_id || "");
  const [phoneId, setPhoneId] = useState(canal?.phone_number_id || "");
  const [numero, setNumero] = useState(canal?.numero_e164 || "");
  const [igId, setIgId] = useState(canal?.ig_user_id || "");
  const [nome, setNome] = useState(canal?.nome_exibicao || "");
  const [token, setToken] = useState("");
  const [appSecret, setAppSecret] = useState("");
  const [coexistencia, setCoexistencia] = useState(canal?.coexistencia || false);

  const [erro, setErro] = useState("");
  const [teste, setTeste] = useState(null);
  const [testando, setTestando] = useState(false);
  const [salvando, setSalvando] = useState(false);

  const identificador = ehIG ? igId : phoneId;
  // O app secret entra na conta de criar porque o servidor passou a exigi-lo:
  // sem ele o webhook recusa os eventos da Meta em produção.
  const faltaParaCriar = !appSecret || (ehIG
    ? !igId || !token
    : !waba || !phoneId || !numero || !token);

  // Conferir antes de salvar. Token errado descoberto agora custa um clique;
  // descoberto depois custa as mensagens que ninguém respondeu nesse meio.
  async function conferir() {
    setTestando(true);
    setTeste(null);
    try {
      const r = await chamar("painel-clientes?rota=canais", {
        method: "POST",
        body: ehIG
          ? { acao: "testar", tipo, ig_user_id: igId, token }
          : { acao: "testar", tipo, phone_number_id: phoneId, token },
      });
      setTeste(r);
      // A Meta sabe o nome melhor que a gente: se veio em branco no
      // formulário, preenche com o que ela respondeu.
      if (r.ok && !nome) {
        if (ehIG && r.info.usuario) setNome(`@${r.info.usuario}`);
        if (!ehIG && r.info.nome_verificado) setNome(r.info.nome_verificado);
      }
      if (r.ok && !ehIG && !numero && r.info.numero) {
        setNumero(r.info.numero.replace(/\D/g, ""));
      }
    } catch (e) {
      setTeste({ ok: false, erro: e.message });
    } finally {
      setTestando(false);
    }
  }

  async function salvar() {
    setErro("");
    setSalvando(true);
    try {
      const comuns = {
        nome_exibicao: nome,
        ...(token && { token }),
        ...(appSecret && { app_secret: appSecret }),
      };

      const especificos = ehIG
        ? { ig_user_id: igId, ...(teste?.ok && teste.info.base && { ig_base: teste.info.base }) }
        : { waba_id: waba, numero_e164: numero, coexistencia };

      if (editando) {
        await chamar("painel-clientes?rota=canais", {
          method: "PATCH",
          body: { id: canal.id, ...comuns, ...especificos },
        });
      } else {
        await chamar("painel-clientes?rota=canais", {
          method: "POST",
          body: {
            cliente_id: cliente.id, tipo,
            phone_number_id: phoneId,
            ...comuns, ...especificos,
          },
        });
      }
      aoSalvar();
    } catch (e) {
      setErro(e.message);
      setSalvando(false);
    }
  }

  return (
    <div className="cartao">
      <h2>{editando ? `Editar ${nomeDoCanal(canal)}` : `Ligar um ${nomeDoTipo}`}</h2>
      <p>
        {ehIG ? (
          <>
            O ID do perfil sai do painel da Meta. O token precisa ser de longa duração:
            o de teste vence em uma hora e para tudo logo depois.
          </>
        ) : (
          <>
            Os três primeiros campos saem do painel da Meta, em WhatsApp → Configuração
            da API. O token precisa ser permanente, de usuário do sistema: o token de teste
            que aparece junto na tela vence em 24 horas e para tudo no dia seguinte.
          </>
        )}
      </p>

      <div className="linha">
        {ehIG ? (
          <div className="campo">
            <label htmlFor="cig">ID do perfil</label>
            <input
              id="cig" type="text" value={igId} autoFocus={!editando} disabled={editando}
              onChange={(e) => setIgId(e.target.value)} placeholder="só dígitos"
            />
            <p className="dica">
              {editando
                ? "Não muda. Perfil diferente é canal diferente."
                : "O Instagram Business ID, não o @."}
            </p>
          </div>
        ) : (
          <>
            <div className="campo">
              <label htmlFor="cphone">ID do número</label>
              <input
                id="cphone" type="text" value={phoneId} autoFocus={!editando} disabled={editando}
                onChange={(e) => setPhoneId(e.target.value)} placeholder="só dígitos"
              />
              <p className="dica">
                {editando
                  ? "Não muda. Número diferente é canal diferente."
                  : "Phone number ID, não o telefone."}
              </p>
            </div>

            <div className="campo">
              <label htmlFor="cwaba">ID da conta (WABA)</label>
              <input id="cwaba" type="text" value={waba}
                     onChange={(e) => setWaba(e.target.value)} placeholder="só dígitos" />
              <p className="dica">É por ele que os templates aprovados são lidos.</p>
            </div>

            <div className="campo">
              <label htmlFor="cnum">Telefone</label>
              <input id="cnum" type="text" value={numero}
                     onChange={(e) => setNumero(e.target.value)} placeholder="5511999990000" />
              <p className="dica">Com país e DDD.</p>
            </div>
          </>
        )}

        <div className="campo">
          <label htmlFor="cnome">Nome de exibição</label>
          <input id="cnome" type="text" value={nome}
                 onChange={(e) => setNome(e.target.value)}
                 placeholder={ehIG ? "@ousadiaamazonia" : "Ousadia Amazônia"} />
          <p className="dica">Só para você reconhecer na lista e no seletor.</p>
        </div>
      </div>

      <div className="campo">
        <label htmlFor="ctoken">Token de acesso{editando && " (deixe vazio para manter)"}</label>
        <input
          id="ctoken" type="password" value={token} autoComplete="new-password"
          onChange={(e) => { setToken(e.target.value); setTeste(null); }}
          placeholder={editando ? canal.token_resumo || "cole o token novo" : "EAA…"}
        />
        <p className="dica">
          Cifrado em AES-256-GCM antes de entrar no banco, com a chave fora dele. Depois
          de salvo não volta para esta tela nem para log nenhum.
        </p>
      </div>

      {/* O app secret vale para os dois tipos: é ele que assina tanto o evento
          do WhatsApp quanto o do Instagram. Ficava dentro do bloco só-WhatsApp,
          e por isso um perfil do Instagram não tinha onde guardar o segredo. */}
      <div className="campo">
        <label htmlFor="csecret">App secret{editando && " (deixe vazio para manter)"}</label>
        <input
          id="csecret" type="password" value={appSecret} autoComplete="new-password"
          onChange={(e) => setAppSecret(e.target.value)}
          placeholder={editando && canal.tem_app_secret ? "guardado" : "obrigatório"}
        />
        <p className="dica">
          É com ele que o webhook confere a assinatura de cada evento. Sem app secret,
          o webhook recusa tudo o que chegar neste canal.
        </p>
      </div>

      {!ehIG && (
        <>
          <div className="campo">
            <label htmlFor="ccoex">
              <input id="ccoex" type="checkbox" checked={coexistencia}
                     onChange={(e) => setCoexistencia(e.target.checked)} />
              {" "}O número continua rodando no aplicativo do celular
            </label>
            <p className="dica">
              Modo coexistência. Marque se a equipe também responde pelo WhatsApp Business
              no telefone: as mensagens aparecem nos dois lugares.
            </p>
          </div>
        </>
      )}

      {teste && (teste.ok ? (
        <div className="aviso ok" role="status">
          <strong>Credencial válida.</strong>{" "}
          {ehIG
            ? <>A Meta respondeu <strong>@{teste.info.usuario}</strong>.</>
            : <>A Meta respondeu {teste.info.numero}
                {teste.info.nome_verificado && <>, em nome de <strong>{teste.info.nome_verificado}</strong></>}.</>}
        </div>
      ) : (
        <div className="aviso erro" role="alert"><strong>A Meta recusou.</strong> {teste.erro}</div>
      ))}

      {erro && <div className="aviso erro" role="alert">{erro}</div>}

      <div className="acoes">
        <button className="btn secundario" onClick={conferir}
                disabled={testando || !identificador || !token}>
          {testando ? "Perguntando à Meta…" : "Conferir antes de salvar"}
        </button>
        <button className="btn" onClick={salvar}
                disabled={salvando || (editando ? !identificador : faltaParaCriar)}>
          {salvando ? "Salvando…" : editando ? "Salvar" : `Ligar ${nomeDoTipo}`}
        </button>
        <button className="btn secundario" onClick={aoCancelar}>Cancelar</button>
      </div>
    </div>
  );
}
