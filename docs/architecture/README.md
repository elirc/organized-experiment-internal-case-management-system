# Architecture Overview

This project is a Next.js App Router application with backend-heavy structure for internal operations workflows. The HTTP entry points live in `src/app/api/**/route.ts`, the auth and validation boundaries live in `src/lib/**`, the business rules live in `src/services/**`, and all Prisma queries live in `src/repositories/**`.

Top-level layers:

- `src/app` holds pages and REST routes. Example: `src/app/api/cases/route.ts` accepts case list and create requests, while `src/app/cases/[caseId]/page.tsx` renders the case detail experience.
- `src/components` holds UI composition only. Example: `src/components/cases/CaseDetailView.tsx` triggers note, deadline, attachment, and transition mutations but does not own backend rules.
- `src/hooks` owns React Query data access. Example: `src/hooks/useCaseDetail.ts` maps client actions to `/api/cases/[caseId]` routes and invalidates caches after mutations.
- `src/lib` holds cross-cutting backend concerns. Example: `src/lib/middleware/withAuth.ts` verifies that a session exists before a route reaches a service, and `src/lib/validation/caseSchemas.ts` defines the request schemas.
- `src/services` owns business behavior. Example: `src/services/caseService.ts` decides whether a user may create notes, assign a case, or move it into `CLOSED`.
- `src/repositories` owns Prisma access. Example: `src/repositories/caseRepository.ts` defines the include graphs and queries used by the service layer.
- `prisma` holds the relational schema in `prisma/schema.prisma` and demo data in `prisma/seed.ts`.
- `docs` is deliberately code-anchored. Example: `docs/learning/flow-traces.md` follows real function calls such as `transitionCase()` in `src/services/caseService.ts`.

Request shape summary:

- Client screens call hooks such as `src/hooks/useCases.ts`.
- Hooks call REST endpoints such as `src/app/api/cases/route.ts`.
- Route handlers validate with files such as `src/lib/validation/caseSchemas.ts`.
- Authenticated routes enter through `src/lib/middleware/withAuth.ts`.
- Services such as `src/services/caseService.ts` apply permissions, state rules, and audit logging.
- Repositories such as `src/repositories/caseRepository.ts` issue the Prisma queries.

The design intentionally does not use multi-tenancy. Instead, it uses explicit role-based access plus team-scoped visibility in `src/lib/auth/authorize.ts` so tenant scoping could be layered in later without rewriting the service or repository boundaries. That claim holds only once the scope-override bug is fixed: today two services spread client filters *after* the scope (`src/services/caseService.ts:96-100`, `src/services/reportService.ts:19-22`), so a tenant filter added the same way would be overridable too.

Precision on "all Prisma queries live in `src/repositories/**`": every `findMany`/`create`/`update` call does, but services open transactions themselves with `db.$transaction()` (`src/services/caseService.ts:147`, `:225`, `:285`, `:324`, `:369`, `:424`; `src/services/escalationService.ts:31`) and pass the transaction client into repository helpers typed as `typeof db | Prisma.TransactionClient` (`src/repositories/caseRepository.ts:169`, `src/repositories/auditLogRepository.ts:15`). `prisma/seed.ts` uses `db` directly.

## Route inventory

13 route files expose 15 handlers. Verified by reading each file under `src/app/api`.

