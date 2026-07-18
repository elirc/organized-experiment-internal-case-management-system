/*
 * What this file does:
 * Returns queue-level aggregates for the reporting dashboard.
 * What calls it:
 * `src/hooks/useReports.ts`.
 * What it calls:
 * `src/lib/middleware/withAuth.ts`, `src/lib/validation/reportSchemas.ts`, `src/services/reportService.ts`, and `src/lib/http/handle-route-error.ts`.
 * One thing a junior engineer would likely get wrong:
 * Assuming aggregate data is less sensitive than row-level data and skipping auth checks.
 */
import { ok } from "@/lib/http/responses";
import { handleRouteError } from "@/lib/http/handle-route-error";
import { withAuth } from "@/lib/middleware/withAuth";
import { queueSummaryQuerySchema } from "@/lib/validation/reportSchemas";
import { parseOrThrow } from "@/lib/validation/parse";
import { getScopedQueueSummary } from "@/services/reportService";

export const GET = withAuth(async (request, actor) => {
  try {
    const input = parseOrThrow(
      queueSummaryQuerySchema,
      Object.fromEntries(request.nextUrl.searchParams.entries()),
    );
    const result = await getScopedQueueSummary(actor, input);

    return ok(result);
  } catch (error) {
    return handleRouteError(error);
  }
});
