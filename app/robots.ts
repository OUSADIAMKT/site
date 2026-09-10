import type { MetadataRoute } from "next";
import { SITE } from "@/lib/site";

/** Exigido pelo `output: "export"`: sem isto o build falha ao coletar a rota. */
export const dynamic = "force-static";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/", disallow: "/obrigado" },
    sitemap: `${SITE.url}/sitemap.xml`,
  };
}
