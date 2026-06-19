import React from 'react';
import { Icon } from './Icon';
import { WHATSAPP_SUPPORT_LINK, buildSupportLink } from '../constants';
import { saveUserState } from '../utils/localStorage';
import type { UserState } from '../types';

interface PaywallModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  isGuest?: boolean;
  onRequireLogin?: () => void;
  T: any;
  userState?: UserState | null;
  setUserState?: (state: UserState) => void;
}

export const PaywallModal: React.FC<PaywallModalProps> = ({ 
  isOpen, 
  onClose, 
  userId, 
  isGuest = false, 
  onRequireLogin, 
  T,
  userState,
  setUserState
}) => {
  if (!isOpen) return null;

  const isFR = T.directorId === 'ID Directeur' || !T.needMoreCredits?.includes('Need');

  const modalPacks = [
    {
      id: 'discovery',
      name: isFR ? 'Pack Découverte' : 'Discovery Starter',
      credits: isFR ? '5 crédits' : '5 credits',
      price: '500 XOF',
      color: 'border-brand-secondary/20 bg-brand-bg/40',
      badge: isFR ? 'Débutant' : 'Beginner',
    },
    {
      id: 'creator',
      name: isFR ? '⭐ Pack Créateur' : '⭐ Creator Arsenal',
      credits: isFR ? '30 crédits' : '30 credits',
      price: '2 499 XOF',
      color: 'border-brand-primary bg-brand-primary/5 ring-1 ring-brand-primary/20',
      badge: isFR ? 'Populaire' : 'Popular',
    },
    {
      id: 'studio',
      name: isFR ? '🏆 Pack Studio' : '🏆 Professional Studio',
      credits: isFR ? '100 crédits' : '100 credits',
      price: '6 999 XOF',
      color: 'border-emerald-500 bg-emerald-500/5',
      badge: isFR ? 'Meilleur Rapport' : 'Best Value',
    },
    {
      id: 'pro',
      name: isFR ? '💜 Pro Mensuel' : '💜 Pro Monthly Plan',
      credits: isFR ? '300 crédits/mois' : '300 credits/month',
      price: '14 999 XOF',
      color: 'border-purple-500 bg-purple-500/5',
      badge: isFR ? 'Professionnel' : 'Pro Plan',
    }
  ];

  // Start the Moneroo checkout; credits are auto-granted by the verified webhook.
  const handlePay = async (packId: string) => {
    // Open a tab synchronously on click (avoids popup blockers), then point it at
    // the checkout — keeps the main app open so the user never leaves it.
    const win = window.open('about:blank', '_blank');
    try {
      const res = await fetch('/api/payments/checkout', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ packId }),
      });
      const data = await res.json();
      if (res.ok && data.checkoutUrl) {
        if (win) win.location.href = data.checkoutUrl;
        else window.location.href = data.checkoutUrl; // fallback if popup blocked
      } else if (res.status === 401) {
        win?.close();
        onRequireLogin?.();
      } else {
        win?.close();
        alert(isFR ? "Échec de l'ouverture du paiement. Réessayez." : 'Could not start payment. Please retry.');
      }
    } catch {
      win?.close();
      alert(isFR ? 'Erreur réseau. Réessayez.' : 'Network error. Please retry.');
    }
  };

  const getWhatsAppUrl = (packName: string, price: string, credits: string) => {
    const text = isFR 
        ? `Bonjour ! Je souhaite commander le "${packName}" (${credits} pour ${price}) pour mon ID Directeur: ${userId}.`
        : `Hello! I would like to order the "${packName}" (${credits} for ${price}) for my ID: ${userId}.`;
    return `${WHATSAPP_SUPPORT_LINK}?text=${encodeURIComponent(text)}`;
  };

  return (
    <div 
      className="fixed inset-0 bg-brand-bg/95 backdrop-blur-md z-50 flex items-center justify-center p-4 overflow-y-auto"
      aria-modal="true" 
      role="dialog"
    >
      <div className="bg-brand-surface rounded-3xl shadow-2xl w-full max-w-lg border border-brand-primary/10 overflow-hidden transform transition-all scale-100 my-8">
        
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-brand-primary/10 via-brand-surface to-brand-primary/5 p-6 text-center border-b border-brand-secondary/15">
             <div className="w-12 h-12 bg-brand-primary/20 rounded-full flex items-center justify-center mx-auto mb-3">
                <Icon name="sparkles" className="w-6 h-6 text-brand-primary" />
             </div>
             <h2 className="text-xl sm:text-2xl font-black text-brand-text uppercase tracking-tight">
               {isFR ? 'Crédits Insuffisants' : T.needMoreCredits}
             </h2>
             <p className="text-xs text-brand-text-secondary font-light mt-1 max-w-md mx-auto">
               {isFR 
                 ? 'Rechargez votre compte en un instant pour continuer à générer vos créations haute couture.' 
                 : 'Top up in seconds to resume high-fidelity model and visual creations.'}
             </p>
        </div>
        
        {/* Client ID Showcase */}
        <div className="px-6 pt-4 text-center">
          <div className="inline-flex items-center gap-2 bg-brand-bg/80 border border-brand-secondary/15 px-3 py-1.5 rounded-xl text-left">
            <span className="text-[10px] font-bold text-brand-text-secondary uppercase tracking-widest font-mono">
              {isFR ? 'ID Directeur :' : 'Director ID :'}
            </span>
            <span className="text-xs font-mono font-black text-brand-primary tracking-wider">
              {userId}
            </span>
          </div>
        </div>

        {/* Free self-recharge removed — credits are now strictly server-authoritative. */}

        {/* Dynamic Pack Options */}
        <div className="p-6 space-y-3 max-h-[350px] overflow-y-auto">
          {modalPacks.map((pack, index) => (
            <div 
              key={index} 
              className={`p-4 rounded-2xl border transition-all flex flex-col sm:flex-row items-center justify-between gap-4 hover:border-brand-primary/45 ${pack.color}`}
            >
              <div className="text-left w-full sm:w-auto">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-black text-brand-text uppercase tracking-tight">
                    {pack.name}
                  </h3>
                  <span className="text-[8px] font-mono font-bold bg-brand-bg/90 border border-brand-secondary/10 text-brand-text px-1.5 py-0.5 rounded-full uppercase">
                    {pack.badge}
                  </span>
                </div>
                <div className="flex items-baseline gap-1.5 mt-0.5">
                  <span className="text-lg font-black text-brand-primary tracking-tight">{pack.credits}</span>
                  <span className="text-xs font-bold text-brand-text-secondary">({pack.price})</span>
                </div>
              </div>

              {/* Action Actions (Web PopUp & WhatsApp fallback) */}
              <div className="flex gap-2 w-full sm:w-auto shrink-0">
                <button
                  onClick={() => handlePay(pack.id)}
                  className="flex-1 sm:flex-none text-center bg-brand-primary text-white text-xs font-black px-4 py-2.5 rounded-xl hover:bg-brand-primary/95 transition-all shadow-md shadow-brand-primary/5 uppercase tracking-wider cursor-pointer"
                >
                  🚀 {isFR ? 'Payer' : 'Pay'}
                </button>
                
                <a 
                  href={getWhatsAppUrl(pack.name.replace(/⭐|🏆|💜/g, '').trim(), pack.price, pack.credits)}
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-center bg-brand-secondary text-brand-text-secondary hover:text-green-500 hover:bg-green-500/5 text-xs font-bold p-2.5 rounded-xl transition-all"
                  title={isFR ? 'Acheter via WhatsApp' : 'Order via WhatsApp'}
                >
                  <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path d="M12.012 2c-5.506 0-9.989 4.478-9.99 9.984a9.96 9.96 0 0 0 1.333 4.993L2 22l5.233-1.371a9.936 9.936 0 0 0 4.777 1.22c5.507 0 9.99-4.478 9.99-9.985C22.001 6.478 17.518 2 12.012 2zm6.136 14.156c-.252.712-1.461 1.304-2.01 1.402-.497.09-1.15.163-3.32-.737-2.774-1.15-4.568-3.974-4.707-4.159-.138-.184-1.12-1.49-1.119-2.842.001-1.352.708-2.015.96-2.277.251-.262.55-.328.733-.328.184 0 .368.002.527.01.163.007.382-.062.598.459.222.535.759 1.854.825 1.986.066.13.111.285.022.46-.089.175-.133.284-.265.438-.133.153-.277.34-.397.459-.133.13-.273.272-.118.537.155.263.684 1.127 1.465 1.821.996.883 1.836 1.157 2.094 1.288.258.13.407.11.558-.06.151-.175.648-.755.823-1.01.175-.251.349-.208.59-.12.24.088 1.524.718 1.786.85.263.13.438.196.505.31.066.11.066.652-.187 1.365z"/>
                  </svg>
                </a>
              </div>
            </div>
          ))}
        </div>

        {/* Support Direct Action */}
        <div className="px-6 pb-2 text-center">
          <a
            href={buildSupportLink(userState?.userId, isFR)}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 text-xs font-bold rounded-2xl transition-all"
          >
            <span className="text-sm">💬</span>
            <span>{isFR ? "Besoin d'aide ? Contacter le support" : "Need assistance? Chat with support"}</span>
          </a>
        </div>

        {/* Modal Footer / Close */}
        <div className="p-4 border-t border-brand-secondary/15 bg-brand-bg/50 text-center">
            <button 
              onClick={onClose} 
              className="text-brand-text-secondary hover:text-brand-text text-xs tracking-wider uppercase font-extrabold hover:underline transition-colors"
            >
                {isFR ? 'Fermer la fenêtre' : T.close}
            </button>
        </div>
      </div>
    </div>
  );
};
