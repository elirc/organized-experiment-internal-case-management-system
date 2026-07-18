import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const getSessionActor = vi.fn();

vi.mock("@/lib/auth/session", () => ({
  getSessionActor,
}));

describe("POST /api/admin/escalation-sweeps", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rejects a case worker with 403", async () => {
    // This matters because admin-style batch jobs are easy to expose accidentally;
    // the test guards against a production bug where any authenticated staff user could trigger escalations.
    getSessionActor.mockResolvedValue({
      id: "user_worker",
      email: "case.worker@corp.local",
      name: "Case Worker",
      role: "CASE_WORKER",
      teamId: "team_billing",
    });

    const { POST } = await import("@/app/api/admin/escalation-sweeps/route");
    const response = await POST(
      new NextRequest("http://localhost/api/admin/escalation-sweeps", {
        method: "POST",
      }),
      undefined,
    );

    expect(response.status).toBe(403);
  });
});
