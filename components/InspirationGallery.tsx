import React, { useState, useMemo } from 'react';
import { Icon } from './Icon';

interface InspirationGalleryProps {
  T: any;
  language: 'en' | 'fr';
}

const CATEGORIES = (isFR: boolean) => [
  { id: 'all', label: isFR ? 'Tous les Outils' : 'All Masterpieces' },
  { id: 'essayage', label: isFR ? '👗 Essayage Virtuel IA' : '👗 Virtual Try-On' },
  { id: 'photoshoot', label: isFR ? '📸 Séance Photo' : '📸 AI Photoshoot' },
  { id: 'creatives', label: isFR ? '🎨 Studio Créatif' : '🎨 Ad Creative' },
];

const BASE_CREATIVES = [
  { 
    id: 'base-1', 
    tool: 'essayage', 
    url: 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=800&q=80', 
    titleEN: 'Summer Chic Collection', 
    titleFR: 'Collection Chic d’Été', 
    author: '@style_icon' 
  },
  { 
    id: 'base-2', 
    tool: 'photoshoot', 
    url: 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800&q=80', 
    titleEN: 'Modern Architectural Villa', 
    titleFR: 'Shooting Villa Contemporaine', 
    author: '@lux_estates' 
  },
  { 
    id: 'base-3', 
    tool: 'creatives', 
    url: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=800&q=80', 
    titleEN: 'Artisan Pizza Social Ad', 
    titleFR: 'Publicité Pizza Artisanale', 
    author: '@chef_mario' 
  },
  { 
    id: 'base-4', 
    tool: 'creatives', 
    url: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800&q=80', 
    titleEN: 'Premium Sound Promo Banner', 
    titleFR: 'Bannière Promo Audio Haut de Gamme', 
    author: '@tech_trends' 
  },
  { 
    id: 'base-5', 
    tool: 'photoshoot', 
    url: 'https://images.unsplash.com/photo-1596462502278-27bf85033e5a?w=800&q=80', 
    titleEN: 'Organic Floral Cosmetics Catalog', 
    titleFR: 'Catalogue Cosmétiques Organiques', 
    author: '@glow_up' 
  },
  { 
    id: 'base-6', 
    tool: 'essayage', 
    url: 'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=800&q=80', 
    titleEN: 'Vintage Hat & Autumn Outfit', 
    titleFR: 'Style Rétro & Chapeau Automne', 
    author: '@retro_chic' 
  },
  { 
    id: 'base-7', 
    tool: 'creatives', 
    url: 'https://images.unsplash.com/photo-1482049016688-2d3e1b311543?w=800&q=80', 
    titleEN: 'Healthy Diet Branded Poster', 
    titleFR: 'Layout Petit-Déjeuner Équilibré', 
    author: '@fit_foodie' 
  },
  { 
    id: 'base-8', 
    tool: 'photoshoot', 
    url: 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=800&q=80', 
    titleEN: 'Rustic Downtown Loft Shoot', 
    titleFR: 'Shooting Intérieur Loft Urbain', 
    author: '@city_living' 
  },
  { 
    id: 'base-9', 
    tool: 'photoshoot', 
    url: 'https://images.unsplash.com/photo-1522337360788-8b13fee7a3af?w=800&q=80', 
    titleEN: 'Luxury Brand Lipstick Catalog', 
    titleFR: 'Shooting Rouge à Lèvres Prestige', 
    author: '@mua_star' 
  },
  { 
    id: 'base-10', 
    tool: 'creatives', 
    url: 'https://images.unsplash.com/photo-1526406915894-7bcd65f60845?w=800&q=80', 
    titleEN: 'Smart Devices Sales Presentation', 
    titleFR: 'Présentation Vente Appareils Connectés', 
    author: '@future_now' 
  },
  { 
    id: 'base-11', 
    tool: 'essayage', 
    url: 'https://images.unsplash.com/photo-1445205170230-053b83016050?w=800&q=80', 
    titleEN: 'Heavy Winter Overcoat Try-On', 
    titleFR: 'Essayage Manteau d’Hiver Laine', 
    author: '@cozy_style' 
  },
  { 
    id: 'base-12', 
    tool: 'creatives', 
    url: 'https://images.unsplash.com/photo-1473093295043-cdd812d0e601?w=800&q=80', 
    titleEN: 'Traditional Pasta Packaging Concept', 
    titleFR: 'Bannière Menu Pâtes Italiennes', 
    author: '@pasta_lover' 
  },
];

