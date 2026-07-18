/*
 * What this file does:
 * Owns all Prisma queries for cases and related child records.
 * What calls it:
 * `src/services/caseService.ts` and `src/services/escalationService.ts`.
 * What it calls:
 * `src/lib/db.ts` and Prisma transaction clients.
 * One thing a junior engineer would likely get wrong:
 * Copying the same include graph into multiple services and letting fields drift apart over time.
 */
import { Prisma } from "@prisma/client";

import { db } from "@/lib/db";

const caseListSelect = Prisma.validator<Prisma.CaseSelect>()({
  id: true,
  caseNumber: true,
  title: true,
  status: true,
  priority: true,
  severity: true,
  requesterName: true,
  createdAt: true,
  updatedAt: true,
  owningTeam: {
    select: {
      id: true,
      name: true,
      code: true,
    },
  },
  assignedTo: {
    select: {
      id: true,
      name: true,
      email: true,
    },
  },
  deadlines: {
    select: {
      id: true,
      dueAt: true,
      status: true,
    },
    orderBy: {
      dueAt: "asc",
    },
    take: 1,
  },
  escalations: {
    select: {
      id: true,
      status: true,
    },
    where: {
      status: {
        not: "RESOLVED",
      },
    },
  },
});

const caseDetailInclude = Prisma.validator<Prisma.CaseInclude>()({
  owningTeam: {
    select: {
      id: true,
      name: true,
      code: true,
    },
  },
  assignedTo: {
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
    },
  },
  createdBy: {
    select: {
      id: true,
      name: true,
      email: true,
    },
  },
  notes: {
    include: {
      author: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  },
  attachments: {
    include: {
      uploadedBy: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  },
  deadlines: {
    include: {
      createdBy: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
    orderBy: {
      dueAt: "asc",
    },
  },
  escalations: {
    include: {
      raisedBy: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      acknowledgedBy: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      triggeredByDeadline: true,
    },
    orderBy: {
      createdAt: "desc",
    },
  },
  auditLogs: {
    include: {
      actor: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
    take: 20,
  },
});

export type CaseListRecord = Prisma.CaseGetPayload<{ select: typeof caseListSelect }>;
export type CaseDetailRecord = Prisma.CaseGetPayload<{ include: typeof caseDetailInclude }>;
type DatabaseClient = typeof db | Prisma.TransactionClient;

export async function listCases(where: Prisma.CaseWhereInput) {
  // ⚠️ SENIOR NOTE: This repository assumes callers already applied visibility scope; bypassing the service layer here is a data-leak risk.
  return db.case.findMany({
    where,
    select: caseListSelect,
    orderBy: {
      updatedAt: "desc",
    },
  });
}

export async function findCaseById(caseId: string, where?: Prisma.CaseWhereInput) {
  return db.case.findFirst({
    where: {
      id: caseId,
      ...where,
    },
    include: caseDetailInclude,
  });
}

export async function createCaseRecord(client: DatabaseClient, data: Prisma.CaseCreateInput) {
  return client.case.create({
    data,
    include: caseDetailInclude,
  });
}

export async function updateCaseRecord(client: DatabaseClient, caseId: string, data: Prisma.CaseUpdateInput) {
  return client.case.update({
    where: {
      id: caseId,
    },
    data,
    include: caseDetailInclude,
  });
}

export async function createCaseNote(
  client: DatabaseClient,
  data: Prisma.CaseNoteUncheckedCreateInput,
) {
  return client.caseNote.create({
    data,
    include: {
      author: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
  });
}

export async function createAttachmentRecord(
  client: DatabaseClient,
  data: Prisma.AttachmentUncheckedCreateInput,
) {
  return client.attachment.create({
    data,
    include: {
      uploadedBy: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
  });
}

export async function createDeadlineRecord(
  client: DatabaseClient,
  data: Prisma.DeadlineUncheckedCreateInput,
) {
  return client.deadline.create({
    data,
    include: {
      createdBy: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
  });
}

export async function createEscalationRecord(
  client: DatabaseClient,
  data: Prisma.EscalationUncheckedCreateInput,
) {
  return client.escalation.create({
    data,
  });
}

export async function updateDeadlineRecord(
  client: DatabaseClient,
  deadlineId: string,
  data: Prisma.DeadlineUpdateInput,
) {
  return client.deadline.update({
    where: {
      id: deadlineId,
    },
    data,
  });
}

export async function findOverdueDeadlinesWithoutEscalation() {
  return db.deadline.findMany({
    where: {
      status: "OPEN",
      dueAt: {
        lt: new Date(),
      },
      escalation: {
        is: null,
      },
      // The case status guard prevents the sweep from re-opening records that are already operationally done.
      case: {
        status: {
          notIn: ["CLOSED", "CANCELLED"],
        },
      },
    },
    include: {
      case: true,
    },
  });
}
