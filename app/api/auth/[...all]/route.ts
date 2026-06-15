import { auth } from "@/lib/auth";
import { toNextJsHandler } from "better-auth/next-js";

// Single catch-all handler for every Better Auth endpoint
// (/api/auth/sign-in, /callback, /session, anonymous, admin, ...).
export const { GET, POST } = toNextJsHandler(auth);
