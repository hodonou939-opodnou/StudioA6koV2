import { GoogleGenAI } from "@google/genai";
import { Provider } from "@prisma/client";
import type { ImageProvider, GenerateRequest, GenerateResult } from "../router";
import { MODELS } from "../models";
import { persistImage } from "../storage";

// Lazy singleton — see openai.ts. Avoids constructing the client at module
// load (build time), when GEMINI_API_KEY is not yet injected.
let _ai: GoogleGenAI | null = null;
function getAI(): GoogleGenAI {
  if (!_ai) _ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  return _ai;
}

// Phase 4 port target: the existing services/geminiService.ts holds the rich
// prompt-engineering (pose/lighting/camera/environment → prompt). That builder
// moves into lib/ai/prompt-builder.ts and is called here. This is the thin
// transport wrapper around it.
export const geminiProvider: ImageProvider = {
  id: Provider.GEMINI,

  async generate(req: GenerateRequest): Promise<GenerateResult> {
    const ai = getAI();
    const startedAt = Date.now();

    const parts: Array<Record<string, unknown>> = [{ text: req.prompt }];
    for (const img of req.images ?? []) {
      const base64 = img.includes(",") ? img.split(",")[1] : img;
      parts.push({ inlineData: { mimeType: "image/png", data: base64 } });
    }

    const res = await ai.models.generateContent({
      model: MODELS.GEMINI_IMAGE,
      contents: [{ role: "user", parts }],
    });

    const imgPart = res.candidates?.[0]?.content?.parts?.find(
      (p: any) => p.inlineData,
    );
    const b64 = imgPart?.inlineData?.data;
    if (!b64) throw new Error("GEMINI_NO_IMAGE");

    const imageUrl = await persistImage(Buffer.from(b64, "base64"), "image/png");

    return {
      imageUrl,
      model: MODELS.GEMINI_IMAGE,
      latencyMs: Date.now() - startedAt,
      costUsd: 0.039, // refine from observed billing
    };
  },
};
