/*
 * What this file does:
 * Applies auth-aware scoping to aggregate operational reports.
 * What calls it:
 * `src/app/api/reports/queue-summary/route.ts`.
 * What it calls:
 * `src/lib/auth/authorize.ts` and `src/repositories/reportRepository.ts`.
 * One thing a junior engineer would likely get wrong:
 * Building one reporting path that ignores the same visibility rules enforced on detail endpoints.
 */
import { ensurePermission, buildCaseAccessWhere, type AuthenticatedActor } from "@/lib/auth/authorize";
import { getQueueSummary } from "@/repositories/reportRepository";

export async function getScopedQueueSummary(actor: AuthenticatedActor, input: { teamId?: string }) {
  ensurePermission(actor, "report:view");
  const baseScope = buildCaseAccessWhere(actor);

  // ⚠️ SENIOR NOTE: Team filters from the client are additive to auth scope, never a replacement for it.
  return getQueueSummary({
    ...baseScope,
    ...(input.teamId ? { owningTeamId: input.teamId } : {}),
  });
}
