# Load-Bearing Files

## src/services/caseService.ts
- What it does: Owns permissions, scope-aware reads, child-record writes, state transitions, and audit logging for cases.
- What calls it: `src/app/api/cases/route.ts`, `src/app/api/cases/[caseId]/route.ts`, `src/app/api/cases/[caseId]/notes/route.ts`, `src/app/api/cases/[caseId]/deadlines/route.ts`, `src/app/api/cases/[caseId]/attachments/route.ts`, `src/app/api/cases/[caseId]/transition/route.ts`.
- What it calls: `src/lib/auth/authorize.ts`, `src/lib/workflow/caseWorkflow.ts`, `src/repositories/caseRepository.ts`, `src/repositories/auditLogRepository.ts`, `src/repositories/userRepository.ts`, `src/lib/db.ts`.
- What would break or become insecure if this file were wrong: Team scoping, restricted-note visibility, and workflow integrity would all fail at once.
- What a junior engineer would likely miswrite here: Putting audit logging after the transaction or forgetting to scope the initial case lookup before mutation.
- What the current version gets right, with lines: every mutating function loads the case through `getCaseForActor()` before writing (`:214`, `:278`, `:321`, `:361`, `:403`), checks the team before the transaction, and writes its audit row inside the same `db.$transaction` as the business write.
- What it gets wrong (verified): the list filter overrides scope (`:96-100`); restricted text is copied into unfiltered audit metadata (`:439`); assignment needs no `case:assign` (`:145`, `:223`); team moves keep a stale assignee (`:215-223`); `updateCaseRecord()` writes by `id` alone (`src/repositories/caseRepository.ts:199-207`), so two concurrent transitions both validate against the same old status and the later one wins (no optimistic-lock check on `status` or `updatedAt`).

## src/lib/auth/authorize.ts
- What it does: Turns role policy into runtime permission checks and case visibility filters.
- What calls it: `src/services/caseService.ts`, `src/services/reportService.ts`, `src/services/escalationService.ts`, `src/services/referenceDataService.ts` (and `src/lib/http/handle-route-error.ts` imports `AuthorizationError` from it).
- What it calls: `src/lib/auth/permissions.ts`.
- What would break or become insecure if this file were wrong: The application could leak cross-team cases or allow the wrong roles to mutate data.
- What a junior engineer would likely miswrite here: Returning an empty scope object when `teamId` is missing.

## src/lib/middleware/withAuth.ts
- What it does: Gates protected routes behind session verification.
- What calls it: Protected API routes under `src/app/api/**/route.ts`.
- What it calls: `src/lib/auth/session.ts`, `src/lib/http/responses.ts`.
- What would break or become insecure if this file were wrong: One auth bug here would affect every API route that depends on it.
- What a junior engineer would likely miswrite here: Letting route code run before the auth failure returns.

## src/repositories/caseRepository.ts
- What it does: Encapsulates all Prisma case queries and write helpers.
- What calls it: `src/services/caseService.ts`, `src/services/escalationService.ts`.
- What it calls: `src/lib/db.ts`.
- What would break or become insecure if this file were wrong: Includes could drift, transaction writes could become inconsistent, and scope assumptions could be bypassed.
- What a junior engineer would likely miswrite here: Repeating include graphs in each service instead of keeping one authoritative query shape.

## src/lib/workflow/caseWorkflow.ts
- What it does: Declares allowed status edges for case transitions.
- What calls it: `transitionCase()` in `src/services/caseService.ts`.
- What it calls: No downstream modules.
- What would break or become insecure if this file were wrong: Cases could jump into states that skip required work, corrupting audit trails and ops reporting.
- What a junior engineer would likely miswrite here: Validating the next status in isolation without using the current status.

## src/services/escalationService.ts
- What it does: Runs the overdue-deadline sweep and creates escalations plus audit records.
- What calls it: `src/app/api/admin/escalation-sweeps/route.ts`.
- What it calls: `src/lib/auth/authorize.ts`, `src/repositories/caseRepository.ts`, `src/repositories/auditLogRepository.ts`, `src/lib/db.ts`.
- What would break or become insecure if this file were wrong: Batch operations could create duplicate escalations, leave deadline state half-updated, or run for unauthorized roles.
- What a junior engineer would likely miswrite here: One giant transaction for the whole sweep or no transaction at all.
- What the current version still gets wrong (verified): the case-status write at `:44-48` ignores `allowedTransitions` and decides from a snapshot taken before the transaction; a concurrent second sweep fails with a unique-constraint `500` and stops its loop at that point (`:29-65`, `prisma/schema.prisma:179`); and `raisedById` is the human operator (`:34`), so the audit trail cannot distinguish "operator escalated" from "operator ran the batch".

