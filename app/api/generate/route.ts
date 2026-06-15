import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { spend, refund, InsufficientCreditsError } from "@/lib/credits";
import { route, type GenerateRequest } from "@/lib/ai/router";
import { CREDIT_COSTS } from "@/lib/ai/models";
import { GenStatus } from "@prisma/client";

export async function POST(req: NextRequest) {
  const session = await auth.api.getSession({ headers: req.headers });

  // Gate: anonymous visitors filled the form freely, but the moment they
  // click "Lancer"/"Generate" we require a real account. The client catches
  // this 401, opens the login modal, holds the request, and resumes after auth.
  if (!session || session.user.isAnonymous) {
    return NextResponse.json({ error: "AUTH_REQUIRED" }, { status: 401 });
  }

  const userId = session.user.id;
  const body = (await req.json()) as GenerateRequest;
  const cost = CREDIT_COSTS[body.feature] ?? 1;

  // 1) Open a generation record up-front (audit + analytics).
  const gen = await prisma.generation.create({
    data: {
      userId,
      feature: body.feature,
      provider: body.provider,
      model: "pending",
      params: body.params as object,
      inputs: body.images ? { count: body.images.length } : undefined,
      creditCost: cost,
      status: GenStatus.PENDING,
    },
  });

  // 2) Reserve credits before doing expensive work.
  try {
    await spend(userId, cost, gen.id);
  } catch (e) {
    if (e instanceof InsufficientCreditsError) {
      await prisma.generation.update({
        where: { id: gen.id },
        data: { status: GenStatus.FAILED, errorCode: "INSUFFICIENT_CREDITS" },
      });
      return NextResponse.json({ error: "INSUFFICIENT_CREDITS" }, { status: 402 });
    }
    throw e;
  }

  // 3) Run the model. Refund automatically if it fails.
  const startedAt = Date.now();
  try {
    const result = await route(body);

    await prisma.$transaction([
      prisma.generation.update({
        where: { id: gen.id },
        data: {
          status: GenStatus.SUCCESS,
          model: result.model,
          outputUrl: result.imageUrl,
          latencyMs: result.latencyMs,
        },
      }),
      prisma.costEvent.create({
        data: {
          provider: body.provider,
          model: result.model,
          operation: "image.generate",
          costUsd: result.costUsd,
          generationId: gen.id,
        },
      }),
    ]);

    return NextResponse.json({ generationId: gen.id, imageUrl: result.imageUrl });
  } catch (err) {
    await refund(userId, cost, gen.id);
    await prisma.generation.update({
      where: { id: gen.id },
      data: {
        status: GenStatus.FAILED,
        latencyMs: Date.now() - startedAt,
        errorCode: (err as Error).message?.slice(0, 120) ?? "GEN_FAILED",
      },
    });
    return NextResponse.json({ error: "GENERATION_FAILED" }, { status: 502 });
  }
}
