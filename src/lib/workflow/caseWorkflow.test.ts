import { CaseStatus } from "@prisma/client";
import { describe, expect, it } from "vitest";

import { InvalidTransitionError, assertAllowedTransition } from "@/lib/workflow/caseWorkflow";

describe("assertAllowedTransition", () => {
  it("rejects an invalid jump from NEW to CLOSED", () => {
    // This matters because unsafe workflow jumps silently destroy auditability;
    // the test catches the bug class where a case skips required intermediate states like triage and resolution.
    expect(() => assertAllowedTransition(CaseStatus.NEW, CaseStatus.CLOSED)).toThrow(
      InvalidTransitionError,
    );
  });
});
