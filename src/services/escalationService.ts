/*
 * What this file does:
 * Runs the overdue-deadline sweep that creates operational escalations asynchronously.
 * What calls it:
 * `src/app/api/admin/escalation-sweeps/route.ts`.
 * What it calls:
 * `src/lib/auth/authorize.ts`, `src/repositories/caseRepository.ts`, `src/repositories/auditLogRepository.ts`, and `src/lib/db.ts`.
 * One thing a junior engineer would likely get wrong:
 * Creating escalations in a loop without a transaction, which leaves mismatched deadline and case state when a later write fails.
 */
import { CaseStatus } from "@prisma/client";

import { ensurePermission, type AuthenticatedActor } from "@/lib/auth/authorize";
import { db } from "@/lib/db";
import { createAuditLog } from "@/repositories/auditLogRepository";
import {
  createEscalationRecord,
  findOverdueDeadlinesWithoutEscalation,
  updateCaseRecord,
  updateDeadlineRecord,
} from "@/repositories/caseRepository";

export async function runEscalationSweep(actor: AuthenticatedActor) {
  ensurePermission(actor, "admin:run-escalation");
  const overdueDeadlines = await findOverdueDeadlinesWithoutEscalation();

  const escalations = [];

  for (const deadline of overdueDeadlines) {
    // ⚠️ SENIOR NOTE: Each deadline is handled in its own transaction so one bad record does not poison the whole sweep.
    const escalation = await db.$transaction(async (tx) => {
      const createdEscalation = await createEscalationRecord(tx, {
        caseId: deadline.caseId,
        raisedById: actor.id,
        triggeredByDeadlineId: deadline.id,
        reason: `Deadline "${deadline.label}" passed without completion.`,
      });

      await updateDeadlineRecord(tx, deadline.id, {
        status: "MISSED",
        resolvedAt: new Date(),
      });

      if (deadline.case.status !== CaseStatus.ESCALATED) {
        await updateCaseRecord(tx, deadline.caseId, {
          status: CaseStatus.ESCALATED,
        });
      }

      await createAuditLog(tx, {
        caseId: deadline.caseId,
        actorId: actor.id,
        action: "case.escalation_auto_created",
        entityType: "escalation",
        entityId: createdEscalation.id,
        metadata: {
          deadlineId: deadline.id,
        },
      });

      return createdEscalation;
    });

    escalations.push(escalation);
  }

  return {
    createdCount: escalations.length,
    escalations,
  };
}
