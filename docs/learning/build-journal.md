# Build Journal

## Stage 1 — Architecture summary
Built: Chose a queue-driven case management app with cases, deadlines, notes, attachments, escalations, reports, and audit logging.
Decision: Keep multi-tenancy out of v1 and use explicit team scoping instead.
Why: The prompt reads like a single internal corporate platform, but `src/lib/auth/authorize.ts` keeps the scope boundary centralized so `tenantId` can be added later.

## Stage 2 — Stack choice
Built: `Next.js + React + TypeScript + Prisma + PostgreSQL + Tailwind + Zod + React Query + REST`.
Decision: Use Prisma rather than Drizzle, and REST rather than tRPC.
Why: Prisma fits relational CRUD plus complex include graphs well, and REST keeps the request lifecycle easier to trace for learning in `src/app/api/**/route.ts`.

## Stage 3 — Domain model and schema
Built: `prisma/schema.prisma` with `Team`, `User`, `Session`, `Case`, `CaseNote`, `Attachment`, `Deadline`, `Escalation`, and `AuditLog`.
Decision: Add `owningTeamId` directly on `Case`.
Why: Ownership needs to be first-class for scope and mutation checks in `src/services/caseService.ts`.

## Stage 4 — Auth and permissions
Built: Session handling in `src/lib/auth/session.ts`, role policy in `src/lib/auth/permissions.ts`, and guard logic in `src/lib/auth/authorize.ts`.
Decision: Separate action permissions from visibility scope.
Why: A role can be allowed to view cases but still be restricted to its team in `buildCaseAccessWhere()`.

## Stage 5 — Service and repository boundaries
Built: Services in `src/services/**` and repositories in `src/repositories/**`.
Decision: Keep Prisma out of routes and React components.
Why: The file flow `route -> service -> repository` is more reviewable and easier to test.

## Stage 6 — Workflow and async operations
Built: Transition graph in `src/lib/workflow/caseWorkflow.ts` and escalation sweep in `src/services/escalationService.ts`.
Decision: Give status transitions their own endpoint instead of hiding them inside generic update.
Why: Workflow edges deserve stronger validation and clearer audit logging than general case edits.

## Stage 7 — UI and client data flow
Built: React Query hooks, queue pages, case detail view, login screen, and reports.
Decision: Keep frontend thin and let hooks mirror real REST endpoints.
Why: The docs can now trace from `src/components/**` into the actual API handlers without hand-waving.

## Stage 8 — Tests and docs
Built: Focused tests for auth rejection, validation, transition safety, and scope isolation plus the architecture and learning docs set. (Precisely: four test files with one `it` and one `expect` each; see `docs/learning/testing-rationale.md` for what each does and does not cover.)
Decision: Prefer small tests aimed at high-risk failures over broad but shallow snapshots.
Why: The most useful learning tests are the ones guarding production failure modes.

## Major Decision — Service layer vs route-centric logic
Why it matters: Workflow-heavy CRUD systems become unreviewable fast if permissions and state rules are scattered across handlers.
Options:
- Route-centric logic in `src/app/api/**/route.ts`: simple at first, but duplicates rules and mixes transport with behavior.
- Prisma-centric logic hidden in repository helpers: keeps routes thin but buries business rules next to persistence code.
- Service layer in `src/services/**`: adds one more hop, but keeps behavior centralized and transport-agnostic.
Choice: Service layer in `src/services/**`.
Why chosen: `src/services/caseService.ts` can now own authorization, workflow, audit logging, and serialization without coupling those rules to HTTP or Prisma.
What junior/mid/senior engineers notice:
- Junior: Sees an extra layer and may think it is ceremony.
- Mid-level: Notices the routes became much easier to scan and the tests can focus on behavior.
- Senior: Notices the service boundary is where future background jobs, alternate transports, or tenant context can plug in cleanly.

## Major Decision — Prisma vs Drizzle
Why it matters: The data layer drives most of the product complexity here.
Options:
- Prisma: strong schema ergonomics, generated types, easy include graphs, and clean transactions.
- Drizzle: leaner SQL control and great schema locality, but more manual query composition for this style of product.
- Raw SQL plus a query builder: maximum control, highest maintenance for a teaching-focused CRUD system.
Choice: Prisma.
Why chosen: `src/repositories/caseRepository.ts` and `src/repositories/reportRepository.ts` benefit from Prisma’s include graphs and group-by support.
What junior/mid/senior engineers notice:
- Junior: Feels productive faster with generated types.
- Mid-level: Notices repositories stay concise for relational CRUD.
- Senior: Watches for over-fetching and still expects explicit repository boundaries around Prisma.

