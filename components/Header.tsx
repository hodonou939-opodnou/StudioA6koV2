import React from 'react';
import type { Language, UserState } from '../types';
import { textContent } from '../constants';
import { Icon } from './Icon';

interface HeaderProps {
  language: Language;
  setLanguage: (lang: Language) => void;
  userState: UserState;
  onGoToAccount?: () => void;
}

const Logo: React.FC = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 50" className="h-9 sm:h-11 w-auto text-brand-text">
    <text x="10" y="40" fontFamily="Inter, sans-serif" fontWeight="900" fontSize="42" fill="currentColor" letterSpacing="-2">
      a<tspan fill="#16A34A">6</tspan>ko
    </text>
    <circle cx="116" cy="28" r="5" fill="#16A34A" /> 
  </svg>
);

export const Header: React.FC<HeaderProps & { onOpenPaywall: () => void, onClose?: () => void }> = ({ language, setLanguage, userState, onOpenPaywall, onClose, onGoToAccount }) => {
  const T = textContent[language];
  const displayUserId = userState.userId;

  const handleLoadId = () => {
    const input = window.prompt("Enter 6-character User ID to load account:");
    if (input && input.trim()) {
        const cleaned = input.trim().substring(0, 6).toUpperCase();
        const newUrl = new URL(window.location.href);
        newUrl.searchParams.set('uid', cleaned);
        window.location.href = newUrl.toString();
    }
  };

  const handleCopyFullId = () => {
      navigator.clipboard.writeText(userState.userId);
  };

  return (
    <header className="bg-brand-bg/80 backdrop-blur-3xl sticky top-0 z-50 border-b border-brand-secondary/20 shadow-xl shadow-black/20">
      <div className="container mx-auto px-3 sm:px-4 lg:px-8 py-2 sm:py-3 flex flex-row flex-wrap justify-between items-center gap-y-2 sm:gap-0">
        <div className="flex items-center gap-2 sm:gap-4">
           {onClose && (
             <button 
               onClick={onClose} 
               className="p-1.5 sm:p-2 hover:bg-brand-secondary/20 rounded-full transition-colors text-brand-text-secondary hover:text-brand-text"
               title="Close"
             >
               <Icon name="arrow-left" size={20} className="sm:w-6 sm:h-6" />
             </button>
           )}
           <div className="transition-all hover:scale-105 duration-500 origin-left cursor-pointer">
              <Logo />
           </div>
        </div>

        <div className="flex items-center gap-3 sm:gap-6 ml-auto">
           <div className="flex flex-col items-end gap-1">
               {/* Animated CTA */}
               <div className="flex items-center gap-2">
                 {userState.credits === 3 && (
                   <div className="bg-green-500/20 text-green-400 border border-green-500/30 px-2 py-1 rounded-lg text-[10px] font-bold animate-pulse flex items-center gap-1">
                     <Icon name="gift" className="w-3 h-3" />
                     {language === 'en' ? '3 FREE CREDITS' : '3 CRÉDITS GRATUITS'}
                   </div>
                 )}
                 <button 
                   onClick={onOpenPaywall}
                   className="group relative overflow-hidden bg-brand-text text-white px-4 sm:px-6 py-2 sm:py-2.5 rounded-xl font-black uppercase tracking-widest text-[9px] sm:text-[11px] shadow-lg shadow-brand-text/20 hover:bg-brand-primary hover:shadow-brand-primary/30 transition-all duration-300 active:scale-95"
                 >
                   <span className="relative z-10 flex items-center gap-1.5 sm:gap-2">
                     <Icon name="sparkles" className="w-3 h-3 sm:w-3.5 sm:h-3.5 animate-pulse" />
                     {T.buyCredits}
                   </span>
                   <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-100%] group-hover:animate-[shimmer_1.5s_infinite]"></div>
                 </button>

                 {onGoToAccount && (
                   <button 
                     onClick={onGoToAccount}
                     className="p-2 sm:p-2.5 bg-brand-surface border border-brand-secondary/20 rounded-xl text-brand-text-secondary hover:text-brand-primary hover:border-brand-primary/30 transition-all active:scale-95 shadow-sm"
                     title={T.navAccount}
                   >
                     <Icon name="user" className="w-4 h-4 sm:w-5 sm:h-5" />
                   </button>
                 )}
               </div>
           </div>
           
            <div className="flex items-center p-0.5 sm:p-1 bg-brand-bg/80 border border-brand-secondary/40 rounded-xl sm:rounded-2xl shadow-inner hidden sm:flex">
              <button
                onClick={() => setLanguage('en')}
                className={`px-3 sm:px-4 py-1 sm:py-1.5 text-[9px] sm:text-[10px] font-black rounded-lg sm:rounded-xl transition-all duration-500 tracking-widest ${
                  language === 'en' ? 'bg-brand-surface text-brand-primary shadow-xl shadow-brand-text/5 scale-105' : 'text-brand-text/40 hover:text-brand-text/60'
                }`}
              >
                EN
              </button>
              <button
                onClick={() => setLanguage('fr')}
                className={`px-3 sm:px-4 py-1 sm:py-1.5 text-[9px] sm:text-[10px] font-black rounded-lg sm:rounded-xl transition-all duration-500 tracking-widest ${
                  language === 'fr' ? 'bg-brand-surface text-brand-primary shadow-xl shadow-brand-text/5 scale-105' : 'text-brand-text/40 hover:text-brand-text/60'
                }`}
              >
                FR
              </button>
            </div>
        </div>
      </div>
    </header>
  );
};
