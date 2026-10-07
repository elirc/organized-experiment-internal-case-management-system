# Guided Reading Path

> **Scope note (honesty cap).** This doc set was expanded from 5,100 words to about 14,000 (roughly 2.75x), not the 5–7x originally targeted. The application has roughly 2,000 lines of backend TypeScript (header comments included) across 13 route files, 5 services and 6 repositories, plus 4 single-assertion test files. Every added section is tied to a file and line that was read; going further would have meant restating the same lines or writing generic material, so expansion stopped where the grounded material ran out.

**How to use this path.** Read the 14 steps in order with the file open next to you. After step 14 there is a line-anchored "Verify in code" table (one row per step) and a Goal/**Check** ladder. Where a check was actually executed while writing these docs, it says so; everything else is a reading exercise.

## Step 1 — src/app/api/cases/route.ts
**Why read this:** It shows the canonical route pattern for list and create operations.
**What to look for:** The route does almost nothing except auth, validation, service call, and response shaping.
**What to trace:** Calls `withAuth()` in `src/lib/middleware/withAuth.ts`, `parseOrThrow()` in `src/lib/validation/parse.ts`, and `createCase()` / `listVisibleCases()` in `src/services/caseService.ts`.
**What a junior would likely miss:** The route is intentionally thin; that is not under-engineering, it is boundary discipline.

## Step 2 — src/lib/middleware/withAuth.ts
**Why read this:** Every protected API request flows through this file before business logic starts.
**What to look for:** Session verification happens once here so route files do not duplicate auth checks.
**What to trace:** Called by route files under `src/app/api/**/route.ts`; calls `getSessionActor()` in `src/lib/auth/session.ts`.
**What a junior would likely miss:** A reusable auth wrapper is safer than remembering to hand-roll the same guard in every route.

## Step 3 — src/lib/auth/session.ts
**Why read this:** This is the cookie and session-token boundary.
**What to look for:** Raw session tokens are hashed before lookup and never exposed downstream.
**What to trace:** Called by `src/lib/middleware/withAuth.ts` and `src/services/authService.ts`; calls `findSessionByToken()` in `src/repositories/sessionRepository.ts`.
**What a junior would likely miss:** Session storage is part of the security model, not just a persistence detail.

## Step 4 — src/lib/auth/permissions.ts
**Why read this:** It defines the full RBAC matrix in one place.
**What to look for:** Permissions and visibility scope are related but separate policy concepts.
**What to trace:** Called by `src/lib/auth/authorize.ts`.
**What a junior would likely miss:** A role can have the same action permission as another role but a narrower record scope.

## Step 5 — src/lib/auth/authorize.ts
**Why read this:** This file turns the role matrix into executable guard logic.
**What to look for:** `ensurePermission()` and `buildCaseAccessWhere()` are the two most important policy functions.
**What to trace:** Called by `src/services/caseService.ts`, `src/services/reportService.ts`, and `src/services/escalationService.ts`; calls `src/lib/auth/permissions.ts`.
**What a junior would likely miss:** Data scoping belongs in backend policy code, not only in UI filtering.

## Step 6 — src/lib/validation/caseSchemas.ts
**Why read this:** It is the HTTP contract for case-related endpoints.
**What to look for:** Different endpoints get different schemas rather than one giant shared object.
**What to trace:** Called by routes under `src/app/api/cases/**/route.ts`.
**What a junior would likely miss:** Database models and request payloads should not be treated as the same thing.

## Step 7 — src/services/caseService.ts
**Why read this:** This is the main business-logic file for the product.
**What to look for:** Permission checks, scope-aware reads, workflow rules, audit logging, and serialization all sit here.
**What to trace:** Called by `src/app/api/cases/**/route.ts`; calls `src/lib/auth/authorize.ts`, `src/lib/workflow/caseWorkflow.ts`, `src/repositories/caseRepository.ts`, and `src/repositories/auditLogRepository.ts`.
**What a junior would likely miss:** The service owns behavior, not just orchestration. Its job is to protect invariants before repositories run.

## Step 8 — src/lib/workflow/caseWorkflow.ts
**Why read this:** It isolates the allowed status graph from transport and persistence details.
**What to look for:** Transition validity depends on the current status and the next status together.
**What to trace:** Called by `transitionCase()` in `src/services/caseService.ts`.
**What a junior would likely miss:** A workflow edge table is more reviewable than scattered `if` statements across route handlers.

## Step 9 — src/repositories/caseRepository.ts
**Why read this:** It shows how Prisma access is consolidated under one module.
**What to look for:** Shared include graphs, list/detail query shapes, and transaction-friendly write helpers.
**What to trace:** Called by `src/services/caseService.ts` and `src/services/escalationService.ts`; calls `src/lib/db.ts`.
**What a junior would likely miss:** Repositories are about stable database boundaries, not about hiding SQL for its own sake.

## Step 10 — src/services/escalationService.ts
**Why read this:** It is the async-style operational workflow in the project.
**What to look for:** Permission check first, query overdue work, then per-record transactions that update multiple tables safely.
**What to trace:** Called by `src/app/api/admin/escalation-sweeps/route.ts`; calls `src/repositories/caseRepository.ts` and `src/repositories/auditLogRepository.ts`.
**What a junior would likely miss:** Background or batch workflows still need the same rigor around permissions, transactions, and auditability.

## Step 11 — src/services/reportService.ts
**Why read this:** It proves that reporting reuses the same auth-aware scope as CRUD.
**What to look for:** Whether user-supplied filters are added on top of base auth scope or replace it. **Correction (verified):** they replace it. `{ ...baseScope, ...(input.teamId ? { owningTeamId: input.teamId } : {}) }` (`src/services/reportService.ts:19-22`) lets the later spread overwrite `owningTeamId`, despite the senior note on `:18` saying the opposite. `buildCaseListWhere()` does the same (`src/services/caseService.ts:96-100`).
**What to trace:** Called by `src/app/api/reports/queue-summary/route.ts`; calls `src/repositories/reportRepository.ts`.
**What a junior would likely miss:** Aggregates can leak as much as row data if they ignore the same access rules — and a comment claiming a protection is not the protection. Read the spread order.

## Step 12 — src/components/cases/CaseDetailView.tsx
**Why read this:** It shows how a frontend can stay thin while still driving a complex backend workflow.
**What to look for:** User actions trigger hooks, not inline fetches or local workflow logic.
**What to trace:** Called by `src/app/cases/[caseId]/page.tsx`; calls hooks in `src/hooks/useCaseDetail.ts`.
**What a junior would likely miss:** The client should not decide which transitions are valid; it should ask the server.

## Step 13 — src/hooks/useCaseDetail.ts
**Why read this:** It is the client-side request map for case detail flows.
**What to look for:** Shared cache invalidation after note, deadline, attachment, and transition mutations.
**What to trace:** Called by `src/components/cases/CaseDetailView.tsx`; calls the case detail routes under `src/app/api/cases/[caseId]/**`.
**What a junior would likely miss:** Cache invalidation is part of correctness, not just a UI convenience.

## Step 14 — prisma/schema.prisma
**Why read this:** It makes the domain concrete at the database level.
**What to look for:** Ownership columns, workflow-related enums, and the one-to-one link between missed deadlines and auto-escalations.
**What to trace:** Used indirectly by every repository through the Prisma client in `src/lib/db.ts`.
**What a junior would likely miss:** Long-term product constraints often start in schema design, not in route code.

## Verify in code (one row per step)

| Step | Line(s) to open | What you should see | Surprise worth noting |
|---|---|---|---|
| 1 | `src/app/api/cases/route.ts:18-42` | Two handlers, each `withAuth` → parse → service → `ok`/`created` | Query params go through `Object.fromEntries` (`:22`), so a repeated key keeps only the last value |
| 2 | `src/lib/middleware/withAuth.ts:32-42` | Actor loaded once, `401` before the handler | The wrapper does not catch errors; each route has its own `try/catch` |
| 3 | `src/lib/auth/session.ts:19-25`, `:54-64` | 32 random bytes, SHA-256 lookup | `secure` cookie only in production (`:37`) — see debugging scenario D7 in `flow-traces.md` |
| 4 | `src/lib/auth/permissions.ts:29-88` | Two maps: actions and visibility | `case:assign` and `escalation:manage` are granted but never checked anywhere |
| 5 | `src/lib/auth/authorize.ts:42-58` | Missing `teamId` throws instead of returning `{}` | The scope it returns is overridden by callers that spread filters after it |
| 6 | `src/lib/validation/caseSchemas.ts:16-61` | Separate schemas per endpoint | `updateCaseSchema` is `createCaseSchema.partial()` (`:28`), so `owningTeamId` is updatable via PATCH |
| 7 | `src/services/caseService.ts:394-456` | Guards before the transaction; audit + optional note inside it | Transition comment is copied into audit metadata (`:439`), which is not filtered for restricted viewers |
| 8 | `src/lib/workflow/caseWorkflow.ts:13-22` | 17 allowed edges, two terminal states | The sweep writes `ESCALATED` without consulting this table |
| 9 | `src/repositories/caseRepository.ts:182-190` | `findFirst({ where: { id, ...where } })` | No client filter is merged here, so the scope survives; `where` is spread after `id` and would overwrite it if a caller ever passed an `id` key (none does today) |
| 10 | `src/services/escalationService.ts:23-71` | Permission, query, per-deadline transaction | Runs inside one HTTP request; `deadline.case.status` (`:44`) is a pre-transaction snapshot |
| 11 | `src/services/reportService.ts:14-23` | Scope then client filter | Client filter overrides scope (see correction above) |
| 12 | `src/components/cases/CaseDetailView.tsx:222-251` | Transition form posts whatever status is selected | The select offers all 8 statuses, including invalid ones |
| 13 | `src/hooks/useCaseDetail.ts:30-46` | One mutation factory, two invalidations | Invalidating `["cases"]` already covers `["cases", id]` by prefix |
| 14 | `prisma/schema.prisma:174-192` | `triggeredByDeadlineId @unique` | `ACKNOWLEDGED`/`RESOLVED` escalation statuses are never written by any code |

## Goal / Check ladder

Rungs go from reading to reasoning to designing. "Ran" means the check was executed with `node --test` against a hand-ported JavaScript copy of the cited pure logic while these docs were written (16/16 passed on Node 22.16.0; see `testing-rationale.md` → "Checks run for this guide"). Nothing here required installing packages.

1. **Goal:** know the request skeleton. **Check:** without looking, write the five-line body shared by every authenticated handler. Compare with `src/app/api/cases/[caseId]/notes/route.ts:24-35`.
2. **Goal:** know who can do what. **Check:** from `permissions.ts`, fill in a 5×12 matrix; count grants per role. Expected: ADMIN 12, OPERATIONS_MANAGER 12, TEAM_LEAD 11, CASE_WORKER 6, AUDITOR 3.
3. **Goal:** understand the workflow graph. **Check (ran, C1–C3):** count allowed edges (17 of 64 ordered pairs), confirm no self-loops, and find the shortest path `NEW → CLOSED` (4 hops via `TRIAGED`, `IN_PROGRESS`, `RESOLVED`).
4. **Goal:** see that the batch job breaks the graph. **Check (ran, C4):** list statuses from which the sweep's forced `ESCALATED` is not a legal edge. Expected: `NEW`, `TRIAGED`, `RESOLVED`.
5. **Goal:** find the scope override. **Check (ran, C5–C7):** compute `buildCaseListWhere()` for a Billing case worker with `{ owningTeamId: "team_risk" }`. Expected: `{ owningTeamId: "team_risk" }`. Then the report variant for a team lead. Then the control case with only `status`, which is all the shipped test covers.
6. **Goal:** find the restricted-text leak. **Check (ran, C9):** feed `serializeCaseDetail()` a record with one restricted note and one `case.transitioned` audit row carrying the same comment, for a case worker. Expected: notes array empty, `auditLogs[0].metadata.comment` still present.
7. **Goal:** reason about idempotency. **Check (ran, C12–C14, in-memory model):** sequential sweeps → second returns 0; two sweeps that read before either writes → second hits the unique constraint; case closed between read and write → ends `ESCALATED`. These model the logic; they do not exercise Prisma or PostgreSQL isolation.
8. **Goal:** design a fix. **Check:** write a version of `buildCaseListWhere()` where scope cannot be overridden, and a version of `serializeCaseDetail()` that drops or redacts `metadata.comment` for viewers without `note:view:restricted`. State which shipped test each change would break (none — that is itself a finding about test coverage).
9. **Goal:** close the escalation loop. **Check:** sketch the smallest endpoint that makes `EscalationStatus.RESOLVED` reachable: route, schema, service guard (`escalation:manage`), scope, audit action name.
