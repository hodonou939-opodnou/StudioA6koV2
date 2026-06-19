import React, { useState, useCallback, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Icon } from './Icon';
import { LoadingSpinner } from './LoadingSpinner';
import { generateFashionShoot, generateShopInfo } from '../services/geminiService';
import { FaceProfileCard } from './FaceProfileCard';
import { getRecentModels, addRecentModel, getRecentGarments, addRecentGarment, RecentImage } from '../utils/recentUploads';
import { get, set } from 'idb-keyval';
import { textContent, BACKUP_API_KEYS, WHATSAPP_SUPPORT_LINK, buildSupportLink } from '../constants';
import { PaywallModal } from './PaywallModal';
import { GARMENT_PROMPTS } from '../garmentPrompts';
import { isAdminUser, saveUserState, identifyUser } from '../utils/localStorage';
import type { GenerationOptions, Asset, UserState, ShopInfo } from '../types';

interface EssayageVirtuelProps {
    userState: UserState | null;
    setUserState: React.Dispatch<React.SetStateAction<UserState | null>>;
    language: 'en' | 'fr';
    setLanguage: (lang: 'en' | 'fr') => void;
    isGuest?: boolean;
    onRequireLogin?: () => void;
}


const isValidationError = (msg: string | null): boolean => {
    if (!msg) return false;
    const validationMessages = [
        "Please upload your photo to try the garments on.",
        "Veuillez télécharger votre photo pour l'essayage.",
        "Please upload a photo of the clothing item.",
        "Veuillez télécharger une photo du vêtement.",
        "Insufficient credits. Please top up your account.",
        "Crédits insuffisants. Veuillez en acheter de nouveaux."
    ];
    return validationMessages.includes(msg);
};

const aspectClasses: Record<string, string> = {
    '1:1': 'aspect-square max-h-[500px]',
    '9:16': 'aspect-[9/16] max-h-[600px]',
    '16:9': 'aspect-[16/9] max-h-[450px]',
    '4:5': 'aspect-[4/5] max-h-[550px]',
    '3:4': 'aspect-[3/4] max-h-[550px]'
};


