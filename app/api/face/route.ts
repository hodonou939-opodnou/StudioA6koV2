import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { uploadFace } from "@/lib/face-storage";

export const maxDuration = 30;

const MAX_REFS = 6; // a few angles is plenty
const VALID_ANGLES = ["front", "left", "right", "extra"];

// GET: list the signed-in user's saved face references (metadata only; the image
// is streamed via /api/face/[id] with an ownership check).
export async function GET(req: NextRequest) {
  const session = await auth.api.getSession({ headers: req.headers });
  if (!session || session.user.isAnonymous) {
    return NextResponse.json({ error: "AUTH_REQUIRED" }, { status: 401 });
  }
  const refs = await prisma.faceRef.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "asc" },
    select: { id: true, angle: true, createdAt: true },
  });
  return NextResponse.json({
    refs: refs.map((r) => ({ id: r.id, angle: r.angle, createdAt: r.createdAt, url: `/api/face/${r.id}` })),
  });
}

// POST: save one captured angle. Requires a real (non-anonymous) account so the
// face profile persists across logins/devices.
export async function POST(req: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: req.headers });
    if (!session || session.user.isAnonymous) {
      return NextResponse.json({ error: "AUTH_REQUIRED" }, { status: 401 });
    }
    const userId = session.user.id;

    const { base64, angle } = (await req.json().catch(() => ({}))) as { base64?: string; angle?: string };
    if (typeof base64 !== "string" || base64.length < 100) {
      return NextResponse.json({ error: "bad request" }, { status: 400 });
    }
    const a = VALID_ANGLES.includes(angle ?? "") ? (angle as string) : "extra";

    const count = await prisma.faceRef.count({ where: { userId } });
    if (count >= MAX_REFS) {
      return NextResponse.json({ error: "MAX_REACHED", max: MAX_REFS }, { status: 409 });
    }

    const raw = base64.includes(",") ? base64.split(",")[1] : base64;
    const buf = Buffer.from(raw, "base64");
    if (buf.length > 8 * 1024 * 1024) {
      return NextResponse.json({ error: "too large" }, { status: 413 });
    }

    const objectPath = await uploadFace(userId, buf, a);
    if (!objectPath) {
      return NextResponse.json({ error: "STORAGE_NOT_CONFIGURED" }, { status: 200 });
    }
    const ref = await prisma.faceRef.create({ data: { userId, objectPath, angle: a } });
    return NextResponse.json({ id: ref.id, angle: ref.angle, url: `/api/face/${ref.id}` });
  } catch (e) {
    console.error("[/api/face POST] failed:", e);
    return NextResponse.json({ error: "FACE_SAVE_FAILED" }, { status: 500 });
  }
}
