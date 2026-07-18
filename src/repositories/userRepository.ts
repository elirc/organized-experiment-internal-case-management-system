/*
 * What this file does:
 * Encapsulates user lookup queries needed by auth and assignment logic.
 * What calls it:
 * `src/services/authService.ts` and `src/services/caseService.ts`.
 * What it calls:
 * `src/lib/db.ts`.
 * One thing a junior engineer would likely get wrong:
 * Loading full user rows when only a narrow select is needed for auth or ownership checks.
 */
import { db } from "@/lib/db";

export async function findUserByEmail(email: string) {
  return db.user.findUnique({
    where: {
      email,
    },
  });
}

export async function findUserById(id: string) {
  return db.user.findUnique({
    where: {
      id,
    },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      teamId: true,
    },
  });
}

export async function listAssignableUsers(teamId: string) {
  return db.user.findMany({
    where: {
      teamId,
    },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
    },
    orderBy: {
      name: "asc",
    },
  });
}
