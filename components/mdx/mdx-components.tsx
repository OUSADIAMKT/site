import Link from "next/link";
import Image from "next/image";
import type { ComponentPropsWithoutRef, ReactNode } from "react";
import { ArrowRight } from "lucide-react";
import { wa, type WaContext } from "@/lib/site";

/* ------------------------------------------------------------------ *
 * Elementos de markdown, no tema Ousadia Amazônia
 * ------------------------------------------------------------------ */

function Anchor({ href = "", ...props }: ComponentPropsWithoutRef<"a">) {
  const classe =
    "text-amarelo underline decoration-amarelo/40 underline-offset-4 transition-colors hover:decoration-amarelo";

  if (href.startsWith("/")) {
    return <Link href={href} className={classe} {...props} />;
  }
  if (href.startsWith("#")) {
    // Âncora de heading (rehype-autolink-headings) — não vira link visível.
    return <a href={href} className="no-underline" {...props} />;
  }
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={classe}
      {...props}
    />
  );
}

export const mdxComponents = {
  a: Anchor,

  h2: (props: ComponentPropsWithoutRef<"h2">) => (
    <h2
      className="font-display mt-14 scroll-mt-28 text-[clamp(1.4rem,3vw,1.9rem)] leading-tight"
      {...props}
    />
  ),
  h3: (props: ComponentPropsWithoutRef<"h3">) => (
    <h3
      className="font-display mt-10 scroll-mt-28 text-[clamp(1.15rem,2.2vw,1.4rem)] leading-snug"
      {...props}
    />
  ),
  h4: (props: ComponentPropsWithoutRef<"h4">) => (
    <h4 className="font-display mt-8 scroll-mt-28 text-lg" {...props} />
  ),

  p: (props: ComponentPropsWithoutRef<"p">) => (
    <p className="text-body mt-5 text-[1.0625rem] leading-relaxed" {...props} />
  ),

  ul: (props: ComponentPropsWithoutRef<"ul">) => (
    <ul
      className="text-body mt-5 list-disc space-y-2 pl-5 marker:text-amarelo"
      {...props}
    />
  ),
  ol: (props: ComponentPropsWithoutRef<"ol">) => (
    <ol
      className="text-body mt-5 list-decimal space-y-2 pl-5 marker:font-mono marker:text-amarelo"
      {...props}
    />
  ),
  li: (props: ComponentPropsWithoutRef<"li">) => (
    <li className="leading-relaxed" {...props} />
  ),

  blockquote: (props: ComponentPropsWithoutRef<"blockquote">) => (
    <blockquote
      className="my-8 border-l-2 border-amarelo pl-5 font-display text-lg leading-relaxed text-foreground/90 italic"
      {...props}
    />
  ),

  hr: () => <hr className="my-12 border-border" />,

  strong: (props: ComponentPropsWithoutRef<"strong">) => (
    <strong className="font-semibold text-foreground" {...props} />
  ),

  code: (props: ComponentPropsWithoutRef<"code">) => (
    <code
      className="rounded bg-ink-void/80 px-1.5 py-0.5 font-mono text-[0.85em] text-rio-soft"
      {...props}
    />
  ),
  pre: (props: ComponentPropsWithoutRef<"pre">) => (
    <pre
      className="my-7 overflow-x-auto rounded-xl border border-border bg-ink-void p-5 font-mono text-sm leading-relaxed [&_code]:bg-transparent [&_code]:p-0 [&_code]:text-foreground"
      {...props}
    />
  ),

  table: (props: ComponentPropsWithoutRef<"table">) => (
    <div className="my-8 overflow-x-auto rounded-xl border border-border">
      <table className="w-full border-collapse text-left text-sm" {...props} />
    </div>
  ),
  th: (props: ComponentPropsWithoutRef<"th">) => (
    <th
      className="border-b border-border bg-ink-void/60 px-4 py-3 font-mono text-[0.7rem] uppercase tracking-wider text-amarelo"
      {...props}
    />
  ),
  td: (props: ComponentPropsWithoutRef<"td">) => (
    <td
      className="border-b border-border/60 px-4 py-3 align-top text-cinza-ink"
      {...props}
    />
  ),

  img: ({ src, alt, ...props }: ComponentPropsWithoutRef<"img">) => {
    if (typeof src !== "string") return null;
    return (
      <figure className="my-9">
        <Image
          src={src}
          alt={alt ?? ""}
          width={1200}
          height={675}
          sizes="(max-width: 768px) 100vw, 768px"
          className="w-full rounded-2xl border border-border"
          {...(props as Record<string, unknown>)}
        />
        {alt ? (
          <figcaption className="mt-3 text-center font-mono text-xs text-cinza-ink">
            {alt}
          </figcaption>
        ) : null}
      </figure>
    );
  },

  /* ---------------------------------------------------------------- *
   * Blocos próprios, disponíveis em qualquer .mdx sem import
   * ---------------------------------------------------------------- */

  /** Ponto que o leitor precisa levar embora. */
  Destaque: ({
    titulo,
    children,
  }: {
    titulo?: string;
    children: ReactNode;
  }) => (
    <aside className="card-surface my-9 border-l-2 border-l-amarelo p-6">
      {titulo ? (
        <p className="font-mono text-[0.7rem] uppercase tracking-widest text-amarelo">
          {titulo}
        </p>
      ) : null}
      <div className="text-body [&>p]:mt-2 [&>p:first-child]:mt-0">
        {children}
      </div>
    </aside>
  ),

  /**
   * Trecho que depende de material real do cliente. PRD 7.3: slot visível e
   * rotulado, nunca texto inventado.
   */
  Pendente: ({ children }: { children: ReactNode }) => (
    <div className="content-slot my-7 rounded-lg border border-dashed px-5 py-4 font-mono text-xs leading-relaxed">
      <span className="slot-key">pendente · </span>
      <span className="[&>p]:inline">{children}</span>
    </div>
  ),

  /** Fecha o post no WhatsApp — regra de ouro do PRD 6.6. */
  CtaBloco: ({
    contexto = "home",
    label = "Falar com a Ousadia",
    children,
  }: {
    contexto?: WaContext;
    label?: string;
    children?: ReactNode;
  }) => (
    <aside className="card-surface my-10 p-7">
      {children ? (
        <div className="text-body [&>p]:mt-0">{children}</div>
      ) : null}
      <a href={wa(contexto)} className="btn btn-primary mt-5">
        {label} <ArrowRight size={16} />
      </a>
    </aside>
  ),
};
