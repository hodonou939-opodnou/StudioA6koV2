import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { admin, anonymous } from "better-auth/plugins";
import { genericOAuth } from "better-auth/plugins";
import { prisma } from "./db";
import { claimAnonymousCredits } from "./credits";

// Public "A6" + 4-char id, generated at first visit (every new user, incl. anonymous).
function genShortId(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no ambiguous 0/O/1/I
  let s = "A6";
  for (let i = 0; i < 4; i++) s += chars[Math.floor(Math.random() * chars.length)];
  return s;
}

export const auth = betterAuth({
  database: prismaAdapter(prisma, { provider: "postgresql" }),

  // Declare custom user fields so Better Auth persists them (it strips unknown ones).
  user: {
    additionalFields: {
      shortId: { type: "string", required: false, input: false },
    },
  },

  // Stamp every new user with their permanent A6 id at creation.
  databaseHooks: {
    user: {
      create: {
        before: async (user) => ({ data: { ...user, shortId: genShortId() } }),
      },
    },
  },

  // Only enable a provider when its credentials are present — so unconfigured
  // ones don't spam warnings, and login buttons appear automatically as you
  // add each provider's keys (Google now; Facebook/TikTok when approved).
  socialProviders: buildSocialProviders(),

  plugins: [
    // Lets a visitor use the app + spend free credits with NO account.
    // When they later sign in, onLinkAccount fires and we carry their
    // credits + activity over to the real account permanently.
    anonymous({
      emailDomainName: "guest.a6ko.com",
      onLinkAccount: async ({ anonymousUser, newUser }) => {
        await claimAnonymousCredits(anonymousUser.user.id, newUser.user.id);
      },
    }),

    // Admin dashboard backing: roles, ban, impersonate, list/manage users.
    admin({
      adminRoles: ["admin"],
    }),

    // TikTok via generic OAuth (only when configured). Instagram intentionally
    // omitted: Meta deprecated standalone consumer Instagram login (Dec 2024).
    ...(process.env.TIKTOK_CLIENT_KEY
      ? [
          genericOAuth({
            config: [
              {
                providerId: "tiktok",
                clientId: process.env.TIKTOK_CLIENT_KEY!,
                clientSecret: process.env.TIKTOK_CLIENT_SECRET!,
                authorizationUrl: "https://www.tiktok.com/v2/auth/authorize/",
                tokenUrl: "https://open.tiktokapis.com/v2/oauth/token/",
                userInfoUrl: "https://open.tiktokapis.com/v2/user/info/",
                scopes: ["user.info.basic"],
              },
            ],
          }),
        ]
      : []),
  ],
});

// Build only the social providers whose credentials exist.
function buildSocialProviders() {
  const p: Record<string, { clientId: string; clientSecret: string }> = {};
  if (process.env.GOOGLE_CLIENT_ID)
    p.google = { clientId: process.env.GOOGLE_CLIENT_ID, clientSecret: process.env.GOOGLE_CLIENT_SECRET! };
  if (process.env.APPLE_CLIENT_ID)
    p.apple = { clientId: process.env.APPLE_CLIENT_ID, clientSecret: process.env.APPLE_CLIENT_SECRET! };
  if (process.env.FACEBOOK_CLIENT_ID)
    p.facebook = { clientId: process.env.FACEBOOK_CLIENT_ID, clientSecret: process.env.FACEBOOK_CLIENT_SECRET! };
  return p;
}

// Which providers are enabled (for the login UI to render only available buttons).
export function enabledProviders(): string[] {
  const list: string[] = [];
  if (process.env.GOOGLE_CLIENT_ID) list.push("google");
  if (process.env.APPLE_CLIENT_ID) list.push("apple");
  if (process.env.FACEBOOK_CLIENT_ID) list.push("facebook");
  if (process.env.TIKTOK_CLIENT_KEY) list.push("tiktok");
  return list;
}

export type Session = typeof auth.$Infer.Session;
