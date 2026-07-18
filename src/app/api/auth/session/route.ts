/*
 * What this file does:
 * Returns the current authenticated user so the client can bootstrap navigation and permissions.
 * What calls it:
 * `src/hooks/useSession.ts`.
 * What it calls:
 * `src/lib/auth/session.ts` and `src/lib/http/responses.ts`.
 * One thing a junior engineer would likely get wrong:
 * Throwing on missing session instead of returning a stable `user: null` shape the client can render around.
 */
import { getSessionActor } from "@/lib/auth/session";
import { ok } from "@/lib/http/responses";

export async function GET() {
  const user = await getSessionActor();

  return ok({ user });
}
