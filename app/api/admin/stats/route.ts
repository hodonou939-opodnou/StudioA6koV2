import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/admin-guard";

// Headline analytics for the dashboard: users, credits, generations, cost, revenue.
export async function GET(req: NextRequest) {
  const guard = await requireAdmin(req);
  if (guard.error) return guard.error;

  const since7d = new Date(Date.now() - 7 * 24 * 3600 * 1000);

  const [
    totalUsers,
    realUsers,
    newUsers7d,
    creditsOutstanding,
    generations7d,
    byFeature,
    byProvider,
    costAgg,
    revenueAgg,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { isAnonymous: false } }),
    prisma.user.count({ where: { createdAt: { gte: since7d } } }),
    prisma.user.aggregate({ _sum: { credits: true } }),
    prisma.generation.count({ where: { createdAt: { gte: since7d } } }),
    prisma.generation.groupBy({ by: ["feature"], _count: true }),
    prisma.generation.groupBy({ by: ["provider"], _count: true }),
    prisma.costEvent.aggregate({ _sum: { costUsd: true } }),
    prisma.payment.aggregate({
      where: { status: "PAID" },
      _sum: { amount: true },
      _count: true,
    }),
  ]);

  return NextResponse.json({
    users: { total: totalUsers, real: realUsers, new7d: newUsers7d },
    creditsOutstanding: creditsOutstanding._sum.credits ?? 0,
    generations7d,
    byFeature,
    byProvider,
    apiCostUsd: costAgg._sum.costUsd ?? 0,
    revenue: { amount: revenueAgg._sum.amount ?? 0, payments: revenueAgg._count },
  });
}
