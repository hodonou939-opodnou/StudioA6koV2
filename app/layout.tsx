import type { Metadata, Viewport } from "next";
import "./globals.css";

const faviconSvg =
  "data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><rect width=%22100%22 height=%22100%22 fill=%22%23FFF8F0%22 rx=%2220%22/><text x=%2250%22 y=%2270%22 font-family=%22sans-serif%22 font-weight=%22900%22 font-size=%2250%22 text-anchor=%22middle%22 fill=%22%23111827%22>a<tspan fill=%22%2316A34A%22>6</tspan>ko</text></svg>";

export const metadata: Metadata = {
  metadataBase: new URL("https://studio.a6ko.com"),
  title: {
    default: "Studio A6ko | Studio Photo de Mode IA, Photoshoot & Essayage Virtuel",
    template: "%s | Studio A6ko",
  },
  description:
    "Studio A6ko : le studio photo de mode par IA. Photoshoot ultra-réaliste sur mannequins, essayage virtuel (virtual try-on) de vêtements et création publicitaire — pour marques, boutiques e-commerce et créateurs.",
  keywords: [
    "studio photo IA", "photoshoot IA", "essayage virtuel", "virtual try-on",
    "mannequin virtuel", "IA mode", "AI fashion studio", "AI photoshoot",
    "générateur photo mode", "essayage vêtement en ligne", "Studio A6ko", "a6ko",
    "photoshoot mode Afrique", "catalogue e-commerce IA", "fiche produit IA",
    "création publicitaire IA", "mode IA",
  ],
  applicationName: "Studio A6ko",
  authors: [{ name: "A6ko" }],
  creator: "A6ko",
  alternates: { canonical: "https://studio.a6ko.com" },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1 },
  },
  manifest: "/manifest.json",
  icons: { icon: faviconSvg, apple: "/icon-512.png" },
  openGraph: {
    type: "website",
    url: "https://studio.a6ko.com",
    siteName: "Studio A6ko",
    title: "Studio A6ko | Studio Photo de Mode IA & Essayage Virtuel",
    description:
      "Photoshoot ultra-réaliste, essayage virtuel (virtual try-on) et création publicitaire par IA — pour marques, boutiques et créateurs.",
    images: [{ url: "/icon-512.png", width: 512, height: 512, alt: "Studio A6ko" }],
    locale: "fr_FR",
  },
  twitter: {
    card: "summary_large_image",
    title: "Studio A6ko | Studio Photo de Mode IA & Essayage Virtuel",
    description: "Photoshoot ultra-réaliste, essayage virtuel et création publicitaire par IA.",
    images: ["/icon-512.png"],
  },
};

// Structured data so Google can show a rich result for the app.
const jsonLd = {
  "@context": "https://schema.org",
  "@type": "WebApplication",
  name: "Studio A6ko",
  alternateName: "a6ko",
  url: "https://studio.a6ko.com",
  applicationCategory: "DesignApplication",
  operatingSystem: "All",
  description:
    "Studio photo de mode par IA : photoshoot ultra-réaliste, essayage virtuel (virtual try-on) et création publicitaire.",
  offers: { "@type": "Offer", price: "0", priceCurrency: "XOF" },
  publisher: { "@type": "Organization", name: "A6ko", url: "https://a6ko.com" },
};

export const viewport: Viewport = {
  themeColor: "#111827",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;900&display=swap"
          rel="stylesheet"
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body className="bg-brand-bg font-sans text-brand-text">
        {/* Server-rendered, crawlable intro — visible to search engines even before
            the app's JS loads. Hidden from sighted users (the SPA renders the real UI). */}
        <h1 className="sr-only">
          Studio A6ko — Studio photo de mode par IA : photoshoot, essayage virtuel et création publicitaire
        </h1>
        <p className="sr-only">
          Studio A6ko est le studio photo de mode propulsé par l&apos;intelligence artificielle. Réalisez
          des photoshoots ultra-réalistes sur mannequins, des essayages virtuels (virtual try-on) de
          vêtements, et des visuels publicitaires en quelques secondes — idéal pour les marques, les
          boutiques e-commerce, les stylistes et les créateurs de contenu.
        </p>
        {children}
        <footer className="border-t border-brand-secondary/30 bg-brand-surface mt-auto py-6 px-4 text-center text-xs text-brand-text-secondary">
          <p className="mb-2">Copyright © 2026 A6ko. Tous droits réservés.</p>
          <p className="flex flex-wrap justify-center gap-x-4 gap-y-1">
            <a href="https://a6ko.com/" target="_blank" rel="noopener noreferrer" className="hover:text-brand-primary transition-colors">
              Créer une boutique sur A6ko
            </a>
            <span aria-hidden="true">·</span>
            <a href="https://eya.a6ko.com/" target="_blank" rel="noopener noreferrer" className="hover:text-brand-primary transition-colors">
              IA de prise de mesures à distance pour stylistes, tailleurs et couturiers·ères
            </a>
            <span aria-hidden="true">·</span>
            <a href="/privacy" className="hover:text-brand-primary transition-colors">Confidentialité</a>
            <span aria-hidden="true">·</span>
            <a href="/terms" className="hover:text-brand-primary transition-colors">Conditions</a>
          </p>
        </footer>
      </body>
    </html>
  );
}
