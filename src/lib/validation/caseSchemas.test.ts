import { describe, expect, it } from "vitest";

import { createCaseSchema } from "@/lib/validation/caseSchemas";

describe("createCaseSchema", () => {
  it("rejects a known-bad case payload", () => {
    // This matters because malformed case creation requests are a common source of corrupt queue data;
    // the test catches the production bug class where invalid severity, short descriptions, or bad emails slip into persistence.
    const result = createCaseSchema.safeParse({
      title: "Bad",
      description: "too short",
      priority: "HIGH",
      severity: 8,
      requesterName: "A",
      requesterEmail: "not-an-email",
      owningTeamId: "not-a-cuid",
    });

    expect(result.success).toBe(false);
  });
});
