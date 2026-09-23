"use client";

import { Textarea } from "@/components/forms/fields";
import type { PerguntaAberta } from "@/lib/metodo-satoyiro/tipos";

export function CardAberta({
  pergunta,
  valor,
  onMudar,
}: {
  pergunta: PerguntaAberta;
  valor: string;
  onMudar: (texto: string) => void;
}) {
  return (
    <div className="mt-7">
      <Textarea
        aria-label={pergunta.titulo}
        placeholder={pergunta.placeholder}
        value={valor}
        onChange={(ev) => onMudar(ev.target.value)}
        maxLength={400}
      />
      <p className="mt-2 font-mono text-[10px] uppercase tracking-widest text-cinza-ink">
        Opcional, pode deixar em branco e continuar.
      </p>
    </div>
  );
}
