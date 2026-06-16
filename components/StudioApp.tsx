"use client";

import React, { useState, useEffect } from 'react';
import { PhotoshootStudio } from './PhotoshootStudio';
import { CreativesStudio } from './CreativesStudio';
import { UserAccount } from './UserAccount';
import { Icon } from './Icon';
import { HomeLandingPage } from './HomeLandingPage';
import { InspirationGallery } from './InspirationGallery';
import { EssayageVirtuel } from './EssayageVirtuel';
import type { UserState } from '../types';
import { identifyUser, resolveGoogleUserState } from '../utils/localStorage';
import { textContent } from '../constants';
import { useSession } from '@/lib/auth-client';
import { TryFreeModal } from './TryFreeModal';
import { AuthFlowModal, type AuthFlowMode } from './AuthFlowModal';

const StudioApp: React.FC = () => {
  const { data: session } = useSession();
  const [authUser, setAuthUser] = useState<any>(null);
  const [isAuthChecking, setIsAuthChecking] = useState(true);
  const [userState, setUserState] = useState<UserState | null>(null);
  const [isTryFreeModalOpen, setIsTryFreeModalOpen] = useState(false);
  const [authModal, setAuthModal] = useState<AuthFlowMode | null>(null);
  const [shortId, setShortId] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<'home' | 'essayage' | 'photoshoot' | 'creatives' | 'inspiration' | 'account'>('home');
  const [isPhotoshootModalOpen, setIsPhotoshootModalOpen] = useState(false);
  const [language, setLanguage] = useState<'en' | 'fr'>('fr');

  const T = textContent[language];

  const user = session?.user as (typeof session extends null ? never : any) | undefined;
  const isGuest = !user || user.isAnonymous;

  // Resolve user state from the new backend whenever the session changes.
  useEffect(() => {
    let active = true;
    (async () => {
      const resuming =
        typeof window !== 'undefined' &&
        (new URL(window.location.href).searchParams.get('resume') === '1' ||
          sessionStorage.getItem('a6ko_resume') === '1');
      try {
        const state = !isGuest ? await resolveGoogleUserState() : await identifyUser();
        if (!active) return;
        setUserState(state);
        setAuthUser(user ?? null);
        setIsAuthChecking(false);

        // Returning from an SSO login → run the scenario logic.
        if (!isGuest && resuming) {
          sessionStorage.removeItem('a6ko_resume');
          let credits = state.credits;
          let sid: string | null = state.userId;
          try {
            const r = await fetch('/api/credits');
            if (r.ok) {
              const d = await r.json();
              credits = d.credits;
              sid = d.shortId ?? sid;
            }
          } catch {
            /* keep state values */
          }
          if (!active) return;
          setShortId(sid);
          if (credits <= 0) {
            setAuthModal('blocked'); // Scenario 1: existing account, free credits used
          } else {
            setAuthModal(null); // Scenario 2/3: proceed + resume the held generation
            const feat = sessionStorage.getItem('a6ko_login_feature');
            sessionStorage.removeItem('a6ko_login_feature');
            if (feat === 'photoshoot') setIsPhotoshootModalOpen(true);
            else if (feat === 'essayage' || feat === 'creatives') setActiveTab(feat);
          }
        }
      } catch (e) {
        console.warn('[AuthState] Processing failed, falling back safely', e);
        if (active) {
          setUserState({ userId: 'A6-UNKNOWN', credits: 3 });
          setIsAuthChecking(false);
          if (resuming) setAuthModal('fallback'); // Scenario 4: unexpected state
        }
      }
    })();
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session]);

  // Centralized response to generation gating (fired by geminiService):
  // anonymous user clicked "Generate" → send them to log in; out of credits → account/pricing.
  useEffect(() => {
    const onAuthRequired = () => setAuthModal('login');
    const onInsufficient = () => setActiveTab('account');
    const onCreditsChanged = async () => {
      try {
        const res = await fetch('/api/credits');
        if (res.ok) {
          const { credits } = await res.json();
          setUserState((prev) => (prev ? { ...prev, credits } : prev));
        }
      } catch {
        /* ignore */
      }
    };
    window.addEventListener('a6ko:auth-required', onAuthRequired);
    window.addEventListener('a6ko:insufficient-credits', onInsufficient);
    window.addEventListener('a6ko:credits-changed', onCreditsChanged);
    return () => {
      window.removeEventListener('a6ko:auth-required', onAuthRequired);
      window.removeEventListener('a6ko:insufficient-credits', onInsufficient);
      window.removeEventListener('a6ko:credits-changed', onCreditsChanged);
    };
  }, []);

  // OAuth bounced back with an error (e.g. a different / already-existing account)
  // → show a friendly message instead of a blank page, then clean the URL.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URL(window.location.href).searchParams;
    if (params.get('auth_error') || params.get('error')) {
      setAuthModal('fallback');
      const url = new URL(window.location.href);
      url.searchParams.delete('auth_error');
      url.searchParams.delete('error');
      window.history.replaceState({}, '', url.toString());
    }
  }, []);

  if (isAuthChecking || !userState) {
    return (
      <div className="min-h-screen bg-brand-bg flex flex-col items-center justify-center">
        <div className="relative flex items-center justify-center w-32 h-32 mb-8">
          <div className="absolute inset-0 bg-brand-primary/20 rounded-full blur-xl animate-pulse"></div>
          <div className="absolute inset-2 border-2 border-dashed border-brand-primary/50 rounded-full animate-[spin_10s_linear_infinite]"></div>
          <div className="absolute inset-4 border-4 border-brand-primary border-b-transparent border-l-transparent rounded-full animate-[spin_1.5s_cubic-bezier(0.68,-0.55,0.265,1.55)_infinite]"></div>
          <div className="absolute inset-0 flex items-center justify-center bg-brand-surface rounded-full shadow-inner m-6 z-10">
            <span className="font-black text-xl tracking-tighter text-brand-text">
              a6<span className="text-brand-primary">ko</span>
            </span>
          </div>
        </div>
        <p className="text-xs font-black uppercase tracking-[0.3em] text-brand-primary animate-pulse">
          Loading Studio
        </p>
      </div>
    );
  }

  const handleTabChange = (tab: typeof activeTab) => {
    setActiveTab(tab);
    setIsPhotoshootModalOpen(false);
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'home':
        return (
          <HomeLandingPage
            T={T}
            onLaunchPhotoshoot={() => setIsPhotoshootModalOpen(true)}
            onLaunchCreatives={() => handleTabChange('creatives')}
          />
        );
      case 'photoshoot':
        return (
          <div className="flex flex-col items-center justify-center min-h-[70vh] text-center px-4 animate-in fade-in duration-500">
            <div className="max-w-4xl mx-auto space-y-8">
              <h1 className="text-6xl md:text-8xl font-black text-brand-text tracking-tighter uppercase leading-none">
                {T.landingTitle} <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-primary to-purple-600">{T.landingTitleSuffix}</span>
              </h1>
              <p className="text-xl md:text-2xl text-brand-text-secondary max-w-2xl mx-auto font-light">
                {T.landingSubtitle}
              </p>
              <div className="pt-8">
                <button
                  onClick={() => setIsPhotoshootModalOpen(true)}
                  className="group relative inline-flex items-center justify-center px-12 py-6 text-lg font-bold text-white transition-all duration-200 bg-brand-text font-pj rounded-full focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-900 hover:bg-brand-primary hover:scale-105 shadow-2xl shadow-brand-primary/20"
                >
                  <span className="absolute inset-0 w-full h-full -mt-1 rounded-lg opacity-30 bg-gradient-to-b from-transparent via-transparent to-gray-700"></span>
                  <span className="relative flex items-center gap-3 uppercase tracking-widest">
                    {T.launchStudio}
                    <Icon name="wand" className="w-5 h-5 group-hover:rotate-12 transition-transform" />
                  </span>
                </button>
              </div>
            </div>
          </div>
        );
      case 'essayage':
        return (
          <EssayageVirtuel
            userState={userState}
            setUserState={setUserState}
            language={language}
            setLanguage={setLanguage}
            isGuest={isGuest}
            onRequireLogin={() => setAuthModal('login')}
          />
        );
      case 'creatives':
        return (
          <CreativesStudio
            userState={userState}
            setUserState={setUserState}
            language={language}
            setLanguage={setLanguage}
          />
        );
      case 'inspiration':
        return <InspirationGallery T={T} language={language} />;
      case 'account':
        return (
          <UserAccount
            userState={userState}
            setUserState={setUserState}
            T={T}
            isGuest={isGuest}
            onRequireLogin={() => setAuthModal('login')}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-brand-bg text-brand-text font-sans selection:bg-brand-primary/30 overflow-x-hidden">
      <header className="fixed top-0 left-0 right-0 z-40 bg-brand-bg/80 backdrop-blur-md border-b border-brand-secondary/10">
        <div className="container mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity" onClick={() => handleTabChange('home')}>
            <div className="w-8 h-8 bg-brand-text rounded-lg flex items-center justify-center text-white font-black text-lg">a</div>
            <span className="font-bold text-xl tracking-tight hidden sm:block">studio a6ko</span>
          </div>

          <nav className="hidden md:flex items-center gap-1 bg-brand-surface/50 p-1 rounded-full border border-brand-secondary/20">
            <button onClick={() => handleTabChange('essayage')} className={`px-6 py-2 rounded-full text-sm font-bold transition-all ${activeTab === 'essayage' ? 'bg-brand-text text-white shadow-lg' : 'text-brand-text-secondary hover:text-brand-text hover:bg-brand-bg'}`}>{T.navTryOn || 'Essayage Virtuel'}</button>
            <button onClick={() => setIsPhotoshootModalOpen(true)} className={`px-6 py-2 rounded-full text-sm font-bold transition-all ${isPhotoshootModalOpen ? 'bg-brand-text text-white shadow-lg' : 'text-brand-text-secondary hover:text-brand-text hover:bg-brand-bg'}`}>{T.navPhotoshoot}</button>
            <button onClick={() => handleTabChange('creatives')} className={`px-6 py-2 rounded-full text-sm font-bold transition-all ${activeTab === 'creatives' ? 'bg-brand-text text-white shadow-lg' : 'text-brand-text-secondary hover:text-brand-text hover:bg-brand-bg'}`}>{T.navCreatives}</button>
            <button onClick={() => handleTabChange('inspiration')} className={`px-6 py-2 rounded-full text-sm font-bold transition-all ${activeTab === 'inspiration' ? 'bg-brand-text text-white shadow-lg' : 'text-brand-text-secondary hover:text-brand-text hover:bg-brand-bg'}`}>{T.navInspiration || 'Inspiration'}</button>
            <button onClick={() => handleTabChange('account')} className={`px-6 py-2 rounded-full text-sm font-bold transition-all ${activeTab === 'account' ? 'bg-brand-text text-white shadow-lg' : 'text-brand-text-secondary hover:text-brand-text hover:bg-brand-bg'}`}>{T.navAccount}</button>
          </nav>

          <div className="flex items-center gap-3 sm:gap-4">
            <div className="flex items-center bg-brand-surface/50 rounded-full border border-brand-secondary/20 p-1">
              <button onClick={() => setLanguage('en')} className={`px-2 sm:px-3 py-1 rounded-full text-xs font-bold transition-all ${language === 'en' ? 'bg-brand-text text-white' : 'text-brand-text-secondary hover:text-brand-text'}`}>EN</button>
              <button onClick={() => setLanguage('fr')} className={`px-2 sm:px-3 py-1 rounded-full text-xs font-bold transition-all ${language === 'fr' ? 'bg-brand-text text-white' : 'text-brand-text-secondary hover:text-brand-text'}`}>FR</button>
            </div>

            {isGuest ? (
              <div className="flex items-center gap-4">
                <div className="hidden sm:block text-right">
                  <div className="text-[10px] font-bold text-brand-text-secondary uppercase tracking-wider">{T.creditsLabel || 'Crédits'}</div>
                  <div className="text-sm font-black text-brand-primary">{userState.credits}</div>
                </div>
                <button onClick={() => setIsTryFreeModalOpen(true)} className="px-4 py-2 sm:px-5 sm:py-2.5 bg-gradient-to-r from-brand-primary to-emerald-500 hover:brightness-110 text-white text-xs font-black uppercase tracking-widest rounded-xl hover:scale-105 active:scale-95 shadow-lg shadow-brand-primary/25 flex items-center gap-1.5 transition-all text-center shrink-0 cursor-pointer">
                  <Icon name="sparkles" className="w-4 h-4 animate-pulse" />
                  <span>{language === 'fr' ? 'Essaie Gratuitement' : 'Try for Free'}</span>
                </button>
              </div>
            ) : (
              <>
                <div className="hidden sm:block text-right">
                  <div className="text-[10px] font-bold text-brand-text-secondary uppercase tracking-wider">{T.creditsLabel}</div>
                  <div className="text-sm font-black text-brand-primary">{userState.credits}</div>
                </div>
                <button onClick={() => handleTabChange('account')} className="w-10 h-10 rounded-full bg-gradient-to-br from-brand-secondary to-brand-text/20 overflow-hidden border-2 border-white shadow-sm hover:scale-110 transition-transform active:scale-95" title={userState.displayName || T.navAccount}>
                  <img src={userState.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${userState.userId}`} alt="Avatar" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                </button>
              </>
            )}
          </div>
        </div>
      </header>

      <main className={`container mx-auto px-4 sm:px-6 ${activeTab === 'creatives' ? 'pt-20 md:pt-24 pb-20 md:pb-4 min-h-screen md:h-screen flex flex-col' : 'pt-24 md:pt-32 pb-24 md:pb-20'}`}>
        {renderContent()}
      </main>

      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-brand-bg/95 backdrop-blur-md border-t border-brand-secondary/20 pb-4">
        <div className="flex items-center justify-around h-16 px-2">
          <button onClick={() => handleTabChange('essayage')} className={`flex flex-col items-center justify-center w-full h-full space-y-1 ${activeTab === 'essayage' ? 'text-brand-primary' : 'text-brand-text-secondary hover:text-brand-text'}`}><Icon name="zap" size={20} /><span className="text-[10px] font-medium">{T.navTryOn || 'Essayage'}</span></button>
          <button onClick={() => setIsPhotoshootModalOpen(true)} className={`flex flex-col items-center justify-center w-full h-full space-y-1 ${isPhotoshootModalOpen ? 'text-brand-primary' : 'text-brand-text-secondary hover:text-brand-text'}`}><Icon name="camera" size={20} /><span className="text-[10px] font-medium">{T.navPhotoshoot}</span></button>
          <button onClick={() => handleTabChange('creatives')} className={`flex flex-col items-center justify-center w-full h-full space-y-1 ${activeTab === 'creatives' ? 'text-brand-primary' : 'text-brand-text-secondary hover:text-brand-text'}`}><Icon name="pen-tool" size={20} /><span className="text-[10px] font-medium">{T.navCreatives}</span></button>
          <button onClick={() => handleTabChange('inspiration')} className={`flex flex-col items-center justify-center w-full h-full space-y-1 ${activeTab === 'inspiration' ? 'text-brand-primary' : 'text-brand-text-secondary hover:text-brand-text'}`}><Icon name="image" size={20} /><span className="text-[10px] font-medium">{T.navInspiration || 'Inspiration'}</span></button>
          <button onClick={() => handleTabChange('account')} className={`flex flex-col items-center justify-center w-full h-full space-y-1 ${activeTab === 'account' ? 'text-brand-primary' : 'text-brand-text-secondary hover:text-brand-text'}`}><Icon name="user" size={20} /><span className="text-[10px] font-medium">{T.navAccount}</span></button>
        </div>
      </nav>

      {isPhotoshootModalOpen && (
        <div id="photoshoot-modal-scroll-container" className="fixed inset-0 z-50 w-full h-full bg-brand-bg animate-in slide-in-from-bottom-10 duration-300 overflow-y-auto overflow-x-hidden">
          <PhotoshootStudio
            userState={userState}
            setUserState={setUserState}
            language={language}
            setLanguage={setLanguage}
            onClose={() => setIsPhotoshootModalOpen(false)}
            onGoToAccount={() => handleTabChange('account')}
            isGuest={isGuest}
            onRequireLogin={() => setAuthModal('login')}
          />
        </div>
      )}

      {isTryFreeModalOpen && (
        <TryFreeModal
          isOpen={isTryFreeModalOpen}
          onClose={() => setIsTryFreeModalOpen(false)}
          language={language}
          onSelectOption={(choice) => {
            if (choice === 'photoshoot') {
              setIsPhotoshootModalOpen(true);
            } else {
              handleTabChange(choice as typeof activeTab);
            }
          }}
        />
      )}

      {/* SSO login + credit scenarios (login / blocked / fallback) */}
      <AuthFlowModal
        mode={authModal}
        language={language}
        shortId={shortId}
        onClose={() => setAuthModal(null)}
        onAddCredits={() => {
          setAuthModal(null);
          handleTabChange('account');
        }}
      />
    </div>
  );
};

export default StudioApp;
