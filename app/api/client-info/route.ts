import { NextRequest, NextResponse } from "next/server";

// Ported from the old server.ts — returns the real client IP.
export async function GET(req: NextRequest) {
  const h = req.headers;
  const raw =
    h.get("cf-connecting-ip") ||
    h.get("x-real-ip") ||
    h.get("x-forwarded-for") ||
    h.get("fastly-client-ip") ||
    h.get("true-client-ip") ||
    "unknown";
  const ip = raw.split(",")[0].trim();
  return NextResponse.json({ ip });
}
