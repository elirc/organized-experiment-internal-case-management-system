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
7. `src/repositories/caseRepository.ts` — `updateCaseRecord()` moves the case to `ESCALATED` when needed
8. `src/repositories/auditLogRepository.ts` — `createAuditLog()` records `case.escalation_auto_created`
9. Returns created escalation count
