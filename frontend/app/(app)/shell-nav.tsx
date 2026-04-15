"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/dashboard", label: "Dashboard", note: "Health, throughput, and recent work" },
  { href: "/documents", label: "Documents", note: "Upload, queue, and monitor case files" },
  { href: "/glossary", label: "Glossary", note: "Control critical legal terminology" },
  { href: "/usage", label: "Usage", note: "Token cost and operational visibility" },
];

export function ShellNav() {
  const pathname = usePathname();

  return (
    <nav className="space-y-2">
      {links.map((link) => {
        const active = pathname === link.href || pathname.startsWith(`${link.href}/`);

        return (
          <Link
            key={link.href}
            href={link.href}
            className="block rounded-[1.15rem] border px-4 py-3 transition-all"
            style={{
              borderColor: active ? "hsl(var(--primary) / 0.24)" : "hsl(var(--border))",
              background: active
                ? "linear-gradient(135deg, hsl(var(--primary) / 0.14), rgb(255 255 255 / 0.8))"
                : "rgb(255 255 255 / 0.52)",
              boxShadow: active ? "0 12px 24px -20px hsl(var(--primary) / 0.45)" : "none",
            }}
          >
            <div className="flex items-center justify-between gap-4">
              <span className="text-sm font-semibold" style={{ color: "hsl(var(--foreground))" }}>
                {link.label}
              </span>
              <span
                className="text-[11px] uppercase tracking-[0.18em]"
                style={{ color: active ? "hsl(var(--primary))" : "hsl(var(--muted-foreground))" }}
              >
                {active ? "Open" : "View"}
              </span>
            </div>
            <p className="mt-1 text-xs leading-5" style={{ color: "hsl(var(--muted-foreground))" }}>
              {link.note}
            </p>
          </Link>
        );
      })}
    </nav>
  );
}
