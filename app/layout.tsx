import type { Metadata, Viewport } from "next";
import "./globals.css";

const faviconSvg =
  "data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><rect width=%22100%22 height=%22100%22 fill=%22%23FFF8F0%22 rx=%2220%22/><text x=%2250%22 y=%2270%22 font-family=%22sans-serif%22 font-weight=%22900%22 font-size=%2250%22 text-anchor=%22middle%22 fill=%22%23111827%22>a<tspan fill=%22%2316A34A%22>6</tspan>ko</text></svg>";

export const metadata: Metadata = {
  title: "Studio a6ko | AI Fashion Studio Photo & Photoshoot de Mode Virtuel IA",
  description:
    "Studio a6ko est le studio photo de mode IA : photoshoot ultra-réaliste, essayage virtuel (virtual try-on), et création publicitaire.",
  manifest: "/manifest.json",
  icons: { icon: faviconSvg, apple: "/icon-512.png" },
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
      </head>
      <body className="bg-brand-bg font-sans text-brand-text">
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
