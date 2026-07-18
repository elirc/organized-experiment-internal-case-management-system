/*
 * What this file does:
 * Provides small auth-aware reference datasets for forms and navigation.
 * What calls it:
 * `src/app/api/reference-data/teams/route.ts` and `src/app/api/reference-data/assignable-users/route.ts`.
 * What it calls:
 * `src/lib/auth/authorize.ts`, `src/repositories/teamRepository.ts`, and `src/repositories/userRepository.ts`.
 * One thing a junior engineer would likely get wrong:
 * Treating "reference data" as harmless and forgetting it still needs auth and scoping.
 */
import { AuthorizationError, ensurePermission, type AuthenticatedActor } from "@/lib/auth/authorize";
import { listTeams } from "@/repositories/teamRepository";
import { listAssignableUsers } from "@/repositories/userRepository";

export async function getTeamOptions(actor: AuthenticatedActor) {
  ensurePermission(actor, "case:view");
  const teams = await listTeams();

  if (actor.role === "ADMIN" || actor.role === "OPERATIONS_MANAGER" || actor.role === "AUDITOR") {
    return teams;
  }

  return teams.filter((team) => team.id === actor.teamId);
}

export async function getAssignableUserOptions(actor: AuthenticatedActor, teamId: string) {
  ensurePermission(actor, "case:view");

  if (
    actor.role !== "ADMIN" &&
    actor.role !== "OPERATIONS_MANAGER" &&
    actor.teamId !== teamId
  ) {
    // ⚠️ SENIOR NOTE: Reference-data endpoints are a common place to forget scope because they "feel harmless" during development.
    throw new AuthorizationError("You may only load assignment options for your own team.");
  }

  return listAssignableUsers(teamId);
}
