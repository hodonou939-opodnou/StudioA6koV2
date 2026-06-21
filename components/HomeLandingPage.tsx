import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Icon } from './Icon';

interface HomeLandingPageProps {
  onLaunchPhotoshoot: () => void;
  onLaunchCreatives: () => void;
  onLaunchEssayage?: () => void;
  T: any;
}

// Before/After demo pairs. SWAP these for your own real African before/after
// shots: set `before` to the raw input photo and `after` to the generated
// result. If only `after` is given, a "raw photo" look is simulated from it.
interface DemoPair {
  tag: string;
  beforeLabel: string;
  afterLabel: string;
  after: string;   // the polished / generated result
  before?: string;  // optional raw input; falls back to a filtered `after`
  cta: 'photoshoot' | 'essayage' | 'creatives';
}

// A draggable before/after image comparison that auto-sweeps to grab attention
// (the "GIF" effect) until the visitor takes over by dragging.
const BeforeAfterSlider: React.FC<{ pair: DemoPair; isFR: boolean }> = ({ pair, isFR }) => {
  const [pos, setPos] = useState(60);          // % revealed of the "after" image
  const [auto, setAuto] = useState(true);       // auto-sweeping until first touch
  const ref = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);
  const dir = useRef(-1);

  // Attention-grabbing auto-sweep (paused once the user interacts).
  useEffect(() => {
    if (!auto) return;
    const id = setInterval(() => {
      setPos((p) => {
        let next = p + dir.current * 0.8;
        if (next <= 32) { next = 32; dir.current = 1; }
        if (next >= 78) { next = 78; dir.current = -1; }
        return next;
      });
    }, 30);
    return () => clearInterval(id);
  }, [auto]);

  const moveTo = useCallback((clientX: number) => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const pct = ((clientX - rect.left) / rect.width) * 100;
    setPos(Math.max(0, Math.min(100, pct)));
  }, []);

  const onDown = (clientX: number) => { dragging.current = true; setAuto(false); moveTo(clientX); };
  const onMove = (clientX: number) => { if (dragging.current) moveTo(clientX); };
  const onUp = () => { dragging.current = false; };

  return (
    <div
      ref={ref}
      className="relative w-full aspect-[3/4] rounded-2xl overflow-hidden select-none cursor-ew-resize shadow-xl border border-brand-secondary/20 group"
      onMouseDown={(e) => onDown(e.clientX)}
      onMouseMove={(e) => onMove(e.clientX)}
      onMouseUp={onUp}
      onMouseLeave={onUp}
      onTouchStart={(e) => onDown(e.touches[0].clientX)}
      onTouchMove={(e) => onMove(e.touches[0].clientX)}
      onTouchEnd={onUp}
    >
      {/* AFTER (full, polished) — the base layer */}
      <img src={pair.after} alt={pair.afterLabel} className="absolute inset-0 w-full h-full object-cover pointer-events-none" />
      <span className="absolute top-3 right-3 z-20 bg-brand-primary text-white text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full shadow">
        {pair.afterLabel}
      </span>

      {/* BEFORE (raw) — clipped to the left of the handle */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none" style={{ width: `${pos}%` }}>
        <img
          src={pair.before || pair.after}
          alt={pair.beforeLabel}
          className="absolute inset-0 h-full object-cover"
          style={{
            width: ref.current ? `${ref.current.getBoundingClientRect().width}px` : '100%',
            filter: pair.before ? 'none' : 'grayscale(0.85) contrast(0.85) brightness(0.92) blur(0.4px)',
          }}
        />
        <span className="absolute top-3 left-3 bg-black/60 backdrop-blur text-white text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full">
          {pair.beforeLabel}
        </span>
      </div>

      {/* Handle */}
      <div className="absolute top-0 bottom-0 z-10 w-1 bg-white shadow-[0_0_8px_rgba(0,0,0,0.4)] pointer-events-none" style={{ left: `${pos}%` }}>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white shadow-lg flex items-center justify-center text-brand-text">
          <Icon name="arrow-right" size={12} className="-mr-0.5 rotate-180" />
          <Icon name="arrow-right" size={12} className="-ml-0.5" />
        </div>
      </div>

      <span className="absolute bottom-3 left-1/2 -translate-x-1/2 z-20 bg-black/55 backdrop-blur text-white text-[10px] font-semibold px-3 py-1 rounded-full opacity-90 group-hover:opacity-0 transition-opacity">
        {isFR ? '← Glissez pour comparer →' : '← Drag to compare →'}
      </span>
    </div>
  );
};

