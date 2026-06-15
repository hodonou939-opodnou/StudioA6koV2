import { get, set } from 'idb-keyval';

export interface RecentImage {
  id: string;
  base64: string;
  mimeType: string;
  name?: string;
  description?: string;
  timestamp: number;
}

const RECENT_MODELS_KEY = 'a6ko_recent_models';
const RECENT_GARMENTS_KEY = 'a6ko_recent_garments';
const MAX_RECENT = 3;

export const getRecentModels = async (): Promise<RecentImage[]> => {
  try {
    const models = await get<RecentImage[]>(RECENT_MODELS_KEY);
    return models || [];
  } catch (e) {
    console.error("Failed to get recent models", e);
    return [];
  }
};

export const addRecentModel = async (image: { base64: string, mimeType: string }, name?: string) => {
  try {
    const models = await getRecentModels();
    // Check if already exists (by base64)
    const existingIndex = models.findIndex(m => m.base64 === image.base64);
    if (existingIndex >= 0) {
      // Move to front
      const [existing] = models.splice(existingIndex, 1);
      existing.timestamp = Date.now();
      models.unshift(existing);
    } else {
      models.unshift({
        id: Math.random().toString(36).substring(7),
        ...image,
        name,
        timestamp: Date.now()
      });
    }
    
    // Keep only max
    const newModels = models.slice(0, MAX_RECENT);
    await set(RECENT_MODELS_KEY, newModels);
    return newModels;
  } catch (e) {
    console.error("Failed to add recent model", e);
    return [];
  }
};

export const getRecentGarments = async (): Promise<RecentImage[]> => {
  try {
    const garments = await get<RecentImage[]>(RECENT_GARMENTS_KEY);
    return garments || [];
  } catch (e) {
    console.error("Failed to get recent garments", e);
    return [];
  }
};

export const addRecentGarment = async (image: { base64: string, mimeType: string }, description?: string, name?: string) => {
  try {
    const garments = await getRecentGarments();
    // Check if already exists
    const existingIndex = garments.findIndex(g => g.base64 === image.base64);
    if (existingIndex >= 0) {
      // Move to front
      const [existing] = garments.splice(existingIndex, 1);
      existing.timestamp = Date.now();
      if (description) existing.description = description;
      garments.unshift(existing);
    } else {
      garments.unshift({
        id: Math.random().toString(36).substring(7),
        ...image,
        description,
        name,
        timestamp: Date.now()
      });
    }
    
    // Keep only max
    const newGarments = garments.slice(0, MAX_RECENT);
    await set(RECENT_GARMENTS_KEY, newGarments);
    return newGarments;
  } catch (e) {
    console.error("Failed to add recent garment", e);
    return [];
  }
};
