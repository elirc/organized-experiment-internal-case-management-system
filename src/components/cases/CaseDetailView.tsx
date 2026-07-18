/*
 * What this file does:
 * Renders one case plus the note, deadline, attachment, and transition forms that hit the detail endpoints.
 * What calls it:
 * `src/app/cases/[caseId]/page.tsx`.
 * What it calls:
 * `src/hooks/useCaseDetail.ts` and `src/lib/formatters.ts`.
 * One thing a junior engineer would likely get wrong:
 * Updating the rendered case object locally after a mutation instead of invalidating and reloading the authoritative server state.
 */
"use client";

import { useState } from "react";

import {
  useAddCaseAttachment,
  useAddCaseDeadline,
  useAddCaseNote,
  useCaseDetail,
  useTransitionCase,
} from "@/hooks/useCaseDetail";
import { formatDateTime, formatEnumLabel } from "@/lib/formatters";
import { caseStatuses } from "@/types/domain";

export function CaseDetailView({ caseId }: { caseId: string }) {
  const caseDetail = useCaseDetail(caseId);
  const addNote = useAddCaseNote(caseId);
  const addDeadline = useAddCaseDeadline(caseId);
  const addAttachment = useAddCaseAttachment(caseId);
  const transitionCase = useTransitionCase(caseId);
  const [noteBody, setNoteBody] = useState("");
  const [isRestricted, setIsRestricted] = useState(false);
  const [deadlineLabel, setDeadlineLabel] = useState("");
  const [deadlineAt, setDeadlineAt] = useState("");
  const [transition, setTransition] = useState(caseStatuses[0]);
  const [transitionComment, setTransitionComment] = useState("");
  const [attachmentState, setAttachmentState] = useState({
    fileName: "sample-evidence.pdf",
    storageKey: "cases/demo/sample-evidence.pdf",
    contentType: "application/pdf",
    fileSizeBytes: 102400,
  });

  if (caseDetail.isLoading) {
    return (
      <section className="rounded-[28px] border border-[var(--line)] bg-[var(--surface)] p-8">
        Loading case...
      </section>
    );
  }

  if (caseDetail.error || !caseDetail.data) {
    return (
      <section className="rounded-[28px] border border-[var(--line)] bg-[var(--surface)] p-8 text-[var(--danger)]">
        {caseDetail.error?.message ?? "Case not found."}
      </section>
    );
  }

  const currentCase = caseDetail.data;

  return (
    <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
      <section className="space-y-6">
        <div className="rounded-[28px] border border-[var(--line)] bg-[var(--surface)] p-6 shadow-[0_18px_70px_rgba(38,33,26,0.08)]">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="font-[var(--font-mono)] text-xs uppercase tracking-[0.35em] text-[var(--accent-strong)]">
                {currentCase.caseNumber}
              </p>
              <h2 className="mt-3 text-3xl font-semibold">{currentCase.title}</h2>
              <p className="mt-3 max-w-3xl text-sm leading-7 text-[var(--muted)]">{currentCase.description}</p>
            </div>

            <div className="rounded-3xl border border-[var(--line)] bg-white/70 px-4 py-3 text-sm">
              <p className="font-semibold">{formatEnumLabel(currentCase.status)}</p>
              <p className="text-[var(--muted)]">
                {formatEnumLabel(currentCase.priority)} / Severity {currentCase.severity}
              </p>
            </div>
          </div>

          <dl className="mt-6 grid gap-4 md:grid-cols-3">
            <div className="rounded-2xl bg-white/60 p-4">
              <dt className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">Owning team</dt>
              <dd className="mt-2 font-medium">{currentCase.owningTeam.name}</dd>
            </div>
            <div className="rounded-2xl bg-white/60 p-4">
              <dt className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">Assignee</dt>
              <dd className="mt-2 font-medium">{currentCase.assignedTo?.name ?? "Unassigned"}</dd>
            </div>
            <div className="rounded-2xl bg-white/60 p-4">
              <dt className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">Requester</dt>
              <dd className="mt-2 font-medium">{currentCase.requesterName}</dd>
            </div>
          </dl>
        </div>

        <div className="rounded-[28px] border border-[var(--line)] bg-[var(--surface)] p-6 shadow-[0_18px_70px_rgba(38,33,26,0.08)]">
          <h3 className="text-xl font-semibold">Timeline notes</h3>
          <div className="mt-5 space-y-4">
            {currentCase.notes.map((note) => (
              <article key={note.id} className="rounded-2xl border border-[var(--line)] bg-white/60 p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="font-medium">{note.author.name}</p>
                  <div className="flex items-center gap-3 text-xs text-[var(--muted)]">
                    {note.isRestricted ? (
                      <span className="rounded-full bg-[rgba(185,28,28,0.1)] px-2 py-1 font-semibold text-[var(--danger)]">
                        Restricted
                      </span>
                    ) : null}
                    <span>{formatDateTime(note.createdAt)}</span>
                  </div>
                </div>
                <p className="mt-3 text-sm leading-7">{note.body}</p>
              </article>
            ))}
          </div>

          <form
            className="mt-5 space-y-3"
            onSubmit={(event) => {
              event.preventDefault();
              addNote.mutate({ body: noteBody, isRestricted });
              setNoteBody("");
            }}
          >
            <textarea
              className="min-h-28 w-full rounded-2xl border border-[var(--line)] bg-white/80 px-4 py-3"
              onChange={(event) => setNoteBody(event.target.value)}
              placeholder="Capture investigation notes, handoffs, or requester updates."
              value={noteBody}
            />
            <label className="flex items-center gap-3 text-sm">
              <input checked={isRestricted} onChange={(event) => setIsRestricted(event.target.checked)} type="checkbox" />
              Mark as restricted note
            </label>
            <button className="rounded-full bg-[var(--accent-strong)] px-4 py-2 text-sm font-semibold text-white" type="submit">
              Add note
            </button>
          </form>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <section className="rounded-[28px] border border-[var(--line)] bg-[var(--surface)] p-6 shadow-[0_18px_70px_rgba(38,33,26,0.08)]">
            <h3 className="text-xl font-semibold">Deadlines</h3>
            <div className="mt-4 space-y-3">
              {currentCase.deadlines.map((deadline) => (
                <div key={deadline.id} className="rounded-2xl border border-[var(--line)] bg-white/60 p-4">
                  <p className="font-medium">{deadline.label}</p>
                  <p className="mt-1 text-sm text-[var(--muted)]">
                    {formatDateTime(deadline.dueAt)} · {formatEnumLabel(deadline.status)}
                  </p>
                </div>
              ))}
            </div>

            <form
              className="mt-4 space-y-3"
              onSubmit={(event) => {
                event.preventDefault();
                addDeadline.mutate({ label: deadlineLabel, dueAt: new Date(deadlineAt).toISOString() });
                setDeadlineLabel("");
                setDeadlineAt("");
              }}
            >
              <input
                className="w-full rounded-2xl border border-[var(--line)] bg-white/80 px-4 py-3"
                onChange={(event) => setDeadlineLabel(event.target.value)}
                placeholder="Deadline label"
                value={deadlineLabel}
              />
              <input
                className="w-full rounded-2xl border border-[var(--line)] bg-white/80 px-4 py-3"
                onChange={(event) => setDeadlineAt(event.target.value)}
                type="datetime-local"
                value={deadlineAt}
              />
              <button className="rounded-full border border-[var(--line)] px-4 py-2 text-sm font-semibold" type="submit">
                Add deadline
              </button>
            </form>
          </section>

          <section className="rounded-[28px] border border-[var(--line)] bg-[var(--surface)] p-6 shadow-[0_18px_70px_rgba(38,33,26,0.08)]">
            <h3 className="text-xl font-semibold">Escalations and attachments</h3>
            <div className="mt-4 space-y-3">
              {currentCase.escalations.map((escalation) => (
                <div key={escalation.id} className="rounded-2xl border border-[var(--line)] bg-white/60 p-4">
                  <p className="font-medium">{escalation.reason}</p>
                  <p className="mt-1 text-sm text-[var(--muted)]">
                    {formatEnumLabel(escalation.status)} · raised by {escalation.raisedBy.name}
                  </p>
                </div>
              ))}
            </div>

            <form
              className="mt-4 space-y-3"
              onSubmit={(event) => {
                event.preventDefault();
                addAttachment.mutate(attachmentState);
              }}
            >
              <input
                className="w-full rounded-2xl border border-[var(--line)] bg-white/80 px-4 py-3"
                onChange={(event) =>
                  setAttachmentState((current) => ({ ...current, fileName: event.target.value }))
                }
                value={attachmentState.fileName}
              />
              <button className="rounded-full border border-[var(--line)] px-4 py-2 text-sm font-semibold" type="submit">
                Log attachment metadata
              </button>
            </form>
          </section>
        </div>
      </section>

      <aside className="space-y-6">
        <section className="rounded-[28px] border border-[var(--line)] bg-[var(--surface)] p-6 shadow-[0_18px_70px_rgba(38,33,26,0.08)]">
          <h3 className="text-xl font-semibold">Transition case</h3>
          <form
            className="mt-4 space-y-3"
            onSubmit={(event) => {
              event.preventDefault();
              transitionCase.mutate({ nextStatus: transition, comment: transitionComment || undefined });
              setTransitionComment("");
            }}
          >
            <select
              className="w-full rounded-2xl border border-[var(--line)] bg-white/80 px-4 py-3"
              onChange={(event) => setTransition(event.target.value as (typeof caseStatuses)[number])}
              value={transition}
            >
              {caseStatuses.map((status) => (
                <option key={status} value={status}>
                  {formatEnumLabel(status)}
                </option>
              ))}
            </select>
            <textarea
              className="min-h-28 w-full rounded-2xl border border-[var(--line)] bg-white/80 px-4 py-3"
              onChange={(event) => setTransitionComment(event.target.value)}
              placeholder="Add required context for workflow changes."
              value={transitionComment}
            />
            <button className="rounded-full bg-[var(--accent-strong)] px-4 py-2 text-sm font-semibold text-white" type="submit">
              Apply transition
            </button>
          </form>
        </section>

        <section className="rounded-[28px] border border-[var(--line)] bg-[var(--surface)] p-6 shadow-[0_18px_70px_rgba(38,33,26,0.08)]">
          <h3 className="text-xl font-semibold">Audit trail</h3>
          <div className="mt-4 space-y-3">
            {currentCase.auditLogs.map((log) => (
              <div key={log.id} className="rounded-2xl border border-[var(--line)] bg-white/60 p-4">
                <p className="font-medium">{log.action}</p>
                <p className="mt-1 text-sm text-[var(--muted)]">
                  {formatDateTime(log.createdAt)} · {log.actor?.name ?? "System"}
                </p>
              </div>
            ))}
          </div>
        </section>
      </aside>
    </div>
  );
}
