/*
 * What this file does:
 * Triggers the overdue-deadline escalation sweep.
 * What calls it:
 * `src/components/reports/QueueSummary.tsx`.
 * What it calls:
 * `src/lib/middleware/withAuth.ts`, `src/services/escalationService.ts`, and `src/lib/http/handle-route-error.ts`.
 * One thing a junior engineer would likely get wrong:
 * Exposing operational batch jobs without explicit permission checks because "only staff know the URL."
 */
import { ok } from "@/lib/http/responses";
import { handleRouteError } from "@/lib/http/handle-route-error";
import { withAuth } from "@/lib/middleware/withAuth";
import { runEscalationSweep } from "@/services/escalationService";

export const POST = withAuth(async (_request, actor) => {
  try {
    const result = await runEscalationSweep(actor);
    return ok(result);
  } catch (error) {
    return handleRouteError(error);
  }
});
