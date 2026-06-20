import type { Metadata, Viewport } from "next";
import "./globals.css";

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
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/icon-192.png", type: "image/png", sizes: "192x192" },
      { url: "/icon-512.png", type: "image/png", sizes: "512x512" },
    ],
    shortcut: "/favicon.ico",
    apple: "/icon-512.png",
  },
  openGraph: {
    type: "website",
    url: "https://studio.a6ko.com",
    siteName: "Studio A6ko",
    title: "Studio A6ko | Studio Photo de Mode IA & Essayage Virtuel",
    description:
      "Photoshoot ultra-réaliste, essayage virtuel (virtual try-on) et création publicitaire par IA — pour marques, boutiques et créateurs.",
    images: [{ url: "/og-image.png", width: 1200, height: 630, alt: "Studio A6ko" }],
    locale: "fr_FR",
  },
  twitter: {
    card: "summary_large_image",
    title: "Studio A6ko | Studio Photo de Mode IA & Essayage Virtuel",
    description: "Photoshoot ultra-réaliste, essayage virtuel et création publicitaire par IA.",
    images: ["/og-image.png"],
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
  image: "https://studio.a6ko.com/icon-512.png",
  offers: { "@type": "Offer", price: "0", priceCurrency: "XOF" },
  publisher: {
    "@type": "Organization",
    name: "A6ko",
    url: "https://a6ko.com",
    logo: {
      "@type": "ImageObject",
      url: "https://studio.a6ko.com/icon-512.png",
      width: 512,
      height: 512,
    },
  },
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
        {/* Gentle, attention-grabbing bob for the footer social icons. */}
        <style
          dangerouslySetInnerHTML={{
            __html:
              "@keyframes a6koBob{0%,100%{transform:translateY(0)}50%{transform:translateY(-4px)}}.a6ko-social{animation:a6koBob 2.4s ease-in-out infinite}@media (prefers-reduced-motion:reduce){.a6ko-social{animation:none}}",
          }}
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
          {/* Official social media — subtle bobbing icons to draw the eye. */}
          <div className="mb-4">
            <p className="mb-3 font-semibold text-brand-text">Suivez-nous ✨</p>
            <div className="flex justify-center items-center gap-4">
              <a
                href="https://www.facebook.com/a6koofficial"
                target="_blank" rel="noopener noreferrer" aria-label="Facebook A6ko"
                style={{ animationDelay: "0s" }}
                className="a6ko-social flex h-10 w-10 items-center justify-center rounded-full bg-brand-bg text-brand-text-secondary shadow-sm transition-all duration-200 hover:scale-125 hover:bg-[#1877F2] hover:text-white"
              >
                <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5"><path d="M24 12.07C24 5.4 18.63 0 12 0S0 5.4 0 12.07C0 18.1 4.39 23.1 10.13 24v-8.44H7.08v-3.49h3.05V9.41c0-3.02 1.79-4.69 4.53-4.69 1.31 0 2.68.24 2.68.24v2.97h-1.51c-1.49 0-1.96.93-1.96 1.89v2.25h3.33l-.53 3.49h-2.8V24C19.61 23.1 24 18.1 24 12.07z"/></svg>
              </a>
              <a
                href="https://www.instagram.com/a6ko_official"
                target="_blank" rel="noopener noreferrer" aria-label="Instagram A6ko"
                style={{ animationDelay: "0.3s" }}
                className="a6ko-social flex h-10 w-10 items-center justify-center rounded-full bg-brand-bg text-brand-text-secondary shadow-sm transition-all duration-200 hover:scale-125 hover:bg-gradient-to-tr hover:from-[#FEDA75] hover:via-[#D62976] hover:to-[#4F5BD5] hover:text-white"
              >
                <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5"><path d="M12 2.16c3.2 0 3.58.01 4.85.07 1.17.05 1.8.25 2.23.41.56.22.96.48 1.38.9.42.42.68.82.9 1.38.16.42.36 1.06.41 2.23.06 1.27.07 1.65.07 4.85s-.01 3.58-.07 4.85c-.05 1.17-.25 1.8-.41 2.23-.22.56-.48.96-.9 1.38-.42.42-.82.68-1.38.9-.42.16-1.06.36-2.23.41-1.27.06-1.65.07-4.85.07s-3.58-.01-4.85-.07c-1.17-.05-1.8-.25-2.23-.41-.56-.22-.96-.48-1.38-.9-.42-.42-.68-.82-.9-1.38-.16-.42-.36-1.06-.41-2.23C2.17 15.58 2.16 15.2 2.16 12s.01-3.58.07-4.85c.05-1.17.25-1.8.41-2.23.22-.56.48-.96.9-1.38.42-.42.82-.68 1.38-.9.42-.16 1.06-.36 2.23-.41C8.42 2.17 8.8 2.16 12 2.16zm0 1.62c-3.15 0-3.52.01-4.76.07-1.15.05-1.77.24-2.19.4-.55.22-.94.47-1.35.88-.41.41-.66.8-.88 1.35-.16.42-.35 1.04-.4 2.19-.06 1.24-.07 1.61-.07 4.76s.01 3.52.07 4.76c.05 1.15.24 1.77.4 2.19.22.55.47.94.88 1.35.41.41.8.66 1.35.88.42.16 1.04.35 2.19.4 1.24.06 1.61.07 4.76.07s3.52-.01 4.76-.07c1.15-.05 1.77-.24 2.19-.4.55-.22.94-.47 1.35-.88.41-.41.66-.8.88-1.35.16-.42.35-1.04.4-2.19.06-1.24.07-1.61.07-4.76s-.01-3.52-.07-4.76c-.05-1.15-.24-1.77-.4-2.19-.22-.55-.47-.94-.88-1.35-.41-.41-.8-.66-1.35-.88-.42-.16-1.04-.35-2.19-.4-1.24-.06-1.61-.07-4.76-.07zM12 6.85a5.15 5.15 0 100 10.3 5.15 5.15 0 000-10.3zm0 8.49a3.34 3.34 0 110-6.68 3.34 3.34 0 010 6.68zm6.56-8.69a1.2 1.2 0 11-2.4 0 1.2 1.2 0 012.4 0z"/></svg>
              </a>
              <a
                href="https://www.tiktok.com/@a6ko_1"
                target="_blank" rel="noopener noreferrer" aria-label="TikTok A6ko"
                style={{ animationDelay: "0.6s" }}
                className="a6ko-social flex h-10 w-10 items-center justify-center rounded-full bg-brand-bg text-brand-text-secondary shadow-sm transition-all duration-200 hover:scale-125 hover:bg-black hover:text-white"
              >
                <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5"><path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-5.2 1.74 2.89 2.89 0 012.89-4.64V9.32a6.34 6.34 0 105.44 6.27V8.79a8.16 8.16 0 004.07 1.06V6.69z"/></svg>
              </a>
              <a
                href="https://www.linkedin.com/company/a6ko-official/"
                target="_blank" rel="noopener noreferrer" aria-label="LinkedIn A6ko"
                style={{ animationDelay: "0.9s" }}
                className="a6ko-social flex h-10 w-10 items-center justify-center rounded-full bg-brand-bg text-brand-text-secondary shadow-sm transition-all duration-200 hover:scale-125 hover:bg-[#0A66C2] hover:text-white"
              >
                <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5"><path d="M20.45 20.45h-3.56v-5.57c0-1.33-.03-3.04-1.85-3.04-1.85 0-2.14 1.45-2.14 2.94v5.67H9.35V9h3.41v1.56h.05c.48-.9 1.64-1.85 3.37-1.85 3.6 0 4.27 2.37 4.27 5.46v6.28zM5.34 7.43a2.06 2.06 0 110-4.13 2.06 2.06 0 010 4.13zM7.12 20.45H3.56V9h3.56v11.45zM22.22 0H1.77C.79 0 0 .77 0 1.73v20.54C0 23.23.79 24 1.77 24h20.45c.98 0 1.78-.77 1.78-1.73V1.73C24 .77 23.2 0 22.22 0z"/></svg>
              </a>
            </div>
          </div>
          <p className="mb-2">Copyright © 2026 A6ko. Tous droits réservés.</p>
          <p className="flex flex-wrap justify-center gap-x-4 gap-y-1">
            <a href="/blog" className="hover:text-brand-primary transition-colors">Blog</a>
            <span aria-hidden="true">·</span>
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
