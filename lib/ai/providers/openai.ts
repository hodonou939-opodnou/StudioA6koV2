import OpenAI from "openai";
import { Provider } from "@prisma/client";
import type { ImageProvider, GenerateRequest, GenerateResult } from "../router";
import { MODELS } from "../models";
import { persistImage } from "../storage";

// Lazy singleton: constructing OpenAI with an empty key throws, which would
// crash `next build`'s page-data collection (secrets are runtime-only). Defer
// construction until the first real request, when the key is present.
let _client: OpenAI | null = null;
function getClient(): OpenAI {
  if (!_client) _client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  return _client;
}

// Rough cost estimate per generated image (high quality). Refine against the
// real usage object once billing data is observed; logged to CostEvent.
const COST_PER_IMAGE_USD: Record<string, number> = {
  "1024x1024": 0.04,
  "1024x1536": 0.06,
  "1536x1024": 0.06,
};

function toSize(aspectRatio?: string): "1024x1024" | "1024x1536" | "1536x1024" {
  switch (aspectRatio) {
    case "9:16":
    case "4:5":
    case "3:4":
      return "1024x1536";
    case "16:9":
    case "5:4":
    case "4:3":
      return "1536x1024";
    default:
      return "1024x1024";
  }
}

export const openaiProvider: ImageProvider = {
  id: Provider.OPENAI,

  async generate(req: GenerateRequest): Promise<GenerateResult> {
    const client = getClient();
    const startedAt = Date.now();
    const size = toSize(req.aspectRatio);

    // With input images (try-on / edits) use the edits endpoint; else generate.
    let b64: string | undefined;
    if (req.images && req.images.length > 0) {
      const files = await Promise.all(
        req.images.map((img, i) => dataUrlToFile(img, `input-${i}.png`)),
      );
      const res = await client.images.edit({
        model: MODELS.OPENAI_IMAGE,
        image: files,
        prompt: req.prompt,
        size,
      });
      b64 = res.data?.[0]?.b64_json;
    } else {
      const res = await client.images.generate({
        model: MODELS.OPENAI_IMAGE,
        prompt: req.prompt,
        size,
      });
      b64 = res.data?.[0]?.b64_json;
    }

    if (!b64) throw new Error("OPENAI_NO_IMAGE");

    const imageUrl = await persistImage(Buffer.from(b64, "base64"), "image/png");

    return {
      imageUrl,
      model: MODELS.OPENAI_IMAGE,
      latencyMs: Date.now() - startedAt,
      costUsd: COST_PER_IMAGE_USD[size] ?? 0.04,
    };
  },
};

// gpt-image-2 returns base64; convert input data URLs to File for edits.
async function dataUrlToFile(dataUrl: string, name: string): Promise<File> {
  const base64 = dataUrl.includes(",") ? dataUrl.split(",")[1] : dataUrl;
  const buf = Buffer.from(base64, "base64");
  return new File([buf], name, { type: "image/png" });
}
