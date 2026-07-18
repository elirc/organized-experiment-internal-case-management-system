/*
 * What this file does:
 * Renders the operational case queue from the list API response.
 * What calls it:
 * `src/app/cases/page.tsx`.
 * What it calls:
 * `src/lib/formatters.ts`.
 * One thing a junior engineer would likely get wrong:
 * Recomputing status meaning ad hoc in JSX instead of leaning on the API response shape and shared formatters.
 */
"use client";

import Link from "next/link";

import { formatDateTime, formatEnumLabel } from "@/lib/formatters";
import type { CaseListItem } from "@/types/cases";

export function CaseTable({ items }: { items: CaseListItem[] }) {
  return (
    <section className="overflow-hidden rounded-[28px] border border-[var(--line)] bg-[var(--surface)] shadow-[0_18px_70px_rgba(38,33,26,0.08)]">
      <div className="border-b border-[var(--line)] px-6 py-5">
        <h2 className="text-xl font-semibold">Active queue</h2>
        <p className="mt-1 text-sm text-[var(--muted)]">
          Cases are already pre-filtered by the server-side visibility scope.
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-[rgba(255,255,255,0.45)] text-[var(--muted)]">
            <tr>
              {["Case", "Status", "Priority", "Team", "Assignee", "Next deadline", "Updated"].map(
                (label) => (
                  <th key={label} className="px-6 py-4 font-medium">
                    {label}
                  </th>
                ),
              )}
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id} className="border-t border-[var(--line)]">
                <td className="px-6 py-4">
                  <Link className="font-semibold text-[var(--accent-strong)]" href={`/cases/${item.id}`}>
                    {item.caseNumber}
                  </Link>
                  <p className="mt-1 text-[var(--ink)]">{item.title}</p>
                  <p className="text-xs text-[var(--muted)]">Requester: {item.requesterName}</p>
                </td>
                <td className="px-6 py-4">{formatEnumLabel(item.status)}</td>
                <td className="px-6 py-4">
                  <span className="rounded-full bg-[rgba(180,83,9,0.12)] px-3 py-1 text-xs font-semibold text-[var(--warning)]">
                    {formatEnumLabel(item.priority)} / Sev {item.severity}
                  </span>
                </td>
                <td className="px-6 py-4">{item.owningTeam.name}</td>
                <td className="px-6 py-4">{item.assignedTo?.name ?? "Unassigned"}</td>
                <td className="px-6 py-4">{formatDateTime(item.nextDeadlineAt)}</td>
                <td className="px-6 py-4">{formatDateTime(item.updatedAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
