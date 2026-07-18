/*
 * What this file does:
 * Provides shared navigation, session context, and page framing for authenticated screens.
 * What calls it:
 * `src/app/cases/page.tsx`, `src/app/cases/[caseId]/page.tsx`, and `src/app/reports/page.tsx`.
 * What it calls:
 * `src/hooks/useSession.ts`.
 * One thing a junior engineer would likely get wrong:
 * Hiding authorization failures with blank screens instead of clearly showing the current auth state.
 */
"use client";

import clsx from "clsx";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { useLogout, useSession } from "@/hooks/useSession";
import { formatEnumLabel } from "@/lib/formatters";

export function AppShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const session = useSession();
  const logout = useLogout();

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-7xl flex-col gap-8 px-5 py-6 sm:px-8">
      <header className="rounded-[28px] border border-[var(--line)] bg-[var(--surface)] p-6 shadow-[0_20px_80px_rgba(38,33,26,0.08)] backdrop-blur">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-3xl space-y-3">
            <p className="font-[var(--font-mono)] text-xs uppercase tracking-[0.35em] text-[var(--accent-strong)]">
              Internal Case Management System
            </p>
            <h1 className="text-3xl font-semibold text-[var(--ink)] sm:text-4xl">{title}</h1>
            <p className="max-w-2xl text-sm leading-7 text-[var(--muted)] sm:text-base">{subtitle}</p>
          </div>

          <div className="flex flex-col items-start gap-3 rounded-3xl border border-[var(--line)] bg-[var(--surface-strong)] px-4 py-4 text-sm">
            <span className="font-[var(--font-mono)] text-xs uppercase tracking-[0.3em] text-[var(--muted)]">
              Session
            </span>
            <div>
              <p className="font-medium">{session.data?.user?.name ?? "Not signed in"}</p>
              <p className="text-[var(--muted)]">{session.data?.user?.email ?? "Use seeded credentials to explore"}</p>
            </div>
            {session.data?.user ? (
              <div className="flex items-center gap-3">
                <span className="rounded-full bg-[rgba(15,118,110,0.12)] px-3 py-1 text-xs font-semibold text-[var(--accent-strong)]">
                  {formatEnumLabel(session.data.user.role)}
                </span>
                <button
                  className="rounded-full border border-[var(--line)] px-3 py-1 text-xs font-medium hover:bg-[rgba(15,118,110,0.08)]"
                  onClick={() => logout.mutate()}
                  type="button"
                >
                  Sign out
                </button>
              </div>
            ) : (
              <Link
                className="rounded-full bg-[var(--accent)] px-4 py-2 text-xs font-semibold text-white"
                href="/login"
              >
                Go to login
              </Link>
            )}
          </div>
        </div>

        <nav className="mt-6 flex flex-wrap gap-3">
          {[
            { href: "/", label: "Home" },
            { href: "/cases", label: "Cases" },
            { href: "/reports", label: "Reports" },
          ].map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={clsx(
                "rounded-full px-4 py-2 text-sm font-medium transition",
                pathname === item.href
                  ? "bg-[var(--accent-strong)] text-white"
                  : "border border-[var(--line)] bg-white/40 text-[var(--ink)] hover:bg-white/70",
              )}
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </header>

      {!session.data?.user ? (
        <section className="rounded-[28px] border border-dashed border-[var(--line)] bg-[rgba(255,250,242,0.8)] p-8">
          <h2 className="text-xl font-semibold">Sign in to load team-scoped cases and reports</h2>
          <p className="mt-2 max-w-2xl text-sm leading-7 text-[var(--muted)]">
            The APIs enforce auth and team visibility on the server, so these screens stay intentionally thin and do not try to fake data client-side.
          </p>
        </section>
      ) : (
        children
      )}
    </main>
  );
}
