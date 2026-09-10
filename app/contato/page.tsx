import type { Metadata } from "next";
import { ArrowRight } from "lucide-react";
import { Reveal } from "@/components/ui/Reveal";
import { PageHero } from "@/components/sections/PageHero";
import { ContentSlot } from "@/components/ui/MediaSlot";
import { ContatoForm } from "@/components/forms/ContatoForm";
import { SITE, SOCIAL, wa } from "@/lib/site";

export const metadata: Metadata = {
  title: "Contato | Ousadia Marketing",
  description:
    "O caminho mais rápido é o WhatsApp: atendimento humano, resposta em até 1h útil. Se preferir, deixa recado no formulário.",
};

const REDES = [
  { label: "Instagram", href: SOCIAL.instagram },
  { label: "TikTok", href: SOCIAL.tiktok },
  { label: "YouTube", href: SOCIAL.youtube },
  { label: "Spotify", href: SOCIAL.spotify },
];

export default function ContatoPage() {
  return (
    <>
      <PageHero
        eyebrow="Contato"
        motif="river"
        title={
          <>
            Bora trocar uma <span className="text-amarelo">ideia</span>?
          </>
        }
        lead="O caminho mais rápido é o WhatsApp: atendimento humano, resposta em até 1h útil. Se preferir, deixa recado no formulário."
      >
        <a href={wa("contato")} className="btn btn-primary">
          Chamar no WhatsApp <ArrowRight size={16} />
        </a>
      </PageHero>

      <section className="relative overflow-hidden bg-ink section-padding">
        <div className="container-site relative grid gap-14 lg:grid-cols-[1.4fr_1fr]">
          <Reveal>
            <div>
              <p className="eyebrow mb-4">Formulário</p>
              <h2 className="headline-section mb-8">Ou deixa seu recado</h2>
              <ContatoForm />
            </div>
          </Reveal>

          <Reveal delay={0.08}>
            <aside className="space-y-8">
              <div>
                <h3 className="font-mono text-xs uppercase tracking-widest text-amarelo">
                  Redes
                </h3>
                <ul className="mt-4 space-y-2">
                  {REDES.map((r) => (
                    <li key={r.label}>
                      {r.href ? (
                        <a
                          href={r.href}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-cinza-ink transition-colors hover:text-foreground"
                        >
                          {r.label} ↗
                        </a>
                      ) : (
                        <span className="text-sm text-cinza-ink/40">
                          {r.label} (link pendente)
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <h3 className="font-mono text-xs uppercase tracking-widest text-amarelo">
                  E-mail comercial
                </h3>
                {SITE.email ? (
                  <a
                    href={`mailto:${SITE.email}`}
                    className="mt-3 block text-sm text-cinza-ink hover:text-foreground"
                  >
                    {SITE.email}
                  </a>
                ) : (
                  <ContentSlot className="mt-3" label="E-mail comercial." />
                )}
              </div>

              <div>
                <h3 className="font-mono text-xs uppercase tracking-widest text-amarelo">
                  Onde a gente tá
                </h3>
                {SITE.cidadeBase ? (
                  <p className="text-body mt-3 text-sm">
                    {SITE.cidadeBase}, atendendo toda a região Norte e o
                    Brasil, quando faz sentido.
                  </p>
                ) : (
                  <ContentSlot
                    className="mt-3"
                    label="Cidade-base. Atendemos toda a região Norte e o Brasil, quando faz sentido."
                  />
                )}
              </div>
            </aside>
          </Reveal>
        </div>
      </section>
    </>
  );
}
