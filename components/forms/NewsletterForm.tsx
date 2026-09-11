"use client";

import { useState } from "react";
import { ArrowRight } from "lucide-react";
import { NEWSLETTER_ENDPOINT } from "@/lib/site";
import { inscreverNewsletter } from "@/lib/newsletter";

/** Captura de e-mail do rodapé (PRD 6.5). */
export function NewsletterForm({ className = "" }: { className?: string }) {
  const [estado, setEstado] = useState<"idle" | "ok" | "erro">("idle");
  const [email, setEmail] = useState("");

  function onSubmit(ev: React.FormEvent<HTMLFormElement>) {
    ev.preventDefault();
    if (!/^\S+@\S+\.\S+$/.test(email)) {
      setEstado("erro");
      return;
    }

    // Sem provedor configurado ainda: não fingimos sucesso.
    if (!inscreverNewsletter(email)) {
      setEstado("erro");
      return;
    }

    setEstado("ok");
    setEmail("");
  }

  if (estado === "ok") {
    return (
      <p className={`font-mono text-xs text-floresta ${className}`}>
        Pronto. Te vejo na terça. ✅
      </p>
    );
  }

  return (
    <form onSubmit={onSubmit} className={className} noValidate>
      <div className="flex gap-2">
        <label htmlFor="newsletter-email" className="sr-only">
          Seu e-mail
        </label>
        <input
          id="newsletter-email"
          type="email"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            setEstado("idle");
          }}
          placeholder="seu@email.com"
          aria-invalid={estado === "erro"}
          className="min-w-0 flex-1 rounded-lg border border-input bg-ink/70 px-3 py-2.5 text-sm text-foreground outline-none transition-colors placeholder:text-cinza-ink/60 focus:border-amarelo aria-[invalid=true]:border-destructive"
        />
        <button
          type="submit"
          aria-label="Quero receber a newsletter"
          className="btn btn-primary shrink-0 !px-3 !py-2.5"
        >
          <ArrowRight size={16} />
        </button>
      </div>
      {estado === "erro" && (
        <p role="alert" className="mt-2 font-mono text-xs text-destructive">
          {NEWSLETTER_ENDPOINT
            ? "Confere o e-mail e tenta de novo."
            : "Newsletter ainda não conectada. Chama no WhatsApp que a gente te inclui."}
        </p>
      )}
    </form>
  );
}
