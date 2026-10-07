# Auth And Permissions

Session flow:

- Login input is validated in `src/lib/validation/authSchemas.ts` by `loginSchema`.
- `src/app/api/auth/login/route.ts` parses the request and calls `loginUser()` in `src/services/authService.ts`.
- `loginUser()` looks up the user in `src/repositories/userRepository.ts`, verifies the password with `verifyPassword()` in `src/lib/auth/password.ts`, creates the session in `src/repositories/sessionRepository.ts`, and sets the cookie through `setSessionCookie()` in `src/lib/auth/session.ts`.
- On later requests, `src/lib/middleware/withAuth.ts` calls `getSessionActor()` from `src/lib/auth/session.ts` before the route handler continues.

Role and permission enforcement:

- The permission matrix lives in `src/lib/auth/permissions.ts` inside `permissionMap`.
- Route handlers do not compare raw role names. Instead, services call `ensurePermission()` from `src/lib/auth/authorize.ts`.
- Example: `src/services/reportService.ts` calls `ensurePermission(actor, "report:view")` before any aggregate query runs.
- Example: `src/services/escalationService.ts` calls `ensurePermission(actor, "admin:run-escalation")` before the overdue-deadline sweep can start.

Visibility scoping:

- Team visibility lives in `src/lib/auth/authorize.ts` inside `buildCaseAccessWhere()`.
- `buildCaseAccessWhere()` returns `{}` for `ADMIN`, `OPERATIONS_MANAGER`, and `AUDITOR`, and returns `{ owningTeamId: actor.teamId }` for `TEAM_LEAD` and `CASE_WORKER`.
- `src/services/caseService.ts` passes that scope into `src/repositories/caseRepository.ts` through `listVisibleCases()` and `getCaseForActor()`.
- `src/services/reportService.ts` also starts from the same scope in `getScopedQueueSummary()`. **Correction (verified review):** the client `teamId` filter is spread *after* the scope (`reportService.ts:19-22`), so for a team-scoped role it replaces `owningTeamId` instead of narrowing it. Aggregate reporting therefore *can* bypass team visibility for a `TEAM_LEAD`. The same override exists in `buildCaseListWhere()` (`caseService.ts:96-100`). See Finding A1 below.

Restricted-note access:

- The ability to see restricted notes is separate from the ability to see the parent case.
- `src/services/caseService.ts` uses `canViewRestrictedNotes()` from `src/lib/auth/authorize.ts` inside `serializeCaseDetail()` to filter note children after the case has already been scoped.
- This is the right split because case visibility and child-note visibility are related but not identical rules.

Mutation safety:

- Team-based mutation safety is enforced in `src/services/caseService.ts` by `assertActorCanMutateTeam()`.
- Assignment integrity is enforced in `src/services/caseService.ts` by `assertAssignableUser()`, which rejects assigning a case to someone outside the owning team — but only when an `assignedToId` is supplied in the same request (`caseService.ts:77-79` returns early otherwise). Moving a case to a new team without re-assigning keeps the old assignee (Finding A4). No `case:assign` permission check guards assignment (Finding A3).
- Status workflow safety is enforced in `src/lib/workflow/caseWorkflow.ts` by `assertAllowedTransition()`, then extended in `src/services/caseService.ts` by transition-specific guards such as the open-escalation check in `transitionCase()`.

Multi-tenancy note:

- Multi-tenancy is not included because the product reads like one internal corporate platform rather than a tenant-hosted SaaS.
- To add multi-tenancy later, you would add `tenantId` to org-owned models in `prisma/schema.prisma`, inject tenant context alongside the actor in `src/lib/middleware/withAuth.ts`, extend `buildCaseAccessWhere()` in `src/lib/auth/authorize.ts` to always include `tenantId`, and require every repository entry point to accept tenant-scoped `where` inputs.
- Before doing that, fix Finding A1: any tenant filter added to `buildCaseAccessWhere()` would be just as overridable as the team filter is today if callers keep spreading client filters after it.

## The session mechanism, line by line

