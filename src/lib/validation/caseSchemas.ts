/*
 * What this file does:
 * Defines request schemas for case CRUD, notes, deadlines, attachments, and transitions.
 * What calls it:
 * Case API routes under `src/app/api/cases/**`.
 * What it calls:
 * Prisma enums and Zod refinements.
 * One thing a junior engineer would likely get wrong:
 * Reusing database types directly at the HTTP boundary and losing control over invalid input handling.
 */
import { CasePriority, CaseStatus } from "@prisma/client";
import { z } from "zod";

const isoDateSchema = z.string().datetime();

export const createCaseSchema = z.object({
  title: z.string().min(5).max(120),
  description: z.string().min(20).max(4000),
  priority: z.nativeEnum(CasePriority),
  severity: z.number().int().min(1).max(5),
  requesterName: z.string().min(2).max(120),
  requesterEmail: z.string().email().optional().or(z.literal("")),
  sourceSystem: z.string().max(120).optional().or(z.literal("")),
  owningTeamId: z.string().cuid(),
  assignedToId: z.string().cuid().optional(),
});

export const updateCaseSchema = createCaseSchema.partial().refine(
  (input) => Object.keys(input).length > 0,
  "At least one field must be supplied when updating a case.",
);

export const createNoteSchema = z.object({
  body: z.string().min(5).max(4000),
  isRestricted: z.boolean().default(false),
});

export const createAttachmentSchema = z.object({
  fileName: z.string().min(1).max(255),
  storageKey: z.string().min(5).max(500),
  contentType: z.string().min(3).max(120),
  fileSizeBytes: z.number().int().positive().max(25_000_000),
});

export const createDeadlineSchema = z.object({
  label: z.string().min(3).max(120),
  dueAt: isoDateSchema,
});

export const transitionCaseSchema = z.object({
  nextStatus: z.nativeEnum(CaseStatus),
  comment: z.string().min(5).max(500).optional(),
});

// ⚠️ SENIOR NOTE: Query params arrive as strings; keeping this schema explicit avoids accidentally widening list filters later.
export const caseListQuerySchema = z.object({
  status: z.nativeEnum(CaseStatus).optional(),
  assignedToId: z.string().cuid().optional(),
  owningTeamId: z.string().cuid().optional(),
  search: z.string().max(100).optional(),
});
