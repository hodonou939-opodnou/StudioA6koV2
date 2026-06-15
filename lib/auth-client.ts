"use client";

import { createAuthClient } from "better-auth/react";
import {
  anonymousClient,
  adminClient,
  genericOAuthClient,
} from "better-auth/client/plugins";

export const authClient = createAuthClient({
  plugins: [anonymousClient(), adminClient(), genericOAuthClient()],
});

export const { signIn, signOut, useSession } = authClient;

/** Ensure every visitor has at least an anonymous session + their 3 free credits. */
export async function ensureAnonymousSession() {
  const { data } = await authClient.getSession();
  if (!data?.session) {
    await authClient.signIn.anonymous();
  }
}
