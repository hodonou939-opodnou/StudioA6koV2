import React, { useState, useCallback, useEffect, useRef } from 'react';
import { ControlsPanel } from './ControlsPanel';
import { Header } from './Header';
import { LoadingSpinner } from './LoadingSpinner';
import { VariantCard } from './VariantCard';
import { FaceProfileCard } from './FaceProfileCard';
import { AnimationModal } from './AnimationModal';
import { PaywallModal } from './PaywallModal';
import { PaymentVerificationModal } from './PaymentVerificationModal';
import { CreditConfirmModal } from './CreditConfirmModal';
import { Icon } from './Icon';
import type { GenerationOptions, Asset, AnimationOptions, UserState } from '../types';
import { generateFashionShoot, animateImage, editGeneratedImage } from '../services/geminiService';
import { textContent, BACKUP_API_KEYS, WHATSAPP_SUPPORT_LINK, buildSupportLink } from '../constants';
import { GARMENT_PROMPTS } from '../garmentPrompts';
import { getRandomDefaultModel } from '../defaultModel';
import { isAdminUser, saveUserState } from '../utils/localStorage';

import { get, set } from 'idb-keyval';

declare global {
  interface AIStudio {
    hasSelectedApiKey: () => Promise<boolean>;
    openSelectKey: () => Promise<void>;
  }
  interface Window {
    aistudio?: AIStudio;
  }
}

const getRandomGarment = () => GARMENT_PROMPTS[Math.floor(Math.random() * GARMENT_PROMPTS.length)];
const ANIMATION_COST_CREDITS = 20;
const PHOTOSHOOT_AUTOSAVE_KEY = 'a6ko_photoshoot_autosave';

interface PhotoshootStudioProps {
    userState: UserState | null;
    setUserState: React.Dispatch<React.SetStateAction<UserState | null>>;
    language: 'en' | 'fr';
    setLanguage: (lang: 'en' | 'fr') => void;
    onClose?: () => void;
    onGoToAccount?: () => void;
    isGuest?: boolean;
    onRequireLogin?: () => void;
}

const isValidationPhotoshootError = (msg: string | null): boolean => {
    if (!msg) return false;
    const validationMessages = [
        "Please describe what you want to wear or upload an image.",
        "Veuillez décrire ce que vous souhaitez porter ou télécharger une image."
    ];
    return validationMessages.includes(msg);
};



