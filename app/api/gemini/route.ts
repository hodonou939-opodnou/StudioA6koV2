import { NextRequest, NextResponse } from "next/server";
import * as service from "@/services/geminiService";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { spend, refund, InsufficientCreditsError } from "@/lib/credits";
import { getProviderForFeature } from "@/lib/model-config";
import { downloadFace } from "@/lib/face-storage";
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

// Snapshot the meaningful, learnable knobs of a request (NO base64 images) so the
// admin insights + future fine-tuning dataset can correlate settings ↔ outcomes.
function safeParams(action: string, args: any[]): any {
  const o = args?.[0] ?? {};
  if (action === "generateFashionShoot") {
    return {
      action,
      intent: o.intent,
      pose: o.pose,
      environment: o.environment,
      backgroundType: o.backgroundType,
      colorPalette: o.colorPalette,
      cameraAngle: o.cameraAngle,
      cameraAxis: o.cameraAxis,
      cameraDistance: o.cameraDistance,
      cameraLens: o.cameraLens,
      aspectRatio: o.aspectRatio,
      lightingSetup: o.lightingSetup,
      lightingMood: o.lightingMood,
      postProcessing: o.postProcessing,
      filmGrain: o.filmGrain,
      tattoos: o.tattoos,
      variants: o.variants ?? 1,
      watermark: o.watermark,
      hasGarmentImage: !!o.garment?.image,
      hasModelImage: !!o.model?.image,
    };
  }
  return { action, variants: o.variants ?? 1 };
}

// Stamp the server Generation.id onto each returned asset's metadata so the
// client can post 👍/👎/download/share signals tied to the exact generation.
function attachGenerationId(result: any, generationId: string): any {
  if (Array.isArray(result)) {
    return result.map((a) =>
      a && a.metadata ? { ...a, metadata: { ...a.metadata, generationId } } : a,
    );
  }
  if (result && typeof result === "object" && result.metadata) {
    return { ...result, metadata: { ...result.metadata, generationId } };
  }
  return result;
}

// NOTE: the gallery is populated ONLY when a FREE user explicitly shares or
// downloads a creation (see /api/gallery/publish + VariantCard). We deliberately
// do NOT auto-publish every generation — generating something does not mean the
// user wants it public, and paid users' work always stays private.

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
        params: safeParams(action, args),
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

    // Inject the user's stored multi-angle face references (if any) so the model
    // reconstructs their exact face. Bonus refs — never replace the model/garment.
    if (action === "generateFashionShoot" && args?.[0]?.model) {
      try {
        const refs = await prisma.faceRef.findMany({
          where: { userId },
          orderBy: { createdAt: "asc" },
          take: 4,
        });
        const loaded: { base64: string; mimeType: string }[] = [];
        for (const r of refs) {
          const buf = await downloadFace(r.objectPath);
          if (buf) loaded.push({ base64: buf.toString("base64"), mimeType: "image/png" });
        }
        if (loaded.length) {
          args[0].model.faceRefs = loaded;
          // Capture = subject: if the user didn't upload a photo, use their
          // captured front face (first by createdAt) as the base subject image.
          if (!args[0].model.image) args[0].model.image = loaded[0];
        }
      } catch (e) {
        console.warn("[face refs] load failed", e);
      }
    }

    const startedAt = Date.now();
    let result: any;
    try {
      // ONLY the actual image/video generation gates success. Long generations
      // (45-60s) can outlive a Neon idle connection, so the DB bookkeeping below
      // is isolated — a dropped connection must NOT turn a finished image into an
      // error for the user (which would also wrongly refund + hide their result).
      result = await dispatch(action, args, provider);
    } catch (err) {
      try {
        await refund(userId, cost, gen.id); // refund the FULL reserved amount
        await prisma.generation.update({
          where: { id: gen.id },
          data: {
            status: GenStatus.FAILED,
            latencyMs: Date.now() - startedAt,
            errorCode: (err as Error).message?.slice(0, 120) ?? "GEN_FAILED",
          },
        });
      } catch (bookErr) {
        console.warn("[gen failure bookkeeping] failed", bookErr);
      }
      throw err;
    }

    // --- Generation succeeded. Everything below is best-effort and must NEVER
    // fail the response or the user loses an image they already paid for. ---
    const requested = Math.max(1, Math.floor(Number(args?.[0]?.variants) || 1));
    const missing =
      action === "generateFashionShoot" && Array.isArray(result)
        ? Math.max(0, requested - result.length)
        : 0;

    // Fast, critical Neon writes — awaited (so Cloud Run doesn't freeze them) but
    // guarded so a dropped connection can't fail the response.
    try {
      await prisma.generation.update({
        where: { id: gen.id },
        data: {
          status: GenStatus.SUCCESS,
          latencyMs: Date.now() - startedAt,
          provider: provider === "OPENAI" ? Provider.OPENAI : Provider.GEMINI,
          model: provider === "OPENAI" ? process.env.OPENAI_IMAGE_MODEL || "gpt-image-2" : "gemini-image",
        },
      });
      if (missing > 0) await refund(userId, missing * 2, gen.id);
    } catch (e) {
      console.warn("[post-gen bookkeeping] skipped:", (e as Error)?.message);
    }

    return NextResponse.json(attachGenerationId(result, gen.id));
  } catch (e: any) {
    console.error(`[/api/gemini] ${action} failed:`, e);
    return NextResponse.json(
      { error: e?.message || "An internal error occurred." },
      { status: 500 },
    );
  }
}
