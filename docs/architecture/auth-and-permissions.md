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
- `src/services/reportService.ts` also reuses the same scope in `getScopedQueueSummary()`, so aggregate reporting cannot bypass row-level visibility.

Restricted-note access:

- The ability to see restricted notes is separate from the ability to see the parent case.
- `src/services/caseService.ts` uses `canViewRestrictedNotes()` from `src/lib/auth/authorize.ts` inside `serializeCaseDetail()` to filter note children after the case has already been scoped.
- This is the right split because case visibility and child-note visibility are related but not identical rules.

Mutation safety:

- Team-based mutation safety is enforced in `src/services/caseService.ts` by `assertActorCanMutateTeam()`.
- Assignment integrity is enforced in `src/services/caseService.ts` by `assertAssignableUser()`, which rejects assigning a case to someone outside the owning team.
- Status workflow safety is enforced in `src/lib/workflow/caseWorkflow.ts` by `assertAllowedTransition()`, then extended in `src/services/caseService.ts` by transition-specific guards such as the open-escalation check in `transitionCase()`.

Multi-tenancy note:

- Multi-tenancy is not included because the product reads like one internal corporate platform rather than a tenant-hosted SaaS.
- To add multi-tenancy later, you would add `tenantId` to org-owned models in `prisma/schema.prisma`, inject tenant context alongside the actor in `src/lib/middleware/withAuth.ts`, extend `buildCaseAccessWhere()` in `src/lib/auth/authorize.ts` to always include `tenantId`, and require every repository entry point to accept tenant-scoped `where` inputs.
