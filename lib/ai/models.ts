import { Feature } from "@prisma/client";

// Pinned model IDs. Use snapshot ids in production so behavior can't shift
// under a running batch. Override per-env without touching code.
export const MODELS = {
  // OpenAI — "ChatGPT Images 2.0" product == gpt-image-2 in the API.
  OPENAI_IMAGE: process.env.OPENAI_IMAGE_MODEL ?? "gpt-image-2-2026-04-21",
  // Google Gemini image model used by the existing app.
  GEMINI_IMAGE: process.env.GEMINI_IMAGE_MODEL ?? "gemini-2.5-flash-image",
} as const;

// Credit cost per feature — mirrors the current app's pricing.
export const CREDIT_COSTS: Record<Feature, number> = {
  PHOTOSHOOT: 3,
  ESSAYAGE: 2,
  CREATIVES: 4,
  ANIMATION: 20,
  MODEL_GEN: 1,
  IMAGE_EDIT: 1,
};
