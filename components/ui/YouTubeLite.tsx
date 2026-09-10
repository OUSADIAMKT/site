"use client";

import { useState } from "react";
import Image from "next/image";
import { Play } from "lucide-react";

/**
 * Vídeo do YouTube com carregamento sob demanda.
 *
 * O embed padrão do YouTube traz ~1 MB de script e cookies de rastreio **por
 * vídeo**, antes de qualquer clique — numa página de portfólio com vários
 * cases isso derruba o LCP sozinho. Aqui a página começa só com a capa; o
 * iframe só entra depois do clique, já com `autoplay`, então o visitante não
 * precisa clicar duas vezes.
 *
 * Domínio `youtube-nocookie.com`: sem clique não há cookie de terceiro, o que
 * também simplifica o banner de consentimento (PRD 10).
 *
 * `poster` recebe a foto real do case quando existe — a miniatura do YouTube
 * é só o fallback.
 */
export function YouTubeLite({
  id,
  titulo,
  poster,
  formato = "horizontal",
  className = "",
}: {
  /** ID do vídeo — o trecho depois de `v=` ou de `youtu.be/`. */
  id: string;
  /** Vira o texto do botão e o `title` do iframe (leitor de tela). */
  titulo: string;
  /** Capa própria, a partir de `public/`. Sem ela, usa a do YouTube. */
  poster?: string | null;
  /** `vertical` para Shorts e depoimentos gravados no celular (9:16). */
  formato?: "horizontal" | "vertical";
  className?: string;
}) {
  const [ativo, setAtivo] = useState(false);
  const proporcao = formato === "vertical" ? "aspect-[9/16]" : "aspect-video";

  if (ativo) {
    return (
      <iframe
        className={`${proporcao} w-full ${className}`}
        src={`https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0&modestbranding=1`}
        title={titulo}
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
      />
    );
  }

  return (
    <button
      type="button"
      onClick={() => setAtivo(true)}
      className={`group relative block ${proporcao} w-full overflow-hidden bg-ink-void ${className}`}
    >
      <Image
        src={poster ?? `https://i.ytimg.com/vi/${id}/hqdefault.jpg`}
        alt=""
        width={800}
        height={450}
        /*
         * `hqdefault` sempre vem em 4:3 com tarja preta, e o cover corta as
         * bordas. No horizontal a tarja é em cima e embaixo, e só some com o
         * zoom; no vertical ela fica nas laterais, que o próprio cover já corta
         * — dar zoom ali só comeria o rosto de quem gravou.
         */
        className={`h-full w-full object-cover transition-transform duration-500 ${
          formato === "vertical"
            ? "group-hover:scale-105"
            : "scale-[1.35] group-hover:scale-[1.42]"
        }`}
        aria-hidden
      />
      <span className="absolute inset-0 bg-ink-void/30 transition-colors group-hover:bg-ink-void/10" />
      <span className="absolute inset-0 grid place-items-center">
        <span className="grid h-16 w-16 place-items-center rounded-full bg-amarelo text-[#1a0b2e] shadow-lg transition-transform group-hover:scale-110">
          <Play size={26} fill="currentColor" className="ml-1" />
        </span>
      </span>
      <span className="sr-only">Assistir: {titulo}</span>
    </button>
  );
}