export const PhotoshootStudio: React.FC<PhotoshootStudioProps> = ({ 
    userState, 
    setUserState,
    language,
    setLanguage,
    onClose,
    onGoToAccount,
    isGuest,
    onRequireLogin
}) => {
  const [options, setOptions] = useState<GenerationOptions>({
    intent: 'Mode',
    model: getRandomDefaultModel(),
    garment: {
      description: '', // Always start fresh to avoid old default descriptions
      image: null,
    },
    companion: {
        enabled: false,
        description: '',
        image: null,
    },
    pose: 'Editorial',
    backgroundType: 'Solid Color',
    environment: 'Studio',
    colorPalette: 'Vibrant',
    cameraAngle: 'Eye Level',
    cameraAxis: 'Front',
    cameraDistance: 'Full Body',
    cameraLens: '50mm (Natural)',
    lightingSetup: 'Rembrandt',
    lightingTemperature: 'Neutral (5500K)',
    lightingTime: 'Harsh Midday',
    lightingMood: 'Clinical & Sharp',
    filmGrain: 'Crisp Digital',
    postProcessing: 'Vibrant Colors',
    tattoos: 'none',
    accessories: {
      shoes: '',
      watch: '',
      jewelry: '',
      other: ''
    },
    variants: 1, 
    aspectRatio: '9:16',
    watermark: true,
    isBlackAndWhite: false,
  });
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isAnimating, setIsAnimating] = useState<boolean>(false);
  const [loadingMessage, setLoadingMessage] = useState<string>('');
  const [results, setResults] = useState<Asset[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [hasFace, setHasFace] = useState(false);
  const [animationError, setAnimationError] = useState<string | null>(null);
  const [animatingAsset, setAnimatingAsset] = useState<Asset | null>(null);
  
  const [isPaywallOpen, setIsPaywallOpen] = useState(false);
  const [isVerificationOpen, setIsVerificationOpen] = useState(false);
  const [creditConfirmData, setCreditConfirmData] = useState<{ isOpen: boolean; requestedShots: number; maxShots: number } | null>(null);
  const [showBackToTop, setShowBackToTop] = useState(false);
  const resultsRef = useRef<HTMLDivElement>(null);
  
  const [isMinimized, setIsMinimized] = useState<boolean>(false);
  const [timeLeft, setTimeLeft] = useState<number>(45);

  useEffect(() => {
    let intervalId: any = null;
    if (isLoading) {
      setTimeLeft(45);
      setIsMinimized(false);
      intervalId = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 5) {
            return prev > 1 ? prev - 1 : 1;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      setIsMinimized(false);
    }
    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [isLoading]);

  // After SSO login: restore everything the user had filled in so they continue
  // exactly where they left off (no re-entering inputs).
  useEffect(() => {
    if (!isGuest && userState && localStorage.getItem('a6ko_pending_photoshoot_on_login') === 'true') {
      localStorage.removeItem('a6ko_pending_photoshoot_on_login');
      get('a6ko_resume_photoshoot_options')
        .then((saved) => {
          if (saved) setOptions(saved as GenerationOptions);
        })
        .catch(() => {})
        .finally(() => set('a6ko_resume_photoshoot_options', undefined).catch(() => {}));
    }
  }, [isGuest, userState]);

  const formatWaitTime = (seconds: number, lang: string) => {
    if (seconds <= 0) {
      return lang === 'en' ? "almost there..." : "presque fini...";
    }
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    if (mins > 0) {
      if (secs > 0) {
        return lang === 'en' 
          ? `${mins} minute${mins > 1 ? 's' : ''} and ${secs} second${secs > 1 ? 's' : ''}`
          : `${mins} minute${mins > 1 ? 's' : ''} et ${secs} seconde${secs > 1 ? 's' : ''}`;
      }
      return lang === 'en' 
        ? `${mins} minute${mins > 1 ? 's' : ''}`
        : `${mins} minute${mins > 1 ? 's' : ''}`;
    }
    return lang === 'en' 
      ? `${secs} second${secs > 1 ? 's' : ''}`
      : `${secs} seconde${secs > 1 ? 's' : ''}`;
  };

  const playChime = () => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const now = audioCtx.currentTime;
      
      const osc1 = audioCtx.createOscillator();
      const gain1 = audioCtx.createGain();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(523.25, now); // C5
      osc1.frequency.exponentialRampToValueAtTime(880, now + 0.15); // A5
      gain1.gain.setValueAtTime(0.15, now);
      gain1.gain.exponentialRampToValueAtTime(0.01, now + 0.5);
      osc1.connect(gain1);
      gain1.connect(audioCtx.destination);
      
      const osc2 = audioCtx.createOscillator();
      const gain2 = audioCtx.createGain();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(659.25, now + 0.1); // E5
      osc2.frequency.exponentialRampToValueAtTime(1046.50, now + 0.25); // C6
      gain2.gain.setValueAtTime(0.15, now + 0.1);
      gain2.gain.exponentialRampToValueAtTime(0.01, now + 0.6);
      osc2.connect(gain2);
      gain2.connect(audioCtx.destination);
      
      osc1.start(now);
      osc1.stop(now + 0.5);
      
      osc2.start(now + 0.1);
      osc2.stop(now + 0.6);
    } catch (e) {
      console.warn("Audio chime play failed", e);
    }
  };

  const currentApiKey = BACKUP_API_KEYS[0];
  
  const T = textContent[language];

  useEffect(() => {
    const scrollContainer = document.getElementById('photoshoot-modal-scroll-container') || window;
    const handleScroll = (e: Event) => {
      const target = e.target as HTMLElement | Document;
      const scrollTop = 'scrollTop' in target ? target.scrollTop : window.scrollY;
      setShowBackToTop(scrollTop > 400);
    };
    scrollContainer.addEventListener('scroll', handleScroll);
    return () => scrollContainer.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('payment') === 'success' || params.get('status') === 'successful') {
        setIsVerificationOpen(true);
        const newUrl = window.location.pathname;
        window.history.replaceState({}, '', newUrl);
    }
  }, []);

  const handleApiKeyError = useCallback((err: unknown) => {
    return language === 'en'
        ? "Generation failed. Please try again or contact support if the problem persists."
        : "La génération a échoué. Veuillez réessayer ou contacter le support si le problème persiste.";
  }, [language]);

  useEffect(() => {
    setUserState(prev => {
      if (!prev) return prev;
      
      if (options.garment.image && options.garment.description) {
        if (
          prev.lastGarment?.image?.base64 === options.garment.image.base64 &&
          prev.lastGarment?.description === options.garment.description
        ) {
          return prev;
        }
        const updated = {
          ...prev,
          lastGarment: {
            image: options.garment.image,
            description: options.garment.description
          }
        };
        saveUserState(updated);
        return updated;
      } else if (!options.garment.image && prev.lastGarment) {
        const updated = {
          ...prev,
          lastGarment: null
        };
        saveUserState(updated);
        return updated;
      }
      
      return prev;
    });
  }, [options.garment.image, options.garment.description, setUserState]);

  const handleGenerate = useCallback(async (overrideVariants?: number | any) => {
    if (!userState) return;

    // A saved face capture counts as the subject (server uses it). Only block
    // when there is NEITHER a captured face NOR an uploaded photo.
    if (!options.model.image && !hasFace) {
        setError(language === 'en' ? "Capture your face or upload a photo." : "Capturez votre visage ou téléchargez une photo.");
        return;
    }

    if (!options.garment.description.trim() && !options.garment.image) {
        setError(language === 'en' ? "Please describe what you want to wear or upload an image." : "Veuillez décrire ce que vous souhaitez porter ou télécharger une image.");
        return;
    }

    // Free mode: clicking Lancer while logged out opens the SSO popup, then resumes here after login.
    if (isGuest) {
        localStorage.setItem('a6ko_pending_photoshoot_on_login', 'true');
        try {
            sessionStorage.setItem('a6ko_login_feature', 'photoshoot');
            sessionStorage.setItem('a6ko_resume', '1');
        } catch {}
        // Preserve everything the user filled so it's restored after login.
        set('a6ko_resume_photoshoot_options', options).catch(() => {});
        onRequireLogin?.();
        return;
    }

    let canProceed = false;
    const variantsToGenerate = typeof overrideVariants === 'number' ? overrideVariants : options.variants;
    let cost = variantsToGenerate * 2;

    if (userState.credits >= cost) {
        canProceed = true;
    }

    if (isAdminUser(userState.userId)) {
        canProceed = true;
    }

    if (!canProceed) {
        if (userState.credits > 0) {
            const maxShots = Math.floor(userState.credits / 2);
            if (maxShots > 0) {
                setCreditConfirmData({ isOpen: true, requestedShots: variantsToGenerate, maxShots });
                return;
            } else {
                setIsPaywallOpen(true);
                return;
            }
        } else {
            setIsPaywallOpen(true);
            return;
        }
    }

    // Update state immediately to reflect usage
    setUserState(prev => {
        if (!prev) return prev;
        const updated = { ...prev };
        // Don't deduct credits for admins
        if (isAdminUser(prev.userId)) {
             return updated;
        }

        updated.credits = Math.max(0, updated.credits - cost);
        saveUserState(updated);
        return updated;
    });

    setIsLoading(true);
    setResults([]);
    setError(null);
    setAnimationError(null);

    setTimeout(() => {
      resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);

    const onProgress = (message: string) => {
      setLoadingMessage(message);
    };

    if ('Notification' in window && Notification.permission !== 'granted' && Notification.permission !== 'denied') {
        Notification.requestPermission();
    }

    try {
      const generationOptions = { ...options, variants: variantsToGenerate };
      const assets = await generateFashionShoot(generationOptions, onProgress, currentApiKey, 'PHOTOSHOOT');
      setResults(assets);
      playChime();
      if ('Notification' in window && Notification.permission === 'granted') {
          new Notification(language === 'en' ? 'Photoshoot Complete!' : 'Shoot Photo Terminé !', {
              body: language === 'en' ? 'Your photoshoot images are ready!' : 'Vos clichés de shooting sont prêts !',
              icon: '/favicon.ico'
          });
      }
    } catch (err: any) {
      console.error("Generation failed:", err);
      const errorMsg = handleApiKeyError(err);
      setError(errorMsg);
      
      // Refund using functional update to ensure correctness
      setUserState(prev => {
          if (!prev) return prev;
          // Don't refund admins as we didn't deduct
          if (isAdminUser(prev.userId)) return prev;

          const refunded = { ...prev };
          refunded.credits = prev.credits + cost;
          saveUserState(refunded);
          return refunded;
      });

    } finally {
      setIsLoading(false);
      setLoadingMessage('');
    }
  }, [options, userState, handleApiKeyError, currentApiKey, T.quotaExceededMessage, setUserState]);

  const handleEditImage = async (asset: Asset, prompt: string) => {
      try {
          const editedAsset = await editGeneratedImage(asset, prompt, currentApiKey);
          setResults(prev => [editedAsset, ...prev]);
      } catch (err: any) {
          console.error("Editing failed:", err);
          const errorMessage = handleApiKeyError(err);
          alert(language === 'en' ? "Failed to edit image. Please try again." : "Le recadrage/édition a échoué. Veuillez réessayer.");
      }
  };

  const handleStartAnimation = (asset: Asset) => {
    setAnimationError(null);
    setAnimatingAsset(asset);
  };

  const handleCloseAnimationModal = () => {
    setAnimatingAsset(null);
  };

  const handleConfirmAnimation = async (animationOptions: AnimationOptions) => {
    if (!animatingAsset || !userState) return;

    const isAdmin = isAdminUser(userState.userId);

    if (userState.credits < ANIMATION_COST_CREDITS && !isAdmin) {
        handleCloseAnimationModal();
        setIsPaywallOpen(true);
        return;
    }

    setUserState(prev => {
        if (!prev) return prev;
        if (isAdmin) return prev;
        const updated = { ...prev, credits: Math.max(0, prev.credits - ANIMATION_COST_CREDITS) };
        saveUserState(updated);
        return updated;
    });

    setIsAnimating(true);
    setAnimationError(null);
    
    const assetToAnimate = { ...animatingAsset, isAnimating: true };
    setResults(prev => prev.map(a => a.id === assetToAnimate.id ? assetToAnimate : a));
    
    handleCloseAnimationModal();

    try {
        const onProgress = (message: string) => console.log(message);
        const videoAsset = await animateImage(assetToAnimate, animationOptions, onProgress, currentApiKey);
        setResults(prev => prev.map(a => a.id === assetToAnimate.id ? videoAsset : a));
    } catch (err: any) {
        const errorMessage = handleApiKeyError(err);
        setAnimationError(errorMessage);
        setResults(prev => prev.map(a => a.id === assetToAnimate.id ? { ...assetToAnimate, isAnimating: false } : a));
        
        setUserState(prev => {
            if (!prev) return prev;
            if (isAdmin) return prev;
            const refunded = { ...prev, credits: prev.credits + ANIMATION_COST_CREDITS };
            saveUserState(refunded);
            return refunded;
        });
    } finally {
        setIsAnimating(false);
    }
  };

  const handleRegenerateAnimation = async (assetToRegen: Asset) => {
    if (!userState || assetToRegen.type !== 'video' || !assetToRegen.originalImage || !assetToRegen.animationOptions) return;

    const isAdmin = isAdminUser(userState.userId);

    if (userState.credits < ANIMATION_COST_CREDITS && !isAdmin) {
        setIsPaywallOpen(true);
        return;
    }

    setUserState(prev => {
        if (!prev) return prev;
        if (isAdmin) return prev;
        const updated = { ...prev, credits: Math.max(0, prev.credits - ANIMATION_COST_CREDITS) };
        saveUserState(updated);
        return updated;
    });

    setResults(prev => prev.map(a => a.id === assetToRegen.id ? { ...a, isAnimating: true } : a));
    setAnimationError(null);

    const imageAssetForService: Asset = {
        ...assetToRegen,
        type: 'image',
        url: assetToRegen.originalImage.url,
        base64: assetToRegen.originalImage.base64,
        isAnimating: true, 
        originalImage: undefined,
        animationOptions: undefined,
    };

    try {
        const onProgress = (message: string) => console.log(message);
        const newVideoAsset = await animateImage(imageAssetForService, assetToRegen.animationOptions, onProgress, currentApiKey);
        setResults(prev => prev.map(a => a.id === assetToRegen.id ? newVideoAsset : a));
    } catch (err: any) {
        const errorMessage = handleApiKeyError(err);
        setAnimationError(errorMessage);
        setResults(prev => prev.map(a => a.id === assetToRegen.id ? { ...assetToRegen, isAnimating: false } : a));

        setUserState(prev => {
            if (!prev) return prev;
            if (isAdmin) return prev;
            const refunded = { ...prev, credits: prev.credits + ANIMATION_COST_CREDITS };
            saveUserState(refunded);
            return refunded;
        });
    }
  };

  const handleResetToImage = (assetToReset: Asset) => {
    setResults(prevResults => prevResults.map(asset => {
      if (asset.id === assetToReset.id && asset.type === 'video' && asset.originalImage) {
        return {
          ...asset,
          type: 'image',
          url: asset.originalImage.url,
          base64: asset.originalImage.base64,
          originalImage: undefined,
          animationOptions: undefined,
          isAnimating: false,
        };
      }
      return asset;
    }));
  };

  const handleFeedback = useCallback((assetId: string, feedback: 'like' | 'dislike') => {
      setResults(prevResults => prevResults.map(asset => {
          if (asset.id === assetId) {
              const newFeedback = asset.feedback === feedback ? null : feedback;
              return { ...asset, feedback: newFeedback };
          }
          return asset;
      }));
  }, []);

  const handlePaymentVerified = (confirmedUserId?: string) => {
      if (!userState) return;
      
      setUserState(prev => {
          if (!prev) return prev;
          let updated = { ...prev };
          if (confirmedUserId && confirmedUserId !== prev.userId) {
              updated.userId = confirmedUserId;
          }
          updated.credits = updated.credits + 25;
          saveUserState(updated);
          return updated;
      });
  };
  
  const handleManualCodeRedemption = (code: string) => {
      const normalizedCode = code.trim().toUpperCase();
      return normalizedCode === 'A6KO-VIP-25';
  };

  if (userState === null) {
    return (
      <div className="min-h-screen bg-brand-bg flex flex-col items-center justify-center">
        <LoadingSpinner />
        <p className="mt-4 text-brand-text-secondary animate-pulse">{T.verifyingIdentity}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full bg-brand-bg text-brand-text relative overflow-x-hidden">
      <Header 
        language={language} 
        setLanguage={setLanguage} 
        userState={userState} 
        onOpenPaywall={() => setIsPaywallOpen(true)}
        onClose={onClose}
        onGoToAccount={onGoToAccount}
      />
      <main className="container mx-auto p-4 pb-24 lg:p-8 grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-4 xl:col-span-3 controls-panel lg:sticky lg:top-24 lg:h-[calc(100vh-8rem)] lg:overflow-y-auto no-scrollbar">
          <div className="mb-4">
            <FaceProfileCard
              isFR={language === 'fr'}
              isGuest={isGuest}
              onRequireLogin={onRequireLogin}
              onHasFace={setHasFace}
              onSubjectReady={(img) =>
                setOptions((prev) =>
                  prev.model.image
                    ? prev // a direct upload always wins
                    : { ...prev, model: { ...prev.model, name: language === 'fr' ? 'Mon visage' : 'My face', image: img } }
                )
              }
            />
          </div>
          <ControlsPanel
            options={options}
            setOptions={setOptions}
            onGenerate={handleGenerate}
            isLoading={isLoading}
            T={T}
            userState={userState}
            onOpenPaywall={() => setIsPaywallOpen(true)}
            currentApiKey={currentApiKey}
            onApiKeyError={(err) => {
              const errorMsg = handleApiKeyError(err);
              setError(errorMsg);
            }}
          />
        </div>
        <div className="lg:col-span-8 xl:col-span-9" ref={resultsRef}>
          
          {isLoading && !isMinimized ? (
            <div className="flex flex-col items-center justify-center min-h-[60vh] bg-brand-surface rounded-2xl p-8 text-center relative overflow-hidden group border border-brand-secondary/40 shadow-xl">
              <div className="relative z-10 flex flex-col items-center max-w-md mx-auto space-y-6">
                <div className="relative">
                  <div className="absolute inset-0 bg-brand-primary/20 rounded-full scale-110 animate-ping" />
                  <div className="bg-brand-primary/10 p-6 rounded-full relative z-10">
                    <LoadingSpinner />
                  </div>
                </div>
                
                <h2 className="text-2xl font-black text-brand-text tracking-tight uppercase">
                  {language === 'en' ? 'A6ko is making its magic' : 'a6ko opère sa magie'}
                </h2>
                
                <div className="space-y-3">
                  <p className="text-sm text-brand-text-secondary leading-relaxed">
                    {loadingMessage || (language === 'en' ? 'Refining the details of your outfit...' : 'Mise au point sur le vêtement...')}
                  </p>
                  <p className="text-xs text-brand-primary font-mono font-bold uppercase tracking-widest bg-brand-primary/10 px-4 py-1.5 rounded-full inline-block">
                    {language === 'en' ? 'Estimated wait: ' : 'Attente estimée : '}
                    {formatWaitTime(timeLeft, language)}
                  </p>
                </div>

                <div className="w-full max-w-xs bg-brand-secondary/20 h-2 rounded-full overflow-hidden">
                  <div 
                    className="bg-brand-primary h-full transition-all duration-1000" 
                    style={{ width: `${Math.max(5, Math.min(100, ((45 - timeLeft) / 45) * 100))}%` }} 
                  />
                </div>

                <button
                  type="button"
                  onClick={() => setIsMinimized(true)}
                  className="mt-2 bg-brand-secondary text-brand-text py-3 px-6 rounded-xl font-bold text-xs uppercase tracking-wider hover:bg-brand-text hover:text-white transition-all duration-300 shadow-md shadow-brand-secondary/10 flex items-center gap-2 cursor-pointer"
                >
                  <Icon name="copy" className="w-3.5 h-3.5 rotate-90" />
                  <span>{language === 'en' ? 'Run in background' : 'Lancer en arrière-plan'}</span>
                </button>
              </div>
            </div>
          ) : (
            <>
               {error && (
                 <div className={`bg-amber-950/20 border border-amber-500/45 text-amber-100 rounded-lg p-8 text-center mb-6 animate-in fade-in slide-in-from-top-4 duration-500`}>
                    <div className="max-w-xl mx-auto">
                        <h3 className="text-xl font-bold mb-3 text-amber-500 flex items-center justify-center gap-2">
                            <Icon name="alert-circle" className="w-5 h-5 animate-pulse" />
                            {T.errorTitle}
                        </h3>
                        <p className="text-sm leading-relaxed mb-6 whitespace-pre-line text-brand-text-secondary select-text">
                            {error}
                        </p>
                        <a href={buildSupportLink(userState?.userId, language === 'fr')} target="_blank" rel="noopener noreferrer" className="inline-block bg-green-600 text-white font-bold py-2.5 px-6 rounded hover:bg-green-700 transition-colors uppercase text-xs tracking-wider animate-bounce">
                            {T.contactSupport}
                        </a>
                    </div>
                </div>
              )}
               {animationError && (
                 <div className={`bg-amber-950/20 border border-amber-500/45 text-amber-100 rounded-lg p-8 text-center mb-6 animate-in fade-in slide-in-from-top-4 duration-500`}>
                    <div className="max-w-xl mx-auto">
                        <h3 className="text-xl font-bold mb-3 text-amber-500 flex items-center justify-center gap-2">
                            <Icon name="film" className="w-5 h-5 animate-pulse" />
                            {T.animationErrorTitle}
                        </h3>
                        <p className="text-sm leading-relaxed mb-6 whitespace-pre-line text-brand-text-secondary select-text">
                            {animationError}
                        </p>
                        <a href={buildSupportLink(userState?.userId, language === 'fr')} target="_blank" rel="noopener noreferrer" className="inline-block bg-green-600 text-white font-bold py-2.5 px-6 rounded hover:bg-green-700 transition-colors uppercase text-xs tracking-wider">
                            {T.contactSupport}
                        </a>
                    </div>
                </div>
              )}
              
              {results.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                  {results.map((asset) => (
                    <VariantCard 
                      key={asset.id} 
                      asset={asset} 
                      T={T} 
                      onAnimate={handleStartAnimation}
                      onRegenerate={handleRegenerateAnimation}
                      onReset={handleResetToImage}
                      onFeedback={handleFeedback}
                      onEdit={handleEditImage}
                    />
                  ))}
                </div>
              )}
              
              {!error && results.length === 0 && (
                <div className="flex flex-col items-center justify-center h-full min-h-[60vh] bg-brand-surface rounded-2xl p-8 text-center relative overflow-hidden group border border-brand-secondary/40 shadow-xl">
                  <video 
                    autoPlay 
                    loop 
                    muted 
                    playsInline 
                    className="absolute inset-0 w-full h-full object-cover opacity-20 group-hover:opacity-30 transition-opacity duration-700"
                  >
                    <source src="https://assets.mixkit.co/videos/preview/mixkit-fashion-model-walking-on-a-runway-34407-large.mp4" type="video/mp4" />
                  </video>
                  <div className="relative z-10 flex flex-col items-center">
                    <div className="bg-brand-primary/10 p-4 rounded-full mb-6 animate-pulse">
                      <Icon name="sparkles" className="h-12 w-12 text-brand-primary" />
                    </div>
                    <h2 className="text-3xl font-black text-brand-text tracking-tight uppercase mb-4">
                      {language === 'en' ? 'Your photoshoots will appear here' : 'Vos photoshoots apparaîtront ici'}
                    </h2>
                    <p className="text-brand-text-secondary max-w-md text-sm leading-relaxed">
                      {language === 'en' 
                        ? "Configure your studio settings and click 'Launch Shoot' to see the magic."
                        : "Configurez vos réglages studio et cliquez sur 'Lancer le Shoot' pour voir la magie."}
                    </p>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </main>
      
      <AnimationModal
          isOpen={!!animatingAsset}
          asset={animatingAsset}
          onClose={handleCloseAnimationModal}
          onSubmit={handleConfirmAnimation}
          isLoading={isAnimating}
          T={T}
      />
      
      <PaywallModal 
          isOpen={isPaywallOpen}
          onClose={() => setIsPaywallOpen(false)}
          userId={userState.userId}
          userState={userState}
          setUserState={setUserState}
          isGuest={isGuest}
          onRequireLogin={onRequireLogin}
          T={T}
      />

      {creditConfirmData && (
        <CreditConfirmModal
          isOpen={creditConfirmData.isOpen}
          onClose={() => setCreditConfirmData(null)}
          onConfirm={() => {
            setOptions(prev => ({ ...prev, variants: creditConfirmData.maxShots }));
            const maxShots = creditConfirmData.maxShots;
            setCreditConfirmData(null);
            handleGenerate(maxShots);
          }}
          onBuyMore={() => {
            setCreditConfirmData(null);
            setIsPaywallOpen(true);
          }}
          requestedShots={creditConfirmData.requestedShots}
          maxShots={creditConfirmData.maxShots}
          language={language}
        />
      )}

      <PaymentVerificationModal 
          isOpen={isVerificationOpen}
          onClose={() => setIsVerificationOpen(false)}
          onVerified={handlePaymentVerified}
          onManualVerify={handleManualCodeRedemption}
          T={T}
          currentApiKey={currentApiKey}
          userId={userState.userId}
      />

      {isLoading && isMinimized && (
        <div className="fixed bottom-24 right-6 z-[100] bg-brand-bg/95 backdrop-blur-md border border-brand-primary/30 rounded-2xl p-4 shadow-2xl shadow-brand-primary/20 flex flex-col gap-3 min-w-[280px] animate-in slide-in-from-bottom-5 duration-300">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-brand-primary animate-ping" />
              <span className="text-xs font-black uppercase tracking-wider text-brand-primary animate-pulse">
                {language === 'en' ? 'Background Process' : 'Arrière-plan'}
              </span>
            </div>
            <button 
              onClick={() => {
                setIsMinimized(false);
                resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
              }}
              className="text-[10px] bg-brand-primary text-brand-bg font-black px-2 py-1 rounded hover:opacity-90 uppercase tracking-widest transition-all cursor-pointer"
            >
              {language === 'en' ? 'Maximize' : 'Ouvrir'}
            </button>
          </div>
          <div className="space-y-1">
            <p className="text-xs font-bold text-[#E2E8F0]">
              {language === 'en' ? 'A6ko is making its magic...' : 'a6ko opère sa magie...'}
            </p>
            <p className="text-[10px] text-brand-text-secondary">
              {language === 'en' ? `Estimated wait: ` : `Attente estimée : `}
              <strong className="text-brand-primary font-mono">{formatWaitTime(timeLeft, language)}</strong>
            </p>
          </div>
          <div className="w-full bg-brand-secondary/20 h-1.5 rounded-full overflow-hidden">
            <div 
              className="bg-brand-primary h-full transition-all duration-1000" 
              style={{ width: `${Math.max(5, Math.min(100, ((45 - timeLeft) / 45) * 100))}%` }} 
            />
          </div>
        </div>
      )}
      
      {showBackToTop && (
        <button
          onClick={() => {
            const scrollContainer = document.getElementById('photoshoot-modal-scroll-container') || window;
            scrollContainer.scrollTo({ top: 0, behavior: 'smooth' });
          }}
          className="lg:hidden fixed bottom-24 right-4 z-50 bg-brand-text text-white p-3 rounded-full shadow-2xl shadow-brand-text/30 hover:bg-brand-primary transition-all duration-300 active:scale-95"
          aria-label="Back to top"
        >
          <Icon name="chevron-up" className="w-6 h-6" />
        </button>
      )}
      
    </div>
  );
};
