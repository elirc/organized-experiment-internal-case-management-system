# Load-Bearing Files

## src/services/caseService.ts
- What it does: Owns permissions, scope-aware reads, child-record writes, state transitions, and audit logging for cases.
- What calls it: `src/app/api/cases/route.ts`, `src/app/api/cases/[caseId]/route.ts`, `src/app/api/cases/[caseId]/notes/route.ts`, `src/app/api/cases/[caseId]/deadlines/route.ts`, `src/app/api/cases/[caseId]/attachments/route.ts`, `src/app/api/cases/[caseId]/transition/route.ts`.
- What it calls: `src/lib/auth/authorize.ts`, `src/lib/workflow/caseWorkflow.ts`, `src/repositories/caseRepository.ts`, `src/repositories/auditLogRepository.ts`, `src/repositories/userRepository.ts`, `src/lib/db.ts`.
- What would break or become insecure if this file were wrong: Team scoping, restricted-note visibility, and workflow integrity would all fail at once.
- What a junior engineer would likely miswrite here: Putting audit logging after the transaction or forgetting to scope the initial case lookup before mutation.

## src/lib/auth/authorize.ts
- What it does: Turns role policy into runtime permission checks and case visibility filters.
- What calls it: `src/services/caseService.ts`, `src/services/reportService.ts`, `src/services/escalationService.ts`.
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

## src/services/reportService.ts
- What it does: Applies auth-aware scoping to queue summary reporting.
- What calls it: `src/app/api/reports/queue-summary/route.ts`.
- What it calls: `src/lib/auth/authorize.ts`, `src/repositories/reportRepository.ts`.
- What would break or become insecure if this file were wrong: Aggregate endpoints could bypass the same visibility limits as CRUD endpoints.
- What a junior engineer would likely miswrite here: Replacing auth scope with user-selected team filters.

## prisma/schema.prisma
- What it does: Defines the persistent domain shape, enums, and relationships.
- What calls it: Prisma client generation and every repository via `src/lib/db.ts`.
- What it calls: No application code; it defines the DB contract.
- What would break or become insecure if this file were wrong: Ownership, workflow state, and audit relationships would become ambiguous or unenforceable.
- What a junior engineer would likely miswrite here: Omitting ownership columns like `owningTeamId` and trying to recover access control entirely in application code later.
