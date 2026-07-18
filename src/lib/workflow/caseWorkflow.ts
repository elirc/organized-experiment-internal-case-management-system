/*
 * What this file does:
 * Declares allowed case status transitions and the extra business rules tied to sensitive transitions.
 * What calls it:
 * `src/services/caseService.ts` and tests that verify workflow safety.
 * What it calls:
 * No external modules; this file is intentionally pure for testability.
 * One thing a junior engineer would likely get wrong:
 * Validating only the target status and forgetting that validity depends on the current status too.
 */
import { CaseStatus } from "@prisma/client";

export const allowedTransitions: Record<CaseStatus, CaseStatus[]> = {
  NEW: [CaseStatus.TRIAGED, CaseStatus.CANCELLED],
  TRIAGED: [CaseStatus.IN_PROGRESS, CaseStatus.WAITING_EXTERNAL, CaseStatus.CANCELLED],
  IN_PROGRESS: [CaseStatus.WAITING_EXTERNAL, CaseStatus.ESCALATED, CaseStatus.RESOLVED, CaseStatus.CANCELLED],
  WAITING_EXTERNAL: [CaseStatus.IN_PROGRESS, CaseStatus.ESCALATED, CaseStatus.CANCELLED],
  ESCALATED: [CaseStatus.IN_PROGRESS, CaseStatus.RESOLVED, CaseStatus.CANCELLED],
  RESOLVED: [CaseStatus.IN_PROGRESS, CaseStatus.CLOSED],
  CLOSED: [],
  CANCELLED: [],
};

export class InvalidTransitionError extends Error {
  status = 422;

  constructor(message: string) {
    super(message);
    this.name = "InvalidTransitionError";
  }
}

export function assertAllowedTransition(currentStatus: CaseStatus, nextStatus: CaseStatus) {
  const nextStatuses = allowedTransitions[currentStatus];

  // ⚠️ SENIOR NOTE: Transition safety depends on the edge, not the destination alone; `CLOSED` is fine from `RESOLVED` and unsafe from `NEW`.
  if (!nextStatuses.includes(nextStatus)) {
    throw new InvalidTransitionError(`Cannot move a case from ${currentStatus} to ${nextStatus}.`);
  }
}
