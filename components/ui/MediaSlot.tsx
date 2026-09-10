import { GrafismoDiamonds } from "@/components/ui/Motifs";

/**
 * Espaço reservado para mídia REAL (foto/vídeo do Jackson, alunos, eventos).
 * O PRD (7.3) proíbe stock photo: enquanto o asset real não chega, o slot fica
 * visível e rotulado — nunca preenchido com banco de imagens.
 *
 * Trocar por `next/image` assim que o arquivo entrar em `public/`.
 *
 * As cores vêm de `.media-slot` / `.content-slot` (globals.css) porque estes
 * blocos aparecem tanto em dobras escuras quanto claras.
 */
export function MediaSlot({
  label,
  className = "",
  ratio = "aspect-[4/5]",
  kind = "foto",
}: {
  label: string;
  className?: string;
  ratio?: string;
  kind?: "foto" | "vídeo" | "print";
}) {
  return (
    <div
      className={`media-slot relative grid place-items-center overflow-hidden rounded-2xl border border-dashed bg-ink-void/70 ${ratio} ${className}`}
    >
      <GrafismoDiamonds
        color="currentColor"
        className="slot-key absolute inset-0 opacity-[0.06]"
      />
      <div className="relative max-w-[26ch] px-5 text-center">
        <span className="slot-key font-mono text-[0.6rem] uppercase tracking-[0.2em]">
          {kind} real pendente
        </span>
        <p className="slot-text mt-2 font-mono text-xs leading-relaxed">
          {label}
        </p>
      </div>
    </div>
  );
}

/**
 * Bloco de texto ainda não fornecido pelo cliente (depoimento, número, política).
 * Mantém a página navegável sem inventar prova social.
 */
export function ContentSlot({
  label,
  className = "",
}: {
  label: string;
  className?: string;
}) {
  return (
    <p
      className={`content-slot rounded-lg border border-dashed px-4 py-3 font-mono text-xs leading-relaxed ${className}`}
    >
      <span className="slot-key">pendente · </span>
      {label}
    </p>
  );
}
