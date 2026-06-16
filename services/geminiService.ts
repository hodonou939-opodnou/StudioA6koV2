import { GoogleGenAI, Modality, Type } from '@google/genai';
import type { GenerationOptions, Asset, AnimationOptions, CreativesOptions, ShopInfo } from '../types';
import { BACKUP_API_KEYS } from '../constants';

// Helper to safely access process.env without Vite statically replacing it
const getEnvVar = (key: string): string | undefined => {
    try {
        // Try accessing via window first (runtime injection)
        if (typeof window !== 'undefined' && (window as any).process?.env?.[key]) {
            return (window as any).process.env[key];
        }
        // Fallback to global process (Node/build time)
        if (typeof process !== 'undefined' && process.env?.[key]) {
            return process.env[key];
        }
    } catch (e) {
        // Ignore errors
    }
    return undefined;
};

// Helper to initialize client with specific key or fallback
const getClient = (apiKey?: string) => {
    const platformKey = getEnvVar('GEMINI_API_KEY');
    const envKey = getEnvVar('API_KEY');
    const key = apiKey || platformKey || envKey;
    if (!key) {
        throw new Error("API_KEY not set");
    }
    
    const options: any = { apiKey: key };
    
    if (typeof window !== 'undefined' && window.location.hostname !== 'localhost') {
        const isStandardKey = typeof key === 'string' && key.startsWith('AIzaSy');
        if (!isStandardKey) {
            const supportId = 'kcdch4v5ylmvepbmucssew-350390713201';
            if (!window.location.hostname.endsWith('.run.app')) {
                options.httpOptions = {
                    baseUrl: `https://ais-pre-${supportId}.europe-west2.run.app/gemini-api-proxy`
                };
            } else {
                options.httpOptions = {
                    baseUrl: window.location.origin + '/gemini-api-proxy'
                };
            }
        }
    }
    
    if (!options.httpOptions) {
        options.httpOptions = {};
    }
    if (!options.httpOptions.headers) {
        options.httpOptions.headers = {};
    }
    options.httpOptions.headers['User-Agent'] = 'aistudio-build';
    
    return new GoogleGenAI(options);
}

const getRandomProgressMessage = (action: string): string => {
    const fns = {
        generateFashionShoot: [
            "Adapting garment texture and flow...",
            "Analyzing biometric model alignments...",
            "Composing optimal camera angle and lens configuration...",
            "Draping fabrics under high-end studio lighting...",
            "Rendering 8K ultra-realistic textures...",
            "Finalizing post-processing and sharpness..."
        ],
        animateImage: [
            "Initializing temporal core...",
            "Synthesizing clothing physics models...",
            "Generating cinematic high-definition motion vector tracks...",
            "Assembling frames into a high-rate 1080p MP4...",
            "Finalizing hyper-realistic video motion..."
        ]
    };
    const list = fns[action as keyof typeof fns] || ["Processing request with Google GenAI...", "Analyzing visual elements...", "Deep rendering engine executing..."];
    return list[Math.floor(Math.random() * list.length)];
};

const proxyCallToBackend = async (action: string, args: any[], onProgress?: (msg: string) => void, feature?: string): Promise<any> => {
    let progressInterval: any;
    if (onProgress) {
        onProgress("Connecting to studio creative server...");
        progressInterval = setInterval(() => {
            onProgress(getRandomProgressMessage(action));
        }, 5000);
    }
    try {
        const response = await fetch('/api/gemini', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ action, args, feature })
        });
        
        if (progressInterval) clearInterval(progressInterval);
        
        const responseText = await response.text();
        
        // Detect if the request was intercepted by the workspace sandbox cookie authentication check redirect
        const isHtml = responseText.trim().toLowerCase().startsWith('<!doctype') || 
                       responseText.trim().toLowerCase().startsWith('<html') ||
                       responseText.includes('<body') ||
                       responseText.includes('auth_flow_verify_cookie') ||
                       responseText.includes('aistudio_auth_flow');
                       
        if (isHtml) {
            throw new Error(
                "Le navigateur bloque l'authentification dans l'aperçu. C'est normal si vous êtes en mode de navigation privée ou utilisez Safari. Veuillez cliquer sur le bouton de Partage (Share App / Ouvrir l'application) en haut à droite d'AI Studio pour l'ouvrir dans un NOUVEL ONGLET afin qu'elle fonctionne parfaitement sans blocage."
            );
        }
        
        let jsonResult: any;
        try {
            jsonResult = JSON.parse(responseText);
        } catch (parseErr) {
            throw new Error(`Failed to parse server response as JSON. Raw response preview: ${responseText.substring(0, 150)}...`);
        }
        
        if (!response.ok) {
            // Centralized credit/auth handling so individual components don't each
            // need to. StudioApp listens for these and opens login / paywall.
            if (typeof window !== 'undefined') {
                if (response.status === 401 && jsonResult.error === 'AUTH_REQUIRED') {
                    window.dispatchEvent(new CustomEvent('a6ko:auth-required'));
                    throw new Error('AUTH_REQUIRED');
                }
                if (response.status === 402 && jsonResult.error === 'INSUFFICIENT_CREDITS') {
                    window.dispatchEvent(new CustomEvent('a6ko:insufficient-credits'));
                    throw new Error('INSUFFICIENT_CREDITS');
                }
            }
            throw new Error(jsonResult.error || `Server error: ${response.status}`);
        }

        // Tell the app to refresh the credit balance from the server (authoritative).
        if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('a6ko:credits-changed'));
        }
        return jsonResult;
    } catch (e: any) {
        if (progressInterval) clearInterval(progressInterval);
        console.error(`Local proxy query failed for ${action}:`, e);
        throw e;
    }
};

const isFatalError = (err: any): boolean => {
    if (!err) return false;
    const msg = String(err.message || err.error?.message || err).toLowerCase();
    // Model errors or format errors may be fatal, but billing/quota/permission errors 
    // are key-specific, so we should always rotate keys and try other candidates first.
    if (msg.includes('model') && (msg.includes('not found') || msg.includes('not available') || msg.includes('does not exist'))) {
        return true;
    }
    return false;
};

const withTimeout = <T>(promise: Promise<T>, ms: number): Promise<T> => {
    return new Promise((resolve, reject) => {
        const timer = setTimeout(() => {
            reject(new Error(`Operation timed out after ${ms}ms`));
        }, ms);
        promise.then(value => {
            clearTimeout(timer);
            resolve(value);
        }).catch(reason => {
            clearTimeout(timer);
            reject(reason);
        });
    });
};

// Helper to execute operations with key rotation and retry on quota limits
const executeWithRetry = async <T>(
    operation: (client: GoogleGenAI, successfulKey: string) => Promise<T>,
    primaryApiKey?: string,
    timeoutMs: number = 300000 // Default 5 minutes timeout
): Promise<T> => {
    // Collect all unique, valid keys
    const platformKey = getEnvVar('GEMINI_API_KEY');
    const envKey = getEnvVar('API_KEY');
    
    let candidates: string[] = [];
    
    // In production browser environments, always try a dummy/proxy key first.
    // The base URL routes through the local '/gemini-api-proxy' wrapper, which intercepts 
    // the request and automatically injects the container's real server-side GEMINI_API_KEY.
    // This maintains secure billing and routes requests smoothly to the high-quota tier.
    if (typeof window !== 'undefined' && window.location.hostname !== 'localhost') {
        candidates.push("DEFAULT_PROXY_KEY");
    }
    
    // Prioritize Platform (server environment) keys FIRST
    if (platformKey && platformKey.trim().length > 0) {
        candidates.push(platformKey);
    }
    if (envKey && envKey.trim().length > 0 && !candidates.includes(envKey)) {
        candidates.push(envKey);
    }
    
    // Then try Client-supplied or other Primary API keys
    if (primaryApiKey && primaryApiKey.trim().length > 0 && !candidates.includes(primaryApiKey)) {
        candidates.push(primaryApiKey);
    }

    // Add all configured backup keys from Constants
    if (Array.isArray(BACKUP_API_KEYS)) {
        for (const bk of BACKUP_API_KEYS) {
            if (bk && bk.trim().length > 0 && !candidates.includes(bk)) {
                candidates.push(bk);
            }
        }
    }
    
    // Optional last-resort fallback key from env (server-side only). NEVER hardcode
    // an API key here — this module is bundled to the browser, so a literal key
    // would be extractable by anyone. The real key comes from GEMINI_API_KEY above.
    const backupKey = getEnvVar('GEMINI_FALLBACK_API_KEY');
    if (backupKey && backupKey.trim().length > 0 && !candidates.includes(backupKey)) {
        candidates.push(backupKey);
    }
    
    // Log the candidates array for auditing (masking the keys for safety)
    const maskedCandidates = candidates.map(key => {
        if (!key) return 'undefined';
        if (key === 'DEFAULT_PROXY_KEY') return 'DEFAULT_PROXY_KEY';
        return `${key.slice(0, 6)}...${key.slice(-4)} (len: ${key.length})`;
    });
    console.log(`[executeWithRetry Audit] Candidates found:`, maskedCandidates);
    console.log(`[executeWithRetry Audit] platformKey: ${platformKey ? `${platformKey.slice(0, 6)}... (len: ${platformKey.length})` : 'undefined'}`);
    console.log(`[executeWithRetry Audit] envKey: ${envKey ? `${envKey.slice(0, 6)}... (len: ${envKey.length})` : 'undefined'}`);
    console.log(`[executeWithRetry Audit] primaryApiKey: ${primaryApiKey ? `${primaryApiKey.slice(0, 6)}... (len: ${primaryApiKey.length})` : 'undefined'}`);
    
    if (candidates.length === 0) {
        // Fallback to letting getClient throw or use its internal env check
        candidates = [undefined as any];
    }

    let lastError: any;

    // Function to try all keys in sequence with recursive retry capability
    const tryAllKeys = async (retriesLeft: number = 3): Promise<T> => {
        for (const key of candidates) {
            const maskedKey = key === 'DEFAULT_PROXY_KEY' ? 'DEFAULT_PROXY_KEY' : (key ? `${key.slice(0, 6)}...${key.slice(-4)}` : 'undefined');
            console.log(`[executeWithRetry Audit] Attempting execution with key: ${maskedKey}`);
            try {
                const client = getClient(key);
                const result = await withTimeout(operation(client, key), timeoutMs);
                console.log(`[executeWithRetry Audit] Successfully executed operation with key: ${maskedKey}`);
                return result;
            } catch (error: any) {
                lastError = error;
                
                const msg = (error.message || error.error || (typeof error === 'string' ? error : JSON.stringify(error))).toLowerCase();
                console.warn(`[executeWithRetry Audit] Error for key ${maskedKey}: ${msg}`);
                
                const isLimitZero = msg.includes('limit: 0') || 
                                    msg.includes('limite : 0') || 
                                    msg.includes('limit:0') || 
                                    msg.includes('free_tier') || 
                                    msg.includes('free-tier') || 
                                    msg.includes('free tier') || 
                                    msg.includes('billing') || 
                                    msg.includes('pay-as-you-go') || 
                                    msg.includes('not supported for free') || 
                                    msg.includes('requires a paid-tier') || 
                                    msg.includes('image generation is not supported') || 
                                    msg.includes('free_tier_requests') ||
                                    msg.includes('depleted') ||
                                    msg.includes('prepayment') ||
                                    msg.includes('credits') ||
                                    msg.includes('exhausted') ||
                                    msg.includes('quota') ||
                                    msg.includes('exceeded') ||
                                    msg.includes('rate limit') ||
                                    msg.includes('rate_limit') ||
                                    msg.includes('resource_exhausted') ||
                                    msg.includes('429');
                
                if (isLimitZero) {
                    console.log(`[executeWithRetry Audit] Free-tier limit or billing restriction encountered for key ${maskedKey}. Proceeding to try next fallback candidate.`);
                    continue;
                }

                if (isFatalError(error)) {
                    console.error(`[executeWithRetry Audit] Fatal schema/model error encountered for key ${maskedKey}: ${msg}`);
                    throw error;
                }

                console.warn(`[executeWithRetry Audit] Error on key ending in ...${key ? key.slice(-4) : '????'}: ${msg}. Trying next fallback key.`);
                continue;
            }
        }
        
        // If we ran out of keys but have retries left, wait 5 seconds and retry
        if (retriesLeft > 1) {
            const delay = 5000;
            console.log(`[executeWithRetry Audit] All keys failed or were rate-limited. Waiting ${delay}ms before retrying list of keys (Retries left: ${retriesLeft - 1})...`);
            await new Promise(resolve => setTimeout(resolve, delay));
            return await tryAllKeys(retriesLeft - 1);
        }
        
        if (lastError) {
            const errorMsg = String(lastError.message || lastError).toLowerCase();
            const isResourceExhausted = errorMsg.includes('quota') || errorMsg.includes('limit') || errorMsg.includes('429') || errorMsg.includes('exhausted') || errorMsg.includes('exceed') || errorMsg.includes('rate');
            
            if (isResourceExhausted) {
                throw new Error("Tous nos serveurs de création sont actuellement occupés ou ont dépassé la limite de requêtes autorisée. Veuillez patienter une minute et réessayer. (Rate exceeded. Please wait a minute and try again.)");
            }
            
            const friendlyError = new Error("Generation failed. Please try again or contact support if the problem persists. (La génération a échoué. Veuillez réessayer ou contacter le support si le problème persiste.)");
            throw friendlyError;
        }
        
        throw new Error("Generation failed. Please try again or contact support. (La génération a échoué. Veuillez réessayer ou contacter le support.)");
    };

    return await tryAllKeys(3);
};

