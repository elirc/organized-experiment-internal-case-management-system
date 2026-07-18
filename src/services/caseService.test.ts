import { CaseStatus } from "@prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";

const listCases = vi.fn();

vi.mock("@/repositories/caseRepository", async () => {
  const actual = await vi.importActual<typeof import("@/repositories/caseRepository")>(
    "@/repositories/caseRepository",
  );

  return {
    ...actual,
    listCases,
  };
});

describe("listVisibleCases", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    listCases.mockResolvedValue([]);
  });

  it("scopes a case worker to their own team when listing cases", async () => {
    // This matters because a missing ownership filter creates quiet cross-team data leaks;
    // the test catches the production bug class where one queue can see another queue's cases.
    const { listVisibleCases } = await import("@/services/caseService");

    await listVisibleCases(
      {
        id: "user_worker",
        email: "case.worker@corp.local",
        name: "Case Worker",
        role: "CASE_WORKER",
        teamId: "team_billing",
      },
      {
        status: CaseStatus.NEW,
      },
    );

    expect(listCases).toHaveBeenCalledWith(
      expect.objectContaining({
        owningTeamId: "team_billing",
        status: CaseStatus.NEW,
      }),
    );
  });
});
