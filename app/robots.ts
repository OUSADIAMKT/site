import type { MetadataRoute } from "next";
import { SITE } from "@/lib/site";

/** Exigido pelo `output: "export"`: sem isto o build falha ao coletar a rota. */
export const dynamic = "force-static";

/**
 * Robôs de busca com IA, liberados pelo nome. O `*` já os deixaria entrar, mas
 * alguns só respeitam a regra que os cita, e listar deixa a decisão explícita:
 * a Ousadia quer ser citada por ChatGPT, Claude, Perplexity, Gemini e Copilot.
 * Os de treino (GPTBot, ClaudeBot, Google-Extended, Applebot-Extended,
 * CCBot) estão juntos; para bloquear treino sem sumir da busca, mova só esses
 * para um `disallow: "/"`.
 */
const ROBOS_IA = [
  "OAI-SearchBot",
  "ChatGPT-User",
  "GPTBot",
  "Claude-SearchBot",
  "Claude-User",
  "ClaudeBot",
  "PerplexityBot",
  "Perplexity-User",
  "Google-Extended",
  "Applebot-Extended",
  "Bingbot",
  "CCBot",
];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: "*", allow: "/", disallow: "/obrigado" },
      { userAgent: ROBOS_IA, allow: "/", disallow: "/obrigado" },
    ],
    sitemap: `${SITE.url}/sitemap.xml`,
  };
}