const buildKeynoteSpatialLogic = (options: GenerationOptions) => {
    let spatialLogic = '';
    let audienceLogic = "";

    if (options.cameraAxis === 'Back') {
        spatialLogic = "CRITICAL SPATIAL (BACK VIEW): The camera is ON THE STAGE, positioned directly BEHIND THE SPEAKER. We see the speaker's back or back-profile in the foreground. The speaker is definitively facing AWAY from the camera and looking OUT towards the audience.";
        
        switch (options.conferenceAudience) {
            case 'Silhouette Foreground':
            case 'Blurred Background':
                audienceLogic = "The audience is clearly visible in the deep background stretching out in front of the speaker, elegantly blurred (bokeh)."; break;
            case 'Grand Plan (Wide Shot)':
                audienceLogic = "The vast, spectacular auditorium and a massive, diverse crowd of thousands of engaged audience members (the public) are highly visible stretching into the distance. This is a dramatic wide shot capturing the sheer epic scale and electric energy of a'Grand Plan' event from the speaker's perspective."; break;
            case 'None':
                audienceLogic = "The auditorium in front of the speaker is mostly dark, with only dramatic lighting visible."; break;
            default:
                audienceLogic = "The audience is visible in the background, facing the speaker.";
        }
    } else if (options.cameraAxis === 'Profile' || options.cameraAxis === '3/4 View') {
        spatialLogic = `CRITICAL SPATIAL (${options.cameraAxis.toUpperCase()} ANGLE): The camera is positioned on the edge of the stage, shooting from a realistic eye-level or slightly low angle relative to the speaker to establish an authoritative, highly charismatic presence. The speaker is physically facing outward toward the audience/crowd which is positioned directly in front of the speaker. The space BEHIND the speaker is completely empty except for the dark stage background or presentation screen.`;
        
        switch (options.conferenceAudience) {
            case 'Silhouette Foreground':
                audienceLogic = "The dark silhouettes of the closest audience members' heads and shoulders are heavily blurred in the extreme foreground edge, powerfully framing the speaker. There is NO audience in the background."; break;
            case 'Grand Plan (Wide Shot)':
                audienceLogic = "A spectacular 'Grand Plan' wide shot: The massive, cheering public is seen from the side as they fill the auditorium in front of the speaker. The scale is immense, showing a vast sea of people stretching from the front rows to the back of the arena, creating an atmosphere of a major international conference."; break;
            case 'Blurred Background':
                audienceLogic = "The audience is seen on the far side of the frame in front of the speaker, stretching into the blurred foreground/midground, making the viewer feel immersed. There is absolutely NO audience behind the speaker."; break;
            case 'None':
                audienceLogic = "The background behind the speaker is dark and empty, focusing solely on the speaker."; break;
            default:
                audienceLogic = "The audience is ONLY visible in front of the speaker (foreground/midground). The space strictly behind the speaker's back MUST be an empty stage or dark backdrop."; break;
        }
    } else { // Front
        spatialLogic = "CRITICAL SPATIAL (FRONT POV - FROM AUDIENCE): The camera is beautifully positioned IN THE AUDIENCE or at the front edge of the stage, shooting from a realistic eye-level or slightly low angle relative to the speaker. The speaker is completely facing the camera, making direct eye contact, conveying extreme charisma and eloquence directly to the viewing audience. The space BEHIND the speaker MUST be an completely empty stage or presentation screen.";
        
        switch (options.conferenceAudience) {
            case 'Silhouette Foreground':
                audienceLogic = "In the very foreground (closer to the camera than the speaker, between the lens and the stage), we prominently see the dark, out-of-focus silhouettes of the backs of audience members' heads. IMPORTANT: The audience is ONLY in the foreground blocking the bottom of the frame. There must be ZERO audience members behind the speaker."; break;
            case 'Grand Plan (Wide Shot)':
                audienceLogic = "A breathtaking 'Grand Plan' shot from the audience's perspective. The speaker is center-stage, framed by the out-of-focus heads and shoulders of a massive crowd in the extreme foreground, while the vast stage lighting and structure create an epic scale. The public's presence is felt strongly through these foreground silhouettes."; break;
            default:
                audienceLogic = "The camera angle mimics the exact perspective of an engaged audience member in the front rows. CRITICALLY IMPORTANT: Because the camera is facing the speaker, the audience is strictly BEHIND the camera (not visible in the frame). The background behind the speaker MUST be an empty, dark stage. DO NOT place any audience members behind the speaker."; break;
        }
    }
    
    return { spatialLogic, audienceLogic };
}

const buildBackgroundDescription = (options: GenerationOptions): string => {
    let bgTypeDesc = '';
    switch (options.backgroundType) {
        case 'Solid Color': 
            bgTypeDesc = 'a perfectly clean, solid white background or related light elegant neutral studio backdrop with deep separation from the subject and no distractions'; 
            break;
        case 'Textured': bgTypeDesc = 'a highly detailed textured backdrop (like concrete, polished marble, or fine linen) with clear depth of field separation'; break;
        case 'Artistic Painted': bgTypeDesc = 'an artistic, hand-painted textured canvas backdrop'; break;
        case 'Cyclorama': bgTypeDesc = 'a flawless, seamless studio cyclorama curve with infinite depth and zero wrinkles'; break;
    }

    let envDesc = '';
    switch (options.environment) {
        case 'Studio': envDesc = 'a professional photo studio with a clean white or related light professional background'; break;
        case 'African Architecture': envDesc = 'African architecture (e.g., colonial house in Dakar, Plateau building in Abidjan, or a Marrakech riad)'; break;
        case 'African Nature': envDesc = 'African nature (e.g., golden savanna, tropical forest, or Atlantic beach)'; break;
        case 'African Urban': envDesc = 'an African urban setting (e.g., colorful market, painted street, or Lagos street art mural)'; break;
        case 'Local Luxury': envDesc = 'local luxury (e.g., 5-star hotel lobby in Abidjan, infinity pool with ocean view)'; break;
        case 'Runway': envDesc = 'a high-fashion runway during a show'; break;
        case 'Outdoor': envDesc = 'a beautiful, natural outdoor location'; break;
        case 'Desert Oasis': envDesc = 'a vast, ethereal desert oasis landscape'; break;
        case 'On stage as Keynote speaker': 
            const { spatialLogic, audienceLogic } = buildKeynoteSpatialLogic(options);
            
            let micInstruct = "";
            switch (options.conferenceMicType) {
                case 'Handheld':
                    micInstruct = "The speaker is actively holding a professional handheld stage microphone in their hand.";
                    break;
                case 'Discreet Headset':
                    micInstruct = "The speaker is wearing an ultra-discreet, skin-toned professional headset microphone (modern TED Talk style) looped over their ear.";
                    break;
                case 'None':
                    micInstruct = "There is NO microphone visible near the speaker.";
                    break;
                case 'Podium Gooseneck':
                default:
                    micInstruct = "The podium (lectern) is equipped with dual slender gooseneck microphones.";
                    break;
            }

            let stageProps = `(CRITICAL DIRECTIVE: The speaker MUST be clearly standing DIRECTLY BEHIND a sleek, modern stage podium (pupitre/lectern). The podium must physically occlude the lower torso of the speaker. Hands should realistically rest on or gesture just above the podium structure.) ${micInstruct} Dramatic, high-end event lighting (like deep blue or warm amber uplighting and sharp white front spotlights) creates a cinematic, world-class presentation atmosphere.`;
            
            let screenTextInstruct = options.conferenceScreenText?.trim() ? `A massive, glowing cinematic LED presentation screen spans the entire deep background. It explicitly displays the giant text: "${options.conferenceScreenText}" in clean, modern corporate typography perfectly integrated into the digital display geometry. The screen is naturally integrated into the background depth of field, with visible LED pixel grid textures when closely examined.` : "A massive, dimly glowing cinematic presentation LED screen spans the deep background, slightly out of focus, showing abstract modern corporate gradients.";
            
            let kakimonoInstruct = "";
            let hasKakimono = options.conferenceKakimonoText?.trim() || options.conferenceKakimonoLogo;
            if (hasKakimono) {
                kakimonoInstruct = `Standing naturally on the stage floor next to the speaker is a highly realistic, physical vertical roll-up banner (Kakimono). It MUST have a heavy metallic weighted base resting solidly on the stage floor, visible physical staging material (vinyl or matte fabric texture preventing glare), and cast a realistic physical drop-shadow on the stage, catching the ambient stage up-lighting.`;
                if (options.conferenceKakimonoText?.trim()) {
                    kakimonoInstruct += ` It is printed clearly and legibly with the text: "${options.conferenceKakimonoText}", obeying perspective rules.`;
                }
                if (options.conferenceKakimonoLogo) {
                    kakimonoInstruct += ` The provided logo image MUST be seamlessly printed directly onto the banner's vinyl fabric, perfectly blending with the stage lighting, shadows, curvature of the banner, and material texture (ABSOLUTELY NO floating digital sticker effect).`;
                }
            }

            envDesc = `a highly authentic, ultra-realistic corporate keynote auditorium. ${spatialLogic} ${audienceLogic} ${stageProps} ${screenTextInstruct} ${kakimonoInstruct} The entire scene MUST completely eliminate any "AI look" by rendering perfectly interacting stage uplighting, optical lens flares from the spotlights, sub-surface scattering on skin, and physical textures on all props (audio gear, vinyl banner, stage floor). The subject is giving a passionate, expert keynote presentation. Crisp cinematic spotlighting perfectly separates the tack-sharp speaker from the background.`; 
            break;
        case 'Podcast studio': envDesc = 'a premium, acoustically treated podcast studio with high-end broadcast microphones on boom arms, neon accent lights, soundproofing foam panels, and warm intimate broadcasting lighting'; break;
        case 'Meme setting': envDesc = 'a highly recognizable, surreal internet meme format background (like the "distracted boyfriend" street, "this is fine" burning room, or a classic reaction image setting), perfectly integrated but leaving space for viral text overlay'; break;
    }

    return `${envDesc} featuring ${bgTypeDesc}. Dominant color palette: ${options.colorPalette}. ADVANCED BACKGROUND SELECTION: Ensure the background is distinct and clearly separated from the subject using accurate depth of field. Use advanced AI upscaling techniques to render the entire scene in ultra-realistic 4K resolution without noise or artifacts.`;
}

const buildCameraDescription = (options: GenerationOptions): string => {
    // If the user selects the Keynote Presentation Pose AND/OR Environment, aggressively enforce spatial alignment optics
    if (options.environment === 'On stage as Keynote speaker' || options.pose === 'Keynote Presentation') {
        const { spatialLogic, audienceLogic } = buildKeynoteSpatialLogic(options);
        return `Camera Distance: ${options.cameraDistance}. Lens Simulation: ${options.cameraLens}. 
${spatialLogic} 
${audienceLogic}
(Note: Standard Camera Angle and Axis are strictly overridden by this Keynote Spatial Logic to ensure physics and audience alignment are correct).`;
    }
    
    return `Camera Angle: ${options.cameraAngle}. Camera Axis: ${options.cameraAxis}. Distance: ${options.cameraDistance}. Lens Simulation: ${options.cameraLens}.`;
}

const buildLightingDescription = (options: GenerationOptions): string => {
    let lightingText = `Professional Masterpiece Lighting Setup.`;
    
    // Explicit color instruction based on palette to override Gemini's tendency to drop color
    if (!options.isBlackAndWhite && options.pose !== 'Black and White' && options.pose !== 'Elite Cigar Black and White' && options.postProcessing !== 'Monochrome' && options.colorPalette !== 'Monochrome') {
        lightingText += ` (CRITICAL: The lighting MUST produce full, rich, vibrant colors. DO NOT use any monochrome or grayscale lighting effects. Ensure the environment, skin, and clothing reflect true-to-life color saturation.)`;
    } else {
        lightingText += ` (CRITICAL: The lighting MUST be strictly black and white/monochrome, using sharp contrast, deep shadows, and bright highlights.)`;
    }

    return lightingText;
}

const buildFinishingDescription = (options: GenerationOptions): string => {
    return `Film Grain/Texture: ${options.filmGrain}. Post-processing Style: ${options.postProcessing}.`;
}

