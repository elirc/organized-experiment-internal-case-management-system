/*
 * What this file does:
 * Lists visible cases and creates new cases.
 * What calls it:
 * `src/hooks/useCases.ts`.
 * What it calls:
 * `src/lib/middleware/withAuth.ts`, `src/lib/validation/caseSchemas.ts`, `src/services/caseService.ts`, and `src/lib/http/handle-route-error.ts`.
 * One thing a junior engineer would likely get wrong:
 * Letting list filters and create payloads share one loose type, which usually causes accidental over-posting.
 */
import { created, ok } from "@/lib/http/responses";
import { handleRouteError } from "@/lib/http/handle-route-error";
import { withAuth } from "@/lib/middleware/withAuth";
import { caseListQuerySchema, createCaseSchema } from "@/lib/validation/caseSchemas";
import { parseOrThrow } from "@/lib/validation/parse";
import { createCase, listVisibleCases } from "@/services/caseService";

export const GET = withAuth(async (request, actor) => {
  try {
    const input = parseOrThrow(
      caseListQuerySchema,
      Object.fromEntries(request.nextUrl.searchParams.entries()),
    );
    const result = await listVisibleCases(actor, input);

    return ok(result);
  } catch (error) {
    return handleRouteError(error);
  }
});

export const POST = withAuth(async (request, actor) => {
  try {
    const body = await request.json();
    const input = parseOrThrow(createCaseSchema, body);
    const result = await createCase(actor, input);

    return created(result);
  } catch (error) {
    return handleRouteError(error);
  }
});
