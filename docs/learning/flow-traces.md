# Flow Traces

## Flow: Create a case from the queue page
1. `src/app/cases/page.tsx` — renders `CreateCaseForm`
2. `src/components/cases/CreateCaseForm.tsx` — submit handler calls `useCreateCase().mutate()`
3. `src/hooks/useCases.ts` — `useCreateCase()` sends `POST /api/cases`
4. `src/app/api/cases/route.ts` — `POST` route handler
5. `src/lib/middleware/withAuth.ts` — `withAuth()` loads the actor from the session
6. `src/lib/validation/caseSchemas.ts` — `createCaseSchema`
7. `src/lib/validation/parse.ts` — `parseOrThrow()`
8. `src/services/caseService.ts` — `createCase()` checks permissions, team mutation rules, and assignee validity
9. `src/repositories/caseRepository.ts` — `createCaseRecord()` inserts the case
10. `src/repositories/auditLogRepository.ts` — `createAuditLog()` records `case.created`
11. Returns created case detail and `src/hooks/useCases.ts` invalidates the `["cases"]` query

## Flow: Add a restricted note to a case
1. `src/app/cases/[caseId]/page.tsx` — renders `CaseDetailView`
2. `src/components/cases/CaseDetailView.tsx` — note form submit calls `useAddCaseNote().mutate()`
3. `src/hooks/useCaseDetail.ts` — `useAddCaseNote()` sends `POST /api/cases/[caseId]/notes`
4. `src/app/api/cases/[caseId]/notes/route.ts` — route handler resolves `caseId`
5. `src/lib/middleware/withAuth.ts` — `withAuth()` verifies the session
6. `src/lib/validation/caseSchemas.ts` — `createNoteSchema`
7. `src/lib/validation/parse.ts` — `parseOrThrow()`
8. `src/services/caseService.ts` — `addCaseNote()` checks `note:create`, validates team mutation rights, and rejects restricted notes for unauthorized roles
9. `src/repositories/caseRepository.ts` — `createCaseNote()` inserts the note
10. `src/repositories/auditLogRepository.ts` — `createAuditLog()` records `case.note_created`
11. Returns the created note and `src/hooks/useCaseDetail.ts` invalidates both list and detail caches

## Flow: Reject an invalid transition from NEW to CLOSED
1. `src/components/cases/CaseDetailView.tsx` — transition form calls `useTransitionCase().mutate()`
2. `src/hooks/useCaseDetail.ts` — `useTransitionCase()` sends `POST /api/cases/[caseId]/transition`
3. `src/app/api/cases/[caseId]/transition/route.ts` — route handler parses the request
4. `src/lib/middleware/withAuth.ts` — session is loaded
5. `src/lib/validation/caseSchemas.ts` — `transitionCaseSchema`
6. `src/services/caseService.ts` — `transitionCase()` loads the case and calls `assertAllowedTransition()`
7. `src/lib/workflow/caseWorkflow.ts` — `assertAllowedTransition()` throws `InvalidTransitionError`
8. `src/lib/http/handle-route-error.ts` — maps the workflow exception to a `422` response

## Flow: Reject a non-admin escalation sweep
1. `src/components/reports/QueueSummary.tsx` — operator clicks the sweep button
2. `src/hooks/useReports.ts` — `useRunEscalationSweep()` sends `POST /api/admin/escalation-sweeps`
3. `src/app/api/admin/escalation-sweeps/route.ts` — route handler enters the batch workflow
4. `src/lib/middleware/withAuth.ts` — authenticated actor is loaded
5. `src/services/escalationService.ts` — `runEscalationSweep()` calls `ensurePermission(actor, "admin:run-escalation")`
6. `src/lib/auth/authorize.ts` — `ensurePermission()` throws `AuthorizationError`
7. `src/lib/http/handle-route-error.ts` — returns `403`

## Flow: Auto-create escalations for overdue deadlines
1. `src/app/api/admin/escalation-sweeps/route.ts` — `POST` handler calls `runEscalationSweep()`
2. `src/services/escalationService.ts` — `runEscalationSweep()` authorizes the actor and loads overdue deadlines
3. `src/repositories/caseRepository.ts` — `findOverdueDeadlinesWithoutEscalation()` finds due work that has no linked escalation
4. `src/services/escalationService.ts` — per deadline, opens `db.$transaction()`
5. `src/repositories/caseRepository.ts` — `createEscalationRecord()` inserts the escalation
6. `src/repositories/caseRepository.ts` — `updateDeadlineRecord()` marks the deadline `MISSED`
7. `src/repositories/caseRepository.ts` — `updateCaseRecord()` moves the case to `ESCALATED` whenever the snapshot status is not already `ESCALATED` (`src/services/escalationService.ts:44-48`). This bypasses `assertAllowedTransition()`: `NEW`, `TRIAGED` and `RESOLVED` cases are moved along edges the workflow table forbids.
8. `src/repositories/auditLogRepository.ts` — `createAuditLog()` records `case.escalation_auto_created` (no `case.transitioned` row is written for the status change)
9. Returns `{ createdCount, escalations }` (`escalationService.ts:67-70`)

