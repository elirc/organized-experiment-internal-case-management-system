/*
 * What this file does:
 * Collects login credentials and starts the session flow.
 * What calls it:
 * `src/app/login/page.tsx`.
 * What it calls:
 * `/api/auth/login` through `src/lib/http/client.ts`.
 * One thing a junior engineer would likely get wrong:
 * Letting login success live only in local component state instead of invalidating the shared session query.
 */
"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { requestJson } from "@/lib/http/client";

const seededUsers = [
  "admin@corp.local / ChangeMe123!",
  "maya.manager@corp.local / ChangeMe123!",
  "liam.lead@corp.local / ChangeMe123!",
  "case.worker@corp.local / ChangeMe123!",
  "audit.viewer@corp.local / ChangeMe123!",
];

export function LoginForm() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [email, setEmail] = useState("maya.manager@corp.local");
  const [password, setPassword] = useState("ChangeMe123!");

  const login = useMutation({
    mutationFn: (input: { email: string; password: string }) =>
      requestJson("/api/auth/login", {
        method: "POST",
        body: JSON.stringify(input),
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["session"] });
      router.push("/cases");
    },
  });

  return (
    <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
      <section className="rounded-[32px] border border-[var(--line)] bg-[var(--surface)] p-8 shadow-[0_18px_70px_rgba(38,33,26,0.08)]">
        <p className="font-[var(--font-mono)] text-xs uppercase tracking-[0.35em] text-[var(--accent-strong)]">
          Authentication
        </p>
        <h1 className="mt-4 text-4xl font-semibold">Sign in to the internal queue</h1>
        <p className="mt-3 max-w-xl text-sm leading-7 text-[var(--muted)]">
          This demo uses a database-backed session model with explicit role checks at the API and service layers.
        </p>

        <form
          className="mt-8 space-y-5"
          onSubmit={(event) => {
            event.preventDefault();
            login.mutate({ email, password });
          }}
        >
          <label className="block space-y-2">
            <span className="text-sm font-medium">Email</span>
            <input
              className="w-full rounded-2xl border border-[var(--line)] bg-white/80 px-4 py-3 outline-none transition focus:border-[var(--accent)]"
              onChange={(event) => setEmail(event.target.value)}
              type="email"
              value={email}
            />
          </label>

          <label className="block space-y-2">
            <span className="text-sm font-medium">Password</span>
            <input
              className="w-full rounded-2xl border border-[var(--line)] bg-white/80 px-4 py-3 outline-none transition focus:border-[var(--accent)]"
              onChange={(event) => setPassword(event.target.value)}
              type="password"
              value={password}
            />
          </label>

          <button
            className="rounded-full bg-[var(--accent-strong)] px-5 py-3 text-sm font-semibold text-white transition hover:translate-y-[-1px]"
            disabled={login.isPending}
            type="submit"
          >
            {login.isPending ? "Signing in..." : "Start session"}
          </button>

          {login.error ? (
            <p className="text-sm text-[var(--danger)]">{login.error.message}</p>
          ) : null}
        </form>
      </section>

      <aside className="rounded-[32px] border border-[var(--line)] bg-[rgba(19,78,74,0.92)] p-8 text-white shadow-[0_20px_80px_rgba(19,78,74,0.24)]">
        <p className="font-[var(--font-mono)] text-xs uppercase tracking-[0.35em] text-white/70">
          Seeded Access
        </p>
        <ul className="mt-5 space-y-3 text-sm leading-7 text-white/90">
          {seededUsers.map((credential) => (
            <li key={credential} className="rounded-2xl border border-white/10 bg-white/8 px-4 py-3">
              {credential}
            </li>
          ))}
        </ul>
      </aside>
    </div>
  );
}
