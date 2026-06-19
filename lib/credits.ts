import { CreditReason } from "@prisma/client";
import { prisma } from "./db";

/**
 * Central credit engine. Every balance change goes through here so the
 * append-only CreditLedger always reconciles with User.credits.
 */

export class InsufficientCreditsError extends Error {
  constructor() {
    super("INSUFFICIENT_CREDITS");
  }
}

type Movement = {
  userId: string;
  delta: number;
  reason: CreditReason;
  note?: string;
  adminId?: string;
  paymentId?: string;
  generationId?: string;
};

/** Apply a credit movement atomically and write the ledger row. */
export async function applyCredits(m: Movement) {
  return prisma.$transaction(async (tx) => {
    if (m.delta < 0) {
      const need = -m.delta;
      // Atomic conditional decrement: only succeeds if enough credits remain.
      // Prevents two concurrent generations from double-spending the same balance.
      const res = await tx.user.updateMany({
        where: { id: m.userId, credits: { gte: need } },
        data: { credits: { decrement: need } },
      });
      if (res.count === 0) throw new InsufficientCreditsError();
    } else if (m.delta > 0) {
      await tx.user.update({
        where: { id: m.userId },
        data: { credits: { increment: m.delta } },
      });
    } else {
      await tx.user.findUniqueOrThrow({ where: { id: m.userId } });
    }

    const { credits: balanceAfter } = await tx.user.findUniqueOrThrow({
      where: { id: m.userId },
      select: { credits: true },
    });

    await tx.creditLedger.create({
      data: {
        userId: m.userId,
        delta: m.delta,
        balanceAfter,
        reason: m.reason,
        note: m.note,
        adminId: m.adminId,
        paymentId: m.paymentId,
        generationId: m.generationId,
      },
    });

    return balanceAfter;
  });
}

/** Spend credits for a generation. Throws InsufficientCreditsError if short. */
export function spend(userId: string, cost: number, generationId: string) {
  return applyCredits({
    userId,
    delta: -cost,
    reason: CreditReason.GENERATION_SPEND,
    generationId,
  });
}

/** Refund a failed generation. */
export function refund(userId: string, cost: number, generationId: string) {
  return applyCredits({
    userId,
    delta: cost,
    reason: CreditReason.REFUND,
    generationId,
    note: "auto-refund: generation failed",
  });
}

/**
 * Move an anonymous guest's balance + activity onto their new real account
 * when they sign in. Called from Better Auth's anonymous onLinkAccount hook.
 */
export async function claimAnonymousCredits(anonId: string, realId: string) {
  return prisma.$transaction(async (tx) => {
    const anon = await tx.user.findUnique({ where: { id: anonId } });
    if (!anon) return;

    // Always move the guest's pending activity onto the real account.
    await tx.generation.updateMany({ where: { userId: anonId }, data: { userId: realId } });
    await tx.feedback.updateMany({ where: { userId: anonId }, data: { userId: realId } });

    const real = await tx.user.findUniqueOrThrow({ where: { id: realId } });

    // Is this the FIRST time this SSO account is seen? (no prior credit history)
    const priorLedger = await tx.creditLedger.count({ where: { userId: realId } });
    const isNewAccount = priorLedger === 0;

    if (isNewAccount) {
      // New SSO user: adopt the guest's remaining free balance and the guest's
      // A6 id, so the id seen at first visit stays with the account permanently.
      const balanceAfter = anon.credits;
      const adoptedShortId = anon.shortId ?? real.shortId;
      // CRITICAL: free the guest's A6 id first — shortId is UNIQUE, so the real
      // account can't adopt it while the guest row still holds it (P2002 -> 500).
      if (anon.shortId) {
        await tx.user.update({ where: { id: anonId }, data: { shortId: null } });
      }
      await tx.user.update({
        where: { id: realId },
        data: {
          credits: balanceAfter,
          shortId: adoptedShortId,
        },
      });
      await tx.creditLedger.create({
        data: {
          userId: realId,
          delta: balanceAfter - real.credits,
          balanceAfter,
          reason: CreditReason.ANON_CLAIM,
          note: `new account adopted guest ${anonId}`,
        },
      });
    } else {
      // RETURNING SSO user: keep their real balance — never re-grant free credits.
      // (Anti-farming: clearing cookies → fresh guest 3 → does NOT carry over.)
      await tx.creditLedger.create({
        data: {
          userId: realId,
          delta: 0,
          balanceAfter: real.credits,
          reason: CreditReason.ANON_CLAIM,
          note: `returning account; guest free credits from ${anonId} discarded`,
        },
      });
    }

    // Zero out the anonymous shell.
    await tx.user.update({ where: { id: anonId }, data: { credits: 0 } });
  });
}
