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

The design intentionally does not use multi-tenancy. Instead, it uses explicit role-based access plus team-scoped visibility in `src/lib/auth/authorize.ts` so tenant scoping could be layered in later without rewriting the service or repository boundaries.
