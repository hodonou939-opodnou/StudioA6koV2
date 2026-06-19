import type { Metadata } from "next";
import Link from "next/link";
import { getAllPosts } from "../../lib/blog";

export const metadata: Metadata = {
  title: "Blog — Mode, IA & e-commerce en Afrique de l'Ouest",
  description:
    "Conseils, guides et tendances sur la mode par IA, l'essayage virtuel, le photoshoot et le e-commerce en Afrique de l'Ouest. Par l'équipe Studio A6ko.",
  alternates: { canonical: "https://studio.a6ko.com/blog" },
  openGraph: {
    type: "website",
    url: "https://studio.a6ko.com/blog",
    title: "Blog Studio A6ko — Mode, IA & e-commerce",
    description:
      "Guides pratiques sur la mode par IA, l'essayage virtuel et le e-commerce en Afrique de l'Ouest.",
  },
};

function formatDate(iso: string): string {
  const [y, m, d] = iso.split("-");
  const mois = ["janv.", "févr.", "mars", "avr.", "mai", "juin", "juil.", "août", "sept.", "oct.", "nov.", "déc."];
  return `${parseInt(d, 10)} ${mois[parseInt(m, 10) - 1]} ${y}`;
}

// Structured data — a blog with its list of articles.
const itemListLd = {
  "@context": "https://schema.org",
  "@type": "Blog",
  name: "Blog Studio A6ko",
  url: "https://studio.a6ko.com/blog",
  publisher: { "@type": "Organization", name: "A6ko", url: "https://a6ko.com" },
  blogPost: getAllPosts().map((p) => ({
    "@type": "BlogPosting",
    headline: p.title,
    url: `https://studio.a6ko.com/blog/${p.slug}`,
    datePublished: p.date,
  })),
};

export default function BlogIndex() {
  const all = getAllPosts();
  return (
    <main className="mx-auto max-w-3xl px-4 py-10 sm:py-14">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListLd) }} />
      <nav className="mb-6 text-sm text-brand-text-secondary">
        <Link href="/" className="hover:text-brand-primary transition-colors">Accueil</Link>
        <span aria-hidden="true"> / </span>
        <span className="text-brand-text">Blog</span>
      </nav>

      <header className="mb-10">
        <h1 className="text-3xl sm:text-4xl font-black text-brand-text">Le blog Studio A6ko</h1>
        <p className="mt-3 text-brand-text-secondary">
          Guides pratiques sur la mode par IA, l&apos;essayage virtuel, le photoshoot et le
          e-commerce — pensés pour les marques et créateurs d&apos;Afrique de l&apos;Ouest.
        </p>
      </header>

      <div className="space-y-6">
        {all.map((p) => (
          <article
            key={p.slug}
            className="rounded-2xl border border-brand-secondary/30 bg-brand-surface p-5 sm:p-6 transition-shadow hover:shadow-md"
          >
            <div className="flex items-center gap-2 text-xs text-brand-text-secondary">
              <time dateTime={p.date}>{formatDate(p.date)}</time>
              <span aria-hidden="true">·</span>
              <span>{p.readMin} min de lecture</span>
            </div>
            <h2 className="mt-2 text-xl font-bold text-brand-text">
              <Link href={`/blog/${p.slug}`} className="hover:text-brand-primary transition-colors">
                {p.title}
              </Link>
            </h2>
            <p className="mt-2 text-sm text-brand-text-secondary">{p.excerpt}</p>
            <Link
              href={`/blog/${p.slug}`}
              className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-brand-primary hover:underline"
            >
              Lire l&apos;article →
            </Link>
          </article>
        ))}
      </div>

      <div className="mt-12 rounded-2xl bg-brand-text px-6 py-8 text-center text-white">
        <p className="text-lg font-bold">Prêt à créer vos visuels mode ?</p>
        <p className="mt-1 text-sm text-white/80">Photoshoot et essayage virtuel par IA, en quelques secondes.</p>
        <Link
          href="/"
          className="mt-4 inline-block rounded-full bg-brand-primary px-6 py-2.5 text-sm font-semibold text-white hover:opacity-90 transition-opacity"
        >
          Ouvrir Studio A6ko
        </Link>
      </div>
    </main>
  );
}
