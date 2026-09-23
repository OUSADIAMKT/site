"use client";

import { useEffect } from "react";
import { KeneBullet } from "@/components/ui/graphics/Kene";

export function TelaCarregando({ onFim }: { onFim: () => void }) {
  useEffect(() => {
    const t = setTimeout(onFim, 3000);
    return () => clearTimeout(t);
  }, [onFim]);

  return (
    <section
      className="card-surface flex animate-in fade-in flex-col items-center justify-center gap-6 p-16 text-center duration-300"
      role="status"
      aria-live="polite"
    >
      <div className="flex gap-2" aria-hidden>
        {["amarelo", "floresta", "rio"].map((cor, i) => (
          <span
            key={cor}
            className="size-3 animate-bounce rounded-full"
            style={{
              background: `var(--${cor})`,
              animationDelay: `${i * 0.12}s`,
            }}
          />
        ))}
      </div>
      <p className="font-display text-2xl">Montando seu mapa…</p>
      <KeneBullet mark="losango" size={22} className="text-amarelo opacity-70" />
    </section>
  );
}
