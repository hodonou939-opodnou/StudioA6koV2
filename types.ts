export interface ModelOptions {
  name: string;
  image: {
    base64: string;
    mimeType: string;
  } | null;
  fullBodyImage?: {
    base64: string;
    mimeType: string;
  } | null;
  bodyDescription?: string;
  heightCm?: number | string;
  isSitting?: boolean;
}

export interface GarmentOptions {
  description: string;
  image: {
    base64: string;
    mimeType: string;
  } | null;
}

export interface GenerationOptions {
  // Step 1: Intent
  intent: 'Personal branding' | 'Mode' | 'E-commerce' | 'Réseaux sociaux' | 'Luxe';

  // Step 2: Subject
  model: ModelOptions;
  garment: GarmentOptions;
  companion: {
    enabled: boolean;
    description: string;
    image?: {
      base64: string;
      mimeType: string;
    } | null;
  };
  accessories: {
    shoes?: string;
    watch?: string;
    jewelry?: string;
    other?: string;
  };
  pose: 'Runway' | 'Editorial' | 'Portrait' | 'Dynamic Pose' | 'Candid' | 'Product Focus' | 'Sitting Pose' | 'Gesture' | 'Selfie Pose' | 'Mode' | 'Glamour' | 'Corporate' | 'Smoking' | 'Classy Business' | 'Elite Smoking' | 'Black and White' | 'Elite Cigar Black and White' | 'Keynote Presentation';

  // Step 3: Space
  backgroundType: 'Solid Color' | 'Textured' | 'Artistic Painted' | 'Cyclorama';
  environment: 'Studio' | 'African Architecture' | 'African Nature' | 'African Urban' | 'Local Luxury' | 'Runway' | 'Outdoor' | 'Desert Oasis' | 'On stage as Keynote speaker' | 'Podcast studio' | 'Meme setting';
  colorPalette: string;
  conferenceScreenText?: string;
  conferenceKakimonoText?: string;
  conferenceKakimonoLogo?: {
    base64: string;
    mimeType: string;
  } | null;
  conferenceMicType?: 'Podium Gooseneck' | 'Discreet Headset' | 'Handheld' | 'None';
  conferenceAudience?: 'Blurred Background' | 'Grand Plan (Wide Shot)' | 'Silhouette Foreground' | 'None';
  customPrompt?: string;

  // Step 4: Camera
  cameraAngle: 'Low Angle' | 'Waist Level' | 'Chest Level' | 'Eye Level' | 'High Angle' | 'Overhead';
  cameraAxis: 'Front' | '3/4 View' | 'Profile' | 'Back';
  cameraDistance: 'Close-up (Face)' | 'Waist Up' | 'Full Body' | 'Wide Shot';
  cameraLens: '35mm (Reportage)' | '50mm (Natural)' | '85mm (Portrait/Bokeh)' | '200mm (Compression)';
  aspectRatio: '1:1' | '9:16' | '16:9' | '4:5' | '5:4' | '3:4' | '4:3';

  // Step 5: Lighting
  lightingSetup: 'Rembrandt' | 'Butterfly/Paramount' | 'Split' | 'Loop' | 'Broad' | 'Short' | 'Flat' | 'Softbox Overhead';
  lightingTemperature: 'Warm (3200K)' | 'Neutral (5500K)' | 'Cool (7000K)';
  lightingTime: 'Golden Hour' | 'Harsh Midday' | 'Night Flash';
  lightingMood: 'Clinical & Sharp' | 'Dramatic' | 'Soft & Flattering';

  // Step 6: Finishing
  filmGrain: 'Analog Film' | 'Crisp Digital' | 'HDR';
  postProcessing: 'Vibrant Colors' | 'Desaturated' | 'Monochrome';
  
  // Other
  tattoos: 'none' | 'minimal' | 'symbols' | 'discreet' | 'full';
  variants: number;
  watermark: boolean;
  isBlackAndWhite?: boolean;
}

export interface AnimationOptions {
  duration: number;
  audioType: 'none' | 'music' | 'script';
  musicStyle: 'Uplifting Electronic' | 'Calm Lo-fi' | 'Cinematic Orchestra' | 'Tribal Beats';
  script: string;
  voiceGender: 'auto' | 'female' | 'male';
  cameraMove: 'none' | 'pan' | 'zoom' | 'dolly';
  style: 'normal' | 'slow-motion' | 'fast-forward';
}


export interface CreativesOptions {
  // Required
  sector: string;
  product: string;
  targetAudience: string;
  valueProposition: string;
  hook: string;
  cta: string;
  brandIdentity: string;
  platform: 'Instagram' | 'TikTok' | 'YouTube' | 'LinkedIn' | 'Website banner';
  
  // Optional
  visualStyle: 'Cinematic' | 'Ultra-realistic' | 'Minimalist' | 'Luxury' | 'Afro-futurist' | 'Corporate' | 'Cartoon' | 'Flat Design' | '3D Render' | 'None';
  scenario: string;
  emotionalTrigger: 'Freedom' | 'Confidence' | 'Productivity' | 'Belonging' | 'Security' | 'None';
  socialProof: string;
  offer: string;
  competitorPositioning: string;

  // AI Inputs
  cameraStyle: 'cinematic' | 'macro' | 'drone' | 'auto';
  lighting: 'studio' | 'sunset' | 'neon' | 'auto';
  mood: 'luxury' | 'energetic' | 'calm' | 'auto';
  aspectRatio: '1:1' | '9:16' | '16:9';
  
  // High-Converting Ad Structures
  adStructure?: 'auto' | 'Thumb-Stopping Hook + Bold Text' | 'Before-After / Problem-Solution' | 'Social Proof / UGC Style' | 'Product Demo / Behind-the-Scenes' | 'Data-Driven / Chart Comparison';

  // Pro Designer Inputs
  freeTextPrompt?: string;
  renderEngine?: 'auto' | 'Octane Render' | 'Unreal Engine 5' | 'V-Ray' | 'Cinema4D';
  composition?: 'auto' | 'Isometric' | 'Knolling (Flat Lay)' | 'Dynamic Angle' | 'Symmetrical' | 'Rule of Thirds';
  
  // Product Asset
  productImage: {
    base64: string;
    mimeType: string;
  } | null;
}

export interface Asset {
  id: string;
  type: 'image' | 'video';
  url: string; // data: or blob: URL
  base64?: string;
  isAnimating?: boolean;
  metadata: {
    prompt: string;
    pose: string;
    garmentLabels: string[];
    garmentDescription: string;
    companionDescription?: string;
    environment: GenerationOptions['environment'];
    aspectRatio: GenerationOptions['aspectRatio'];
    marketingCopy?: string;
  };
  animationOptions?: AnimationOptions;
  originalImage?: {
    url: string;
    base64: string;
  };
  feedback?: 'like' | 'dislike' | null;
}

export type Language = 'en' | 'fr';

export type TextContent = {
  [key: string]: any;
};

export interface UserState {
  userId: string; // This is the shortId
  uid?: string; // Firebase Auth UID
  role?: 'user' | 'admin';
  credits: number;
  displayName?: string;
  photoURL?: string;
  email?: string;
  lastGarment?: {
    image: {
      base64: string;
      mimeType: string;
    } | null;
    description: string;
  } | null;
}

export interface ShopInfo {
  title: string;
  description: string;
  tags: string[];
  priceEst: string;
}