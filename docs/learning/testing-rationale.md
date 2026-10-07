# Testing Rationale

## `src/app/api/admin/escalation-sweeps/route.test.ts` — rejects a case worker with 403
This behavior matters because the escalation sweep is effectively an operational batch job with write access across many records. If a non-admin can trigger it, the failure mode is not just a bad response, it is potentially org-wide state churn and false escalations. A fuller production suite would also test the authenticated-admin happy path, audit log creation, and idempotency against already-escalated deadlines.

## `src/lib/validation/caseSchemas.test.ts` — rejects a known-bad case payload
This behavior matters because malformed create-case payloads produce the kind of low-grade data corruption that operations teams feel for months. Bad severity ranges, malformed emails, or missing ownership identifiers all degrade queue quality. A fuller production suite would add route-level tests for `parseOrThrow()` response shaping and property-based coverage around optional fields.

## `src/lib/workflow/caseWorkflow.test.ts` — rejects an invalid jump from `NEW` to `CLOSED`
This behavior matters because status graphs are where CRUD apps stop being “just forms” and start becoming operational systems. If invalid edges are allowed, downstream reporting and audits become lies. A fuller production suite would test every allowed edge, every forbidden edge, and the extra guards in `transitionCase()` such as assignment requirements and open-escalation blocking.

## `src/services/caseService.test.ts` — scopes a case worker to their own team when listing cases
This behavior matters because data isolation bugs are often quiet rather than noisy. The app still works, but the wrong people can see the wrong records. This test is intentionally aimed at the service-to-repository boundary because that is the last trustworthy place to guarantee scope before the DB query runs. A fuller production suite would add database-backed integration tests proving that one team’s records never appear in another team’s list or detail endpoints.

**What this test does not catch (verified):** it passes `{ status: NEW }` only (`src/services/caseService.test.ts:36-38`) and asserts with `expect.objectContaining` (`:41-46`). It would still pass with the scope-override bug in `buildCaseListWhere()` (`src/services/caseService.ts:96-100`), because that bug needs a conflicting `owningTeamId` filter to show. One extra case — same actor, filter `{ owningTeamId: "team_risk" }`, expect `owningTeamId: "team_billing"` — would fail today. That failing case is the most valuable single test this repo could add.

## What the four test files actually are

Read from source, not inferred:

| File | Tests | Assertions | Mocks | Needs at import time |
|---|---|---|---|---|
| `src/app/api/admin/escalation-sweeps/route.test.ts` | 1 | `response.status === 403` (`:34`) | `@/lib/auth/session` → `getSessionActor` (`:4-8`) | the real `escalationService` → `@/lib/db` → a generated `@prisma/client` |
| `src/lib/validation/caseSchemas.test.ts` | 1 | `success === false` (`:19`) | none | `@prisma/client` enums (imported by `caseSchemas.ts:11`), `zod` |
| `src/lib/workflow/caseWorkflow.test.ts` | 1 | throws `InvalidTransitionError` (`:10-12`) | none | `@prisma/client` enums |
| `src/services/caseService.test.ts` | 1 | `listCases` called with scope + status (`:41-46`) | `listCases` only; rest of the repository is `importActual` (`:6-15`) | generated Prisma client |

Four tests, one assertion each. Vitest runs in `jsdom` (`vitest.config.ts:6`) even though none of the four touches the DOM.

Observations a reviewer should make:

- **The bad-payload test proves almost nothing about any one rule.** The payload is wrong in six ways at once (title 3 chars, description 9 chars, severity 8, requester name 1 char, bad email, non-cuid team — `caseSchemas.test.ts:9-17`). Any single rule could be deleted and the test would still pass. Table-driven tests with one defect per row are the fix.
- **The workflow test covers 1 of 64 ordered status pairs.** The table has 17 allowed and 47 forbidden pairs (computed in check C1 below).
- **No test exercises a happy path** — no successful create, transition, note, or sweep.
- **The sweep test only covers the permission gate.** It never reaches `findOverdueDeadlinesWithoutEscalation()`, so idempotency, the illegal `ESCALATED` edges and the stale-snapshot race are untested.
- **No test covers restricted-note filtering**, even though the original rationale names it as a risk and Finding A2 shows a leak beside it.
- **Mock-before-import ordering matters.** Both service and route tests call `vi.mock` at top level and then `await import(...)` inside the test (`route.test.ts:26`, `caseService.test.ts:26`) so the mocked module is the one the code under test receives.

