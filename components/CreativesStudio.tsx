import React from 'react';
import { Icon } from './Icon';
import type { UserState } from '../types';

interface CreativesStudioProps {
    userState: UserState | null;
    setUserState: React.Dispatch<React.SetStateAction<UserState | null>>;
    language: 'en' | 'fr';
    setLanguage: (lang: 'en' | 'fr') => void;
    onClose?: () => void;
}

export const CreativesStudio: React.FC<CreativesStudioProps> = ({ 
    userState, 
    setUserState,
    language,
    setLanguage,
    onClose
}) => {
  const isFR = language === 'fr';

  const title = isFR ? 'Studio Créatif' : 'Creative Studio';
  const badgeText = isFR ? 'Bientôt Disponible' : 'Coming Soon';
  const mainDesc = isFR 
    ? 'Une suite d’outils marketing et de création publicitaire propulsée par l’intelligence artificielle pour booster vos ventes et professionnaliser votre image de marque.' 
    : 'An AI-powered creative and content marketing suite designed to elevate your brand presence and launch high-converting advertising campaigns.';

  const features = isFR ? [
    {
      icon: 'sparkles' as const,
      title: 'Scénarios Publicitaires IA',
      desc: 'Générez instantanément des scripts vidéos captivants et structurés pour accrocher vos futurs clients dès les premières secondes.',
    },
    {
      icon: 'pen-tool' as const,
      title: 'Création d’Identité de Marque',
      desc: 'Définissez la voix de votre marque, votre audience cible et vos propositions de valeur uniques adaptées au commerce local ou en ligne.',
    },
    {
      icon: 'layers' as const,
      title: 'Visuels Multi-Plateformes',
      desc: 'Adaptez automatiquement vos formats créatifs pour Instagram, Facebook, TikTok, le web et le format d’impression, en quelques clics.',
    },
    {
      icon: 'wand' as const,
      title: 'Rendus Artistiques Studio',
      desc: 'Prenez le contrôle total de la caméra, des éclairages (naturel, studio, néon) et des décors pour des résultats ultra-réalistes.',
    }
  ] : [
    {
      icon: 'sparkles' as const,
      title: 'AI Ad Scriptwriter',
      desc: 'Instantly write engaging and high-converting video script outlines designed to catch your audience’s attention from the very first seconds.',
    },
    {
      icon: 'pen-tool' as const,
      title: 'Brand DNA Builder',
      desc: 'Outline your core brand voice, identify specific target audiences, and design solid marketing hooks tailored to your business vertical.',
    },
    {
      icon: 'layers' as const,
      title: 'Multi-Platform Master',
      desc: 'Format visual copy and promotional layouts for multiple placements like Instagram feed, story, TikTok video, and web advertisements.',
    },
    {
      icon: 'wand' as const,
      title: 'Studio Lighting & Style Control',
      desc: 'Fine-tune professional camera positioning, studio lighting configurations, and compositions to showcase your product in spectacular fashion.',
    }
  ];

  return (
    <div className="bg-brand-bg text-brand-text font-sans selection:bg-brand-primary/30 h-full flex-1 flex flex-col justify-center items-center py-10 px-4">
      <div className="max-w-4xl w-full text-center space-y-12 animate-in fade-in duration-700">
        
        {/* Main Heading & Badge */}
        <div className="space-y-6">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-brand-primary/10 border border-brand-primary/30 text-brand-primary text-xs sm:text-sm font-bold tracking-widest uppercase animate-pulse">
            <span className="w-2 h-2 rounded-full bg-brand-primary shadow-[0_0_8px_var(--color-brand-primary)]"></span>
            {badgeText}
          </div>
          
          <h1 className="text-4xl md:text-6xl font-black tracking-tighter uppercase text-brand-text">
            {title}
          </h1>
          
          <p className="text-lg md:text-xl text-brand-text-secondary max-w-2xl mx-auto leading-relaxed font-light">
            {mainDesc}
          </p>
        </div>

        {/* Feature Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-left pt-6">
          {features.map((feature, idx) => (
            <div 
              key={idx} 
              className="p-6 bg-brand-surface/50 border border-brand-secondary/15 rounded-2xl shadow-xl hover:border-brand-primary/30 hover:bg-brand-surface/80 transition-all duration-300 backdrop-blur-sm group"
            >
              <div className="w-12 h-12 rounded-xl bg-brand-primary/10 border border-brand-primary/20 flex items-center justify-center mb-4 text-brand-primary group-hover:scale-110 transition-transform">
                <Icon name={feature.icon} size={22} />
              </div>
              <h3 className="text-lg font-bold text-brand-text mb-2 tracking-tight">
                {feature.title}
              </h3>
              <p className="text-sm text-brand-text-secondary leading-relaxed font-light">
                {feature.desc}
              </p>
            </div>
          ))}
        </div>

        {/* Support Message or Callout */}
        <div className="pt-8 border-t border-brand-secondary/10">
          <div className="relative overflow-hidden p-6 sm:p-8 rounded-3xl bg-gradient-to-br from-brand-primary/15 via-brand-surface/90 to-emerald-500/10 border-2 border-brand-primary/30 shadow-2xl backdrop-blur-md flex flex-col md:flex-row items-center justify-between gap-6 text-center md:text-left transition-all duration-300 hover:border-brand-primary/50">
            {/* Ambient Background Glows */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-brand-primary/10 rounded-full blur-3xl -z-10 animate-pulse"></div>
            <div className="absolute bottom-0 left-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-3xl -z-10"></div>
            
            <div className="space-y-2">
              <div className="flex items-center justify-center md:justify-start gap-2.5">
                <span className="relative flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                </span>
                <span className="text-xs sm:text-sm font-black tracking-widest text-emerald-400 uppercase font-mono animate-pulse">
                  {isFR ? 'En développement actif' : 'Active development'}
                </span>
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-brand-text uppercase tracking-tight leading-snug">
                {isFR 
                  ? 'Préparez vos visuels, le lancement est imminent.' 
                  : 'Prepare your visual assets, the launch is imminent.'}
              </h2>
              <p className="text-xs sm:text-sm text-brand-text-secondary leading-relaxed font-light">
                {isFR 
                  ? 'Nos serveurs se préparent à générer vos futures maquettes de haute qualité en quelques secondes.' 
                  : 'Our smart layout synthesis engine is preparing to compile your high-fidelity promotional media.'}
              </p>
            </div>

            <div className="shrink-0 flex gap-3">
              <div className="px-5 py-3 rounded-xl bg-brand-primary/10 border border-brand-primary/20 text-brand-primary text-xs sm:text-sm font-bold tracking-widest uppercase font-mono">
                🚀 {isFR ? 'Bientôt disponible' : 'Coming soon'}
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};
