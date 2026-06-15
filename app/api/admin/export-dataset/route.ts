import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/admin-guard";

// Exports a JSONL "preference dataset" — every generation that earned a positive
// signal (downloaded / shared / liked), with its full settings. This is the seed
// corpus for future fine-tuning or few-shot prompt libraries.
//   GET /api/admin/export-dataset  -> downloads dataset.jsonl
export async function GET(req: NextRequest) {
  const guard = await requireAdmin(req);
  if (guard.error) return guard.error;

  // Pull positive signals with their generation context (bounded).
  const positives = await prisma.feedback.findMany({
    where: {
      OR: [{ action: "DOWNLOAD" }, { action: "SHARE" }, { action: "RATE", rating: 1 }],
    },
    orderBy: { createdAt: "desc" },
    take: 10000,
    select: {
      action: true,
      assetRef: true,
      generationId: true,
      generation: {
        select: {
          feature: true,
          provider: true,
          model: true,
          params: true,
          outputUrl: true,
          createdAt: true,
        },
      },
    },
  });

  // Collapse to one record per generation, tallying the signal strength.
  const byGen = new Map<string, any>();
  for (const f of positives) {
    if (!f.generation) continue;
    const rec = byGen.get(f.generationId) ?? {
      generationId: f.generationId,
      feature: f.generation.feature,
      provider: f.generation.provider,
      model: f.generation.model,
      params: f.generation.params,
      outputUrl: f.generation.outputUrl,
      createdAt: f.generation.createdAt,
      signals: { downloads: 0, shares: 0, likes: 0 },
    };
    if (f.action === "DOWNLOAD") rec.signals.downloads++;
    else if (f.action === "SHARE") rec.signals.shares++;
    else if (f.action === "RATE") rec.signals.likes++;
    byGen.set(f.generationId, rec);
  }

  const jsonl = Array.from(byGen.values())
    .map((r) => JSON.stringify(r))
    .join("\n");

  return new NextResponse(jsonl, {
    status: 200,
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Content-Disposition": `attachment; filename="a6ko-preference-dataset.jsonl"`,
    },
  });
}
