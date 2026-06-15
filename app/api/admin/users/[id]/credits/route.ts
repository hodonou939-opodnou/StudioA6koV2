import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-guard";
import { applyCredits } from "@/lib/credits";
import { CreditReason } from "@prisma/client";

// Manually add or remove credits (incl. granting after a purchase).
// Body: { delta: number, note?: string }
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const guard = await requireAdmin(req);
  if (guard.error) return guard.error;

  const { id } = await params;
  const { delta, note } = (await req.json()) as { delta: number; note?: string };

  if (!Number.isInteger(delta) || delta === 0) {
    return NextResponse.json({ error: "INVALID_DELTA" }, { status: 400 });
  }

  const balanceAfter = await applyCredits({
    userId: id,
    delta,
    reason: delta > 0 ? CreditReason.ADMIN_GRANT : CreditReason.ADMIN_REVOKE,
    adminId: guard.session.user.id,
    note,
  });

  return NextResponse.json({ ok: true, balanceAfter });
}
