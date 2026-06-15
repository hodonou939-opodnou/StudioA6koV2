// User-state layer — rewired from Firebase/Firestore onto the new
// Better Auth + Postgres backend. Public API (identifyUser, resolveGoogleUserState,
// saveUserState, isAdminUser, getUserModels, saveUserModel) is unchanged so the
// existing components keep working without edits.
import type { ModelOptions, UserState } from '../types';
import { authClient, ensureAnonymousSession } from '@/lib/auth-client';

const USER_MODELS_KEY = 'ai_fashion_user_models';
const USER_STATE_KEY_PREFIX = 'a6ko_user_state_v3_';
const MAX_MODELS = 6;

// --- Model history (unchanged, pure localStorage) ---
export const getUserModels = (): ModelOptions[] => {
  try {
    const stored = localStorage.getItem(USER_MODELS_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
};

export const saveUserModel = (model: ModelOptions) => {
  const models = getUserModels();
  const filtered = models.filter((m) => m.name !== model.name);
  const updated = [model, ...filtered].slice(0, MAX_MODELS);
  localStorage.setItem(USER_MODELS_KEY, JSON.stringify(updated));
};

// --- Plaque ID helper (kept for display continuity) ---
export function formatPlaqueId(num: number): string {
  const padded = String(num).padStart(4, '0');
  const [d1, d2, d3, d4] = padded.split('').map(Number);
  const check = (d1 * 1 + d2 * 3 + d3 * 7 + d4 * 9) % 10;
  return `A6${padded}${check}`;
}

export const isAdminUser = (_userId: string): boolean => false; // role is server-authoritative now

// --- Local cache (best-effort; the server is the source of truth) ---
export const saveUserState = (state: UserState) => {
  try {
    localStorage.setItem(`${USER_STATE_KEY_PREFIX}${state.userId}`, JSON.stringify(state));
  } catch {
    /* quota — ignore */
  }
};

// --- Backend-backed identity ---
async function loadStateFromBackend(): Promise<UserState> {
  const { data: sessionData } = await authClient.getSession();
  const user = sessionData?.user;

  let credits = 0;
  let shortId: string | null = null;
  try {
    const res = await fetch('/api/credits');
    if (res.ok) {
      const d = await res.json();
      credits = d.credits ?? 0;
      shortId = d.shortId ?? null;
    }
  } catch {
    /* offline — fall back to 0 */
  }

  const state: UserState = {
    // Show the public A6 id (falls back to a slice only if not yet assigned).
    userId: shortId ?? user?.id?.slice(0, 8).toUpperCase() ?? 'GUEST',
    uid: user?.id,
    credits,
    role: (user as { role?: string } | undefined)?.role === 'admin' ? 'admin' : 'user',
    displayName: user?.name ?? undefined,
    photoURL: user?.image ?? undefined,
    email: user?.email ?? undefined,
  };
  saveUserState(state);
  return state;
}

// Guest/anonymous path: ensure a session (granting the 3 free credits) then load.
export const identifyUser = async (): Promise<UserState> => {
  await ensureAnonymousSession();
  return loadStateFromBackend();
};

// Authenticated (Google/Apple/FB/TikTok) path — same backend loader.
export const resolveGoogleUserState = async (): Promise<UserState> => {
  return loadStateFromBackend();
};