export const EssayageVirtuel: React.FC<EssayageVirtuelProps> = ({
    userState,
    setUserState,
    language,
    isGuest,
    onRequireLogin
}) => {
    const T = textContent[language];
    
    // Core inputs state
    const [modelImage, setModelImage] = useState<{ base64: string, mimeType: string } | null>(null);
    const [hasFace, setHasFace] = useState(false);
    const [modelFileName, setModelFileName] = useState<string>('');
    const [recentModels, setRecentModels] = useState<RecentImage[]>([]);
    
    // Garment selection state
    const [customGarmentDescription, setCustomGarmentDescription] = useState<string>('');
    
    const [garmentImage, setGarmentImage] = useState<{ base64: string, mimeType: string } | null>(null);
    const [garmentFileName, setGarmentFileName] = useState<string>('');
    const [recentGarments, setRecentGarments] = useState<RecentImage[]>([]);

    // Posture and backgrounds
    const [pose, setPose] = useState<string>('Editorial');
    const [environment, setEnvironment] = useState<string>('Studio');
    const [heightCm, setHeightCm] = useState<string>(() => localStorage.getItem('lastHeightCm') || '');
    const [isSitting, setIsSitting] = useState<boolean>(false);

    // Keep the last entered height stored at each change
    useEffect(() => {
        localStorage.setItem('lastHeightCm', heightCm);
    }, [heightCm]);

    // UI Feedback & Generation States
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [loadingMessage, setLoadingMessage] = useState<string>('');
    const [error, setError] = useState<string | null>(null);
    const [tryOnResult, setTryOnResult] = useState<Asset | null>(null);
    const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
    const [isShareOpen, setIsShareOpen] = useState<boolean>(false);
    const [activeShareChannel, setActiveShareChannel] = useState<'instagram' | 'tiktok' | null>(null);
    const [tryOnAspectRatio, setTryOnAspectRatio] = useState<'1:1' | '9:16' | '16:9' | '4:5' | '3:4'>(
        () => (localStorage.getItem('lastTryOnAspectRatio') as any) || '1:1'
    );
    const [isPaywallOpen, setIsPaywallOpen] = useState<boolean>(false);

    // Keep try-on aspect ratio stored at each change
    useEffect(() => {
        localStorage.setItem('lastTryOnAspectRatio', tryOnAspectRatio);
    }, [tryOnAspectRatio]);

    // After SSO login: restore the uploaded photos + description so the user
    // continues exactly where they left off (no re-uploading).
    useEffect(() => {
        if (!isGuest && userState && localStorage.getItem('a6ko_pending_tryon_on_login') === 'true') {
            localStorage.removeItem('a6ko_pending_tryon_on_login');
            get('a6ko_resume_tryon')
                .then((saved: any) => {
                    if (saved?.modelImage) setModelImage(saved.modelImage);
                    if (saved?.garmentImage) setGarmentImage(saved.garmentImage);
                    if (saved?.customGarmentDescription) setCustomGarmentDescription(saved.customGarmentDescription);
                })
                .catch(() => {})
                .finally(() => set('a6ko_resume_tryon', undefined).catch(() => {}));
        }
    }, [isGuest, userState]);

    // Reset share channel when modal is toggled off
    useEffect(() => {
        if (!isShareOpen) {
            setActiveShareChannel(null);
        }
    }, [isShareOpen]);
    const [isDownloading, setIsDownloading] = useState<boolean>(false);
    const [downloadSuccess, setDownloadSuccess] = useState<string>('');
    const [isDownloadAssistOpen, setIsDownloadAssistOpen] = useState<boolean>(false);
    const [downloadAssistUrl, setDownloadAssistUrl] = useState<string>('');
    const [copiedLink, setCopiedLink] = useState<boolean>(false);
    const [copied, setCopied] = useState<boolean>(false);

    // Boutique a6ko generator states
    const [isGeneratingShopInfo, setIsGeneratingShopInfo] = useState<boolean>(false);
    const [shopInfo, setShopInfo] = useState<ShopInfo | null>(null);
    const [shopInfoError, setShopInfoError] = useState<string>('');
    const [copiedField, setCopiedField] = useState<string>('');

    // Drag-and-drop feedback
    const [isDraggingModel, setIsDraggingModel] = useState(false);
    const [isDraggingGarment, setIsDraggingGarment] = useState(false);

    const currentApiKey = BACKUP_API_KEYS[0];

    // Load recent history from IndexedDB on mount
    useEffect(() => {
        getRecentModels().then(setRecentModels);
        getRecentGarments().then(setRecentGarments);
    }, []);

    // Scroll to results once generation completes
    const resultRef = useRef<HTMLDivElement>(null);
    useEffect(() => {
        if (tryOnResult && !isLoading) {
            resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    }, [tryOnResult, isLoading]);

    // File helpers for models
    const handleModelUpload = useCallback((file: File) => {
        const reader = new FileReader();
        reader.onloadend = () => {
            const base64Data = (reader.result as string).split(',')[1];
            const imgData = { base64: base64Data, mimeType: file.type };
            setModelImage(imgData);
            setModelFileName(file.name);
            addRecentModel(imgData, file.name).then(setRecentModels);
        };
        reader.readAsDataURL(file);
    }, []);

    const handleModelFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) handleModelUpload(file);
    };

    // File helpers for garments
    const handleGarmentUpload = useCallback((file: File) => {
        const reader = new FileReader();
        reader.onloadend = () => {
            const base64Data = (reader.result as string).split(',')[1];
            const imgData = { base64: base64Data, mimeType: file.type };
            setGarmentImage(imgData);
            setGarmentFileName(file.name);
            addRecentGarment(imgData, undefined, file.name).then(setRecentGarments);
        };
        reader.readAsDataURL(file);
    }, []);

    const handleGarmentFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) handleGarmentUpload(file);
    };

    const handleDownload = async () => {
        if (!tryOnResult || isDownloading) return;
        setIsDownloading(true);
        setDownloadSuccess('');
        const successText = language === 'fr' ? "Téléchargé avec succès !" : "Downloaded successfully!";
        try {
            const dataUrl = tryOnResult.url.startsWith('data:')
                ? tryOnResult.url
                : tryOnResult.base64 ? `data:image/png;base64,${tryOnResult.base64}` : tryOnResult.url;
            const resp = await fetch(dataUrl);
            const blob = await resp.blob();
            const file = new File([blob], `StudioA6ko-essayage-${Date.now()}.png`, { type: blob.type || 'image/png' });
            const objectUrl = URL.createObjectURL(blob);
            const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

            // Mobile: the share sheet exposes "Save Image" — the reliable iOS path.
            if (isMobile && navigator.canShare && navigator.canShare({ files: [file] })) {
                try {
                    await navigator.share({ files: [file] });
                    URL.revokeObjectURL(objectUrl);
                    setIsDownloading(false);
                    return;
                } catch { /* dismissed → fall through */ }
            }
            if (isMobile) {
                window.open(objectUrl, '_blank'); // long-press → Save Image
            } else {
                const link = document.createElement('a');
                link.href = objectUrl;
                link.download = file.name;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
            }
            setDownloadSuccess(successText);
            setTimeout(() => setDownloadSuccess(''), 4000);
            setTimeout(() => URL.revokeObjectURL(objectUrl), 5000);
        } catch (e) {
            console.error("Essayage download failed:", e);
            try { window.open(tryOnResult.url, '_blank'); setDownloadSuccess(successText); setTimeout(() => setDownloadSuccess(''), 4000); } catch {}
        } finally {
            setIsDownloading(false);
        }
    };

    const handleCopy = async () => {
        if (!tryOnResult) return;
        const textToCopy = tryOnResult.url;
        try {
            if (navigator.clipboard && navigator.clipboard.writeText) {
                await navigator.clipboard.writeText(textToCopy);
                setCopied(true);
                setTimeout(() => setCopied(false), 2500);
            } else {
                throw new Error("Clipboard API not available or writeText blocked");
            }
        } catch (err) {
            console.warn('Navigator clipboard failed, trying fallback textarea selection', err);
            try {
                const textArea = document.createElement("textarea");
                textArea.value = textToCopy;
                textArea.style.position = "fixed";
                textArea.style.top = "0";
                textArea.style.left = "0";
                textArea.style.opacity = "0";
                document.body.appendChild(textArea);
                textArea.focus();
                textArea.select();
                const successful = document.execCommand('copy');
                document.body.removeChild(textArea);
                if (successful) {
                    setCopied(true);
                    setTimeout(() => setCopied(false), 2500);
                } else {
                    throw new Error("execCommand copy failed");
                }
            } catch (fallbackErr) {
                console.error('Fallback copy failed', fallbackErr);
                alert(language === 'en' 
                    ? `Copy block was rejected. Please copy this link manually:\n\n${textToCopy}` 
                    : `Copie automatique refusée. Veuillez copier ce lien manuellement :\n\n${textToCopy}`
                );
            }
        }
    };

    const handleGenerateShopInfo = async () => {
        if (!tryOnResult || isGeneratingShopInfo) return;
        setIsGeneratingShopInfo(true);
        setShopInfoError('');
        setShopInfo(null);
        try {
            const desc = tryOnResult.metadata?.garmentDescription || tryOnResult.metadata?.prompt || "Tenue africaine élégante";
            const labels = tryOnResult.metadata?.garmentLabels || [];
            
            const result = await generateShopInfo(desc, labels, currentApiKey);
            setShopInfo(result);
        } catch (e: any) {
            console.error("Failed to generate shop listing info:", e);
            setShopInfoError(language === 'fr' 
                ? "Impossible de générer les informations boutique. Veuillez réessayer." 
                : "Failed to generate shop listing information. Please try again.");
        } finally {
            setIsGeneratingShopInfo(false);
        }
    };

    const handleShare = async () => {
        if (!tryOnResult) return;
        const msg = language === 'fr'
            ? "Regarde mon essayage virtuel réalisé avec Studio A6ko ✨ https://studio.a6ko.com"
            : "Check out my virtual try-on made with Studio A6ko ✨ https://studio.a6ko.com";
        const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

        if (isMobile && navigator.share) {
            try {
                const dataUrl = tryOnResult.url.startsWith('data:')
                    ? tryOnResult.url
                    : tryOnResult.base64 ? `data:image/png;base64,${tryOnResult.base64}` : tryOnResult.url;
                const resp = await fetch(dataUrl);
                const blob = await resp.blob();
                const file = new File([blob], `StudioA6ko-essayage-${Date.now()}.png`, { type: blob.type || 'image/png' });
                if (navigator.canShare && navigator.canShare({ files: [file] })) {
                    await navigator.share({ title: 'Studio A6ko', text: msg, files: [file] });
                    return;
                }
                await navigator.share({ title: 'Studio A6ko', text: msg, url: 'https://studio.a6ko.com' });
                return;
            } catch (err) {
                console.log("Native share dismissed", err);
            }
        }
        setIsShareOpen(!isShareOpen);
    };

    // Main try-on handler
    const handleRunTryOn = async () => {
        if (!userState) return;

        // A saved face capture counts as the subject (the server uses it) — only
        // block when there is NEITHER a captured face NOR an uploaded photo.
        if (!modelImage && !hasFace) {
            setError(language === 'en' ? "Capture your face or upload a photo to try the garments on." : "Capturez votre visage ou téléchargez une photo pour l'essayage.");
            return;
        }

        if (!garmentImage) {
            setError(language === 'en' ? "Please upload a photo of the clothing item." : "Veuillez télécharger une photo du vêtement.");
            return;
        }

        // Free mode: clicking Lancer while logged out opens the SSO popup, then resumes here after login.
        if (isGuest) {
            localStorage.setItem('a6ko_pending_tryon_on_login', 'true');
            try {
                sessionStorage.setItem('a6ko_login_feature', 'essayage');
                sessionStorage.setItem('a6ko_resume', '1');
            } catch {}
            // Preserve the uploaded photos + description so they're restored after login.
            set('a6ko_resume_tryon', { modelImage, garmentImage, customGarmentDescription }).catch(() => {});
            onRequireLogin?.();
            return;
        }

        const finalGarmentPrompt = customGarmentDescription.trim() || "A beautiful custom clothing piece from the uploaded photo, draped with gorgeous flow and rich details.";

        const cost = 2; // Fixed low cost for try-on
        if (userState.credits < cost && !isAdminUser(userState.userId)) {
            setError(language === 'en' ? "Insufficient credits. Please top up your account." : "Crédits insuffisants. Veuillez en acheter de nouveaux.");
            setIsPaywallOpen(true);
            return;
        }

        // Deduct credits
        setUserState(prev => {
            if (!prev) return prev;
            if (isAdminUser(prev.userId)) return prev;
            const updated = { ...prev, credits: Math.max(0, prev.credits - cost) };
            saveUserState(updated);
            return updated;
        });

        setIsLoading(true);
        setError(null);
        setTryOnResult(null);

        const onProgress = (msg: string) => {
            setLoadingMessage(msg);
        };

        try {
            const generationOptions: GenerationOptions = {
                intent: 'Mode' as any,
                model: {
                    name: modelFileName || 'User Model',
                    image: modelImage,
                    heightCm: heightCm ? Number(heightCm) : undefined,
                    isSitting: isSitting,
                },
                garment: {
                    description: finalGarmentPrompt,
                    image: garmentImage,
                },
                companion: { enabled: false, description: '', image: null },
                // High-class editorial look by default (no UI knob) — flattering
                // cinematic light + analog film grain for maximum realism / less "AI look".
                pose: (isSitting ? 'Sitting Pose' : 'Editorial') as any,
                backgroundType: 'Solid Color' as any,
                environment: environment as any,
                colorPalette: 'Vibrant',
                cameraAngle: 'Eye Level' as any,
                cameraAxis: 'Front' as any,
                cameraDistance: 'Full Body' as any,
                cameraLens: '85mm (Portrait/Bokeh)' as any,
                lightingSetup: 'Rembrandt' as any,
                lightingTemperature: 'Neutral (5500K)' as any,
                lightingTime: 'Golden Hour' as any,
                lightingMood: 'Soft & Flattering' as any,
                filmGrain: 'Analog Film' as any,
                postProcessing: 'Vibrant Colors' as any,
                tattoos: 'none' as any,
                // Auto-style a tasteful wristwatch suited to the detected person &
                // outfit (the image model infers gender/style) — no UI knob.
                accessories: { shoes: '', watch: "an elegant, tasteful wristwatch that naturally suits the subject's gender and the outfit style", jewelry: '', other: '' },
                variants: 1,
                aspectRatio: tryOnAspectRatio,
                watermark: false,
                isBlackAndWhite: false,
            };

            const assets = await generateFashionShoot(generationOptions, onProgress, currentApiKey, 'ESSAYAGE');
            if (assets && assets.length > 0) {
                setTryOnResult(assets[0]);
            } else {
                throw new Error("No output assets returned.");
            }
        } catch (err: any) {
            console.error("Try-on failed", err);
            const msg = String(err?.message || '');
            // Auth / credit issues are handled globally (login popup / paywall) — don't
            // also show a scary "contact support" message for those.
            if (msg === 'AUTH_REQUIRED') {
                setError(language === 'en' ? 'Please sign in, then capture your face (or upload a photo) and add a garment.' : "Connectez-vous, puis capturez votre visage (ou importez une photo) et ajoutez un vêtement.");
            } else if (msg !== 'INSUFFICIENT_CREDITS') {
                setError(err?.message || (language === 'en' ? "Generation error. Please verify your connection and try again." : "Erreur de génération. Vérifiez votre connexion et réessayez."));
            }
            // Refund
            setUserState(prev => {
                if (!prev) return prev;
                if (isAdminUser(prev.userId)) return prev;
                const updated = { ...prev, credits: prev.credits + cost };
                saveUserState(updated);
                return updated;
            });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="container mx-auto max-w-6xl px-4 md:px-0 animate-in fade-in duration-500">
            {/* Page Header */}
            <div className="text-center md:text-left mb-10 space-y-4">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-bold text-brand-primary bg-brand-primary/10 rounded-full uppercase tracking-wider">
                    <Icon name="zap" className="w-3 h-3" />
                    {language === 'en' ? 'Instant Fit' : 'Essai Instantané'}
                </span>
                <h1 className="text-4xl md:text-5xl font-black text-brand-text tracking-tight uppercase">
                    {language === 'en' ? 'Virtual Try-On' : 'Essayage Virtuel'}
                </h1>
                <p className="text-sm md:text-base text-brand-text-secondary max-w-2xl leading-relaxed">
                    {language === 'en' 
                        ? 'Instantly view any ready-to-wear styling draped specifically onto your own photo with extreme realistic fabric physics.' 
                        : 'Visualisez instantanément n\'importe quel vêtement drapé et ajusté à votre propre photo avec un rendu ultra-réaliste.'}
                </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                
                {/* Configuration Panel - Left Column */}
                <div className="lg:col-span-5 bg-brand-surface border border-brand-secondary/30 rounded-3xl p-6 shadow-xl space-y-6">

                    {/* Face accuracy booster — capture = subject (only fills if no photo uploaded) */}
                    <FaceProfileCard
                      isFR={language === 'fr'}
                      isGuest={isGuest}
                      onRequireLogin={onRequireLogin}
                      onHasFace={setHasFace}
                      onSubjectReady={(img) => setModelImage((prev) => (prev ? prev : img))}
                    />

                    {/* Step 1: Upload User Model Image */}
                    <div>
                        <label className="block text-xs font-black text-brand-text/85 uppercase tracking-widest mb-3">
                            {language === 'en' ? 'Or upload your own photo or a model photo (you must have usage rights)' : "Ou télécharge ta photo (ou celle d'un mannequin — droit d'utilisation obligatoire)"}
                        </label>
                        
                        {modelImage ? (
                            <div className="relative group rounded-2xl overflow-hidden border-2 border-brand-primary shadow-md aspect-square bg-brand-bg flex items-center justify-center p-2">
                                <img 
                                    src={`data:${modelImage.mimeType};base64,${modelImage.base64}`} 
                                    alt="Your uploaded photo" 
                                    className="h-full w-full object-cover rounded-xl"
                                />
                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                    <button 
                                        type="button"
                                        onClick={() => { setModelImage(null); setModelFileName(''); }}
                                        className="bg-red-500 hover:bg-red-600 text-white p-3 rounded-full shadow-lg transition-transform hover:scale-110 active:scale-95"
                                    >
                                        <Icon name="close" className="w-5 h-5" />
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <label 
                                htmlFor="tryon-model"
                                className={`w-full h-44 cursor-pointer flex flex-col items-center justify-center border-2 border-dashed rounded-2xl transition-all duration-300 p-6 ${isDraggingModel ? 'bg-brand-primary/10 border-brand-primary text-brand-primary' : 'bg-brand-bg/40 hover:bg-brand-surface border-brand-secondary hover:border-brand-primary/50 text-brand-text/50'}`}
                                onDragOver={(e) => { e.preventDefault(); setIsDraggingModel(true); }}
                                onDragLeave={() => setIsDraggingModel(false)}
                                onDrop={(e) => {
                                    e.preventDefault();
                                    setIsDraggingModel(false);
                                    const file = e.dataTransfer.files?.[0];
                                    if (file) handleModelUpload(file);
                                }}
                            >
                                <Icon name="upload" className="w-8 h-8 mb-3 opacity-80 text-brand-primary" />
                                <span className="text-xs font-extrabold uppercase tracking-widest">{language === 'en' ? 'Upload or Drop Photo' : 'Télécharger votre photo'}</span>
                                <span className="text-[10px] opacity-70 mt-1">{language === 'en' ? 'PNG, JPG or WEBP' : 'Format PNG, JPG ou WEBP'}</span>
                                <input 
                                    type="file" 
                                    id="tryon-model" 
                                    className="hidden" 
                                    accept="image/*"
                                    onChange={handleModelFileChange}
                                />
                            </label>
                        )}

                        {/* Recent photos selector */}
                        {!modelImage && recentModels.length > 0 && (
                            <div className="mt-4">
                                <p className="text-[10px] font-bold text-brand-text/50 uppercase tracking-wider mb-2">{language === 'en' ? 'Choose from recent uploads:' : 'Choisir une photo récente :'}</p>
                                <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
                                    {recentModels.map(model => (
                                        <button
                                            key={model.id}
                                            type="button"
                                            onClick={() => {
                                                setModelImage({ base64: model.base64, mimeType: model.mimeType });
                                                setModelFileName(model.name || 'Recent Upload');
                                            }}
                                            className="flex-shrink-0 w-12 h-12 rounded-xl overflow-hidden border-2 border-transparent hover:border-brand-primary transition-all shadow"
                                        >
                                            <img src={`data:${model.mimeType};base64,${model.base64}`} alt="Recent Upload" className="w-full h-full object-cover" />
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Step 2: Choose Garment */}
                    <div className="border-t border-brand-secondary/30 pt-5">
                        <label className="block text-xs font-black text-brand-text/85 uppercase tracking-widest mb-3">
                            {language === 'en' ? 'Step 2: Upload your garment' : 'Étape 2 : Télécharger votre vêtement'}
                        </label>

                        {garmentImage ? (
                            <div className="relative group rounded-2xl overflow-hidden border-2 border-brand-primary shadow-md aspect-square bg-brand-bg flex items-center justify-center p-2">
                                <img 
                                    src={`data:${garmentImage.mimeType};base64,${garmentImage.base64}`} 
                                    alt="Garment to try" 
                                    className="h-full w-full object-cover rounded-xl"
                                />
                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                    <button 
                                        type="button"
                                        onClick={() => { setGarmentImage(null); setGarmentFileName(''); }}
                                        className="bg-red-500 hover:bg-red-600 text-white p-3 rounded-full shadow-lg transition-transform hover:scale-110 active:scale-95"
                                    >
                                        <Icon name="close" className="w-5 h-5" />
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <label 
                                htmlFor="tryon-garment"
                                className={`w-full h-44 cursor-pointer flex flex-col items-center justify-center border-2 border-dashed rounded-2xl transition-all duration-300 p-6 ${isDraggingGarment ? 'bg-brand-primary/10 border-brand-primary text-brand-primary' : 'bg-brand-bg/40 hover:bg-brand-surface border-brand-secondary hover:border-brand-primary/50 text-brand-text/50'}`}
                                onDragOver={(e) => { e.preventDefault(); setIsDraggingGarment(true); }}
                                onDragLeave={() => setIsDraggingGarment(false)}
                                onDrop={(e) => {
                                    e.preventDefault();
                                    setIsDraggingGarment(false);
                                    const file = e.dataTransfer.files?.[0];
                                    if (file) handleGarmentUpload(file);
                                }}
                            >
                                <Icon name="upload" className="w-8 h-8 mb-3 opacity-80 text-brand-primary" />
                                <span className="text-xs font-extrabold uppercase tracking-widest">{language === 'en' ? 'Upload your garment' : 'Télécharger votre vêtement'}</span>
                                <span className="text-[10px] opacity-70 mt-1">{language === 'en' ? 'PNG, JPG or WEBP' : 'Format PNG, JPG ou WEBP'}</span>
                                <input 
                                    type="file" 
                                    id="tryon-garment" 
                                    className="hidden" 
                                    accept="image/*"
                                    onChange={handleGarmentFileChange}
                                />
                            </label>
                        )}

                        {/* Recent garments selector */}
                        {!garmentImage && recentGarments.length > 0 && (
                            <div className="mt-4">
                                <p className="text-[10px] font-bold text-brand-text/50 uppercase tracking-wider mb-2">{language === 'en' ? 'Choose from recent garments:' : 'Choisir un vêtement récent :'}</p>
                                <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
                                    {recentGarments.map(garment => (
                                        <button
                                            key={garment.id}
                                            type="button"
                                            onClick={() => {
                                                setGarmentImage({ base64: garment.base64, mimeType: garment.mimeType });
                                                setGarmentFileName(garment.name || 'Recent Garment');
                                            }}
                                            className="flex-shrink-0 w-12 h-12 rounded-xl overflow-hidden border-2 border-transparent hover:border-brand-primary transition-all shadow"
                                        >
                                            <img src={`data:${garment.mimeType};base64,${garment.base64}`} alt="Recent Garment" className="w-full h-full object-cover" />
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Step 3: Fast Configuration */}
                    <div className="border-t border-brand-secondary/30 pt-5 space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            {!isSitting && (
                                <div>
                                    <label className="block text-[10px] font-bold text-brand-text/50 uppercase tracking-widest mb-1.5 pl-1">{language === 'en' ? 'Postures' : 'Postures'}</label>
                                    <select 
                                        value={pose} 
                                        onChange={e => setPose(e.target.value)}
                                        className="w-full bg-brand-bg/50 border border-brand-secondary/50 rounded-xl py-2.5 px-3 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-brand-primary/10 focus:border-brand-primary"
                                    >
                                        <option value="Editorial">{language === 'en' ? 'Editorial Look' : 'Look Éditorial'}</option>
                                        <option value="Keynote Presentation">{language === 'en' ? 'Candid Runways' : 'Défilé de mode'}</option>
                                        <option value="Dynamic Action">{language === 'en' ? 'Dynamic Motion' : 'Mouvement dynamique'}</option>
                                    </select>
                                </div>
                            )}
                            <div className={isSitting ? "col-span-2" : ""}>
                                <label className="block text-[10px] font-bold text-brand-text/50 uppercase tracking-widest mb-1.5 pl-1">{language === 'en' ? 'Setting' : 'Environnement'}</label>
                                <select 
                                    value={environment} 
                                    onChange={e => setEnvironment(e.target.value)}
                                    className="w-full bg-brand-bg/50 border border-brand-secondary/50 rounded-xl py-2.5 px-3 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-brand-primary/10 focus:border-brand-primary"
                                >
                                    <option value="Studio">{language === 'en' ? 'Minimalist Studio' : 'Studio Minimaliste'}</option>
                                    <option value="Outdoors Nature">{language === 'en' ? 'Gardens & Safaris' : 'Nature et Jardins'}</option>
                                    <option value="City Metropole">{language === 'en' ? 'Urban Streets' : 'Rues Urbaines'}</option>
                                </select>
                            </div>
                        </div>

                        {/* Optional Height and Standing/Sitting Switch */}
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-[10px] font-bold text-brand-text/50 uppercase tracking-widest mb-1.5 pl-1">
                                    {language === 'en' ? 'Height - Optional' : 'Taille - Optionnelle'}
                                </label>
                                <div className="relative flex items-center">
                                    <input 
                                        type="text"
                                        id="manual-height"
                                        value={heightCm}
                                        onChange={e => {
                                            const cleaned = e.target.value.replace(/\D/g, '');
                                            setHeightCm(cleaned);
                                        }}
                                        placeholder={language === 'en' ? 'e.g. 175' : 'Ex: 175'}
                                        inputMode="numeric"
                                        pattern="[0-9]*"
                                        className="w-full bg-brand-bg/50 border border-brand-secondary/50 rounded-xl py-2.5 pl-3 pr-8 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-brand-primary/10 focus:border-brand-primary"
                                    />
                                    <span className="absolute right-3 text-[10px] font-extrabold text-brand-text/40 pointer-events-none uppercase">cm</span>
                                </div>
                            </div>

                            <div>
                                <label className="block text-[10px] font-bold text-brand-text/50 uppercase tracking-widest mb-1.5 pl-1">
                                    {language === 'en' ? 'Pose type' : 'Posture'}
                                </label>
                                <div className="flex bg-brand-bg/50 rounded-xl p-0.5 border border-brand-secondary/50 h-[38px] items-center">
                                    <button
                                        type="button"
                                        onClick={() => setIsSitting(false)}
                                        className={`flex-1 h-full text-[10px] font-black uppercase tracking-wider rounded-lg transition-all ${!isSitting ? 'bg-brand-primary text-white shadow-sm' : 'text-brand-text/50 hover:text-brand-text'}`}
                                    >
                                        {language === 'en' ? 'Stand' : 'Debout'}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setIsSitting(true)}
                                        className={`flex-1 h-full text-[10px] font-black uppercase tracking-wider rounded-lg transition-all ${isSitting ? 'bg-brand-primary text-white shadow-sm' : 'text-brand-text/50 hover:text-brand-text'}`}
                                    >
                                        {language === 'en' ? 'Sit' : 'Assis'}
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Aspect Ratio Selector */}
                        <div className="space-y-1.5 pt-1">
                            <label className="block text-[10px] font-bold text-brand-text/50 uppercase tracking-widest pl-1">
                                {language === 'en' ? 'Output Format' : 'Format de Rendu'}
                            </label>
                            <div className="grid grid-cols-5 gap-1.5 p-0.5 bg-brand-bg/50 border border-brand-secondary/50 rounded-xl">
                                {['1:1', '9:16', '16:9', '4:5', '3:4'].map((ratio) => (
                                    <button
                                        type="button"
                                        key={ratio}
                                        onClick={() => setTryOnAspectRatio(ratio as any)}
                                        className={`py-2 text-[10px] font-black uppercase tracking-wider rounded-lg transition-all ${tryOnAspectRatio === ratio ? 'bg-brand-primary text-white shadow-sm' : 'text-brand-text/50 hover:text-brand-text'}`}
                                    >
                                        {ratio}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Error Alerts */}
                    {error && (
                        (error === "Insufficient credits. Please top up your account." || error === "Crédits insuffisants. Veuillez en acheter de nouveaux.") ? (
                            <div className="bg-amber-500/10 border border-amber-500/20 text-amber-900 text-xs rounded-xl p-4 flex flex-col gap-3 animate-in fade-in duration-300">
                                <div className="flex items-start gap-2.5">
                                    <Icon name="coins" className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                                    <p className="leading-tight font-black uppercase text-amber-800">
                                        {language === 'en' ? 'Credits Required' : 'Crédits Requis'}
                                    </p>
                                </div>
                                <p className="text-amber-800 leading-tight">
                                    {error}
                                </p>
                                <button 
                                    type="button"
                                    onClick={() => setIsPaywallOpen(true)}
                                    className="w-full bg-brand-primary text-white py-2.5 px-4 rounded-xl text-xs font-black uppercase tracking-wider transition-all duration-205 shadow-md shadow-brand-primary/10 hover:opacity-95 active:scale-[0.98]"
                                >
                                    🚀 {language === 'en' ? 'Buy More Credits' : 'Acheter des Crédits'}
                                </button>
                            </div>
                        ) : isValidationError(error) ? (
                            <div className="bg-red-500/10 border border-red-500/20 text-red-700 text-xs rounded-xl p-3.5 flex items-start gap-2.5">
                                <Icon name="alert-circle" className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                                <p className="leading-tight">{error}</p>
                            </div>
                        ) : (
                            <div className="bg-red-500/10 border border-red-500/25 text-red-700 text-xs rounded-xl p-4 flex flex-col gap-3.5 animate-in fade-in duration-300">
                                <div className="flex items-start gap-2.5">
                                    <Icon name="alert-circle" className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                                    <p className="leading-tight font-medium">
                                        {language === 'en' 
                                            ? "Oops, an error occurred during try-on. Please contact support" 
                                            : "Oups, une erreur est survenue lors de l'essayage. Veuillez contacter le support."}
                                    </p>
                                </div>
                                <a 
                                    href={buildSupportLink(userState?.userId, language === 'fr')}
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center justify-center gap-2 w-full px-4 py-2.5 text-xs font-black uppercase tracking-wider text-white bg-green-600 hover:bg-green-700 rounded-xl transition duration-200 mt-0.5 shadow-md shadow-green-600/10 hover:shadow-green-700/20 active:scale-[0.98]"
                                >
                                    💬 {language === 'en' ? 'Contact Support' : 'Contacter le Support'}
                                </a>
                            </div>
                        )
                    )}

                    {/* Trigger Button */}
                    <button
                        type="button"
                        onClick={handleRunTryOn}
                        disabled={isLoading}
                        className="w-full bg-brand-text text-white py-4 px-6 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-brand-primary transition-all duration-300 shadow-xl shadow-brand-text/15 hover:shadow-brand-primary/20 active:scale-95 flex items-center justify-center gap-3 disabled:opacity-50"
                    >
                        {isLoading ? (
                            <LoadingSpinner />
                        ) : (
                            <Icon name="sparkles" className="w-4 h-4 animate-bounce" />
                        )}
                        <span>{language === 'en' ? 'Launch Try-on photoshoot' : 'Lancer l\'essayage'}</span>
                        <span className="text-[10px] bg-white/20 px-2 py-0.5 rounded-full font-bold ml-1">2 Cr.</span>
                    </button>
                    
                </div>

                {/* Right Column - Results Area (Try-on Virtual View) */}
                <div className="lg:col-span-7 flex flex-col justify-start h-full" ref={resultRef}>
                    {isLoading ? (
                        <div className="bg-brand-surface border border-brand-secondary/30 rounded-3xl p-10 flex flex-col items-center justify-center min-h-[500px] shadow-xl text-center">
                            <LoadingSpinner />
                            <p className="mt-6 text-base font-bold text-brand-text/80 animate-pulse capitalize">
                                {loadingMessage || (language === 'en' ? 'Loading Try-on visualizer...' : 'Mise au point sur le vêtement...')}
                            </p>
                            <p className="text-xs text-brand-text-secondary mt-2 max-w-sm">
                                {language === 'en' 
                                    ? 'Our neural physics model is projecting the drapery style and keeping your body measurements realistic...' 
                                    : 'Ajustement du vêtement aux spécificités de votre corps avec application réaliste du tissu...'}
                            </p>
                        </div>
                    ) : tryOnResult ? (
                        <div className="bg-brand-surface border border-brand-secondary/30 rounded-3xl p-4 md:p-6 shadow-xl flex flex-col items-center relative group">
                            <div className="w-full flex justify-between items-center bg-brand-bg/80 backdrop-blur-md border border-brand-secondary/20 rounded-2xl px-4 py-3 mb-4">
                                <div className="hidden sm:block text-[10px] font-black uppercase tracking-wider text-brand-text/50">
                                    {language === 'en' ? 'Fitting Completed' : 'Essayage Terminé'} ✓
                                </div>
                                <div className="text-[10px] sm:hidden font-black uppercase tracking-wider text-brand-text/50">
                                    {language === 'en' ? 'Actions' : 'Actions'}
                                </div>
                                <div className="flex items-center gap-2">
                                    <button 
                                        onClick={() => setIsFullscreen(true)}
                                        className="bg-brand-surface border border-brand-secondary/25 text-brand-text hover:bg-brand-primary hover:text-white p-3 md:p-2.5 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl transition-all shadow-sm active:scale-95 cursor-pointer touch-manipulation"
                                        title={language === 'en' ? 'Fullscreen' : 'Plein Écran'}
                                    >
                                        <Icon name="image" className="w-4 h-4" />
                                    </button>
                                    <button 
                                        onClick={handleDownload}
                                        disabled={isDownloading}
                                        className="bg-brand-surface border border-brand-secondary/25 text-brand-text hover:bg-brand-primary hover:text-white p-3 md:p-2.5 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl transition-all shadow-sm active:scale-95 disabled:opacity-50 cursor-pointer touch-manipulation"
                                        title={isDownloading ? (language === 'en' ? 'Downloading...' : 'Téléchargement...') : T.download}
                                    >
                                        {isDownloading ? <svg className="animate-spin h-4 w-4 text-brand-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg> : <Icon name="download" className="w-4 h-4" />}
                                    </button>
                                    {/* Action Share dropdown / popover */}
                                    <div className="relative">
                                        <button 
                                            onClick={handleShare}
                                            className={`border p-3 md:p-2.5 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl transition-all shadow-sm active:scale-95 cursor-pointer touch-manipulation ${isShareOpen ? 'bg-brand-primary text-white border-brand-primary' : 'bg-brand-surface border-brand-secondary/25 text-brand-text hover:bg-brand-primary hover:text-white'}`}
                                            title={language === 'en' ? 'Share creation' : 'Partager la création'}
                                        >
                                            <Icon name="share-2" className="w-4 h-4" />
                                        </button>
                                        
                                        <AnimatePresence>
                                            {isShareOpen && (
                                                activeShareChannel === null ? (
                                                    <motion.div 
                                                        initial={{ opacity: 0, scale: 0.85, y: 10 }}
                                                        animate={{ opacity: 1, scale: 1, y: 0 }}
                                                        exit={{ opacity: 0, scale: 0.85, y: 5 }}
                                                        transition={{ type: "spring", stiffness: 300, damping: 20 }}
                                                        className="absolute right-0 bottom-full mb-3 z-40 bg-brand-surface border-2 border-brand-primary/25 rounded-2xl p-3.5 shadow-2xl flex flex-row gap-3 items-center min-w-[220px] justify-between"
                                                    >
                                                        {/* WhatsApp */}
                                                        <motion.a
                                                            whileHover={{ scale: 1.15, y: -2 }}
                                                            whileTap={{ scale: 0.9 }}
                                                            href={`https://api.whatsapp.com/send?text=${encodeURIComponent((language === 'en' ? "Check out my virtual try-on made with Studio A6ko ✨ " : "Regarde mon essayage virtuel réalisé avec Studio A6ko ✨ ") + "https://studio.a6ko.com")}`}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            onClick={() => setIsShareOpen(false)}
                                                            className="w-11 h-11 bg-green-500 hover:bg-green-600 text-white rounded-xl flex items-center justify-center transition-all shadow-md cursor-pointer touch-manipulation"
                                                            title="WhatsApp"
                                                        >
                                                            <svg className="w-6 h-6 fill-current" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                                                <path d="M12.012 2c-5.506 0-9.989 4.478-9.99 9.984a9.96 9.96 0 0 0 1.333 4.993L2 22l5.233-1.371a9.936 9.936 0 0 0 4.777 1.22c5.507 0 9.99-4.478 9.99-9.985C22.001 6.478 17.518 2 12.012 2zm6.136 14.156c-.252.712-1.461 1.304-2.01 1.402-.497.09-1.15.163-3.32-.737-2.774-1.15-4.568-3.974-4.707-4.159-.138-.184-1.12-1.49-1.119-2.842.001-1.352.708-2.015.96-2.277.251-.262.55-.328.733-.328.184 0 .368.002.527.01.163.007.382-.062.598.459.222.535.759 1.854.825 1.986.066.13.111.285.022.46-.089.175-.133.284-.265.438-.133.153-.277.34-.397.459-.133.13-.273.272-.118.537.155.263.684 1.127 1.465 1.821.996.883 1.836 1.157 2.094 1.288.258.13.407.11.558-.06.151-.175.648-.755.823-1.01.175-.251.349-.208.59-.12.24.088 1.524.718 1.786.85.263.13.438.196.505.31.066.11.066.652-.187 1.365z"/>
                                                            </svg>
                                                        </motion.a>

                                                        {/* Facebook */}
                                                        <motion.a
                                                            whileHover={{ scale: 1.15, y: -2 }}
                                                            whileTap={{ scale: 0.9 }}
                                                            href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent("https://studio.a6ko.com")}`}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            onClick={() => setIsShareOpen(false)}
                                                            className="w-11 h-11 bg-blue-600 hover:bg-blue-700 text-white rounded-xl flex items-center justify-center transition-all shadow-md cursor-pointer touch-manipulation"
                                                            title="Facebook"
                                                        >
                                                            <svg className="w-6 h-6 fill-current" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                                                <path d="M22 12c0-5.52-4.48-10-10-10S2 6.48 2 12c0 4.84 3.44 8.87 8 9.8V15H8v-3h2V9.5C10 7.57 11.57 6 13.5 6H16v3h-2c-.55 0-1 .45-1 1v2h3v3h-3v6.95c5.05-.5 9-4.76 9-9.95z"/>
                                                            </svg>
                                                        </motion.a>

                                                        {/* X (Twitter) */}
                                                        <motion.a
                                                            whileHover={{ scale: 1.15, y: -2 }}
                                                            whileTap={{ scale: 0.9 }}
                                                            href={`https://twitter.com/intent/tweet?text=${encodeURIComponent((language === 'en' ? "Check out my virtual try-on made with Studio A6ko ✨ " : "Regarde mon essayage virtuel réalisé avec Studio A6ko ✨ ") + "https://studio.a6ko.com")}`}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            onClick={() => setIsShareOpen(false)}
                                                            className="w-11 h-11 bg-black hover:bg-neutral-800 text-white rounded-xl flex items-center justify-center transition-all shadow-md cursor-pointer touch-manipulation"
                                                            title="X"
                                                        >
                                                            <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                                                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                                                            </svg>
                                                        </motion.a>

                                                        {/* Copy link */}
                                                        <motion.button
                                                            whileHover={{ scale: 1.15, y: -2 }}
                                                            whileTap={{ scale: 0.9 }}
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                navigator.clipboard?.writeText("https://studio.a6ko.com");
                                                                setIsShareOpen(false);
                                                            }}
                                                            className="w-11 h-11 bg-brand-bg border border-brand-secondary/30 text-brand-text hover:border-brand-primary rounded-xl flex items-center justify-center transition-all shadow-md cursor-pointer touch-manipulation"
                                                            title="Copier le lien"
                                                        >
                                                            <svg className="w-5 h-5 fill-none stroke-current stroke-2" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                                                <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                                                                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                                                            </svg>
                                                        </motion.button>
                                                    </motion.div>
                                                ) : (
                                                    <motion.div 
                                                        initial={{ opacity: 0, scale: 0.85, y: 10 }}
                                                        animate={{ opacity: 1, scale: 1, y: 0 }}
                                                        exit={{ opacity: 0, scale: 0.85, y: 5 }}
                                                        transition={{ type: "spring", stiffness: 300, damping: 20 }}
                                                        className="absolute right-0 bottom-full mb-3 z-40 bg-brand-surface border-2 border-brand-primary/25 rounded-2xl p-4 shadow-2xl flex flex-col gap-3 min-w-[280px] max-w-[320px] text-left text-brand-text"
                                                    >
                                                        <div className="flex items-center justify-between border-b border-brand-secondary/15 pb-2">
                                                            <span className="flex items-center gap-1.5 font-black text-xs uppercase tracking-widest text-brand-primary">
                                                                {activeShareChannel === 'instagram' ? '📸 Instagram' : '🎵 TikTok'}
                                                            </span>
                                                            <button 
                                                                type="button"
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    setActiveShareChannel(null);
                                                                }}
                                                                className="text-[10px] uppercase font-bold text-brand-text/50 hover:text-brand-text px-2 py-1 bg-brand-bg/55 rounded-lg border border-brand-secondary/10"
                                                            >
                                                                ← {language === 'en' ? 'Back' : 'Retour'}
                                                            </button>
                                                        </div>

                                                        <div className="text-[11px] leading-relaxed text-brand-text-secondary space-y-2 font-medium">
                                                            {activeShareChannel === 'instagram' ? (
                                                                language === 'en' ? (
                                                                    <>
                                                                        <p>1. <span className="font-extrabold text-brand-text">Download</span> your try-on style using the download button.</p>
                                                                        <p>2. Open <span className="font-extrabold text-brand-text">Instagram</span> & upload your creation on your Post or Story!</p>
                                                                        <p>3. Tag us <span className="font-extrabold text-brand-primary">@studio.a6ko</span> to get featured! ✨</p>
                                                                    </>
                                                                ) : (
                                                                    <>
                                                                        <p>1. <span className="font-extrabold text-brand-text">Téléchargez</span> votre création avec le bouton de téléchargement.</p>
                                                                        <p>2. Ouvrez <span className="font-extrabold text-brand-text">Instagram</span> et ajoutez-la en story ou publication !</p>
                                                                        <p>3. Identifiez <span className="font-extrabold text-brand-primary">@studio.a6ko</span> pour être mis en avant ! ✨</p>
                                                                    </>
                                                                )
                                                            ) : (
                                                                language === 'en' ? (
                                                                    <>
                                                                        <p>1. <span className="font-extrabold text-brand-text">Download</span> your try-on model fit.</p>
                                                                        <p>2. Open <span className="font-extrabold text-brand-text">TikTok</span> and upload it as a photo slide or post with your signature music tracks! 🚀</p>
                                                                    </>
                                                                ) : (
                                                                    <>
                                                                        <p>1. <span className="font-extrabold text-brand-text">Téléchargez</span> d'abord votre image d'essayage.</p>
                                                                        <p>2. Ouvrez l'application <span className="font-extrabold text-brand-text">TikTok</span> pour créer une publication ou un diaporama avec vos musiques préférées ! 🚀</p>
                                                                    </>
                                                                )
                                                            )}
                                                        </div>

                                                        <button 
                                                             onClick={() => {
                                                                 const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
                                                                 if (isMobile) {
                                                                     if (activeShareChannel === 'instagram') {
                                                                         window.location.href = "instagram://app";
                                                                         setTimeout(() => {
                                                                             window.open("https://instagram.com", '_blank');
                                                                         }, 800);
                                                                     } else {
                                                                         window.location.href = "tiktok://";
                                                                         setTimeout(() => {
                                                                             window.open("https://tiktok.com", '_blank');
                                                                         }, 800);
                                                                     }
                                                                 } else {
                                                                     window.open(activeShareChannel === 'instagram' ? "https://instagram.com" : "https://tiktok.com", '_blank');
                                                                 }
                                                                 setIsShareOpen(false);
                                                             }}
                                                             className="w-full text-center bg-brand-primary h-11 text-white text-[10px] font-black uppercase tracking-wider py-2.5 rounded-xl block transition-all shadow hover:opacity-90 active:scale-95 duration-150 cursor-pointer"
                                                         >
                                                            {activeShareChannel === 'instagram' 
                                                                ? (language === 'en' ? 'Open Instagram App 📸' : 'Ouvrir Instagram 📸')
                                                                : (language === 'en' ? 'Open TikTok App 🎵' : 'Ouvrir TikTok 🎵')}
                                                        </button>
                                                    </motion.div>
                                                )
                                            )}
                                        </AnimatePresence>
                                    </div>
                                </div>
                            </div>

                            {/* Main fitted image result */}
                            <div className={`relative w-full ${aspectClasses[tryOnResult.metadata.aspectRatio || '1:1'] || 'aspect-square max-h-[500px]'} overflow-hidden rounded-2xl bg-brand-bg shadow-inner border border-brand-secondary/20 flex items-center justify-center`}>
                                <img
                                    src={tryOnResult.url}
                                    alt="Fitting results"
                                    className="w-full h-full object-cover rounded-2xl hover:scale-105 transition-transform duration-700"
                                />
                                <div className="absolute bottom-4 left-4 bg-black/50 backdrop-blur-md text-white rounded-xl py-1.5 px-3 text-[10px] font-bold uppercase tracking-widest pointer-events-none flex items-center gap-1.5">
                                    <span className="w-2 h-2 rounded-full bg-brand-primary animate-ping" />
                                    <span>a6ko studio model fit</span>
                                </div>
                            </div>

                            {/* a6ko Boutique Publishing Information Generator */}
                            <div className="w-full mt-5 bg-gradient-to-br from-brand-secondary/5 to-brand-primary/[0.03] border border-brand-secondary/20 rounded-2xl p-5 shadow-sm space-y-4">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <div className="w-8 h-8 rounded-full bg-brand-primary/10 flex items-center justify-center text-brand-primary">
                                            <Icon name="wand" className="w-4 h-4 animate-pulse" />
                                        </div>
                                        <div className="text-left">
                                            <h4 className="text-xs font-black uppercase tracking-wider text-brand-text">
                                                {language === 'fr' ? 'Publication Boutique a6ko' : 'a6ko Boutique Listing'}
                                            </h4>
                                            <p className="text-[10px] text-brand-text-secondary font-medium">
                                                {language === 'fr' ? 'Générez des fiches produits optimisées pour a6ko.com' : 'Generate optimized metadata to list live on a6ko.com'}
                                            </p>
                                        </div>
                                    </div>
                                    {shopInfo && (
                                        <button
                                            onClick={() => { setShopInfo(null); setShopInfoError(''); }}
                                            className="text-[9px] font-extrabold uppercase tracking-widest text-[#EF4444] hover:underline"
                                        >
                                            {language === 'fr' ? 'Réinitialiser' : 'Reset'}
                                        </button>
                                    )}
                                </div>

                                {shopInfoError && (
                                    <div className="bg-red-500/10 border border-red-500/20 text-red-500 rounded-xl p-3 text-[11px] font-medium flex items-center gap-2">
                                        <Icon name="alert-circle" className="w-4 h-4 shrink-0" />
                                        <span>{shopInfoError}</span>
                                    </div>
                                )}

                                {!shopInfo && !isGeneratingShopInfo && (
                                    <button
                                        type="button"
                                        onClick={handleGenerateShopInfo}
                                        className="w-full bg-[#111827] hover:bg-neutral-850 border border-white/10 text-white font-extrabold uppercase tracking-widest h-12 rounded-xl text-[10px] transition-all active:scale-98 shadow-md flex items-center justify-center gap-2 cursor-pointer group"
                                    >
                                        <Icon name="sparkles" className="w-4 h-4 text-[#16A34A] group-hover:rotate-12 transition-transform" />
                                        <span>{language === 'fr' ? 'Générer les info boutique a6ko ✨' : 'Generate a6ko Shop Info ✨'}</span>
                                    </button>
                                )}

                                {isGeneratingShopInfo && (
                                    <div className="flex flex-col items-center justify-center py-6 text-center space-y-3 bg-brand-bg/40 rounded-xl border border-brand-secondary/10">
                                        <svg className="animate-spin h-6 w-6 text-[#16A34A]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                        </svg>
                                        <div className="space-y-1">
                                            <p className="text-[11px] font-bold text-brand-text uppercase tracking-wider animate-pulse">
                                                {language === 'fr' ? 'Génération en cours...' : 'Analyzing & Writing...'}
                                            </p>
                                            <p className="text-[9px] text-brand-text-secondary">
                                                {language === 'fr' ? 'Création d\'un titre et d\'une description irrésistibles...' : 'Crafting high-conversion title and description for custom African clothing...'}
                                            </p>
                                        </div>
                                    </div>
                                )}

                                <AnimatePresence>
                                    {shopInfo && (
                                        <motion.div
                                            initial={{ opacity: 0, y: 10, height: 0 }}
                                            animate={{ opacity: 1, y: 0, height: 'auto' }}
                                            exit={{ opacity: 0, y: 10, height: 0 }}
                                            className="space-y-4 overflow-hidden pt-1"
                                        >
                                            {/* SEO Title Row */}
                                            <div className="space-y-1.5 text-left">
                                                <div className="flex justify-between items-center">
                                                    <span className="text-[9px] font-black uppercase text-brand-text-secondary tracking-widest">
                                                        {language === 'fr' ? 'Titre de la fiche (SEO)' : 'Product Listing Title'}
                                                    </span>
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            navigator.clipboard.writeText(shopInfo.title);
                                                            setCopiedField('title');
                                                            setTimeout(() => setCopiedField(''), 2000);
                                                        }}
                                                        className="text-[10px] font-bold text-brand-primary flex items-center gap-1 hover:underline"
                                                    >
                                                        <Icon name={copiedField === 'title' ? "check" : "copy"} className="w-3.5 h-3.5" />
                                                        <span>{copiedField === 'title' ? (language === 'fr' ? 'Copié !' : 'Copied!') : (language === 'fr' ? 'Copier' : 'Copy')}</span>
                                                    </button>
                                                </div>
                                                <div className="bg-brand-bg/60 p-3 rounded-xl border border-brand-secondary/20 text-xs font-black text-brand-text leading-snug">
                                                    {shopInfo.title}
                                                </div>
                                            </div>

                                            {/* Description Row */}
                                            <div className="space-y-1.5 text-left">
                                                <div className="flex justify-between items-center">
                                                    <span className="text-[9px] font-black uppercase text-brand-text-secondary tracking-widest">
                                                        {language === 'fr' ? 'Description de l\'annonce' : 'Listing Description'}
                                                    </span>
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            navigator.clipboard.writeText(shopInfo.description);
                                                            setCopiedField('desc');
                                                            setTimeout(() => setCopiedField(''), 2000);
                                                        }}
                                                        className="text-[10px] font-bold text-brand-primary flex items-center gap-1 hover:underline"
                                                    >
                                                        <Icon name={copiedField === 'desc' ? "check" : "copy"} className="w-3.5 h-3.5" />
                                                        <span>{copiedField === 'desc' ? (language === 'fr' ? 'Copié !' : 'Copied!') : (language === 'fr' ? 'Copier' : 'Copy Description')}</span>
                                                    </button>
                                                </div>
                                                <div className="bg-brand-bg/60 p-3.5 rounded-xl border border-brand-secondary/20 text-[11px] font-medium text-brand-text-secondary leading-relaxed max-h-[180px] overflow-y-auto whitespace-pre-wrap select-all">
                                                    {shopInfo.description}
                                                </div>
                                            </div>

                                            {/* Details Grid (Price & Tags) */}
                                            <div className="grid grid-cols-2 gap-3.5">
                                                {/* Price Estimated */}
                                                <div className="bg-brand-bg/60 p-3 rounded-xl border border-brand-secondary/20 flex flex-col justify-between space-y-1 text-left">
                                                    <span className="text-[8px] font-black uppercase text-brand-text-secondary tracking-widest">
                                                        {language === 'fr' ? 'Estimation Prix Sur-Mesure' : 'Estimated Fitting Price'}
                                                    </span>
                                                    <span className="text-xs font-black text-[#16A34A]">
                                                        {shopInfo.priceEst}
                                                    </span>
                                                </div>

                                                {/* Platform publishing action help */}
                                                <div className="bg-[#16A34A]/5 p-3 rounded-xl border border-[#16A34A]/20 flex flex-col justify-between space-y-1 text-right">
                                                    <span className="text-[8px] font-black uppercase text-brand-text-secondary tracking-widest">
                                                        {language === 'fr' ? 'Marchand Live' : 'Marketplace Destination'}
                                                    </span>
                                                    <a
                                                        href="https://a6ko.com"
                                                        target="_blank"
                                                        rel="noreferrer"
                                                        className="text-xs font-black text-brand-primary hover:underline flex items-center gap-1 justify-end"
                                                    >
                                                        <span>a6ko.com 🌍✨</span>
                                                    </a>
                                                </div>
                                            </div>

                                            {/* Search keywords / tags */}
                                            {shopInfo.tags && shopInfo.tags.length > 0 && (
                                                <div className="pt-1 flex flex-wrap gap-1.5">
                                                    {shopInfo.tags.map((tag: string, idx: number) => (
                                                        <span key={idx} className="bg-brand-primary/5 text-brand-primary border border-brand-primary/10 rounded-full px-2.5 py-0.5 text-[9px] font-extrabold uppercase tracking-wide">
                                                            #{tag}
                                                        </span>
                                                    ))}
                                                </div>
                                            )}

                                            {/* Quick publish guidance banner */}
                                            <div className="bg-[#111827] text-[#FFF8F0] p-3 rounded-xl text-center space-y-1 shadow">
                                                <p className="text-[10px] font-black uppercase tracking-wider">
                                                    {language === 'fr' ? 'Prêt à vendre en ligne ?' : 'Ready to Sell Online?'}
                                                </p>
                                                <p className="text-[9px] text-[#FFF8F0]/80">
                                                    {language === 'fr' 
                                                        ? 'Copiez ces détails, puis vendez sur-mesure sur a6ko.com !'
                                                        : 'Place custom tailor orders & receive secure measurements on a6ko.com!'}
                                                </p>
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>

                            {/* Mobile Info Tip - Finger Friendly Instructions */}
                            <div className="w-full mt-4 flex flex-col items-center text-center gap-2 px-2 bg-brand-bg/40 backdrop-blur-sm border border-brand-secondary/15 rounded-2xl p-3.5">
                                <div className="flex items-center gap-2 text-brand-primary">
                                    <Icon name="alert-circle" className="w-4 h-4" />
                                    <span className="text-[10px] font-extrabold uppercase tracking-wider">
                                        {language === 'en' ? 'Mobile Pro Tip' : 'Astuce de Téléchargement'}
                                    </span>
                                </div>
                                <p className="text-[11px] font-medium text-brand-text/75 leading-relaxed max-w-sm">
                                    {language === 'en' 
                                        ? 'For the best experience on mobile, you can copy the link dynamically or long-press (tap and hold) the image directly to save it to your gallery!' 
                                        : 'Pour une sauvegarde parfaite sur mobile, vous pouvez copier le raccourci ou faire un appui long (maintenir votre doigt) directement sur l\'image pour l\'enregistrer !'}
                                </p>
                            </div>
                        </div>
                    ) : (
                        <div className="bg-brand-surface border border-brand-secondary/30 rounded-3xl p-10 flex flex-col items-center justify-center min-h-[500px] text-center border-dashed relative overflow-hidden shadow-sm">
                            <div className="absolute inset-0 bg-gradient-to-tr from-brand-primary/5 via-transparent to-brand-primary/[0.02] pointer-events-none" />
                            <div className="w-16 h-16 bg-brand-primary/10 rounded-full flex items-center justify-center text-brand-primary mb-6 animate-pulse" style={{ animationDuration: '4s' }}>
                                <Icon name="sparkles" className="w-7 h-7" />
                            </div>
                            <h3 className="text-xl font-bold text-brand-text mb-2 uppercase tracking-tight">
                                {language === 'en' ? 'Your Virtual Dressing Room' : 'Votre Salon d\'Essayage'}
                            </h3>
                            <p className="text-sm text-brand-text-secondary max-w-sm leading-relaxed mb-6">
                                {language === 'en' 
                                    ? 'Setup your portrait on the left panel, specify or pick an outfit, then run Try-On to visualize the fitted look.' 
                                    : 'Importez votre portrait, sélectionnez une de nos tenues ou décrivez de zéro l\'habillage souhaité pour voir la magie.'}
                            </p>
                        </div>
                    )}
                </div>
            </div>

            {/* Paywall Packs Modal */}
            <PaywallModal 
                isOpen={isPaywallOpen}
                onClose={() => setIsPaywallOpen(false)}
                userId={userState?.userId || 'unknown'}
                userState={userState}
                setUserState={setUserState}
                isGuest={isGuest}
                onRequireLogin={onRequireLogin}
                T={T}
            />

            {/* Fullscreen Overlay Viewer */}
            {isFullscreen && tryOnResult && (
                <div 
                    className="fixed inset-0 z-50 bg-brand-text/95 backdrop-blur-sm flex flex-col items-center justify-center p-4 animate-in fade-in duration-300 pointer-events-auto"
                    onClick={() => setIsFullscreen(false)}
                >
                    <button 
                        onClick={() => setIsFullscreen(false)}
                        className="absolute top-6 right-6 bg-white/10 hover:bg-white/20 text-white p-3 rounded-full shadow-lg transition-transform hover:scale-105 active:scale-95"
                    >
                        <Icon name="close" className="w-5 h-5" />
                    </button>
                    <div className="relative max-w-full max-h-[85vh] overflow-hidden rounded-2xl border border-white/25 shadow-2xl flex items-center justify-center">
                        <img 
                            src={tryOnResult.url} 
                            alt="Fullscreen visualizer" 
                            className="max-h-[85vh] max-w-full object-contain rounded-2xl"
                        />
                    </div>
                    <div className="mt-4 flex gap-4">
                        <button 
                            onClick={(e) => { e.stopPropagation(); handleDownload(); }}
                            className="bg-brand-primary text-white font-extrabold text-xs uppercase tracking-widest px-6 py-3 rounded-xl hover:opacity-90 shadow-lg active:scale-95 transition-transform"
                        >
                            {T.download}
                        </button>
                        <button 
                            onClick={(e) => { e.stopPropagation(); setIsFullscreen(false); }}
                            className="bg-white/10 text-white font-extrabold text-xs uppercase tracking-widest px-6 py-3 rounded-xl hover:bg-white/20 active:scale-95 transition-transform"
                        >
                            {language === 'en' ? 'Close' : 'Fermer'}
                        </button>
                    </div>
                </div>
            )}

            {/* Download Success Notification Toast */}
            <AnimatePresence>
                {downloadSuccess && (
                    <motion.div
                        initial={{ opacity: 0, y: 50, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 30, scale: 0.95 }}
                        transition={{ type: "spring", stiffness: 300, damping: 25 }}
                        className="fixed bottom-6 left-1/2 -translate-x-1/2 z-55 bg-green-500/95 backdrop-blur text-white font-extrabold text-xs uppercase tracking-wider px-6 py-4 rounded-2xl shadow-xl flex items-center gap-2.5 min-w-[280px] justify-center"
                    >
                        <span className="w-2 h-2 rounded-full bg-white animate-ping" />
                        <span>✅ {downloadSuccess}</span>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};
