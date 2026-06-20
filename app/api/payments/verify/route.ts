import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { verifyPayment } from "@/lib/moneroo";
import { applyCredits } from "@/lib/credits";
import { CreditReason, PaymentStatus } from "@prisma/client";

export const maxDuration = 30;

// Fallback to the Moneroo webhook: when the user returns from checkout
// (?payment=processing), the client calls this to confirm + grant credits
// immediately — so auto-recharge works even if the webhook isn't configured or
// is delayed. Uses the SAME authoritative, idempotent path as the webhook:
// re-verify with Moneroo's API, match the amount, and gate on Payment.status +
// the unique CreditLedger.paymentId so credits can never be double-granted.
export async function POST(req: NextRequest) {
  const session = await auth.api.getSession({ headers: req.headers });
  if (!session || session.user.isAnonymous) {
    return NextResponse.json({ error: "AUTH_REQUIRED" }, { status: 401 });
  }
  const userId = session.user.id;

  // Only this user's still-pending intents from the last 2 hours.
  const cutoff = new Date(Date.now() - 2 * 60 * 60 * 1000);
  const pending = await prisma.payment.findMany({
    where: { userId, status: PaymentStatus.INITIATED, createdAt: { gte: cutoff } },
    orderBy: { createdAt: "desc" },
    take: 5,
  });

  let granted = 0;
  for (const payment of pending) {
    try {
      const tx = await verifyPayment(String(payment.externalRef));
      if (tx.status !== "success") continue;
      if (Number(tx.amount) !== Number(payment.amount)) {
        await prisma.payment.update({
          where: { id: payment.id },
          data: { status: PaymentStatus.FAILED },
        });
        continue;
      }
      await applyCredits({
        userId,
        delta: payment.creditsGranted,
        reason: CreditReason.PURCHASE,
        paymentId: payment.id, // unique → can't double-grant vs the webhook
        note: `Moneroo ${payment.externalRef} (${payment.packId}) [verify-on-return]`,
      });
      await prisma.payment.update({
        where: { id: payment.id },
        data: { status: PaymentStatus.PAID, paidAt: new Date() },
      });
      granted += payment.creditsGranted;
    } catch (e: any) {
      // Already granted (unique paymentId race with the webhook) or transient
      // verify error — leave the payment for the next poll / the webhook.
      console.warn("[payments/verify]", e?.message || e);
    }
  }

  const credits = await prisma.user.findUnique({
    where: { id: userId },
    select: { credits: true },
  });
  return NextResponse.json({ ok: true, granted, credits: credits?.credits ?? null });
}
