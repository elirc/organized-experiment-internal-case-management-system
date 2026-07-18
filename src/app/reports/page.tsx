import { AppShell } from "@/components/layout/AppShell";
import { QueueSummary } from "@/components/reports/QueueSummary";

export default function ReportsPage() {
  return (
    <AppShell
      subtitle="Reporting reuses the same auth-aware scope as case detail screens so aggregate data cannot bypass row-level visibility."
      title="Operational Reports"
    >
      <QueueSummary />
    </AppShell>
  );
}
