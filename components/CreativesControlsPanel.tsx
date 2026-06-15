import React, { Fragment, useRef, useCallback, useState } from 'react';
import { CreativesOptions, UserState } from '../types';
import { textContent } from '../constants';
import { Icon } from './Icon';
import { fileToBase64 } from '../utils/fileUtils';

interface CreativesControlsPanelProps {
  options: CreativesOptions;
  setOptions: React.Dispatch<React.SetStateAction<CreativesOptions>>;
  onGenerate: () => void;
  isLoading: boolean;
  userState: UserState | null;
  language: 'en' | 'fr';
}

const Section: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <div className="mb-8">
    <h3 className="text-[10px] font-mono text-brand-text-secondary uppercase tracking-widest mb-4 border-b border-brand-secondary/30 pb-2">{title}</h3>
    <div className="space-y-4">
      {children}
    </div>
  </div>
);

const TextInput: React.FC<{ label: string; value: string; onChange: (e: React.ChangeEvent<HTMLInputElement>) => void; placeholder?: string; tooltip?: string }> = ({ label, value, onChange, placeholder, tooltip }) => (
  <div className="flex flex-col gap-1.5">
    <div className="flex items-center gap-2">
      <label className="text-xs font-medium text-brand-text/80">{label}</label>
      {tooltip && <span className="text-[10px] text-brand-text-secondary bg-brand-surface border border-brand-secondary/20 px-1.5 py-0.5 rounded-md cursor-help" title={tooltip}>?</span>}
    </div>
    <input
      type="text"
      className="bg-brand-bg border border-brand-secondary/50 rounded-lg px-3 py-2 text-sm text-brand-text focus:outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary transition-all"
      value={value}
      onChange={onChange}
      placeholder={placeholder}
    />
  </div>
);

const TextAreaInput: React.FC<{ label: string; value: string; onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void; placeholder?: string; rows?: number; tooltip?: string }> = ({ label, value, onChange, placeholder, rows = 3, tooltip }) => (
  <div className="flex flex-col gap-1.5">
    <div className="flex items-center gap-2">
      <label className="text-xs font-medium text-brand-text/80">{label}</label>
      {tooltip && <span className="text-[10px] text-brand-text-secondary bg-brand-surface border border-brand-secondary/20 px-1.5 py-0.5 rounded-md cursor-help" title={tooltip}>?</span>}
    </div>
    <textarea
      className="bg-brand-bg border border-brand-secondary/50 rounded-lg px-3 py-2 text-sm text-brand-text focus:outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary transition-all resize-none"
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      rows={rows}
    />
  </div>
);

const SelectInput: React.FC<{ label: string; value: string; onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void; children: React.ReactNode; tooltip?: string }> = ({ label, value, onChange, children, tooltip }) => (
  <div className="flex flex-col gap-1.5">
    <div className="flex items-center gap-2">
      <label className="text-xs font-medium text-brand-text/80">{label}</label>
      {tooltip && <span className="text-[10px] text-brand-text-secondary bg-brand-surface border border-brand-secondary/20 px-1.5 py-0.5 rounded-md cursor-help" title={tooltip}>?</span>}
    </div>
    <select
      className="bg-brand-bg border border-brand-secondary/50 rounded-lg px-3 py-2 text-sm text-brand-text focus:outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary transition-all appearance-none"
      value={value}
      onChange={onChange}
    >
      {children}
    </select>
  </div>
);

