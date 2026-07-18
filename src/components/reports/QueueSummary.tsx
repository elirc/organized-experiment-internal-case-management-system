/*
 * What this file does:
 * Displays aggregate queue health and exposes the escalation sweep action to authorized operators.
 * What calls it:
 * `src/app/reports/page.tsx`.
 * What it calls:
 * `src/hooks/useReports.ts`.
 * One thing a junior engineer would likely get wrong:
 * Treating admin batch actions like normal buttons and not reflecting that they mutate shared operational state.
 */
"use client";

import { useQueueSummary, useRunEscalationSweep } from "@/hooks/useReports";
import { formatEnumLabel } from "@/lib/formatters";

export function QueueSummary() {
  const summary = useQueueSummary();
  const sweep = useRunEscalationSweep();

  if (summary.isLoading) {
    return (
      <section className="rounded-[28px] border border-[var(--line)] bg-[var(--surface)] p-8">
        Loading reports...
      </section>
    );
  }

  if (summary.error || !summary.data) {
    return (
      <section className="rounded-[28px] border border-[var(--line)] bg-[var(--surface)] p-8 text-[var(--danger)]">
        {summary.error?.message ?? "Report data is unavailable."}
      </section>
    );
  }

  return (
    <div className="space-y-6">
      <section className="grid gap-4 md:grid-cols-3">
        <article className="rounded-[28px] border border-[var(--line)] bg-[var(--surface)] p-6 shadow-[0_18px_70px_rgba(38,33,26,0.08)]">
          <p className="text-sm text-[var(--muted)]">Cases in queue</p>
          <p className="mt-3 text-4xl font-semibold">
            {summary.data.byStatus.reduce((count, item) => count + item._count._all, 0)}
          </p>
        </article>
        <article className="rounded-[28px] border border-[var(--line)] bg-[var(--surface)] p-6 shadow-[0_18px_70px_rgba(38,33,26,0.08)]">
          <p className="text-sm text-[var(--muted)]">Overdue deadlines</p>
          <p className="mt-3 text-4xl font-semibold text-[var(--warning)]">{summary.data.overdueDeadlines}</p>
        </article>
        <article className="rounded-[28px] border border-[var(--line)] bg-[var(--surface)] p-6 shadow-[0_18px_70px_rgba(38,33,26,0.08)]">
          <p className="text-sm text-[var(--muted)]">Open escalations</p>
          <p className="mt-3 text-4xl font-semibold text-[var(--danger)]">{summary.data.openEscalations}</p>
        </article>
      </section>

      <section className="rounded-[28px] border border-[var(--line)] bg-[var(--surface)] p-6 shadow-[0_18px_70px_rgba(38,33,26,0.08)]">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-xl font-semibold">Queue by status</h2>
            <p className="mt-1 text-sm text-[var(--muted)]">
              This mirrors the aggregate query in the report repository rather than recomputing counts in the browser.
            </p>
          </div>
          <button
            className="rounded-full bg-[var(--accent-strong)] px-5 py-3 text-sm font-semibold text-white"
            disabled={sweep.isPending}
            onClick={() => sweep.mutate()}
            type="button"
          >
            {sweep.isPending ? "Running sweep..." : "Run escalation sweep"}
          </button>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          {summary.data.byStatus.map((item) => (
            <article key={item.status} className="rounded-2xl border border-[var(--line)] bg-white/60 p-4">
              <p className="text-sm text-[var(--muted)]">{formatEnumLabel(item.status)}</p>
              <p className="mt-2 text-3xl font-semibold">{item._count._all}</p>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
