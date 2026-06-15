import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-guard";
import {
  getModelConfig,
  setModelSetting,
  SWITCHABLE_FEATURES,
} from "@/lib/model-config";

export async function GET(req: NextRequest) {
  const guard = await requireAdmin(req);
  if (guard.error) return guard.error;
  return NextResponse.json(await getModelConfig());
}

// Body: { scope: "default" | "PHOTOSHOOT" | "ESSAYAGE" | "CREATIVES", provider: "GEMINI" | "OPENAI" | null }
export async function POST(req: NextRequest) {
  const guard = await requireAdmin(req);
  if (guard.error) return guard.error;

  const { scope, provider } = (await req.json()) as {
    scope: string;
    provider: "GEMINI" | "OPENAI" | null;
  };

  const validScope = scope === "default" || (SWITCHABLE_FEATURES as readonly string[]).includes(scope);
  const validProvider = provider === null || provider === "GEMINI" || provider === "OPENAI";
  if (!validScope || !validProvider) {
    return NextResponse.json({ error: "INVALID_INPUT" }, { status: 400 });
  }
  // default cannot be cleared to null
  if (scope === "default" && provider === null) {
    return NextResponse.json({ error: "DEFAULT_REQUIRED" }, { status: 400 });
  }

  await setModelSetting(`model:${scope}`, provider);
  return NextResponse.json({ ok: true, config: await getModelConfig() });
}
