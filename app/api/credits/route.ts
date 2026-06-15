import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

// Current balance for the signed-in (or anonymous) session.
export async function GET(req: NextRequest) {
  const session = await auth.api.getSession({ headers: req.headers });
  if (!session) return NextResponse.json({ credits: 0, authenticated: false });

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { credits: true, isAnonymous: true, shortId: true },
  });

  return NextResponse.json({
    credits: user?.credits ?? 0,
    authenticated: !user?.isAnonymous,
    shortId: user?.shortId ?? null,
  });
}
