/*
 * What this file does:
 * Defines the permission matrix and access-scope helpers for each user role.
 * What calls it:
 * `src/lib/auth/authorize.ts`, `src/services/caseService.ts`, and tests that verify RBAC behavior.
 * What it calls:
 * No downstream modules; it is a pure policy definition.
 * One thing a junior engineer would likely get wrong:
 * Mixing "can do action" and "which records are visible" into one boolean check, which hides data leaks.
 */
import { UserRole } from "@prisma/client";

export type Permission =
  | "case:create"
  | "case:view"
  | "case:update"
  | "case:assign"
  | "case:transition"
  | "note:create"
  | "note:view:restricted"
  | "attachment:create"
  | "deadline:manage"
  | "escalation:manage"
  | "report:view"
  | "admin:run-escalation";

export type CaseVisibilityScope = "all" | "team";

const permissionMap: Record<UserRole, Permission[]> = {
  ADMIN: [
    "case:create",
    "case:view",
    "case:update",
    "case:assign",
    "case:transition",
    "note:create",
    "note:view:restricted",
    "attachment:create",
    "deadline:manage",
    "escalation:manage",
    "report:view",
    "admin:run-escalation",
  ],
  OPERATIONS_MANAGER: [
    "case:create",
    "case:view",
    "case:update",
    "case:assign",
    "case:transition",
    "note:create",
    "note:view:restricted",
    "attachment:create",
    "deadline:manage",
    "escalation:manage",
    "report:view",
    "admin:run-escalation",
  ],
  TEAM_LEAD: [
    "case:create",
    "case:view",
    "case:update",
    "case:assign",
    "case:transition",
    "note:create",
    "note:view:restricted",
    "attachment:create",
    "deadline:manage",
    "escalation:manage",
    "report:view",
  ],
  CASE_WORKER: [
    "case:create",
    "case:view",
    "case:update",
    "note:create",
    "attachment:create",
    "deadline:manage",
  ],
  AUDITOR: ["case:view", "note:view:restricted", "report:view"],
};

const visibilityMap: Record<UserRole, CaseVisibilityScope> = {
  ADMIN: "all",
  OPERATIONS_MANAGER: "all",
  TEAM_LEAD: "team",
  CASE_WORKER: "team",
  AUDITOR: "all",
};

export function getPermissionsForRole(role: UserRole): Set<Permission> {
  return new Set(permissionMap[role]);
}

export function getCaseVisibilityScope(role: UserRole): CaseVisibilityScope {
  // ⚠️ SENIOR NOTE: Changing a role from `team` to `all` here is a silent data-exposure change across every list, detail, and report query.
  return visibilityMap[role];
}
