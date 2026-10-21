import type { Metadata } from "next";
import { Chakra_Petch, Manrope, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { AnnouncementBar } from "@/components/layout/AnnouncementBar";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { WhatsAppFloat } from "@/components/layout/WhatsAppFloat";
import { REVEAL_SCRIPT } from "@/components/ui/Reveal";
import { OG_IMAGEM, SITE, SOCIAL } from "@/lib/site";

const chakra = Chakra_Petch({
  variable: "--font-chakra",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
});

const jetbrains = JetBrains_Mono({
  variable: "--font-jetbrains",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE.url),
  title: {
    default:
      "Ousadia Marketing | Agência Escola e Plataforma de Creators da Amazônia",
    template: "%s | Ousadia Marketing",
  },
  description:
    "A primeira Agência Escola de Marketing do Norte do Brasil. Cursos, mentorias e comunidade para quem quer parar de postar no escuro e começar a vender com estratégia, criatividade e IA.",
  openGraph: {
    type: "website",
    locale: "pt_BR",
    siteName: SITE.name,
    url: SITE.url,
    images: OG_IMAGEM,
  },
  twitter: { card: "summary_large_image", images: OG_IMAGEM },
  // Deixa o Google mostrar imagem grande e trecho inteiro (Discover e busca).
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
};

/**
 * Quem é a Ousadia, para o Google (painel de conhecimento) e para as IAs que
 * citam a fonte. `@id` fixo deixa os artigos apontarem para esta mesma
 * entidade como autora e editora, em vez de repetir os dados em cada página.
 */
const organizationJsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": `${SITE.url}/#organizacao`,
      name: SITE.name,
      legalName: SITE.razaoSocial,
      url: SITE.url,
      logo: `${SITE.url}/marca/circular.png`,
      email: SITE.email,
      slogan: SITE.tagline,
      description:
        "Primeira Agência Escola de Marketing do Norte do Brasil. Cursos, mentoria, agência e a comunidade Creators da Amazônia.",
      address: {
        "@type": "PostalAddress",
        streetAddress: "Rua Coronel José Porfírio, 1651, Centro",
        addressLocality: "Altamira",
        addressRegion: "PA",
        postalCode: "68371-030",
        addressCountry: "BR",
      },
      sameAs: Object.values(SOCIAL).filter(Boolean),
      areaServed: "BR",
      knowsAbout: [
        "marketing digital",
        "social media",
        "UGC",
        "inteligência artificial para negócios",
        "Amazônia",
        "bioeconomia",
      ],
    },
    {
      "@type": "WebSite",
      "@id": `${SITE.url}/#site`,
      name: SITE.name,
      url: SITE.url,
      inLanguage: "pt-BR",
      publisher: { "@id": `${SITE.url}/#organizacao` },
    },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="pt-BR"
      className={`dark ${chakra.variable} ${manrope.variable} ${jetbrains.variable} h-full antialiased`}
      // O REVEAL_SCRIPT acrescenta a classe `js` antes do React hidratar.
      suppressHydrationWarning
    >
      <body className="flex min-h-full flex-col">
        {/* Primeiro do body: roda antes de qualquer conteúdo ser pintado. */}
        <script dangerouslySetInnerHTML={{ __html: REVEAL_SCRIPT }} />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(organizationJsonLd),
          }}
        />
        <a
          href="#conteudo"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[60] focus:rounded-lg focus:bg-amarelo focus:px-4 focus:py-2 focus:font-mono focus:text-xs focus:uppercase focus:text-[#1a0b2e]"
        >
          Pular para o conteúdo
        </a>
        <AnnouncementBar />
        <Header />
        <main id="conteudo" className="flex-1">
          {children}
        </main>
        <Footer />
        <WhatsAppFloat />
      </body>
    </html>
  );
}
