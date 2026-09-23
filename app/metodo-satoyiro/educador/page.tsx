import type { Metadata } from "next";
import { PainelEducador } from "@/components/metodo-satoyiro/educador/PainelEducador";

export const metadata: Metadata = {
  title: "Painel do Educador · Ouse Ser Você",
  robots: { index: false, follow: false },
};

export default function PainelEducadorPage() {
  return (
    <section className="bg-ink section-padding">
      <div className="container-site max-w-6xl">
        <PainelEducador />
      </div>
    </section>
  );
}
