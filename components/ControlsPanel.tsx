import React, { useCallback, useState, Fragment, useEffect, useRef } from 'react';
import type { GenerationOptions, ModelOptions, UserState } from '../types';
import { Icon } from './Icon';
import { get, set } from 'idb-keyval';
import { GARMENT_PROMPTS } from '../garmentPrompts';
import { generateGarmentDescription } from '../services/geminiService';
import { fileToBase64 } from '../utils/fileUtils';
import { WHATSAPP_SUPPORT_LINK } from '../constants';
import { getRecentModels, getRecentGarments, addRecentModel, addRecentGarment, RecentImage } from '../utils/recentUploads';

interface ControlsPanelProps {
  options: GenerationOptions;
  setOptions: React.Dispatch<React.SetStateAction<GenerationOptions>>;
  onGenerate: () => void;
  isLoading: boolean;
  T: any;
  userState: UserState | null;
  onOpenPaywall: () => void;
  currentApiKey?: string;
  onApiKeyError?: (err: unknown) => string | void;
}

const Section: React.FC<{ title: string; children: React.ReactNode; defaultOpen?: boolean }> = ({ title, children, defaultOpen = true }) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  return (
    <div className="bg-brand-surface/70 backdrop-blur-xl rounded-2xl border border-brand-secondary/20 shadow-xl shadow-brand-text/5 overflow-hidden transition-all duration-300">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-6 focus:outline-none"
      >
        <h3 className="text-[11px] font-black text-brand-text/40 uppercase tracking-[0.2em] pl-1">{title}</h3>
        <Icon name="chevron-down" className={`w-4 h-4 text-brand-text/40 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} />
      </button>
      <div className={`grid transition-all duration-300 ease-in-out ${isOpen ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}>
        <div className="overflow-hidden">
          <div className="px-6 pb-6 space-y-4">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
};

const SelectInput: React.FC<{ 
  label: string; 
  value: string; 
  onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void; 
  children: React.ReactNode;
  rightElement?: React.ReactNode;
}> = ({ label, value, onChange, children, rightElement }) => (
  <div className="group">
    <div className="flex justify-between items-center mb-2 pl-1">
      <label className="block text-xs font-bold text-brand-text/80 group-hover:text-brand-primary transition-colors">{label}</label>
      {rightElement}
    </div>
    <div className="relative">
        <select
          value={value}
          onChange={onChange}
          className="w-full bg-brand-surface/50 border border-brand-secondary text-brand-text rounded-xl shadow-sm px-4 py-3.5 focus:ring-2 focus:ring-brand-primary/10 focus:border-brand-primary outline-none appearance-none transition-all duration-300 hover:border-brand-primary/40"
        >
          {children}
        </select>
        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-brand-text/30">
             <svg className="h-4 w-4 fill-current" viewBox="0 0 20 20"><path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" /></svg>
        </div>
    </div>
  </div>
);

const BACKGROUND_OPTIONS: GenerationOptions['backgroundType'][] = [
    'Solid Color', 'Textured', 'Artistic Painted', 'Cyclorama'
];

const ENVIRONMENT_OPTIONS: GenerationOptions['environment'][] = [
    'Studio', 'African Architecture', 'African Nature', 'African Urban', 'Local Luxury', 'Runway', 'Outdoor', 'Desert Oasis', 'On stage as Keynote speaker', 'Podcast studio', 'Meme setting'
];

const COLOR_PALETTES: GenerationOptions['colorPalette'][] = [
    'Neutral', 'Earthy', 'Vibrant', 'Monochrome', 'Pastel', 'Dark & Moody'
];

const CAMERA_ANGLES: GenerationOptions['cameraAngle'][] = [
    'Eye Level', 'Low Angle', 'Waist Level', 'Chest Level', 'High Angle', 'Overhead'
];

const CAMERA_AXES: GenerationOptions['cameraAxis'][] = [
    'Front', '3/4 View', 'Profile', 'Back'
];

const CAMERA_DISTANCES: GenerationOptions['cameraDistance'][] = [
    'Close-up (Face)', 'Waist Up', 'Full Body', 'Wide Shot'
];

const CAMERA_LENSES: GenerationOptions['cameraLens'][] = [
    '35mm (Reportage)', '50mm (Natural)', '85mm (Portrait/Bokeh)', '200mm (Compression)'
];

const LIGHTING_SETUPS: GenerationOptions['lightingSetup'][] = [
    'Rembrandt', 'Butterfly/Paramount', 'Split', 'Loop', 'Broad', 'Short', 'Flat', 'Softbox Overhead'
];

const LIGHTING_TEMPERATURES: GenerationOptions['lightingTemperature'][] = [
    'Warm (3200K)', 'Neutral (5500K)', 'Cool (7000K)'
];

const LIGHTING_TIMES: GenerationOptions['lightingTime'][] = [
    'Golden Hour', 'Harsh Midday', 'Night Flash'
];

const LIGHTING_MOODS: GenerationOptions['lightingMood'][] = [
    'Clinical & Sharp', 'Dramatic', 'Soft & Flattering'
];

const FILM_GRAINS: GenerationOptions['filmGrain'][] = [
    'Analog Film', 'Crisp Digital', 'HDR'
];

const POST_PROCESSING_STYLES: GenerationOptions['postProcessing'][] = [
    'Vibrant Colors', 'Desaturated', 'Monochrome'
];

export const ControlsPanel: React.FC<ControlsPanelProps> = ({ options, setOptions, onGenerate, isLoading, T, userState, onOpenPaywall, currentApiKey, onApiKeyError }) => {
  const [garmentFileName, setGarmentFileName] = useState<string>('');
  const [modelFileName, setModelFileName] = useState<string>('');
  const [isAnalyzingGarment, setIsAnalyzingGarment] = useState(false);
  const [isDraggingGarment, setIsDraggingGarment] = useState(false);
  const [isDraggingCompanion, setIsDraggingCompanion] = useState(false);
  const [isDraggingModel, setIsDraggingModel] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [modelUploadError, setModelUploadError] = useState<string | null>(null);
  
  const [recentModels, setRecentModels] = useState<RecentImage[]>([]);
  const [recentGarments, setRecentGarments] = useState<RecentImage[]>([]);

  const [isDraggingHeight, setIsDraggingHeight] = useState(false);
  const heightContainerRef = useRef<HTMLDivElement>(null);

  const handleHeightChange = useCallback((val: number) => {
    const existingText = options.model.bodyDescription || '';
    const MatchWithParen = existingText.match(/\(\d+cm\)/);
    const MatchBare = existingText.match(/\d+cm/);
    
    let newText = '';
    if (MatchWithParen) {
      newText = existingText.replace(/\(\d+cm\)/, `(${val}cm)`);
    } else if (MatchBare) {
      newText = existingText.replace(/\d+cm/, `${val}cm`);
    } else {
      newText = existingText ? `${existingText} (${val}cm)` : `Standard build (${val}cm)`;
    }
    setOptions(prev => ({ ...prev, model: { ...prev.model, bodyDescription: newText } }));
  }, [options.model.bodyDescription, setOptions]);

  const updateHeightFromPointer = useCallback((clientY: number) => {
    if (!heightContainerRef.current) return;
    const rect = heightContainerRef.current.getBoundingClientRect();
    const relativeY = clientY - rect.top;
    const paddingY = 32; // matching py-8
    const usableHeight = rect.height - paddingY * 2;
    const clampedY = Math.max(paddingY, Math.min(rect.height - paddingY, relativeY));
    const percentage = 1 - (clampedY - paddingY) / usableHeight;
    const clampedPercent = Math.max(0, Math.min(1, percentage));
    const val = Math.round(130 + clampedPercent * 90);
    handleHeightChange(val);
  }, [handleHeightChange]);

  const handleHeightPointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (!heightContainerRef.current) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    setIsDraggingHeight(true);
    updateHeightFromPointer(e.clientY);
  }, [updateHeightFromPointer]);

  const handleHeightPointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDraggingHeight) return;
    updateHeightFromPointer(e.clientY);
  }, [isDraggingHeight, updateHeightFromPointer]);

  const handleHeightPointerUp = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    e.currentTarget.releasePointerCapture(e.pointerId);
    setIsDraggingHeight(false);
  }, []);

  const [showRestorePrompt, setShowRestorePrompt] = useState(false);
  const [savedOptions, setSavedOptions] = useState<GenerationOptions | null>(null);
  const [lastSavedTime, setLastSavedTime] = useState<Date | null>(null);
  const isFirstRender = useRef(true);
  const PHOTOSHOOT_AUTOSAVE_KEY = 'a6ko_photoshoot_autosave';

  useEffect(() => {
    get(PHOTOSHOOT_AUTOSAVE_KEY).then((saved) => {
      if (saved) {
        setSavedOptions(saved as GenerationOptions);
        setShowRestorePrompt(true);
      }
    });
  }, []);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    
    // Hide restore prompt if user modifies options
    if (showRestorePrompt) {
      setShowRestorePrompt(false);
    }

    const handler = setTimeout(() => {
      set(PHOTOSHOOT_AUTOSAVE_KEY, options).then(() => {
        setLastSavedTime(new Date());
      }).catch(console.error);
    }, 5000); // 5s debounce for auto-save

    return () => clearTimeout(handler);
  }, [options]);

  const handleRestore = () => {
    if (savedOptions) {
      setOptions(savedOptions);
      setShowRestorePrompt(false);
    }
  };

  useEffect(() => {
    getRecentModels().then(setRecentModels);
    getRecentGarments().then(setRecentGarments);
  }, []);

  const isMobile = typeof window !== 'undefined' && window.innerWidth < 1024;
  
  const handleModelFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement> | File) => {
    const file = e instanceof File ? e : e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setModelUploadError("File is too large (max 5MB)");
        return;
      }
      setModelUploadError(null);
      setModelFileName(file.name);
      try {
        const image = await fileToBase64(file);
        setOptions(prev => ({ ...prev, model: { ...prev.model, name: file.name, image } }));
        addRecentModel(image, file.name).then(setRecentModels);
      } catch (error) {
        console.error("Error processing model file:", error);
        setModelFileName('');
        setModelUploadError("Failed to process image.");
      }
    }
  }, [setOptions]);

  const handleRemoveModelImage = useCallback(() => {
    setOptions(prev => ({ ...prev, model: { ...prev.model, name: 'Your Photo', image: null } }));
    setModelFileName('');
    setModelUploadError(null);
  }, [setOptions]);

  const handleDragOverModel = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingModel(true);
  }, []);

  const handleDragLeaveModel = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingModel(false);
  }, []);

  const handleDropModel = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingModel(false);
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith('image/')) {
      handleModelFileChange(file);
    }
  }, [handleModelFileChange]);

  const handleGarmentFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement> | File) => {
    const file = e instanceof File ? e : e.target.files?.[0];
    if (file) {
      // Basic size check (5MB)
      if (file.size > 5 * 1024 * 1024) {
        setUploadError("File is too large (max 5MB)");
        return;
      }

      setUploadError(null);
      setGarmentFileName(file.name);
      setIsAnalyzingGarment(true);
      try {
        const image = await fileToBase64(file);
        // Set the image immediately so the user sees it's uploaded
        setOptions(prev => ({ ...prev, garment: { ...prev.garment, image, description: prev.garment.description || '' } })); 
        
        try {
          const description = await generateGarmentDescription(image, currentApiKey);
          if (description) {
            setOptions(prev => ({ ...prev, garment: { ...prev.garment, description } }));
            addRecentGarment(image, description, file.name).then(setRecentGarments);
          } else {
            addRecentGarment(image, undefined, file.name).then(setRecentGarments);
          }
        } catch (aiError: any) {
          console.warn("AI analysis failed, but image is kept:", aiError);
          addRecentGarment(image, undefined, file.name).then(setRecentGarments);
          // Don't clear the image, just let the user know they might need to describe it
          
          if (onApiKeyError) {
            const errorMessage = onApiKeyError(aiError);
            if (errorMessage && errorMessage !== "An unexpected error occurred. Please try again.") {
              setUploadError(errorMessage);
            } else {
              const m = aiError instanceof Error ? aiError.message : String(aiError);
              setUploadError(`AI analysis failed: ${m}`);
            }
          } else {
            const m = aiError instanceof Error ? aiError.message : String(aiError);
            setUploadError(`AI analysis failed: ${m}`);
          }
        }

      } catch (error) {
        console.error("Error processing garment file:", error);
        setGarmentFileName('');
        setUploadError("Failed to process image. Please try another file.");
      } finally {
        setIsAnalyzingGarment(false);
      }
    }
  }, [setOptions, currentApiKey]);

  const handleRemoveGarmentImage = useCallback(() => {
    setOptions(prev => ({ ...prev, garment: { ...prev.garment, image: null } }));
    setGarmentFileName('');
    setUploadError(null);
  }, [setOptions]);

  const handleCompanionFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement> | File) => {
    const file = e instanceof File ? e : e.target.files?.[0];
    if (file) {
      try {
        const image = await fileToBase64(file);
        setOptions(prev => ({ ...prev, companion: { ...prev.companion, image } }));
      } catch (error) {
        console.error("Error processing companion file:", error);
      }
    }
  }, [setOptions]);

  const handleDragOverGarment = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingGarment(true);
  }, []);

  const handleDragLeaveGarment = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingGarment(false);
  }, []);

  const handleDropGarment = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingGarment(false);
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith('image/')) {
      handleGarmentFileChange(file);
    }
  }, [handleGarmentFileChange]);

  const handleDragOverCompanion = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingCompanion(true);
  }, []);

  const handleDragLeaveCompanion = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingCompanion(false);
  }, []);

  const handleDropCompanion = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingCompanion(false);
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith('image/')) {
      handleCompanionFileChange(file);
    }
  }, [handleCompanionFileChange]);

  const handleRemoveCompanionImage = () => {
      setOptions(prev => ({ ...prev, companion: { ...prev.companion, image: null } }));
  };
  
  const handleInspireMe = useCallback(() => {
    const randomPrompt = GARMENT_PROMPTS[Math.floor(Math.random() * GARMENT_PROMPTS.length)];
    setOptions(prev => ({ ...prev, garment: { ...prev.garment, description: randomPrompt } }));
  }, [setOptions]);

  const handleRandomizeEnvironment = useCallback(() => {
    const randomEnv = ENVIRONMENT_OPTIONS[Math.floor(Math.random() * ENVIRONMENT_OPTIONS.length)];
    setOptions(prev => ({ ...prev, environment: randomEnv }));
  }, [setOptions]);

  const cost = options.variants;
  const canGenerate = userState && userState.credits >= cost;

  return (
    <Fragment>
      <div className="controls-panel bg-transparent space-y-6 pb-20 lg:pb-0">
        
        {showRestorePrompt && (
          <div className="bg-brand-primary/10 border border-brand-primary/30 rounded-2xl p-4 flex flex-col md:flex-row items-center justify-between gap-4 shadow-sm animate-in fade-in slide-in-from-top-4">
            <div className="flex items-center text-brand-text">
              <Icon name="history" className="w-5 h-5 mr-3 text-brand-primary" />
              <div className="text-sm">
                <span className="font-bold block">A previous session was found</span>
                <span className="opacity-70 text-xs">Would you like to restore your last settings?</span>
              </div>
            </div>
            <button
              onClick={handleRestore}
              className="bg-brand-primary text-brand-bg font-bold py-2 px-4 rounded-xl text-sm hover:opacity-90 transition-opacity active:scale-95 whitespace-nowrap"
            >
              Restore Session
            </button>
          </div>
        )}

        <div className="bg-brand-surface/70 backdrop-blur-xl p-6 flex-col gap-4 rounded-3xl border border-brand-secondary/20 shadow-2xl shadow-brand-text/5 relative">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-black text-brand-text tracking-tight">{T.controlsTitle}</h2>
              {lastSavedTime && !showRestorePrompt && (
                <div className="flex items-center text-[10px] uppercase font-bold text-brand-text-secondary tracking-widest opacity-60">
                  <Icon name="check" className="w-3 h-3 mr-1" />
                  Saved {lastSavedTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
              )}
            </div>
            <a 
                href="https://youtu.be/oj0D56ElZkI" 
                target="_blank" 
                rel="noopener noreferrer"
                className="flex items-center justify-center w-full bg-red-500 text-white font-black py-4 px-4 rounded-2xl hover:bg-red-600 transition-all duration-300 shadow-xl shadow-red-500/20 active:scale-95"
            >
                <Icon name="play" className="w-5 h-5 mr-3 fill-current" />
                {T.watchTutorial}
            </a>
        </div>

        <Section title={T.language === 'fr' ? 'Ou télécharge ta photo pour commencer' : 'Or upload your photo to start'} defaultOpen={!isMobile}>
            <div className="mt-2">
            {options.model.image ? (
              <div className="flex items-center gap-4 p-3 bg-brand-surface/50 rounded-2xl border border-brand-primary/20 animate-in zoom-in-95 duration-300">
                <img 
                  src={`data:${options.model.image.mimeType};base64,${options.model.image.base64}`} 
                  alt="Photo" 
                  className="w-14 h-14 rounded-xl object-cover shadow-lg border-2 border-white" 
                />
                <div className="flex-1">
                  <span className="text-xs font-bold text-brand-text uppercase tracking-widest">{T.photoReady}</span>
                </div>
                <button 
                  onClick={handleRemoveModelImage}
                  className="bg-red-50 text-red-500 p-2.5 rounded-xl hover:bg-red-500 hover:text-white transition-all active:scale-95"
                  title={T.removePhoto}
                >
                  <Icon name="close" className="w-5 h-5" />
                </button>
              </div>
            ) : (
              <label 
                htmlFor="model-upload"
                className={`w-full cursor-pointer ${isDraggingModel ? 'bg-brand-primary/10 border-brand-primary text-brand-primary' : modelUploadError ? 'bg-red-50 border-red-300 text-red-500' : 'bg-brand-bg/50 hover:bg-brand-surface text-brand-text/60'} font-black uppercase tracking-wider text-[11px] py-4 px-4 rounded-2xl inline-flex items-center justify-center border-2 border-dashed border-brand-secondary transition-all duration-300 hover:border-brand-primary hover:text-brand-primary shadow-sm active:scale-95`}
                onDragOver={handleDragOverModel}
                onDragLeave={handleDragLeaveModel}
                onDrop={handleDropModel}
              >
                  <Icon name="upload" className="w-5 h-5 mr-3" />
                  <span>{modelFileName || (T as any).uploadPhoto || "Upload Photo"}</span>
                  <input 
                    type="file" 
                    id="model-upload"
                    className="hidden" 
                    onChange={handleModelFileChange} 
                    accept="image/*" 
                    onClick={(e) => (e.currentTarget.value = '')}
                  />
              </label>
            )}
            {modelUploadError && (
              <p className="mt-1 text-[10px] text-red-500 font-bold uppercase tracking-wider pl-1">{modelUploadError}</p>
            )}

            {!options.model.image && (
              <div className="mt-3 flex items-start gap-3 bg-brand-bg/40 border border-brand-secondary/20 rounded-2xl p-3">
                <div className="w-11 h-14 rounded-lg bg-gradient-to-b from-brand-primary/15 to-brand-secondary/25 flex items-center justify-center text-2xl shrink-0">🧑</div>
                <div>
                  <p className="text-[10px] font-black text-brand-text/70 uppercase tracking-wider mb-1">{T.language === 'fr' ? 'Photo idéale' : 'Ideal photo'}</p>
                  <ul className="text-[11px] text-brand-text-secondary space-y-0.5 leading-snug">
                    <li>✅ {T.language === 'fr' ? 'Visage de face, bien éclairé' : 'Face forward, well lit'}</li>
                    <li>✅ {T.language === 'fr' ? 'Tête et épaules visibles' : 'Head & shoulders visible'}</li>
                    <li>🚫 {T.language === 'fr' ? 'Ni lunettes de soleil ni chapeau' : 'No sunglasses or hat'}</li>
                  </ul>
                </div>
              </div>
            )}

            {!options.model.image && recentModels.length > 0 && (
              <div className="mt-4">
                <p className="text-[10px] font-bold text-brand-text/50 uppercase tracking-wider mb-2 pl-1">{T.recentModels}</p>
                <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                  {recentModels.map(model => (
                    <button
                      key={model.id}
                      onClick={() => {
                        setOptions(prev => ({ ...prev, model: { ...prev.model, name: model.name || 'Recent Photo', image: { base64: model.base64, mimeType: model.mimeType } } }));
                        setModelFileName(model.name);
                        addRecentModel({ base64: model.base64, mimeType: model.mimeType }, model.name).then(setRecentModels);
                      }}
                      className="flex-shrink-0 relative w-16 h-16 rounded-xl overflow-hidden border-2 border-transparent hover:border-brand-primary transition-all duration-300"
                    >
                      <img src={`data:${model.mimeType};base64,${model.base64}`} alt="Recent photo" className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="mt-6 pt-4 border-t border-brand-secondary/20">
              <label className="block text-xs font-bold text-brand-text/80 mb-2 pl-1 transition-colors">{T.fullBodyPhoto}</label>
              {options.model.fullBodyImage ? (
                <div className="relative group rounded-2xl overflow-hidden border-2 border-brand-primary/30 h-28 bg-brand-surface">
                  <img src={`data:${options.model.fullBodyImage.mimeType};base64,${options.model.fullBodyImage.base64}`} alt="Full Body Photo" className="w-full h-full object-contain opacity-50 group-hover:opacity-30 transition-opacity" />
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <span className="bg-brand-primary text-white text-[10px] font-black uppercase tracking-wider px-3 py-1.5 rounded-full shadow-lg flex items-center">
                      <Icon name="check" className="w-3 h-3 mr-1.5" />
                      {T.fullPhotoReady}
                    </span>
                  </div>
                  <button 
                    type="button"
                    onClick={() => setOptions(prev => ({ ...prev, model: { ...prev.model, fullBodyImage: null } }))}
                    className="absolute top-2 right-2 bg-red-500 hover:bg-red-600 text-white p-1.5 rounded-full shadow-md transition-transform hover:scale-110 active:scale-95 z-10"
                    title={T.removePhoto}
                  >
                    <Icon name="close" className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <label className="w-full cursor-pointer bg-brand-bg/50 hover:bg-brand-surface text-brand-text/60 font-black uppercase tracking-wider text-[11px] py-3 px-4 rounded-xl inline-flex items-center justify-center border border-dashed border-brand-secondary/50 transition-all duration-300 hover:border-brand-primary/50 hover:text-brand-primary shadow-sm active:scale-95">
                  <Icon name="upload" className="w-4 h-4 mr-2" />
                  <span>{T.uploadFullBody}</span>
                  <input 
                    type="file" 
                    className="hidden" 
                    accept="image/*" 
                    onClick={(e) => (e.currentTarget.value = '')}
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        try {
                          const image = await fileToBase64(file);
                          setOptions(prev => ({ ...prev, model: { ...prev.model, fullBodyImage: { base64: image.base64, mimeType: image.mimeType } } }));
                        } catch (error) {
                          console.error("Error processing full body image:", error);
                        }
                      }
                    }}
                  />
                </label>
              )}

              <div className="mt-6 flex flex-col gap-4">
                  <div className="flex items-center justify-between mb-1 pl-1">
                      <label className="block text-xs font-bold text-brand-text/80 transition-colors uppercase tracking-widest">{T.bodyDescription}</label>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-mono font-bold text-brand-primary bg-brand-primary/10 px-2 py-0.5 rounded-full border border-brand-primary/20">
                          {options.model.bodyDescription?.match(/\d+cm/)?.[0] || '175cm'}
                        </span>
                      </div>
                  </div>

                  {/* Dynamic Height Meter View */}
                  <div 
                    ref={heightContainerRef}
                    onPointerDown={handleHeightPointerDown}
                    onPointerMove={handleHeightPointerMove}
                    onPointerUp={handleHeightPointerUp}
                    onPointerCancel={handleHeightPointerUp}
                    className={`relative h-72 bg-brand-bg/30 rounded-3xl border border-brand-secondary/20 overflow-hidden flex items-stretch group shadow-inner cursor-ns-resize touch-none select-none ${isDraggingHeight ? 'border-brand-primary/50 bg-brand-primary/[0.03]' : ''}`}
                  >
                      {/* Ruler Scale */}
                      <div className="absolute left-0 inset-y-0 w-20 flex flex-col justify-between items-start border-r border-brand-secondary/20 pl-4 py-8 bg-brand-surface/20 pointer-events-none select-none">
                        {[220, 210, 200, 190, 180, 170, 160, 150, 140, 130].map(h => {
                          const currentHeight = parseInt(options.model.bodyDescription?.match(/\d+/)?.[0] || '175');
                          const isClose = Math.abs(currentHeight - h) < 5;
                          const isMatch = currentHeight === h;
                          return (
                            <div key={h} className="relative w-full flex items-center">
                              <div className={`h-[1px] transition-all duration-200 ${h % 10 === 0 ? 'w-5 bg-brand-primary/40' : 'w-2.5 bg-brand-primary/20'} ${isClose ? 'bg-brand-primary w-7 h-[1.5px]' : ''}`} />
                              <span className={`text-[9px] font-mono ml-2 transition-all duration-200 ${isMatch ? 'text-brand-primary font-black scale-110' : isClose ? 'text-brand-primary/80 font-bold' : 'text-brand-text/40'}`}>
                                {h}
                              </span>
                            </div>
                          );
                        })}
                      </div>

                      {/* Interaction Area */}
                      <div className="flex-1 relative flex items-end justify-center pb-8 overflow-hidden bg-gradient-to-t from-brand-primary/5 to-transparent pointer-events-none select-none">
                        
                        {/* Selected Height Indicator Line */}
                        <div 
                          className={`absolute inset-x-0 z-10 flex items-center ${isDraggingHeight ? 'transition-none' : 'transition-all duration-200'}`}
                          style={{ 
                            bottom: `calc(32px + ((${parseInt(options.model.bodyDescription?.match(/\d+/)?.[0] || '175')} - 130) / 90) * (100% - 64px))`
                          }}
                        >
                           {/* Glow Line */}
                           <div className={`w-full h-[2px] transition-colors ${isDraggingHeight ? 'bg-brand-primary shadow-[0_0_8px_rgba(22,163,74,0.6)]' : 'bg-brand-primary/40'}`} />
                           
                           {/* Decorative drag handle ring on rule joint */}
                           <div className="absolute left-[80px] w-5 h-5 bg-white border-2 border-brand-primary rounded-full shadow-md flex items-center justify-center -translate-y-1/2">
                             <div className="w-1.5 h-1.5 bg-brand-primary rounded-full animate-ping" style={{ animationDuration: '2s' }} />
                             <div className="absolute w-1.5 h-1.5 bg-brand-primary rounded-full" />
                           </div>

                           {/* Floating height HUD indicator */}
                           <div className={`absolute right-4 px-2.5 py-1 bg-brand-text text-white text-[10px] font-mono font-bold uppercase tracking-wider rounded-lg shadow-lg flex items-center gap-1 transition-all -translate-y-1/2 ${isDraggingHeight ? 'scale-115 bg-brand-primary shadow-brand-primary/20' : ''}`}>
                             <span>{parseInt(options.model.bodyDescription?.match(/\d+/)?.[0] || '175')}</span>
                             <span className="opacity-75 text-[8px]">cm</span>
                           </div>
                        </div>

                        {/* The Avatar */}
                        <div 
                          className={`relative flex flex-col items-center justify-end z-[5] ${isDraggingHeight ? 'transition-none' : 'transition-all duration-500 ease-out'}`}
                          style={{
                            height: `${((parseInt(options.model.bodyDescription?.match(/\d+/)?.[0] || '175') - 130) / 90) * 85 + 10}%`,
                            width: '80px',
                          }}
                        >
                           {/* Head */}
                           <div className="w-9 h-11 bg-white rounded-full border border-brand-primary/30 mb-0.5 shadow-sm ring-4 ring-brand-primary/5" />
                           
                           {/* Neck */}
                           <div className="w-3 h-2 bg-brand-primary/10 -mt-2 mx-auto" />

                           {/* Torso */}
                           <div className="w-14 h-2/5 bg-white rounded-2xl border border-brand-primary/20 relative flex justify-center shadow-md">
                              {/* Body Frame */}
                              <div className="absolute inset-2 bg-brand-primary/5 rounded-xl" />
                              {/* Arms */}
                              <div className="absolute -left-4 top-1 w-3 h-full bg-white/60 rounded-full border border-brand-primary/10" />
                              <div className="absolute -right-4 top-1 w-3 h-full bg-white/60 rounded-full border border-brand-primary/10" />
                           </div>
                           
                           {/* Legs */}
                           <div className="flex gap-3 h-2/5 mt-1">
                              <div className="w-5 h-full bg-white rounded-full border border-brand-primary/20 shadow-sm" />
                              <div className="w-5 h-full bg-white rounded-full border border-brand-primary/20 shadow-sm" />
                           </div>
                        </div>
                      </div>
                  </div>

                  {/* Manual Input for precision */}
                  <div className="flex flex-col gap-2">
                    <input
                      type="text"
                      value={options.model.bodyDescription || ''}
                      onChange={e => setOptions(prev => ({ ...prev, model: { ...prev.model, bodyDescription: e.target.value } }))}
                      placeholder={T.bodyDescriptionPlaceholder}
                      className="w-full bg-brand-surface/50 border border-brand-secondary text-brand-text rounded-2xl shadow-inner px-4 py-3.5 focus:ring-2 focus:ring-brand-primary/10 focus:border-brand-primary outline-none transition-all duration-300 hover:border-brand-primary/40 text-[13px] font-medium"
                    />
                    <div className="flex gap-2">
                      {[155, 165, 175, 185, 195].map((val) => {
                        const isMatch = options.model.bodyDescription?.includes(`${val}cm`);
                        return (
                          <button
                            key={val}
                            type="button"
                            onClick={() => {
                              const existingText = options.model.bodyDescription || '';
                              const baseText = existingText.split('(')[0].trim() || 'Standard build';
                              setOptions(prev => ({ ...prev, model: { ...prev.model, bodyDescription: `${baseText} (${val}cm)` } }));
                            }}
                            className={`flex-1 min-h-[44px] rounded-2xl border text-xs font-bold font-mono transition-all duration-200 active:scale-95 ${
                              isMatch 
                                ? 'bg-brand-primary text-white border-brand-primary shadow-lg shadow-brand-primary/20 scale-105 font-black' 
                                : 'bg-brand-surface border-brand-secondary/30 text-brand-text/50 hover:border-brand-primary/30 hover:bg-white'
                            }`}
                          >
                            {val}cm
                          </button>
                        );
                      })}
                    </div>
                  </div>
              </div>
            </div>
          </div>
             <SelectInput 
                label={T.tattoos} 
                value={options.tattoos} 
                onChange={e => setOptions(prev => ({...prev, tattoos: e.target.value as any}))}
            >
                <option value="none">{T.tattoos_none}</option>
                <option value="minimal">{T.tattoos_minimal}</option>
                <option value="symbols">{T.tattoos_symbols}</option>
                <option value="discreet">{T.tattoos_discreet}</option>
                <option value="full">{T.tattoos_full}</option>
            </SelectInput>
        </Section>

        <Section title={T.garment} defaultOpen={true}>
          <div className="group">
            <div className="flex justify-between items-center mb-2 pl-1">
              <label className="block text-xs font-bold text-brand-text/80 group-hover:text-brand-primary transition-colors">{T.garmentDescription}</label>
              <button
                onClick={handleInspireMe}
                title={T.inspireMe}
                className="flex items-center text-[10px] font-black uppercase tracking-wider text-brand-primary bg-brand-primary/10 px-3 py-1.5 rounded-full hover:bg-brand-primary hover:text-white transition-all duration-300"
                aria-label={T.inspireMe}
              >
                <Icon name="sparkles" className="w-3 h-3 mr-1.5" />
                {T.inspireMe}
              </button>
            </div>
            <div className="relative">
              <textarea
                rows={4}
                value={options.garment.description}
                onChange={e => {
                  setUploadError(null);
                  setOptions(prev => ({...prev, garment: {...prev.garment, description: e.target.value}}));
                }}
                onBlur={e => {
                  if (options.garment.image) {
                    addRecentGarment(options.garment.image, e.target.value, garmentFileName).then(setRecentGarments);
                  }
                }}
                placeholder={T.garmentDescriptionPlaceholder}
                className={`w-full bg-brand-surface/50 border ${uploadError ? 'border-red-500' : 'border-brand-secondary'} text-brand-text rounded-2xl shadow-sm p-4 focus:ring-2 focus:ring-brand-primary/10 focus:border-brand-primary outline-none transition-all duration-300 resize-none hover:border-brand-primary/40 text-sm leading-relaxed ${isAnalyzingGarment ? 'opacity-50' : ''}`}
                disabled={isAnalyzingGarment}
              />
              {isAnalyzingGarment && (
                <div className="absolute inset-0 flex items-center justify-center bg-brand-surface/20 backdrop-blur-[1px] rounded-2xl">
                  <div className="flex items-center gap-2 bg-brand-surface px-4 py-2 rounded-full shadow-lg border border-brand-primary/20">
                    <Icon name="spinner" className="animate-spin w-4 h-4 text-brand-primary" />
                    <span className="text-[10px] font-bold text-brand-primary uppercase tracking-wider">Analyzing Garment...</span>
                  </div>
                </div>
              )}
            </div>
            {uploadError && (
              <p className="mt-1 text-[10px] text-red-500 font-bold uppercase tracking-wider pl-1">{uploadError}</p>
            )}
          </div>
          <div className="mt-2">
            {options.garment.image ? (
              <div className="flex items-center gap-4 p-3 bg-brand-surface/50 rounded-2xl border border-brand-primary/20 animate-in zoom-in-95 duration-300">
                <img 
                  src={`data:${options.garment.image.mimeType};base64,${options.garment.image.base64}`} 
                  alt="Garment" 
                  className="w-14 h-14 rounded-xl object-cover shadow-lg border-2 border-white" 
                />
                <div className="flex-1">
                  <span className="text-xs font-bold text-brand-text uppercase tracking-widest">{T.photoReady}</span>
                </div>
                <button 
                  onClick={handleRemoveGarmentImage}
                  className="bg-red-50 text-red-500 p-2.5 rounded-xl hover:bg-red-500 hover:text-white transition-all active:scale-95"
                  title={T.removePhoto}
                >
                  <Icon name="close" className="w-5 h-5" />
                </button>
              </div>
            ) : (
              <label 
                htmlFor="garment-upload"
                className={`w-full cursor-pointer ${isDraggingGarment ? 'bg-brand-primary/10 border-brand-primary text-brand-primary' : uploadError ? 'bg-red-50 border-red-300 text-red-500' : 'bg-brand-bg/50 hover:bg-brand-surface text-brand-text/60'} font-black uppercase tracking-wider text-[11px] py-4 px-4 rounded-2xl inline-flex items-center justify-center border-2 border-dashed border-brand-secondary transition-all duration-300 hover:border-brand-primary hover:text-brand-primary shadow-sm active:scale-95 ${isAnalyzingGarment ? 'opacity-50 cursor-wait' : ''}`}
                onDragOver={handleDragOverGarment}
                onDragLeave={handleDragLeaveGarment}
                onDrop={handleDropGarment}
              >
                   {isAnalyzingGarment ? (
                      <>
                          <Icon name="spinner" className="animate-spin w-5 h-5 mr-3" />
                          <span>{T.analyzingGarment}</span>
                      </>
                    ) : (
                      <>
                          <Icon name="upload" className="w-5 h-5 mr-3" />
                          <span>{garmentFileName || T.uploadGarment}</span>
                      </>
                    )}
                    <input 
                      type="file" 
                      id="garment-upload"
                      className="hidden" 
                      onChange={handleGarmentFileChange} 
                      accept="image/*" 
                      disabled={isAnalyzingGarment} 
                      onClick={(e) => (e.currentTarget.value = '')}
                    />
                </label>
            )}

            {!options.garment.image && recentGarments.length > 0 && (
              <div className="mt-4">
                <p className="text-[10px] font-bold text-brand-text/50 uppercase tracking-wider mb-2 pl-1">{T.recentGarments}</p>
                <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                  {recentGarments.map(garment => (
                    <button
                      key={garment.id}
                      onClick={() => {
                        setGarmentFileName(garment.name || '');
                        setOptions(prev => ({ 
                          ...prev, 
                          garment: { 
                            ...prev.garment, 
                            image: { base64: garment.base64, mimeType: garment.mimeType },
                            description: garment.description || ''
                          } 
                        }));
                        addRecentGarment({ base64: garment.base64, mimeType: garment.mimeType }, garment.description, garment.name).then(setRecentGarments);
                        
                        // If the garment has no description, try to generate it now
                        if (!garment.description) {
                          setIsAnalyzingGarment(true);
                          generateGarmentDescription({ base64: garment.base64, mimeType: garment.mimeType }, currentApiKey)
                            .then(newDescription => {
                              if (newDescription) {
                                setOptions(prev => ({ ...prev, garment: { ...prev.garment, description: newDescription } }));
                                addRecentGarment({ base64: garment.base64, mimeType: garment.mimeType }, newDescription, garment.name).then(setRecentGarments);
                              }
                            })
                            .catch(err => {
                              console.warn("Retry AI analysis failed:", err);
                              if (onApiKeyError) {
                                const errorMessage = onApiKeyError(err);
                                if (errorMessage && errorMessage !== "An unexpected error occurred. Please try again.") {
                                  setUploadError(errorMessage);
                                } else {
                                  const m = err instanceof Error ? err.message : String(err);
                                  setUploadError(`AI analysis failed: ${m}`);
                                }
                              } else {
                                const m = err instanceof Error ? err.message : String(err);
                                setUploadError(`AI analysis failed: ${m}`);
                              }
                            })
                            .finally(() => setIsAnalyzingGarment(false));
                        }
                      }}
                      className="flex-shrink-0 relative w-16 h-16 rounded-xl overflow-hidden border-2 border-transparent hover:border-brand-primary transition-all duration-300"
                    >
                      <img src={`data:${garment.mimeType};base64,${garment.base64}`} alt="Recent garment" className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </Section>

        <Section title={T.accessories} defaultOpen={false}>
          <div className="space-y-4">
            <div className="group">
              <label className="block text-xs font-bold text-brand-text/80 mb-2 pl-1 group-hover:text-brand-primary transition-colors">{T.shoes}</label>
              <input
                type="text"
                value={options.accessories?.shoes || ''}
                onChange={e => setOptions(prev => ({...prev, accessories: {...prev.accessories, shoes: e.target.value}}))}
                placeholder={T.shoesPlaceholder}
                className="w-full bg-brand-surface/50 border border-brand-secondary text-brand-text rounded-xl shadow-sm px-4 py-3 focus:ring-2 focus:ring-brand-primary/10 focus:border-brand-primary outline-none transition-all duration-300 hover:border-brand-primary/40 text-sm"
              />
              <div className="flex flex-wrap gap-1.5 mt-2">
                {['Christian Louboutin', 'Jimmy Choo', 'Gucci', 'Prada', 'Balenciaga', 'Nike'].map(brand => (
                  <button
                    type="button"
                    key={brand}
                    onClick={() => setOptions(prev => ({...prev, accessories: {...prev.accessories, shoes: brand}}))}
                    className="text-[10px] px-2 py-1 rounded-md bg-brand-secondary/10 text-brand-text/60 hover:bg-brand-primary/20 hover:text-brand-primary transition-colors"
                  >
                    {brand}
                  </button>
                ))}
              </div>
            </div>
            <div className="group">
              <label className="block text-xs font-bold text-brand-text/80 mb-2 pl-1 group-hover:text-brand-primary transition-colors">{T.watch}</label>
              <input
                type="text"
                value={options.accessories?.watch || ''}
                onChange={e => setOptions(prev => ({...prev, accessories: {...prev.accessories, watch: e.target.value}}))}
                placeholder={T.watchPlaceholder}
                className="w-full bg-brand-surface/50 border border-brand-secondary text-brand-text rounded-xl shadow-sm px-4 py-3 focus:ring-2 focus:ring-brand-primary/10 focus:border-brand-primary outline-none transition-all duration-300 hover:border-brand-primary/40 text-sm"
              />
              <div className="flex flex-wrap gap-1.5 mt-2">
                {['Rolex', 'Patek Philippe', 'Audemars Piguet', 'Richard Mille', 'Cartier', 'Omega'].map(brand => (
                  <button
                    type="button"
                    key={brand}
                    onClick={() => setOptions(prev => ({...prev, accessories: {...prev.accessories, watch: brand}}))}
                    className="text-[10px] px-2 py-1 rounded-md bg-brand-secondary/10 text-brand-text/60 hover:bg-brand-primary/20 hover:text-brand-primary transition-colors"
                  >
                    {brand}
                  </button>
                ))}
              </div>
            </div>
            <div className="group">
              <label className="block text-xs font-bold text-brand-text/80 mb-2 pl-1 group-hover:text-brand-primary transition-colors">{T.jewelry}</label>
              <input
                type="text"
                value={options.accessories?.jewelry || ''}
                onChange={e => setOptions(prev => ({...prev, accessories: {...prev.accessories, jewelry: e.target.value}}))}
                placeholder={T.jewelryPlaceholder}
                className="w-full bg-brand-surface/50 border border-brand-secondary text-brand-text rounded-xl shadow-sm px-4 py-3 focus:ring-2 focus:ring-brand-primary/10 focus:border-brand-primary outline-none transition-all duration-300 hover:border-brand-primary/40 text-sm"
              />
              <div className="flex flex-wrap gap-1.5 mt-2">
                {['Cartier', 'Van Cleef & Arpels', 'Tiffany & Co.', 'Bvlgari', 'Harry Winston'].map(brand => (
                  <button
                    type="button"
                    key={brand}
                    onClick={() => setOptions(prev => ({...prev, accessories: {...prev.accessories, jewelry: brand}}))}
                    className="text-[10px] px-2 py-1 rounded-md bg-brand-secondary/10 text-brand-text/60 hover:bg-brand-primary/20 hover:text-brand-primary transition-colors"
                  >
                    {brand}
                  </button>
                ))}
              </div>
            </div>
            <div className="group">
              <label className="block text-xs font-bold text-brand-text/80 mb-2 pl-1 group-hover:text-brand-primary transition-colors">{T.otherAccessories}</label>
              <input
                type="text"
                value={options.accessories?.other || ''}
                onChange={e => setOptions(prev => ({...prev, accessories: {...prev.accessories, other: e.target.value}}))}
                placeholder={T.otherAccessoriesPlaceholder}
                className="w-full bg-brand-surface/50 border border-brand-secondary text-brand-text rounded-xl shadow-sm px-4 py-3 focus:ring-2 focus:ring-brand-primary/10 focus:border-brand-primary outline-none transition-all duration-300 hover:border-brand-primary/40 text-sm"
              />
              <div className="flex flex-wrap gap-1.5 mt-2">
                {['Hermes Birkin', 'Chanel Classic Flap', 'Louis Vuitton', 'Dior Saddle', 'Gucci Belt'].map(brand => (
                  <button
                    type="button"
                    key={brand}
                    onClick={() => setOptions(prev => ({...prev, accessories: {...prev.accessories, other: brand}}))}
                    className="text-[10px] px-2 py-1 rounded-md bg-brand-secondary/10 text-brand-text/60 hover:bg-brand-primary/20 hover:text-brand-primary transition-colors"
                  >
                    {brand}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </Section>
        
        <Section title={T.companion} defaultOpen={!isMobile}>
            <div className="flex items-center mb-2 pl-1">
                <div className="relative inline-block w-10 mr-3 align-middle select-none transition duration-200 ease-in">
                    <input
                        type="checkbox"
                        id="companion-toggle"
                        checked={options.companion.enabled}
                        onChange={(e) => setOptions(prev => ({...prev, companion: {...prev.companion, enabled: e.target.checked}}))}
                        className="toggle-checkbox absolute block w-6 h-6 rounded-full bg-brand-surface border-4 appearance-none cursor-pointer peer checked:right-0 checked:border-brand-primary transition-all duration-300"
                    />
                    <label htmlFor="companion-toggle" className="toggle-label block overflow-hidden h-6 rounded-full bg-brand-secondary cursor-pointer peer-checked:bg-brand-primary/40"></label>
                </div>
                <label htmlFor="companion-toggle" className="text-xs font-black uppercase tracking-wider text-brand-text/80 cursor-pointer">
                    {T.enableCompanion}
                </label>
            </div>
            
            {options.companion.enabled && (
                <div className="transition-all duration-500 ease-in-out space-y-4 animate-in fade-in slide-in-from-top-4 pt-2">
                    <div className="group">
                        <label className="block text-xs font-bold text-brand-text/80 mb-2 pl-1 group-hover:text-brand-primary transition-colors">{T.companionDescription}</label>
                        <textarea
                            rows={3}
                            value={options.companion.description}
                            onChange={(e) => setOptions(prev => ({...prev, companion: {...prev.companion, description: e.target.value}}))}
                            placeholder={T.companionDescriptionPlaceholder}
                            className="w-full bg-brand-surface/50 border border-brand-secondary text-brand-text rounded-2xl shadow-sm p-4 focus:ring-2 focus:ring-brand-primary/10 focus:border-brand-primary outline-none resize-none transition-all duration-300 text-sm"
                        />
                    </div>
                     <div>
                        <label className="block text-xs font-bold text-brand-text/80 mb-2 pl-1">{T.uploadCompanion}</label>
                        {options.companion.image ? (
                            <div className="flex items-center gap-4 p-3 bg-brand-surface/50 rounded-2xl border border-brand-primary/20 animate-in zoom-in-95 duration-300">
                                <img 
                                    src={`data:${options.companion.image.mimeType};base64,${options.companion.image.base64}`} 
                                    alt="Companion" 
                                    className="w-14 h-14 rounded-xl object-cover shadow-lg border-2 border-white" 
                                />
                                <div className="flex-1">
                                    <span className="text-xs font-bold text-brand-text uppercase tracking-widest">{T.photoReady}</span>
                                </div>
                                <button 
                                    onClick={handleRemoveCompanionImage}
                                    className="bg-red-50 text-red-500 p-2.5 rounded-xl hover:bg-red-500 hover:text-white transition-all active:scale-95"
                                    title={T.removePhoto}
                                >
                                    <Icon name="close" className="w-5 h-5" />
                                </button>
                            </div>
                        ) : (
                             <div>
                                <label 
                                    className={`w-full cursor-pointer ${isDraggingCompanion ? 'bg-brand-primary/10 border-brand-primary text-brand-primary' : 'bg-brand-bg/50 hover:bg-brand-surface text-brand-text/60'} font-black uppercase tracking-wider text-[11px] py-4 px-4 rounded-2xl inline-flex items-center justify-center border-2 border-dashed border-brand-secondary transition-all duration-300 hover:border-brand-primary hover:text-brand-primary shadow-sm active:scale-95`}
                                    onDragOver={handleDragOverCompanion}
                                    onDragLeave={handleDragLeaveCompanion}
                                    onDrop={handleDropCompanion}
                                >
                                    <Icon name="upload" className="w-5 h-5 mr-3" />
                                    <span>{T.uploadCompanion || T.uploadPhoto}</span>
                                    <input 
                                        type="file" 
                                        className="hidden" 
                                        onChange={handleCompanionFileChange} 
                                        accept="image/*"
                                        onClick={(e) => (e.currentTarget.value = '')}
                                    />
                                </label>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </Section>

        <Section title={T.scene} defaultOpen={!isMobile}>
          <SelectInput label={T.intent} value={options.intent} onChange={e => setOptions(prev => ({...prev, intent: e.target.value as any}))}>
              <option value="Mode">{T.intent_mode}</option>
              <option value="E-commerce">{T.intent_ecommerce}</option>
              <option value="Lookbook">{T.intent_lookbook}</option>
              <option value="Editorial">{T.intent_editorial}</option>
              <option value="Social Media">{T.intent_social}</option>
              <option value="Corporate">{T.intent_corporate}</option>
          </SelectInput>
          <SelectInput label={T.pose} value={options.pose} onChange={e => setOptions(prev => ({...prev, pose: e.target.value as any}))}>
              <option value="Runway">{T.runway}</option>
              <option value="Editorial">{T.editorial}</option>
              <option value="Portrait">{T.portrait}</option>
              <option value="Dynamic Pose">{T.dynamicPose}</option>
              <option value="Candid">{T.candid}</option>
              <option value="Product Focus">{T.productFocus}</option>
              <option value="Sitting Pose">{T.sittingPose}</option>
              <option value="Gesture">{T.gesture}</option>
              <option value="Selfie Pose">{T.selfiePose}</option>
              <option value="Mode">{T.mode}</option>
              <option value="Glamour">{T.glamour}</option>
              <option value="Corporate">{T.corporate}</option>
              <option value="Smoking">{T.smoking}</option>
              <option value="Classy Business">{T.classyBusiness}</option>
              <option value="Elite Smoking">{T.eliteSmoking}</option>
              <option value="Black and White">{T.blackAndWhite}</option>
              <option value="Elite Cigar Black and White">{T.eliteCigarBlackAndWhite}</option>
              <option value="Keynote Presentation">Keynote Presentation</option>
          </SelectInput>
        </Section>

        <Section title={T.cameraSettings} defaultOpen={false}>
          <SelectInput label={T.cameraAngle} value={options.cameraAngle} onChange={e => setOptions(prev => ({...prev, cameraAngle: e.target.value as any}))}>
              <option value="Eye Level">{T.angle_eye}</option>
              <option value="Low Angle">{T.angle_low}</option>
              <option value="Waist Level">{T.angle_waist}</option>
              <option value="Chest Level">{T.angle_chest}</option>
              <option value="High Angle">{T.angle_high}</option>
              <option value="Overhead">{T.angle_overhead}</option>
          </SelectInput>
          <SelectInput label={T.cameraAxis} value={options.cameraAxis} onChange={e => setOptions(prev => ({...prev, cameraAxis: e.target.value as any}))}>
              {options.environment === 'On stage as Keynote speaker' || options.pose === 'Keynote Presentation' ? (
                  <>
                      <option value="Front">{(T as any).keynote_axis_front || 'From Audience (Faces Camera)'}</option>
                      <option value="3/4 View">{(T as any).keynote_axis_threeQuarter || 'Stage Diagonal (Faces Audience)'}</option>
                      <option value="Profile">{(T as any).keynote_axis_profile || 'Side Stage (Faces Audience)'}</option>
                      <option value="Back">{(T as any).keynote_axis_back || 'Behind Speaker (Shows Audience)'}</option>
                  </>
              ) : (
                  <>
                      <option value="Front">{T.axis_front}</option>
                      <option value="3/4 View">{T.axis_threeQuarter}</option>
                      <option value="Profile">{T.axis_profile}</option>
                      <option value="Back">{T.axis_back}</option>
                  </>
              )}
          </SelectInput>
          <SelectInput label={T.cameraDistance} value={options.cameraDistance} onChange={e => setOptions(prev => ({...prev, cameraDistance: e.target.value as any}))}>
              <option value="Close-up (Face)">{T.dist_closeup}</option>
              <option value="Waist Up">{T.dist_waist}</option>
              <option value="Full Body">{T.dist_full}</option>
              <option value="Wide Shot">{T.dist_wide}</option>
          </SelectInput>
          <SelectInput label={T.cameraLens} value={options.cameraLens} onChange={e => setOptions(prev => ({...prev, cameraLens: e.target.value as any}))}>
              <option value="35mm (Reportage)">{T.lens_35mm}</option>
              <option value="50mm (Natural)">{T.lens_50mm}</option>
              <option value="85mm (Portrait/Bokeh)">{T.lens_85mm}</option>
              <option value="200mm (Compression)">{T.lens_200mm}</option>
          </SelectInput>
        </Section>

        <Section title={T.environment} defaultOpen={false}>
          <SelectInput label={T.backgroundType} value={options.backgroundType} onChange={e => setOptions(prev => ({...prev, backgroundType: e.target.value as any}))}>
              <option value="Solid Color">{T.bg_solid}</option>
              <option value="Textured">{T.bg_textured}</option>
              <option value="Artistic Painted">{T.bg_artistic}</option>
              <option value="Cyclorama">{T.bg_cyclorama}</option>
          </SelectInput>
          <SelectInput 
            label={T.environment} 
            value={options.environment} 
            onChange={e => setOptions(prev => ({...prev, environment: e.target.value as any}))}
            rightElement={
              <button
                onClick={handleRandomizeEnvironment}
                className="flex items-center text-[10px] font-black uppercase tracking-wider text-brand-primary bg-brand-primary/10 px-3 py-1.5 rounded-full hover:bg-brand-primary hover:text-white transition-all duration-300"
              >
                <Icon name="shuffle" className="w-3 h-3 mr-1.5" />
                {T.randomizeEnvironment}
              </button>
            }
          >
              <option value="Studio">{T.env_studio}</option>
              <option value="African Architecture">{T.env_africanArch}</option>
              <option value="African Nature">{T.env_africanNature}</option>
              <option value="African Urban">{T.env_africanUrban}</option>
              <option value="Local Luxury">{T.env_localLuxury}</option>
              <option value="Runway">{T.env_runway}</option>
              <option value="Outdoor">{T.env_outdoor}</option>
              <option value="Desert Oasis">{T.env_desertOasis}</option>
              <option value="On stage as Keynote speaker">{T.env_conferenceRoom}</option>
              <option value="Podcast studio">{T.env_podcastStudio}</option>
              <option value="Meme setting">{T.env_memeSetting}</option>
          </SelectInput>
          
          {options.environment === 'On stage as Keynote speaker' && (
              <div className="mt-4 p-4 rounded-2xl bg-brand-secondary/10 border border-brand-primary/20 space-y-4">
                  <h4 className="text-sm font-bold text-brand-primary">Conference Room Details</h4>

                  <SelectInput label={T.micType} value={options.conferenceMicType || 'Podium Gooseneck'} onChange={e => setOptions(prev => ({...prev, conferenceMicType: e.target.value as any}))}>
                      <option value="Podium Gooseneck">{T.mic_podium}</option>
                      <option value="Discreet Headset">{T.mic_headset}</option>
                      <option value="Handheld">{T.mic_handheld}</option>
                      <option value="None">{T.mic_none}</option>
                  </SelectInput>

                  <SelectInput label={T.audienceView} value={options.conferenceAudience || 'Blurred Background'} onChange={e => setOptions(prev => ({...prev, conferenceAudience: e.target.value as any}))}>
                      <option value="Blurred Background">{T.aud_blurred}</option>
                      <option value="Grand Plan (Wide Shot)">{T.aud_grandPlan}</option>
                      <option value="Silhouette Foreground">{T.aud_silhouette}</option>
                      <option value="None">{T.aud_none}</option>
                  </SelectInput>
                  
                  <div className="group">
                      <label className="block text-xs font-bold text-brand-text/80 mb-2 pl-1 group-hover:text-brand-primary transition-colors">Giant Screen Background Text (Optional)</label>
                      <input
                          type="text"
                          value={options.conferenceScreenText || ''}
                          onChange={e => setOptions(prev => ({...prev, conferenceScreenText: e.target.value}))}
                          placeholder="e.g. 'Future of AI 2026', 'Innovation Summit'"
                          className="w-full bg-brand-surface border border-brand-secondary text-brand-text rounded-xl shadow-sm px-4 py-2 focus:ring-2 focus:ring-brand-primary/10 focus:border-brand-primary outline-none text-sm"
                      />
                  </div>

                  <div className="group">
                      <label className="block text-xs font-bold text-brand-text/80 mb-2 pl-1 group-hover:text-brand-primary transition-colors">Kakimono / Banner Text (Optional)</label>
                      <input
                          type="text"
                          value={options.conferenceKakimonoText || ''}
                          onChange={e => setOptions(prev => ({...prev, conferenceKakimonoText: e.target.value}))}
                          placeholder="e.g. 'Sponsor Name', 'Event Details'"
                          className="w-full bg-brand-surface border border-brand-secondary text-brand-text rounded-xl shadow-sm px-4 py-2 focus:ring-2 focus:ring-brand-primary/10 focus:border-brand-primary outline-none text-sm"
                      />
                  </div>

                  <div className="group">
                      <label className="block text-xs font-bold text-brand-text/80 mb-2 pl-1 group-hover:text-brand-primary transition-colors">Kakimono Logo (Optional)</label>
                      <input
                          type="file"
                          accept="image/png, image/jpeg, image/webp"
                          className="block w-full text-xs text-brand-text/70 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-brand-primary/10 file:text-brand-primary hover:file:bg-brand-primary/20 transition-all"
                          onChange={async (e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                  const reader = new FileReader();
                                  reader.onloadend = () => {
                                      const base64Data = (reader.result as string).split(',')[1];
                                      setOptions(prev => ({
                                          ...prev,
                                          conferenceKakimonoLogo: {
                                              base64: base64Data,
                                              mimeType: file.type
                                          }
                                      }));
                                  };
                                  reader.readAsDataURL(file);
                              }
                          }}
                      />
                      {options.conferenceKakimonoLogo && (
                          <div className="mt-2 text-xs text-green-500 font-medium ml-1">Logo uploaded successfully ✓</div>
                      )}
                  </div>
              </div>
          )}

          <div className="mt-4 group pb-4 border-b border-brand-secondary/20">
              <label className="block text-xs font-bold text-brand-text/80 mb-2 pl-1 group-hover:text-brand-primary transition-colors flex items-center">
                  <Icon name="wand" className="w-3.5 h-3.5 mr-1.5 opacity-70" />
                  {T.additionalPrompt}
              </label>
              <textarea
                  value={options.customPrompt || ''}
                  onChange={e => setOptions(prev => ({...prev, customPrompt: e.target.value}))}
                  placeholder={T.additionalPromptPlaceholder}
                  className="w-full bg-brand-surface border border-brand-secondary text-brand-text rounded-xl shadow-sm px-4 py-3 focus:ring-2 focus:ring-brand-primary/10 focus:border-brand-primary outline-none text-sm min-h-[80px] resize-y transition-all hover:border-brand-primary/40"
              />
          </div>

          <SelectInput label={T.colorPalette} value={options.colorPalette} onChange={e => setOptions(prev => ({...prev, colorPalette: e.target.value as any}))}>
              <option value="Neutral">{T.palette_neutral}</option>
              <option value="Earthy">{T.palette_earthy}</option>
              <option value="Vibrant">{T.palette_vibrant}</option>
              <option value="Monochrome">{T.palette_monochrome}</option>
              <option value="Pastel">{T.palette_pastel}</option>
              <option value="Dark & Moody">{T.palette_dark}</option>
          </SelectInput>
        </Section>

        <Section title={T.postProcessingTitle} defaultOpen={false}>
          <SelectInput label={T.filmGrain} value={options.filmGrain} onChange={e => setOptions(prev => ({...prev, filmGrain: e.target.value as any}))}>
              <option value="Analog Film">{T.grain_analog}</option>
              <option value="Crisp Digital">{T.grain_digital}</option>
              <option value="HDR">{T.grain_hdr}</option>
          </SelectInput>
          <SelectInput label={T.postProcessing} value={options.postProcessing} onChange={e => setOptions(prev => ({...prev, postProcessing: e.target.value as any}))}>
              <option value="Vibrant Colors">{T.post_vibrant}</option>
              <option value="Desaturated">{T.post_desaturated}</option>
              <option value="Monochrome">{T.post_monochrome}</option>
          </SelectInput>
        </Section>
        
        <Section title={T.output} defaultOpen={!isMobile}>
          <SelectInput 
            label={T.variants} 
            value={options.variants.toString()} 
            onChange={e => setOptions(prev => ({...prev, variants: parseInt(e.target.value)}))}
          >
            {[1, 2, 3].map(num => (
              <option key={num} value={num}>{num}</option>
            ))}
          </SelectInput>
          
          <div>
            <label className="block text-xs font-bold text-brand-text/80 mb-2 pl-1">{T.aspectRatio}</label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-1.5 bg-brand-bg/50 rounded-2xl border border-brand-secondary/30">
              {(['1:1', '9:16', '16:9', '4:5', '5:4', '3:4', '4:3'] as const).map(ratio => (
                <button 
                  key={ratio} 
                  onClick={() => setOptions(prev => ({...prev, aspectRatio: ratio}))}
                  className={`py-2.5 rounded-xl text-[11px] uppercase tracking-widest transition-all duration-300 shadow-sm ${options.aspectRatio === ratio ? 'font-black bg-brand-surface text-brand-primary shadow-xl shadow-brand-primary/10 ring-1 ring-brand-primary/20 scale-105' : 'font-semibold text-brand-text/40 hover:text-brand-text/60 hover:bg-brand-surface/50'}`}
                >
                  {ratio}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between p-4 bg-brand-surface rounded-2xl border border-brand-secondary/30 shadow-sm">
            <div>
              <label className="block text-sm font-bold text-brand-text">{T.bwMode || 'Black & White Mode'}</label>
              <p className="text-xs text-brand-text-secondary mt-1">{T.bwModeDesc || 'Force pure grayscale photo output'}</p>
            </div>
            <button
              onClick={() => setOptions(prev => ({ ...prev, isBlackAndWhite: !prev.isBlackAndWhite }))}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-brand-primary/50 focus:ring-offset-2 ${options.isBlackAndWhite ? 'bg-brand-primary' : 'bg-brand-secondary/30'}`}
            >
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition duration-200 ease-in-out ${options.isBlackAndWhite ? 'translate-x-6' : 'translate-x-1'}`} />
            </button>
          </div>

          <div className="flex items-center justify-between p-4 bg-brand-surface rounded-2xl border border-brand-secondary/30 shadow-sm mt-3">
            <div>
              <label className="block text-sm font-bold text-brand-text">{T.watermark}</label>
              <p className="text-xs text-brand-text-secondary mt-1">{T.watermarkDesc}</p>
            </div>
            <button
              onClick={() => setOptions(prev => ({ ...prev, watermark: !prev.watermark }))}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-brand-primary focus:ring-offset-2 ${options.watermark ? 'bg-brand-primary' : 'bg-gray-200'}`}
            >
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${options.watermark ? 'translate-x-6' : 'translate-x-1'}`} />
            </button>
          </div>
        </Section>
        
        <div className="fixed lg:relative bottom-0 left-0 right-0 p-4 lg:p-0 bg-brand-surface lg:bg-transparent border-t border-brand-secondary/20 lg:border-none z-40 backdrop-blur-xl lg:backdrop-blur-none">
            {canGenerate ? (
                <button
                id="generate-btn"
                onClick={onGenerate}
                disabled={isLoading}
                className="w-full bg-gradient-to-r from-brand-primary to-green-500 text-white font-black uppercase tracking-[0.2em] py-5 px-6 rounded-2xl shadow-2xl shadow-brand-primary/40 hover:shadow-green-500/50 hover:opacity-95 transition-all duration-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center transform hover:-translate-y-1 active:scale-95 disabled:transform-none text-sm"
                >
                {isLoading ? <Icon name="spinner" className="animate-spin w-6 h-6 mr-3" /> : <Icon name="sparkles" className="w-6 h-6 mr-3" />}
                {isLoading ? T.generating : `${T.generate} (${options.variants * 2} ${T.creditsLabel})`}
                </button>
            ) : (
                <div className="space-y-4">
                    <button
                    onClick={onOpenPaywall}
                    className="w-full bg-gradient-to-r from-brand-primary to-green-500 text-white font-black uppercase tracking-[0.2em] py-5 px-6 rounded-2xl shadow-2xl shadow-brand-primary/40 hover:shadow-green-500/50 hover:scale-[1.02] transition-all duration-500 flex items-center justify-center text-sm"
                    >
                    {T.buyCredits}
                    </button>
                    <a 
                    href={WHATSAPP_SUPPORT_LINK} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="block w-full text-center text-brand-primary font-black uppercase tracking-widest text-[10px] py-2 hover:opacity-70 transition-opacity"
                    >
                    {T.contactSupport}
                    </a>
                </div>
            )}
        </div>
      </div>
    </Fragment>
  );
};