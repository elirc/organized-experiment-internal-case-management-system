/*
 * What this file does:
 * Returns team options for scoped forms and filters.
 * What calls it:
 * `src/hooks/useReferenceData.ts`.
 * What it calls:
 * `src/lib/middleware/withAuth.ts`, `src/services/referenceDataService.ts`, and `src/lib/http/handle-route-error.ts`.
 * One thing a junior engineer would likely get wrong:
 * Returning all teams to all users and assuming the UI will hide the ones they should not use.
 */
import { ok } from "@/lib/http/responses";
import { handleRouteError } from "@/lib/http/handle-route-error";
import { withAuth } from "@/lib/middleware/withAuth";
import { getTeamOptions } from "@/services/referenceDataService";

export const GET = withAuth(async (_request, actor) => {
  try {
    const teams = await getTeamOptions(actor);
    return ok({ items: teams });
  } catch (error) {
    return handleRouteError(error);
  }
});
