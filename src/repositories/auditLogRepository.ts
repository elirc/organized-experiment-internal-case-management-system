/*
 * What this file does:
 * Persists audit log entries so workflow changes are traceable after the fact.
 * What calls it:
 * `src/services/caseService.ts` and `src/services/escalationService.ts`.
 * What it calls:
 * `src/lib/db.ts` and Prisma transaction clients.
 * One thing a junior engineer would likely get wrong:
 * Logging after a transaction commits, which creates missing or misleading audit history on rollback.
 */
import { Prisma } from "@prisma/client";

import { db } from "@/lib/db";

type DatabaseClient = typeof db | Prisma.TransactionClient;

export async function createAuditLog(client: DatabaseClient, data: Prisma.AuditLogUncheckedCreateInput) {
  // ⚠️ SENIOR NOTE: Audit writes should share the caller's transaction so they disappear on rollback with the business write.
  return client.auditLog.create({
    data,
  });
}