const POSE_VARIATIONS: Record<GenerationOptions['pose'], string[]> = {
  'Editorial': [
    "a powerful, confident stance looking directly at the camera",
    "a dynamic, slightly off-balance movement, capturing a moment of motion",
    "a serene, thoughtful expression, looking away from the camera",
    "a close-up shot focusing on the garment's details",
    "shot from a low angle to emphasize height and power",
    "a playful and candid laughing expression",
    "leaning against a prop in the scene, looking relaxed yet poised",
    "a three-quarter turn with a commanding gaze over the shoulder"
  ],
  'Runway': [
    "mid-stride down the runway with a strong, purposeful walk",
    "at the end of the runway, striking a sharp, angular pose",
    "captured in a dramatic turn, with the garment flowing",
    "a close-up of the upper body, highlighting the garment's texture",
    "from a side angle, showing the silhouette in motion",
    "a fierce and focused facial expression, eyes forward",
    "a backstage candid moment just before stepping onto the runway",
    "a powerful stop-and-pose at the runway's edge"
  ],
  'Portrait': [
    "a classic head-and-shoulders shot with a soft, gentle smile",
    "an intense, dramatic close-up focusing on the eyes and expression",
    "a three-quarter view, with the model looking over their shoulder",
    "using hands to elegantly frame the face",
    "a profile shot, highlighting the silhouette of the face and hairstyle",
    "a genuine, hearty laugh, capturing a moment of joy",
    "a quiet, introspective look, with soft lighting",
    "chin tilted up slightly with a look of confidence"
  ],
  'Dynamic Pose': [
    "captured mid-jump, with fabric flying for a sense of weightlessness",
    "in a deep lunge, showcasing the garment's flexibility and form",
    "twirling gracefully, creating a swirl of fabric and motion",
    "a powerful high-kick pose, demonstrating strength and style",
    "leaning back dramatically, as if caught by a gust of wind",
    "crouched low to the ground in an athletic, ready-for-action stance",
    "captured in the middle of a dance move, full of energy",
    "an explosive leap into the air"
  ],
  'Candid': [
    "laughing genuinely, as if sharing a joke with someone off-camera",
    "adjusting a piece of the garment, a natural, unposed moment",
    "walking through the scene, looking at something with curiosity",
    "caught in a moment of reflection, looking out a window",
    "interacting with the environment, like touching a flower",
    "a stolen glance towards the camera with a subtle, knowing smile",
    "mid-conversation, with an expressive gesture",
    "fixing their hair with a natural movement"
  ],
  'Product Focus': [
    "holding and looking at an accessory with admiration",
    "a close-up on the garment's texture, with the model's hands gently touching the fabric",
    "posing to highlight a specific feature, like the back of a dress",
    "a shot where the model is slightly blurred, and the product is in sharp focus",
    "hands positioned to draw attention to jewelry",
    "a pose that accentuates the drape and flow of the fabric",
    "the model's pose creates clean lines that lead the eye to the garment",
    "turning to showcase the side details of the clothing"
  ],
  'Sitting Pose': [
    "sitting elegantly on a velvet chair, legs crossed",
    "casually sitting on steps, looking thoughtfully into the distance",
    "sitting on the floor, hugging their knees in a relaxed manner",
    "perched on the edge of a table, with a playful smile",
    "lounging on a chaise lounge, exuding luxury and comfort",
    "sitting cross-legged on a plush rug, with a serene expression",
    "in a formal seated portrait pose on an ornate stool",
    "sitting on a windowsill, silhouetted against the light"
  ],
  'Gesture': [
    "hand elegantly touching the chin, in a thoughtful gesture",
    "arms crossed with a confident and powerful look",
    "one hand resting on the hip, creating a classic fashion pose",
    "hands running through their hair, a candid and natural movement",
    "a 'shushing' gesture with a finger to the lips",
    "blowing a kiss towards the camera playfully",
    "hands clasped behind the back for a poised and formal look",
    "a welcoming gesture with open arms and a warm smile"
  ],
  'Selfie Pose': [
    "holding a phone and taking a classic mirror selfie",
    "a high-angle selfie, smiling brightly at the phone's camera",
    "a playful 'duck face' selfie, adding a touch of humor",
    "a close-up selfie focusing on the face and upper garment details",
    "using a selfie stick to capture a wider view",
    "a 'plandid' selfie, looking away from the phone",
    "a group selfie pose, even if the model is alone",
    "a low-angle selfie, creating a powerful look"
  ],
  'Mode': [
    "a high-fashion stance with angular positioning and sharp limbs",
    "hands on hips with a confident, trendy, and commanding expression",
    "a chic walking pose with movement in the hair and clothes",
    "leaning slightly back with an aloof, cool, and edgy attitude",
    "a structured pose highlighting the silhouette of the outfit clearly",
    "one hand adjusting sunglasses or accessory with effortless style",
    "a relaxed but polished stance with crossed legs, looking chic",
    "looking side-on with a sharp, defined jawline and intense gaze"
  ],
  'Glamour': [
    "lying elegantly on a chaise lounge or surface, exuding luxury",
    "hand running through hair with a sensual and captivating expression",
    "looking over the shoulder with soft, alluring, and mysterious eyes",
    "a poised stance with an arched back and a confident, radiant smile",
    "touching the neck or collarbone gently, highlighting jewelry or skin",
    "a dramatic pose with flowing fabric or hair blown by a wind machine",
    "lips slightly parted with a captivating, intense gaze at the camera",
    "highlighting curves with a confident and empowered body language"
  ],
  'Corporate': [
    "standing tall with arms crossed, exuding authority and professionalism",
    "a friendly, approachable handshake gesture with a warm smile",
    "sitting upright at a desk or table with focus and intent",
    "holding a tablet or document with a professional demeanor",
    "standing with hands in pockets, looking relaxed but business-like",
    "adjusting a blazer or tie with a sharp, decisive look",
    "a confident headshot pose with a warm, trustworthy smile",
    "gesturing while speaking, as if presenting to an audience"
  ],
  'Smoking': [
    "holding a cigarette elegantly between fingers, smoke curling up",
    "exhaling a thin plume of smoke with a relaxed expression",
    "lighting a cigarette with a vintage lighter, focused look",
    "holding a cigar with authority, looking contemplative",
    "leaning back with a cigarette in hand, exuding cool confidence",
    "a moody, atmospheric shot with smoke obscuring part of the face",
    "holding a cigarette holder with a vintage, sophisticated flair",
    "gazing through a haze of smoke with a mysterious expression"
  ],
  'Classy Business': [
    "checking a luxury watch with a busy, professional demeanor",
    "walking briskly with a leather briefcase, looking determined",
    "adjusting cufflinks on a bespoke suit, looking sharp",
    "reviewing documents with a serious, analytical expression",
    "standing confidently in a power pose, hands on hips",
    "shaking hands with an unseen partner, conveying trust and success",
    "sitting at a high-end desk, signing a contract with a fountain pen",
    "looking out of a skyscraper window, contemplating success"
  ],
  'Elite Smoking': [
    "lounging in a VIP area, holding a premium thick-gauge cigar with a textured brown wrapper and a perfect grey ash tip, exuding absolute power",
    "a cinematic close-up of the hand holding a burning premium cigar with a distinct gold and red band, smoke swirling elegantly around the fingers",
    "exhaling a thick, luxurious cloud of smoke that frames the face, holding a high-end cigar like a scepter",
    "sitting in a leather armchair, one hand resting on the knee holding a lit cigar with a visible glowing ember, looking intensely at the camera",
    "a dramatic silhouette shot where the only light comes from the glowing tip of a premium cigar and a rim light on the profile",
    "leaning forward with a predatory, confident smirk, gesturing with a thick, expensive cigar between the fingers",
    "reflecting on a glass surface, holding a cigar with a long ash tip, creating a moody and atmospheric composition",
    "a low-angle power shot, looking down with a cigar in hand, smoke rising vertically in a straight, calm line"
  ],
  'Black and White': [
    "a dramatic, high-contrast black and white portrait with deep shadows and bright highlights",
    "a classic, timeless black and white pose, looking thoughtfully away from the camera",
    "a moody, film noir style black and white shot with strong directional lighting",
    "a sharp, elegant black and white fashion stance, emphasizing form and silhouette",
    "a close-up black and white portrait focusing on intense eye contact and skin texture",
    "a dynamic black and white action shot, freezing motion with high contrast",
    "a soft, ethereal black and white portrait with a gentle, glowing aura",
    "a powerful, commanding black and white pose, standing tall with a confident expression"
  ],
  'Elite Cigar Black and White': [
    "a dramatic, high-contrast black and white shot lounging in a VIP area, holding a premium thick-gauge cigar, exuding absolute power",
    "a cinematic black and white close-up of the hand holding a burning premium cigar, smoke swirling elegantly around the fingers",
    "a moody, film noir style black and white shot exhaling a thick cloud of smoke that frames the face, holding a high-end cigar like a scepter",
    "a sharp, elegant black and white shot sitting in a leather armchair, holding a lit cigar, looking intensely at the camera",
    "a dramatic black and white silhouette shot where the only light comes from the glowing tip of a premium cigar and a rim light on the profile",
    "a powerful black and white shot leaning forward with a predatory, confident smirk, gesturing with a thick, expensive cigar",
    "a classic black and white shot reflecting on a glass surface, holding a cigar with a long ash tip, creating a moody and atmospheric composition",
    "a low-angle black and white power shot, looking down with a cigar in hand, smoke rising vertically in a straight, calm line"
  ],
  'Keynote Presentation': [
    "a dynamic mid-presentation stance from directly behind the physical stage podium (pupitre/lectern), arms gracefully gesturing just above the podium surface, exuding profound charisma and absolute confidence while making direct eye contact with the audience",
    "a powerful, visionary posture, standing firmly behind the podium and leaning slightly forward on it with a 'steeple' hand gesture, conveying deep intellect, authority, and eloquence",
    "captured mid-sentence standing perfectly positioned behind the solid stage lectern (pupitre), holding a sleek presentation clicker while using the free hand to point decisively across the podium",
    "a classic charismatic posture standing anchored securely behind the presentation podium (pupitre), one hand resting on the lectern's edge and the other open-palmed facing upward as if offering a revolutionary idea",
    "an intense, passionate moment of eloquence safely positioned right behind the podium, both hands brought to chest level above the lectern structure, fingers slightly spread to articulate a nuanced detail",
    "a commanding presence standing solidly behind their dedicated speaking podium (pupitre/lectern) with their lower torso occluded, one hand resting on the podium surface and the other raised in a subtle, powerful baton-like gesture",
    "exhibiting extreme confidence while stationed perfectly behind the presentation pupitre, caught in a moment of a subtle, knowing smile, engaging directly with the crowd over the top of the podium",
    "a highly magnetic body language, captured leaning forward with both hands resting symmetrically on the front lip of their sleek stage podium (pupitre), beautifully composed and radiating professional leadership"
  ]
};

const getRandomPoseVariation = (pose: GenerationOptions['pose']): string => {
  const variations = POSE_VARIATIONS[pose];
  if (!variations || variations.length === 0) {
    return `an elegant ${pose} pose`;
  }
  const randomVariation = variations[Math.floor(Math.random() * variations.length)];
  return `an elegant ${pose} pose, specifically: ${randomVariation}. The pose should be professional, stylish, and high-fashion (incorporating corporate/mode/glamour elements where appropriate).`;
};


