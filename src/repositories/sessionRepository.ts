/*
 * What this file does:
 * Owns persistence for login sessions and session-to-user lookup.
 * What calls it:
 * `src/lib/auth/session.ts` and `src/services/authService.ts`.
 * What it calls:
 * `src/lib/db.ts`.
 * One thing a junior engineer would likely get wrong:
 * Returning session records without joining the user, which leads to duplicate lookups and inconsistent auth state.
 */
import { db } from "@/lib/db";
import { type AuthenticatedActor } from "@/lib/auth/authorize";

export async function createSession(input: { tokenHash: string; userId: string; expiresAt: Date }) {
  return db.session.create({
    data: input,
  });
}

export async function findSessionByToken(tokenHash: string): Promise<AuthenticatedActor | null> {
  const session = await db.session.findUnique({
    where: {
      tokenHash,
    },
    include: {
      user: true,
    },
  });

  if (!session || session.expiresAt < new Date()) {
    return null;
  }

  // ⚠️ SENIOR NOTE: Returning only the actor shape prevents route code from depending on session internals like token hashes or expiry math.
  return {
    id: session.user.id,
    email: session.user.email,
    name: session.user.name,
    role: session.user.role,
    teamId: session.user.teamId,
  };
}

export async function invalidateSession(tokenHash: string) {
  await db.session.deleteMany({
    where: {
      tokenHash,
    },
  });
}
