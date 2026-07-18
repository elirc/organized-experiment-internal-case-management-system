/*
 * What this file does:
 * Adds attachment metadata to a case.
 * What calls it:
 * `src/hooks/useCaseDetail.ts`.
 * What it calls:
 * `src/lib/middleware/withAuth.ts`, `src/lib/validation/caseSchemas.ts`, `src/services/caseService.ts`, and `src/lib/http/handle-route-error.ts`.
 * One thing a junior engineer would likely get wrong:
 * Trusting the file upload client to send sane metadata rather than validating it at the API boundary.
 */
import { created } from "@/lib/http/responses";
import { handleRouteError } from "@/lib/http/handle-route-error";
import { withAuth } from "@/lib/middleware/withAuth";
import { createAttachmentSchema } from "@/lib/validation/caseSchemas";
import { parseOrThrow } from "@/lib/validation/parse";
import { addCaseAttachment } from "@/services/caseService";

type RouteContext = {
  params: Promise<{
    caseId: string;
  }>;
};

export const POST = withAuth<RouteContext>(async (request, actor, context) => {
  try {
    const { caseId } = await context.params;
    const body = await request.json();
    const input = parseOrThrow(createAttachmentSchema, body);
    const result = await addCaseAttachment(actor, caseId, input);

    return created(result);
  } catch (error) {
    return handleRouteError(error);
  }
});
