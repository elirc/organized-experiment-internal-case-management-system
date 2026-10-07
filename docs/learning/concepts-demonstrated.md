# Concepts Demonstrated

## Service layer
Where to look: `src/services/caseService.ts` — `createCase()`, `addCaseNote()`, and `transitionCase()` own business rules instead of routes or components.
Also see: `src/services/reportService.ts` for a thinner service that still applies auth-aware query rules.
Risk if wrong: Business invariants drift across routes and become impossible to review.

## Repository pattern
Where to look: `src/repositories/caseRepository.ts` — `listCases()`, `findCaseById()`, and the write helpers centralize Prisma access.
Also see: `src/repositories/reportRepository.ts` for aggregate queries that stay out of the service layer.
Risk if wrong: Query shape duplication leads to inconsistent includes, scope mistakes, and brittle transactions.

## Zod validation boundary
Where to look: `src/lib/validation/caseSchemas.ts` — `createCaseSchema`, `createNoteSchema`, and `transitionCaseSchema`.
Also see: `src/lib/validation/parse.ts` for `parseOrThrow()`, which standardizes request validation failures.
Risk if wrong: Malformed requests can reach services and persistence with partially trusted data.

## Auth/session flow
Where to look: `src/services/authService.ts` — `loginUser()` verifies credentials and creates a session.
Also see: `src/lib/auth/session.ts` for cookie handling and session-token hashing.
Risk if wrong: Session fixation, account enumeration, or broken login persistence.

## Role-based access control
Where to look: `src/lib/auth/permissions.ts` — `permissionMap` and `visibilityMap` define what each role can do and see.
Also see: `src/lib/auth/authorize.ts` for `ensurePermission()` and `buildCaseAccessWhere()`.
Risk if wrong: Unauthorized reads or writes become systemic across the whole application.

## Status and state transitions
Where to look: `src/lib/workflow/caseWorkflow.ts` — `allowedTransitions` and `assertAllowedTransition()`.
Also see: `src/services/caseService.ts` for extra guards in `transitionCase()` such as assignment and open-escalation checks.
Risk if wrong: Cases can skip required work states and produce false operational reporting.

## Audit logging
Where to look: `src/repositories/auditLogRepository.ts` — `createAuditLog()` persists transactionally aligned audit rows.
Also see: `src/services/caseService.ts` and `src/services/escalationService.ts` for the call sites that emit audit events.
Risk if wrong: Investigations lose the timeline needed to explain who changed what and why.

## Background job design
Where to look: `src/services/escalationService.ts` — `runEscalationSweep()` models a batch workflow with permission checks and per-record transactions.
Also see: `src/app/api/admin/escalation-sweeps/route.ts` for the operator-triggered entry point.
Risk if wrong: Batch updates become partially applied, duplicate records appear, or privileged workflows are exposed.
In this code (verified): "background" is aspirational — the sweep runs synchronously inside the `POST` request and is only ever triggered by a button (`src/components/reports/QueueSummary.tsx:63-70`). See "Background job" below.

## Data isolation by ownership scope
Where to look: `src/lib/auth/authorize.ts` — `buildCaseAccessWhere()` converts actor scope into a Prisma `where` filter.
Also see: `src/services/caseService.ts` — `getCaseForActor()` and `listVisibleCases()` apply that scope before repository access.
Risk if wrong: One team can quietly see another team’s cases and notes.

## Restricted child-record visibility
Where to look: `src/services/caseService.ts` — `serializeCaseDetail()` filters `notes` by `canViewRestrictedNotes(actor)`.
Also see: `src/lib/auth/authorize.ts` for `canViewRestrictedNotes()`.
Risk if wrong: A user with parent-case access could still see notes that should remain manager-only.
In this code (verified): the risk is partly realised. The filter at `src/services/caseService.ts:51` covers `notes`, but `transitionCase()` copies the same text into `auditLogs[].metadata.comment` (`:439`), and the detail include returns the last 20 audit rows with full metadata (`src/repositories/caseRepository.ts:150-164`). Child-record filtering has to cover every child that can carry the protected data, not only the obvious one.

---

## The same concepts, read closely

The sections above name where each concept lives. This part shows how each one actually behaves in this code, including where it falls short. Line numbers were checked against the source.

### Service layer — what it owns and what it does not
`caseService.ts` holds eight exported operations (`listVisibleCases` `:113`, `getCaseDetail` `:122`, `createCase` `:129`, `updateCase` `:198`, `addCaseNote` `:269`, `addCaseAttachment` `:310`, `addCaseDeadline` `:352`, `transitionCase` `:394`) and six private helpers (`serializeCaseListItem` `:39`, `serializeCaseDetail` `:47`, `assertActorCanMutateTeam` `:55`, `getCaseForActor` `:65`, `assertAssignableUser` `:76`, `buildCaseListWhere` `:93`). Every exported function starts with `ensurePermission`. What the service layer does *not* own: transaction isolation level (Prisma default), concurrency control (none), and pagination (none).