## Major Decision — No multi-tenancy in v1
Why it matters: Tenant modeling changes schema, auth, repository filters, and every query contract.
Options:
- Full multi-tenancy now: very realistic for SaaS, but extra complexity that this prompt does not require.
- Single-company internal scope with team-based visibility: keeps the real ownership problem without tenant overhead.
- No ownership boundaries at all: fastest to build, but unrealistic and insecure.
Choice: Single-company internal scope with team-based visibility.
Why chosen: `src/lib/auth/authorize.ts` and `src/services/caseService.ts` show explicit ownership boundaries while staying aligned with the internal-tool use case.
What junior/mid/senior engineers notice:
- Junior: Sees RBAC and thinks that alone solves visibility.
- Mid-level: Notices action permission and data scope are separate concerns.
- Senior: Checks whether tenant scoping could be added later without rewriting service and repository contracts.

## PR Slices

### Slice 1 — Data model, auth primitives, and validation
Purpose in one sentence: Establish the relational schema and the shared security boundaries every later feature depends on.
Files with novel logic:
- `prisma/schema.prisma`
- `src/lib/auth/session.ts`
- `src/lib/auth/permissions.ts`
- `src/lib/auth/authorize.ts`
- `src/lib/middleware/withAuth.ts`
- `src/lib/validation/caseSchemas.ts`
Reviewer focus:
- `prisma/schema.prisma`: verify ownership fields and workflow enums; pay attention to `Case.owningTeamId` and `Escalation.triggeredByDeadlineId`.
- `src/lib/auth/authorize.ts`: verify `buildCaseAccessWhere()` never widens scope when `teamId` is missing.
- `src/lib/middleware/withAuth.ts`: verify auth rejection happens before route logic.
Stronger-reviewer flag: A junior reviewer may approve role checks without asking whether row-level scope is enforced separately.

### Slice 2 — Core case services and repositories
Purpose in one sentence: Implement the core CRUD and workflow behavior behind cases.
Files with novel logic:
- `src/services/caseService.ts`
- `src/repositories/caseRepository.ts`
- `src/repositories/auditLogRepository.ts`
- `src/repositories/userRepository.ts`
- `src/lib/workflow/caseWorkflow.ts`
Reviewer focus:
- `src/services/caseService.ts`: inspect `serializeCaseDetail()`, `assertActorCanMutateTeam()`, and `transitionCase()` for scope and workflow safety.
- `src/repositories/caseRepository.ts`: verify shared include graphs and overdue-deadline query shape.
- `src/lib/workflow/caseWorkflow.ts`: verify the allowed transition edges match the product rules.
Stronger-reviewer flag: A junior reviewer may approve transition logic without asking how child-note visibility is handled after case access succeeds.

### Slice 3 — Reporting, reference data, and escalation batch workflow
Purpose in one sentence: Add operator-facing reporting plus the async-style overdue deadline sweep.
Files with novel logic:
- `src/services/reportService.ts`
- `src/repositories/reportRepository.ts`
- `src/services/escalationService.ts`
- `src/services/referenceDataService.ts`
- `src/app/api/admin/escalation-sweeps/route.ts`
Reviewer focus:
- `src/services/reportService.ts`: verify client-supplied filters are additive to auth scope. (Review result: they are not — the spread order at `reportService.ts:19-22` lets `teamId` replace the scope. This slice would not pass this reviewer-focus item as written; see Stage 9.)
- `src/services/escalationService.ts`: inspect the per-deadline transaction loop and audit writes.
- `src/services/referenceDataService.ts`: verify reference-data endpoints still enforce team scope.
Stronger-reviewer flag: A junior reviewer may treat reporting and dropdown endpoints as low-risk, even though both can leak data if scope is wrong.

