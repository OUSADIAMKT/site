import Image from "next/image";

/**
 * Marca Ousadia Marketing — arquivos oficiais do cliente.
 *
 * Origem: `D:\JACKSON\logo ousadia` (a pasta tem ~90 arquivos, mas só 33 são
 * imagens distintas; o resto são cópias). As sete variações usadas aqui foram
 * escolhidas olhando todas sobre fundo escuro e claro. Todas são PNG com
 * transparência, na resolução original — o `next/image` gera os tamanhos e
 * converte para WebP.
 *
 * Não recriar a marca em SVG: estes são os arquivos oficiais.
 */

type Tom = "escuro" | "claro" | "branca";

const HORIZONTAL: Record<Tom, string> = {
  /** Fundo escuro (o padrão do site): "C" amarelo, triângulo branco. */
  escuro: "/marca/horizontal.png",
  /** Fundo claro: "C" roxo, triângulo e descritor amarelos. */
  claro: "/marca/horizontal-clara.png",
  /** Tudo branco — para foto, vídeo ou fundo colorido. */
  branca: "/marca/horizontal-branca.png",
};

const EMPILHADA: Record<Tom, string> = {
  escuro: "/marca/empilhada.png",
  claro: "/marca/empilhada.png",
  branca: "/marca/empilhada-branca.png",
};

const CIRCULAR: Record<Tom, string> = {
  escuro: "/marca/circular.png",
  claro: "/marca/circular-clara.png",
  branca: "/marca/circular.png",
};

/** Proporções reais dos arquivos, para o next/image reservar o espaço certo. */
const DIM = {
  horizontal: { width: 2388, height: 568 },
  empilhada: { width: 1374, height: 980 },
  circular: { width: 1164, height: 1164 },
};

const ALT = "Ousadia Marketing";

/**
 * Trava horizontal — cabeçalho e rodapé.
 * A altura vem por classe (`h-8`, `h-10`…); a largura acompanha sozinha.
 */
export function Logo({
  className = "h-8",
  tom = "escuro",
  priority = false,
  sizes = "240px",
}: {
  className?: string;
  tom?: Tom;
  /** Ligar no cabeçalho: a marca aparece acima da dobra. */
  priority?: boolean;
  /** Sem isto o Next serve o PNG em 3840px para uma marca de ~170px. */
  sizes?: string;
}) {
  return (
    <Image
      src={HORIZONTAL[tom]}
      alt={ALT}
      {...DIM.horizontal}
      priority={priority}
      sizes={sizes}
      className={`w-auto object-contain ${className}`}
    />
  );
}

/** Trava principal do guia: marca em cima, logotipo embaixo. */
export function LogoEmpilhado({
  className = "h-24",
  tom = "escuro",
  sizes = "220px",
}: {
  className?: string;
  tom?: Tom;
  sizes?: string;
}) {
  return (
    <Image
      src={EMPILHADA[tom]}
      alt={ALT}
      {...DIM.empilhada}
      sizes={sizes}
      className={`w-auto object-contain ${className}`}
    />
  );
}

/** Selo circular com o lettering em volta — para selo, avatar, carimbo. */
export function LogoCircular({
  className = "h-24",
  tom = "escuro",
  sizes = "180px",
}: {
  className?: string;
  tom?: Tom;
  sizes?: string;
}) {
  return (
    <Image
      src={CIRCULAR[tom]}
      alt={ALT}
      {...DIM.circular}
      sizes={sizes}
      className={`w-auto object-contain ${className}`}
    />
  );
}
