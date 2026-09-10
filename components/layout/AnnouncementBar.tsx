import { CAMPAIGN, wa } from "@/lib/site";

/**
 * Barra de campanha (PRD 6.2). Fora da janela de lançamento não renderiza —
 * alterne em `CAMPAIGN.active` no `lib/site.ts`.
 */
export function AnnouncementBar() {
  if (!CAMPAIGN.active) return null;

  return (
    <div className="bg-amarelo text-[#1a0b2e]">
      <div className="container-site flex items-center justify-center gap-2 py-2 text-center">
        <span className="font-mono text-[0.7rem] font-semibold uppercase tracking-wider sm:text-xs">
          🌱 {CAMPAIGN.text}{" "}
          <a href={wa("escola")} className="underline underline-offset-2">
            {CAMPAIGN.ctaLabel} →
          </a>
        </span>
      </div>
    </div>
  );
}
