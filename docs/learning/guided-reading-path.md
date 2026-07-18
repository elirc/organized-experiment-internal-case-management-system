# Guided Reading Path

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
**What to look for:** User-supplied filters are added on top of base auth scope rather than replacing it.
**What to trace:** Called by `src/app/api/reports/queue-summary/route.ts`; calls `src/repositories/reportRepository.ts`.
**What a junior would likely miss:** Aggregates can leak as much as row data if they ignore the same access rules.

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
