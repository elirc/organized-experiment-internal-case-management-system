/*
 * What this file does:
 * Wraps route handlers with session lookup and consistent auth error handling.
 * What calls it:
 * API route files in `src/app/api/**/route.ts`.
 * What it calls:
 * `src/lib/auth/session.ts` and `src/lib/http/responses.ts`.
 * One thing a junior engineer would likely get wrong:
 * Repeating session parsing in every route and forgetting one endpoint, creating an unprotected gap.
 */
import { type NextRequest, NextResponse } from "next/server";

import { type AuthenticatedActor } from "@/lib/auth/authorize";
import { getSessionActor } from "@/lib/auth/session";
import { errorResponse } from "@/lib/http/responses";

export class AuthenticationError extends Error {
  status = 401;

  constructor(message = "Authentication is required.") {
    super(message);
    this.name = "AuthenticationError";
  }
}

type Handler<Context> = (
  request: NextRequest,
  actor: AuthenticatedActor,
  context: Context,
) => Promise<NextResponse>;

export function withAuth<Context = undefined>(handler: Handler<Context>) {
  return async function authenticatedHandler(request: NextRequest, context: Context) {
    const actor = await getSessionActor();

    if (!actor) {
      // ⚠️ SENIOR NOTE: Reject here before route logic runs, otherwise one forgotten early return turns into a partially unauthenticated endpoint.
      return errorResponse(401, "Authentication is required.");
    }

    return handler(request, actor, context);
  };
}