## src/services/reportService.ts
- What it does: Applies auth-aware scoping to queue summary reporting.
- What calls it: `src/app/api/reports/queue-summary/route.ts`.
- What it calls: `src/lib/auth/authorize.ts`, `src/repositories/reportRepository.ts`.
- What would break or become insecure if this file were wrong: Aggregate endpoints could bypass the same visibility limits as CRUD endpoints.
- What a junior engineer would likely miswrite here: Replacing auth scope with user-selected team filters. **This is what the current code does:** `getScopedQueueSummary()` spreads `owningTeamId: input.teamId` after the base scope (`src/services/reportService.ts:19-22`), so a `TEAM_LEAD` passing `?teamId=` for another team gets that team's counts. The senior note on `:18` describes the intended rule, not the implemented one.

## prisma/schema.prisma
- What it does: Defines the persistent domain shape, enums, and relationships.
- What calls it: Prisma client generation and every repository via `src/lib/db.ts`.
- What it calls: No application code; it defines the DB contract.
- What would break or become insecure if this file were wrong: Ownership, workflow state, and audit relationships would become ambiguous or unenforceable.
- What a junior engineer would likely miswrite here: Omitting ownership columns like `owningTeamId` and trying to recover access control entirely in application code later.

## src/services/referenceDataService.ts
- What it does: Supplies team and assignee dropdown data (`getTeamOptions()` `:15-24`, `getAssignableUserOptions()` `:26-39`).
- What calls it: `src/app/api/reference-data/teams/route.ts:18` and `src/app/api/reference-data/assignable-users/route.ts:24`.
- What it calls: `src/lib/auth/authorize.ts`, `src/repositories/teamRepository.ts`, `src/repositories/userRepository.ts`.
- What would break or become insecure if this file were wrong: Team IDs are the only thing standing between a team-scoped user and Finding A1 (the filter override needs another team's cuid). This file is what keeps those IDs out of a case worker's hands (`:23`).
- What a junior engineer would likely miswrite here: Re-deriving "who sees all teams" from role names (`:19`, `:29-31`) instead of calling `getCaseVisibilityScope()`. That is already the case, and the two functions disagree about `AUDITOR`.

## src/lib/http/handle-route-error.ts
- What it does: Maps five known error classes to their `status` and a `{ error: { message, details } }` body; everything else becomes a logged `500` (`:9-38`).
- What calls it: Every `catch` block in `src/app/api/**/route.ts` except `auth/session`, which has no `try`.
- What it calls: Only the error class definitions it imports (`:3-7`).
- What would break or become insecure if this file were wrong: Unknown errors are not echoed to the client (`:30-36`), which keeps Prisma messages and stack traces private. Mapping a too-broad class here could leak them.
- What a junior engineer would likely miswrite here: Returning `error.message` for every error. A subtler gap that exists today: `SyntaxError` from `request.json()` is not mapped, so malformed JSON returns `500` instead of `400`.

## src/repositories/sessionRepository.ts
- What it does: Creates, resolves and deletes sessions; turns a session row into the `AuthenticatedActor` shape (`:20-42`).
- What calls it: `src/lib/auth/session.ts` and `src/services/authService.ts`.
- What it calls: `src/lib/db.ts`.
- What would break or become insecure if this file were wrong: The expiry check on `:30` is the only place a session ends besides logout. Dropping it would make every session permanent.
- What a junior engineer would likely miswrite here: Caching the actor in the session row. The current code re-reads the user every request (`include: { user: true }`, `:25-27`), so role and team changes apply immediately.

## Blast radius by file

"How many of the 15 handlers can change behavior if this file has one bug", counted from the route inventory in `docs/architecture/README.md`:

| File | Endpoints affected | Why |
|---|---|---|
| `src/lib/middleware/withAuth.ts` | 12 | wraps every authenticated handler |
| `src/lib/http/handle-route-error.ts` | 14 | every handler with a `try/catch` |
| `src/lib/auth/authorize.ts` | 12 | `ensurePermission` is reached by every authenticated handler (reference-data `assignable-users` skips it when `teamId` is missing) |
| `src/lib/auth/permissions.ts` | 12 | data behind `authorize.ts` |
| `src/services/caseService.ts` | 8 | all `/api/cases/**` handlers |
| `src/repositories/caseRepository.ts` | 9 | case handlers plus the sweep |
| `src/lib/auth/session.ts` | 15 | every handler: through `withAuth`, or directly for login, logout and session |
