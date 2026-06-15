import { prisma } from "./db";

// Which image model powers a given feature. Admin-controlled via the dashboard.
export type ModelProvider = "GEMINI" | "OPENAI";

export const SWITCHABLE_FEATURES = ["PHOTOSHOOT", "ESSAYAGE", "CREATIVES"] as const;
export type SwitchableFeature = (typeof SWITCHABLE_FEATURES)[number];

const DEFAULT_PROVIDER: ModelProvider = "GEMINI";

// Tiny in-process cache so we don't hit the DB on every generation.
let cache: { at: number; map: Record<string, string> } | null = null;
const TTL_MS = 30_000;

async function loadSettings(): Promise<Record<string, string>> {
  if (cache && Date.now() - cache.at < TTL_MS) return cache.map;
  const rows = await prisma.setting.findMany({ where: { key: { startsWith: "model:" } } });
  const map: Record<string, string> = {};
  for (const r of rows) map[r.key] = r.value;
  cache = { at: Date.now(), map };
  return map;
}

export function invalidateModelCache() {
  cache = null;
}

function normalize(v: string | undefined): ModelProvider | undefined {
  if (v === "GEMINI" || v === "OPENAI") return v;
  return undefined;
}

/** Resolve the active provider for a feature: per-feature override → global default → GEMINI. */
export async function getProviderForFeature(feature?: string): Promise<ModelProvider> {
  const map = await loadSettings();
  const perFeature = feature ? normalize(map[`model:${feature}`]) : undefined;
  const def = normalize(map["model:default"]);
  return perFeature ?? def ?? DEFAULT_PROVIDER;
}

/** Full config for the admin dashboard. */
export async function getModelConfig() {
  const map = await loadSettings();
  return {
    default: normalize(map["model:default"]) ?? DEFAULT_PROVIDER,
    features: Object.fromEntries(
      SWITCHABLE_FEATURES.map((f) => [f, normalize(map[`model:${f}`]) ?? null]),
    ) as Record<SwitchableFeature, ModelProvider | null>,
  };
}

/** Persist one setting and bust the cache. */
export async function setModelSetting(key: string, value: string | null) {
  if (value === null) {
    await prisma.setting.deleteMany({ where: { key } });
  } else {
    await prisma.setting.upsert({
      where: { key },
      create: { key, value },
      update: { value },
    });
  }
  invalidateModelCache();
}
