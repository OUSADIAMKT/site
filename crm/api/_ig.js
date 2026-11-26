// Camada fina sobre a API de mensagens do Instagram.
// Nada aqui decide o que dizer, só entrega. Mesmo papel do `_wa.js`.

const VERSAO = process.env.IG_API_VERSION || "v23.0";
const BASE = "https://graph.instagram.com";

// São dois caminhos para a MESMA API, e quem decide é como o token nasceu:
// token da própria conta (Login do Instagram) fala com graph.instagram.com;
// token de Página, gerado dentro de um BM (Login do Facebook), fala com
// graph.facebook.com. Os caminhos das chamadas são idênticos, só o host muda.
//
// Por isso o host mora no cliente: na instalação a gente descobre qual o BM
// entregou e grava em `clientes.ig_base`, sem precisar mexer em código de noite.
function base(cliente) {
  return (cliente.ig_base || BASE).replace(/\/+$/, "");
}

async function postar(cliente, caminho, corpo) {
  const resposta = await fetch(`${base(cliente)}/${VERSAO}/${caminho}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${cliente.ig_token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(corpo),
  });

  const dados = await resposta.json().catch(() => ({}));
  if (!resposta.ok) {
    const detalhe = dados?.error?.message || resposta.statusText;
    throw new Error(`Instagram ${resposta.status}: ${detalhe}`);
  }
  return dados;
}

// ---------------------------------------------------------------
// Mensagem direta
// ---------------------------------------------------------------
export async function enviarTextoIG(cliente, igsid, texto) {
  const r = await postar(cliente, `${cliente.ig_user_id}/messages`, {
    recipient: { id: igsid },
    message: { text: texto },
  });

  // O id que a Meta devolve é a única prova de que a mensagem existiu do lado
  // dela. Sem registrar isto, uma resposta que o banco jura ter mandado e que
  // nunca apareceu na conversa vira palavra contra palavra, e foi exatamente
  // nisso que a gente ficou presos uma noite inteira.
  console.log(`[ig] enviado para ${igsid}: ${r?.message_id || "SEM id na resposta"}`);
  return r;
}

export async function enviarMidiaIG(cliente, igsid, midia) {
  // O Instagram aceita só URL pública aqui, não aceita id de upload como o
  // WhatsApp. Mídia cadastrada apenas com `wa_media_id` não tem como ser
  // enviada por este canal.
  if (!midia.url) {
    throw new Error(`A mídia "${midia.chave}" não tem URL pública, e o Instagram exige URL.`);
  }
  const tipo = midia.tipo === "document" ? "file" : midia.tipo; // image | video | audio | file
  return postar(cliente, `${cliente.ig_user_id}/messages`, {
    recipient: { id: igsid },
    message: { attachment: { type: tipo, payload: { url: midia.url } } },
  });
}

export async function digitandoIG(cliente, igsid) {
  return postar(cliente, `${cliente.ig_user_id}/messages`, {
    recipient: { id: igsid },
    sender_action: "typing_on",
  });
}

export async function marcarLidaIG(cliente, igsid) {
  return postar(cliente, `${cliente.ig_user_id}/messages`, {
    recipient: { id: igsid },
    sender_action: "mark_seen",
  });
}

// O @ de quem está conversando.
//
// No Instagram a mensagem chega só com o IGSID, que é um número e não serve
// para nada humano: quem atende olha a fila, vê "1700000000000001" e não tem
// como procurar a pessoa no Instagram para responder por fora. Já atrapalhou.
//
// Buscar o perfil direto pelo IGSID (`/{igsid}?fields=username`) NÃO funciona
// com token de usuário de sistema: responde "(#100) The page is not linked to
// an Instagram account". O caminho que funciona é listar as conversas e achar
// o participante, que vem com o username junto.
//
// Devolve null quando não achar: nome de contato é conforto, nunca motivo para
// uma mensagem deixar de ser respondida.
export async function usuarioDaConversaIG(cliente, igsid) {
  const url = `${base(cliente)}/${VERSAO}/${cliente.ig_user_id}/conversations`
    + `?platform=instagram&fields=participants&limit=50`
    + `&access_token=${encodeURIComponent(cliente.ig_token)}`;

  const resposta = await fetch(url);
  const dados = await resposta.json().catch(() => ({}));
  if (!resposta.ok) {
    console.warn("[ig] não deu para listar conversas:", dados?.error?.message || resposta.status);
    return null;
  }

  for (const conversa of dados.data || []) {
    const quem = (conversa.participants?.data || []).find((p) => p.id === String(igsid));
    if (quem?.username) return quem.username;
  }
  return null;
}

// ---------------------------------------------------------------
// Comentário
// ---------------------------------------------------------------

// Resposta pública, que fica embaixo do comentário e qualquer um vê.
export async function responderComentarioIG(cliente, commentId, texto) {
  return postar(cliente, `${commentId}/replies`, { message: texto });
}

// Resposta privada: abre a conversa na DM a partir do comentário.
//
// A API permite UMA por comentário, e só dentro de 7 dias. Depois disso a
// conversa só continua se a pessoa responder, e aí vale a janela de 24h normal.
// Quem garante o "uma só" é a tabela `ig_comentarios`, não este arquivo.
export async function responderPrivadoIG(cliente, commentId, texto) {
  return postar(cliente, `${cliente.ig_user_id}/messages`, {
    recipient: { comment_id: commentId },
    message: { text: texto },
  });
}

// ---------------------------------------------------------------
// Conferencia do perfil, para a tela de Canais.
//
// Mesma ideia do `conferirNumero` do WhatsApp: credencial errada so aparece
// quando alguem manda mensagem de verdade e nada acontece. Aqui a resposta
// vem na hora, com a mensagem da propria Meta.
//
// Serve tambem para descobrir o host certo. Token de conta e token de Pagina
// falam com hosts diferentes, e errar o host devolve um 400 generico que nao
// diz qual dos dois era. Entao tenta o informado e, se falhar, tenta o outro,
// e devolve qual funcionou para o `ig_base` ser gravado certo.
export async function conferirPerfil(cliente) {
  const hosts = cliente.ig_base
    ? [cliente.ig_base, cliente.ig_base.includes("instagram") ? "https://graph.facebook.com" : BASE]
    : [BASE, "https://graph.facebook.com"];

  let ultimoErro;
  for (const host of [...new Set(hosts)]) {
    try {
      const r = await fetch(
        `${host.replace(/\/+$/, "")}/${VERSAO}/${cliente.ig_user_id}`
        + `?fields=id,username,name,profile_picture_url,followers_count`,
        { headers: { Authorization: `Bearer ${cliente.ig_token}` } },
      );
      const dados = await r.json().catch(() => ({}));
      if (!r.ok) {
        ultimoErro = `Instagram ${r.status}: ${dados?.error?.message || r.statusText}`;
        continue;
      }
      return {
        ig_user_id: dados.id,
        usuario: dados.username || null,
        nome: dados.name || null,
        seguidores: dados.followers_count ?? null,
        // O host que respondeu. Quem chamou grava isto no canal.
        base: host.replace(/\/+$/, ""),
      };
    } catch (e) {
      ultimoErro = e.message;
    }
  }
  throw new Error(ultimoErro || "Nenhum host do Instagram respondeu.");
}
