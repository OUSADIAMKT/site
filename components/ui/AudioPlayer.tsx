/** Player de áudio nativo; o arquivo pode estar em `public/` ou no servidor. */
export function AudioPlayer({ src, titulo }: { src: string; titulo?: string }) {
  return (
    <figure className="card-surface p-5">
      {titulo ? (
        <figcaption className="mb-3 font-mono text-[0.7rem] uppercase tracking-widest text-amarelo">
          {titulo}
        </figcaption>
      ) : null}
      <audio controls preload="none" className="w-full" src={src}>
        Seu navegador não reproduz áudio.{" "}
        <a href={src} className="underline">
          Baixe o arquivo
        </a>
        .
      </audio>
    </figure>
  );
}
