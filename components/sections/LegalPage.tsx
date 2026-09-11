import { Reveal } from "@/components/ui/Reveal";
import { ContentSlot } from "@/components/ui/MediaSlot";
import { KeneStrip } from "@/components/ui/graphics/Kene";

/** Casca das páginas legais. O texto jurídico é responsabilidade do cliente. */
export function LegalPage({
  title,
  escopo,
  atualizado,
}: {
  title: string;
  escopo: string;
  atualizado?: string;
}) {
  return (
    <>
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 grid-lines opacity-40" aria-hidden />
        <div className="container-site relative section-padding max-w-3xl">
          <Reveal>
            <h1 className="font-display text-[clamp(2rem,5vw,3.25rem)] leading-[1.05]">
              {title}
            </h1>
            <p className="mt-4 font-mono text-xs uppercase tracking-wider text-cinza-ink">
              Última atualização: {atualizado ?? "pendente"}
            </p>
          </Reveal>
        </div>
        <KeneStrip motif="iso" height={18} className="text-amarelo opacity-70" />
      </section>

      <section className="relative overflow-hidden bg-ink section-padding">
        <div className="container-site relative max-w-3xl">
          <Reveal>
            <ContentSlot label={escopo} />
          </Reveal>
        </div>
      </section>
    </>
  );
}
