import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { persistImage } from "@/lib/ai/storage";
import { countryFromRequest } from "@/lib/geo";

export const maxDuration = 30;

// Publishes a creation the user just downloaded into the public community gallery
// (social proof). Free-tier only, anonymous (country + date, no name/email).
//   body: { generationId, base64 }
export async function POST(req: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: req.headers });
    if (!session) return NextResponse.json({ error: "AUTH_REQUIRED" }, { status: 401 });
    const userId = session.user.id;

    const { generationId, base64 } = (await req.json().catch(() => ({}))) as {
      generationId?: string;
      base64?: string;
    };
    if (!generationId || typeof base64 !== "string" || base64.length < 100) {
      return NextResponse.json({ error: "bad request" }, { status: 400 });
    }

    // Ownership — only the creator can publish their own generation.
    const gen = await prisma.generation.findUnique({
      where: { id: generationId },
      select: { id: true, userId: true, isPublic: true },
    });
    if (!gen || gen.userId !== userId) {
      return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
    }
    if (gen.isPublic) return NextResponse.json({ ok: true, already: true });

    // "Free mode" only — paying / credited customers' work stays private.
    // Payment.status PAID alone is unreliable (the webhook may not have fired),
    // so we ALSO treat anyone who ever received purchased or admin-granted
    // credits as non-free.
    const [paid, privileged] = await Promise.all([
      prisma.payment.count({ where: { userId, status: "PAID" } }),
      prisma.creditLedger.count({ where: { userId, reason: { in: ["PURCHASE", "ADMIN_GRANT"] } } }),
    ]);
    if (paid > 0 || privileged > 0) return NextResponse.json({ ok: true, skipped: "non-free-user" });

    const raw = base64.includes(",") ? base64.split(",")[1] : base64;
    const buf = Buffer.from(raw, "base64");
    if (buf.length > 12 * 1024 * 1024) {
      return NextResponse.json({ error: "too large" }, { status: 413 });
    }

    const url = await persistImage(buf, "image/png");
    // No object storage configured → don't store a giant data URL in the DB.
    if (url.startsWith("data:")) {
      return NextResponse.json({ ok: false, error: "STORAGE_NOT_CONFIGURED" });
    }

    const country = await countryFromRequest(req);
    await prisma.generation.update({
      where: { id: generationId },
      data: { isPublic: true, outputUrl: url, country },
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[/api/gallery/publish] failed:", e);
    return NextResponse.json({ error: "PUBLISH_FAILED" }, { status: 500 });
  }
}
