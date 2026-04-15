import Link from "next/link";
import { requireToken } from "@/lib/auth";
import { logoutAction } from "../(auth)/actions";
import { ShellNav } from "./shell-nav";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  await requireToken();

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-[1600px] gap-6 px-4 py-4 md:px-6">
      <aside className="hidden w-[320px] shrink-0 lg:block">
        <div className="app-panel sticky top-4 flex min-h-[calc(100vh-2rem)] flex-col p-5">
          <div className="mb-6">
            <span className="eyebrow">Legal Translation OS</span>
            <Link href="/dashboard" className="mt-4 block">
              <h1 className="text-3xl leading-none" style={{ color: "hsl(var(--foreground))" }}>
                Lex Translate
              </h1>
              <p className="mt-3 text-sm leading-6" style={{ color: "hsl(var(--muted-foreground))" }}>
                Intake, translate, validate, and deliver court-ready output without losing context.
              </p>
            </Link>
          </div>

          <ShellNav />

          <div className="app-panel-muted mt-auto p-4">
            <p className="text-xs uppercase tracking-[0.18em]" style={{ color: "hsl(var(--muted-foreground))" }}>
              Workflow
            </p>
            <p className="mt-2 text-sm leading-6" style={{ color: "hsl(var(--foreground))" }}>
              Upload source files, track the pipeline live, inspect the side-by-side output, then
              download the final PDF or DOCX.
            </p>

            <form action={logoutAction} className="mt-4">
              <button type="submit" className="secondary-button w-full">
                Sign Out
              </button>
            </form>
          </div>
        </div>
      </aside>

      <main className="min-w-0 flex-1 py-2">
        <div className="app-panel mb-6 p-4 lg:hidden">
          <div className="flex items-start justify-between gap-4">
            <div>
              <span className="eyebrow">Lex Translate</span>
              <p className="mt-3 text-sm leading-6" style={{ color: "hsl(var(--muted-foreground))" }}>
                Translation workflow, validation, and output delivery in one place.
              </p>
            </div>
            <form action={logoutAction}>
              <button type="submit" className="secondary-button">
                Sign Out
              </button>
            </form>
          </div>

          <div className="mt-4">
            <ShellNav />
          </div>
        </div>

        {children}
      </main>
    </div>
  );
}
