/**
 * One-time migration: Firestore → PostgreSQL.
 *
 * SAFE TO RE-RUN: credits are written ONLY on first import (create branch). On
 * re-runs, only non-financial profile fields are refreshed — balances that users
 * have since spent or purchased are never clobbered.
 *
 *   GOOGLE_APPLICATION_CREDENTIALS=./sa.json DATABASE_URL=... npm run migrate:firestore
 *
 * Collections:
 *   users/{uid}                 → real accounts (credits, role, profile, A6 id)
 *   device_fingerprints/{fpId}  → anonymous guests (so guest credits survive)
 */
import { cert, initializeApp, applicationDefault } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { PrismaClient, CreditReason } from "@prisma/client";

const prisma = new PrismaClient();

initializeApp({
  credential: process.env.FIREBASE_SA_JSON
    ? cert(JSON.parse(process.env.FIREBASE_SA_JSON))
    : applicationDefault(),
});
const fs = getFirestore();

const MIGRATE_GUEST_FINGERPRINTS = process.env.MIGRATE_GUESTS !== "false";

// Same alphabet/shape as lib/auth.ts genShortId, for accounts with no legacy id.
function genShortId(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let s = "A6";
  for (let i = 0; i < 4; i++) s += chars[Math.floor(Math.random() * chars.length)];
  return s;
}

// Coerce a legacy credit value to a safe non-negative integer; null = unparseable.
function safeCredits(raw: unknown): number | null {
  const n = Number(raw ?? 0);
  if (!Number.isFinite(n)) return null;
  return Math.max(0, Math.trunc(n));
}

async function migrateUsers() {
  const snap = await fs.collection("users").get();
  let created = 0;
  let updated = 0;
  let skipped = 0;
  for (const doc of snap.docs) {
    const d = doc.data();
    const credits = safeCredits(d.credits);
    if (credits === null) {
      console.warn(`! skip user ${doc.id}: invalid credits value ${JSON.stringify(d.credits)}`);
      skipped++;
      continue;
    }
    const role = d.role === "admin" ? "admin" : "user";
    const existing = await prisma.user.findUnique({ where: { legacyUid: doc.id } });

    if (existing) {
      // Re-run: refresh profile ONLY. Never touch credits (server is authoritative now).
      await prisma.user.update({
        where: { legacyUid: doc.id },
        data: {
          email: d.email ?? undefined,
          name: d.displayName ?? undefined,
          image: d.photoURL ?? undefined,
          role,
          lastActiveAt: d.lastActive?.toDate?.() ?? new Date(),
        },
      });
      updated++;
    } else {
      // First import: set credits + write the matching ledger row. Preserve the
      // existing A6 id so customers keep the id they already know.
      await prisma.user.create({
        data: {
          legacyUid: doc.id,
          legacyUserId: d.userId ?? undefined,
          shortId: d.userId || genShortId(),
          email: d.email ?? undefined,
          emailVerified: d.emailVerified === true, // real flag, not mere presence
          name: d.displayName ?? undefined,
          image: d.photoURL ?? undefined,
          role,
          isAnonymous: false,
          credits,
          ledger: {
            create: {
              delta: credits,
              balanceAfter: credits,
              reason: CreditReason.ADMIN_GRANT,
              note: "migrated from Firestore",
            },
          },
        },
      });
      created++;
    }
  }
  console.log(`✓ users: ${created} created, ${updated} profile-refreshed, ${skipped} skipped`);
}

async function migrateGuests() {
  if (!MIGRATE_GUEST_FINGERPRINTS) return;
  const snap = await fs.collection("device_fingerprints").get();
  let created = 0;
  let skipped = 0;
  for (const doc of snap.docs) {
    const d = doc.data();
    const credits = safeCredits(d.credits);
    if (credits === null || credits <= 0) {
      skipped++;
      continue; // nothing worth carrying
    }
    // Namespace guest keys ("fp:") so they can NEVER collide with a registered
    // user's legacyUserId (which is the A6-style d.userId).
    const guestKey = `fp:${doc.id}`;
    const existing = await prisma.user.findUnique({ where: { legacyUserId: guestKey } });
    if (existing) {
      skipped++; // already imported — leave its (possibly spent) balance alone
      continue;
    }
    await prisma.user.create({
      data: {
        legacyUserId: guestKey,
        shortId: d.shortId || genShortId(),
        isAnonymous: true,
        credits,
        ledger: {
          create: {
            delta: credits,
            balanceAfter: credits,
            reason: CreditReason.SIGNUP_BONUS,
            note: "migrated guest fingerprint",
          },
        },
      },
    });
    created++;
  }
  console.log(`✓ guests: ${created} created, ${skipped} skipped`);
}

async function main() {
  await migrateUsers();
  await migrateGuests();
  await prisma.$disconnect();
  console.log("Migration complete.");
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
