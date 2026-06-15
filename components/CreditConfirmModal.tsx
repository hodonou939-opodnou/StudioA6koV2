import React from 'react';
import { Icon } from './Icon';

interface CreditConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  onBuyMore: () => void;
  requestedShots: number;
  maxShots: number;
  language: 'en' | 'fr';
}

export const CreditConfirmModal: React.FC<CreditConfirmModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  onBuyMore,
  requestedShots,
  maxShots,
  language
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
      <div 
        className="absolute inset-0 bg-brand-bg/90 backdrop-blur-md"
        onClick={onClose}
      ></div>
      
      <div className="relative w-full max-w-md bg-brand-surface border border-brand-secondary/30 rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
        <div className="p-8 text-center">
          <div className="w-16 h-16 bg-brand-primary/10 rounded-full flex items-center justify-center mx-auto mb-6">
            <Icon name="coins" className="w-8 h-8 text-brand-primary" />
          </div>
          
          <h2 className="text-2xl font-black text-brand-text mb-4">
            {language === 'en' ? 'Not Enough Credits' : 'Crédits Insuffisants'}
          </h2>
          
          <p className="text-brand-text-secondary mb-8">
            {language === 'en' 
              ? `You requested ${requestedShots} shots (costs ${requestedShots * 2} credits), but you only have enough for ${maxShots} shot(s).`
              : `Vous avez demandé ${requestedShots} photos (coûte ${requestedShots * 2} crédits), mais vous n'avez assez que pour ${maxShots} photo(s).`}
          </p>
          
          <div className="space-y-3">
            <button
              onClick={onConfirm}
              className="w-full bg-brand-primary text-white font-bold py-4 px-6 rounded-xl hover:bg-brand-primary/90 transition-all active:scale-95 flex items-center justify-center gap-2"
            >
              <Icon name="check" className="w-5 h-5" />
              {language === 'en' ? `Generate ${maxShots} shot(s) instead` : `Générer ${maxShots} photo(s) à la place`}
            </button>
            
            <button
              onClick={onBuyMore}
              className="w-full bg-brand-surface border-2 border-brand-primary text-brand-primary font-bold py-4 px-6 rounded-xl hover:bg-brand-primary/10 transition-all active:scale-95 flex items-center justify-center gap-2"
            >
              <Icon name="shopping-cart" className="w-5 h-5" />
              {language === 'en' ? 'Buy More Credits' : 'Acheter Plus de Crédits'}
            </button>
            
            <button
              onClick={onClose}
              className="w-full text-brand-text-secondary font-bold py-3 px-6 rounded-xl hover:bg-brand-secondary/20 transition-all"
            >
              {language === 'en' ? 'Cancel' : 'Annuler'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
