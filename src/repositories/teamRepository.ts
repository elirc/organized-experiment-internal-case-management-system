/*
 * What this file does:
 * Handles lightweight team lookups for forms and ownership checks.
 * What calls it:
 * `src/services/referenceDataService.ts`.
 * What it calls:
 * `src/lib/db.ts`.
 * One thing a junior engineer would likely get wrong:
 * Returning teams without a stable sort, which makes dropdown ordering jitter between environments.
 */
import { db } from "@/lib/db";

export async function listTeams() {
  return db.team.findMany({
    select: {
      id: true,
      name: true,
      code: true,
    },
    orderBy: {
      name: "asc",
    },
  });
}
