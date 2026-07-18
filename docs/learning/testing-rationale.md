# Testing Rationale

## `src/app/api/admin/escalation-sweeps/route.test.ts` — rejects a case worker with 403
This behavior matters because the escalation sweep is effectively an operational batch job with write access across many records. If a non-admin can trigger it, the failure mode is not just a bad response, it is potentially org-wide state churn and false escalations. A fuller production suite would also test the authenticated-admin happy path, audit log creation, and idempotency against already-escalated deadlines.

## `src/lib/validation/caseSchemas.test.ts` — rejects a known-bad case payload
This behavior matters because malformed create-case payloads produce the kind of low-grade data corruption that operations teams feel for months. Bad severity ranges, malformed emails, or missing ownership identifiers all degrade queue quality. A fuller production suite would add route-level tests for `parseOrThrow()` response shaping and property-based coverage around optional fields.

## `src/lib/workflow/caseWorkflow.test.ts` — rejects an invalid jump from `NEW` to `CLOSED`
This behavior matters because status graphs are where CRUD apps stop being “just forms” and start becoming operational systems. If invalid edges are allowed, downstream reporting and audits become lies. A fuller production suite would test every allowed edge, every forbidden edge, and the extra guards in `transitionCase()` such as assignment requirements and open-escalation blocking.

## `src/services/caseService.test.ts` — scopes a case worker to their own team when listing cases
This behavior matters because data isolation bugs are often quiet rather than noisy. The app still works, but the wrong people can see the wrong records. This test is intentionally aimed at the service-to-repository boundary because that is the last trustworthy place to guarantee scope before the DB query runs. A fuller production suite would add database-backed integration tests proving that one team’s records never appear in another team’s list or detail endpoints.
