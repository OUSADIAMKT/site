import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import { SITE } from "@/lib/site";

/**
 * Imagem padrão de compartilhamento (og:image), servida em `/og.png`: é o que
 * aparece quando alguém manda um link do site no WhatsApp, Instagram,
 * LinkedIn etc. Gerada uma vez no build. As páginas apontam pra ela via
 * `OG_IMAGEM` (`lib/site.ts`).
 *
 * É uma rota com extensão, e não o `opengraph-image.tsx` do Next, porque na
 * exportação estática aquele vira um arquivo sem extensão, que a Hostinger
 * não serviria como imagem.
 */

/** Exigido pelo `output: "export"`: sem isto o build falha ao coletar a rota. */
export const dynamic = "force-static";

// Mesmas cores de `app/globals.css`.
const COR = {
  fundo: "#100a1c",
  roxo: "#241044",
  amarelo: "#ffc61a",
  floresta: "#23b26f",
  rio: "#18a5c9",
  cinza: "#a89fbc",
};

export async function GET() {
  const logo = await readFile(join(process.cwd(), "public/marca/horizontal-branca.png"), "base64");

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "0 96px",
          background: `radial-gradient(circle at 85% 15%, ${COR.roxo} 0%, ${COR.fundo} 60%)`,
          position: "relative",
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- ImageResponse só aceita <img> */}
        <img src={`data:image/png;base64,${logo}`} width={620} height={147} alt="" style={{ marginLeft: -60 }} />
        <div style={{ marginTop: 48, fontSize: 56, fontWeight: 700, color: COR.amarelo }}>
          {SITE.tagline}
        </div>
        <div style={{ marginTop: 16, fontSize: 30, color: COR.cinza, maxWidth: 900 }}>
          Agência Escola e Plataforma de Creators da Amazônia
        </div>
        <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: 14, display: "flex" }}>
          <div style={{ flex: 1, background: COR.amarelo }} />
          <div style={{ flex: 1, background: COR.floresta }} />
          <div style={{ flex: 1, background: COR.rio }} />
        </div>
      </div>
    ),
    { width: 1200, height: 630 },
  );
}
