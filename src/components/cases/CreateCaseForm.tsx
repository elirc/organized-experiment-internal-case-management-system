/*
 * What this file does:
 * Creates a new case using scoped team and assignee reference data.
 * What calls it:
 * `src/app/cases/page.tsx`.
 * What it calls:
 * `src/hooks/useCases.ts` and `src/hooks/useReferenceData.ts`.
 * One thing a junior engineer would likely get wrong:
 * Hard-coding team IDs in the form, which hides the real ownership boundary from the UI and reviewers.
 */
"use client";

import { useEffect, useState } from "react";

import { useCreateCase } from "@/hooks/useCases";
import { useAssignableUsers, useTeams } from "@/hooks/useReferenceData";
import { casePriorities } from "@/types/domain";

export function CreateCaseForm() {
  const teams = useTeams();
  const [selectedTeamId, setSelectedTeamId] = useState("");
  const assignableUsers = useAssignableUsers(selectedTeamId);
  const createCase = useCreateCase();
  const [formState, setFormState] = useState({
    title: "",
    description: "",
    priority: "HIGH",
    severity: 3,
    requesterName: "",
    requesterEmail: "",
    sourceSystem: "",
    assignedToId: "",
  });

  useEffect(() => {
    if (!selectedTeamId && teams.data?.items[0]) {
      setSelectedTeamId(teams.data.items[0].id);
    }
  }, [selectedTeamId, teams.data]);

  return (
    <section className="rounded-[28px] border border-[var(--line)] bg-[var(--surface)] p-6 shadow-[0_18px_70px_rgba(38,33,26,0.08)]">
      <div>
        <h2 className="text-xl font-semibold">Open a case</h2>
        <p className="mt-1 text-sm text-[var(--muted)]">
          Create requests through the same service and audit path that powers operational work.
        </p>
      </div>

      <form
        className="mt-6 grid gap-4 md:grid-cols-2"
        onSubmit={(event) => {
          event.preventDefault();
          createCase.mutate({
            ...formState,
            severity: Number(formState.severity),
            owningTeamId: selectedTeamId,
            assignedToId: formState.assignedToId || undefined,
            requesterEmail: formState.requesterEmail || undefined,
            sourceSystem: formState.sourceSystem || undefined,
          });
        }}
      >
        <label className="space-y-2 md:col-span-2">
          <span className="text-sm font-medium">Title</span>
          <input
            className="w-full rounded-2xl border border-[var(--line)] bg-white/80 px-4 py-3"
            onChange={(event) => setFormState((current) => ({ ...current, title: event.target.value }))}
            value={formState.title}
          />
        </label>

        <label className="space-y-2 md:col-span-2">
          <span className="text-sm font-medium">Description</span>
          <textarea
            className="min-h-32 w-full rounded-2xl border border-[var(--line)] bg-white/80 px-4 py-3"
            onChange={(event) =>
              setFormState((current) => ({ ...current, description: event.target.value }))
            }
            value={formState.description}
          />
        </label>

        <label className="space-y-2">
          <span className="text-sm font-medium">Owning team</span>
          <select
            className="w-full rounded-2xl border border-[var(--line)] bg-white/80 px-4 py-3"
            onChange={(event) => setSelectedTeamId(event.target.value)}
            value={selectedTeamId}
          >
            <option value="">Select a team</option>
            {teams.data?.items.map((team) => (
              <option key={team.id} value={team.id}>
                {team.name}
              </option>
            ))}
          </select>
        </label>

        <label className="space-y-2">
          <span className="text-sm font-medium">Assignee</span>
          <select
            className="w-full rounded-2xl border border-[var(--line)] bg-white/80 px-4 py-3"
            onChange={(event) =>
              setFormState((current) => ({ ...current, assignedToId: event.target.value }))
            }
            value={formState.assignedToId}
          >
            <option value="">Leave unassigned</option>
            {assignableUsers.data?.items.map((user) => (
              <option key={user.id} value={user.id}>
                {user.name}
              </option>
            ))}
          </select>
        </label>

        <label className="space-y-2">
          <span className="text-sm font-medium">Priority</span>
          <select
            className="w-full rounded-2xl border border-[var(--line)] bg-white/80 px-4 py-3"
            onChange={(event) => setFormState((current) => ({ ...current, priority: event.target.value }))}
            value={formState.priority}
          >
            {casePriorities.map((priority) => (
              <option key={priority} value={priority}>
                {priority}
              </option>
            ))}
          </select>
        </label>

        <label className="space-y-2">
          <span className="text-sm font-medium">Severity (1-5)</span>
          <input
            className="w-full rounded-2xl border border-[var(--line)] bg-white/80 px-4 py-3"
            max={5}
            min={1}
            onChange={(event) =>
              setFormState((current) => ({ ...current, severity: Number(event.target.value) }))
            }
            type="number"
            value={formState.severity}
          />
        </label>

        <label className="space-y-2">
          <span className="text-sm font-medium">Requester name</span>
          <input
            className="w-full rounded-2xl border border-[var(--line)] bg-white/80 px-4 py-3"
            onChange={(event) =>
              setFormState((current) => ({ ...current, requesterName: event.target.value }))
            }
            value={formState.requesterName}
          />
        </label>

        <label className="space-y-2">
          <span className="text-sm font-medium">Requester email</span>
          <input
            className="w-full rounded-2xl border border-[var(--line)] bg-white/80 px-4 py-3"
            onChange={(event) =>
              setFormState((current) => ({ ...current, requesterEmail: event.target.value }))
            }
            type="email"
            value={formState.requesterEmail}
          />
        </label>

        <label className="space-y-2 md:col-span-2">
          <span className="text-sm font-medium">Source system</span>
          <input
            className="w-full rounded-2xl border border-[var(--line)] bg-white/80 px-4 py-3"
            onChange={(event) =>
              setFormState((current) => ({ ...current, sourceSystem: event.target.value }))
            }
            value={formState.sourceSystem}
          />
        </label>

        <div className="md:col-span-2">
          <button
            className="rounded-full bg-[var(--accent-strong)] px-5 py-3 text-sm font-semibold text-white"
            disabled={createCase.isPending || !selectedTeamId}
            type="submit"
          >
            {createCase.isPending ? "Creating..." : "Create case"}
          </button>
          {createCase.error ? (
            <p className="mt-3 text-sm text-[var(--danger)]">{createCase.error.message}</p>
          ) : null}
        </div>
      </form>
    </section>
  );
}