export const HomeLandingPage: React.FC<HomeLandingPageProps> = ({ onLaunchPhotoshoot, onLaunchCreatives, onLaunchEssayage, T }) => {
  const [activeCreativeTab, setActiveCreativeTab] = useState(0);
  const isFR = T.language === 'fr';

  // Demo before/after pairs (swap the URLs for your real African shots).
  const demoPairs: DemoPair[] = [
    {
      tag: isFR ? 'Essayage Virtuel' : 'Virtual Try-On',
      beforeLabel: isFR ? 'Photo simple' : 'Plain photo',
      afterLabel: isFR ? 'Essayé' : 'Tried on',
      after: 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=700&q=80',
      cta: 'essayage',
    },
    {
      tag: isFR ? 'Séance Photo IA' : 'AI Photoshoot',
      beforeLabel: isFR ? 'Brut' : 'Raw',
      afterLabel: isFR ? 'Studio' : 'Studio',
      after: 'https://images.unsplash.com/photo-1529139574466-a303027c1d8b?w=700&q=80',
      cta: 'photoshoot',
    },
    {
      tag: isFR ? 'Visuel Publicitaire' : 'Ad Creative',
      beforeLabel: isFR ? 'Idée' : 'Idea',
      afterLabel: isFR ? 'Campagne' : 'Campaign',
      after: 'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=700&q=80',
      cta: 'creatives',
    },
  ];
  const launchFor = (cta: DemoPair['cta']) =>
    cta === 'creatives' ? onLaunchCreatives : cta === 'essayage' ? (onLaunchEssayage || onLaunchPhotoshoot) : onLaunchPhotoshoot;

  const creativeTabs = [
    { title: T.homeTab1Title, desc: T.homeTab1Desc, icon: 'layers' as const },
    { title: T.homeTab2Title, desc: T.homeTab2Desc, icon: 'globe' as const },
    { title: T.homeTab3Title, desc: T.homeTab3Desc, icon: 'zap' as const }
  ];

  return (
    <div className="animate-in fade-in duration-700 flex flex-col items-center pt-6 md:pt-10 pb-24 md:pb-32 space-y-20 md:space-y-32 overflow-x-hidden w-full">
      
      {/* 1. Hero Section & Main Hub */}
      <div className="w-full max-w-6xl mx-auto relative">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-brand-primary/20 rounded-full blur-[120px] -z-10 pointer-events-none"></div>
        
        <div className="text-center mb-20">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-brand-surface border border-brand-secondary/20 text-brand-text-secondary text-sm font-medium mb-8 shadow-sm">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand-primary opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-brand-primary"></span>
            </span>
            {T.homeLiveBadge}
          </div>

          <h1 className="text-5xl sm:text-6xl md:text-8xl font-black text-brand-text tracking-tighter uppercase leading-[0.9] mb-6 md:mb-8">
            {T.homeHeroTitle1} <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-primary via-purple-500 to-pink-500">
              {T.homeHeroTitle2}
            </span>
          </h1>
          
          <p className="text-lg sm:text-xl md:text-2xl text-brand-text-secondary max-w-2xl mx-auto font-light leading-relaxed">
            {T.homeHeroSubtitle}
          </p>

          {/* Above-the-fold CTAs */}
          <div className="mt-8 md:mt-10 flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              onClick={onLaunchPhotoshoot}
              className="group w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-brand-text text-brand-surface px-8 py-4 rounded-full font-bold uppercase tracking-widest text-sm hover:bg-brand-primary transition-colors shadow-xl shadow-brand-primary/10"
            >
              <Icon name="camera" size={18} />
              {isFR ? 'Lancer un photoshoot' : 'Start a photoshoot'}
            </button>
            <button
              onClick={() => (onLaunchEssayage || onLaunchPhotoshoot)()}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-transparent border border-brand-secondary/30 text-brand-text px-8 py-4 rounded-full font-bold uppercase tracking-widest text-sm hover:bg-brand-secondary/10 transition-colors"
            >
              <Icon name="sparkles" size={18} />
              {isFR ? 'Essayage virtuel' : 'Virtual try-on'}
            </button>
          </div>
        </div>

        {/* Interactive Hub / Bento Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full">
          {/* Photoshoot Studio Card */}
          <div className="group relative bg-brand-surface border border-brand-secondary/20 rounded-[2rem] md:rounded-[2.5rem] p-6 sm:p-8 md:p-12 overflow-hidden hover:border-brand-primary/50 transition-all duration-500 hover:shadow-2xl hover:shadow-brand-primary/10 flex flex-col justify-between min-h-[350px] md:min-h-[400px]">
            <div className="absolute top-0 right-0 w-48 md:w-64 h-48 md:h-64 bg-gradient-to-br from-brand-primary/10 to-transparent rounded-full blur-3xl -mr-10 md:-mr-20 -mt-10 md:-mt-20 transition-transform group-hover:scale-150 duration-700"></div>
            
            <div className="relative z-10">
              <div className="w-14 h-14 md:w-16 md:h-16 bg-brand-bg rounded-2xl flex items-center justify-center mb-6 md:mb-8 shadow-inner border border-brand-secondary/10 text-brand-primary group-hover:scale-110 transition-transform duration-500">
                <Icon name="camera" className="w-6 h-6 md:w-8 md:h-8" />
              </div>
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-brand-text mb-3 md:mb-4 tracking-tight">{T.homePhotoshootTitle}</h2>
              <p className="text-base md:text-lg text-brand-text-secondary mb-6 md:mb-8 leading-relaxed max-w-md">
                {T.homePhotoshootDesc}
              </p>
            </div>

            <div className="relative z-10 mt-auto">
              <button 
                onClick={onLaunchPhotoshoot}
                className="inline-flex items-center gap-2 md:gap-3 bg-brand-text text-brand-surface px-6 md:px-8 py-3 md:py-4 rounded-full font-bold uppercase tracking-widest hover:bg-brand-primary transition-colors duration-300 w-full md:w-auto justify-center text-sm md:text-base"
              >
                {T.launchStudio}
                <Icon name="arrow-right" className="w-4 h-4 md:w-5 md:h-5 group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
          </div>

          {/* Creatives Studio Card */}
          <div className="group relative bg-brand-surface border border-brand-secondary/20 rounded-[2rem] md:rounded-[2.5rem] p-6 sm:p-8 md:p-12 overflow-hidden hover:border-purple-500/50 transition-all duration-500 hover:shadow-2xl hover:shadow-purple-500/10 flex flex-col justify-between min-h-[350px] md:min-h-[400px]">
            <div className="absolute top-0 right-0 w-48 md:w-64 h-48 md:h-64 bg-gradient-to-br from-purple-500/10 to-transparent rounded-full blur-3xl -mr-10 md:-mr-20 -mt-10 md:-mt-20 transition-transform group-hover:scale-150 duration-700"></div>
            
            <div className="relative z-10">
              <div className="w-14 h-14 md:w-16 md:h-16 bg-brand-bg rounded-2xl flex items-center justify-center mb-6 md:mb-8 shadow-inner border border-brand-secondary/10 text-purple-500 group-hover:scale-110 transition-transform duration-500">
                <Icon name="pen-tool" className="w-6 h-6 md:w-8 md:h-8" />
              </div>
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-brand-text mb-3 md:mb-4 tracking-tight">{T.homeCreativesTitle}</h2>
              <p className="text-base md:text-lg text-brand-text-secondary mb-6 md:mb-8 leading-relaxed max-w-md">
                {T.homeCreativesDesc}
              </p>
            </div>

            <div className="relative z-10 mt-auto">
              <button 
                onClick={onLaunchCreatives}
                className="inline-flex items-center gap-2 md:gap-3 bg-brand-text text-brand-surface px-6 md:px-8 py-3 md:py-4 rounded-full font-bold uppercase tracking-widest hover:bg-purple-600 transition-colors duration-300 w-full md:w-auto justify-center text-sm md:text-base"
              >
                {T.launchStudio}
                <Icon name="arrow-right" className="w-4 h-4 md:w-5 md:h-5 group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 1.5 Before / After live demos — drag to compare, auto-animated */}
      <div className="w-full max-w-6xl mx-auto">
        <div className="text-center mb-10 md:mb-14">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-brand-primary/10 text-brand-primary text-xs md:text-sm font-bold uppercase tracking-wider mb-5">
            <Icon name="sparkles" size={14} className="md:w-4 md:h-4" /> {isFR ? 'Avant / Après' : 'Before / After'}
          </div>
          <h2 className="text-3xl md:text-5xl font-bold text-brand-text mb-4 tracking-tight">
            {isFR ? 'Voyez la transformation' : 'See the transformation'}
          </h2>
          <p className="text-brand-text-secondary text-base md:text-lg max-w-2xl mx-auto font-light">
            {isFR
              ? 'Glissez le curseur sur chaque image pour révéler ce que Studio A6ko crée — en quelques secondes.'
              : 'Drag the slider on each image to reveal what Studio A6ko creates — in seconds.'}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
          {demoPairs.map((pair, i) => (
            <div key={i} className="flex flex-col gap-4">
              <BeforeAfterSlider pair={pair} isFR={isFR} />
              <div className="text-center px-2">
                <h3 className="text-lg font-bold text-brand-text">{pair.tag}</h3>
                <button
                  onClick={launchFor(pair.cta)}
                  className="mt-3 inline-flex items-center gap-2 bg-brand-text text-brand-surface px-5 py-2.5 rounded-full font-bold uppercase tracking-widest text-xs hover:bg-brand-primary transition-colors"
                >
                  {isFR ? 'Essayer maintenant' : 'Try it now'}
                  <Icon name="arrow-right" size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 2. Value Proposition Section */}
      <div className="w-full max-w-6xl mx-auto">
        <div className="text-center mb-10 md:mb-16">
          <h2 className="text-3xl md:text-5xl font-bold text-brand-text mb-4 md:mb-6 tracking-tight">{T.homeWhyChooseTitle}</h2>
          <p className="text-brand-text-secondary text-base md:text-lg max-w-2xl mx-auto font-light">
            {T.homeWhyChooseSubtitle}
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
          <div className="bg-brand-surface p-6 md:p-8 rounded-3xl border border-brand-secondary/10 hover:border-brand-primary/30 transition-colors">
            <div className="w-10 h-10 md:w-12 md:h-12 bg-brand-primary/10 rounded-full flex items-center justify-center text-brand-primary mb-4 md:mb-6">
              <Icon name="zap" size={20} className="md:w-6 md:h-6" />
            </div>
            <h3 className="text-lg md:text-xl font-bold text-brand-text mb-2 md:mb-3">{T.homeFeature1Title}</h3>
            <p className="text-sm md:text-base text-brand-text-secondary leading-relaxed">
              {T.homeFeature1Desc}
            </p>
          </div>
          <div className="bg-brand-surface p-6 md:p-8 rounded-3xl border border-brand-secondary/10 hover:border-green-500/30 transition-colors">
            <div className="w-10 h-10 md:w-12 md:h-12 bg-green-500/10 rounded-full flex items-center justify-center text-green-500 mb-4 md:mb-6">
              <Icon name="dollar-sign" size={20} className="md:w-6 md:h-6" />
            </div>
            <h3 className="text-lg md:text-xl font-bold text-brand-text mb-2 md:mb-3">{T.homeFeature2Title}</h3>
            <p className="text-sm md:text-base text-brand-text-secondary leading-relaxed">
              {T.homeFeature2Desc}
            </p>
          </div>
          <div className="bg-brand-surface p-6 md:p-8 rounded-3xl border border-brand-secondary/10 hover:border-blue-500/30 transition-colors">
            <div className="w-10 h-10 md:w-12 md:h-12 bg-blue-500/10 rounded-full flex items-center justify-center text-blue-500 mb-4 md:mb-6">
              <Icon name="globe" size={20} className="md:w-6 md:h-6" />
            </div>
            <h3 className="text-lg md:text-xl font-bold text-brand-text mb-2 md:mb-3">{T.homeFeature3Title}</h3>
            <p className="text-sm md:text-base text-brand-text-secondary leading-relaxed">
              {T.homeFeature3Desc}
            </p>
          </div>
        </div>
      </div>

      {/* 3. Deep Dive: Photoshoot Studio */}
      <div className="w-full max-w-6xl mx-auto">
        <div className="flex flex-col lg:flex-row gap-10 md:gap-16 items-center">
          <div className="flex-1 space-y-6 md:space-y-8">
            <div className="inline-flex items-center gap-2 px-3 md:px-4 py-1.5 rounded-full bg-brand-primary/10 text-brand-primary text-xs md:text-sm font-bold uppercase tracking-wider">
              <Icon name="camera" size={14} className="md:w-4 md:h-4" /> {T.homeDeepDivePhotoshootTag}
            </div>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-brand-text leading-tight tracking-tight">
              {T.homeDeepDivePhotoshootTitle1} <br/>
              <span className="text-brand-primary">{T.homeDeepDivePhotoshootTitle2}</span>.
            </h2>
            <p className="text-base md:text-lg text-brand-text-secondary font-light leading-relaxed">
              {T.homeDeepDivePhotoshootDesc}
            </p>
            
            <ul className="space-y-3 md:space-y-4">
              {[T.homeDeepDivePhotoshootList1, T.homeDeepDivePhotoshootList2, T.homeDeepDivePhotoshootList3, T.homeDeepDivePhotoshootList4].map((item, i) => (
                <li key={i} className="flex items-start gap-3 text-sm md:text-base text-brand-text-secondary">
                  <div className="mt-1 w-4 h-4 md:w-5 md:h-5 rounded-full bg-brand-primary/20 flex items-center justify-center text-brand-primary shrink-0">
                    <Icon name="check" size={10} className="md:w-3 md:h-3" />
                  </div>
                  <span>{item}</span>
                </li>
              ))}
            </ul>

            <button 
              onClick={onLaunchPhotoshoot}
              className="mt-2 md:mt-4 inline-flex items-center gap-2 text-brand-primary font-bold hover:gap-4 transition-all text-sm md:text-base"
            >
              {T.homeDeepDivePhotoshootCTA} <Icon name="arrow-right" size={16} className="md:w-5 md:h-5" />
            </button>
          </div>
          
          <div className="flex-1 w-full relative mt-8 lg:mt-0">
            {/* Mock UI / Visual Representation */}
            <div className="bg-brand-surface border border-brand-secondary/20 rounded-2xl md:rounded-3xl p-3 md:p-4 shadow-2xl relative z-10">
              <div className="flex gap-2 mb-3 md:mb-4 border-b border-brand-secondary/10 pb-3 md:pb-4">
                <div className="w-2.5 h-2.5 md:w-3 md:h-3 rounded-full bg-red-500/50"></div>
                <div className="w-2.5 h-2.5 md:w-3 md:h-3 rounded-full bg-yellow-500/50"></div>
                <div className="w-2.5 h-2.5 md:w-3 md:h-3 rounded-full bg-green-500/50"></div>
              </div>
              <div className="grid grid-cols-2 gap-3 md:gap-4">
                <div className="aspect-[3/4] bg-brand-bg rounded-lg md:rounded-xl overflow-hidden relative group">
                  <img src="https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=500&q=80" alt="Fashion Model" className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" />
                  <div className="absolute bottom-2 left-2 bg-black/50 backdrop-blur text-white text-[8px] md:text-[10px] px-1.5 md:px-2 py-0.5 md:py-1 rounded">Studio Lighting</div>
                </div>
                <div className="aspect-[3/4] bg-brand-bg rounded-lg md:rounded-xl overflow-hidden relative group">
                  <img src="https://images.unsplash.com/photo-1529139574466-a303027c1d8b?w=500&q=80" alt="Fashion Model" className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" />
                  <div className="absolute bottom-2 left-2 bg-black/50 backdrop-blur text-white text-[8px] md:text-[10px] px-1.5 md:px-2 py-0.5 md:py-1 rounded">Urban Setting</div>
                </div>
              </div>
            </div>
            {/* Decorative blur */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[120%] h-[120%] bg-brand-primary/20 rounded-full blur-[60px] md:blur-[80px] -z-10"></div>
          </div>
        </div>
      </div>

      {/* 4. Deep Dive: Ad Creative Studio */}
      <div className="w-full max-w-6xl mx-auto">
        <div className="flex flex-col lg:flex-row-reverse gap-10 md:gap-16 items-center">
          <div className="flex-1 space-y-6 md:space-y-8">
            <div className="inline-flex items-center gap-2 px-3 md:px-4 py-1.5 rounded-full bg-purple-500/10 text-purple-500 text-xs md:text-sm font-bold uppercase tracking-wider">
              <Icon name="pen-tool" size={14} className="md:w-4 md:h-4" /> {T.homeDeepDiveCreativesTag}
            </div>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-brand-text leading-tight tracking-tight">
              {T.homeDeepDiveCreativesTitle1} <br/>
              <span className="text-purple-500">{T.homeDeepDiveCreativesTitle2}</span>.
            </h2>
            <p className="text-base md:text-lg text-brand-text-secondary font-light leading-relaxed">
              {T.homeDeepDiveCreativesDesc}
            </p>
            
            {/* Interactive Tabs */}
            <div className="flex flex-col gap-2 md:gap-3 mt-4 md:mt-6">
              {creativeTabs.map((tab, idx) => (
                <div 
                  key={idx}
                  className={`p-3 md:p-4 rounded-xl md:rounded-2xl border cursor-pointer transition-all duration-300 ${activeCreativeTab === idx ? 'bg-brand-surface border-purple-500/50 shadow-md' : 'border-brand-secondary/10 hover:border-brand-secondary/30'}`}
                  onClick={() => setActiveCreativeTab(idx)}
                >
                  <div className="flex items-center gap-3 md:gap-4">
                    <div className={`w-8 h-8 md:w-10 md:h-10 rounded-full flex items-center justify-center shrink-0 ${activeCreativeTab === idx ? 'bg-purple-500/20 text-purple-500' : 'bg-brand-bg text-brand-text-secondary'}`}>
                      <Icon name={tab.icon} size={16} className="md:w-5 md:h-5" />
                    </div>
                    <div>
                      <h4 className={`font-bold text-sm md:text-base ${activeCreativeTab === idx ? 'text-brand-text' : 'text-brand-text-secondary'}`}>{tab.title}</h4>
                      <p className="text-xs md:text-sm text-brand-text-secondary/80 line-clamp-2 md:line-clamp-none">{tab.desc}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <button 
              onClick={onLaunchCreatives}
              className="mt-2 md:mt-4 inline-flex items-center gap-2 text-purple-500 font-bold hover:gap-4 transition-all text-sm md:text-base"
            >
              {T.homeDeepDiveCreativesCTA} <Icon name="arrow-right" size={16} className="md:w-5 md:h-5" />
            </button>
          </div>
          
          <div className="flex-1 w-full relative mt-8 lg:mt-0">
            <div className="bg-brand-surface border border-brand-secondary/20 rounded-2xl md:rounded-3xl p-4 md:p-6 shadow-2xl relative z-10 min-h-[300px] md:min-h-[400px] flex items-center justify-center">
              {/* Dynamic visual based on active tab */}
              {activeCreativeTab === 0 && (
                <div className="text-center animate-in fade-in zoom-in duration-500">
                  <div className="w-24 h-24 md:w-32 md:h-32 mx-auto bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl md:rounded-3xl flex items-center justify-center text-white mb-4 md:mb-6 shadow-xl shadow-purple-500/20">
                    <Icon name="layers" size={36} className="md:w-12 md:h-12" />
                  </div>
                  <h3 className="text-lg md:text-xl font-bold text-brand-text">{T.homeTab1Title}</h3>
                  <p className="text-brand-text-secondary text-xs md:text-sm mt-1 md:mt-2">{T.homeTab1Desc}</p>
                </div>
              )}
              {activeCreativeTab === 1 && (
                <div className="text-center animate-in fade-in zoom-in duration-500 w-full">
                  <div className="w-full max-w-[240px] md:max-w-xs mx-auto bg-brand-bg border border-brand-secondary/20 rounded-xl overflow-hidden shadow-xl">
                    <div className="h-24 md:h-40 bg-gradient-to-r from-blue-500 to-purple-500"></div>
                    <div className="p-3 md:p-4 text-left">
                      <div className="w-3/4 h-3 md:h-4 bg-brand-surface rounded mb-2"></div>
                      <div className="w-1/2 h-2 md:h-3 bg-brand-surface rounded mb-3 md:mb-4"></div>
                      <div className="w-full h-8 md:h-10 bg-brand-primary/20 rounded-lg flex items-center justify-center text-brand-primary text-[10px] md:text-xs font-bold">Shop Now</div>
                    </div>
                  </div>
                </div>
              )}
              {activeCreativeTab === 2 && (
                <div className="text-center animate-in fade-in zoom-in duration-500 w-full">
                  <div className="grid grid-cols-2 gap-2 md:gap-4 w-full max-w-[240px] md:max-w-xs mx-auto">
                    <div className="aspect-video bg-brand-bg rounded-lg border border-brand-secondary/20 flex items-center justify-center"><Icon name="image" className="text-brand-secondary w-4 h-4 md:w-6 md:h-6" /></div>
                    <div className="aspect-video bg-brand-bg rounded-lg border border-brand-secondary/20 flex items-center justify-center"><Icon name="image" className="text-brand-secondary w-4 h-4 md:w-6 md:h-6" /></div>
                    <div className="aspect-video bg-brand-bg rounded-lg border border-brand-secondary/20 flex items-center justify-center"><Icon name="image" className="text-brand-secondary w-4 h-4 md:w-6 md:h-6" /></div>
                    <div className="aspect-video bg-brand-bg rounded-lg border border-brand-secondary/20 flex items-center justify-center"><Icon name="image" className="text-brand-secondary w-4 h-4 md:w-6 md:h-6" /></div>
                  </div>
                  <p className="text-brand-text-secondary text-xs md:text-sm mt-4 md:mt-6">{T.homeTab3Title}</p>
                </div>
              )}
            </div>
            {/* Decorative blur */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[120%] h-[120%] bg-purple-500/20 rounded-full blur-[60px] md:blur-[80px] -z-10"></div>
          </div>
        </div>
      </div>

      {/* 5. Final CTA */}
      <div className="w-full max-w-5xl mx-auto">
        <div className="bg-brand-surface border border-brand-secondary/20 rounded-[2rem] md:rounded-[3rem] p-8 sm:p-12 md:p-20 relative overflow-hidden text-center">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full bg-gradient-to-b from-brand-primary/10 to-transparent -z-10"></div>
          
          <h2 className="text-3xl sm:text-4xl md:text-6xl font-black text-brand-text tracking-tight mb-4 md:mb-6">
            {T.homeFinalCTATitle}
          </h2>
          <p className="text-base sm:text-lg md:text-xl text-brand-text-secondary font-light max-w-2xl mx-auto mb-8 md:mb-10">
            {T.homeFinalCTASubtitle}
          </p>
          
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 md:gap-4">
            <button 
              onClick={onLaunchPhotoshoot}
              className="px-6 md:px-8 py-3 md:py-4 bg-brand-text text-brand-surface rounded-full font-bold uppercase tracking-widest hover:bg-brand-primary transition-colors w-full sm:w-auto text-sm md:text-base"
            >
              {T.homeFinalCTAPhotoshoot}
            </button>
            <button 
              onClick={onLaunchCreatives}
              className="px-6 md:px-8 py-3 md:py-4 bg-transparent border border-brand-secondary/30 text-brand-text rounded-full font-bold uppercase tracking-widest hover:bg-brand-secondary/10 transition-colors w-full sm:w-auto text-sm md:text-base"
            >
              {T.homeFinalCTACreatives}
            </button>
          </div>
        </div>
      </div>

    </div>
  );
};
