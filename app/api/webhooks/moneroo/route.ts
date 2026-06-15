import { NextRequest, NextResponse } from "next/server";
import crypto from "node:crypto";
import { prisma } from "@/lib/db";
import { verifyPayment } from "@/lib/moneroo";
import { applyCredits } from "@/lib/credits";
import { CreditReason, PaymentStatus } from "@prisma/client";

// Verify Moneroo's HMAC-SHA256 signature (X-Moneroo-Signature) over the raw body.
function validSignature(raw: string, header: string | null): boolean {
  const secret = process.env.MONEROO_WEBHOOK_SECRET;
  if (!secret) return true; // not configured (e.g. local) — rely on the API verify step
  if (!header) return false;
  const expected = crypto.createHmac("sha256", secret).update(raw).digest("hex");
  const a = Buffer.from(header);
  const b = Buffer.from(expected);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

// Moneroo payment webhook → auto-grant credits.
//
// Security model: we do NOT trust the webhook body. We take only the transaction
// id from it, then call Moneroo's verify endpoint server-side (Bearer secret) to
// authoritatively confirm status + amount before granting anything. Idempotent:
// CreditLedger.paymentId is unique and we gate on Payment.status.
export async function POST(req: NextRequest) {
  const raw = await req.text();

  // 1) Authenticate the webhook via its signature.
  if (!validSignature(raw, req.headers.get("x-moneroo-signature"))) {
    return NextResponse.json({ error: "BAD_SIGNATURE" }, { status: 403 });
  }

  let body: any = {};
  try {
    body = raw ? JSON.parse(raw) : {};
  } catch {
    /* tolerate empty/non-JSON pings */
  }

  const txId =
    body?.data?.id || body?.id || body?.data?.transaction?.id || body?.transaction_id;
  if (!txId) return NextResponse.json({ ok: true }); // nothing to do

  try {
    const tx = await verifyPayment(String(txId));
    if (tx.status !== "success") return NextResponse.json({ ok: true });

    const payment = await prisma.payment.findUnique({ where: { externalRef: String(txId) } });
    if (!payment || payment.status === PaymentStatus.PAID) {
      return NextResponse.json({ ok: true }); // unknown or already credited
    }

    // Anti-tamper: the verified amount must match what we recorded for the pack.
    if (Number(tx.amount) !== Number(payment.amount)) {
      console.error(`[moneroo] amount mismatch tx=${txId} got=${tx.amount} expected=${payment.amount}`);
      await prisma.payment.update({
        where: { id: payment.id },
        data: { status: PaymentStatus.FAILED, rawWebhook: body },
      });
      return NextResponse.json({ ok: true });
    }

    await applyCredits({
      userId: payment.userId,
      delta: payment.creditsGranted,
      reason: CreditReason.PURCHASE,
      paymentId: payment.id, // unique on the ledger → double webhooks can't double-grant
      note: `Moneroo ${txId} (${payment.packId})`,
    });
    await prisma.payment.update({
      where: { id: payment.id },
      data: { status: PaymentStatus.PAID, paidAt: new Date(), rawWebhook: body },
    });

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    // Already-granted (unique paymentId) or transient verify error — ack so Moneroo
    // doesn't hammer retries; real failures are visible in logs + Payment status.
    console.error("[moneroo webhook]", e?.message || e);
    return NextResponse.json({ ok: true });
  }
}
