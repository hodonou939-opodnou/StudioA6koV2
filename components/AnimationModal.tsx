
import React, { useState, useCallback, useEffect } from 'react';
import type { AnimationOptions, Asset } from '../types';
import { Icon } from './Icon';
import { generateInspirationalScript } from '../services/geminiService';

interface AnimationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (options: AnimationOptions) => void;
  isLoading: boolean;
  T: any;
  asset: Asset | null;
}

const SelectInput: React.FC<{ label: string; value: string; onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void; children: React.ReactNode }> = ({ label, value, onChange, children }) => (
  <div>
    <label className="block text-sm font-medium text-brand-text mb-1">{label}</label>
    <select
      value={value}
      onChange={onChange}
      className="w-full bg-brand-bg border border-brand-secondary/50 text-brand-text rounded-md shadow-sm p-2 focus:ring-brand-primary focus:border-brand-primary"
    >
      {children}
    </select>
  </div>
);


export const AnimationModal: React.FC<AnimationModalProps> = ({ isOpen, onClose, onSubmit, isLoading, T, asset }) => {
  const [options, setOptions] = useState<AnimationOptions>({
    duration: 4,
    audioType: 'none',
    musicStyle: 'Uplifting Electronic',
    script: T.defaultVoiceoverScript,
    voiceGender: 'auto',
    cameraMove: 'none',
    style: 'normal',
  });
  const [isInspiringScript, setIsInspiringScript] = useState(false);
  const [scriptError, setScriptError] = useState<string | null>(null);
  const [isShowing, setIsShowing] = useState(false);
  const [jsonPrompt, setJsonPrompt] = useState('');
  const [isCopied, setIsCopied] = useState(false);

  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => setIsShowing(true), 10);
      return () => clearTimeout(timer);
    } else {
      setIsShowing(false);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!asset) {
      setJsonPrompt('');
      return;
    }

    const promptObject: any = {
      sourceImageMetadata: {
        id: asset.id,
        garment: asset.metadata.garmentDescription,
        environment: asset.metadata.environment,
      },
      animationSettings: {
        durationSeconds: options.duration,
        cameraMovement: options.cameraMove,
        animationStyle: options.style,
      },
      audioSettings: {
        type: options.audioType,
      },
    };

    if (options.audioType === 'music') {
      promptObject.audioSettings.musicStyle = options.musicStyle;
    } else if (options.audioType === 'script') {
      promptObject.audioSettings.voiceover = {
        script: options.script,
        gender: options.voiceGender,
      };
    }
    
    setJsonPrompt(JSON.stringify(promptObject, null, 2));
  }, [options, asset]);


  const handleClose = useCallback(() => {
    setIsShowing(false);
    setTimeout(onClose, 300); // Wait for animation to finish
  }, [onClose]);

  const handleAudioTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newType = e.target.value as AnimationOptions['audioType'];
    setScriptError(null);
    setOptions(prev => ({ ...prev, audioType: newType }));
  };
  
  const handleInspireScript = useCallback(async () => {
    setIsInspiringScript(true);
    setScriptError(null);
    try {
      const newScript = await generateInspirationalScript(T.defaultVoiceoverScript);
      setOptions(prev => ({ ...prev, script: newScript }));
    } catch (error) {
      console.error(error);
      setScriptError("Failed to generate a new script idea. Please try again.");
    } finally {
      setIsInspiringScript(false);
    }
  }, [T.defaultVoiceoverScript]);
  
  const handleCopy = useCallback(() => {
    if (isCopied) return;
    navigator.clipboard.writeText(jsonPrompt).then(() => {
        setIsCopied(true);
        setTimeout(() => setIsCopied(false), 2000);
    }).catch(err => {
        console.error('Failed to copy text: ', err);
    });
  }, [isCopied, jsonPrompt]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(options);
  };

  if (!isOpen) return null;

  return (
    <div 
      className={`fixed inset-0 bg-brand-bg/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 transition-opacity duration-300 ease-in-out ${isShowing ? 'opacity-100' : 'opacity-0'}`} 
      aria-modal="true" 
      role="dialog"
      onClick={handleClose}
    >
      <form 
        onSubmit={handleSubmit} 
        onClick={(e) => e.stopPropagation()}
        className={`bg-brand-surface rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] flex flex-col transform transition-all duration-300 ease-in-out ${isShowing ? 'scale-100 opacity-100' : 'scale-95 opacity-0'}`}
      >
        <div className="flex justify-between items-center p-4 border-b border-brand-secondary">
          <h2 className="text-xl font-bold text-brand-text">{T.animationSettings}</h2>
          <button type="button" onClick={handleClose} className="p-2 rounded-full hover:bg-brand-secondary transition-colors duration-200" aria-label={T.close}>
            <Icon name="close" className="w-6 h-6 text-brand-text-secondary" />
          </button>
        </div>
        
        <div className="p-6 overflow-y-auto space-y-4">
            <div>
              <label className="block text-sm font-medium text-brand-text mb-1">{T.animationDuration} ({options.duration}s)</label>
              <input type="range" min="2" max="10" value={options.duration} onChange={e => setOptions(prev => ({...prev, duration: parseInt(e.target.value)}))}
                className="w-full h-2 bg-brand-secondary rounded-lg appearance-none cursor-pointer accent-brand-primary"
              />
            </div>
             <SelectInput label={T.animationCameraMove} value={options.cameraMove} onChange={e => setOptions(prev => ({...prev, cameraMove: e.target.value as any}))}>
                  <option value="none">{T.cameraMoveNone}</option>
                  <option value="pan">{T.cameraMovePan}</option>
                  <option value="zoom">{T.cameraMoveZoom}</option>
                  <option value="dolly">{T.cameraMoveDolly}</option>
              </SelectInput>
               <SelectInput label={T.animationStyle} value={options.style} onChange={e => setOptions(prev => ({...prev, style: e.target.value as any}))}>
                  <option value="normal">{T.styleNormal}</option>
                  <option value="slow-motion">{T.styleSlowMo}</option>
                  <option value="fast-forward">{T.styleFastForward}</option>
              </SelectInput>
               <SelectInput label={T.audioType} value={options.audioType} onChange={handleAudioTypeChange}>
                  <option value="none">{T.audioNone}</option>
                  <option value="music">{T.audioMusic}</option>
                  <option value="script">{T.audioScript}</option>
              </SelectInput>
               
              {options.audioType === 'music' && (
                <SelectInput label={T.musicStyle} value={options.musicStyle} onChange={e => setOptions(prev => ({...prev, musicStyle: e.target.value as any}))}>
                    <option value="Uplifting Electronic">{T.musicUplifting}</option>
                    <option value="Calm Lo-fi">{T.musicLofi}</option>
                    <option value="Cinematic Orchestra">{T.musicCinematic}</option>
                    <option value="Tribal Beats">{T.musicTribal}</option>
                </SelectInput>
              )}
               {options.audioType === 'script' && (
                <>
                  <SelectInput label={T.voiceGender} value={options.voiceGender} onChange={e => setOptions(prev => ({ ...prev, voiceGender: e.target.value as any }))}>
                      <option value="auto">{T.voiceAuto}</option>
                      <option value="female">{T.voiceFemale}</option>
                      <option value="male">{T.voiceMale}</option>
                  </SelectInput>
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <label className="block text-sm font-medium text-brand-text">{T.voiceoverScript}</label>
                      <button
                        type="button"
                        onClick={handleInspireScript}
                        title={T.inspireMe}
                        className="p-1 text-brand-text-secondary hover:text-brand-primary transition-colors duration-200 disabled:opacity-50"
                        aria-label={T.inspireMe}
                        disabled={isInspiringScript}
                      >
                        {isInspiringScript ? <Icon name="spinner" className="w-4 h-4 animate-spin" /> : <Icon name="sparkles" className="w-4 h-4" />}
                      </button>
                    </div>
                    <textarea
                      rows={4}
                      value={options.script}
                      onChange={e => setOptions(prev => ({...prev, script: e.target.value}))}
                      placeholder={T.voiceoverScriptPlaceholder}
                      className="w-full bg-brand-bg border border-brand-secondary/50 text-brand-text rounded-md shadow-sm p-2 focus:ring-brand-primary focus:border-brand-primary"
                    />
                    {scriptError && <p className="text-red-400 text-sm mt-1">{scriptError}</p>}
                  </div>
                </>
              )}
              <div className="pt-2">
                <label className="block text-sm font-medium text-brand-text mb-2">{T.generatedPrompt}</label>
                <div className="relative">
                    <pre className="w-full bg-brand-bg border border-brand-secondary/50 text-brand-text-secondary rounded-md shadow-sm p-3 text-xs overflow-x-auto max-h-36 font-mono">
                        <code>{jsonPrompt}</code>
                    </pre>
                    <button
                        type="button"
                        onClick={handleCopy}
                        className="absolute top-2 right-2 p-1.5 rounded-md bg-brand-secondary text-brand-text-secondary hover:bg-brand-bg disabled:opacity-50 transition-colors"
                        aria-label={isCopied ? T.copied : T.copy}
                        title={isCopied ? T.copied : T.copy}
                    >
                        {isCopied ? <Icon name="check" className="w-4 h-4 text-green-400" /> : <Icon name="copy" className="w-4 h-4" />}
                    </button>
                </div>
            </div>
        </div>

        <div className="p-4 border-t border-brand-secondary mt-auto">
           <button 
             type="submit"
             disabled={isLoading}
             className="w-full bg-brand-primary text-brand-bg font-bold py-2.5 px-4 rounded-lg shadow-lg hover:opacity-90 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center transform hover:-translate-y-0.5"
           >
             {isLoading ? <Icon name="spinner" className="animate-spin w-5 h-5 mr-2" /> : <Icon name="film" className="w-5 h-5 mr-2" />}
             {isLoading ? T.animating : T.generateAnimation}
           </button>
        </div>
      </form>
    </div>
  );
};
