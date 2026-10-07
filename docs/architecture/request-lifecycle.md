# Request Lifecycle

**Ordering note (verified):** in the numbered lists below, the route file is listed first because that is where you open the code, but at runtime `withAuth()` runs *before* any line of the route body. Each exported handler is the function returned by `withAuth()` (`src/lib/middleware/withAuth.ts:32-42`); it calls `getSessionActor()` at `:34` and returns `401` at `:36-39` before the inner handler (which does `request.json()` and `parseOrThrow`) is ever invoked. Read every "1. route / 2. withAuth" pair as "withAuth wraps route".

Request: Create a new case from the queue page
1. `src/app/api/cases/route.ts` — `POST` reads JSON and calls `parseOrThrow(createCaseSchema, body)`
2. `src/lib/middleware/withAuth.ts` — verifies the cookie-backed session before the route handler runs
3. `src/lib/validation/caseSchemas.ts` — `createCaseSchema` enforces title, description, severity, priority, and ownership shape
4. `src/services/caseService.ts` — `createCase()` checks `case:create`, enforces team mutation rules, validates the assignee, and opens a transaction
5. `src/repositories/caseRepository.ts` — `createCaseRecord()` inserts the case row
6. `src/repositories/auditLogRepository.ts` — `createAuditLog()` writes the `case.created` audit event inside the same transaction
7. Returns `201` with the created case detail payload

Request: Transition a case into a new workflow state
1. `src/app/api/cases/[caseId]/transition/route.ts` — `POST` resolves `caseId` from params and parses the request body
2. `src/lib/middleware/withAuth.ts` — loads the authenticated actor
3. `src/lib/validation/caseSchemas.ts` — `transitionCaseSchema` validates `nextStatus` and `comment`
4. `src/services/caseService.ts` — `transitionCase()` checks `case:transition`, loads the scoped case, and runs transition-specific guards
5. `src/lib/workflow/caseWorkflow.ts` — `assertAllowedTransition()` rejects impossible status edges
6. `src/repositories/caseRepository.ts` — `updateCaseRecord()` persists the new status in a transaction
7. `src/repositories/auditLogRepository.ts` — `createAuditLog()` records `case.transitioned`
8. Returns `200` with the updated case detail payload

Request: Reject a non-admin trying to run the escalation sweep
1. `src/app/api/admin/escalation-sweeps/route.ts` — `POST` enters through the admin batch endpoint
2. `src/lib/middleware/withAuth.ts` — verifies the session and passes the actor into the route
3. `src/services/escalationService.ts` — `runEscalationSweep()` calls `ensurePermission(actor, "admin:run-escalation")`
4. `src/lib/auth/authorize.ts` — `ensurePermission()` throws `AuthorizationError` for a role such as `CASE_WORKER`
5. `src/lib/http/handle-route-error.ts` — converts the thrown authorization error into a JSON response
6. Returns `403` with an error payload

Request: Reject an invalid create-case payload
1. `src/app/api/cases/route.ts` — `POST` reads JSON from the request body
2. `src/lib/middleware/withAuth.ts` — verifies that a session exists
3. `src/lib/validation/caseSchemas.ts` — `createCaseSchema` rejects the malformed shape
4. `src/lib/validation/parse.ts` — `parseOrThrow()` wraps the Zod failure in `RequestValidationError`
5. `src/lib/http/handle-route-error.ts` — returns the validation failure in a stable JSON format
6. Returns `400` with schema issue details

## Error-to-status map

`handleRouteError()` (`src/lib/http/handle-route-error.ts:9-38`) recognises exactly five error classes by `instanceof` and uses each class's own `status` field:

| Error class | Defined at | `status` | Typical thrower |
|---|---|---|---|
| `RequestValidationError` | `src/lib/validation/parse.ts:3-12` | 400 | `parseOrThrow()` (`parse.ts:14-22`); `details` = `ZodError.flatten()` |
| `AuthenticationError` | `src/lib/middleware/withAuth.ts:17-24` | 401 | `loginUser()` (`src/services/authService.ts:23`, `:29`) |
| `AuthorizationError` | `src/lib/auth/authorize.ts:23-30` | 403 | `ensurePermission()`, `buildCaseAccessWhere()`, `assertActorCanMutateTeam()` |
| `NotFoundError` | `src/lib/errors.ts:1-8` | 404 | `getCaseForActor()` (`src/services/caseService.ts:69-71`), `assertAssignableUser()` (`:83-85`) |
| `InvalidTransitionError` | `src/lib/workflow/caseWorkflow.ts:24-31` | 422 | workflow edges and guards; also reused for non-workflow input problems (`caseService.ts:89`, `:366`) |

Anything else is logged with `console.error` and returned as `500 { error: { message: "An unexpected server error occurred." } }` (`handle-route-error.ts:28-37`). Two notes:

- The *missing-session* `401` does not go through `handleRouteError` at all; `withAuth` builds it with `errorResponse()` (`src/lib/http/responses.ts:15-25`). Both produce the same `{ error: { message, details } }` envelope, which is what `requestJson()` reads (`src/lib/http/client.ts:26-28`).
- A case outside your scope returns `404`, not `403` (`caseService.ts:69-71`). That is deliberate: it avoids confirming that the ID exists.

## Paths that land in `500` (verified by reading the code)

