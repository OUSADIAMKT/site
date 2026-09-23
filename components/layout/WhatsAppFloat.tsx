import { MessageCircle } from "lucide-react";
import { wa } from "@/lib/site";

/** Botão flutuante global (PRD 6.1) — presente em 100% das páginas. */
export function WhatsAppFloat() {
  return (
    <a
      href={wa("home")}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Falar no WhatsApp"
      data-no-print
      className="group fixed bottom-5 right-5 z-50 flex items-center gap-3"
    >
      <span className="pointer-events-none hidden translate-x-2 rounded-full border border-border bg-ink px-4 py-2 font-mono text-xs text-foreground opacity-0 shadow-lg transition-all group-hover:translate-x-0 group-hover:opacity-100 md:block">
        Bora trocar uma ideia?
      </span>
      <span className="glow-rio flex h-14 w-14 items-center justify-center rounded-full bg-floresta text-white shadow-lg transition-transform group-hover:scale-110">
        <MessageCircle size={26} />
      </span>
    </a>
  );
}
