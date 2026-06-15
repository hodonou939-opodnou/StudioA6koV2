import { NextResponse } from "next/server";
import { enabledProviders } from "@/lib/auth";

// Public: tells the login modal which SSO buttons to show (only configured ones).
export async function GET() {
  return NextResponse.json({ providers: enabledProviders() });
}
