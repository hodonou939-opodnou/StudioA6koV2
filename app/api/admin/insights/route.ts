import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/admin-guard";

// "Learning loop" analytics: what users actually keep & share, and which model
// (Gemini vs gpt-image-2) and which settings produce those wins.
//
// Positive signal  = DOWNLOAD | SHARE | RATE(+1)   ("the user wanted this output")
// Negative signal  = RATE(-1)                       ("the user rejected it")
// Win rate         = positives / (positives + negatives)
export async function GET(req: NextRequest) {
  const guard = await requireAdmin(req);
  if (guard.error) return guard.error;

  const since = new Date(Date.now() - 90 * 24 * 3600 * 1000);

  const [genByProvider, genByFeature, feedbackByAction, recentFeedback] =
    await Promise.all([
      prisma.generation.groupBy({
        by: ["provider"],
        _count: true,
        _avg: { latencyMs: true },
        where: { createdAt: { gte: since } },
      }),
      prisma.generation.groupBy({
        by: ["feature"],
        _count: true,
        where: { createdAt: { gte: since } },
      }),
      prisma.feedback.groupBy({
        by: ["action"],
        _count: true,
        where: { createdAt: { gte: since } },
      }),
      // Bounded join: enough to rank, cheap enough for a dashboard.
      prisma.feedback.findMany({
        where: { createdAt: { gte: since } },
        orderBy: { createdAt: "desc" },
        take: 5000,
        select: {
          action: true,
          rating: true,
          generation: { select: { provider: true, model: true, params: true } },
        },
      }),
    ]);

  // Per-provider win rate + per-setting tallies, computed in-process.
  const provider: Record<string, { pos: number; neg: number }> = {};
  const poseWins: Record<string, number> = {};
  const envWins: Record<string, number> = {};

  const isPositive = (a: string, r: number | null) =>
    a === "DOWNLOAD" || a === "SHARE" || (a === "RATE" && r === 1);
  const isNegative = (a: string, r: number | null) => a === "RATE" && r === -1;

  for (const f of recentFeedback) {
    const p = f.generation?.provider ?? "UNKNOWN";
    provider[p] ??= { pos: 0, neg: 0 };
    if (isPositive(f.action, f.rating)) {
      provider[p].pos++;
      const params = (f.generation?.params ?? {}) as Record<string, unknown>;
      if (typeof params.pose === "string") poseWins[params.pose] = (poseWins[params.pose] ?? 0) + 1;
      if (typeof params.environment === "string")
        envWins[params.environment] = (envWins[params.environment] ?? 0) + 1;
    } else if (isNegative(f.action, f.rating)) {
      provider[p].neg++;
    }
  }

  const providerPerformance = Object.entries(provider).map(([name, v]) => ({
    provider: name,
    positive: v.pos,
    negative: v.neg,
    winRate: v.pos + v.neg > 0 ? Math.round((v.pos / (v.pos + v.neg)) * 100) : null,
  }));

  const topList = (m: Record<string, number>) =>
    Object.entries(m)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([key, count]) => ({ key, count }));

  return NextResponse.json({
    windowDays: 90,
    generationsByProvider: genByProvider.map((g) => ({
      provider: g.provider,
      count: g._count,
      avgLatencyMs: g._avg.latencyMs ? Math.round(g._avg.latencyMs) : null,
    })),
    generationsByFeature: genByFeature.map((g) => ({ feature: g.feature, count: g._count })),
    feedbackByAction: feedbackByAction.map((f) => ({ action: f.action, count: f._count })),
    providerPerformance, // ← the A/B: which model wins
    topPoses: topList(poseWins),
    topEnvironments: topList(envWins),
  });
}
