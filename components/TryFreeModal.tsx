import React from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Icon } from './Icon';

interface TryFreeModalProps {
  isOpen: boolean;
  onClose: () => void;
  language: 'en' | 'fr';
  onSelectOption: (choice: 'essayage' | 'photoshoot' | 'creatives') => void;
}

export const TryFreeModal: React.FC<TryFreeModalProps> = ({
  isOpen,
  onClose,
  language,
  onSelectOption,
}) => {
  if (!isOpen) return null;

  const isFR = language === 'fr';

  const title = isFR ? 'Découvrez le Studio gratuitement' : 'Experience the Studio for Free';
  const subtitle = isFR 
    ? 'Choisissez l’outil à essayer dès maintenant sans carte de crédit' 
    : 'Select a tool to explore immediately. No credit card required';

  const options = [
    {
      id: 'try-essayage-btn',
      key: 'essayage' as const,
      title: isFR ? 'Essayage Virtuel AI' : 'AI Virtual Try-On',
      desc: isFR 
        ? 'Essayez instantanément des vêtements à partir de vos photos.' 
        : 'Instantly visualize and try on outfits using your uploaded photos.',
      badge: isFR ? '3 Crédits Offerts' : '3 Free Credits',
      icon: 'zap' as const,
      color: 'from-green-500/10 to-emerald-500/5 hover:border-emerald-500/40 text-emerald-400 border-emerald-500/15',
      iconBg: 'bg-emerald-500/10 text-emerald-400'
    },
    {
      id: 'try-photoshoot-btn',
      key: 'photoshoot' as const,
      title: isFR ? 'Séance Photo en Ligne' : 'Online Photoshoot',
      desc: isFR 
        ? 'Créez un shooting professionnel avec mannequins et décors IA.' 
        : 'Generate high-end catalog photoshoots with custom models and scenery.',
      badge: isFR ? '3 Crédits Offerts' : '3 Free Credits',
      icon: 'camera' as const,
      color: 'from-blue-500/10 to-indigo-500/5 hover:border-blue-500/40 text-blue-400 border-blue-500/15',
      iconBg: 'bg-blue-500/10 text-blue-400'
    },
    {
      id: 'try-creatives-btn',
      key: 'creatives' as const,
      title: isFR ? 'Studio Créatif IA' : 'AI Creative Studio',
      desc: isFR 
        ? 'Générez des idées, accroches et scripts marketing pour vos réseaux.' 
        : 'Generate copy, hook suggestions, and ad scripts for your brand.',
      badge: isFR ? 'Gratuit / Bientôt' : 'Free / Coming Soon',
      icon: 'pen-tool' as const,
      color: 'from-purple-500/10 to-fuchsia-500/5 hover:border-purple-500/40 text-purple-400 border-purple-500/15',
      iconBg: 'bg-purple-500/10 text-purple-400'
    }
  ];

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop overlay */}
        <motion.div
          id="try-free-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/85 backdrop-blur-md cursor-pointer"
        />

        {/* Modal Window Container */}
        <motion.div
          id="try-free-window"
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
          className="relative bg-brand-bg border border-brand-secondary/30 rounded-[2.5rem] p-6 sm:p-10 w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col gap-6 md:gap-8 active:scale-100"
        >
          {/* Futuristic ambient vector glow in background */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-80 h-80 bg-brand-primary/10 rounded-full blur-[100px] pointer-events-none -z-10" />

          {/* Close Button */}
          <button
            id="try-free-close-btn"
            onClick={onClose}
            className="absolute top-5 right-5 w-10 h-10 rounded-full bg-brand-surface border border-brand-secondary/20 hover:border-brand-primary/40 flex items-center justify-center transition-colors text-brand-text-secondary hover:text-brand-text cursor-pointer"
          >
            <Icon name="x" size={18} />
          </button>

          {/* Title & Description */}
          <div className="text-center space-y-2 mt-4">
            <h2 className="text-2xl sm:text-4xl font-black tracking-tight text-brand-text uppercase">
              {title}
            </h2>
            <p className="text-sm sm:text-base text-brand-text-secondary font-light max-w-lg mx-auto">
              {subtitle}
            </p>
          </div>

          {/* Selection List */}
          <div className="flex flex-col gap-3.5 sm:gap-4">
            {options.map((opt) => (
              <button
                key={opt.key}
                id={opt.id}
                onClick={() => {
                  onSelectOption(opt.key);
                  onClose();
                }}
                className={`group relative text-left w-full flex flex-row items-center gap-4 sm:gap-6 p-4 sm:p-5 rounded-2xl bg-gradient-to-br ${opt.color} border transition-all duration-300 hover:scale-[1.01] active:scale-[0.99] hover:shadow-lg cursor-pointer`}
              >
                {/* Floating shine accent */}
                <div className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

                {/* Rounded Icon badge wrapper */}
                <div className={`w-12 h-12 sm:w-14 sm:h-14 rounded-2xl ${opt.iconBg} flex items-center justify-center shrink-0 shadow-inner group-hover:scale-110 transition-transform duration-300`}>
                  <Icon name={opt.icon} className="w-5 h-5 sm:w-6 sm:h-6" />
                </div>

                {/* Selection details */}
                <div className="flex-1 min-w-0 pr-4">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <h3 className="font-bold text-base sm:text-lg text-brand-text group-hover:text-brand-primary transition-colors">
                      {opt.title}
                    </h3>
                    <span className="text-[9px] font-black tracking-wider uppercase px-2 py-0.5 rounded-full bg-brand-surface/80 border border-brand-secondary/10 font-mono text-brand-text-secondary">
                      {opt.badge}
                    </span>
                  </div>
                  <p className="text-xs sm:text-sm text-brand-text-secondary font-light leading-relaxed">
                    {opt.desc}
                  </p>
                </div>

                {/* Interactive chevron accent */}
                <div className="shrink-0 text-brand-text-secondary/50 group-hover:text-brand-primary group-hover:translate-x-1.5 transition-all">
                  <Icon name="arrow-right" size={20} />
                </div>
              </button>
            ))}
          </div>

          {/* Footer promise branding */}
          <div className="border-t border-brand-secondary/10 pt-4 text-center select-none text-[11px] text-brand-text-secondary font-light">
            {isFR 
              ? '🔒 Vos 3 crédits de bienvenue sont valables immédiatement à l’inscription' 
              : '🔒 Your 3 welcome credits are available and ready to use immediately upon signup'}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