1. **Malformed JSON body.** `await request.json()` (e.g. `src/app/api/cases/route.ts:34`) throws `SyntaxError`; not one of the five classes → `500`. Reproduced: `new Request(url, { method: "POST", body: "{bad" }).json()` rejects with `SyntaxError` on Node 22.
2. **Admin creates a case for a non-existent team cuid.** `assertActorCanMutateTeam()` returns early for `ADMIN` (`caseService.ts:56-58`), Zod only checks cuid *shape* (`caseSchemas.ts:24`), and `owningTeam: { connect: { id } }` (`caseService.ts:159-163`) fails inside Prisma → `500`. For team-scoped roles this cannot happen because the team must equal the actor's own.
3. **Concurrent escalation sweeps.** A second sweep that read the same overdue deadlines hits the `@unique` on `Escalation.triggeredByDeadlineId` (`prisma/schema.prisma:179`) → Prisma error → `500`, and its loop stops at that deadline (`src/services/escalationService.ts:29-65`).
4. **`caseNumber` collision.** `caseService.ts:149` uses 8 hex chars of a UUID; a collision violates `Case.caseNumber @unique` (`schema.prisma:96`) → `500`. Rare, but not retried.

## Request: list cases (GET /api/cases)

1. `withAuth` resolves the actor (`withAuth.ts:34`).
2. `src/app/api/cases/route.ts:20-23` turns `searchParams` into a plain object and validates it with `caseListQuerySchema` (`src/lib/validation/caseSchemas.ts:56-61`). Unknown query keys are stripped by Zod's default object behavior.
3. `listVisibleCases()` (`src/services/caseService.ts:113-120`) checks `case:view`, then `buildCaseListWhere()` (`:93-111`) merges scope and filters. **Caveat:** a supplied `owningTeamId` overwrites the scope's `owningTeamId` (Finding A1 in `auth-and-permissions.md`).
4. `listCases()` (`src/repositories/caseRepository.ts:171-180`) runs `findMany` with `caseListSelect` (`:15-61`): next deadline only (`take: 1`, `:48`) and only non-`RESOLVED` escalations (`:55-59`). No pagination — every visible case is returned.
5. `serializeCaseListItem()` (`caseService.ts:39-45`) adds `activeEscalationCount` and `nextDeadlineAt`. Note that `nextDeadlineAt` is the earliest deadline of *any* status, including `MISSED`, because the select does not filter by status.
6. `200 { items }`.

## Request: escalation sweep, success path

1. `withAuth`, then `runEscalationSweep(actor)` (`src/app/api/admin/escalation-sweeps/route.ts:16-23`).
2. `ensurePermission(actor, "admin:run-escalation")` (`src/services/escalationService.ts:24`) — only `ADMIN` and `OPERATIONS_MANAGER` hold it (`src/lib/auth/permissions.ts:42`, `:56`).
3. `findOverdueDeadlinesWithoutEscalation()` (`caseRepository.ts:285-306`): `status = OPEN`, `dueAt < now`, no linked escalation, case not `CLOSED`/`CANCELLED`, with the full case row included. **No team scope** — correct for an org-wide admin job, but worth knowing.
4. For each deadline, sequentially, one `db.$transaction` (`escalationService.ts:31-62`): create escalation (`raisedById` = the operator who clicked, not a system user), set deadline `MISSED` + `resolvedAt`, set case `ESCALATED` if it is not already, write `case.escalation_auto_created` audit row.
5. `200 { createdCount, escalations }` (`:67-70`). The client hook only types `createdCount` (`src/hooks/useReports.ts:30`) and invalidates the report and case caches (`:33-38`).

What step 4 does **not** do: it does not call `assertAllowedTransition()`, so `NEW`, `TRIAGED` and `RESOLVED` cases jump straight to `ESCALATED` even though those edges are absent from `allowedTransitions` (`src/lib/workflow/caseWorkflow.ts:13-22`); it writes no `case.transitioned` audit row; and it uses the case status captured at read time (`escalationService.ts:44`), so a case closed between the read and the write is re-opened to `ESCALATED` with its `closedAt` still set.

## Request: login

1. `POST /api/auth/login` is **not** wrapped in `withAuth` (`src/app/api/auth/login/route.ts:17`).
2. `loginSchema` (`src/lib/validation/authSchemas.ts:13-16`): email format, password at least 8 chars. A 7-character password gets `400`, not `401`.
3. `loginUser()` (`src/services/authService.ts:19-53`): lookup, bcrypt compare, 7-day session row, cookie.
4. `201` (`created()`, `login/route.ts:23`) with `{ user: { id, email, name, role, teamId } }`.
5. Client: `LoginForm` invalidates `["session"]` and navigates to `/cases` (`src/components/auth/LoginForm.tsx:39-42`).

## Check ladder

1. **Goal:** prove the order. **Check:** with no cookie, send a syntactically broken body to `POST /api/cases`. Predict the status before trying (`401`, because `withAuth` returns before `request.json()`). With a valid cookie the same body gives `500`.
2. **Goal:** distinguish 403 vs 404. **Check:** as `case.worker@corp.local` (Billing), request a Risk-team case by ID. Predict `404` (scope), then predict what `POST /api/admin/escalation-sweeps` returns (`403`, permission).
3. **Goal:** spot the missing edge check. **Check:** list which of the 5 non-terminal, non-`ESCALATED` statuses lack an `ESCALATED` edge. Expected: `NEW`, `TRIAGED`, `RESOLVED` (ran as check C4, see `docs/learning/testing-rationale.md`).
