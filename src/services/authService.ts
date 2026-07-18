/*
 * What this file does:
 * Implements credential login and session creation.
 * What calls it:
 * `src/app/api/auth/login/route.ts`.
 * What it calls:
 * `src/repositories/userRepository.ts`, `src/repositories/sessionRepository.ts`, `src/lib/auth/password.ts`, and `src/lib/auth/session.ts`.
 * One thing a junior engineer would likely get wrong:
 * Returning different error messages for unknown email versus bad password, which leaks valid account existence.
 */
import { addDays } from "date-fns";

import { createRawSessionToken, hashSessionToken, setSessionCookie } from "@/lib/auth/session";
import { verifyPassword } from "@/lib/auth/password";
import { AuthenticationError } from "@/lib/middleware/withAuth";
import { createSession } from "@/repositories/sessionRepository";
import { findUserByEmail } from "@/repositories/userRepository";

export async function loginUser(input: { email: string; password: string }) {
  const user = await findUserByEmail(input.email);

  if (!user) {
    throw new AuthenticationError("Invalid email or password.");
  }

  const isValidPassword = await verifyPassword(input.password, user.passwordHash);

  if (!isValidPassword) {
    throw new AuthenticationError("Invalid email or password.");
  }

  // ⚠️ SENIOR NOTE: Using the same failure message for both checks avoids leaking which emails exist in the system.
  const rawToken = createRawSessionToken();
  const expiresAt = addDays(new Date(), 7);

  await createSession({
    tokenHash: hashSessionToken(rawToken),
    userId: user.id,
    expiresAt,
  });

  await setSessionCookie(rawToken, expiresAt);

  return {
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      teamId: user.teamId,
    },
  };
}
