import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";

/**
 * Imagem de compartilhamento da Oficina Destrave (`/escola/oficina-destrave/og.png`),
 * no visual neon da página. Mesma lógica da `app/og.png/route.tsx`: rota com
 * extensão, gerada uma vez no build.
 */
export const dynamic = "force-static";

// Mesmas cores do `[data-tema="neon"]` em globals.css.
const COR = {
  fundo: "#0b0d12",
  verde: "#39ff88",
  roxo: "#b56cff",
  prata: "#c5ccd6",
  texto: "#e6eaf0",
  cinza: "#9aa3b0",
};

export async function GET() {
  const raiz = process.cwd();
  // O ImageResponse não lê WebP: `og-jackson.jpg` é o `jackson-retrato.webp`
  // já recortado (520×780) e convertido.
  const foto = await readFile(
    join(raiz, "public/oficina-destrave/og-jackson.jpg"),
  );
  const logo = await readFile(
    join(raiz, "public/marca/horizontal-branca.png"),
    "base64",
  );

  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        position: "relative",
        background: `radial-gradient(circle at 10% 0%, rgba(168,85,247,.35) 0%, ${COR.fundo} 55%)`,
        color: COR.texto,
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- ImageResponse só aceita <img> */}
      <img
        src={`data:image/jpeg;base64,${foto.toString("base64")}`}
        width={520}
        height={780}
        alt=""
        style={{ position: "absolute", right: 0, top: -40, objectFit: "cover" }}
      />
      <div
        style={{
          // O Satori (ImageResponse) ignora `inset`: posição e tamanho explícitos.
          position: "absolute",
          left: 680,
          top: 0,
          width: 260,
          height: 630,
          display: "flex",
          background: `linear-gradient(90deg, ${COR.fundo} 0%, rgba(11,13,18,0) 100%)`,
        }}
      />
      <div
        style={{
          position: "relative",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "0 72px",
          width: 760,
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- ImageResponse só aceita <img> */}
        <img
          src={`data:image/png;base64,${logo}`}
          width={300}
          height={71}
          alt=""
          style={{ marginLeft: -28 }}
        />
        <div
          style={{
            marginTop: 34,
            display: "flex",
            fontSize: 22,
            letterSpacing: 4,
            textTransform: "uppercase",
            color: COR.roxo,
          }}
        >
          Online e ao vivo
        </div>
        <div
          style={{
            marginTop: 14,
            display: "flex",
            fontSize: 84,
            fontWeight: 800,
            lineHeight: 1,
          }}
        >
          Oficina
        </div>
        <div
          style={{
            display: "flex",
            fontSize: 84,
            fontWeight: 800,
            lineHeight: 1.05,
            color: COR.verde,
            textShadow: "0 0 28px rgba(57,255,136,.55)",
          }}
        >
          Destrave
        </div>
        <div
          style={{
            marginTop: 22,
            display: "flex",
            fontSize: 30,
            color: COR.cinza,
            maxWidth: 620,
          }}
        >
          Um dia pra sair do “eu travo” pro primeiro post no ar.
        </div>
        <div
          style={{
            marginTop: 34,
            display: "flex",
            alignItems: "center",
            gap: 18,
          }}
        >
          <div
            style={{
              display: "flex",
              padding: "12px 22px",
              borderRadius: 14,
              background: COR.verde,
              color: "#06120b",
              fontSize: 30,
              fontWeight: 800,
              whiteSpace: "nowrap",
            }}
          >
            DOM · 29/11
          </div>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              fontSize: 26,
              color: COR.prata,
            }}
          >
            <span>das 9h às 19h · R$ 97</span>
            <span>com Jackson Satoyiro</span>
          </div>
        </div>
      </div>
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          bottom: 0,
          height: 10,
          display: "flex",
        }}
      >
        <div style={{ flex: 1, background: COR.roxo }} />
        <div style={{ flex: 1, background: COR.verde }} />
        <div style={{ flex: 1, background: COR.prata }} />
      </div>
    </div>,
    { width: 1200, height: 630 },
  );
}
