"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, FileText, BookOpen, BarChart2 } from "lucide-react";

const links = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/documents", label: "Documents", icon: FileText },
  { href: "/glossary", label: "Glossary", icon: BookOpen },
  { href: "/usage", label: "Usage", icon: BarChart2 },
];

export function ShellNav() {
  const pathname = usePathname();

  return (
    <nav className="space-y-0.5">
      {links.map(({ href, label, icon: Icon }) => {
        const active = pathname === href || pathname.startsWith(`${href}/`);

        return (
          <Link
            key={href}
            href={href}
            className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors duration-150"
            style={{
              background: active ? "var(--accent-surface)" : "transparent",
              color: active ? "var(--accent)" : "var(--text-secondary)",
            }}
          >
            <Icon size={16} strokeWidth={1.75} />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