const buildPrompt = (options: GenerationOptions, poseDescription: string): string => {
  const backgroundDescription = buildBackgroundDescription(options);
  const cameraDescription = buildCameraDescription(options);
  const lightingDescription = buildLightingDescription(options);
  const finishingDescription = buildFinishingDescription(options);

  let tattooInstruction = '';
  if (options.tattoos && options.tattoos !== 'none') {
    let tattooStyleDescription = '';
    switch (options.tattoos) {
        case 'minimal':
            tattooStyleDescription = 'minimalist tattoos, such as fine line art';
            break;
        case 'symbols':
            tattooStyleDescription = 'a few small, symbolic tattoos';
            break;
        case 'discreet':
            tattooStyleDescription = 'a discreet tattoo, small and placed in a less obvious location';
            break;
        case 'full':
            tattooStyleDescription = 'multiple visible, artistic, and fashionable tattoos';
            break;
    }
    if (tattooStyleDescription) {
        tattooInstruction = `\n    -   **Tattoos:** The person must have ${tattooStyleDescription}.`;
    }
  }

  let actualPoseDescription = poseDescription;
  let sittingAccessoryInstruction = '';
  if (options.model.isSitting) {
      actualPoseDescription = `${poseDescription} - Sophisticated sitting pose on a luxury minimalist designer sofa, premium classic studio bench, or high-end designer lounge chair. The subject is seated extremely elegantly.`;
      sittingAccessoryInstruction = `\n3.5. **SITTING ACCESSORY & COUCH CONFIGURATION (CRITICAL):**
    -   **Constraint:** Since the pose type is Sitting ("Assis"), the subject MUST be clearly and elegantly sitting on an ultra-luxury modern designer sofa, elegant bespoke leather studio couch, or classy designer minimalist lounge seat.
    -   **Task:** The seating furniture must look perfectly authentic, professional, and matching a high-end luxury studio background. Gravity physics, shadows, and fabric folding/draping of the garment on the seat must feel organic, deep, and hyper-realistic.`;
  }

  // Image Index Tracking
  let currentImageIndex = 1; // Model is #1 always.

  let bodyDescriptionInstruction = '';
  const bodyDetails: string[] = [];
  if (options.model.heightCm) {
      const h = Number(options.model.heightCm);
      if (!isNaN(h) && h > 0) {
          bodyDetails.push(`Height of the subject: ${h} cm`);
          if (h < 155) {
              bodyDetails.push(`petite model stature, short vertical body frame, shorter natural legs and arms, organic compact fashion proportions`);
          } else if (h >= 155 && h < 165) {
              bodyDetails.push(`slightly petite to moderate model stature, natural balanced leg-to-torso proportions, realistic bone structure`);
          } else if (h >= 165 && h < 175) {
              bodyDetails.push(`average to athletic model height, proportional limbs and standard torso line`);
          } else if (h >= 175 && h < 185) {
              bodyDetails.push(`tall fashion model stature, slender long legs, high waistline elongation, graceful long limbs, elevated vertical frame`);
          } else {
              bodyDetails.push(`exceptionally tall and towering model stature, ultra-long legs, statuesque fashion presence, extreme vertical elongation and slender limb proportions`);
          }
      } else {
          bodyDetails.push(`Height of the subject: ${options.model.heightCm} cm`);
      }
  }
  if (options.model.bodyDescription && options.model.bodyDescription.trim() !== '') {
      bodyDetails.push(options.model.bodyDescription.trim());
  }

  if (bodyDetails.length > 0) {
      const detailsText = bodyDetails.join(', ');
      bodyDescriptionInstruction = `\n5.  **TAILLE & MORPHOLOGIE / BODY SPECIFICATIONS (MANDATORY):**
    -   **Constraint:** You MUST strictly and realistically respect the subject's morphology, height, and body dimensions as specified: "${detailsText}".
    -   **Task:** Render the person with the exact build, weight, and height specified. The garment must drape and fit realistically over this specific body shape with correct proportions. Proportions must be anatomically precise. Height scales must look natural and accurate to the relative stature environment.`;
  }
  
  let fullBodyInstruction = '';
  if (options.model.fullBodyImage) {
      currentImageIndex++;
      const ordinals = ['first', 'second', 'third', 'fourth', 'fifth', 'sixth'];
      const ordinal = ordinals[currentImageIndex - 1];
      fullBodyInstruction = `\n${currentImageIndex}.  **BODY PROPORTIONS REFERENCE (CRITICAL):** The *${ordinal}* image provided is the STRICT visual reference for the subject's FULL BODY structure, build, and height.
    -   **Task:** Match the body type, height, and physical proportions exactly to this reference image. The final subject MUST have this specific body shape.`;
  }

  let garmentInstruction = '';

  let exactGarmentTransferInstruction = '';
  if (options.garment.image) {
    currentImageIndex++; // Garment is #2 or #3
    const ordinal = ['first', 'second', 'third', 'fourth', 'fifth', 'sixth'][currentImageIndex - 1];
    garmentInstruction = `\n${currentImageIndex}.  **EXACT 1:1 GARMENT TRANSFER & PRECISION WEARING (ABSOLUTELY CRITICAL):** The *${ordinal}* image provided is the absolute visual blueprint and ground truth for the GARMENT.
    -   **Task:** You MUST dress the main model in the EXACT same garment shown in this reference image. Ensure the clothing's cut, fit, silhouette, colors, print motifs, brand graphics, text, logo details, stripes, fabric pattern, button arrangement, zipper details, and texture are transferred onto the model's body with 100% precision and ultimate visual fidelity.
    -   **Physics & Folds:** The garment must conform and adapt realistically to the model's pose, contours, and 3D body shape, showing physical fabric folds, drapes, tension, and realistic lighting shadows.
    -   **Secondary Description:** The technical description "${options.garment.description}" is strictly secondary and serves only to clarify the fabric characteristics (e.g., silk, satin, heavy wool, leather) and three-dimensional fit. It must NEVER override, simplify, or modify the colors, patterns, logos, print graphics, or text shown in the garment reference image.
    -   **Strict Guard:** Do NOT alter, redesign, simplify, or idealize the garment. Do NOT copy the face, hair, pose, body structure, or background from the garment reference image — ONLY transfer the clothing itself. All printed letters, logos, and motifs must be 100% legible and visible.`;
    
    exactGarmentTransferInstruction = `\n2.5. **ABSOLUTE 1:1 PRECISION GARMENT INFUSION (SUPREME PRIORITY):**
    -   Since an uploaded garment reference photo is provided, you MUST infuse it onto the model with absolute 1:1 fidelity.
    -   Keep every graphic pattern, brand design, logo representation, color configuration, fabric texture, seam line, zipper tape, pocket design, and collar structure EXACTLY as shown in the garment image.
    -   NEVER simplify, redesign, or alter the clothing's visual design, print, or words under any circumstances. The final generated garment must be an exact visual match to the reference garment, naturally mapped onto the model's body.`;
  } else {
    currentImageIndex++;
    garmentInstruction = `\n${currentImageIndex}.  **Garment Description:** The person MUST wear a garment described as: "${options.garment.description}".`;
  }

  let companionInstruction = '';
  let subjectDescription = 'A high-fashion person.';
  let extraNegative = '';
  
  if (options.companion && options.companion.enabled) {
      subjectDescription = 'Two people: the main high-fashion person and a companion guest.';
      extraNegative = ', clones, identical twins, doppelganger, same face';

      if (options.companion.image) {
          currentImageIndex++;
          const ordinal = ['first', 'second', 'third', 'fourth', 'fifth', 'sixth'][currentImageIndex - 1];
          companionInstruction = `\n${currentImageIndex}.  **Companion Reference (CRITICAL):** The *${ordinal}* image provided is the reference for the COMPANION.
    -   **Task:** Place this exact person (from the ${ordinal} image) into the scene as the companion.
    -   **Context:** ${options.companion.description || 'A companion matching the reference image.'}.
    -   **Role:** The companion should interact naturally with the main person based on the pose ("${poseDescription}").`;
      } else {
           currentImageIndex++;
           const desc = options.companion.description || "A fashionable companion.";
           companionInstruction = `\n${currentImageIndex}.  **Companion (CRITICAL):** The scene includes a second person interacting with the main person.
    -   **Description:** ${desc}.
    -   **Role:** The companion should interact naturally with the main person based on the pose ("${poseDescription}").
    -   **Distinction:** The companion MUST NOT look like the main person.`;
      }
  }

  let cigarInstruction = '';
  if (options.pose === 'Elite Smoking' || options.pose === 'Elite Cigar Black and White') {
      cigarInstruction = `\n    -   **PROP SPECIFICATION (MANDATORY):** The person MUST be holding a **premium, thick-gauge cigar** with a textured tobacco leaf wrapper.
    -   **Details:** The cigar must have a distinct band near the head. It should be lit with a visible **glowing ember** and a perfect **ash tip**.
    -   **Smoke Physics:** Render realistic, volumetric smoke drifting naturally from the cigar.`;
  }

  let bwInstruction = '';
  if (options.isBlackAndWhite || options.pose === 'Black and White' || options.pose === 'Elite Cigar Black and White' || options.postProcessing === 'Monochrome' || options.colorPalette === 'Monochrome') {
      bwInstruction = `\n    -   **COLOR PALETTE (MANDATORY):** The final image MUST be rendered entirely in **Black and White (Monochrome)**. Use rich, deep blacks, bright whites, and a full range of grey tones to create a dramatic, high-contrast, cinematic look. Do not include any color.`;
  } else {
      bwInstruction = `\n    -   **FULL COLOR SPECIFICATION (CRITICAL OVERRIDE):** The ENTIRE output MUST be in full, vibrant, highly saturated natural color. You MUST colorize the model's skin, face, hair, and the background fully, even if any reference image is grayscale. DO NOT use selective coloring, colorkey, color-splash, grayscale, or monochrome effects under ANY circumstances.`;
  }

  let accessoriesInstruction = '';
  if (options.accessories) {
      const acc = [];
      if (options.accessories.shoes) acc.push(`Shoes: ${options.accessories.shoes}`);
      if (options.accessories.watch) acc.push(`Watch: ${options.accessories.watch}`);
      if (options.accessories.jewelry) acc.push(`Jewelry: ${options.accessories.jewelry}`);
      if (options.accessories.other) acc.push(`Other: ${options.accessories.other}`);
      
      if (acc.length > 0) {
          accessoriesInstruction = `\n    -   **Accessories (CRITICAL):** The person MUST be wearing the following accessories exactly as described: ${acc.join(', ')}.`;
      }
  }

  let customPromptInstruction = '';
  if (options.customPrompt && options.customPrompt.trim().length > 0) {
      customPromptInstruction = `\n    -   **CUSTOM INSTRUCTION (HIGH PRIORITY):** ${options.customPrompt.trim()}`;
  }

  let kakimonoPromptInstruction = '';
  if (options.environment === 'On stage as Keynote speaker' && options.conferenceKakimonoLogo) {
      currentImageIndex++;
      const ordinal = ['first', 'second', 'third', 'fourth', 'fifth', 'sixth'][currentImageIndex - 1] || 'last';
      kakimonoPromptInstruction = `\n${currentImageIndex}.  **Kakimono Logo (CRITICAL REFERENCE):** The *${ordinal}* image provided is the branding logo for the Kakimono.
    -   **Task:** You MUST seamlessly print this exact logo directly onto the physical vertical roll-up banner (Kakimono) on stage. Align it beautifully with extreme realism.`;
  }

  let colorizationGuard = '';
  if (!options.isBlackAndWhite && options.pose !== 'Black and White' && options.pose !== 'Elite Cigar Black and White' && options.postProcessing !== 'Monochrome' && options.colorPalette !== 'Monochrome') {
      colorizationGuard = `\n3.  **COLORIZATION GUARD (ABSOLUTE PRIORITY):**\n    -   If the provided model reference photo is in black and white or grayscale, you MUST fully colorize the final output realistically. The final image MUST be in full, natural, vibrant color, and the subject's skin tone MUST be rendered with a warm, lifelike complexion. DO NOT output a grayscale face or partial color-splash image!`;
  } else {
      colorizationGuard = `\n3.  **MONOCHROME GUARD (ABSOLUTE PRIORITY):**\n    -   The final image MUST be rendered strictly in black and white. Absolutely no color should be present in the final output.`;
  }

  // Updated Prompt Header for "All Gemini Power" with stricter Identity Preservation and Hollywood Studio quality
  return `**ULTIMATE HOLLYWOOD CINEMATOGRAPHY. MASTERPIECE FASHION EDITORIAL. PHASE ONE XF 150MP MEDIUM FORMAT PHOTOGRAPHY. NATIVE 8K RESOLUTION. SUPER-RESOLUTION CLARITY. HYPER-REALISTIC TEXTURE ACCURACY. ALWAYS SHOW THE COMPLETE FULL BODY OF THE PRIMARY SUBJECT FROM HEAD TO TOE. HEAD AND SHOES MUST BE FULLY VISIBLE WITHIN THE PICTURE FRAME. ZERO CROPPING AT THE BOTTOM OF THE OUTFIT, LEGS, OR FEET.**
**Model:** Gemini 3.1 Pro Ultra-Realism Engine.
**Intent:** ${options.intent}.
**Aspect Ratio:** ${options.aspectRatio}.
**Subject:** ${subjectDescription}
**Pose:** ${actualPoseDescription}.
**Setting:** ${backgroundDescription}.
**Camera:** ${cameraDescription} (MANDATORY: Render the full-body aspect of the subject, ensuring both head and shoes are perfectly in frame and fully visible. No cropped feet).
**Lighting:** ${lightingDescription}.
**Finishing:** ${finishingDescription}.
**Core Instructions:**
1.  **ABSOLUTE 1:1 IDENTITY TRANSPLANT & MAXIMUM FAITHFULNESS (HIGH-PRIORITY CRITICAL DIRECTIVE):** The *first* image provided is the ULTIMATE, ZERO-TOLERANCE GROUND TRUTH and absolute blueprint for the subject's face, features, and precise identity.
    -   **Strict Task:** You are FORBIDDEN from generating a generalized or stylized "AI-smooth" model. The final face MUST be an exact 1:1 photorealistic physical clone and flawless transplant of the human face from the first reference image.
    -   **Precise Facial Structure:** You MUST map and match the exact physical details:
        *   **Eyes & Gaze:** Preserve the precise eye color, iris patterns, double eyelid folds, exact outer and inner eye corner (canthus) angles, matching brow distance, and the exact eyebrow arch, thickness, texture, and single hairs. Keep the user's specific eye bag shadows (cernes) or eye look natural.
        *   **Nose:** Replicate the exact nose bridge slope, nasal tip shape, nostril width, and cartilage structure. Do not slim, lift, or generalize the nose.
        *   **Mouth & Smile:** Retain the precise lip shape, the exact outline of the Cupid's bow, lip fullness, outer corners of the mouth, and chin cleft or dimpling.
        *   **Face Shape & Bone Structure:** Maintain the exact jawline angle, cheekbone height, forehead shape, and ear size/placement. Keep the natural facial asymmetry.
    -   **Natural Skin & Facial Hair:** Keep all skin characteristics exactly: birthmarks, moles, freckles, unique lines, skin micro-pores, peach fuzz, stubble, or facial hair. The texture must feel tactile, detailed, and organic—never airbrushed or plastic.
    -   **Gaze & Angle Adaptability:** If the head is tilted or rotated, the 3D projection of the facial features must remain mathematically consistent with the reference face, carrying over the signature look, charisma, and emotional micro-expression with perfect precision.
    -   **Zero Deviation Standard:** If the final face looks even slightly modified, stylized, younger, older, more generic, or different from the subject in the first reference image, it constitutes a critical system failure. Every single facial contour, cheek shape, and jaw structure must align with the first image. It must look exactly like a real physical photograph of THAT specific person.
2.  **Professional Retouching & Super Resolution (MANDATORY):**
    -   **Finish:** The image MUST have the quality of a high-end commercial retouch. Every pixel must be sharp and clean.
    -   **Clarity:** Enhance the micro-contrasts to achieve a "Super Resolution" effect where each thread of fabric and each skin pore is distinct and sharp. NO BLUR, NO GRAIN unless explicitly requested.${colorizationGuard}${exactGarmentTransferInstruction}${sittingAccessoryInstruction}
${tattooInstruction}${cigarInstruction}${bwInstruction}
${fullBodyInstruction}
${garmentInstruction}
${accessoriesInstruction}
${companionInstruction}${kakimonoPromptInstruction}${customPromptInstruction}${bodyDescriptionInstruction}
4.  **Hollywood Studio Hyper-Realism, Anatomy & Physics (MANDATORY):**
    -   **Goal:** The final output MUST be completely indistinguishable from a real, professional Hollywood studio photoshoot.
    -   **Optical Anti-Aliasing & 8K Super Resolution (CRITICAL):** The image MUST be rendered at the absolute maximum native resolution with Super-Resolution clarity. It must feature flawless anti-aliasing with ZERO jagged edges, digital compression, or pixelation. The image must remain perfectly tack-sharp even at extreme macro zoom.
    -   **Anatomy:** Flawless human anatomy, perfect proportions. Hands and fingers MUST be perfectly rendered with correct joints, structure, and realistic skin folds.
    -   **Skin Texture:** Implement hyper-realistic skin textures. Render visible skin pores, fine vellus hair, and realistic skin micro-texture. Use sub-surface scattering for depth. NO PLASTIC OR AIRBRUSHED SKIN.
    -   **Eyes:** Lifelike eyes with realistic crystalline depth, detailed irises, and sharp catchlights reflecting the professional lighting rig.
    -   **Lighting & Physics:** Professional Hollywood multi-point lighting rig (Key, Fill, Rim, Kick, and Catch lights) with physically accurate light fall-off and highlights. Shadows must be soft yet defined.
    -   **Micro-Detail:** Fabric weaves, stitching, jewelry facets, and accessory textures must have tactile, touchable definition.
    -   **Cinematic Optics:** Use the f/2.8 lens characteristic of high-end cinema optics to keep the subject tack-sharp while creating a sophisticated, expensive-looking background bokeh separation.
${options.watermark ? `**Final Output Requirement:**
-   **Watermark (MANDATORY):** A subtle, semi-transparent white watermark with the text "Studio a6ko" must be placed in the bottom-right corner.` : ''}`;
};


