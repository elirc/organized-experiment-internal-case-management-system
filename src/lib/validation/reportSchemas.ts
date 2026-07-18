/*
 * What this file does:
 * Defines report query filters so aggregate endpoints reject malformed filters before querying the database.
 * What calls it:
 * `src/app/api/reports/queue-summary/route.ts`.
 * What it calls:
 * Zod only.
 * One thing a junior engineer would likely get wrong:
 * Treating query strings as trusted values and pushing them directly into aggregation queries.
 */
import { z } from "zod";

export const queueSummaryQuerySchema = z.object({
  teamId: z.string().cuid().optional(),
});
