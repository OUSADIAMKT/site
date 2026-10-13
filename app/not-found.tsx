import Link from "next/link";
import type { Metadata } from "next";
import { ArrowRight } from "lucide-react";
import { Canoe, RiverLines } from "@/components/ui/Motifs";
import { KeneStrip } from "@/components/ui/graphics/Kene";

/**
 * Página 404. Na exportação estática vira `out/404.html`, que o `.htaccess`
 * serve para qualquer endereço que não existe. Sem ela, o Next usava a página
 * padrão em inglês ("This page could not be found").
 */
export const metadata: Metadata = {
  title: "Página não encontrada",
  robots: { index: false, follow: true },
};

const ATALHOS = [
  { href: "/escola", label: "Escola" },
  { href: "/agencia", label: "Agência" },
  { href: "/diagnostico", label: "Diagnóstico gratuito" },
  { href: "/conteudo", label: "Conteúdo" },
];

export default function NotFound() {
  return (
    <section className="relative flex min-h-[70vh] items-center overflow-hidden">
      <div className="absolute inset-0 grid-lines opacity-50" aria-hidden />
      <RiverLines className="motif motif-soft text-rio inset-x-0 top-1/2 h-40 w-full" />
      <Canoe className="motif motif-soft text-amarelo left-1/2 bottom-10 w-72 -translate-x-1/2" />

      <div className="container-site relative section-padding max-w-2xl text-center">
        <p className="eyebrow mb-5">Erro 404</p>
        <h1 className="font-display text-[clamp(2rem,5vw,3.5rem)] leading-[1.05]">
          Esse caminho o rio <span className="text-amarelo">levou</span>.
        </h1>
        <p className="text-body mt-6">
          A página que você procurou não existe ou mudou de endereço. Volte pro
          começo ou siga por um destes atalhos.
        </p>
        <div className="mt-8 flex flex-col justify-center gap-4 sm:flex-row">
          <Link href="/" className="btn btn-primary">
            Ir para o início <ArrowRight size={16} />
          </Link>
        </div>
        <nav aria-label="Atalhos" className="mt-8 flex flex-wrap justify-center gap-x-6 gap-y-2">
          {ATALHOS.map((a) => (
            <Link
              key={a.href}
              href={a.href}
              className="font-mono text-xs uppercase tracking-wider text-cinza-ink transition-colors hover:text-amarelo"
            >
              {a.label}
            </Link>
          ))}
        </nav>
      </div>
      <KeneStrip
        motif="pushu"
        height={20}
        className="absolute inset-x-0 bottom-0 text-floresta opacity-70"
      />
    </section>
  );
}
