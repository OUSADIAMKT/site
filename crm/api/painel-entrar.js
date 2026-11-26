import { senhaConfere, autenticarAtendente, gerarToken } from "./_painel.js";

// Freio simples contra tentativa em série. Vive na memória da função, então
// some a cada deploy: suficiente para um painel deste tamanho.
const tentativas = new Map();
const LIMITE = 8;
const JANELA = 1000 * 60 * 10;

function excedeu(ip) {
  const agora = Date.now();
  const registro = tentativas.get(ip);
  if (!registro || agora - registro.desde > JANELA) {
    tentativas.set(ip, { contagem: 1, desde: agora });
    return false;
  }
  registro.contagem += 1;
  return registro.contagem > LIMITE;
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Método não permitido" });

  const ip = req.headers["x-forwarded-for"]?.split(",")[0]?.trim() || "desconhecido";
  if (excedeu(ip)) {
    return res.status(429).json({ error: "Muitas tentativas. Espere alguns minutos." });
  }

  const { email, senha } = req.body || {};
  if (!senha) return res.status(400).json({ error: "Informe a senha." });

  try {
    // Sem email é o operador da plataforma, com a senha única.
    if (!email) {
      if (!senhaConfere(senha)) return res.status(401).json({ error: "Senha incorreta." });
      tentativas.delete(ip);
      return res.status(200).json({
        token: gerarToken({ tipo: "operador" }),
        sessao: { tipo: "operador", nome: "Operador" },
      });
    }

    const atendente = await autenticarAtendente(email, senha);
    if (!atendente) return res.status(401).json({ error: "Email ou senha incorretos." });

    tentativas.delete(ip);
    return res.status(200).json({
      token: gerarToken({
        tipo: "atendente",
        papel: atendente.papel,
        atendente: atendente.id,
        versao_sessao: atendente.versao_sessao,
        cliente: atendente.cliente_id,
        nome: atendente.nome,
      }),
      sessao: {
        tipo: "atendente",
        papel: atendente.papel,
        // O id vai junto, e é o que faz a aba "Meus" existir. Sem ele a tela
        // sabia que havia uma atendente logada mas não QUAL, comparava
        // `conversa.atendente_id` com indefinido e contava zero para todo
        // mundo. O token sempre carregou o id; a sessão guardada no navegador,
        // que é de onde a tela lê, não.
        atendente: atendente.id,
        nome: atendente.nome,
        cliente: atendente.cliente_id,
        nomeCliente: atendente.cliente_nome,
        // Só para desenhar o menu. Quem decide de verdade é `barrouModulo`,
        // que lê do banco a cada chamada.
        modulos: atendente.modulos,
      },
    });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
