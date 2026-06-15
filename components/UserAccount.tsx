import React, { useState, useEffect } from 'react';
import type { UserState } from '../types';
import { WHATSAPP_SUPPORT_LINK } from '../constants';
import { signIn, signOut } from '@/lib/auth-client';
import { saveUserState } from '../utils/localStorage';

interface UserAccountProps {
    userState: UserState | null;
    setUserState: (state: UserState) => void;
    T: any;
    isGuest?: boolean;
    onRequireLogin?: () => void;
}

export const UserAccount: React.FC<UserAccountProps> = ({ userState, setUserState, T, isGuest, onRequireLogin }) => {
  // Interactive Simulator State
  const [selectedActionIndex, setSelectedActionIndex] = useState(0);
  const [simulatedRuns, setSimulatedRuns] = useState(5);
  const [a6id, setA6id] = useState<string | null>(null);

  // Guests still have a permanent A6 id (anonymous session) — fetch it to display.
  useEffect(() => {
    if (!isGuest) return;
    fetch('/api/credits')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (d?.shortId) setA6id(d.shortId); })
      .catch(() => {});
  }, [isGuest]);

  if (!userState) return null;

  const isFR = T.directorId === 'ID Directeur';

  const handleLocalRecharge = () => {
    const updated = { ...userState, credits: 3 };
    setUserState(updated);
    saveUserState(updated); // Sync to Firestore + localStorage
  };

  const handleSignOut = async () => {
    if (isGuest) {
      if (onRequireLogin) onRequireLogin();
      return;
    }
    try {
      await signOut();
      // Clear specific user state caches
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('a6ko_user_state_v3_')) {
          localStorage.removeItem(key);
        }
      }
      window.location.reload();
    } catch (e) {
      console.error("Sign out fail", e);
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      console.log("[Google Sign In] Redirecting to Better Auth (Google)...");
      await signIn.social({ provider: 'google', callbackURL: '/?resume=1' });
    } catch (e: any) {
      console.error("Google SSO failed:", e);
      if (e.code === 'auth/popup-blocked') {
        alert(
          isFR 
            ? "Le bloqueur de fenêtres pop-up de votre navigateur a bloqué la connexion. Veuillez autoriser les fenêtres pop-up ou ouvrir l'application dans un onglet autonome (hors de l'iframe)." 
            : "The login popup was blocked by your browser. Please allow popups or open the app in a new standalone tab/window to sign in."
        );
      } else if (e.code === 'auth/auth-domain-config-required') {
        alert(
          isFR
            ? "Erreur d'authentification Google: Domaine non configuré. Veuillez utiliser l'application en dehors de l'iframe."
            : "Google Auth Domain missing configuration. Please run the application as a standalone tab."
        );
      } else {
        alert(
          isFR
            ? `Échec de la connexion Google: ${e.message}. Si vous utilisez un navigateur mobile intégré (ex: WhatsApp, Messenger) ou un iframe de prévisualisation, veuillez ouvrir le site dans l'application principale Safari ou Chrome.`
            : `Google Sign In failed: ${e.message}. If you are inside a mobile in-app browser or workspace iframe, please click "Open in New Tab" to use Safari or Chrome.`
        );
      }
    }
  };

  const actions = [
    {
      id: 'photoshoot',
      icon: '📸',
      name: isFR ? 'Séance Photoshoot' : 'Photoshoot Session',
      subtitle: isFR ? '3 crédits par séance photo donnant droit à 3 variantes' : '3 credits per photoshoot session giving 3 custom variations',
      credits: 3,
      price: 300,
    },
    {
      id: 'tryon',
      icon: '👗',
      name: isFR ? 'Essayage Virtuel' : 'Virtual Try-On',
      subtitle: isFR ? '2 crédits par essayage' : '2 credits per virtual try-on',
      credits: 2,
      price: 200,
    },
    {
      id: 'creative',
      icon: '🎨',
      name: isFR ? 'Studio Créatif' : 'Creative Studio',
      subtitle: isFR ? '4 crédits par Visuel + copy' : '4 credits per Visual + copywriting bundle',
      credits: 4,
      price: 400,
    },
    {
      id: 'video',
      icon: '🎬',
      name: isFR ? 'Production Vidéo Publicitaire' : 'Promotional Video Production',
      subtitle: isFR ? '20 crédits par vidéo, à partir de 10 secondes' : '20 credits per video, starting from 10 seconds',
      credits: 20,
      price: 2000,
    }
  ];

  const packs = [
    {
      name: isFR ? 'Pack Découverte' : 'Discovery Starter',
      credits: isFR ? '5 crédits' : '5 credits',
      price: '500 XOF',
      cta: isFR ? 'Essayer l’IA' : 'Try Out',
      desc: isFR ? 'Idéal pour tester l’IA de mode et concevoir vos premiers modèles uniques.' : 'Perfect to experiment with fashion generation & export initial mockups.',
      popular: false,
      badge: isFR ? 'Idéal Débutant' : 'Beginner Friendly',
      color: 'border-brand-secondary/35 bg-brand-surface/60 hover:border-brand-primary/35',
      paymentLink: 'https://pay.moneroo.io/plink_lghzrnpv16qt',
    },
    {
      name: isFR ? '⭐ Pack Créateur' : '⭐ Creator Arsenal',
      credits: isFR ? '30 crédits' : '30 credits',
      price: '2 499 XOF',
      cta: isFR ? 'Commencer' : 'Get Started',
      desc: isFR ? 'Le forfait phare plébiscité par les boutiques de mode et créateurs de contenu.' : 'The premium sweet spot for online sellers and catalog creation.',
      popular: true,
      badge: isFR ? 'Le plus populaire' : 'Most Popular',
      color: 'border-brand-primary bg-gradient-to-br from-brand-primary/5 via-brand-surface to-brand-primary/10 shadow-lg shadow-brand-primary/5 relative hover:border-brand-primary/80 ring-2 ring-brand-primary/20',
      paymentLink: 'https://pay.moneroo.io/plink_yii9m7nssk1h',
    },
    {
      name: isFR ? '🏆 Pack Studio' : '🏆 Professional Studio',
      credits: isFR ? '100 crédits' : '100 credits',
      price: '6 999 XOF',
      cta: isFR ? 'Créer Plus' : 'Create More',
      desc: isFR ? 'Conçu pour les gros volumes de production et le renouvellement de collections.' : 'Tailored for heavy visual volume and complete product lineup launches.',
      popular: false,
      badge: isFR ? 'Meilleur Rapport' : 'Best Value',
      color: 'border-emerald-500 bg-brand-surface/65 hover:border-emerald-400',
      paymentLink: 'https://pay.moneroo.io/plink_3jy7yiy5a3cf',
    },
    {
      name: isFR ? '💜 Pro Mensuel' : '💜 Pro Monthly Plan',
      credits: isFR ? '300 crédits/mois' : '300 credits/month',
      price: '14 999 XOF',
      cta: isFR ? "S'abonner" : 'Subscribe Now',
      desc: isFR ? 'Abonnement récurrent avec GPU prioritaire ultra-rapide et support VIP dédié.' : 'Uncapped priority rendering queues with dedicated premium expert pipeline.',
      popular: false,
      badge: isFR ? 'Mensuel sans limite' : 'Pro Subscription',
      color: 'border-purple-500 bg-gradient-to-br from-purple-500/5 via-brand-surface to-purple-500/10 hover:border-purple-400',
      paymentLink: 'https://pay.moneroo.io/plink_ztqf2j02pjto',
    }
  ];

  const selectedAction = actions[selectedActionIndex];
  const totalSimulatedCredits = selectedAction.credits * simulatedRuns;
  const totalSimulatedPrice = selectedAction.price * simulatedRuns;

  const getWhatsAppUrl = (packName: string, price: string, credits: string) => {
    const text = isFR 
        ? `Bonjour ! Je souhaite commander le "${packName}" (${credits} pour ${price}) pour mon ID Directeur: ${userState.userId}.`
        : `Hello! I would like to order the "${packName}" (${credits} for ${price}) for my ID: ${userState.userId}.`;
    return `${WHATSAPP_SUPPORT_LINK}?text=${encodeURIComponent(text)}`;
  };

  return (
    <div className="w-full max-w-6xl mx-auto py-6 px-4 sm:px-6 lg:px-8 space-y-12">
      
      {/* SECTION HEADER & USER CARD */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        
        {/* Left Side: Main Brand Card */}
        <div className="lg:col-span-12 xl:col-span-7 bg-brand-surface border border-brand-secondary/20 p-6 sm:p-8 rounded-3xl shadow-xl flex flex-col justify-between space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
            <div className="space-y-2 text-left flex-1">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-brand-primary/10 border border-brand-primary/20 text-brand-primary text-xs font-black uppercase tracking-wider">
                {isFR ? 'Mon Profil Créateur' : 'Creator Profile Workspace'}
              </div>
              <h2 className="text-2xl sm:text-3xl font-black text-brand-text tracking-tight uppercase">
                {T.accountTitle}
              </h2>
              <p className="text-sm text-brand-text-secondary leading-relaxed font-light">
                {isFR 
                    ? 'Gérez votre identifiant unique et configurez vos ressources créatives pour alimenter vos campagnes.' 
                    : 'Manage your unique credential workspace and fuel your high-fidelity content campaigns.'}
              </p>
            </div>

            {/* Google Profile Badge if authenticated */}
            {userState.displayName && (
              <div className="flex items-center gap-3 bg-brand-bg/45 p-3 rounded-2xl border border-brand-secondary/15 shrink-0 hover:border-brand-primary/25 transition-colors self-start sm:self-center">
                <img 
                  src={userState.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${userState.userId}`} 
                  alt="Google Profile" 
                  className="w-10 h-10 rounded-full border border-white object-cover"
                  referrerPolicy="no-referrer"
                />
                <div className="text-left leading-tight">
                  <div className="text-xs font-black text-brand-text">{userState.displayName}</div>
                  <div className="text-[9px] text-brand-primary font-bold uppercase tracking-wider break-all max-w-[150px]">{userState.email}</div>
                </div>
              </div>
            )}
          </div>

          <div className="bg-brand-bg/60 p-4 sm:p-6 rounded-2xl border border-brand-secondary/15 text-left flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <label className="block text-[10px] sm:text-xs font-bold text-brand-text-secondary uppercase mb-1.5 tracking-wider">
                {isFR ? 'Votre ID' : 'Your ID'}
              </label>
              <div className="text-xl sm:text-3xl font-mono font-black text-brand-primary tracking-widest break-all select-all">
                {isGuest ? (a6id || userState.userId) : userState.userId}
              </div>
            </div>

            {isGuest ? (
              <button
                onClick={() => (onRequireLogin ? onRequireLogin() : handleGoogleSignIn())}
                className="flex items-center gap-2 px-4 py-2.5 bg-brand-text text-white hover:bg-brand-primary rounded-xl text-xs font-bold uppercase tracking-wider transition-all shadow-md hover:scale-[1.02] active:scale-95 cursor-pointer max-w-max self-start sm:self-center"
              >
                <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335"/>
                </svg>
                <span>{isFR ? "Créer un compte / Se connecter" : "Sign in / Create account"}</span>
              </button>
            ) : (
              <button
                onClick={handleSignOut}
                className="px-4 py-2 bg-brand-primary/10 hover:bg-brand-primary/20 border border-brand-primary/20 text-brand-primary rounded-xl text-xs font-bold uppercase tracking-wider transition-all active:scale-95 cursor-pointer max-w-max self-start sm:sm:self-center"
              >
                🚪 {isFR ? "Déconnexion" : "Sign Out"}
              </button>
            )}
          </div>

          {isGuest && (
            <div className="text-[11px] text-brand-text-secondary leading-normal bg-brand-primary/5 border border-brand-primary/10 p-3.5 rounded-2xl">
              <p className="font-semibold text-brand-primary mb-1">
                {isFR ? "💡 Pourquoi créer un compte ?" : "💡 Why create an account?"}
              </p>
              <p className="font-light">
                {isFR
                  ? "Permet de synchroniser vos crédits et silhouettes à travers tous vos appareils (PC/mobile). Votre identifiant unique s'adapte automatiquement sans perte."
                  : "Syncs your credits and master styles flawlessly across all mobile or desktop views. Standard cookies and fingerprint limits are linked to your identity automatically."}
              </p>
            </div>
          )}
        </div>

        {/* Right Side: Credit Gauge Card */}
        <div className="lg:col-span-12 xl:col-span-5 bg-gradient-to-br from-brand-primary/20 via-brand-surface to-emerald-500/10 border border-brand-primary/25 p-6 sm:p-8 rounded-3xl shadow-xl flex flex-col justify-between">
          {isGuest ? (
            /* Guests: no misleading balance — invite sign-in to unlock free credits */
            <div className="flex flex-col justify-center h-full text-left gap-4 py-6">
              <div className="space-y-1">
                <span className="text-xs font-mono tracking-widest uppercase text-brand-primary font-bold">
                  {isFR ? 'Crédits' : 'Credits'}
                </span>
                <h3 className="text-lg font-black text-brand-text uppercase tracking-tight">
                  {isFR ? 'Débloquez vos crédits gratuits' : 'Unlock your free credits'}
                </h3>
              </div>
              <p className="text-sm text-brand-text-secondary font-light leading-relaxed">
                {isFR
                  ? 'Connectez-vous pour activer vos crédits gratuits et conserver vos créations sur tous vos appareils.'
                  : 'Sign in to activate your free credits and keep your creations across all your devices.'}
              </p>
              <button
                onClick={() => (onRequireLogin ? onRequireLogin() : handleGoogleSignIn())}
                className="w-full text-center bg-brand-primary text-white font-bold py-3.5 px-4 rounded-xl hover:brightness-110 active:scale-[0.98] transition-all text-xs uppercase tracking-widest cursor-pointer shadow-md shadow-brand-primary/20"
              >
                {isFR ? 'Créer un compte / Se connecter' : 'Sign in / Create account'}
              </button>
            </div>
          ) : (
            <>
              <div className="text-left space-y-1">
                <span className="text-xs font-mono tracking-widest uppercase text-brand-primary font-bold">
                  {isFR ? 'Crédits Restants' : 'Available Balance'}
                </span>
                <h3 className="text-lg font-black text-brand-text uppercase tracking-tight">
                  {isFR ? 'Votre Solde Actif' : 'Active Account Balance'}
                </h3>
              </div>

              <div className="my-6 text-center select-none py-4 relative group">
                <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 w-32 h-32 bg-brand-primary/10 rounded-full blur-2xl mx-auto -z-10 group-hover:bg-brand-primary/15 transition-all duration-500"></div>
                <div className="text-6xl sm:text-7xl font-black text-brand-primary tracking-tighter transition-transform group-hover:scale-105 duration-300">
                  {userState.credits}
                </div>
                <div className="text-xs uppercase tracking-widest font-black text-brand-text-secondary mt-2">
                  {isFR ? 'Crédits de Création' : 'Creation Credits'}
                </div>
              </div>

              <div className="flex gap-2">
                <a
                  href="#packs"
                  className="w-full text-center bg-brand-primary text-white font-bold py-3.5 px-4 rounded-xl hover:brightness-110 active:scale-[0.98] transition-all text-xs uppercase tracking-widest cursor-pointer shadow-md shadow-brand-primary/20"
                >
                  ⚡ {isFR ? 'Ajouter des crédits' : 'Add credits'}
                </a>
              </div>
            </>
          )}
        </div>

      </div>

      {/* SECTION 1 — COÛT PAR ACTION & INTERACTIVE BUDGET ESTIMATOR */}
      <div className="space-y-6">
        <div className="text-left space-y-1 border-l-4 border-brand-primary pl-4">
          <h3 className="text-xs font-black tracking-widest text-brand-primary uppercase font-mono">
            Section 1 — {isFR ? 'Coût par action' : 'Service Rate Sheets'}
          </h3>
          <h2 className="text-xl sm:text-2xl font-black text-brand-text uppercase tracking-tight">
            {isFR ? 'Tarification transparente & flexible' : 'No hidden fees. Pay only for outputs.'}
          </h2>
          <p className="text-sm text-brand-text-secondary font-light max-w-3xl">
            {isFR 
              ? 'Découvrez combien coûte chaque génération de médias intelligents. Nos outils de pointe synthétisent vos assets haute couture en quelques secondes.' 
              : 'Discover exactly how many credits and equivalent local rates each automated design run consumes.'}
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
          
          {/* Rate Sheet Table */}
          <div className="lg:col-span-12 xl:col-span-7 bg-brand-surface border border-brand-secondary/20 rounded-3xl overflow-hidden shadow-xl">
            <div className="p-5 sm:px-6 bg-brand-surface/40 border-b border-brand-secondary/15 flex items-center justify-between">
              <span className="text-sm font-bold text-brand-text">
                {isFR ? 'Liste des Services IA' : 'Available Generative Services'}
              </span>
              <span className="text-xs font-mono text-brand-text-secondary uppercase">
                {isFR ? '4 outils actifs' : '4 tools active'}
              </span>
            </div>
            
            <div className="divide-y divide-brand-secondary/10">
              {actions.map((action, idx) => (
                <div 
                  key={action.id}
                  onClick={() => setSelectedActionIndex(idx)}
                  className={`p-4 sm:p-5 flex items-center justify-between gap-4 transition-all cursor-pointer ${
                    selectedActionIndex === idx 
                      ? 'bg-brand-primary/5 border-l-4 border-brand-primary' 
                      : 'hover:bg-brand-surface/70 border-l-4 border-transparent'
                  }`}
                >
                  <div className="flex items-center gap-3.5">
                    <span className="text-2xl select-none">{action.icon}</span>
                    <div className="text-left">
                      <h4 className="text-sm sm:text-base font-black text-brand-text tracking-tight">
                        {action.name}
                      </h4>
                      <p className="text-xs text-brand-text-secondary font-light hidden sm:block">
                        {action.subtitle}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-6 text-right shrink-0">
                    <div>
                      <div className="text-sm sm:text-base font-black text-brand-primary">
                        {action.credits} {isFR ? (action.credits > 1 ? 'crédits' : 'crédit') : (action.credits > 1 ? 'credits' : 'credit')}
                      </div>
                      <div className="text-[10px] text-brand-text-secondary uppercase tracking-widest font-mono">
                        {isFR ? 'par run' : 'per run'}
                      </div>
                    </div>
                    
                    <div className="w-24">
                      <div className="text-sm sm:text-base font-extrabold text-brand-text font-mono">
                        {action.price} XOF
                      </div>
                      <div className="text-[10px] text-brand-text-secondary uppercase tracking-widest font-mono">
                        {isFR ? 'Équivalence' : 'Value'}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Interactive Calculator Simulator */}
          <div className="lg:col-span-12 xl:col-span-5 bg-gradient-to-br from-brand-surface to-brand-secondary/5 border-2 border-brand-secondary/15 rounded-3xl p-6 sm:p-8 flex flex-col justify-between shadow-xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 bg-brand-primary/3 rounded-full blur-2xl -z-10"></div>
            
            <div className="text-left space-y-2">
              <span className="inline-block px-2.5 py-0.5 rounded bg-brand-primary/10 text-brand-primary text-[10px] font-bold tracking-widest uppercase font-mono animate-pulse">
                {isFR ? 'Estimateur Dynamique' : 'Instant Estimate'}
              </span>
              <h3 className="text-lg font-black text-brand-text uppercase tracking-tight">
                {isFR ? 'Simulateur de Budget' : 'Project Cost Simulator'}
              </h3>
              <p className="text-xs text-brand-text-secondary leading-relaxed font-light">
                {isFR 
                  ? 'Estimez vos coûts en fonction des volumes de production souhaités pour vos réseaux sociaux.' 
                  : 'Adjust volume slider to view overall estimated credit consumption and physical pricing immediately.'}
              </p>
            </div>

            {/* Current Item Indicator */}
            <div className="my-6 p-4 rounded-2xl bg-brand-bg/60 border border-brand-secondary/15 text-left flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="text-xl select-none">{selectedAction.icon}</span>
                <div>
                  <h4 className="text-xs font-black uppercase text-brand-text">{selectedAction.name}</h4>
                  <span className="text-[10px] font-mono text-brand-primary font-bold">
                    {selectedAction.credits} {isFR ? (selectedAction.credits > 1 ? 'crédits' : 'crédit') : (selectedAction.credits > 1 ? 'credits' : 'credit')} / {selectedAction.price} XOF
                  </span>
                </div>
              </div>
              <div className="text-right">
                <div className="text-[10px] uppercase font-bold text-brand-text-secondary tracking-widest">{isFR ? 'Quantité' : 'Runs'}</div>
                <div className="text-lg font-bold text-brand-primary font-mono">{simulatedRuns}x</div>
              </div>
            </div>

            {/* Controls (Custom Incrementor Slider) */}
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-4">
                <button 
                  onClick={() => setSimulatedRuns(prev => Math.max(1, prev - 1))}
                  className="w-10 h-10 rounded-xl bg-brand-secondary/30 text-brand-text hover:bg-brand-secondary/50 flex items-center justify-center font-bold text-lg select-none active:scale-95 transition-all"
                >
                  -
                </button>
                <input 
                  type="range"
                  min="1"
                  max="50"
                  value={simulatedRuns}
                  onChange={(e) => setSimulatedRuns(parseInt(e.target.value))}
                  className="w-full accent-brand-primary cursor-pointer"
                />
                <button 
                  onClick={() => setSimulatedRuns(prev => Math.min(50, prev + 1))}
                  className="w-10 h-10 rounded-xl bg-brand-secondary/30 text-brand-text hover:bg-brand-secondary/50 flex items-center justify-center font-bold text-lg select-none active:scale-95 transition-all"
                >
                  +
                </button>
              </div>

              {/* Total Live Computation */}
              <div className="pt-4 border-t border-brand-secondary/10 grid grid-cols-2 gap-4 text-left">
                <div className="p-3 bg-brand-bg/40 rounded-xl border border-brand-secondary/10">
                  <span className="text-[9px] uppercase tracking-widest text-brand-text-secondary font-bold block">{isFR ? 'Total Crédits' : 'Total Credits'}</span>
                  <span className="text-xl font-mono font-black text-brand-primary">
                    {totalSimulatedCredits} {isFR ? (totalSimulatedCredits > 1 ? 'crédits' : 'crédit') : (totalSimulatedCredits > 1 ? 'credits' : 'credit')}
                  </span>
                </div>
                <div className="p-3 bg-brand-bg/40 rounded-xl border border-brand-secondary/10">
                  <span className="text-[9px] uppercase tracking-widest text-brand-text-secondary font-bold block">{isFR ? 'Coût Estimé' : 'Estimated Cost'}</span>
                  <span className="text-xl font-mono font-black text-brand-text">{totalSimulatedPrice.toLocaleString()} XOF</span>
                </div>
              </div>
            </div>

          </div>

        </div>
      </div>

      {/* SECTION 2 — 4 PACKS AVEC CTAS DIRECT WHATSAPP */}
      <div id="packs" className="space-y-6 pt-4">
        <div className="text-left space-y-1 border-l-4 border-brand-primary pl-4">
          <h3 className="text-xs font-black tracking-widest text-brand-primary uppercase font-mono">
            Section 2 — {isFR ? 'Offres & Recharges' : 'Credit Packages'}
          </h3>
          <h2 className="text-xl sm:text-2xl font-black text-brand-text uppercase tracking-tight">
            {isFR ? 'Choisissez votre recharge de crédits' : 'Acquire top-grade creation fuels'}
          </h2>
          <p className="text-sm text-brand-text-secondary font-light max-w-3xl">
            {isFR 
              ? 'Sélectionnez le pack idéal adapté à vos besoins de création. Contactez notre support WhatsApp en un clic pour créditer instantanément votre identifiant.' 
              : 'Select your preferred plan. Once finalized, our agent integrates your account credits balance in seconds.'}
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 items-stretch">
          {packs.map((pack, idx) => (
            <div 
              key={idx}
              className={`rounded-3xl border p-5 sm:p-6 flex flex-col justify-between space-y-6 transition-all duration-300 hover:shadow-2xl ${
                pack.popular 
                  ? 'hover:scale-[1.03] hover:shadow-brand-primary/10' 
                  : 'hover:scale-[1.01]'
              } ${pack.color}`}
            >
              <div className="space-y-4">
                {/* Badge Header */}
                <div className="flex items-center justify-between gap-2">
                  <span className={`text-[9px] uppercase font-mono font-black px-2.5 py-0.5 rounded-full ${
                    pack.popular 
                      ? 'bg-brand-primary text-white animate-pulse' 
                      : 'bg-brand-secondary/50 text-brand-text-secondary'
                  }`}>
                    {pack.badge}
                  </span>
                  
                  {pack.popular && (
                    <span className="flex h-2 w-2 relative">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand-primary opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-brand-primary"></span>
                    </span>
                  )}
                </div>

                {/* Name & Title */}
                <div className="space-y-1 text-left">
                  <h4 className="text-lg font-black text-brand-text uppercase tracking-tight leading-tight">
                    {pack.name}
                  </h4>
                  <p className="text-xs text-brand-text-secondary leading-relaxed font-light min-h-[50px]">
                    {pack.desc}
                  </p>
                </div>

                {/* Metrics */}
                <div className="pt-2 text-left space-y-1.5 border-t border-brand-secondary/10">
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-black text-brand-primary tracking-tighter">
                      {pack.credits.split(' ')[0]}
                    </span>
                    <span className="text-xs uppercase tracking-wider font-extrabold text-brand-text-secondary">
                      {pack.credits.split(' ').slice(1).join(' ') || 'crédits'}
                    </span>
                  </div>
                  
                  <div className="flex items-baseline gap-1">
                    <span className="text-xl font-black text-brand-text font-mono">
                      {pack.price}
                    </span>
                  </div>
                </div>
              </div>

              {/* Action Button */}
              <div className="flex flex-col gap-2">
                <a 
                  href={`${pack.paymentLink}?reference=${userState.userId}`}
                  target="_blank" 
                  rel="noopener noreferrer"
                  className={`w-full py-3 px-4 rounded-xl font-black uppercase tracking-wider text-xs transition-all text-center flex items-center justify-center gap-1.5 select-none ${
                    pack.popular 
                      ? 'bg-brand-primary text-white hover:bg-brand-primary/95 shadow-lg shadow-brand-primary/20 hover:scale-[1.02]' 
                      : 'bg-brand-secondary text-brand-text hover:bg-brand-secondary/80 hover:text-brand-primary'
                  }`}
                >
                  <span>🚀 {isFR ? 'Payer en ligne' : 'Pay Online'}</span>
                </a>
                
                <a 
                  href={getWhatsAppUrl(pack.name.replace(/⭐|🏆|💜/g, '').trim(), pack.price, pack.credits)}
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="w-full py-1.5 px-3 rounded-lg text-[10px] font-bold text-center text-brand-text-secondary hover:text-green-500 hover:bg-green-500/5 transition-all flex items-center justify-center gap-1 hover:underline select-none"
                >
                  <svg className="w-3 h-3 text-green-500 fill-current" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path d="M12.012 2c-5.506 0-9.989 4.478-9.99 9.984a9.96 9.96 0 0 0 1.333 4.993L2 22l5.233-1.371a9.936 9.936 0 0 0 4.777 1.22c5.507 0 9.99-4.478 9.99-9.985C22.001 6.478 17.518 2 12.012 2zm6.136 14.156c-.252.712-1.461 1.304-2.01 1.402-.497.09-1.15.163-3.32-.737-2.774-1.15-4.568-3.974-4.707-4.159-.138-.184-1.12-1.49-1.119-2.842.001-1.352.708-2.015.96-2.277.251-.262.55-.328.733-.328.184 0 .368.002.527.01.163.007.382-.062.598.459.222.535.759 1.854.825 1.986.066.13.111.285.022.46-.089.175-.133.284-.265.438-.133.153-.277.34-.397.459-.133.13-.273.272-.118.537.155.263.684 1.127 1.465 1.821.996.883 1.836 1.157 2.094 1.288.258.13.407.11.558-.06.151-.175.648-.755.823-1.01.175-.251.349-.208.59-.12.24.088 1.524.718 1.786.85.263.13.438.196.505.31.066.11.066.652-.187 1.365z"/>
                  </svg>
                  <span>{isFR ? 'Acheter via WhatsApp' : 'Buy via WhatsApp'}</span>
                </a>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* FOOTER DIRECT SUPPORT CALLOUT */}
      <div className="pt-6 border-t border-brand-secondary/10 text-xs sm:text-sm text-brand-text-secondary flex flex-col sm:flex-row items-center justify-between gap-4">
        <p>{T.needHelp}</p>
        <p className="font-mono text-[10px] sm:text-xs">
          ID: <span className="font-bold text-brand-primary">{userState.userId}</span>
        </p>
      </div>

    </div>
  );
};
