import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { FeedbackAction } from "@prisma/client";

// Records a user signal on a generated result — the raw material for the
// learning loop (which prompts/models produce results people keep & share).
//   body: { generationId, action: "RATE"|"REGENERATE"|"EDIT"|"DOWNLOAD"|"SHARE",
//           rating?: -1|1, editPrompt?, assetRef? }
// Requires a session; the generation must belong to the signed-in user.
export async function POST(req: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: req.headers });
    if (!session) {
      return NextResponse.json({ error: "AUTH_REQUIRED" }, { status: 401 });
    }
    const userId = session.user.id;

    const body = await req.json().catch(() => ({}));
    const { generationId, action, rating, editPrompt, assetRef } = body ?? {};

    if (!generationId || typeof generationId !== "string") {
      return NextResponse.json({ error: "generationId required" }, { status: 400 });
    }
    if (!action || !(action in FeedbackAction)) {
      return NextResponse.json({ error: "invalid action" }, { status: 400 });
    }

    // Ownership check — can only rate your own generations.
    const gen = await prisma.generation.findUnique({
      where: { id: generationId },
      select: { id: true, userId: true },
    });
    if (!gen || gen.userId !== userId) {
      return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
    }

    const ref = typeof assetRef === "string" ? assetRef.slice(0, 120) : null;

    // RATE is a toggle: keep at most one current rating per (user, generation, asset).
    if (action === "RATE") {
      await prisma.feedback.deleteMany({
        where: { userId, generationId, action: "RATE", assetRef: ref },
      });
      // rating === 0 means "un-rated" (toggled off) → just clear, don't insert.
      if (rating === 1 || rating === -1) {
        await prisma.feedback.create({
          data: { userId, generationId, action: "RATE", rating, assetRef: ref },
        });
      }
      return NextResponse.json({ ok: true });
    }

    // DOWNLOAD / SHARE / REGENERATE / EDIT are append-only events.
    await prisma.feedback.create({
      data: {
        userId,
        generationId,
        action: action as FeedbackAction,
        editPrompt: action === "EDIT" && typeof editPrompt === "string"
          ? editPrompt.slice(0, 1000)
          : null,
        assetRef: ref,
      },
    });
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    console.error("[/api/feedback] failed:", e);
    return NextResponse.json({ error: "FEEDBACK_FAILED" }, { status: 500 });
  }
}
