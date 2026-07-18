/*
 * What this file does:
 * Manages session cookie creation, lookup, and teardown for API routes.
 * What calls it:
 * `src/services/authService.ts`, `src/lib/middleware/withAuth.ts`, and auth routes under `src/app/api/auth`.
 * What it calls:
 * `src/repositories/sessionRepository.ts` and `src/lib/http/responses.ts`.
 * One thing a junior engineer would likely get wrong:
 * Storing raw session tokens in the database instead of hashing them before persistence.
 */
import crypto from "node:crypto";

import { cookies } from "next/headers";

import { findSessionByToken, invalidateSession } from "@/repositories/sessionRepository";

const SESSION_COOKIE = "case_mgmt_session";

function hashToken(token: string) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export function createRawSessionToken() {
  return crypto.randomBytes(32).toString("hex");
}

export function hashSessionToken(token: string) {
  return hashToken(token);
}

export async function setSessionCookie(token: string, expiresAt: Date) {
  const cookieStore = await cookies();

  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    expires: expiresAt,
    path: "/",
  });
}

export async function clearSessionCookie() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;

  if (token) {
    await invalidateSession(hashToken(token));
  }

  cookieStore.delete(SESSION_COOKIE);
}

export async function getSessionActor() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;

  if (!token) {
    return null;
  }

  // ⚠️ SENIOR NOTE: The raw browser token never leaves this file again; downstream code should only work with the hashed lookup result.
  return findSessionByToken(hashToken(token));
}
