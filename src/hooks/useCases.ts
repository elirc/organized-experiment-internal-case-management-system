/*
 * What this file does:
 * Owns list/create case client interactions and cache invalidation.
 * What calls it:
 * `src/app/cases/page.tsx`, `src/components/cases/CreateCaseForm.tsx`, and `src/components/cases/CaseTable.tsx`.
 * What it calls:
 * `src/lib/http/client.ts` and `/api/cases`.
 * One thing a junior engineer would likely get wrong:
 * Forgetting to invalidate both the list and the detail cache after a mutation, leaving the UI internally inconsistent.
 */
"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { requestJson } from "@/lib/http/client";
import type { CaseDetail, CaseListResponse } from "@/types/cases";

type CreateCaseInput = {
  title: string;
  description: string;
  priority: string;
  severity: number;
  requesterName: string;
  requesterEmail?: string;
  sourceSystem?: string;
  owningTeamId: string;
  assignedToId?: string;
};

export function useCases() {
  return useQuery({
    queryKey: ["cases"],
    queryFn: () => requestJson<CaseListResponse>("/api/cases"),
  });
}

export function useCreateCase() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateCaseInput) =>
      requestJson<CaseDetail>("/api/cases", {
        method: "POST",
        body: JSON.stringify(input),
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["cases"] });
    },
  });
}
