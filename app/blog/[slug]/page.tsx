import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getAllPosts, getPost, type Block } from "../../../lib/blog";

export function generateStaticParams() {
  return getAllPosts().map((p) => ({ slug: p.slug }));
}

export async function generateMetadata(
  { params }: { params: Promise<{ slug: string }> },
): Promise<Metadata> {
  const { slug } = await params;
  const post = getPost(slug);
  if (!post) return { title: "Article introuvable" };
  const url = `https://studio.a6ko.com/blog/${post.slug}`;
  return {
    title: post.title,
    description: post.description,
    keywords: post.keywords,
    alternates: { canonical: url },
    openGraph: {
      type: "article",
      url,
      title: post.title,
      description: post.description,
      publishedTime: post.date,
      authors: ["A6ko"],
    },
    twitter: { card: "summary_large_image", title: post.title, description: post.description },
  };
}

function formatDate(iso: string): string {
  const [y, m, d] = iso.split("-");
  const mois = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"];
  return `${parseInt(d, 10)} ${mois[parseInt(m, 10) - 1]} ${y}`;
}

function renderBlock(b: Block, i: number) {
  switch (b.t) {
    case "h2":
      return <h2 key={i} className="mt-8 mb-3 text-2xl font-bold text-brand-text">{b.text}</h2>;
    case "h3":
      return <h3 key={i} className="mt-6 mb-2 text-xl font-semibold text-brand-text">{b.text}</h3>;
    case "p":
      return <p key={i} className="mb-4 leading-relaxed text-brand-text-secondary [&_a]:text-brand-primary [&_a]:font-medium [&_a:hover]:underline [&_strong]:text-brand-text" dangerouslySetInnerHTML={{ __html: b.html }} />;
    case "ul":
      return (
        <ul key={i} className="mb-4 list-disc space-y-1.5 pl-5 text-brand-text-secondary [&_strong]:text-brand-text">
          {b.items.map((it, j) => <li key={j} dangerouslySetInnerHTML={{ __html: it }} />)}
        </ul>
      );
    case "ol":
      return (
        <ol key={i} className="mb-4 list-decimal space-y-1.5 pl-5 text-brand-text-secondary [&_strong]:text-brand-text">
          {b.items.map((it, j) => <li key={j} dangerouslySetInnerHTML={{ __html: it }} />)}
        </ol>
      );
    case "quote":
      return <blockquote key={i} className="my-6 border-l-4 border-brand-primary bg-brand-surface px-5 py-3 italic text-brand-text">{b.text}</blockquote>;
    case "cta":
      return (
        <div key={i} className="my-8 rounded-2xl bg-brand-text px-6 py-8 text-center text-white">
          <p className="text-lg font-bold">Essayez Studio A6ko gratuitement</p>
          <p className="mt-1 text-sm text-white/80">Photoshoot et essayage virtuel par IA, en quelques secondes.</p>
          <Link href="/" className="mt-4 inline-block rounded-full bg-brand-primary px-6 py-2.5 text-sm font-semibold text-white hover:opacity-90 transition-opacity">
            Ouvrir le studio
          </Link>
        </div>
      );
    default:
      return null;
  }
}

export default async function BlogArticle(
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const post = getPost(slug);
  if (!post) notFound();

  const url = `https://studio.a6ko.com/blog/${post.slug}`;
  const articleLd = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: post.title,
    description: post.description,
    datePublished: post.date,
    dateModified: post.date,
    author: { "@type": "Organization", name: "A6ko", url: "https://a6ko.com" },
    publisher: {
      "@type": "Organization",
      name: "A6ko",
      url: "https://a6ko.com",
      logo: { "@type": "ImageObject", url: "https://studio.a6ko.com/icon-512.png" },
    },
    mainEntityOfPage: { "@type": "WebPage", "@id": url },
    keywords: post.keywords.join(", "),
  };
  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Accueil", item: "https://studio.a6ko.com" },
      { "@type": "ListItem", position: 2, name: "Blog", item: "https://studio.a6ko.com/blog" },
      { "@type": "ListItem", position: 3, name: post.title, item: url },
    ],
  };

  const others = getAllPosts().filter((p) => p.slug !== post.slug).slice(0, 3);

  return (
    <main className="mx-auto max-w-2xl px-4 py-10 sm:py-14">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(articleLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }} />

      <nav className="mb-6 text-sm text-brand-text-secondary">
        <Link href="/" className="hover:text-brand-primary transition-colors">Accueil</Link>
        <span aria-hidden="true"> / </span>
        <Link href="/blog" className="hover:text-brand-primary transition-colors">Blog</Link>
      </nav>

      <article>
        <header className="mb-8">
          <div className="flex items-center gap-2 text-xs text-brand-text-secondary">
            <time dateTime={post.date}>{formatDate(post.date)}</time>
            <span aria-hidden="true">·</span>
            <span>{post.readMin} min de lecture</span>
          </div>
          <h1 className="mt-2 text-3xl sm:text-4xl font-black leading-tight text-brand-text">{post.title}</h1>
          <p className="mt-3 text-lg text-brand-text-secondary">{post.description}</p>
        </header>
        <div>{post.body.map(renderBlock)}</div>
      </article>

      {others.length > 0 && (
        <aside className="mt-12 border-t border-brand-secondary/30 pt-8">
          <h2 className="mb-4 text-lg font-bold text-brand-text">À lire ensuite</h2>
          <ul className="space-y-3">
            {others.map((p) => (
              <li key={p.slug}>
                <Link href={`/blog/${p.slug}`} className="font-medium text-brand-primary hover:underline">
                  {p.title}
                </Link>
              </li>
            ))}
          </ul>
        </aside>
      )}
    </main>
  );
}