const DYNAMIC_POOL = [
  // Session 1 Try-ons
  {
    url: 'https://images.unsplash.com/photo-1539109136881-3be0616acf4b?w=800&q=80',
    titleFR: 'Trench-Coat d’Automne Sur-Mesure',
    titleEN: 'Custom Fall Trench Coat Try-on',
    author: '@aurora_fits',
    tool: 'essayage'
  },
  // Session 1 Photoshoots
  {
    url: 'https://images.unsplash.com/photo-1540555700478-4be289fbecef?w=800&q=80',
    titleFR: 'Séance Photo Collection Blazer Chic',
    titleEN: 'AI Blazer Shoot Studio Catalogue',
    author: '@marcia_camera',
    tool: 'photoshoot'
  },
  // Session 1 Creatives
  {
    url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&q=80',
    titleFR: 'Campagne de Visuels Minimalistes Pastel',
    titleEN: 'Ad Campaign Aesthetic Pastel Mockups',
    author: '@pixel_pro',
    tool: 'creatives'
  },
  // Session 2
  {
    url: 'https://images.unsplash.com/photo-1509631179647-0177331693ae?w=800&q=80',
    titleFR: 'Robe de Bal d’Exception Portée par IA',
    titleEN: 'Exquisite Gown Dress Instant Try-On',
    author: '@hautecouture_ai',
    tool: 'essayage'
  },
  {
    url: 'https://images.unsplash.com/photo-1512436991641-6745cdb1723f?w=800&q=80',
    titleFR: 'Modèle de Mode Prêt-à-Porter Européen',
    titleEN: 'European Autumn Apparel Model Shoot',
    author: '@vintage_vistas',
    tool: 'photoshoot'
  },
  {
    url: 'https://images.unsplash.com/photo-1620641788421-7a1c342ea42e?w=800&q=80',
    titleFR: 'Publicité Néon Multilingue Cyber-Day',
    titleEN: 'Multilingual Cyber-Day Vibrant Ad banner',
    author: '@cyber_ad',
    tool: 'creatives'
  },
  // Session 3
  {
    url: 'https://images.unsplash.com/photo-1507679799987-c73779587ccf?w=800&q=80',
    titleFR: 'Veste d’Affaires Ajustée Classique',
    titleEN: 'Sharp Classic Business Jacket Try-On',
    author: '@suit_elegance',
    tool: 'essayage'
  },
  {
    url: 'https://images.unsplash.com/photo-1501196354995-cbb51c65aaea?w=800&q=80',
    titleFR: 'Shooting Intérieur Esprit Atelier Lumineux',
    titleEN: 'Cozy Morning Loft Catalog Shoot',
    author: '@lumina_lens',
    tool: 'photoshoot'
  },
  {
    url: 'https://images.unsplash.com/photo-1513151233558-d860c5398176?w=800&q=80',
    titleFR: 'Flyer Digital Célébration Or & Confettis',
    titleEN: 'Gold Festive Holiday Sales Creative',
    author: '@ad_wizard',
    tool: 'creatives'
  },
  // Session 4
  {
    url: 'https://images.unsplash.com/photo-1485462537746-965f33f7f6a7?w=800&q=80',
    titleFR: 'Ensemble Tricot Écoresponsable Essayé',
    titleEN: 'Eco-Friendly Knitted Sweater Outfit Try-On',
    author: '@eco_style',
    tool: 'essayage'
  },
  {
    url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=800&q=80',
    titleFR: 'Campagne Cosmétiques de Luxe Glow up',
    titleEN: 'Luxe Skin Wellness Campaign Portrait',
    author: '@glow_mag',
    tool: 'photoshoot'
  },
  {
    url: 'https://images.unsplash.com/photo-1557683316-973673baf926?w=800&q=80',
    titleFR: 'Identité Brute et Visuel Corporatif Dynamique',
    titleEN: 'Dynamic Modern Abstract Layout ad',
    author: '@flow_design',
    tool: 'creatives'
  },
  // Session 5
  {
    url: 'https://images.unsplash.com/photo-1529139574466-a303027c1d8b?w=800&q=80',
    titleFR: 'Style Croisé Mailles Décontracté',
    titleEN: 'Relaxed Lightweight Mesh Overcoat Look',
    author: '@summer_vibe',
    tool: 'essayage'
  },
  {
    url: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=800&q=80',
    titleFR: 'Shooting Beauté Studio Éditorial',
    titleEN: 'Minimalist Portrait Studio Catalog',
    author: '@studio_vogue',
    tool: 'photoshoot'
  },
  {
    url: 'https://images.unsplash.com/photo-1542744094-3a31f103e35f?w=800&q=80',
    titleFR: 'Moodboard Campagne Social Media Marbre/Or',
    titleEN: 'Sophisticated Brand Moodboard layout',
    author: '@brand_mind',
    tool: 'creatives'
  },
  // Session 6
  {
    url: 'https://images.unsplash.com/photo-1558769132-cb1aea458c5e?w=800&q=80',
    titleFR: 'Robe de Coton Fluide Bleu Indigo',
    titleEN: 'Flowy Blue Cotton Sunset Dress Try-On',
    author: '@sunset_wear',
    tool: 'essayage'
  },
  {
    url: 'https://images.unsplash.com/photo-1513519245088-0e12902e5a38?w=800&q=80',
    titleFR: 'Shooting Meubles & Design Intérieur Épuré',
    titleEN: 'Contemporary Living Studio furniture Shoot',
    author: '@scandic_living',
    tool: 'photoshoot'
  },
  {
    url: 'https://images.unsplash.com/photo-1611162617213-7d7a39e9b1d7?w=800&q=80',
    titleFR: 'Bannière de Lancement de Nouvelle Marque',
    titleEN: 'Futuristic Launch Ad Social Creative',
    author: '@creative_spark',
    tool: 'creatives'
  },
  // Session 7
  {
    url: 'https://images.unsplash.com/photo-1496345875659-11f7dd282d1d?w=800&q=80',
    titleFR: 'Vêtements de Lin pour Homme Portrait',
    titleEN: 'Pure Linen Men’s Dress Shirt Try-on',
    author: '@linens_men',
    tool: 'essayage'
  },
  {
    url: 'https://images.unsplash.com/photo-1513694203232-719a280e022f?w=800&q=80',
    titleFR: 'Séance Photo Objets Design & Céramique',
    titleEN: 'Minimal Ceramics Product Showcase',
    author: '@earth_objects',
    tool: 'photoshoot'
  },
  {
    url: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800&q=80',
    titleFR: 'Marketing Dashboard et Concepts Médias',
    titleEN: 'Interactive Marketing Presentation Board',
    author: '@media_pulse',
    tool: 'creatives'
  }
];

