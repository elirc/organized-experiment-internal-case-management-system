/*
 * What this file does:
 * Loads teams and assignment options for forms.
 * What calls it:
 * `src/components/cases/CreateCaseForm.tsx`.
 * What it calls:
 * `src/lib/http/client.ts` and reference-data API routes.
 * One thing a junior engineer would likely get wrong:
 * Fetching assignment options eagerly for every team, which creates needless traffic and stale dropdown state.
 */
"use client";

import { useQuery } from "@tanstack/react-query";

import { requestJson } from "@/lib/http/client";
import type { AssignableUserOption, TeamOption } from "@/types/reference";

export function useTeams() {
  return useQuery({
    queryKey: ["reference-data", "teams"],
    queryFn: () => requestJson<{ items: TeamOption[] }>("/api/reference-data/teams"),
  });
}

export function useAssignableUsers(teamId?: string) {
  return useQuery({
    queryKey: ["reference-data", "assignable-users", teamId],
    enabled: Boolean(teamId),
    queryFn: () =>
      requestJson<{ items: AssignableUserOption[] }>(
        `/api/reference-data/assignable-users?teamId=${teamId}`,
      ),
  });
}
