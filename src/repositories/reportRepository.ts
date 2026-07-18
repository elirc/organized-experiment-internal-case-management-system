/*
 * What this file does:
 * Contains aggregate queries used by operations and reporting screens.
 * What calls it:
 * `src/services/reportService.ts`.
 * What it calls:
 * `src/lib/db.ts`.
 * One thing a junior engineer would likely get wrong:
 * Forgetting to apply the same visibility scope used by list endpoints, which causes reporting leaks.
 */
import { Prisma } from "@prisma/client";

import { db } from "@/lib/db";

export async function getQueueSummary(where: Prisma.CaseWhereInput) {
  // ⚠️ SENIOR NOTE: Aggregate queries leak just as much as row queries if the caller forgets to pass the same scope filter.
  const [cases, overdueDeadlines, openEscalations] = await Promise.all([
    db.case.groupBy({
      by: ["status"],
      where,
      _count: {
        _all: true,
      },
    }),
    db.deadline.count({
      where: {
        status: "OPEN",
        dueAt: {
          lt: new Date(),
        },
        case: {
          is: where,
        },
      },
    }),
    db.escalation.count({
      where: {
        status: {
          not: "RESOLVED",
        },
        case: {
          is: where,
        },
      },
    }),
  ]);

  return {
    byStatus: cases,
    overdueDeadlines,
    openEscalations,
  };
}
