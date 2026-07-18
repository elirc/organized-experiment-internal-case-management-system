import { CaseDetailView } from "@/components/cases/CaseDetailView";
import { AppShell } from "@/components/layout/AppShell";

export default async function CaseDetailPage({
  params,
}: {
  params: Promise<{ caseId: string }>;
}) {
  const { caseId } = await params;

  return (
    <AppShell
      subtitle="This screen exercises the child routes for notes, deadlines, attachments, workflow transitions, and audit history."
      title="Case Detail"
    >
      <CaseDetailView caseId={caseId} />
    </AppShell>
  );
}
