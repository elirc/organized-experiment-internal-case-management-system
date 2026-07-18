/*
 * What this file does:
 * Fetches or updates a single case while preserving auth, scope, and validation boundaries.
 * What calls it:
 * `src/hooks/useCaseDetail.ts`.
 * What it calls:
 * `src/lib/middleware/withAuth.ts`, `src/lib/validation/caseSchemas.ts`, `src/services/caseService.ts`, and `src/lib/http/handle-route-error.ts`.
 * One thing a junior engineer would likely get wrong:
 * Re-implementing case lookup logic here instead of delegating to the service that already knows the permission rules.
 */
import { ok } from "@/lib/http/responses";
import { handleRouteError } from "@/lib/http/handle-route-error";
import { withAuth } from "@/lib/middleware/withAuth";
import { updateCaseSchema } from "@/lib/validation/caseSchemas";
import { parseOrThrow } from "@/lib/validation/parse";
import { getCaseDetail, updateCase } from "@/services/caseService";

type RouteContext = {
  params: Promise<{
    caseId: string;
  }>;
};

export const GET = withAuth<RouteContext>(async (_request, actor, context) => {
  try {
    const { caseId } = await context.params;
    const result = await getCaseDetail(actor, caseId);

    return ok(result);
  } catch (error) {
    return handleRouteError(error);
  }
});

export const PATCH = withAuth<RouteContext>(async (request, actor, context) => {
  try {
    const { caseId } = await context.params;
    const body = await request.json();
    const input = parseOrThrow(updateCaseSchema, body);
    const result = await updateCase(actor, caseId, input);

    return ok(result);
  } catch (error) {
    return handleRouteError(error);
  }
});