| Method + path | File | `withAuth`? | Service call | Permission checked |
|---|---|---|---|---|
| `POST /api/auth/login` | `auth/login/route.ts:17` | no | `loginUser()` | none (public) |
| `POST /api/auth/logout` | `auth/logout/route.ts:15` | no | `clearSessionCookie()` | none |
| `GET /api/auth/session` | `auth/session/route.ts:14` | no | `getSessionActor()` | none; returns `{ user: null }` when signed out |
| `GET /api/cases` | `cases/route.ts:18` | yes | `listVisibleCases()` | `case:view` |
| `POST /api/cases` | `cases/route.ts:32` | yes | `createCase()` | `case:create` |
| `GET /api/cases/[caseId]` | `cases/[caseId]/route.ts:24` | yes | `getCaseDetail()` | `case:view` |
| `PATCH /api/cases/[caseId]` | `cases/[caseId]/route.ts:35` | yes | `updateCase()` | `case:update` |
| `POST .../notes` | `cases/[caseId]/notes/route.ts:24` | yes | `addCaseNote()` | `note:create` |
| `POST .../attachments` | `cases/[caseId]/attachments/route.ts:24` | yes | `addCaseAttachment()` | `attachment:create` |
| `POST .../deadlines` | `cases/[caseId]/deadlines/route.ts:24` | yes | `addCaseDeadline()` | `deadline:manage` |
| `POST .../transition` | `cases/[caseId]/transition/route.ts:24` | yes | `transitionCase()` | `case:transition` |
| `GET /api/reference-data/teams` | `reference-data/teams/route.ts:16` | yes | `getTeamOptions()` | `case:view` |
| `GET /api/reference-data/assignable-users` | `reference-data/assignable-users/route.ts:16` | yes | `getAssignableUserOptions()` | `case:view` (skipped entirely when `teamId` is absent, `:20-22`) |
| `GET /api/reports/queue-summary` | `reports/queue-summary/route.ts:18` | yes | `getScopedQueueSummary()` | `report:view` |
| `POST /api/admin/escalation-sweeps` | `admin/escalation-sweeps/route.ts:16` | yes | `runEscalationSweep()` | `admin:run-escalation` |

(Paths in the File column are relative to `src/app/api/`.) Every authenticated handler follows the same shape: `withAuth` → `try` → parse → one service call → `ok`/`created` → `catch` → `handleRouteError`. No route issues a Prisma query or compares role names itself.

`PATCH /api/cases/[caseId]` has no client caller: neither `src/hooks/useCases.ts` nor `src/hooks/useCaseDetail.ts` sends `PATCH`. Re-assignment, team moves and field edits are API-only, which matters because `IN_PROGRESS` requires an assignee (`src/services/caseService.ts:408-410`).

## What is not in this codebase

Verified absences, so you do not go looking for them:

- No `middleware.ts` and no server-side session check in any page. `src/app/cases/page.tsx` is a client component; `src/app/cases/[caseId]/page.tsx` is an async server component that only unwraps `params` (`:4-9`). Every page renders its shell for anyone, and data protection comes solely from the API returning `401` (`src/lib/middleware/withAuth.ts:36-39`).
- The reports page subtitle (`src/app/reports/page.tsx:7`) states that aggregates "cannot bypass row-level visibility"; see Finding A1 in `auth-and-permissions.md` for why that is not true today.
- No `prisma/migrations` directory is tracked; `npm run prisma:migrate` (`package.json:14`) would generate the first migration from the schema.
- No `.env.example`; `DATABASE_URL` is the only variable read by the schema (`prisma/schema.prisma:7`), and `NODE_ENV` drives cookie `secure` (`src/lib/auth/session.ts:37`) and Prisma log level (`src/lib/db.ts:11`).
- No background worker or scheduler. The "async-style" escalation sweep runs synchronously inside a single `POST` request, one transaction per deadline (`src/services/escalationService.ts:29-65`).
- No endpoints to acknowledge or resolve escalations, mark deadlines met, delete anything, or manage users and teams.
- `node_modules` is not present in this checkout, so the four Vitest files have not been executed as part of writing these docs (see `docs/learning/testing-rationale.md`).

## Check ladder

1. **Goal:** confirm the layering rule. **Check:** search `src/app` for `db.` — expected: no hits. Search `src/services` for `db.` — expected: only `db.$transaction`.
2. **Goal:** map a UI action to a permission. **Check:** for the "Run escalation sweep" button (`src/components/reports/QueueSummary.tsx:63-70`), name the hook, route, service and permission (`useRunEscalationSweep`, `admin/escalation-sweeps/route.ts`, `runEscalationSweep`, `admin:run-escalation`).
3. **Goal:** spot the unreachable handler. **Check:** find the one authenticated handler with no hook calling it (`PATCH /api/cases/[caseId]`).
