// Compatibility shim: the old code imported `auth`/`googleProvider` from here.
// We map the small surface still used (UserAccount sign-out) onto Better Auth.
import { signOut as baSignOut } from '@/lib/auth-client';

export const googleProvider = { providerId: 'google' as const };

export const auth = {
  currentUser: null as null,
  async signOut() {
    await baSignOut();
  },
};
