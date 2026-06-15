import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { initPayment } from "@/lib/moneroo";
import { PACKS, isPackId } from "@/lib/packs";

// Start a Moneroo checkout for a credit pack. Requires a real (non-anonymous) account.
export async function POST(req: NextRequest) {
  const session = await auth.api.getSession({ headers: req.headers });
  if (!session || session.user.isAnonymous) {
    return NextResponse.json({ error: "AUTH_REQUIRED" }, { status: 401 });
  }

  const { packId } = (await req.json()) as { packId: string };
  if (!isPackId(packId)) {
    return NextResponse.json({ error: "INVALID_PACK" }, { status: 400 });
  }
  const pack = PACKS[packId];
  const user = session.user;
  const name = (user.name || "A6ko User").trim();
  const [first, ...rest] = name.split(" ");

  try {
    const baseUrl = process.env.BETTER_AUTH_URL || new URL(req.url).origin;
    const { id, checkoutUrl } = await initPayment({
      amount: pack.amount,
      currency: pack.currency,
      description: `${pack.label} — ${pack.credits} crédits`,
      returnUrl: `${baseUrl}/?payment=processing`,
      customer: {
        email: user.email,
        first_name: first || "A6ko",
        last_name: rest.join(" ") || "User",
      },
      metadata: [
        { key: "userId", value: user.id },
        { key: "packId", value: packId },
      ],
    });

    // Record the intent. Credits are granted later by the verified webhook.
    await prisma.payment.create({
      data: {
        userId: user.id,
        provider: "moneroo",
        externalRef: id,
        packId,
        amount: pack.amount,
        currency: pack.currency,
        creditsGranted: pack.credits,
        status: "INITIATED",
      },
    });

    return NextResponse.json({ checkoutUrl });
  } catch (e: any) {
    console.error("[checkout] failed:", e);
    return NextResponse.json({ error: "CHECKOUT_FAILED" }, { status: 502 });
  }
}
