import { CasePriority, CaseStatus, UserRole } from "@prisma/client";

import { db } from "../src/lib/db";
import { hashPassword } from "../src/lib/auth/password";

async function main() {
  const [opsTeam, billingTeam, riskTeam] = await Promise.all([
    db.team.upsert({
      where: { code: "OPS" },
      update: {},
      create: { code: "OPS", name: "Operations" },
    }),
    db.team.upsert({
      where: { code: "BILL" },
      update: {},
      create: { code: "BILL", name: "Billing Review" },
    }),
    db.team.upsert({
      where: { code: "RISK" },
      update: {},
      create: { code: "RISK", name: "Risk Operations" },
    }),
  ]);

  const passwordHash = await hashPassword("ChangeMe123!");

  const users = await Promise.all([
    db.user.upsert({
      where: { email: "admin@corp.local" },
      update: {},
      create: {
        email: "admin@corp.local",
        name: "Alex Admin",
        role: UserRole.ADMIN,
        teamId: opsTeam.id,
        passwordHash,
      },
    }),
    db.user.upsert({
      where: { email: "maya.manager@corp.local" },
      update: {},
      create: {
        email: "maya.manager@corp.local",
        name: "Maya Manager",
        role: UserRole.OPERATIONS_MANAGER,
        teamId: opsTeam.id,
        passwordHash,
      },
    }),
    db.user.upsert({
      where: { email: "liam.lead@corp.local" },
      update: {},
      create: {
        email: "liam.lead@corp.local",
        name: "Liam Lead",
        role: UserRole.TEAM_LEAD,
        teamId: billingTeam.id,
        passwordHash,
      },
    }),
    db.user.upsert({
      where: { email: "case.worker@corp.local" },
      update: {},
      create: {
        email: "case.worker@corp.local",
        name: "Case Worker",
        role: UserRole.CASE_WORKER,
        teamId: billingTeam.id,
        passwordHash,
      },
    }),
    db.user.upsert({
      where: { email: "audit.viewer@corp.local" },
      update: {},
      create: {
        email: "audit.viewer@corp.local",
        name: "Avery Auditor",
        role: UserRole.AUDITOR,
        teamId: riskTeam.id,
        passwordHash,
      },
    }),
  ]);

  const [admin, manager, lead, worker] = users;

  const caseOne = await db.case.upsert({
    where: { caseNumber: "CAS-2026-SEED0001" },
    update: {},
    create: {
      caseNumber: "CAS-2026-SEED0001",
      title: "Late enterprise invoice dispute",
      description:
        "Enterprise customer disputed an invoice after the promised SLA and needs finance review plus account manager follow-up.",
      status: CaseStatus.IN_PROGRESS,
      priority: CasePriority.HIGH,
      severity: 4,
      requesterName: "Jordan Blake",
      requesterEmail: "jordan.blake@example.com",
      sourceSystem: "Billing Portal",
      owningTeamId: billingTeam.id,
      assignedToId: worker.id,
      createdById: manager.id,
    },
  });

  await db.caseNote.createMany({
    data: [
      {
        caseId: caseOne.id,
        authorId: lead.id,
        body: "Customer submitted updated invoice screenshots. Waiting on finance confirmation.",
        isRestricted: false,
      },
      {
        caseId: caseOne.id,
        authorId: manager.id,
        body: "Finance flagged a possible systemic pricing mismatch for enterprise renewals.",
        isRestricted: true,
      },
    ],
    skipDuplicates: true,
  });

  await db.deadline.upsert({
    where: { id: "seed-deadline-1" },
    update: {},
    create: {
      id: "seed-deadline-1",
      caseId: caseOne.id,
      createdById: lead.id,
      label: "Finance response SLA",
      dueAt: new Date(Date.now() + 1000 * 60 * 60 * 24),
    },
  });

  await db.auditLog.upsert({
    where: { id: "seed-audit-1" },
    update: {},
    create: {
      id: "seed-audit-1",
      caseId: caseOne.id,
      actorId: admin.id,
      action: "seed.loaded",
      entityType: "case",
      entityId: caseOne.id,
      metadata: { note: "Sample seed data loaded" },
    },
  });
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