export const InspirationGallery: React.FC<InspirationGalleryProps> = ({ T, language }) => {
  const [activeCategory, setActiveCategory] = useState('all');
  const [likedItems, setLikedItems] = useState<Record<string, boolean>>({});

  const isFR = language === 'fr';

  // Compute how many items of the dynamic pool have been "released" today based on June 2, 2026.
  const computedList = useMemo(() => {
    const launchDate = new Date('2026-06-02T00:00:00Z');
    const today = new Date();
    // Calculate full days elapsed since June 2, 2026
    const diffMs = today.getTime() - launchDate.getTime();
    const daysPassed = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));

    const dailyAdditionRate = 3;
    // Guaranteed to display at least 9 dynamic items to start with, adding 3 more every subsequent day!
    const itemsToTakeCount = Math.min(DYNAMIC_POOL.length, (daysPassed + 3) * dailyAdditionRate);

    const activeDynamicList = DYNAMIC_POOL.slice(0, itemsToTakeCount).map((item, index) => {
      const releaseDayIndex = Math.floor(index / dailyAdditionRate);
      const daysAgo = daysPassed - releaseDayIndex;

      let dateLabel = '';
      if (daysAgo <= 0) {
        dateLabel = isFR ? 'À l’instant' : 'Just Now';
      } else if (daysAgo === 1) {
        dateLabel = isFR ? 'Rejoint aujourd’hui' : 'Added Today';
      } else if (daysAgo === 2) {
        dateLabel = isFR ? 'Hier' : 'Yesterday';
      } else {
        dateLabel = isFR ? `Il y a ${daysAgo - 1} j` : `${daysAgo - 1}d ago`;
      }

      return {
        id: `dynamic-${index}`,
        url: item.url,
        tool: item.tool,
        title: isFR ? item.titleFR : item.titleEN,
        author: item.author,
        dateTag: dateLabel,
        isNew: daysAgo <= 1,
      };
    });

    // Adapt base static assets to proper bilingual parameters and fields
    const formattedBaseList = BASE_CREATIVES.map((item) => ({
      id: item.id,
      url: item.url,
      tool: item.tool,
      title: isFR ? item.titleFR : item.titleEN,
      author: item.author,
      dateTag: isFR ? 'Sélectionné' : 'Featured',
      isNew: false,
    }));

    // Merge both lists: dynamic ones first to showcase fresh feed arrivals at the top!
    return [...activeDynamicList, ...formattedBaseList];
  }, [isFR]);

  const toggleLike = (id: string) => {
    setLikedItems(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  const filteredCreatives = useMemo(() => {
    if (activeCategory === 'all') return computedList;
    return computedList.filter(c => c.tool === activeCategory);
  }, [computedList, activeCategory]);

  return (
    <div className="animate-in fade-in duration-500 max-w-7xl mx-auto px-2">
      {/* Title & Concept descriptions */}
      <div className="text-center mb-12">
        <h1 className="text-3xl sm:text-5xl font-black text-brand-text uppercase tracking-tighter mb-4">
          {isFR ? 'Modèles et Créations Inspirantes' : 'Aesthetic Portfolios & Inspirations'}
        </h1>
        <p className="text-sm sm:text-base text-brand-text-secondary max-w-2xl mx-auto font-light leading-relaxed">
          {isFR 
            ? 'Explorez les créations générées automatiquement en temps réel par les studios de notre communauté. Ne contient aucun import brut utilisateur.' 
            : 'Explore real-time showcase models generated by our community’s AI studios. Contains only accomplished synthetic masterworks.'}
        </p>
      </div>

      {/* Category selector button grid */}
      <div className="flex flex-wrap justify-center gap-2 mb-10">
        {CATEGORIES(isFR).map(category => (
          <button
            key={category.id}
            id={`filter-${category.id}`}
            onClick={() => setActiveCategory(category.id)}
            className={`px-5 py-2.5 rounded-2xl text-xs sm:text-sm font-bold tracking-brand uppercase transition-all duration-300 ${
              activeCategory === category.id 
                ? 'bg-gradient-to-r from-brand-primary to-emerald-500 text-white shadow-lg shadow-brand-primary/25 scale-105 border-transparent' 
                : 'bg-brand-surface border border-brand-secondary/15 text-brand-text-secondary hover:text-brand-text hover:border-brand-primary/40'
            }`}
          >
            {category.label}
          </button>
        ))}
      </div>

      {/* Masonry Columns Feed */}
      <div className="columns-1 sm:columns-2 lg:columns-3 xl:columns-4 gap-6 space-y-6">
        {filteredCreatives.map((item) => {
          // Resolve tool badge strings
          let badgeLabel = '';
          let badgeColor = '';
          if (item.tool === 'essayage') {
            badgeLabel = isFR ? '👗 Essayeur IA' : '👗 Virtual Try-On';
            badgeColor = 'bg-emerald-500/10 text-emerald-400 border-emerald-500/15';
          } else if (item.tool === 'photoshoot') {
            badgeLabel = isFR ? '📸 Séance Photo' : '📸 Photoshoot';
            badgeColor = 'bg-blue-500/10 text-blue-400 border-blue-500/15';
          } else {
            badgeLabel = isFR ? '🎨 Studio Créatif' : '🎨 Branded Copy';
            badgeColor = 'bg-purple-500/10 text-purple-400 border-purple-500/15';
          }

          const hasLiked = likedItems[item.id];

          return (
            <div 
              key={item.id} 
              id={`gallery-item-${item.id}`}
              className="break-inside-avoid relative group rounded-[1.8rem] overflow-hidden shadow-lg border border-brand-secondary/15 bg-brand-surface/70 backdrop-blur-md hover:border-brand-primary/30 transition-all duration-300 hover:scale-[1.01]"
            >
              <img 
                src={item.url} 
                alt={item.title} 
                className="w-full h-auto object-cover transition-transform duration-[1.2s] group-hover:scale-105"
                loading="lazy"
                referrerPolicy="no-referrer"
              />

              {/* Top Row Badges */}
              <div className="absolute top-4 inset-x-4 flex justify-between items-start pointer-events-none">
                <span className={`text-[10px] font-black tracking-wider uppercase px-2.5 py-1 rounded-full border backdrop-blur-md ${badgeColor}`}>
                  {badgeLabel}
                </span>

                {item.isNew && (
                  <span className="bg-gradient-to-r from-red-500 to-orange-500 text-white text-[9px] font-black tracking-widest uppercase px-2 py-1 rounded-full animate-pulse shadow-md">
                    {isFR ? 'Nouveau' : 'New'}
                  </span>
                )}
              </div>

              {/* Hover Dark Vignette Gradation */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-black/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-5 select-none text-left">
                
                {/* Title */}
                <h3 className="text-white font-black text-base sm:text-lg leading-snug tracking-tight mb-1 uppercase">
                  {item.title}
                </h3>

                {/* Sub row */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex flex-col gap-0.5">
                    <span className="text-white/80 text-xs font-semibold tracking-wide">
                      {item.author}
                    </span>
                    <span className="text-brand-text-secondary/80 font-mono text-[9px] tracking-widest uppercase">
                      {item.dateTag}
                    </span>
                  </div>

                  <button 
                    id={`like-btn-${item.id}`}
                    onClick={() => toggleLike(item.id)}
                    className={`w-9 h-9 rounded-full backdrop-blur-md flex items-center justify-center transition-all duration-200 cursor-pointer ${
                      hasLiked 
                        ? 'bg-red-500 text-white scale-110 shadow-lg shadow-red-500/20' 
                        : 'bg-white/20 text-white hover:bg-brand-primary hover:scale-105'
                    }`}
                  >
                    <Icon name={hasLiked ? 'heart' : 'heart'} className={`w-4 h-4 ${hasLiked ? 'fill-current text-white' : ''}`} />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
      
      {filteredCreatives.length === 0 && (
        <div className="text-center py-24 text-brand-text-secondary">
          <Icon name="image" size={48} className="mx-auto mb-4 opacity-25 animate-bounce" />
          <p className="text-sm tracking-wide uppercase font-bold font-mono">
            {isFR ? 'Aucune création trouvée pour cette option.' : 'No designs corresponding to this choice.'}
          </p>
        </div>
      )}
    </div>
  );
};
