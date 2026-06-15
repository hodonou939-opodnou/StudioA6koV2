import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

// Public read-only feed of community creations for the gallery (social proof).
// Anonymous: only image, tool, country, date — never any user identity.
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const items = await prisma.generation.findMany({
      where: { isPublic: true, outputUrl: { not: null } },
      orderBy: { createdAt: "desc" },
      take: 60,
      select: { id: true, outputUrl: true, feature: true, country: true, createdAt: true },
    });
    return NextResponse.json({
      items: items.map((g) => ({
        id: g.id,
        url: g.outputUrl,
        feature: g.feature,
        country: g.country,
        createdAt: g.createdAt,
      })),
    });
  } catch (e) {
    console.error("[/api/gallery] failed:", e);
    return NextResponse.json({ items: [] });
  }
}