const buildAnimationPrompt = (
    garmentDescription: string,
    environment: GenerationOptions['environment'],
    options: AnimationOptions
): string => {
  const instructions: string[] = [];
  
  let voiceInstruction = '';
  if (options.voiceGender === 'female') {
    voiceInstruction = 'The voiceover should be performed by a clear, professional female voice.';
  } else if (options.voiceGender === 'male') {
    voiceInstruction = 'The voiceover should be performed by a clear, professional male voice.';
  }

  if (options.audioType === 'script' && options.script.trim()) {
    instructions.push(`${voiceInstruction} The person should speak the following dialogue with perfect, clear lip-sync: "${options.script}".`);
  } else if (options.audioType === 'music') {
    switch (options.musicStyle) {
      case 'Uplifting Electronic':
        instructions.push(`Animate with an energetic, modern feel and quick, stylish cuts.`);
        break;
      case 'Calm Lo-fi':
        instructions.push(`Animate with a calm, relaxed vibe and soft focus transitions.`);
        break;
      case 'Cinematic Orchestra':
        instructions.push(`Animate with a dramatic, cinematic quality and powerful, sweeping camera movements.`);
        break;
      case 'Tribal Beats':
        instructions.push(`Animate with a powerful, rhythmic energy, with movements and cuts timed to an intense tribal beat.`);
        break;
    }
  } else {
    instructions.push("Animate this scene with subtle, gentle fabric flutter and slight shifts in pose.");
  }
  
  switch (options.cameraMove) {
    case 'pan':
      instructions.push("The primary camera movement should be a smooth horizontal pan.");
      break;
    case 'zoom':
      instructions.push("The primary camera movement should be a slow dolly zoom.");
      break;
    case 'dolly':
      instructions.push("The primary camera movement should be a gentle dolly-in towards the person.");
      break;
    case 'none':
      instructions.push("The camera should remain relatively static.");
      break;
  }
  
  switch (options.style) {
    case 'slow-motion':
      instructions.push("The entire scene should be rendered in dramatic slow-motion.");
      break;
    case 'fast-forward':
      instructions.push("The animation should be in a fast-forward style.");
      break;
  }
  
  instructions.push("The animation should loop smoothly.");

  const animationInstructions = instructions.join(' ');
  const backgroundDescription = buildBackgroundDescription({ backgroundType: 'Solid Color', environment: environment, colorPalette: 'Neutral' } as any);
  
  return `**MASTERPIECE 4K VIDEO.** A short, cinematic, ultra-high-definition, photorealistic video of the person from the provided image. They are wearing "${garmentDescription}". The setting is ${backgroundDescription}. ${animationInstructions} The final video must be absolutely indistinguishable from a real 4K camera recording. The video must include a subtle, semi-transparent white watermark with the text "Studio a6ko" in the bottom-right corner.`;
}

const getNegativePrompt = (options?: GenerationOptions): string => {
    let base = "logo, brand name, explicit nudity, deformed anatomy, unrealistic features, bad proportions, blurry, grainy, out of focus, low quality, multiple people, cloned features, cgi, 3d, render, illustration, painting, cartoon, airbrushed, plastic skin, smooth skin, overly retouched, filter, makeup heavily applied, doll-like, unnatural texture, bad hands, missing fingers, extra fingers, mutated hands, poorly drawn hands, poorly drawn face, mutation, deformed, ugly, bad anatomy, extra limbs, cloned face, disfigured, gross proportions, malformed limbs, missing arms, missing legs, extra arms, extra legs, fused fingers, too many fingers, long neck, unnatural lighting, artificial look.";
    if (options) {
        if (!options.isBlackAndWhite && options.pose !== 'Black and White' && options.pose !== 'Elite Cigar Black and White' && options.postProcessing !== 'Monochrome' && options.colorPalette !== 'Monochrome') {
            base = "selective coloring, partial black and white, colorkey, desaturated skin, black and white, grayscale, monochrome, sepia, " + base;
        }
        if (options.model?.bodyDescription) {
            base = "deviating from specified body type, incorrect morphology, wrong height, inconsistent body proportions, " + base;
        }
    } else {
        base = "selective coloring, partial black and white, colorkey, desaturated skin, black and white, grayscale, monochrome, sepia, " + base;
    }
    return base;
};

export const generateModelImages = async (prompt: string, count: number = 4, apiKey?: string): Promise<{ base64: string, mimeType: string }[]> => {
    if (typeof window !== 'undefined') {
        return await proxyCallToBackend('generateModelImages', [prompt, count, apiKey]);
    }

    return executeWithRetry(async (ai) => {
        const descriptivePrompt = `**ULTRA-HIGH-DEFINITION, 8K RESOLUTION, MASTERPIECE, EXTREME PHOTOREALISM, SUPER-RESOLUTION QUALITY, PROFESSIONAL STUDIO PHOTOSHOOT.**
**Subject:** ${prompt}. A model around 25 years old with a natural, candid expression.
**Shot on:** Phase One XF IQ4 150MP, 80mm Schneider Kreuznach lens, f/8 aperture for maximum sharpness and professional photoshop retouching.
**Style:** High-end commercial fashion photography, absolutely indistinguishable from a real photograph.
**Key Details:**
-   **Optical Anti-Aliasing (CRITICAL):** The image must be generated at the absolute maximum native 8K resolution with Super-Resolution clarity. It must feature flawless anti-aliasing with ZERO jagged edges, digital compression, or pixelation. The image must remain perfectly tack-sharp and pristine even when heavily zoomed in to examine micro-details.
-   **Professional Retouching:** Applied high-end digital retouching, skin frequency separation, and color grading for a polished magazine-quality finish.
-   **Anatomy:** Flawless human anatomy, perfect proportions.
-   **Hyperrealistic Skin:** Render skin with extreme, intricate detail, including visible skin pores, vellus hair, and realistic skin micro-texture. NO PLASTIC SKIN.
-   **Lifelike Eyes:** Create natural, detailed catchlights in the eyes with reflections of the studio lights.
-   **Lighting:** Professional multi-point studio lighting (Key, Fill, Rim, and Background lights) with accurate shadows and highlights.
-   **Background:** Simple, clean, out-of-focus studio backdrop with subtle texture.
-   **Micro-Contrast:** Fabric weaves, stitching, and jewelry details must have tactile definition.
**Final Output Requirement:**
-   **Watermark (MANDATORY):** A subtle, semi-transparent white watermark with the text "Studio a6ko" must be placed in the bottom-right corner.
**Negative prompt:** ${getNegativePrompt()}`;
        
        const promises = Array.from({ length: count }).map(() => 
            ai.models.generateContent({
                model: 'gemini-3.1-flash-image',
                contents: {
                    parts: [
                        { text: descriptivePrompt }
                    ]
                },
                config: {
                    imageConfig: {
                        aspectRatio: "1:1",
                        imageSize: "4K"
                    }
                }
            })
        );

        const responses = await Promise.allSettled(promises);
        
        const imageParts: any[] = [];
        for (const result of responses) {
            if (result.status === 'fulfilled') {
                const parts = result.value.candidates?.[0]?.content?.parts.filter(p => p.inlineData) || [];
                imageParts.push(...parts);
            } else {
                console.warn("Failed to generate one of the model images:", result.reason);
            }
        }
        
        if (imageParts.length === 0) {
          const firstError = responses.find(r => r.status === 'rejected') as PromiseRejectedResult;
          throw firstError?.reason || new Error(`Could not generate model image.`);
        }
        
        return imageParts.map(part => ({
            base64: part.inlineData!.data,
            mimeType: part.inlineData!.mimeType || 'image/png',
        }));
    }, apiKey, 300000); // 5 minutes timeout for generating model images
}

export const generateInspirationalScript = async (baseScript: string, apiKey?: string): Promise<string> => {
    if (typeof window !== 'undefined') {
        return await proxyCallToBackend('generateInspirationalScript', [baseScript, apiKey]);
    }

    return executeWithRetry(async (ai) => {
        const prompt = `You are a creative director for a fashion tech brand called a6ko.com. Write a short voiceover script variation of: "${baseScript}". Keep it concise and inspiring. Respond ONLY with the text.`;

        try {
            const response = await ai.models.generateContent({
                model: 'gemini-3.5-flash',
                contents: prompt,
            });
            
            const newScript = response.text?.trim();
            if (newScript) {
                return newScript;
            }
            throw new Error("Generated script was empty.");
        } catch (error: any) {
            console.warn("Script generation with Flash failed, trying Flash Lite:", error);
            try {
                const response = await ai.models.generateContent({
                    model: 'gemini-3.1-flash-lite',
                    contents: prompt,
                });
                const newScript = response.text?.trim();
                if (newScript) {
                    return newScript;
                }
                throw new Error("Generated script with Flash Lite was empty.");
            } catch (liteError) {
                throw error; // Let executeWithRetry handle the original error
            }
        }
    }, apiKey, 60000); // 60 seconds timeout for script generation
};

export const generateGarmentDescription = async (image: { base64: string, mimeType: string }, apiKey?: string): Promise<string> => {
    if (typeof window !== 'undefined') {
        return await proxyCallToBackend('generateGarmentDescription', [image, apiKey]);
    }

    return executeWithRetry(async (ai) => {
        const prompt = `You are a professional fashion stylist and technical garment expert. 
Analyze the provided image of a garment with extreme precision. 
Provide a detailed, technical description suitable for a high-end, ultra-realistic text-to-image prompt. 
Include details about:
- Fabric texture (e.g., silk, heavy denim, fine-knit wool, technical mesh)
- Specific color shades and patterns
- Fit and silhouette (e.g., oversized, tailored, draped, structured)
- Technical details (e.g., reinforced stitching, hidden zippers, ribbing, lapel style)
- How it interacts with light (e.g., matte, satin sheen, reflective)

Respond ONLY with the technical description text, optimized for an 8K hyper-realistic photoshoot prompt.`;

        try {
            const response = await ai.models.generateContent({
                model: 'gemini-3.5-flash',
                contents: {
                    parts: [
                        { inlineData: { data: image.base64, mimeType: image.mimeType } },
                        { text: prompt }
                    ]
                },
            });
            
            const description = response.text?.trim();
            if (description) {
                return description;
            }
            throw new Error("Generated description was empty.");
        } catch (error: any) {
            console.warn("Garment analysis with Flash failed, trying Flash Lite:", error);
            try {
                const response = await ai.models.generateContent({
                    model: 'gemini-3.1-flash-lite',
                    contents: {
                        parts: [
                            { inlineData: { data: image.base64, mimeType: image.mimeType } },
                            { text: prompt }
                        ]
                    },
                });
                
                const description = response.text?.trim();
                if (description) {
                    return description;
                }
                throw new Error("Generated description with Flash Lite was empty.");
            } catch (liteError) {
                console.warn("Garment analysis with Flash Lite failed, trying Pro:", liteError);
                try {
                    const response = await ai.models.generateContent({
                        model: 'gemini-3.1-pro-preview',
                        contents: {
                            parts: [
                                { inlineData: { data: image.base64, mimeType: image.mimeType } },
                                { text: prompt }
                            ]
                        },
                    });
                    
                    const description = response.text?.trim();
                    if (description) {
                        return description;
                    }
                    throw new Error("Generated description with Pro was empty.");
                } catch (proError: any) {
                    throw proError; // Let executeWithRetry handle it
                }
            }
        }
    }, apiKey, 90000); // 90 seconds timeout for image analysis
};

const adaptGarmentForModel = async (
  modelImage: { base64: string, mimeType: string },
  garmentDescription: string,
  apiKey?: string
): Promise<string> => {
  return executeWithRetry(async (ai) => {
    try {
        const prompt = `Analyze the person in the provided image and the garment description. Garment: "${garmentDescription}". Adapt this description to be perfectly suitable for the person's perceived body shape and the scene, while retaining the garment's exact style, shape, colors, patterns, logos, prints, material, and visual graphics with 100% precision. DO NOT alter the type of garment (e.g., do not turn a dress into a suit, or a skirt into pants, regardless of perceived gender profiles). Respond ONLY with the adapted description.`;

        let response;
        try {
            response = await ai.models.generateContent({
                model: 'gemini-3.5-flash',
                contents: {
                    parts: [
                        { inlineData: { data: modelImage.base64, mimeType: modelImage.mimeType } },
                        { text: prompt }
                    ]
                },
            });
        } catch (flashError) {
            console.warn("Adaptation with Flash failed, trying Flash Lite:", flashError);
            try {
                response = await ai.models.generateContent({
                    model: 'gemini-3.1-flash-lite',
                    contents: {
                        parts: [
                            { inlineData: { data: modelImage.base64, mimeType: modelImage.mimeType } },
                            { text: prompt }
                        ]
                    },
                });
            } catch (liteError) {
                console.warn("Adaptation with Flash Lite failed, trying Pro:", liteError);
                response = await ai.models.generateContent({
                    model: 'gemini-3.1-pro-preview',
                    contents: {
                        parts: [
                            { inlineData: { data: modelImage.base64, mimeType: modelImage.mimeType } },
                            { text: prompt }
                        ]
                    },
                });
            }
        }

        const adaptedDescription = response.text?.trim();
        if (adaptedDescription && adaptedDescription.length > 10) {
            return adaptedDescription;
        }
        return garmentDescription;

    } catch (error) {
        throw error; // Let executeWithRetry handle it
    }
  }, apiKey, 90000); // 90 seconds timeout for text adaptation
};


// Helper to map UI aspect ratios to Gemini API supported aspect ratios
const mapAspectRatioForApi = (ratio: string): string => {
    const validRatios = ['1:1', '3:4', '4:3', '9:16', '16:9'];
    if (validRatios.includes(ratio)) return ratio;
    
    // Map unsupported ratios to the closest supported match
    switch (ratio) {
        case '4:5': return '3:4'; // Portrait fallback
        case '5:4': return '4:3'; // Landscape fallback
        default: return '1:1'; // Safe default
    }
}

