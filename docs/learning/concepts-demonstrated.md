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

## Data isolation by ownership scope
Where to look: `src/lib/auth/authorize.ts` — `buildCaseAccessWhere()` converts actor scope into a Prisma `where` filter.
Also see: `src/services/caseService.ts` — `getCaseForActor()` and `listVisibleCases()` apply that scope before repository access.
Risk if wrong: One team can quietly see another team’s cases and notes.

## Restricted child-record visibility
Where to look: `src/services/caseService.ts` — `serializeCaseDetail()` filters `notes` by `canViewRestrictedNotes(actor)`.
Also see: `src/lib/auth/authorize.ts` for `canViewRestrictedNotes()`.
Risk if wrong: A user with parent-case access could still see notes that should remain manager-only.
