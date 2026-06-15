
import React, { useState, useCallback, useEffect } from 'react';
import type { ModelOptions } from '../types';
import { generateModelImages } from '../services/geminiService';
import { Icon } from './Icon';
import { MODEL_PROMPTS } from '../modelPrompts';
import { getUserModels, saveUserModel } from '../utils/localStorage';
import { fileToBase64 } from '../utils/fileUtils';

interface ModelSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectModel: (model: ModelOptions) => void;
  currentModelName: string;
  T: any;
}

const fileToModelOptions = (file: File): Promise<ModelOptions> => {
  return fileToBase64(file).then(image => ({
    name: file.name.length > 30 ? `${file.name.substring(0, 27)}...` : file.name,
    image,
  }));
};

export const ModelSelectionModal: React.FC<ModelSelectionModalProps> = ({
  isOpen,
  onClose,
  onSelectModel,
  T,
}) => {
  const [generatePrompt, setGeneratePrompt] = useState('An African woman as a fashion model, hourglass body, dressed in a floral summer dress');
  const [isGeneratingModel, setIsGeneratingModel] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [userModels, setUserModels] = useState<ModelOptions[]>([]);
  const [generatedVariations, setGeneratedVariations] = useState<ModelOptions[]>([]);
  const [isShowing, setIsShowing] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setUserModels(getUserModels());
      setGeneratedVariations([]); // Reset variations when modal opens
      const timer = setTimeout(() => setIsShowing(true), 10);
      return () => clearTimeout(timer);
    } else {
      setIsShowing(false);
    }
  }, [isOpen]);

  const handleClose = useCallback(() => {
    setIsShowing(false);
    setTimeout(onClose, 300); // Wait for animation to finish
  }, [onClose]);

  const handleInspireMe = useCallback(() => {
    const randomPrompt = MODEL_PROMPTS[Math.floor(Math.random() * MODEL_PROMPTS.length)];
    setGeneratePrompt(randomPrompt);
  }, []);

  const handleGenerateModel = async () => {
    if (!generatePrompt.trim()) return;
    setIsGeneratingModel(true);
    setError(null);
    setGeneratedVariations([]);
    try {
      const images = await generateModelImages(generatePrompt, 4);
      const variations = images.map((image, index) => ({
        name: `Generated: ${generatePrompt.substring(0, 20)}... (v${index + 1})`,
        image,
      }));
      setGeneratedVariations(variations);
    } catch (err) {
      setError(err instanceof Error ? err.message : T.failedToGenerateModel);
    } finally {
      setIsGeneratingModel(false);
    }
  };

  const handleUploadModel = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setIsUploading(true);
      setError(null);
      try {
        const model = await fileToModelOptions(file);
        saveUserModel(model);
        onSelectModel(model); // This will close the modal via parent state change
      } catch (err) {
        setError(T.failedToUploadModel);
      } finally {
        setIsUploading(false);
      }
    }
  }, [onSelectModel, T.failedToUploadModel]);

  if (!isOpen) return null;

  return (
    <div 
        className={`fixed inset-0 bg-brand-bg/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 transition-opacity duration-300 ease-in-out ${isShowing ? 'opacity-100' : 'opacity-0'}`} 
        aria-modal="true" 
        role="dialog"
        onClick={handleClose}
      >
      <div 
        onClick={(e) => e.stopPropagation()}
        className={`bg-brand-surface rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col transform transition-all duration-300 ease-in-out ${isShowing ? 'scale-100 opacity-100' : 'scale-95 opacity-0'}`}
        >
        <div className="flex justify-between items-center p-4 border-b border-brand-secondary">
          <h2 className="text-xl font-bold text-brand-text">{T.chooseYourModel}</h2>
          <button onClick={handleClose} className="p-2 rounded-full hover:bg-brand-secondary transition-colors" aria-label={T.close}>
            <Icon name="close" className="w-6 h-6 text-brand-text-secondary" />
          </button>
        </div>
        
        <div className="p-6 overflow-y-auto space-y-8">
          
          {/* PRIMARY ACTION: UPLOAD PHOTO */}
          <div>
              <div className="bg-brand-bg/50 border-2 border-dashed border-brand-primary/40 hover:border-brand-primary rounded-xl p-8 text-center transition-all duration-300 group hover:bg-brand-primary/5">
                <label htmlFor="modal-model-upload" className="w-full h-full cursor-pointer flex flex-col items-center justify-center">
                      <div className="w-20 h-20 bg-brand-surface rounded-full shadow-md flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                        {isUploading ? (
                            <Icon name="spinner" className="animate-spin w-10 h-10 text-brand-primary" />
                        ) : (
                            <Icon name="upload" className="w-10 h-10 text-brand-primary" />
                        )}
                      </div>
                      <h3 className="text-xl font-bold text-brand-text mb-2">{T.uploadAPhoto}</h3>
                      <p className="text-sm text-brand-text-secondary mb-6 max-w-xs mx-auto">
                        {T.uploadModelGuidance}
                      </p>
                      <span className="bg-brand-primary text-brand-bg font-bold py-3 px-8 rounded-full shadow-lg hover:shadow-xl transition-all hover:-translate-y-1">
                          {isUploading ? T.uploading : T.select}
                      </span>
                  </label>
                  <input id="modal-model-upload" type="file" className="hidden" onChange={handleUploadModel} accept="image/png, image/jpeg, image/webp" disabled={isUploading} />
              </div>
          </div>

          {/* Your Uploaded Models (History) */}
          {userModels.length > 0 && (
            <div>
                <h3 className="text-sm font-semibold text-brand-text-secondary uppercase tracking-wider mb-3">{T.yourUploadedModels}</h3>
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
                    {userModels.map(model => (
                        <button 
                            key={model.name} 
                            onClick={() => onSelectModel(model)}
                            className="aspect-square rounded-lg overflow-hidden border-2 border-transparent hover:border-brand-primary focus:border-brand-primary focus:outline-none transition-all group relative"
                            title={`Select ${model.name}`}
                        >
                            <img src={`data:${model.image.mimeType};base64,${model.image.base64}`} alt={model.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
                        </button>
                    ))}
                </div>
            </div>
           )}

           <div className="relative py-2">
            <div className="absolute inset-0 flex items-center" aria-hidden="true">
              <div className="w-full border-t border-brand-secondary/50" />
            </div>
            <div className="relative flex justify-center">
              <span className="bg-brand-surface px-4 text-sm font-bold text-brand-text-secondary">{T.orCreateWithAI}</span>
            </div>
          </div>

          {/* Generate Your Own (Secondary) */}
          <div className="bg-brand-secondary/20 p-6 rounded-xl">
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-sm font-semibold text-brand-text-secondary uppercase tracking-wider flex items-center">
                    <Icon name="sparkles" className="w-4 h-4 mr-2" />
                    {T.generateYourOwn}
                </h3>
                 <button
                    onClick={handleInspireMe}
                    title={T.inspireMe}
                    className="text-brand-primary text-xs font-bold hover:underline flex items-center"
                    aria-label={T.inspireMe}
                  >
                    {T.inspireMe}
                  </button>
            </div>
             <div className="flex flex-col sm:flex-row gap-3">
                <input 
                    type="text" 
                    value={generatePrompt} 
                    onChange={e => setGeneratePrompt(e.target.value)} 
                    placeholder={T.generateModelPromptPlaceholder} 
                    className="flex-1 bg-brand-surface border border-brand-secondary text-brand-text rounded-lg shadow-sm p-3 focus:ring-brand-primary focus:border-brand-primary transition-shadow" 
                    disabled={isGeneratingModel}
                />
                <button 
                    onClick={handleGenerateModel} 
                    disabled={isGeneratingModel || !generatePrompt.trim()} 
                    className="bg-brand-text text-brand-bg font-bold py-3 px-6 rounded-lg hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center min-w-[120px]"
                >
                    {isGeneratingModel ? <Icon name="spinner" className="animate-spin w-5 h-5" /> : T.generateModel}
                </button>
             </div>
             {isGeneratingModel && <p className="text-sm text-brand-text-secondary animate-pulse mt-2 text-center">{T.generatingModel}</p>}
             
             {generatedVariations.length > 0 && (
                <div className="mt-6">
                    <h4 className="text-xs font-semibold text-brand-text-secondary uppercase tracking-wider mb-3">{T.selectAVariation}</h4>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        {generatedVariations.map((model, index) => (
                            <button 
                                key={index} 
                                onClick={() => onSelectModel(model)}
                                className="aspect-square rounded-lg overflow-hidden border-2 border-transparent hover:border-brand-primary focus:border-brand-primary focus:outline-none transition-all group"
                                title={`Select ${model.name}`}
                            >
                                <img src={`data:${model.image.mimeType};base64,${model.image.base64}`} alt={model.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                            </button>
                        ))}
                    </div>
                </div>
              )}
          </div>
          
          {error && <p className="text-red-500 font-medium text-sm text-center bg-red-50 p-3 rounded-lg">{error}</p>}
        </div>

        <div className="p-4 border-t border-brand-secondary text-right bg-brand-surface rounded-b-2xl">
           <button 
             onClick={handleClose}
             className="text-brand-text-secondary hover:text-brand-text font-medium text-sm underline"
           >
             {T.close}
           </button>
        </div>
      </div>
    </div>
  );
};