export const generateCreativeAd = async (

  options: CreativesOptions,
  onProgress: (message: string) => void,
  apiKey?: string
): Promise<Asset[]> => {
  return executeWithRetry(async (ai) => {
    onProgress("Crafting the perfect ad prompt...");
    
    let productAssetInstruction = "";
    const imageParts: any[] = [];
    
    if (options.productImage) {
        productAssetInstruction = `\n    -   **REFERENCE/PRODUCT ASSET:** The provided image is a reference or the product. If it's a reference ad, reproduce its layout, style, and composition EXACTLY, but adapt it to the user's specific product and vision. If it's a product, feature it prominently.`;
        imageParts.push({ inlineData: { data: options.productImage.base64, mimeType: options.productImage.mimeType } });
    }

    let sectorContext = "";
    switch (options.sector) {
      case 'Logo Design':
        sectorContext = "Focus on creating a unique, memorable logo that serves as the foundation of brand recognition. Use clean lines, scalable vectors, and culturally resonant symbolism.";
        break;
      case 'Brand Guidelines (Style Guide)':
        sectorContext = "Design a visual representation of brand guidelines, showcasing consistent colors, typography, and brand voice elements across different mediums.";
        break;
      case 'Brand Assets':
        sectorContext = "Generate curated imagery, icons, or custom illustrations that align with a cohesive brand identity, suitable for versatile use.";
        break;
      case 'Website Design (UI/UX)':
        sectorContext = "Create a high-fidelity mockup of a responsive website interface. Focus on user experience, modern layout, and engaging visual hierarchy.";
        break;
      case 'Social Media Graphics':
        sectorContext = "Design templates for posts, stories, or banners (Instagram, LinkedIn, Facebook) that maintain a consistent, eye-catching aesthetic.";
        break;
      case 'Email Marketing Templates':
        sectorContext = "Create branded layouts for newsletters and promotional emails. Focus on clear content hierarchy, engaging headers, and strong call-to-action areas.";
        break;
      case 'Digital Advertisements':
        sectorContext = "Generate compelling imagery for Google Ads, social media ads, or banner ads. Focus on high conversion, clear messaging, and striking visuals.";
        break;
      case 'Business Cards & Stationery':
        sectorContext = "Design professional, tangible branded materials like business cards, letterheads, or envelopes suitable for networking and corporate identity.";
        break;
      case 'Product Packaging/Labels':
        sectorContext = "Create attractive product packaging or label designs. Focus on shelf appeal, clear product information, and brand alignment.";
        break;
      case 'Signage & Promotional Materials':
        sectorContext = "Design physical promotional materials like brochures, flyers, or banners for physical locations or events. Focus on readability from a distance and strong visual impact.";
        break;
      case 'Presentation/Pitch Decks':
        sectorContext = "Create visually engaging slide designs for proposals, investor pitches, or client meetings. Focus on data visualization, clean layouts, and persuasive storytelling.";
        break;
      case 'Reports/Case Studies':
        sectorContext = "Design document layouts that make data and narratives easy to understand. Focus on professional typography, infographics, and structured information design.";
        break;
      case 'Brand identity for SMEs and street businesses':
        sectorContext = "Focus on vibrant, authentic local market aesthetics. Think bold typography, culturally resonant color palettes, and packaging that stands out in a bustling African street market or local shop.";
        break;
      case 'Social media marketing for local retail':
        sectorContext = "Design for high engagement on WhatsApp status, Instagram, and TikTok. Use relatable local scenarios, bright lighting, and clear, irresistible offers that appeal to everyday shoppers.";
        break;
      case 'Music release assets (Afrobeats, Amapiano, etc.)':
        sectorContext = "Channel the energy of contemporary African music. Use dynamic lighting, Afro-futurist elements, vibrant colors, and high-fashion streetwear aesthetics typical of Afrobeats or Amapiano cover art.";
        break;
      case 'Nollywood/Local Film Pitch Decks & Posters':
        sectorContext = "Create dramatic, cinematic visuals with intense emotional expressions. Use rich, moody lighting and compositions that tell a story, reflecting the high drama and cultural depth of Nollywood cinema.";
        break;
      case 'Real Estate & Architecture (Local context)':
        sectorContext = "Showcase properties with a blend of modern luxury and local architectural elements. Highlight indoor-outdoor living, tropical landscaping, and warm, inviting lighting suitable for the African climate.";
        break;
      case 'Fashion & Apparel (Ankara, Kente, Streetwear)':
        sectorContext = "Highlight the rich textures and vibrant patterns of African textiles (Ankara, Kente, Adire) or modern African streetwear. Ensure models reflect diverse African beauty standards with confident, editorial poses.";
        break;
      case 'Food & Beverage (Local cuisine)':
        sectorContext = "Make the food look incredibly appetizing with rich, warm colors. Highlight the textures of local dishes (e.g., Jollof, Suya, Fufu). Use natural, inviting lighting and authentic local serving ware.";
        break;
      case 'Event Promotion (Weddings, Owambes, Church events)':
        sectorContext = "Capture the joy, opulence, and communal spirit of African celebrations. Use rich golds, vibrant colors, elegant typography, and imagery that conveys a sense of grand occasion and cultural pride.";
        break;
      case 'Tech Startup Pitch Decks':
        sectorContext = "Project innovation, reliability, and pan-African scale. Use clean, modern, minimalist aesthetics with subtle African motifs. Focus on UI/UX mockups in real-world African contexts.";
        break;
      case 'Educational & NGO Content':
        sectorContext = "Convey hope, empowerment, and community impact. Use bright, natural lighting, authentic and respectful portrayals of local people, and clear, accessible visual storytelling.";
        break;
      default:
        sectorContext = "Ensure the visual is highly relevant to the African market, using culturally appropriate models, settings, and aesthetics.";
    }

    let visualStyleInstruction = options.visualStyle !== 'None' ? options.visualStyle : 'High-quality commercial photography';
    
    if (options.visualStyle === '3D Render') {
        const engine = options.renderEngine && options.renderEngine !== 'auto' ? options.renderEngine : 'Octane Render, Unreal Engine 5, or Cinema4D';
        visualStyleInstruction = `STUNNING 3D RENDER. Think like a senior world-class Adobe Suite Graphic Designer. Use ${engine} aesthetics. Incorporate volumetric lighting, subsurface scattering, glossy reflections, soft ambient occlusion, and a hyper-detailed, tactile 3D look. The composition must pop with depth and dimension.`;
    } else if (options.visualStyle === 'Cinematic') {
        visualStyleInstruction = 'CINEMATIC MASTERPIECE. Shot on ARRI Alexa 65. Dramatic lighting, shallow depth of field, anamorphic lens flares, and a rich, moody color grade. Think like a senior art director.';
    } else if (options.visualStyle === 'Flat Design') {
        visualStyleInstruction = 'MODERN FLAT VECTOR DESIGN. Clean, bold, minimalist vector art style. Use vibrant, contrasting colors, sharp geometric shapes, and smooth gradients. Think high-end tech startup illustration or premium editorial art.';
    } else if (options.visualStyle === 'Afro-futurist') {
        visualStyleInstruction = 'AFRO-FUTURISM. A stunning blend of advanced sci-fi technology and rich African cultural aesthetics. Neon tribal patterns, sleek cybernetic elements, vibrant traditional colors mixed with glowing holograms.';
    } else if (options.visualStyle === 'Luxury') {
        visualStyleInstruction = 'ULTRA-LUXURY AESTHETIC. Opulent, refined, and exclusive. Use deep, rich tones (gold, emerald, onyx), dramatic chiaroscuro lighting, and a minimalist composition that screams high net worth.';
    }

    let adStructureInstruction = "";
    if (options.adStructure && options.adStructure !== 'auto') {
        switch (options.adStructure) {
            case 'Thumb-Stopping Hook + Bold Text':
                adStructureInstruction = "**Ad Structure:** Thumb-Stopping Hook + Bold Overlay Text. One dominant focal point (product or person) taking 30-40% of the frame. High contrast, large sans-serif headline. Designed mobile-first.";
                break;
            case 'Before-After / Problem-Solution':
                adStructureInstruction = "**Ad Structure:** Before-After / Problem-Solution Split. Side-by-side or sequential transformation. Left = pain/problem, right = product fix. Often with crossed-out problems or simple arrows.";
                break;
            case 'Social Proof / UGC Style':
                adStructureInstruction = "**Ad Structure:** Social Proof / Testimonial Layout (UGC Style). Real customer photo + quote + stars. Authentic, lo-fi phone footage or casual shots rather than polished studio.";
                break;
            case 'Product Demo / Behind-the-Scenes':
                adStructureInstruction = "**Ad Structure:** Product Demonstration / Behind-the-Scenes. Quick in-use demo, unboxing, or 'how it's made'. Extreme close-ups and raw authenticity.";
                break;
            case 'Data-Driven / Chart Comparison':
                adStructureInstruction = "**Ad Structure:** Data-Driven / Myth-vs-Fact or Chart Comparison. Simple bar chart, 'X reasons why', or myth-busting layout. Clean, minimal design with bold numbers.";
                break;
        }
    } else {
        adStructureInstruction = "**Ad Structure:** Thumb-Stopping Hook + Bold Overlay Text (Default High-Converting). One dominant focal point taking 30-40% of the frame. High contrast.";
    }

    const ultraModernRules = `**Ultra-Modern Design Rules (2025-2026 Trends):**
- High contrast + ample white space
- Vibrant accent colors on neutral backgrounds
- Hyper-realistic or subtly AI-enhanced photography
- Large, bold typography with strong hierarchy
- Vertical format optimized for mobile`;

    const freeTextInstruction = options.freeTextPrompt ? `\n**USER'S DIRECT CREATIVE VISION (PRIORITY):** "${options.freeTextPrompt}"\n*As a senior world-class Adobe Suite Graphic Designer, use this vision as your primary inspiration. If reference images are provided, reproduce their style and layout exactly, but elevate them based on this vision.*` : '';

    const basePrompt = `**AWARD-WINNING VISUAL ADVERTISEMENT. EXTREME PHOTOREALISM. 8K ULTRA-HD.**
**Persona:** You are a senior, world-class Adobe Suite Graphic Designer and Art Director. Your goal is to create a visually stunning, highly converting advertisement.
${freeTextInstruction}
${adStructureInstruction}
${ultraModernRules}
**Sector Context:** ${sectorContext}
**Product:** ${options.product}
**Target Audience:** ${options.targetAudience}
**Core Value Proposition:** ${options.valueProposition}
**Hook:** "${options.hook}"
**Call-to-Action:** "${options.cta}"
**Brand Identity:** ${options.brandIdentity}
**Platform:** ${options.platform}
**Visual Style:** ${visualStyleInstruction}
**Scenario:** ${options.scenario || 'A compelling product showcase'}
**Emotional Trigger:** ${options.emotionalTrigger !== 'None' ? options.emotionalTrigger : 'Desire'}
**Social Proof:** ${options.socialProof || 'None'}
**Offer:** ${options.offer || 'None'}
**Competitor Positioning:** ${options.competitorPositioning || 'None'}

**AI Directives:**
- **Camera Style:** ${options.cameraStyle !== 'auto' ? options.cameraStyle : 'Cinematic commercial framing'}
- **Lighting:** ${options.lighting !== 'auto' ? options.lighting : 'Professional studio or natural lighting appropriate for the scenario'}
- **Mood:** ${options.mood !== 'auto' ? options.mood : 'Engaging and persuasive'}
- **Aspect Ratio:** ${options.aspectRatio}
- **3D Render Engine:** ${options.renderEngine && options.renderEngine !== 'auto' ? options.renderEngine : 'N/A'}
- **Composition Style:** ${options.composition && options.composition !== 'auto' ? options.composition : 'N/A'}

**Core Instructions:**
1.  **Ad Composition:** Create a visually striking image that embodies the provided inputs. The image should look like a high-end advertisement ready for the specified platform.
2.  **Cultural Relevance:** The image MUST be deeply rooted in African aesthetics, featuring authentic local contexts, models, and environments as specified in the Sector Context.
3.  **Text Integration:** DO NOT include the actual text (hook, CTA, offer) in the image itself unless it naturally belongs on the product packaging. The image should be the *visual* component of the ad, leaving room for text overlays in post-production.
4.  **Scenario Execution:** Depict the scenario vividly, focusing on the emotional trigger and the core value proposition.
5.  **Brand Alignment:** Ensure the visual style, colors, and overall tone align with the described brand identity.
${productAssetInstruction}
6.  **Quality:** Flawless execution, perfect lighting, sharp focus, and compelling composition. ${options.visualStyle === '3D Render' ? 'Ensure the 3D elements look incredibly premium, with perfect materials (glass, metal, matte plastic) and cinematic lighting.' : ''}
${options.composition && options.composition !== 'auto' ? `7.  **Composition:** Strictly adhere to the ${options.composition} composition style.` : ''}`;

    onProgress("Enriching prompt with Agentic AI...");
    
    // Step 1: Enrich the prompt
    let enrichedPrompt = basePrompt;
    try {
        const enrichResponse = await ai.models.generateContent({
            model: 'gemini-3.1-pro-preview',
            contents: `You are an expert African Creative Director. Your task is to take the following base prompt for an image generation model and enrich it with highly specific, culturally resonant details. Focus on authentic African textures, lighting, fashion, and environmental storytelling. Return ONLY the enriched prompt, ready to be fed directly into an image generator. Do not include any conversational text.

Base Prompt:
${basePrompt}`,
        });
        enrichedPrompt = enrichResponse.text || basePrompt;
    } catch (enrichError) {
        console.warn("Enrichment with Pro failed, trying Flash:", enrichError);
        try {
            const enrichResponse = await ai.models.generateContent({
                model: 'gemini-3.5-flash',
                contents: `You are an expert African Creative Director. Your task is to take the following base prompt for an image generation model and enrich it with highly specific, culturally resonant details. Focus on authentic African textures, lighting, fashion, and environmental storytelling. Return ONLY the enriched prompt, ready to be fed directly into an image generator. Do not include any conversational text.

Base Prompt:
${basePrompt}`,
            });
            enrichedPrompt = enrichResponse.text || basePrompt;
        } catch (flashError) {
            console.error("Enrichment failed completely:", flashError);
        }
    }

    onProgress("Generating ad creative...");
    
    const requestContents: any = {
        parts: [...imageParts, { text: enrichedPrompt }]
    };

    const modelsToTry = ['gemini-3.1-flash-image', 'gemini-3-pro-image', 'gemini-2.5-flash-image'];
    let lastError: any;
    let response: any;

    for (const model of modelsToTry) {
        try {
            const config: any = {
                imageConfig: {
                    aspectRatio: mapAspectRatioForApi(options.aspectRatio)
                }
            };
            if (model !== 'gemini-2.5-flash-image') {
                config.imageConfig.imageSize = "4K";
            }
            
            response = await ai.models.generateContent({
                model: model,
                contents: requestContents,
                ...(Object.keys(config).length > 0 ? { config } : {})
            });
            break; // Success, exit loop
        } catch (err: any) {
            console.warn(`Model ${model} failed in generateCreativeAd:`, err);
            lastError = err;
            if (isFatalError(err)) {
                throw err;
            }
        }
    }

    if (!response) {
        throw lastError || new Error("All image generation models failed.");
    }

    onProgress("Generating marketing copy...");
    
    // Step 3: Generate marketing copy
    const copyResponse = await ai.models.generateContent({
        model: 'gemini-3.1-pro-preview',
        contents: `You are an expert African Copywriter. Write a compelling, culturally resonant marketing copy for the following product and campaign. The copy should be tailored for ${options.platform} and target ${options.targetAudience}.

Product: ${options.product}
Value Proposition: ${options.valueProposition}
Hook: ${options.hook}
CTA: ${options.cta}
Sector: ${options.sector}

Write a short, engaging caption (max 3 sentences) and suggest 3 relevant hashtags. Use local slang or cultural references if appropriate for the sector.`,
    });
    
    const marketingCopy = copyResponse.text || `${options.hook}\n\n${options.valueProposition}\n\n${options.cta}`;

    const assets: Asset[] = [];
    for (const part of response.candidates?.[0]?.content?.parts || []) {
        if (part.inlineData) {
            const base64EncodeString: string = part.inlineData.data;
            const mimeType = part.inlineData.mimeType || 'image/png';
            const imageUrl = `data:${mimeType};base64,${base64EncodeString}`;
            assets.push({
                id: Math.random().toString(36).substring(7),
                type: 'image',
                url: imageUrl,
                base64: base64EncodeString,
                metadata: {
                    prompt: enrichedPrompt,
                    pose: options.scenario,
                    garmentLabels: [],
                    garmentDescription: options.product,
                    environment: options.platform as any,
                    aspectRatio: options.aspectRatio,
                    marketingCopy: marketingCopy
                }
            });
        }
    }

    if (assets.length === 0) {
        throw new Error("No image was generated. Please try again.");
    }

    return assets;
  }, apiKey, 180000); // 3 minutes timeout for creative ad generation
};

