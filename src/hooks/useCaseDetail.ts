/*
 * What this file does:
 * Handles detail-level case queries and mutations for notes, deadlines, attachments, and status transitions.
 * What calls it:
 * `src/app/cases/[caseId]/page.tsx` and `src/components/cases/CaseDetailView.tsx`.
 * What it calls:
 * `src/lib/http/client.ts` and `/api/cases/[caseId]` sub-routes.
 * One thing a junior engineer would likely get wrong:
 * Splitting each child mutation into isolated state without a shared cache key, which makes detail pages drift after mutations.
 */
"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { requestJson } from "@/lib/http/client";
import type { CaseDetail } from "@/types/cases";
import type { CaseStatusValue } from "@/types/domain";

function caseDetailKey(caseId: string) {
  return ["cases", caseId];
}

export function useCaseDetail(caseId: string) {
  return useQuery({
    queryKey: caseDetailKey(caseId),
    queryFn: () => requestJson<CaseDetail>(`/api/cases/${caseId}`),
  });
}

function useCaseMutation<TInput, TOutput>(caseId: string, path: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: TInput) =>
      requestJson<TOutput>(path, {
        method: "POST",
        body: JSON.stringify(input),
      }),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["cases"] }),
        queryClient.invalidateQueries({ queryKey: caseDetailKey(caseId) }),
      ]);
    },
  });
}

export function useAddCaseNote(caseId: string) {
  return useCaseMutation<{ body: string; isRestricted: boolean }, unknown>(
    caseId,
    `/api/cases/${caseId}/notes`,
  );
}

export function useAddCaseAttachment(caseId: string) {
  return useCaseMutation<
    { fileName: string; storageKey: string; contentType: string; fileSizeBytes: number },
    unknown
  >(caseId, `/api/cases/${caseId}/attachments`);
}

export function useAddCaseDeadline(caseId: string) {
  return useCaseMutation<{ label: string; dueAt: string }, unknown>(
    caseId,
    `/api/cases/${caseId}/deadlines`,
  );
}

export function useTransitionCase(caseId: string) {
  return useCaseMutation<{ nextStatus: CaseStatusValue; comment?: string }, CaseDetail>(
    caseId,
    `/api/cases/${caseId}/transition`,
  );
}