| Step | Where | What actually happens |
|---|---|---|
| Token minted | `src/lib/auth/session.ts:23-25` | `crypto.randomBytes(32)` hex-encoded: 64 hex chars, 256 bits of entropy. |
| Token hashed | `src/lib/auth/session.ts:19-21`, `27-29` | Unsalted SHA-256. Acceptable here because the input is already high-entropy random; salting matters for low-entropy secrets like passwords. |
| Row persisted | `src/services/authService.ts:33-40`, `src/repositories/sessionRepository.ts:14-18` | Only `tokenHash`, `userId`, `expiresAt` (7 days, `authService.ts:34`) are stored. `Session.tokenHash` is `@unique` (`prisma/schema.prisma:84`). |
| Cookie set | `src/lib/auth/session.ts:31-41` | Cookie `case_mgmt_session`, `httpOnly`, `sameSite: "lax"`, `secure` only when `NODE_ENV === "production"`, `path: "/"`, absolute `expires`. |
| Lookup per request | `src/lib/auth/session.ts:54-64` → `src/repositories/sessionRepository.ts:20-42` | `findUnique` by hash with `include: { user: true }`; expired rows return `null` (`sessionRepository.ts:30`) but are **not deleted**. |
| Actor shape | `src/repositories/sessionRepository.ts:35-41` | `{ id, email, name, role, teamId }` — rebuilt from the user row on every request, so a role or team change takes effect on the next request without re-login. |
| Logout | `src/app/api/auth/logout/route.ts:15-22` → `src/lib/auth/session.ts:43-52` | `deleteMany` on the hash, then cookie delete. Logout is not wrapped in `withAuth`; with no cookie it simply returns `204`. |

What the session layer does **not** do (verified by reading every file under `src/lib/auth`, `src/services/authService.ts`, and `src/repositories/sessionRepository.ts`):

- No sliding expiry or refresh: a session lives exactly 7 days from login.
- No cleanup job for expired rows; `Session` grows until logout deletes rows one at a time.
- No "log out everywhere" — `invalidateSession()` deletes only the current hash.
- No login throttling or lockout; `src/app/api/auth/login/route.ts:17-27` calls `loginUser()` unconditionally after schema validation.
- No CSRF token. State-changing routes rely on `sameSite: "lax"` (blocks cross-site `POST` cookies in modern browsers) plus the `Content-Type: application/json` the client always sends (`src/lib/http/client.ts:12-18`). The server does not check `Content-Type` itself.

## Permission matrix as data

Transcribed from `src/lib/auth/permissions.ts:29-80` (Y = granted):

| Permission | ADMIN | OPS_MANAGER | TEAM_LEAD | CASE_WORKER | AUDITOR | Checked where |
|---|---|---|---|---|---|---|
| `case:create` | Y | Y | Y | Y | | `caseService.ts:143` |
| `case:view` | Y | Y | Y | Y | Y | `caseService.ts:114`, `123`; `referenceDataService.ts:16`, `27` |
| `case:update` | Y | Y | Y | Y | | `caseService.ts:213` |
| `case:assign` | Y | Y | Y | | | **never checked** |
| `case:transition` | Y | Y | Y | | | `caseService.ts:402` |
| `note:create` | Y | Y | Y | Y | | `caseService.ts:277` |
| `note:view:restricted` | Y | Y | Y | | Y | `authorize.ts:60-62` (used at `caseService.ts:51`, `281`) |
| `attachment:create` | Y | Y | Y | Y | | `caseService.ts:320` |
| `deadline:manage` | Y | Y | Y | Y | | `caseService.ts:360` |
| `escalation:manage` | Y | Y | Y | | | **never checked** (no escalation-management endpoint exists) |
| `report:view` | Y | Y | Y | | Y | `reportService.ts:15` |
| `admin:run-escalation` | Y | Y | | | | `escalationService.ts:24` |

Visibility scope (`permissions.ts:82-88`): `ADMIN`, `OPERATIONS_MANAGER`, `AUDITOR` → `"all"`; `TEAM_LEAD`, `CASE_WORKER` → `"team"`.

Mutation scope is a third, separate rule: `assertActorCanMutateTeam()` (`caseService.ts:55-63`) exempts `ADMIN` and `OPERATIONS_MANAGER` by hard-coded role name, and requires `actor.teamId === case.owningTeamId` for everyone else. The three axes (action permission, read scope, write scope) live in three different places — `permissionMap`, `visibilityMap`, and a role-name `if` — so changing a role's reach means editing all three.

Hard-coded role names also appear in `src/services/referenceDataService.ts:19` and `:29-31`, duplicating `visibilityMap` by hand. The two copies already disagree: `getTeamOptions()` treats `AUDITOR` as all-teams (`:19`), but `getAssignableUserOptions()` does not exempt `AUDITOR` (`:29-33`), so an auditor gets `403` for any team other than their own. That is harmless today (auditors cannot assign) but is exactly the drift the central policy file was meant to prevent.

## Verified findings

Each finding was confirmed by reading the cited lines. Findings marked *(ran)* were also reproduced against a hand-ported copy of the pure logic with `node --test` (see `docs/learning/testing-rationale.md` → "Checks run for this guide").