export const editCreativeAd = async (
  asset: Asset,
  editPrompt: string,
  onProgress: (message: string) => void,
  apiKey?: string
): Promise<Asset> => {
  return executeWithRetry(async (ai) => {
    onProgress("Analyzing edit request...");
    
    // Step 1: Enrich the edit prompt
    let newPrompt = `${asset.metadata.prompt}, ${editPrompt}`;
    try {
        const enrichResponse = await ai.models.generateContent({
            model: 'gemini-3.1-pro-preview',
            contents: `You are an expert African Creative Director. A user wants to edit an existing ad creative. 
Original Prompt: ${asset.metadata.prompt}
User Request: ${editPrompt}

Your task is to generate a new, comprehensive image generation prompt that incorporates the user's requested changes while maintaining the core essence and African cultural relevance of the original prompt. Return ONLY the new prompt.`,
        });
        newPrompt = enrichResponse.text || newPrompt;
    } catch (enrichError) {
        console.warn("Edit enrichment with Pro failed, trying Flash:", enrichError);
        try {
            const enrichResponse = await ai.models.generateContent({
                model: 'gemini-3.5-flash',
                contents: `You are an expert African Creative Director. A user wants to edit an existing ad creative. 
Original Prompt: ${asset.metadata.prompt}
User Request: ${editPrompt}

Your task is to generate a new, comprehensive image generation prompt that incorporates the user's requested changes while maintaining the core essence and African cultural relevance of the original prompt. Return ONLY the new prompt.`,
            });
            newPrompt = enrichResponse.text || newPrompt;
        } catch (flashError) {
            console.error("Edit enrichment failed completely:", flashError);
        }
    }

    onProgress("Generating updated creative...");
    
    const requestContents: any = {
        parts: [
            { inlineData: { data: asset.base64!, mimeType: 'image/png' } },
            { text: newPrompt }
        ]
    };

    const modelsToTry = ['gemini-3.1-flash-image', 'gemini-3-pro-image', 'gemini-2.5-flash-image'];
    let lastError;
    let response;

    for (const model of modelsToTry) {
        try {
            const config: any = {};
            if (asset.metadata.aspectRatio) {
                config.imageConfig = {
                    aspectRatio: mapAspectRatioForApi(asset.metadata.aspectRatio)
                };
            }
            if (model !== 'gemini-2.5-flash-image') {
                if (!config.imageConfig) config.imageConfig = {};
                config.imageConfig.imageSize = "4K";
            }
            response = await ai.models.generateContent({
                model: model,
                contents: requestContents,
                ...(Object.keys(config).length > 0 ? { config } : {})
            });
            if (response.candidates?.[0]?.content?.parts.some(p => p.inlineData)) {
                break; // Success
            }
        } catch (err) {
            console.warn(`Edit generation with ${model} failed:`, err);
            lastError = err;
        }
    }

    if (!response || !response.candidates?.[0]?.content?.parts.some(p => p.inlineData)) {
        throw lastError || new Error("Failed to generate updated creative.");
    }

    onProgress("Updating marketing copy...");
    
    // Step 3: Update marketing copy
    let newMarketingCopy = asset.metadata.marketingCopy;
    try {
        const copyResponse = await ai.models.generateContent({
            model: 'gemini-3.1-pro-preview',
            contents: `You are an expert African Copywriter. A user has updated their ad creative.
Original Copy: ${asset.metadata.marketingCopy || 'None'}
User Edit Request: ${editPrompt}

Update the marketing copy to reflect the new visual direction if necessary. Keep it short, engaging, and culturally resonant. Return ONLY the updated copy.`,
        });
        newMarketingCopy = copyResponse.text || newMarketingCopy;
    } catch (copyError) {
        console.warn("Copy update with Pro failed, trying Flash:", copyError);
        try {
            const copyResponse = await ai.models.generateContent({
                model: 'gemini-3.5-flash',
                contents: `You are an expert African Copywriter. A user has updated their ad creative.
Original Copy: ${asset.metadata.marketingCopy || 'None'}
User Edit Request: ${editPrompt}

Update the marketing copy to reflect the new visual direction if necessary. Keep it short, engaging, and culturally resonant. Return ONLY the updated copy.`,
            });
            newMarketingCopy = copyResponse.text || newMarketingCopy;
        } catch (flashError) {
            console.error("Copy update failed completely:", flashError);
        }
    }

    for (const part of response.candidates?.[0]?.content?.parts || []) {
        if (part.inlineData) {
            const base64EncodeString: string = part.inlineData.data;
            const mimeType = part.inlineData.mimeType || 'image/png';
            const imageUrl = `data:${mimeType};base64,${base64EncodeString}`;
            return {
                id: Math.random().toString(36).substring(7),
                type: 'image',
                url: imageUrl,
                base64: base64EncodeString,
                metadata: {
                    ...asset.metadata,
                    prompt: newPrompt,
                    marketingCopy: newMarketingCopy
                }
            };
        }
    }

    throw new Error("Failed to edit image.");
  }, apiKey, 180000); // 3 minutes timeout for editing creative ad
};

// Map our aspect ratios to gpt-image-2's supported sizes.
function mapAspectToOpenAISize(ar?: string): '1024x1024' | '1024x1536' | '1536x1024' {
  switch (ar) {
    case '9:16': case '4:5': case '3:4': return '1024x1536';
    case '16:9': case '5:4': case '4:3': return '1536x1024';
    default: return '1024x1024';
  }
}

// Generate one image via OpenAI gpt-image-2 (ChatGPT Images 2.0) using the same
// rich prompt + reference images the Gemini path builds. Server-side only.
async function generateFashionImageOpenAI(
  aspectRatio: string,
  prompt: string,
  imageParts: any[],
): Promise<string> {
  const { default: OpenAI, toFile } = await import('openai');
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const model = process.env.OPENAI_IMAGE_MODEL || 'gpt-image-2';
  const refs = await Promise.all(
    imageParts
      .filter((p: any) => p?.inlineData?.data)
      .slice(0, 4) // gpt-image-2 reference-image cap
      .map((p: any, i: number) =>
        toFile(Buffer.from(p.inlineData.data, 'base64'), `ref${i}.png`, {
          type: p.inlineData.mimeType || 'image/png',
        }),
      ),
  );
  const res = await client.images.edit({
    model,
    image: refs as any,
    prompt,
    size: mapAspectToOpenAISize(aspectRatio),
    response_format: 'b64_json',
  } as any);
  const b64 = res.data?.[0]?.b64_json;
  if (!b64) throw new Error('OPENAI_NO_IMAGE');
  return b64;
}

export const generateFashionShoot = async (
  options: GenerationOptions,
  onProgress: (message: string) => void,
  apiKey?: string,
  feature?: string,
  provider: 'GEMINI' | 'OPENAI' = 'GEMINI'
): Promise<Asset[]> => {
  if (typeof window !== 'undefined') {
      return await proxyCallToBackend('generateFashionShoot', [options, apiKey], onProgress, feature);
  }

  if (!options.model.image) {
    throw new Error("A model image is required for generation.");
  }

  // const ai = getClient(apiKey); // Removed, we use executeWithRetry now
  
  onProgress("Adapting garment for the selected model...");
  // Pass apiKey directly, not ai client
  let adaptedGarmentDescription = options.garment.description;
  try {
      adaptedGarmentDescription = await adaptGarmentForModel(options.model.image, options.garment.description, apiKey);
  } catch (e) {
      console.warn("Garment adaptation failed, using original description.", e);
  }

  const finalOptions = {
    ...options,
    garment: {
        ...options.garment,
        description: adaptedGarmentDescription,
    }
  };

  onProgress(`Generating ${finalOptions.variants} still image(s)...`);
  const results: (Asset | { error: any })[] = [];
  
  for (let index = 0; index < finalOptions.variants; index++) {
        onProgress(`Generating variant ${index + 1} of ${finalOptions.variants}...`);
        console.log(`Starting generation for variant ${index + 1}`);
        const poseDescription = getRandomPoseVariation(finalOptions.pose);
        const basePrompt = buildPrompt(finalOptions, poseDescription);
        
        const imageParts: any = [
            { inlineData: { data: finalOptions.model.image.base64, mimeType: finalOptions.model.image.mimeType } }
        ];
        if (finalOptions.model.fullBodyImage) {
            imageParts.push({ inlineData: { data: finalOptions.model.fullBodyImage.base64, mimeType: finalOptions.model.fullBodyImage.mimeType } });
        }
        if (finalOptions.garment.image) {
            imageParts.push({ inlineData: { data: finalOptions.garment.image.base64, mimeType: finalOptions.garment.image.mimeType } });
        }
        if (finalOptions.companion.enabled && finalOptions.companion.image) {
             imageParts.push({ inlineData: { data: finalOptions.companion.image.base64, mimeType: finalOptions.companion.image.mimeType } });
        }
        if (finalOptions.environment === 'On stage as Keynote speaker' && finalOptions.conferenceKakimonoLogo) {
             imageParts.push({ inlineData: { data: finalOptions.conferenceKakimonoLogo.base64, mimeType: finalOptions.conferenceKakimonoLogo.mimeType } });
        }

        // Stored multi-angle face references (server-injected) — appended last so
        // they never push out the essential model/garment refs on capped providers.
        if (finalOptions.model.faceRefs?.length) {
            for (const fr of finalOptions.model.faceRefs) {
                imageParts.push({ inlineData: { data: fr.base64, mimeType: fr.mimeType } });
            }
        }

        const faceRefInstruction = finalOptions.model.faceRefs?.length
            ? `\n**ADDITIONAL FACE REFERENCES (CRITICAL FOR LIKENESS):** ${finalOptions.model.faceRefs.length} extra close-up image(s) of the SAME person's face from other angles are provided at the end. Use them together with the first image to reconstruct the EXACT facial morphology with full 3D consistency — bone structure, eye shape/spacing, nose, mouth, jawline and proportions. The rendered face MUST precisely match this specific person from the required angle.`
            : '';

        let extraNegative = '';
        if (finalOptions.companion.enabled) {
             extraNegative = ', clones, identical twins, doppelganger, same face, split screen';
        }
        if (finalOptions.environment === 'On stage as Keynote speaker' || finalOptions.pose === 'Keynote Presentation') {
             if (finalOptions.cameraAxis !== 'Back') {
                 extraNegative += ', people in background, audience behind speaker, crowd on stage behind speaker, faces in background, extra people behind speaker';
             }
        }

        const textPrompt = `${basePrompt}${faceRefInstruction}\n**Negative prompt:** ${getNegativePrompt(finalOptions)}${finalOptions.tattoos !== 'none' ? ', ugly tattoos' : ''}${extraNegative}`;
        const textPart = { text: textPrompt };
        
        const parts = [...imageParts, textPart];

        // OpenAI gpt-image-2 path (admin-selected). Same prompt + reference images.
        if (provider === 'OPENAI') {
            try {
                onProgress(`Rendering variant ${index + 1} with ChatGPT Image 2...`);
                const b64 = await generateFashionImageOpenAI(finalOptions.aspectRatio, textPrompt, imageParts);
                results.push({
                    id: `img-${Date.now()}-${index}`,
                    type: 'image' as const,
                    url: `data:image/png;base64,${b64}`,
                    base64: b64,
                    metadata: {
                        prompt: textPrompt,
                        pose: poseDescription,
                        garmentLabels: [],
                        garmentDescription: finalOptions.garment.description,
                        companionDescription: finalOptions.companion.enabled ? finalOptions.companion.description : undefined,
                        environment: finalOptions.environment,
                        aspectRatio: finalOptions.aspectRatio,
                    },
                });
            } catch (err) {
                console.error(`OpenAI variant ${index + 1} failed`, err);
                results.push({ error: err });
            }
            continue; // skip the Gemini model loop for this variant
        }

        // Retry logic with fallback
        const modelsToTry = ['gemini-3.1-flash-image', 'gemini-3-pro-image', 'gemini-2.5-flash-image'];
        let lastError: any;
        let success = false;

        for (const modelName of modelsToTry) {
            for (let attempt = 0; attempt < 1; attempt++) { // 1 attempt per model
                console.log(`Variant ${index + 1}: Trying model ${modelName}, attempt ${attempt + 1}`);
                try {
                    // Use executeWithRetry for key rotation
                    const response = await executeWithRetry(async (ai) => {
                        const config: any = {
                            imageConfig: {
                                aspectRatio: mapAspectRatioForApi(finalOptions.aspectRatio)
                            }
                        };
                        if (modelName !== 'gemini-2.5-flash-image') {
                            config.imageConfig.imageSize = '4K';
                        }
                        
                        return await ai.models.generateContent({
                            model: modelName,
                            contents: { parts },
                            ...(Object.keys(config).length > 0 ? { config } : {})
                        });
                    }, apiKey, 300000); // 300 seconds timeout for image generation

                    const imagePart = response.candidates?.[0]?.content?.parts.find(p => p.inlineData);
                    if (!imagePart || !imagePart.inlineData) throw new Error(`Image variant ${index + 1} could not be generated.`);
                    const base64Image = imagePart.inlineData.data;
                    
                    results.push({
                        id: `img-${Date.now()}-${index}`,
                        type: 'image' as const,
                        url: `data:image/png;base64,${base64Image}`,
                        base64: base64Image,
                        metadata: {
                            prompt: textPrompt,
                            pose: poseDescription,
                            garmentLabels: [],
                            garmentDescription: finalOptions.garment.description,
                            companionDescription: finalOptions.companion.enabled ? finalOptions.companion.description : undefined,
                            environment: finalOptions.environment,
                            aspectRatio: finalOptions.aspectRatio,
                        },
                    });
                    success = true;
                    break; // Break attempt loop
                } catch (err: any) {
                    console.warn(`Attempt ${attempt + 1} with ${modelName} failed for variant ${index + 1}:`, err);
                    
                    if (isFatalError(err)) {
                        throw err;
                    }

                    lastError = err;
                    
                    const msg = (err.message || err.error || (typeof err === 'string' ? err : JSON.stringify(err))).toLowerCase();
                    const isQuota = msg.includes('429') || msg.includes('quota') || msg.includes('resource_exhausted');

                    if (isQuota) {
                        console.warn(`Quota exhausted trying ${modelName}. Waiting 10s before next attempt/model...`);
                        await new Promise(resolve => setTimeout(resolve, 10000));
                        // If we hit a hard quota, switching models might still use the same minute quota for the project.
                        // We will let it try the next model, but with a significant delay.
                    } else if (err.message?.includes('timed out')) {
                        console.warn(`Timeout on ${modelName}, attempt ${attempt + 1}`);
                        if (attempt === 2) break; // Move to next model if all attempts timeout
                    } else {
                        // Wait a bit before retrying, exponential backoff
                        await new Promise(resolve => setTimeout(resolve, 2000 * Math.pow(2, attempt)));
                    }
                }
            }
            if (success) break; // Break models loop if success
        }
        
        if (!success) {
             console.error(`All attempts failed for variant ${index + 1}`, lastError);
             results.push({ error: lastError }); // Return error instead of throwing to allow partial success
        } else if (index < finalOptions.variants - 1) {
            // Wait 5 seconds between variants to avoid rate limits
            onProgress(`Waiting before next variant...`);
            await new Promise(resolve => setTimeout(resolve, 5000));
        }
  }

  const successfulImages = results.filter((img): img is Asset => img !== null && !('error' in img)) as Asset[];
  const errors = results.filter((img) => img !== null && 'error' in img).map((e: any) => e.error);

    if (successfulImages.length === 0) {
        throw errors[0] || new Error(`Failed to generate any images.`);
    }
    
    onProgress("All tasks complete!");
    return successfulImages;
  };

