/*
 * What this file does:
 * Returns users who can be assigned within a specific team.
 * What calls it:
 * `src/hooks/useReferenceData.ts`.
 * What it calls:
 * `src/lib/middleware/withAuth.ts`, `src/services/referenceDataService.ts`, and `src/lib/http/handle-route-error.ts`.
 * One thing a junior engineer would likely get wrong:
 * Forgetting that even read-only helper endpoints still need team scoping.
 */
import { ok } from "@/lib/http/responses";
import { handleRouteError } from "@/lib/http/handle-route-error";
import { withAuth } from "@/lib/middleware/withAuth";
import { getAssignableUserOptions } from "@/services/referenceDataService";

export const GET = withAuth(async (request, actor) => {
  try {
    const teamId = request.nextUrl.searchParams.get("teamId");

    if (!teamId) {
      return ok({ items: [] });
    }

    const users = await getAssignableUserOptions(actor, teamId);
    return ok({ items: users });
  } catch (error) {
    return handleRouteError(error);
  }
});
