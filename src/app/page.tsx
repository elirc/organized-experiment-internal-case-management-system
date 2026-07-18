"use client";

import Link from "next/link";

import { useSession } from "@/hooks/useSession";

export default function HomePage() {
  const session = useSession();

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-7xl flex-col justify-center gap-8 px-5 py-10 sm:px-8">
      <section className="rounded-[36px] border border-[var(--line)] bg-[var(--surface)] p-8 shadow-[0_22px_90px_rgba(38,33,26,0.08)] sm:p-12">
        <p className="font-[var(--font-mono)] text-xs uppercase tracking-[0.35em] text-[var(--accent-strong)]">
          Queue Workflow Platform
        </p>
        <div className="mt-6 grid gap-10 lg:grid-cols-[1.1fr_0.9fr]">
          <div>
            <h1 className="max-w-3xl text-5xl font-semibold leading-tight text-[var(--ink)]">
              Manage internal cases with explicit permissions, auditable workflows, and team-scoped queues.
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-8 text-[var(--muted)]">
              This codebase is intentionally shaped like a production CRUD system: REST APIs, Prisma schema design, service and repository boundaries, centralized RBAC, and code-anchored docs for reading unfamiliar backend code.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                className="rounded-full bg-[var(--accent-strong)] px-5 py-3 text-sm font-semibold text-white"
                href={session.data?.user ? "/cases" : "/login"}
              >
                {session.data?.user ? "Open cases" : "Sign in"}
              </Link>
              <Link className="rounded-full border border-[var(--line)] px-5 py-3 text-sm font-semibold" href="/reports">
                Review reports
              </Link>
            </div>
          </div>

          <div className="grid gap-4">
            {[
              "Assignments, notes, attachments, and deadlines",
              "Restricted notes and explicit role checks",
              "Auditable status transitions and escalation sweeps",
              "Docs built around real file paths and request traces",
            ].map((item) => (
              <article key={item} className="rounded-[28px] border border-[var(--line)] bg-white/60 p-5">
                <p className="text-sm leading-7">{item}</p>
              </article>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