## Line-referenced detail for the flows above

Every line number below was checked against the current source.

**Create a case.** `CreateCaseForm` pre-selects the first team returned by `/api/reference-data/teams` (`src/components/cases/CreateCaseForm.tsx:35-39`), so a team-scoped user sees only their own team and an admin sees the alphabetically first one (`src/repositories/teamRepository.ts:20-22`). On submit it converts empty strings to `undefined` (`CreateCaseForm.tsx:54-61`). Server side: `createCase()` (`src/services/caseService.ts:129-196`) runs `ensurePermission` (`:143`), `assertActorCanMutateTeam` (`:144`), `assertAssignableUser` (`:145`), then one transaction (`:147-193`) that generates the case number (`:149`), inserts with `connect` relations (`:150-178`) and writes the audit row (`:180-190`). `useCreateCase()` invalidates `["cases"]` (`src/hooks/useCases.ts:46-48`); because the detail key is `["cases", caseId]` (`src/hooks/useCaseDetail.ts:19-21`), that prefix also invalidates every cached detail.

**Add a restricted note.** The checkbox is shown to every role (`src/components/cases/CaseDetailView.tsx:134-137`); a `CASE_WORKER` who ticks it gets `403` from `caseService.ts:281-283`. The UI clears the textarea immediately on submit (`CaseDetailView.tsx:124-125`), before the server answers, so a rejected note is lost from the form.

**Reject NEW → CLOSED.** The transition `<select>` lists all eight statuses and starts at `NEW` (`CaseDetailView.tsx:35`, `:236-240`), so the UI happily submits invalid edges and relies on `assertAllowedTransition()` (`src/lib/workflow/caseWorkflow.ts:33-40`). Order of checks inside `transitionCase()` (`caseService.ts:394-456`): permission (`:402`) → scoped load (`:403`) → team mutation (`:404`) → edge (`:406`) → assignee required for `IN_PROGRESS` (`:408-410`) → comment required for `ESCALATED` (`:412-414`) → no unresolved escalations for `CLOSED` (`:416-422`).

## Flow: Update or reassign a case (API only)

1. No hook calls this route; use an HTTP client with a session cookie.
2. `src/app/api/cases/[caseId]/route.ts:35-46` — `PATCH` parses `updateCaseSchema` (`src/lib/validation/caseSchemas.ts:28-31`: every create field optional, at least one key required).
3. `updateCase()` (`src/services/caseService.ts:198-267`): `case:update` (`:213`) → scoped load (`:214`) → mutation check against the **current** team (`:217`) → `CASE_WORKER` may not change team (`:219-221`) → assignee must belong to the *next* team if an assignee is supplied (`:223`).
4. One transaction: `updateCaseRecord()` with only the supplied fields (`:226-252`; Prisma ignores `undefined`), audit `case.updated` with the raw input as metadata (`:254-261`).
5. `200` with the serialized detail.

Things this flow lets through (verified): no `case:assign` check, so case workers can assign; a team lead can move a case to any team and keep an assignee from the old team; `requesterEmail: ""` passes Zod (`caseSchemas.ts:22`) but becomes `undefined` (`caseService.ts:232`), so an email can never be cleared once set.

## Flow: Read the queue summary report

1. `src/components/reports/QueueSummary.tsx:17` → `useQueueSummary()` (`src/hooks/useReports.ts:18-23`) → `GET /api/reports/queue-summary` with no query string.
2. `src/app/api/reports/queue-summary/route.ts:18-30` validates `queueSummaryQuerySchema` (`src/lib/validation/reportSchemas.ts:13-15`).
3. `getScopedQueueSummary()` (`src/services/reportService.ts:14-23`): `report:view`, base scope, optional `teamId` override (Finding A1).
4. `getQueueSummary()` (`src/repositories/reportRepository.ts:15-53`) runs three queries in parallel with `Promise.all` — `groupBy status`, overdue `OPEN` deadlines, non-`RESOLVED` escalations — each filtered by `case: { is: where }`. They are not in one transaction, so the three numbers can come from slightly different moments.
5. The UI sums `byStatus` for "Cases in queue" (`QueueSummary.tsx:41-43`), which includes `CLOSED` and `CANCELLED` cases.

## Flow: Sign in and sign out

1. `src/components/auth/LoginForm.tsx:30-31` pre-fills `maya.manager@corp.local` / `ChangeMe123!` (the seed password, `prisma/seed.ts:25`).
2. `POST /api/auth/login` → `loginUser()` → session row + cookie (see `docs/architecture/auth-and-permissions.md`, "The session mechanism").
3. Sign out: `AppShell` button (`src/components/layout/AppShell.tsx:58-64`) → `useLogout()` (`src/hooks/useSession.ts:25-37`) → `POST /api/auth/logout` → row deleted, cookie removed → only the `["session"]` query is invalidated (`useSession.ts:33-35`).

## Debugging scenarios

Each scenario starts from a symptom you can produce with the seeded data and ends at the line that explains it.

