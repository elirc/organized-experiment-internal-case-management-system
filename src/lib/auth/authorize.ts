/*
 * What this file does:
 * Centralizes authorization checks and record-scope decisions for authenticated actors.
 * What calls it:
 * `src/lib/middleware/withAuth.ts`, `src/services/caseService.ts`, `src/services/reportService.ts`.
 * What it calls:
 * `src/lib/auth/permissions.ts`.
 * One thing a junior engineer would likely get wrong:
 * Checking role names inline inside routes instead of delegating to a shared policy function.
 */
import { Prisma, UserRole } from "@prisma/client";

import { type CaseVisibilityScope, getCaseVisibilityScope, getPermissionsForRole, type Permission } from "@/lib/auth/permissions";

export type AuthenticatedActor = {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  teamId: string | null;
};

export class AuthorizationError extends Error {
  status = 403;

  constructor(message = "You do not have permission to perform this action.") {
    super(message);
    this.name = "AuthorizationError";
  }
}

export function ensurePermission(actor: AuthenticatedActor, permission: Permission) {
  if (!getPermissionsForRole(actor.role).has(permission)) {
    throw new AuthorizationError();
  }
}

export function getActorCaseScope(actor: AuthenticatedActor): CaseVisibilityScope {
  return getCaseVisibilityScope(actor.role);
}

export function buildCaseAccessWhere(actor: AuthenticatedActor): Prisma.CaseWhereInput {
  const scope = getActorCaseScope(actor);

  if (scope === "all") {
    return {};
  }

  if (!actor.teamId) {
    // ⚠️ SENIOR NOTE: Defaulting to `{}` here would turn "missing team assignment" into full-org visibility.
    throw new AuthorizationError("This role requires a team assignment before it can access cases.");
  }

  // The team filter is centralized here so repository queries cannot silently forget it.
  return {
    owningTeamId: actor.teamId,
  };
}

export function canViewRestrictedNotes(actor: AuthenticatedActor) {
  return getPermissionsForRole(actor.role).has("note:view:restricted");
}
