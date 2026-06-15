import { NextRequest, NextResponse } from "next/server";
import { auth } from "./auth";

// Returns the admin session, or a 401/403 response to short-circuit the route.
export async function requireAdmin(req: NextRequest) {
  const session = await auth.api.getSession({ headers: req.headers });
  if (!session) {
    return { error: NextResponse.json({ error: "UNAUTHENTICATED" }, { status: 401 }) };
  }
  if (session.user.role !== "admin") {
    return { error: NextResponse.json({ error: "FORBIDDEN" }, { status: 403 }) };
  }
  return { session };
}