### Slice 4 — Frontend request wiring
Purpose in one sentence: Expose the backend through thin React Query hooks and task-oriented screens.
Files with novel logic:
- `src/hooks/useCases.ts`
- `src/hooks/useCaseDetail.ts`
- `src/components/cases/CreateCaseForm.tsx`
- `src/components/cases/CaseDetailView.tsx`
- `src/components/reports/QueueSummary.tsx`
Reviewer focus:
- `src/hooks/useCaseDetail.ts`: verify cache invalidation hits both queue and detail keys after mutations.
- `src/components/cases/CreateCaseForm.tsx`: verify the form uses scoped reference data instead of hard-coded IDs.
- `src/components/cases/CaseDetailView.tsx`: verify the UI is not making assumptions about allowed transitions.
Stronger-reviewer flag: A junior reviewer may approve local optimistic updates that drift from the authoritative server state.

### Slice 5 — Focused tests and code-anchored docs
Purpose in one sentence: Lock in the high-risk behaviors and document the codebase as a learning artifact.
Files with novel logic:
- `src/app/api/admin/escalation-sweeps/route.test.ts`
- `src/lib/validation/caseSchemas.test.ts`
- `src/lib/workflow/caseWorkflow.test.ts`
- `src/services/caseService.test.ts`
- `docs/architecture/*.md`
- `docs/learning/*.md`
Reviewer focus:
- `src/app/api/admin/escalation-sweeps/route.test.ts`: verify the route returns `403` for a non-admin actor.
- `src/services/caseService.test.ts`: verify the team scope is passed into the repository call, not applied only in the UI.
- `docs/learning/flow-traces.md`: verify every trace names actual files and real function calls.
Stronger-reviewer flag: A junior reviewer may see “tests exist” and not ask whether they cover the highest-risk security and workflow edges.

## Stage 9 — Post-build review against the code

Built: Nothing new in source. A line-by-line read of every route, service and repository, comparing what the docs and in-code senior notes *claim* with what the code *does*, and correcting the docs in place.
Decision: Record gaps as findings rather than silently rewording the claims.
Why: Several protections were stated in more than one place (a code comment, the architecture docs, the reports page subtitle) but were not implemented. A learner who trusts the prose would copy the bug.

Claims that did not survive the read:

| Claim (where) | What the code does | Evidence |
|---|---|---|
| "Team filters from the client are additive to auth scope, never a replacement" (`reportService.ts:18`; Slice 3 reviewer focus; guided path step 11) | Later spread overwrites `owningTeamId` | `reportService.ts:19-22`; same pattern `caseService.ts:96-100` |
| "aggregate reporting cannot bypass row-level visibility" (`auth-and-permissions.md`; `src/app/reports/page.tsx:7`) | Team lead can request another team's aggregates | as above |
| Restricted notes are hidden from roles without `note:view:restricted` | Hidden in `notes`, visible in `auditLogs[].metadata.comment` | `caseService.ts:430-449`, `:47-53`; `caseRepository.ts:150-164` |
| `case:assign` governs assignment (implied by the matrix) | Never checked | only occurrences are in `permissions.ts` |
| Escalations are resolvable and gate closure | Gate exists; nothing can resolve | `caseService.ts:416-422`; no writer of `EscalationStatus.RESOLVED` |
| Sweep respects workflow (implied by "workflow safety" sections) | Writes `ESCALATED` from any open status | `escalationService.ts:44-48` vs `caseWorkflow.ts:13-22` |
| `Deadline.triggeredByDeadlineId` | Column is on `Escalation` | `prisma/schema.prisma:179` |

Claims that did survive: `buildCaseAccessWhere()` refuses to widen when `teamId` is missing (`authorize.ts:49-52`); every case mutation loads the case through the scoped lookup before writing; audit rows are written in the same transaction as the business write; raw session tokens are never stored; login error messages are identical for unknown email and bad password.

### Slice 6 (proposed) — Close the verified gaps
Purpose in one sentence: Make the implemented behavior match the documented protections.
Files that would change:
- `src/services/caseService.ts` — spread scope last in `buildCaseListWhere()`; strip `comment` from audit metadata for restricted escalations or filter `auditLogs` in `serializeCaseDetail()`; check `case:assign` whenever `assignedToId` is present; require re-assignment (or clear the assignee) on team moves.
- `src/services/reportService.ts` — spread scope last.
- `src/services/escalationService.ts` — re-read case status inside the transaction and skip or validate the edge.
- New escalation acknowledge/resolve route guarded by `escalation:manage`.
- Tests for each, written to fail first.
Reviewer focus: every new test should fail on the current `main` before the fix lands; if one passes, it is not testing the gap.
Stronger-reviewer flag: Fixing the spread order is a one-line change that a reviewer may approve without asking for the conflicting-filter test that proves it.