### Repository pattern — shared shapes
Two named shapes, `caseListSelect` (`caseRepository.ts:15-61`) and `caseDetailInclude` (`:63-165`), are reused by every read and every write helper that returns a case (`:175`, `:188`, `:195`, `:205`). That is why `createCase()`, `updateCase()` and `transitionCase()` can all hand their result straight to `serializeCaseDetail()`. The cost: every status change re-reads all notes, attachments, deadlines, escalations and 20 audit rows.

### Zod boundary — strict on shape, silent on meaning
Schemas check format, not existence or authority. `owningTeamId: z.string().cuid()` (`caseSchemas.ts:24`) accepts any well-formed cuid; whether the team exists is discovered by Prisma (or not at all for admins, see the `500` list in `docs/architecture/request-lifecycle.md`). `transitionCaseSchema` makes `comment` optional (`:52`) and the service makes it required only for `ESCALATED` (`caseService.ts:412-414`) — a rule split across two files.

### Auth/session — what is strong and what is thin
Strong: 256-bit random tokens, only hashes stored, `httpOnly` cookie, generic login error. Thin: no throttling, no expired-row cleanup, response timing differs for unknown emails (`authService.ts:20-24` skips bcrypt). Details in `docs/architecture/auth-and-permissions.md`.

### RBAC — three axes in three places
Action permissions (`permissionMap`), read scope (`visibilityMap`), and write scope (role-name `if` in `assertActorCanMutateTeam`, `caseService.ts:56`). Two permissions in the matrix are never checked (`case:assign`, `escalation:manage`).

### State transitions — table plus guards, with one bypass
A pure edge table (`caseWorkflow.ts:13-22`) plus three context guards in the service (`caseService.ts:408-422`). The table is bypassed by the sweep (`escalationService.ts:44-48`). Ran: 17 allowed edges, `NEW → CLOSED` in 4 hops (checks C1–C3 in `testing-rationale.md`).

### Audit logging — atomic, but not access-controlled
Every write helper call is paired with `createAuditLog(tx, …)` inside the same transaction, so a rolled-back write leaves no audit row (`auditLogRepository.ts:17-22`). There is no separate read rule for audit rows; whoever can see the case sees its last 20 audit entries and their metadata.

### Background job — synchronous batch, not a job system
`runEscalationSweep()` runs inside the `POST` request, processes deadlines one transaction at a time, and returns when done. There is no queue, schedule, retry, lock, or progress record. The per-record transaction is real and useful: a failure on deadline *n* leaves deadlines 1..*n*-1 committed. Idempotency comes from the query filter plus the `@unique` backstop.

### Data isolation — central function, decentralised merge
`buildCaseAccessWhere()` is central, as designed. The merge with client filters happens in callers, and two of the three callers merge in the wrong order (`caseService.ts:96-100`, `reportService.ts:19-22`; the third, `findCaseById`, merges no client filter).

## Concepts present in the code but not listed above

### Hide existence with 404
`getCaseForActor()` throws `NotFoundError` for both "no such case" and "not in your scope" (`caseService.ts:69-71`). An attacker probing IDs cannot tell them apart. Contrast: an explicit permission failure (`ensurePermission`) returns `403`, which is fine because it reveals nothing about a specific record.

### One error envelope
Every error response is `{ error: { message, details? } }`, from both `handleRouteError()` (`src/lib/http/handle-route-error.ts:17-25`) and `errorResponse()` (`src/lib/http/responses.ts:15-25`). The client reads exactly `payload.error?.message` (`src/lib/http/client.ts:27`).

### Cache invalidation by key prefix
List key `["cases"]` (`src/hooks/useCases.ts:32`) and detail key `["cases", caseId]` (`src/hooks/useCaseDetail.ts:19-21`) share a prefix. React Query's `invalidateQueries({ queryKey: ["cases"] })` matches by prefix, so the second invalidation in `useCaseDetail.ts:41-42` is redundant but harmless.

### Missing: optimistic concurrency
`updateCaseRecord()` updates `where: { id }` only (`caseRepository.ts:199-207`). Validation happens on a row read earlier in the request (`caseService.ts:403-406`). Two simultaneous transitions from `RESOLVED` (one to `CLOSED`, one to `IN_PROGRESS`) both pass validation; the last commit wins and both audit rows say `from: RESOLVED`. Adding `status: existingCase.status` to the update `where` would turn the loser into a detectable failure.

## Check ladder

1. **Goal:** separate a concept from its claim. **Check:** for "Data isolation by ownership scope", list the three places a scope `where` is merged and mark each safe or unsafe (`findCaseById` safe; `buildCaseListWhere` and `getScopedQueueSummary` unsafe).
2. **Goal:** see transactional audit. **Check:** in `addCaseDeadline()` (`caseService.ts:352-392`), name what is rolled back if `createAuditLog` throws (the deadline row).
3. **Goal:** reason about 404 vs 403. **Check:** explain why `getCaseForActor` returns 404 while `buildCaseAccessWhere` throws 403 for a team role with no team (the latter is about the actor, not a record).
4. **Goal:** design concurrency control. **Check:** rewrite the update in `transitionCase()` so a stale status produces a 409-style error, and name the error class you would add to `handleRouteError`.
