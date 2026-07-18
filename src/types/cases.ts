import type { CasePriorityValue, CaseStatusValue } from "@/types/domain";

export type CaseListItem = {
  id: string;
  caseNumber: string;
  title: string;
  status: CaseStatusValue;
  priority: CasePriorityValue;
  severity: number;
  requesterName: string;
  createdAt: string;
  updatedAt: string;
  activeEscalationCount: number;
  nextDeadlineAt: string | null;
  owningTeam: {
    id: string;
    name: string;
    code: string;
  };
  assignedTo: {
    id: string;
    name: string;
    email: string;
  } | null;
};

export type CaseListResponse = {
  items: CaseListItem[];
};

export type CaseDetail = {
  id: string;
  caseNumber: string;
  title: string;
  description: string;
  status: CaseStatusValue;
  priority: CasePriorityValue;
  severity: number;
  requesterName: string;
  requesterEmail: string | null;
  sourceSystem: string | null;
  assignedToId: string | null;
  createdAt: string;
  updatedAt: string;
  owningTeamId: string;
  owningTeam: {
    id: string;
    name: string;
    code: string;
  };
  assignedTo: {
    id: string;
    name: string;
    email: string;
    role: string;
  } | null;
  createdBy: {
    id: string;
    name: string;
    email: string;
  };
  notes: Array<{
    id: string;
    body: string;
    isRestricted: boolean;
    createdAt: string;
    author: {
      id: string;
      name: string;
      email: string;
    };
  }>;
  attachments: Array<{
    id: string;
    fileName: string;
    storageKey: string;
    contentType: string;
    fileSizeBytes: number;
    createdAt: string;
    uploadedBy: {
      id: string;
      name: string;
      email: string;
    };
  }>;
  deadlines: Array<{
    id: string;
    label: string;
    dueAt: string;
    status: string;
    createdAt: string;
    createdBy: {
      id: string;
      name: string;
      email: string;
    };
  }>;
  escalations: Array<{
    id: string;
    reason: string;
    status: string;
    createdAt: string;
    raisedBy: {
      id: string;
      name: string;
      email: string;
    };
  }>;
  auditLogs: Array<{
    id: string;
    action: string;
    entityType: string;
    entityId: string;
    createdAt: string;
    metadata: unknown;
    actor: {
      id: string;
      name: string;
      email: string;
    } | null;
  }>;
};
