import Link from "next/link";
import { requireToken } from "@/lib/auth";
import { logoutAction } from "../(auth)/actions";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  await requireToken();

  return (
    <div className="min-h-screen flex">
      <nav
        className="w-56 flex-shrink-0 flex flex-col"
        style={{
          background: "hsl(var(--card))",
          borderRight: "1px solid hsl(var(--border))",
        }}
      >
        <div className="px-5 py-5 border-b" style={{ borderColor: "hsl(var(--border))" }}>
          <span
            className="text-base font-semibold tracking-tight"
            style={{ color: "hsl(var(--foreground))" }}
          >
            Lex Translate
          </span>
        </div>

        <div className="flex-1 px-3 py-4 space-y-1">
          {[
            { href: "/dashboard", label: "Dashboard" },
            { href: "/documents", label: "Documents" },
            { href: "/glossary", label: "Glossary" },
            { href: "/usage", label: "Usage" },
          ].map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className="flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors hover:bg-white/5"
              style={{ color: "hsl(var(--muted-foreground))" }}
            >
              {label}
            </Link>
          ))}
        </div>

        <div className="px-3 py-4 border-t" style={{ borderColor: "hsl(var(--border))" }}>
          <form action={logoutAction}>
            <button
              type="submit"
              className="w-full text-left px-3 py-2 rounded-md text-sm transition-colors hover:bg-white/5"
              style={{ color: "hsl(var(--muted-foreground))" }}
            >
              Sign out
            </button>
          </form>
        </div>
      </nav>

      <main className="flex-1 min-w-0 overflow-auto">{children}</main>
    </div>
  );
}