// New function for text-based editing of generated images
export const editGeneratedImage = async (
    originalAsset: Asset,
    editPrompt: string,
    apiKey?: string
): Promise<Asset> => {
    if (typeof window !== 'undefined') {
        return await proxyCallToBackend('editGeneratedImage', [originalAsset, editPrompt, apiKey]);
    }

    if (!originalAsset.base64) {
        throw new Error("Asset missing image data");
    }
    
    return executeWithRetry(async (ai) => {
        const prompt = `**PHOTO EDITING INSTRUCTION (8K EXTREME PHOTOREALISM)**
        Edit the provided image based on this instruction: "${editPrompt}".
        **CRITICAL - IDENTITY LOCK:** The face and identity of the person MUST NOT change. 
        -   Do not alter facial features, skin tone, or expression unless explicitly asked.
        -   The face must remain pixel-perfect consistent with the original image.
        **Anatomy & Realism:** Ensure flawless anatomy, perfect proportions, and hyperrealistic textures.
        **Super Resolution & Professional Retouching (CRITICAL):** The resulting image must have absolute maximum edge sharpness, Super-Resolution clarity, and clean professional retouching. There must be zero jagged edges, zero blurring, and zero pixelation when zoomed in. Preserve the 8K depth.
        **Negative Prompt:** ${getNegativePrompt()}`;

        const modelsToTry = ['gemini-3.1-flash-image', 'gemini-3-pro-image', 'gemini-2.5-flash-image'];
        let lastError;
        
        for (const model of modelsToTry) {
            try {
                const config: any = {};
                if (originalAsset.metadata.aspectRatio) {
                    config.imageConfig = {
                        aspectRatio: mapAspectRatioForApi(originalAsset.metadata.aspectRatio)
                    };
                }
                if (model !== 'gemini-2.5-flash-image') {
                    if (!config.imageConfig) config.imageConfig = {};
                    config.imageConfig.imageSize = "4K";
                }
                const response = await ai.models.generateContent({
                    model: model,
                    contents: {
                        parts: [
                            {
                                inlineData: {
                                    data: originalAsset.base64!,
                                    mimeType: 'image/png'
                                }
                            },
                            { text: prompt }
                        ]
                    },
                    ...(Object.keys(config).length > 0 ? { config } : {})
                });

                const imagePart = response.candidates?.[0]?.content?.parts.find(p => p.inlineData);
                
                if (!imagePart || !imagePart.inlineData) {
                    throw new Error("Failed to edit image.");
                }
                
                const base64Image = imagePart.inlineData.data;
                
                return {
                    id: `edit-${Date.now()}`,
                    type: 'image',
                    url: `data:image/png;base64,${base64Image}`,
                    base64: base64Image,
                    metadata: {
                        ...originalAsset.metadata,
                        prompt: `Edited: ${editPrompt} | Original: ${originalAsset.metadata.prompt}`
                    }
                };
            } catch (err) {
                console.warn(`Edit with ${model} failed:`, err);
                lastError = err;
            }
        }
        throw lastError || new Error("Failed to edit image with all models.");
    }, apiKey, 300000); // 5 minutes timeout for editing image
};

export const animateImage = async (
    imageAsset: Asset,
    animationOptions: AnimationOptions,
    onProgress: (message: string) => void,
    apiKey?: string
): Promise<Asset> => {
    if (typeof window !== 'undefined') {
        return await proxyCallToBackend('animateImage', [imageAsset, animationOptions, apiKey], onProgress);
    }

    if (!imageAsset.base64) {
        throw new Error("Image asset is missing base64 data for animation.");
    }

    onProgress(`Animating variant... This can take several minutes.`);
    
    const animationPrompt = buildAnimationPrompt(
        imageAsset.metadata.garmentDescription,
        imageAsset.metadata.environment,
        animationOptions
    );

    let targetAspectRatio: '9:16' | '16:9' = '16:9';
    if (imageAsset.metadata.aspectRatio === '1:1' || imageAsset.metadata.aspectRatio === '9:16') {
        targetAspectRatio = '9:16';
    }

    return await executeWithRetry(async (ai, successfulKey) => {
        let operation = await ai.models.generateVideos({
            model: 'veo-3.1-lite-generate-preview',
            prompt: animationPrompt,
            image: {
                imageBytes: imageAsset.base64!,
                mimeType: 'image/png',
            },
            config: {
                numberOfVideos: 1,
                resolution: '1080p',
                aspectRatio: targetAspectRatio,
            }
        });

        let pollCount = 0;
        const maxPolls = 30; // 5 minutes max
        while (!operation.done && pollCount < maxPolls) {
            await new Promise(resolve => setTimeout(resolve, 10000));
            operation = await ai.operations.getVideosOperation({operation: operation});
            pollCount++;
            onProgress(`Checking animation status... (${pollCount * 10}s)`);
        }

        if (!operation.done) {
          throw new Error(`Video generation timed out.`);
        }

        if ((operation as any).error) {
            throw new Error(`Video generation API returned an error.`);
        }
        
        const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;
        if (!downloadLink) {
            throw new Error(`Could not retrieve video URL.`);
        }
        
        onProgress(`Fetching video...`);
        
        const videoResponse = await fetch(downloadLink, {
            method: 'GET',
            headers: {
                'x-goog-api-key': successfulKey,
            },
        });
        const videoBlob = await videoResponse.blob();
        const videoUrl = URL.createObjectURL(videoBlob);

        onProgress('Animation complete!');

        return {
            ...imageAsset,
            type: 'video' as const,
            url: videoUrl,
            base64: undefined,
            isAnimating: false,
            animationOptions: animationOptions,
            originalImage: {
                url: imageAsset.url,
                base64: imageAsset.base64,
            },
        };
    }, apiKey, 360000); // 6 minutes timeout for video generation
};

export const verifyPaymentScreenshot = async (imageBase64: string, apiKey?: string): Promise<{ valid: boolean; amount?: number }> => {
    if (typeof window !== 'undefined') {
        return await proxyCallToBackend('verifyPaymentScreenshot', [imageBase64, apiKey]);
    }

    return executeWithRetry(async (ai) => {
        const prompt = "Analyze this payment confirmation screenshot. Extract the transaction status. Return JSON: { \"status\": \"SUCCESS\" | \"FAILED\", \"amount\": number }.";

        try {
            const response = await ai.models.generateContent({
                model: 'gemini-3.5-flash',
                contents: {
                    parts: [
                        { inlineData: { data: imageBase64, mimeType: 'image/jpeg' } },
                        { text: prompt }
                    ]
                },
                config: {
                    responseMimeType: 'application/json'
                }
            });

            const resultText = response.text;
            if (!resultText) return { valid: false };

            const json = JSON.parse(resultText);
            
            if (json.status === 'SUCCESS') {
                 return { valid: true, amount: json.amount };
            }
            
            return { valid: false };

        } catch (error) {
            console.warn("Screenshot verification with Flash failed, trying Flash Lite:", error);
            try {
                const response = await ai.models.generateContent({
                    model: 'gemini-3.1-flash-lite',
                    contents: {
                        parts: [
                            { inlineData: { data: imageBase64, mimeType: 'image/jpeg' } },
                            { text: prompt }
                        ]
                    },
                    config: {
                        responseMimeType: 'application/json'
                    }
                });

                const resultText = response.text;
                if (!resultText) return { valid: false };

                const json = JSON.parse(resultText);
                
                if (json.status === 'SUCCESS') {
                     return { valid: true, amount: json.amount };
                }
                
                return { valid: false };
            } catch (liteError) {
                throw error; // Let executeWithRetry handle the original error
            }
        }
    }, apiKey, 30000); // 30 seconds timeout for payment verification
};

export const generateShopInfo = async (garmentDescription: string, garmentLabels: string[], apiKey?: string): Promise<ShopInfo> => {
    if (typeof window !== 'undefined') {
        return await proxyCallToBackend('generateShopInfo', [garmentDescription, garmentLabels, apiKey]);
    }

    return executeWithRetry(async (ai) => {
        const prompt = `You are an expert marketing copywriter for a6ko.com, a premier online platform for authentic "sur mesure africain" (custom-tailored African fashion) ordering and selling.
Based on the following garment description and labels, generate professional, realistic publishing details to help the designer list their item live.

Garment Description: ${garmentDescription}
Garment Labels: ${garmentLabels?.join(', ') || 'N/A'}

Your output MUST be a valid JSON object in the following format:
{
  "title": "A short, highly catchy, and engaging product title tailored for custom African fashion. E.g. 'Robe Sirène en Pagne Wax - Modèle Ayaba'",
  "description": "A structured, inspiring, and concise product description emphasizing custom tailoring (sur mesure), high-quality fabric, tailored details, and how to order. (Include realistic details about measurements, typical delivery time for custom African wear (e.g., 7-14 days), and care instructions). Short and engaging.",
  "tags": ["3 to 5 realistic search tags or keywords, e.g. 'wax', 'sur mesure', 'robe africaine'"],
  "priceEst": "A realistic premium price estimate for this custom-tailored piece in FCFA or € indicating that it's high quality sur mesure (e.g., '45.000 FCFA - 65.000 FCFA (68€ - 99€)')"
}

Provide ONLY the valid JSON object. No other text or explanation.`;

        try {
            const response = await ai.models.generateContent({
                model: 'gemini-3.5-flash',
                contents: prompt,
                config: {
                    responseMimeType: 'application/json',
                }
            });
            
            const text = response.text?.trim() || '{}';
            try {
                const parsed = JSON.parse(text);
                return {
                    title: parsed.title || "Tenue Africaine sur Mesure",
                    description: parsed.description || "Une création artisanale sur mesure.",
                    tags: Array.isArray(parsed.tags) ? parsed.tags : ["sur mesure", "african fashion", "pagne"],
                    priceEst: parsed.priceEst || "35.000 FCFA"
                };
            } catch (err) {
                console.error("JSON parsing of generated shop info failed:", err);
                throw new Error("Invalid output format from model.");
            }
        } catch (error: any) {
            console.warn("Shop info generation failed with Flash, trying Flash Lite:", error);
            try {
                const response = await ai.models.generateContent({
                    model: 'gemini-3.1-flash-lite',
                    contents: prompt,
                    config: {
                        responseMimeType: 'application/json',
                    }
                });
                const text = response.text?.trim() || '{}';
                const parsed = JSON.parse(text);
                return {
                    title: parsed.title || "Tenue Africaine sur Mesure",
                    description: parsed.description || "Une création artisanale sur mesure.",
                    tags: Array.isArray(parsed.tags) ? parsed.tags : ["sur mesure", "african fashion", "pagne"],
                    priceEst: parsed.priceEst || "35.000 FCFA"
                };
            } catch (liteError) {
                throw error;
            }
        }
    }, apiKey, 60000);
};