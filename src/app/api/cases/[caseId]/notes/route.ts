/*
 * What this file does:
 * Adds timeline notes to a case, including restricted notes for privileged roles.
 * What calls it:
 * `src/hooks/useCaseDetail.ts`.
 * What it calls:
 * `src/lib/middleware/withAuth.ts`, `src/lib/validation/caseSchemas.ts`, `src/services/caseService.ts`, and `src/lib/http/handle-route-error.ts`.
 * One thing a junior engineer would likely get wrong:
 * Handling restricted-note rules in the UI only, which would be bypassed by direct API calls.
 */
import { created } from "@/lib/http/responses";
import { handleRouteError } from "@/lib/http/handle-route-error";
import { withAuth } from "@/lib/middleware/withAuth";
import { createNoteSchema } from "@/lib/validation/caseSchemas";
import { parseOrThrow } from "@/lib/validation/parse";
import { addCaseNote } from "@/services/caseService";

type RouteContext = {
  params: Promise<{
    caseId: string;
  }>;
};

export const POST = withAuth<RouteContext>(async (request, actor, context) => {
  try {
    const { caseId } = await context.params;
    const body = await request.json();
    const input = parseOrThrow(createNoteSchema, body);
    const result = await addCaseNote(actor, caseId, input);

    return created(result);
  } catch (error) {
    return handleRouteError(error);
  }
});
