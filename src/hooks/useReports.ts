/*
 * What this file does:
 * Fetches queue summary data and triggers the escalation sweep action.
 * What calls it:
 * `src/components/reports/QueueSummary.tsx`.
 * What it calls:
 * `src/lib/http/client.ts` plus report and admin API routes.
 * One thing a junior engineer would likely get wrong:
 * Mutating operational data without invalidating the report query that depends on it.
 */
"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { requestJson } from "@/lib/http/client";
import type { QueueSummaryResponse } from "@/types/reports";

export function useQueueSummary() {
  return useQuery({
    queryKey: ["reports", "queue-summary"],
    queryFn: () => requestJson<QueueSummaryResponse>("/api/reports/queue-summary"),
  });
}

export function useRunEscalationSweep() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () =>
      requestJson<{ createdCount: number }>("/api/admin/escalation-sweeps", {
        method: "POST",
      }),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["reports", "queue-summary"] }),
        queryClient.invalidateQueries({ queryKey: ["cases"] }),
      ]);
    },
  });
}
