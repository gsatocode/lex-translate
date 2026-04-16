import Link from "next/link";
import { requireToken } from "@/lib/auth";
import { logoutAction } from "../(auth)/actions";
import { ShellNav } from "./shell-nav";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  await requireToken();

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: "var(--background)" }}>
      {/* ── Fixed sidebar (desktop) ── */}
      <aside
        className="fixed left-0 top-0 z-10 hidden h-screen w-[280px] flex-col overflow-hidden border-r lg:flex"
        style={{ background: "var(--surface)", borderColor: "var(--border)" }}
      >
        {/* Zone 1: Brand */}
        <div className="p-4" style={{ borderBottom: "1px solid var(--border)" }}>
          <Link href="/dashboard" className="flex items-center gap-3">
            <div
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border text-xs font-semibold"
              style={{
                borderColor: "var(--border)",
                color: "var(--accent)",
                background: "var(--accent-surface)",
              }}
            >
              LT
            </div>
            <div className="min-w-0">
              <p
                className="truncate text-base leading-tight"
                style={{ fontFamily: "var(--font-display)", color: "var(--text-primary)" }}
              >
                Lex Translate
              </p>
              <p
                className="mt-0.5 text-[10px] uppercase tracking-wider"
                style={{ color: "var(--text-secondary)" }}
              >
                Legal Workspace
              </p>
            </div>
          </Link>
        </div>

        {/* Zone 2: Navigation */}
        <nav className="flex-1 overflow-y-auto p-3">
          <ShellNav />
        </nav>

        {/* Zone 3: Footer */}
        <div className="p-3" style={{ borderTop: "1px solid var(--border)" }}>
          <form action={logoutAction}>
            <button type="submit" className="secondary-button w-full">
              Sign Out
            </button>
          </form>
        </div>
      </aside>

      {/* ── Mobile top bar ── */}
      <div
        className="fixed left-0 right-0 top-0 z-10 flex h-14 items-center justify-between border-b px-4 lg:hidden"
        style={{ background: "var(--surface)", borderColor: "var(--border)" }}
      >
        <Link href="/dashboard" className="flex items-center gap-2">
          <div
            className="flex h-7 w-7 items-center justify-center rounded border text-xs font-semibold"
            style={{ borderColor: "var(--border)", color: "var(--accent)" }}
          >
            LT
          </div>
          <span className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
            Lex Translate
          </span>
        </Link>
        <form action={logoutAction}>
          <button type="submit" className="secondary-button">
            Sign Out
          </button>
        </form>
      </div>

      {/* ── Main scrollable content ── */}
      <main className="flex-1 overflow-y-auto lg:ml-[280px]">
        {/* Mobile nav below top bar */}
        <div
          className="border-b p-3 lg:hidden"
          style={{
            background: "var(--surface)",
            borderColor: "var(--border)",
            marginTop: "3.5rem",
          }}
        >
          <ShellNav />
        </div>

        {children}
      </main>
    </div>
  );
}
