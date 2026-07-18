/*
 * What this file does:
 * Clears the current session cookie and invalidates the session row.
 * What calls it:
 * `src/components/layout/AppShell.tsx`.
 * What it calls:
 * `src/lib/auth/session.ts` and `src/lib/http/responses.ts`.
 * One thing a junior engineer would likely get wrong:
 * Deleting the cookie without deleting the persisted session, which leaves stolen tokens alive.
 */
import { clearSessionCookie } from "@/lib/auth/session";
import { handleRouteError } from "@/lib/http/handle-route-error";
import { noContent } from "@/lib/http/responses";

export async function POST() {
  try {
    await clearSessionCookie();
    return noContent();
  } catch (error) {
    return handleRouteError(error);
  }
}