**D1 — "Resolve open escalations before closing the case." and nothing in the UI resolves them.**
Cause: the sweep created an `Escalation` with default status `OPEN` (`prisma/schema.prisma:181`), and no code path ever changes an escalation's status. The close guard reads all escalations from the detail include (`src/repositories/caseRepository.ts:128-149`) and rejects any that are not `RESOLVED` (`src/services/caseService.ts:416-422`). Confirm by searching `src` for `escalation.update` (no hits). Workaround in development: update the row directly in the database; real fix: an escalation endpoint guarded by the currently unused `escalation:manage` permission.

**D2 — "A case must be assigned before it can move to IN_PROGRESS." for a case created without an assignee.**
Cause: `caseService.ts:408-410`. The only UI that sets an assignee is the create form; the `PATCH` route exists but no hook calls it. Fix the data with `PATCH /api/cases/:id { "assignedToId": "<same-team user cuid>" }` as a team lead or above.

**D3 — Clicking "Run escalation sweep" twice quickly: one request returns 200, the other 500.**
Cause: both requests read the same overdue list (`caseRepository.ts:285-306`) before either commits; the slower one violates `triggeredByDeadlineId @unique` (`schema.prisma:179`). The `500` comes from `handleRouteError`'s fallback (`src/lib/http/handle-route-error.ts:28-37`) with the Prisma error in the server log. The button is disabled while `sweep.isPending` (`src/components/reports/QueueSummary.tsx:65`), which prevents double clicks in one tab but not two tabs or two operators. Data is not duplicated; the cost is a confusing error.

**D4 — A case worker opens Reports and sees an error message.**
Cause: `CASE_WORKER` lacks `report:view` (`src/lib/auth/permissions.ts:71-78`), so the summary returns `403` and `QueueSummary` renders `summary.error.message` (`QueueSummary.tsx:28-34`). Navigation still links to the page because the UI does no role checks.

**D5 — A curl test returns 500 instead of 400.**
Cause: malformed JSON (a trailing comma, single quotes) makes `request.json()` throw `SyntaxError`, which `handleRouteError` does not map. Check the server log for the `console.error` at `handle-route-error.ts:28`.

**D6 — Running the seed twice doubles the timeline notes on `CAS-2026-SEED0001`.**
Cause: `db.caseNote.createMany({ ..., skipDuplicates: true })` (`prisma/seed.ts:107-123`) only skips rows that violate a unique constraint. Note IDs are generated (`schema.prisma:127`) and there is no other unique key on `CaseNote`, so nothing is ever a duplicate. Teams, users, the case, the deadline and the audit row use `upsert` with stable keys and are idempotent.

**D7 — Login succeeds locally under `next start` over plain HTTP but every API call returns 401.**
Cause: `next start` runs with `NODE_ENV=production`, so the cookie is set with `secure: true` (`src/lib/auth/session.ts:37`) and the browser will not send it back over `http://localhost`. `next dev` does not set the flag.

**D8 — "Add deadline" does nothing and no request appears in the network tab.**
Cause: with an empty date input, `new Date("").toISOString()` throws `RangeError: Invalid time value` inside the submit handler (`src/components/cases/CaseDetailView.tsx:162`) before `mutate` sends anything. Reproduced on Node 22 (check C15).

**D9 — After signing out and in as a different user, the case list briefly shows the previous user's cases.**
Cause: logout invalidates only `["session"]` (`src/hooks/useSession.ts:33-35`), login invalidates only `["session"]` (`src/components/auth/LoginForm.tsx:40`), and the query client keeps data fresh for 30 seconds (`src/app/providers.tsx:13`). Cached `["cases"]` data is reused on navigation. The server never returned unauthorized data to the second user; the browser re-displayed what the first user already had. Fix: `queryClient.clear()` on logout.

**D10 — A team lead cannot see a case they just edited.**
Cause: `PATCH` with a different `owningTeamId` succeeds for `TEAM_LEAD` (`caseService.ts:217-221` only checks the old team), after which `getCaseForActor()` scopes by the lead's own team and returns `404`. The audit row records the move under `case.updated`.

## Check ladder

1. **Goal:** follow a mutation end to end. **Check:** for "add attachment", write the five hops (component line, hook, route, service, repository) with line numbers. One correct answer: `CaseDetailView.tsx:202` → `useCaseDetail.ts:55-60` → `attachments/route.ts:24-35` → `caseService.ts:310-350` → `caseRepository.ts:227-243`.
2. **Goal:** predict guard order. **Check:** a `CASE_WORKER` posts `{ "nextStatus": "CLOSED" }` on a `NEW` case of their own team. Which error wins? (`403` from `case:transition` at `caseService.ts:402`, before the edge check.)
3. **Goal:** reproduce D1 mentally. **Check:** list the minimum sequence of API calls that leaves a case permanently un-closable (create with assignee → add a deadline already in the past → run sweep).
4. **Goal:** prove the stale snapshot. **Check:** explain why D3 cannot create two escalations for the same deadline, but the race in the sweep flow above *can* move a just-closed case to `ESCALATED`. (Ran as model checks C13 and C14.)