**A1 — Client filters override team scope (list and report). High.** *(ran)*
`buildCaseListWhere()` builds `{ ...accessWhere, ...(filters.owningTeamId ? { owningTeamId: filters.owningTeamId } : {}) }` (`caseService.ts:94-100`). Object spread is last-writer-wins, so for a `CASE_WORKER` on team A, `GET /api/cases?owningTeamId=<teamB id>` produces `where = { owningTeamId: teamB }`. `caseListQuerySchema` accepts `owningTeamId` (`caseSchemas.ts:59`) and the route passes all query params through (`src/app/api/cases/route.ts:20-24`). The list `select` returns title, requester name, assignee name and email (`caseRepository.ts:15-61`). `getScopedQueueSummary()` has the identical pattern for `teamId` (`reportService.ts:19-22`), and the senior note on `reportService.ts:18` claims the opposite of what the code does. Exploitation needs another team's cuid (`/api/reference-data/teams` filters them out for team roles, `referenceDataService.ts:23`), so this is broken access control mitigated only by ID obscurity. Fix: spread the access scope *last*, or reject a filter that differs from a non-`{}` scope, and add a test with a conflicting filter (the existing `caseService.test.ts:28-46` passes only `status`).

**A2 — Restricted escalation comments leak through `auditLogs`. High.** *(ran)*
`transitionCase()` writes the comment twice: into audit metadata (`caseService.ts:430-441`, `comment: input.comment ?? null`) and into a note that is restricted when the target is `ESCALATED` (`:443-449`). `serializeCaseDetail()` filters only `notes` (`:47-53`) and spreads everything else, including `auditLogs` with their full `metadata` JSON (`caseRepository.ts:150-164`). A `CASE_WORKER` on the owning team (no `note:view:restricted`) can read the restricted reason from `GET /api/cases/:id` → `auditLogs[].metadata.comment`. The UI hides it (`CaseDetailView.tsx:257-264` renders only `action`, time and actor), which is UI-only protection. `case.updated` audit rows also store the entire `input` object as metadata (`caseService.ts:260`).

**A3 — `case:assign` and `escalation:manage` are dead permissions. Medium.**
A repo-wide search finds both strings only in `permissions.ts`. `CASE_WORKER` lacks `case:assign`, yet `createCase()` (`caseService.ts:143-145`, `164-172`) and `updateCase()` (`:213`, `:223`, `:243-251`) accept `assignedToId` after checking only `case:create` / `case:update`. A case worker can assign any same-team user. The matrix promises something the services never enforce.

**A4 — Team moves orphan the assignee. Medium.**
`updateCase()` checks mutation rights against the *existing* team (`caseService.ts:217`) and blocks only `CASE_WORKER` from changing `owningTeamId` (`:219-221`). A `TEAM_LEAD` may therefore move a case to *any* team, including one they cannot see afterward. `assertAssignableUser(nextTeamId, input.assignedToId)` (`:223`) is a no-op when `assignedToId` is omitted (`:77-79`), so the old assignee stays attached to a case owned by a different team — the exact state the comment on `:87` says is prevented.

**A5 — Login response timing distinguishes unknown emails. Low.**
The messages match (`authService.ts:23`, `:29`), but an unknown email returns before `bcrypt.compare` runs (`:20-24`), while a known email pays a cost-12 bcrypt (`password.ts:4`, `:8`). Response time therefore still reveals whether an account exists. Fix: compare against a fixed dummy hash when the user is missing.

**A6 — Unhandled body-parse errors become `500`. Low.**
Every POST/PATCH route calls `await request.json()` inside `try` (e.g. `src/app/api/cases/route.ts:34`). A malformed body throws `SyntaxError`, which `handleRouteError()` does not recognise (`handle-route-error.ts:10-16`), so the client gets `500 "An unexpected server error occurred."` instead of `400`. *(ran: `Request.prototype.json` on `"{bad"` rejects with `SyntaxError` on Node 22.)*

## Check ladder

1. **Goal:** name the three policy axes. **Check:** for `TEAM_LEAD`, point at the line deciding (a) can it transition (`permissions.ts:63`), (b) which cases it reads (`permissions.ts:85`), (c) which it writes (`caseService.ts:60`).
2. **Goal:** see the override. **Check:** write down the object `buildCaseListWhere()` returns for `{ role: "CASE_WORKER", teamId: "A" }` with filter `{ owningTeamId: "B" }`. Expected: `{ owningTeamId: "B" }`.
3. **Goal:** find dead policy. **Check:** search `src` for `"case:assign"`; you should get hits only in `permissions.ts`.
4. **Goal:** reason about the leak. **Check:** list every field of `CaseDetailRecord` (`caseRepository.ts:63-165`) that can contain restricted-note text. Expected: `notes[].body` (filtered) and `auditLogs[].metadata.comment` (not filtered).
5. **Goal:** design the fix. **Check:** rewrite `buildCaseListWhere()` so the scope cannot be overridden, and state which existing test would still pass unchanged (`caseService.test.ts` — it never sends `owningTeamId`).
