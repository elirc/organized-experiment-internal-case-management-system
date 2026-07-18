/*
 * What this file does:
 * Applies explicit case status transitions through the workflow service.
 * What calls it:
 * `src/hooks/useCaseDetail.ts`.
 * What it calls:
 * `src/lib/middleware/withAuth.ts`, `src/lib/validation/caseSchemas.ts`, `src/services/caseService.ts`, and `src/lib/http/handle-route-error.ts`.
 * One thing a junior engineer would likely get wrong:
 * Treating status as a plain update field rather than a workflow edge that deserves its own route and validation.
 */
import { ok } from "@/lib/http/responses";
import { handleRouteError } from "@/lib/http/handle-route-error";
import { withAuth } from "@/lib/middleware/withAuth";
import { parseOrThrow } from "@/lib/validation/parse";
import { transitionCaseSchema } from "@/lib/validation/caseSchemas";
import { transitionCase } from "@/services/caseService";

type RouteContext = {
  params: Promise<{
    caseId: string;
  }>;
};

export const POST = withAuth<RouteContext>(async (request, actor, context) => {
  try {
    const { caseId } = await context.params;
    const body = await request.json();
    const input = parseOrThrow(transitionCaseSchema, body);
    const result = await transitionCase(actor, caseId, input);

    return ok(result);
  } catch (error) {
    return handleRouteError(error);
  }
});
