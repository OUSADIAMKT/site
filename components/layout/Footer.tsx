import Link from "next/link";
import { Logo } from "@/components/ui/Logo";
import { NewsletterForm } from "@/components/forms/NewsletterForm";
import { SITE, SOCIAL } from "@/lib/site";

const COLUMNS = [
  {
    title: "Ecossistema",
    links: [
      { label: "Escola", href: "/escola" as const },
      { label: "Mentoria", href: "/mentoria" as const },
      { label: "Agência", href: "/agencia" as const },
      { label: "Comunidade", href: "/comunidade" as const },
    ],
  },
  {
    title: "Ousadia",
    links: [
      { label: "Sobre", href: "/sobre" as const },
      { label: "Portfólio", href: "/portfolio" as const },
      { label: "Diagnóstico", href: "/diagnostico" as const },
      { label: "Conteúdo", href: "/conteudo" as const },
      { label: "Contato", href: "/contato" as const },
    ],
  },
];

const REDES = [
  { label: "Instagram", href: SOCIAL.instagram },
  { label: "TikTok", href: SOCIAL.tiktok },
  { label: "YouTube", href: SOCIAL.youtube },
  { label: "Spotify", href: SOCIAL.spotify },
];

export function Footer() {
  return (
    <footer className="border-t border-border bg-ink-void">
      <div className="container-site py-16">
        <div className="grid gap-12 md:grid-cols-[1.4fr_1fr_1fr] lg:grid-cols-[1.4fr_1fr_1fr_1.3fr]">
          <div>
            <Logo className="h-12" />
            <p className="font-display text-lg mt-5 text-amarelo">
              {SITE.tagline}
            </p>
            <p className="text-body mt-3 max-w-xs text-sm">
              A primeira Agência Escola de Marketing do Norte do Brasil.
              Estratégia, criatividade e IA para creators da Amazônia.
            </p>
          </div>

          {COLUMNS.map((col) => (
            <div key={col.title}>
              <h4 className="mb-4 font-mono text-xs uppercase tracking-widest text-amarelo">
                {col.title}
              </h4>
              <ul className="space-y-2">
                {col.links.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-sm text-cinza-ink transition-colors hover:text-foreground"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}

          <div>
            <h4 className="mb-4 font-mono text-xs uppercase tracking-widest text-amarelo">
              Newsletter
            </h4>
            <p className="text-body text-sm">
              Sem spam. Sem motivacional vazio. Só estratégia, bastidor e
              provocação útil, toda terça.
            </p>
            <NewsletterForm className="mt-4" />
          </div>
        </div>

        <div className="mt-14 border-t border-border pt-6">
          <div className="flex flex-wrap gap-x-5 gap-y-2 font-mono text-xs">
            {REDES.map((r) =>
              r.href ? (
                <a
                  key={r.label}
                  href={r.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-cinza-ink transition-colors hover:text-amarelo"
                >
                  {r.label}
                </a>
              ) : (
                <span
                  key={r.label}
                  className="text-cinza-ink/70 line-through decoration-cinza-ink/40"
                  title="Link ainda não fornecido"
                >
                  {r.label}
                </span>
              ),
            )}
          </div>

          <div className="mt-6 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
            <p className="font-mono text-xs text-cinza-ink">
              Feito na Amazônia, com orgulho. © {new Date().getFullYear()}{" "}
              Ousadia Marketing.
              {SITE.cnpj && ` CNPJ ${SITE.cnpj}.`}
            </p>
            <div className="flex gap-5 font-mono text-xs text-cinza-ink">
              <Link
                href="/politica-de-privacidade"
                className="hover:text-foreground"
              >
                Privacidade
              </Link>
              <Link href="/termos" className="hover:text-foreground">
                Termos
              </Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
