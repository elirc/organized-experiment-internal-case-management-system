export const caseStatuses = [
  "NEW",
  "TRIAGED",
  "IN_PROGRESS",
  "WAITING_EXTERNAL",
  "ESCALATED",
  "RESOLVED",
  "CLOSED",
  "CANCELLED",
] as const;

export const casePriorities = ["LOW", "MEDIUM", "HIGH", "CRITICAL"] as const;

export const userRoles = [
  "ADMIN",
  "OPERATIONS_MANAGER",
  "TEAM_LEAD",
  "CASE_WORKER",
  "AUDITOR",
] as const;

export type CaseStatusValue = (typeof caseStatuses)[number];
export type CasePriorityValue = (typeof casePriorities)[number];
export type UserRoleValue = (typeof userRoles)[number];
