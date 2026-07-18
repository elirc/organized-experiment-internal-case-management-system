# Request Lifecycle

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
