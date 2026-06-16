import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { downloadFace, deleteFace } from "@/lib/face-storage";

// Streams a private face image back to its OWNER only (cookie-authenticated).
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth.api.getSession({ headers: req.headers });
  if (!session) return new NextResponse("Unauthorized", { status: 401 });

  const ref = await prisma.faceRef.findUnique({ where: { id }, select: { userId: true, objectPath: true } });
  if (!ref || ref.userId !== session.user.id) return new NextResponse("Not found", { status: 404 });

  const buf = await downloadFace(ref.objectPath);
  if (!buf) return new NextResponse("Not found", { status: 404 });

  return new NextResponse(new Uint8Array(buf), {
    status: 200,
    headers: { "Content-Type": "image/png", "Cache-Control": "private, max-age=3600" },
  });
}

// Removes a saved face angle (owner only).
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth.api.getSession({ headers: req.headers });
  if (!session) return NextResponse.json({ error: "AUTH_REQUIRED" }, { status: 401 });

  const ref = await prisma.faceRef.findUnique({ where: { id }, select: { userId: true, objectPath: true } });
  if (!ref || ref.userId !== session.user.id) {
    return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  }
  await deleteFace(ref.objectPath);
  await prisma.faceRef.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
