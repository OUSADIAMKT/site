/**
 * Vídeo de fundo translúcido para dobras escuras (hero).
 *
 * Fica ATRÁS de tudo (`z-0`): o conteúdo da seção precisa ficar em `relative`
 * — o `.container-site relative` da hero já resolve isso.
 *
 * A translucidez é feita em duas camadas, porque só baixar a opacidade do vídeo
 * deixa o texto ilegível quando passa um frame claro:
 *   1. o vídeo em si com opacidade reduzida (`--hero-video-opacity`);
 *   2. um scrim em gradiente na cor do fundo, mais forte do lado do texto.
 *
 * Acessibilidade: `muted` + `playsInline` são obrigatórios para o autoplay
 * funcionar (inclusive no iOS). Com `prefers-reduced-motion`, o vídeo some e
 * entra o poster estático — sem JS, ver `.hero-video__poster` em globals.css.
 *
 * Os arquivos ficam em `public/video/`. Sirva MP4 (H.264) sempre e, se tiver,
 * um WebM antes dele — o navegador escolhe o primeiro `<source>` compatível.
 */
export function HeroVideo({
  src,
  webm,
  poster,
  opacity = 0.28,
  className = "",
}: {
  /** Caminho do MP4 a partir de `public/` — ex.: "/video/hero-tapajos.mp4" */
  src: string;
  /** Caminho opcional do WebM (arquivo menor, servido de preferência) */
  webm?: string;
  /** Primeiro frame; aparece antes do vídeo carregar e no reduced-motion */
  poster?: string;
  /** 0–1. Acima de ~0.35 o texto começa a brigar com a imagem. */
  opacity?: number;
  className?: string;
}) {
  return (
    <div
      className={`hero-video ${className}`}
      style={{ "--hero-video-opacity": opacity } as React.CSSProperties}
      aria-hidden
    >
      <video
        className="hero-video__media"
        autoPlay
        muted
        loop
        playsInline
        preload="metadata"
        poster={poster}
      >
        {webm && <source src={webm} type="video/webm" />}
        <source src={src} type="video/mp4" />
      </video>

      {poster && (
        <div
          className="hero-video__poster"
          style={{ backgroundImage: `url(${poster})` }}
        />
      )}

      <div className="hero-video__scrim" />
    </div>
  );
}
