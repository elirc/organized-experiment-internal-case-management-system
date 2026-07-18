/*
 * What this file does:
 * Defines Zod schemas at the auth API boundary.
 * What calls it:
 * `src/app/api/auth/login/route.ts`.
 * What it calls:
 * No runtime modules beyond Zod.
 * One thing a junior engineer would likely get wrong:
 * Trusting frontend form constraints instead of re-validating on the server.
 */
import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});
