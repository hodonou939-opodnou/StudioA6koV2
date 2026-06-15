import { NextRequest, NextResponse } from "next/server";
import * as service from "@/services/geminiService";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { spend, refund, InsufficientCreditsError } from "@/lib/credits";
import { getProviderForFeature } from "@/lib/model-config";
import { Feature, Provider, GenStatus } from "@prisma/client";

export const maxDuration = 300; // long-running image/video generation

// Analytics feature per generative action.
const FEATURE: Record<string, Feature> = {
  generateFashionShoot: Feature.PHOTOSHOOT,
  animateImage: Feature.ANIMATION,
  editGeneratedImage: Feature.IMAGE_EDIT,
  generateModelImages: Feature.MODEL_GEN,
};

// Credit cost is computed SERVER-SIDE from the request args — never trusted from
// the client. generateFashionShoot bills per variant (2 each); model previews +
// helper calls are free.
function computeCost(action: string, args: any[]): number {
  switch (action) {
    case "generateFashionShoot": {
      const variants = Math.max(1, Math.floor(Number(args?.[0]?.variants) || 1));
      return Math.min(40, variants * 2);
    }
    case "animateImage":
      return 20;
    case "editGeneratedImage":
      return 1;
    default:
      return 0; // generateModelImages + all helper actions
  }
}

const noop = () => {};
const key = () => process.env.GEMINI_API_KEY;

// Reproduces the old server.ts dispatch — runs the real Gemini calls server-side.
async function dispatch(
  action: string,
  args: any[],
  provider: "GEMINI" | "OPENAI" = "GEMINI",
): Promise<any> {
  switch (action) {
    case "generateFashionShoot":
      return service.generateFashionShoot(args[0], noop, key(), undefined, provider);
    case "animateImage":
      return service.animateImage(args[0], args[1], noop, key());
    case "editGeneratedImage":
      return service.editGeneratedImage(args[0], args[1], key());
    case "generateModelImages":
      return service.generateModelImages(args[0], args[1], key());
    case "generateGarmentDescription":
      return service.generateGarmentDescription(args[0], key());
    case "verifyPaymentScreenshot":
      return service.verifyPaymentScreenshot(args[0], key());
    case "generateInspirationalScript":
      return service.generateInspirationalScript(args[0], key());
    case "generateShopInfo":
      return service.generateShopInfo(args[0], args[1], key());
    default:
      throw new Error(`Unknown action: ${action}`);
  }
}

export async function POST(req: NextRequest) {
  let action = "";
  try {
    const body = await req.json();
    action = body.action;
    const args = body.args ?? [];
    const cost = computeCost(action, args); // server-authoritative; client value ignored

    // Every action requires at least a valid (anonymous) session — closes the
    // endpoint to anonymous-of-session / direct API abuse.
    const session = await auth.api.getSession({ headers: req.headers });
    if (!session) {
      return NextResponse.json({ error: "AUTH_REQUIRED" }, { status: 401 });
    }

    // Free preview/helper actions: any signed-in session (incl. anonymous) may run them.
    if (cost === 0) {
      return NextResponse.json(await dispatch(action, args));
    }

    // Paid generation requires a real (non-anonymous) account.
    if (session.user.isAnonymous) {
      return NextResponse.json({ error: "AUTH_REQUIRED" }, { status: 401 });
    }
    const userId = session.user.id;

    const gen = await prisma.generation.create({
      data: {
        userId,
        feature: FEATURE[action] ?? Feature.PHOTOSHOOT,
        provider: Provider.GEMINI,
        model: "gemini",
        params: { action, variants: args?.[0]?.variants ?? 1 },
        creditCost: cost,
        status: GenStatus.PENDING,
      },
    });

    // Reserve the full cost before the expensive call (atomic in lib/credits).
    try {
      await spend(userId, cost, gen.id);
    } catch (e) {
      if (e instanceof InsufficientCreditsError) {
        await prisma.generation.update({
          where: { id: gen.id },
          data: { status: GenStatus.FAILED, errorCode: "INSUFFICIENT_CREDITS" },
        });
        return NextResponse.json({ error: "INSUFFICIENT_CREDITS" }, { status: 402 });
      }
      throw e;
    }

    // Admin-selected image model for this feature (per-page override → default).
    const featureName = (body.feature as string) || String(FEATURE[action] ?? "");
    const provider = await getProviderForFeature(featureName);

    const startedAt = Date.now();
    try {
      const result = await dispatch(action, args, provider);
      await prisma.generation.update({
        where: { id: gen.id },
        data: { status: GenStatus.SUCCESS, latencyMs: Date.now() - startedAt },
      });
      return NextResponse.json(result);
    } catch (err) {
      await refund(userId, cost, gen.id); // refund the FULL reserved amount
      await prisma.generation.update({
        where: { id: gen.id },
        data: {
          status: GenStatus.FAILED,
          latencyMs: Date.now() - startedAt,
          errorCode: (err as Error).message?.slice(0, 120) ?? "GEN_FAILED",
        },
      });
      throw err;
    }
  } catch (e: any) {
    console.error(`[/api/gemini] ${action} failed:`, e);
    return NextResponse.json(
      { error: e?.message || "An internal error occurred." },
      { status: 500 },
    );
  }
}
