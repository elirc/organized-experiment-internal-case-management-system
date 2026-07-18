"use client";

import { CaseTable } from "@/components/cases/CaseTable";
import { CreateCaseForm } from "@/components/cases/CreateCaseForm";
import { AppShell } from "@/components/layout/AppShell";
import { useCases } from "@/hooks/useCases";

export default function CasesPage() {
  const cases = useCases();

  return (
    <AppShell
      subtitle="Internal teams work from one queue, but access scope and mutation rights are enforced centrally in the backend."
      title="Operational Case Queue"
    >
      <div className="space-y-6">
        <CreateCaseForm />
        {cases.isLoading ? (
          <section className="rounded-[28px] border border-[var(--line)] bg-[var(--surface)] p-8">
            Loading cases...
          </section>
        ) : cases.error ? (
          <section className="rounded-[28px] border border-[var(--line)] bg-[var(--surface)] p-8 text-[var(--danger)]">
            {cases.error.message}
          </section>
        ) : (
          <CaseTable items={cases.data?.items ?? []} />
        )}
      </div>
    </AppShell>
  );
}
