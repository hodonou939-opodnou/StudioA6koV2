import type { UserState } from '../types';

// Credit/user persistence now lives server-side (Postgres via /api/credits and the
// credit engine). This is kept as a no-op so existing imports continue to resolve.
export const syncUserToFirestore = async (_state: UserState) => {
  /* no-op: server is the source of truth */
};