export const CreativesControlsPanel: React.FC<CreativesControlsPanelProps> = ({
  options,
  setOptions,
  onGenerate,
  isLoading,
  userState,
  language
}) => {
  const T = textContent[language];
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const handleInspireMe = useCallback(() => {
    // Fill with some creative defaults based on sector
    const isBrand = options.sector.includes('Brand') || options.sector.includes('Logo');
    
    setOptions(prev => ({
      ...prev,
      product: prev.product || (isBrand ? 'NeonPulse Energy Drink' : 'Smart Home Hub'),
      targetAudience: prev.targetAudience || 'Gen Z gamers and young professionals',
      valueProposition: prev.valueProposition || 'Sustained energy without the crash, glowing in the dark',
      hook: prev.hook || 'Light up your night.',
      cta: prev.cta || 'Get Yours Now',
      brandIdentity: prev.brandIdentity || 'Cyberpunk, energetic, bold',
      visualStyle: '3D Render',
      renderEngine: 'Octane Render',
      composition: 'Dynamic Angle',
      lighting: 'neon',
      cameraStyle: 'cinematic',
      mood: 'energetic'
    }));
  }, [options.sector, setOptions]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith('image/')) {
      if (file.size > 5 * 1024 * 1024) {
        setUploadError("File is too large (max 5MB)");
        return;
      }
      setUploadError(null);
      setIsAnalyzing(true);
      try {
        const image = await fileToBase64(file);
        setOptions(prev => ({
          ...prev,
          productImage: image
        }));
      } catch (err) {
        console.error("Upload error:", err);
        setUploadError("Failed to process image");
      } finally {
        setIsAnalyzing(false);
      }
    }
  }, [setOptions]);

  const handleImageUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setUploadError("File is too large (max 5MB)");
        return;
      }
      setUploadError(null);
      setIsAnalyzing(true);
      try {
        const image = await fileToBase64(file);
        setOptions(prev => ({
          ...prev,
          productImage: image
        }));
      } catch (err) {
        console.error("Upload error:", err);
        setUploadError("Failed to process image");
      } finally {
        setIsAnalyzing(false);
      }
    }
  }, [setOptions]);

  const handleRemoveProductImage = useCallback(() => {
    setOptions(prev => ({ ...prev, productImage: null }));
    setUploadError(null);
  }, [setOptions]);

  const cost = 1; // 1 credit per ad
  const canGenerate = userState && userState.credits >= cost;

  const getFieldsForSector = (sector: string) => {
    const isAdOrSocial = sector.includes('Social Media') || sector.includes('Advertisements') || sector.includes('marketing') || sector.includes('Event');
    const isBrand = sector.includes('Logo') || sector.includes('Brand');
    const isWeb = sector.includes('Website');
    const isPrint = sector.includes('Business Cards') || sector.includes('Packaging') || sector.includes('Signage');
    const isPitch = sector.includes('Pitch') || sector.includes('Presentation') || sector.includes('Report');
    
    let required = ['product', 'targetAudience', 'brandIdentity'];
    let optional = ['visualStyle', 'productImage'];

    if (isAdOrSocial) {
      required = ['product', 'targetAudience', 'valueProposition', 'hook', 'cta', 'platform'];
      optional = ['brandIdentity', 'visualStyle', 'scenario', 'emotionalTrigger', 'offer', 'socialProof', 'productImage'];
    } else if (isBrand) {
      required = ['product', 'brandIdentity', 'targetAudience'];
      optional = ['visualStyle', 'competitorPositioning', 'productImage'];
    } else if (isWeb) {
      required = ['product', 'targetAudience', 'valueProposition', 'brandIdentity'];
      optional = ['cta', 'visualStyle', 'productImage'];
    } else if (isPrint) {
      required = ['product', 'brandIdentity', 'targetAudience'];
      optional = ['valueProposition', 'visualStyle', 'productImage'];
    } else if (isPitch) {
      required = ['product', 'targetAudience', 'valueProposition'];
      optional = ['brandIdentity', 'visualStyle', 'scenario', 'productImage'];
    } else {
      required = ['product', 'targetAudience', 'valueProposition', 'brandIdentity'];
      optional = ['hook', 'cta', 'visualStyle', 'scenario', 'productImage'];
    }

    return { required, optional };
  };

  const { required, optional } = getFieldsForSector(options.sector);

  const fieldComponents: Record<string, React.ReactNode> = {
    product: (
      <TextInput 
        key="product"
        label={options.sector.includes('Music') ? "Song/Album Title & Artist" : options.sector.includes('Film') ? "Film Title & Genre" : options.sector.includes('Event') ? "Event Name & Date" : options.sector.includes('Logo') || options.sector.includes('Brand') ? "Brand/Company Name" : "Product or Service"} 
        value={options.product} 
        onChange={e => setOptions(prev => ({...prev, product: e.target.value}))} 
        placeholder={options.sector.includes('Logo') ? "e.g. Acme Corp" : "e.g. Wireless noise-canceling headphones"}
        tooltip="What is the main subject of this creative?"
      />
    ),
    targetAudience: (
      <TextAreaInput 
        key="targetAudience"
        label="Target Audience" 
        value={options.targetAudience} 
        onChange={e => setOptions(prev => ({...prev, targetAudience: e.target.value}))} 
        placeholder="e.g. Young professionals (25-40) who commute daily"
        rows={2}
        tooltip="Who are you trying to reach? Be specific about age, interests, or problems."
      />
    ),
    valueProposition: (
      <TextAreaInput 
        key="valueProposition"
        label="Core Value Proposition" 
        value={options.valueProposition} 
        onChange={e => setOptions(prev => ({...prev, valueProposition: e.target.value}))} 
        placeholder="e.g. Block city noise and enjoy studio-quality sound anywhere"
        rows={2}
        tooltip="What makes this product/service unique or valuable to the audience?"
      />
    ),
    hook: (
      <TextInput 
        key="hook"
        label="Key Message / Hook" 
        value={options.hook} 
        onChange={e => setOptions(prev => ({...prev, hook: e.target.value}))} 
        placeholder="e.g. Silence the chaos."
        tooltip="A short, catchy phrase to grab attention."
      />
    ),
    cta: (
      <TextInput 
        key="cta"
        label="Call-to-Action (CTA)" 
        value={options.cta} 
        onChange={e => setOptions(prev => ({...prev, cta: e.target.value}))} 
        placeholder="e.g. Shop Now"
        tooltip="What should the user do next? (e.g., Learn More, Buy Now)"
      />
    ),
    brandIdentity: (
      <TextInput 
        key="brandIdentity"
        label="Brand Identity / Vibe" 
        value={options.brandIdentity} 
        onChange={e => setOptions(prev => ({...prev, brandIdentity: e.target.value}))} 
        placeholder="e.g. Minimalist, luxury, bold, playful"
        tooltip="The overall feeling or aesthetic of your brand."
      />
    ),
    platform: (
      <SelectInput 
        key="platform"
        label="Format / Platform" 
        value={options.platform} 
        onChange={e => setOptions(prev => ({...prev, platform: e.target.value as any}))}
      >
        {['Instagram', 'TikTok', 'YouTube', 'LinkedIn', 'Website banner', 'Print', 'Presentation'].map(p => (
          <option key={p} value={p}>{p}</option>
        ))}
      </SelectInput>
    ),
    visualStyle: (
      <SelectInput 
        key="visualStyle"
        label="Visual Style Direction" 
        value={options.visualStyle} 
        onChange={e => setOptions(prev => ({...prev, visualStyle: e.target.value as any}))}
      >
        {['None', 'Cinematic', 'Ultra-realistic', 'Minimalist', 'Luxury', 'Afro-futurist', 'Corporate', 'Cartoon', 'Flat Design', '3D Render'].map(p => (
          <option key={p} value={p}>{p}</option>
        ))}
      </SelectInput>
    ),
    scenario: (
      <TextAreaInput 
        key="scenario"
        label="Scenario or Story" 
        value={options.scenario} 
        onChange={e => setOptions(prev => ({...prev, scenario: e.target.value}))} 
        placeholder="e.g. A young entrepreneur working in a café..."
        rows={2}
      />
    ),
    emotionalTrigger: (
      <SelectInput 
        key="emotionalTrigger"
        label="Emotional Trigger" 
        value={options.emotionalTrigger} 
        onChange={e => setOptions(prev => ({...prev, emotionalTrigger: e.target.value as any}))}
      >
        {['None', 'Freedom', 'Confidence', 'Productivity', 'Belonging', 'Security', 'Joy', 'Urgency'].map(p => (
          <option key={p} value={p}>{p}</option>
        ))}
      </SelectInput>
    ),
    socialProof: (
      <TextInput 
        key="socialProof"
        label="Social Proof" 
        value={options.socialProof} 
        onChange={e => setOptions(prev => ({...prev, socialProof: e.target.value}))} 
        placeholder="e.g. Used by 2M customers"
      />
    ),
    offer: (
      <TextInput 
        key="offer"
        label="Offer or Incentive" 
        value={options.offer} 
        onChange={e => setOptions(prev => ({...prev, offer: e.target.value}))} 
        placeholder="e.g. 20% Off"
      />
    ),
    competitorPositioning: (
      <TextInput 
        key="competitorPositioning"
        label="Competitor Positioning" 
        value={options.competitorPositioning} 
        onChange={e => setOptions(prev => ({...prev, competitorPositioning: e.target.value}))} 
        placeholder="e.g. Lighter than Sony"
      />
    ),
    productImage: (
      <div key="productImage" className="flex flex-col gap-1.5">
        <label className="text-xs font-medium text-brand-text/80">
          {options.sector.includes('Music') ? "Artist Photo / Cover Art Element" : options.sector.includes('Real Estate') ? "Property Photo" : options.sector.includes('Logo') ? "Reference Logo/Sketch" : "Product Asset / Reference Image"}
        </label>
        <div 
          className={`border-2 border-dashed rounded-2xl p-6 transition-all duration-300 flex flex-col items-center justify-center cursor-pointer group ${isDragging ? 'border-brand-primary bg-brand-primary/5' : uploadError ? 'border-red-300 bg-red-50' : 'border-brand-secondary/30 hover:border-brand-primary/50 hover:bg-brand-surface'}`}
          onClick={() => fileInputRef.current?.click()}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          {isAnalyzing ? (
            <div className="flex flex-col items-center gap-3 py-4">
              <Icon name="spinner" className="animate-spin text-brand-primary" size={24} />
              <p className="text-xs font-medium text-brand-text">Processing Image...</p>
            </div>
          ) : options.productImage ? (
            <div className="relative w-full aspect-square max-h-32 rounded-xl overflow-hidden group shadow-md border border-brand-secondary">
              <img src={`data:${options.productImage.mimeType};base64,${options.productImage.base64}`} alt="Product" className="object-cover w-full h-full" />
              <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <button 
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRemoveProductImage();
                  }}
                  className="bg-red-500 text-white p-2 rounded-full shadow-lg transform hover:scale-110 transition-transform active:scale-90"
                  title={T.removePhoto}
                >
                  <Icon name="close" size={16} />
                </button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-3 text-brand-text-secondary py-4">
              <div className="w-12 h-12 rounded-full bg-brand-surface border border-brand-secondary/20 flex items-center justify-center text-brand-primary shadow-sm">
                <Icon name="upload" size={24} />
              </div>
              <div className="text-center">
                <p className="text-sm font-medium text-brand-text mb-1">{uploadError || 'Upload Reference Image'}</p>
                <p className="text-xs text-brand-text-secondary/70 mb-3">JPG, PNG or WEBP (max 5MB)</p>
                <button 
                  type="button"
                  className={`px-4 py-1.5 ${uploadError ? 'bg-red-100 text-red-600' : 'bg-brand-primary/10 text-brand-primary'} hover:bg-brand-primary hover:text-white rounded-full text-xs font-bold transition-colors`}
                  onClick={(e) => {
                    e.stopPropagation();
                    fileInputRef.current?.click();
                  }}
                >
                  Choose File
                </button>
              </div>
            </div>
          )}
        </div>
        <input 
          type="file" 
          ref={fileInputRef} 
          onChange={handleImageUpload} 
          accept="image/*" 
          className="hidden" 
        />
      </div>
    )
  };

  return (
    <Fragment>
      <div className="controls-panel bg-transparent space-y-6 pb-40 lg:pb-0">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold text-brand-text">Creative Brief</h3>
          <button 
            onClick={handleInspireMe}
            className="text-xs font-bold text-brand-primary bg-brand-primary/10 hover:bg-brand-primary hover:text-white px-3 py-1.5 rounded-full transition-colors flex items-center gap-1.5"
          >
            <Icon name="sparkles" size={14} />
            Inspire Me
          </button>
        </div>

        <Section title="0️⃣ Creative Sector">
          <SelectInput
            label="What are you creating for?"
            value={options.sector}
            onChange={e => setOptions(prev => ({...prev, sector: e.target.value}))}
            tooltip="Select the industry or type of creative to tailor the AI's approach."
          >
            {[
              'Logo Design',
              'Brand Guidelines (Style Guide)',
              'Brand Assets',
              'Website Design (UI/UX)',
              'Social Media Graphics',
              'Email Marketing Templates',
              'Digital Advertisements',
              'Business Cards & Stationery',
              'Product Packaging/Labels',
              'Signage & Promotional Materials',
              'Presentation/Pitch Decks',
              'Reports/Case Studies',
              // Keep original ones for backward compatibility or if they are still needed
              'Brand identity for SMEs and street businesses',
              'Social media marketing for local retail',
              'Music release assets (Afrobeats, Amapiano, etc.)',
              'Nollywood/Local Film Pitch Decks & Posters',
              'Real Estate & Architecture (Local context)',
              'Fashion & Apparel (Ankara, Kente, Streetwear)',
              'Food & Beverage (Local cuisine)',
              'Event Promotion (Weddings, Owambes, Church events)',
              'Tech Startup Pitch Decks',
              'Educational & NGO Content'
            ].map(p => (
              <option key={p} value={p}>{p}</option>
            ))}
          </SelectInput>
        </Section>

        <Section title="1️⃣ Quick Prompt (Optional)">
          <TextAreaInput 
            label="Describe your vision freely" 
            value={options.freeTextPrompt || ''} 
            onChange={e => setOptions(prev => ({...prev, freeTextPrompt: e.target.value}))} 
            placeholder="e.g. I want a futuristic cyberpunk energy drink ad with neon lights and a dynamic angle..."
            rows={3}
            tooltip="Type exactly what you want. The AI will use this as the primary inspiration."
          />
        </Section>

        <Section title="2️⃣ Core Elements">
          {required.map(field => fieldComponents[field])}
        </Section>

        <div className="pt-4 border-t border-brand-secondary/20">
          <button 
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="flex items-center justify-between w-full text-left text-sm font-bold text-brand-text-secondary hover:text-brand-text transition-colors"
          >
            <span className="flex items-center gap-2">
              <Icon name="settings" size={16} />
              Advanced Options & Pro Designer Tools
            </span>
            <Icon name={showAdvanced ? "chevron-up" : "chevron-down"} size={16} />
          </button>
        </div>

        {showAdvanced && (
          <div className="space-y-6 pt-4 animate-in fade-in slide-in-from-top-4 duration-300">
            <Section title="3️⃣ Optional Optimization">
              {optional.map(field => fieldComponents[field])}
            </Section>

            {(options.sector.includes('Social Media') || options.sector.includes('Advertisements') || options.sector.includes('marketing') || options.sector.includes('Event')) && (
              <Section title="4️⃣ AI Ad Creation Inputs">
                <SelectInput 
                  label="Ad Structure (Proven Frameworks)" 
                  value={options.adStructure || 'auto'} 
                  onChange={e => setOptions(prev => ({...prev, adStructure: e.target.value as any}))}
                  tooltip="Select a proven, high-converting ad structure based on 2025-2026 performance data."
                >
                  <option value="auto">Auto (Let AI Decide)</option>
                  <option value="Thumb-Stopping Hook + Bold Text">Thumb-Stopping Hook + Bold Text</option>
                  <option value="Before-After / Problem-Solution">Before-After / Problem-Solution</option>
                  <option value="Social Proof / UGC Style">Social Proof / UGC Style</option>
                  <option value="Product Demo / Behind-the-Scenes">Product Demo / Behind-the-Scenes</option>
                  <option value="Data-Driven / Chart Comparison">Data-Driven / Chart Comparison</option>
                </SelectInput>
                <SelectInput 
                  label="Camera Style" 
                  value={options.cameraStyle} 
                  onChange={e => setOptions(prev => ({...prev, cameraStyle: e.target.value as any}))}
                >
                  {['auto', 'cinematic', 'macro', 'drone'].map(p => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </SelectInput>
                <SelectInput 
                  label="Lighting" 
                  value={options.lighting} 
                  onChange={e => setOptions(prev => ({...prev, lighting: e.target.value as any}))}
                >
                  {['auto', 'studio', 'sunset', 'neon'].map(p => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </SelectInput>
                <SelectInput 
                  label="Mood" 
                  value={options.mood} 
                  onChange={e => setOptions(prev => ({...prev, mood: e.target.value as any}))}
                >
                  {['auto', 'luxury', 'energetic', 'calm'].map(p => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </SelectInput>
                <SelectInput 
                  label="Aspect Ratio" 
                  value={options.aspectRatio} 
                  onChange={e => setOptions(prev => ({...prev, aspectRatio: e.target.value as any}))}
                >
                  <option value="1:1">1:1 (Square)</option>
                  <option value="9:16">9:16 (Vertical)</option>
                  <option value="16:9">16:9 (Landscape)</option>
                </SelectInput>
              </Section>
            )}

            {(options.visualStyle === '3D Render' || options.composition) && (
              <Section title="5️⃣ Pro Designer 3D & Composition">
                {options.visualStyle === '3D Render' && (
                  <SelectInput 
                    label="3D Render Engine" 
                    value={options.renderEngine || 'auto'} 
                    onChange={e => setOptions(prev => ({...prev, renderEngine: e.target.value as any}))}
                    tooltip="Forces the AI to simulate the look of professional 3D rendering software."
                  >
                    {['auto', 'Octane Render', 'Unreal Engine 5', 'V-Ray', 'Cinema4D'].map(p => (
                      <option key={p} value={p}>{p}</option>
                    ))}
                  </SelectInput>
                )}
                <SelectInput 
                  label="Composition Style" 
                  value={options.composition || 'auto'} 
                  onChange={e => setOptions(prev => ({...prev, composition: e.target.value as any}))}
                  tooltip="Controls how elements are arranged in the frame."
                >
                  {['auto', 'Isometric', 'Knolling (Flat Lay)', 'Dynamic Angle', 'Symmetrical', 'Rule of Thirds'].map(p => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </SelectInput>
              </Section>
            )}
          </div>
        )}
      </div>

      <div className="fixed bottom-20 left-0 right-0 lg:static p-4 lg:p-0 bg-brand-surface lg:bg-transparent border-t border-brand-secondary/30 lg:border-none z-40 mt-8">
        <button
          id="generate-btn"
          onClick={onGenerate}
          disabled={isLoading || !canGenerate || !options.product || !options.targetAudience}
          className="w-full bg-brand-primary text-brand-surface py-4 rounded-xl font-bold text-sm uppercase tracking-wider hover:bg-brand-primary/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(255,255,255,0.1)]"
        >
          {isLoading ? (
            <Fragment>
              <Icon name="loader" size={18} className="animate-spin" />
              {T.generating}
            </Fragment>
          ) : (
            <Fragment>
              <Icon name="wand" size={18} />
              {T.generateAdCreative} (1 {T.creditsLabel})
            </Fragment>
          )}
        </button>
        
        {userState && (
          <div className="mt-3 flex items-center justify-between text-xs font-mono">
            <span className="text-brand-text-secondary">{T.costCredit.replace('{cost}', cost.toString())}</span>
            <span className={canGenerate ? 'text-brand-primary' : 'text-red-400'}>
              {T.balance.replace('{credits}', userState.credits.toString())}
            </span>
          </div>
        )}
      </div>
    </Fragment>
  );
};
