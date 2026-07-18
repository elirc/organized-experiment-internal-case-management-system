/*
 * What this file does:
 * Creates due dates for a case and keeps deadline writes inside the same service boundary as status logic.
 * What calls it:
 * `src/hooks/useCaseDetail.ts`.
 * What it calls:
 * `src/lib/middleware/withAuth.ts`, `src/lib/validation/caseSchemas.ts`, `src/services/caseService.ts`, and `src/lib/http/handle-route-error.ts`.
 * One thing a junior engineer would likely get wrong:
 * Updating deadlines directly from the client because they look like a child list, even though they drive escalation behavior.
 */
import { created } from "@/lib/http/responses";
import { handleRouteError } from "@/lib/http/handle-route-error";
import { withAuth } from "@/lib/middleware/withAuth";
import { createDeadlineSchema } from "@/lib/validation/caseSchemas";
import { parseOrThrow } from "@/lib/validation/parse";
import { addCaseDeadline } from "@/services/caseService";

type RouteContext = {
  params: Promise<{
    caseId: string;
  }>;
};

export const POST = withAuth<RouteContext>(async (request, actor, context) => {
  try {
    const { caseId } = await context.params;
    const body = await request.json();
    const input = parseOrThrow(createDeadlineSchema, body);
    const result = await addCaseDeadline(actor, caseId, input);

    return created(result);
  } catch (error) {
    return handleRouteError(error);
  }
});