## Were the shipped tests run?

No. This checkout has no `node_modules` and no generated Prisma client, and installing packages was out of scope for the doc pass. Everything above about the Vitest files comes from reading them. To run them: install dependencies, `npm run prisma:generate`, then `npm test` (`package.json:11`, `:13`). None of the four needs a live database, because each either mocks the repository call or never reaches a query.

## Checks run for this guide

Because the shipped tests could not run, the pure logic they depend on was hand-ported to a scratch JavaScript file (TypeScript types and Prisma enum imports replaced by string literals; logic otherwise line-for-line from the cited source) and executed with Node's built-in runner: `node --test checks.test.mjs` on Node 22.16.0, no packages installed. Result: **16 tests, 16 passed, 0 failed.** The scratch file is not part of the repo.

| ID | Ported from | What it asserts | Result |
|---|---|---|---|
| C1 | `caseWorkflow.ts:13-40` | exactly 17 of 64 ordered pairs are allowed | pass |
| C2 | same | no self-loops; `CLOSED` and `CANCELLED` have no outgoing edges | pass |
| C3 | same | BFS: `NEW → CLOSED` is 4 hops, `NEW → ESCALATED` is 3 | pass |
| C4 | `caseWorkflow.ts:13-22` + `escalationService.ts:44-48` | sweep's forced `ESCALATED` is illegal from `NEW`, `TRIAGED`, `RESOLVED` | pass |
| C5 | `authorize.ts:42-58` + `caseService.ts:93-111` | case worker + `owningTeamId` filter → scope replaced | pass (confirms Finding A1) |
| C6 | `reportService.ts:14-23` | team lead + `teamId` → scope replaced | pass (confirms Finding A1) |
| C7 | same as C5 | control: status-only filter keeps scope (what the shipped test checks) | pass |
| C8 | `authorize.ts:42-58` | team role with `teamId: null` throws; auditor gets `{}` | pass |
| C9 | `caseService.ts:47-53` | restricted note removed, audit `metadata.comment` kept | pass (confirms Finding A2) |
| C10 | `permissions.ts:29-80` | case worker lacks `case:assign`; team lead holds the unused `escalation:manage` | pass |
| C11 | `caseService.ts:55-63` | cross-team mutation blocked for case worker; ops manager exempt even with no team | pass |
| C12 | model of `escalationService.ts:23-71` + `caseRepository.ts:285-306` | second sequential sweep creates 0; closed case skipped; `NEW` case forced to `ESCALATED` | pass |
| C13 | same + `schema.prisma:179` | two sweeps reading before either writes → second throws on the unique key, no duplicate rows | pass |
| C14 | same | case closed after the sweep's read ends `ESCALATED` | pass |
| C15 | `CaseDetailView.tsx:162` | `new Date("").toISOString()` throws `RangeError` | pass |
| C16 | route `request.json()` calls | malformed JSON rejects with `SyntaxError` (unmapped → `500`) | pass |

Limits: C12–C14 are an in-memory model of the sweep, not a run against Prisma or PostgreSQL; they show what the code's logic does under a given interleaving, not how often that interleaving occurs. Zod schemas were **not** checked by execution, because `zod` is not installed in this checkout.

## Tests worth adding, in priority order

1. Scope cannot be overridden: list and report with a conflicting team filter (fails today).
2. Restricted escalation comment absent from every field of the detail payload for `CASE_WORKER` (fails today).
3. Every one of the 64 status pairs against `allowedTransitions`, table-driven.
4. Sweep: second sequential run creates 0; closed/cancelled cases skipped; status write respects the workflow table (the last fails today).
5. `CASE_WORKER` cannot set `assignedToId` (fails today, Finding A3).
6. One test per Zod rule with a single defect per payload.
