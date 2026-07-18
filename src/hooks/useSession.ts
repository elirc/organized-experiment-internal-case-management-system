/*
 * What this file does:
 * Fetches and caches the current authenticated user.
 * What calls it:
 * `src/components/layout/AppShell.tsx`, `src/app/page.tsx`, and `src/app/login/page.tsx`.
 * What it calls:
 * `src/lib/http/client.ts` and `/api/auth/session`.
 * One thing a junior engineer would likely get wrong:
 * Reading auth state from local component state, which drifts out of sync after login/logout mutations.
 */
"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { requestJson } from "@/lib/http/client";
import type { SessionResponse } from "@/types/auth";

export function useSession() {
  return useQuery({
    queryKey: ["session"],
    queryFn: () => requestJson<SessionResponse>("/api/auth/session"),
  });
}

export function useLogout() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () =>
      requestJson<void>("/api/auth/logout", {
        method: "POST",
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["session"] });
    },
  });
}
