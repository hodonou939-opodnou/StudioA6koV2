// Model router — single entry point for all image generation so we can mix
// providers (Gemini today, OpenAI gpt-image-1 added) and add more later.
// Every call is logged to Generation + CostEvent for analytics & learning.

import { Provider, Feature } from "@prisma/client";

export type GenerateRequest = {
  feature: Feature;
  provider: Provider;        // GEMINI | OPENAI
  prompt: string;
  params: Record<string, unknown>;
  images?: string[];         // base64 inputs (model/garment photos)
  aspectRatio?: string;
};

export type GenerateResult = {
  imageUrl: string;
  model: string;
  latencyMs: number;
  costUsd: number;
};

export interface ImageProvider {
  readonly id: Provider;
  generate(req: GenerateRequest): Promise<GenerateResult>;
}

import { geminiProvider } from "./providers/gemini";
import { openaiProvider } from "./providers/openai";

const providers: Partial<Record<Provider, ImageProvider>> = {
  [Provider.GEMINI]: geminiProvider,
  [Provider.OPENAI]: openaiProvider,
};

export async function route(req: GenerateRequest): Promise<GenerateResult> {
  const p = providers[req.provider];
  if (!p) throw new Error(`Provider not wired yet: ${req.provider}`);
  return p.generate(req);
}
