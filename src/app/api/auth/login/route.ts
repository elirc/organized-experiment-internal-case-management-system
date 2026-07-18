/*
 * What this file does:
 * Accepts login credentials, validates them, and starts a cookie-backed session.
 * What calls it:
 * `src/components/auth/LoginForm.tsx`.
 * What it calls:
 * `src/lib/validation/authSchemas.ts`, `src/services/authService.ts`, and `src/lib/http/handle-route-error.ts`.
 * One thing a junior engineer would likely get wrong:
 * Calling the auth service before validation and making password handling harder to reason about.
 */
import { created } from "@/lib/http/responses";
import { handleRouteError } from "@/lib/http/handle-route-error";
import { loginSchema } from "@/lib/validation/authSchemas";
import { parseOrThrow } from "@/lib/validation/parse";
import { loginUser } from "@/services/authService";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const input = parseOrThrow(loginSchema, body);
    const session = await loginUser(input);

    return created(session);
  } catch (error) {
    return handleRouteError(error);
  }
}
