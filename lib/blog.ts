// Blog content store. Pure data — fully isolated from the app. Nothing in the
// app imports this, and these articles import nothing from the app, so the blog
// can never break the studio. Routes: /blog and /blog/[slug].

export type Block =
  | { t: "p"; html: string }
  | { t: "h2"; text: string }
  | { t: "h3"; text: string }
  | { t: "ul"; items: string[] }
  | { t: "ol"; items: string[] }
  | { t: "quote"; text: string }
  | { t: "cta" };

export interface Post {
  slug: string;
  title: string;        // <h1> + SEO title
  description: string;  // meta description
  excerpt: string;      // card teaser
  date: string;         // ISO date
  readMin: number;
  keywords: string[];
  body: Block[];
}

const SITE = "https://studio.a6ko.com";

export const posts: Post[] = [
  {
    slug: "essayage-virtuel-vendre-plus-vetements-afrique",
    title: "Essayage virtuel : comment vendre plus de vêtements en ligne en Afrique de l'Ouest",
    description:
      "L'essayage virtuel (virtual try-on) par IA aide les boutiques et créateurs d'Afrique de l'Ouest à réduire les retours, rassurer les clients et vendre plus. Guide pratique 2026.",
    excerpt:
      "Le virtual try-on n'est plus réservé aux géants du e-commerce. Voici comment une boutique de Cotonou, Abidjan ou Dakar peut l'utiliser dès aujourd'hui pour vendre plus.",
    date: "2026-06-19",
    readMin: 7,
    keywords: [
      "essayage virtuel", "virtual try-on", "vendre vêtements en ligne afrique",
      "e-commerce mode afrique de l'ouest", "boutique en ligne bénin côte d'ivoire sénégal",
    ],
    body: [
      { t: "p", html: "En Afrique de l'Ouest, le commerce de mode en ligne explose : Instagram, WhatsApp Business et les marketplaces locales sont devenus les vitrines des marques. Mais un obstacle revient sans cesse — <strong>« est-ce que ça va m'aller ? »</strong>. Sans réponse claire, le client hésite, le panier est abandonné, et quand l'achat a lieu, le retour coûte cher. L'<strong>essayage virtuel</strong> (ou <em>virtual try-on</em>) répond exactement à cette question." },
      { t: "h2", text: "Qu'est-ce que l'essayage virtuel par IA ?" },
      { t: "p", html: "L'essayage virtuel utilise l'intelligence artificielle pour habiller une personne avec un vêtement, à partir d'une simple photo. Le client (ou la boutique) téléverse un visage ou une silhouette, choisit un vêtement, et l'IA génère une image réaliste du rendu porté — drapé, couleur, coupe, le tout cohérent avec la morphologie." },
      { t: "p", html: "Avec <a href=\"/\">Studio A6ko</a>, ce processus prend quelques secondes et ne demande aucun matériel : pas de mannequin, pas de studio, pas de photographe." },
      { t: "h2", text: "Pourquoi c'est décisif pour les boutiques ouest-africaines" },
      { t: "ul", items: [
        "<strong>Moins de retours</strong> : le client voit le rendu avant d'acheter, donc moins de mauvaises surprises et moins de frais logistiques.",
        "<strong>Plus de conversions</strong> : une image « porté » rassure bien plus qu'une photo de produit à plat.",
        "<strong>Catalogue instantané</strong> : présentez la même tenue sur plusieurs profils sans refaire de shooting.",
        "<strong>Coût quasi nul</strong> : remplacez des séances photo coûteuses par une génération IA.",
      ]},
      { t: "h2", text: "Comment l'utiliser concrètement en 4 étapes" },
      { t: "ol", items: [
        "Prenez une photo nette du vêtement (de préférence sur fond clair).",
        "Capturez ou téléversez le visage/la silhouette du modèle.",
        "Lancez l'essayage virtuel dans Studio A6ko.",
        "Téléchargez l'image et publiez-la sur WhatsApp, Instagram ou votre boutique.",
      ]},
      { t: "quote", text: "Une boutique qui montre ses pièces « portées » plutôt que « à plat » se démarque immédiatement dans un fil Instagram saturé." },
      { t: "h2", text: "Et le référencement (SEO) dans tout ça ?" },
      { t: "p", html: "Des visuels uniques et de qualité améliorent le temps passé sur vos fiches et réduisent le taux de rebond — deux signaux que Google valorise. Associez chaque visuel à une description riche (matière, occasion, taille) et à des mots-clés locaux (« robe wax Cotonou », « ensemble bazin Dakar ») pour capter la recherche régionale." },
      { t: "p", html: "Pour aller plus loin, lisez notre guide du <a href=\"/blog/photoshoot-ia-photos-studio-sans-studio\">photoshoot mode par IA</a> et celui de la <a href=\"/blog/fiche-produit-mode-qui-convertit\">fiche produit qui convertit</a>." },
      { t: "cta" },
    ],
  },
  {
    slug: "photoshoot-ia-photos-studio-sans-studio",
    title: "Photoshoot mode par IA : des photos studio sans studio (guide 2026)",
    description:
      "Réalisez un photoshoot de mode ultra-réaliste sans photographe, mannequin ni studio. Guide complet du photoshoot IA pour marques et créateurs en 2026.",
    excerpt:
      "Un shooting professionnel coûtait des centaines de milliers de francs. Aujourd'hui, l'IA génère des visuels de niveau studio en quelques secondes. Voici comment.",
    date: "2026-06-18",
    readMin: 8,
    keywords: [
      "photoshoot ia", "photo studio ia", "shooting mode sans studio",
      "générateur photo mode", "ai photoshoot", "mannequin virtuel",
    ],
    body: [
      { t: "p", html: "Le photoshoot a toujours été le poste de dépense le plus lourd pour une marque de mode : location de studio, photographe, mannequins, maquillage, post-production. Pour une jeune marque africaine, c'est souvent inaccessible. Le <strong>photoshoot par IA</strong> change radicalement l'équation." },
      { t: "h2", text: "Comment fonctionne un photoshoot IA" },
      { t: "p", html: "Vous fournissez votre vêtement et un modèle (réel ou généré), puis vous choisissez le décor, la lumière, la pose et le cadrage. L'IA produit une image de qualité éditoriale, cohérente et haute résolution. <a href=\"/\">Studio A6ko</a> gère automatiquement les détails techniques — lumière douce, objectif 85 mm, heure dorée — pour un rendu professionnel sans expertise photo." },
      { t: "h2", text: "Ce que vous pouvez créer" },
      { t: "ul", items: [
        "Des visuels e-commerce propres pour vos fiches produits.",
        "Des images lifestyle pour Instagram et TikTok.",
        "Des campagnes publicitaires avec décor sur mesure.",
        "Des déclinaisons d'une même tenue sur plusieurs modèles et ambiances.",
      ]},
      { t: "h2", text: "5 bonnes pratiques pour un rendu réaliste" },
      { t: "ol", items: [
        "Utilisez une photo de vêtement nette, bien éclairée et de face.",
        "Privilégiez un décor cohérent avec votre positionnement (urbain, naturel, studio).",
        "Variez les poses pour raconter une histoire, pas juste montrer un produit.",
        "Gardez une direction artistique constante (couleurs, ambiance) sur toute la collection.",
        "Téléchargez en haute résolution pour l'impression et les publicités.",
      ]},
      { t: "quote", text: "La règle d'or : la cohérence. Une collection avec une identité visuelle homogène inspire confiance et se mémorise." },
      { t: "h2", text: "Photoshoot IA et SEO : un duo gagnant" },
      { t: "p", html: "Des images originales et légères (bien compressées) accélèrent votre site et nourrissent Google Images. Nommez vos fichiers avec des mots-clés, ajoutez des balises <em>alt</em> descriptives, et publiez régulièrement du contenu visuel frais — c'est l'un des leviers SEO les plus sous-estimés en Afrique de l'Ouest." },
      { t: "p", html: "Découvrez aussi comment l'<a href=\"/blog/essayage-virtuel-vendre-plus-vetements-afrique\">essayage virtuel</a> complète parfaitement votre photoshoot." },
      { t: "cta" },
    ],
  },
  {
    slug: "fiche-produit-mode-qui-convertit",
    title: "Comment créer une fiche produit mode qui convertit (catalogue e-commerce)",
    description:
      "Une fiche produit mode efficace combine visuels IA, description optimisée SEO et preuve sociale. Méthode complète pour augmenter vos ventes en ligne.",
    excerpt:
      "Une belle photo ne suffit pas. Voici l'anatomie d'une fiche produit mode qui transforme un visiteur en acheteur — visuels, mots, structure.",
    date: "2026-06-17",
    readMin: 6,
    keywords: [
      "fiche produit mode", "catalogue e-commerce", "description produit seo",
      "vendre en ligne afrique", "fiche produit qui convertit",
    ],
    body: [
      { t: "p", html: "Votre fiche produit est votre vendeur silencieux. Elle travaille 24h/24, mais seulement si elle est construite pour convaincre. Voici les éléments indispensables." },
      { t: "h2", text: "1. Des visuels multiples et « portés »" },
      { t: "p", html: "Montrez le vêtement sous plusieurs angles, de près (matière) et porté (rendu réel). Générez ces visuels en quelques secondes avec un <a href=\"/blog/photoshoot-ia-photos-studio-sans-studio\">photoshoot IA</a> et un <a href=\"/blog/essayage-virtuel-vendre-plus-vetements-afrique\">essayage virtuel</a> plutôt qu'une seule photo à plat." },
      { t: "h2", text: "2. Un titre clair et riche en mots-clés" },
      { t: "p", html: "Combinez le type, la matière et le style : « Robe longue en wax — coupe ample, manches bouffantes ». C'est lisible pour le client et précis pour Google." },
      { t: "h2", text: "3. Une description structurée" },
      { t: "ul", items: [
        "Un premier paragraphe émotionnel : l'occasion, le ressenti, le style.",
        "Une liste de caractéristiques : matière, coupe, tailles, entretien.",
        "Un rappel des avantages : livraison, paiement, retours.",
      ]},
      { t: "h2", text: "4. La preuve sociale" },
      { t: "p", html: "Avis clients, photos de clientes, nombre de ventes. Sur WhatsApp, partagez des captures de retours satisfaits — la confiance se construit par l'exemple." },
      { t: "h2", text: "5. Un appel à l'action sans friction" },
      { t: "p", html: "Un bouton clair (« Commander sur WhatsApp », « Ajouter au panier ») et un prix visible. Chaque clic supplémentaire fait perdre des ventes." },
      { t: "quote", text: "Règle simple : une fiche = un produit, une promesse, une action évidente." },
      { t: "cta" },
    ],
  },
  {
    slug: "ia-mode-afrique-revolution-contenu-visuel",
    title: "IA et mode en Afrique : la révolution du contenu visuel pour les marques",
    description:
      "L'intelligence artificielle redéfinit la création de contenu mode en Afrique : photoshoot, essayage virtuel, publicité. Tour d'horizon et opportunités pour 2026.",
    excerpt:
      "Pendant longtemps, le contenu visuel de qualité était un luxe. L'IA le démocratise — et place les marques africaines sur un pied d'égalité avec le monde entier.",
    date: "2026-06-16",
    readMin: 7,
    keywords: [
      "ia mode afrique", "ai fashion afrique", "création contenu visuel ia",
      "marque mode africaine", "intelligence artificielle mode",
    ],
    body: [
      { t: "p", html: "L'Afrique de l'Ouest regorge de talents en mode — stylistes, couturiers, créateurs de marques. Mais raconter visuellement cette créativité coûtait cher. L'IA générative supprime cette barrière et ouvre une nouvelle ère pour le contenu de mode." },
      { t: "h2", text: "Trois usages qui changent la donne" },
      { t: "h3", text: "1. Le photoshoot à la demande" },
      { t: "p", html: "Plus besoin d'attendre une séance photo planifiée. Vous lancez une nouvelle pièce le matin, vous avez les visuels l'après-midi. Lisez notre <a href=\"/blog/photoshoot-ia-photos-studio-sans-studio\">guide du photoshoot IA</a>." },
      { t: "h3", text: "2. L'essayage virtuel" },
      { t: "p", html: "Vos clients visualisent le rendu avant d'acheter — un game-changer pour le e-commerce. Voir notre <a href=\"/blog/essayage-virtuel-vendre-plus-vetements-afrique\">guide de l'essayage virtuel</a>." },
      { t: "h3", text: "3. La publicité visuelle" },
      { t: "p", html: "Décors, ambiances et campagnes générés sur mesure, sans budget production. De quoi rivaliser avec les grandes marques sur Instagram et TikTok." },
      { t: "h2", text: "Un terrain de jeu enfin égal" },
      { t: "p", html: "Une marque de Lomé, Ouagadougou ou Bamako peut désormais produire des visuels du même niveau qu'une maison parisienne. L'avantage va à celui qui crée vite, raconte bien et publie régulièrement — pas à celui qui a le plus gros budget." },
      { t: "quote", text: "L'IA ne remplace pas la créativité africaine. Elle lui donne enfin les moyens de son ambition." },
      { t: "h2", text: "Par où commencer" },
      { t: "p", html: "Choisissez une pièce, générez un visuel porté, publiez-le, mesurez. Répétez. La régularité bat la perfection. <a href=\"/\">Lancez votre premier visuel avec Studio A6ko</a> dès aujourd'hui." },
      { t: "cta" },
    ],
  },
];

export function getAllPosts(): Post[] {
  // Newest first.
  return [...posts].sort((a, b) => (a.date < b.date ? 1 : -1));
}

export function getPost(slug: string): Post | undefined {
  return posts.find((p) => p.slug === slug);
}

export const BLOG_BASE = `${SITE}/blog`;
