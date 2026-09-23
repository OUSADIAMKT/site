import type { Resultado } from "./tipos";

/**
 * Gera a imagem de compartilhamento (formato stories, 1080×1920) com Canvas
 * nativo do navegador — sem biblioteca extra. Lê as fontes do site
 * (`--font-chakra` / `--font-manrope`, definidas pelo `next/font` em
 * `app/layout.tsx`) direto das variáveis CSS computadas, pra não destoar do
 * resto do site.
 */

const W = 1080;
const H = 1920;

function fonteVar(nome: string, fallback: string) {
  if (typeof document === "undefined") return fallback;
  const valor = getComputedStyle(document.documentElement)
    .getPropertyValue(nome)
    .trim();
  return valor ? `${valor}, ${fallback}` : fallback;
}

function carregarImagem(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

export async function gerarImagemStories(
  r: Resultado,
  primeiroNome: string,
): Promise<Blob | null> {
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  const display = fonteVar("--font-chakra", "sans-serif");
  const mono = fonteVar("--font-jetbrains", "monospace");
  const body = fonteVar("--font-manrope", "sans-serif");

  // Fundo — mesmo degradê roxo/carvão do "Ousadia Amazônia".
  const fundo = ctx.createLinearGradient(0, 0, W, H);
  fundo.addColorStop(0, "#1d0c39");
  fundo.addColorStop(0.55, "#16102a");
  fundo.addColorStop(1, "#0b0713");
  ctx.fillStyle = fundo;
  ctx.fillRect(0, 0, W, H);

  const glow = ctx.createRadialGradient(W * 0.82, H * 0.08, 0, W * 0.82, H * 0.08, 620);
  glow.addColorStop(0, "rgba(255,198,26,.28)");
  glow.addColorStop(1, "rgba(255,198,26,0)");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, W, H);

  // Logo, se existir em public/marca.
  try {
    const logo = await carregarImagem("/marca/circular-clara.png");
    const lado = 96;
    ctx.drawImage(logo, 64, 72, lado, lado);
  } catch {
    // segue sem logo — imagem ainda funciona sem o arquivo de marca.
  }

  ctx.fillStyle = "#a89fbc";
  ctx.font = `700 24px ${mono}`;
  ctx.textBaseline = "alphabetic";
  ctx.fillText("OUSE SER VOCÊ", 190, 108);
  ctx.font = `24px ${mono}`;
  ctx.fillText("MÉTODO SATOYIRO", 190, 144);

  // Nome
  ctx.fillStyle = "#f2eef8";
  ctx.font = `700 52px ${body}`;
  ctx.fillText(primeiroNome ? `O mapa de ${primeiroNome}` : "Meu mapa", 64, 320);

  // Tipo em destaque
  ctx.fillStyle = "#ffc61a";
  ctx.font = `700 190px ${display}`;
  ctx.fillText(r.mbti.tipo, 64, 560);

  ctx.fillStyle = "#f2eef8";
  ctx.font = `600 48px ${display}`;
  ctx.fillText(r.mbti.apelido, 64, 630);

  ctx.fillStyle = "#58d3ec";
  ctx.font = `700 26px ${mono}`;
  ctx.fillText(`GRUPO ${r.mbti.grupo.toUpperCase()}`, 64, 680);

  // Pílulas dos 3 capítulos
  const linhas = [
    { rotulo: "COMO ME VEJO", valor: r.cap1.rotulo, cor: "#ffc61a" },
    { rotulo: "MEU CAMINHO", valor: r.cap2.rotulo, cor: "#23b26f" },
    { rotulo: "SUCESSO E EXPECTATIVAS", valor: r.cap3.rotulo, cor: "#18a5c9" },
  ];

  let y = 820;
  for (const linha of linhas) {
    ctx.fillStyle = linha.cor;
    ctx.font = `700 24px ${mono}`;
    ctx.fillText(linha.rotulo, 64, y);

    ctx.fillStyle = "#f2eef8";
    ctx.font = `700 44px ${display}`;
    ctx.fillText(linha.valor, 64, y + 58);

    y += 150;
  }

  // Rodapé
  ctx.strokeStyle = "rgba(255,255,255,.15)";
  ctx.beginPath();
  ctx.moveTo(64, H - 210);
  ctx.lineTo(W - 64, H - 210);
  ctx.stroke();

  ctx.fillStyle = "#a89fbc";
  ctx.font = `22px ${body}`;
  wrapText(
    ctx,
    "Este mapa é um retrato de hoje, não um rótulo. Ouse ser você.",
    64,
    H - 160,
    W - 128,
    32,
  );

  ctx.fillStyle = "#ffc61a";
  ctx.font = `700 24px ${mono}`;
  ctx.fillText("OUSADIAMARKETING.COM.BR", 64, H - 72);
  ctx.fillStyle = "#a89fbc";
  ctx.font = `20px ${body}`;
  ctx.fillText(
    "Uma iniciativa Ousadia Marketing · Marketing, Desenvolvimento Pessoal e IA",
    64,
    H - 40,
  );

  return new Promise((resolve) => canvas.toBlob((b) => resolve(b), "image/png"));
}

function wrapText(
  ctx: CanvasRenderingContext2D,
  texto: string,
  x: number,
  y: number,
  larguraMax: number,
  alturaLinha: number,
) {
  const palavras = texto.split(" ");
  let linha = "";
  let linhaY = y;

  for (const palavra of palavras) {
    const teste = linha ? `${linha} ${palavra}` : palavra;
    if (ctx.measureText(teste).width > larguraMax && linha) {
      ctx.fillText(linha, x, linhaY);
      linha = palavra;
      linhaY += alturaLinha;
    } else {
      linha = teste;
    }
  }
  if (linha) ctx.fillText(linha, x, linhaY);
}

/** Baixa a imagem — e, quando o navegador suporta, oferece o menu nativo de compartilhar. */
export async function compartilharOuBaixarImagem(blob: Blob, nomeArquivo: string) {
  const arquivo = new File([blob], nomeArquivo, { type: "image/png" });

  if (
    typeof navigator !== "undefined" &&
    navigator.share &&
    navigator.canShare?.({ files: [arquivo] })
  ) {
    try {
      await navigator.share({
        files: [arquivo],
        title: "Ouse Ser Você",
        text: "Fiz o diagnóstico Ouse Ser Você do método Satoyiro!",
      });
      return;
    } catch {
      // usuário cancelou o compartilhamento — cai no download abaixo
    }
  }

  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = nomeArquivo;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
