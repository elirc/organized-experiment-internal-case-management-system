export type QueueSummaryResponse = {
  byStatus: Array<{
    status: string;
    _count: {
      _all: number;
    };
  }>;
  overdueDeadlines: number;
  openEscalations: number;
};
